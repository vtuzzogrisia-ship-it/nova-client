# NOVA CLIENT

**NOVA CLIENT is a standalone desktop application for Minecraft Java**, designed as a downloadable launcher/client in the same product category as Lunar Client. The user installs and opens NOVA on Windows, macOS or Linux; NOVA is not distributed as a Minecraft mod and must not require copying a NOVA JAR into a Minecraft `mods` folder.

## Current status

The repository currently contains the first Tauri 2 desktop-shell and React interface prototype. The downloadable desktop installer is being built through GitHub Actions.

This is not yet a complete Lunar-equivalent launcher. Minecraft version installation, Microsoft account authentication, launching and managing game instances, persistent mod configuration, and a true in-game HUD/overlay still require implementation and testing. The desktop UI preview is not evidence that those systems are already working.

## Configurazione login Microsoft

Segui [la guida di registrazione Microsoft](docs/MICROSOFT-AUTH.md) e passa a NOVA soltanto l'Application (client) ID. Non condividere password, token o client secret.

## Development

Install dependencies with `npm install`, then run `npm run dev` for the Vite development server. Use `npm run tauri dev` to launch the desktop shell when the Rust toolchain and platform prerequisites are installed.

## Product direction

- Standalone desktop installer and launcher
- Minecraft Java version installation, profiles and Microsoft authentication
- Built-in mod/modpack manager (managed by NOVA; users do not install NOVA itself as a mod)
- Performance options and client settings
- Integrated in-game HUD and Right Shift mod menu
- Resource packs, shaders, server tools and social features

The build workflow produces desktop application bundles only. Features are marked complete only after implementation and testing.
