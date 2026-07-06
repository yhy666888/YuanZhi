use std::fs;
use tauri::Manager;

#[tauri::command]
pub async fn local_db_path(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("yuanzhi.db").to_string_lossy().to_string())
}

#[tauri::command]
pub async fn webdav_download(
    url: String,
    user: String,
    pass: String,
    remote_path: String,
) -> Result<String, String> {
    let full_url = build_url(&url, &remote_path);
    let client = reqwest::Client::new();
    let resp = client
        .get(&full_url)
        .basic_auth(&user, Some(&pass))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(String::new());
    }
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    let tmp = std::env::temp_dir().join("yuanzhi_remote.db");
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    Ok(tmp.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn webdav_upload(
    url: String,
    user: String,
    pass: String,
    remote_path: String,
    local_path: String,
) -> Result<(), String> {
    let full_url = build_url(&url, &remote_path);
    let bytes = fs::read(&local_path).map_err(|e| e.to_string())?;
    let client = reqwest::Client::new();
    // 确保远端目录存在（MKCOL，忽略已存在错误）
    if let Some(parent) = parent_path(&remote_path) {
        let dir_url = build_url(&url, &parent);
        let _ = client
            .request(
                reqwest::Method::from_bytes(b"MKCOL").unwrap(),
                &dir_url,
            )
            .basic_auth(&user, Some(&pass))
            .send()
            .await;
    }
    let resp = client
        .put(&full_url)
        .basic_auth(&user, Some(&pass))
        .body(bytes)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    Ok(())
}

fn build_url(base: &str, path: &str) -> String {
    let b = base.trim_end_matches('/');
    let p = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{}", path)
    };
    format!("{}{}", b, p)
}

fn parent_path(path: &str) -> Option<String> {
    let p = path.trim_end_matches('/');
    p.rfind('/').filter(|&i| i > 0).map(|i| p[..i].to_string())
}
