use crate::redis_mod;
use crate::state::AuthUser;
use sha2::{Digest, Sha256};
use sqlx::PgPool;

const SESSION_TTL: u64 = 30;

fn cache_key(token: &str) -> String {
    let hash = hex::encode(Sha256::digest(token.as_bytes()));
    format!("session:auth:{}", hash)
}

pub async fn send_otp(email: &str) -> Result<serde_json::Value, String> {
    let is_stub = std::env::var("TRUSTLOOP_STUB_AUTH").unwrap_or_default() == "1";
    if is_stub {
        return Ok(serde_json::json!({ "methodId": format!("stub-email:{}", email) }));
    }

    let project_id = std::env::var("STYTCH_PROJECT_ID").map_err(|_| "STYTCH_PROJECT_ID required")?;
    let secret = std::env::var("STYTCH_SECRET").map_err(|_| "STYTCH_SECRET required")?;
    let env = std::env::var("STYTCH_ENV").unwrap_or_else(|_| "test".into());
    let base = if env == "live" { "https://api.stytch.com" } else { "https://test.stytch.com" };
    let expiry: u32 = std::env::var("STYTCH_OTP_EXPIRATION_MINUTES").ok().and_then(|v| v.parse().ok()).unwrap_or(5);

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/v1/otps/email/login_or_create", base))
        .basic_auth(&project_id, Some(&secret))
        .json(&serde_json::json!({ "email": email, "expiration_minutes": expiry }))
        .send().await.map_err(|e| e.to_string())?
        .json::<serde_json::Value>().await.map_err(|e| e.to_string())?;

    let method_id = resp["email_id"].as_str().unwrap_or("").to_string();
    Ok(serde_json::json!({ "methodId": method_id }))
}

pub async fn verify_otp(method_id: &str, code: &str) -> Result<serde_json::Value, String> {
    let is_stub = std::env::var("TRUSTLOOP_STUB_AUTH").unwrap_or_default() == "1";
    if is_stub {
        let expected = std::env::var("TRUSTLOOP_STUB_OTP_CODE").unwrap_or_else(|_| "000000".into());
        if code != expected { return Err("Invalid code".into()); }
        let email = method_id.replace("stub-email:", "");
        let uid = format!("stub-user:{}", hex::encode(email.as_bytes()));
        let exp = chrono::Utc::now() + chrono::Duration::hours(24);
        return Ok(serde_json::json!({
            "sessionToken": format!("stub-session:{}:{}", uid, exp.timestamp_millis()),
            "expiresAt": exp.to_rfc3339(),
            "stytchUserId": uid,
        }));
    }

    let project_id = std::env::var("STYTCH_PROJECT_ID").map_err(|_| "STYTCH_PROJECT_ID required")?;
    let secret = std::env::var("STYTCH_SECRET").map_err(|_| "STYTCH_SECRET required")?;
    let env = std::env::var("STYTCH_ENV").unwrap_or_else(|_| "test".into());
    let base = if env == "live" { "https://api.stytch.com" } else { "https://test.stytch.com" };
    let duration: u32 = std::env::var("STYTCH_SESSION_DURATION_MINUTES").ok().and_then(|v| v.parse().ok()).unwrap_or(1440);

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/v1/otps/authenticate", base))
        .basic_auth(&project_id, Some(&secret))
        .json(&serde_json::json!({ "method_id": method_id, "code": code, "session_duration_minutes": duration }))
        .send().await.map_err(|e| e.to_string())?
        .json::<serde_json::Value>().await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "sessionToken": resp["session_token"].as_str().unwrap_or(""),
        "expiresAt": resp["session"]["expires_at"].as_str().unwrap_or(""),
        "stytchUserId": resp["user_id"].as_str().unwrap_or(""),
    }))
}

pub async fn authenticate_session(
    token: &str,
    pool: &PgPool,
    redis_cm: &mut Option<redis::aio::ConnectionManager>,
) -> Option<AuthUser> {
    // Check Redis cache
    let key = cache_key(token);
    if let Some(ref mut cm) = redis_cm {
        if let Some(cached) = redis_mod::redis_get(cm, &key).await {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&cached) {
                if let Some(exp) = parsed["expiresAtIso"].as_str() {
                    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(exp) {
                        if dt > chrono::Utc::now() {
                            if let Ok(user) = serde_json::from_value::<AuthUser>(parsed["user"].clone()) {
                                return Some(user);
                            }
                        }
                    }
                }
            }
        }
    }

    // Resolve stytch user ID
    let stytch_user_id: String;
    let is_stub = std::env::var("TRUSTLOOP_STUB_AUTH").unwrap_or_default() == "1";

    if token == "dev-session" && std::env::var("NODE_ENV").unwrap_or_default() == "development" {
        let row = sqlx::query_as::<_, (String, String, String, String, String, String, String)>(
            r#"SELECT u.id, u.name, u.email, u.role, u."workspaceId", w.name, u."stytchUserId"
               FROM "User" u JOIN "Workspace" w ON u."workspaceId" = w.id
               WHERE u.email = 'demo@trustloop.local' LIMIT 1"#
        ).fetch_optional(pool).await.ok()??;
        return Some(AuthUser { id: row.0, name: row.1, email: row.2, role: row.3, workspace_id: row.4, workspace_name: row.5, stytch_user_id: row.6 });
    } else if is_stub && token.starts_with("stub-session:") {
        let rest = token.replace("stub-session:", "");
        let parts: Vec<&str> = rest.rsplitn(2, ':').collect();
        if parts.len() < 2 { return None; }
        let exp: i64 = parts[0].parse().ok()?;
        if exp < chrono::Utc::now().timestamp_millis() { return None; }
        stytch_user_id = parts[1].to_string();
    } else {
        // Real Stytch session authentication
        let project_id = std::env::var("STYTCH_PROJECT_ID").ok()?;
        let secret = std::env::var("STYTCH_SECRET").ok()?;
        let env = std::env::var("STYTCH_ENV").unwrap_or_else(|_| "test".into());
        let base = if env == "live" { "https://api.stytch.com" } else { "https://test.stytch.com" };

        let client = reqwest::Client::new();
        let resp = client
            .post(format!("{}/v1/sessions/authenticate", base))
            .basic_auth(&project_id, Some(&secret))
            .json(&serde_json::json!({ "session_token": token }))
            .send().await.ok()?
            .json::<serde_json::Value>().await.ok()?;

        stytch_user_id = resp["session"]["user_id"].as_str()?.to_string();
    }

    // Look up user in DB
    let row = sqlx::query_as::<_, (String, String, String, String, String, String, String)>(
        r#"SELECT u.id, u.name, u.email, u.role, u."workspaceId", w.name, u."stytchUserId"
           FROM "User" u JOIN "Workspace" w ON u."workspaceId" = w.id
           WHERE u."stytchUserId" = $1 LIMIT 1"#
    ).bind(&stytch_user_id).fetch_optional(pool).await.ok()??;

    let user = AuthUser { id: row.0, name: row.1, email: row.2, role: row.3, workspace_id: row.4, workspace_name: row.5, stytch_user_id: row.6 };

    // Cache in Redis
    if let Some(ref mut cm) = redis_cm {
        let expires_at = chrono::Utc::now() + chrono::Duration::seconds(SESSION_TTL as i64);
        let cache_val = serde_json::json!({ "user": &user, "expiresAtIso": expires_at.to_rfc3339() });
        let _ = redis_mod::redis_set(cm, &key, &cache_val.to_string(), Some(SESSION_TTL)).await;
    }

    Some(user)
}

pub async fn get_oauth_start_url(provider: &str, intent: Option<&str>, workspace_name: Option<&str>) -> Result<String, String> {
    let app_url = std::env::var("NEXT_PUBLIC_APP_URL").unwrap_or_else(|_| "https://trustloop.yashbogam.me".into());

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/api/auth/oauth/desktop/nonce", app_url))
        .send().await.map_err(|e| e.to_string())?
        .json::<serde_json::Value>().await.map_err(|e| e.to_string())?;

    let nonce = resp["nonce"].as_str().unwrap_or("").to_string();
    let mut params = vec![("nonce", nonce)];
    if let Some(i) = intent { params.push(("intent", i.to_string())); }
    if let Some(w) = workspace_name { params.push(("workspaceName", w.to_string())); }

    let query = params.iter().map(|(k, v)| format!("{}={}", k, urlencoding::encode(v))).collect::<Vec<_>>().join("&");
    Ok(format!("{}/api/auth/oauth/desktop/{}?{}", app_url, provider, query))
}
