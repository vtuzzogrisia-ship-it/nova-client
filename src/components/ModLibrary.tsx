import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ExternalLink, Layers3, ShieldCheck, Download, Trash2, RefreshCw } from "lucide-react";
import { CatalogItem, ModUpdate, GameInstanceEntry } from "../types";

export const ModLibrary: React.FC = () => {
  const [source, setSource] = useState<"modrinth" | "curseforge">("modrinth");
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState("1.21.4");
  const [loader, setLoader] = useState("fabric");
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("nova.curseforgeKey") || "");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<string[]>([]);
  const [modsPath, setModsPath] = useState("");
  const [success, setSuccess] = useState("");
  const [updates, setUpdates] = useState<ModUpdate[]>([]);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  useEffect(() => {
    const active = localStorage.getItem("nova.activeInstance");
    if (!active) {
      setModsPath("");
      setInstalled([]);
      return;
    }
    void invoke<string>("get_minecraft_mods_path", { instancePath: active })
      .then(setModsPath)
      .catch(() => {});
    void invoke<string[]>("list_installed_mods", { instancePath: active })
      .then(setInstalled)
      .catch(() => {});
    void invoke<GameInstanceEntry[]>("list_game_instances")
      .then((list) => {
        const instance = list.find((item) => item.path === active);
        if (instance) {
          setVersion(instance.version);
          setLoader(instance.loader);
        }
      })
      .catch(() => {});
  }, []);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    sessionStorage.setItem("nova.curseforgeKey", val);
  };

  const installProject = async (item: CatalogItem) => {
    const active = localStorage.getItem("nova.activeInstance");
    if (!active) {
      setError("Seleziona prima un'istanza nella sezione Launcher.");
      return;
    }
    setInstalling(String(item.id));
    setError("");
    setSuccess("");
    try {
      if (item.source === "Modrinth") {
        const filenames = await invoke<string[]>("install_modrinth_project", {
          projectId: String(item.id),
          gameVersion: version,
          loader,
          instancePath: active,
        });
        setInstalled((current) => Array.from(new Set([...current, ...filenames])));
        setSuccess(`Installate ${filenames.length} mod (incluse dipendenze obbligatorie): ${filenames.join(", ")}`);
      } else {
        const file = await invoke<string>("install_curseforge_mod", {
          modId: Number(item.id),
          fileId: null,
          gameVersion: version,
          loader,
          instancePath: active,
          apiKey: apiKey.trim(),
        });
        setInstalled((current) => Array.from(new Set([...current, file])));
        setSuccess(`Mod CurseForge installata con successo: ${file}`);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(null);
    }
  };

  const checkUpdates = async () => {
    const active = localStorage.getItem("nova.activeInstance");
    if (!active) {
      setError("Seleziona prima un'istanza nella sezione Launcher.");
      return;
    }
    setCheckingUpdates(true);
    setError("");
    setSuccess("");
    try {
      const found = await invoke<ModUpdate[]>("check_modrinth_mod_updates", {
        instancePath: active,
        gameVersion: version,
        loader,
      });
      setUpdates(found);
      setSuccess(
        found.length
          ? `${found.length} aggiornamenti disponibili per le mod tracciate.`
          : "Tutte le mod installate sono già aggiornate alla versione più recente."
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setCheckingUpdates(false);
    }
  };

  const updateSingleMod = async (projectId: string) => {
    const active = localStorage.getItem("nova.activeInstance");
    if (!active) return;
    setInstalling(projectId);
    setError("");
    try {
      const files = await invoke<string[]>("install_modrinth_project", {
        projectId,
        gameVersion: version,
        loader,
        instancePath: active,
      });
      setInstalled((current) => Array.from(new Set([...current, ...files])));
      setUpdates((current) => current.filter((item) => item.projectId !== projectId));
      setSuccess("Mod aggiornata con successo: " + files.join(", "));
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(null);
    }
  };

  const updateAllMods = async () => {
    const active = localStorage.getItem("nova.activeInstance");
    if (!active) return;
    setCheckingUpdates(true);
    setError("");
    try {
      const updated = await invoke<string[]>("update_all_modrinth_mods", {
        instancePath: active,
        gameVersion: version,
        loader,
      });
      setInstalled((current) => Array.from(new Set([...current, ...updated])));
      setUpdates([]);
      setSuccess(`Aggiornamento batch completato: ${updated.length} mod aggiornate.`);
    } catch (e) {
      setError(String(e));
    } finally {
      setCheckingUpdates(false);
    }
  };

  const searchMods = async () => {
    setLoading(true);
    setError("");
    setItems([]);
    try {
      if (source === "modrinth") {
        const facets = JSON.stringify([
          ["project_type:mod"],
          ["versions:" + version],
          ["categories:" + loader],
        ]);
        const url =
          "https://api.modrinth.com/v2/search?query=" +
          encodeURIComponent(query) +
          "&facets=" +
          encodeURIComponent(facets) +
          "&limit=24&index=relevance";
        const response = await fetch(url);
        if (!response.ok) throw new Error("Errore API Modrinth: " + response.status);
        const data = await response.json();
        setItems(
          (data.hits || []).map((x: any) => ({
            id: x.project_id,
            name: x.title,
            summary: x.description,
            icon: x.icon_url,
            url: "https://modrinth.com/mod/" + (x.slug || x.project_id),
            downloads: x.downloads,
            source: "Modrinth",
          }))
        );
      } else {
        if (!apiKey.trim()) {
          throw new Error("Inserisci la tua API Key CurseForge per esplorare e scaricare mod dal catalogo.");
        }
        const loaderCode =
          loader === "fabric" ? "4" : loader === "forge" ? "1" : loader === "neoforge" ? "6" : loader === "quilt" ? "5" : "0";
        const params = new URLSearchParams({
          gameId: "432",
          classId: "6",
          searchFilter: query,
          gameVersion: version,
          modLoaderType: loaderCode,
          pageSize: "24",
          sortField: "6",
          sortOrder: "desc",
        });
        const response = await fetch("https://api.curseforge.com/v1/mods/search?" + params, {
          headers: {
            Accept: "application/json",
            "x-api-key": apiKey.trim(),
          },
        });
        if (!response.ok) {
          throw new Error(
            response.status === 403
              ? "API key CurseForge non valida o non autorizzata."
              : "Errore CurseForge: " + response.status
          );
        }
        const data = await response.json();
        setItems(
          (data.data || []).map((x: any) => ({
            id: x.id,
            name: x.name,
            summary: x.summary,
            icon: x.logo?.url,
            url: x.links?.websiteUrl || "https://www.curseforge.com/minecraft/mc-mods/" + x.slug,
            downloads: x.downloadCount,
            source: "CurseForge",
          }))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore durante la ricerca.");
    } finally {
      setLoading(false);
    }
  };

  const removeMod = async (file: string) => {
    const active = localStorage.getItem("nova.activeInstance");
    try {
      await invoke("remove_installed_mod", {
        filename: file,
        instancePath: active,
      });
      setInstalled((current) => current.filter((x) => x !== file));
      if (active) {
        setInstalled(await invoke<string[]>("list_installed_mods", { instancePath: active }));
      }
      setSuccess(`Mod "${file}" rimossa.`);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">CATALOGO & MODPACK</div>
        <h1>
          Libreria <em>mod</em>
        </h1>
        <p>Cerca progetti nei cataloghi ufficiali Modrinth e CurseForge, con risoluzione dipendenze e aggiornamento automatico.</p>
      </div>

      <section className="library-panel">
        <div className="library-sources">
          <button
            className={source === "modrinth" ? "source-tab active" : "source-tab"}
            onClick={() => {
              setSource("modrinth");
              setItems([]);
              setError("");
            }}
          >
            Modrinth
          </button>
          <button
            className={source === "curseforge" ? "source-tab active" : "source-tab"}
            onClick={() => {
              setSource("curseforge");
              setItems([]);
              setError("");
            }}
          >
            CurseForge
          </button>
        </div>

        <div className="library-filters">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void searchMods();
            }}
            placeholder="Cerca una mod (es. Sodium, Iris, JEI)..."
          />
          <select value={version} onChange={(e) => setVersion(e.target.value)}>
            <option value="1.21.4">1.21.4</option>
            <option value="1.21.1">1.21.1</option>
            <option value="1.20.1">1.20.1</option>
            <option value="1.19.4">1.19.4</option>
          </select>
          <select value={loader} onChange={(e) => setLoader(e.target.value)}>
            <option value="fabric">Fabric</option>
            <option value="quilt">Quilt</option>
            <option value="neoforge">NeoForge</option>
            <option value="forge">Forge</option>
          </select>
          <button className="primary-btn" disabled={loading} onClick={() => void searchMods()}>
            {loading ? "Ricerca..." : "Cerca"}
          </button>
          <button
            className="text-btn"
            disabled={checkingUpdates || source !== "modrinth"}
            onClick={() => void checkUpdates()}
          >
            <RefreshCw size={13} /> {checkingUpdates ? "Controllo…" : "Controlla aggiornamenti"}
          </button>
        </div>

        {source === "curseforge" && (
          <div className="api-key-row">
            <label>
              CurseForge API Key:{" "}
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Incolla qui la tua API Key CurseForge"
              />
            </label>
            <span>Necessaria per cercare e scaricare mod da CurseForge. Viene mantenuta solo durante la sessione.</span>
          </div>
        )}

        {updates.length > 0 && (
          <div className="installed-list updates-banner">
            <div className="section-subtitle">
              <strong>Aggiornamenti disponibili ({updates.length})</strong>
              <button className="primary-btn small-btn" disabled={checkingUpdates} onClick={() => void updateAllMods()}>
                Aggiorna tutte le mod
              </button>
            </div>
            {updates.map((update) => (
              <div className="installed-row" key={update.projectId}>
                <span>
                  <strong>{update.projectId}</strong>
                  <small>
                    {update.currentFile} → <b>{update.latestFile}</b>
                  </small>
                </span>
                <button
                  className="text-btn"
                  disabled={installing === update.projectId}
                  onClick={() => void updateSingleMod(update.projectId)}
                >
                  {installing === update.projectId ? "Aggiornamento…" : "Aggiorna"}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <div className="library-message error">{error}</div>}
        {success && <div className="library-message success">{success}</div>}
        {loading && <div className="library-message">Ricerca nel catalogo in corso…</div>}
        {!items.length && !loading && !error && (
          <div className="library-message">Scrivi il nome di una mod e premi Cerca per esplorare il catalogo.</div>
        )}

        {items.length > 0 && (
          <div className="catalog-grid">
            {items.map((item) => (
              <article className="catalog-card" key={`${item.source}-${item.id}`}>
                {item.icon ? (
                  <img src={item.icon} alt={item.name} />
                ) : (
                  <div className="catalog-placeholder">
                    <Layers3 />
                  </div>
                )}
                <div className="catalog-copy">
                  <strong>{item.name}</strong>
                  <p>{item.summary}</p>
                  <small>
                    {item.downloads ? item.downloads.toLocaleString("it-IT") : "—"} download · {item.source}
                  </small>
                  <div className="catalog-actions">
                    <a href={item.url} target="_blank" rel="noreferrer">
                      Scheda <ExternalLink size={12} />
                    </a>
                    <button
                      className="primary-btn small-btn"
                      disabled={installing !== null}
                      onClick={() => void installProject(item)}
                    >
                      <Download size={13} />{" "}
                      {installing === String(item.id) ? "Download…" : "Installa"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mod-panel-note">
          <ShieldCheck size={14} /> Installazione diretta verificata nella cartella mods dell'istanza selezionata, con dipendenze automatiche.
        </div>
        {modsPath && <div className="mod-panel-note">Cartella mods attiva: {modsPath}</div>}

        {installed.length > 0 && (
          <div className="installed-list">
            <strong>Mod installate nell'istanza ({installed.length})</strong>
            {installed.map((file) => (
              <div className="installed-row" key={file}>
                <span>{file}</span>
                <button className="text-btn danger-hover" onClick={() => void removeMod(file)}>
                  <Trash2 size={13} /> Rimuovi
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};
