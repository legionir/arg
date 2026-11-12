// Footprint review sheets: every candidate is cut out (post.mjs rules) and drawn over the real tile footprint of its building
// (w×h tiles, TILE_W 28 × TILE_H 14, sprite centred on the footprint, image bottom on the diamond's bottom vertex = render rule).
//   node tools/ai-art/review-footprint.mjs [workDir] [perSheet=4]     → assets/ai-src/review/footprint_<n>.jpg
// A good candidate: base of the building sits inside the grid, walls follow the grid edges, nothing floats or overhangs a lot.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BUILDINGS } from "./buildings.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const pw = createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
const work = path.resolve(process.argv[2] || path.join(root, "tmp-footprint")), per = +(process.argv[3] || 4);
const raw = path.join(root, "assets/ai-src/buildings"), cut = path.join(work, "cut"), out = path.join(root, "assets/ai-src/review");
fs.mkdirSync(cut, { recursive: true }); fs.mkdirSync(out, { recursive: true });
const list = [];
for (const f of fs.readdirSync(raw).filter((x) => /\.webp$/.test(x)).sort()) {
  const m = f.match(/^(.+)_(\d+)\.webp$/), b = m && BUILDINGS.find((x) => x.key === m[1]); if (!b) continue;
  if (!fs.existsSync(path.join(cut, f.replace(".webp", ".png")))) list.push({ name: f.replace(".webp", ""), src: path.join(raw, f), w: b.w, h: b.h });
}
if (list.length) { fs.writeFileSync(path.join(work, "raws.json"), JSON.stringify(list)); execFileSync("node", [path.join(here, "post.mjs"), path.join(work, "raws.json"), cut], { stdio: "inherit" }); }
const items = BUILDINGS.map((b) => ({ ...b, imgs: fs.readdirSync(cut).filter((f) => f.startsWith(b.key + "_") && f.endsWith(".png")).sort().map((f) => fs.readFileSync(path.join(cut, f)).toString("base64")) })).filter((i) => i.imgs.length);
const browser = await pw.chromium.launch({ args: ["--no-sandbox"] }), page = await browser.newPage();
for (let s = 0; s * per < items.length; s++) {
  const chunk = items.slice(s * per, (s + 1) * per);
  const url = await page.evaluate(async ({ chunk }) => {
    const CELL = 420, CH = 300, LAB = 22, TW = 28, TH = 14, SS = 3, cols = Math.max(...chunk.map((i) => i.imgs.length));
    const c = document.createElement("canvas"); c.width = cols * CELL; c.height = chunk.length * (CH + LAB);
    const g = c.getContext("2d"); g.fillStyle = "#2a2a2a"; g.fillRect(0, 0, c.width, c.height); g.font = "15px sans-serif";
    for (const [r, it] of chunk.entries()) {
      const y0 = r * (CH + LAB); g.fillStyle = "#f0c75e"; g.fillText(`${it.key}  footprint ${it.w}×${it.h} tiles, height ${it.height}`, 6, y0 + 16);
      for (const [i, b64] of it.imgs.entries()) {
        const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
        const k = Math.min(1, (CELL - 20) / im.width, (CH - 50) / im.height) , ox = i * CELL + CELL / 2, by = y0 + LAB + CH - 22;   // bottom vertex of the diamond
        const u = SS * k;
        // diamond corner points relative to bottom vertex; centre x of footprint bbox = ox
        const cx = (it.w - it.h) * TW / 2 * 0.5 * u, X = (a, b) => ox + ((a - b) * TW / 2 * u) - cx, Y = (a, b) => by - (it.w + it.h) * TH / 2 * u + (a + b) * TH / 2 * u;
        g.drawImage(im, ox - im.width * k / 2, by - im.height * k, im.width * k, im.height * k);
        g.strokeStyle = "rgba(0,255,255,.9)"; g.lineWidth = 1;
        for (let a = 0; a <= it.w; a++) { g.beginPath(); g.moveTo(X(a, 0), Y(a, 0)); g.lineTo(X(a, it.h), Y(a, it.h)); g.stroke(); }
        for (let b = 0; b <= it.h; b++) { g.beginPath(); g.moveTo(X(0, b), Y(0, b)); g.lineTo(X(it.w, b), Y(it.w, b)); g.stroke(); }
        g.fillStyle = "#fff"; g.fillText("#" + (i + 1) + `  ${im.width}×${im.height}`, i * CELL + 6, y0 + LAB + 16);
      }
    }
    return c.toDataURL("image/jpeg", 0.82);
  }, { chunk });
  const f = path.join(out, `footprint_${s + 1}.jpg`); fs.writeFileSync(f, Buffer.from(url.split(",")[1], "base64")); console.log(f, chunk.map((i) => i.key).join(","));
}
await browser.close();
