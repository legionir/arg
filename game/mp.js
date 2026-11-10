// حالت رقابتی (0.24.0): FFA روی یک مپ مشترک، ۲ تا ۴ بازیکن.
// (0.25.0): نقشه ۴۸×۴۸ با لنگرهای نسبی به ابعاد — هر گوشه یک پایگاه ۹×۹.
// سرور فقط seq می‌زند و پخش می‌کند؛ همه منطق قطعی اینجاست.
// ورودی‌ها: {seq, slot, kind, args, tick} + execTick = tick + INPUT_DELAY.
import { CONFIG } from "./config.js";
import { isGarrisonPost, KILLPIT_CHARGES, DOGS_PER_CAGE, stableHorses, pushEvent } from "./combat.js";
import { t as tr } from "./i18n.js";
import { capFor } from "./economy.js";
export const MP_MAX = 4;
export const MP_MIN = 2;
export const INPUT_DELAY = 6;
export const PLAYER_COLORS = ["#4d9de0", "#e05c4d", "#58b368", "#e0b44d"];
// ترتیب اسلات‌ها: بالا-چپ، پایین-راست، بالا-راست، پایین-چپ.
export function mpSpawnAnchor(i, W, H) {
  W = W || CONFIG.GRID_W; H = H || CONFIG.GRID_H;
  const m = [[5, 5], [W - 6, H - 6], [W - 6, 5], [5, H - 6]];
  return m[i];
}
export const MP_SPAWN_ANCHOR = [0, 1, 2, 3].map((i) => mpSpawnAnchor(i, CONFIG.GRID_W, CONFIG.GRID_H));

export function mpStartRes() {
  return { wood: 120, food: 120, gold: 60, stone: 40, wheat: 20, flour: 0, hops: 0, beer: 0, iron: 0, swords: 0, bows: 0, meat: 0, cheese: 0, apples: 0, leather: 0 };
}

// گوشه‌های اسپاون را (قطعی) چمن کن — روی terrain مشترک همه کلاینت‌ها یکسان.
// solo دست نمی‌خورد (فقط MP صدا می‌زند). هر پایگاه ۹×۹ با حاشیه ۱ از لبه.
export function mpClearSpawns(terrain, W, H) {
  const corners = [[1, 1], [W - 10, H - 10], [W - 10, 1], [1, H - 10]];
  for (const [c0, r0] of corners) {
    for (let r = r0; r <= r0 + 8; r++) {
      for (let c = c0; c <= c0 + 8; c++) {
        if (c < 0 || r < 0 || c >= W || r >= H) continue;
        terrain[r * W + c] = 0; // T_GRASS
      }
    }
  }
}

// برش اقتصادی هر بازیکن (آینه فیلدهای solo در state.js).
export function createMpPlayer() {
  return {
    resources: mpStartRes(),
    workers: 4,
    workerCap: 12,
    freeWorkers: 4,
    popularity: 50,
    popTarget: 50,
    popDir: 0,
    tax: "none",
    rations: "normal",
    offFood: [], // غذاهای متوقف‌شده (فاز ۱ بند ۸۵؛ آینه solo)
    eatAcc: 0,
    producedTotal: 0,
    consumedTotal: 0,
    shortageTotal: 0,
    alive: true,
  };
}

// state تک‌نفره را به حالت MP می‌برد (بعد از clear + قبل از place). names اختیاری.
export function enableMp(state, numPlayers, names) {
  state.mp = { enabled: true, num: numPlayers, seed: 0, winner: -1, over: false };
  state.mpres = [];
  for (let i = 0; i < numPlayers; i++) {
    const p = createMpPlayer();
    if (names && names[i]) p.name = names[i];
    state.mpres.push(p);
  }
  state.mpNames = names ? names.slice() : [];
}

export function mpOwnerOf(b) {
  return b && b.owner != null ? b.owner : 0;
}

// هش FNV-1a برای تشخیص desync و آزمون قطعیت (0.37.0: پوشش کامل وضعیت
// منطقی — شناسه‌ها، اقتصاد، دستورها و پرچم‌ها؛ path واحدها عمداً بیرون است
// چون گذراست و پس از load بازمحاسبه می‌شود).
// (فاز ۰ بند ۲: جریان RNG هم mix می‌شود — دو وضعیت با آینده تصادفی متفاوت
// هم‌ارز نیستند؛ null یعنی تنبل از mapSeed پس همان مشتق mix می‌شود.
// موقعیت‌ها با ‎*64‎ کوانتیزه‌اند چون منطق Q6 است — دقیق و پایدار در JSON.)
export function stateHash(state) {
  let h = 2166136261 >>> 0;
  const mix = (n) => {
    h ^= (n >>> 0);
    h = Math.imul(h, 16777619) >>> 0;
  };
  const mixStr = (s) => {
    s = String(s == null ? "" : s);
    for (let k = 0; k < s.length; k++) mix(s.charCodeAt(k));
  };
  mix(state.tick);
  mix((state.mapSeed == null ? 0 : state.mapSeed) >>> 0); // سید نقشه (0.26.0)
  mix(state.rng == null // جریان RNG (فاز ۰ بند ۲؛ null = مشتق تنبل از mapSeed)
    ? ((state.mapSeed == null ? 0 : state.mapSeed) >>> 0)
    : state.rng >>> 0);
  mix(state.nextId | 0);
  mix(state.nextUnitId | 0);
  mix(state.wave | 0);
  mix(state.placed | 0);
  mix(state.rejected | 0);
  mix(state.defeated ? 1 : 0);
  mix(state.victorious ? 1 : 0);
  const mixEcon = (ec) => {
    for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows", "meat", "cheese", "apples"]) mix(ec.resources[k] | 0);
    // چرم (0.142.0 — بند ۲۰۰): فقط ناصفر mix می‌شود تا هش‌های پین رگرسیون
    // (بدون چرم) دست‌نخورده بمانند؛ صفر/ناصفر از همین تفکیک می‌شود.
    if (ec.resources.leather) mix(ec.resources.leather | 0);
    mix(ec.workers); mix(ec.workerCap | 0); mix(ec.freeWorkers | 0);
    mix(ec.popularity); mix(ec.popTarget | 0); mix(ec.popDir | 0);
    mix(ec.eatAcc | 0);
    mix(ec.producedTotal | 0); mix(ec.consumedTotal | 0); mix(ec.shortageTotal | 0);
    mixStr(ec.tax); mixStr(ec.rations);
    for (const k of (ec.offFood || [])) mixStr(k); // توقف غذا (بند ۸۵؛ خالی = هیچ)
  };
  const mp = state.mp && state.mp.enabled;
  if (mp) {
    for (let i = 0; i < state.mpres.length; i++) {
      const p = state.mpres[i];
      mixEcon(p);
      mix(p.alive ? 1 : 0);
    }
  } else {
    mixEcon(state);
  }
  const bs = state.buildings.slice().sort((a, b) => a.id - b.id);
  for (const b of bs) {
    mix(b.id); mix(b.c); mix(b.r); mix(b.hp | 0); mix(mpOwnerOf(b));
    mix(b.progress | 0); mix(b.cooldown | 0); mix(b.targetId | 0);
    mix(b.buildLeft | 0); // شمارش ساخت (0.39.0)
    // گاریسون برج (0.45.0): شناسه مدافعان — ناسازگار با هش 0.44.
    if (isGarrisonPost(b.type) && Array.isArray(b.garrison)) {
      mix(b.garrison.length);
      for (const gid of b.garrison) mix(gid | 0);
    } else {
      mix(0);
    }
    // شارژ گودال (0.155.0 — بند 273): فقط killpit می‌خواند؛ غایب = پر.
    // سگ‌های قفس (0.156.0 — بند 288): فقط dogcage ناپر می‌خواند؛ غایب/پر = بی‌churn.
    if (b.type === "dogcage" && (b.dogs === undefined || b.dogs !== DOGS_PER_CAGE)) mix(b.dogs === undefined ? DOGS_PER_CAGE : (b.dogs | 0));
    if (b.type === "killpit") mix(b.charges === undefined ? KILLPIT_CHARGES : (b.charges | 0));
    // صف آموزش (0.65.0): فقط صف غیرخالی mix می‌شود تا هش‌های پین رگرسیون
    // ۸تایی (بدون صف) دست‌نخورده بمانند؛ خالی/غیرخالی از همین تفکیک می‌شود.
    if ((b.type === "barracks" || b.type === "mercpost" || b.type === "engineerguild" || b.type === "tunnelerguild") && Array.isArray(b.train) && b.train.length) {
      mix(b.train.length);
      for (const e of b.train) {
        mixStr(e.type); mix(e.left | 0); mix(e.total | 0); mix(e.c); mix(e.r);
        if (e.merc === true) mix(1); // مسیر طلایی (0.166.0 — §9.1/بند 169؛ غایب = قدیمی)
      }
    }
    mix(b.staffed === false ? 0 : 1); mix(b.starved ? 1 : 0);
    mix(b.type === "gate" ? (b.open === false ? 0 : 1) : 0);
    mix(b.type === "inn" ? (b.served ? 1 : 0) : 0);
    if (b.type === "dairy") { mix(b.cows | 0); mix(b.cowTicks | 0); }
    if (b.type === "stable") { mix(stableHorses(b)); if (b.horseLeft) mix(b.horseLeft | 0); } // گاوها (0.113.0)
    // آتش (0.148.0 — §۱۸.۴): فقط در حال سوختن mix می‌شود (پیش‌فرض قدیمی
    // = خاموش)؛ صفر/غایب هیچ‌چیز اضافه نمی‌کند تا هش‌های پین دست‌نخورده بمانند.
    if (b.fire) mix(b.fire | 0);
    mixStr(b.type);
  }
  const us = state.units.slice().sort((a, b) => a.id - b.id);
  for (const u of us) {
    if (u.dead) continue;
    mix(u.id); mix(u.hp | 0); mix(mpOwnerOf(u));
    mix((u.x * 64) | 0); mix((u.r * 64) | 0);
    mix(u.cooldown | 0); mix(u.targetId | 0);
    mix(u.guardBld | 0);
// پست تدافعی (0.153.0 — بند 567): فقط یگان defend mix می‌شود (آینده نبرد
// را عوض می‌کند)؛ بقیه هیچ churn ندارند تا پین‌های موجود سبز بمانند.
if (u.stance === "defend") { mix(((u.homeX != null ? u.homeX : u.x) * 64) | 0); mix(((u.homeR != null ? u.homeR : u.r) * 64) | 0); }
    mix(u.deployed ? 1 : 0); // استقرار منجنیق (0.46.0) — ناسازگار با هش 0.45
    // سردشدن پرتاب گاو (0.142.0): فقط مثبت mix می‌شود (صفر = پیش‌فرض قدیمی).
    if (u.cowCd) mix(u.cowCd | 0);
    // شکار تهاجمی (0.154.0 — §10.3/بند 568): فقط وقتی هست mix می‌شود
    // (null = پیش‌فرض قدیمی — بی‌churn تا شکار واقعی رخ دهد).
    if (u.huntId) mix(u.huntId | 0);
    // مهمات منجنیق (0.149.0 — §۱۲.۲/بند ۵۷۸): فقط ammoCapدارها این فیلد را
    // دارند؛ تعریف‌شده = mix (آینده نبرد را عوض می‌کند). پین‌های موجود سبز
    // ماندند (بدون بازپین).
    if (u.ammo !== undefined) mix(u.ammo | 0);
    mixStr(u.type); mixStr(u.side); mixStr(u.stance);
    mixStr(u.targetKind); mixStr(u.mission);
    if (u.order) {
      mixStr(u.order.kind); mix(u.order.c); mix(u.order.r);
      mixStr(u.order.status); mix(u.order.retries | 0); mix(u.order.elapsed | 0);
      // سرِ دوم گشت (0.162.0 — بند 236): فقط patrol می‌خواند (پیش‌فرض قدیمی = بی‌گشت).
      if (u.order.kind === "patrol") { mix(u.order.pc | 0); mix(u.order.pr | 0); }
      if (u.order.kind === "patrol" && Array.isArray(u.order.pts) && u.order.pts.length >= 2) {
        mix(u.order.pi | 0); mix(u.order.pts.length);
        for (const pt of u.order.pts) { mix(pt.c); mix(pt.r); }
      }
    } else {
      mixStr("-");
    }
    // صف وی‌پوینت (0.162.0 — بند 238): فقط ناته می‌خواند (پیش‌فرض قدیمی = بی‌صف).
    if (Array.isArray(u.wp) && u.wp.length) {
      mix(u.wp.length);
      for (const w of u.wp) { mixStr(w.kind); mix(w.c); mix(w.r); }
    }
  }
  // ابرهای بیماری (0.142.0 — بند ۲۱۴): فقط ناخالی mix می‌شود (پیش‌فرض قدیمی
  // = بی‌ابر)؛ ترتیب c/r/left قطعی است.
  if (Array.isArray(state.clouds) && state.clouds.length) {
    mix(state.clouds.length);
    for (const cl of state.clouds) { mix(cl.c); mix(cl.r); mix(cl.left | 0); }
  }
  // پرچم‌های تجمع (0.166.0 — §9.1/بند 170): فقط ناته mix می‌شود (پیش‌فرض
  // قدیمی = بی‌پرچم)؛ ترتیب کلید مرتب قطعی است.
  if (state.rally && typeof state.rally === "object") {
    const rk = Object.keys(state.rally).sort();
    if (rk.length) {
      mix(rk.length);
      for (const k of rk) { mixStr(k); mix(state.rally[k].c); mix(state.rally[k].r); }
    }
  }
  // قوانین اتاق (0.147.0 — §۱۲.۴): فقط noCow فعال mix می‌شود (پیش‌فرض قدیمی
  // = مجاز)؛ صفر/غایب هیچ‌چیز اضافه نمی‌کند تا هش‌های پین دست‌نخورده بمانند.
  if (state.rules && state.rules.noCow) mix(1);
  // دیوارهای مستحکم (0.148.0 — §۱۴.۲): فقط فعال mix می‌شود (مقدار متمایز ۲
  // تا ترکیب‌ها از هم تفکیک شوند)؛ خاموش هیچ churn ندارد.
  if (state.rules && state.rules.strongWalls) mix(2);
  // صلح No Rush (0.149.0 — §۱۴.۲/بند ۷۳۰): پرچم فعال با مقدار متمایز ۳ +
  // شمارنده peaceUntil (فقط ناصفر — صفر یعنی بی‌صلح، مثل قدیمی).
  if (state.rules && state.rules.noRush) mix(3);
  if (state.rules && state.rules.noDogs) mix(4);
  // اتاق No Dogs (0.156.0 — §11.9/بند 289): فقط فعال با مقدار متمایز 4 mix می‌شود.
  if (state.peaceUntil) mix(state.peaceUntil | 0);
  return ("0000000" + h.toString(16)).slice(-8);
}

// زنده‌بودن هر بازیکن: keep سالم یا lord زنده. برنده = آخرین بازمانده.
// غنیمت حذف (0.183.0 — §۱۸.۱/بند 871): روی گذار alive→dead، طلای کامل حذف‌شده +
// نصفِ کفِ هر کالای مثبت دیگرش بین بازماندگان تقسیم می‌شود (مساوی؛ باقیمانده به
// کمترین اسلات) با سقف capFor. همه guess (دفترچه فقط «طلا و بخشی از انبار»
// می‌گوید؛ سولو حریف lordدار ندارد پس فقط MP). قطعی و MP-امن (تابع خالص از
// state)؛ مازاد بر سقف می‌تراشد (مثل گیره اقتصاد).
const LOOT_KEYS = ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows", "meat", "cheese", "apples", "leather"];
export function lootEliminated(state, slot) {
  const mp = state.mp;
  if (!mp || !mp.enabled) return null;
  const gone = state.mpres[slot];
  if (!gone) return null;
  const alive = [];
  for (let i = 0; i < mp.num; i++) {
    if (i !== slot && state.mpres[i] && state.mpres[i].alive) alive.push(i);
  }
  if (!alive.length) return null;
  const take = {};
  for (const k of LOOT_KEYS) {
    const v = Math.floor(gone.resources[k] || 0);
    if (v <= 0) continue;
    take[k] = k === "gold" ? v : Math.floor(v / 2);
  }
  if (!Object.keys(take).length) return null;
  for (const k of Object.keys(take)) {
    const per = Math.floor(take[k] / alive.length);
    const rem = take[k] - per * alive.length;
    for (let j = 0; j < alive.length; j++) {
      const i = alive[j];
      const cur = state.mpres[i].resources[k] || 0;
      const g = Math.max(0, Math.min(per + (j === 0 ? rem : 0), capFor(state, k, i) - cur));
      state.mpres[i].resources[k] = cur + g;
    }
    gone.resources[k] = Math.max(0, (gone.resources[k] || 0) - take[k]);
  }
  pushEvent(state, tr("game.ev.loot", { p: slot + 1, g: take.gold || 0 }));
  return take;
}
export function updateMpAlive(state) {
  const mp = state.mp;
  if (!mp || !mp.enabled) return -1;
  const was = state.mpres.map((p) => !!p.alive);
  let aliveCount = 0, lastAlive = -1;
  for (let i = 0; i < mp.num; i++) {
    const p = state.mpres[i];
    const keep = state.buildings.some((b) => b.type === "keep" && !b.destroyed && mpOwnerOf(b) === i);
    const lord = state.units.some((u) => u.type === "lord" && !u.dead && mpOwnerOf(u) === i);
    p.alive = !!(keep || lord);
    if (p.alive) { aliveCount++; lastAlive = i; }
  }
  for (let i = 0; i < mp.num; i++) {
    if (was[i] && !state.mpres[i].alive) lootEliminated(state, i);
  }
  if (!mp.over && mp.num >= 2 && aliveCount <= 1) {
    mp.over = true;
    mp.winner = aliveCount === 1 ? lastAlive : -1;
  }
  return mp.winner;
}
