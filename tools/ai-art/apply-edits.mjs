// Applies the JSON copied from the footprint editor.
//   node tools/ai-art/apply-edits.mjs <file.json | '{"hut":{...},"hut@0":{...}}'>
// "key"      -> final sprite: written to tools/ai-art/footprint-fit.json (marked manual so fit_footprint.py never overwrites it)
// "key@0..2" -> that construction stage only: game/constructionart.js  CONSTRUCTION_ART[key].ph[stage]
// Then game/buildingart.js is rewritten from footprint-fit.json (dy, s, sy, dx, f).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const arg = process.argv[2]; if (!arg) { console.error("usage: apply-edits.mjs <file|json>"); process.exit(2); }
const edits = JSON.parse(fs.existsSync(arg) ? fs.readFileSync(arg, "utf8") : arg);
const fitFile = path.join(here, "footprint-fit.json"), fit = JSON.parse(fs.readFileSync(fitFile, "utf8"));
const caFile = path.join(root, "game/constructionart.js"), caSrc = fs.readFileSync(caFile, "utf8");
const ca = JSON.parse(caSrc.match(/CONSTRUCTION_ART = (\{[\s\S]*?\});/)[1]);
const clean = (e) => ({ s: +e.s, sy: +e.sy, dx: +e.dx, dy: +e.dy, f: e.f ? 1 : 0 });
let nf = 0, np = 0;
for (const [k, e] of Object.entries(edits)) {
  const [key, ph] = k.split("@");
  if (ph === undefined) { fit[key] = { ...clean(e), manual: 1 }; nf++; }
  else { if (!ca[key]) { console.warn("no construction art for", key); continue; } const arr = ca[key].ph || [null, null, null]; arr[+ph] = clean(e); ca[key].ph = arr; np++; }
}
fs.writeFileSync(fitFile, JSON.stringify(fit, null, 1));
fs.writeFileSync(caFile, caSrc.replace(/CONSTRUCTION_ART = \{[\s\S]*?\};/, `CONSTRUCTION_ART = ${JSON.stringify(ca)};`));
const baFile = path.join(root, "game/buildingart.js");
let ba = fs.readFileSync(baFile, "utf8");
ba = ba.replace(/^  (\w+): \{[^}]*\},?$/gm, (m, k) => { const e = fit[k]; if (!e) return m; const parts = [`dy: ${e.dy || 0}`]; if (e.s != null && e.s !== 1) parts.push(`s: ${e.s}`); if (e.sy != null && e.sy !== 1) parts.push(`sy: ${e.sy}`); if (e.dx) parts.push(`dx: ${e.dx}`); if (e.f) parts.push("f: 1"); return `  ${k}: { ${parts.join(", ")} },`; });
fs.writeFileSync(baFile, ba);
console.log(`final: ${nf}, construction stages: ${np}`);
