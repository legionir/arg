// Cut out every candidate, score the fit (silhouette aspect vs the footprint+height the game expects), keep the best per
// building in assets/buildings/ and regenerate game/buildingart.js. A human still reviews the contact sheets.
//   node tools/ai-art/select.mjs <workDir> [--pick key=rank,...]   (--pick forces a candidate after review)
//   <workDir>/raw holds <key>_<rank>.(jpg|png|webp); for DesignArena output use a dir whose "raw" is assets/ai-src/buildings (see --raw).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BUILDINGS, expectedAspect } from "./buildings.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const work = path.resolve(process.argv[2]);
const pickArg = process.argv.indexOf("--pick") > 0 ? process.argv[process.argv.indexOf("--pick") + 1] : "";
const forced = Object.fromEntries(pickArg.split(",").filter(Boolean).map((x) => x.split("=")));
const rawArg = process.argv.indexOf("--raw") > 0 ? process.argv[process.argv.indexOf("--raw") + 1] : null;
const raw = rawArg ? path.resolve(rawArg) : path.join(work, "raw"), cut = path.join(work, "cut");
fs.mkdirSync(cut, { recursive: true });
const list = [];
for (const f of fs.readdirSync(raw).filter((x) => /\.(jpg|png|webp)$/.test(x)).sort()) {
  const m = f.match(/^(.+)_(\d+)\.(?:jpg|png|webp)$/); if (!m) continue; const b = BUILDINGS.find((x) => x.key === m[1]); if (!b) continue;
  list.push({ name: f.replace(/\.(jpg|png|webp)$/, ""), src: path.join(raw, f), w: b.w, h: b.h });
}
fs.writeFileSync(path.join(work, "raws.json"), JSON.stringify(list));
execFileSync("node", [path.join(here, "post.mjs"), path.join(work, "raws.json"), cut], { stdio: "inherit" });
const metrics = JSON.parse(fs.readFileSync(path.join(cut, "metrics.json"), "utf8"));
const chosen = {}, report = [];
for (const b of BUILDINGS) {
  const cands = Object.keys(metrics).filter((n) => n.startsWith(b.key + "_")).map((n) => {
    const m = metrics[n], asp = m.bw / m.bh, exp = expectedAspect(b);
    const score = -Math.abs(Math.log(asp / exp)) - (m.area < 0.06 ? 1 : 0) - 0.04 * (+n.split("_")[1] - 1);  // small bonus for the site's own ranking // too small = probably a failed key-out
    return { n, idx: n.split("_")[1], asp: +asp.toFixed(2), exp: +exp.toFixed(2), score: +score.toFixed(3) };
  });
  if (!cands.length) continue;
  cands.sort((x, y) => y.score - x.score);
  const pick = forced[b.key] != null ? cands.find((c) => c.idx === forced[b.key]) : cands[0];
  fs.mkdirSync(path.join(root, "assets/buildings"), { recursive: true });
  fs.copyFileSync(path.join(cut, pick.n + ".png"), path.join(root, "assets/buildings", b.key + ".png"));
  chosen[b.key] = { candidate: +pick.idx, aspect: pick.asp, expected: pick.exp, score: pick.score, forced: forced[b.key] != null };
  report.push(`${b.key.padEnd(14)} pick=${pick.idx} asp=${pick.asp} exp=${pick.exp} score=${pick.score}  all=[${cands.map((c) => c.idx + ":" + c.score).join(" ")}]`);
}
fs.writeFileSync(path.join(here, "buildings-chosen.json"), JSON.stringify(chosen, null, 1) + "\n");
const keys = Object.keys(chosen);
const fitFile = path.join(here, "footprint-fit.json"), fit = fs.existsSync(fitFile) ? JSON.parse(fs.readFileSync(fitFile, "utf8")) : {};   // s from fit_footprint.py
fs.writeFileSync(path.join(root, "game/buildingart.js"), `// نگاره‌ی ساختمان‌ها (1.0.0-rc.5): تصویر نقاشی‌شده به‌جای رسم وکتوری.
// هر کلید = نوع ساختمان؛ فایل assets/buildings/<نوع>.png (ساخته‌ی tools/ai-art/select.mjs؛ K برابر اندازه‌ی زوم ۱).
// تصویر نبود/نیامده = همان رسم وکتوری قبلی (fallback خودکار). ساخته‌شده توسط ابزار — دستی ویرایش نشود.
export const ART_K = 3;
export const BUILDING_ART = {
${keys.map((k) => `  ${k}: { dy: ${(fit[k] && fit[k].dy) || 0}${["s", "sy", "dx", "f"].map((n) => (fit[k] && fit[k][n] != null && (n === "f" || ![0, 1].includes(fit[k][n])) ? `, ${n}: ${fit[k][n]}` : "")).join("")} },`).join("\n")}
};
`);
console.log(report.join("\n"));
