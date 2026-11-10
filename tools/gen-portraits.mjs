#!/usr/bin/env node
// Portrait generator for Arg — writes one original flat-vector SVG bust per roster entry
// into assets/portraits/. Deterministic: same table in, same files out.
//   node tools/gen-portraits.mjs
// The roster order is the logo index stored in profiles and multiplayer slots (0..28);
// append only, never reorder. game/profile.js lists the same files.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/portraits");

const SKIN = { fair: ["#e9c29c", "#c99a72"], olive: ["#d6a77a", "#b07f55"], tan: ["#c08a5c", "#99683f"], deep: ["#9a6843", "#774c2e"] };
const HAIR = { black: "#221a16", brown: "#4a3222", grey: "#9a958c", white: "#e4dfd4", auburn: "#6e3a22" };
const BG = {
  turquoise: ["#1f8a8c", "#0f4f58"], lapis: ["#2c4f9e", "#162a5c"], saffron: ["#d79a2b", "#8c5a12"],
  crimson: ["#a8322d", "#5e1717"], sand: ["#c9a76b", "#806238"], jade: ["#3d8a5a", "#1e4d33"],
  plum: ["#7a3f78", "#40203f"], slate: ["#5b6b7d", "#2b3542"],
};

// head: turban | helm | crown | cap | hood | diadem | scarf | band
// beard: none | stubble | short | full | long | moustache
// mood: calm | stern | sly | smile
const ROSTER = [
  ["artan", "olive", "black", "lapis", "helm", "short", "calm", "#3f6fb5", "#d9a93a"],
  ["kahbod", "fair", "grey", "sand", "cap", "long", "sly", "#7d6a4c", "#b7a27a"],
  ["tirazheh", "tan", "black", "crimson", "band", "none", "stern", "#8f2b2b", "#e2c178", "f"],
  ["farrokhan", "olive", "brown", "saffron", "turban", "full", "smile", "#8a5a12", "#f2dba0"],
  ["sepehrdad", "tan", "black", "plum", "crown", "full", "stern", "#5d2f6b", "#f0c75e"],
  ["hamun", "deep", "black", "sand", "scarf", "stubble", "stern", "#b08a4d", "#efe2c4"],
  ["azarm", "olive", "auburn", "slate", "hood", "none", "sly", "#2f3a48", "#9fb4c8", "f"],
  ["mehrak", "fair", "brown", "turquoise", "turban", "moustache", "calm", "#1c6a70", "#f2ead6"],
  ["golnar", "fair", "auburn", "crimson", "diadem", "none", "smile", "#93303a", "#f0c75e", "f"],
  ["borzin", "tan", "black", "jade", "helm", "full", "stern", "#2f6b47", "#c9d1d9"],
  ["niusha", "olive", "black", "lapis", "scarf", "none", "calm", "#2c4f9e", "#dfe8f5", "f"],
  ["kiana", "tan", "brown", "saffron", "band", "none", "smile", "#a4701c", "#f7e3ae", "f"],
  ["bardia", "olive", "black", "slate", "cap", "short", "calm", "#44546a", "#c9a76b"],
  ["homa", "fair", "white", "plum", "scarf", "none", "calm", "#6b3a69", "#ead9ea", "f"],
  ["delaram", "deep", "black", "turquoise", "diadem", "none", "calm", "#177a7c", "#f0c75e", "f"],
  ["zarvan", "fair", "white", "slate", "hood", "long", "stern", "#3b4350", "#b9c1cc"],
  ["parvaneh", "olive", "brown", "jade", "band", "none", "sly", "#2f7a52", "#f2dba0", "f"],
  ["ramin", "tan", "brown", "sand", "turban", "short", "smile", "#8a6a3a", "#f2ead6"],
  ["mahyar", "deep", "black", "crimson", "helm", "moustache", "stern", "#7c231b", "#d9a93a"],
  ["sanam", "tan", "black", "plum", "hood", "none", "calm", "#56305a", "#d7b9d9", "f"],
  ["roham", "olive", "black", "jade", "band", "stubble", "sly", "#245c3d", "#c9d1d9"],
  ["tara", "fair", "brown", "lapis", "diadem", "none", "stern", "#27448a", "#c9d1d9", "f"],
  ["arvand", "tan", "grey", "turquoise", "turban", "full", "calm", "#12565c", "#f0c75e"],
  ["nahal", "olive", "auburn", "sand", "scarf", "none", "smile", "#9a7a44", "#fff3d6", "f"],
  ["hirbod", "fair", "black", "saffron", "cap", "full", "calm", "#7a4e10", "#f2dba0"],
  ["yasna", "deep", "black", "crimson", "band", "none", "calm", "#8a2a2a", "#f0c75e", "f"],
  ["farnaz", "fair", "black", "jade", "hood", "none", "smile", "#2a6a48", "#e6f0e4", "f"],
  ["shahin", "tan", "brown", "lapis", "helm", "stubble", "sly", "#213a78", "#c9d1d9"],
  ["dana", "olive", "white", "plum", "turban", "long", "smile", "#5a2f5c", "#f2ead6"],
];

const f1 = (n) => Math.round(n * 10) / 10;

function star(cx, cy, r, fill, op) { // eight-point tile star
  let d = "";
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16, rr = i % 2 ? r * 0.62 : r;
    d += (i ? "L" : "M") + f1(cx + Math.cos(a) * rr) + " " + f1(cy + Math.sin(a) * rr);
  }
  return `<path d="${d}Z" fill="${fill}" opacity="${op}"/>`;
}

function portrait(row) {
  const [id, skinK, hairK, bgK, head, beard, mood, robe, trim, fem] = row;
  const [skin, skinD] = SKIN[skinK], hair = HAIR[hairK], [bg1, bg2] = BG[bgK];
  const woman = fem === "f";
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img">`);
  o.push(`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>` +
    `<clipPath id="c"><path d="M14 196V92C14 44 52 12 100 12s86 32 86 80v104z"/></clipPath></defs>`);
  o.push(`<rect width="200" height="200" fill="#12181f"/>`);
  o.push(`<g clip-path="url(#c)"><rect width="200" height="200" fill="url(#g)"/>`);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) o.push(star(22 + x * 39 + (y % 2) * 19, 30 + y * 36, 11, "#ffffff", 0.07));

  // long hair / veil behind the head
  if (woman && head !== "hood" && head !== "scarf") o.push(`<path d="M58 96c-4-46 88-46 84 0l6 78H52z" fill="${hair}"/>`);
  if (head === "scarf") o.push(`<path d="M50 104c-6-62 106-62 100 0l8 82H42z" fill="${trim}"/>`);
  if (head === "hood") o.push(`<path d="M44 112C40 40 160 40 156 112l10 78H34z" fill="${robe}"/><path d="M56 110c-2-52 90-52 88 0l4 60H52z" fill="#000" opacity=".28"/>`);

  // shoulders and robe
  o.push(`<path d="M18 200c2-34 30-48 60-52h44c30 4 58 18 60 52z" fill="${robe}"/>`);
  o.push(`<path d="M78 148l22 26 22-26 8 4-30 44-30-44z" fill="${trim}"/>`);
  o.push(`<path d="M18 200c2-34 30-48 60-52l-6 52zM182 200c-2-34-30-48-60-52l6 52z" fill="#000" opacity=".14"/>`);
  // neck and head
  o.push(`<path d="M84 128h32v26l-16 14-16-14z" fill="${skinD}"/>`);
  o.push(`<ellipse cx="66" cy="100" rx="6" ry="10" fill="${skinD}"/><ellipse cx="134" cy="100" rx="6" ry="10" fill="${skinD}"/>`);
  o.push(`<path d="M66 92c0-30 68-30 68 0v14c0 24-16 40-34 40s-34-16-34-40z" fill="${skin}"/>`);
  o.push(`<path d="M100 62c18 0 34 8 34 30v14c0 24-16 40-34 40z" fill="${skinD}" opacity=".22"/>`);

  // beard
  const bc = hair;
  if (beard === "stubble") o.push(`<path d="M68 108c2 22 14 38 32 38s30-16 32-38c-6 14-16 20-32 20s-26-6-32-20z" fill="${bc}" opacity=".35"/>`);
  if (beard === "short") o.push(`<path d="M67 104c1 26 14 43 33 43s32-17 33-43c-7 16-17 20-33 20s-26-4-33-20z" fill="${bc}"/>`);
  if (beard === "full") o.push(`<path d="M66 98c-2 34 12 58 34 58s36-24 34-58c-6 20-16 24-34 24s-28-4-34-24z" fill="${bc}"/>`);
  if (beard === "long") o.push(`<path d="M66 98c-2 30 8 50 20 62l14 22 14-22c12-12 22-32 20-62-6 20-16 24-34 24s-28-4-34-24z" fill="${bc}"/>`);
  if (beard !== "none" && beard !== "stubble" || beard === "moustache") o.push(`<path d="M82 121c6-6 12-6 18-2 6-4 12-4 18 2-6 4-12 5-18 2-6 3-12 2-18-2z" fill="${bc}"/>`);

  // eyes, brows, nose, mouth
  const browTilt = mood === "stern" ? 4 : mood === "sly" ? 2 : mood === "smile" ? -2 : 0;
  const bw = woman ? 2.4 : 3.6;
  o.push(`<path d="M74 ${f1(92 - browTilt)}L92 ${f1(92 + browTilt)}" stroke="${hair}" stroke-width="${bw}" stroke-linecap="round"/>` +
    `<path d="M126 ${f1(92 - browTilt)}L108 ${f1(92 + browTilt)}" stroke="${hair}" stroke-width="${bw}" stroke-linecap="round"/>`);
  const eyeH = mood === "sly" ? 2.6 : 3.8;
  for (const ex of [83, 117]) {
    o.push(`<ellipse cx="${ex}" cy="101" rx="6" ry="${eyeH}" fill="#f6efe2"/><circle cx="${ex + (mood === "sly" ? 1.5 : 0)}" cy="101" r="${Math.min(eyeH, 3)}" fill="#2a1c12"/>`);
    if (woman) o.push(`<path d="M${ex - 7} 99c4-5 10-5 14 0" stroke="#1a120c" stroke-width="1.6" fill="none"/>`);
  }
  o.push(`<path d="M100 100v14l-5 5h10" stroke="${skinD}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  if (beard === "none" || beard === "stubble") {
    const m = mood === "smile" ? "M90 130q10 8 20 0" : mood === "sly" ? "M91 131q10 3 19-3" : mood === "stern" ? "M91 132q9-3 18 0" : "M91 131h18";
    o.push(`<path d="${m}" stroke="${woman ? "#8a2f2f" : "#6b3b2a"}" stroke-width="${woman ? 3.2 : 2.6}" fill="none" stroke-linecap="round"/>`);
  }

  // headgear
  if (head === "turban") {
    o.push(`<path d="M58 84c-6-40 90-40 84 0-10-12-28-16-42-16s-32 4-42 16z" fill="${trim}"/>`);
    o.push(`<path d="M58 84c8-16 30-22 42-22M142 84c-8-16-30-22-42-22M70 64c14-8 46-8 60 0" stroke="#000" stroke-opacity=".18" stroke-width="2" fill="none"/>`);
    o.push(`<path d="M100 44l7 12-7 12-7-12z" fill="${bg1}" stroke="#f0c75e" stroke-width="2"/>`);
  }
  if (head === "helm") {
    o.push(`<path d="M62 92c-4-44 80-44 76 0z" fill="${trim}"/><path d="M100 28l5 26h-10z" fill="${trim}"/>`);
    o.push(`<path d="M62 92c-4-44 34-52 38-36v36z" fill="#fff" opacity=".18"/><rect x="60" y="86" width="80" height="8" rx="2" fill="#f0c75e"/>`);
    o.push(`<path d="M97 92h6v24l-3 4-3-4z" fill="${trim}"/>`);
    o.push(`<path d="M60 94c-2 26 2 44 10 56l-12-2c-6-14-8-34-6-54zM140 94c2 26-2 44-10 56l12-2c6-14 8-34 6-54z" fill="${trim}" opacity=".8"/>`);
  }
  if (head === "crown") {
    o.push(`<path d="M62 86c2-18 74-18 76 0z" fill="${hair}"/>`);
    o.push(`<path d="M60 84l6-34 14 18 10-26 10 22 10-22 10 26 14-18 6 34z" fill="#f0c75e" stroke="#8c5a12" stroke-width="2" stroke-linejoin="round"/>`);
    for (const cx of [80, 100, 120]) o.push(`<circle cx="${cx}" cy="74" r="4" fill="${cx === 100 ? "#c0392b" : "#1f8a8c"}"/>`);
  }
  if (head === "cap") {
    o.push(`<path d="M60 88c-2-44 82-44 80 0-12-8-26-10-40-10s-28 2-40 10z" fill="${robe}"/><path d="M60 88c12-8 26-10 40-10s28 2 40 10v6c-12-8-26-10-40-10s-28 2-40 10z" fill="${trim}"/>`);
  }
  if (head === "band") {
    o.push(`<path d="M62 90c-6-42 82-42 76 0-8-14-24-20-38-20s-30 6-38 20z" fill="${hair}"/>`);
    o.push(`<path d="M62 84c10-10 24-13 38-13s28 3 38 13v7c-10-10-24-13-38-13s-28 3-38 13z" fill="${trim}"/><circle cx="100" cy="73" r="4.5" fill="#f0c75e"/>`);
  }
  if (head === "diadem") {
    o.push(`<path d="M62 90c-6-44 82-44 76 0-8-14-24-20-38-20s-30 6-38 20z" fill="${hair}"/>`);
    o.push(`<path d="M66 78c10-12 58-12 68 0l-4 6c-10-8-50-8-60 0z" fill="#f0c75e"/><path d="M100 52l8 14-8 8-8-8z" fill="#f0c75e"/><circle cx="100" cy="66" r="3.5" fill="${bg1}"/>`);
  }
  if (head === "scarf") {
    o.push(`<path d="M58 94c-8-52 92-52 84 0-10-16-26-22-42-22s-32 6-42 22z" fill="${trim}"/><path d="M60 88c10-14 26-19 40-19s30 5 40 19" stroke="${robe}" stroke-width="5" fill="none"/>`);
  }
  if (head === "hood") {
    o.push(`<path d="M52 100C46 36 154 36 148 100c-8-22-26-32-48-32s-40 10-48 32z" fill="${robe}"/><path d="M52 100c8-22 26-32 48-32s40 10 48 32" stroke="${trim}" stroke-width="3" fill="none"/>`);
  }
  o.push(`</g>`);
  // arched tile frame
  o.push(`<path d="M14 196V92C14 44 52 12 100 12s86 32 86 80v104" fill="none" stroke="#f0c75e" stroke-width="6"/>`);
  o.push(`<path d="M22 196V92c0-43 34-72 78-72s78 29 78 72v104" fill="none" stroke="#0f151c" stroke-width="2" opacity=".6"/>`);
  o.push(`<rect x="11" y="190" width="178" height="8" fill="#f0c75e"/>`);
  o.push(`</svg>`);
  return { id, svg: o.join("") };
}

fs.mkdirSync(OUT, { recursive: true });
for (const row of ROSTER) {
  const p = portrait(row);
  fs.writeFileSync(path.join(OUT, p.id + ".svg"), p.svg + "\n");
}
console.log("portraits:", ROSTER.length, "->", OUT);
