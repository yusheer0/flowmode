use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;

use rusqlite::{params, params_from_iter, Connection};
use serde::Serialize;
use tauri::Manager;

const SQLITE_FILE_NAME: &str = "flowmode.sqlite";

pub struct DatabaseState {
    pub connection: Mutex<Connection>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredNoteRecord {
    id: String,
    payload: String,
    updated_at: i64,
}

fn open_database(app: &tauri::AppHandle) -> Result<Connection, String> {
    let db_dir = app
        .path()
        .data_dir()
        .map_err(|error| format!("Ошибка получения data_dir: {}", error))?
        .join("flowmode");

    fs::create_dir_all(&db_dir)
        .map_err(|error| format!("Ошибка создания директории БД: {}", error))?;

    let db_path = db_dir.join(SQLITE_FILE_NAME);
    let connection =
        Connection::open(&db_path).map_err(|error| format!("Ошибка открытия SQLite: {}", error))?;
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

            CREATE TABLE IF NOT EXISTS notes_items (
              id TEXT PRIMARY KEY NOT NULL,
              payload TEXT NOT NULL,
              updated_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_vault_items_updated_at ON vault_items(updated_at);
            CREATE INDEX IF NOT EXISTS idx_vault_events_created_at ON vault_events(created_at);
            CREATE INDEX IF NOT EXISTS idx_vault_events_item_id ON vault_events(item_id);
            CREATE INDEX IF NOT EXISTS idx_notes_items_updated_at ON notes_items(updated_at);
            "#,
        )
        .map_err(|error| format!("Ошибка инициализации SQLite схемы: {}", error))?;
    Ok(connection)
}

pub fn create_database_state(app: &tauri::AppHandle) -> Result<DatabaseState, String> {
    let connection = open_database(app)?;
    Ok(DatabaseState {
        connection: Mutex::new(connection),
    })
}

#[tauri::command]
pub fn storage_get_many(
    database: tauri::State<'_, DatabaseState>,
    keys: Vec<String>,
) -> Result<HashMap<String, String>, String> {
    if keys.is_empty() {
        return Ok(HashMap::new());
    }

    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    let mut result = HashMap::new();
    let placeholders = std::iter::repeat("?")
        .take(keys.len())
        .collect::<Vec<_>>()
        .join(", ");
    let query = format!(
        "SELECT key, value FROM kv_store WHERE key IN ({})",
        placeholders
    );
    let mut statement = connection
        .prepare(&query)
        .map_err(|error| format!("Ошибка подготовки запроса SQLite: {}", error))?;
    let rows = statement
        .query_map(params_from_iter(keys.iter()), |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| format!("Ошибка чтения ключей из SQLite: {}", error))?;

    for row in rows {
        let (key, value) =
            row.map_err(|error| format!("Ошибка обработки ключей из SQLite: {}", error))?;
        result.insert(key, value);
    }

    Ok(result)
}

#[tauri::command]
pub fn storage_set(
    database: tauri::State<'_, DatabaseState>,
    key: String,
    value: String,
) -> Result<bool, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
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
pub fn storage_remove(
    database: tauri::State<'_, DatabaseState>,
    key: String,
) -> Result<bool, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    connection
        .execute("DELETE FROM kv_store WHERE key = ?1", params![key])
        .map(|affected| affected > 0)
        .map_err(|error| format!("Ошибка удаления из SQLite: {}", error))
}

#[tauri::command]
pub fn storage_clear_all(database: tauri::State<'_, DatabaseState>) -> Result<bool, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    connection
        .execute_batch(
            r#"
            DELETE FROM kv_store;
            DELETE FROM vault_events;
            DELETE FROM vault_items;
            DELETE FROM notes_items;
            "#,
        )
        .map(|_| true)
        .map_err(|error| format!("Ошибка очистки SQLite: {}", error))
}

#[tauri::command]
pub fn notes_list(database: tauri::State<'_, DatabaseState>) -> Result<Vec<StoredNoteRecord>, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    let mut statement = connection
        .prepare(
            r#"
            SELECT id, payload, updated_at
            FROM notes_items
            ORDER BY updated_at DESC
            "#,
        )
        .map_err(|error| format!("Ошибка подготовки чтения notes_items: {}", error))?;
    let rows = statement
        .query_map([], |row| {
            Ok(StoredNoteRecord {
                id: row.get(0)?,
                payload: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })
        .map_err(|error| format!("Ошибка чтения notes_items: {}", error))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Ошибка обработки notes_items: {}", error))
}

#[tauri::command]
pub fn notes_upsert(
    database: tauri::State<'_, DatabaseState>,
    id: String,
    payload: String,
) -> Result<bool, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    connection
        .execute(
            r#"
            INSERT INTO notes_items (id, payload, updated_at)
            VALUES (?1, ?2, CAST(strftime('%s','now') AS INTEGER))
            ON CONFLICT(id) DO UPDATE SET
              payload = excluded.payload,
              updated_at = excluded.updated_at
            "#,
            params![id, payload],
        )
        .map(|_| true)
        .map_err(|error| format!("Ошибка записи note в SQLite: {}", error))
}

#[tauri::command]
pub fn notes_remove(
    database: tauri::State<'_, DatabaseState>,
    id: String,
) -> Result<bool, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    connection
        .execute("DELETE FROM notes_items WHERE id = ?1", params![id])
        .map(|affected| affected > 0)
        .map_err(|error| format!("Ошибка удаления note из SQLite: {}", error))
}

#[tauri::command]
pub fn notes_clear(database: tauri::State<'_, DatabaseState>) -> Result<bool, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    connection
        .execute("DELETE FROM notes_items", [])
        .map(|_| true)
        .map_err(|error| format!("Ошибка очистки notes_items: {}", error))
}
