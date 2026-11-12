// Generate the remaining building source images through DuckAi (https://github.com/DarkBytee/DuckAi, `--draw`).
//   node tools/ai-art/duckai.mjs [--cli <duck_cli.py>] [--n 2] [--keys a,b] [--commit-every 3] [--force] [--ref <style image>]
// Same output layout as designarena/run.mjs: assets/ai-src/buildings/<key>_<rank>.webp + meta/<key>.json (keys with meta are skipped).
// No style reference is possible (text-to-image only), so the shared STYLE text carries the look.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BUILDINGS, promptFor, expectedAspect } from "./buildings.mjs";
import { scoreImage, toWebp, closeScorer } from "./designarena/score.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const CLI = arg("cli", "/home/user/darkbytee/duckai/duck_cli.py"), N = +arg("n", 2), EVERY = +arg("commit-every", 3);
const only = arg("keys", "").split(",").filter(Boolean), FORCE = process.argv.includes("--force"), REF = arg("ref", "");
const GEN = path.join(path.dirname(fileURLToPath(import.meta.url)), "duckai-gen.py");
const SRC = path.join(root, "assets/ai-src/buildings"), META = path.join(SRC, "meta");
fs.mkdirSync(META, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "duckai-"));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const todo = BUILDINGS.filter((b) => (!only.length || only.includes(b.key)) && (FORCE || !fs.existsSync(path.join(META, b.key + ".json"))));
log("todo", todo.length, todo.map((b) => b.key).join(" "));
let done = 0, fails = 0;
for (const b of todo) {
  const prompt = promptFor(b), cands = [];
  for (let i = 0; i < N && fails < 4; i++) {
    const dir = path.join(tmp, `${b.key}_${i}`); fs.mkdirSync(dir, { recursive: true });
    let ok = false;
    for (let t = 0; t < 3 && !ok; t++) {
      const pf = path.join(dir, "prompt.txt"); fs.writeFileSync(pf, prompt);
      const r = spawnSync("python3", [GEN, path.dirname(CLI), pf, dir, ...(REF ? [path.resolve(root, REF)] : [])], { encoding: "utf8", timeout: 240000 });
      const f = fs.readdirSync(dir).find((x) => /\.jpe?g$/.test(x));
      if (f) { cands.push(path.join(dir, f)); ok = true; fails = 0; }
      else { log(b.key, "attempt failed:", (r.stdout + r.stderr).trim().split("\n").slice(-2).join(" | ")); await new Promise((r) => setTimeout(r, 15000 * (t + 1))); }
    }
    if (!ok) fails++;
  }
  if (!cands.length) { log(b.key, "no images; skipping"); if (fails >= 4) break; continue; }
  const exp = expectedAspect(b), scored = [];
  for (const f of cands) scored.push({ f, ...(await scoreImage(f, exp)) });
  scored.sort((a, c) => c.score - a.score);
  const files = [];
  for (const [i, s] of scored.entries()) {
    const out = path.join(SRC, `${b.key}_${i + 1}.webp`);
    await toWebp(s.f, out, 0.95);
    files.push({ file: path.basename(out), rank: i + 1, bytes: fs.statSync(out).size, score: s.score, flat: s.flat, asp: s.asp, margin: s.margin, areaFrac: s.areaFrac, w: s.w, h: s.h });
  }
  fs.writeFileSync(path.join(META, b.key + ".json"), JSON.stringify({ key: b.key, set: "buildings", source: "duckai", prompt, aspect: "1:1", reference: REF || undefined, footprint: [b.w, b.h], at: new Date().toISOString(), votes: [], files }, null, 1));
  log(b.key, "saved", files.map((x) => x.score).join(" "));
  if (++done % EVERY === 0) {
    try { execFileSync("git", ["add", "assets/ai-src/buildings", "tools/ai-art"], { cwd: root }); execFileSync("git", ["commit", "-qm", `AI art: ${done} more building sources via DuckAi`], { cwd: root }); } catch (e) { log("commit skipped"); }
  }
}
await closeScorer();
log("finished", done, "of", todo.length);
