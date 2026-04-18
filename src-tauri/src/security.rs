use std::fs;
use std::path::PathBuf;

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use bcrypt::{hash, verify, DEFAULT_COST};
use rand::RngCore;
use rusqlite::{params, Connection};
use tauri::Manager;

const VAULT_KEY_FILE_NAME: &str = "vault.key";
const ENCRYPTED_VALUE_PREFIX: &str = "enc:v1:";

fn vault_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base_dir = app
        .path()
        .data_dir()
        .map_err(|error| format!("Ошибка получения data_dir: {}", error))?;
    Ok(base_dir.join("flowmode"))
}

fn vault_key_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(vault_data_dir(app)?.join(VAULT_KEY_FILE_NAME))
}

fn load_or_create_vault_key(app: &tauri::AppHandle) -> Result<[u8; 32], String> {
    let key_path = vault_key_path(app)?;
    if let Some(parent_dir) = key_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|error| format!("Ошибка создания директории ключа vault: {}", error))?;
    }

    if key_path.exists() {
        let encoded = fs::read_to_string(&key_path)
            .map_err(|error| format!("Ошибка чтения ключа vault: {}", error))?;
        let decoded = BASE64
            .decode(encoded.trim())
            .map_err(|error| format!("Ошибка декодирования ключа vault: {}", error))?;
        let key: [u8; 32] = decoded
            .try_into()
            .map_err(|_| "Некорректная длина ключа vault".to_string())?;
        return Ok(key);
    }

    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    let encoded = BASE64.encode(key);
    fs::write(&key_path, encoded)
        .map_err(|error| format!("Ошибка записи ключа vault: {}", error))?;
    Ok(key)
}

pub fn is_vault_secret_encrypted(value: &str) -> bool {
    value.starts_with(ENCRYPTED_VALUE_PREFIX)
}

pub fn encrypt_vault_secret(app: &tauri::AppHandle, plaintext: &str) -> Result<String, String> {
    let key = load_or_create_vault_key(app)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|error| format!("Ошибка инициализации шифра vault: {}", error))?;

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|error| format!("Ошибка шифрования vault-пароля: {}", error))?;

    Ok(format!(
        "{}{}:{}",
        ENCRYPTED_VALUE_PREFIX,
        BASE64.encode(nonce_bytes),
        BASE64.encode(ciphertext)
    ))
}

pub fn decrypt_vault_secret(app: &tauri::AppHandle, value: &str) -> Result<String, String> {
    if !is_vault_secret_encrypted(value) {
        return Ok(value.to_string());
    }

    let payload = value.trim_start_matches(ENCRYPTED_VALUE_PREFIX);
    let mut parts = payload.splitn(2, ':');
    let nonce_encoded = parts
        .next()
        .ok_or("Некорректный формат зашифрованного vault-пароля".to_string())?;
    let ciphertext_encoded = parts
        .next()
        .ok_or("Некорректный формат зашифрованного vault-пароля".to_string())?;

    let nonce_vec = BASE64
        .decode(nonce_encoded)
        .map_err(|error| format!("Ошибка декодирования nonce vault: {}", error))?;
    let nonce_bytes: [u8; 12] = nonce_vec
        .try_into()
        .map_err(|_| "Некорректная длина nonce vault".to_string())?;
    let ciphertext = BASE64
        .decode(ciphertext_encoded)
        .map_err(|error| format!("Ошибка декодирования шифртекста vault: {}", error))?;

    let key = load_or_create_vault_key(app)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|error| format!("Ошибка инициализации шифра vault: {}", error))?;
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&nonce_bytes), ciphertext.as_ref())
        .map_err(|error| format!("Ошибка расшифровки vault-пароля: {}", error))?;

    String::from_utf8(plaintext).map_err(|error| format!("Ошибка UTF-8 в vault-пароле: {}", error))
}

pub fn migrate_vault_passwords(
    app: &tauri::AppHandle,
    connection: &Connection,
) -> Result<usize, String> {
    let mut statement = connection
        .prepare("SELECT id, password FROM vault_items WHERE password NOT LIKE 'enc:v1:%'")
        .map_err(|error| format!("Ошибка подготовки миграции vault-паролей: {}", error))?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| format!("Ошибка чтения legacy vault-паролей: {}", error))?;

    let legacy_rows = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Ошибка обработки legacy vault-паролей: {}", error))?;
    if legacy_rows.is_empty() {
        return Ok(0);
    }

    let transaction = connection
        .unchecked_transaction()
        .map_err(|error| format!("Ошибка начала транзакции миграции vault: {}", error))?;

    for (id, plaintext_password) in legacy_rows.iter() {
        let encrypted_password = encrypt_vault_secret(app, plaintext_password)?;
        transaction
            .execute(
                "UPDATE vault_items SET password = ?2 WHERE id = ?1",
                params![id, encrypted_password],
            )
            .map_err(|error| format!("Ошибка обновления legacy vault-пароля: {}", error))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Ошибка фиксации миграции vault: {}", error))?;
    Ok(legacy_rows.len())
}

/// Hash the master password
#[tauri::command]
pub fn hash_master_password(password: String, rounds: Option<u32>) -> Result<String, String> {
    let cost = rounds.unwrap_or(DEFAULT_COST).clamp(4, 31);
    hash(password, cost).map_err(|error| format!("Ошибка хеширования мастер-пароля: {}", error))
}

/// Verify the master password
#[tauri::command]
pub fn verify_master_password(password: String, stored_hash: String) -> Result<bool, String> {
    verify(password, &stored_hash)
        .map_err(|error| format!("Ошибка проверки мастер-пароля: {}", error))
}
