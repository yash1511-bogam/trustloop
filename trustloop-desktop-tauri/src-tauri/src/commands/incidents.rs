use crate::state::AppState;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn incidents_counts(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;
    let cutoff = chrono::Utc::now() - chrono::Duration::days(7);

    let total: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "Incident" WHERE "workspaceId" = $1"#).bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    let open: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "Incident" WHERE "workspaceId" = $1 AND status != 'RESOLVED'"#).bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    let p1: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "Incident" WHERE "workspaceId" = $1 AND severity = 'P1' AND status != 'RESOLVED'"#).bind(wid).fetch_one(&pool).await.map_err(|e| e.to_string())?;
    let resolved7d: (i64,) = sqlx::query_as(r#"SELECT COUNT(*) FROM "Incident" WHERE "workspaceId" = $1 AND status = 'RESOLVED' AND "updatedAt" >= $2"#).bind(wid).bind(cutoff.naive_utc()).fetch_one(&pool).await.map_err(|e| e.to_string())?;

    Ok(Some(serde_json::json!({ "total": total.0, "open": open.0, "p1": p1.0, "resolved7d": resolved7d.0 })))
}

#[tauri::command]
pub async fn incidents_list(state: State<'_, Arc<AppState>>, opts: Option<serde_json::Value>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;
    let opts = opts.unwrap_or(serde_json::json!({}));
    let page: i64 = opts["page"].as_i64().unwrap_or(1);
    let take: i64 = 20;
    let offset = (page - 1) * take;

    // Build dynamic WHERE — simplified but covers all filters from ipc.ts
    let mut conditions = vec![format!(r#""workspaceId" = '{}'"#, wid)];
    if let Some(s) = opts["status"].as_str() { conditions.push(format!("status = '{}'", s)); }
    if let Some(s) = opts["severity"].as_str() { conditions.push(format!("severity = '{}'", s)); }
    if let Some(s) = opts["category"].as_str() { conditions.push(format!("category = '{}'", s)); }
    if let Some(s) = opts["owner"].as_str() { conditions.push(format!(r#""ownerUserId" = '{}'"#, s)); }
    if let Some(q) = opts["q"].as_str() {
        let escaped = q.replace('\'', "''");
        conditions.push(format!(r#"(title ILIKE '%{}%' OR "customerName" ILIKE '%{}%' OR "sourceTicketRef" ILIKE '%{}%')"#, escaped, escaped, escaped));
    }
    let where_clause = conditions.join(" AND ");

    let count_sql = format!(r#"SELECT COUNT(*) FROM "Incident" WHERE {}"#, where_clause);
    let count: (i64,) = sqlx::query_as(&count_sql).fetch_one(&pool).await.map_err(|e| e.to_string())?;

    let list_sql = format!(
        r#"SELECT i.id, i.title, i.status, i.severity, i.category, i.channel, i."createdAt", i."updatedAt", i."resolvedAt", i."customerName", i."customerEmail", u.id, u.name
           FROM "Incident" i LEFT JOIN "User" u ON i."ownerUserId" = u.id
           WHERE {} ORDER BY i.severity ASC, i."createdAt" DESC LIMIT {} OFFSET {}"#,
        where_clause, take, offset
    );
    #[allow(clippy::type_complexity)]
    let rows: Vec<(String, String, String, String, Option<String>, Option<String>, chrono::NaiveDateTime, chrono::NaiveDateTime, Option<chrono::NaiveDateTime>, Option<String>, Option<String>, Option<String>, Option<String>)> =
        sqlx::query_as(&list_sql).fetch_all(&pool).await.map_err(|e| e.to_string())?;

    let items: Vec<serde_json::Value> = rows.into_iter().map(|r| serde_json::json!({
        "id": r.0, "title": r.1, "status": r.2, "severity": r.3, "category": r.4, "channel": r.5,
        "createdAt": r.6.to_string(), "updatedAt": r.7.to_string(), "resolvedAt": r.8.map(|d| d.to_string()),
        "customerName": r.9, "customerEmail": r.10, "owner": { "id": r.11, "name": r.12 }
    })).collect();

    let members: Vec<serde_json::Value> = sqlx::query_as::<_, (String, String, String)>(
        r#"SELECT id, name, role FROM "User" WHERE "workspaceId" = $1 ORDER BY role ASC, name ASC"#
    ).bind(wid).fetch_all(&pool).await.map_err(|e| e.to_string())?
    .into_iter().map(|r| serde_json::json!({ "id": r.0, "name": r.1, "role": r.2 })).collect();

    let pages = (count.0 as f64 / take as f64).ceil() as i64;
    Ok(Some(serde_json::json!({ "items": items, "total": count.0, "page": page, "pages": pages, "members": members })))
}

#[tauri::command]
pub async fn incidents_get(state: State<'_, Arc<AppState>>, id: String) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let row: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT i.*, row_to_json(u) as owner FROM "Incident" i LEFT JOIN "User" u ON i."ownerUserId" = u.id WHERE i.id = $1 AND i."workspaceId" = $2) t"#
    ).bind(&id).bind(&session.user.workspace_id).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub async fn incidents_update_status(state: State<'_, Arc<AppState>>, id: String, status: String) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    if status == "RESOLVED" {
        sqlx::query(r#"UPDATE "Incident" SET status = $1, "resolvedAt" = NOW() WHERE id = $2 AND "workspaceId" = $3"#)
            .bind(&status).bind(&id).bind(&session.user.workspace_id).execute(&pool).await.map_err(|e| e.to_string())?;
    } else {
        sqlx::query(r#"UPDATE "Incident" SET status = $1 WHERE id = $2 AND "workspaceId" = $3"#)
            .bind(&status).bind(&id).bind(&session.user.workspace_id).execute(&pool).await.map_err(|e| e.to_string())?;
    }
    Ok(Some(serde_json::json!({ "ok": true })))
}

#[tauri::command]
pub async fn incidents_create(state: State<'_, Arc<AppState>>, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO "Incident" (id, "workspaceId", title, description, severity, status, "ownerUserId", "customerName", "customerEmail", channel, category, "modelVersion", "sourceTicketRef")
           VALUES ($1, $2, $3, $4, $5, 'NEW', $6, $7, $8, $9, $10, $11, $12)"#
    )
    .bind(&id).bind(&session.user.workspace_id)
    .bind(data["title"].as_str().unwrap_or(""))
    .bind(data["description"].as_str().unwrap_or(""))
    .bind(data["severity"].as_str().unwrap_or("P3"))
    .bind(&session.user.id)
    .bind(data["customerName"].as_str())
    .bind(data["customerEmail"].as_str())
    .bind(data["channel"].as_str().unwrap_or("API"))
    .bind(data["category"].as_str())
    .bind(data["modelVersion"].as_str())
    .bind(data["sourceTicketRef"].as_str())
    .execute(&pool).await.map_err(|e| e.to_string())?;

    Ok(Some(serde_json::json!({ "id": id })))
}

#[tauri::command]
pub async fn incidents_export_csv(state: State<'_, Arc<AppState>>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    #[allow(clippy::type_complexity)]
    let rows: Vec<(String, String, String, String, Option<String>, Option<String>, Option<String>, chrono::NaiveDateTime, Option<chrono::NaiveDateTime>)> = sqlx::query_as(
        r#"SELECT i.id, i.title, i.severity, i.status, i.category, u.name, u.email, i."createdAt", i."resolvedAt"
           FROM "Incident" i LEFT JOIN "User" u ON i."ownerUserId" = u.id
           WHERE i."workspaceId" = $1 ORDER BY i."createdAt" DESC"#
    ).bind(&session.user.workspace_id).fetch_all(&pool).await.map_err(|e| e.to_string())?;

    let mut wtr = csv::Writer::from_writer(vec![]);
    wtr.write_record(["incident_id","title","severity","status","category","owner_name","owner_email","created_at","resolved_at"]).map_err(|e| e.to_string())?;
    for r in &rows {
        wtr.write_record([&r.0, &r.1, &r.2, &r.3, r.4.as_deref().unwrap_or(""), r.5.as_deref().unwrap_or(""), r.6.as_deref().unwrap_or(""), &r.7.to_string(), &r.8.map(|d| d.to_string()).unwrap_or_default()]).map_err(|e| e.to_string())?;
    }
    let csv_data = String::from_utf8(wtr.into_inner().map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;

    // Use tauri dialog to pick save location
    let date = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let filename = format!("trustloop-incidents-{}.csv", date);
    let path = dirs::download_dir().unwrap_or_default().join(&filename);
    std::fs::write(&path, &csv_data).map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "ok": true, "path": path.to_string_lossy() })))
}

#[tauri::command]
pub async fn incidents_detail(state: State<'_, Arc<AppState>>, id: String) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;

    let incident: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT * FROM "Incident" WHERE id = $1 AND "workspaceId" = $2) t"#
    ).bind(&id).bind(wid).fetch_optional(&pool).await.map_err(|e| e.to_string())?;
    let Some(incident) = incident else { return Ok(None) };

    let events: Vec<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT row_to_json(t) FROM (SELECT e.*, row_to_json(u) as actor FROM "IncidentEvent" e LEFT JOIN "User" u ON e."actorUserId" = u.id WHERE e."incidentId" = $1 ORDER BY e."createdAt" DESC) t"#
    ).bind(&id).fetch_all(&pool).await.map_err(|e| e.to_string())?;

    let owners: Vec<serde_json::Value> = sqlx::query_as::<_, (String, String, String)>(
        r#"SELECT id, name, role FROM "User" WHERE "workspaceId" = $1 ORDER BY role ASC, name ASC"#
    ).bind(wid).fetch_all(&pool).await.map_err(|e| e.to_string())?
    .into_iter().map(|r| serde_json::json!({ "id": r.0, "name": r.1, "role": r.2 })).collect();

    Ok(Some(serde_json::json!({ "incident": incident, "events": events, "owners": owners })))
}

#[tauri::command]
pub async fn incidents_update(state: State<'_, Arc<AppState>>, id: String, data: serde_json::Value) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let wid = &session.user.workspace_id;

    let mut sets = vec![];
    if let Some(s) = data["status"].as_str() { sets.push(format!("status = '{}'", s)); if s == "RESOLVED" { sets.push(r#""resolvedAt" = NOW()"#.to_string()); } }
    if let Some(s) = data["severity"].as_str() { sets.push(format!("severity = '{}'", s)); }
    if data.get("ownerUserId").is_some() { let v = data["ownerUserId"].as_str(); sets.push(format!(r#""ownerUserId" = {}"#, v.map(|s| format!("'{}'", s)).unwrap_or("NULL".into()))); }
    if data.get("category").is_some() { let v = data["category"].as_str(); sets.push(format!("category = {}", v.map(|s| format!("'{}'", s)).unwrap_or("NULL".into()))); }

    if !sets.is_empty() {
        let sql = format!(r#"UPDATE "Incident" SET {} WHERE id = '{}' AND "workspaceId" = '{}'"#, sets.join(", "), id, wid);
        sqlx::query(&sql).execute(&pool).await.map_err(|e| e.to_string())?;
    }
    Ok(Some(serde_json::json!({ "ok": true })))
}

#[tauri::command]
pub async fn incidents_publish_update(state: State<'_, Arc<AppState>>, id: String, body: String) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let su_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(r#"INSERT INTO "StatusUpdate" (id, "incidentId", "workspaceId", body, "isVisible", "publishedAt") VALUES ($1, $2, $3, $4, true, NOW())"#)
        .bind(&su_id).bind(&id).bind(&session.user.workspace_id).bind(&body)
        .execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "id": su_id })))
}

#[tauri::command]
pub async fn incidents_add_event(state: State<'_, Arc<AppState>>, id: String, body: String, event_type: Option<String>) -> Result<Option<serde_json::Value>, String> {
    let session = match state.get_session() { Some(s) => s, None => return Ok(None) };
    let pool = state.pool().ok_or("No DB")?;
    let ev_id = uuid::Uuid::new_v4().to_string();
    let et = event_type.unwrap_or_else(|| "NOTE".to_string());
    sqlx::query(r#"INSERT INTO "IncidentEvent" (id, "incidentId", "actorUserId", "eventType", body) VALUES ($1, $2, $3, $4, $5)"#)
        .bind(&ev_id).bind(&id).bind(&session.user.id).bind(&et).bind(&body)
        .execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(Some(serde_json::json!({ "id": ev_id, "eventType": et, "body": body })))
}
