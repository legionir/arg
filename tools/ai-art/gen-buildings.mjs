// Generate N candidates per building with the unified prompt (resumable; skips existing raws).
//   node tools/ai-art/gen-buildings.mjs <workDir> [N=2] [conc=4] [keys,comma]
// steps=4 (schnell's design point) keeps one image ≈ 60 neurons so ~130 images fit the 10k/day free allocation.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { BUILDINGS, promptFor, seedFor } from "./buildings.mjs";
const [work, nArg, cArg, keysArg] = process.argv.slice(2);
const N = +nArg || 2, CONC = +cArg || 4, only = keysArg ? new Set(keysArg.split(",")) : null;
const raw = path.join(work, "raw"); fs.mkdirSync(raw, { recursive: true });
const jobs = [];
for (const b of BUILDINGS) { if (only && !only.has(b.key)) continue; for (let i = 0; i < N; i++) jobs.push({ b, i }); }
fs.writeFileSync(path.join(work, "prompts.json"), JSON.stringify(Object.fromEntries(BUILDINGS.map((b) => [b.key, { prompt: promptFor(b), seeds: [0, 1, 2, 3, 4].map((i) => seedFor(b.key, i)) }])), null, 1));
let next = 0, done = 0;
async function worker() {
  while (next < jobs.length) {
    const { b, i } = jobs[next++];
    const out = path.join(raw, `${b.key}_${i}.jpg`);
    if (fs.existsSync(out)) { done++; continue; }
    const body = JSON.stringify({ prompt: promptFor(b), steps: 4 });
    for (let a = 0; a < 4; a++) {
      const r = await new Promise((res) => {
        const c = spawn("node", ["-e", `
          import("${path.resolve(path.dirname(new URL(import.meta.url).pathname), "cf-ai.mjs")}").then(m => { const b = JSON.parse(process.argv[1]); require("fs").writeFileSync(process.argv[2], m.runJson("@cf/black-forest-labs/flux-1-schnell", b)); }).catch(e => { console.error(String(e.message).slice(0,150)); process.exit(1); });`, body, out], { stdio: ["ignore", "inherit", "inherit"] });
        c.on("exit", res);
      });
      if (r === 0) break;
      await new Promise((r2) => setTimeout(r2, 1500 * (a + 1)));
    }
    done++; if (done % 10 === 0) console.log(`${done}/${jobs.length}`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
console.log("done", done, "of", jobs.length, "raws:", fs.readdirSync(raw).length);
