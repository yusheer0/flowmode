#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

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
    message: Option<TelegramMessageData>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TelegramMessageData {
    chat: TelegramChat,
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
                        let _ = window.set_focus();
                    }
                }
            })
            .build(app)?;

        // Обработчик закрытия окна с проверкой настройки minimize_on_close
        let window = app.get_webview_window("main").unwrap();
        let window_clone = window.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = app_handle.state::<Arc<Mutex<AppState>>>();
                let app_state = state.lock().unwrap();
                
                if app_state.minimize_on_close {
                    api.prevent_close();
                    let _ = window_clone.hide();
                }
                // Если minimize_on_close = false, окно закроется автоматически
            }
        });

        Ok(())
    });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
