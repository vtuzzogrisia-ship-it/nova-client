import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Play, RotateCcw, Wrench, CheckCircle2, AlertTriangle, ShieldCheck, Download, Trash2, RefreshCw } from "lucide-react";
import { JavaRuntime, MinecraftVersionEntry, GameInstanceEntry } from "../types";

interface LauncherToolsProps {
  ram: number;
  version: string;
}

export const LauncherTools: React.FC<LauncherToolsProps> = ({ ram, version }) => {
  const [java, setJava] = useState<JavaRuntime[]>([]);
  const [javaExecutable, setJavaExecutable] = useState("auto");
  const [versions, setVersions] = useState<MinecraftVersionEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState(version);
  const [installedVersionId, setInstalledVersionId] = useState("");
  const [username, setUsername] = useState(() => localStorage.getItem("nova.playerName") || "Player");
  const [instanceName, setInstanceName] = useState("NOVA");
  const [loader, setLoader] = useState(() => localStorage.getItem("nova.preferredLoader") || "fabric");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [instancePath, setInstancePath] = useState("");
  const [instances, setInstances] = useState<GameInstanceEntry[]>([]);
  const [packs, setPacks] = useState<string[]>([]);
  const [packKind, setPackKind] = useState("resourcepacks");
  const [backups, setBackups] = useState<string[]>([]);
  const [selectedBackup, setSelectedBackup] = useState("");
  const [gameLog, setGameLog] = useState("");
  const [verifyReport, setVerifyReport] = useState<{ verifiedCount: number; corruptedFiles: string[] } | null>(null);

  useEffect(() => {
    setSelectedVersion(version);
  }, [version]);

  useEffect(() => {
    localStorage.setItem("nova.preferredLoader", loader);
  }, [loader]);

  useEffect(() => {
    localStorage.setItem("nova.playerName", username);
  }, [username]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<{
      pid: number;
      code?: number | null;
      success: boolean;
      error?: string;
      logTail?: string;
    }>("nova-game-exited", ({ payload }) => {
      if (payload.success) {
        setMessage("Minecraft si è chiuso normalmente.");
      } else {
        setMessage(
          `Minecraft si è chiuso con un errore${
            payload.code !== undefined && payload.code !== null ? ` (codice ${payload.code})` : ""
          }.${payload.error ? ` Dettagli: ${payload.error}` : ""}`
        );
      }
      setGameLog(payload.logTail || "Nessun dettaglio aggiuntivo nel log.");
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((error) => setMessage("Monitor Minecraft: " + String(error)));

    return () => {
      unlisten?.();
    };
  }, []);

  const refresh = async () => {
    setBusy(true);
    setMessage("");
    try {
      const [runtime, manifest, instanceList] = await Promise.all([
        invoke<JavaRuntime[]>("detect_java_runtimes"),
        invoke<{ versions?: MinecraftVersionEntry[] }>("list_minecraft_versions"),
        invoke<GameInstanceEntry[]>("list_game_instances"),
      ]);
      setJava(runtime);
      setInstances(instanceList);

      const active = localStorage.getItem("nova.activeInstance");
      if (active && instanceList.some((item) => item.path === active)) {
        const current = instanceList.find((item) => item.path === active)!;
        setInstancePath(active);
        setSelectedVersion(current.version);
        setLoader(current.loader);
        const profile = await invoke<string | null>("get_instance_profile_id", {
          instancePath: active,
        });
        setInstalledVersionId(profile || "");
        await loadBackups(active);
      }
      const all = manifest.versions || [];
      setVersions(all);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const installJava = async (major: number) => {
    setBusy(true);
    setMessage(`Download e configurazione Java ${major} (Adoptium Temurin) in corso…`);
    try {
      const path = await invoke<string>("install_java_runtime", { major });
      setJavaExecutable("auto");
      setJava((current) => [
        ...current.filter((x) => x.executable !== path),
        { available: true, executable: path, version: "Temurin Java " + major, major },
      ]);
      setMessage(`Java ${major} installato e configurato con successo: ${path}`);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const installProfile = async () => {
    if (!instancePath) {
      setMessage("Seleziona o crea prima un'istanza indipendente.");
      return;
    }
    setBusy(true);
    setMessage("Download di client Minecraft, librerie, natives, asset e loader in corso…");
    try {
      const id = await invoke<string>("install_game_profile", {
        gameVersion: selectedVersion,
        loader,
        loaderVersion: null,
        javaExecutable: javaExecutable === "auto" ? null : javaExecutable,
        instancePath,
      });
      setInstalledVersionId(id);
      setMessage(`Installazione completata: profilo ${id} pronto con tutte le dipendenze verificate.`);
    } catch (e) {
      setMessage("Errore durante l'installazione: " + String(e));
    } finally {
      setBusy(false);
    }
  };

  const repairInstance = async () => {
    if (!instancePath) {
      setMessage("Seleziona un'istanza da riparare.");
      return;
    }
    if (!window.confirm("Confermi la riparazione dell'istanza? Verranno riscaricati i file mancanti o danneggiati e verificate le librerie del profilo.")) {
      return;
    }
    setBusy(true);
    setMessage("Riparazione istanza e verifica file in corso…");
    try {
      const res = await invoke<string>("repair_game_instance", { instancePath });
      setMessage(res);
      const profile = await invoke<string | null>("get_instance_profile_id", { instancePath });
      setInstalledVersionId(profile || "");
    } catch (e) {
      setMessage("Riparazione non riuscita: " + String(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyFiles = async () => {
    if (!instancePath) return;
    setBusy(true);
    setMessage("Verifica integrità file e mod dell'istanza…");
    try {
      const res = await invoke<{ verifiedCount: number; corruptedFiles: string[] }>("verify_instance_files", {
        instancePath,
      });
      setVerifyReport(res);
      if (res.corruptedFiles.length === 0) {
        setMessage(`Integrità verificata: tutti i ${res.verifiedCount} file mod sono intatti e conformi.`);
      } else {
        setMessage(`Attenzione: rilevati ${res.corruptedFiles.length} file corrotti o non validi.`);
      }
    } catch (e) {
      setMessage("Verifica fallita: " + String(e));
    } finally {
      setBusy(false);
    }
  };

  const launch = async () => {
    if (!instancePath || !installedVersionId) {
      setMessage("Crea un'istanza e installa il profilo prima di avviare.");
      return;
    }
    setBusy(true);
    setGameLog("");
    setMessage("Avvio effettivo di Minecraft in corso…");
    try {
      const pid = await invoke<number>("launch_offline_profile", {
        versionId: installedVersionId,
        instancePath,
        username,
        ramGb: ram,
        javaExecutable: javaExecutable === "auto" ? null : javaExecutable,
      });
      setMessage(`Minecraft avviato con successo (PID ${pid}). Buona partita!`);
    } catch (e) {
      setMessage(String(e));
      try {
        setGameLog(await invoke<string>("read_instance_log", { instancePath }));
      } catch (logError) {
        setGameLog("Impossibile leggere il log: " + String(logError));
      }
    } finally {
      setBusy(false);
    }
  };

  const createInstance = async () => {
    if (!instanceName.trim()) {
      setMessage("Inserisci un nome valido per l'istanza.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const path = await invoke<string>("create_game_instance", {
        name: instanceName.trim(),
        version: selectedVersion,
        loader,
      });
      setInstancePath(path);
      localStorage.setItem("nova.activeInstance", path);
      setInstalledVersionId("");
      await loadBackups(path);
      setMessage(`Istanza "${instanceName}" creata con successo in: ${path}`);
      setInstances(await invoke<GameInstanceEntry[]>("list_game_instances"));
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const loadPacks = async (kind = packKind) => {
    if (!instancePath) return;
    setPackKind(kind);
    try {
      setPacks(await invoke<string[]>("list_instance_packs", { instancePath, kind }));
    } catch (e) {
      setMessage(String(e));
    }
  };

  const importPack = async (file?: File) => {
    if (!file || !instancePath) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Lettura file non riuscita"));
        reader.readAsDataURL(file);
      });
      const filename = await invoke<string>("import_instance_pack_data", {
        instancePath,
        kind: packKind,
        filename: file.name,
        dataBase64: data,
      });
      setMessage("Pacchetto importato: " + filename);
      await loadPacks(packKind);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const installShaderSupport = async () => {
    if (!instancePath) return;
    setBusy(true);
    setMessage("Download e installazione di Iris + Sodium da Modrinth in corso…");
    try {
      const files = await invoke<string[]>("install_instance_shader_support", { instancePath });
      setMessage("Supporto shader installato con successo: " + files.join(", "));
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const installModpack = async (file?: File) => {
    if (!file || !instancePath) return;
    if (!file.name.toLowerCase().endsWith(".mrpack")) {
      setMessage("Seleziona un archivio modpack Modrinth (.mrpack)");
      return;
    }
    setBusy(true);
    setMessage("Estrazione e installazione modpack in corso…");
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Lettura modpack fallita"));
        reader.readAsDataURL(file);
      });
      const installed = await invoke<string[]>("install_modrinth_modpack", {
        instancePath,
        filename: file.name,
        dataBase64: data,
      });
      setMessage(`Modpack installato con successo: ${installed.length} file e cartelle importati.`);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const loadBackups = async (path = instancePath) => {
    if (!path) return;
    try {
      const found = await invoke<string[]>("list_instance_backups", { instancePath: path });
      setBackups(found);
      setSelectedBackup(found[0] || "");
    } catch (e) {
      setMessage(String(e));
    }
  };

  const createBackup = async () => {
    if (!instancePath) return;
    if (!window.confirm("Assicurati che Minecraft sia chiuso per evitare file corrotti. Procedere con il backup?")) return;
    setBusy(true);
    try {
      const path = await invoke<string>("backup_game_instance", { instancePath });
      setMessage("Backup creato in: " + path);
      await loadBackups();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (!instancePath || !selectedBackup) return;
    if (!window.confirm("Attenzione: il ripristino sostituirà lo stato attuale dell'istanza con questo backup. Continuare?")) return;
    setBusy(true);
    try {
      await invoke("restore_game_instance_backup", { instancePath, backupPath: selectedBackup });
      setMessage("Backup ripristinato con successo.");
      await loadPacks(packKind);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const loadGameLog = async () => {
    if (!instancePath) return;
    try {
      setGameLog(await invoke<string>("read_instance_log", { instancePath }));
    } catch (e) {
      setMessage(String(e));
    }
  };

  const clearLog = async () => {
    if (!instancePath) return;
    try {
      await invoke("clear_instance_log", { instancePath });
      setGameLog("");
      setMessage("Log di gioco svuotato.");
    } catch (e) {
      setMessage(String(e));
    }
  };

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">MINECRAFT RUNTIME</div>
        <h1>
          Launcher <em>NOVA</em>
        </h1>
        <p>
          Gestione runtime Java, installazione versioni ufficiali, istanze completamente isolate e avvio effettivo del gioco.
        </p>
      </div>

      <section className="library-panel">
        {/* RUNTIME JAVA */}
        <div className="installed-list">
          <div className="section-subtitle">
            <strong>Runtime Java nel sistema</strong>
            <button className="text-btn" onClick={() => void refresh()} disabled={busy}>
              <RefreshCw size={12} /> Aggiorna rilevamento
            </button>
          </div>
          {java.length === 0 ? (
            <p>Ricerca runtime Java in corso…</p>
          ) : (
            java.map((item, i) => (
              <div className="installed-row" key={i}>
                <span>
                  <strong>{item.available ? item.version : "Java non configurato"}</strong>
                  <small>{item.executable || item.error}</small>
                </span>
                <span>{item.major ? `Java ${item.major}` : ""}</span>
              </div>
            ))
          )}
          <div className="catalog-actions">
            <button className="text-btn" onClick={() => void installJava(8)} disabled={busy}>
              <Download size={13} /> Installa Java 8 (1.0–1.16)
            </button>
            <button className="text-btn" onClick={() => void installJava(16)} disabled={busy}>
              <Download size={13} /> Installa Java 16 (1.17)
            </button>
            <button className="text-btn" onClick={() => void installJava(17)} disabled={busy}>
              <Download size={13} /> Installa Java 17 (1.18–1.20.4)
            </button>
            <button className="text-btn" onClick={() => void installJava(21)} disabled={busy}>
              <Download size={13} /> Installa Java 21 (1.20.5+)
            </button>
            <button className="text-btn" onClick={() => void installJava(25)} disabled={busy}>
              <Download size={13} /> Installa Java 25
            </button>
          </div>
          <label className="settings-field">
            Runtime selezionato per l'avvio
            <select value={javaExecutable} onChange={(e) => setJavaExecutable(e.target.value)}>
              <option value="auto">Automatico (in base alla versione Minecraft)</option>
              {java
                .filter((x) => x.available && x.executable)
                .map((x) => (
                  <option key={x.executable} value={x.executable}>
                    {x.version} · {x.executable}
                  </option>
                ))}
            </select>
          </label>
        </div>

        {/* VERSIONI MINECRAFT */}
        <div className="installed-list">
          <strong>Versioni Minecraft ufficiali</strong>
          <div className="library-filters">
            <select
              value={selectedVersion}
              onChange={(e) => {
                setSelectedVersion(e.target.value);
                setInstalledVersionId("");
              }}
            >
              {versions
                .filter((v) => v.type === "release")
                .slice(0, 100)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    Minecraft {v.id}
                  </option>
                ))}
            </select>
            <button
              className="primary-btn"
              disabled={busy || versions.length === 0 || !instancePath}
              onClick={() => void installProfile()}
            >
              <Download size={15} /> {busy ? "Installazione in corso…" : "Installa profilo completo"}
            </button>
          </div>
          <p className="hint-text">
            L'installazione scarica dal manifest ufficiale client jar, librerie native, asset e configura il mod loader selezionato.
          </p>
        </div>

        {/* ISTANZE INDIPENDENTI */}
        <div className="installed-list">
          <strong>Istanze indipendenti</strong>
          <div className="library-filters">
            <input
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Nome nuova istanza (es. NOVA 1.21)"
            />
            <select
              value={loader}
              onChange={(e) => {
                setLoader(e.target.value);
                setInstalledVersionId("");
              }}
            >
              <option value="fabric">Fabric (Consigliato per NOVA HUD)</option>
              <option value="quilt">Quilt</option>
              <option value="neoforge">NeoForge</option>
              <option value="forge">Forge</option>
              <option value="vanilla">Vanilla (Nessun loader)</option>
            </select>
            <button className="primary-btn" disabled={busy} onClick={() => void createInstance()}>
              Crea istanza
            </button>
          </div>

          <label className="settings-field">
            Istanza attiva
            <select
              value={instancePath}
              onChange={(e) => {
                const path = e.target.value;
                setInstancePath(path);
                setInstalledVersionId("");
                localStorage.setItem("nova.activeInstance", path);
                const current = instances.find((item) => item.path === path);
                if (current) {
                  setSelectedVersion(current.version);
                  setLoader(current.loader);
                }
                if (path) {
                  void invoke<string | null>("get_instance_profile_id", { instancePath: path })
                    .then((id) => setInstalledVersionId(id || ""))
                    .catch((err) => setMessage(String(err)));
                  void loadBackups(path);
                }
              }}
            >
              <option value="">Seleziona un'istanza…</option>
              {instances.map((item) => (
                <option key={item.path} value={item.path}>
                  {item.name} · MC {item.version} · {item.loader.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          {instancePath && (
            <div className="instance-info-badge">
              <span>Cartella: <code>{instancePath}</code></span>
              {installedVersionId ? (
                <span className="badge-ok">
                  <CheckCircle2 size={13} /> Profilo: {installedVersionId}
                </span>
              ) : (
                <span className="badge-warn">
                  <AlertTriangle size={13} /> Profilo non ancora installato
                </span>
              )}
            </div>
          )}

          {/* AVVIO DI GIOCO */}
          <div className="launch-section-box">
            <div className="library-filters">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nome giocatore (es. Steve)"
                maxLength={16}
              />
              <button
                className="primary-btn launch-action-btn"
                disabled={busy || !installedVersionId || !instancePath}
                onClick={() => void launch()}
              >
                <Play size={16} fill="currentColor" /> Avvia Minecraft offline
              </button>
            </div>
            <div className="instance-tools-bar">
              <button
                className="text-btn"
                disabled={!instancePath || busy}
                onClick={() => void repairInstance()}
                title="Riparazione file e librerie danneggiate"
              >
                <Wrench size={13} /> Ripara / Reinstalla installazione
              </button>
              <button
                className="text-btn"
                disabled={!instancePath || busy}
                onClick={() => void verifyFiles()}
                title="Verifica integrità file"
              >
                <ShieldCheck size={13} /> Verifica integrità file
              </button>
            </div>
          </div>

          {verifyReport && (
            <div className="verify-report-box">
              <p>
                <strong>Verifica completata:</strong> {verifyReport.verifiedCount} file JAR validi.
                {verifyReport.corruptedFiles.length > 0 && (
                  <span className="corrupted-alert">
                    File danneggiati o non validi: {verifyReport.corruptedFiles.join(", ")}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* PACCHETTI RISORSE E SHADER */}
          <div className="installed-list sub-list">
            <strong>Resource pack e Shader</strong>
            <div className="catalog-actions">
              <button className="text-btn" onClick={() => void loadPacks("resourcepacks")} disabled={!instancePath}>
                Vedi Resource pack
              </button>
              <button className="text-btn" onClick={() => void loadPacks("shaderpacks")} disabled={!instancePath}>
                Vedi Shader
              </button>
              <button
                className="text-btn highlight-btn"
                onClick={() => void installShaderSupport()}
                disabled={!instancePath || (loader !== "fabric" && loader !== "quilt" && loader !== "neoforge") || busy}
              >
                Installa Iris + Sodium (Supporto shader)
              </button>
            </div>
            {packs.map((pack) => (
              <div className="installed-row" key={pack}>
                <span>{pack}</span>
                <div>
                  <button
                    className="text-btn"
                    onClick={() =>
                      void invoke("activate_instance_pack", {
                        instancePath,
                        kind: packKind,
                        filename: pack,
                        enabled: true,
                      })
                        .then(() => setMessage("Pacchetto attivato: " + pack))
                        .catch((e) => setMessage(String(e)))
                    }
                  >
                    Attiva
                  </button>
                  <button
                    className="text-btn"
                    onClick={() =>
                      void invoke("activate_instance_pack", {
                        instancePath,
                        kind: packKind,
                        filename: pack,
                        enabled: false,
                      })
                        .then(() => setMessage("Pacchetto disattivato: " + pack))
                        .catch((e) => setMessage(String(e)))
                    }
                  >
                    Disattiva
                  </button>
                </div>
              </div>
            ))}
            <div className="import-row">
              <label className="text-btn upload-btn">
                Importa pack (.zip)
                <input
                  type="file"
                  accept=".zip,application/zip"
                  disabled={!instancePath || busy}
                  onChange={(e) => {
                    void importPack(e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <label className="text-btn upload-btn">
                Installa modpack Modrinth (.mrpack)
                <input
                  type="file"
                  accept=".mrpack"
                  disabled={!instancePath || busy}
                  onChange={(e) => {
                    void installModpack(e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {/* BACKUP E RIPRISTINO */}
          <div className="installed-list sub-list">
            <strong>Backup e Ripristino istanza</strong>
            <div className="catalog-actions">
              <button className="text-btn" disabled={!instancePath || busy} onClick={() => void createBackup()}>
                Crea nuovo backup istanza
              </button>
              <button className="text-btn" disabled={!instancePath} onClick={() => void loadBackups()}>
                Aggiorna elenco
              </button>
            </div>
            <div className="library-filters">
              <select value={selectedBackup} onChange={(e) => setSelectedBackup(e.target.value)}>
                <option value="">Nessun backup selezionato</option>
                {backups.map((path) => (
                  <option key={path} value={path}>
                    {path.split(/[\\/]/).pop()}
                  </option>
                ))}
              </select>
              <button
                className="text-btn"
                disabled={!selectedBackup || busy}
                onClick={() => void restoreBackup()}
              >
                <RotateCcw size={13} /> Ripristina backup
              </button>
            </div>
          </div>

          {/* LOG DI GIOCO */}
          <div className="installed-list sub-list">
            <div className="section-subtitle">
              <strong>Log e diagnostica Minecraft</strong>
              <div className="catalog-actions">
                <button className="text-btn" disabled={!instancePath} onClick={() => void loadGameLog()}>
                  Ricarica log
                </button>
                <button className="text-btn" disabled={!instancePath} onClick={() => void clearLog()}>
                  <Trash2 size={12} /> Svuota log
                </button>
              </div>
            </div>
            {gameLog ? (
              <pre className="game-log">{gameLog}</pre>
            ) : (
              <p className="hint-text">Nessun log disponibile o gioco non ancora avviato.</p>
            )}
          </div>
        </div>

        {message && <div className="library-message">{message}</div>}
      </section>
    </>
  );
};
