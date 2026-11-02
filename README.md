# NOVA CLIENT

**NOVA CLIENT is a standalone desktop application for Minecraft Java**, designed as a downloadable launcher/client in the same product category as Lunar Client. The user installs and opens NOVA on Windows, macOS or Linux; NOVA is not distributed as a Minecraft mod and must not require copying a NOVA JAR into a Minecraft `mods` folder.

## Current status

The repository now contains a Tauri 2 desktop launcher with a React interface and a Rust Minecraft launch engine. Desktop installer builds are configured for Windows, macOS and Linux through GitHub Actions. The launcher can install complete Minecraft profiles, prepare isolated instances, install Modrinth mods and `.mrpack` modpacks with dependency/hash handling, import/activate resource and shader packs, create/restore instance backups, inspect game logs, and start a local offline player session. The bundled Fabric HUD targets Minecraft 1.21.4. Java runtimes can be installed from the launcher; the in-game HUD is currently Fabric 1.21.4 only. Microsoft account login is intentionally excluded.

## Launcher implementation status

The desktop launcher now uses `mc-launcher-core` for complete vanilla/Fabric/Quilt/Forge/NeoForge profile installation, including client libraries, assets and native files, and for structured offline Java launch commands. Java discovery checks `JAVA_HOME`, `PATH` and NOVA-managed runtimes; Java 8, 16, 17, 21 and 25 can also be downloaded into NOVA runtime storage. Instances have separate mods, resource packs, shader packs, config and saves folders. Modrinth installs resolve required dependencies recursively and verify SHA-1 hashes. ZIP resource/shader packs can be imported and activated per instance; Iris and Sodium can be installed on demand for Fabric, Quilt or NeoForge shader support.

The bundled NOVA in-game HUD is a Fabric client mod targeting **Minecraft 1.21.4**. It renders FPS, CPS, keystrokes and coordinates in the actual game window, with an interactive Right Shift settings screen and F6-F9 display toggles. The desktop build compiles and embeds this JAR automatically. The HUD is not currently bundled for other Minecraft versions or Quilt/Forge/NeoForge. Modrinth `.mrpack` imports require an existing instance with the matching Minecraft version and loader.

Offline launch uses a local player name and does not authenticate to premium online-mode servers. Microsoft sign-in is intentionally excluded. Java 8, 16, 17, 21 and 25 can be installed into NOVA runtime storage and selected for launch. A compatible runtime is required for each Minecraft version.

## Development

Install dependencies with `npm install`, then run `npm run dev` for the Vite development server. Use `npm run tauri dev` to launch the desktop shell when the Rust toolchain and platform prerequisites are installed. To build the bundled NOVA HUD as part of a desktop release, install JDK 21 and Gradle 8.11.1; the desktop workflow builds and embeds the HUD JAR automatically.

## Product direction

- Standalone desktop installer and launcher
- Minecraft Java version installation, profiles and local/offline player profiles
- Built-in mod/modpack manager (managed by NOVA; users do not install NOVA itself as a mod)
- Multiplayer server status and latency tools
- Performance options and client settings
- Integrated in-game HUD and Right Shift mod menu
- Resource packs, shaders, server tools and social features

The build workflow produces desktop application bundles only. Features are marked complete only after implementation and testing.
