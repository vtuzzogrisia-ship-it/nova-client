import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { UserPlus, Users, MessageCircle, Server, Send, ShieldCheck, Check, X, RefreshCw } from "lucide-react";
import { NovaFriend, NovaFriendRequest, NovaDirectMessage, NovaInvite, NovaSocialPacket } from "../types";

const NOVA_SOCIAL_PORT = 47821;

const readLocal = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const saveLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const newSocialId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2);

export const FriendsChat: React.FC = () => {
  const [selfName, setSelfName] = useState(() => localStorage.getItem("nova.playerName") || "Player");
  const [selfHost, setSelfHost] = useState(() => localStorage.getItem("nova.socialHost") || "");
  const [friends, setFriends] = useState<NovaFriend[]>(() => readLocal("nova.friends", []));
  const [requests, setRequests] = useState<NovaFriendRequest[]>(() => readLocal("nova.friendRequests", []));
  const [messages, setMessages] = useState<NovaDirectMessage[]>(() => readLocal("nova.messages", []));
  const [invites, setInvites] = useState<NovaInvite[]>(() => readLocal("nova.serverInvites", []));
  const [selectedId, setSelectedId] = useState("");
  const [friendHost, setFriendHost] = useState("");
  const [friendPort, setFriendPort] = useState(String(NOVA_SOCIAL_PORT));
  const [draft, setDraft] = useState("");
  const [serverName, setServerName] = useState("");
  const [serverAddress, setServerAddress] = useState("");
  const [status, setStatus] = useState("Inizializzazione rete P2P NOVA Direct…");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const selected = friends.find((friend) => friend.id === selectedId) || friends[0];

  useEffect(() => {
    saveLocal("nova.friends", friends);
  }, [friends]);
  useEffect(() => {
    saveLocal("nova.friendRequests", requests);
  }, [requests]);
  useEffect(() => {
    saveLocal("nova.messages", messages.slice(-500));
  }, [messages]);
  useEffect(() => {
    saveLocal("nova.serverInvites", invites.slice(-100));
  }, [invites]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<NovaSocialPacket>("nova-social-packet", (event) => {
      const packet = event.payload;
      if (!packet.senderId || packet.senderId === localStorage.getItem("nova.socialId")) return;
      if (packet.kind === "friend_request") {
        const request: NovaFriendRequest = {
          senderId: packet.senderId,
          senderName: packet.senderName,
          senderHost: packet.senderHost || "",
          senderPort: packet.senderPort || NOVA_SOCIAL_PORT,
        };
        setRequests((items) => (items.some((x) => x.senderId === request.senderId) ? items : [...items, request]));
        setStatus(`Nuova richiesta di amicizia ricevuta da ${request.senderName}`);
      } else if (packet.kind === "friend_accept") {
        if (!packet.senderHost) return;
        const friend: NovaFriend = {
          id: packet.senderId,
          name: packet.senderName,
          host: packet.senderHost,
          port: packet.senderPort || NOVA_SOCIAL_PORT,
        };
        setFriends((items) =>
          items.some((x) => x.id === friend.id) ? items.map((x) => (x.id === friend.id ? friend : x)) : [...items, friend]
        );
        setStatus(`${friend.name} ha accettato la tua richiesta di amicizia!`);
      } else if (packet.kind === "chat") {
        const friend = friends.find((x) => x.id === packet.senderId);
        if (!friend || !packet.text) return;
        setMessages((items) => [
          ...items,
          {
            id: newSocialId(),
            friendId: friend.id,
            senderId: packet.senderId,
            senderName: packet.senderName,
            text: packet.text!,
            createdAt: packet.createdAt || Date.now(),
            outgoing: false,
          },
        ]);
      } else if (packet.kind === "server_invite") {
        const invite: NovaInvite = {
          id: newSocialId(),
          senderId: packet.senderId,
          senderName: packet.senderName,
          serverName: packet.serverName || "Server Minecraft",
          serverAddress: packet.serverAddress || "",
          createdAt: packet.createdAt || Date.now(),
        };
        setInvites((items) => [invite, ...items].slice(0, 100));
        setStatus(`Invito per unirti a "${invite.serverName}" ricevuto da ${packet.senderName}`);
      }
    })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch((error) => setStatus("Listener NOVA Direct: " + String(error)));

    void invoke<number>("start_social_listener", { port: NOVA_SOCIAL_PORT })
      .then(() => {
        if (!disposed) setStatus("Rete NOVA Direct attiva · In ascolto sulla porta TCP " + NOVA_SOCIAL_PORT);
      })
      .catch((error) => {
        if (!disposed) setStatus(String(error));
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [friends]);

  useEffect(() => {
    if (!selectedId && friends[0]) setSelectedId(friends[0].id);
  }, [friends, selectedId]);

  const ensureIdentity = () => {
    const name = selfName.trim();
    if (name.length < 3 || name.length > 16 || !/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error("Il nome giocatore deve contenere da 3 a 16 caratteri alfanumerici o underscore.");
    }
    if (!selfHost.trim()) {
      throw new Error("Rileva il tuo IP LAN o inserisci il tuo hostname raggiungibile.");
    }
    localStorage.setItem("nova.playerName", name);
    localStorage.setItem("nova.socialHost", selfHost.trim());
    let id = localStorage.getItem("nova.socialId");
    if (!id) {
      id = newSocialId();
      localStorage.setItem("nova.socialId", id);
    }
    return { name, id, host: selfHost.trim() };
  };

  const sendPacket = async (host: string, port: number, packet: NovaSocialPacket) => {
    await invoke("send_social_packet", { host, port, packet });
  };

  const sendRequest = async () => {
    setBusy(true);
    try {
      const me = ensureIdentity();
      const host = friendHost.trim();
      const port = Number(friendPort);
      if (!host || host.length > 255 || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("Inserisci un indirizzo IP valido e una porta compresa tra 1 e 65535.");
      }
      const packet: NovaSocialPacket = {
        kind: "friend_request",
        senderId: me.id,
        senderName: me.name,
        senderHost: me.host,
        senderPort: NOVA_SOCIAL_PORT,
        createdAt: Date.now(),
      };
      await sendPacket(host, port, packet);
      setStatus(`Richiesta inviata a ${host}:${port}. In attesa che l'amico accetti.`);
      setFriendHost("");
      setShowAdd(false);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const acceptRequest = async (request: NovaFriendRequest) => {
    setBusy(true);
    try {
      const me = ensureIdentity();
      const packet: NovaSocialPacket = {
        kind: "friend_accept",
        senderId: me.id,
        senderName: me.name,
        senderHost: me.host,
        senderPort: NOVA_SOCIAL_PORT,
        createdAt: Date.now(),
      };
      await sendPacket(request.senderHost, request.senderPort, packet);
      setFriends((items) =>
        items.some((x) => x.id === request.senderId)
          ? items
          : [...items, { id: request.senderId, name: request.senderName, host: request.senderHost, port: request.senderPort }]
      );
      setRequests((items) => items.filter((x) => x.senderId !== request.senderId));
      setSelectedId(request.senderId);
      setStatus("Amicizia stretta con " + request.senderName);
    } catch (error) {
      setStatus("Accettazione fallita: " + String(error));
    } finally {
      setBusy(false);
    }
  };

  const declineRequest = (senderId: string) => {
    setRequests((items) => items.filter((x) => x.senderId !== senderId));
  };

  const sendMessage = async () => {
    if (!selected || !draft.trim()) return;
    setBusy(true);
    try {
      const me = ensureIdentity();
      const text = draft.trim();
      const item: NovaDirectMessage = {
        id: newSocialId(),
        friendId: selected.id,
        senderId: me.id,
        senderName: me.name,
        text,
        createdAt: Date.now(),
        outgoing: true,
      };
      await sendPacket(selected.host, selected.port, {
        kind: "chat",
        senderId: me.id,
        senderName: me.name,
        senderHost: me.host,
        senderPort: NOVA_SOCIAL_PORT,
        text,
        createdAt: item.createdAt,
      });
      setMessages((items) => [...items, item]);
      setDraft("");
      setStatus("Messaggio recapitato.");
    } catch (error) {
      setStatus("Invio messaggio non riuscito: " + String(error));
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    if (!selected || !serverAddress.trim()) return;
    setBusy(true);
    try {
      const me = ensureIdentity();
      await sendPacket(selected.host, selected.port, {
        kind: "server_invite",
        senderId: me.id,
        senderName: me.name,
        senderHost: me.host,
        senderPort: NOVA_SOCIAL_PORT,
        serverName: serverName.trim() || "Server Minecraft",
        serverAddress: serverAddress.trim(),
        createdAt: Date.now(),
      });
      setStatus(`Invito per ${serverName.trim() || serverAddress.trim()} inviato a ${selected.name}`);
      setServerName("");
      setServerAddress("");
    } catch (error) {
      setStatus("Invito non recapitato: " + String(error));
    } finally {
      setBusy(false);
    }
  };

  const acceptInvite = (invite: NovaInvite) => {
    const current = readLocal<{ id: string; name: string; address: string }[]>("nova.servers", []);
    if (!current.some((x) => x.address === invite.serverAddress)) {
      saveLocal("nova.servers", [...current, { id: newSocialId(), name: invite.serverName, address: invite.serverAddress }]);
    }
    setInvites((items) => items.filter((x) => x.id !== invite.id));
    setStatus(`Server "${invite.serverName}" aggiunto ai preferiti: ${invite.serverAddress}`);
  };

  const visibleMessages = messages.filter((item) => selected && item.friendId === selected.id);

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">NOVA DIRECT P2P</div>
        <h1>
          Amici e <em>chat</em>
        </h1>
        <p>Rete P2P ad alta velocità: scambia richieste di amicizia, messaggi diretti e inviti ai server Minecraft senza intermediari.</p>
      </div>

      <section className="social-setup">
        <div className="social-identity">
          <div>
            <strong>Il tuo profilo NOVA</strong>
            <small>Identità locale visibile agli amici su rete LAN o internet</small>
          </div>
          <div className="social-identity-fields">
            <input
              value={selfName}
              onChange={(e) => setSelfName(e.target.value)}
              placeholder="Nome giocatore"
              maxLength={16}
            />
            <input
              value={selfHost}
              onChange={(e) => setSelfHost(e.target.value)}
              placeholder="IP LAN o hostname (es. 192.168.1.100)"
            />
            <button
              className="text-btn"
              onClick={() =>
                void invoke<string>("detect_local_network_address")
                  .then((ip) => {
                    setSelfHost(ip);
                    setStatus("IP locale rilevato: " + ip);
                  })
                  .catch((err) => setStatus(String(err)))
              }
            >
              <RefreshCw size={12} /> Rileva IP LAN
            </button>
            <button
              className="primary-btn small-btn"
              onClick={() => {
                try {
                  ensureIdentity();
                  setStatus(`Profilo salvato. Porta di ascolto TCP: ${NOVA_SOCIAL_PORT}`);
                } catch (e) {
                  setStatus(String(e));
                }
              }}
            >
              Salva profilo
            </button>
          </div>
          <small className="hint-text">
            Porta TCP: {NOVA_SOCIAL_PORT} · Per giocare via internet basta aprire o inoltrare la porta 47821 nel router verso il tuo PC.
          </small>
        </div>
        <div className="social-status">
          <span className="social-live-dot" />
          {status}
        </div>
      </section>

      <div className="social-grid">
        {/* LISTA AMICI */}
        <section className="social-card social-friends">
          <div className="social-card-head">
            <strong>Amici ({friends.length})</strong>
            <button className="text-btn" onClick={() => setShowAdd((v) => !v)}>
              <UserPlus size={14} /> Aggiungi
            </button>
          </div>

          {showAdd && (
            <div className="friend-add">
              <input
                value={friendHost}
                onChange={(e) => setFriendHost(e.target.value)}
                placeholder="Indirizzo IP dell'amico"
              />
              <input
                value={friendPort}
                onChange={(e) => setFriendPort(e.target.value)}
                inputMode="numeric"
                placeholder="Porta (47821)"
              />
              <button className="primary-btn" disabled={busy} onClick={() => void sendRequest()}>
                Invia richiesta
              </button>
            </div>
          )}

          {requests.length > 0 && (
            <div className="friend-requests">
              <strong>Richieste in arrivo ({requests.length})</strong>
              {requests.map((req) => (
                <div className="friend-list-row" key={req.senderId}>
                  <span>
                    <b>{req.senderName}</b>
                    <small>
                      {req.senderHost}:{req.senderPort}
                    </small>
                  </span>
                  <div className="row-btn-group">
                    <button className="text-btn highlight-btn" disabled={busy} onClick={() => void acceptRequest(req)}>
                      <Check size={12} /> Accetta
                    </button>
                    <button className="text-btn danger-hover" disabled={busy} onClick={() => declineRequest(req.senderId)}>
                      <X size={12} /> Rifiuta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {friends.length === 0 ? (
            <div className="social-empty">
              <Users size={25} />
              <p>Nessun amico aggiunto.</p>
              <small>Premi "Aggiungi" per connetterti all'indirizzo IP di un amico su NOVA.</small>
            </div>
          ) : (
            friends.map((friend) => (
              <button
                className={selected?.id === friend.id ? "friend-list-row selected" : "friend-list-row"}
                key={friend.id}
                onClick={() => setSelectedId(friend.id)}
              >
                <span>
                  <b>{friend.name}</b>
                  <small>
                    {friend.host}:{friend.port}
                  </small>
                </span>
                <MessageCircle size={15} />
              </button>
            ))
          )}
        </section>

        {/* CHAT DIRETTA */}
        <section className="social-card social-chat">
          <div className="social-card-head">
            <strong>{selected ? selected.name : "Chat Diretta"}</strong>
            {selected && (
              <span className="social-subtle">
                {selected.host}:{selected.port}
              </span>
            )}
          </div>

          <div className="chat-history">
            {!selected ? (
              <div className="social-empty">
                <MessageCircle size={24} />
                <p>Seleziona un amico per avviare la conversazione.</p>
              </div>
            ) : visibleMessages.length === 0 ? (
              <div className="social-empty">
                <MessageCircle size={24} />
                <p>Nessun messaggio ancora con {selected.name}.</p>
                <small>Tutti i messaggi sono scambiati in tempo reale direttamente tra i due dispositivi.</small>
              </div>
            ) : (
              visibleMessages.map((message) => (
                <div className={message.outgoing ? "chat-message outgoing" : "chat-message"} key={message.id}>
                  <small>
                    {message.outgoing ? "Tu" : message.senderName} · {new Date(message.createdAt).toLocaleTimeString()}
                  </small>
                  <p>{message.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="chat-compose">
            <input
              maxLength={2000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendMessage();
              }}
              placeholder={selected ? `Scrivi un messaggio a ${selected.name}…` : "Seleziona prima un amico"}
              disabled={!selected || busy}
            />
            <button className="primary-btn" disabled={!selected || !draft.trim() || busy} onClick={() => void sendMessage()}>
              <Send size={15} /> Invia
            </button>
          </div>

          {selected && (
            <div className="friend-invite-form">
              <div className="social-card-head">
                <strong>Invita al server Minecraft</strong>
                <Server size={15} />
              </div>
              <div className="invite-inputs">
                <input
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="Nome server (es. Hypixel, Survival LAN)"
                />
                <input
                  value={serverAddress}
                  onChange={(e) => setServerAddress(e.target.value)}
                  placeholder="play.example.net:25565"
                />
                <button
                  className="primary-btn small-btn"
                  disabled={busy || !serverAddress.trim()}
                  onClick={() => void sendInvite()}
                >
                  Invia invito
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {invites.length > 0 && (
        <section className="social-card social-invites">
          <div className="social-card-head">
            <strong>Inviti a server ricevuti ({invites.length})</strong>
          </div>
          {invites.map((invite) => (
            <div className="friend-list-row" key={invite.id}>
              <span>
                <b>{invite.serverName}</b>
                <small>
                  Inviato da {invite.senderName} · <code>{invite.serverAddress}</code>
                </small>
              </span>
              <button className="primary-btn small-btn" onClick={() => acceptInvite(invite)}>
                Aggiungi ai server preferiti
              </button>
            </div>
          ))}
        </section>
      )}

      <div className="social-note">
        <ShieldCheck size={14} />
        <strong>Connessione diretta peer-to-peer</strong>
        <p>
          NOVA Direct comunica direttamente tramite socket TCP. Nessun server di terze parti legge i tuoi messaggi né memorizza la tua cronologia, garantendo massima privacy e velocità istantanea.
        </p>
      </div>
    </>
  );
};
