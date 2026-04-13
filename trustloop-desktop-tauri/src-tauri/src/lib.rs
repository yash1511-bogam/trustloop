mod auth;
mod commands;
mod db;
mod menu;
mod redis_mod;
mod secrets;
mod state;

use state::AppState;
use std::sync::Arc;
use tauri::{Listener, Manager};

pub fn run() {
    // Apple Silicon gate — same as Electron's process.arch check
    #[cfg(target_os = "macos")]
    {
        if std::env::consts::ARCH != "aarch64" {
            eprintln!("TrustLoop Desktop requires Apple Silicon (M1 or later).");
            std::process::exit(1);
        }
    }

    // Load .env in development
    if std::env::var("NODE_ENV").unwrap_or_default() != "production" {
        // Walk up to repo root to find .env (same as Electron: 3 levels up from dist/main)
        let repo_root = std::env::current_dir()
            .ok()
            .and_then(|p| p.parent().and_then(|p| p.parent().map(|p| p.to_path_buf())))
            .unwrap_or_default();
        let env_path = repo_root.join(".env");
        if env_path.exists() {
            dotenv::from_path(&env_path).ok();
        } else {
            dotenv::dotenv().ok();
        }
    }

    let state = Arc::new(AppState::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // Same as Electron second-instance: focus window, handle protocol URL
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
            if let Some(url) = argv.iter().find(|a| a.starts_with("trustloop://")) {
                let app_handle = app.clone();
                let url = url.clone();
                tauri::async_runtime::spawn(async move {
                    crate::commands::handle_protocol_url(&app_handle, &url).await;
                });
            }
        }))
        .manage(state.clone())
        .setup(move |app| {
            // Load AWS secrets before anything else (same as Electron)
            let state_clone = state.clone();
            tauri::async_runtime::block_on(async {
                if let Err(e) = secrets::load_aws_secrets().await {
                    log::error!("Failed to load AWS secrets: {}", e);
                }
                // Initialize DB and Redis pools after secrets are loaded
                if let Err(e) = state_clone.init_pools().await {
                    log::error!("Failed to init pools: {}", e);
                }
            });

            // Build native menu (same menus as Electron)
            let menu = menu::build_menu(app.handle())?;
            app.set_menu(menu)?;
            menu::setup_menu_events(app);

            if let Some(window) = app.get_webview_window("main") {
                let bounds_path = app
                    .path()
                    .app_data_dir()
                    .map(|p| p.join("window-bounds.json"))
                    .ok();
                if let Some(ref bp) = bounds_path {
                    if let Ok(data) = std::fs::read_to_string(bp) {
                        if let Ok(bounds) = serde_json::from_str::<state::WindowBounds>(&data) {
                            let _ = window.set_position(tauri::PhysicalPosition::new(
                                bounds.x.unwrap_or(0),
                                bounds.y.unwrap_or(0),
                            ));
                            let _ = window.set_size(tauri::PhysicalSize::new(
                                bounds.width,
                                bounds.height,
                            ));
                        }
                    }
                }

                // Save bounds on move/resize (same as Electron)
                let win_clone = window.clone();
                let bp_clone = bounds_path.clone();
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
                            if let Some(ref bp) = bp_clone {
                                if let (Ok(pos), Ok(size)) =
                                    (win_clone.outer_position(), win_clone.outer_size())
                                {
                                    let bounds = state::WindowBounds {
                                        x: Some(pos.x),
                                        y: Some(pos.y),
                                        width: size.width,
                                        height: size.height,
                                    };
                                    if let Ok(json) = serde_json::to_string(&bounds) {
                                        let _ = std::fs::write(bp, json);
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                });

                // Show window after setup (same as Electron's ready-to-show)
                #[cfg(target_os = "macos")]
                {
                    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::UnderWindowBackground, None, None);
                }
                let _ = window.show();
            }

            // Handle deep link events
            let app_handle = app.handle().clone();
            app.listen("deep-link://new-url", move |event: tauri::Event| {
                if let Ok(url_list) = serde_json::from_str::<Vec<String>>(event.payload()) {
                    for url in url_list {
                        if url.starts_with("trustloop://") {
                            let handle = app_handle.clone();
                            let u = url.clone();
                            tauri::async_runtime::spawn(async move {
                                crate::commands::handle_protocol_url(&handle, &u).await;
                            });
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth_send_otp,
            commands::auth_verify_otp,
            commands::auth_session,
            commands::auth_logout,
            commands::auth_oauth_start,
            commands::auth_register_start,
            commands::auth_register_verify,
            commands::dashboard_data,
            commands::incidents_counts,
            commands::incidents_list,
            commands::incidents_get,
            commands::incidents_update_status,
            commands::incidents_create,
            commands::incidents_export_csv,
            commands::incidents_detail,
            commands::incidents_update,
            commands::incidents_publish_update,
            commands::incidents_add_event,
            commands::workspace_info,
            commands::workspace_overview,
            commands::workspace_general,
            commands::workspace_update,
            commands::workspace_team,
            commands::team_invite,
            commands::workspace_billing,
            commands::workspace_refresh_read_models,
            commands::analytics_summary,
            commands::profile_get,
            commands::profile_update,
            commands::onboarding_dismiss,
            commands::integrations_ai,
            commands::ai_keys_save,
            commands::ai_keys_test,
            commands::workflows_save,
            commands::integrations_webhooks,
            commands::webhooks_save_secret,
            commands::webhooks_rotate_secret,
            commands::webhooks_toggle,
            commands::integrations_oncall,
            commands::security_apikeys,
            commands::apikeys_create,
            commands::apikeys_revoke,
            commands::security_audit,
            commands::security_sso,
            commands::security_sso_save,
            commands::open_external,
            commands::update_download,
            commands::update_install,
            commands::update_dismiss,
        ])
        .run(tauri::generate_context!())
        .expect("error while running TrustLoop");
}
