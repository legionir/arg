// سناریوی خودکار «۱۰ دقیقه اول بازیکن» (0.61.0 — تصمیم کاربر ۳-ب).
// شروع → اقتصاد → ارتش → نبرد، headless، فقط از مسیر فرمان اعتبارشده
// (enqueueCmd + stepSim) با حریف easy/گرگ. خروجی: گزارش گزارش‌محور (نه
// assert سخت) + هش قطعیت (دو اجرا ⇒ یک هش). این ابزار sim نیست (Date.now
// برای زمان‌سنجی مجاز است) و در سوئیت کامل نیست — اجرا با
// window.__slice01.firstTen()؛ دود سریع در tests.js با ۱۲۰۰ تیک.
import { CONFIG } from "./config.js";
import { makeTerrain, T_GRASS } from "./terrain.js";
import { createState } from "./state.js";
import { placeKeep } from "./construction.js";
import { spawnLord } from "./combat.js";
import { startAI } from "./ai.js";
import { createQueue, enqueueCmd, stepSim } from "./sim.js";
import { stateHash } from "./mp.js";

export const FIRST_TEN_TICKS = 12000; // ۱۰ دقیقه با ۲۰tps
export const FIRST_TEN_SEED = 1337;

// نخستین بلوک چمن آزاد w×h (پیمایش قطعی از بالا-چپ).
function freeSite(terrain, occ, W, H, w, h) {
  for (let r = 1; r + h <= H; r++) {
    for (let c = 1; c + w <= W; c++) {
      let ok = true;
      for (let j = 0; j < h && ok; j++) {
        for (let i = 0; i < w && ok; i++) {
          const k = (r + j) * W + (c + i);
          if (terrain[k] !== T_GRASS || occ[k] === 1) ok = false;
        }
      }
      if (ok) return { c, r };
    }
  }
  return null;
}

function isLord(u) { return u.type === "lord"; }
function playerArmy(state) {
  return state.units.filter((u) => !u.dead && u.side === "player" && !isLord(u));
}

// یک نشست کامل سناریو. برمی‌گرداند گزارش (بدون throw در مسیر موفق).
export function runFirstTenScenario(seed, ticks) {
  const t0 = Date.now();
  const s = (seed == null ? FIRST_TEN_SEED : seed) >>> 0;
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, s);
  const state = createState();
  state.mapSeed = s;
  placeKeep(state, terrain, W, H);
  spawnLord(state, terrain, W, H);
  startAI(state, terrain, W, H, "easy", "wolf");
  const q = createQueue();
  const cmd = (c) => enqueueCmd(q, c, state.tick);

  const keep = state.buildings.find((b) => b.type === "keep");
  const guard = keep ? freeSite(terrain, state.occ, W, H, 1, 1) : null;
  const gx = guard ? guard.c : 2, gr = guard ? guard.r : 2;

  // برنامه ساخت (تیک → نوع): اقتصاد اول، بعد آهن/سلاح، بعد سربازخانه.
  // + تلاش مجدد هر ۲۰۰ تیک برای غایب‌ها (مثل بازیکن واقعی که رد را تکرار
  // می‌کند؛ دلیل رد معمولاً هزینه/جا در همان لحظه است). کلبه دوم برای کارگر.
  const plan = [
    [5, "woodcutter"], [15, "hut"], [25, "farm"], [35, "mill"], [45, "bakery"],
    [60, "quarry"], [80, "ironmine"], [100, "armoury"], [120, "fletcher"], [140, "barracks"],
    [200, "hut"],
  ];
  const desired = ["woodcutter", "hut", "farm", "mill", "bakery", "quarry",
    "ironmine", "armoury", "fletcher", "barracks"];
  const rejectedStart = state.rejected | 0;
  const tryPlace = (type, need) => {
    const have = state.buildings.filter((b) => b.type === type && !b.destroyed &&
      (b.owner == null || b.owner === 0)).length;
    if (have >= (need == null ? 1 : need)) return;
    const def = CONFIG.BUILDINGS[type];
    const site = freeSite(terrain, state.occ, W, H, def.w, def.h);
    if (site) cmd({ kind: "place", type, c: site.c, r: site.r });
  };
  let hired = 0, hireTries = 0;
  let prevIds = new Map();
  let playerDeaths = 0, aiDeaths = 0;
  let maxFood = 0, maxSwords = 0, maxBows = 0;
  let defeatTick = null, peakBuildings = 0;
  const samples = [];
  const N = ticks == null ? FIRST_TEN_TICKS : ticks;
  for (let i = 0; i < N; i++) {
    const t = state.tick;
    for (const [at, type] of plan) {
      if (at === t) {
        const def = CONFIG.BUILDINGS[type];
        const site = freeSite(terrain, state.occ, W, H, def.w, def.h);
        if (site) cmd({ kind: "place", type, c: site.c, r: site.r });
      }
    }
    // تلاش مجدد برای غایب‌ها (هر ۲۰۰ تیک از ۳۰۰ به بعد؛ کلبه ×۲).
    if (t >= 300 && t % 200 === 0) {
      for (const type of desired) tryPlace(type, type === "hut" ? 2 : 1);
    }
    // استخدام: از تیک ۴۰۰ هر ۱۵۰ تیک تا ۸ مزدور (شمشیرزن/کماندار یکی‌درمیان؛
    // رد = هنوز شمشیر/کمان نیست، تلاش بعدی).
    if (t >= 400 && t % 150 === 0 && hired < 8 && hireTries < 60) {
      const barracks = state.buildings.find((b) => b.type === "barracks" && !b.destroyed);
      if (barracks) {
        const site = freeSite(terrain, state.occ, W, H, 1, 1);
        if (site) {
          hireTries++;
          const type = hired % 2 === 0 ? "soldier" : "bowman";
          const before = state.units.length;
          cmd({ kind: "hire", type, c: site.c, r: site.r });
          // نتیجه پس از تخلیه صف در همین گام خوانده می‌شود (پایین حلقه) —
          // شمارش ساده: طول یگان‌ها در پایش بعدی.
          void before;
        }
      }
    }
    // نگه‌داشتن ارتش و ارباب کنار ستاد (هر ۴۰۰ تیک) — دفاع در برابر یورش.
    if (t > 0 && t % 400 === 0) {
      const ids = state.units
        .filter((u) => !u.dead && u.side === "player")
        .map((u) => u.id);
      if (ids.length) cmd({ kind: "order", orderKind: "move", ids, c: gx, r: gr });
    }
    stepSim(state, terrain, 1, q);
    // پایش مرگ‌ومیر هر ۵۰ تیک (ناپدیدشدن id = مرگ؛ گاریسون در فهرست می‌ماند).
    if (state.tick % 50 === 0) {
      const cur = new Map();
      for (const u of state.units) cur.set(u.id, u.side);
      if (prevIds.size) {
        for (const [id, side] of prevIds) {
          if (!cur.has(id)) {
            if (side === "player") playerDeaths++;
            else aiDeaths++;
          }
        }
      }
      prevIds = cur;
    }
    hired = playerArmy(state).length;
    const res = state.resources;
    if (res.food > maxFood) maxFood = res.food;
    if (res.swords > maxSwords) maxSwords = res.swords;
    if (res.bows > maxBows) maxBows = res.bows;
    const aliveBlds = state.buildings.filter((b) => !b.destroyed && (b.owner == null || b.owner === 0)).length;
    if (aliveBlds > peakBuildings) peakBuildings = aliveBlds;
    if (defeatTick == null && state.defeated) defeatTick = state.tick;
    if (state.tick % 1000 === 0) {
      samples.push({
        t: state.tick,
        blds: aliveBlds,
        army: hired,
        aiArmy: state.units.filter((u) => !u.dead && u.side === "enemy").length,
        food: res.food, gold: res.gold, wood: res.wood, iron: res.iron,
        swords: res.swords, bows: res.bows,
        pDeaths: playerDeaths, aiDeaths,
      });
    }
  }
  const playerBlds = state.buildings.filter((b) => !b.destroyed && (b.owner == null || b.owner === 0)).length;
  const aiBlds = state.buildings.filter((b) => !b.destroyed && b.owner === 9).length;
  return {
    seed: s, ticks: state.tick, ms: Date.now() - t0, hash: stateHash(state),
    outcome: state.victorious ? "victory" : state.defeated ? "defeat" : "open",
    defeatTick, peakBuildings, samples,
    rejected: (state.rejected | 0) - rejectedStart,
    playerBuildings: playerBlds, aiBuildings: aiBlds,
    army: playerArmy(state).length, playerDeaths, aiDeaths,
    maxFood, maxSwords, maxBows,
    resources: { ...state.resources },
  };
}

// اجرای دابل برای اثبات قطعیت + گزارش نهایی.
export function runFirstTen(seed, ticks) {
  const a = runFirstTenScenario(seed, ticks);
  const b = runFirstTenScenario(seed, ticks);
  return { ...a, deterministic: a.hash === b.hash, hashB: b.hash };
}

// بازرسی میانه‌راه برای دیباگ (ساختمان‌ها با staffed، منابع، یگان‌ها).
export function inspectFirstTen(seed, ticks) {
  const s = (seed == null ? FIRST_TEN_SEED : seed) >>> 0;
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, s);
  const state = createState();
  state.mapSeed = s;
  placeKeep(state, terrain, W, H);
  spawnLord(state, terrain, W, H);
  startAI(state, terrain, W, H, "easy", "wolf");
  const q = createQueue();
  // همان برنامه ساخت runFirstTenScenario تا تیک خواسته‌شده (بدون استخدام/دستور).
  const plan = [
    [5, "woodcutter"], [15, "hut"], [25, "farm"], [35, "mill"], [45, "bakery"],
    [60, "quarry"], [80, "ironmine"], [100, "armoury"], [120, "fletcher"], [140, "barracks"],
  ];
  for (let i = 0; i < (ticks == null ? 1500 : ticks); i++) {
    for (const [at, type] of plan) {
      if (at === state.tick) {
        const def = CONFIG.BUILDINGS[type];
        const site = freeSite(terrain, state.occ, W, H, def.w, def.h);
        if (site) enqueueCmd(q, { kind: "place", type, c: site.c, r: site.r }, state.tick);
      }
    }
    stepSim(state, terrain, 1, q);
  }
  return {
    tick: state.tick,
    buildings: state.buildings.map((b) => ({ type: b.type, owner: b.owner == null ? 0 : b.owner, staffed: !!b.staffed, buildLeft: b.buildLeft | 0, destroyed: !!b.destroyed })),
    resources: { ...state.resources },
    freeWorkers: state.freeWorkers,
    workers: state.workers,
  };
}
