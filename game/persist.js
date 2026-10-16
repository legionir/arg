// ذخیره و بازیابی نسخه‌دار در مرورگر (PERSIST-001).
// اشغال (occ) و سهمیه کارگر ذخیره نمی‌شوند — از ساختمان‌ها بازسازی می‌شوند.
// وضعیت مسیر واحدها (path/pathGoal/pathIdx در combat.js) هم ذخیره نمی‌شود —
// پس از load بازمحاسبه می‌شود (تست t_path_after_load).
// v1 → v2: افزودن hp ساختمان‌ها + واحدها (مهاجرت خودکار، بدون از دست رفتن).
import { CONFIG } from "./config.js";
import { createState, occupyFootprint } from "./state.js";
import { TAX, RATIONS, capFor } from "./economy.js";
import { UNITS } from "./combat.js";
import { idbAvailable, idbSet, idbGet, idbDel } from "./idb.js";

export const SCHEMA_VERSION = 2;

export const SLOTS = {
  auto: "scw.save.auto",
  manual: "scw.save.manual",
};

export class SaveError extends Error {
  constructor(code, detail) {
    super(detail ? `${code}: ${detail}` : code);
    this.code = code;
  }
}

export const SAVE_FA = {
  INVALID_JSON: "داده خراب است (JSON نامعتبر)",
  INVALID_SCHEMA: "ساختار ذخیره نامعتبر است",
  FUTURE_VERSION: "ذخیره از نسخه جدیدتر است — قابل بارگذاری نیست",
  UNSUPPORTED_VERSION: "نسخه ذخیره پشتیبانی نمی‌شود",
  EMPTY: "ذخیره‌ای وجود ندارد",
  QUOTA: "فضای ذخیره مرورگر کافی نیست",
  DISABLED: "ذخیره‌سازی در این مرورگر ممکن نیست",
  TOO_BIG: "ذخیره از سقف ۴MB بزرگ‌تر است",
};

export function serialize(state) {
  return {
    v: SCHEMA_VERSION,
    tick: state.tick,
    mapSeed: state.mapSeed != null ? state.mapSeed >>> 0 : CONFIG.MAP_SEED,
    speed: state.speed,
    paused: state.paused,
    nextId: state.nextId,
    nextUnitId: state.nextUnitId,
    wave: state.wave || 0,
    resources: { ...state.resources },
    workers: state.workers,
    popularity: state.popularity,
    popTarget: state.popTarget,
    popDir: state.popDir,
    tax: state.tax,
    rations: state.rations,
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
    buildings: state.buildings.map((b) => ({
      id: b.id, type: b.type, c: b.c, r: b.r, progress: b.progress || 0,
      hp: b.hp, cooldown: b.cooldown || 0, buildLeft: b.buildLeft || 0, // ساخت نیمه‌کاره (0.39.0)
      targetId: b.targetId != null ? b.targetId : null,
      owner: b.owner != null ? b.owner : 0, // مالک (0.24.0؛ قدیمی = ۰)
      // گاریسون برج (0.45.0؛ غایب/خالی در قدیمی = []؛ پرچم مدافع از همین بازسازی می‌شود)
      ...(b.type === "tower" && b.garrison && b.garrison.length ? { garrison: b.garrison.slice() } : {}),
      // صف آموزش (0.65.0؛ غایب/خالی در قدیمی = []؛ سفارش‌ها با left مانده می‌مانند)
      ...(b.type === "barracks" && b.train && b.train.length
        ? { train: b.train.map((e) => ({ type: e.type, c: e.c, r: e.r, left: e.left, total: e.total })) } : {}),
      // وضعیت دروازه (0.13.0)؛ نامشخص در ذخیره قدیمی یعنی باز.
      ...(b.type === "gate" ? { open: b.open !== false } : {}),
    })),
    units: state.units.map((u) => ({
      id: u.id, type: u.type, x: u.x, r: u.r, hp: u.hp, cooldown: u.cooldown || 0,
      targetKind: u.targetKind, targetId: u.targetId,
      mission: u.mission || "idle",
      stance: u.stance || "engage",
      guardBld: u.guardBld != null ? u.guardBld : null, // پاسگاه نگهبانی (0.15.0)
      ...(u.deployed ? { deployed: true } : {}), // استقرار منجنیق (0.46.0؛ غایب = سیار)
      owner: u.owner != null ? u.owner : 0, // مالک (0.24.0؛ قدیمی = ۰)
      order: u.order ? { kind: u.order.kind, c: u.order.c, r: u.order.r,
        status: u.order.status, retries: u.order.retries || 0,
        elapsed: u.order.elapsed || 0 } : null,
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
  if (typeof data.speed !== "number" || !(data.speed > 0)) throw bad("speed");
  if (typeof data.paused !== "boolean") throw bad("paused");
  if (!isInt(data.nextId) || data.nextId < 1) throw bad("nextId");
  for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows"]) {
    if (!data.resources || typeof data.resources[k] !== "number") throw bad("resources." + k);
  }
  if (!isInt(data.workers) || data.workers < 0 || data.workers > 999) throw bad("workers");
  if (!inRange(data.popularity, 0, 100)) throw bad("popularity");
  if (!inRange(data.popTarget, 0, 100)) throw bad("popTarget");
  if (![-1, 0, 1].includes(data.popDir)) throw bad("popDir");
  if (!TAX[data.tax]) throw bad("tax");
  if (!RATIONS[data.rations]) throw bad("rations");
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
      if (b.type !== "tower" || !Array.isArray(b.garrison) || b.garrison.length > 4) {
        throw bad("buildings.garrison");
      }
      const seenG = new Set();
      for (const gid of b.garrison) {
        if (!isInt(gid) || gid < 1 || seenG.has(gid)) throw bad("buildings.garrison");
        seenG.add(gid);
      }
    }
    // صف آموزش (0.65.0، اختیاری → خالی؛ فقط سربازخانه، حداکثر سقف CONFIG).
    if (b.train !== undefined) {
      const cap = CONFIG.TRAIN && CONFIG.TRAIN.queueCap > 0 ? CONFIG.TRAIN.queueCap : 5;
      if (b.type !== "barracks" || !Array.isArray(b.train) || b.train.length > cap) {
        throw bad("buildings.train");
      }
      for (const e of b.train) {
        if (!e || typeof e !== "object" || !UNITS[e.type]) throw bad("buildings.train");
        if (!isInt(e.c) || !isInt(e.r)) throw bad("buildings.train");
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
  const pseudo = { buildings: data.buildings.map((b) => ({ type: b.type, destroyed: false })), mp: null };
  for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows"]) {
    if (!inRange(data.resources[k], 0, capFor(pseudo, k))) throw bad("resources." + k);
  }
}

// حریف AI (0.42.0): بلوک اختیاری → غیرفعال؛ دست‌کاری رد می‌شود.
function checkAi(data) {
  const bad = (f) => new SaveError("INVALID_SCHEMA", f);
  const off = {
    active: false, seed: 0,
    resources: { wood: 0, food: 0, gold: 0, stone: 0, wheat: 0, flour: 0, hops: 0, beer: 0, iron: 0, swords: 0, bows: 0 },
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
  for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows"]) {
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
    } else if (u.stance !== "engage" && u.stance !== "hold" && u.stance !== "guard") {
      throw bad("units.stance");
    }
    // پاسگاه نگهبانی (0.15.0، اختیاری → null؛ ارجاع مرده در buildState پاک می‌شود)
    if (u.guardBld === undefined || u.guardBld === null) {
      u.guardBld = null;
    } else if (!isInt(u.guardBld) || u.guardBld < 1) {
      throw bad("units.guardBld");
    }
    // استقرار منجنیق (0.46.0، اختیاری → سیار؛ دست‌کاری غیربولی رد می‌شود)
    if (u.deployed !== undefined && typeof u.deployed !== "boolean") {
      throw bad("units.deployed");
    }
    if (u.order === undefined || u.order === null) {
      u.order = null;
    } else {
      if (!["move", "attackmove", "retreat"].includes(u.order.kind)) {
        throw bad("units.order.kind");
      }
      if (!isInt(u.order.c) || !isInt(u.order.r)) throw bad("units.order.pos");
      if (u.order.c < 0 || u.order.r < 0 || u.order.c >= W || u.order.r >= H) {
        throw bad("units.order.bounds");
      }
      if (!["active", "done", "failed"].includes(u.order.status)) throw bad("units.order.status");
      if (!isInt(u.order.retries) || u.order.retries < 0) throw bad("units.order.retries");
      if (u.order.elapsed === undefined) {
        u.order.elapsed = 0;
      } else if (!isInt(u.order.elapsed) || u.order.elapsed < 0) {
        throw bad("units.order.elapsed");
      }
    }
  }
}

function buildState(data, upgradedFromV1) {
  const s = createState();
  const W = CONFIG.GRID_W;
  s.tick = data.tick;
  s.mapSeed = data.mapSeed !== undefined ? data.mapSeed >>> 0 : CONFIG.MAP_SEED;
  s.speed = data.speed;
  s.paused = data.paused;
  s.nextId = data.nextId;
  s.nextUnitId = upgradedFromV1 ? 1 : data.nextUnitId;
  s.wave = data.wave || 0;
  s.resources = { ...data.resources };
  s.workers = data.workers;
  s.popularity = data.popularity;
  s.popTarget = data.popTarget;
  s.popDir = data.popDir;
  s.tax = data.tax;
  s.rations = data.rations;
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
  s.mapPatches = Array.isArray(data.mapPatches) ? data.mapPatches.map((e) => [e[0], e[1]]) : null;
  // حریف AI (0.42.0؛ غایب در قدیمی = غیرفعال با کانتینر صفر)
  s.ai = checkAi(data);
  s.buildings = data.buildings.map((b) => {
    const def = CONFIG.BUILDINGS[b.type];
    return {
      id: b.id, type: b.type, c: b.c, r: b.r, w: def.w, h: def.h,
      hp: b.hp !== undefined ? b.hp : def.hp, maxHp: def.hp,
      progress: b.progress, cooldown: b.cooldown || 0,
      buildLeft: b.buildLeft || 0, // نیمه‌کاره می‌ماند (0.39.0؛ قدیمی = تکمیل)
      targetId: b.targetId != null ? b.targetId : null, staffed: true,
      owner: b.owner != null ? b.owner : 0,
      garrison: b.type === "tower" && Array.isArray(b.garrison) ? b.garrison.slice() : [], // (0.45.0؛ قدیمی = خالی)
      train: b.type === "barracks" && Array.isArray(b.train) // صف آموزش (0.65.0؛ قدیمی = خالی)
        ? b.train.map((e) => ({ type: e.type, c: e.c, r: e.r, left: e.left, total: e.total })) : [],
      ...(b.type === "gate" ? { open: b.open !== undefined ? !!b.open : true } : {}),
    };
  });
  for (const b of s.buildings) occupyFootprint(s, W, b.c, b.r, b.w, b.h);
  s.units = upgradedFromV1 ? [] : data.units.map((u) => ({
    id: u.id, type: u.type, side: UNITS[u.type].side,
    x: u.x, r: u.r, hp: u.hp, maxHp: UNITS[u.type].hp,
    cooldown: u.cooldown, targetKind: u.targetKind, targetId: u.targetId,
    flashTick: -99, path: null, pathGoal: null, pathIdx: 0, pathTick: -999, noPath: false,
    mission: u.mission || "idle",
    stance: u.stance || "engage",
    guardBld: u.guardBld != null ? u.guardBld : null,
    garrisonTower: null, // از فهرست برج‌ها بازسازی می‌شود (0.45.0)
    deployed: u.deployed === true, // استقرار منجنیق (0.46.0؛ قدیمی = سیار)
    owner: u.owner != null ? u.owner : 0,
    order: u.order ? { kind: u.order.kind, c: u.order.c, r: u.order.r,
      status: u.order.status, retries: u.order.retries || 0,
      elapsed: u.order.elapsed || 0 } : null,
  }));
  // پرچم گاریسون از فهرست برج‌ها بازسازی می‌شود (0.45.0؛ شناسه ناهمگام هرس،
  // مدافع سر مرکز برج می‌ایستد چون مختصاتش در ذخیره همان‌جاست).
  {
    const unitById = new Map(s.units.map((u) => [u.id, u]));
    for (const b of s.buildings) {
      if (b.type !== "tower" || !b.garrison.length) continue;
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
    if (u.targetKind === "unit" && !unitIds.has(u.targetId)) {
      u.targetKind = null; u.targetId = null;
    } else if (u.targetKind === "bld" && !bldIds.has(u.targetId)) {
      u.targetKind = null; u.targetId = null;
    }
  }
  for (const b of s.buildings) {
    if (b.targetId != null && !unitIds.has(b.targetId)) b.targetId = null;
  }
  return s;
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
