// بنچمارک و بودجه (0.58.0 — #۲۷ از FEATURES).
// اندازه‌گیری headless توان sim (تیک/ثانیه) + داور خالص بودجه. اعداد بودجه
// عمداً گشادند (دستگاه‌های ضعیف نباید در ?test قرمز شوند)؛ گیت واقعی روی
// روند تغییرات است: اگر بنچ از سقف بگذرد، یعنی رگرسیون perf رخ داده است.

import { CONFIG } from "./config.js";
import { makeTerrain } from "./terrain.js";
import { createState } from "./state.js";
import { tryPlace } from "./construction.js";
import { hireUnit } from "./combat.js";
import { createQueue, enqueueCmd, stepSim } from "./sim.js";
import { stateHash } from "./mp.js";

// بودجه: میانگین هر تیک sim (ms) + کف توان (تیک/ثانیه). روی ماشین توسعه ~۰٫۱ms
// است؛ سقف ۳ms یعنی ۳۰× headroom برای گوشی ضعیف.
export const BENCH_BUDGET = { tickMs: 3, ticksPerSec: 300 };

// داور خالص بودجه (تست با اعداد قلابی). خالص.
export function withinBudget(sample, budget) {
  const b = budget || BENCH_BUDGET;
  if (!sample || !(sample.ticks > 0) || !(sample.ms >= 0)) return false;
  const tickMs = sample.ms / sample.ticks;
  return tickMs <= b.tickMs && sample.ticks / Math.max(sample.ms / 1000, 1e-9) >= b.ticksPerSec;
}

// یک سناریوی بنچ: شهرک کوچک + نبرد، با صف فرمان واقعی.
function buildBenchWorld(seed) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, seed);
  const state = createState();
  state.mapSeed = seed >>> 0;
  const q = createQueue();
  const at = (c) => enqueueCmd(q, c, state.tick);
  at({ kind: "place", type: "woodcutter", c: 1, r: 1 });
  at({ kind: "place", type: "farm", c: 5, r: 1 });
  at({ kind: "place", type: "quarry", c: 9, r: 1 });
  at({ kind: "place", type: "tower", c: 14, r: 1 });
  return { W, H, terrain, state, q };
}

// اجرای ticks تیک و اندازه‌گیری. برمی‌گرداند {ticks, ms, tickMs, hash}.
export function benchSim(seed, ticks) {
  const { terrain, state, q } = buildBenchWorld(seed);
  const t0 = performance.now();
  stepSim(state, terrain, ticks, q);
  const ms = performance.now() - t0;
  return { ticks, ms, tickMs: ms / ticks, hash: stateHash(state) };
}

// بنچ کامل: دو سید جدا (گرم‌شدن JIT + نمونه واقعی). {samples, ok}
export function runBench() {
  benchSim(CONFIG.MAP_SEED, 200); // گرم‌شدن
  const samples = [benchSim(CONFIG.MAP_SEED, 600), benchSim(987654, 600)];
  const ok = samples.every((s) => withinBudget(s));
  return { samples, budget: BENCH_BUDGET, ok };
}
