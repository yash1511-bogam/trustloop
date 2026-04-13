use crate::state::AppState;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn dashboard_data(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;

    #[allow(clippy::type_complexity)]
    let snapshot: Option<(i64, i64, i64, i64, f64, f64, f64, Option<chrono::NaiveDateTime>)> = sqlx::query_as(
        r#"SELECT "openIncidents", "p1OpenIncidents", "incidentsCreatedLast7d", "incidentsResolvedLast7d",
           "avgResolutionHoursLast30d", "triageCoveragePct", "customerUpdateCoveragePct", "updatedAt"
           FROM "WorkspaceExecutiveSnapshot" WHERE "workspaceId" = $1"#
    ).bind(wid).fetch_optional(&pool).await.map_err(|e| e.to_string())?;

    let total: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "Incident" WHERE "workspaceId" = $1"#)
        .bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;

    let ai_keys: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "AiProviderKey" WHERE "workspaceId" = $1"#)
        .bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;

    let triaged: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "Incident" WHERE "workspaceId" = $1 AND "triagedAt" IS NOT NULL"#)
        .bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;

    let webhooks: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "WorkspaceWebhookIntegration" WHERE "workspaceId" = $1"#)
        .bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;

    let ws: Option<(Option<String>, Option<chrono::NaiveDateTime>)> = sqlx::query_as(
        r#"SELECT "slackBotToken", "onboardingDismissedAt" FROM "Workspace" WHERE id = $1"#
    ).bind(wid).fetch_optional(&pool).await.map_err(|e| e.to_string())?;

    let recent: Vec<serde_json::Value> = sqlx::query_as::<_, (String, String, String, String, chrono::NaiveDateTime, Option<chrono::NaiveDateTime>, Option<String>, Option<String>)>(
        r#"SELECT i.id, i.title, i.status, i.severity, i."createdAt", i."resolvedAt", i."customerName", u.name
           FROM "Incident" i LEFT JOIN "User" u ON i."ownerUserId" = u.id
           WHERE i."workspaceId" = $1 ORDER BY i."createdAt" DESC LIMIT 10"#
    ).bind(wid).fetch_all(&pool).await.map_err(|e| e.to_string())?
    .into_iter().map(|r| serde_json::json!({
        "id": r.0, "title": r.1, "status": r.2, "severity": r.3,
        "createdAt": r.4.to_string(), "resolvedAt": r.5.map(|d| d.to_string()),
        "customerName": r.6, "owner": { "name": r.7 }
    })).collect();

    let (ws_slack, ws_onboarding) = ws.unwrap_or((None, None));

    let counts = serde_json::json!({
        "total": total.0,
        "p1": snapshot.as_ref().map(|s| s.1).unwrap_or(0),
        "open": snapshot.as_ref().map(|s| s.0).unwrap_or(0),
        "resolved": snapshot.as_ref().map(|s| s.3).unwrap_or(0),
        "created7d": snapshot.as_ref().map(|s| s.2).unwrap_or(0),
        "avgResolutionHours": snapshot.as_ref().map(|s| s.4).unwrap_or(0.0),
    });

    let onboarding = serde_json::json!({
        "dismissed": ws_onboarding.is_some(),
        "hasIncident": total.0 > 0,
        "hasTriaged": triaged.0 > 0,
        "hasAiKey": ai_keys.0 > 0,
        "hasSlack": ws_slack.is_some(),
        "hasWebhook": webhooks.0 > 0,
    });

    let snap = snapshot.map(|s| serde_json::json!({
        "triageCoveragePct": s.5, "customerUpdateCoveragePct": s.6,
        "updatedAt": s.7.map(|d| d.to_string()),
    }));

    Ok(Some(serde_json::json!({ "counts": counts, "snapshot": snap, "onboarding": onboarding, "recentIncidents": recent })))
}
