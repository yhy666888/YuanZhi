mod sync;
mod proxy;
// 触发重新编译以确使 capabilities（含 sql:allow-execute）生效

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            sync::local_db_path,
            sync::webdav_download,
            sync::webdav_upload,
            proxy::proxy_get,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
