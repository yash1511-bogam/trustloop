use crate::state::AppState;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn workspace_info(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let row: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT * FROM "Workspace" WHERE id = $1) t"#
    ).bind(&session.user.workspace_id).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub async fn workspace_overview(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;

    let keys: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "AiProviderKey" WHERE "workspaceId" = $1"#).bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    let workflows: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "WorkflowSetting" WHERE "workspaceId" = $1"#).bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    let members: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "User" WHERE "workspaceId" = $1"#).bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    let invites: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "WorkspaceInvite" WHERE "workspaceId" = $1 AND "usedAt" IS NULL AND "expiresAt" > NOW()"#).bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    let webhooks: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "WorkspaceWebhookIntegration" WHERE "workspaceId" = $1 AND "isActive" = true"#).bind(wid).fetch_one(&pool).await.unwrap_or((0,));
    let ws: (String, Option<String>) = sqlx::query_as(r#"SELECT "planTier", (SELECT status FROM "WorkspaceBilling" WHERE "workspaceId" = $1) FROM "Workspace" WHERE id = $1"#).bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;

    Ok(Some(serde_json::json!({ "keyCount": keys.0, "workflowCount": workflows.0, "memberCount": members.0, "inviteCount": invites.0, "webhookCount": webhooks.0, "planTier": ws.0, "billingStatus": ws.1 })))
}

#[tauri::command]
pub async fn workspace_general(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let row: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT id, name, slug, "planTier", "statusPageEnabled", "slackChannelId", "slackTeamId", "complianceMode", "createdAt", "trialEndsAt", "customDomain", "customDomainVerified" FROM "Workspace" WHERE id = $1) t"#
    ).bind(&session.user.workspace_id).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub async fn workspace_update(state: State<'_, Arc<AppState>>, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let mut sets = vec![];
    if let Some(v) = data["name"].as_str() { sets.push(format!("name = '{}'", v.replace('\'', "''"))); }
    if let Some(v) = data["complianceMode"].as_bool() { sets.push(format!(r#""complianceMode" = {}"#, v)); }
    if let Some(v) = data["statusPageEnabled"].as_bool() { sets.push(format!(r#""statusPageEnabled" = {}"#, v)); }
    if !sets.is_empty() {
        let sql = format!(r#"UPDATE "Workspace" SET {} WHERE id = '{}'"#, sets.join(", "), session.user.workspace_id);
        sqlx::query(&sql).execute(&pool).await.map_err(|e| e.to_string())?;
    }
    Ok(Some(serde_json::json!({ "ok": true })))
}

#[tauri::command]
pub async fn workspace_team(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;

    let members: Vec<serde_json::Value> = sqlx::query_as::<_, (String, String, String, Option<String>, String, chrono::NaiveDateTime)>(
        r#"SELECT u.id, u.name, u.email, u.phone, m.role, u."createdAt"
           FROM "WorkspaceMembership" m JOIN "User" u ON m."userId" = u.id
           WHERE m."workspaceId" = $1 ORDER BY m.role ASC, m."createdAt" ASC"#
    ).bind(wid).fetch_all(&pool).await.map_err(|e| e.to_string())?
    .into_iter().map(|r| serde_json::json!({ "id": r.0, "name": r.1, "email": r.2, "phone": r.3, "role": r.4, "createdAt": r.5.to_string() })).collect();

    let invites: Vec<serde_json::Value> = sqlx::query_as::<_, (String, String, String, String, chrono::NaiveDateTime, chrono::NaiveDateTime)>(
        r#"SELECT id, email, role, token, "createdAt", "expiresAt" FROM "WorkspaceInvite" WHERE "workspaceId" = $1 AND "usedAt" IS NULL AND "expiresAt" > NOW() ORDER BY "createdAt" DESC"#
    ).bind(wid).fetch_all(&pool).await.map_err(|e| e.to_string())?
    .into_iter().map(|r| serde_json::json!({ "id": r.0, "email": r.1, "role": r.2, "token": r.3, "createdAt": r.4.to_string(), "expiresAt": r.5.to_string() })).collect();

    Ok(Some(serde_json::json!({ "members": members, "invites": invites, "currentUserId": session.user.id, "canManageRoles": session.user.role == "OWNER" })))
}

#[tauri::command]
pub async fn team_invite(state: State<'_, Arc<AppState>>, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let id = uuid::Uuid::new_v4().to_string();
    let token = hex::encode(rand::random::<[u8; 32]>());
    let expires = chrono::Utc::now() + chrono::Duration::days(7);
    sqlx::query(r#"INSERT INTO "WorkspaceInvite" (id, "workspaceId", email, role, token, "expiresAt") VALUES ($1, $2, $3, $4, $5, $6)"#)
        .bind(&id).bind(&session.user.workspace_id)
        .bind(data["email"].as_str().unwrap_or(""))
        .bind(data["role"].as_str().unwrap_or("MEMBER"))
        .bind(&token).bind(expires.naive_utc())
        .execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "id": id, "email": data["email"] })))
}

#[tauri::command]
pub async fn workspace_billing(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;
    let ws: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT "planTier", "trialEndsAt" FROM "Workspace" WHERE id = $1) t"#
    ).bind(wid).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    let billing: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT * FROM "WorkspaceBilling" WHERE "workspaceId" = $1) t"#
    ).bind(wid).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "workspace": ws, "billing": billing })))
}

#[tauri::command]
pub async fn workspace_refresh_read_models(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;

    // Simplified: upsert executive snapshot with current counts
    let open: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "Incident" WHERE "workspaceId" = $1 AND status != 'RESOLVED'"#).bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    let p1: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "Incident" WHERE "workspaceId" = $1 AND status != 'RESOLVED' AND severity = 'P1'"#).bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    let d7 = chrono::Utc::now() - chrono::Duration::days(7);
    let created7d: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "Incident" WHERE "workspaceId" = $1 AND "createdAt" >= $2"#).bind(wid).bind(d7.naive_utc()).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    let resolved7d: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "Incident" WHERE "workspaceId" = $1 AND "resolvedAt" >= $2"#).bind(wid).bind(d7.naive_utc()).fetch_one(&pool).await.map_err(|e| e.to_string())?;

    sqlx::query(
        r#"INSERT INTO "WorkspaceExecutiveSnapshot" ("workspaceId", "openIncidents", "p1OpenIncidents", "incidentsCreatedLast7d", "incidentsResolvedLast7d")
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT ("workspaceId") DO UPDATE SET "openIncidents" = $2, "p1OpenIncidents" = $3, "incidentsCreatedLast7d" = $4, "incidentsResolvedLast7d" = $5"#
    ).bind(wid).bind(open.0).bind(p1.0).bind(created7d.0).bind(resolved7d.0)
    .execute(&pool).await.map_err(|e| e.to_string())?;

    Ok(Some(serde_json::json!({ "success": true })))
}
