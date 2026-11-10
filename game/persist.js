// ذخیره و بازیابی نسخه‌دار در مرورگر (PERSIST-001).
// اشغال (occ) و سهمیه کارگر ذخیره نمی‌شوند — از ساختمان‌ها بازسازی می‌شوند.
// وضعیت مسیر واحدها (path/pathGoal/pathIdx در combat.js) هم ذخیره نمی‌شود —
// پس از load بازمحاسبه می‌شود (تست t_path_after_load).
// موقعیت رندر قبلی (px/pr برای درون‌یابی فاز ۰ بند ۱) هم ذخیره/هش نمی‌شود —
// پس از load برابر x/r می‌نشیند (بدون پرش رندر).
// v1 → v2: افزودن hp ساختمان‌ها + واحدها (مهاجرت خودکار، بدون از دست رفتن).
// v2 در بند ۶ کامل شد (ذخیره کامل وضعیت با نسخه‌گذاری فرمت — خط ۱۲۲۵):
// نقشه (سید + وصله‌ها)، موجودیت‌ها (ساختمان/یگان با همه پرچم‌ها)، RNG، تایمر
// (tick)، اهداف (wave/defeated/victorious)، AI، مالیات/جیره/آمار.
// ویرانه‌ها (destroyed) حداقل‌نگاشت می‌شوند (پیش‌تر load را می‌شکستند چون hp:0
// رد می‌شد)؛ served میخانه، staffed/starved و سقف/استخر کارگر هم می‌مانند تا
// هش بلافاصله پس از load برابر باشد (همه هر تیک بازمحاسبه می‌شوند).
// بیرون ذخیره (طراحی‌شده، خارج هش): fx نمایشی، flashTick، path واحدها، px/pr،
// وقایع‌نگار events (فقط نمایشی)، نشست MP (ذخیره فقط سولو — main.js).
import { CONFIG } from "./config.js";
import { createState, occupyFootprint } from "./state.js";
import { TAX, RATIONS, FOOD_TYPES, capFor } from "./economy.js";
import { UNITS, validIdentity, isGarrisonPost, KILLPIT_CHARGES, DOGS_PER_CAGE, stableHorses, HORSES_PER_STABLE } from "./combat.js";
import { lazyTable } from "./lazy.js";
import { idbAvailable, idbSet, idbGet, idbDel } from "./idb.js";

export const SCHEMA_VERSION = 2;

export const SLOTS = {
  auto: "scw.save.auto",
  manual: "scw.save.manual",
};

// فاصله ذخیره خودکار (0.153.0 — بند 117): خاموش یا هر N تیک (10tps).
// رفتار امروز = هر 300 تیک (30 ثانیه)؛ پیش‌فرض همان می‌ماند.
export const AUTOSAVE_OPTIONS = { off: 0, s30: 300, m2: 1200, m5: 3000 };
export function validAutosave(v) {
  return AUTOSAVE_OPTIONS[v] !== undefined ? v : null;
}
export function autosaveTicks(v) {
  const t = AUTOSAVE_OPTIONS[validAutosave(v)];
  return t === undefined ? AUTOSAVE_OPTIONS.s30 : t;
}
// سررسید خالص و تزریق‌پذیر (تست‌پذیر بدون IDB/تایمر).
export function autosaveDue(tick, last, setting) {
  const every = autosaveTicks(setting);
  if (!(every > 0)) return false;
  return (tick | 0) - (last | 0) >= every;
}

export class SaveError extends Error {
  constructor(code, detail) {
    super(detail ? `${code}: ${detail}` : code);
    this.code = code;
  }
}

// جدول پیام‌ها: getterهای زبان‌آگاه (کلید = کد خطا)؛ کد پایدار است، فقط متن نمایشی ترجمه می‌شود.
export const SAVE_FA = lazyTable(Object.fromEntries(
  ["INVALID_JSON", "INVALID_SCHEMA", "FUTURE_VERSION", "UNSUPPORTED_VERSION", "EMPTY", "QUOTA", "DISABLED", "TOO_BIG"]
    .map((k) => [k, "system.save." + k])));

export function serialize(state) {
  return {
    v: SCHEMA_VERSION,
    tick: state.tick,
    mapSeed: state.mapSeed != null ? state.mapSeed >>> 0 : CONFIG.MAP_SEED,
    // جریان RNG (فاز ۰ بند ۲): null = هنوز مصرف نشده (پس از load هم تنبل از
    // mapSeed مشتق می‌شود)؛ عدد = ادامه همان دنباله. ذخیره قدیمی ندارد = null.
    rng: state.rng == null ? null : state.rng >>> 0,
    speed: state.speed,
    paused: state.paused,
    nextId: state.nextId,
    nextUnitId: state.nextUnitId,
    wave: state.wave || 0,
    // Undo تک‌سطحی (0.146.0 — §۳.۱؛ غایب در قدیمی = null)
    undo: state.undo && isInt(state.undo.bld) && state.undo.bld >= 1
      ? { bld: state.undo.bld, owner: state.undo.owner != null ? state.undo.owner : 0 } : null,
    // قوانین اتاق (0.147.0 — §۱۲.۴؛ غایب در قدیمی = مجاز)
    // strongWalls (0.148.0 — §۱۴.۲؛ غایب در قدیمی = خاموش)
    // noRush (0.149.0 — §۱۴.۲/بند ۷۳۰؛ غایب در قدیمی = خاموش)
    rules: { noCow: !!(state.rules && state.rules.noCow), strongWalls: !!(state.rules && state.rules.strongWalls), noRush: !!(state.rules && state.rules.noRush), noDogs: !!(state.rules && state.rules.noDogs) },
    // پایان صلح No Rush (0.149.0؛ غایب/صفر در قدیمی = بی‌صلح)
    peaceUntil: state.peaceUntil || 0,
    // ابرهای بیماری (0.142.0 — بند ۲۱۴؛ غایب در قدیمی = بی‌ابر)
    clouds: Array.isArray(state.clouds) && state.clouds.length
      ? state.clouds.map((cl) => ({ c: cl.c, r: cl.r, left: cl.left })) : [],
    resources: { ...state.resources },
    workers: state.workers,
    workerCap: state.workerCap, // سقف مسکن محاسبه‌شده (بند ۶؛ قدیمی ندارد → پیش‌فرض createState)
    freeWorkers: state.freeWorkers, // استخر آزاد پس از تخصیص (بند ۶؛ قدیمی ندارد)
    popularity: state.popularity,
    popTarget: state.popTarget,
    popDir: state.popDir,
    tax: state.tax,
    rations: state.rations,
    offFood: Array.isArray(state.offFood) ? state.offFood.slice() : [], // توقف مصرف (بند ۸۵؛ قدیمی ندارد → [])
    // پرچم‌های تجمع (0.166.0 — §9.1/بند 170؛ غایب در قدیمی = بی‌پرچم)
    rally: state.rally && typeof state.rally === "object"
      ? Object.fromEntries(Object.entries(state.rally).map(([k, v]) => [k, { c: v.c, r: v.r }])) : {},
    eatAcc: state.eatAcc,
    producedTotal: state.producedTotal,
    consumedTotal: state.consumedTotal,
    shortageTotal: state.shortageTotal,
    placed: state.placed,
    rejected: state.rejected,
    defeated: !!state.defeated, // شکست با سقوط ستاد (0.19.0؛ غایب در قدیمی = false)
    victorious: !!state.victorious, // پیروزی با آخرین موج (0.22.0؛ غایب در قدیمی = false)
    // نقشه سفارشی (0.51.0؛ غایب در قدیمی = زمین خالص سیدی)
    mapName: state.mapName || "",
    ident: validIdentity(state.ident) || "none", // هویت آغازین (0.153.0 — بند 104؛ قدیمی = none)
    mapPatches: Array.isArray(state.mapPatches) && state.mapPatches.length ? state.mapPatches.map((e) => [e[0], e[1]]) : null,
    // حریف AI (0.42.0؛ غایب در قدیمی = غیرفعال)
    ai: state.ai ? {
      active: !!state.ai.active, seed: state.ai.seed >>> 0,
      resources: { ...state.ai.resources },
      workers: state.ai.workers, workerCap: state.ai.workerCap,
      phase: state.ai.phase, buildIdx: state.ai.buildIdx || 0,
      raidsSent: state.ai.raidsSent || 0, nextThink: state.ai.nextThink || 0,
      keepId: state.ai.keepId != null ? state.ai.keepId : null,
      baseC: state.ai.baseC || 0, baseR: state.ai.baseR || 0,
      dormant: !!state.ai.dormant,
      difficulty: state.ai.difficulty || "normal", // درجه سختی (0.50.0؛ قدیمی ندارد)
      personality: state.ai.personality || CONFIG.AI.defaultPersonality, // شخصیت (0.56.0؛ قدیمی ندارد)
    } : null,
    buildings: state.buildings.map((b) => (b.destroyed ? {
      id: b.id, type: b.type, c: b.c, r: b.r,
      owner: b.owner != null ? b.owner : 0,
      destroyed: true, // ویرانه (بند ۶): حداقل‌نگاشت — hp همیشه ۰، اشغال آزاد
      // staffed ویرانه هم می‌ماند (assignStaff ویرانه را هم می‌بیند؛ هش آن را می‌خواند).
      staffed: b.staffed !== false,
      ...(b.starved ? { starved: true } : {}),
    } : {
      id: b.id, type: b.type, c: b.c, r: b.r, progress: b.progress || 0,
      hp: b.hp, cooldown: b.cooldown || 0, buildLeft: b.buildLeft || 0, // ساخت نیمه‌کاره (0.39.0)
      targetId: b.targetId != null ? b.targetId : null,
      owner: b.owner != null ? b.owner : 0, // مالک (0.24.0؛ قدیمی = ۰)
      // گاریسون برج (0.45.0؛ غایب/خالی در قدیمی = []؛ پرچم مدافع از همین بازسازی می‌شود)
      ...(isGarrisonPost(b.type) && b.garrison && b.garrison.length ? { garrison: b.garrison.slice() } : {}),
      // شارژ گودال (0.155.0 — بند 273؛ فقط killpit ناپر؛ غایب/پر = پر).
      ...(b.type === "killpit" && Number.isInteger(b.charges) && b.charges !== KILLPIT_CHARGES ? { charges: b.charges } : {}),
      // سگ‌های قفس (0.156.0 — بند 288؛ فقط dogcage ناپر؛ غایب/پر = پر).
      ...(b.type === "dogcage" && Number.isInteger(b.dogs) && b.dogs !== DOGS_PER_CAGE ? { dogs: b.dogs } : {}),
      ...(b.type === "stable" ? { horses: stableHorses(b), horseLeft: b.horseLeft | 0 } : {}),
      // صف آموزش (0.65.0؛ غایب/خالی در قدیمی = []؛ سفارش‌ها با left مانده می‌مانند)
      ...((b.type === "barracks" || b.type === "mercpost" || b.type === "engineerguild" || b.type === "tunnelerguild") && b.train && b.train.length
        ? { train: b.train.map((e) => ({ type: e.type, c: e.c, r: e.r, left: e.left, total: e.total, ...(e.merc === true ? { merc: true } : {}) })) } : {}),
      // وضعیت دروازه (0.13.0)؛ نامشخص در ذخیره قدیمی یعنی باز.
      ...(b.type === "gate" ? { open: b.open !== false } : {}),
      staffed: b.staffed !== false, // تخصیص کارگر (بند ۶؛ قدیمی ندارد → true؛ هر تیک بازمحاسبه)
      ...(b.starved ? { starved: true } : {}), // قحطی ورودی (بند ۶؛ غایب = false)
      // سرو میخانه (بند ۶؛ فقط inn، غایب = false) — پیش‌تر گم می‌شد و هدف
      // محبوبیت/هش پس از load می‌لغزید.
      ...(b.type === "inn" && b.served ? { served: true } : {}),
      // گاوهای لبنیاتی (0.113.0 — بند ۴۰؛ فقط dairy، غایب = صفر).
      ...(b.type === "dairy" && (b.cows || b.cowTicks) ? { cows: b.cows || 0, cowTicks: b.cowTicks || 0 } : {}),
      // آتش (0.148.0 — §۱۸.۴؛ فقط در حال سوختن، غایب = خاموش).
      ...(b.fire ? { fire: 1 } : {}),
    })),
    // مرده‌ها منطقاً رفته‌اند (هش هم نادیده‌شان می‌گیرد) — در اسنپ‌شات نیستند (بند ۶).
    units: state.units.filter((u) => !u.dead).map((u) => ({
      id: u.id, type: u.type, x: u.x, r: u.r, hp: u.hp, cooldown: u.cooldown || 0,
      cowCd: u.cowCd || 0, // سردشدن پرتاب گاو (0.142.0؛ غایب = ۰)
      // مهمات منجنیق (0.149.0 — §۱۲.۲/بند ۵۷۸؛ غایب = سقف کامل نوع)
      ...(u.ammo !== undefined ? { ammo: u.ammo } : {}),
      targetKind: u.targetKind, targetId: u.targetId,
      mission: u.mission || "idle",
      stance: u.stance || "engage",
      homeX: u.homeX != null ? u.homeX : u.x, homeR: u.homeR != null ? u.homeR : u.r, // پست تدافعی (0.153.0؛ قدیمی ندارد)
      huntId: u.huntId != null ? u.huntId : null, // شکار تهاجمی (0.154.0 — بند 568؛ قدیمی ندارد)
      guardBld: u.guardBld != null ? u.guardBld : null, // پاسگاه نگهبانی (0.15.0)
      homeBld: u.homeBld != null ? u.homeBld : null, // خانه شفادهنده (0.146.0)
      ...(u.deployed ? { deployed: true } : {}), // استقرار منجنیق (0.46.0؛ غایب = سیار)
      owner: u.owner != null ? u.owner : 0, // مالک (0.24.0؛ قدیمی = ۰)
      order: u.order ? { kind: u.order.kind, c: u.order.c, r: u.order.r,
        status: u.order.status, retries: u.order.retries || 0,
        elapsed: u.order.elapsed || 0,
        // سرِ دوم گشت (0.162.0 — بند 236؛ فقط patrol، قدیمی ندارد)
        ...(u.order.kind === "patrol" ? { pc: u.order.pc, pr: u.order.pr } : {}),
        ...(u.order.kind === "patrol" && Array.isArray(u.order.pts) ? { pts: u.order.pts.map((pt) => ({ c: pt.c, r: pt.r })), pi: u.order.pi } : {}) } : null,
      // صف وی‌پوینت (0.162.0 — بند 238؛ غایب/تهی = بی‌صف، قدیمی سازگار)
      ...(Array.isArray(u.wp) && u.wp.length ? { wp: u.wp.map((w) => ({ kind: w.kind, c: w.c, r: w.r })) } : {}),
    })),
  };
}

export function serializeJSON(state) {
  return JSON.stringify(serialize(state));
}

const isInt = (n) => Number.isInteger(n);
const inRange = (n, lo, hi) => typeof n === "number" && n >= lo && n <= hi;

function checkCore(data) {
  const bad = (f) => new SaveError("INVALID_SCHEMA", f);
  if (!isInt(data.tick) || data.tick < 0) throw bad("tick");
  // سید نقشه (0.26.0، اختیاری → پیش‌فرض؛ ذخیره قدیمی بدون سید همان نقشه پیش‌فرض)
  if (data.mapSeed !== undefined && (!isInt(data.mapSeed) || data.mapSeed < 0 || data.mapSeed > 4294967295)) {
    throw bad("mapSeed");
  }
  // جریان RNG (فاز ۰ بند ۲، اختیاری → null یعنی تنبل از mapSeed؛ ذخیره قدیمی
  // ندارد و همان دنباله دست‌نخورده را می‌گیرد چون sim قدیم مصرفی نداشت).
  if (data.rng !== undefined && data.rng !== null && (!isInt(data.rng) || data.rng < 0 || data.rng > 4294967295)) {
    throw bad("rng");
  }
  if (typeof data.speed !== "number" || !(data.speed > 0)) throw bad("speed");
  if (typeof data.paused !== "boolean") throw bad("paused");
  if (!isInt(data.nextId) || data.nextId < 1) throw bad("nextId");
  // گوشت/پنیر (0.112/0.113 — بند ۴۰): ذخیره قدیمی ندارد → پیش‌فرض صفر.
  if (data.resources && typeof data.resources === "object") {
    if (data.resources.meat === undefined) data.resources.meat = 0;
    if (data.resources.cheese === undefined) data.resources.cheese = 0;
    if (data.resources.apples === undefined) data.resources.apples = 0;
    if (data.resources.leather === undefined) data.resources.leather = 0;
  }
  for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows", "meat", "cheese", "apples", "leather"]) {
    if (!data.resources || typeof data.resources[k] !== "number") throw bad("resources." + k);
  }
  // قوانین اتاق (0.147.0 — §۱۲.۴، اختیاری → مجاز؛ دست‌کاری رد می‌شود).
  // strongWalls (0.148.0 — §۱۴.۲، اختیاری → خاموش).
  // noRush (0.149.0 — §۱۴.۲/بند ۷۳۰، اختیاری → خاموش).
  if (data.rules !== undefined) {
    if (!data.rules || typeof data.rules !== "object") throw bad("rules");
    if (data.rules.noCow !== undefined && typeof data.rules.noCow !== "boolean") throw bad("rules.noCow");
    if (data.rules.strongWalls !== undefined && typeof data.rules.strongWalls !== "boolean") throw bad("rules.strongWalls");
    if (data.rules.noRush !== undefined && typeof data.rules.noRush !== "boolean") throw bad("rules.noRush");
    if (data.rules.noDogs !== undefined && typeof data.rules.noDogs !== "boolean") throw bad("rules.noDogs");
  }
  // پایان صلح (0.149.0، اختیاری → ۰ = بی‌صلح؛ دست‌کاری رد می‌شود).
  if (data.peaceUntil !== undefined && (!isInt(data.peaceUntil) || data.peaceUntil < 0)) throw bad("peaceUntil");
  // ابرهای بیماری (0.142.0 — بند ۲۱۴، اختیاری → بی‌ابر؛ دست‌کاری رد می‌شود).
  if (data.clouds === undefined) {    data.clouds = [];
  } else {
    if (!Array.isArray(data.clouds)) throw bad("clouds");
    for (const cl of data.clouds) {
      if (!cl || typeof cl !== "object") throw bad("clouds.entry");
      if (!isInt(cl.c) || cl.c < 0 || cl.c >= CONFIG.GRID_W) throw bad("clouds.c");
      if (!isInt(cl.r) || cl.r < 0 || cl.r >= CONFIG.GRID_H) throw bad("clouds.r");
      if (!isInt(cl.left) || cl.left <= 0) throw bad("clouds.left");
    }
  }
  // پرچم‌های تجمع (0.166.0 — §9.1/بند 170، اختیاری → بی‌پرچم؛ دست‌کاری رد می‌شود).
  if (data.rally === undefined) { data.rally = {}; }
  else {
    if (!data.rally || typeof data.rally !== "object" || Array.isArray(data.rally)) throw bad("rally");
    for (const [k, v] of Object.entries(data.rally)) {
      const m = /^(\d+):(.+)$/.exec(k);
      const u = m && UNITS[m[2]];
      if (!m || !u || u.side !== "player" || u.noHire || !u.cost) throw bad("rally");
      if (!v || typeof v !== "object") throw bad("rally");
      if (!isInt(v.c) || v.c < 0 || v.c >= CONFIG.GRID_W || !isInt(v.r) || v.r < 0 || v.r >= CONFIG.GRID_H) throw bad("rally");
    }
  }
  if (!isInt(data.workers) || data.workers < 0 || data.workers > 999) throw bad("workers");
  // سقف/استخر کارگر (بند ۶، اختیاری → پیش‌فرض createState؛ دست‌کاری رد می‌شود).
  if (data.workerCap !== undefined && (!isInt(data.workerCap) || data.workerCap < 0 || data.workerCap > 99999)) {
    throw bad("workerCap");
  }
  if (data.freeWorkers !== undefined && (!isInt(data.freeWorkers) || data.freeWorkers < 0 || data.freeWorkers > 99999)) {
    throw bad("freeWorkers");
  }
  if (!inRange(data.popularity, 0, 100)) throw bad("popularity");
  if (!inRange(data.popTarget, 0, 100)) throw bad("popTarget");
  if (![-1, 0, 1].includes(data.popDir)) throw bad("popDir");
  if (!TAX[data.tax]) throw bad("tax");
  if (!RATIONS[data.rations]) throw bad("rations");
  // توقف غذا (بند ۸۵، اختیاری → []؛ عضو ناشناخته/تکراری رد می‌شود).
  if (data.offFood !== undefined) {
    if (!Array.isArray(data.offFood) || new Set(data.offFood).size !== data.offFood.length) throw bad("offFood");
    for (const k of data.offFood) if (!FOOD_TYPES.includes(k)) throw bad("offFood");
  }
  if (!isInt(data.eatAcc) || data.eatAcc < 0) throw bad("eatAcc");
  for (const k of ["producedTotal", "consumedTotal", "shortageTotal", "placed", "rejected"]) {
    if (!isInt(data[k]) || data[k] < 0) throw bad(k);
  }
  // پرچم شکست (0.19.0، اختیاری → false؛ دست‌کاری غیربولی رد می‌شود).
  if (data.defeated !== undefined && typeof data.defeated !== "boolean") throw bad("defeated");
  // پرچم پیروزی (0.22.0، اختیاری → false؛ دست‌کاری غیربولی رد می‌شود).
  if (data.victorious !== undefined && typeof data.victorious !== "boolean") throw bad("victorious");
  // نقشه سفارشی (0.51.0، اختیاری → زمین خالص سیدی؛ دست‌کاری رد می‌شود).
  if (data.mapName !== undefined && (typeof data.mapName !== "string" || data.mapName.length > 24)) {
    throw bad("mapName");
  }
  if (data.ident !== undefined && !validIdentity(data.ident)) {
    throw bad("ident");
  }
  if (data.mapPatches !== undefined && data.mapPatches !== null) {
    if (!Array.isArray(data.mapPatches) || data.mapPatches.length > 2048) throw bad("mapPatches");
    const n = CONFIG.GRID_W * CONFIG.GRID_H;
    for (const e of data.mapPatches) {
      if (!Array.isArray(e) || e.length !== 2) throw bad("mapPatches");
      const [idx, tile] = e;
      if (!isInt(idx) || idx < 0 || idx >= n) throw bad("mapPatches");
      if (tile !== 0 && tile !== 1 && tile !== 2) throw bad("mapPatches");
    }
  }
  if (!Array.isArray(data.buildings)) throw bad("buildings");
  // Undo تک‌سطحی (0.146.0 — §۳.۱، اختیاری → null؛ ارجاع مرده در buildState پاک می‌شود)
  if (data.undo === undefined || data.undo === null) {
    data.undo = null;
  } else {
    if (!data.undo || typeof data.undo !== "object") throw bad("undo");
    if (!isInt(data.undo.bld) || data.undo.bld < 1) throw bad("undo.bld");
    if (data.undo.owner !== undefined && (!isInt(data.undo.owner) || data.undo.owner < 0 || (data.undo.owner > 3 && data.undo.owner !== 9))) throw bad("undo.owner");
  }
}

function checkBuildings(data) {
  const bad = (f) => new SaveError("INVALID_SCHEMA", f);
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const seen = new Set();
  for (const b of data.buildings) {
    const def = b && CONFIG.BUILDINGS[b.type];
    if (!b || typeof b !== "object" || !def) throw bad("buildings.type");
    if (!isInt(b.id) || b.id < 1 || seen.has(b.id)) throw bad("buildings.id");
    seen.add(b.id);
    if (!isInt(b.c) || !isInt(b.r)) throw bad("buildings.pos");
    if (b.c < 0 || b.r < 0 || b.c + def.w > W || b.r + def.h > H) throw bad("buildings.bounds");
    // ویرانه (بند ۶): حداقل‌نگاشت؛ hp فقط ۰/غایب؛ هیچ میدان گیم‌پلی دیگری نباید باشد.
    if (b.destroyed === true) {
      if (b.hp !== undefined && b.hp !== 0) throw bad("buildings.hp");
      for (const k of ["progress", "cooldown", "buildLeft", "targetId", "garrison", "train", "open", "served", "cows", "cowTicks", "fire", "charges", "dogs", "horses", "horseLeft"]) {
        if (b[k] !== undefined) throw bad("buildings.ruin");
      }
      // staffed/starved ویرانه (اختیاری → true/false؛ مثل زنده‌ها).
      if (b.staffed !== undefined && typeof b.staffed !== "boolean") throw bad("buildings.staffed");
      if (b.starved !== undefined && typeof b.starved !== "boolean") throw bad("buildings.starved");
      continue; // شناسه در seen ماند (بازه nextId پایین‌تر بررسی می‌شود)
    }
    if (b.destroyed !== undefined) throw bad("buildings.destroyed");
    // پرچم‌های بازمحاسبه‌شونده (بند ۶، اختیاری → staffed=true/starved=false؛ دست‌کاری رد می‌شود).
    if (b.staffed !== undefined && typeof b.staffed !== "boolean") throw bad("buildings.staffed");
    if (b.starved !== undefined && typeof b.starved !== "boolean") throw bad("buildings.starved");
    // سرو میخانه (بند ۶، اختیاری → false)؛ بیرون inn مثل open بیجا سخت‌گیرانه رد می‌شود.
    if (b.type === "inn") {
      if (b.served !== undefined && typeof b.served !== "boolean") throw bad("buildings.served");
    } else if (b.served !== undefined) {
      throw bad("buildings.served");
    }
    // گاوهای لبنیاتی (0.113.0 — بند ۴۰، اختیاری → صفر؛ فقط dairy؛ گاو ۰..۳).
    if (b.type === "dairy") {
      if (b.cows !== undefined && (!isInt(b.cows) || b.cows < 0 || b.cows > 3)) throw bad("buildings.cows");
      if (b.cowTicks !== undefined && (!isInt(b.cowTicks) || b.cowTicks < 0)) throw bad("buildings.cowTicks");
    } else if (b.cows !== undefined || b.cowTicks !== undefined) {
      throw bad("buildings.cows");
    }
    // آتش (0.148.0 — §۱۸.۴، اختیاری → خاموش؛ فقط پرچم ۱).
    if (b.fire !== undefined && b.fire !== 1) throw bad("buildings.fire");
    if (!isInt(b.progress) || b.progress < 0) throw bad("buildings.progress");
    // ساخت نیمه‌کاره (0.39.0، اختیاری → تکمیل؛ غایب در قدیمی یعنی ۰).
    if (b.buildLeft !== undefined && (!isInt(b.buildLeft) || b.buildLeft < 0)) throw bad("buildings.buildLeft");
    // مالک (0.24.0، اختیاری → ۰)؛ ۰..۳ و ۹=حریف AI سولو (0.42.0)
    if (b.owner !== undefined && (!isInt(b.owner) || b.owner < 0 || (b.owner > 3 && b.owner !== 9))) throw bad("buildings.owner");
    // hp اختیاری است (مهاجرت v1)؛ اگر هست باید در بازه باشد
    if (b.hp !== undefined && (!isInt(b.hp) || b.hp < 1 || b.hp > def.hp)) throw bad("buildings.hp");
    if (b.cooldown !== undefined && (!isInt(b.cooldown) || b.cooldown < 0)) throw bad("buildings.cooldown");
    // گاریسون برج (0.45.0، اختیاری → خالی؛ فقط برج، حداکثر ۴ شناسه یکتا).
    if (b.garrison !== undefined) {
      const gdef = CONFIG.BUILDINGS[b.type];
      const gcap = gdef && Number.isInteger(gdef.garrisonCap) && gdef.garrisonCap > 0 ? gdef.garrisonCap : 0;
      if (!gcap || !isGarrisonPost(b.type) || !Array.isArray(b.garrison) || b.garrison.length > gcap) {
        throw bad("buildings.garrison");
      }
      const seenG = new Set();
      for (const gid of b.garrison) {
        if (!isInt(gid) || gid < 1 || seenG.has(gid)) throw bad("buildings.garrison");
        seenG.add(gid);
      }
    }
    // شارژ گودال (0.155.0 — بند 273؛ اختیاری → پر؛ فقط killpit، ۰..سقف).
    // سگ‌های قفس (0.156.0 — بند 288؛ اختیاری → پر؛ فقط dogcage، ۰..سقف).
    if (b.dogs !== undefined) {
      if (b.type !== "dogcage" || !Number.isInteger(b.dogs) || b.dogs < 0 || b.dogs > DOGS_PER_CAGE) {
        throw bad("buildings.dogs");
      }
    }
    if (b.charges !== undefined) {
      if (b.type !== "killpit" || !Number.isInteger(b.charges) || b.charges < 0 || b.charges > KILLPIT_CHARGES) {
        throw bad("buildings.charges");
      }
    }
    if (b.type === "stable") {
      if (b.horses !== undefined && (!Number.isInteger(b.horses) || b.horses < 0 || b.horses > HORSES_PER_STABLE)) {
        throw bad("buildings.horses");
      }
      if (b.horseLeft !== undefined && (!Number.isInteger(b.horseLeft) || b.horseLeft < 0)) throw bad("buildings.horseLeft");
    } else if (b.horses !== undefined || b.horseLeft !== undefined) {
      throw bad("buildings.horses");
    }
    // صف آموزش (0.65.0، اختیاری → خالی؛ فقط سربازخانه/پست مزدور/انجمن، حداکثر سقف CONFIG).
    if (b.train !== undefined) {
      const cap = CONFIG.TRAIN && CONFIG.TRAIN.queueCap > 0 ? CONFIG.TRAIN.queueCap : 5;
      if ((b.type !== "barracks" && b.type !== "mercpost" && b.type !== "engineerguild" && b.type !== "tunnelerguild") || !Array.isArray(b.train) || b.train.length > cap) {
        throw bad("buildings.train");
      }
      for (const e of b.train) {
        if (!e || typeof e !== "object" || !UNITS[e.type]) throw bad("buildings.train");
        if (!isInt(e.c) || !isInt(e.r)) throw bad("buildings.train");
        if (e.merc !== undefined && e.merc !== true) throw bad("buildings.train");
        if (!isInt(e.left) || e.left < 1 || !isInt(e.total) || e.total < 1 || e.left > e.total) {
          throw bad("buildings.train");
        }
      }
    }
    // وضعیت دروازه (0.13.0، اختیاری → باز)؛ ساختمان دیگر نباید open داشته باشد.
    if (b.type === "gate") {
      if (b.open !== undefined && typeof b.open !== "boolean") throw bad("buildings.open");
    } else if (b.open !== undefined) {
      throw bad("buildings.open");
    }
  }
  return seen;
}

function checkResources(data) {
  const bad = (f) => new SaveError("INVALID_SCHEMA", f);
  // سقف پویا (0.34.0): انبار/انبار غذای سالمِ همین ذخیره سقف را بالا می‌برد.
  // پس از checkBuildings صدا زده می‌شود (نوع ساختمان‌ها معتبر است).
  // گوشت/پنیر/سیب (0.112–0.114): ذخیره قدیمی ندارد → صفر، پیش از حلقه سقف.
  if (data.resources && typeof data.resources === "object") {
    if (data.resources.meat === undefined) data.resources.meat = 0;
    if (data.resources.cheese === undefined) data.resources.cheese = 0;
    if (data.resources.apples === undefined) data.resources.apples = 0;
    if (data.resources.leather === undefined) data.resources.leather = 0;
  }
  const pseudo = { buildings: data.buildings.map((b) => ({ type: b.type, destroyed: false })), mp: null };
  for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows", "meat", "cheese", "apples", "leather"]) {
    if (!inRange(data.resources[k], 0, capFor(pseudo, k))) throw bad("resources." + k);
  }
}

// حریف AI (0.42.0): بلوک اختیاری → غیرفعال؛ دست‌کاری رد می‌شود.
function checkAi(data) {
  const bad = (f) => new SaveError("INVALID_SCHEMA", f);
  const off = {
    active: false, seed: 0,
    resources: { wood: 0, food: 0, gold: 0, stone: 0, wheat: 0, flour: 0, hops: 0, beer: 0, iron: 0, swords: 0, bows: 0, meat: 0, cheese: 0, apples: 0, leather: 0 },
    workers: 0, workerCap: 0, freeWorkers: 0,
    phase: "build", buildIdx: 0, raidsSent: 0, nextThink: 0,
    keepId: null, baseC: 0, baseR: 0, dormant: false, difficulty: "normal",
    personality: CONFIG.AI.defaultPersonality,
  };
  const a = data.ai;
  if (a === undefined || a === null) return off;
  if (!a || typeof a !== "object" || Array.isArray(a)) throw bad("ai");
  if (typeof a.active !== "boolean") throw bad("ai.active");
  if (!isInt(a.seed) || a.seed < 0 || a.seed > 4294967295) throw bad("ai.seed");
  if (!a.resources || typeof a.resources !== "object") throw bad("ai.resources");
  // تحمل ذخیره 0.42/0.43 بدون آهن/شمشیر/کمان (0.44.0): پیش‌فرض صفر.
  for (const k of ["iron", "swords", "bows"]) {
    if (a.resources[k] === undefined) a.resources[k] = 0;
  }
  if (a.resources.meat === undefined) a.resources.meat = 0; // گوشت (0.112.0)
  if (a.resources.cheese === undefined) a.resources.cheese = 0; // پنیر (0.113.0)
  if (a.resources.apples === undefined) a.resources.apples = 0;
  if (a.resources.leather === undefined) a.resources.leather = 0; // سیب (0.114.0)
  for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows", "meat", "cheese", "apples", "leather"]) {
    if (!inRange(a.resources[k], 0, 99999)) throw bad("ai.resources." + k);
  }
  for (const k of ["workers", "workerCap", "buildIdx", "raidsSent", "nextThink", "baseC", "baseR"]) {
    if (!isInt(a[k]) || a[k] < 0 || a[k] > 99999) throw bad("ai." + k);
  }
  if (a.phase !== "build" && a.phase !== "done") throw bad("ai.phase");
  if (a.keepId !== null && a.keepId !== undefined && (!isInt(a.keepId) || a.keepId < 1)) throw bad("ai.keepId");
  if (typeof a.dormant !== "boolean") throw bad("ai.dormant");
  // درجه سختی (0.50.0، اختیاری → normal؛ دست‌کاری رد می‌شود).
  if (a.difficulty === undefined || a.difficulty === null) {
    a.difficulty = "normal";
  } else if (typeof a.difficulty !== "string" || !CONFIG.AI.difficulties[a.difficulty]) {
    throw bad("ai.difficulty");
  }
  // شخصیت حریف (0.56.0، اختیاری → گرگ خنثی؛ دست‌کاری رد می‌شود).
  if (a.personality === undefined || a.personality === null) {
    a.personality = CONFIG.AI.defaultPersonality;
  } else if (typeof a.personality !== "string" || !CONFIG.AI.personalities[a.personality]) {
    throw bad("ai.personality");
  }
  return {
    active: a.active, seed: a.seed >>> 0, resources: { ...a.resources },
    workers: a.workers, workerCap: a.workerCap, freeWorkers: a.workers,
    phase: a.phase, buildIdx: a.buildIdx, raidsSent: a.raidsSent, nextThink: a.nextThink,
    keepId: a.keepId != null ? a.keepId : null, baseC: a.baseC, baseR: a.baseR, dormant: a.dormant,
    difficulty: a.difficulty, personality: a.personality,
  };
}

function checkUnits(data, maxUnitId) {  const bad = (f) => new SaveError("INVALID_SCHEMA", f);
  if (!Array.isArray(data.units)) throw bad("units");
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const seen = new Set();
  for (const u of data.units) {
    const def = u && UNITS[u.type];
    if (!u || typeof u !== "object" || !def) throw bad("units.type");
    if (!isInt(u.id) || u.id < 1 || u.id >= maxUnitId || seen.has(u.id)) throw bad("units.id");
    seen.add(u.id);
    if (typeof u.x !== "number" || typeof u.r !== "number") throw bad("units.pos");
    if (!(u.x >= 0 && u.x <= W && u.r >= 0 && u.r <= H)) throw bad("units.bounds");
    if (!inRange(u.hp, 1, def.hp)) throw bad("units.hp");
    if (!isInt(u.cooldown) || u.cooldown < 0) throw bad("units.cooldown");
    // مالک (0.24.0، اختیاری → ۰)؛ ۰..۳ و ۹=حریف AI سولو (0.42.0)
    if (u.owner !== undefined && (!isInt(u.owner) || u.owner < 0 || (u.owner > 3 && u.owner !== 9))) throw bad("units.owner");
    if (u.targetKind !== null && u.targetKind !== "unit" && u.targetKind !== "bld") {
      throw bad("units.targetKind");
    }
    if (u.targetId !== null && u.targetId !== undefined && !isInt(u.targetId)) {
      throw bad("units.targetId");
    }
    // مأموریت (اختیاری در ذخیره‌های v2 قدیمی‌تر → idle؛ مسیر path هرگز ذخیره نمی‌شود)
    if (u.mission === undefined) {
      u.mission = "idle";
    } else if (!["idle", "active", "done", "failed"].includes(u.mission)) {
      throw bad("units.mission");
    }
    // موضع (اختیاری در ذخیره‌های قدیمی‌تر → engage)
    if (u.stance === undefined) {
      u.stance = "engage";
    } else if (u.stance !== "engage" && u.stance !== "hold" && u.stance !== "defend" && u.stance !== "guard") {
      throw bad("units.stance");
    }
    // پاسگاه نگهبانی (0.15.0، اختیاری → null؛ ارجاع مرده در buildState پاک می‌شود)
    if (u.guardBld === undefined || u.guardBld === null) {
      u.guardBld = null;
    } else if (!isInt(u.guardBld) || u.guardBld < 1) {
      throw bad("units.guardBld");
    }
    // پست تدافعی (0.153.0، اختیاری → جای فعلی؛ دست‌کاری ناعددی رد می‌شود)
    if (u.homeX === undefined || u.homeX === null) {
      u.homeX = u.x;
    } else if (typeof u.homeX !== "number" || !(u.homeX >= 0 && u.homeX < W) || !isFinite(u.homeX)) {
      throw bad("units.homeX");
    }
    if (u.homeR === undefined || u.homeR === null) {
      u.homeR = u.r;
    } else if (typeof u.homeR !== "number" || !(u.homeR >= 0 && u.homeR < H) || !isFinite(u.homeR)) {
      throw bad("units.homeR");
    }
    if (u.huntId === undefined || u.huntId === null) {
      u.huntId = null;
    } else if (!isInt(u.huntId)) {
      throw bad("units.huntId");
    }
    // خانه شفادهنده (0.146.0، اختیاری → null؛ ارجاع مرده در buildState پاک می‌شود)
    if (u.homeBld === undefined || u.homeBld === null) {
      u.homeBld = null;
    } else if (!isInt(u.homeBld) || u.homeBld < 1) {
      throw bad("units.homeBld");
    }
    // استقرار منجنیق (0.46.0، اختیاری → سیار؛ دست‌کاری غیربولی رد می‌شود)
    if (u.deployed !== undefined && typeof u.deployed !== "boolean") {
      throw bad("units.deployed");
    }
    // سردشدن پرتاب گاو (0.142.0، اختیاری → ۰؛ دست‌کاری رد می‌شود)
    if (u.cowCd === undefined) {
      u.cowCd = 0;
    } else if (!isInt(u.cowCd) || u.cowCd < 0) {
      throw bad("units.cowCd");
    }
    // مهمات منجنیق (0.149.0 — §۱۲.۲/بند ۵۷۸، اختیاری → سقف کامل نوع در
    // buildState؛ دست‌کاری/فراسقف رد می‌شود)
    if (u.ammo !== undefined && (!isInt(u.ammo) || u.ammo < 0 || (def.ammoCap && u.ammo > def.ammoCap))) {
      throw bad("units.ammo");
    }
    if (u.order === undefined || u.order === null) {
      u.order = null;
    } else {
      if (!["move", "attackmove", "retreat", "patrol", "attackpos"].includes(u.order.kind)) {
        throw bad("units.order.kind");
      }
      if (!isInt(u.order.c) || !isInt(u.order.r)) throw bad("units.order.pos");
      if (u.order.c < 0 || u.order.r < 0 || u.order.c >= W || u.order.r >= H) {
        throw bad("units.order.bounds");
      }
      if (u.order.kind === "patrol") { // سرِ دوم گشت (0.162.0 — بند 236)
        if (!isInt(u.order.pc) || !isInt(u.order.pr)) throw bad("units.order.pos");
        if (u.order.pc < 0 || u.order.pr < 0 || u.order.pc >= W || u.order.pr >= H) {
          throw bad("units.order.bounds");
        }
        if (u.order.pts !== undefined || u.order.pi !== undefined) {
          if (!Array.isArray(u.order.pts) || u.order.pts.length < 2 || u.order.pts.length > 10) throw bad("units.order.pts");
          for (const pt of u.order.pts) {
            if (!pt || !isInt(pt.c) || !isInt(pt.r)) throw bad("units.order.pts");
            if (pt.c < 0 || pt.r < 0 || pt.c >= W || pt.r >= H) throw bad("units.order.bounds");
          }
          if (!isInt(u.order.pi) || u.order.pi < 0 || u.order.pi >= u.order.pts.length) throw bad("units.order.pi");
        }
      }
      if (!["active", "done", "failed"].includes(u.order.status)) throw bad("units.order.status");
      if (!isInt(u.order.retries) || u.order.retries < 0) throw bad("units.order.retries");
      if (u.order.elapsed === undefined) {
        u.order.elapsed = 0;
      } else if (!isInt(u.order.elapsed) || u.order.elapsed < 0) {
        throw bad("units.order.elapsed");
      }
    }
    // صف وی‌پوینت (0.162.0 — بند 238؛ اختیاری، قدیمی ندارد)
    if (u.wp !== undefined && u.wp !== null) {
      if (!Array.isArray(u.wp)) throw bad("units.wp");
      for (const w of u.wp) {
        if (!w || !["move", "attackmove", "patrol", "attackpos"].includes(w.kind)) throw bad("units.wp.kind");
        if (!isInt(w.c) || !isInt(w.r)) throw bad("units.wp.pos");
        if (w.c < 0 || w.r < 0 || w.c >= W || w.r >= H) throw bad("units.wp.bounds");
      }
    }
  }
}

function buildState(data, upgradedFromV1) {
  const s = createState();
  const W = CONFIG.GRID_W;
  s.tick = data.tick;
  s.mapSeed = data.mapSeed !== undefined ? data.mapSeed >>> 0 : CONFIG.MAP_SEED;
  s.rng = data.rng == null ? null : data.rng >>> 0; // جریان RNG (فاز ۰ بند ۲؛ غایب = تنبل)
  s.speed = data.speed;
  s.paused = data.paused;
  s.nextId = data.nextId;
  s.nextUnitId = upgradedFromV1 ? 1 : data.nextUnitId;
  s.wave = data.wave || 0;
  // Undo تک‌سطحی (0.146.0؛ قدیمی ندارد → null؛ ارجاع مرده پاک می‌شود)
  s.undo = data.undo && isInt(data.undo.bld) ? { bld: data.undo.bld, owner: data.undo.owner != null ? data.undo.owner : 0 } : null;
  // ابرهای بیماری (0.142.0؛ قدیمی ندارد → بی‌ابر؛ اعتبارسنجی در checkCore است)
  s.clouds = Array.isArray(data.clouds) ? data.clouds.map((cl) => ({ c: cl.c, r: cl.r, left: cl.left })) : [];
  // قوانین اتاق (0.147.0 — §۱۲.۴؛ قدیمی ندارد → مجاز)
  // strongWalls (0.148.0 — §۱۴.۲؛ قدیمی ندارد → خاموش)
  // noRush (0.149.0 — §۱۴.۲/بند ۷۳۰؛ قدیمی ندارد → خاموش)
  s.rules = { noCow: !!(data.rules && data.rules.noCow), strongWalls: !!(data.rules && data.rules.strongWalls), noRush: !!(data.rules && data.rules.noRush), noDogs: !!(data.rules && data.rules.noDogs) };
  // پایان صلح (0.149.0؛ قدیمی ندارد → ۰ = بی‌صلح)
  s.peaceUntil = isInt(data.peaceUntil) && data.peaceUntil >= 0 ? data.peaceUntil : 0;
  s.resources = { ...data.resources };
  s.workers = data.workers;
  // سقف/استخر (بند ۶؛ غایب در قدیمی = پیش‌فرض createState، مثل loadهای قبلی).
  if (data.workerCap !== undefined) s.workerCap = data.workerCap;
  if (data.freeWorkers !== undefined) s.freeWorkers = data.freeWorkers;
  s.popularity = data.popularity;
  s.popTarget = data.popTarget;
  s.popDir = data.popDir;
  s.tax = data.tax;
  s.rations = data.rations;
  s.offFood = Array.isArray(data.offFood) ? data.offFood.slice() : []; // توقف غذا (بند ۸۵؛ قدیمی ندارد → [])
  // پرچم‌های تجمع معتبرشده (0.166.0 — §9.1/بند 170؛ قدیمی ندارد → بی‌پرچم؛ اعتبارسنجی در checkCore است)
  s.rally = data.rally && typeof data.rally === "object" ? Object.fromEntries(Object.entries(data.rally).map(([k, v]) => [k, { c: v.c, r: v.r }])) : {};
  s.eatAcc = data.eatAcc;
  s.producedTotal = data.producedTotal;
  s.consumedTotal = data.consumedTotal;
  s.shortageTotal = data.shortageTotal;
  s.placed = data.placed;
  s.rejected = data.rejected;
  s.defeated = data.defeated === true; // غایب (قدیمی) = false
  s.victorious = data.victorious === true; // غایب (قدیمی) = false
  // نقشه سفارشی (0.51.0؛ غایب در قدیمی = زمین خالص سیدی)
  s.mapName = typeof data.mapName === "string" ? data.mapName : "";
  s.ident = validIdentity(data.ident) || "none"; // هویت آغازین (0.153.0؛ قدیمی = none)
  s.mapPatches = Array.isArray(data.mapPatches) ? data.mapPatches.map((e) => [e[0], e[1]]) : null;
  // حریف AI (0.42.0؛ غایب در قدیمی = غیرفعال با کانتینر صفر)
  s.ai = checkAi(data);
  s.buildings = data.buildings.map((b) => {
    const def = CONFIG.BUILDINGS[b.type];
    // ویرانه (بند ۶): hp صفر، بدون اشغال (پایین)، بدون صف/گاریسون.
    if (b.destroyed === true) {
      return {
        id: b.id, type: b.type, c: b.c, r: b.r, w: def.w, h: def.h,
        hp: 0, maxHp: def.hp, progress: 0, cooldown: 0, buildLeft: 0,
        targetId: null,
        staffed: b.staffed !== undefined ? !!b.staffed : true, // مثل زنده (هش: غایب = ۱)
        starved: b.starved === true, served: false, // served ویرانه همیشه false (مسیرهای ویرانی پاک می‌کنند)
        destroyed: true, owner: b.owner != null ? b.owner : 0, garrison: [], train: [],
      };
    }
    return {
      id: b.id, type: b.type, c: b.c, r: b.r, w: def.w, h: def.h,
      hp: b.hp !== undefined ? b.hp : def.hp, maxHp: def.hp,
      progress: b.progress, cooldown: b.cooldown || 0,
      buildLeft: b.buildLeft || 0, // نیمه‌کاره می‌ماند (0.39.0؛ قدیمی = تکمیل)
      targetId: b.targetId != null ? b.targetId : null,
      staffed: b.staffed !== undefined ? !!b.staffed : true, // (بند ۶؛ قدیمی = true)
      starved: b.starved === true, // (بند ۶؛ قدیمی = false)
      served: b.type === "inn" ? b.served === true : false, // (بند ۶؛ فقط inn؛ قدیمی = false)
      owner: b.owner != null ? b.owner : 0,
      garrison: isGarrisonPost(b.type) && Array.isArray(b.garrison) ? b.garrison.slice() : [], // (0.45.0؛ قدیمی = خالی)
      // شارژ گودال زنده (0.155.0 — بند 273؛ فقط killpit؛ قدیمی = پر).
      ...(b.type === "killpit" ? { charges: Number.isInteger(b.charges) && b.charges >= 0 ? b.charges : KILLPIT_CHARGES } : {}),
      // سگ‌های زنده قفس (0.156.0 — بند 288؛ فقط dogcage؛ قدیمی = پر).
      ...(b.type === "dogcage" ? { dogs: Number.isInteger(b.dogs) && b.dogs >= 0 ? Math.min(b.dogs, DOGS_PER_CAGE) : DOGS_PER_CAGE } : {}),
      ...(b.type === "stable" ? { horses: Number.isInteger(b.horses) && b.horses >= 0 ? Math.min(b.horses, HORSES_PER_STABLE) : HORSES_PER_STABLE, horseLeft: Number.isInteger(b.horseLeft) && b.horseLeft > 0 ? b.horseLeft : 0 } : {}),
      train: (b.type === "barracks" || b.type === "mercpost" || b.type === "engineerguild" || b.type === "tunnelerguild") && Array.isArray(b.train) // صف آموزش (0.65.0؛ پست مزدور از 0.166.0؛ انجمن از 0.167.0؛ قدیمی = خالی)
        ? b.train.map((e) => ({ type: e.type, c: e.c, r: e.r, left: e.left, total: e.total, ...(e.merc === true ? { merc: true } : {}) })) : [],
      ...(b.type === "gate" ? { open: b.open !== undefined ? !!b.open : true } : {}),
      // گاوها (0.113.0؛ فقط dairy؛ قدیمی = صفر).
      ...(b.type === "dairy" ? { cows: b.cows || 0, cowTicks: b.cowTicks || 0 } : {}),
      fire: b.fire === 1 ? 1 : 0, // آتش (0.148.0 — §۱۸.۴؛ قدیمی = خاموش)
    };
  });
  // اشغال فقط برای زنده‌ها بازسازی می‌شود — زمین ویرانه آزاد است (بند ۶).
  for (const b of s.buildings) if (!b.destroyed) occupyFootprint(s, W, b.c, b.r, b.w, b.h);
  s.units = upgradedFromV1 ? [] : data.units.map((u) => ({
    id: u.id, type: u.type, side: UNITS[u.type].side,
    x: u.x, r: u.r, px: u.x, pr: u.r, hp: u.hp, maxHp: UNITS[u.type].hp,
    cooldown: u.cooldown, targetKind: u.targetKind, targetId: u.targetId,
    cowCd: u.cowCd || 0, // سردشدن پرتاب گاو (0.142.0؛ قدیمی = ۰)
    // مهمات منجنیق (0.149.0 — §۱۲.۲/بند ۵۷۸؛ قدیمی/غایب = سقف کامل نوع؛
    // بی‌سقف هیچ فیلدی ندارد، مثل spawnUnit)
    ...(u.ammo !== undefined ? { ammo: u.ammo }
      : (UNITS[u.type].ammoCap ? { ammo: UNITS[u.type].ammoCap } : {})),
    flashTick: -99, path: null, pathGoal: null, pathIdx: 0, pathTick: -999, noPath: false,
    mission: u.mission || "idle",
    stance: u.stance || "engage",
    guardBld: u.guardBld != null ? u.guardBld : null,
    homeX: u.homeX != null ? u.homeX : u.x, homeR: u.homeR != null ? u.homeR : u.r, // پست تدافعی (0.153.0؛ قدیمی = جای فعلی)
    huntId: u.huntId != null ? u.huntId : null, // شکار تهاجمی (0.154.0 — بند 568؛ قدیمی = نیست)
    homeBld: u.homeBld != null ? u.homeBld : null, // خانه شفادهنده (0.146.0؛ قدیمی = null)
    garrisonTower: null, // از فهرست برج‌ها بازسازی می‌شود (0.45.0)
    deployed: u.deployed === true, // استقرار منجنیق (0.46.0؛ قدیمی = سیار)
    owner: u.owner != null ? u.owner : 0,
    order: u.order ? { kind: u.order.kind, c: u.order.c, r: u.order.r,
      status: u.order.status, retries: u.order.retries || 0,
      elapsed: u.order.elapsed || 0,
      // سرِ دوم گشت (0.162.0 — بند 236؛ فقط patrol، قدیمی ندارد)
      ...(u.order.kind === "patrol" ? { pc: u.order.pc, pr: u.order.pr } : {}),
      ...(u.order.kind === "patrol" && Array.isArray(u.order.pts) ? { pts: u.order.pts.map((pt) => ({ c: pt.c, r: pt.r })), pi: u.order.pi } : {}) } : null,
    // صف وی‌پوینت (0.162.0 — بند 238؛ غایب/تهی = بی‌صف، قدیمی سازگار)
    ...(Array.isArray(u.wp) && u.wp.length ? { wp: u.wp.map((w) => ({ kind: w.kind, c: w.c, r: w.r })) } : {}),
  }));
  // پرچم گاریسون از فهرست برج‌ها بازسازی می‌شود (0.45.0؛ شناسه ناهمگام هرس،
  // مدافع سر مرکز برج می‌ایستد چون مختصاتش در ذخیره همان‌جاست).
  {
    const unitById = new Map(s.units.map((u) => [u.id, u]));
    for (const b of s.buildings) {
      if (!isGarrisonPost(b.type) || !b.garrison.length) continue;
      b.garrison = b.garrison.filter((gid) => {
        const u = unitById.get(gid);
        if (!u) return false;
        u.garrisonTower = b.id;
        u.x = b.c + b.w / 2;
        u.r = b.r + b.h / 2;
        return true;
      });
    }
  }
  // ارجاع‌های مرده/ویران‌شده را پاک کن (نه خطا — تحمل‌پذیر)
  const unitIds = new Set(s.units.map((u) => u.id));
  const bldIds = new Set(s.buildings.map((b) => b.id));
  for (const u of s.units) {
    if (u.guardBld != null && !bldIds.has(u.guardBld)) u.guardBld = null; // پاسگاه از دست رفته
    if (u.homeBld != null && !bldIds.has(u.homeBld)) u.homeBld = null; // عطاری از دست رفته (0.146.0)
    if (u.targetKind === "unit" && !unitIds.has(u.targetId)) {
      u.targetKind = null; u.targetId = null;
    } else if (u.targetKind === "bld" && !bldIds.has(u.targetId)) {
      u.targetKind = null; u.targetId = null;
    }
  }
  for (const b of s.buildings) {
    if (b.targetId != null && !unitIds.has(b.targetId)) b.targetId = null;
  }
  // ارجاع مرده undo (0.146.0): بنای pending رفته → null (نه خطا).
  if (s.undo && !bldIds.has(s.undo.bld)) s.undo = null;
  return s;
}

// زنجیره مهاجرت نسخه‌به‌نسخه (0.233.0 — C-TST-2): هر نسخه فقط بلد است به
// نسخه بعدی برود (MIGRATIONS[v]); migrateSaveDoc تا SCHEMA_VERSION جلو می‌برد.
// خالص (کپی می‌گیرد، ورودی را لمس نمی‌کند) و idempotent است (سند جاری بی‌تغییر
// برمی‌گردد). deserialize دست‌نخورده است و مثل قبل مستقیم هم می‌پذیرد.
export const MIGRATIONS = {
  1: (doc) => {
    // v1 → v2: بدون یگان/شناسه/موج (buildState قدیمی همان‌ها را پیش‌فرض می‌زد) +
    // بناها بی-hp (loader از داده می‌خواند). صریح‌سازی همان پیش‌فرض‌ها.
    if (!Array.isArray(doc.units)) doc.units = [];
    if (!Number.isInteger(doc.nextUnitId) || doc.nextUnitId < 1) doc.nextUnitId = 1;
    if (!Number.isInteger(doc.wave) || doc.wave < 0) doc.wave = 0;
    doc.v = 2;
    return doc;
  },
};

export function migrateSaveDoc(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new SaveError("INVALID_SCHEMA", "root");
  }
  const doc = JSON.parse(JSON.stringify(data));
  const from = doc.v;
  if (!Number.isInteger(from) || from < 1) throw new SaveError("UNSUPPORTED_VERSION", "v=" + String(from));
  if (from > SCHEMA_VERSION) throw new SaveError("FUTURE_VERSION", "v=" + from);
  while (doc.v < SCHEMA_VERSION) {
    const up = MIGRATIONS[doc.v];
    if (typeof up !== "function") throw new SaveError("UNSUPPORTED_VERSION", "v=" + doc.v);
    up(doc);
  }
  return { doc, from, to: doc.v };
}

export function deserialize(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new SaveError("INVALID_SCHEMA", "root");
  }
  // تحمل ذخیره قدیمی بدون سنگ (0.18.0)، گندم (0.20.0)، رازک/آبجو (0.21.0)، آرد (0.38.0)، آهن/شمشیر/کمان (0.44.0):
  // پیش‌فرض صفر پیش از اعتبارسنجی.
  if (data.resources && typeof data.resources === "object") {
    for (const k of ["stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows"]) {
      if (data.resources[k] === undefined) data.resources = { ...data.resources, [k]: 0 };
    }
  }
  if (data.v === 1) {
    // مهاجرت: همان اعتبارسنجی هسته + ساختمان‌ها، بعد ارتقا
    checkCore(data);
    const seenV1 = checkBuildings(data);
    checkResources(data);
    for (const id of seenV1) {
      if (id >= data.nextId) throw new SaveError("INVALID_SCHEMA", "buildings.id-range");
    }
    return buildState(data, true);
  }
  if (data.v !== SCHEMA_VERSION) {
    if (isInt(data.v) && data.v > SCHEMA_VERSION) throw new SaveError("FUTURE_VERSION", "v=" + data.v);
    throw new SaveError("UNSUPPORTED_VERSION", "v=" + String(data.v));
  }
  checkCore(data);
  if (!isInt(data.nextUnitId) || data.nextUnitId < 1) {
    throw new SaveError("INVALID_SCHEMA", "nextUnitId");
  }
  if (data.wave !== undefined && (!isInt(data.wave) || data.wave < 0)) {
    throw new SaveError("INVALID_SCHEMA", "wave");
  }
  const seen = checkBuildings(data);
  checkResources(data);
  for (const id of seen) {
    if (id >= data.nextId) throw new SaveError("INVALID_SCHEMA", "buildings.id-range");
  }
  checkUnits(data, data.nextUnitId);
  return buildState(data, false);
}

export function deserializeJSON(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SaveError("INVALID_JSON");
  }
  return deserialize(data);
}

// --- بک‌اند localStorage ---

export function storageSave(slot, json) {
  try {
    localStorage.setItem(slot, json);
    return { ok: true, bytes: json.length };
  } catch {
    return { ok: false, error: "QUOTA" };
  }
}

export function storageLoad(slot) {
  let text = null;
  try {
    text = localStorage.getItem(slot);
  } catch {
    return { ok: false, error: "DISABLED" };
  }
  if (text == null) return { ok: false, error: "EMPTY" };
  return { ok: true, text };
}

export function storageDelete(slot) {
  try {
    localStorage.removeItem(slot);
  } catch { /* نادیده */ }
}

export function slotInfo(slot) {
  const r = storageLoad(slot);
  if (!r.ok) return { exists: false };
  let tick = null;
  try {
    tick = JSON.parse(r.text).tick;
  } catch { /* خراب — بارگذاری خطا می‌دهد */ }
  return { exists: true, tick, bytes: r.text.length };
}

// --- بک‌اند IndexedDB (0.55.0 — #۱۶ از FEATURES) ---
// اسلات‌های بازی اول IDB را می‌بینند و فقط در نبود/خرابی IDB به localStorage
// برمی‌گردند، پس ذخیره قدیمی همیشه خوانده می‌شود. توابع سینک قدیمی
// (storageSave/storageLoad/...) سر جایشان‌اند — fallback و تست‌ها همان‌ها را
// می‌بینند. هیچ‌کدام throw نمی‌کنند.

export const MIGRATED_KEY = "scw.idbMigrated";

// مهاجرت یک‌بار: کپی اسلات‌های localStorage به IDB. اصل‌ها می‌مانند (پشتیبان
// و fallback)، پس قدیمی‌ها همیشه خوانده می‌شوند. slots برای تست قابل تزریق است.
export async function migrateToIdb(slots) {
  if (!idbAvailable()) return { ok: false, error: "DISABLED" };
  const list = Array.isArray(slots) && slots.length ? slots : [SLOTS.auto, SLOTS.manual];
  const isDefault = list.length === 2 && list[0] === SLOTS.auto && list[1] === SLOTS.manual;
  if (isDefault) {
    let flag = null;
    try { flag = localStorage.getItem(MIGRATED_KEY); } catch { /* نادیده */ }
    if (flag === "1") return { ok: true, migrated: false, slots: 0 };
  }
  let n = 0;
  for (const slot of list) {
    const r = storageLoad(slot);
    if (!r.ok) continue;
    const w = await idbSet(slot, r.text);
    if (w.ok) n += 1;
  }
  if (isDefault) {
    try { localStorage.setItem(MIGRATED_KEY, "1"); } catch { /* نادیده */ }
  }
  return { ok: true, migrated: true, slots: n };
}

export async function saveSlot(slot, json) {
  if (idbAvailable()) {
    const r = await idbSet(slot, json);
    if (r.ok) return r;
    if (r.error === "TOO_BIG") return r; // سقف واقعی است — fallback بی‌معنی است
  }
  return storageSave(slot, json);
}

export async function loadSlot(slot) {
  if (idbAvailable()) {
    const r = await idbGet(slot);
    if (r.ok) return r;
    if (r.error !== "EMPTY") {
      const fb = storageLoad(slot); // خرابی IDB = fallback
      if (fb.ok) return fb;
      return r;
    }
  }
  return storageLoad(slot);
}

export async function deleteSlot(slot) {
  if (idbAvailable()) await idbDel(slot);
  storageDelete(slot);
  return { ok: true };
}

export async function infoSlot(slot) {
  const r = await loadSlot(slot);
  if (!r.ok) return { exists: false };
  let tick = null;
  try {
    tick = JSON.parse(r.text).tick;
  } catch { /* خراب — بارگذاری خطا می‌دهد */ }
  return { exists: true, tick, bytes: r.text.length };
}

// --- ذخیره‌های بانام (0.178.0 — بند 114/§۱.۳) ---
// «Save (با نام دلخواه) / Load»: چند اسلات نام‌دار + فهرست/بارگذاری/حذف.
// کلید هر نام + ایندکس JSON (آرایه {name,tick,bytes})؛ خواندن/نوشتن از همان
// saveSlot/loadSlot می‌گذرد پس IDB-aware و سازگار با fallback است.
// نام: ۱ تا ۲۴ نویسه (حروف همه خط‌ها + عدد + فاصله و _-().) — خالص و سینک.
export const NAMED_SAVE_PREFIX = "scw.save.named.";
export const NAMED_SAVE_INDEX = "scw.save.named.index";
export const MAX_SAVE_NAME = 24;
export function validSaveName(n) {
  if (typeof n !== "string") return null;
  const s = n.trim().replace(/\s+/g, " ");
  if (!s || s.length > MAX_SAVE_NAME) return null;
  if (!/^[\p{L}\p{N} _\-.()]+$/u.test(s)) return null;
  return s;
}
export function namedSlotKey(name) {
  return NAMED_SAVE_PREFIX + name;
}
async function readNamedIndex() {
  const r = await loadSlot(NAMED_SAVE_INDEX);
  if (!r.ok) return [];
  try {
    const a = JSON.parse(r.text);
    if (!Array.isArray(a)) return [];
    return a.filter((e) => e && typeof e.name === "string");
  } catch { return []; }
}
// فهرست بانام‌ها (هرس خودکار: ورودیِ بی‌اسلات پاک و ایندکس ذخیره می‌شود).
export async function listNamedSaves() {
  const idx = await readNamedIndex();
  const out = [];
  for (const e of idx) {
    const info = await infoSlot(namedSlotKey(e.name));
    if (info.exists) out.push({ name: e.name, tick: info.tick, bytes: info.bytes });
  }
  if (out.length !== idx.length) {
    await saveSlot(NAMED_SAVE_INDEX, JSON.stringify(out));
  }
  return out;
}
export async function saveNamed(name, json) {
  const s = validSaveName(name);
  if (s === null) return { ok: false, error: "BAD_NAME" };
  const r = await saveSlot(namedSlotKey(s), json);
  if (!r.ok) return r;
  const idx = await readNamedIndex();
  const tick = (() => { try { return JSON.parse(json).tick; } catch { return null; } })();
  const rest = idx.filter((e) => e.name !== s);
  rest.push({ name: s, tick, bytes: json.length });
  await saveSlot(NAMED_SAVE_INDEX, JSON.stringify(rest));
  return { ok: true, name: s, bytes: json.length };
}
export async function loadNamed(name) {
  const s = validSaveName(name);
  if (s === null) return { ok: false, error: "BAD_NAME" };
  return loadSlot(namedSlotKey(s));
}
export async function deleteNamed(name) {
  const s = validSaveName(name);
  if (s === null) return { ok: false, error: "BAD_NAME" };
  await deleteSlot(namedSlotKey(s));
  const idx = await readNamedIndex();
  const rest = idx.filter((e) => e.name !== s);
  if (rest.length !== idx.length) await saveSlot(NAMED_SAVE_INDEX, JSON.stringify(rest));
  return { ok: true };
}
