import React from "react";
import { Sparkles, Zap, Play, ChevronDown, Layers3, Cpu, ShieldCheck, Menu } from "lucide-react";
import { Mod } from "../types";

interface DashboardProps {
  version: string;
  setVersion: (version: string) => void;
  ram: number;
  setRam: (ram: number) => void;
  mods: Mod[];
  onOpenLauncher: () => void;
  onOpenMods: () => void;
  onOpenMenu: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  version,
  setVersion,
  ram,
  setRam,
  mods,
  onOpenLauncher,
  onOpenMods,
  onOpenMenu,
}) => {
  const activeModsCount = mods.filter((m) => m.enabled).length;

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <Sparkles size={13} /> THE NEXT GENERATION CLIENT
          </div>
          <h1>
            Il tuo Minecraft.<br />
            <em>Le tue regole.</em>
          </h1>
          <p className="muted">
            Launcher desktop autonomo ad alte prestazioni. Istanze isolate, mod loader multipli e HUD in-game personalizzabile.
          </p>
        </div>
        <div className="hero-orb">
          <div className="orb-core">
            <Zap size={38} />
          </div>
          <div className="orb-ring ring-one" />
          <div className="orb-ring ring-two" />
        </div>
      </section>

      <section className="launch-card">
        <div className="launch-info">
          <div className="eyebrow">AVVIO RAPIDO</div>
          <h2>Pronto a giocare?</h2>
          <p>Configura la versione Minecraft e la memoria prima di scendere in campo.</p>
          <div className="launch-controls">
            <label className="select-wrap">
              <span>VERSIONE</span>
              <select value={version} onChange={(e) => setVersion(e.target.value)}>
                <option value="1.21.4">1.21.4 (Consigliata · HUD attivo)</option>
                <option value="1.21.1">1.21.1</option>
                <option value="1.20.1">1.20.1</option>
                <option value="1.19.4">1.19.4</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <label className="select-wrap">
              <span>RAM ALLOCATA</span>
              <select value={ram} onChange={(e) => setRam(Number(e.target.value))}>
                {[2, 4, 6, 8, 12, 16, 24, 32].map((n) => (
                  <option key={n} value={n}>
                    {n} GB
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
          <button className="primary-btn" onClick={onOpenLauncher}>
            <Play size={16} fill="currentColor" /> Vai al Launcher <span>→</span>
          </button>
        </div>
        <div className="launch-art">
          <div className="cube">
            <div className="cube-top" />
            <div className="cube-front" />
            <div className="cube-side" />
          </div>
          <div className="art-caption">
            MINECRAFT JAVA <span>PROFILO · {version}</span>
          </div>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <div className="eyebrow">IL TUO SETUP</div>
          <h2>Stato del client</h2>
        </div>
        <button className="text-btn" onClick={onOpenMods}>
          Personalizza mod <span>→</span>
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <Layers3 size={18} />
          </div>
          <span>MOD & MODULI ATTIVI</span>
          <strong>{activeModsCount}</strong>
          <small>Preferenze sincronizzate localmente</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <Cpu size={18} />
          </div>
          <span>MEMORIA ALLOCATA</span>
          <strong>
            {ram} <small>GB</small>
          </strong>
          <small>Impostazione memoria Java</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <ShieldCheck size={18} />
          </div>
          <span>SISTEMA NOVA</span>
          <strong className="state-text">Attivo</strong>
          <small>Avvio offline autonomo pronto</small>
        </div>
      </div>

      <div className="hint-bar">
        <div className="hint-icon">
          <Menu size={18} />
        </div>
        <div>
          <strong>Apri il menu HUD NOVA in gioco o qui</strong>
          <p>
            Premi <kbd>RIGHT SHIFT</kbd> in qualsiasi momento per aprire il menu mod interattivo NOVA e configurare FPS, CPS, tasti e colori.
          </p>
        </div>
        <button onClick={onOpenMenu}>
          Apri menu <span>→</span>
        </button>
      </div>
    </>
  );
};
