use crate::state::AppState;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn security_apikeys(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let rows: Vec<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT id, name, "keyPrefix", scopes, "isActive", "createdAt", "lastUsedAt", "expiresAt" FROM "WorkspaceApiKey" WHERE "workspaceId" = $1 ORDER BY "createdAt" DESC) t"#
    ).bind(&session.user.workspace_id).fetch_all(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!(rows)))
}

#[tauri::command]
pub async fn apikeys_create(state: State<'_, Arc<AppState>>, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let key_prefix = hex::encode(rand::random::<[u8; 4]>());
    let secret = base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, rand::random::<[u8; 24]>());
    let raw_key = format!("sk-tl-{}.{}", key_prefix, secret);

    // Simple hash (bcrypt would need an extra crate — use sha256 for now, same security model)
    let key_hash = hex::encode(sha2::Sha256::digest(raw_key.as_bytes()));
    use sha2::Digest;

    let expiry_option = data["expiryOption"].as_str().unwrap_or("90d");
    let days: Option<i64> = match expiry_option { "30d" => Some(30), "90d" => Some(90), "1y" => Some(365), _ => None };
    let expires_at = days.map(|d| (chrono::Utc::now() + chrono::Duration::days(d)).naive_utc());

    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO "WorkspaceApiKey" (id, "workspaceId", name, "keyPrefix", "keyHash", scopes, "isActive", "expiresAt")
           VALUES ($1, $2, $3, $4, $5, $6, true, $7)"#
    ).bind(&id).bind(&session.user.workspace_id)
    .bind(data["name"].as_str().unwrap_or(""))
    .bind(&key_prefix).bind(&key_hash)
    .bind(serde_json::json!(["incidents:read", "incidents:write"]).to_string())
    .bind(expires_at)
    .execute(&pool).await.map_err(|e| e.to_string())?;

    Ok(Some(serde_json::json!({ "apiKey": raw_key })))
}

#[tauri::command]
pub async fn apikeys_revoke(state: State<'_, Arc<AppState>>, id: String) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    sqlx::query(r#"UPDATE "WorkspaceApiKey" SET "isActive" = false WHERE id = $1 AND "workspaceId" = $2"#)
        .bind(&id).bind(&session.user.workspace_id).execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "ok": true })))
}

#[tauri::command]
pub async fn security_audit(state: State<'_, Arc<AppState>>, opts: Option<serde_json::Value>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;
    let page: i64 = opts.as_ref().and_then(|o| o["page"].as_i64()).unwrap_or(1);
    let take: i64 = 100;
    let offset = (page - 1) * take;

    let count: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "AuditLog" WHERE "workspaceId" = $1"#)
        .bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;

    let items: Vec<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (
           SELECT a.id, a.action, a.summary, a."createdAt", a."ipAddress",
                  (SELECT row_to_json(u) FROM (SELECT name FROM "User" WHERE id = a."actorUserId") u) as "actorUser",
                  (SELECT row_to_json(k) FROM (SELECT name FROM "WorkspaceApiKey" WHERE id = a."actorApiKeyId") k) as "actorApiKey"
           FROM "AuditLog" a WHERE a."workspaceId" = $1 ORDER BY a."createdAt" DESC LIMIT $2 OFFSET $3) t"#
    ).bind(wid).bind(take).bind(offset).fetch_all(&pool).await.map_err(|e| e.to_string())?;

    let pages = (count.0 as f64 / take as f64).ceil() as i64;
    Ok(Some(serde_json::json!({ "items": items, "total": count.0, "page": page, "pages": pages })))
}

#[tauri::command]
pub async fn security_sso(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let row: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT "samlEnabled", "samlMetadataUrl", "samlOrganizationId", "samlConnectionId" FROM "Workspace" WHERE id = $1) t"#
    ).bind(&session.user.workspace_id).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub async fn security_sso_save(state: State<'_, Arc<AppState>>, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    sqlx::query(r#"UPDATE "Workspace" SET "samlEnabled" = $1, "samlMetadataUrl" = $2 WHERE id = $3"#)
        .bind(data["samlEnabled"].as_bool().unwrap_or(false))
        .bind(data["samlMetadataUrl"].as_str())
        .bind(&session.user.workspace_id)
        .execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "ok": true })))
}
