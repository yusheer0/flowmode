use bcrypt::{hash, verify, DEFAULT_COST};

#[tauri::command]
pub fn hash_master_password(password: String, rounds: Option<u32>) -> Result<String, String> {
    let cost = rounds.unwrap_or(DEFAULT_COST).clamp(4, 31);
    hash(password, cost).map_err(|error| format!("Ошибка хеширования мастер-пароля: {}", error))
}

#[tauri::command]
pub fn verify_master_password(password: String, stored_hash: String) -> Result<bool, String> {
    verify(password, &stored_hash).map_err(|error| format!("Ошибка проверки мастер-пароля: {}", error))
}
