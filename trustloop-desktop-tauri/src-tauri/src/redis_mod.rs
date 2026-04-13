use redis::AsyncCommands;

pub async fn redis_get(cm: &mut redis::aio::ConnectionManager, key: &str) -> Option<String> {
    cm.get(key).await.ok()
}

pub async fn redis_set(cm: &mut redis::aio::ConnectionManager, key: &str, value: &str, ttl: Option<u64>) -> Result<(), String> {
    if let Some(ttl) = ttl {
        let _: () = cm.set_ex(key, value, ttl).await.map_err(|e| e.to_string())?;
    } else {
        let _: () = cm.set(key, value).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub async fn redis_del(cm: &mut redis::aio::ConnectionManager, key: &str) -> Result<(), String> {
    let _: () = cm.del(key).await.map_err(|e| e.to_string())?;
    Ok(())
}
