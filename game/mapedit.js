// نقشه‌ساز داخل‌بازی (0.51.0 — #۲۲ از FEATURES، الگوی CHG-043/IDEA-031).
//
// مدل: نقشه سفارشی = سید پایه + وصله‌ها (patches) روی زمین سیدساز.
// سند: {v:1, name, seed, patches:{idx:tile}} که idx = r*W+c و tile یکی از
// ۰=چمن/۱=آب/۲=سنگ است. همین فشردگی در ذخیره، ری‌پلی و خروجی/ورودی می‌ماند
// (نه کل آرایه ۴۰۹۶تایی)؛ بازسازی همیشه قطعی است: makeTerrain(seed) + patches.
// پاک‌کن = حذف وصله (برگشت به تایل سید)، پس «نقاشی چمن روی چمن سید» وصله
// نمی‌سازد و سند لاغر می‌ماند.
//
// validatePlayable با اجرای واقعیِ شروع بازی روی state موقت (placeKeep +
// spawnLord + startAI) قابل‌بازی‌بودن را ثابت می‌کند — نه با حدس هندسی.
import { CONFIG } from "./config.js";
import { makeTerrain, T_GRASS, T_WATER, T_ROCK } from "./terrain.js";
import { createState } from "./state.js";
import { placeKeep } from "./construction.js";
import { spawnLord } from "./combat.js";
import { startAI } from "./ai.js";

export const MAP_V = 1;
export const MAP_NAME_MAX = 24;
export const PATCH_CAP = 2048; // سقف وصله یکتا (نیمی از نقشه؛ ضد نفخ)
export const CUSTOM_KEY = "scw.customMap"; // تنها اسلات محلی نقشه سفارشی
export const TILE_NAMES = { [T_GRASS]: "چمن", [T_WATER]: "آب", [T_ROCK]: "سنگ" };
export const BRUSHES = [1, 2, 4, 8, 16, 32]; // اندازه قلم مربعی (پوشش «گرید ۸…۳۲»)

function W() { return CONFIG.GRID_W; }
function H() { return CONFIG.GRID_H; }

export function cleanMapName(n) {
  const s = String(n == null ? "" : n).trim().replace(/\s+/g, " ");
  return s.slice(0, MAP_NAME_MAX);
}

export function createMapDoc(name, seed) {
  const clean = cleanMapName(name);
  return {
    v: MAP_V,
    name: clean || "نقشه سفارشی",
    seed: (seed >>> 0) || CONFIG.MAP_SEED,
    patches: {},
  };
}

// فهرست مرتب وصله‌ها برای ذخیره/ری‌پلی/خروجی: [[idx, tile], ...].
export function patchesList(doc) {
  return Object.keys(doc.patches)
    .map((k) => [parseInt(k, 10), doc.patches[k]])
    .sort((a, b) => a[0] - b[0]);
}

export function patchCount(doc) {
  return Object.keys(doc.patches).length;
}

export function baseTerrain(seed) {
  return makeTerrain(W(), H(), seed);
}

// اعمال خالص وصله‌ها روی یک زمین (کپی تازه برمی‌گرداند).
export function applyPatches(base, patches) {
  const t = base.slice();
  const n = W() * H();
  if (Array.isArray(patches)) {
    for (const [idx, tile] of patches) {
      if (Number.isInteger(idx) && idx >= 0 && idx < n && (tile === 0 || tile === 1 || tile === 2)) {
        t[idx] = tile;
      }
    }
  } else if (patches && typeof patches === "object") {
    for (const k of Object.keys(patches)) {
      const idx = parseInt(k, 10);
      const tile = patches[k];
      if (Number.isInteger(idx) && idx >= 0 && idx < n && (tile === 0 || tile === 1 || tile === 2)) {
        t[idx] = tile;
      }
    }
  }
  return t;
}

// زمین نهایی یک سند (سید + وصله‌ها) — همان که بازی/ری‌پلی می‌سازد.
export function customTerrain(seed, patchList) {
  return applyPatches(baseTerrain((seed >>> 0) || CONFIG.MAP_SEED), patchList);
}

// نقاشی مربع قلم روی سند: tile=null یعنی پاک‌کن (برگشت به تایل سید).
// برمی‌گرداند {painted, capped}؛ capped یعنی سقف وصله پر شد و بقیه نماند.
export function paintCells(doc, base, c0, r0, size, tile) {
  const w = W(), h = H();
  let painted = 0;
  const has = Object.prototype.hasOwnProperty;
  for (let r = r0; r < r0 + size; r++) {
    if (r < 0 || r >= h) continue;
    for (let c = c0; c < c0 + size; c++) {
      if (c < 0 || c >= w) continue;
      const idx = r * w + c;
      if (tile == null || tile === base[idx]) {
        if (has.call(doc.patches, idx)) { delete doc.patches[idx]; painted++; }
      } else {
        if (has.call(doc.patches, idx)) {
          if (doc.patches[idx] !== tile) { doc.patches[idx] = tile; painted++; }
        } else {
          if (patchCount(doc) >= PATCH_CAP) return { painted, capped: true };
          doc.patches[idx] = tile;
          painted++;
        }
      }
    }
  }
  return { painted, capped: false };
}

export function clearPatches(doc) {
  doc.patches = {};
}

// اعتبارسنجی شکل سند (ورودی کاربر/localStorage ممکن است دست‌کاری شده باشد).
export function validateMapDoc(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return { ok: false, reason: "NOT_OBJECT" };
  if (o.v !== MAP_V) return { ok: false, reason: "BAD_VERSION" };
  if (typeof o.name !== "string" || !cleanMapName(o.name)) return { ok: false, reason: "BAD_NAME" };
  if (cleanMapName(o.name).length > MAP_NAME_MAX) return { ok: false, reason: "BAD_NAME" };
  if (!Number.isInteger(o.seed) || o.seed < 0 || o.seed > 4294967295) return { ok: false, reason: "BAD_SEED" };
  const p = o.patches;
  const list = Array.isArray(p) ? p : null;
  const obj = p && typeof p === "object" && !Array.isArray(p) ? p : null;
  if (!list && !obj) return { ok: false, reason: "BAD_PATCHES" };
  const n = W() * H();
  const entries = list || Object.keys(obj).map((k) => [parseInt(k, 10), obj[k]]);
  if (entries.length > PATCH_CAP) return { ok: false, reason: "CAP" };
  for (const e of entries) {
    if (!Array.isArray(e) || e.length !== 2) return { ok: false, reason: "BAD_PATCH" };
    const [idx, tile] = e;
    if (!Number.isInteger(idx) || idx < 0 || idx >= n) return { ok: false, reason: "BAD_PATCH" };
    if (tile !== 0 && tile !== 1 && tile !== 2) return { ok: false, reason: "BAD_TILE" };
  }
  return { ok: true, reason: "OK" };
}

// نرمال‌سازی پس از اعتبارسنجی: فهرست→نگاشت (تکراری: آخری می‌برد)، نام تمیز.
export function normalizeMapDoc(o) {
  const doc = createMapDoc(o.name, o.seed);
  const p = o.patches;
  const entries = Array.isArray(p) ? p : Object.keys(p).map((k) => [parseInt(k, 10), p[k]]);
  for (const [idx, tile] of entries) doc.patches[idx] = tile;
  return doc;
}

export function exportMapDoc(doc) {
  return JSON.stringify({ v: MAP_V, name: doc.name, seed: doc.seed >>> 0, patches: patchesList(doc) });
}

export function importMapDoc(text) {
  let o;
  try {
    o = JSON.parse(String(text));
  } catch (e) {
    return { ok: false, reason: "NOT_JSON" };
  }
  const v = validateMapDoc(o);
  if (!v.ok) return v;
  return { ok: true, reason: "OK", doc: normalizeMapDoc(o) };
}

// قابل‌بازی‌بودن واقعی (0.51.0): شروع کامل سولو روی state موقت — ستاد
// بازیکن (مارپیچ از مرکز) + ارباب + ستاد حریف (گوشه مخالف) باید بنشینند.
export function validatePlayable(seed, patchList) {
  const w = W(), h = H();
  let terrain;
  try {
    terrain = customTerrain(seed, patchList);
  } catch (e) {
    return { ok: false, reason: "TERRAIN" };
  }
  const state = createState();
  state.mapSeed = (seed >>> 0) || CONFIG.MAP_SEED;
  const k = placeKeep(state, terrain, w, h);
  if (!k.ok) return { ok: false, reason: "KEEP" };
  const l = spawnLord(state, terrain, w, h);
  if (!l.ok) return { ok: false, reason: "LORD" };
  const a = startAI(state, terrain, w, h);
  if (!a.ok) return { ok: false, reason: "AI" };
  return { ok: true, reason: "OK" };
}

// نقشه‌های نام‌دار (0.52.0 — #۱۸): کاتالوگ CONFIG.MAPS.
// کلید → ورودی؛ سید → نام نمایشی ("" یعنی سفارشی/ناشناس).
export function namedMapByKey(key) {
  return CONFIG.MAPS.find((m) => m.key === key) || null;
}

export function mapNameFor(seed) {
  const m = CONFIG.MAPS.find((m) => m.seed === ((seed >>> 0) || CONFIG.MAP_SEED));
  return m ? m.name : "";
}

export function saveCustomSlot(doc) {
  try {
    localStorage.setItem(CUSTOM_KEY, exportMapDoc(doc));
    return true;
  } catch (e) {
    return false;
  }
}

// بارگذاری اسلات با اعتبارسنجی (خراب = null، مثل ری‌پلی).
export function loadCustomSlot() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return null;
    const r = importMapDoc(raw);
    return r.ok ? r.doc : null;
  } catch (e) {
    return null;
  }
}
