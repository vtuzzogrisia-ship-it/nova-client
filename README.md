# NOVA CLIENT

<p align="center">
  <strong>Client & Launcher Desktop Minecraft Java ad Alte Prestazioni per Windows 10/11 x64</strong><br/>
  Ispirato all'esperienza di Lunar Client, completamente autonomo, con HUD in-game personalizzabile e avvio effettivo offline.
</p>

---

## 🌟 Caratteristiche Principali

### 1. Piattaforma & Architettura Desktop
- **Applicazione Desktop Autonoma:** Realizzata in **Tauri 2**, **React 19**, **TypeScript**, **Vite** e **Rust**. Non è una semplice mod da copiare in Minecraft: è un programma eseguibile indipendente.
- **Installer Windows:** Compilazione nativa e generazione di pacchetti installer Windows a 64 bit:
  - Installer NSIS eseguibile (`.exe`)
  - Pacchetto di installazione Windows Installer (`.msi`)
- **Nessun login Microsoft:** Profilo locale offline nativo, nessun account Microsoft richiesto.

### 2. Launcher Minecraft Completo
- **Installazione automatica:** Risoluzione dal version manifest ufficiale Mojang di client JAR, librerie native, asset e file di gioco.
- **Supporto Mod Loader:** Istanze dedicate e isolate per **Vanilla**, **Fabric**, **Quilt**, **Forge** e **NeoForge**.
- **Gestione Runtime Java:** Rilevamento automatico di `JAVA_HOME`, `PATH` e runtimes NOVA, con download integrato ad alta velocità di **Adoptium Temurin Java 8, 16, 17, 21 e 25**.
- **Avvio reale con memoria configurabile:** Selezione RAM (2, 4, 6, 8, 12, 16, 24, 32 GB) e monitoraggio in tempo reale del processo di gioco.
- **Riparazione e verifica dell'installazione:** Strumento integrato `Ripara / Reinstalla installazione` e `Verifica integrità file` per sanare installazioni danneggiate o file corrotti.
- **Diagnostica e log:** Visualizzatore log in tempo reale (`nova-game.log`), cattura codici di uscita ed errori di crash.

### 3. NOVA HUD in Gioco (Fabric 1.21.4)
Modulo HUD client nativo incluso e compilato automaticamente:
- **Contatore FPS:** visualizzazione in tempo reale degli FPS correnti con shadow e badge.
- **Contatore CPS:** calcolo click al secondo (LMB & RMB) con finestra mobile di 1000ms.
- **Keystrokes WASD:** visualizzazione interattiva dei tasti di movimento, salto (JUMP) e click del mouse.
- **Coordinate XYZ:** posizione esatta del giocatore nel mondo.
- **Toggle Sprint:** mantenimento automatico dello sprint durante la corsa (Tasto F10).
- **Menu interattivo con Right Shift:** premendo <kbd>RIGHT SHIFT</kbd> in gioco si apre il menu di configurazione dal vivo.
- **Personalizzazione completa:**
  - **Posizione:** In alto a sinistra, In alto a destra, In basso a sinistra, In basso a destra.
  - **Dimensione / Scala:** Compatto (85%), Normale (100%), Ingrandito (115%).
  - **Colori tema:** Viola NOVA, Ciano Neon, Verde Smeraldo, Arancio Solare, Bianco Glaciale.
  - **Trasparenza sfondo:** Trasparente (0%), Bassa (33%), Media (60%), Opaca (93%).
- **Salvataggio automatico:** tutte le preferenze sono memorizzate persistentemente in `config/nova-hud.properties`.

### 4. Gestione Istanze, Mod e Modpack
- **Directory isolate:** Ogni istanza mantiene cartelle `mods`, `resourcepacks`, `shaderpacks`, `config` e `saves` indipendenti.
- **Catalogo Modrinth:** Ricerca con filtri avanzati, download con risoluzione ricorsiva automatica delle dipendenze richieste e verifica hash SHA-1.
- **Catalogo CurseForge:** Ricerca e installazione diretta dei pacchetti compatibili tramite API Key di sessione.
- **Aggiornamento mod:** Controllo versioni disponibili e pulsante **"Aggiorna tutte le mod"** in batch.
- **Modpack `.mrpack`:** Importazione ed estrazione automatica dei file del modpack con gestione degli override.
- **Backup e Ripristino:** Creazione di snapshot completi dell'istanza e ripristino istantaneo.

### 5. Resource Pack & Shader
- **Gestione Resource Pack:** Importazione di archivi ZIP con attivazione e disattivazione selettiva.
- **Supporto Shader:** Installazione in un click di **Iris** e **Sodium** da Modrinth per le istanze compatibili (Fabric, Quilt, NeoForge).

### 6. NOVA Direct (Amici, Chat e Multiplayer)
- **Rete P2P senza server centrali:** Connessione diretta su porta TCP **47821**.
- **Profilo giocatore:** Rilevamento automatico dell'IP locale LAN via socket UDP.
- **Amici:** Invio e ricezione richieste con visualizzazione host e porta.
- **Chat in tempo reale:** Messaggistica istantanea con timestamp e cronologia locale.
- **Inviti Server:** Invito diretto a un server Minecraft con pulsante rapido per aggiungerlo ai preferiti.
- **Server List Ping:** Monitoraggio dello stato dei server Minecraft Java: latenza (ping ms), versione supportata, giocatori online e MOTD formattato.

---

## 🛠️ Requisiti & Compilazione

### Prerequisiti
- **OS:** Windows 10 / Windows 11 (64 bit)
- **Node.js:** Versione 20 o superiore
- **Rust:** Versione stable con target `x86_64-pc-windows-msvc`
- **JDK:** Java 21 (per la compilazione della mod HUD)

### Sviluppo locale
```powershell
# Installa le dipendenze
npm install

# Genera le icone dell'installer
node scripts/generate-icons.mjs

# Avvia l'interfaccia React in sviluppo
npm run dev

# Avvia l'applicazione desktop Tauri
npm run tauri dev
```

### Generazione Installer Windows (.exe e .msi)
```powershell
# Esegue la build completa con NSIS e MSI
npm run tauri -- build --target x86_64-pc-windows-msvc
```
Gli installer verranno generati in:
- `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/*.exe`
- `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/*.msi`

---

## ⌨️ Tasti Rapidi HUD in Gioco

| Tasto | Funzione |
|---|---|
| <kbd>RIGHT SHIFT</kbd> | Apri / Chiudi il menu di configurazione NOVA HUD |
| <kbd>F6</kbd> | Attiva / Disattiva contatore FPS |
| <kbd>F7</kbd> | Attiva / Disattiva contatore CPS (Left/Right) |
| <kbd>F8</kbd> | Attiva / Disattiva Keystrokes (WASD, Jump, LMB, RMB) |
| <kbd>F9</kbd> | Attiva / Disattiva Coordinate XYZ |
| <kbd>F10</kbd> | Attiva / Disattiva Toggle Sprint automatico |

---

## 📄 Licenza
Progetto sviluppato come client desktop autonomo per Minecraft Java Edition.
Minecraft è un marchio registrato di Mojang Studios / Microsoft. NOVA CLIENT non è affiliato con Mojang o Microsoft.
