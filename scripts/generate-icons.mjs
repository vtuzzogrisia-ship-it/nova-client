import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const size = 256;
const rgba = Buffer.alloc(size * size * 4);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const edge = x < 10 || y < 10 || x >= size - 10 || y >= size - 10;
    rgba[i] = edge ? 10 : 20;
    rgba[i + 1] = edge ? 8 : 12;
    rgba[i + 2] = edge ? 28 : 52;
    rgba[i + 3] = 255;
  }
}
// A clean, geometric white N mark.
for (let y = 56; y < 200; y++) {
  for (let x = 60; x < 196; x++) {
    const left = x >= 60 && x < 88;
    const right = x >= 168 && x < 196;
    const diagX = 88 + ((y - 56) * 80) / 144;
    const diagonal = Math.abs(x - diagX) < 13;
    if (left || right || diagonal) {
      const i = (y * size + x) * 4;
      rgba[i] = 245; rgba[i + 1] = 242; rgba[i + 2] = 255; rgba[i + 3] = 255;
    }
  }
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
const rows = [];
for (let y = 0; y < size; y++) {
  const row = Buffer.alloc(1 + size * 4);
  rgba.copy(row, 1, y * size * 4, (y + 1) * size * 4);
  rows.push(row);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
header[8] = 8; header[9] = 6;
const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk("IHDR", header),
  chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
  chunk("IEND", Buffer.alloc(0))
]);
const dir = path.join("src-tauri", "icons");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "icon.png"), png);
const icoHeader = Buffer.alloc(6); icoHeader.writeUInt16LE(0,0); icoHeader.writeUInt16LE(1,2); icoHeader.writeUInt16LE(1,4);
const entry = Buffer.alloc(16); entry[0]=0; entry[1]=0; entry[2]=0; entry[3]=0; entry.writeUInt16LE(1,4); entry.writeUInt16LE(32,6); entry.writeUInt32LE(png.length,8); entry.writeUInt32LE(22,12);
fs.writeFileSync(path.join(dir, "icon.ico"), Buffer.concat([icoHeader, entry, png]));
const icnsChunk = Buffer.concat([Buffer.from("icp6"), Buffer.alloc(4), png]);
icnsChunk.writeUInt32BE(icnsChunk.length, 4);
const icns = Buffer.concat([Buffer.from("icns"), Buffer.alloc(4), icnsChunk]);
icns.writeUInt32BE(icns.length, 4);
fs.writeFileSync(path.join(dir, "icon.icns"), icns);
console.log("Generated NOVA CLIENT PNG, ICO and ICNS icons.");
