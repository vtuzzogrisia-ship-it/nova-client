import React from "react";
import { Sparkles, Gauge, Download, Layers3, Box, Users, Globe2, Settings2 } from "lucide-react";
import { NavItem } from "../types";

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Dashboard", icon: Gauge },
  { id: "launcher", label: "Launcher", icon: Download },
  { id: "mods", label: "Mod Manager", icon: Layers3 },
  { id: "library", label: "Libreria mod", icon: Download },
  { id: "profiles", label: "Profili", icon: Box },
  { id: "friends", label: "Amici e chat", icon: Users },
  { id: "servers", label: "Server", icon: Globe2 },
  { id: "settings", label: "Impostazioni", icon: Settings2 }
];

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  activeModsCount: number;
  playerName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  activeModsCount,
  playerName
}) => {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Sparkles size={21} />
        </div>
        <div>
          <strong>NOVA</strong>
          <span>CLIENT</span>
        </div>
      </div>

      <div className="profile-card">
        <div className="avatar">{playerName.charAt(0).toUpperCase() || "N"}</div>
        <div className="profile-copy">
          <strong>{playerName}</strong>
          <span>Account locale offline</span>
        </div>
        <span className="online-dot" title="Client pronto" />
      </div>

      <div className="nav-label">WORKSPACE</div>
      <nav>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={isActive ? "nav-item active" : "nav-item"}
              onClick={() => onPageChange(item.id)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {item.id === "mods" && activeModsCount > 0 && (
                <span className="nav-count">{activeModsCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="upgrade-card">
          <Sparkles size={17} />
          <strong>NOVA Desktop Edition</strong>
          <p>Launcher ad alte prestazioni per Windows 10/11 con HUD in-game integrato.</p>
        </div>
        <div className="version-label">
          NOVA CLIENT <span>v0.1.0 · Release</span>
        </div>
      </div>
    </aside>
  );
};
