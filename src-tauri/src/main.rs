#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, UserAttentionType,
};
use tauri_plugin_notification::NotificationExt;

mod security;
mod storage;
mod updates;
mod vault;

/// Show the main window
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let was_visible = window.is_visible().unwrap_or(false);
        let was_focused = window.is_focused().unwrap_or(false);

        let _ = window.set_skip_taskbar(false);
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();

        if was_visible && was_focused {
            let _ = window.request_user_attention(Some(UserAttentionType::Informational));
        }
    }
}

/// Hide the main window to the tray
fn hide_main_window_to_tray(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_skip_taskbar(true);
        let _ = window.hide();
    }
}

/// Main function
fn main() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            updates::check_for_updates,
            updates::download_and_install_update,
            storage::storage_get_many,
            storage::storage_set,
            storage::storage_remove,
            storage::storage_clear_all,
            storage::notes_list,
            storage::notes_upsert,
            storage::notes_remove,
            storage::notes_clear,
            security::hash_master_password,
            security::verify_master_password,
            vault::vault_list,
            vault::vault_list_events,
            vault::vault_create,
            vault::vault_update,
            vault::vault_delete,
            vault::vault_reveal,
            vault::vault_log_copy,
            vault::vault_generate_password,
        ]);

    builder = builder.setup(|app| {
        let database = storage::create_database_state(app.handle()).map_err(io::Error::other)?;
        app.manage(database);

        let show_i = MenuItem::with_id(app, "show", "Показать", true, None::<&str>)?;
        let quit_i = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

        let app_handle = app.handle().clone();
        let _tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&menu)
            .tooltip("Flowmode - Ежедневник")
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

        if let Some(window) = app.get_webview_window("main") {
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    hide_main_window_to_tray(&app_handle);
                    let _ = app_handle
                        .notification()
                        .builder()
                        .title("Flowmode")
                        .body("Приложение скрыто в трей. Для возврата нажмите на иконку в трее.")
                        .show();
                }
            });
        }

        Ok(())
    });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
