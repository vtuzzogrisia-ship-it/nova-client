import React, { useState, useEffect } from "react";
import { ShieldCheck, Plus, Trash2, Check } from "lucide-react";
import { NovaProfile } from "../types";

interface ProfileManagerProps {
  defaultVersion: string;
  defaultRam: number;
  onActivate: (profile: NovaProfile) => void;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  defaultVersion,
  defaultRam,
  onActivate,
}) => {
  const [profiles, setProfiles] = useState<NovaProfile[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("nova.profiles") || "[]");
    } catch {
      return [];
    }
  });

  const [name, setName] = useState("");
  const [profileVersion, setProfileVersion] = useState(defaultVersion);
  const [loader, setLoader] = useState("fabric");
  const [profileRam, setProfileRam] = useState(defaultRam);

  useEffect(() => {
    try {
      localStorage.setItem("nova.profiles", JSON.stringify(profiles));
    } catch {}
  }, [profiles]);

  const addProfile = () => {
    const clean = name.trim();
    if (!clean) return;
    setProfiles((items) => [
      ...items,
      {
        id: Date.now().toString(),
        name: clean,
        version: profileVersion,
        loader,
        ram: profileRam,
      },
    ]);
    setName("");
  };

  const removeProfile = (id: string) => {
    setProfiles((items) => items.filter((x) => x.id !== id));
  };

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">CONFIGURAZIONI DI GIOCO</div>
        <h1>
          I tuoi <em>profili</em>
        </h1>
        <p>
          Crea e salva impostazioni rapide per versione Minecraft, mod loader e quantità di RAM allocata.
        </p>
      </div>

      <section className="library-panel">
        <div className="library-filters">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome profilo (es. PvP Competitivo, Vanilla 1.21)"
          />
          <select value={profileVersion} onChange={(e) => setProfileVersion(e.target.value)}>
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
            <option value="vanilla">Vanilla</option>
          </select>
          <select value={profileRam} onChange={(e) => setProfileRam(Number(e.target.value))}>
            {[2, 4, 6, 8, 12, 16, 24, 32].map((n) => (
              <option key={n} value={n}>
                {n} GB RAM
              </option>
            ))}
          </select>
          <button className="primary-btn" onClick={addProfile} disabled={!name.trim()}>
            <Plus size={15} /> Crea profilo
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="library-message">
            Nessun profilo salvato. Usa i campi sopra per creare una configurazione personalizzata.
          </div>
        ) : (
          <div className="installed-list">
            <strong>Profili salvati ({profiles.length})</strong>
            {profiles.map((profile) => (
              <div className="installed-row" key={profile.id}>
                <span>
                  <strong>{profile.name}</strong>
                  <small>
                    Minecraft {profile.version} · {profile.loader.toUpperCase()} · {profile.ram} GB RAM
                  </small>
                </span>
                <div className="catalog-actions">
                  <button className="text-btn highlight-btn" onClick={() => onActivate(profile)}>
                    <Check size={13} /> Applica profilo
                  </button>
                  <button className="text-btn danger-hover" onClick={() => removeProfile(profile.id)}>
                    <Trash2 size={13} /> Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mod-panel-note">
          <ShieldCheck size={14} /> Quando applichi un profilo, la versione, il mod loader e la RAM vengono sincronizzati istantaneamente con il Launcher.
        </div>
      </section>
    </>
  );
};
