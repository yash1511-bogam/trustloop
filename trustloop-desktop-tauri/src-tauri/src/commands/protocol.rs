use crate::state::{AppState, AuthUser, SessionData};
use std::sync::Arc;
use tauri::{Emitter, Manager};

/// Handle trustloop:// protocol URLs — same logic as Electron's handleProtocolUrl
pub async fn handle_protocol_url(app: &tauri::AppHandle, url: &str) {
    let Ok(parsed) = url::Url::parse(url) else { return };
    if parsed.host_str() != Some("oauth") { return; }

    let key = parsed.query_pairs().find(|(k, _)| k == "key").map(|(_, v)| v.to_string());
    let Some(key) = key else { return };

    let app_url = std::env::var("NEXT_PUBLIC_APP_URL").unwrap_or_else(|_| "https://trustloop.yashbogam.me".into());
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/api/auth/oauth/desktop/exchange", app_url))
        .json(&serde_json::json!({ "key": key }))
        .send().await;

    let Ok(resp) = resp else { return };
    let Ok(data) = resp.json::<serde_json::Value>().await else { return };

    let token = data["sessionToken"].as_str().unwrap_or("").to_string();
    let user_val = &data["user"];
    if token.is_empty() || user_val.is_null() { return; }

    let user = AuthUser {
        id: user_val["id"].as_str().unwrap_or("").to_string(),
        name: user_val["name"].as_str().unwrap_or("").to_string(),
        email: user_val["email"].as_str().unwrap_or("").to_string(),
        role: user_val["role"].as_str().unwrap_or("").to_string(),
        workspace_id: user_val["workspaceId"].as_str().unwrap_or("").to_string(),
        workspace_name: user_val["workspaceName"].as_str().unwrap_or("").to_string(),
        stytch_user_id: user_val["stytchUserId"].as_str().unwrap_or("").to_string(),
    };

    let state = app.state::<Arc<AppState>>();
    state.set_session(SessionData { token, user: user.clone() });

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("oauth-callback", &user);
    }
}
