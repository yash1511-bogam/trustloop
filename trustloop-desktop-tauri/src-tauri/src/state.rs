use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub workspace_id: String,
    pub workspace_name: String,
    pub stytch_user_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub token: String,
    pub user: AuthUser,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowBounds {
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: u32,
    pub height: u32,
}

pub struct AppState {
    pub session: Mutex<Option<SessionData>>,
    pub db: Mutex<Option<PgPool>>,
    pub redis: Mutex<Option<redis::aio::ConnectionManager>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            session: Mutex::new(None),
            db: Mutex::new(None),
            redis: Mutex::new(None),
        }
    }

    pub async fn init_pools(&self) -> Result<(), String> {
        // DB
        if let Ok(url) = std::env::var("DATABASE_URL") {
            let normalized = crate::db::normalize_database_url(&url);
            match PgPool::connect(&normalized).await {
                Ok(pool) => { *self.db.lock().unwrap() = Some(pool); }
                Err(e) => log::error!("DB connect failed: {}", e),
            }
        }
        // Redis
        if let Ok(url) = std::env::var("REDIS_URL") {
            let client = redis::Client::open(url).map_err(|e| e.to_string())?;
            match redis::aio::ConnectionManager::new(client).await {
                Ok(cm) => { *self.redis.lock().unwrap() = Some(cm); }
                Err(e) => log::error!("Redis connect failed: {}", e),
            }
        }
        Ok(())
    }

    pub fn pool(&self) -> Option<PgPool> {
        self.db.lock().unwrap().clone()
    }

    pub fn redis_cm(&self) -> Option<redis::aio::ConnectionManager> {
        self.redis.lock().unwrap().clone()
    }

    pub fn get_session(&self) -> Option<SessionData> {
        self.session.lock().unwrap().clone()
    }

    pub fn set_session(&self, s: SessionData) {
        *self.session.lock().unwrap() = Some(s);
    }

    pub fn clear_session(&self) {
        *self.session.lock().unwrap() = None;
    }
}
