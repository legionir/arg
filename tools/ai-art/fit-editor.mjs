// Builds the footprint editor page from the template + current data.
//   node tools/ai-art/fit-editor.mjs [outFile] [assetBase] [--embed]   (--embed inlines every sprite as a data: URI for standalone hosting)     default: tools/ai-art/fit-editor.html with base "../../" (open it through the game's server)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILDINGS } from "./buildings.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--")), embed = process.argv.includes("--embed");
const out = path.resolve(args[0] || path.join(here, "fit-editor.html")), base = args[1] ?? "../../";
const auto = JSON.parse(fs.readFileSync(path.join(here, "footprint-fit.json"), "utf8"));
const ca = fs.readFileSync(path.join(root, "game/constructionart.js"), "utf8").match(/CONSTRUCTION_ART = (\{[\s\S]*?\});/)[1];
const data = { items: BUILDINGS.filter((b) => fs.existsSync(path.join(root, "assets/buildings", b.key + ".png"))).map(({ key, w, h, height }) => ({ key, w, h, height })), auto, pb: Object.fromEntries(Object.entries(JSON.parse(ca)).map(([k, v]) => [k, v.pb])) };
const t = fs.readFileSync(path.join(here, "fit-editor.template.html"), "utf8").replace("/*DATA*/null", JSON.stringify(data)).replace("__BASE__", base)
  .replace("/*EMBED*/null", embed ? JSON.stringify(Object.fromEntries(fs.readdirSync(path.join(root, "assets/buildings")).filter((f) => f.endsWith(".png")).map((f) => [base + "assets/buildings/" + f, "data:image/png;base64," + fs.readFileSync(path.join(root, "assets/buildings", f)).toString("base64")]))) : "null");
fs.writeFileSync(out, t); console.log("wrote", out, data.items.length, "buildings");
