// باندل دیپلوی سرور شخصی (0.232.0 — C-SRV-4).
//   node tools/make-bundle.mjs [--out path]   # پیش‌فرض: scratch/arg-server-bundle.zip
// خروجی همان چیدمان README سرور است: ریشه = بازی (index.html + game/ + ...) و
// server/ + tools/ کنارش. node_modules نیست (در VPS: npm install).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zipStore } from "./zip-store-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, ".."); // src/arg
const DEF_OUT = path.resolve(HERE, "..", "..", "..", "scratch", "arg-server-bundle.zip");

const TOP_README = [
  "Arg — self-host bundle (tools/make-bundle.mjs).",
  "",
  "  unzip arg-server-bundle.zip -d arg && cd arg/server",
  "  npm install        # only dependency: ws",
  "  node server.mjs    # http://<host>:8080/  (PORT=... to change)",
  "",
  "Layout: bundle root = game files (index.html + game/ + styles/ + assets/),",
  "server/ next to them (server.mjs + game-logic.js + package.json + README.md),",
  "tools/ (sync-server, desync-diff, make-bundle). Live state (server/data/) is",
  "NOT included — the server creates it fresh (restore your state.bin backup).",
  "Mirrors guaranteed by: node tools/sync-server.mjs --check",
  "",
].join("\n");

function walk(dir, base) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = base + "/" + e.name;
    if (e.isDirectory()) out.push(...walk(full, rel));
    else if (e.isFile()) out.push(rel);
  }
  return out.sort();
}

const files = [];
function addFile(rel) {
  const full = path.join(SRC, rel);
  if (!fs.existsSync(full)) { console.error("[bundle] skip missing: " + rel); return; }
  files.push({ name: rel, data: fs.readFileSync(full) });
}
addFile("index.html");
addFile("VERSION");
for (const d of ["game", "styles", "assets", "data"]) {
  const dir = path.join(SRC, d);
  if (!fs.existsSync(dir)) { console.error("[bundle] skip missing dir: " + d); continue; }
  for (const rel of walk(dir, d)) files.push({ name: rel, data: fs.readFileSync(path.join(SRC, rel)) });
}
for (const f of ["sw.js", "manifest.webmanifest", "server/server.mjs", "server/game-logic.js", "server/package.json", "server/README.md",
  "tools/sync-server-lib.mjs", "tools/sync-server.mjs", "tools/desync-lib.mjs",
  "tools/desync-diff.mjs", "tools/make-bundle.mjs", "tools/zip-store-lib.mjs"]) addFile(f);
files.push({ name: "README-SERVER.txt", data: new TextEncoder().encode(TOP_README) });

const zip = zipStore(files);
let total = 0;
for (const f of files) total += f.data.length;
const ai = process.argv.indexOf("--out");
const outPath = ai >= 0 && process.argv[ai + 1] ? path.resolve(process.argv[ai + 1]) : DEF_OUT;
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, zip);
console.log(`[bundle] ${files.length} files, ${total} bytes raw, ${zip.length} bytes zip -> ${outPath}`);
