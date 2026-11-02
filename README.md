# NOVA CLIENT

**NOVA CLIENT is a standalone desktop application for Minecraft Java**, designed as a downloadable launcher/client in the same product category as Lunar Client. The user installs and opens NOVA on Windows, macOS or Linux; NOVA is not distributed as a Minecraft mod and must not require copying a NOVA JAR into a Minecraft `mods` folder.

## Current status

The repository currently contains the first Tauri 2 desktop-shell and React interface prototype. The downloadable desktop installer is being built through GitHub Actions.

This is not yet a complete Lunar-equivalent launcher. Minecraft version installation, offline/local profile launching, managed game instances, dependency-aware mod installation, and a true in-game HUD/overlay still require implementation and testing. The server list now includes a Java Edition status ping with latency, version and player counts. Microsoft account login is intentionally excluded. Modrinth project downloads can now be installed into the default Minecraft mods folder from the desktop app. The desktop UI preview is not evidence that those systems are already working.

## Launcher implementation status

The desktop launcher now uses `mc-launcher-core` for complete vanilla/Fabric/Quilt/Forge/NeoForge profile installation, including client libraries, assets and native files, and for structured offline Java launch commands. Java discovery is available through `JAVA_HOME` and `PATH`. Instances have separate mods, resource packs, shader packs, config and saves folders. Modrinth installs resolve required dependencies recursively and verify SHA-1 hashes. ZIP resource/shader packs can be imported and activated per instance; Fabric instances also install Iris and Sodium to support shader packs.

The bundled NOVA in-game HUD is a separate Fabric mod targeting **Minecraft 1.21.4**. It renders FPS, CPS, keystrokes and coordinates in the actual game window, with a Right Shift menu and F6-F9 display toggles. The desktop build compiles and embeds this JAR automatically. The HUD is not currently bundled for other Minecraft versions or Forge/NeoForge.

Offline launch uses a local player name and does not authenticate to premium online-mode servers. Microsoft sign-in is intentionally excluded. Java runtime discovery is implemented, but NOVA does not yet download and manage Java runtimes automatically. A Java installation compatible with the selected Minecraft version is required.

## Development

Install dependencies with `npm install`, then run `npm run dev` for the Vite development server. Use `npm run tauri dev` to launch the desktop shell when the Rust toolchain and platform prerequisites are installed.

## Product direction

- Standalone desktop installer and launcher
- Minecraft Java version installation, profiles and local/offline player profiles
- Built-in mod/modpack manager (managed by NOVA; users do not install NOVA itself as a mod)
- Multiplayer server status and latency tools
- Performance options and client settings
- Integrated in-game HUD and Right Shift mod menu
- Resource packs, shaders, server tools and social features

The build workflow produces desktop application bundles only. Features are marked complete only after implementation and testing.
