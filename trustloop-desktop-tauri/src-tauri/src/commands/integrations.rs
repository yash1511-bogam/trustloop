use crate::commands::util::{encrypt_secret, last4};
use crate::state::AppState;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn integrations_ai(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;
    let keys: Vec<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT provider, "keyLast4", "isActive", "healthStatus", "lastVerifiedAt", "lastVerificationError", "updatedAt" FROM "AiProviderKey" WHERE "workspaceId" = $1 ORDER BY provider ASC) t"#
    ).bind(wid).fetch_all(&pool).await.map_err(|e| e.to_string())?;
    let workflows: Vec<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT "workflowType", provider, model FROM "WorkflowSetting" WHERE "workspaceId" = $1 ORDER BY "workflowType" ASC) t"#
    ).bind(wid).fetch_all(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "keys": keys, "workflows": workflows })))
}

#[tauri::command]
pub async fn ai_keys_save(state: State<'_, Arc<AppState>>, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let provider = data["provider"].as_str().unwrap_or("");
    let api_key = data["apiKey"].as_str().unwrap_or("");
    let key_last4 = last4(api_key);
    let encrypted = encrypt_secret(api_key.trim())?;
    sqlx::query(
        r#"INSERT INTO "AiProviderKey" (id, "workspaceId", provider, "encryptedKey", "keyLast4", "isActive", "healthStatus")
           VALUES ($1, $2, $3, $4, $5, true, 'UNKNOWN')
           ON CONFLICT ("workspaceId", provider) DO UPDATE SET "encryptedKey" = $4, "keyLast4" = $5, "isActive" = true, "healthStatus" = 'UNKNOWN'"#
    ).bind(uuid::Uuid::new_v4().to_string()).bind(&session.user.workspace_id).bind(provider).bind(&encrypted).bind(&key_last4)
    .execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "ok": true })))
}

#[tauri::command]
pub async fn ai_keys_test(data: serde_json::Value) -> Result<serde_json::Value, String> {
    let key = data["apiKey"].as_str().unwrap_or("");
    Ok(serde_json::json!({ "ok": !key.is_empty() && key.len() > 10 }))
}

#[tauri::command]
pub async fn workflows_save(state: State<'_, Arc<AppState>>, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    sqlx::query(
        r#"INSERT INTO "WorkflowSetting" (id, "workspaceId", "workflowType", provider, model)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT ("workspaceId", "workflowType") DO UPDATE SET provider = $4, model = $5"#
    ).bind(uuid::Uuid::new_v4().to_string()).bind(&session.user.workspace_id)
    .bind(data["workflowType"].as_str().unwrap_or(""))
    .bind(data["provider"].as_str().unwrap_or(""))
    .bind(data["model"].as_str().unwrap_or(""))
    .execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "ok": true })))
}

#[tauri::command]
pub async fn integrations_webhooks(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let rows: Vec<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT id, type, "isActive", "keyLast4", "createdAt", "updatedAt" FROM "WorkspaceWebhookIntegration" WHERE "workspaceId" = $1 ORDER BY "createdAt" DESC) t"#
    ).bind(&session.user.workspace_id).fetch_all(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!(rows)))
}

#[tauri::command]
pub async fn webhooks_save_secret(state: State<'_, Arc<AppState>>, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wh_type = data["type"].as_str().unwrap_or("");
    let secret = data["secret"].as_str().unwrap_or("");
    let encrypted = encrypt_secret(secret)?;
    let kl4 = last4(secret);
    sqlx::query(
        r#"INSERT INTO "WorkspaceWebhookIntegration" (id, "workspaceId", type, "encryptedSecret", "keyLast4", "isActive")
           VALUES ($1, $2, $3, $4, $5, true)
           ON CONFLICT ("workspaceId", type) DO UPDATE SET "encryptedSecret" = $4, "keyLast4" = $5, "isActive" = true"#
    ).bind(uuid::Uuid::new_v4().to_string()).bind(&session.user.workspace_id).bind(wh_type).bind(&encrypted).bind(&kl4)
    .execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "ok": true })))
}

#[tauri::command]
pub async fn webhooks_rotate_secret(state: State<'_, Arc<AppState>>, r#type: String) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let new_secret = hex::encode(rand::random::<[u8; 32]>());
    let encrypted = encrypt_secret(&new_secret)?;
    let kl4 = last4(&new_secret);
    sqlx::query(r#"UPDATE "WorkspaceWebhookIntegration" SET "encryptedSecret" = $1, "keyLast4" = $2 WHERE "workspaceId" = $3 AND type = $4"#)
        .bind(&encrypted).bind(&kl4).bind(&session.user.workspace_id).bind(&r#type)
        .execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "ok": true, "secret": new_secret })))
}

#[tauri::command]
pub async fn webhooks_toggle(state: State<'_, Arc<AppState>>, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    sqlx::query(r#"UPDATE "WorkspaceWebhookIntegration" SET "isActive" = $1 WHERE "workspaceId" = $2 AND type = $3"#)
        .bind(data["isActive"].as_bool().unwrap_or(false)).bind(&session.user.workspace_id).bind(data["type"].as_str().unwrap_or(""))
        .execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "ok": true })))
}

#[tauri::command]
pub async fn integrations_oncall(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;
    let enabled: Option<(bool,)> = sqlx::query_as(r#"SELECT "onCallRotationEnabled" FROM "WorkspaceQuota" WHERE "workspaceId" = $1"#)
        .bind(wid).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    let members: Vec<serde_json::Value> = sqlx::query_as::<_, (String, String, String, Option<String>, String)>(
        r#"SELECT id, name, email, phone, role FROM "User" WHERE "workspaceId" = $1 ORDER BY role ASC, name ASC"#
    ).bind(wid).fetch_all(&pool).await.map_err(|e| e.to_string())?
    .into_iter().map(|r| serde_json::json!({ "id": r.0, "name": r.1, "email": r.2, "phone": r.3, "role": r.4 })).collect();
    Ok(Some(serde_json::json!({ "onCallEnabled": enabled.map(|e| e.0).unwrap_or(false), "members": members })))
}
