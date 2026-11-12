// Construction-stage sprites: the chosen finished sprite is attached as reference and DuckAi draws the same building mid-construction.
//   node tools/ai-art/duckai-construct.mjs --keys hut,barracks,tower [--n 2] [--phases 0,1,2]
// Output: assets/ai-src/construction/<key>_p<phase>_<i>.webp (+ meta/<key>.json). Phases match game/render.js buildPhase (0,1,2 = thirds of the build time).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BUILDINGS } from "./buildings.mjs";
import { scoreImage, toWebp, closeScorer } from "./designarena/score.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const CLI = arg("cli", "/home/user/darkbytee/duckai/duck_cli.py"), N = +arg("n", 2), phases = arg("phases", "0,1,2").split(",").map(Number);
const keys = arg("keys", "").split(",").filter(Boolean);
const picks = JSON.parse(fs.readFileSync(path.join(here, "review-picks.json"), "utf8")).pick;
const OUT = path.join(root, "assets/ai-src/construction"), META = path.join(OUT, "meta"); fs.mkdirSync(META, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "duckai-c-"));
const STATE = [
  "Construction state: the very beginning of the build. Only a bare stone foundation and the first low courses of mud-brick walls (knee height) exist; wooden scaffolding poles, stacks of bricks, planks, a rope and a few tools lie around. No roof, no doors, no windows, no decoration.",
  "Construction state: half built. The walls are raised to about half or two thirds of the final height, a wooden scaffold with planks surrounds them, ladders and brick piles stand beside it. No roof yet, no final decoration, openings are rough.",
  "Construction state: nearly finished. The whole structure and roof are in place but a light wooden scaffold and a ladder still lean on it, some plaster and decoration are still missing, a few tools and sacks stand around.",
];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
for (const key of keys) {
  const b = BUILDINGS.find((x) => x.key === key), ref = path.join(root, "assets/ai-src/buildings", `${key}_${picks[key]}.webp`);
  const meta = { key, reference: path.relative(root, ref), footprint: [b.w, b.h], at: new Date().toISOString(), phases: {} };
  for (const ph of phases) {
    const prompt = `${b.subject}, shown under construction. ${STATE[ph]} Hand-painted stylized isometric game building sprite, same style as the reference. Flat solid pure magenta #FF00FF background, no ground plane, no cast shadow, no text, no people.`;
    const got = [];
    for (let i = 0; i < N; i++) {
      const dir = path.join(tmp, `${key}_${ph}_${i}`); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "prompt.txt"), prompt);
      for (let t = 0; t < 3; t++) {
        const r = spawnSync("python3", [path.join(here, "duckai-gen.py"), path.dirname(CLI), path.join(dir, "prompt.txt"), dir, ref, "same"], { encoding: "utf8", timeout: 240000 });
        const f = path.join(dir, "duckai.jpg"); if (fs.existsSync(f)) { got.push(f); break; }
        log(key, ph, "attempt failed", (r.stdout + r.stderr).trim().split("\n").slice(-1)[0].slice(0, 120)); await new Promise((r) => setTimeout(r, 15000 * (t + 1)));
      }
    }
    const files = [];
    for (const [i, f] of got.entries()) { const out = path.join(OUT, `${key}_p${ph}_${i + 1}.webp`); await toWebp(f, out, 0.95); files.push(path.basename(out)); }
    meta.phases[ph] = { prompt, files }; log(key, "phase", ph, files.length, "images");
  }
  fs.writeFileSync(path.join(META, key + ".json"), JSON.stringify(meta, null, 1));
}
await closeScorer(); log("finished");
