import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, Box, ChevronDown, CircleHelp, Cpu,
  Gamepad2, Gauge, Globe2, Layers3, Menu, Monitor,
  Play, Search, Settings2, ShieldCheck, Sparkles,
  X, Zap, Download, ExternalLink, Users, Send, MessageCircle, UserPlus, Server
} from "lucide-react";

type Mod = { id: string; name: string; category: string; description: string; enabled: boolean; status: string };
type CatalogItem = { id: string | number; name: string; summary: string; icon?: string; url: string; downloads?: number; source: string };
type ModUpdate = { projectId: string; currentFile: string; latestFile: string; versionId: string };
const initialMods: Mod[] = [
  { id: "sodium", name: "Sodium", category: "Performance", description: "Rendering engine ottimizzato per aumentare gli FPS.", enabled: true, status: "Non installata · cerca nel catalogo Modrinth" },
  { id: "lithium", name: "Lithium", category: "Performance", description: "Ottimizza la logica interna del gioco e il tick.", enabled: true, status: "Non installata · cerca nel catalogo Modrinth" },
  { id: "ferrite", name: "FerriteCore", category: "Performance", description: "Riduce l'utilizzo della memoria.", enabled: true, status: "Non installata · cerca nel catalogo Modrinth" },
  { id: "entity", name: "Entity Culling", category: "Performance", description: "Evita il rendering delle entità non visibili.", enabled: false, status: "Non installata · cerca nel catalogo Modrinth" },
  { id: "cps", name: "CPS Counter", category: "HUD", description: "Contatore click al secondo.", enabled: true, status: "HUD in-game Fabric · Minecraft 1.21.4" },
  { id: "keystrokes", name: "Keystrokes", category: "HUD", description: "Mostra i tasti WASD e i click del mouse.", enabled: true, status: "HUD in-game NOVA · Fabric/Quilt 1.21.4" },
  { id: "fps", name: "FPS Display", category: "HUD", description: "Visualizza gli FPS sullo schermo.", enabled: true, status: "HUD in-game NOVA · Fabric/Quilt 1.21.4" },
  { id: "coords", name: "Coordinates", category: "HUD", description: "Coordinate e direzione del giocatore.", enabled: false, status: "HUD in-game NOVA · Fabric/Quilt 1.21.4" },
  { id: "sprint", name: "Toggle Sprint", category: "Gameplay", description: "Commutazione sprint configurabile.", enabled: false, status: "Non ancora incluso nel modulo HUD NOVA" }
];

const nav = [
  { id: "home", label: "Dashboard", icon: Gauge },
  { id: "launcher", label: "Launcher", icon: Download },
  { id: "mods", label: "Mod Manager", icon: Layers3 },
  { id: "library", label: "Libreria mod", icon: Download },
  { id: "profiles", label: "Profili", icon: Box },
  { id: "friends", label: "Amici e chat", icon: Users },
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
          <section className="launch-card"><div className="launch-info"><div className="eyebrow">QUICK LAUNCH</div><h2>Pronto a giocare?</h2><p>Configura il profilo e prepara la tua prossima sessione.</p><div className="launch-controls"><label className="select-wrap"><span>VERSIONE</span><select value={version} onChange={e => setVersion(e.target.value)}><option>1.21.4</option><option>1.21.1</option><option>1.20.1</option><option>1.19.4</option></select><ChevronDown size={14}/></label><label className="select-wrap"><span>RAM ALLOCATA</span><select value={ram} onChange={e => setRam(Number(e.target.value))}>{[2,4,6,8,12,16].map(n => <option key={n} value={n}>{n} GB</option>)}</select><ChevronDown size={14}/></label></div><button className="primary-btn" onClick={() => setPage("launcher")}><Play size={16} fill="currentColor"/> Avvia NOVA <span>→</span></button></div><div className="launch-art"><div className="cube"><div className="cube-top"/><div className="cube-front"/><div className="cube-side"/></div><div className="art-caption">MINECRAFT JAVA <span>PROFILE · {version}</span></div></div></section>
          <div className="section-heading"><div><div className="eyebrow">YOUR SETUP</div><h2>Il tuo spazio di gioco</h2></div><button className="text-btn" onClick={() => setPage("mods")}>Gestisci mod <span>→</span></button></div>
          <div className="stat-grid"><div className="stat-card"><div className="stat-icon purple"><Layers3 size={18}/></div><span>MOD ATTIVE</span><strong>{mods.filter(m => m.enabled).length}</strong><small>Preferenze salvate su questo dispositivo</small></div><div className="stat-card"><div className="stat-icon blue"><Cpu size={18}/></div><span>RAM ALLOCATA</span><strong>{ram} <small>GB</small></strong><small>Preferenza salvata localmente</small></div><div className="stat-card"><div className="stat-icon green"><ShieldCheck size={18}/></div><span>STATO CLIENT</span><strong className="state-text">Preview</strong><small>Launcher non collegato</small></div></div>
          <div className="hint-bar"><div className="hint-icon"><Menu size={18}/></div><div><strong>Apri il menu mod in un tocco</strong><p>Premi <kbd>RIGHT SHIFT</kbd> in questa finestra per aprire il menu rapido NOVA.</p></div><button onClick={() => setMenuOpen(true)}>Provalo <span>→</span></button></div>
        </>}
        {page === "launcher" && <LauncherTools ram={ram} version={version}/>}
        {page === "library" && <ModLibrary/>}
        {page === "mods" && <><div className="page-title"><div className="eyebrow">CUSTOMIZE YOUR GAME</div><h1>Mod <em>Manager</em></h1><p>Gestisci e salva le preferenze del tuo client. Le modifiche restano memorizzate su questo dispositivo.</p></div><ModPanel mods={visibleMods} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} toggleMod={toggleMod}/></>}
        {page === "profiles" && <ProfileManager defaultVersion={version} defaultRam={ram} onActivate={(profile) => { setVersion(profile.version); setRam(profile.ram); localStorage.setItem("nova.preferredLoader",profile.loader); localStorage.removeItem("nova.activeInstance"); toast(`Profilo "${profile.name}" applicato: versione, loader e RAM. Crea o seleziona la relativa istanza nel Launcher.`); setPage("home"); }}/>}
        {page === "friends" && <FriendsChat/>}
        {page === "servers" && <ServerManager/>}
        {page === "settings" && <SettingsPage ram={ram} setRam={setRam} version={version} setVersion={setVersion}/>}
      </div>
      <footer className="footer"><span>© 2026 NOVA CLIENT</span><span><i/> ALL SYSTEMS IN PREVIEW</span></footer>
    </main>

    <AnimatePresence>{menuOpen && <motion.div className="overlay-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e => { if (e.target === e.currentTarget) setMenuOpen(false); }}><motion.section className="mod-overlay" initial={{opacity:0, scale:.96, y:12}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:.97, y:8}} transition={{duration:.16}}><div className="overlay-head"><div className="brand mini"><div className="brand-mark"><Sparkles size={17}/></div><div><strong>NOVA</strong><span>MOD MENU</span></div></div><div className="overlay-head-right"><kbd>RIGHT SHIFT</kbd><button className="icon-btn" onClick={() => setMenuOpen(false)}><X size={18}/></button></div></div><div className="overlay-body"><div className="overlay-intro"><div><div className="eyebrow">YOUR CLIENT, YOUR WAY</div><h2>Mod <em>Menu</em></h2><p>Attiva o disattiva le funzionalità disponibili.</p></div><div className="overlay-badge"><Activity size={15}/> {mods.filter(m=>m.enabled).length} ACTIVE</div></div><ModPanel mods={visibleMods} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} toggleMod={toggleMod} compact/></div><div className="overlay-foot"><span><i/> NOVA CLIENT PREVIEW</span><span>ESC / RIGHT SHIFT PER CHIUDERE</span></div></motion.section></motion.div>}</AnimatePresence>
    <AnimatePresence>{showNotice && <motion.div className="toast" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}><CircleHelp size={17}/>{notice}</motion.div>}</AnimatePresence>
  </div>;
}




type NovaFriend = { id: string; name: string; host: string; port: number };
type NovaFriendRequest = { senderId: string; senderName: string; senderHost: string; senderPort: number };
type NovaDirectMessage = { id: string; friendId: string; senderId: string; senderName: string; text: string; createdAt: number; outgoing: boolean; failed?: boolean };
type NovaInvite = { id: string; senderId: string; senderName: string; serverName: string; serverAddress: string; createdAt: number };
type NovaSocialPacket = { kind: string; senderId: string; senderName: string; senderHost?: string; senderPort?: number; text?: string; serverName?: string; serverAddress?: string; createdAt?: number };
const NOVA_SOCIAL_PORT = 47821;
const readLocal = <T,>(key: string, fallback: T): T => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } };
const saveLocal = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } };
const newSocialId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);

function FriendsChat() {
 const [selfName,setSelfName]=useState(()=>localStorage.getItem("nova.playerName")||"Player");
 const [selfHost,setSelfHost]=useState(()=>localStorage.getItem("nova.socialHost")||"");
 const [friends,setFriends]=useState<NovaFriend[]>(()=>readLocal("nova.friends",[]));
 const [requests,setRequests]=useState<NovaFriendRequest[]>(()=>readLocal("nova.friendRequests",[]));
 const [messages,setMessages]=useState<NovaDirectMessage[]>(()=>readLocal("nova.messages",[]));
 const [invites,setInvites]=useState<NovaInvite[]>(()=>readLocal("nova.serverInvites",[]));
 const [selectedId,setSelectedId]=useState("");
 const [friendName,setFriendName]=useState("");
 const [friendHost,setFriendHost]=useState("");
 const [friendPort,setFriendPort]=useState(String(NOVA_SOCIAL_PORT));
 const [draft,setDraft]=useState("");
 const [serverName,setServerName]=useState("");
 const [serverAddress,setServerAddress]=useState("");
 const [status,setStatus]=useState("Avvio rete NOVA Direct…");
 const [busy,setBusy]=useState(false);
 const [showAdd,setShowAdd]=useState(false);
 const selected=friends.find(friend=>friend.id===selectedId)||friends[0];

 useEffect(()=>{saveLocal("nova.friends",friends);},[friends]);
 useEffect(()=>{saveLocal("nova.friendRequests",requests);},[requests]);
 useEffect(()=>{saveLocal("nova.messages",messages.slice(-500));},[messages]);
 useEffect(()=>{saveLocal("nova.serverInvites",invites.slice(-100));},[invites]);

 useEffect(()=>{
  let disposed=false;
  let unlisten:(()=>void)|undefined;
  void listen<NovaSocialPacket>("nova-social-packet",event=>{
   const packet=event.payload;
   if(!packet.senderId||packet.senderId===localStorage.getItem("nova.socialId"))return;
   if(packet.kind==="friend_request"){
    const request:NovaFriendRequest={senderId:packet.senderId,senderName:packet.senderName,senderHost:packet.senderHost||"",senderPort:packet.senderPort||NOVA_SOCIAL_PORT};
    setRequests(items=>items.some(x=>x.senderId===request.senderId)?items:[...items,request]);
    setStatus("Nuova richiesta amicizia da "+request.senderName);
   } else if(packet.kind==="friend_accept"){
    if(!packet.senderHost)return;
    const friend:NovaFriend={id:packet.senderId,name:packet.senderName,host:packet.senderHost,port:packet.senderPort||NOVA_SOCIAL_PORT};
    setFriends(items=>items.some(x=>x.id===friend.id)?items.map(x=>x.id===friend.id?friend:x):[...items,friend]);
    setStatus(friend.name+" ha accettato la richiesta");
   } else if(packet.kind==="chat"){
    const friend=friends.find(x=>x.id===packet.senderId);
    if(!friend||!packet.text)return;
    setMessages(items=>[...items,{id:newSocialId(),friendId:friend.id,senderId:packet.senderId,senderName:packet.senderName,text:packet.text!,createdAt:packet.createdAt||Date.now(),outgoing:false}]);
   } else if(packet.kind==="server_invite"){
    const invite:NovaInvite={id:newSocialId(),senderId:packet.senderId,senderName:packet.senderName,serverName:packet.serverName||"Server Minecraft",serverAddress:packet.serverAddress||"",createdAt:packet.createdAt||Date.now()};
    setInvites(items=>[invite,...items].slice(0,100));
    setStatus("Invito server ricevuto da "+packet.senderName);
   }
  }).then(fn=>{if(disposed)fn();else unlisten=fn;}).catch(error=>setStatus("Listener NOVA Direct: "+String(error)));
  void invoke<number>("start_social_listener",{port:NOVA_SOCIAL_PORT}).then(()=>{if(!disposed)setStatus("In ascolto sulla porta "+NOVA_SOCIAL_PORT);}).catch(error=>{if(!disposed)setStatus(String(error));});
  return ()=>{disposed=true;unlisten?.();};
 },[friends]);

 useEffect(()=>{if(!selectedId&&friends[0])setSelectedId(friends[0].id);},[friends,selectedId]);
 const ensureIdentity=()=>{
  const name=selfName.trim();
  if(name.length<3||name.length>16||!/^[a-zA-Z0-9_]+$/.test(name))throw new Error("Il tuo nome deve avere 3–16 caratteri: lettere, numeri o underscore.");
  if(!selfHost.trim())throw new Error("Inserisci il tuo IP LAN o hostname raggiungibile dagli amici.");
  localStorage.setItem("nova.playerName",name);
  localStorage.setItem("nova.socialHost",selfHost.trim());
  let id=localStorage.getItem("nova.socialId");
  if(!id){id=newSocialId();localStorage.setItem("nova.socialId",id);}
  return {name,id,host:selfHost.trim()};
 };
 const sendPacket=async(host:string,port:number,packet:NovaSocialPacket)=>{
  await invoke("send_social_packet",{host,port,packet});
 };
 const sendRequest=async()=>{
  setBusy(true);
  try{
   const me=ensureIdentity();const host=friendHost.trim();const port=Number(friendPort);
   if(!host||host.length>255||!Number.isInteger(port)||port<1||port>65535)throw new Error("Inserisci l'indirizzo IP/host e una porta valida.");
   const packet:NovaSocialPacket={kind:"friend_request",senderId:me.id,senderName:me.name,senderHost:me.host,senderPort:NOVA_SOCIAL_PORT,createdAt:Date.now()};
   await sendPacket(host,port,packet);setStatus("Richiesta inviata a "+(friendName.trim()||host)+". L'amico deve accettarla.");
   setFriendName("");setFriendHost("");setShowAdd(false);
  }catch(error){setStatus(String(error));}finally{setBusy(false);}
 };
 const acceptRequest=async(request:NovaFriendRequest)=>{
  setBusy(true);
  try{
   const me=ensureIdentity();
   const packet:NovaSocialPacket={kind:"friend_accept",senderId:me.id,senderName:me.name,senderHost:me.host,senderPort:NOVA_SOCIAL_PORT,createdAt:Date.now()};
   await sendPacket(request.senderHost,request.senderPort,packet);
   setFriends(items=>items.some(x=>x.id===request.senderId)?items:[...items,{id:request.senderId,name:request.senderName,host:request.senderHost,port:request.senderPort}]);
   setRequests(items=>items.filter(x=>x.senderId!==request.senderId));setSelectedId(request.senderId);setStatus("Amicizia aggiunta con "+request.senderName);
  }catch(error){setStatus("Accettazione non riuscita: "+String(error));}finally{setBusy(false);}
 };
 const sendMessage=async()=>{
  if(!selected||!draft.trim())return;
  setBusy(true);
  try{
   const me=ensureIdentity();const text=draft.trim();
   const item:NovaDirectMessage={id:newSocialId(),friendId:selected.id,senderId:me.id,senderName:me.name,text,createdAt:Date.now(),outgoing:true};
   await sendPacket(selected.host,selected.port,{kind:"chat",senderId:me.id,senderName:me.name,senderHost:me.host,senderPort:NOVA_SOCIAL_PORT,text,createdAt:item.createdAt});
   setMessages(items=>[...items,item]);setDraft("");setStatus("Messaggio inviato");
  }catch(error){setStatus("Invio non riuscito: "+String(error));}finally{setBusy(false);}
 };
 const sendInvite=async()=>{
  if(!selected||!serverAddress.trim())return;
  setBusy(true);
  try{
   const me=ensureIdentity();
   await sendPacket(selected.host,selected.port,{kind:"server_invite",senderId:me.id,senderName:me.name,senderHost:me.host,senderPort:NOVA_SOCIAL_PORT,serverName:serverName.trim()||"Server Minecraft",serverAddress:serverAddress.trim(),createdAt:Date.now()});
   setStatus("Invito inviato a "+selected.name);setServerName("");setServerAddress("");
  }catch(error){setStatus("Invito non inviato: "+String(error));}finally{setBusy(false);}
 };
 const acceptInvite=(invite:NovaInvite)=>{
  const current=readLocal<{id:string;name:string;address:string}[]>("nova.servers",[]);
  if(!current.some(x=>x.address===invite.serverAddress)){
   saveLocal("nova.servers",[...current,{id:newSocialId(),name:invite.serverName,address:invite.serverAddress}]);
  }
  setInvites(items=>items.filter(x=>x.id!==invite.id));
  setStatus("Server aggiunto ai preferiti: "+invite.serverAddress);
 };
 const visibleMessages=messages.filter(item=>selected&&item.friendId===selected.id);
 return <><div className="page-title"><div className="eyebrow">NOVA DIRECT</div><h1>Amici e <em>chat</em></h1><p>Richieste amicizia, messaggi diretti e inviti ai server Minecraft.</p></div>
  <section className="social-setup">
   <div className="social-identity"><div><strong>Il tuo profilo NOVA</strong><small>Nome e indirizzo usati dagli amici per contattarti</small></div><div className="social-identity-fields"><input value={selfName} onChange={e=>setSelfName(e.target.value)} placeholder="Il tuo nome NOVA" maxLength={16}/><input value={selfHost} onChange={e=>setSelfHost(e.target.value)} placeholder="Il tuo IP LAN / hostname raggiungibile"/><button className="primary-btn small-btn" onClick={()=>{try{ensureIdentity();setStatus("Profilo salvato. Porta di ascolto: "+NOVA_SOCIAL_PORT);}catch(e){setStatus(String(e));}}}>Salva</button></div><small>Porta TCP: {NOVA_SOCIAL_PORT} · Su internet serve inoltrare questa porta nel router verso il tuo PC; su LAN usate l'IP locale.</small></div>
   <div className="social-status"><span className="social-live-dot"/>{status}</div>
  </section>
  <div className="social-grid">
   <section className="social-card social-friends"><div className="social-card-head"><strong>Amici</strong><button className="text-btn" onClick={()=>setShowAdd(v=>!v)}><UserPlus size={14}/> Aggiungi</button></div>
    {showAdd&&<div className="friend-add"><input value={friendName} onChange={e=>setFriendName(e.target.value)} placeholder="Nome amico (facoltativo)"/><input value={friendHost} onChange={e=>setFriendHost(e.target.value)} placeholder="IP o hostname dell'amico"/><input value={friendPort} onChange={e=>setFriendPort(e.target.value)} inputMode="numeric" placeholder="Porta"/><button className="primary-btn" disabled={busy} onClick={()=>void sendRequest()}>Invia richiesta</button></div>}
    {requests.length>0&&<div className="friend-requests"><strong>Richieste ricevute ({requests.length})</strong>{requests.map(req=><div className="friend-list-row" key={req.senderId}><span><b>{req.senderName}</b><small>{req.senderHost}:{req.senderPort}</small></span><button className="text-btn" disabled={busy} onClick={()=>void acceptRequest(req)}>Accetta</button></div>)}</div>}
    {friends.length===0?<div className="social-empty"><Users size={25}/><p>Ancora nessun amico.</p><small>Aggiungi un amico usando il suo IP e la porta NOVA Direct.</small></div>:friends.map(friend=><button className={selected?.id===friend.id?"friend-list-row selected":"friend-list-row"} key={friend.id} onClick={()=>setSelectedId(friend.id)}><span><b>{friend.name}</b><small>{friend.host}:{friend.port}</small></span><MessageCircle size={15}/></button>)}
   </section>
   <section className="social-card social-chat">
    <div className="social-card-head"><strong>{selected?selected.name:"Chat"}</strong>{selected&&<span className="social-subtle">{selected.host}:{selected.port}</span>}</div>
    <div className="chat-history">{!selected?<div className="social-empty"><MessageCircle size={24}/><p>Seleziona un amico per iniziare.</p></div>:visibleMessages.length===0?<div className="social-empty"><MessageCircle size={24}/><p>Nessun messaggio.</p><small>La chat è diretta tra i due PC.</small></div>:visibleMessages.map(message=><div className={message.outgoing?"chat-message outgoing":"chat-message"} key={message.id}><small>{message.outgoing?"Tu":message.senderName} · {new Date(message.createdAt).toLocaleString()}</small><p>{message.text}</p></div>)}</div>
    <div className="chat-compose"><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void sendMessage();}} placeholder={selected?"Scrivi un messaggio…":"Aggiungi un amico"} disabled={!selected||busy}/><button className="primary-btn" disabled={!selected||!draft.trim()||busy} onClick={()=>void sendMessage()}><Send size={15}/> Invia</button></div>
    {selected&&<div className="friend-invite-form"><div className="social-card-head"><strong>Invita al server</strong><Server size={15}/></div><input value={serverName} onChange={e=>setServerName(e.target.value)} placeholder="Nome server"/><input value={serverAddress} onChange={e=>setServerAddress(e.target.value)} placeholder="play.example.net:25565"/><button className="text-btn" disabled={busy||!serverAddress.trim()} onClick={()=>void sendInvite()}>Invia invito server</button></div>}
   </section>
  </div>
  {invites.length>0&&<section className="social-card social-invites"><div className="social-card-head"><strong>Inviti ricevuti</strong><span>{invites.length}</span></div>{invites.map(invite=><div className="friend-list-row" key={invite.id}><span><b>{invite.serverName}</b><small>Da {invite.senderName} · {invite.serverAddress}</small></span><button className="text-btn" onClick={()=>acceptInvite(invite)}>Aggiungi ai server</button></div>)}</section>}
  <div className="social-note"><strong>Connessione diretta e limiti</strong><p>Questa prima versione usa TCP diretto: funziona su rete locale e su internet quando la porta 47821 è inoltrata nel router e il firewall Windows consente NOVA. Non richiede un server centrale, ma i messaggi non sono cifrati e non c'è ancora un servizio di presenza o matchmaking.</p></div>
 </>;
}

type JavaRuntime = {available:boolean; executable?:string; version?:string; major?:number; error?:string};
type MinecraftVersionEntry = {id:string;type:string;url:string};
type GameInstanceEntry = {name:string;version:string;loader:string;path:string};
function LauncherTools({ram,version}:{ram:number;version:string}) {
 const [java,setJava]=useState<JavaRuntime[]>([]);
 const [javaExecutable,setJavaExecutable]=useState("auto");
 const [versions,setVersions]=useState<MinecraftVersionEntry[]>([]);
 const [selected,setSelected]=useState(version);
 useEffect(()=>{setSelected(version);},[version]);
 const [installedVersionId,setInstalledVersionId]=useState("");
 const [username,setUsername]=useState("Player");
 const [instanceName,setInstanceName]=useState("NOVA");
 const [loader,setLoader]=useState(()=>localStorage.getItem("nova.preferredLoader")||"fabric");
 useEffect(()=>{localStorage.setItem("nova.preferredLoader",loader);},[loader]);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [instancePath,setInstancePath]=useState("");
 const [instances,setInstances]=useState<GameInstanceEntry[]>([]);
 const [packs,setPacks]=useState<string[]>([]);
 const [packKind,setPackKind]=useState("resourcepacks");
 const [backups,setBackups]=useState<string[]>([]);
 const [selectedBackup,setSelectedBackup]=useState("");
 const [gameLog,setGameLog]=useState("");
 const importPack=async(file?:File)=>{if(!file||!instancePath)return;setBusy(true);setMessage("");try{const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(new Error("Lettura file non riuscita"));reader.readAsDataURL(file);});const filename=await invoke<string>("import_instance_pack_data",{instancePath,kind:packKind,filename:file.name,dataBase64:data});setMessage("Pacchetto importato: "+filename);await loadPacks(packKind);}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 const refresh=async()=>{
  setBusy(true);setMessage("");
  try {
   const [runtime,manifest,instanceList]=await Promise.all([invoke<JavaRuntime[]>("detect_java_runtimes"),invoke<any>("list_minecraft_versions"),invoke<GameInstanceEntry[]>("list_game_instances")]);
   setJava(runtime);setInstances(instanceList);const active=localStorage.getItem("nova.activeInstance");if(active&&instanceList.some(item=>item.path===active)){const current=instanceList.find(item=>item.path===active)!;setInstancePath(active);setSelected(current.version);setLoader(current.loader);const profile=await invoke<string|null>("get_instance_profile_id",{instancePath:active});setInstalledVersionId(profile||"");}const all=(manifest.versions||[]) as MinecraftVersionEntry[];setVersions(all);

  } catch(e){setMessage(String(e));} finally{setBusy(false);}
 };
 useEffect(()=>{void refresh();},[]);
 const installJava=async(major:number)=>{setBusy(true);setMessage("Download Java "+major+" in corso…");try{const path=await invoke<string>("install_java_runtime",{major});setJavaExecutable("auto");setJava(current=>[...current.filter(x=>x.executable!==path),{available:true,executable:path,version:"Temurin Java "+major,major}]);setMessage("Java "+major+" installato: "+path);}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 const install=async()=>{
  setBusy(true);setMessage("Download di client, librerie, asset e loader in corso…");
  try{if(!instancePath)throw new Error("Crea o seleziona un'istanza prima di installare.");const id=await invoke<string>("install_game_profile",{gameVersion:selected,loader,loaderVersion:null,javaExecutable:javaExecutable==="auto"?null:javaExecutable,instancePath});setInstalledVersionId(id);setMessage("Installazione completata: "+id+" (librerie, asset e loader inclusi).");}
  catch(e){setMessage(String(e));}finally{setBusy(false);}
 };
 const launch=async()=>{if(!instancePath||!installedVersionId){setMessage("Crea un’istanza e installa il profilo prima di avviare.");return;}setBusy(true);try{const pid=await invoke<number>("launch_offline_profile",{versionId:installedVersionId,instancePath,username,ramGb:ram,javaExecutable:javaExecutable==="auto"?null:javaExecutable});setMessage("Minecraft avviato (processo "+pid+"). Log: "+instancePath+"/nova-game.log");}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 const create=async()=>{
  setBusy(true);setMessage("");
  try{const path=await invoke<string>("create_game_instance",{name:instanceName,version:selected,loader});setInstancePath(path);localStorage.setItem("nova.activeInstance",path);setInstalledVersionId(await invoke<string|null>("get_instance_profile_id",{instancePath:path})||"");await loadBackups(path);setMessage("Istanza creata e selezionata: "+path);setInstances(await invoke<GameInstanceEntry[]>("list_game_instances"));}
  catch(e){setMessage(String(e));}finally{setBusy(false);}
 };
 const loadPacks=async(kind=packKind)=>{
  if(!instancePath)return;
  setPackKind(kind);
  try{setPacks(await invoke<string[]>("list_instance_packs",{instancePath,kind}));}catch(e){setMessage(String(e));}
 };
 const loadBackups=async(path=instancePath)=>{if(!path)return;try{const found=await invoke<string[]>("list_instance_backups",{instancePath:path});setBackups(found);setSelectedBackup(found[0]||"");}catch(e){setMessage(String(e));}};
 const installShaderSupport=async()=>{if(!instancePath)return;setBusy(true);setMessage("Installazione Iris e Sodium in corso…");try{const files=await invoke<string[]>("install_instance_shader_support",{instancePath});setMessage("Supporto shader installato: "+files.join(", "));}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 const installModpack=async(file?:File)=>{if(!file||!instancePath)return;if(!file.name.toLowerCase().endsWith(".mrpack")){setMessage("Seleziona un file Modrinth .mrpack");return;}setBusy(true);setMessage("Installazione modpack in corso…");try{const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(new Error("Lettura modpack non riuscita"));reader.readAsDataURL(file);});const installed=await invoke<string[]>("install_modrinth_modpack",{instancePath,filename:file.name,dataBase64:data});setMessage("Modpack installato: "+installed.length+" file e override.");}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 const createBackup=async()=>{if(!instancePath)return;if(!window.confirm("Chiudi Minecraft prima del backup per evitare di copiare salvataggi mentre il gioco li sta modificando. Continuare?"))return;setBusy(true);try{const path=await invoke<string>("backup_game_instance",{instancePath});setMessage("Backup creato: "+path);await loadBackups();}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 const restoreBackup=async()=>{if(!instancePath||!selectedBackup)return;if(!window.confirm("Ripristinare questo backup? Chiudi Minecraft prima di continuare: mod, pack, configurazioni e salvataggi correnti verranno sostituiti."))return;setBusy(true);try{await invoke("restore_game_instance_backup",{instancePath,backupPath:selectedBackup});setMessage("Backup ripristinato.");await loadPacks(packKind);}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 const loadGameLog=async()=>{if(!instancePath)return;try{setGameLog(await invoke<string>("read_instance_log",{instancePath}));}catch(e){setMessage(String(e));}};
 return <>
  <div className="page-title"><div className="eyebrow">MINECRAFT RUNTIME</div><h1>Launcher <em>NOVA</em></h1><p>Rilevamento Java, versioni ufficiali e cartelle istanza isolate. Il download iniziale prepara i metadati e il client jar verificato.</p></div>
  <section className="library-panel">
   <div className="installed-list"><strong>Runtime Java rilevati</strong>
    {java.length===0?<p>Ricerca Java in corso…</p>:java.map((item,i)=><div className="installed-row" key={i}><span><strong>{item.available?item.version:"Java non trovato"}</strong><small>{item.executable||item.error}</small></span><span>{item.major?"Java "+item.major:""}</span></div>)}
    <div className="catalog-actions"><button className="text-btn" onClick={()=>void refresh()} disabled={busy}>Rileva di nuovo</button><button className="text-btn" onClick={()=>void installJava(8)} disabled={busy}>Installa Java 8</button><button className="text-btn" onClick={()=>void installJava(16)} disabled={busy}>Installa Java 16</button><button className="text-btn" onClick={()=>void installJava(17)} disabled={busy}>Installa Java 17</button><button className="text-btn" onClick={()=>void installJava(21)} disabled={busy}>Installa Java 21</button><button className="text-btn" onClick={()=>void installJava(25)} disabled={busy}>Installa Java 25</button></div>
    <label className="settings-field">Runtime per l’avvio<select value={javaExecutable} onChange={e=>setJavaExecutable(e.target.value)}><option value="auto">Automatico (versione Minecraft)</option>{java.filter(x=>x.available&&x.executable).map(x=><option key={x.executable} value={x.executable}>{x.version} · {x.executable}</option>)}</select></label>
   </div>
   <div className="installed-list"><strong>Versioni Minecraft ufficiali</strong>
    <div className="library-filters"><select value={selected} onChange={e=>{setSelected(e.target.value);setInstalledVersionId("");}}>{versions.filter(v=>v.type==="release").slice(0,150).map(v=><option key={v.id} value={v.id}>{v.id}</option>)}</select><button className="primary-btn" disabled={busy||versions.length===0} onClick={()=>void install()}>{busy?"Attendere…":"Installa profilo completo"}</button></div>
    <p>L’installazione completa usa il resolver Minecraft per scaricare client, librerie, natives e asset, e prepara Fabric, Quilt, Forge o NeoForge quando selezionati.</p>
   </div>
   <div className="installed-list"><strong>Istanze indipendenti</strong>
    <div className="library-filters"><input value={instanceName} onChange={e=>setInstanceName(e.target.value)} placeholder="Nome istanza"/><select value={loader} onChange={e=>{setLoader(e.target.value);setInstalledVersionId("");}}><option value="vanilla">Vanilla</option><option value="fabric">Fabric</option><option value="quilt">Quilt</option><option value="forge">Forge</option><option value="neoforge">NeoForge</option></select><button className="primary-btn" disabled={busy} onClick={()=>void create()}>Crea istanza</button></div>
    <label className="settings-field">Istanza attiva<select value={instancePath} onChange={e=>{const path=e.target.value;setInstancePath(path);setInstalledVersionId("");localStorage.setItem("nova.activeInstance",path);const current=instances.find(item=>item.path===path);if(current){setSelected(current.version);setLoader(current.loader);}if(path){void invoke<string|null>("get_instance_profile_id",{instancePath:path}).then(id=>setInstalledVersionId(id||"")).catch(err=>setMessage(String(err)));void loadBackups(path);}}}><option value="">Seleziona istanza…</option>{instances.map(item=><option key={item.path} value={item.path}>{item.name} · {item.version} · {item.loader}</option>)}</select></label>
    {instancePath&&<p>Cartella attiva: {instancePath}</p>}
    <div className="library-filters"><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Nome giocatore offline"/><button className="primary-btn" disabled={busy||!installedVersionId||!instancePath} onClick={()=>void launch()}>Avvia Minecraft offline</button></div>
    {installedVersionId&&<p>Profilo installato: {installedVersionId}</p>}
    <div className="catalog-actions"><button className="text-btn" onClick={()=>void loadPacks("resourcepacks")} disabled={!instancePath}>Resource pack</button><button className="text-btn" onClick={()=>void loadPacks("shaderpacks")} disabled={!instancePath}>Shader</button><button className="text-btn" onClick={()=>void installShaderSupport()} disabled={!instancePath||(loader!=="fabric"&&loader!=="quilt"&&loader!=="neoforge")||busy}>Installa Iris + Sodium</button></div>
    {packs.map(pack=><div className="installed-row" key={pack}><span>{pack}</span><div><button className="text-btn" onClick={()=>void invoke("activate_instance_pack",{instancePath,kind:packKind,filename:pack,enabled:true}).then(()=>setMessage("Pacchetto attivato: "+pack)).catch(e=>setMessage(String(e)))}>Attiva</button><button className="text-btn" onClick={()=>void invoke("activate_instance_pack",{instancePath,kind:packKind,filename:pack,enabled:false}).then(()=>setMessage("Pacchetto disattivato: "+pack)).catch(e=>setMessage(String(e)))}>Disattiva</button></div></div>)}
    <label className="text-btn">Importa ZIP <input type="file" accept=".zip,application/zip" disabled={!instancePath||busy} onChange={e=>{void importPack(e.target.files?.[0]);e.currentTarget.value="";}}/></label>
    <label className="text-btn">Installa modpack Modrinth (.mrpack) <input type="file" accept=".mrpack" disabled={!instancePath||busy} onChange={e=>{void installModpack(e.target.files?.[0]);e.currentTarget.value="";}}/></label>
    <div className="installed-list"><strong>Log di Minecraft</strong><div className="catalog-actions"><button className="text-btn" disabled={!instancePath} onClick={()=>void loadGameLog()}>Leggi ultime righe del log</button></div>{gameLog&&<pre className="game-log">{gameLog}</pre>}</div>
    <div className="installed-list"><strong>Backup e ripristino istanza</strong>
     <div className="catalog-actions"><button className="text-btn" disabled={!instancePath||busy} onClick={()=>void createBackup()}>Crea backup</button><button className="text-btn" disabled={!instancePath} onClick={()=>void loadBackups()}>Aggiorna elenco</button></div>
     <div className="library-filters"><select value={selectedBackup} onChange={e=>setSelectedBackup(e.target.value)}><option value="">Nessun backup disponibile</option>{backups.map(path=><option key={path} value={path}>{path.split(/[\\/]/).pop()}</option>)}</select><button className="text-btn" disabled={!selectedBackup||busy} onClick={()=>void restoreBackup()}>Ripristina backup</button></div>
    </div>
    <p>Ogni istanza ha directory separate. Le istanze Fabric 1.21.4 ricevono Fabric API e il modulo HUD NOVA (FPS, CPS, WASD, coordinate e menu Right Shift). Iris e Sodium si installano su richiesta per Fabric, Quilt e NeoForge. Per altre versioni o loader il HUD NOVA non è ancora disponibile.</p>
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
 const [updates,setUpdates]=useState<ModUpdate[]>([]);
 const [checkingUpdates,setCheckingUpdates]=useState(false);
 useEffect(()=>{const active=localStorage.getItem("nova.activeInstance");if(!active){setModsPath("");setInstalled([]);return;}void invoke<string>("get_minecraft_mods_path",{instancePath:active}).then(setModsPath).catch(()=>{});void invoke<string[]>("list_installed_mods",{instancePath:active}).then(setInstalled).catch(()=>{});void invoke<GameInstanceEntry[]>("list_game_instances").then(list=>{const instance=list.find(item=>item.path===active);if(instance){setVersion(instance.version);setLoader(instance.loader);}}).catch(()=>{});},[]);
 const installProject=async(item:CatalogItem)=>{if(source!=="modrinth")return;const active=localStorage.getItem("nova.activeInstance");if(!active){setError("Seleziona prima un’istanza nella sezione Launcher.");return;}setInstalling(String(item.id));setError("");setSuccess("");try{const filenames=await invoke<string[]>("install_modrinth_project",{projectId:String(item.id),gameVersion:version,loader,instancePath:localStorage.getItem("nova.activeInstance")});setInstalled(current=>Array.from(new Set([...current,...filenames])));setSuccess("Installate "+filenames.length+" mod (incluse le dipendenze richieste): "+filenames.join(", "));}catch(e){setError(String(e));}finally{setInstalling(null);}};
 const checkUpdates=async()=>{if(!localStorage.getItem("nova.activeInstance")){setError("Seleziona prima un’istanza nella sezione Launcher.");return;}setCheckingUpdates(true);setError("");setSuccess("");try{const found=await invoke<ModUpdate[]>("check_modrinth_mod_updates",{instancePath:localStorage.getItem("nova.activeInstance"),gameVersion:version,loader});setUpdates(found);setSuccess(found.length?found.length+" aggiornamenti disponibili.":"Le mod tracciate sono già aggiornate.");}catch(e){setError(String(e));}finally{setCheckingUpdates(false);}};
 const updateMod=async(projectId:string)=>{if(!localStorage.getItem("nova.activeInstance")){setError("Seleziona prima un’istanza nella sezione Launcher.");return;}setInstalling(projectId);setError("");try{const files=await invoke<string[]>("install_modrinth_project",{projectId,gameVersion:version,loader,instancePath:localStorage.getItem("nova.activeInstance")});setInstalled(current=>Array.from(new Set([...current,...files])));setUpdates(current=>current.filter(item=>item.projectId!==projectId));setSuccess("Mod aggiornata: "+files.join(", "));}catch(e){setError(String(e));}finally{setInstalling(null);}};
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
 <div className="library-filters"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void searchMods();}} placeholder="Cerca una mod..."/><select value={version} onChange={e=>setVersion(e.target.value)}><option>1.21.4</option><option>1.21.1</option><option>1.20.1</option><option>1.19.4</option></select><select value={loader} onChange={e=>setLoader(e.target.value)}><option value="fabric">Fabric</option><option value="forge">Forge</option><option value="neoforge">NeoForge</option><option value="quilt">Quilt</option></select><button className="primary-btn" disabled={loading} onClick={()=>void searchMods()}>{loading?"Ricerca...":"Cerca"}</button><button className="text-btn" disabled={checkingUpdates||source!=="modrinth"} onClick={()=>void checkUpdates()}>{checkingUpdates?"Controllo…":"Controlla aggiornamenti"}</button></div>
 {source==="curseforge"&&<div className="api-key-row"><label>CurseForge API key <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Inserisci la tua API key"/></label><span>Usata solo per questa sessione; non viene salvata</span></div>}
 {updates.map(update=><div className="installed-row" key={update.projectId}><span><strong>{update.projectId}</strong><small>{update.currentFile} → {update.latestFile}</small></span><button className="text-btn" disabled={installing===update.projectId} onClick={()=>void updateMod(update.projectId)}>{installing===update.projectId?"Aggiornamento…":"Aggiorna"}</button></div>)}
 {error&&<div className="library-message error">{error}</div>}{success&&<div className="library-message success">{success}</div>}{loading&&<div className="library-message">Ricerca nel catalogo…</div>}
 {!items.length&&!loading&&!error&&<div className="library-message">Scrivi il nome di una mod e premi Cerca.</div>}
 {!!items.length&&<div className="catalog-grid">{items.map(item=><article className="catalog-card" key={item.source+"-"+item.id}>{item.icon?<img src={item.icon} alt=""/>:<div className="catalog-placeholder"><Layers3/></div>}<div className="catalog-copy"><strong>{item.name}</strong><p>{item.summary}</p><small>{item.downloads?.toLocaleString("it-IT")||"—"} download · {item.source}</small><div className="catalog-actions"><a href={item.url} target="_blank" rel="noreferrer">Apri progetto <ExternalLink size={12}/></a>{source==="modrinth"&&<button className="text-btn" disabled={installing!==null} onClick={()=>void installProject(item)}>{installing===String(item.id)?"Installazione…":"Installa"}</button>}</div></div></article>)}</div>}
 <div className="mod-panel-note"><ShieldCheck size={14}/> Download Modrinth diretto nella cartella mods di Minecraft. Verifica che il profilo avviato usi la stessa versione e lo stesso loader.</div>{modsPath&&<div className="mod-panel-note">Cartella mods: {modsPath}</div>}{installed.length>0&&<div className="installed-list"><strong>Mod installate rilevate ({installed.length})</strong>{installed.map(file=><div className="installed-row" key={file}><span>{file}</span><button className="text-btn" onClick={()=>void invoke("remove_installed_mod",{filename:file,instancePath:localStorage.getItem("nova.activeInstance")}).then(async()=>{setInstalled(current=>current.filter(x=>x!==file));const active=localStorage.getItem("nova.activeInstance");if(active)setInstalled(await invoke<string[]>("list_installed_mods",{instancePath:active}));}).catch(e=>setError(String(e)))}>Rimuovi</button></div>)}</div>}</section></>;
}

function ModPanel({mods, filter, setFilter, search, setSearch, toggleMod, compact=false}: {mods:Mod[];filter:string;setFilter:(v:string)=>void;search:string;setSearch:(v:string)=>void;toggleMod:(id:string)=>void;compact?:boolean}) {
  return <div className={compact ? "mod-panel compact" : "mod-panel"}><div className="mod-toolbar"><div className="filter-tabs">{["All","Performance","HUD","Gameplay"].map(f=><button key={f} className={filter===f?"filter active":"filter"} onClick={()=>setFilter(f)}>{f}</button>)}</div><label className="search-box"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca una mod..."/></label></div><div className="mod-list">{mods.map(mod=><div className="mod-row" key={mod.id}><div className="mod-symbol">{mod.category==="Performance"?<Zap size={17}/>:mod.category==="HUD"?<Monitor size={17}/>:<Gamepad2 size={17}/>}</div><div className="mod-copy"><strong>{mod.name}</strong><p>{mod.description}</p></div><div className="mod-state"><span className={mod.enabled?"enabled-label":"disabled-label"}>{mod.enabled?"ON":"OFF"}</span><button className={mod.enabled?"toggle on":"toggle"} aria-label={mod.enabled?"Disattiva "+mod.name:"Attiva "+mod.name} aria-pressed={mod.enabled} onClick={()=>toggleMod(mod.id)}><span/></button></div></div>)}{mods.length===0&&<div className="empty-state">Nessuna mod trovata.</div>}</div><div className="mod-panel-note"><ShieldCheck size={14}/> Questi interruttori salvano solo le preferenze del pannello. Per installare o rimuovere mod reali usa la Libreria mod e seleziona prima l’istanza nel Launcher.</div></div>;
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
 <div className="mod-panel-note"><ShieldCheck size={14}/> Usa profilo applica versione, loader e RAM alla configurazione rapida. Nella sezione Launcher crea o seleziona un'istanza con la stessa versione e lo stesso loader.</div></section></>;
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
 const clear=()=>{try{localStorage.removeItem("nova.mods");localStorage.removeItem("nova.profiles");localStorage.removeItem("nova.servers");localStorage.removeItem("nova.version");localStorage.removeItem("nova.ram");localStorage.removeItem("nova.activeInstance");}catch{/* storage unavailable */}setConfirm(false);window.location.reload();};
 return <><div className="page-title"><div className="eyebrow">CLIENT PREFERENCES</div><h1>Imposta <em>NOVA</em></h1><p>Preferenze generali del launcher salvate su questo dispositivo.</p></div>
 <section className="library-panel"><div className="library-filters"><label className="settings-field">Versione predefinita<select value={version} onChange={e=>setVersion(e.target.value)}><option>1.21.4</option><option>1.21.1</option><option>1.20.1</option><option>1.19.4</option></select></label><label className="settings-field">RAM predefinita<select value={ram} onChange={e=>setRam(Number(e.target.value))}>{[2,4,6,8,12,16].map(n=><option key={n} value={n}>{n} GB</option>)}</select></label></div>
 <div className="mod-panel-note"><ShieldCheck size={14}/> La RAM predefinita viene applicata al prossimo avvio di Minecraft. La versione predefinita viene usata come selezione iniziale nella sezione Launcher. Le istanze e i relativi file restano separati dai dati locali del pannello.</div>
 <div className="installed-list"><strong>Dati locali NOVA</strong><p>Puoi cancellare preferenze mod, profili, server, versione e RAM salvati su questo dispositivo. La chiave API CurseForge non viene salvata.</p>{confirm?<div className="catalog-actions"><button className="text-btn" onClick={clear}>Conferma cancellazione</button><button className="text-btn" onClick={()=>setConfirm(false)}>Annulla</button></div>:<button className="text-btn" onClick={()=>setConfirm(true)}>Cancella dati locali</button>}</div></section></>;
}


export default App;
