#!/usr/bin/env node
// Terrain + decor generator for Arg — procedural pixel tiles in the plateau palette
// (sand earth, turquoise oasis water, warm rock). Deterministic, no dependencies.
//   node tools/gen-tiles.mjs
// Writes assets/terrain/*.png, assets/environment/*.png and the inline sheets
// game/tiles.gen.js + game/decor.gen.js. Tile keys keep their historical names
// ("grass-N" = buildable ground) because render.js and saves refer to them.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------- tiny PNG encoder (RGBA8) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- drawing helpers ----------
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
function canvas(w, h) {
  const px = Buffer.alloc(w * h * 4);
  const set = (x, y, c, a = 255) => {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4, sa = a / 255, da = px[i + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    for (let k = 0; k < 3; k++) px[i + k] = Math.max(0, Math.min(255, Math.round((c[k] * sa + px[i + k] * da * (1 - sa)) / oa)));
    px[i + 3] = Math.round(oa * 255);
  };
  return { w, h, px, set, alpha: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : px[((y | 0) * w + (x | 0)) * 4 + 3]) };
}
// smooth value noise in [0,1]
function noise2(seed) {
  const g = new Map();
  const at = (x, y) => { const k = x * 7919 + y * 104729 + seed; let v = g.get(k); if (v === undefined) { v = rng(k)(); g.set(k, v); } return v; };
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

const TW = 72, TH = 36;
// inside the iso diamond (slightly over-filled so neighbours leave no seams)
const inDiamond = (x, y) => Math.abs(x + 0.5 - TW / 2) / (TW / 2) + Math.abs(y + 0.5 - TH / 2) / (TH / 2) <= 1.04;

function ground(variant) {
  const cv = canvas(TW, TH), r = rng(100 + variant * 17), n = noise2(900 + variant * 31), n2 = noise2(40 + variant);
  const bases = ["#cba66c", "#c69f65", "#d0ab72", "#c8a268", "#d6b680", "#bfa062"];
  const base = hex(bases[variant]), dark = hex("#a8844f"), light = hex("#e2c692");
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    if (!inDiamond(x, y)) continue;
    const v = n(x / 9, y / 5) * 0.65 + n2(x / 3, y / 2) * 0.35;
    let c = v < 0.5 ? mix(dark, base, v * 2) : mix(base, light, (v - 0.5) * 1.3);
    if (r() < 0.05) c = shade(c, 0.9 + r() * 0.22); // grain
    cv.set(x, y, c);
  }
  const dot = (x, y, c, a) => { if (inDiamond(x, y)) cv.set(x, y, c, a); };
  if (variant < 4) { // pebbles
    for (let i = 0; i < 3 + variant; i++) { const x = 8 + r() * 56, y = 5 + r() * 26; dot(x, y, hex("#8f7448"), 200); dot(x + 1, y, hex("#e8d3a4"), 150); }
  }
  if (variant === 4) { // dry cracked salt pan
    for (let i = 0; i < 5; i++) { let x = 14 + r() * 44, y = 8 + r() * 20; for (let k = 0; k < 9; k++) { dot(x, y, hex("#9a7c4c"), 150); x += r() < 0.5 ? 1 : -1; y += r() < 0.6 ? 0.5 : -0.3; } }
    for (let i = 0; i < 14; i++) dot(10 + r() * 52, 6 + r() * 24, hex("#f1e2bd"), 150);
  }
  if (variant === 5 || variant === 2) { // scrub tufts
    const tufts = variant === 5 ? 5 : 2;
    for (let i = 0; i < tufts; i++) {
      const x = 14 + r() * 44, y = 9 + r() * 18, g = hex(r() < 0.5 ? "#7d8a4a" : "#93974f");
      for (let k = -2; k <= 2; k++) { dot(x + k, y - Math.abs(k) + 2, g, 230); dot(x + k, y - Math.abs(k) + 1, shade(g, 1.15), 200); }
      dot(x, y - 1, shade(g, 0.8), 230); dot(x - 1, y + 3, hex("#8f7448"), 110); dot(x + 1, y + 3, hex("#8f7448"), 110);
    }
  }
  return cv;
}

function water(frame) {
  const cv = canvas(TW, TH), n = noise2(500);
  const deep = hex("#1c8c96"), mid = hex("#2aa6ab"), hi = hex("#8fe0dc");
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    if (!inDiamond(x, y)) continue;
    const v = n(x / 10 + frame * 0.35, y / 4 + frame * 0.2);
    cv.set(x, y, mix(deep, mid, v));
    const wave = Math.sin((x + frame * 9) / 5.5 + y * 0.9 + n(x / 6, y / 3) * 4);
    if (wave > 0.93 && (y + frame) % 3 === 0) cv.set(x, y, hi, 170);
  }
  return cv;
}

function rock(variant) {
  const cv = canvas(TW, TH), r = rng(700 + variant * 13), n = noise2(300 + variant * 7);
  const a = hex("#9c8a76"), b = hex("#7f705f"), c2 = hex("#b9a892");
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    if (!inDiamond(x, y)) continue;
    const v = n(x / 7, y / 3.5);
    const cell = Math.floor(n(x / 11 + 9, y / 6 + 3) * 4) / 4; // faceted plates
    cv.set(x, y, mix(mix(b, a, v), c2, cell * 0.5));
  }
  for (let i = 0; i < 4; i++) { // cracks
    let x = 14 + r() * 44, y = 8 + r() * 20;
    for (let k = 0; k < 10; k++) { if (inDiamond(x, y)) { cv.set(x, y, hex("#4f4438"), 170); cv.set(x, y - 1, hex("#d6c8b2"), 90); } x += r() < 0.6 ? 1 : -0.5; y += r() < 0.5 ? 0.5 : -0.5; }
  }
  return cv;
}

function boulder(variant) {
  const w = 44, h = 40, cv = canvas(w, h), r = rng(50 + variant), n = noise2(60 + variant);
  const blobs = variant === 0 ? [[22, 27, 14, 10], [13, 31, 7, 5]] : [[17, 29, 10, 8], [29, 26, 11, 10], [24, 33, 6, 4]];
  for (const [cx, cy, rx, ry] of blobs) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (d > 1) continue;
      const lit = 0.72 + 0.5 * Math.max(0, (-x / rx) * 0.45 + (-y / ry) * 0.75) + (n((cx + x) / 4, (cy + y) / 4) - 0.5) * 0.2;
      cv.set(cx + x, cy + y, shade(hex("#a39280"), d > 0.82 ? 0.55 : lit));
    }
  }
  for (let i = 0; i < 6; i++) { const x = 8 + r() * 28, y = 22 + r() * 12; if (cv.alpha(x, y)) cv.set(x, y, hex("#5a4d40"), 140); }
  return cv;
}

function reeds(variant) {
  const w = 24, h = 40, cv = canvas(w, h), r = rng(80 + variant);
  const n = variant === 0 ? 5 : 7;
  for (let i = 0; i < n; i++) {
    const bx = 5 + r() * 14, top = 6 + r() * 12, lean = (r() - 0.5) * 6, g = hex(r() < 0.5 ? "#5f8f4e" : "#7aa05a");
    for (let y = 36; y >= top; y--) { const t = (36 - y) / (36 - top); cv.set(bx + lean * t * t, y, shade(g, 0.8 + t * 0.35)); }
    if (r() < 0.6) for (let k = 0; k < 4; k++) cv.set(bx + lean, top - 1 + k, hex("#7a5a36"));
  }
  return cv;
}

// ---------- write ----------
function emit(dir, name, cv) {
  const buf = png(cv.w, cv.h, cv.px);
  fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
  fs.writeFileSync(path.join(ROOT, dir, name + ".png"), buf);
  return [name, "data:image/png;base64," + buf.toString("base64")];
}
const tiles = [];
for (let i = 0; i < 6; i++) tiles.push(emit("assets/terrain", "grass-" + i, ground(i)));
for (let i = 0; i < 2; i++) tiles.push(emit("assets/terrain", "water-" + i, water(i)));
for (let i = 0; i < 3; i++) tiles.push(emit("assets/terrain", "rock-" + i, rock(i)));
const decor = [];
for (let i = 0; i < 2; i++) decor.push(emit("assets/environment", "boulder-" + i, boulder(i)));
for (let i = 0; i < 2; i++) decor.push(emit("assets/environment", "reeds-" + i, reeds(i)));

const sheet = (name, rows, src) => `// GENERATED — do not edit by hand. Source: ${src}\n// Rebuild: node tools/gen-tiles.mjs\nexport const ${name} = {\n` + rows.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n") + "\n};\n";
fs.writeFileSync(path.join(ROOT, "game/tiles.gen.js"), sheet("TILE_DATA", tiles, "assets/terrain/*.png"));
fs.writeFileSync(path.join(ROOT, "game/decor.gen.js"), sheet("DECOR_DATA", decor, "assets/environment/*.png"));
console.log("tiles:", tiles.length, "decor:", decor.length);
