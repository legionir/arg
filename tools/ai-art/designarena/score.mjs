// Local image scoring (for choosing votes) and WebP conversion, in a headless Chromium of our own (no tunnel traffic).
import fs from "node:fs";
import { pw } from "./lib.mjs";

let browser = null, page = null;
async function ensure() {
  if (page) return page;
  browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
  page = await browser.newPage();
  return page;
}
export async function closeScorer() { if (browser) await browser.close(); browser = page = null; }

// expected = silhouette aspect (width/height) the game expects for this building (see buildings.mjs: expectedAspect)
export async function scoreImage(file, expected) {
  const p = await ensure();
  const mime = file.endsWith(".webp") ? "webp" : file.endsWith(".jpg") ? "jpeg" : "png";
  return p.evaluate(async ({ b64, mime, expected }) => {
    const img = new Image(); img.src = `data:image/${mime};base64,${b64}`; await img.decode();
    const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d", { willReadFrequently: true });
    // letterboxed (non-square) outputs are common: fit inside, keep aspect, pad with a sentinel
    g.fillStyle = "#00ff00"; g.fillRect(0, 0, S, S);
    const k = Math.min(S / img.width, S / img.height), w = img.width * k, h = img.height * k;
    g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
    const d = g.getImageData(0, 0, S, S).data, N = S * S;
    const bg = new Uint8Array(N);
    for (let i = 0; i < N; i++) { const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], m = Math.min(r, b); bg[i] = (m > 45 && (m - gg) / m > 0.32) ? 1 : 0; }
    let ring = 0, ringBg = 0;
    for (let i = 0; i < S; i++) for (const j of [i, (S - 1) * S + i, i * S, i * S + S - 1]) { ring++; ringBg += bg[j]; }
    let x0 = S, y0 = S, x1 = 0, y1 = 0, area = 0;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (!bg[y * S + x] && !(d[(y * S + x) * 4] < 10 && d[(y * S + x) * 4 + 1] > 245 && d[(y * S + x) * 4 + 2] < 10)) { area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, asp = bw / bh;
    const margin = Math.min(x0, y0, S - 1 - x1, S - 1 - y1) / S;
    const fillFrac = area / (bw * bh), areaFrac = area / N;
    const flat = ringBg / ring;                       // how much of the border is the magenta key colour
    const score = 2.0 * flat - Math.abs(Math.log(asp / expected)) + (margin > 0.02 ? 0.3 : -1) + (areaFrac > 0.18 && areaFrac < 0.8 ? 0.3 : -0.5) + (fillFrac > 0.45 ? 0.1 : -0.3);
    return { score: +score.toFixed(3), flat: +flat.toFixed(2), asp: +asp.toFixed(2), margin: +margin.toFixed(3), areaFrac: +areaFrac.toFixed(2), w: img.width, h: img.height };
  }, { b64: fs.readFileSync(file).toString("base64"), mime, expected });
}

export async function toWebp(src, dst, quality = 0.95) {
  const p = await ensure();
  const mime = src.endsWith(".webp") ? "webp" : src.endsWith(".jpg") ? "jpeg" : "png";
  const url = await p.evaluate(async ({ b64, mime, q }) => {
    const img = new Image(); img.src = `data:image/${mime};base64,${b64}`; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", q);
  }, { b64: fs.readFileSync(src).toString("base64"), mime, q: quality });
  fs.writeFileSync(dst, Buffer.from(url.split(",")[1], "base64"));
  return fs.statSync(dst).size;
}

// Downscale to a JPEG buffer (longest side = maxSide) — used for the style-reference upload.
export async function toJpegSmall(src, maxSide = 768) {
  const p = await ensure();
  const mime = src.endsWith(".webp") ? "webp" : src.endsWith(".jpg") ? "jpeg" : "png";
  const url = await p.evaluate(async ({ b64, mime, maxSide }) => {
    const img = new Image(); img.src = `data:image/${mime};base64,${b64}`; await img.decode();
    const k = Math.min(1, maxSide / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.9);
  }, { b64: fs.readFileSync(src).toString("base64"), mime, maxSide });
  return Buffer.from(url.split(",")[1], "base64");
}
