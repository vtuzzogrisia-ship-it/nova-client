import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleHelp } from "lucide-react";
import { Mod, NovaProfile } from "./types";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Dashboard } from "./components/Dashboard";
import { LauncherTools } from "./components/LauncherTools";
import { ModLibrary } from "./components/ModLibrary";
import { ModManagerPage } from "./components/ModManager";
import { ProfileManager } from "./components/ProfileManager";
import { FriendsChat } from "./components/FriendsChat";
import { ServerManager } from "./components/ServerManager";
import { SettingsPage } from "./components/SettingsPage";
import { ModMenuOverlay } from "./components/ModMenuOverlay";

const initialMods: Mod[] = [
  {
    id: "fps",
    name: "Contatore FPS",
    category: "HUD",
    description: "Visualizza gli FPS correnti in tempo reale con badge dedicato.",
    enabled: true,
    status: "HUD in-game Fabric 1.21.4 (Tasto F6)",
  },
  {
    id: "cps",
    name: "Contatore CPS",
    category: "HUD",
    description: "Calcola i click al secondo per tasto sinistro e destro con finestra mobile.",
    enabled: true,
    status: "HUD in-game Fabric 1.21.4 (Tasto F7)",
  },
  {
    id: "keystrokes",
    name: "Keystrokes WASD",
    category: "HUD",
    description: "Visualizza a schermo i tasti W, A, S, D, Spazio, LMB e RMB premuti.",
    enabled: true,
    status: "HUD in-game Fabric 1.21.4 (Tasto F8)",
  },
  {
    id: "coords",
    name: "Coordinate XYZ",
    category: "HUD",
    description: "Mostra posizione X, Y, Z del giocatore in tempo reale.",
    enabled: true,
    status: "HUD in-game Fabric 1.21.4 (Tasto F9)",
  },
  {
    id: "sprint",
    name: "Toggle Sprint",
    category: "Gameplay",
    description: "Mantiene lo sprint attivo automaticamente durante il movimento.",
    enabled: true,
    status: "HUD in-game Fabric 1.21.4 (Tasto F10)",
  },
  {
    id: "sodium",
    name: "Sodium",
    category: "Performance",
    description: "Motore di rendering ottimizzato per massimizzare gli FPS.",
    enabled: true,
    status: "Mod installabile dalla Libreria o con Supporto Shader",
  },
  {
    id: "lithium",
    name: "Lithium",
    category: "Performance",
    description: "Ottimizza la fisica e la logica interna del mondo Minecraft.",
    enabled: true,
    status: "Mod installabile dalla Libreria",
  },
  {
    id: "ferrite",
    name: "FerriteCore",
    category: "Performance",
    description: "Riduce drasticamente l'utilizzo di memoria RAM da parte del gioco.",
    enabled: true,
    status: "Mod installabile dalla Libreria",
  },
  {
    id: "entity",
    name: "Entity Culling",
    category: "Performance",
    description: "Evita di calcolare e renderizzare entità nascoste dietro ai muri.",
    enabled: false,
    status: "Mod installabile dalla Libreria",
  },
];

export function App() {
  const [page, setPage] = useState("home");
  const [mods, setMods] = useState<Mod[]>(() => {
    try {
      const saved = localStorage.getItem("nova.mods");
      const values = saved ? (JSON.parse(saved) as Record<string, boolean>) : {};
      return initialMods.map((mod) => ({ ...mod, enabled: values[mod.id] ?? mod.enabled }));
    } catch {
      return initialMods;
    }
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(() => {
    try {
      return localStorage.getItem("nova.version") || "1.21.4";
    } catch {
      return "1.21.4";
    }
  });
  const [ram, setRam] = useState(() => {
    try {
      const value = Number(localStorage.getItem("nova.ram"));
      return [2, 4, 6, 8, 12, 16, 24, 32].includes(value) ? value : 4;
    } catch {
      return 4;
    }
  });

  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem("nova.playerName") || "Player";
    } catch {
      return "Player";
    }
  });

  const [notice, setNotice] = useState("Benvenuto in NOVA CLIENT");
  const [showNotice, setShowNotice] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      localStorage.setItem("nova.mods", JSON.stringify(Object.fromEntries(mods.map((mod) => [mod.id, mod.enabled]))));
    } catch {}
  }, [mods]);

  useEffect(() => {
    try {
      localStorage.setItem("nova.version", version);
    } catch {}
  }, [version]);

  useEffect(() => {
    try {
      localStorage.setItem("nova.ram", String(ram));
    } catch {}
  }, [ram]);

  useEffect(() => {
    const handleStorage = () => {
      setPlayerName(localStorage.getItem("nova.playerName") || "Player");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "ShiftRight" && !event.repeat) {
        event.preventDefault();
        setMenuOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleMods = useMemo(
    () =>
      mods.filter(
        (mod) =>
          (filter === "All" || mod.category === filter) &&
          (mod.name.toLowerCase().includes(search.toLowerCase()) ||
            mod.description.toLowerCase().includes(search.toLowerCase()))
      ),
    [mods, filter, search]
  );

  const toggleMod = (id: string) =>
    setMods((items) => items.map((mod) => (mod.id === id ? { ...mod, enabled: !mod.enabled } : mod)));

  const toast = (message: string) => {
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current);
    setNotice(message);
    setShowNotice(true);
    toastTimer.current = window.setTimeout(() => {
      setShowNotice(false);
      toastTimer.current = undefined;
    }, 2800);
  };

  useEffect(() => () => {
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current);
  }, []);

  const handleActivateProfile = (profile: NovaProfile) => {
    setVersion(profile.version);
    setRam(profile.ram);
    localStorage.setItem("nova.preferredLoader", profile.loader);
    toast(`Profilo "${profile.name}" applicato: MC ${profile.version}, ${profile.loader.toUpperCase()}, ${profile.ram} GB RAM.`);
    setPage("launcher");
  };

  const activeModsCount = mods.filter((m) => m.enabled).length;

  return (
    <div className="app-shell">
      <Sidebar
        currentPage={page}
        onPageChange={setPage}
        activeModsCount={activeModsCount}
        playerName={playerName}
      />

      <main className="main-area">
        <Topbar
          currentPage={page}
          onOpenSettings={() => setPage("settings")}
          playerName={playerName}
        />

        <div className="page-content">
          {page === "home" && (
            <Dashboard
              version={version}
              setVersion={setVersion}
              ram={ram}
              setRam={setRam}
              mods={mods}
              onOpenLauncher={() => setPage("launcher")}
              onOpenMods={() => setPage("mods")}
              onOpenMenu={() => setMenuOpen(true)}
            />
          )}

          <div style={{ display: page === "launcher" ? "block" : "none" }}>
            <LauncherTools ram={ram} version={version} />
          </div>

          {page === "library" && <ModLibrary />}

          {page === "mods" && (
            <ModManagerPage
              mods={visibleMods}
              filter={filter}
              setFilter={setFilter}
              search={search}
              setSearch={setSearch}
              toggleMod={toggleMod}
            />
          )}

          {page === "profiles" && (
            <ProfileManager
              defaultVersion={version}
              defaultRam={ram}
              onActivate={handleActivateProfile}
            />
          )}

          <div style={{ display: page === "friends" ? "block" : "none" }}>
            <FriendsChat />
          </div>

          {page === "servers" && <ServerManager />}

          {page === "settings" && (
            <SettingsPage
              ram={ram}
              setRam={setRam}
              version={version}
              setVersion={setVersion}
            />
          )}
        </div>

        <footer className="footer">
          <span>© 2026 NOVA CLIENT · Minecraft Java Launcher & In-Game HUD</span>
          <span>
            <i /> READY FOR WINDOWS 10/11 x64
          </span>
        </footer>
      </main>

      <AnimatePresence>
        {menuOpen && (
          <ModMenuOverlay
            mods={visibleMods}
            filter={filter}
            setFilter={setFilter}
            search={search}
            setSearch={setSearch}
            toggleMod={toggleMod}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotice && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <CircleHelp size={17} />
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
