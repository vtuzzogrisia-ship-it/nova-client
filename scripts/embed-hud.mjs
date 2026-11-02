import { readFileSync, writeFileSync } from "node:fs";

const jarPath = "nova-hud/build/libs/nova-hud-0.1.0.jar";
const outputPath = "src-tauri/resources/nova-hud.jar.b64";
const jar = readFileSync(jarPath);
if (jar[0] !== 0x50 || jar[1] !== 0x4b) {
  throw new Error("The NOVA HUD build did not produce a valid JAR archive.");
}
writeFileSync(outputPath, jar.toString("base64") + "\n");
console.log("Embedded NOVA HUD JAR (" + jar.length + " bytes).");
