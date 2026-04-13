use crate::state::AppState;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn analytics_summary(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;
    let fourteen_days_ago = chrono::Utc::now() - chrono::Duration::days(13);

    let series: Vec<serde_json::Value> = sqlx::query_as::<_, (chrono::NaiveDate, i64, i64, i64, i64, i64, i64, i64)>(
        r#"SELECT day, "incidentsCreated", "incidentsResolved", "openAtEndOfDay", "p1Created", "triageRuns", "customerUpdatesSent", "reminderEmailsSent"
           FROM "IncidentAnalyticsDaily" WHERE "workspaceId" = $1 AND day >= $2 ORDER BY day ASC"#
    ).bind(wid).bind(fourteen_days_ago.date_naive()).fetch_all(&pool).await.map_err(|e| e.to_string())?
    .into_iter().map(|r| serde_json::json!({
        "day": r.0.to_string(), "incidentsCreated": r.1, "incidentsResolved": r.2,
        "openAtEndOfDay": r.3, "p1Created": r.4, "triageRuns": r.5,
        "customerUpdatesSent": r.6, "reminderEmailsSent": r.7,
    })).collect();

    let snapshot: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT * FROM "WorkspaceExecutiveSnapshot" WHERE "workspaceId" = $1) t"#
    ).bind(wid).fetch_optional(&pool).await.map_err(|e| e.to_string())?;

    let d7 = chrono::Utc::now() - chrono::Duration::days(7);
    let failed: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM "ReminderJobLog" WHERE "workspaceId" = $1 AND status = 'FAILED' AND "createdAt" >= $2"#
    ).bind(wid).bind(d7.naive_utc()).fetch_one(&pool).await.unwrap_or((0,));

    Ok(Some(serde_json::json!({ "series": series, "snapshot": snapshot, "failedReminders7d": failed.0 })))
}
