// حالت رقابتی (0.24.0): FFA روی یک مپ مشترک، ۲ تا ۴ بازیکن.
// (0.25.0): نقشه ۴۸×۴۸ با لنگرهای نسبی به ابعاد — هر گوشه یک پایگاه ۹×۹.
// سرور فقط seq می‌زند و پخش می‌کند؛ همه منطق قطعی اینجاست.
// ورودی‌ها: {seq, slot, kind, args, tick} + execTick = tick + INPUT_DELAY.
import { CONFIG } from "./config.js";
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
  return { wood: 120, food: 120, gold: 60, stone: 40, wheat: 20, flour: 0, hops: 0, beer: 0, iron: 0, swords: 0, bows: 0 };
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
    tax: "low",
    rations: "normal",
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
  mix(state.nextId | 0);
  mix(state.nextUnitId | 0);
  mix(state.wave | 0);
  mix(state.placed | 0);
  mix(state.rejected | 0);
  mix(state.defeated ? 1 : 0);
  mix(state.victorious ? 1 : 0);
  const mixEcon = (ec) => {
    for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows"]) mix(ec.resources[k] | 0);
    mix(ec.workers); mix(ec.workerCap | 0); mix(ec.freeWorkers | 0);
    mix(ec.popularity); mix(ec.popTarget | 0); mix(ec.popDir | 0);
    mix(ec.eatAcc | 0);
    mix(ec.producedTotal | 0); mix(ec.consumedTotal | 0); mix(ec.shortageTotal | 0);
    mixStr(ec.tax); mixStr(ec.rations);
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
    if (b.type === "tower" && Array.isArray(b.garrison)) {
      mix(b.garrison.length);
      for (const gid of b.garrison) mix(gid | 0);
    } else {
      mix(0);
    }
    // صف آموزش (0.65.0): فقط صف غیرخالی mix می‌شود تا هش‌های پین رگرسیون
    // ۸تایی (بدون صف) دست‌نخورده بمانند؛ خالی/غیرخالی از همین تفکیک می‌شود.
    if (b.type === "barracks" && Array.isArray(b.train) && b.train.length) {
      mix(b.train.length);
      for (const e of b.train) {
        mixStr(e.type); mix(e.left | 0); mix(e.total | 0); mix(e.c); mix(e.r);
      }
    }
    mix(b.staffed === false ? 0 : 1); mix(b.starved ? 1 : 0);
    mix(b.type === "gate" ? (b.open === false ? 0 : 1) : 0);
    mix(b.type === "inn" ? (b.served ? 1 : 0) : 0);
    mixStr(b.type);
  }
  const us = state.units.slice().sort((a, b) => a.id - b.id);
  for (const u of us) {
    if (u.dead) continue;
    mix(u.id); mix(u.hp | 0); mix(mpOwnerOf(u));
    mix((u.x * 64) | 0); mix((u.r * 64) | 0);
    mix(u.cooldown | 0); mix(u.targetId | 0);
    mix(u.guardBld | 0);
    mix(u.deployed ? 1 : 0); // استقرار منجنیق (0.46.0) — ناسازگار با هش 0.45
    mixStr(u.type); mixStr(u.side); mixStr(u.stance);
    mixStr(u.targetKind); mixStr(u.mission);
    if (u.order) {
      mixStr(u.order.kind); mix(u.order.c); mix(u.order.r);
      mixStr(u.order.status); mix(u.order.retries | 0); mix(u.order.elapsed | 0);
    } else {
      mixStr("-");
    }
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

// زنده‌بودن هر بازیکن: keep سالم یا lord زنده. برنده = آخرین بازمانده.
export function updateMpAlive(state) {
  const mp = state.mp;
  if (!mp || !mp.enabled) return -1;
  let aliveCount = 0, lastAlive = -1;
  for (let i = 0; i < mp.num; i++) {
    const p = state.mpres[i];
    const keep = state.buildings.some((b) => b.type === "keep" && !b.destroyed && mpOwnerOf(b) === i);
    const lord = state.units.some((u) => u.type === "lord" && !u.dead && mpOwnerOf(u) === i);
    p.alive = !!(keep || lord);
    if (p.alive) { aliveCount++; lastAlive = i; }
  }
  if (!mp.over && mp.num >= 2 && aliveCount <= 1) {
    mp.over = true;
    mp.winner = aliveCount === 1 ? lastAlive : -1;
  }
  return mp.winner;
}
