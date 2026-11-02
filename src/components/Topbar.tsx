import React from "react";
import { Settings2 } from "lucide-react";
import { NAV_ITEMS } from "./Sidebar";

interface TopbarProps {
  currentPage: string;
  onOpenSettings: () => void;
  playerName: string;
}

export const Topbar: React.FC<TopbarProps> = ({ currentPage, onOpenSettings, playerName }) => {
  const currentNav = NAV_ITEMS.find((n) => n.id === currentPage);

  return (
    <header className="topbar">
      <div className="breadcrumb">
        NOVA <span>/</span> {currentNav?.label ?? "Dashboard"}
      </div>
      <div className="top-actions">
        <span className="status-pill">
          <i /> Client pronto
        </span>
        <button
          className="icon-btn"
          title="Impostazioni"
          onClick={onOpenSettings}
        >
          <Settings2 size={18} />
        </button>
        <div className="avatar small">{playerName.charAt(0).toUpperCase() || "N"}</div>
      </div>
    </header>
  );
};
