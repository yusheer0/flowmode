use std::time::{SystemTime, UNIX_EPOCH};

use rand::seq::SliceRandom;
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::security::{decrypt_vault_secret, encrypt_vault_secret, is_vault_secret_encrypted};
use crate::storage::DatabaseState;

/// Default events limit
const DEFAULT_EVENTS_LIMIT: i64 = 200;
/// Maximum events limit
const MAX_EVENTS_LIMIT: i64 = 1000;
/// Maximum stored events
const MAX_STORED_EVENTS: i64 = 5000;

/// Vault event
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultEvent {
    id: String,
    item_id: String,
    event_type: String,
    created_at: String,
}

/// Vault stored item
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultStoredItem {
    id: String,
    title: String,
    service: String,
    username: String,
    password: String,
    url: Option<String>,
    notes: Option<String>,
    tags: Vec<String>,
    created_at: String,
    updated_at: String,
}

/// Vault list item
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultListItem {
    id: String,
    title: String,
    service: String,
    username: String,
    password_masked: String,
    url: Option<String>,
    notes: Option<String>,
    tags: Vec<String>,
    created_at: String,
    updated_at: String,
}

/// Vault item input
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultItemInput {
    title: String,
    service: String,
    username: String,
    password: String,
    url: Option<String>,
    notes: Option<String>,
    tags: Vec<String>,
}

/// Get current timestamp in milliseconds
fn now_unix_ms() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

/// Generate a random ID
fn random_id(prefix: &str) -> String {
    format!("{}-{}-{}", prefix, now_unix_ms(), rand::random::<u32>())
}

/// Parse tags from JSON
fn parse_tags(tags_json: String) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(&tags_json).unwrap_or_default()
}

/// Convert a stored item to a list item
fn to_vault_list_item(item: &VaultStoredItem) -> VaultListItem {
    VaultListItem {
        id: item.id.clone(),
        title: item.title.clone(),
        service: item.service.clone(),
        username: item.username.clone(),
        password_masked: "********".to_string(),
        url: item.url.clone(),
        notes: item.notes.clone(),
        tags: item.tags.clone(),
        created_at: item.created_at.clone(),
        updated_at: item.updated_at.clone(),
    }
}

/// Load vault list items from the database
fn load_vault_list_items(connection: &Connection) -> Result<Vec<VaultListItem>, String> {
    let mut statement = connection
        .prepare(
            r#"
            SELECT id, title, service, username, url, notes, tags_json, created_at, updated_at
            FROM vault_items
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|error| format!("Ошибка подготовки чтения vault_items: {}", error))?;

    let rows = statement
        .query_map([], |row| {
            Ok(VaultListItem {
                id: row.get(0)?,
                title: row.get(1)?,
                service: row.get(2)?,
                username: row.get(3)?,
                password_masked: "********".to_string(),
                url: row.get(4)?,
                notes: row.get(5)?,
                tags: parse_tags(row.get(6)?),
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|error| format!("Ошибка чтения vault_items: {}", error))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Ошибка обработки vault_items: {}", error))
}

/// Append a vault event to the database
fn append_vault_event(
    connection: &Connection,
    item_id: &str,
    event_type: &str,
) -> Result<(), String> {
    connection
        .execute(
            "INSERT INTO vault_events (id, item_id, event_type, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![random_id("event"), item_id, event_type, now_unix_ms()],
        )
        .map_err(|error| format!("Ошибка сохранения события vault: {}", error))?;
    connection
        .execute(
            r#"
            DELETE FROM vault_events
            WHERE id IN (
              SELECT id
              FROM vault_events
              ORDER BY created_at DESC
              LIMIT -1 OFFSET ?1
            )
            "#,
            params![MAX_STORED_EVENTS],
        )
        .map(|_| ())
        .map_err(|error| format!("Ошибка очистки истории vault: {}", error))
}

/// Normalize events pagination
fn normalize_events_pagination(limit: Option<i64>, offset: Option<i64>) -> (i64, i64) {
    let normalized_limit = limit
        .unwrap_or(DEFAULT_EVENTS_LIMIT)
        .clamp(1, MAX_EVENTS_LIMIT);
    let normalized_offset = offset.unwrap_or(0).max(0);
    (normalized_limit, normalized_offset)
}

/// List vault items
#[tauri::command]
pub fn vault_list(database: State<'_, DatabaseState>) -> Result<Vec<VaultListItem>, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    load_vault_list_items(&connection)
}

/// List vault events
#[tauri::command]
pub fn vault_list_events(
    database: State<'_, DatabaseState>,
    item_id: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<VaultEvent>, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    let (limit, offset) = normalize_events_pagination(limit, offset);
    if let Some(id) = item_id {
        let mut statement = connection
            .prepare(
                r#"
                SELECT id, item_id, event_type, created_at
                FROM vault_events
                WHERE item_id = ?1
                ORDER BY created_at DESC
                LIMIT ?2 OFFSET ?3
                "#,
            )
            .map_err(|error| format!("Ошибка подготовки чтения vault_events: {}", error))?;
        let rows = statement
            .query_map(params![id, limit, offset], |row| {
                Ok(VaultEvent {
                    id: row.get(0)?,
                    item_id: row.get(1)?,
                    event_type: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })
            .map_err(|error| format!("Ошибка чтения истории vault: {}", error))?;
        let events = rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("Ошибка обработки истории vault: {}", error))?;
        return Ok(events);
    }

    let mut statement = connection
        .prepare(
            r#"
            SELECT id, item_id, event_type, created_at
            FROM vault_events
            ORDER BY created_at DESC
            LIMIT ?1 OFFSET ?2
            "#,
        )
        .map_err(|error| format!("Ошибка подготовки чтения vault_events: {}", error))?;
    let rows = statement
        .query_map(params![limit, offset], |row| {
            Ok(VaultEvent {
                id: row.get(0)?,
                item_id: row.get(1)?,
                event_type: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|error| format!("Ошибка чтения истории vault: {}", error))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Ошибка обработки истории vault: {}", error))
}

/// Create a vault item
#[tauri::command]
pub fn vault_create(
    app: tauri::AppHandle,
    database: State<'_, DatabaseState>,
    input: VaultItemInput,
) -> Result<VaultListItem, String> {
    if input.password.trim().is_empty() {
        return Err("Пароль не может быть пустым".to_string());
    }

    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    let now = now_unix_ms();
    let encrypted_password = encrypt_vault_secret(&app, &input.password)?;
    let item = VaultStoredItem {
        id: random_id("vault"),
        title: input.title.trim().to_string(),
        service: input.service.trim().to_string(),
        username: input.username.trim().to_string(),
        password: encrypted_password,
        url: input
            .url
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty()),
        notes: input
            .notes
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty()),
        tags: input
            .tags
            .iter()
            .map(|tag| tag.trim().to_string())
            .filter(|tag| !tag.is_empty())
            .collect(),
        created_at: now.clone(),
        updated_at: now,
    };
    let tags_json = serde_json::to_string(&item.tags)
        .map_err(|error| format!("Ошибка сериализации тегов vault: {}", error))?;
    connection
        .execute(
            r#"
            INSERT INTO vault_items (id, title, service, username, password, url, notes, tags_json, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            "#,
            params![
                &item.id,
                &item.title,
                &item.service,
                &item.username,
                &item.password,
                &item.url,
                &item.notes,
                tags_json,
                &item.created_at,
                &item.updated_at
            ],
        )
        .map_err(|error| format!("Ошибка сохранения vault-записи: {}", error))?;
    append_vault_event(&connection, &item.id, "created")?;
    Ok(to_vault_list_item(&item))
}

/// Update a vault item
#[tauri::command]
pub fn vault_update(
    app: tauri::AppHandle,
    database: State<'_, DatabaseState>,
    id: String,
    input: VaultItemInput,
) -> Result<VaultListItem, String> {
    if input.password.trim().is_empty() {
        return Err("Пароль не может быть пустым".to_string());
    }

    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    let existing = {
        let mut statement = connection
            .prepare(
                r#"
                SELECT id, title, service, username, password, url, notes, tags_json, created_at, updated_at
                FROM vault_items
                WHERE id = ?1
                "#,
            )
            .map_err(|error| format!("Ошибка подготовки чтения vault-записи: {}", error))?;
        statement
            .query_row(params![&id], |row| {
                Ok(VaultStoredItem {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    service: row.get(2)?,
                    username: row.get(3)?,
                    password: row.get(4)?,
                    url: row.get(5)?,
                    notes: row.get(6)?,
                    tags: parse_tags(row.get(7)?),
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })
            .optional()
            .map_err(|error| format!("Ошибка чтения vault-записи: {}", error))?
            .ok_or("Запись не найдена".to_string())?
    };

    let encrypted_password = encrypt_vault_secret(&app, &input.password)?;
    let updated = VaultStoredItem {
        id: existing.id.clone(),
        title: input.title.trim().to_string(),
        service: input.service.trim().to_string(),
        username: input.username.trim().to_string(),
        password: encrypted_password,
        url: input
            .url
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty()),
        notes: input
            .notes
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty()),
        tags: input
            .tags
            .iter()
            .map(|tag| tag.trim().to_string())
            .filter(|tag| !tag.is_empty())
            .collect(),
        created_at: existing.created_at,
        updated_at: now_unix_ms(),
    };

    let tags_json = serde_json::to_string(&updated.tags)
        .map_err(|error| format!("Ошибка сериализации тегов vault: {}", error))?;
    connection
        .execute(
            r#"
            UPDATE vault_items
            SET title = ?2, service = ?3, username = ?4, password = ?5, url = ?6, notes = ?7, tags_json = ?8, updated_at = ?9
            WHERE id = ?1
            "#,
            params![
                &id,
                &updated.title,
                &updated.service,
                &updated.username,
                &updated.password,
                &updated.url,
                &updated.notes,
                tags_json,
                &updated.updated_at
            ],
        )
        .map_err(|error| format!("Ошибка обновления vault-записи: {}", error))?;
    append_vault_event(&connection, &id, "updated")?;
    Ok(to_vault_list_item(&updated))
}

/// Delete a vault item
#[tauri::command]
pub fn vault_delete(database: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    let deleted = connection
        .execute("DELETE FROM vault_items WHERE id = ?1", params![&id])
        .map_err(|error| format!("Ошибка удаления vault-записи: {}", error))?;
    if deleted == 0 {
        return Ok(false);
    }
    append_vault_event(&connection, &id, "deleted")?;
    Ok(true)
}

/// Reveal a vault item
#[tauri::command]
pub fn vault_reveal(
    app: tauri::AppHandle,
    database: State<'_, DatabaseState>,
    id: String,
) -> Result<String, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    let password = connection
        .query_row(
            "SELECT password FROM vault_items WHERE id = ?1",
            params![&id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Ошибка чтения vault-записи: {}", error))?
        .ok_or("Запись не найдена".to_string())?;
    let decrypted_password = decrypt_vault_secret(&app, &password)?;
    if !is_vault_secret_encrypted(&password) {
        let encrypted = encrypt_vault_secret(&app, &decrypted_password)?;
        connection
            .execute(
                "UPDATE vault_items SET password = ?2 WHERE id = ?1",
                params![&id, encrypted],
            )
            .map_err(|error| format!("Ошибка миграции legacy vault-пароля: {}", error))?;
    }
    append_vault_event(&connection, &id, "revealed")?;
    Ok(decrypted_password)
}

/// Log a copy event
#[tauri::command]
pub fn vault_log_copy(
    database: State<'_, DatabaseState>,
    item_id: String,
    field: String,
) -> Result<bool, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    let has_item = connection
        .query_row(
            "SELECT 1 FROM vault_items WHERE id = ?1 LIMIT 1",
            params![&item_id],
            |_| Ok(true),
        )
        .optional()
        .map_err(|error| format!("Ошибка проверки vault-записи: {}", error))?
        .unwrap_or(false);
    if !has_item {
        return Ok(false);
    }
    let event_type = if field == "username" {
        "copied_login"
    } else {
        "copied_password"
    };
    append_vault_event(&connection, &item_id, event_type)?;
    Ok(true)
}

/// Generate a password
#[tauri::command]
pub fn vault_generate_password(
    length: Option<usize>,
    include_symbols: Option<bool>,
    include_digits: Option<bool>,
    avoid_ambiguous: Option<bool>,
) -> Result<String, String> {
    let normalized_length = length.unwrap_or(20).clamp(8, 64);
    let with_symbols = include_symbols.unwrap_or(true);
    let with_digits = include_digits.unwrap_or(true);
    let avoid_ambiguous_chars = avoid_ambiguous.unwrap_or(true);

    let lower = "abcdefghijkmnopqrstuvwxyz";
    let upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let digits = if avoid_ambiguous_chars {
        "23456789"
    } else {
        "0123456789"
    };
    let symbols = "!@#$%^&*()-_=+[]{};:,.?";

    let mut pool = format!("{}{}", lower, upper);
    if with_digits {
        pool.push_str(digits);
    }
    if with_symbols {
        pool.push_str(symbols);
    }
    if !avoid_ambiguous_chars {
        pool.push_str("Il1O0");
    }

    if pool.is_empty() {
        return Err("Недостаточно символов для генерации пароля".to_string());
    }

    let mut rng = rand::thread_rng();
    let charset: Vec<char> = pool.chars().collect();
    let generated = (0..normalized_length)
        .map(|_| charset.choose(&mut rng).copied().unwrap_or('a'))
        .collect::<String>();
    Ok(generated)
}
