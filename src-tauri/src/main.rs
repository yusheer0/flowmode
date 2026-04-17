#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use rand::seq::SliceRandom;
use rusqlite::{Connection, OptionalExtension, params};
use std::collections::HashMap;
use std::error::Error;
use std::sync::{Arc, Mutex};
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Deserialize)]
struct TelegramMessage {
    chat_id: String,
    text: String,
    parse_mode: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
struct AppState {
    minimize_on_close: bool,
    tray_hint_shown: bool,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            minimize_on_close: true,
            tray_hint_shown: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct TelegramResponse {
    ok: bool,
    description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TelegramChat {
    id: i64,
    first_name: Option<String>,
    last_name: Option<String>,
    username: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TelegramResult {
    ok: bool,
    result: Option<Vec<TelegramUpdate>>,
    description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TelegramUpdate {
    update_id: i64,
    message: Option<TelegramMessageData>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TelegramMessageData {
    chat: TelegramChat,
    text: Option<String>,
    date: Option<i64>,
    voice: Option<TelegramVoice>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TelegramVoice {
    file_id: String,
    duration: Option<i64>,
}

#[tauri::command]
fn send_telegram_notification(
    bot_token: String,
    chat_id: String,
    message: String,
) -> Result<bool, String> {
    let url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token);

    let payload = TelegramMessage {
        chat_id,
        text: message,
        parse_mode: Some("HTML".to_string()),
    };

    let response = ureq::post(&url)
        .send_json(ureq::json!(payload))
        .map_err(|e| format!("Ошибка отправки: {}", e))?;

    let result: TelegramResponse = response
        .into_json()
        .map_err(|e| format!("Ошибка парсинга ответа: {}", e))?;

    if result.ok {
        Ok(true)
    } else {
        Err(result.description.unwrap_or_else(|| "Неизвестная ошибка".to_string()))
    }
}

#[tauri::command]
fn test_telegram_connection(
    bot_token: String,
    chat_id: String,
) -> Result<bool, String> {
    send_telegram_notification(
        bot_token,
        chat_id,
        "✅ <b>Ежедневник</b>\n\nПодключение к Telegram успешно! Теперь вы будете получать уведомления о записях.".to_string(),
    )
}

#[tauri::command]
fn get_telegram_chat_id(
    bot_token: String,
) -> Result<String, String> {
    let url = format!("https://api.telegram.org/bot{}/getUpdates", bot_token);

    let response = ureq::get(&url)
        .call()
        .map_err(|e| format!("Ошибка запроса: {}", e))?;

    let result: TelegramResult = response
        .into_json()
        .map_err(|e| format!("Ошибка парсинга ответа: {}", e))?;

    if result.ok {
        if let Some(updates) = result.result {
            if let Some(update) = updates.last() {
                if let Some(message) = &update.message {
                    return Ok(message.chat.id.to_string());
                }
            }
        }
        Err("Не найдено сообщений от бота. Напишите боту любое сообщение.".to_string())
    } else {
        Err(result.description.unwrap_or_else(|| "Неизвестная ошибка".to_string()))
    }
}

#[tauri::command]
fn set_minimize_on_close(state: tauri::State<Arc<Mutex<AppState>>>, minimize_on_close: bool) {
    let mut app_state = state.lock().unwrap();
    app_state.minimize_on_close = minimize_on_close;
}

/// Получает новые сообщения из Telegram
#[tauri::command]
fn get_telegram_updates(
    bot_token: String,
    offset: i64,
) -> Result<Vec<TelegramUpdate>, String> {
    let url = format!("https://api.telegram.org/bot{}/getUpdates?offset={}&timeout=1", bot_token, offset);

    let response = ureq::get(&url)
        .call()
        .map_err(|e| format!("Ошибка запроса: {}", e))?;

    let result: TelegramResult = response
        .into_json()
        .map_err(|e| format!("Ошибка парсинга ответа: {}", e))?;

    if result.ok {
        Ok(result.result.unwrap_or_default())
    } else {
        Err(result.description.unwrap_or_else(|| "Неизвестная ошибка".to_string()))
    }
}

/// Скачивает файл из Telegram
#[tauri::command]
fn get_telegram_file(
    bot_token: String,
    file_id: String,
) -> Result<Vec<u8>, String> {
    // Получаем информацию о файле
    let url = format!("https://api.telegram.org/bot{}/getFile?file_id={}", bot_token, file_id);
    
    let response = ureq::get(&url)
        .call()
        .map_err(|e| format!("Ошибка запроса информации о файле: {}", e))?;
    
    let json: serde_json::Value = response
        .into_json()
        .map_err(|e| format!("Ошибка парсинга ответа: {}", e))?;
    
    if json["ok"].as_bool() == Some(true) {
        let file_path = json["result"]["file_path"]
            .as_str()
            .ok_or("Файл не найден")?;
        
        // Скачиваем файл
        let download_url = format!("https://api.telegram.org/file/bot{}/{}", bot_token, file_path);
        let response = ureq::get(&download_url)
            .call()
            .map_err(|e| format!("Ошибка скачивания файла: {}", e))?;
        
        // Читаем байты через reader
        let mut reader = response.into_reader();
        let mut bytes = Vec::new();
        std::io::Read::read_to_end(&mut reader, &mut bytes)
            .map_err(|e| format!("Ошибка чтения файла: {}", e))?;
        
        Ok(bytes)
    } else {
        Err(json["description"].as_str().unwrap_or("Неизвестная ошибка").to_string())
    }
}

/// Сохраняет голосовое сообщение из Telegram в директорию приложения
#[tauri::command]
fn save_telegram_voice(
    bot_token: String,
    file_id: String,
    entry_id: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    use std::io::Write;

    // Скачиваем файл (OGG формат)
    let audio_data = get_telegram_file(bot_token, file_id)?;

    // Определяем директорию для хранения в пределах app's data directory
    let app_data_dir = app
        .path()
        .data_dir()
        .map_err(|e| format!("Ошибка получения data_dir: {}", e))?
        .join("voices");

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Ошибка создания директории: {}", e))?;

    // Сохраняем файл в OGG формате
    let file_path = app_data_dir.join(format!("{}.ogg", entry_id));
    let mut file = fs::File::create(&file_path)
        .map_err(|e| format!("Ошибка создания файла: {}", e))?;
    file.write_all(&audio_data)
        .map_err(|e| format!("Ошибка записи файла: {}", e))?;

    // Возвращаем обычный путь к файлу
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn send_telegram_file(
    bot_token: String,
    chat_id: String,
    content: String,
    file_name: String,
) -> Result<bool, String> {
    // Используем метод sendDocument для отправки файла
    let url = format!("https://api.telegram.org/bot{}/sendDocument", bot_token);

    // Создаем multipart форму вручную
    let boundary = "------------------------"
        .to_string()
        .chars()
        .chain(std::iter::repeat(()).take(24).map(|_| {
            "0123456789abcdef"
                .chars()
                .nth(rand::random::<usize>() % 16)
                .unwrap()
        }))
        .collect::<String>();

    let mut body = Vec::new();

    // Добавляем chat_id
    let chat_id_part = format!(
        "--{}\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n{}\r\n",
        boundary, chat_id
    );
    body.extend_from_slice(chat_id_part.as_bytes());

    // Добавляем файл
    let file_part = format!(
        "--{}\r\nContent-Disposition: form-data; name=\"document\"; filename=\"{}\"\r\nContent-Type: application/json\r\n\r\n",
        boundary, file_name
    );
    body.extend_from_slice(file_part.as_bytes());
    body.extend_from_slice(content.as_bytes());
    body.extend_from_slice(b"\r\n");

    // Добавляем завершающий boundary
    let end_part = format!("--{}--\r\n", boundary);
    body.extend_from_slice(end_part.as_bytes());

    let response = ureq::post(&url)
        .set("Content-Type", &format!("multipart/form-data; boundary={}", boundary))
        .send_bytes(&body)
        .map_err(|e| format!("Ошибка отправки: {}", e))?;

    let result: TelegramResponse = response
        .into_json()
        .map_err(|e| format!("Ошибка парсинга ответа: {}", e))?;

    if result.ok {
        Ok(true)
    } else {
        Err(result.description.unwrap_or_else(|| "Неизвестная ошибка".to_string()))
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct WeatherData {
    name: String,
    country: String,
    temp: f64,
    humidity: f64,
    wind_speed: f64,
    weather_code: i32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateCheckResult {
    available: bool,
    current_version: String,
    target_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateDownloadProgress {
    downloaded: u64,
    content_length: Option<u64>,
    progress: Option<f64>,
    version: String,
}

fn format_error_chain(error: &dyn Error) -> String {
    let mut details = error.to_string();
    let mut source = error.source();

    while let Some(cause) = source {
        details.push_str(": ");
        details.push_str(&cause.to_string());
        source = cause.source();
    }

    details
}

const SQLITE_FILE_NAME: &str = "flowmode.sqlite";

fn open_database(app: &tauri::AppHandle) -> Result<Connection, String> {
    let db_dir = app
        .path()
        .data_dir()
        .map_err(|error| format!("Ошибка получения data_dir: {}", error))?
        .join("flowmode");

    fs::create_dir_all(&db_dir)
        .map_err(|error| format!("Ошибка создания директории БД: {}", error))?;

    let db_path = db_dir.join(SQLITE_FILE_NAME);
    let connection = Connection::open(&db_path)
        .map_err(|error| format!("Ошибка открытия SQLite: {}", error))?;
    connection
        .execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS kv_store (
              key TEXT PRIMARY KEY NOT NULL,
              value TEXT NOT NULL,
              updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS vault_items (
              id TEXT PRIMARY KEY NOT NULL,
              title TEXT NOT NULL,
              service TEXT NOT NULL,
              username TEXT NOT NULL,
              password TEXT NOT NULL,
              url TEXT,
              notes TEXT,
              tags_json TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS vault_events (
              id TEXT PRIMARY KEY NOT NULL,
              item_id TEXT NOT NULL,
              event_type TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_vault_items_updated_at ON vault_items(updated_at);
            CREATE INDEX IF NOT EXISTS idx_vault_events_created_at ON vault_events(created_at);
            CREATE INDEX IF NOT EXISTS idx_vault_events_item_id ON vault_events(item_id);
            "#,
        )
        .map_err(|error| format!("Ошибка инициализации SQLite схемы: {}", error))?;
    Ok(connection)
}

#[tauri::command]
fn storage_get(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let connection = open_database(&app)?;
    connection
        .query_row(
            "SELECT value FROM kv_store WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Ошибка чтения из SQLite: {}", error))
}

#[tauri::command]
fn storage_get_many(app: tauri::AppHandle, keys: Vec<String>) -> Result<HashMap<String, String>, String> {
    let connection = open_database(&app)?;
    let mut result = HashMap::new();
    let mut statement = connection
        .prepare("SELECT value FROM kv_store WHERE key = ?1")
        .map_err(|error| format!("Ошибка подготовки запроса SQLite: {}", error))?;

    for key in keys {
        let value = statement
            .query_row(params![&key], |row| row.get::<_, String>(0))
            .optional()
            .map_err(|error| format!("Ошибка чтения ключа `{}` из SQLite: {}", key, error))?;
        if let Some(raw) = value {
            result.insert(key, raw);
        }
    }

    Ok(result)
}

#[tauri::command]
fn storage_set(app: tauri::AppHandle, key: String, value: String) -> Result<bool, String> {
    let connection = open_database(&app)?;
    connection
        .execute(
            r#"
            INSERT INTO kv_store (key, value, updated_at)
            VALUES (?1, ?2, CAST(strftime('%s','now') AS INTEGER))
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = excluded.updated_at
            "#,
            params![key, value],
        )
        .map(|_| true)
        .map_err(|error| format!("Ошибка записи в SQLite: {}", error))
}

#[tauri::command]
fn storage_remove(app: tauri::AppHandle, key: String) -> Result<bool, String> {
    let connection = open_database(&app)?;
    connection
        .execute("DELETE FROM kv_store WHERE key = ?1", params![key])
        .map(|affected| affected > 0)
        .map_err(|error| format!("Ошибка удаления из SQLite: {}", error))
}

#[tauri::command]
fn storage_clear_all(app: tauri::AppHandle) -> Result<bool, String> {
    let connection = open_database(&app)?;
    connection
        .execute_batch(
            r#"
            DELETE FROM kv_store;
            DELETE FROM vault_events;
            DELETE FROM vault_items;
            "#,
        )
        .map(|_| true)
        .map_err(|error| format!("Ошибка очистки SQLite: {}", error))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultEvent {
    id: String,
    item_id: String,
    event_type: String,
    created_at: String,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultListItem {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultItemInput {
    title: String,
    service: String,
    username: String,
    password: String,
    url: Option<String>,
    notes: Option<String>,
    tags: Vec<String>,
}

fn now_unix_ms() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn random_id(prefix: &str) -> String {
    format!("{}-{}-{}", prefix, now_unix_ms(), rand::random::<u32>())
}

fn parse_tags(tags_json: String) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(&tags_json).unwrap_or_default()
}

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

fn append_vault_event(connection: &Connection, item_id: &str, event_type: &str) -> Result<(), String> {
    connection
        .execute(
            "INSERT INTO vault_events (id, item_id, event_type, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![random_id("event"), item_id, event_type, now_unix_ms()],
        )
        .map(|_| ())
        .map_err(|error| format!("Ошибка сохранения события vault: {}", error))
}

fn load_vault_items(connection: &Connection) -> Result<Vec<VaultStoredItem>, String> {
    let mut statement = connection
        .prepare(
            r#"
            SELECT id, title, service, username, password, url, notes, tags_json, created_at, updated_at
            FROM vault_items
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|error| format!("Ошибка подготовки чтения vault_items: {}", error))?;

    let rows = statement
        .query_map([], |row| {
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
        .map_err(|error| format!("Ошибка чтения vault_items: {}", error))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Ошибка обработки vault_items: {}", error))
}

#[tauri::command]
fn vault_list(app: tauri::AppHandle) -> Result<Vec<VaultListItem>, String> {
    let connection = open_database(&app)?;
    let items = load_vault_items(&connection)?;
    Ok(items.iter().map(to_vault_list_item).collect())
}

#[tauri::command]
fn vault_list_events(app: tauri::AppHandle, item_id: Option<String>) -> Result<Vec<VaultEvent>, String> {
    let connection = open_database(&app)?;
    if let Some(id) = item_id {
        let mut statement = connection
            .prepare(
                r#"
                SELECT id, item_id, event_type, created_at
                FROM vault_events
                WHERE item_id = ?1
                ORDER BY created_at DESC
                "#,
            )
            .map_err(|error| format!("Ошибка подготовки чтения vault_events: {}", error))?;
        let rows = statement
            .query_map(params![id], |row| {
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
    } else {
        let mut statement = connection
            .prepare(
                r#"
                SELECT id, item_id, event_type, created_at
                FROM vault_events
                ORDER BY created_at DESC
                "#,
            )
            .map_err(|error| format!("Ошибка подготовки чтения vault_events: {}", error))?;
        let rows = statement
            .query_map([], |row| {
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
}

#[tauri::command]
fn vault_create(app: tauri::AppHandle, input: VaultItemInput) -> Result<VaultListItem, String> {
    if input.password.trim().is_empty() {
        return Err("Пароль не может быть пустым".to_string());
    }

    let connection = open_database(&app)?;
    let now = now_unix_ms();
    let item = VaultStoredItem {
        id: random_id("vault"),
        title: input.title.trim().to_string(),
        service: input.service.trim().to_string(),
        username: input.username.trim().to_string(),
        password: input.password,
        url: input.url.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()),
        notes: input.notes.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()),
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

#[tauri::command]
fn vault_update(app: tauri::AppHandle, id: String, input: VaultItemInput) -> Result<VaultListItem, String> {
    if input.password.trim().is_empty() {
        return Err("Пароль не может быть пустым".to_string());
    }

    let connection = open_database(&app)?;
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

    let updated = VaultStoredItem {
        id: existing.id.clone(),
        title: input.title.trim().to_string(),
        service: input.service.trim().to_string(),
        username: input.username.trim().to_string(),
        password: input.password,
        url: input.url.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()),
        notes: input.notes.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()),
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

#[tauri::command]
fn vault_delete(app: tauri::AppHandle, id: String) -> Result<bool, String> {
    let connection = open_database(&app)?;
    let deleted = connection
        .execute("DELETE FROM vault_items WHERE id = ?1", params![&id])
        .map_err(|error| format!("Ошибка удаления vault-записи: {}", error))?;
    if deleted == 0 {
        return Ok(false);
    }
    append_vault_event(&connection, &id, "deleted")?;
    Ok(true)
}

#[tauri::command]
fn vault_reveal(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let connection = open_database(&app)?;
    let password = connection
        .query_row(
            "SELECT password FROM vault_items WHERE id = ?1",
            params![&id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Ошибка чтения vault-записи: {}", error))?
        .ok_or("Запись не найдена".to_string())?;
    append_vault_event(&connection, &id, "revealed")?;
    Ok(password)
}

#[tauri::command]
fn vault_log_copy(app: tauri::AppHandle, item_id: String, field: String) -> Result<bool, String> {
    let connection = open_database(&app)?;
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
    let event_type = if field == "username" { "copied_login" } else { "copied_password" };
    append_vault_event(&connection, &item_id, event_type)?;
    Ok(true)
}

#[tauri::command]
fn vault_generate_password(
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
    let digits = if avoid_ambiguous_chars { "23456789" } else { "0123456789" };
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

#[tauri::command]
fn fetch_weather(city: String, unit: String) -> Result<WeatherData, String> {
    let geo_response = ureq::get("https://geocoding-api.open-meteo.com/v1/search")
        .query("name", &city)
        .query("count", "1")
        .query("language", "ru")
        .query("format", "json")
        .call()
        .map_err(|e| format!("Ошибка поиска города: {}", e))?;

    let geo_json: serde_json::Value = geo_response
        .into_json()
        .map_err(|e| format!("Ошибка парсинга: {}", e))?;

    let results = geo_json["results"]
        .as_array()
        .ok_or("Город не найден".to_string())?;

    if results.is_empty() {
        return Err("Город не найден".to_string());
    }

    let location = &results[0];
    let lat = location["latitude"].as_f64().ok_or("Нет координат".to_string())?;
    let lon = location["longitude"].as_f64().ok_or("Нет координат".to_string())?;
    let name = location["name"].as_str().unwrap_or("").to_string();
    let country = location["country"].as_str().unwrap_or("").to_string();

    let weather_response = ureq::get("https://api.open-meteo.com/v1/forecast")
        .query("latitude", &lat.to_string())
        .query("longitude", &lon.to_string())
        .query("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m")
        .query("temperature_unit", &unit)
        .query("timezone", "auto")
        .query("forecast_days", "1")
        .call()
        .map_err(|e| format!("Ошибка загрузки погоды: {}", e))?;

    let weather_json: serde_json::Value = weather_response
        .into_json()
        .map_err(|e| format!("Ошибка парсинга погоды: {}", e))?;

    let current = &weather_json["current"];

    Ok(WeatherData {
        name,
        country,
        temp: current["temperature_2m"].as_f64().unwrap_or(0.0),
        humidity: current["relative_humidity_2m"].as_f64().unwrap_or(0.0),
        wind_speed: current["wind_speed_10m"].as_f64().unwrap_or(0.0),
        weather_code: current["weather_code"].as_i64().unwrap_or(0) as i32,
    })
}

/// Проверяет наличие обновлений
#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = app.package_info().version.to_string();
    match app.updater() {
        Ok(update) => {
            match update.check().await {
                Ok(Some(update)) => Ok(UpdateCheckResult {
                    available: true,
                    current_version,
                    target_version: Some(update.version.to_string()),
                }),
                Ok(None) => Ok(UpdateCheckResult {
                    available: false,
                    current_version,
                    target_version: None,
                }),
                Err(e) => Err(format!(
                    "Ошибка проверки обновлений: {}",
                    format_error_chain(&e)
                )),
            }
        }
        Err(e) => Err(format!("Updater не доступен: {}", format_error_chain(&e))),
    }
}

/// Загружает и устанавливает обновление
#[tauri::command]
async fn download_and_install_update(app: tauri::AppHandle) -> Result<(), String> {
    match app.updater() {
        Ok(updater) => {
            match updater.check().await {
                Ok(Some(update)) => {
                    let target_version = update.version.to_string();
                    let app_handle = app.clone();
                    let emit_version = target_version.clone();
                    let mut total_downloaded: u64 = 0;
                    update
                        .download_and_install(
                            move |downloaded, content_length| {
                                let downloaded_chunk = downloaded as u64;
                                // Some updater backends report chunk size instead of cumulative bytes.
                                // Normalize it to cumulative progress to keep the UI progress bar moving.
                                if downloaded_chunk >= total_downloaded {
                                    total_downloaded = downloaded_chunk;
                                } else {
                                    total_downloaded = total_downloaded.saturating_add(downloaded_chunk);
                                }
                                let progress = content_length
                                    .and_then(|total| {
                                        if total > 0 {
                                            Some((total_downloaded as f64 / total as f64) * 100.0)
                                        } else {
                                            None
                                        }
                                    });
                                let payload = UpdateDownloadProgress {
                                    downloaded: total_downloaded,
                                    content_length,
                                    progress,
                                    version: emit_version.clone(),
                                };
                                let _ = app_handle.emit("update_download_progress", payload);
                            },
                            || {},
                        )
                        .await
                        .map_err(|e| {
                            format!(
                                "Ошибка установки обновления: {}",
                                format_error_chain(&e)
                            )
                        })?;
                    app.restart();
                }
                Ok(None) => Err("Обновлений не найдено".to_string()),
                Err(e) => Err(format!(
                    "Ошибка проверки обновлений: {}",
                    format_error_chain(&e)
                )),
            }
        }
        Err(e) => Err(format!("Updater не доступен: {}", format_error_chain(&e))),
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_skip_taskbar(false);
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn hide_main_window_to_tray(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_skip_taskbar(true);
        let _ = window.hide();
    }
}

fn main() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            send_telegram_notification,
            test_telegram_connection,
            get_telegram_chat_id,
            set_minimize_on_close,
            get_telegram_updates,
            get_telegram_file,
            save_telegram_voice,
            send_telegram_file,
            fetch_weather,
            check_for_updates,
            download_and_install_update,
            storage_get,
            storage_get_many,
            storage_set,
            storage_remove,
            storage_clear_all,
            vault_list,
            vault_list_events,
            vault_create,
            vault_update,
            vault_delete,
            vault_reveal,
            vault_log_copy,
            vault_generate_password,
        ])
        .manage(Arc::new(Mutex::new(AppState::default())));

    builder = builder.setup(|app| {
        let show_i = MenuItem::with_id(app, "show", "Показать", true, None::<&str>)?;
        let quit_i = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;

        let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

        let app_handle = app.handle().clone();
        let _tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&menu)
            .tooltip("FLOWMODE - Ежедневник")
            .on_menu_event(move |app, event| match event.id.as_ref() {
                "show" => {
                    show_main_window(app);
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    let app = tray.app_handle();
                    show_main_window(app);
                }
            })
            .build(app)?;

        // Обработчик закрытия окна с проверкой настройки minimize_on_close
        let app_handle_for_window = app_handle.clone();
        if let Some(window) = app.get_webview_window("main") {
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    let state = app_handle_for_window.state::<Arc<Mutex<AppState>>>();
                    let (hide_to_tray, show_tray_hint) = {
                        let mut app_state = state.lock().unwrap();
                        if app_state.minimize_on_close {
                            let should_show_hint = !app_state.tray_hint_shown;
                            if should_show_hint {
                                app_state.tray_hint_shown = true;
                            }
                            (true, should_show_hint)
                        } else {
                            (false, false)
                        }
                    };

                    if hide_to_tray {
                        api.prevent_close();
                        hide_main_window_to_tray(&app_handle_for_window);

                        if show_tray_hint {
                            let _ = app_handle_for_window
                                .notification()
                                .builder()
                                .title("FLOWMODE")
                                .body("Приложение скрыто в трей. Для возврата нажмите на иконку в трее.")
                                .show();
                        }
                    }
                }
            });
        }

        Ok(())
    });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
