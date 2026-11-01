use std::{env, fs, path::PathBuf};

fn minecraft_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    let base = env::var_os("APPDATA").map(PathBuf::from).ok_or("Cartella APPDATA non trovata")?.join(".minecraft");
    #[cfg(target_os = "macos")]
    let base = env::var_os("HOME").map(PathBuf::from).ok_or("Cartella HOME non trovata")?.join("Library/Application Support/minecraft");
    #[cfg(target_os = "linux")]
    let base = env::var_os("HOME").map(PathBuf::from).ok_or("Cartella HOME non trovata")?.join(".minecraft");
    Ok(base)
}

#[tauri::command]
fn get_minecraft_mods_path() -> Result<String, String> {
    Ok(minecraft_dir()?.join("mods").to_string_lossy().to_string())
}

#[tauri::command]
fn list_installed_mods() -> Result<Vec<String>, String> {
    let dir = minecraft_dir()?.join("mods");
    if !dir.exists() { return Ok(Vec::new()); }
    let mut files = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|x| x.to_str()) == Some("jar") {
            if let Some(name) = path.file_name().and_then(|x| x.to_str()) { files.push(name.to_string()); }
        }
    }
    files.sort();
    Ok(files)
}

#[tauri::command]
fn install_modrinth_project(project_id: String, game_version: String, loader: String) -> Result<String, String> {
    if !project_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err("ID progetto non valido".into());
    }
    if !["fabric", "forge", "neoforge", "quilt"].contains(&loader.as_str()) {
        return Err("Mod loader non supportato".into());
    }
    let client = reqwest::blocking::Client::builder().user_agent("NOVA-CLIENT/0.1.0 (mod manager)").build().map_err(|e| e.to_string())?;
    let versions: Vec<serde_json::Value> = client.get(format!("https://api.modrinth.com/v2/project/{}/version", project_id))
        .query(&[("game_versions", format!("[\"{}\"]", game_version)), ("loaders", format!("[\"{}\"]", loader))])
        .send().map_err(|e| format!("Modrinth non raggiungibile: {e}"))?
        .error_for_status().map_err(|e| format!("Ricerca versioni fallita: {e}"))?
        .json().map_err(|e| format!("Risposta Modrinth non valida: {e}"))?;
    let version = versions.first().ok_or("Nessuna versione compatibile trovata per questa versione di Minecraft e loader")?;
    let files = version["files"].as_array().ok_or("Il progetto non contiene file scaricabili")?;
    let file = files.iter().find(|f| f["primary"].as_bool() == Some(true)).or_else(|| files.first()).ok_or("Nessun file disponibile")?;
    let filename = file["filename"].as_str().ok_or("Nome file mancante")?;
    if !filename.ends_with(".jar") || filename.contains('/') || filename.contains('\\') {
        return Err("Nome del file mod non sicuro".into());
    }
    let url = file["url"].as_str().ok_or("URL download mancante")?;
    let bytes = client.get(url).send().map_err(|e| format!("Download fallito: {e}"))?
        .error_for_status().map_err(|e| format!("Download rifiutato: {e}"))?
        .bytes().map_err(|e| format!("Lettura download fallita: {e}"))?;
    let dir = minecraft_dir()?.join("mods");
    fs::create_dir_all(&dir).map_err(|e| format!("Impossibile creare la cartella mods: {e}"))?;
    let destination = dir.join(filename);
    fs::write(&destination, &bytes).map_err(|e| format!("Impossibile salvare la mod: {e}"))?;
    Ok(filename.to_string())
}

#[tauri::command]
fn remove_installed_mod(filename: String) -> Result<(), String> {
    if filename.is_empty() || filename != PathBuf::from(&filename).file_name().and_then(|x| x.to_str()).unwrap_or("") || !filename.ends_with(".jar") {
        return Err("Nome file non valido".into());
    }
    let path = minecraft_dir()?.join("mods").join(filename);
    if !path.exists() { return Err("Mod non trovata".into()); }
    fs::remove_file(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_minecraft_mods_path,
            list_installed_mods,
            install_modrinth_project,
            remove_installed_mod
        ])
        .run(tauri::generate_context!())
        .expect("error while running NOVA CLIENT");
}
