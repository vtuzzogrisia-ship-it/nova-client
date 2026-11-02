import React from "react";
import { Search, Zap, Monitor, Gamepad2, ShieldCheck } from "lucide-react";
import { Mod } from "../types";

interface ModPanelProps {
  mods: Mod[];
  filter: string;
  setFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  toggleMod: (id: string) => void;
  compact?: boolean;
}

export const ModPanel: React.FC<ModPanelProps> = ({
  mods,
  filter,
  setFilter,
  search,
  setSearch,
  toggleMod,
  compact = false,
}) => {
  return (
    <div className={compact ? "mod-panel compact" : "mod-panel"}>
      <div className="mod-toolbar">
        <div className="filter-tabs">
          {["All", "Performance", "HUD", "Gameplay"].map((f) => (
            <button
              key={f}
              className={filter === f ? "filter active" : "filter"}
              onClick={() => setFilter(f)}
            >
              {f === "All" ? "Tutte" : f}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtra moduli..."
          />
        </label>
      </div>

      <div className="mod-list">
        {mods.map((mod) => (
          <div className="mod-row" key={mod.id}>
            <div className="mod-symbol">
              {mod.category === "Performance" ? (
                <Zap size={17} />
              ) : mod.category === "HUD" ? (
                <Monitor size={17} />
              ) : (
                <Gamepad2 size={17} />
              )}
            </div>
            <div className="mod-copy">
              <strong>{mod.name}</strong>
              <p>{mod.description}</p>
              <small className="mod-status-label">{mod.status}</small>
            </div>
            <div className="mod-state">
              <span className={mod.enabled ? "enabled-label" : "disabled-label"}>
                {mod.enabled ? "ATTIVO" : "DISATTIVO"}
              </span>
              <button
                className={mod.enabled ? "toggle on" : "toggle"}
                aria-label={mod.enabled ? "Disattiva " + mod.name : "Attiva " + mod.name}
                aria-pressed={mod.enabled}
                onClick={() => toggleMod(mod.id)}
              >
                <span />
              </button>
            </div>
          </div>
        ))}
        {mods.length === 0 && <div className="empty-state">Nessun modulo corrisponde alla ricerca.</div>}
      </div>

      <div className="mod-panel-note">
        <ShieldCheck size={14} /> I moduli HUD sono sincronizzati con la mod Fabric in-game. Puoi configurarli dal vivo premendo <kbd>RIGHT SHIFT</kbd> durante una partita a Minecraft!
      </div>
    </div>
  );
};

interface ModManagerPageProps {
  mods: Mod[];
  filter: string;
  setFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  toggleMod: (id: string) => void;
}

export const ModManagerPage: React.FC<ModManagerPageProps> = (props) => {
  return (
    <>
      <div className="page-title">
        <div className="eyebrow">CUSTOMIZE YOUR GAME</div>
        <h1>
          Mod <em>Manager</em>
        </h1>
        <p>
          Configura e personalizza i moduli HUD in-game (FPS, CPS, Keystrokes, Coordinate, Toggle Sprint) e le ottimizzazioni grafiche.
        </p>
      </div>
      <ModPanel {...props} />
    </>
  );
};
