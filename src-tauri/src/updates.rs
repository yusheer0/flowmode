use std::error::Error;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
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

#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = app.package_info().version.to_string();
    match app.updater() {
        Ok(update) => match update.check().await {
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
        },
        Err(e) => Err(format!("Updater не доступен: {}", format_error_chain(&e))),
    }
}

#[tauri::command]
pub async fn download_and_install_update(app: tauri::AppHandle) -> Result<(), String> {
    const PROGRESS_EMIT_INTERVAL: Duration = Duration::from_millis(150);
    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => {
                let target_version = update.version.to_string();
                let app_handle = app.clone();
                let app_handle_for_finish = app_handle.clone();
                let emit_version = target_version.clone();
                let emit_version_for_finish = emit_version.clone();
                let mut total_downloaded: u64 = 0;
                let mut last_emit_at: Option<Instant> = None;
                let mut last_emitted_percent: Option<u8> = None;
                update
                    .download_and_install(
                        move |downloaded, content_length| {
                            let downloaded_chunk = downloaded as u64;
                            total_downloaded = total_downloaded.saturating_add(downloaded_chunk);
                            let progress = content_length.and_then(|total| {
                                if total > 0 {
                                    Some((total_downloaded as f64 / total as f64) * 100.0)
                                } else {
                                    None
                                }
                            });
                            let now = Instant::now();
                            let current_percent = progress
                                .map(|value| value.clamp(0.0, 100.0).floor() as u8);
                            let reached_new_percent = match (current_percent, last_emitted_percent) {
                                (Some(next), Some(prev)) => next >= prev.saturating_add(1),
                                (Some(_), None) => true,
                                _ => false,
                            };
                            let can_emit_by_interval = last_emit_at
                                .map(|prev| now.duration_since(prev) >= PROGRESS_EMIT_INTERVAL)
                                .unwrap_or(true);
                            if !reached_new_percent && !can_emit_by_interval {
                                return;
                            }
                            last_emit_at = Some(now);
                            last_emitted_percent = current_percent;
                            let payload = UpdateDownloadProgress {
                                downloaded: total_downloaded,
                                content_length,
                                progress,
                                version: emit_version.clone(),
                            };
                            let _ = app_handle.emit("update_download_progress", payload);
                        },
                        || {
                            let payload = UpdateDownloadProgress {
                                downloaded: total_downloaded,
                                content_length: None,
                                progress: Some(100.0),
                                version: emit_version_for_finish.clone(),
                            };
                            let _ = app_handle_for_finish.emit("update_download_progress", payload);
                        },
                    )
                    .await
                    .map_err(|e| {
                        format!(
                            "Ошибка установки обновления: {}",
                            format_error_chain(&e)
                        )
                    })?;
                app.restart()
            }
            Ok(None) => Err("Обновлений не найдено".to_string()),
            Err(e) => Err(format!(
                "Ошибка проверки обновлений: {}",
                format_error_chain(&e)
            )),
        },
        Err(e) => Err(format!("Updater не доступен: {}", format_error_chain(&e))),
    }
}
