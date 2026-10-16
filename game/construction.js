// اعتبارسنجی محل ساخت (CONST-001).
// اولویت دلیل: خارج نقشه > زمین نامناسب > اشغال‌شده > اتصال/فاصله/یکتایی > منابع ناکافی.
import { CONFIG } from "./config.js";
import { occupyFootprint } from "./state.js";
import { T_GRASS } from "./terrain.js";

export const REASONS = {
  OK: "OK",
  OUT_OF_BOUNDS: "OUT_OF_BOUNDS",
  TERRAIN: "TERRAIN",
  OCCUPIED: "OCCUPIED",
  ANCHOR: "ANCHOR",
  SPACING: "SPACING",
  UNIQUE: "UNIQUE",
  INSUFFICIENT: "INSUFFICIENT",
};

export const REASON_FA = {  OK: "معتبر",
  OUT_OF_BOUNDS: "خارج از نقشه",
  TERRAIN: "زمین نامناسب (آب/سنگ)",
  OCCUPIED: "اشغال‌شده",
  ANCHOR: "دیوار باید به ساختمان یا دیوار بچسبد (۴جهته)",
  SPACING: "فاصله ناکافی از ساختمان هم‌نوع",
  UNIQUE: "ساختمان یکتا — فقط یک نمونه",
  INSUFFICIENT: "منابع ناکافی",
};

export function affordable(resources, cost) {  cost = cost || {};
  for (const k of Object.keys(cost)) {
    if ((resources[k] || 0) < cost[k]) return false;
  }
  return true;
}

function payCost(resources, cost) {
  cost = cost || {};
  for (const k of Object.keys(cost)) resources[k] = (resources[k] || 0) - (cost[k] || 0);
}

// ساخت‌وساز تدریجی (0.39.0 — #۳ از FEATURES): ساختمان تازه `buildLeft` تیک
// (از `buildTime` تعریفش) نیمه‌کاره است — اشغال می‌کند ولی کار نمی‌کند
// (بدون تولید/کارگر/مسکن/شلیک/استخدام). غایب در قدیمی = تکمیل.
export function underConstruction(b) {
  return (b.buildLeft || 0) > 0;
}

// فاصله خالی چبی‌شف میان دو ردپا (۰ = چسبیده، منفی = هم‌پوشان).
function footprintGap(a, b) {
  const aR = a.c + a.w - 1, aB = a.r + a.h - 1;
  const bR = b.c + b.w - 1, bB = b.r + b.h - 1;
  return Math.max(b.c - aR - 1, a.c - bR - 1, b.r - aB - 1, a.r - bB - 1);
}

export function validate(state, terrain, W, H, c, r, def, owner) {
  owner = owner == null ? 0 : owner;
  const mp = state.mp && state.mp.enabled;
  // کانتینر هزینه AI جدا (0.42.0).
  const res = mp ? state.mpres[owner].resources
    : (owner === CONFIG.AI.owner && state.ai ? state.ai.resources : state.resources);
  let badTerrain = false;
  let badOccupied = false;
  for (let j = 0; j < def.h; j++) {
    for (let i = 0; i < def.w; i++) {
      const cc = c + i, rr = r + j;
      if (cc < 0 || rr < 0 || cc >= W || rr >= H) return { ok: false, reason: REASONS.OUT_OF_BOUNDS };
      const t = terrain[rr * W + cc];
      if (t !== T_GRASS) badTerrain = true;
      else if (state.occ[rr * W + cc] === 1) badOccupied = true;
    }
  }
  if (badTerrain) return { ok: false, reason: REASONS.TERRAIN };
  if (badOccupied) return { ok: false, reason: REASONS.OCCUPIED };
  // قانون اتصال دیوار: دست‌کم یک همسایه ۴جهته باید ردپای بنای موجود (غیر ویران) باشد.
  // ویران‌شده لنگر نیست (وگرنه زنجیره روی آوارِ در حال پاک‌سازی سوار می‌شد).
  // در MP فقط بنای خودی لنگر است.
  if (def.rules && def.rules.anchorToAny) {
    let anchored = false;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= W || nr >= H) continue;
      for (const b of state.buildings) {
        if (b.destroyed) continue;
        if (mp && (b.owner == null ? 0 : b.owner) !== owner) continue;
        if (nc >= b.c && nc < b.c + b.w && nr >= b.r && nr < b.r + b.h) { anchored = true; break; }
      }
      if (anchored) break;
    }
    if (!anchored) return { ok: false, reason: REASONS.ANCHOR };
  }
  // قانون خاص ساختمان: فاصله از هم‌نوع (فقط وقتی ردپا کاملاً داخل نقشه و آزاد است)
  // در MP فقط هم‌نوع خودی شمرده می‌شود.
  const need = def.rules && def.rules.spacingFromSame;
  if (need) {
    const cand = { c, r, w: def.w, h: def.h };
    for (const b of state.buildings) {
      if (b.type !== def.key) continue;
      if (mp && (b.owner == null ? 0 : b.owner) !== owner) continue;
      if (footprintGap(cand, b) < need) return { ok: false, reason: REASONS.SPACING };
    }
  }
  // ساختمان یکتا (ستاد، 0.19.0): نمونه سالم موجودِ همان مالک = رد، حتی روی زمین آزاد.
  // ویران‌شده مانع نیست (هرچند پس از شکست عملاً بازی تمام است).
  // یکتا همیشه به‌ازای مالک است (0.42.0: ستاد AI با وجود ستاد بازیکن ساخته می‌شود).
  if (def.rules && def.rules.unique) {
    if (state.buildings.some((b) => b.type === def.key && !b.destroyed && (b.owner == null ? 0 : b.owner) === owner)) {
      return { ok: false, reason: REASONS.UNIQUE };
    }
  }
  if (!affordable(res, def.cost)) return { ok: false, reason: REASONS.INSUFFICIENT };
  return { ok: true, reason: REASONS.OK };
}

export function tryPlace(state, terrain, W, H, c, r, def, owner) {
  owner = owner == null ? 0 : owner;
  const v = validate(state, terrain, W, H, c, r, def, owner);
  if (!v.ok) {
    state.rejected++;
    return v;
  }
  const mp = state.mp && state.mp.enabled;
  const res = mp ? state.mpres[owner].resources
    : (owner === CONFIG.AI.owner && state.ai ? state.ai.resources : state.resources);
  payCost(res, def.cost); // کسر فقط پس از پذیرش
  const b = { id: state.nextId++, type: def.key, c, r, w: def.w, h: def.h,
    hp: def.hp, maxHp: def.hp, cooldown: 0, targetId: null, owner,
    buildLeft: def.buildTime || 0, // شمارش معکوس ساخت (0.39.0؛ ستاد ۰ است)
    // گاریسون برج (0.45.0): آرایه شناسه مدافعان، سقف ۴ — بقیه ساختمان‌ها ندارند.
    ...(def.key === "tower" ? { garrison: [] } : {}),
    // دروازه نو باز است (0.13.0)؛ بقیه ساختمان‌ها فیلد open ندارند.
    ...(def.key === "gate" ? { open: true } : {}) };
  state.buildings.push(b);
  occupyFootprint(state, W, c, r, def.w, def.h);
  state.placed++;
  return { ok: true, reason: REASONS.OK, building: b };
}

// ستاد آغازین (0.19.0): نزدیک‌ترین جای ۴×۴ چمنِ آزاد به مرکز نقشه، رایگان
// (بدون کسر منابع — cost ستاد تهی است و tryPlace چیزی کم نمی‌کند). قطعی است
// (پیمایش مارپیچ ثابت، بدون RNG). نمونه سالم موجود → UNIQUE؛ جا نیست → TERRAIN.
export function placeKeep(state, terrain, W, H) {
  const def = CONFIG.BUILDINGS.keep;
  if (state.buildings.some((b) => b.type === "keep" && !b.destroyed)) {
    return { ok: false, reason: REASONS.UNIQUE };
  }
  const fits = (c, r) => {
    if (c < 0 || r < 0 || c + def.w > W || r + def.h > H) return false;
    for (let j = 0; j < def.h; j++) {
      for (let i = 0; i < def.w; i++) {
        if (terrain[(r + j) * W + (c + i)] !== T_GRASS) return false;
        if (state.occ[(r + j) * W + (c + i)] === 1) return false;
      }
    }
    return true;
  };
  const cc = Math.floor(W / 2) - Math.floor(def.w / 2);
  const cr = Math.floor(H / 2) - Math.floor(def.h / 2);
  for (let rad = 0; rad < Math.max(W, H); rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        if (fits(cc + dc, cr + dr)) {
          return tryPlace(state, terrain, W, H, cc + dc, cr + dr, def);
        }
      }
    }
  }
  return { ok: false, reason: REASONS.TERRAIN };
}

// ستاد چندنفره (0.24.0): مثل placeKeep ولی لنگر گوشه + مالک جدا.
// یکتایی به‌ازای هر بازیکن؛ مارپیچ قطعی از (ac,ar).
export function placeKeepFor(state, terrain, W, H, owner, ac, ar) {
  const def = CONFIG.BUILDINGS.keep;
  if (state.buildings.some((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === owner)) {
    return { ok: false, reason: REASONS.UNIQUE };
  }
  const fits = (c, r) => {
    if (c < 0 || r < 0 || c + def.w > W || r + def.h > H) return false;
    for (let j = 0; j < def.h; j++) {
      for (let i = 0; i < def.w; i++) {
        if (terrain[(r + j) * W + (c + i)] !== T_GRASS) return false;
        if (state.occ[(r + j) * W + (c + i)] === 1) return false;
      }
    }
    return true;
  };
  const cc = Math.max(0, Math.min(W - def.w, ac - Math.floor(def.w / 2)));
  const cr = Math.max(0, Math.min(H - def.h, ar - Math.floor(def.h / 2)));
  for (let rad = 0; rad < Math.max(W, H); rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        if (fits(cc + dc, cr + dr)) {
          return tryPlace(state, terrain, W, H, cc + dc, cr + dr, def, owner);
        }
      }
    }
  }
  return { ok: false, reason: REASONS.TERRAIN };
}
