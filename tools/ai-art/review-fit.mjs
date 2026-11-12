// Before/after footprint check of the FINAL sprites: left = unscaled (s=1), right = with the fitted scale from footprint-fit.json.
//   node tools/ai-art/review-fit.mjs [perSheet=6]   → assets/ai-src/review/fit_<n>.jpg   (grid = real w×h tiles, 28×14; image bottom on the bottom vertex)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { BUILDINGS } from "./buildings.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const pw = createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
const per = +(process.argv[2] || 6), fit = JSON.parse(fs.readFileSync(path.join(here, "footprint-fit.json"), "utf8"));
const out = path.join(root, "assets/ai-src/review"); fs.mkdirSync(out, { recursive: true });
const items = BUILDINGS.filter((b) => fs.existsSync(path.join(root, "assets/buildings", b.key + ".png"))).map((b) => ({ ...b, e: fit[b.key] || { s: 1 }, img: fs.readFileSync(path.join(root, "assets/buildings", b.key + ".png")).toString("base64") }));
const browser = await pw.chromium.launch({ args: ["--no-sandbox"] }), page = await browser.newPage();
for (let n = 0; n * per < items.length; n++) {
  const chunk = items.slice(n * per, (n + 1) * per);
  const url = await page.evaluate(async ({ chunk }) => {
    const CELL = 400, CH = 330, LAB = 22, TW = 28, TH = 14, SS = 3;
    const c = document.createElement("canvas"); c.width = 2 * CELL; c.height = chunk.length * (CH + LAB);
    const g = c.getContext("2d"); g.fillStyle = "#2a2a2a"; g.fillRect(0, 0, c.width, c.height); g.font = "15px sans-serif";
    for (const [r, it] of chunk.entries()) {
      const y0 = r * (CH + LAB); g.fillStyle = "#f0c75e"; g.fillText(`${it.key}  ${it.w}×${it.h} tiles   s=${it.e.s} sy=${it.e.sy || 1} dx=${it.e.dx || 0}${it.e.f ? " FLIP" : ""}`, 6, y0 + 16);
      const im = new Image(); im.src = "data:image/png;base64," + it.img; await im.decode();
      for (const [i, E] of [{ s: 1 }, it.e].entries()) {
        const s = E.s || 1, sy = E.sy || 1, k = Math.min(1, (CELL - 20) / (im.width * s), (CH - 30) / (im.height * s * sy)), u = SS * k, ox = i * CELL + CELL / 2, by = y0 + LAB + CH - 12;
        const cx = (it.w - it.h) * TW / 4 * u, X = (a, b) => ox + (a - b) * TW / 2 * u - cx, Y = (a, b) => by - (it.w + it.h) * TH / 2 * u + (a + b) * TH / 2 * u;
        const dw = im.width * s * k, dh = im.height * s * k * sy, cxs = ox + (E.dx || 0) * 3 * k;
        g.save(); if (E.f) { g.translate(cxs, 0); g.scale(-1, 1); g.drawImage(im, -dw / 2, by - dh, dw, dh); } else g.drawImage(im, cxs - dw / 2, by - dh, dw, dh); g.restore();
        g.strokeStyle = "rgba(0,255,255,.95)"; g.lineWidth = 1;
        for (let a = 0; a <= it.w; a++) { g.beginPath(); g.moveTo(X(a, 0), Y(a, 0)); g.lineTo(X(a, it.h), Y(a, it.h)); g.stroke(); }
        for (let b = 0; b <= it.h; b++) { g.beginPath(); g.moveTo(X(0, b), Y(0, b)); g.lineTo(X(it.w, b), Y(it.w, b)); g.stroke(); }
        g.fillStyle = "#fff"; g.fillText(i ? "fitted" : "before", i * CELL + 6, y0 + LAB + 14);
      }
    }
    return c.toDataURL("image/jpeg", 0.85);
  }, { chunk });
  const f = path.join(out, `fit_${n + 1}.jpg`); fs.writeFileSync(f, Buffer.from(url.split(",")[1], "base64")); console.log(f, chunk.map((i) => i.key).join(","));
}
await browser.close();
