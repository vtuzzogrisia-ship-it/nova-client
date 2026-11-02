use std::{env, fs, path::PathBuf, sync::Mutex};

static INSTALL_JAVA_LOCK: Mutex<()> = Mutex::new(());

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
fn get_minecraft_mods_path(instance_path: Option<String>) -> Result<String, String> {
    let dir = if let Some(path) = instance_path { let root = PathBuf::from(path); if !root.join("nova-instance.json").is_file() { return Err("Istanza NOVA non riconosciuta".into()); } root.join("mods") } else { minecraft_dir()?.join("mods") };
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn list_installed_mods(instance_path: Option<String>) -> Result<Vec<String>, String> {
    let dir = if let Some(path) = instance_path { let root = PathBuf::from(path); if !root.join("nova-instance.json").is_file() { return Err("Istanza NOVA non riconosciuta".into()); } root.join("mods") } else { minecraft_dir()?.join("mods") };
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

fn install_modrinth_version(
    client: &reqwest::blocking::Client,
    version: &serde_json::Value,
    game_version: &str,
    loader: &str,
    mods_dir: &std::path::Path,
    visited: &mut std::collections::HashSet<String>,
    installed: &mut Vec<String>,
) -> Result<(), String> {
    let version_id = version["id"].as_str().unwrap_or("unknown");
    if !visited.insert(format!("version:{version_id}")) { return Ok(()); }
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
    if let Some(expected) = file["hashes"]["sha1"].as_str() {
        use sha1::{Digest, Sha1};
        let actual = format!("{:x}", Sha1::digest(&bytes));
        if !actual.eq_ignore_ascii_case(expected) { return Err(format!("Verifica SHA-1 fallita per {filename}")); }
    }
    fs::create_dir_all(mods_dir).map_err(|e| e.to_string())?;
    fs::write(mods_dir.join(filename), &bytes).map_err(|e| format!("Impossibile salvare {filename}: {e}"))?;
    installed.push(filename.to_string());

    if let Some(dependencies) = version["dependencies"].as_array() {
        for dependency in dependencies {
            if dependency["dependency_type"].as_str() != Some("required") { continue; }
            if let Some(required_version) = dependency["version_id"].as_str() {
                let required: serde_json::Value = client.get(format!("https://api.modrinth.com/v2/version/{required_version}"))
                    .send().map_err(|e| format!("Metadati dipendenza non raggiungibili: {e}"))?
                    .error_for_status().map_err(|e| e.to_string())?.json().map_err(|e| e.to_string())?;
                install_modrinth_version(client, &required, game_version, loader, mods_dir, visited, installed)?;
            } else if let Some(required_project) = dependency["project_id"].as_str() {
                install_modrinth_recursive(client, required_project, game_version, loader, mods_dir, visited, installed)?;
            }
        }
    }
    Ok(())
}

fn install_modrinth_recursive(
    client: &reqwest::blocking::Client,
    project_id: &str,
    game_version: &str,
    loader: &str,
    mods_dir: &std::path::Path,
    visited: &mut std::collections::HashSet<String>,
    installed: &mut Vec<String>,
) -> Result<(), String> {
    if !visited.insert(format!("project:{project_id}")) { return Ok(()); }
    let versions: Vec<serde_json::Value> = client.get(format!("https://api.modrinth.com/v2/project/{}/version", project_id))
        .query(&[("game_versions", format!("[\"{}\"]", game_version)), ("loaders", format!("[\"{}\"]", loader))])
        .send().map_err(|e| format!("Modrinth non raggiungibile: {e}"))?
        .error_for_status().map_err(|e| format!("Ricerca versioni fallita: {e}"))?
        .json().map_err(|e| format!("Risposta Modrinth non valida: {e}"))?;
    let version = versions.first().ok_or_else(|| format!("Nessuna versione compatibile trovata per la dipendenza {project_id}"))?;
    install_modrinth_version(client, version, game_version, loader, mods_dir, visited, installed)
}

#[tauri::command]
fn install_modrinth_project(project_id: String, game_version: String, loader: String, instance_path: Option<String>) -> Result<Vec<String>, String> {
    if !project_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err("ID progetto non valido".into());
    }
    if !["fabric", "forge", "neoforge", "quilt"].contains(&loader.as_str()) {
        return Err("Mod loader non supportato".into());
    }
    let client = reqwest::blocking::Client::builder().user_agent("NOVA-CLIENT/0.1.0 (mod manager)").build().map_err(|e| e.to_string())?;
    let dir = if let Some(path) = instance_path {
        let root = PathBuf::from(path);
        if !root.join("nova-instance.json").is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
        root.join("mods")
    } else { minecraft_dir()?.join("mods") };
    let versions: Vec<serde_json::Value> = client.get(format!("https://api.modrinth.com/v2/project/{}/version", project_id))
        .query(&[("game_versions", format!("[\"{}\"]", game_version)), ("loaders", format!("[\"{}\"]", loader))])
        .send().map_err(|e| format!("Modrinth non raggiungibile: {e}"))?
        .error_for_status().map_err(|e| e.to_string())?.json().map_err(|e| e.to_string())?;
    let latest = versions.first().ok_or("Nessuna versione compatibile trovata")?;
    let files = latest["files"].as_array().ok_or("File versione Modrinth mancanti")?;
    let latest_filename = files.iter().find(|file| file["primary"].as_bool() == Some(true)).or_else(|| files.first())
        .and_then(|file| file["filename"].as_str()).ok_or("Nome file mod mancante")?.to_string();
    let mut visited = std::collections::HashSet::new();
    let mut installed = Vec::new();
    install_modrinth_recursive(&client, &project_id, &game_version, &loader, &dir, &mut visited, &mut installed)?;
    let manifest_path = dir.join(".nova-mods.json");
    let mut manifest: serde_json::Value = if manifest_path.is_file() {
        serde_json::from_slice(&fs::read(&manifest_path).map_err(|e| e.to_string())?).unwrap_or_else(|_| serde_json::json!({}))
    } else { serde_json::json!({}) };
    if let Some(old_filename) = manifest[project_id.as_str()].as_str() {
        if old_filename != latest_filename && old_filename.ends_with(".jar") {
            let old_path = dir.join(old_filename);
            if old_path.is_file() { fs::remove_file(old_path).map_err(|e| e.to_string())?; }
        }
    }
    manifest[project_id.as_str()] = serde_json::json!(latest_filename);
    fs::write(manifest_path, serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(installed)
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
fn check_modrinth_mod_updates(instance_path: Option<String>, game_version: String, loader: String) -> Result<Vec<serde_json::Value>, String> {
    let dir = if let Some(path) = instance_path {
        let root = PathBuf::from(path);
        if !root.join("nova-instance.json").is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
        root.join("mods")
    } else { minecraft_dir()?.join("mods") };
    let manifest_path = dir.join(".nova-mods.json");
    if !manifest_path.is_file() { return Ok(Vec::new()); }
    let manifest: serde_json::Value = serde_json::from_slice(&fs::read(manifest_path).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Manifest mod NOVA non valido: {e}"))?;
    let client = reqwest::blocking::Client::builder().user_agent("NOVA-CLIENT/0.1.0 (mod updates)").build().map_err(|e| e.to_string())?;
    let mut updates = Vec::new();
    if let Some(mods) = manifest.as_object() {
        for (project_id, current_file) in mods {
            let current_file = current_file.as_str().unwrap_or("");
            let versions: Vec<serde_json::Value> = client.get(format!("https://api.modrinth.com/v2/project/{project_id}/version"))
                .query(&[("game_versions", format!("[\"{}\"]", game_version)), ("loaders", format!("[\"{}\"]", loader))])
                .send().map_err(|e| format!("Controllo aggiornamenti Modrinth fallito: {e}"))?
                .error_for_status().map_err(|e| e.to_string())?.json().map_err(|e| e.to_string())?;
            if let Some(latest) = versions.first() {
                let latest_file = latest["files"].as_array().and_then(|files| files.iter().find(|f| f["primary"].as_bool() == Some(true)).or_else(|| files.first()))
                    .and_then(|f| f["filename"].as_str()).unwrap_or("");
                if !latest_file.is_empty() && latest_file != current_file {
                    updates.push(serde_json::json!({"projectId":project_id,"currentFile":current_file,"latestFile":latest_file,"versionId":latest["id"]}));
                }
            }
        }
    }
    Ok(updates)
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
    write_varint(767, &mut handshake);
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
fn remove_installed_mod(filename: String, instance_path: Option<String>) -> Result<(), String> {
    if filename.is_empty() || filename != PathBuf::from(&filename).file_name().and_then(|x| x.to_str()).unwrap_or("") || !filename.ends_with(".jar") {
        return Err("Nome file non valido".into());
    }
    let mods_dir = if let Some(instance) = instance_path { let root = PathBuf::from(instance); if !root.join("nova-instance.json").is_file() { return Err("Istanza NOVA non riconosciuta".into()); } root.join("mods") } else { minecraft_dir()?.join("mods") };
    let path = mods_dir.join(filename);
    if !path.exists() { return Err("Mod non trovata".into()); }
    fs::remove_file(path).map_err(|e| e.to_string())
}



#[derive(serde::Serialize)]
struct JavaRuntimeInfo {
    available: bool,
    executable: Option<String>,
    version: Option<String>,
    major: Option<u32>,
    error: Option<String>,
}

fn collect_java_binaries(root: &std::path::Path, depth: usize, output: &mut Vec<String>) {
    if depth > 7 { return; }
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let name = path.file_name().map(|v| v.to_string_lossy().to_lowercase()).unwrap_or_default();
                if name == (if cfg!(windows) { "java.exe" } else { "java" }) {
                    output.push(path.to_string_lossy().to_string());
                }
            } else if path.is_dir() {
                collect_java_binaries(&path, depth + 1, output);
            }
        }
    }
}

fn java_candidates() -> Vec<String> {
    let mut values = Vec::new();
    if let Ok(value) = env::var("JAVA_HOME") {
        values.push(PathBuf::from(value).join(if cfg!(windows) { "bin/java.exe" } else { "bin/java" }).to_string_lossy().to_string());
    }
    values.push(if cfg!(windows) { "java.exe".into() } else { "java".into() });
    if let Ok(root) = minecraft_dir() { collect_java_binaries(&root.join("nova-runtimes"), 0, &mut values); }
    values
}

#[tauri::command]
fn detect_java_runtimes() -> Vec<JavaRuntimeInfo> {
    use std::process::Command;
    let mut found = Vec::new();
    for candidate in java_candidates() {
        let output = Command::new(&candidate).arg("-version").output();
        let output = match output {
            Ok(value) if value.status.success() || !value.stderr.is_empty() => value,
            _ => continue,
        };
        let text = String::from_utf8_lossy(&output.stderr).to_string()
            + &String::from_utf8_lossy(&output.stdout);
        let version = text.lines().find(|line| line.contains("version")).unwrap_or("").trim().trim_matches('"').to_string();
        let quoted = text.split('"').nth(1).unwrap_or("");
        let major = if quoted.starts_with("1.") {
            quoted.split('.').nth(1).and_then(|v| v.parse::<u32>().ok())
        } else {
            quoted.split('.').next().and_then(|v| v.parse::<u32>().ok())
        };
        if !found.iter().any(|item: &JavaRuntimeInfo| item.executable.as_deref() == Some(candidate.as_str())) {
            found.push(JavaRuntimeInfo {
                available: true,
                executable: Some(candidate.clone()),
                version: Some(if version.is_empty() { quoted.to_string() } else { version }),
                major,
                error: None,
            });
        }
    }
    if found.is_empty() {
        found.push(JavaRuntimeInfo { available: false, executable: None, version: None, major: None,
            error: Some("Java non trovato. Installa un runtime Java compatibile (Java 21 per le versioni recenti) e riprova.".into()) });
    }
    found
}

#[tauri::command]
fn list_minecraft_versions() -> Result<serde_json::Value, String> {
    let response: serde_json::Value = reqwest::blocking::get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
        .map_err(|e| format!("Manifest Minecraft non raggiungibile: {e}"))?
        .error_for_status().map_err(|e| e.to_string())?
        .json().map_err(|e| format!("Manifest Minecraft non valido: {e}"))?;
    Ok(response)
}

#[tauri::command]
fn install_vanilla_version(version_id: String) -> Result<String, String> {
    if version_id.is_empty() || version_id.len() > 64 ||
        !version_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_') {
        return Err("ID versione non valido".into());
    }
    let client = reqwest::blocking::Client::builder()
        .user_agent("NOVA-CLIENT/0.1.0")
        .build().map_err(|e| e.to_string())?;
    let manifest: serde_json::Value = client.get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
        .send().map_err(|e| e.to_string())?.error_for_status().map_err(|e| e.to_string())?
        .json().map_err(|e| e.to_string())?;
    let entry = manifest["versions"].as_array().and_then(|versions|
        versions.iter().find(|item| item["id"].as_str() == Some(version_id.as_str())))
        .ok_or("Versione Minecraft non presente nel manifest ufficiale")?;
    let metadata_url = entry["url"].as_str().ok_or("URL metadati versione mancante")?;
    let metadata: serde_json::Value = client.get(metadata_url).send().map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?.json().map_err(|e| e.to_string())?;
    let client_info = &metadata["downloads"]["client"];
    let download_url = client_info["url"].as_str().ok_or("Download client non disponibile per questa versione")?;
    let expected_sha1 = client_info["sha1"].as_str().unwrap_or("").to_lowercase();
    let bytes = client.get(download_url).send().map_err(|e| format!("Download Minecraft fallito: {e}"))?
        .error_for_status().map_err(|e| e.to_string())?.bytes().map_err(|e| e.to_string())?;
    use sha1::{Digest, Sha1};
    let actual_sha1 = format!("{:x}", Sha1::digest(&bytes));
    if !expected_sha1.is_empty() && actual_sha1 != expected_sha1 {
        return Err("Verifica SHA-1 del client Minecraft non riuscita".into());
    }
    let root = minecraft_dir()?.join("versions").join(&version_id);
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    fs::write(root.join(format!("{version_id}.jar")), &bytes).map_err(|e| e.to_string())?;
    fs::write(root.join(format!("{version_id}.json")), serde_json::to_vec_pretty(&metadata).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(format!("Minecraft {version_id}: client jar e metadati installati e verificati. Librerie e asset saranno completati dal resolver prima dell'avvio."))
}

#[tauri::command]
fn create_game_instance(name: String, version: String, loader: String) -> Result<String, String> {
    let clean = name.trim();
    if clean.is_empty() || clean.len() > 48 || !clean.chars().all(|c| c.is_ascii_alphanumeric() || c == ' ' || c == '-' || c == '_') {
        return Err("Nome istanza non valido".into());
    }
    if version.is_empty() || version.len() > 64 || !version.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_') {
        return Err("Versione non valida".into());
    }
    if !["vanilla", "fabric", "quilt", "forge", "neoforge"].contains(&loader.as_str()) {
        return Err("Loader non supportato".into());
    }
    let slug = clean.to_lowercase().replace(' ', "-");
    let path = minecraft_dir()?.join("nova-instances").join(format!("{slug}-{version}-{loader}"));
    for folder in ["mods", "resourcepacks", "shaderpacks", "config", "saves"] {
        fs::create_dir_all(path.join(folder)).map_err(|e| e.to_string())?;
    }
    if loader == "fabric" && version == "1.21.4" {
        let client = reqwest::blocking::Client::builder().user_agent("NOVA-CLIENT/0.1.0")
            .build().map_err(|e| e.to_string())?;
        let mut visited = std::collections::HashSet::new();
        let mut installed = Vec::new();
        install_modrinth_recursive(&client, "P7dR8mSH", &version, "fabric", &path.join("mods"), &mut visited, &mut installed)
            .map_err(|e| format!("Installazione Fabric API necessaria per NOVA HUD non riuscita: {e}"))?;
    }
    if loader == "fabric" && version == "1.21.4" {
        use base64::Engine;
        let embedded = include_str!("../resources/nova-hud.jar.b64").trim();
        if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(embedded) {
            if bytes.starts_with(b"PK\x03\x04") {
                fs::write(path.join("mods").join("nova-hud.jar"), bytes)
                    .map_err(|e| format!("Impossibile installare NOVA HUD nell'istanza: {e}"))?;
            }
        }
    }
    let metadata_path = path.join("nova-instance.json");
    let mut metadata: serde_json::Value = if metadata_path.is_file() {
        serde_json::from_slice(&fs::read(&metadata_path).map_err(|e| e.to_string())?)
            .map_err(|e| format!("Metadati istanza non validi: {e}"))?
    } else { serde_json::json!({"profileId": null}) };
    metadata["name"] = serde_json::json!(clean);
    metadata["version"] = serde_json::json!(version);
    metadata["loader"] = serde_json::json!(loader);
    metadata["gameDir"] = serde_json::json!(path);
    fs::write(metadata_path, serde_json::to_vec_pretty(&metadata).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}



#[tauri::command]
fn install_modrinth_modpack(instance_path: String, filename: String, data_base64: String) -> Result<Vec<String>, String> {
    use std::io::Read;
    use base64::Engine;
    let root = PathBuf::from(instance_path);
    let metadata_path = root.join("nova-instance.json");
    if !metadata_path.is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
    let metadata: serde_json::Value = serde_json::from_slice(&fs::read(&metadata_path).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Metadati istanza non validi: {e}"))?;
    if !filename.to_lowercase().ends_with(".mrpack") { return Err("Seleziona un modpack Modrinth .mrpack".into()); }
    let bytes = base64::engine::general_purpose::STANDARD.decode(data_base64).map_err(|_| "Modpack non codificato correttamente")?;
    if bytes.len() > 512 * 1024 * 1024 { return Err("Il modpack supera il limite di 512 MB".into()); }
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes)).map_err(|e| format!("Archivio modpack non valido: {e}"))?;
    let manifest: serde_json::Value = {
        let mut entry = archive.by_name("modrinth.index.json").map_err(|_| "Il file non contiene modrinth.index.json")?;
        let mut bytes = Vec::new();
        entry.take(4 * 1024 * 1024).read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        serde_json::from_slice(&bytes).map_err(|e| format!("Manifest modpack non valido: {e}"))?
    };
    if manifest["game"].as_str() != Some("minecraft") { return Err("Il modpack non è per Minecraft".into()); }
    let dependencies = manifest["dependencies"].as_object().ok_or("Dipendenze modpack mancanti")?;
    if dependencies.get("minecraft").and_then(|v| v.as_str()) != metadata["version"].as_str() {
        return Err("La versione Minecraft del modpack non coincide con l'istanza selezionata".into());
    }
    let loader = metadata["loader"].as_str().ok_or("Loader istanza mancante")?;
    let loader_key = match loader { "fabric" => "fabric-loader", "quilt" => "quilt-loader", "forge" => "forge", "neoforge" => "neoforge", "vanilla" => return Err("I modpack richiedono un'istanza con mod loader".into()), _ => return Err("Loader istanza non supportato".into()) };
    if !dependencies.contains_key(loader_key) { return Err(format!("Il modpack richiede un loader diverso da {loader}")); }

    let client = reqwest::blocking::Client::builder().user_agent("NOVA-CLIENT/0.1.0 (Modrinth modpack)")
        .build().map_err(|e| e.to_string())?;
    let mut installed = Vec::new();
    if let Some(files) = manifest["files"].as_array() {
        for item in files {
            if item["env"]["client"].as_str() == Some("unsupported") { continue; }
            let relative = item["path"].as_str().ok_or("Percorso file modpack mancante")?;
            if relative.contains('\\') { return Err("Percorso modpack non valido".into()); }
            let relative_path = PathBuf::from(relative);
            if relative_path.is_absolute() || relative_path.components().any(|part| !matches!(part, std::path::Component::Normal(_))) {
                return Err(format!("Percorso modpack non sicuro: {relative}"));
            }
            let url = item["downloads"].as_array().and_then(|items| items.first()).and_then(|v| v.as_str())
                .ok_or_else(|| format!("Download mancante per {relative}"))?;
            if !url.starts_with("https://") { return Err(format!("URL non sicuro per {relative}")); }
            let bytes = client.get(url).send().map_err(|e| format!("Download modpack fallito ({relative}): {e}"))?
                .error_for_status().map_err(|e| e.to_string())?.bytes().map_err(|e| e.to_string())?;
            if bytes.len() > 512 * 1024 * 1024 { return Err(format!("File modpack troppo grande: {relative}")); }
            if let Some(expected) = item["hashes"]["sha1"].as_str() {
                use sha1::{Digest, Sha1};
                let actual = format!("{:x}", Sha1::digest(&bytes));
                if !actual.eq_ignore_ascii_case(expected) { return Err(format!("Verifica SHA-1 fallita: {relative}")); }
            } else { return Err(format!("Hash SHA-1 mancante: {relative}")); }
            let destination = root.join(&relative_path);
            if let Some(parent) = destination.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
            fs::write(&destination, &bytes).map_err(|e| format!("Scrittura modpack fallita: {e}"))?;
            installed.push(relative.to_string());
        }
    }
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        if entry.is_dir() { continue; }
        let raw = entry.name().to_string();
        let relative = raw.strip_prefix("overrides/").or_else(|| raw.strip_prefix("client-overrides/"));
        let Some(relative) = relative else { continue; };
        if relative.is_empty() || relative.contains('\\') { return Err("Percorso override non valido".into()); }
        let relative_path = PathBuf::from(relative);
        if relative_path.is_absolute() || relative_path.components().any(|part| !matches!(part, std::path::Component::Normal(_))) {
            return Err(format!("Percorso override non sicuro: {relative}"));
        }
        if entry.size() > 512 * 1024 * 1024 { return Err(format!("Override troppo grande: {relative}")); }
        let destination = root.join(&relative_path);
        if let Some(parent) = destination.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
        let mut output = fs::File::create(&destination).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut output).map_err(|e| e.to_string())?;
        installed.push(relative.to_string());
    }
    Ok(installed)
}

#[tauri::command]
fn install_instance_shader_support(instance_path: String) -> Result<Vec<String>, String> {
    let root = PathBuf::from(instance_path);
    let metadata_path = root.join("nova-instance.json");
    if !metadata_path.is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
    let metadata: serde_json::Value = serde_json::from_slice(&fs::read(metadata_path).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Metadati istanza non validi: {e}"))?;
    if metadata["loader"].as_str() != Some("fabric") {
        return Err("Il supporto shader automatico Iris è attualmente disponibile per istanze Fabric".into());
    }
    let version = metadata["version"].as_str().ok_or("Versione istanza mancante")?;
    let client = reqwest::blocking::Client::builder().user_agent("NOVA-CLIENT/0.1.0 (shader support)")
        .build().map_err(|e| e.to_string())?;
    let mut visited = std::collections::HashSet::new();
    let mut installed = Vec::new();
    install_modrinth_recursive(&client, "YL57xq9U", version, "fabric", &root.join("mods"), &mut visited, &mut installed)
        .map_err(|e| format!("Installazione Iris non riuscita: {e}"))?;
    install_modrinth_recursive(&client, "AANobbMI", version, "fabric", &root.join("mods"), &mut visited, &mut installed)
        .map_err(|e| format!("Installazione Sodium non riuscita: {e}"))?;
    Ok(installed)
}

#[tauri::command]
fn list_instance_packs(instance_path: String, kind: String) -> Result<Vec<String>, String> {
    if !["resourcepacks", "shaderpacks"].contains(&kind.as_str()) { return Err("Tipo pacchetto non valido".into()); }
    let root = PathBuf::from(&instance_path);
    if !root.join("nova-instance.json").is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
    let dir = root.join(kind);
    let mut values = Vec::new();
    if dir.exists() {
        for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
            let path = entry.map_err(|e| e.to_string())?.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|x| x.to_str()) { values.push(name.to_string()); }
            }
        }
    }
    values.sort();
    Ok(values)
}

#[tauri::command]
fn import_instance_pack(instance_path: String, kind: String, source_path: String) -> Result<String, String> {
    if !["resourcepacks", "shaderpacks"].contains(&kind.as_str()) { return Err("Tipo pacchetto non valido".into()); }
    let root = PathBuf::from(&instance_path);
    if !root.join("nova-instance.json").is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
    let source = PathBuf::from(&source_path);
    if !source.is_file() { return Err("File pacchetto non trovato".into()); }
    let filename = source.file_name().and_then(|x| x.to_str()).ok_or("Nome file non valido")?;
    if !filename.to_lowercase().ends_with(".zip") {
        return Err("Sono supportati pacchetti .zip (resource pack o shader pack)".into());
    }
    let destination = root.join(kind).join(filename);
    fs::create_dir_all(destination.parent().ok_or("Destinazione non valida")?).map_err(|e| e.to_string())?;
    fs::copy(&source, &destination).map_err(|e| e.to_string())?;
    Ok(filename.to_string())
}


#[tauri::command]
fn import_instance_pack_data(instance_path: String, kind: String, filename: String, data_base64: String) -> Result<String, String> {
    use base64::Engine;
    if !["resourcepacks", "shaderpacks"].contains(&kind.as_str()) { return Err("Tipo pacchetto non valido".into()); }
    if filename.is_empty() || filename.len() > 180 || filename.contains('/') || filename.contains('\\') || !filename.to_lowercase().ends_with(".zip") {
        return Err("Seleziona un archivio .zip con nome valido".into());
    }
    let root = PathBuf::from(instance_path);
    if !root.join("nova-instance.json").is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
    let bytes = base64::engine::general_purpose::STANDARD.decode(data_base64).map_err(|_| "File non codificato correttamente")?;
    if bytes.len() > 512 * 1024 * 1024 { return Err("Il pacchetto supera il limite di 512 MB".into()); }
    let destination = root.join(kind).join(&filename);
    fs::create_dir_all(destination.parent().ok_or("Destinazione non valida")?).map_err(|e| e.to_string())?;
    fs::write(destination, bytes).map_err(|e| e.to_string())?;
    Ok(filename)
}


#[tauri::command]
fn install_game_profile(game_version: String, loader: String, loader_version: Option<String>, java_executable: Option<String>, instance_path: Option<String>) -> Result<String, String> {
    use mc_launcher_core::prelude::*;
    if game_version.is_empty() || game_version.len() > 64 || !game_version.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_') {
        return Err("Versione Minecraft non valida".into());
    }
    let loader_spec = match loader.as_str() {
        "vanilla" => None,
        "fabric" => Some(LoaderSpec::Fabric { version: loader_version.clone().map(LoaderVersion::Exact).unwrap_or(LoaderVersion::LatestStable) }),
        "quilt" => Some(LoaderSpec::Quilt { version: loader_version.clone().map(LoaderVersion::Exact).unwrap_or(LoaderVersion::Latest) }),
        "forge" => Some(LoaderSpec::Forge { version: loader_version.clone().map(LoaderVersion::Exact).unwrap_or(LoaderVersion::Latest) }),
        "neoforge" => Some(LoaderSpec::NeoForge { version: loader_version.map(LoaderVersion::Exact).unwrap_or(LoaderVersion::Latest) }),
        _ => return Err("Mod loader non supportato".into()),
    };
    let launcher = Launcher::new(minecraft_dir().map_err(|e| e.to_string())?);
    let _guard = INSTALL_JAVA_LOCK.lock().map_err(|_| "Blocco installazione Java non disponibile")?;
    let original_path = env::var_os("PATH");
    let version_parts = game_version.split('.').filter_map(|part| part.parse::<u32>().ok()).collect::<Vec<_>>();
    let required_java = if version_parts.first().copied().unwrap_or(1) >= 26 { 25 }
        else if version_parts.get(1) == Some(&17) { 16 }
        else if version_parts.get(1).copied().unwrap_or(0) >= 21
            || (version_parts.get(1) == Some(&20) && version_parts.get(2).copied().unwrap_or(0) >= 5) { 21 }
        else if version_parts.get(1).copied().unwrap_or(0) >= 18 { 17 }
        else { 8 };
    let selected_java = if let Some(executable) = java_executable {
        Some(executable)
    } else {
        detect_java_runtimes().into_iter()
            .find(|runtime| runtime.available && runtime.major == Some(required_java))
            .and_then(|runtime| runtime.executable)
    };
    if let Some(executable) = selected_java {
        if let Some(bin_dir) = PathBuf::from(executable).parent() {
            let mut paths = vec![bin_dir.to_path_buf()];
            if let Some(existing) = &original_path { paths.extend(env::split_paths(existing)); }
            let joined = env::join_paths(paths).map_err(|e| format!("Percorso Java non valido: {e}"))?;
            env::set_var("PATH", joined);
        }
    }
    let install_result = launcher.install(InstallRequest {
        minecraft_version: game_version.clone(),
        loader: loader_spec,
        java: JavaInstallPolicy::Never,
    });
    if let Some(original) = original_path { env::set_var("PATH", original); } else { env::remove_var("PATH"); }
    let result = install_result.map_err(|e| format!("Installazione Minecraft/loader fallita: {e}"))?;
    if let Some(path) = instance_path {
        let instance = PathBuf::from(path);
        let metadata_path = instance.join("nova-instance.json");
        if !metadata_path.is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
        let mut metadata: serde_json::Value = serde_json::from_slice(&fs::read(&metadata_path).map_err(|e| e.to_string())?)
            .map_err(|e| format!("Metadati istanza non validi: {e}"))?;
        if metadata["version"].as_str() != Some(game_version.as_str()) || metadata["loader"].as_str() != Some(loader.as_str()) {
            return Err("La versione o il loader dell'istanza non corrispondono al profilo installato".into());
        }
        metadata["profileId"] = serde_json::json!(result.version_id);
        fs::write(metadata_path, serde_json::to_vec_pretty(&metadata).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
    }
    Ok(result.version_id)
}

#[tauri::command]
fn launch_offline_profile(version_id: String, instance_path: String, username: String, ram_gb: u8, java_executable: Option<String>) -> Result<u32, String> {
    use mc_launcher_core::prelude::*;
    use std::{fs::OpenOptions, process::{Command, Stdio}};
    if username.len() < 3 || username.len() > 16 || !username.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return Err("Nome giocatore non valido: usa 3-16 caratteri alfanumerici o underscore".into());
    }
    if !(2..=32).contains(&ram_gb) { return Err("RAM non valida (2-32 GB)".into()); }
    let game_dir = PathBuf::from(&instance_path);
    let metadata_path = game_dir.join("nova-instance.json");
    if !metadata_path.is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
    let metadata: serde_json::Value = serde_json::from_slice(&fs::read(&metadata_path).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Metadati istanza non validi: {e}"))?;
    if metadata["profileId"].as_str() != Some(version_id.as_str()) {
        return Err("Il profilo selezionato non corrisponde a quello installato in questa istanza. Reinstalla il profilo o seleziona l'istanza corretta.".into());
    }
    let root = minecraft_dir().map_err(|e| e.to_string())?;
    let launcher = Launcher::new(&root);
    let version = launcher.load_version(&version_id).map_err(|e| format!("Profilo non installato o incompleto: {e}"))?;
    let required_java = version.java_version.as_ref().map(|value| value.major_version as u32);
    let runtimes = detect_java_runtimes();
    let java_path = if let Some(explicit) = java_executable {
        let selected = runtimes.iter().find(|runtime| runtime.executable.as_deref() == Some(explicit.as_str()));
        if let (Some(expected), Some(runtime)) = (required_java, selected) {
            if runtime.major != Some(expected) {
                return Err(format!("Questa versione richiede Java {expected}, ma il runtime selezionato è {}.", runtime.major.map(|v| v.to_string()).unwrap_or_else(|| "sconosciuto".into())));
            }
        }
        PathBuf::from(explicit)
    } else {
        runtimes.into_iter()
            .find(|runtime| runtime.available && (required_java.is_none() || runtime.major == required_java))
            .and_then(|runtime| runtime.executable.map(PathBuf::from))
            .ok_or_else(|| format!("Java {} non trovato. Installa il runtime richiesto dalla sezione Launcher.", required_java.map(|v| v.to_string()).unwrap_or_else(|| "compatibile".into())))?
    };
    let options = LaunchOptions {
        account: Account::offline(username),
        java_executable: Some(java_path),
        game_directory: Some(game_dir.clone()),
        ..Default::default()
    };
    let launch = launcher.build_launch_command_from_version(&version, options)
        .map_err(|e| format!("Preparazione comando Java fallita: {e}"))?;
    let log_path = game_dir.join("nova-game.log");
    let log = OpenOptions::new().create(true).append(true).open(log_path).map_err(|e| e.to_string())?;
    let error_log = log.try_clone().map_err(|e| e.to_string())?;
    let mut launch_args = launch.args.clone();
    let main_class = version.main_class.as_deref().unwrap_or("");
    let main_index = launch_args.iter().position(|arg| arg == main_class)
        .ok_or("Main class non trovato negli argomenti di avvio")?;
    launch_args.insert(main_index, format!("-Xmx{}G", ram_gb));
    let mut command = Command::new(&launch.executable);
    command.args(&launch_args)
        .current_dir(&launch.working_dir)
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(error_log));
    for (key, value) in launch.env { command.env(key, value); }
    let child = command.spawn().map_err(|e| format!("Avvio Minecraft non riuscito: {e}. Controlla Java e il log dell'istanza."))?;
    Ok(child.id())
}


#[tauri::command]
fn activate_instance_pack(instance_path: String, kind: String, filename: String, enabled: bool) -> Result<(), String> {
    if !["resourcepacks", "shaderpacks"].contains(&kind.as_str()) { return Err("Tipo pacchetto non valido".into()); }
    if filename.is_empty() || filename.contains('/') || filename.contains('\\') || !filename.to_lowercase().ends_with(".zip") {
        return Err("Nome pacchetto non valido".into());
    }
    let root = PathBuf::from(instance_path);
    if !root.join("nova-instance.json").is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
    if !root.join(&kind).join(&filename).is_file() { return Err("Pacchetto non trovato nell'istanza".into()); }
    let options_path = root.join("options.txt");
    let mut lines = if options_path.exists() {
        fs::read_to_string(&options_path).map_err(|e| e.to_string())?.lines().map(str::to_string).collect::<Vec<_>>()
    } else { Vec::new() };
    if kind == "resourcepacks" {
        let mut packs: Vec<String> = lines.iter().find_map(|line| line.strip_prefix("resourcePacks:"))
            .and_then(|value| serde_json::from_str(value).ok()).unwrap_or_else(|| vec!["vanilla".to_string()]);
        let pack_id = format!("file/{filename}");
        if enabled { if !packs.contains(&pack_id) { packs.push(pack_id); } } else { packs.retain(|item| item != &pack_id); }
        let serialized = serde_json::to_string(&packs).map_err(|e| e.to_string())?;
        lines.retain(|line| !line.starts_with("resourcePacks:"));
        lines.push(format!("resourcePacks:{serialized}"));
    } else {
        let current = lines.iter().find_map(|line| line.strip_prefix("shaderPack:")).unwrap_or("").to_string();
        if enabled || current == filename { lines.retain(|line| !line.starts_with("shaderPack:")); }
        if enabled { lines.push(format!("shaderPack:{filename}")); }
    }
    fs::write(options_path, lines.join("\n") + "\n").map_err(|e| e.to_string())
}


fn find_java_binary(root: &std::path::Path, depth: usize) -> Option<PathBuf> {
    if depth > 7 { return None; }
    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            let name = path.file_name()?.to_string_lossy().to_lowercase();
            if name == (if cfg!(windows) { "java.exe" } else { "java" }) { return Some(path); }
        } else if path.is_dir() {
            if let Some(found) = find_java_binary(&path, depth + 1) { return Some(found); }
        }
    }
    None
}

#[tauri::command]
fn install_java_runtime(major: u32) -> Result<String, String> {
    use std::io::Cursor;
    if ![8, 16, 17, 21, 25].contains(&major) { return Err("Sono disponibili i runtime Java 8, 16, 17, 21 e 25".into()); }
    let os = match env::consts::OS { "windows" => "windows", "macos" => "mac", "linux" => "linux", _ => return Err("Sistema operativo non supportato per il download Java".into()) };
    let arch = match env::consts::ARCH { "x86_64" => "x64", "aarch64" => "aarch64", _ => return Err("Architettura non supportata per il download Java".into()) };
    let destination = minecraft_dir()?.join("nova-runtimes").join(format!("temurin-{major}-{os}-{arch}"));
    if let Some(existing) = find_java_binary(&destination, 0) { return Ok(existing.to_string_lossy().to_string()); }
    let client = reqwest::blocking::Client::builder().user_agent("NOVA-CLIENT/0.1.0").build().map_err(|e| e.to_string())?;
    let assets: serde_json::Value = client.get(format!("https://api.adoptium.net/v3/assets/latest/{major}/hotspot"))
        .query(&[("architecture", arch), ("image_type", "jre"), ("os", os), ("vendor", "eclipse")])
        .send().map_err(|e| format!("Catalogo Java non raggiungibile: {e}"))?
        .error_for_status().map_err(|e| e.to_string())?.json().map_err(|e| format!("Catalogo Java non valido: {e}"))?;
    let asset = assets.as_array().and_then(|items| items.first()).ok_or("Nessun runtime Temurin compatibile trovato")?;
    let url = asset["binary"]["package"]["link"].as_str().ok_or("Link runtime Java mancante")?;
    let expected = asset["binary"]["package"]["checksum"].as_str().ok_or("Checksum Java mancante")?.to_lowercase();
    let bytes = client.get(url).send().map_err(|e| format!("Download Java non riuscito: {e}"))?
        .error_for_status().map_err(|e| format!("Runtime Java non disponibile: {e}"))?
        .bytes().map_err(|e| e.to_string())?;
    if bytes.len() > 512 * 1024 * 1024 { return Err("Archivio Java troppo grande".into()); }
    use sha2::{Digest, Sha256};
    let actual = format!("{:x}", Sha256::digest(&bytes));
    if actual != expected { return Err("Verifica SHA-256 del runtime Java non riuscita".into()); }
    fs::create_dir_all(&destination).map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    {
        let mut archive = zip::ZipArchive::new(Cursor::new(bytes)).map_err(|e| format!("Archivio Java ZIP non valido: {e}"))?;
        for index in 0..archive.len() {
            let mut file = archive.by_index(index).map_err(|e| e.to_string())?;
            let Some(relative) = file.enclosed_name().map(PathBuf::from) else { continue; };
            let output = destination.join(relative);
            if file.is_dir() { fs::create_dir_all(&output).map_err(|e| e.to_string())?; }
            else {
                if let Some(parent) = output.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
                let mut target = fs::File::create(&output).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut target).map_err(|e| e.to_string())?;
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let decoder = flate2::read::GzDecoder::new(Cursor::new(bytes));
        let mut archive = tar::Archive::new(decoder);
        archive.unpack(&destination).map_err(|e| format!("Estrazione runtime Java non riuscita: {e}"))?;
    }
    let executable = find_java_binary(&destination, 0).ok_or("Java è stato scaricato ma l'eseguibile non è stato trovato")?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut permissions = fs::metadata(&executable).map_err(|e| e.to_string())?.permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&executable, permissions).map_err(|e| e.to_string())?;
    }
    Ok(executable.to_string_lossy().to_string())
}




fn copy_instance_tree(source: &std::path::Path, destination: &std::path::Path) -> Result<(), String> {
    fs::create_dir_all(destination).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(source).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        let kind = entry.file_type().map_err(|e| e.to_string())?;
        if kind.is_dir() {
            copy_instance_tree(&source_path, &destination_path)?;
        } else if kind.is_file() {
            if let Some(parent) = destination_path.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
            fs::copy(&source_path, &destination_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn backup_game_instance(instance_path: String) -> Result<String, String> {
    use std::time::{SystemTime, UNIX_EPOCH};
    let instances_root = minecraft_dir()?.join("nova-instances").canonicalize().map_err(|_| "Cartella istanze NOVA non trovata")?;
    let source = PathBuf::from(instance_path).canonicalize().map_err(|e| e.to_string())?;
    if !source.starts_with(&instances_root) || !source.join("nova-instance.json").is_file() {
        return Err("Istanza NOVA non valida per il backup".into());
    }
    let name = source.file_name().and_then(|v| v.to_str()).ok_or("Nome istanza non valido")?;
    let backups_root = minecraft_dir()?.join("nova-backups");
    fs::create_dir_all(&backups_root).map_err(|e| e.to_string())?;
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_secs();
    let destination = backups_root.join(format!("{name}-{timestamp}"));
    copy_instance_tree(&source, &destination)?;
    Ok(destination.to_string_lossy().to_string())
}

#[tauri::command]
fn list_instance_backups(instance_path: String) -> Result<Vec<String>, String> {
    let instances_root = minecraft_dir()?.join("nova-instances").canonicalize().map_err(|_| "Cartella istanze NOVA non trovata")?;
    let instance = PathBuf::from(instance_path).canonicalize().map_err(|e| e.to_string())?;
    if !instance.starts_with(&instances_root) || !instance.join("nova-instance.json").is_file() {
        return Err("Istanza NOVA non valida".into());
    }
    let name = instance.file_name().and_then(|v| v.to_str()).ok_or("Nome istanza non valido")?;
    let backups_root = minecraft_dir()?.join("nova-backups");
    if !backups_root.exists() { return Ok(Vec::new()); }
    let mut result = Vec::new();
    for entry in fs::read_dir(backups_root).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.is_dir() && path.file_name().and_then(|v| v.to_str()).map(|v| v.starts_with(&format!("{name}-"))).unwrap_or(false)
            && path.join("nova-instance.json").is_file() {
            result.push(path.to_string_lossy().to_string());
        }
    }
    result.sort();
    result.reverse();
    Ok(result)
}

#[tauri::command]
fn restore_game_instance_backup(instance_path: String, backup_path: String) -> Result<(), String> {
    let root = minecraft_dir()?;
    let instances_root = root.join("nova-instances").canonicalize().map_err(|_| "Cartella istanze NOVA non trovata")?;
    let backups_root = root.join("nova-backups").canonicalize().map_err(|_| "Cartella backup NOVA non trovata")?;
    let destination = PathBuf::from(instance_path).canonicalize().map_err(|e| e.to_string())?;
    let source = PathBuf::from(backup_path).canonicalize().map_err(|e| e.to_string())?;
    if !destination.starts_with(&instances_root) || !destination.join("nova-instance.json").is_file()
        || !source.starts_with(&backups_root) || !source.join("nova-instance.json").is_file() {
        return Err("Percorso istanza o backup non valido".into());
    }
    let destination_meta: serde_json::Value = serde_json::from_slice(&fs::read(destination.join("nova-instance.json")).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let source_meta: serde_json::Value = serde_json::from_slice(&fs::read(source.join("nova-instance.json")).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    if destination_meta["name"] != source_meta["name"] || destination_meta["version"] != source_meta["version"] || destination_meta["loader"] != source_meta["loader"] {
        return Err("Il backup non appartiene alla stessa istanza o alla stessa configurazione".into());
    }
    for folder in ["mods", "resourcepacks", "shaderpacks", "config", "saves"] {
        let target = destination.join(folder);
        if target.exists() { fs::remove_dir_all(target).map_err(|e| e.to_string())?; }
    }
    let options = destination.join("options.txt");
    if options.exists() { fs::remove_file(options).map_err(|e| e.to_string())?; }
    copy_instance_tree(&source, &destination)?;
    Ok(())
}


#[tauri::command]
fn read_instance_log(instance_path: String) -> Result<String, String> {
    let instances_root = minecraft_dir()?.join("nova-instances").canonicalize().map_err(|_| "Cartella istanze NOVA non trovata")?;
    let instance = PathBuf::from(instance_path).canonicalize().map_err(|e| e.to_string())?;
    if !instance.starts_with(&instances_root) || !instance.join("nova-instance.json").is_file() {
        return Err("Istanza NOVA non valida".into());
    }
    let path = instance.join("nova-game.log");
    if !path.is_file() { return Ok("Nessun log di gioco disponibile. Avvia Minecraft per generarlo.".into()); }
    let content = fs::read_to_string(path).map_err(|e| format!("Impossibile leggere il log: {e}"))?;
    let mut lines = content.lines().rev().take(180).collect::<Vec<_>>();
    lines.reverse();
    Ok(lines.join("\n"))
}

#[tauri::command]
fn get_instance_profile_id(instance_path: String) -> Result<Option<String>, String> {
    let root = PathBuf::from(instance_path);
    let metadata_path = root.join("nova-instance.json");
    if !metadata_path.is_file() { return Err("Istanza NOVA non riconosciuta".into()); }
    let metadata: serde_json::Value = serde_json::from_slice(&fs::read(metadata_path).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Metadati istanza non validi: {e}"))?;
    Ok(metadata["profileId"].as_str().map(str::to_string))
}

#[tauri::command]
fn list_game_instances() -> Result<Vec<serde_json::Value>, String> {
    let root = minecraft_dir()?.join("nova-instances");
    if !root.exists() { return Ok(Vec::new()); }
    let mut result = Vec::new();
    for entry in fs::read_dir(root).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        let metadata_path = path.join("nova-instance.json");
        if !metadata_path.is_file() { continue; }
        let metadata: serde_json::Value = serde_json::from_slice(&fs::read(metadata_path).map_err(|e| e.to_string())?)
            .map_err(|e| format!("Metadati istanza non validi: {e}"))?;
        result.push(serde_json::json!({
            "name": metadata["name"],
            "version": metadata["version"],
            "loader": metadata["loader"],
            "path": path.to_string_lossy().to_string()
        }));
    }
    result.sort_by(|a,b| a["name"].as_str().unwrap_or("").cmp(b["name"].as_str().unwrap_or("")));
    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_minecraft_mods_path,
            list_installed_mods,
            install_modrinth_project,
            check_modrinth_mod_updates,
            remove_installed_mod,
            ping_minecraft_server,
            detect_java_runtimes,
            list_minecraft_versions,
            install_vanilla_version,
            create_game_instance,
            list_instance_packs,
            install_instance_shader_support,
            install_modrinth_modpack,
            import_instance_pack,
            import_instance_pack_data,
            activate_instance_pack,
            install_game_profile,
            launch_offline_profile,
            install_java_runtime,
            list_game_instances,
            get_instance_profile_id,
            backup_game_instance,
            list_instance_backups,
            restore_game_instance_backup,
            read_instance_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running NOVA CLIENT");
}
