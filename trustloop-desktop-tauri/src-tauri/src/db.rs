use url::Url;

const LOCAL_HOSTS: &[&str] = &["localhost", "127.0.0.1", "postgres", "trustloop-postgres"];
const DEPRECATED_SSL: &[&str] = &["prefer", "require", "verify-ca"];

fn is_local(host: &str) -> bool {
    LOCAL_HOSTS.contains(&host.to_lowercase().as_str())
}

/// Same normalization as Electron's db.ts
pub fn normalize_database_url(cs: &str) -> String {
    let Ok(mut url) = Url::parse(cs) else { return cs.to_string() };
    let host = url.host_str().unwrap_or("").to_string();
    let local = is_local(&host);

    let ssl = url.query_pairs().find(|(k, _)| k == "sslmode").map(|(_, v)| v.to_string());

    if let Some(ref mode) = ssl {
        if local {
            // Remove sslmode for local hosts
            let pairs: Vec<(String, String)> = url.query_pairs()
                .filter(|(k, _)| k != "sslmode")
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect();
            url.set_query(None);
            for (k, v) in &pairs {
                url.query_pairs_mut().append_pair(k, v);
            }
        } else if DEPRECATED_SSL.contains(&mode.to_lowercase().as_str()) {
            let pairs: Vec<(String, String)> = url.query_pairs()
                .map(|(k, v)| {
                    if k == "sslmode" { (k.to_string(), "verify-full".to_string()) }
                    else { (k.to_string(), v.to_string()) }
                })
                .collect();
            url.set_query(None);
            for (k, v) in &pairs {
                url.query_pairs_mut().append_pair(k, v);
            }
        }
    }

    url.to_string()
}
