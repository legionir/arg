// رگرسیون هش‌دار + فاز (0.58.0 — #۲۷ از FEATURES، الگوی CHG-032…036).
// ۸ سناریوی ثابت (سید+ساخت+فرمان قطعی) که هش stateHash آن‌ها پین شده است:
// هر تغییر ناخواسته sim هش را عوض می‌کند و تست قرمز می‌شود (تغییر عمدی =
// به‌روزرسانی EXPECTED_HASHES با ثبت در CHANGELOG).
// + فاز ذخیره/فرمان با RNG سیددار (تکرارپذیر): ورودی خصمانه یا رد تمیز
// (SaveError/رد صف) می‌شود یا تحمل می‌شود — هرگز throw خام.

import { CONFIG } from "./config.js";
import { makeTerrain, T_GRASS } from "./terrain.js";
import { createState } from "./state.js";
import { tryPlace, placeKeep } from "./construction.js";
import { spawnUnit, hireUnit, spawnLord, orderAttackMove, deployUnit, garrisonUnit } from "./combat.js";
import { createQueue, enqueueCmd, stepSim } from "./sim.js";
import { startAI } from "./ai.js";
import { stateHash } from "./mp.js";
import { mulberry32 } from "./rng.js";
import { serialize, deserialize, SaveError } from "./persist.js";

// مارپیچ قطعی جای خالی w×h (کپی کوچک siteNear تست‌ها — این ماژول به tests
// وابسته نیست تا ابزارها هم بتوانند صدایش بزنند).
function findSite(state, terrain, W, H, c0, r0, w, h) {
  for (let rad = 0; rad < Math.max(W, H); rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const c = c0 + dc, r = r0 + dr;
        if (c < 0 || r < 0 || c + w > W || r + h > H) continue;
        let ok = true;
        for (let j = 0; j < h && ok; j++) {
          for (let i = 0; i < w && ok; i++) {
            if (terrain[(r + j) * W + (c + i)] !== T_GRASS || state.occ[(r + j) * W + (c + i)] === 1) ok = false;
          }
        }
        if (ok) return [c, r];
      }
    }
  }
  return null;
}

function mkWorld(seed) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, seed);
  const state = createState();
  state.mapSeed = seed >>> 0;
  return { W, H, terrain, state };
}

// پیش‌شرط استخدام: سربازخانه + مهمات + غذا/طلا (آینه needBarracks تست‌ها).
function needRax(w, c, r) {
  const { state, terrain, W, H } = w;
  state.resources.swords = Math.max(state.resources.swords || 0, 30);
  state.resources.bows = Math.max(state.resources.bows || 0, 30);
  state.resources.food = Math.max(state.resources.food || 0, 500);
  state.resources.gold = Math.max(state.resources.gold || 0, 500);
  const def = CONFIG.BUILDINGS.barracks;
  const s = findSite(state, terrain, W, H, c, r, def.w, def.h);
  if (!s) throw new Error("regression: جا برای سربازخانه نیست");
  const p = tryPlace(state, terrain, W, H, s[0], s[1], def);
  if (!p.ok) throw new Error("regression: سربازخانه ساخته نشد " + p.reason);
  p.building.buildLeft = 0;
  return p.building;
}

function put(w, type, c, r) {
  const { state, terrain, W, H } = w;
  const def = CONFIG.BUILDINGS[type];
  const s = findSite(state, terrain, W, H, c, r, def.w, def.h);
  if (!s) throw new Error("regression: جا برای " + type + " نیست");
  const p = tryPlace(state, terrain, W, H, s[0], s[1], def);
  if (!p.ok) throw new Error("regression: " + type + " ساخته نشد " + p.reason);
  p.building.buildLeft = 0;
  return p.building;
}

function hire(w, type, c, r) {
  const { state, terrain, W, H } = w;
  const g = findSite(state, terrain, W, H, c, r, 1, 1);
  if (!g) throw new Error("regression: جای استخدام نیست");
  const h = hireUnit(state, terrain, W, H, g[0], g[1], type);
  if (!h.ok) throw new Error("regression: استخدام " + type + " نشد " + h.reason);
  return h.unit;
}

function foe(w, type, x, r) {
  return spawnUnit(w.state, type, x, r);
}

// ۸ سناریو: {key, name, seed, ticks, setup(w)} — setup قطعی و بدون تصادف است.
export const REGRESSIONS = [
  {
    key: "eco-wood", name: "اقتصاد چوب", seed: 1337, ticks: 700,
    setup(w) {
      put(w, "hut", 4, 4);
      put(w, "woodcutter", 10, 10);
      put(w, "quarry", 16, 16);
      w.state.workers = 6;
    },
  },
  {
    key: "econ-chain", name: "زنجیره نان", seed: 4242, ticks: 900,
    setup(w) {
      put(w, "wheatfarm", 4, 4);
      put(w, "mill", 10, 10);
      put(w, "bakery", 16, 16);
      w.state.workers = 6;
      w.state.resources.wheat = 20;
    },
  },
  {
    key: "combat-melee", name: "نبرد تن‌به‌تن", seed: 7, ticks: 400,
    setup(w) {
      needRax(w, 6, 50);
      const a = hire(w, "soldier", 20, 20);
      const b = hire(w, "soldier", 22, 20);
      const e = foe(w, "swordsman", a.x + 2, a.r);
      orderAttackMove(w.state, a, e.x, e.r);
      orderAttackMove(w.state, b, e.x, e.r);
      orderAttackMove(w.state, e, a.x, a.r);
    },
  },
  {
    key: "tower-defense", name: "دفاع برج", seed: 21, ticks: 500,
    setup(w) {
      needRax(w, 6, 50);
      const t = put(w, "tower", 30, 30);
      t.buildLeft = 0;
      const a = hire(w, "bowman", 28, 28);
      const e = foe(w, "archer", t.c + 4, t.r);
      orderAttackMove(w.state, a, e.x, e.r);
    },
  },
  {
    key: "siege-catapult", name: "منجنیق مستقر", seed: 77, ticks: 350,
    setup(w) {
      needRax(w, 6, 50);
      const c = hire(w, "catapult", 20, 20);
      const d = deployUnit(w.state, c);
      if (!d.ok) throw new Error("regression: استقرار نشد " + d.reason);
      foe(w, "swordsman", c.x + 6, c.r);
    },
  },
  {
    key: "garrison-tower", name: "گاریسون در آتش", seed: 99, ticks: 300,
    setup(w) {
      needRax(w, 6, 50);
      const t = put(w, "tower", 30, 30);
      t.buildLeft = 0;
      const a = hire(w, "bowman", 28, 28);
      const g = garrisonUnit(w.state, a, t);
      if (!g.ok) throw new Error("regression: گاریسون نشد " + g.reason);
      foe(w, "archer", t.c + 5, t.r);
    },
  },
  {
    key: "ai-skirmish", name: "یورش حریف", seed: 1337, ticks: 1600,
    setup(w) {
      const { state, terrain, W, H } = w;
      placeKeep(state, terrain, W, H);
      spawnLord(state, terrain, W, H);
      const r = startAI(state, terrain, W, H, "normal", "wolf");
      if (!r.ok) throw new Error("regression: شروع AI نشد " + r.reason);
    },
  },
  {
    key: "policy-tax", name: "مالیات و جیره", seed: 555, ticks: 800,
    setup(w) {
      put(w, "farm", 4, 4);
      put(w, "hut", 10, 10);
      w.state.workers = 8;
      w.state.tax = "high";
      w.state.rations = "half";
    },
  },
];

// اجرای یک سناریو → {key, hash, ms}. قطعی: دوباره‌اجرا هش یکسان می‌دهد.
export function runScenario(scn) {
  const w = mkWorld(scn.seed);
  scn.setup(w);
  const q = createQueue();
  const t0 = performance.now();
  stepSim(w.state, w.terrain, scn.ticks, q);
  const ms = performance.now() - t0;
  return { key: scn.key, hash: stateHash(w.state), ms };
}

export function runRegression() {
  return REGRESSIONS.map(runScenario);
}

// هش‌های پین‌شده (تولید: اجرای زنده runRegression؛ تغییر عمدی sim = به‌روزرسانی + ثبت).
export const EXPECTED_HASHES = {
  "eco-wood": "44ba5359",
  "econ-chain": "a23c86d9",
  "combat-melee": "c7e286df",
  "tower-defense": "47f53d23",
  "siege-catapult": "a5c35b7c",
  "garrison-tower": "1935bca3",
  "ai-skirmish": "e06f576b",
  "policy-tax": "26db012d",
};

// --- فاز ---

// جهش‌های خصمانه روی سند ذخیره معتبر: حذف/نوع‌غلط/خارج‌بازه/زباله در آرایه‌ها.
// قرارداد: فقط SaveError (رد تمیز) یا قبول تحمل‌پذیر — هرگز throw خام.
const FUZZ_PATHS = [
  (d) => { d.tick = -5; },
  (d) => { d.tick = "x"; },
  (d) => { delete d.tick; },
  (d) => { d.mapSeed = 99999999999; },
  (d) => { d.resources = null; },
  (d) => { if (d.resources) d.resources.wood = "lots"; },
  (d) => { if (d.resources) d.resources.gold = -1; },
  (d) => { delete d.resources; },
  (d) => { d.buildings = "nope"; },
  (d) => { if (Array.isArray(d.buildings)) d.buildings.push({ id: 1, type: "castle", c: 0, r: 0, progress: 0 }); },
  (d) => { if (Array.isArray(d.buildings)) d.buildings.push(null); },
  (d) => { if (Array.isArray(d.buildings) && d.buildings[0]) d.buildings[0].hp = 99999; },
  (d) => { if (Array.isArray(d.buildings) && d.buildings[0]) d.buildings[0].c = -3; },
  (d) => { d.units = 42; },
  (d) => { if (Array.isArray(d.units)) d.units.push({ id: 999, type: "dragon", x: 0, r: 0, hp: 1, cooldown: 0, targetKind: null, targetId: null }); },
  (d) => { if (Array.isArray(d.units) && d.units[0]) d.units[0].order = { kind: "teleport", c: 0, r: 0, status: "active", retries: 0, elapsed: 0 }; },
  (d) => { d.ai = { active: "yes" }; },
  (d) => { d.ai = { active: true, seed: 1, resources: {}, workers: 0, workerCap: 0, buildIdx: 0, raidsSent: 0, nextThink: 0, baseC: 0, baseR: 0, phase: "warp", keepId: null, dormant: false, difficulty: "normal", personality: "wolf" }; },
  (d) => { d.v = 999; },
  (d) => { d.v = "2"; },
  (d) => { delete d.v; },
  (d) => { d.mapPatches = [[0, 9]]; },
  (d) => { d.nextId = 0; },
  (d) => { d.wave = -1; },
];

function baseSaveDoc() {
  const w = mkWorld(2024);
  put(w, "hut", 4, 4);
  needRax(w, 6, 50);
  hire(w, "soldier", 20, 20);
  const q = createQueue();
  stepSim(w.state, w.terrain, 120, q);
  return JSON.parse(JSON.stringify(serialize(w.state)));
}

export function fuzzSaves(iter, seed) {
  const rnd = mulberry32(seed >>> 0);
  let saveErrors = 0, passed = 0;
  const unexpected = [];
  for (let i = 0; i < iter; i++) {
    const doc = baseSaveDoc();
    const nMut = 1 + Math.floor(rnd() * 3);
    for (let m = 0; m < nMut; m++) {
      FUZZ_PATHS[Math.floor(rnd() * FUZZ_PATHS.length)](doc);
    }
    try {
      const s = deserialize(JSON.parse(JSON.stringify(doc)));
      passed += 1;
      // تحمل‌پذیر قبول شد؟ پس باید سالم باشد (اعداد متناهی، آرایه‌ها).
      if (!s || !Array.isArray(s.buildings) || !Array.isArray(s.units)) {
        unexpected.push(i + ": accepted-but-broken");
      }
      for (const k of Object.keys(s.resources || {})) {
        if (!Number.isFinite(s.resources[k])) unexpected.push(i + ": bad-resource-" + k);
      }
    } catch (e) {
      if (e instanceof SaveError) saveErrors += 1;
      else unexpected.push(i + ":" + String((e && e.message) || e).slice(0, 80));
    }
  }
  return { ran: iter, saveErrors, passed, unexpected: unexpected.slice(0, 5) };
}

// فاز فرمان: مقادیر خصمانه ولی شکل‌دار از صف می‌گذرند — sim نباید throw بدهد.
// (رد/نادیده = رفتار درست؛ شمار rejected باید جلو برود.)
const FUZZ_KINDS = ["place", "hire", "order", "tax", "gate", "demolish", "guard", "garrison", "deploy", "alarm", "trade", "trainCancel", "nonsense", null, 42];

export function fuzzCmds(iter, seed) {
  const rnd = mulberry32(seed >>> 0);
  const w = mkWorld(31337);
  put(w, "hut", 4, 4);
  const q = createQueue();
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const num = () => Math.floor(rnd() * 70) - 5;
  let enqueued = 0, rejected = 0, simThrow = null;
  for (let i = 0; i < iter && !simThrow; i++) {
    const cmd = {
      kind: pick(FUZZ_KINDS),
      type: pick(["hut", "wall", "soldier", "castle", null, 7]),
      c: num(), r: num(),
      ids: [1, 999999],
      bld: num(),
      v: pick(["none", "low", "bogus"]),
      orderKind: pick(["move", "attackmove", "warp"]),
    };
    try {
      const r = enqueueCmd(q, cmd, w.state.tick);
      if (r.ok) enqueued += 1;
      else rejected += 1;
    } catch (e) {
      simThrow = "enqueue:" + String((e && e.message) || e).slice(0, 80);
      break;
    }
    try {
      stepSim(w.state, w.terrain, 1, q);
    } catch (e) {
      simThrow = "step:" + String((e && e.message) || e).slice(0, 80);
      break;
    }
  }
  return { ran: iter, enqueued, rejected, simThrow };
}
