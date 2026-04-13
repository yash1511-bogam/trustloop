use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use hkdf::Hkdf;
use sha2::Sha256;

pub fn encrypt_secret(plaintext: &str) -> Result<String, String> {
    let secret = std::env::var("KEY_ENCRYPTION_SECRET").map_err(|_| "KEY_ENCRYPTION_SECRET required")?;
    let hk = Hkdf::<Sha256>::new(Some(b"trustloop-key-encryption-v1"), secret.as_bytes());
    let mut key_bytes = [0u8; 32];
    hk.expand(b"aes-256-gcm-key", &mut key_bytes).map_err(|e| e.to_string())?;

    let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|e| e.to_string())?;
    let iv_bytes: [u8; 12] = rand::random();
    let nonce = Nonce::from_slice(&iv_bytes);
    let ct = cipher.encrypt(nonce, plaintext.as_bytes()).map_err(|e| e.to_string())?;

    // Same format as Electron: iv:ciphertext:tag (tag is last 16 bytes of ct in aes-gcm)
    let tag_start = ct.len() - 16;
    let ciphertext = &ct[..tag_start];
    let tag = &ct[tag_start..];

    Ok(format!(
        "{}:{}:{}",
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, iv_bytes),
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, ciphertext),
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, tag),
    ))
}

pub fn last4(s: &str) -> String {
    let t = s.trim();
    if t.len() <= 4 { t.to_string() } else { t[t.len() - 4..].to_string() }
}

#[tauri::command]
pub async fn open_external(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

// Update commands — stubs matching Electron's update flow
// The bridge calls these but they're no-ops for now (Tauri uses different update mechanisms)
#[tauri::command]
pub async fn update_download() -> Result<(), String> { Ok(()) }

#[tauri::command]
pub async fn update_install() -> Result<(), String> { Ok(()) }

#[tauri::command]
pub async fn update_dismiss() -> Result<(), String> { Ok(()) }
