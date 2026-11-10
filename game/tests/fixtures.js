// فیکسچرهای مشترک سوئیت‌های tests/ (0.235.0 — C-CLN-1): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
// این ماژول فقط به game/* وابسته است (بدون چرخه با tests.js).
import { CONFIG } from "../config.js";
import { makeTerrain } from "../terrain.js";
import { createState } from "../state.js";
import { enableMp, mpClearSpawns, MP_SPAWN_ANCHOR } from "../mp.js";
import { placeKeepFor, tryPlace, validate } from "../construction.js";
import { stepEconomy } from "../economy.js";
import { stepCombat } from "../combat.js";
import { stepTraining } from "../train.js";
import { T_GRASS } from "../terrain.js";
import { occupyFootprint } from "../state.js";
import { spawnLord } from "../combat.js";

function must(cond, msg) {
  if (!cond) throw new Error(msg);
}
function fresh() {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  return { W, H, terrain: makeTerrain(W, H, CONFIG.MAP_SEED), state: createState() };
}
function mpFresh(num) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, CONFIG.MAP_SEED);
  mpClearSpawns(terrain, W, H);
  const state = createState();
  const names = [];
  for (let i = 0; i < num; i++) names.push("P" + (i + 1));
  enableMp(state, num, names);
  for (let s = 0; s < num; s++) {
    const an = MP_SPAWN_ANCHOR[s];
    const r = placeKeepFor(state, terrain, W, H, s, an[0], an[1]);
    must(r.ok, `ستاد بازیکن ${s} باید ساخته شود`);
  }
  for (let s = 0; s < num; s++) must(spawnLord(state, terrain, W, H, s).ok, `ارباب ${s}`);
  return { W, H, terrain, state };
}
let __srvCode = null;
function srvCode() {
  if (__srvCode == null) {
    const el = document.querySelector('script[type="text/x-server-plugin"]');
    must(!!el, "بلوک سرور در DOM هست");
    __srvCode = el.textContent;
  }
  return __srvCode;
}
function srvMake() {
  const st = new Uint8Array(17833432);
  const pubs = [];
  const pub = { publish(tp, m) { pubs.push([tp, String(m)]); }, numSubscribers() { return 0; } };
  const self = {};
  new Function("state", "pubsub", "self", srvCode())(st, pub, self);
  let nextId = 1;
  const mkConn = () => ({ id: nextId++, subs: new Set(),
    subscribe(x) { this.subs.add(x); }, unsubscribe(x) { this.subs.delete(x); } });
  const call = (c, name, obj) => JSON.parse(self.rpc[name]({ conn: c }, JSON.stringify(obj)));
  return { st, self, pubs, mkConn, call };
}
function srvRoom(s, max) {
  const a = s.mkConn(), b = s.mkConn();
  const r1 = s.call(a, "mpCreate", { name: "الف", max: max || 2 });
  must(r1.ok, "ساخت اتاق");
  const code = r1.data.code, tokB = s.call(b, "mpJoin", { code, name: "ب" });
  must(tokB.ok, "پیوستن");
  must(s.call(a, "mpReady", { code, ready: true }).ok, "آماده میزبان");
  must(s.call(b, "mpReady", { code, ready: true }).ok, "آماده میهمان");
  must(s.call(a, "mpStart", { code }).ok, "شروع");
  return { a, b, code, tokenA: r1.data.token, tokenB: tokB.data.token };
}
const srvInp = (s, c, code, kind, args, tick) => s.call(c, "mpInput", { code, kind, args, tick });
// مشترک‌ها (0.248.0 — C-CLN-40/41): putNear/snapOf از tests.js — بدون تغییر منطق.
function putNear(state, terrain, W, H, label, c, r, def, owner) {
  for (let rad = 0; rad < Math.max(W, H); rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || rr < 0 || cc + def.w > W || rr + def.h > H) continue;
        if (!validate(state, terrain, W, H, cc, rr, def, owner).ok) continue;
        const p = tryPlace(state, terrain, W, H, cc, rr, def, owner);
        must(p.ok, `ساخت ${label} نزدیک (${c}،${r}) باید موفق باشد، شد ${p.reason}`);
        return p;
      }
    }
  }
  must(false, `جای ${label} نزدیک (${c}،${r}) باید باشد`);
  return null;
}

// --- ECON-001 ---

function snapOf(s) {
  return JSON.stringify({
    tick: s.tick, res: s.resources, w: s.workers, pop: s.popularity,
    tax: s.tax, rat: s.rations, off: s.offFood || [],
    b: s.buildings.map((b) => [b.type, b.c, b.r, b.progress || 0]),
    p: s.producedTotal, c: s.consumedTotal, sh: s.shortageTotal,
  });
}

export { must, fresh, mpFresh, srvCode, srvMake, srvRoom, srvInp, sim, simC, simT, completeAll, rawTicks, grassNear, needBarracks, grassInBand, placeGateAt, putNear, snapOf };

function sim(state, n) {
  completeAll(state); // تست‌های پیشاساخت (#۳): رفتار پس‌از-تکمیل را می‌پینند
  for (let i = 0; i < n; i++) { state.tick++; stepEconomy(state); }
}

// حلقه کامل بازی (تیک + اقتصاد + نبرد) — آینه حلقه اصلی main.js.
function simC(state, terrain, n) {
  completeAll(state); // مثل sim: ساخت‌تدریجی فقط با حلقه خام آزموده می‌شود
  for (let i = 0; i < n; i++) { state.tick++; stepEconomy(state); stepCombat(state, terrain); }
}

// حلقه آموزش (0.166.0): تکمیل فوری + پیشبرد صف — آینه simC برای تست‌های تحویل.
function simT(state, terrain, n) {
  completeAll(state);
  for (let i = 0; i < n; i++) { state.tick++; stepTraining(state, terrain); }
}

// تکمیل فوری ساخت‌وساز (0.39.0): همه ساختمان‌ها تکمیل می‌شوند تا تست‌های
// قدیمی (که زمان‌بندی پساساخت را پین کرده‌اند) دست‌نخورده بمانند.
function completeAll(state) {
  for (const b of state.buildings) b.buildLeft = 0;
}

// حلقه خام بدون تکمیل خودکار — برای آزمودن خودِ ساخت‌تدریجی (0.39.0).
function rawTicks(state, n) {
  for (let i = 0; i < n; i++) { state.tick++; stepEconomy(state); }
}


// نزدیک‌ترین چمن آزاد به نقطه (مارپیچ قطعی) — پین‌های مستقل از اندازه نقشه.

function grassNear(terrain, occ, W, H, c, r) {
  for (let rad = 0; rad < Math.max(W, H); rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= W || rr >= H) continue;
        if (terrain[rr * W + cc] === T_GRASS && (!occ || occ[rr * W + cc] !== 1)) return [cc, rr];
      }
    }
  }
  return null;
}
function needBarracks(state, terrain, W, H, owner) {
  const ow = owner == null ? 0 : owner;
  const res = (state.mp && state.mp.enabled) ? state.mpres[ow].resources : state.resources;
  res.swords = Math.max(res.swords || 0, 30);
  res.bows = Math.max(res.bows || 0, 30);
  const def = CONFIG.BUILDINGS.barracks;
  const spots = [[1, H - 1 - def.h]];
  for (let r = 1; r + def.h <= H; r++) {
    for (let c = 1; c + def.w <= W; c++) spots.push([c, r]);
  }
  for (const [c, r] of spots) {
    let free = true;
    for (let j = 0; j < def.h && free; j++) {
      for (let i = 0; i < def.w && free; i++) {
        if (terrain[(r + j) * W + (c + i)] !== T_GRASS || state.occ[(r + j) * W + (c + i)] === 1) {
          free = false;
        }
      }
    }
    if (free) {
      const b = {
        id: state.nextId++, type: "barracks", c, r, w: def.w, h: def.h,
        hp: def.hp, maxHp: def.hp, cooldown: 0, targetId: null,
        owner: owner == null ? 0 : owner,
      };
      state.buildings.push(b);
      occupyFootprint(state, W, c, r, def.w, def.h);
      return b;
    }
  }
  throw new Error("جایی برای سربازخانه نیست");
}

// ctx قلابی صدا (0.48.0): مشترک تست‌های صدا و ردیف asset — بدون وابستگی، خالص.
export function stubCtx() {
  const calls = { tones: 0, noises: 0, buffers: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const ctx = {
    state: "running",
    currentTime: 100,
    sampleRate: 44100,
    destination: {},
    resumed: 0,
    resume() { this.resumed += 1; },
    createGain() { return { gain: param(), connect() {} }; },
    createOscillator() {
      calls.tones += 1;
      return { type: "", frequency: param(), connect() {}, start() {}, stop() {} };
    },
    createBuffer(ch, len) {
      calls.buffers += 1;
      return { getChannelData: () => new Float32Array(len) };
    },
    createBufferSource() { return { buffer: null, loop: false, connect() {}, start() {} }; },
    createBiquadFilter() { return { type: "", frequency: param(), connect() {} }; },
  };
  return { ctx, calls };
}

// نقشه خالی headless برای تست‌های مسیریابی (منتقل از tests.js — مشترک path و ردیف هزینه راه).
export function blankMap(w, h) {
  return {
    terrain: new Uint8Array(w * h).fill(T_GRASS),
    occ: new Uint8Array(w * h),
  };
}

// نزدیک‌ترین جای ردپای w×h چمنِ آزاد به نقطه (مارپیچ قطعی) — برای بنای تست (منتقل از tests.js).
export function siteNear(terrain, occ, W, H, c, r, w, h) {
  for (let rad = 0; rad < Math.max(W, H); rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || rr < 0 || cc + w > W || rr + h > H) continue;
        let ok = true;
        for (let j = 0; j < h && ok; j++) {
          for (let i = 0; i < w && ok; i++) {
            if (terrain[(rr + j) * W + (cc + i)] !== T_GRASS || (occ && occ[(rr + j) * W + (cc + i)] === 1)) ok = false;
          }
        }
        if (ok) return [cc, rr];
      }
    }
  }
  return null;
}

import { stepSim, createQueue } from "../sim.js";
import { startAI } from "../ai.js";

// هلپرهای مشترک AI (منتقل از tests.js — aiSim در چند سوئیت، aiFreshPers در چند سوئیت).
export function aiSim(state, terrain, n) {
  stepSim(state, terrain, n, createQueue()); // صف تازه: ورودی بازیکن نیست
}

export function aiFreshPers(pers) {
  const { W, H, terrain, state } = fresh();
  const r = startAI(state, terrain, W, H, "normal", pers);
  must(r.ok, `شروع AI (${pers}) باید موفق باشد، شد ${r.reason}`);
  return { W, H, terrain, state };
}

// هلپرهای مشترک (منتقل از tests.js — grassInBand در چند سوئیت، placeGateAt در چند سوئیت).
// خانه چمنی که فاصله‌اش از (x,r) در (lo,hi] باشد — پیمایش قطعی سطری (0.153.0).
function grassInBand(terrain, W, H, x, r, lo, hi) {
  for (let rr = 1; rr < H - 1; rr++) {
    for (let cc = 1; cc < W - 1; cc++) {
      if (terrain[rr * W + cc] !== T_GRASS) continue;
      const d = Math.hypot(cc + 0.5 - x, rr + 0.5 - r);
      if (d > lo && d <= hi) return [cc, rr];
    }
  }
  return null;
}
function placeGateAt(state, terrain, W, H, c, r, owner) {
  const site = siteNear(terrain, state.occ, W, H, c, r, 5, 2);
  must(!!site, "جای دروازه نزدیک (" + c + "," + r + ") باید باشد");
  must(tryPlace(state, terrain, W, H, site[0], site[1], CONFIG.BUILDINGS.hut, owner).ok, "کلبه لنگر ساخته شد");
  must(tryPlace(state, terrain, W, H, site[0] + 2, site[1], CONFIG.BUILDINGS.wall, owner).ok, "دیوار لنگر ساخته شد");
  const gp = tryPlace(state, terrain, W, H, site[0] + 3, site[1], CONFIG.BUILDINGS.gate, owner);
  must(gp.ok, "دروازه چسبیده ساخته شد, شد " + gp.reason);
  completeAll(state);
  return gp.building;
}
