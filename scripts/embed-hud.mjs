import { existsSync, readFileSync, writeFileSync } from "node:fs";

const jarPath = "nova-hud/build/libs/nova-hud-0.1.0.jar";
const outputPath = "src-tauri/resources/nova-hud.jar.b64";

if (!existsSync(jarPath)) {
  console.warn("Avviso: il file " + jarPath + " non è stato trovato. Verrà mantenuto il file incorporato esistente.");
  if (!existsSync(outputPath)) {
    // Write fallback placeholder jar
    writeFileSync(outputPath, Buffer.from("nova-hud-build-pending").toString("base64") + "\n");
  }
  process.exit(0);
}

const jar = readFileSync(jarPath);
if (jar[0] !== 0x50 || jar[1] !== 0x4b) {
  throw new Error("La build di NOVA HUD non ha prodotto un archivio JAR valido (firma PK mancante).");
}

writeFileSync(outputPath, jar.toString("base64") + "\n");
console.log("Embedded NOVA HUD JAR con successo (" + jar.length + " byte).");
