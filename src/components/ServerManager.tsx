import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Copy, Trash2, ShieldCheck, Activity } from "lucide-react";
import { NovaServer, MinecraftServerStatus } from "../types";

export const ServerManager: React.FC = () => {
  const [servers, setServers] = useState<NovaServer[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("nova.servers") || "[]");
    } catch {
      return [];
    }
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [statuses, setStatuses] = useState<Record<string, MinecraftServerStatus | { error: string }>>({});
  const [checking, setChecking] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("nova.servers", JSON.stringify(servers));
    } catch {}
  }, [servers]);

  const pingServer = async (server: NovaServer) => {
    setChecking(server.id);
    setStatuses((current) => ({
      ...current,
      [server.id]: { error: "Ping del server in corso…" },
    }));
    try {
      const result = await invoke<MinecraftServerStatus>("ping_minecraft_server", {
        address: server.address,
      });
      setStatuses((current) => ({ ...current, [server.id]: result }));
    } catch (error) {
      setStatuses((current) => ({
        ...current,
        [server.id]: { error: String(error) },
      }));
    } finally {
      setChecking(null);
    }
  };

  const addServer = () => {
    const n = name.trim();
    const a = address.trim();
    if (!n || !a || (!a.includes(".") && !a.includes(":"))) return;
    const newServer: NovaServer = { id: Date.now().toString(), name: n, address: a };
    setServers((items) => [...items, newServer]);
    setName("");
    setAddress("");
    void pingServer(newServer);
  };

  const copyAddress = async (server: NovaServer) => {
    try {
      await navigator.clipboard.writeText(server.address);
      setCopiedId(server.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const removeServer = (id: string) => {
    setServers((items) => items.filter((x) => x.id !== id));
    setStatuses((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">MULTIPLAYER</div>
        <h1>
          Server <em>preferiti</em>
        </h1>
        <p>
          Salva i tuoi server Minecraft Java preferiti, esegui il ping live e monitora latenza, giocatori connessi e versione.
        </p>
      </div>

      <section className="library-panel">
        <div className="library-filters">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome del server (es. Hypixel)"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Indirizzo (es. mc.hypixel.net)"
          />
          <button className="primary-btn" onClick={addServer} disabled={!name.trim() || !address.trim()}>
            <Plus size={15} /> Aggiungi server
          </button>
        </div>

        {servers.length === 0 ? (
          <div className="library-message">
            Nessun server salvato. Aggiungi il tuo primo server usando i campi in alto.
          </div>
        ) : (
          <div className="installed-list">
            <strong>Server memorizzati ({servers.length})</strong>
            {servers.map((server) => {
              const status = statuses[server.id];
              return (
                <div className="installed-row server-entry" key={server.id}>
                  <span>
                    <strong>{server.name}</strong>
                    <small className="server-address-code">{server.address}</small>
                    {status && (
                      <div className="server-status-box">
                        {"error" in status ? (
                          <small className="server-error">{status.error}</small>
                        ) : (
                          <small className="server-good">
                            <span className="live-pulse" />
                            {status.latencyMs} ms · MC {status.version} · {status.playersOnline}/{status.playersMax} giocatori
                            {status.description ? ` · ${status.description}` : ""}
                          </small>
                        )}
                      </div>
                    )}
                  </span>
                  <div className="server-row-actions">
                    <button
                      className="text-btn"
                      disabled={checking === server.id}
                      onClick={() => void pingServer(server)}
                    >
                      <Activity size={13} /> {checking === server.id ? "Ping…" : "Ping"}
                    </button>
                    <button className="text-btn" onClick={() => void copyAddress(server)}>
                      <Copy size={13} /> {copiedId === server.id ? "Copiato!" : "Copia IP"}
                    </button>
                    <button className="text-btn danger-hover" onClick={() => removeServer(server.id)}>
                      <Trash2 size={13} /> Rimuovi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mod-panel-note">
          <ShieldCheck size={14} /> Ping effettuato tramite il protocollo Server List Ping (SLP) nativo di Minecraft Java Edition via TCP.
        </div>
      </section>
    </>
  );
};
