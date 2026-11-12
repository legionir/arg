// Post-process AI building art: key out the flat magenta background, crop, scale to the isometric
// footprint and write assets/buildings/<name>.png (. Runs in headless Chromium (no extra deps).
//   node tools/ai-art/post.mjs <raws.json> [outDir=assets/buildings]   → also writes <outDir>/metrics.json (pre-scale bbox)
// raws manifest: [{ "name": "hut", "src": "/path/raw.jpg", "w": 2, "h": 2 }]  (w,h = building footprint in tiles)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pw = createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
const TILE_W = 28;       // CONFIG.TILE_W
const SS = 3;            // stored at 3× the zoom-1 size so zooming in stays crisp
const list = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const outDir = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, "assets/buildings");
const metrics = {};
fs.mkdirSync(outDir, { recursive: true });

const browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
for (const it of list) {
  const b64 = fs.readFileSync(it.src).toString("base64");
  const mime = it.src.endsWith(".png") ? "png" : "jpeg";
  const base = (it.w + it.h) * TILE_W / 2;              // width of the footprint diamond at zoom 1
  const res = await page.evaluate(async ({ b64, mime, target }) => {
    const img = new Image(); img.src = `data:image/${mime};base64,${b64}`; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    // background = pink/magenta family (R,B high, G clearly lower); also catches the model's drop shadow on it
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2], m = Math.min(r, b);
      const pinkness = (m - g) / Math.max(1, m);       // 0 = neutral, →1 = pure magenta
      if (m > 45 && pinkness > 0.32) { p[i + 3] = 0; }
      else if (m > 45 && pinkness > 0.22) { p[i + 3] = Math.round(255 * (0.32 - pinkness) / 0.10); // soft edge + despill
        p[i + 2] = Math.min(b, g + 20); p[i] = Math.min(r, g + 40); }
    }
    // largest connected opaque blob only (drops stray specks)
    const W = c.width, H = c.height, lab = new Int32Array(W * H), sizes = [0];
    let n = 0;
    for (let s = 0; s < W * H; s++) {
      if (lab[s] || p[s * 4 + 3] < 40) continue;
      n++; let cnt = 0; const st = [s]; lab[s] = n;
      while (st.length) { const q = st.pop(); cnt++; const qx = q % W, qy = (q / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const t = ny * W + nx; if (!lab[t] && p[t * 4 + 3] >= 40) { lab[t] = n; st.push(t); } } }
      sizes.push(cnt);
    }
    let best = 1; for (let k = 1; k <= n; k++) if (sizes[k] > sizes[best]) best = k;
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let s = 0; s < W * H; s++) { if (lab[s] !== best) { p[s * 4 + 3] = 0; continue; } const px = s % W, py = (s / W) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
    x.putImageData(d, 0, 0);
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = target / bw;
    const o = document.createElement("canvas"); o.width = Math.round(bw * k); o.height = Math.round(bh * k);
    const ox = o.getContext("2d"); ox.imageSmoothingQuality = "high";
    // two-step downscale keeps edges clean
    let cur = c, cx0 = x0, cy0 = y0, cw = bw, ch = bh;
    while (cw * 0.5 > o.width) { const t = document.createElement("canvas"); t.width = Math.round(cw / 2); t.height = Math.round(ch / 2); const tx = t.getContext("2d"); tx.imageSmoothingQuality = "high"; tx.drawImage(cur, cx0, cy0, cw, ch, 0, 0, t.width, t.height); cur = t; cx0 = 0; cy0 = 0; cw = t.width; ch = t.height; }
    ox.drawImage(cur, cx0, cy0, cw, ch, 0, 0, o.width, o.height);
    return { url: o.toDataURL("image/png"), w: o.width, h: o.height, bw, bh, area: sizes[best] / (W * H) };
  }, { b64, mime, target: Math.round(base * SS * (it.fit || 1.08)) });
  fs.writeFileSync(path.join(outDir, it.name + ".png"), Buffer.from(res.url.split(",")[1], "base64"));
  metrics[it.name] = { bw: res.bw, bh: res.bh, area: res.area, w: res.w, h: res.h };
  console.log(it.name, res.w + "x" + res.h);
}
fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 1) + "\n");
await browser.close();
