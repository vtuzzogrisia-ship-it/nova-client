# NOVA Fabric companion mod

This is the first in-game NOVA menu prototype for **Minecraft Java 1.21.4 + Fabric** (Java 21).

## Build

From this directory, run:

```sh
gradle build
```

The remapped mod JAR is generated in `build/libs/`.

## Install

1. Install Fabric Loader for Minecraft 1.21.4 and make sure Fabric API is present.
2. Copy the NOVA JAR from `build/libs/` into the instance's `mods` folder.
3. Start Minecraft with the Fabric 1.21.4 profile.
4. Press **Right Shift** to open or close the NOVA menu.

The current screen is a UI prototype. It stores the five module toggles in memory for the current game session; the CPS, keystrokes, FPS, coordinates and sprint features are not yet connected to live game data or gameplay behavior. The desktop launcher's own Right Shift shortcut works only while its window is focused.
