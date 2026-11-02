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


fn write_varint(mut value: i32, out: &mut Vec<u8>) {
    loop {
        if (value & !0x7F) == 0 { out.push(value as u8); return; }
        out.push(((value & 0x7F) | 0x80) as u8);
        value = ((value as u32) >> 7) as i32;
    }
}

fn read_varint(stream: &mut std::net::TcpStream) -> Result<i32, String> {
    use std::io::Read;
    let mut result = 0i32;
    for index in 0..5 {
        let mut byte = [0u8; 1];
        stream.read_exact(&mut byte).map_err(|e| format!("Risposta server incompleta: {e}"))?;
        result |= ((byte[0] & 0x7F) as i32) << (7 * index);
        if byte[0] & 0x80 == 0 { return Ok(result); }
    }
    Err("Pacchetto Minecraft non valido".into())
}

fn write_mc_string(value: &str, out: &mut Vec<u8>) {
    write_varint(value.len() as i32, out);
    out.extend_from_slice(value.as_bytes());
}

fn flatten_description(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Array(items) => items.iter().map(flatten_description).collect::<String>(),
        serde_json::Value::Object(map) => {
            let own = map.get("text").and_then(|v| v.as_str()).unwrap_or("");
            let extra = map.get("extra").map(flatten_description).unwrap_or_default();
            format!("{own}{extra}")
        }
        _ => String::new(),
    }
}

#[tauri::command]
fn ping_minecraft_server(address: String) -> Result<serde_json::Value, String> {
    use std::io::{Read, Write};
    use std::net::{TcpStream, ToSocketAddrs};
    use std::time::{Duration, Instant};

    let address = address.trim();
    if address.is_empty() || address.len() > 255 || address.chars().any(char::is_whitespace) {
        return Err("Indirizzo server non valido".into());
    }
    let (host, port) = if let Some(rest) = address.strip_prefix('[') {
        let end = rest.find(']').ok_or("Indirizzo IPv6 non valido")?;
        let host = &rest[..end];
        let suffix = &rest[end + 1..];
        let port = if suffix.is_empty() { 25565 } else {
            suffix.strip_prefix(':').ok_or("Porta non valida")?.parse::<u16>().map_err(|_| "Porta non valida")?
        };
        (host, port)
    } else if address.matches(':').count() == 1 {
        let (host, port_text) = address.rsplit_once(':').ok_or("Indirizzo non valido")?;
        (host, port_text.parse::<u16>().map_err(|_| "Porta non valida")?)
    } else {
        (address, 25565)
    };
    if host.is_empty() || port == 0 { return Err("Host o porta non validi".into()); }

    let socket = (host, port).to_socket_addrs().map_err(|e| format!("Impossibile risolvere il server: {e}"))?
        .next().ok_or("Indirizzo server non trovato")?;
    let mut stream = TcpStream::connect_timeout(&socket, Duration::from_secs(4))
        .map_err(|e| format!("Server non raggiungibile: {e}"))?;
    stream.set_read_timeout(Some(Duration::from_secs(4))).map_err(|e| e.to_string())?;
    stream.set_write_timeout(Some(Duration::from_secs(4))).map_err(|e| e.to_string())?;

    // Handshake protocol status (protocol -1 asks the server to use its current protocol).
    let mut handshake = Vec::new();
    write_varint(0, &mut handshake);
    write_varint(-1, &mut handshake);
    write_mc_string(host, &mut handshake);
    handshake.extend_from_slice(&port.to_be_bytes());
    write_varint(1, &mut handshake);
    let mut packet = Vec::new();
    write_varint(handshake.len() as i32, &mut packet);
    packet.extend_from_slice(&handshake);
    stream.write_all(&packet).map_err(|e| format!("Handshake fallito: {e}"))?;
    stream.write_all(&[1, 0]).map_err(|e| format!("Richiesta status fallita: {e}"))?;

    let started = Instant::now();
    let packet_len = read_varint(&mut stream)?;
    if packet_len <= 0 || packet_len > 1_048_576 { return Err("Dimensione risposta server non valida".into()); }
    let packet_id = read_varint(&mut stream)?;
    if packet_id != 0 { return Err("Il server ha restituito un pacchetto inatteso".into()); }
    let json_len = read_varint(&mut stream)?;
    if json_len < 0 || json_len > packet_len { return Err("Risposta status non valida".into()); }
    let mut json_bytes = vec![0u8; json_len as usize];
    stream.read_exact(&mut json_bytes).map_err(|e| format!("Lettura status fallita: {e}"))?;
    let elapsed = started.elapsed().as_millis() as u64;
    let status: serde_json::Value = serde_json::from_slice(&json_bytes).map_err(|e| format!("JSON status non valido: {e}"))?;

    let version = status.pointer("/version/name").and_then(|v| v.as_str()).unwrap_or("Sconosciuta");
    let online = status.pointer("/players/online").and_then(|v| v.as_u64()).unwrap_or(0);
    let max = status.pointer("/players/max").and_then(|v| v.as_u64()).unwrap_or(0);
    let description = status.get("description").map(flatten_description).unwrap_or_default();
    Ok(serde_json::json!({
        "online": true,
        "latencyMs": elapsed,
        "version": version,
        "playersOnline": online,
        "playersMax": max,
        "description": description
    }))
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
            remove_installed_mod,
            ping_minecraft_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running NOVA CLIENT");
}
