// نقشه‌ساز و نقشه‌های نام‌دار (0.238.0 — C-CLN-11): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { serializeJSON, deserializeJSON } from "../persist.js";
import {
  MAP_V, PATCH_CAP, CUSTOM_KEY, BRUSHES, createMapDoc, patchesList, patchCount,
  baseTerrain, applyPatches, customTerrain, paintCells, exportMapDoc, importMapDoc,
  validateMapDoc, validatePlayable, mapNameFor, namedMapByKey, saveCustomSlot, loadCustomSlot,
} from "../mapedit.js";
import { REPLAY_V, newSoloFromSeed, runReplay, validateReplayLog } from "../replay.js";
import { paintMapThumb } from "../minimap.js";
import { t, withLang } from "../i18n.js";
import { must } from "./fixtures.js";

// --- نقشه‌ساز داخل‌بازی (0.51.0 — #۲۲ از FEATURES) ---

function t_mapedit_paint_erase() {
  const W = CONFIG.GRID_W;
  const doc = createMapDoc("آزمون", CONFIG.MAP_SEED);
  const base = baseTerrain(CONFIG.MAP_SEED);
  const idx = 20 * W + 20;
  const other = base[idx] === 1 ? 2 : 1; // حتماً متفاوت از سید
  let r = paintCells(doc, base, 20, 20, 2, other);
  must(r.painted === 4 && !r.capped, `قلم ۲×۲ باید ۴ بنشاند، نشست ${r.painted}`);
  must(patchCount(doc) === 4, "۴ وصله باید باشد");
  r = paintCells(doc, base, 20, 20, 2, other);
  must(r.painted === 0, "نقاشی تکراری نباید وصله تازه بسازد");
  r = paintCells(doc, base, 20, 20, 2, base[idx]); // هم‌سان سید = پاک
  must(r.painted === 4 && patchCount(doc) === 0, "برگشت به تایل سید باید وصله را حذف کند");
  paintCells(doc, base, 20, 20, 1, other);
  r = paintCells(doc, base, 20, 20, 1, null); // پاک‌کن صریح
  must(patchCount(doc) === 0, "پاک‌کن باید وصله را حذف کند");
  return { name: "نقاشی و پاک‌کن", pass: true, detail: "۴/۰/حذف" };
}

function t_mapedit_brush_clip() {
  const doc = createMapDoc("گوشه", 7);
  const base = baseTerrain(7);
  const r = paintCells(doc, base, -2, -2, 4, 1);
  must(!r.capped, "نباید سقف بگیرد");
  // فقط (۰..۱، ۰..۱) در نقشه است — ولی تایل سیدِ آب/سنگ، وصله نمی‌شود
  const W = CONFIG.GRID_W;
  let expect = 0;
  for (let rr = 0; rr <= 1; rr++) {
    for (let cc = 0; cc <= 1; cc++) {
      if (base[rr * W + cc] !== 1) expect++;
    }
  }
  must(r.painted === expect && patchCount(doc) === expect, `برش گوشه باید ${expect} باشد، شد ${r.painted}`);
  must(BRUSHES.includes(32) && BRUSHES[0] === 1, "قلم‌ها ۱ تا ۳۲");
  return { name: "برش قلم در مرز", pass: true, detail: `${expect} خانه` };
}

function t_mapedit_cap() {
  const doc = createMapDoc("پر", 9);
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  for (let i = 0; i < PATCH_CAP; i++) doc.patches[i] = 1;
  void W; void H;
  const base = baseTerrain(9);
  const r = paintCells(doc, base, 40, 40, 1, base[40 * CONFIG.GRID_W + 40] === 1 ? 2 : 1);
  must(r.capped && patchCount(doc) === PATCH_CAP, "پس از سقف نباید وصله تازه نشست");
  return { name: "سقف وصله", pass: true, detail: `سقف ${PATCH_CAP}` };
}

function t_mapedit_apply() {
  const W = CONFIG.GRID_W;
  const base = baseTerrain(CONFIG.MAP_SEED);
  const before = base[10 * W + 10];
  const out = applyPatches(base, [[10 * W + 10, before === 1 ? 2 : 1]]);
  must(base[10 * W + 10] === before, "زمین پایه نباید جهش بخورد");
  must(out[10 * W + 10] !== before, "زمین خروجی باید وصله را داشته باشد");
  const plain = customTerrain(CONFIG.MAP_SEED, null);
  must(plain.length === base.length && plain.every((v, i) => v === base[i]), "بی‌وصله = همان سید");
  return { name: "اعمال خالص وصله", pass: true, detail: "کپی + برابری سید" };
}

function t_mapedit_validate() {
  const good = { v: MAP_V, name: "دشت", seed: 5, patches: [[0, 1], [4095, 2], [100, 3]] }; // تایل ۳ = واحه (0.154.0 — بند 107)
  must(validateMapDoc(good).ok, "سند سالم باید قبول شود");
  const objForm = { v: MAP_V, name: "دشت", seed: 5, patches: { 3: 1, 4: 2 } };
  must(validateMapDoc(objForm).ok, "فرم نگاشتی باید قبول شود");
  const bads = [
    null, 42, "x", [],
    { v: 999, name: "x", seed: 1, patches: [] },
    { v: MAP_V, name: "  ", seed: 1, patches: [] },
    { v: MAP_V, name: "x", seed: -1, patches: [] },
    { v: MAP_V, name: "x", seed: 1, patches: "no" },
    { v: MAP_V, name: "x", seed: 1, patches: [[-1, 1]] },
    { v: MAP_V, name: "x", seed: 1, patches: [[4096, 1]] },
    { v: MAP_V, name: "x", seed: 1, patches: [[0, 4]] }, // تایل ۴ همچنان نامعتبر است
    { v: MAP_V, name: "x", seed: 1, patches: [[0]] },
  ];
  for (const b of bads) {
    must(!validateMapDoc(b).ok, `سند خراب باید رد شود: ${JSON.stringify(b)}`);
  }
  const big = { v: MAP_V, name: "x", seed: 1, patches: [] };
  for (let i = 0; i <= PATCH_CAP; i++) big.patches.push([i, 1]);
  must(!validateMapDoc(big).ok, "بیش از سقف باید رد شود");
  return { name: "اعتبارسنجی سند", pass: true, detail: `${bads.length + 1} رد` };
}

function t_mapedit_export_import() {
  const doc = createMapDoc("  دشت   من  ", 77);
  must(doc.name === "دشت من", `نام باید تمیز شود، شد «${doc.name}»`);
  const base = baseTerrain(77);
  paintCells(doc, base, 10, 10, 2, 1);
  paintCells(doc, base, 10, 10, 2, 2); // بازنویسی: آخری می‌برد
  const text = exportMapDoc(doc);
  const r = importMapDoc(text);
  must(r.ok, `رفت‌وبرگشت باید سالم باشد، شد ${r.reason}`);
  must(r.doc.name === doc.name && r.doc.seed === 77, "نام/سید باید بماند");
  must(JSON.stringify(patchesList(r.doc)) === JSON.stringify(patchesList(doc)), "وصله‌ها باید بمانند");
  must(!importMapDoc("{oops").ok, "JSON خراب باید رد شود");
  must(!importMapDoc('{"v":1,"name":"x","seed":1,"patches":[[0,9]]}').ok, "تایل نامعتبر باید رد شود");
  return { name: "خروجی/ورودی", pass: true, detail: `${text.length} نویسه` };
}

function t_mapedit_playable() {
  const ok = validatePlayable(CONFIG.MAP_SEED, null);
  must(ok.ok, `سید خالص باید قابل‌بازی باشد، شد ${ok.reason}`);
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const flood = [];
  for (let i = 0; i < W * H; i++) flood.push([i, 1]); // همه آب
  const bad = validatePlayable(CONFIG.MAP_SEED, flood);
  must(!bad.ok && bad.reason === "KEEP", `سیل کامل باید در ستاد رد شود، شد ${bad.reason}`);
  return { name: "قابل‌بازی‌بودن", pass: true, detail: "سید ✓ / سیل ✗(KEEP)" };
}

function t_mapedit_save_load() {
  const W = CONFIG.GRID_W;
  const base = baseTerrain(CONFIG.MAP_SEED);
  const idx = 30 * W + 30;
  const patches = [[idx, base[idx] === 1 ? 2 : 1]];
  const { state } = newSoloFromSeed(CONFIG.MAP_SEED, "normal", patches, "جزیره");
  must(state.mapName === "جزیره", "نام باید در state بنشیند");
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.mapName === "جزیره", "نام باید در ذخیره بماند");
  must(JSON.stringify(loaded.mapPatches) === JSON.stringify(patches), "وصله‌ها باید در ذخیره بمانند");
  const old = JSON.parse(serializeJSON(state));
  delete old.mapName; delete old.mapPatches;
  const legacy = deserializeJSON(JSON.stringify(old));
  must(legacy.mapName === "" && legacy.mapPatches === null, "ذخیره قدیمی = زمین خالص سیدی");
  const bad = JSON.parse(serializeJSON(state));
  bad.mapPatches = [[0, 7]];
  let threw = false;
  try { deserializeJSON(JSON.stringify(bad)); } catch (e) { threw = true; }
  must(threw, "وصله نامعتبر باید رد شود");
  return { name: "ذخیره نقشه سفارشی", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}

function t_mapedit_replay() {
  const W = CONFIG.GRID_W;
  const base = baseTerrain(913);
  // آب در نقطه‌ای که حتماً چمن سید است (دور از دریاچه/سنگ با جست‌وجو)
  let cell = -1;
  for (let r = 45; r < 60 && cell < 0; r++) {
    for (let c = 45; c < 60 && cell < 0; c++) {
      if (base[r * W + c] === 0) cell = r * W + c;
    }
  }
  must(cell >= 0, "خانه چمن برای وصله باید باشد");
  const map = { name: "تست", patches: [[cell, 1]] };
  const a = runReplay({ v: REPLAY_V, seed: 913, map, cmds: [], ticks: 200 }, 200);
  must(a.terrain[cell] === 1, "زمین بازپخش باید وصله را داشته باشد");
  must(a.state.mapName === "تست", "نام باید در state بازپخش بنشیند");
  const b = runReplay({ v: REPLAY_V, seed: 913, map, cmds: [], ticks: 200 }, 200);
  must(a.hash === b.hash, "بازپخش نقشه سفارشی باید قطعی باشد");
  must(!validateReplayLog({ v: REPLAY_V, seed: 1, map: { name: "", patches: [] }, cmds: [] }).ok,
    "نقشه بی‌نام در لاگ باید رد شود");
  must(!validateReplayLog({ v: REPLAY_V, seed: 1, map: { name: "x", patches: [[0, 5]] }, cmds: [] }).ok,
    "وصله خراب در لاگ باید رد شود");
  return { name: "ری‌پلی نقشه سفارشی", pass: true, detail: "اعمال + قطعیت + رد خراب" };
}

function t_mapedit_slot() {
  const doc = createMapDoc("اسلات", 55);
  const base = baseTerrain(55);
  paintCells(doc, base, 12, 12, 2, 1);
  must(saveCustomSlot(doc), "ذخیره اسلات باید موفق باشد");
  const back = loadCustomSlot();
  must(back && back.name === "اسلات" && back.seed === 55, "اسلات باید برگردد");
  must(JSON.stringify(patchesList(back)) === JSON.stringify(patchesList(doc)), "وصله‌های اسلات باید بمانند");
  try { localStorage.setItem(CUSTOM_KEY, "{خراب"); } catch (e) {}
  must(loadCustomSlot() === null, "اسلات خراب = null");
  try { localStorage.removeItem(CUSTOM_KEY); } catch (e) {}
  must(loadCustomSlot() === null, "اسلات خالی = null");
  return { name: "اسلات محلی", pass: true, detail: "رفت‌وبرگشت + تحمل خرابی" };
}

export function mapeditCases() {
  return [t_mapedit_paint_erase, t_mapedit_brush_clip, t_mapedit_cap, t_mapedit_apply,
    t_mapedit_validate, t_mapedit_export_import, t_mapedit_playable,
    t_mapedit_save_load, t_mapedit_replay, t_mapedit_slot, t_named_maps, t_map_thumbs];
}
// --- نقشه‌های نام‌دار (0.52.0 — #۱۸ از FEATURES) ---

function t_named_maps() {
  const maps = CONFIG.MAPS;
  must(Array.isArray(maps) && maps.length === 3, `کاتالوگ باید ۳ نقشه باشد، هست ${maps && maps.length}`);
  const keys = new Set(), seeds = new Set();
  for (const m of maps) {
    must(m && typeof m.key === "string" && m.key, "کلید باید باشد");
    must(typeof m.name === "string" && m.name.trim() && m.name.length <= 24, `نام «${m.name}» باید ۱..۲۴ نویسه باشد`);
    must(Number.isInteger(m.seed) && m.seed >= 1 && m.seed <= 4294967295, `سید «${m.key}» باید معتبر باشد`);
    must(!keys.has(m.key), `کلید تکراری: ${m.key}`);
    must(!seeds.has(m.seed), `سید تکراری: ${m.seed}`);
    keys.add(m.key); seeds.add(m.seed);
  }
  must(namedMapByKey("highlands").seed === 424242, "جست‌وجوی کلید باید کار کند");
  must(namedMapByKey("nope") === null, "کلید ناموجود = null");
  must(mapNameFor(1337) === "دشت آغازین", "نام سید کاتالوگ باید برگردد");
  must(mapNameFor(123456789) === "", "سید ناشناس = بی‌نام");
  const terrains = maps.map((m) => {
    const v = validatePlayable(m.seed, null);
    must(v.ok, `«${m.name}» باید قابل‌بازی باشد، شد ${v.reason}`);
    return baseTerrain(m.seed);
  });
  const diff = (a, b) => {
    let n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
    return n;
  };
  must(diff(terrains[0], terrains[1]) > 0, "دشت و کوهستان باید فرق کنند");
  must(diff(terrains[0], terrains[2]) > 0, "دشت و گذرگاه باید فرق کنند");
  must(diff(terrains[1], terrains[2]) > 0, "کوهستان و گذرگاه باید فرق کنند");
  return { name: "نقشه‌های نام‌دار", pass: true, detail: maps.map((m) => m.name).join(" + ") };
}
// پیش‌نمایش نقشه (0.177.0 — بند 90): thumbnail + توضیح کوتاه.
function t_map_thumbs() {
  must(paintMapThumb(null, 1337) === false, "بوم نامعتبر = false");
  must(typeof t("game.map.meadow.desc") === "string" && t("game.map.meadow.desc") !== "game.map.meadow.desc", "کلید fa دشت");
  const enD = withLang("en", () => t("game.map.meadow.desc"));
  must(typeof enD === "string" && enD.length > 0 && enD !== "game.map.meadow.desc", "کلید en دشت");
  must(t("game.map.custom.desc") !== "game.map.custom.desc", "کلید custom");
  if (typeof document === "undefined") return { name: "پیش‌نمایش نقشه", pass: true, detail: "بدون DOM رد شد" };
  const cv = document.createElement("canvas");
  cv.width = 144; cv.height = 144;
  must(paintMapThumb(cv, 1337) === true, "رسم thumbnail");
  must(!!document.getElementById("mapThumb") && !!document.getElementById("mapDesc"), "عناصر پیش‌نمایش در DOM");
  const md = document.getElementById("mapDesc");
  must((md.textContent || "").length > 0, "توضیح نقشه پر است");
  return { name: "پیش‌نمایش نقشه", pass: true, detail: "رسم + desc" };
}