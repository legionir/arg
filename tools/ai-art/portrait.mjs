// Crop + resize an AI portrait to a square JPEG for assets/portraits/.
//   node tools/ai-art/portrait.mjs <in.jpg> <out.jpg> <x> <y> <size> [outSize=256]
import fs from "node:fs";
import { createRequire } from "node:module";
const pw = createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
const [src, dst, x, y, size, outSize = 256] = process.argv.slice(2);
const browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
const url = await page.evaluate(async ({ b64, x, y, size, out }) => {
  const img = new Image(); img.src = "data:image/jpeg;base64," + b64; await img.decode();
  const c = document.createElement("canvas"); c.width = c.height = out;
  const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
  let cur = img, sx = x, sy = y, sw = size;                // halve repeatedly for clean downscale
  while (sw / 2 > out) { const t = document.createElement("canvas"); t.width = t.height = Math.round(sw / 2); const tg = t.getContext("2d"); tg.imageSmoothingQuality = "high"; tg.drawImage(cur, sx, sy, sw, sw, 0, 0, t.width, t.height); cur = t; sx = 0; sy = 0; sw = t.width; }
  g.drawImage(cur, sx, sy, sw, sw, 0, 0, out, out);
  return c.toDataURL("image/jpeg", 0.88);
}, { b64: fs.readFileSync(src).toString("base64"), x: +x, y: +y, size: +size, out: +outSize });
fs.writeFileSync(dst, Buffer.from(url.split(",")[1], "base64"));
await browser.close();
console.log(dst, fs.statSync(dst).size + " bytes");
