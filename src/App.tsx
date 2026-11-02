import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, Box, ChevronDown, CircleHelp, Cpu,
  Gamepad2, Gauge, Globe2, Layers3, Menu, Monitor,
  Play, Search, Settings2, ShieldCheck, Sparkles,
  X, Zap, Download, ExternalLink
} from "lucide-react";

type Mod = { id: string; name: string; category: string; description: string; enabled: boolean; status: string };
type CatalogItem = { id: string | number; name: string; summary: string; icon?: string; url: string; downloads?: number; source: string };
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
  { id: "launcher", label: "Launcher", icon: Download },
  { id: "mods", label: "Mod Manager", icon: Layers3 },
  { id: "library", label: "Libreria mod", icon: Download },
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
  const toastTimer = useRef<number | undefined>(undefined);

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
  const toast = (message: string) => { if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current); setNotice(message); setShowNotice(true); toastTimer.current = window.setTimeout(() => { setShowNotice(false); toastTimer.current = undefined; }, 2600); };
  useEffect(() => () => { if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current); }, []);

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
        {page === "launcher" && <LauncherTools ram={ram}/>}
        {page === "library" && <ModLibrary/>}
        {page === "mods" && <><div className="page-title"><div className="eyebrow">CUSTOMIZE YOUR GAME</div><h1>Mod <em>Manager</em></h1><p>Gestisci e salva le preferenze del tuo client. Le modifiche restano memorizzate su questo dispositivo.</p></div><ModPanel mods={visibleMods} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} toggleMod={toggleMod}/></>}
        {page === "profiles" && <ProfileManager defaultVersion={version} defaultRam={ram} onActivate={(profile) => { setVersion(profile.version); setRam(profile.ram); toast(`Profilo "${profile.name}" applicato alla configurazione rapida.`); setPage("home"); }}/>}
        {page === "servers" && <ServerManager/>}
        {page === "settings" && <SettingsPage ram={ram} setRam={setRam} version={version} setVersion={setVersion}/>}
      </div>
      <footer className="footer"><span>© 2026 NOVA CLIENT</span><span><i/> ALL SYSTEMS IN PREVIEW</span></footer>
    </main>

    <AnimatePresence>{menuOpen && <motion.div className="overlay-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e => { if (e.target === e.currentTarget) setMenuOpen(false); }}><motion.section className="mod-overlay" initial={{opacity:0, scale:.96, y:12}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:.97, y:8}} transition={{duration:.16}}><div className="overlay-head"><div className="brand mini"><div className="brand-mark"><Sparkles size={17}/></div><div><strong>NOVA</strong><span>MOD MENU</span></div></div><div className="overlay-head-right"><kbd>RIGHT SHIFT</kbd><button className="icon-btn" onClick={() => setMenuOpen(false)}><X size={18}/></button></div></div><div className="overlay-body"><div className="overlay-intro"><div><div className="eyebrow">YOUR CLIENT, YOUR WAY</div><h2>Mod <em>Menu</em></h2><p>Attiva o disattiva le funzionalità disponibili.</p></div><div className="overlay-badge"><Activity size={15}/> {mods.filter(m=>m.enabled).length} ACTIVE</div></div><ModPanel mods={visibleMods} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} toggleMod={toggleMod} compact/></div><div className="overlay-foot"><span><i/> NOVA CLIENT PREVIEW</span><span>ESC / RIGHT SHIFT PER CHIUDERE</span></div></motion.section></motion.div>}</AnimatePresence>
    <AnimatePresence>{showNotice && <motion.div className="toast" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}><CircleHelp size={17}/>{notice}</motion.div>}</AnimatePresence>
  </div>;
}



type JavaRuntime = {available:boolean; executable?:string; version?:string; major?:number; error?:string};
type MinecraftVersionEntry = {id:string;type:string;url:string};
function LauncherTools({ram}:{ram:number}) {
 const [java,setJava]=useState<JavaRuntime[]>([]);
 const [versions,setVersions]=useState<MinecraftVersionEntry[]>([]);
 const [selected,setSelected]=useState("1.21.4");
 const [installedVersionId,setInstalledVersionId]=useState("");
 const [username,setUsername]=useState("Player");
 const [instanceName,setInstanceName]=useState("NOVA");
 const [loader,setLoader]=useState("fabric");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [instancePath,setInstancePath]=useState("");
 const [packs,setPacks]=useState<string[]>([]);
 const [packKind,setPackKind]=useState("resourcepacks");
 const importPack=async(file?:File)=>{if(!file||!instancePath)return;setBusy(true);setMessage("");try{const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(new Error("Lettura file non riuscita"));reader.readAsDataURL(file);});const filename=await invoke<string>("import_instance_pack_data",{instancePath,kind:packKind,filename:file.name,dataBase64:data});setMessage("Pacchetto importato: "+filename);await loadPacks(packKind);}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 const refresh=async()=>{
  setBusy(true);setMessage("");
  try {
   const [runtime,manifest]=await Promise.all([invoke<JavaRuntime[]>("detect_java_runtimes"),invoke<any>("list_minecraft_versions")]);
   setJava(runtime);const all=(manifest.versions||[]) as MinecraftVersionEntry[];setVersions(all);
   if(all.some(v=>v.id==="1.21.4"))setSelected("1.21.4");
  } catch(e){setMessage(String(e));} finally{setBusy(false);}
 };
 useEffect(()=>{void refresh();},[]);
 const install=async()=>{
  setBusy(true);setMessage("Download dei metadati e del client Minecraft in corso…");
  try{const id=await invoke<string>("install_game_profile",{gameVersion:selected,loader,loaderVersion:null});setInstalledVersionId(id);setMessage("Installazione completata: "+id+" (librerie, asset e loader inclusi).");}
  catch(e){setMessage(String(e));}finally{setBusy(false);}
 };
 const launch=async()=>{if(!instancePath||!installedVersionId){setMessage("Crea un’istanza e installa il profilo prima di avviare.");return;}setBusy(true);try{const pid=await invoke<number>("launch_offline_profile",{versionId:installedVersionId,instancePath,username,ramGb:ram,javaExecutable:java.find(x=>x.available)?.executable||null});setMessage("Minecraft avviato (processo "+pid+"). Log: "+instancePath+"/nova-game.log");}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 const create=async()=>{
  setBusy(true);setMessage("");
  try{const path=await invoke<string>("create_game_instance",{name:instanceName,version:selected,loader});setInstancePath(path);localStorage.setItem("nova.activeInstance",path);setMessage("Istanza creata e selezionata: "+path);}
  catch(e){setMessage(String(e));}finally{setBusy(false);}
 };
 const loadPacks=async(kind=packKind)=>{
  if(!instancePath)return;
  setPackKind(kind);
  try{setPacks(await invoke<string[]>("list_instance_packs",{instancePath,kind}));}catch(e){setMessage(String(e));}
 };
 return <>
  <div className="page-title"><div className="eyebrow">MINECRAFT RUNTIME</div><h1>Launcher <em>NOVA</em></h1><p>Rilevamento Java, versioni ufficiali e cartelle istanza isolate. Il download iniziale prepara i metadati e il client jar verificato.</p></div>
  <section className="library-panel">
   <div className="installed-list"><strong>Runtime Java rilevati</strong>
    {java.length===0?<p>Ricerca Java in corso…</p>:java.map((item,i)=><div className="installed-row" key={i}><span><strong>{item.available?item.version:"Java non trovato"}</strong><small>{item.executable||item.error}</small></span><span>{item.major?"Java "+item.major:""}</span></div>)}
    <div className="catalog-actions"><button className="text-btn" onClick={()=>void refresh()} disabled={busy}>Rileva di nuovo</button></div>
   </div>
   <div className="installed-list"><strong>Versioni Minecraft ufficiali</strong>
    <div className="library-filters"><select value={selected} onChange={e=>setSelected(e.target.value)}>{versions.filter(v=>v.type==="release").slice(0,150).map(v=><option key={v.id} value={v.id}>{v.id}</option>)}</select><button className="primary-btn" disabled={busy||versions.length===0} onClick={()=>void install()}>{busy?"Attendere…":"Installa profilo completo"}</button></div>
    <p>L’installazione completa usa il resolver Minecraft per scaricare client, librerie, natives e asset, e prepara Fabric, Quilt, Forge o NeoForge quando selezionati.</p>
   </div>
   <div className="installed-list"><strong>Istanze indipendenti</strong>
    <div className="library-filters"><input value={instanceName} onChange={e=>setInstanceName(e.target.value)} placeholder="Nome istanza"/><select value={loader} onChange={e=>setLoader(e.target.value)}><option value="vanilla">Vanilla</option><option value="fabric">Fabric</option><option value="quilt">Quilt</option><option value="forge">Forge</option><option value="neoforge">NeoForge</option></select><button className="primary-btn" disabled={busy} onClick={()=>void create()}>Crea istanza</button></div>
    {instancePath&&<p>Cartella attiva: {instancePath}</p>}
    <div className="library-filters"><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Nome giocatore offline"/><button className="primary-btn" disabled={busy||!installedVersionId||!instancePath} onClick={()=>void launch()}>Avvia Minecraft offline</button></div>
    {installedVersionId&&<p>Profilo installato: {installedVersionId}</p>}
    <div className="catalog-actions"><button className="text-btn" onClick={()=>void loadPacks("resourcepacks")} disabled={!instancePath}>Resource pack</button><button className="text-btn" onClick={()=>void loadPacks("shaderpacks")} disabled={!instancePath}>Shader</button></div>
    {packs.map(pack=><p key={pack}>{pack}</p>)}
    <label className="text-btn">Importa ZIP <input type="file" accept=".zip,application/zip" disabled={!instancePath||busy} onChange={e=>{void importPack(e.target.files?.[0]);e.currentTarget.value="";}}/></label>
    <p>Ogni istanza ha directory separate. Il modulo HUD NOVA viene aggiunto automaticamente alle istanze Fabric e Quilt; Forge/NeoForge non caricano questo modulo. Il profilo loader deve essere installato prima dell’avvio.</p>
   </div>
   {message&&<div className="library-message">{message}</div>}
  </section>
 </>;
}

function ModLibrary() {
 const [source,setSource]=useState<"modrinth"|"curseforge">("modrinth");
 const [query,setQuery]=useState(""); const [version,setVersion]=useState("1.21.4"); const [loader,setLoader]=useState("fabric");
 const [apiKey,setApiKey]=useState("");
 const [items,setItems]=useState<CatalogItem[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
 const [installing,setInstalling]=useState<string|null>(null); const [installed,setInstalled]=useState<string[]>([]); const [modsPath,setModsPath]=useState(""); const [success,setSuccess]=useState("");
 useEffect(()=>{void invoke<string>("get_minecraft_mods_path",{instancePath:localStorage.getItem("nova.activeInstance")}).then(setModsPath).catch(()=>{});void invoke<string[]>("list_installed_mods",{instancePath:localStorage.getItem("nova.activeInstance")}).then(setInstalled).catch(()=>{});},[]);
 const installProject=async(item:CatalogItem)=>{if(source!=="modrinth")return;setInstalling(String(item.id));setError("");setSuccess("");try{const filenames=await invoke<string[]>("install_modrinth_project",{projectId:String(item.id),gameVersion:version,loader,instancePath:localStorage.getItem("nova.activeInstance")});setInstalled(current=>Array.from(new Set([...current,...filenames])));setSuccess("Installate "+filenames.length+" mod (incluse le dipendenze richieste): "+filenames.join(", "));}catch(e){setError(String(e));}finally{setInstalling(null);}};
 const searchMods=async()=>{
  setLoading(true);setError("");setItems([]);
  try {
   if(source==="modrinth"){
    const facets=JSON.stringify([["project_type:mod"],["versions:"+version],["categories:"+loader]]);
    const url="https://api.modrinth.com/v2/search?query="+encodeURIComponent(query)+"&facets="+encodeURIComponent(facets)+"&limit=24&index=relevance";
    const response=await fetch(url);if(!response.ok)throw new Error("Errore Modrinth: "+response.status);
    const data=await response.json();
    setItems((data.hits||[]).map((x:any)=>({id:x.project_id,name:x.title,summary:x.description,icon:x.icon_url,url:"https://modrinth.com/mod/"+(x.slug||x.project_id),downloads:x.downloads,source:"Modrinth"})));
   } else {
    if(!apiKey.trim())throw new Error("Inserisci la API key CurseForge per cercare nel catalogo.");
    
    const params=new URLSearchParams({gameId:"432",classId:"6",searchFilter:query,gameVersion:version,modLoaderType:loader==="fabric"?"4":loader==="forge"?"1":loader==="neoforge"?"6":loader==="quilt"?"5":"0",pageSize:"24",sortField:"6",sortOrder:"desc"});
    const response=await fetch("https://api.curseforge.com/v1/mods/search?"+params,{headers:{"Accept":"application/json","x-api-key":apiKey.trim()}});
    if(!response.ok)throw new Error(response.status===403?"API key CurseForge non valida o non autorizzata.":"Errore CurseForge: "+response.status);
    const data=await response.json();
    setItems((data.data||[]).map((x:any)=>({id:x.id,name:x.name,summary:x.summary,icon:x.logo?.url,url:x.links?.websiteUrl||"https://www.curseforge.com/minecraft/mc-mods/"+x.slug,downloads:x.downloadCount,source:"CurseForge"})));
   }
  }catch(e){setError(e instanceof Error?e.message:"Errore durante la ricerca.");}finally{setLoading(false);}
 };
 return <><div className="page-title"><div className="eyebrow">MODS & MODPACKS</div><h1>Libreria <em>mod</em></h1><p>Cerca progetti nei cataloghi ufficiali Modrinth e CurseForge.</p></div>
 <section className="library-panel"><div className="library-sources"><button className={source==="modrinth"?"source-tab active":"source-tab"} onClick={()=>{setSource("modrinth");setItems([]);setError("");}}>Modrinth</button><button className={source==="curseforge"?"source-tab active":"source-tab"} onClick={()=>{setSource("curseforge");setItems([]);setError("");}}>CurseForge</button></div>
 <div className="library-filters"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void searchMods();}} placeholder="Cerca una mod..."/><select value={version} onChange={e=>setVersion(e.target.value)}><option>1.21.4</option><option>1.21.1</option><option>1.20.1</option><option>1.19.4</option></select><select value={loader} onChange={e=>setLoader(e.target.value)}><option value="fabric">Fabric</option><option value="forge">Forge</option><option value="neoforge">NeoForge</option><option value="quilt">Quilt</option></select><button className="primary-btn" disabled={loading} onClick={()=>void searchMods()}>{loading?"Ricerca...":"Cerca"}</button></div>
 {source==="curseforge"&&<div className="api-key-row"><label>CurseForge API key <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Inserisci la tua API key"/></label><span>Usata solo per questa sessione; non viene salvata</span></div>}
 {error&&<div className="library-message error">{error}</div>}{success&&<div className="library-message success">{success}</div>}{loading&&<div className="library-message">Ricerca nel catalogo…</div>}
 {!items.length&&!loading&&!error&&<div className="library-message">Scrivi il nome di una mod e premi Cerca.</div>}
 {!!items.length&&<div className="catalog-grid">{items.map(item=><article className="catalog-card" key={item.source+"-"+item.id}>{item.icon?<img src={item.icon} alt=""/>:<div className="catalog-placeholder"><Layers3/></div>}<div className="catalog-copy"><strong>{item.name}</strong><p>{item.summary}</p><small>{item.downloads?.toLocaleString("it-IT")||"—"} download · {item.source}</small><div className="catalog-actions"><a href={item.url} target="_blank" rel="noreferrer">Apri progetto <ExternalLink size={12}/></a>{source==="modrinth"&&<button className="text-btn" disabled={installing!==null} onClick={()=>void installProject(item)}>{installing===String(item.id)?"Installazione…":"Installa"}</button>}</div></div></article>)}</div>}
 <div className="mod-panel-note"><ShieldCheck size={14}/> Download Modrinth diretto nella cartella mods di Minecraft. Verifica che il profilo avviato usi la stessa versione e lo stesso loader.</div>{modsPath&&<div className="mod-panel-note">Cartella mods: {modsPath}</div>}{installed.length>0&&<div className="installed-list"><strong>Mod installate rilevate ({installed.length})</strong>{installed.map(file=><div className="installed-row" key={file}><span>{file}</span><button className="text-btn" onClick={()=>void invoke("remove_installed_mod",{filename:file}).then(()=>setInstalled(current=>current.filter(x=>x!==file))).catch(e=>setError(String(e)))}>Rimuovi</button></div>)}</div>}</section></>;
}

function ModPanel({mods, filter, setFilter, search, setSearch, toggleMod, compact=false}: {mods:Mod[];filter:string;setFilter:(v:string)=>void;search:string;setSearch:(v:string)=>void;toggleMod:(id:string)=>void;compact?:boolean}) {
  return <div className={compact ? "mod-panel compact" : "mod-panel"}><div className="mod-toolbar"><div className="filter-tabs">{["All","Performance","HUD","Gameplay"].map(f=><button key={f} className={filter===f?"filter active":"filter"} onClick={()=>setFilter(f)}>{f}</button>)}</div><label className="search-box"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca una mod..."/></label></div><div className="mod-list">{mods.map(mod=><div className="mod-row" key={mod.id}><div className="mod-symbol">{mod.category==="Performance"?<Zap size={17}/>:mod.category==="HUD"?<Monitor size={17}/>:<Gamepad2 size={17}/>}</div><div className="mod-copy"><strong>{mod.name}</strong><p>{mod.description}</p></div><div className="mod-state"><span className={mod.enabled?"enabled-label":"disabled-label"}>{mod.enabled?"ON":"OFF"}</span><button className={mod.enabled?"toggle on":"toggle"} aria-label={mod.enabled?"Disattiva "+mod.name:"Attiva "+mod.name} aria-pressed={mod.enabled} onClick={()=>toggleMod(mod.id)}><span/></button></div></div>)}{mods.length===0&&<div className="empty-state">Nessuna mod trovata.</div>}</div><div className="mod-panel-note"><ShieldCheck size={14}/> Le preferenze ON/OFF vengono salvate su questo dispositivo. Non installano ancora le mod nel gioco: il collegamento al launcher Minecraft è in sviluppo.</div></div>;
}


type NovaProfile = { id: string; name: string; version: string; loader: string; ram: number };
function ProfileManager({defaultVersion,defaultRam,onActivate}:{defaultVersion:string;defaultRam:number;onActivate:(profile:NovaProfile)=>void}) {
 const [profiles,setProfiles]=useState<NovaProfile[]>(()=>{try{return JSON.parse(localStorage.getItem("nova.profiles")||"[]");}catch{return [];}});
 const [name,setName]=useState(""); const [profileVersion,setProfileVersion]=useState(defaultVersion); const [loader,setLoader]=useState("fabric"); const [profileRam,setProfileRam]=useState(defaultRam);
 useEffect(()=>{try{localStorage.setItem("nova.profiles",JSON.stringify(profiles));}catch{/* storage unavailable */}},[profiles]);
 const add=()=>{const clean=name.trim();if(!clean)return;setProfiles(items=>[...items,{id:Date.now().toString(),name:clean,version:profileVersion,loader,ram:profileRam}]);setName("");};
 return <><div className="page-title"><div className="eyebrow">GAME CONFIGURATIONS</div><h1>I tuoi <em>profili</em></h1><p>Crea configurazioni per versione, mod loader e memoria. Usa un profilo per applicare versione e RAM alla configurazione rapida.</p></div>
 <section className="library-panel"><div className="library-filters"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome del profilo"/><select value={profileVersion} onChange={e=>setProfileVersion(e.target.value)}><option>1.21.4</option><option>1.21.1</option><option>1.20.1</option><option>1.19.4</option></select><select value={loader} onChange={e=>setLoader(e.target.value)}><option value="fabric">Fabric</option><option value="forge">Forge</option><option value="neoforge">NeoForge</option><option value="quilt">Quilt</option><option value="vanilla">Vanilla</option></select><select value={profileRam} onChange={e=>setProfileRam(Number(e.target.value))}>{[2,4,6,8,12,16].map(n=><option key={n} value={n}>{n} GB</option>)}</select><button className="primary-btn" onClick={add}>Crea profilo</button></div>
 {profiles.length===0?<div className="library-message">Nessun profilo creato. Crea il primo usando i campi qui sopra.</div>:<div className="installed-list">{profiles.map(profile=><div className="installed-row" key={profile.id}><span><strong>{profile.name}</strong><small> Minecraft {profile.version} · {profile.loader} · {profile.ram} GB RAM</small></span><div className="catalog-actions"><button className="text-btn" onClick={()=>onActivate(profile)}>Usa profilo</button><button className="text-btn" onClick={()=>setProfiles(items=>items.filter(x=>x.id!==profile.id))}>Elimina</button></div></div>)}</div>}
 <div className="mod-panel-note"><ShieldCheck size={14}/> Usa profilo applica versione e RAM alla configurazione rapida; il loader resta un dato del preset finché non sarà disponibile il launcher Minecraft. I profili non creano ancora directory di gioco separate.</div></section></>;
}
type NovaServer = { id:string; name:string; address:string };
type MinecraftServerStatus = { online:boolean; latencyMs:number; version:string; playersOnline:number; playersMax:number; description:string };
function ServerStatusDetails({status}:{status:MinecraftServerStatus|{error:string}}) {
 if ("error" in status) return <small className="server-error">{status.error}</small>;
 return <small className="server-good">Online · {status.latencyMs} ms · {status.version} · {status.playersOnline}/{status.playersMax} giocatori{status.description ? " · "+status.description : ""}</small>;
}
function ServerManager() {
 const [servers,setServers]=useState<NovaServer[]>(()=>{try{return JSON.parse(localStorage.getItem("nova.servers")||"[]");}catch{return [];}});
 const [name,setName]=useState(""); const [address,setAddress]=useState("");
 const [statuses,setStatuses]=useState<Record<string,MinecraftServerStatus|{error:string}>>({});
 const [checking,setChecking]=useState<string|null>(null);
 const ping=async(server:NovaServer)=>{setChecking(server.id);setStatuses(current=>({...current,[server.id]:{error:"Controllo in corso…"}}));try{const result=await invoke<MinecraftServerStatus>("ping_minecraft_server",{address:server.address});setStatuses(current=>({...current,[server.id]:result}));}catch(error){setStatuses(current=>({...current,[server.id]:{error:String(error)}}));}finally{setChecking(null);}};

 useEffect(()=>{try{localStorage.setItem("nova.servers",JSON.stringify(servers));}catch{/* storage unavailable */}},[servers]);
 const add=()=>{const n=name.trim(),a=address.trim();if(!n||!a||!a.includes("." )&&!a.includes(":"))return;setServers(items=>[...items,{id:Date.now().toString(),name:n,address:a}]);setName("");setAddress("");};
 return <><div className="page-title"><div className="eyebrow">MULTIPLAYER</div><h1>Server <em>preferiti</em></h1><p>Salva i server Java, controlla se sono online e visualizza ping, versione e giocatori.</p></div>
 <section className="library-panel"><div className="library-filters"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome server"/><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="play.example.net"/><button className="primary-btn" onClick={add}>Aggiungi server</button></div>
 {servers.length===0?<div className="library-message">Nessun server salvato.</div>:<div className="installed-list">{servers.map(server=><div className="installed-row server-entry" key={server.id}><span><strong>{server.name}</strong><small>{server.address}</small>{statuses[server.id] && <ServerStatusDetails status={statuses[server.id]}/>}</span><div className="server-row-actions"><button className="text-btn" disabled={checking!==null} onClick={()=>void ping(server)}>{checking===server.id?"Controllo…":"Ping server"}</button><button className="text-btn" onClick={()=>void navigator.clipboard?.writeText(server.address).catch(()=>{})}>Copia IP</button><button className="text-btn" onClick={()=>{setServers(items=>items.filter(x=>x.id!==server.id));setStatuses(current=>{const next={...current};delete next[server.id];return next;});}}>Rimuovi</button></div></div>)}</div>}
 <div className="mod-panel-note"><ShieldCheck size={14}/> Ping TCP con protocollo status Minecraft Java. Alcuni proxy o server possono limitare le richieste di stato; il ping non effettua login né connessione al mondo.</div></section></>;
}
function SettingsPage({ram,setRam,version,setVersion}:{ram:number;setRam:(v:number)=>void;version:string;setVersion:(v:string)=>void}) {
 const [confirm,setConfirm]=useState(false);
 const clear=()=>{try{localStorage.removeItem("nova.mods");localStorage.removeItem("nova.profiles");localStorage.removeItem("nova.servers");localStorage.removeItem("nova.version");localStorage.removeItem("nova.ram");}catch{/* storage unavailable */}setConfirm(false);window.location.reload();};
 return <><div className="page-title"><div className="eyebrow">CLIENT PREFERENCES</div><h1>Imposta <em>NOVA</em></h1><p>Preferenze generali del launcher salvate su questo dispositivo.</p></div>
 <section className="library-panel"><div className="library-filters"><label className="settings-field">Versione predefinita<select value={version} onChange={e=>setVersion(e.target.value)}><option>1.21.4</option><option>1.21.1</option><option>1.20.1</option><option>1.19.4</option></select></label><label className="settings-field">RAM predefinita<select value={ram} onChange={e=>setRam(Number(e.target.value))}>{[2,4,6,8,12,16].map(n=><option key={n} value={n}>{n} GB</option>)}</select></label></div>
 <div className="mod-panel-note"><ShieldCheck size={14}/> Le preferenze di versione e RAM vengono salvate localmente. Non vengono ancora applicate a un processo Minecraft perché il launcher di gioco non è stato implementato.</div>
 <div className="installed-list"><strong>Dati locali NOVA</strong><p>Puoi cancellare preferenze mod, profili, server, versione e RAM salvati su questo dispositivo. La chiave API CurseForge non viene salvata.</p>{confirm?<div className="catalog-actions"><button className="text-btn" onClick={clear}>Conferma cancellazione</button><button className="text-btn" onClick={()=>setConfirm(false)}>Annulla</button></div>:<button className="text-btn" onClick={()=>setConfirm(true)}>Cancella dati locali</button>}</div></section></>;
}


export default App;
