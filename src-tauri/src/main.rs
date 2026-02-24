#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use std::path::PathBuf;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
struct TelegramMessage {
    chat_id: String,
    text: String,
    parse_mode: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
struct AppState {
    minimize_on_close: bool,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            minimize_on_close: false,
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
) -> Result<String, String> {
    use std::io::Write;
    
    // Скачиваем файл
    let audio_data = get_telegram_file(bot_token, file_id)?;
    
    // Определяем директорию для хранения
    let app_data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("daily-diary")
        .join("voices");
    
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Ошибка создания директории: {}", e))?;
    
    // Сохраняем файл
    let file_path = app_data_dir.join(format!("{}.ogg", entry_id));
    let mut file = fs::File::create(&file_path)
        .map_err(|e| format!("Ошибка создания файла: {}", e))?;
    file.write_all(&audio_data)
        .map_err(|e| format!("Ошибка записи файла: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

fn main() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            send_telegram_notification,
            test_telegram_connection,
            get_telegram_chat_id,
            set_minimize_on_close,
            get_telegram_updates,
            get_telegram_file,
            save_telegram_voice,
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
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
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
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
            })
            .build(app)?;

        // Обработчик закрытия окна с проверкой настройки minimize_on_close
        let app_handle_for_window = app_handle.clone();
        if let Some(window) = app.get_webview_window("main") {
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    let state = app_handle_for_window.state::<Arc<Mutex<AppState>>>();
                    let app_state = state.lock().unwrap();

                    if app_state.minimize_on_close {
                        api.prevent_close();
                        if let Some(win) = app_handle_for_window.get_webview_window("main") {
                            let _ = win.minimize();
                        }
                    } else {
                        if let Some(win) = app_handle_for_window.get_webview_window("main") {
                            let _ = win.close();
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
