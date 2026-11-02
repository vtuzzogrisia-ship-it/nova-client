import React from "react";
import { motion } from "framer-motion";
import { Sparkles, X, Activity } from "lucide-react";
import { Mod } from "../types";
import { ModPanel } from "./ModManager";

interface ModMenuOverlayProps {
  mods: Mod[];
  filter: string;
  setFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  toggleMod: (id: string) => void;
  onClose: () => void;
}

export const ModMenuOverlay: React.FC<ModMenuOverlayProps> = ({
  mods,
  filter,
  setFilter,
  search,
  setSearch,
  toggleMod,
  onClose,
}) => {
  const activeCount = mods.filter((m) => m.enabled).length;

  return (
    <motion.div
      className="overlay-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.section
        className="mod-overlay"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.16 }}
      >
        <div className="overlay-head">
          <div className="brand mini">
            <div className="brand-mark">
              <Sparkles size={17} />
            </div>
            <div>
              <strong>NOVA</strong>
              <span>MOD MENU</span>
            </div>
          </div>
          <div className="overlay-head-right">
            <kbd>RIGHT SHIFT</kbd>
            <button className="icon-btn" onClick={onClose} title="Chiudi menu (ESC)">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overlay-body">
          <div className="overlay-intro">
            <div>
              <div className="eyebrow">IL TUO CLIENT, A MODO TUO</div>
              <h2>
                Mod <em>Menu Rapido</em>
              </h2>
              <p>Attiva o disattiva le funzioni client e HUD al volo.</p>
            </div>
            <div className="overlay-badge">
              <Activity size={15} /> {activeCount} ATTIVI
            </div>
          </div>
          <ModPanel
            mods={mods}
            filter={filter}
            setFilter={setFilter}
            search={search}
            setSearch={setSearch}
            toggleMod={toggleMod}
            compact
          />
        </div>

        <div className="overlay-foot">
          <span>
            <i /> NOVA CLIENT RUNTIME
          </span>
          <span>PREMI ESC OPPURE RIGHT SHIFT PER CHIUDERE</span>
        </div>
      </motion.section>
    </motion.div>
  );
};
