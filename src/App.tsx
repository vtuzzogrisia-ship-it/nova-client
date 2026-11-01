import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, Box, ChevronDown, CircleHelp, Cpu,
  Gamepad2, Gauge, Globe2, Layers3, Menu, Monitor,
  Package, Palette, Play, Search, Settings2, ShieldCheck, Sparkles,
  Users, X, Zap
} from "lucide-react";

type Mod = { id: string; name: string; category: string; description: string; enabled: boolean; status: string };
const initialMods: Mod[] = [
  { id: "sodium", name: "Sodium", category: "Performance", description: "Rendering engine ottimizzato per aumentare gli FPS.", enabled: true, status: "Pronto per l'integrazione" },
  { id: "lithium", name: "Lithium", category: "Performance", description: "Ottimizza la logica interna del gioco e il tick.", enabled: true, status: "Pronto per l'integrazione" },
  { id: "ferrite", name: "FerriteCore", category: "Performance", description: "Riduce l'utilizzo della memoria.", enabled: true, status: "Pronto per l'integrazione" },
  { id: "entity", name: "Entity Culling", category: "Performance", description: "Evita il rendering delle entità non visibili.", enabled: false, status: "Pronto per l'integrazione" },
  { id: "cps", name: "CPS Counter", category: "HUD", description: "Contatore click al secondo.", enabled: true, status: "Anteprima UI · HUD in-game non ancora collegato" },
  { id: "keystrokes", name: "Keystrokes", category: "HUD", description: "Mostra i tasti WASD e i click del mouse.", enabled: true, status: "Anteprima UI · HUD in-game non ancora collegato" },
  { id: "fps", name: "FPS Display", category: "HUD", description: "Visualizza gli FPS sullo schermo.", enabled: true, status: "Anteprima UI · HUD in-game non ancora collegato" },
  { id: "coords", name: "Coordinates", category: "HUD", description: "Coordinate e direzione del giocatore.", enabled: false, status: "Anteprima UI · HUD in-game non ancora collegato" },
  { id: "sprint", name: "Toggle Sprint", category: "Gameplay", description: "Commutazione sprint configurabile.", enabled: false, status: "Richiede mod Fabric in-game" }
];

const nav = [
  { id: "home", label: "Dashboard", icon: Gauge },
  { id: "mods", label: "Mod Manager", icon: Layers3 },
  { id: "profiles", label: "Profili", icon: Box },
  { id: "servers", label: "Server", icon: Globe2 },
  { id: "settings", label: "Impostazioni", icon: Settings2 }
];

function App() {
  const [page, setPage] = useState("home");
  const [mods, setMods] = useState<Mod[]>(() => { try { const saved = localStorage.getItem("nova.mods"); const values = saved ? JSON.parse(saved) as Record<string, boolean> : {}; return initialMods.map(mod => ({ ...mod, enabled: values[mod.id] ?? mod.enabled })); } catch { return initialMods; } });
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(() => { try { return localStorage.getItem("nova.version") || "1.21.4"; } catch { return "1.21.4"; } });
  const [ram, setRam] = useState(() => { try { const value = Number(localStorage.getItem("nova.ram")); return [2,4,6,8,12,16].includes(value) ? value : 4; } catch { return 4; } });
  const [notice, setNotice] = useState("Benvenuto in NOVA CLIENT");
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("nova.mods", JSON.stringify(Object.fromEntries(mods.map(mod => [mod.id, mod.enabled])))); } catch { /* storage may be unavailable */ }
  }, [mods]);

  useEffect(() => {
    try { localStorage.setItem("nova.version", version); } catch { /* storage may be unavailable */ }
  }, [version]);

  useEffect(() => {
    try { localStorage.setItem("nova.ram", String(ram)); } catch { /* storage may be unavailable */ }
  }, [ram]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "ShiftRight" && !event.repeat) {
        event.preventDefault();
        setMenuOpen(value => !value);
      }
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleMods = useMemo(() => mods.filter(mod =>
    (filter === "All" || mod.category === filter) &&
    (mod.name.toLowerCase().includes(search.toLowerCase()) || mod.description.toLowerCase().includes(search.toLowerCase()))
  ), [mods, filter, search]);

  const toggleMod = (id: string) => setMods(items => items.map(mod => mod.id === id ? { ...mod, enabled: !mod.enabled } : mod));
  const toast = (message: string) => { setNotice(message); setShowNotice(true); window.setTimeout(() => setShowNotice(false), 2600); };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={21}/></div><div><strong>NOVA</strong><span>CLIENT</span></div></div>
      <div className="profile-card"><div className="avatar">N</div><div className="profile-copy"><strong>Guest Player</strong><span>Account locale</span></div><span className="online-dot"/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.id} className={page === item.id ? "nav-item active" : "nav-item"} onClick={() => setPage(item.id)}><item.icon size={17}/><span>{item.label}</span>{item.id === "mods" && <span className="nav-count">{mods.filter(m => m.enabled).length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><Sparkles size={17}/><strong>NOVA is evolving</strong><p>Nuove funzioni arriveranno con i prossimi aggiornamenti.</p></div><div className="version-label">NOVA CLIENT <span>v0.1.0 · Preview</span></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">NOVA <span>/</span> {nav.find(n => n.id === page)?.label ?? "Dashboard"}</div><div className="top-actions"><span className="status-pill"><i/> Client offline</span><button className="icon-btn" title="Impostazioni" onClick={() => setPage("settings")}><Settings2 size={18}/></button><div className="avatar small">N</div></div></header>
      <div className="page-content">
        {page === "home" && <><section className="welcome-row"><div><div className="eyebrow"><Sparkles size={13}/> THE NEXT GENERATION CLIENT</div><h1>Il tuo Minecraft.<br/><em>Le tue regole.</em></h1><p className="muted">Tutto ciò che ti serve per personalizzare la tua esperienza.</p></div><div className="hero-orb"><div className="orb-core"><Zap size={38}/></div><div className="orb-ring ring-one"/><div className="orb-ring ring-two"/></div></section>
          <section className="launch-card"><div className="launch-info"><div className="eyebrow">QUICK LAUNCH</div><h2>Pronto a giocare?</h2><p>Configura il profilo e prepara la tua prossima sessione.</p><div className="launch-controls"><label className="select-wrap"><span>VERSIONE</span><select value={version} onChange={e => setVersion(e.target.value)}><option>1.21.4</option><option>1.21.1</option><option>1.20.1</option><option>1.19.4</option></select><ChevronDown size={14}/></label><label className="select-wrap"><span>RAM ALLOCATA</span><select value={ram} onChange={e => setRam(Number(e.target.value))}>{[2,4,6,8,12,16].map(n => <option key={n} value={n}>{n} GB</option>)}</select><ChevronDown size={14}/></label></div><button className="primary-btn" onClick={() => toast("Il launcher Minecraft non è ancora collegato: installazione in sviluppo.")}><Play size={16} fill="currentColor"/> Avvia NOVA <span>→</span></button></div><div className="launch-art"><div className="cube"><div className="cube-top"/><div className="cube-front"/><div className="cube-side"/></div><div className="art-caption">MINECRAFT JAVA <span>PROFILE · {version}</span></div></div></section>
          <div className="section-heading"><div><div className="eyebrow">YOUR SETUP</div><h2>Il tuo spazio di gioco</h2></div><button className="text-btn" onClick={() => setPage("mods")}>Gestisci mod <span>→</span></button></div>
          <div className="stat-grid"><div className="stat-card"><div className="stat-icon purple"><Layers3 size={18}/></div><span>MOD ATTIVE</span><strong>{mods.filter(m => m.enabled).length}</strong><small>Preferenze salvate su questo dispositivo</small></div><div className="stat-card"><div className="stat-icon blue"><Cpu size={18}/></div><span>RAM ALLOCATA</span><strong>{ram} <small>GB</small></strong><small>Preferenza salvata localmente</small></div><div className="stat-card"><div className="stat-icon green"><ShieldCheck size={18}/></div><span>STATO CLIENT</span><strong className="state-text">Preview</strong><small>Launcher non collegato</small></div></div>
          <div className="hint-bar"><div className="hint-icon"><Menu size={18}/></div><div><strong>Apri il menu mod in un tocco</strong><p>Premi <kbd>RIGHT SHIFT</kbd> in questa finestra per aprire il menu rapido NOVA.</p></div><button onClick={() => setMenuOpen(true)}>Provalo <span>→</span></button></div>
        </>}
        {page === "mods" && <><div className="page-title"><div className="eyebrow">CUSTOMIZE YOUR GAME</div><h1>Mod <em>Manager</em></h1><p>Gestisci e salva le preferenze del tuo client. Le modifiche restano memorizzate su questo dispositivo.</p></div><ModPanel mods={visibleMods} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} toggleMod={toggleMod}/></>}
        {page === "profiles" && <Placeholder icon={<Package/>} title="Profili" text="I profili Minecraft con versioni, loader e directory separate arriveranno nel prossimo step."/>}
        {page === "servers" && <Placeholder icon={<Users/>} title="Server" text="Gestione server e preferiti: in sviluppo."/>}
        {page === "settings" && <Placeholder icon={<Palette/>} title="Impostazioni" text="Temi, account e preferenze globali saranno configurabili qui."/>}
      </div>
      <footer className="footer"><span>© 2026 NOVA CLIENT</span><span><i/> ALL SYSTEMS IN PREVIEW</span></footer>
    </main>

    <AnimatePresence>{menuOpen && <motion.div className="overlay-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e => { if (e.target === e.currentTarget) setMenuOpen(false); }}><motion.section className="mod-overlay" initial={{opacity:0, scale:.96, y:12}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:.97, y:8}} transition={{duration:.16}}><div className="overlay-head"><div className="brand mini"><div className="brand-mark"><Sparkles size={17}/></div><div><strong>NOVA</strong><span>MOD MENU</span></div></div><div className="overlay-head-right"><kbd>RIGHT SHIFT</kbd><button className="icon-btn" onClick={() => setMenuOpen(false)}><X size={18}/></button></div></div><div className="overlay-body"><div className="overlay-intro"><div><div className="eyebrow">YOUR CLIENT, YOUR WAY</div><h2>Mod <em>Menu</em></h2><p>Attiva o disattiva le funzionalità disponibili.</p></div><div className="overlay-badge"><Activity size={15}/> {mods.filter(m=>m.enabled).length} ACTIVE</div></div><ModPanel mods={visibleMods} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} toggleMod={toggleMod} compact/></div><div className="overlay-foot"><span><i/> NOVA CLIENT PREVIEW</span><span>ESC / RIGHT SHIFT PER CHIUDERE</span></div></motion.section></motion.div>}</AnimatePresence>
    <AnimatePresence>{showNotice && <motion.div className="toast" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}><CircleHelp size={17}/>{notice}</motion.div>}</AnimatePresence>
  </div>;
}

function ModPanel({mods, filter, setFilter, search, setSearch, toggleMod, compact=false}: {mods:Mod[];filter:string;setFilter:(v:string)=>void;search:string;setSearch:(v:string)=>void;toggleMod:(id:string)=>void;compact?:boolean}) {
  return <div className={compact ? "mod-panel compact" : "mod-panel"}><div className="mod-toolbar"><div className="filter-tabs">{["All","Performance","HUD","Gameplay"].map(f=><button key={f} className={filter===f?"filter active":"filter"} onClick={()=>setFilter(f)}>{f}</button>)}</div><label className="search-box"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca una mod..."/></label></div><div className="mod-list">{mods.map(mod=><div className="mod-row" key={mod.id}><div className="mod-symbol">{mod.category==="Performance"?<Zap size={17}/>:mod.category==="HUD"?<Monitor size={17}/>:<Gamepad2 size={17}/>}</div><div className="mod-copy"><strong>{mod.name}</strong><p>{mod.description}</p></div><div className="mod-state"><span className={mod.enabled?"enabled-label":"disabled-label"}>{mod.enabled?"ON":"OFF"}</span><button className={mod.enabled?"toggle on":"toggle"} aria-label={mod.enabled?"Disattiva "+mod.name:"Attiva "+mod.name} aria-pressed={mod.enabled} onClick={()=>toggleMod(mod.id)}><span/></button></div></div>)}{mods.length===0&&<div className="empty-state">Nessuna mod trovata.</div>}</div><div className="mod-panel-note"><ShieldCheck size={14}/> Le preferenze ON/OFF vengono salvate su questo dispositivo. Non installano ancora le mod nel gioco: il collegamento al launcher Minecraft è in sviluppo.</div></div>;
}

function Placeholder({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) {
  return <div className="placeholder"><div className="placeholder-icon">{icon}</div><div className="eyebrow">COMING IN A FUTURE BUILD</div><h1>{title}</h1><p>{text}</p><span className="coming-tag"><Sparkles size={13}/> IN DEVELOPMENT</span></div>;
}

export default App;
