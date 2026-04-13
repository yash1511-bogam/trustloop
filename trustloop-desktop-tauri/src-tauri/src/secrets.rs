/// In production, fetch ALL env vars from AWS Secrets Manager —
/// the same JSON blob the web app's ECS tasks use (trustloop/production).
/// In development, .env file is sufficient — this is a no-op.
pub async fn load_aws_secrets() -> Result<(), String> {
    if std::env::var("NODE_ENV").unwrap_or_default() != "production" {
        return Ok(());
    }

    let secret_name = std::env::var("AWS_SECRET_NAME").unwrap_or_else(|_| "trustloop/production".into());
    let region = std::env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".into());

    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .load()
        .await;

    let client = aws_sdk_secretsmanager::Client::new(&config);
    let resp = client
        .get_secret_value()
        .secret_id(&secret_name)
        .send()
        .await
        .map_err(|e| format!("AWS Secrets Manager error: {}", e))?;

    let secret_string = resp.secret_string().ok_or("Empty secret")?;
    let secrets: std::collections::HashMap<String, String> =
        serde_json::from_str(secret_string).map_err(|e| format!("Parse error: {}", e))?;

    for (key, value) in secrets {
        // Don't overwrite values explicitly set via CLI or environment
        if std::env::var(&key).is_err() {
            std::env::set_var(&key, &value);
        }
    }

    Ok(())
}
