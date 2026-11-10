// بازسازی آینه‌های سرور از منبع حقیقت (0.231.0 — C-SRV-3).
//   node tools/sync-server.mjs          # بازنویسی game-logic.js + ریشه index.html
//   node tools/sync-server.mjs --check  # فقط مقایسه (برای CI)؛ واگرایی = خروج ۱
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractBlock, buildGameLogic, buildRootDoc, checkMirrors } from "./sync-server-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_HTML = path.resolve(HERE, "..", "index.html");
const ROOT_HTML = path.resolve(HERE, "..", "..", "..", "index.html");
const GAME_LOGIC = path.resolve(HERE, "..", "server", "game-logic.js");

const src = fs.readFileSync(SRC_HTML, "utf8");
const root = fs.readFileSync(ROOT_HTML, "utf8");
const logic = fs.readFileSync(GAME_LOGIC, "utf8");

const rep = checkMirrors(src, root, logic);
if (rep.ok) {
  console.log(`[sync-server] in sync (block lines ${rep.meta.startLine}-${rep.meta.endLine})`);
  process.exit(0);
}
if (process.argv.includes("--check")) {
  for (const p of rep.problems) console.error("[sync-server] MISMATCH: " + p);
  process.exit(1);
}
const ext = extractBlock(src);
const meta = { srcPath: "src/arg/index.html", startLine: ext.startLine, endLine: ext.endLine, stateSize: 17833432 };
fs.writeFileSync(GAME_LOGIC, buildGameLogic(ext.block, meta));
fs.writeFileSync(ROOT_HTML, buildRootDoc(root, ext.block));
console.log(`[sync-server] wrote game-logic.js + root mirror (block lines ${meta.startLine}-${meta.endLine})`);
for (const p of rep.problems) console.log("[sync-server] fixed: " + p);
