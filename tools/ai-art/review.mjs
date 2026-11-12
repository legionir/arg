// Contact sheets for human review: node tools/ai-art/review.mjs <set> [perSheet=6]
// Reads assets/ai-src/<set>/<key>_<rank>.webp (+ meta) → assets/ai-src/review/<set>_<n>.jpg (rows = items, columns = ranks).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pw = createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
const [setName, per = "6"] = process.argv.slice(2);
const dir = path.join(root, "assets/ai-src", setName), out = path.join(root, "assets/ai-src/review");
fs.mkdirSync(out, { recursive: true });
const keys = [...new Set(fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/_\d+\.webp$/, "")))].sort();
const browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
const CELL = 260, LAB = 22;
for (let s = 0; s * +per < keys.length; s++) {
  const chunk = keys.slice(s * +per, (s + 1) * +per);
  const items = chunk.map((k) => ({ key: k, imgs: fs.readdirSync(dir).filter((f) => f.startsWith(k + "_") && f.endsWith(".webp")).sort().map((f) => fs.readFileSync(path.join(dir, f)).toString("base64")) }));
  const url = await page.evaluate(async ({ items, CELL, LAB }) => {
    const cols = Math.max(...items.map((i) => i.imgs.length));
    const c = document.createElement("canvas"); c.width = cols * CELL; c.height = items.length * (CELL + LAB);
    const g = c.getContext("2d"); g.fillStyle = "#222"; g.fillRect(0, 0, c.width, c.height); g.font = "15px sans-serif";
    for (const [r, it] of items.entries()) {
      g.fillStyle = "#f0c75e"; g.fillText(it.key, 6, r * (CELL + LAB) + 16);
      for (const [i, b64] of it.imgs.entries()) { const im = new Image(); im.src = "data:image/webp;base64," + b64; await im.decode(); g.drawImage(im, i * CELL, r * (CELL + LAB) + LAB, CELL, CELL); g.fillStyle = "#fff"; g.fillText("#" + (i + 1), i * CELL + 6, r * (CELL + LAB) + LAB + 16); }
    }
    return c.toDataURL("image/jpeg", 0.8);
  }, { items, CELL, LAB });
  const f = path.join(out, `${setName}_${s + 1}.jpg`);
  fs.writeFileSync(f, Buffer.from(url.split(",")[1], "base64"));
  console.log(f, chunk.join(","));
}
await browser.close();
