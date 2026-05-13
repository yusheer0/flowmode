use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;

use rusqlite::{Connection, params, params_from_iter};
use serde::Serialize;
use tauri::Manager;

use crate::security::migrate_vault_passwords;

const SQLITE_FILE_NAME: &str = "flowmode.sqlite";

fn migrate_vault_sort_order(connection: &Connection) -> Result<(), String> {
    let mut statement = connection
        .prepare("PRAGMA table_info(vault_items)")
        .map_err(|error| format!("Ошибка PRAGMA vault_items: {}", error))?;
    let column_names: Vec<String> = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("Ошибка чтения PRAGMA vault_items: {}", error))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Ошибка обработки PRAGMA vault_items: {}", error))?;

    if column_names.iter().any(|name| name == "sort_order") {
        return Ok(());
    }

    connection
        .execute(
            "ALTER TABLE vault_items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
            [],
        )
        .map_err(|error| format!("Ошибка ALTER vault_items (sort_order): {}", error))?;

    let mut statement = connection
        .prepare("SELECT id FROM vault_items ORDER BY updated_at DESC")
        .map_err(|error| format!("Ошибка подготовки миграции sort_order: {}", error))?;
    let ids: Vec<String> = statement
        .query_map([], |row| row.get(0))
        .map_err(|error| format!("Ошибка чтения id vault при миграции: {}", error))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Ошибка обработки id vault: {}", error))?;

    for (index, id) in ids.iter().enumerate() {
        connection
            .execute(
                "UPDATE vault_items SET sort_order = ?1 WHERE id = ?2",
                params![index as i64, id],
            )
            .map_err(|error| format!("Ошибка назначения sort_order: {}", error))?;
    }

    Ok(())
}

/// Database state
pub struct DatabaseState {
    pub connection: Mutex<Connection>,
}

/// Stored note record
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredNoteRecord {
    id: String,
    payload: String,
    updated_at: i64,
}

/// Open the database
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
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            PRAGMA secure_delete = ON;
            "#,
        )
        .map_err(|error| format!("Ошибка применения PRAGMA SQLite: {}", error))?;
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
              updated_at TEXT NOT NULL,
              sort_order INTEGER NOT NULL DEFAULT 0
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
    migrate_vault_sort_order(&connection)
        .map_err(|error| format!("Ошибка миграции vault sort_order: {}", error))?;
    migrate_vault_passwords(app, &connection)
        .map_err(|error| format!("Ошибка миграции vault-паролей: {}", error))?;
    Ok(connection)
}

/// Create the database state
pub fn create_database_state(app: &tauri::AppHandle) -> Result<DatabaseState, String> {
    let connection = open_database(app)?;
    Ok(DatabaseState {
        connection: Mutex::new(connection),
    })
}

/// Get many keys from the database
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
    let placeholders = std::iter::repeat_n("?", keys.len())
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

/// Set a key in the database
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

/// Remove a key from the database
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

/// Clear all keys from the database
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

/// List the notes from the database
#[tauri::command]
pub fn notes_list(
    database: tauri::State<'_, DatabaseState>,
) -> Result<Vec<StoredNoteRecord>, String> {
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

/// Upsert a note in the database
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

/// Remove a note from the database
#[tauri::command]
pub fn notes_remove(database: tauri::State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let connection = database
        .connection
        .lock()
        .map_err(|_| "Ошибка блокировки SQLite соединения".to_string())?;
    connection
        .execute("DELETE FROM notes_items WHERE id = ?1", params![id])
        .map(|affected| affected > 0)
        .map_err(|error| format!("Ошибка удаления note из SQLite: {}", error))
}

/// Clear all notes from the database
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
