use std::collections::HashMap;

#[tauri::command]
pub async fn proxy_get(
    url: String,
    headers: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .gzip(true)
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.get(&url);
    if let Some(h) = headers {
        req = req.headers(
            h.iter()
                .filter_map(|(k, v)| {
                    reqwest::header::HeaderName::from_bytes(k.as_bytes())
                        .ok()
                        .and_then(|name| {
                            reqwest::header::HeaderValue::from_str(v)
                                .ok()
                                .map(|val| (name, val))
                        })
                })
                .collect(),
        );
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status, text));
    }
    Ok(text)
}
