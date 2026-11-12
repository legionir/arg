// Store already-downloaded result images for a building (ranked order = argument order) into assets/ai-src/buildings/.
//   node tools/ai-art/designarena/import-local.mjs <key> <img1> <img2> ... [--project <url>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILDINGS, promptFor, expectedAspect } from "../buildings.mjs";
import { scoreImage, toWebp, closeScorer } from "./score.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC = path.join(root, "assets/ai-src/buildings"), META = path.join(SRC, "meta"); fs.mkdirSync(META, { recursive: true });
const args = process.argv.slice(2), pi = args.indexOf("--project"), project = pi >= 0 ? args.splice(pi, 2)[1] : "";
const [key, ...imgs] = args, b = BUILDINGS.find((x) => x.key === key);
if (!b || !imgs.length) throw new Error("usage: import-local.mjs <key> <img…> [--project url]");
const files = [];
for (const [i, f] of imgs.entries()) {
  const out = `${key}_${i + 1}.webp`, bytes = await toWebp(f, path.join(SRC, out));
  files.push({ file: out, rank: i + 1, bytes, ...(await scoreImage(f, expectedAspect(b))) });
}
fs.writeFileSync(path.join(META, key + ".json"), JSON.stringify({ key, prompt: promptFor(b), footprint: [b.w, b.h], height: b.height, project, at: new Date().toISOString(), votes: [], note: "imported", files }, null, 1) + "\n");
console.log(key, files.map((f) => `${f.file} ${Math.round(f.bytes / 1024)}KB score=${f.score}`).join("\n  "));
await closeScorer();
