// Builds the footprint editor page from the template + current data.
//   node tools/ai-art/fit-editor.mjs [outFile] [assetBase]     default: tools/ai-art/fit-editor.html with base "../../" (open it through the game's server)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILDINGS } from "./buildings.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const out = path.resolve(process.argv[2] || path.join(here, "fit-editor.html")), base = process.argv[3] ?? "../../";
const auto = JSON.parse(fs.readFileSync(path.join(here, "footprint-fit.json"), "utf8"));
const ca = fs.readFileSync(path.join(root, "game/constructionart.js"), "utf8").match(/CONSTRUCTION_ART = (\{[\s\S]*?\});/)[1];
const data = { items: BUILDINGS.filter((b) => fs.existsSync(path.join(root, "assets/buildings", b.key + ".png"))).map(({ key, w, h, height }) => ({ key, w, h, height })), auto, pb: Object.fromEntries(Object.entries(JSON.parse(ca)).map(([k, v]) => [k, v.pb])) };
const t = fs.readFileSync(path.join(here, "fit-editor.template.html"), "utf8").replace("/*DATA*/null", JSON.stringify(data)).replace("__BASE__", base);
fs.writeFileSync(out, t); console.log("wrote", out, data.items.length, "buildings");
