// Cut out construction-stage sprites in the SAME frame as the finished sprite, so size and position never jump between stages.
//   node tools/ai-art/construct-post.mjs --keys hut,barracks,tower [--pick hut:p0=1,hut:p1=2]
// Finished raw = assets/ai-src/buildings/<key>_<pick>.webp (review-picks.json). Its magenta-keyed blob bbox + scale (post.mjs rules) is applied
// to every construction raw (same crop origin, same scale, + margin so debris is not clipped).
// Writes assets/buildings/<key>_c<0|1|2>.png and game/constructionart.js ({ key: { pb: [bottom padding px at stored scale ×3, per phase] } }).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { BUILDINGS } from "./buildings.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const pw = createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const keys = arg("keys", "").split(",").filter(Boolean);
const forced = Object.fromEntries(arg("pick", "").split(",").filter(Boolean).map((x) => x.split("=")));
const picks = JSON.parse(fs.readFileSync(path.join(here, "review-picks.json"), "utf8")).pick;
const TILE_W = 28, SS = 3, FIT = 1.08, MARGIN = 0.10;
const b64 = (f) => fs.readFileSync(f).toString("base64");
const browser = await pw.chromium.launch({ args: ["--no-sandbox"] }), page = await browser.newPage();
await page.addScriptTag({ content: `
window.keyed = async (b64, mime, tw, th) => {
  const img = new Image(); img.src = "data:image/" + mime + ";base64," + b64; await img.decode();
  const c = document.createElement("canvas"); c.width = tw || img.width; c.height = th || img.height;
  const x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i+1], b = p[i+2], m = Math.min(r, b), pk = (m - g) / Math.max(1, m);
    if (m > 45 && pk > 0.32) p[i+3] = 0; else if (m > 45 && pk > 0.22) { p[i+3] = Math.round(255 * (0.32 - pk) / 0.10); p[i+2] = Math.min(b, g + 20); p[i] = Math.min(r, g + 40); } }
  const W = c.width, H = c.height, lab = new Int32Array(W * H), sizes = [0]; let n = 0;
  for (let s = 0; s < W * H; s++) { if (lab[s] || p[s*4+3] < 40) continue; n++; let cnt = 0; const st = [s]; lab[s] = n;
    while (st.length) { const q = st.pop(); cnt++; const qx = q % W, qy = (q / W) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const t = ny * W + nx; if (!lab[t] && p[t*4+3] >= 40) { lab[t] = n; st.push(t); } } }
    sizes.push(cnt); }
  let best = 1; for (let k = 1; k <= n; k++) if (sizes[k] > sizes[best]) best = k;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let s = 0; s < W * H; s++) { if (lab[s] !== best) { p[s*4+3] = 0; continue; } const px = s % W, py = (s / W) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
  x.putImageData(d, 0, 0); window.__c = c; return { x0, y0, x1, y1, W, H };
};
window.render = (x0, y0, w, h, k) => {   // crop (x0,y0,w,h) of the last keyed canvas (may extend past the image), scale by k, two-step downscale
  const o = document.createElement("canvas"); o.width = Math.round(w * k); o.height = Math.round(h * k);
  let cur = document.createElement("canvas"); cur.width = w; cur.height = h; cur.getContext("2d").drawImage(window.__c, -x0, -y0);
  while (cur.width * 0.5 > o.width) { const t = document.createElement("canvas"); t.width = Math.round(cur.width / 2); t.height = Math.round(cur.height / 2); const tx = t.getContext("2d"); tx.imageSmoothingQuality = "high"; tx.drawImage(cur, 0, 0, t.width, t.height); cur = t; }
  const ox = o.getContext("2d"); ox.imageSmoothingQuality = "high"; ox.drawImage(cur, 0, 0, o.width, o.height);
  return o.toDataURL("image/png");
};` });
const artFile = path.join(root, "game/constructionart.js");
const existing = fs.existsSync(artFile) ? JSON.parse(fs.readFileSync(artFile, "utf8").match(/CONSTRUCTION_ART = (\{[\s\S]*?\});/)[1]) : {};
for (const key of keys) {
  const bd = BUILDINGS.find((x) => x.key === key), fin = path.join(root, "assets/ai-src/buildings", `${key}_${picks[key]}.webp`);
  const bb = await page.evaluate(([b, m]) => window.keyed(b, m), [b64(fin), "webp"]);
  const bw = bb.x1 - bb.x0 + 1, bh = bb.y1 - bb.y0 + 1, k = Math.round((bd.w + bd.h) * TILE_W / 2 * SS * FIT) / bw;
  const mx = Math.round(bw * MARGIN), mt = Math.round(bh * MARGIN), mb = Math.round(bh * MARGIN);
  const pb = [];
  for (let ph = 0; ph < 3; ph++) {
    const n = forced[`${key}:p${ph}`] || 1, f = path.join(root, "assets/ai-src/construction", `${key}_p${ph}_${n}.webp`);
    await page.evaluate(([b, m, w, h]) => window.keyed(b, m, w, h), [b64(f), "webp", bb.W, bb.H]);
    const url = await page.evaluate(([x0, y0, w, h, k]) => window.render(x0, y0, w, h, k), [bb.x0 - mx, bb.y0 - mt, bw + 2 * mx, bh + mt + mb, k]);
    fs.writeFileSync(path.join(root, "assets/buildings", `${key}_c${ph}.png`), Buffer.from(url.split(",")[1], "base64"));
    pb.push(+(mb * k).toFixed(1));
  }
  existing[key] = { pb }; console.log(key, "scale", k.toFixed(3), "pad", pb.join(","));
}
fs.writeFileSync(artFile, `// نگاره‌ی مرحله‌های ساخت (ساخته‌ی tools/ai-art/construct-post.mjs — دستی ویرایش نشود).
// assets/buildings/<نوع>_c<۰|۱|۲>.png هم‌قاب با تصویر نهایی؛ pb = حاشیه‌ی پایین (پیکسل ذخیره‌شده) که تصویر زیر رأس پایینی ردپا می‌رود.
export const CONSTRUCTION_ART = ${JSON.stringify(existing)};
`);
await browser.close();
