use crate::state::AppState;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn profile_get(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let row: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT id, name, email, phone, role, "createdAt" FROM "User" WHERE id = $1) t"#
    ).bind(&session.user.id).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub async fn profile_update(state: State<'_, Arc<AppState>>, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let mut sets = vec![];
    if let Some(v) = data["name"].as_str() { sets.push(format!("name = '{}'", v.replace('\'', "''"))); }
    if let Some(v) = data["phone"].as_str() { sets.push(format!("phone = '{}'", v.replace('\'', "''"))); }
    if !sets.is_empty() {
        let sql = format!(r#"UPDATE "User" SET {} WHERE id = '{}'"#, sets.join(", "), session.user.id);
        sqlx::query(&sql).execute(&pool).await.map_err(|e| e.to_string())?;
    }
    let row: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT id, name, email, phone, role FROM "User" WHERE id = $1) t"#
    ).bind(&session.user.id).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub async fn onboarding_dismiss(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    sqlx::query(r#"UPDATE "Workspace" SET "onboardingDismissedAt" = NOW() WHERE id = $1"#)
        .bind(&session.user.workspace_id).execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "ok": true })))
}
