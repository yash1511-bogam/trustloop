use crate::auth;
use crate::state::{AppState, AuthUser, SessionData};
use std::sync::Arc;
use tauri::State;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
pub async fn auth_send_otp(email: String) -> Result<serde_json::Value, String> {
    auth::send_otp(&email).await
}

#[tauri::command]
pub async fn auth_verify_otp(
    method_id: String, code: String, state: State<'_, Arc<AppState>>,
) -> Result<serde_json::Value, String> {
    let result = auth::verify_otp(&method_id, &code).await?;
    let stytch_uid = result["stytchUserId"].as_str().unwrap_or("").to_string();
    let token = result["sessionToken"].as_str().unwrap_or("").to_string();

    let pool = state.pool().ok_or("No DB")?;
    let row = sqlx::query_as::<_, (String, String, String, String, String, String, String)>(
        r#"SELECT u.id, u.name, u.email, u.role, u."workspaceId", w.name, u."stytchUserId"
           FROM "User" u JOIN "Workspace" w ON u."workspaceId" = w.id
           WHERE u."stytchUserId" = $1 LIMIT 1"#
    ).bind(&stytch_uid).fetch_optional(&pool).await.map_err(|e| e.to_string())?;

    let Some(row) = row else { return Ok(serde_json::json!({ "success": false, "user": null })) };
    let user = AuthUser { id: row.0, name: row.1, email: row.2, role: row.3, workspace_id: row.4, workspace_name: row.5, stytch_user_id: row.6 };
    state.set_session(SessionData { token, user: user.clone() });
    Ok(serde_json::json!({ "success": true, "user": user }))
}

#[tauri::command]
pub async fn auth_session(state: State<'_, Arc<AppState>>) -> Result<Option<AuthUser>, String> {
    let session = match state.get_session() {
        Some(s) => s,
        None => return Ok(None),
    };
    let pool = state.pool().ok_or("No DB")?;
    let mut redis = state.redis_cm();
    let user = auth::authenticate_session(&session.token, &pool, &mut redis).await;
    if user.is_none() { state.clear_session(); }
    Ok(user)
}

#[tauri::command]
pub async fn auth_logout(state: State<'_, Arc<AppState>>) -> Result<bool, String> {
    state.clear_session();
    Ok(true)
}

#[tauri::command]
pub async fn auth_oauth_start(
    app: tauri::AppHandle, provider: String, intent: Option<String>, workspace_name: Option<String>,
) -> Result<bool, String> {
    let url = auth::get_oauth_start_url(&provider, intent.as_deref(), workspace_name.as_deref()).await?;
    // Use Tauri's shell opener (same as Electron's shell.openExternal)
    #[allow(deprecated)]
    app.shell().open(&url, None).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn auth_register_start(
    opts: serde_json::Value, state: State<'_, Arc<AppState>>,
) -> Result<serde_json::Value, String> {
    let name = opts["name"].as_str().unwrap_or("");
    let email = opts["email"].as_str().unwrap_or("");
    let ws_name = opts["workspaceName"].as_str().unwrap_or("");
    let slug = ws_name.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "-").trim_matches('-').to_string();

    let pool = state.pool().ok_or("No DB")?;
    let taken: Option<(String,)> = sqlx::query_as(r#"SELECT id FROM "Workspace" WHERE slug = $1"#)
        .bind(&slug).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    if taken.is_some() {
        return Ok(serde_json::json!({ "error": "A company with this name is already registered." }));
    }

    let result = auth::send_otp(email).await?;
    let method_id = result["methodId"].as_str().unwrap_or("").to_string();

    // Store pending registration in Redis
    if let Some(mut cm) = state.redis_cm() {
        let key = format!("desktop:pending-register:{}", method_id);
        let val = serde_json::json!({ "name": name, "email": email, "workspaceName": ws_name });
        let _ = crate::redis_mod::redis_set(&mut cm, &key, &val.to_string(), Some(600)).await;
    }

    Ok(serde_json::json!({ "methodId": method_id }))
}

#[tauri::command]
pub async fn auth_register_verify(
    method_id: String, code: String, state: State<'_, Arc<AppState>>,
) -> Result<serde_json::Value, String> {
    // Get pending registration data from Redis
    let pending = {
        let mut cm = state.redis_cm().ok_or("No Redis")?;
        let key = format!("desktop:pending-register:{}", method_id);
        let raw = crate::redis_mod::redis_get(&mut cm, &key).await.ok_or("Registration session expired")?;
        let _ = crate::redis_mod::redis_del(&mut cm, &key).await;
        serde_json::from_str::<serde_json::Value>(&raw).map_err(|e| e.to_string())?
    };

    let result = auth::verify_otp(&method_id, &code).await?;
    let token = result["sessionToken"].as_str().unwrap_or("").to_string();
    let stytch_uid = result["stytchUserId"].as_str().unwrap_or("").to_string();
    let name = pending["name"].as_str().unwrap_or("");
    let email = pending["email"].as_str().unwrap_or("");
    let ws_name = pending["workspaceName"].as_str().unwrap_or("");
    let slug = ws_name.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "-").trim_matches('-').to_string();

    let pool = state.pool().ok_or("No DB")?;

    // Create workspace + user in transaction
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let ws_id: String = uuid::Uuid::new_v4().to_string();
    sqlx::query(r#"INSERT INTO "Workspace" (id, name, slug, "planTier") VALUES ($1, $2, $3, 'starter')"#)
        .bind(&ws_id).bind(ws_name).bind(&slug)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    let user_id: String = uuid::Uuid::new_v4().to_string();
    sqlx::query(r#"INSERT INTO "User" (id, "workspaceId", email, name, role, "stytchUserId") VALUES ($1, $2, $3, $4, 'OWNER', $5)"#)
        .bind(&user_id).bind(&ws_id).bind(email).bind(name).bind(&stytch_uid)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    sqlx::query(r#"INSERT INTO "WorkspaceMembership" (id, "workspaceId", "userId", role) VALUES ($1, $2, $3, 'OWNER')"#)
        .bind(uuid::Uuid::new_v4().to_string()).bind(&ws_id).bind(&user_id)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    let user = AuthUser {
        id: user_id, name: name.to_string(), email: email.to_string(),
        role: "OWNER".to_string(), workspace_id: ws_id, workspace_name: ws_name.to_string(),
        stytch_user_id: stytch_uid,
    };
    state.set_session(SessionData { token, user: user.clone() });
    Ok(serde_json::json!({ "success": true, "user": user }))
}
