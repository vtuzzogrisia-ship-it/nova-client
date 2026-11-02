import React, { useState } from "react";
import { ShieldCheck, Trash2, CheckCircle2 } from "lucide-react";

interface SettingsPageProps {
  ram: number;
  setRam: (v: number) => void;
  version: string;
  setVersion: (v: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  ram,
  setRam,
  version,
  setVersion,
}) => {
  const [confirm, setConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  const clearAllData = () => {
    try {
      localStorage.removeItem("nova.mods");
      localStorage.removeItem("nova.profiles");
      localStorage.removeItem("nova.servers");
      localStorage.removeItem("nova.version");
      localStorage.removeItem("nova.ram");
      localStorage.removeItem("nova.activeInstance");
      localStorage.removeItem("nova.playerName");
      localStorage.removeItem("nova.socialHost");
      sessionStorage.removeItem("nova.curseforgeKey");
    } catch {}
    setConfirm(false);
    setCleared(true);
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">PREFERENZE GENERALI</div>
        <h1>
          Impostazioni <em>NOVA</em>
        </h1>
        <p>Configura i valori predefiniti del launcher e gestisci la memoria persistente del client.</p>
      </div>

      <section className="library-panel">
        <div className="library-filters">
          <label className="settings-field">
            Versione Minecraft predefinita
            <select value={version} onChange={(e) => setVersion(e.target.value)}>
              <option value="1.21.4">1.21.4 (Consigliata · HUD)</option>
              <option value="1.21.1">1.21.1</option>
              <option value="1.20.1">1.20.1</option>
              <option value="1.19.4">1.19.4</option>
            </select>
          </label>
          <label className="settings-field">
            RAM predefinita allocata
            <select value={ram} onChange={(e) => setRam(Number(e.target.value))}>
              {[2, 4, 6, 8, 12, 16, 24, 32].map((n) => (
                <option key={n} value={n}>
                  {n} GB RAM
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mod-panel-note">
          <ShieldCheck size={14} /> La versione e la RAM predefinite vengono usate come configurazione iniziale per la dashboard rapida e le nuove istanze. Le istanze e i relativi file sul disco restano isolati.
        </div>

        <div className="installed-list">
          <strong>Archiviazione e Dati Locali</strong>
          <p>
            Puoi cancellare le preferenze mod, i profili rapidi, i server salvati e la cache locale di NOVA. I file delle istanze Minecraft sul disco non verranno eliminati.
          </p>
          {cleared ? (
            <div className="library-message success">
              <CheckCircle2 size={16} /> Dati cancellati con successo. Riavvio in corso…
            </div>
          ) : confirm ? (
            <div className="catalog-actions danger-zone">
              <span>Sei sicuro di voler ripristinare le preferenze ai valori iniziali?</span>
              <button className="primary-btn danger-btn" onClick={clearAllData}>
                <Trash2 size={13} /> Sì, cancella tutto
              </button>
              <button className="text-btn" onClick={() => setConfirm(false)}>
                Annulla
              </button>
            </div>
          ) : (
            <button className="text-btn danger-hover" onClick={() => setConfirm(true)}>
              <Trash2 size={13} /> Cancella dati locali e preferenze
            </button>
          )}
        </div>
      </section>
    </>
  );
};
