// ری‌پلی از لاگ فرمان (0.49.0 — #۲۱ از FEATURES).
// init-block + verify + Save/Watch + حالت watch-only. فقط سولو (MP ورودی
// شبکه‌ای دارد و مشمول نیست).
//
// قرارداد قطعیت: سولو با سید+فرمان‌ها قطعی است (sim هیچ Math.random نمی‌بیند،
// موج‌ها و AI سیدمحورند — تست t_wave_deterministic و t_ai_deterministic).
// پس «ضبط» یعنی سید + [{t, cmd}] و «بازپخش» یعنی بازسازی همان بازی.
// recorder گذراست (با newGame ساخته، با load دور انداخته می‌شود)؛ ذخیره‌شده
// فقط یک اسلات localStorage است. sim هیچ‌چیز از ری‌پلی نمی‌داند.
import { CONFIG } from "./config.js";
import { makeTerrain } from "./terrain.js";
import { createState } from "./state.js";
import { placeKeep } from "./construction.js";
import { spawnLord } from "./combat.js";
import { startAI } from "./ai.js";
import { createQueue, enqueueCmd, stepSim } from "./sim.js";
import { stateHash } from "./mp.js";
import { customTerrain, validateMapDoc } from "./mapedit.js";

export const REPLAY_V = 1;
export const REPLAY_KEY = "scw.replay";
export const REPLAY_CMD_CAP = 4096; // سقف فرمان ضبط‌شده (ضد نفخ حافظه)
const REPLAY_TICK_CAP = 60000; // سقف تیک بازپخش (۱۰۰ دقیقه با ۱۰tps؟ نه: ۲۰tps → ۵۰ دقیقه)

export function createRecorder(seed, diff, map, personality) {
  const rec = { v: REPLAY_V, seed: (seed >>> 0) || CONFIG.MAP_SEED, cmds: [] };
  if (diff) rec.diff = diff;
  if (personality) rec.pers = personality;
  if (map) rec.map = { name: map.name, patches: map.patches.map((e) => [e[0], e[1]]) };
  return rec;
}

export function recordCmd(rec, tick, cmd) {
  if (!rec || rec.cmds.length >= REPLAY_CMD_CAP) return;
  rec.cmds.push({ t: tick | 0, cmd: JSON.parse(JSON.stringify(cmd)) });
}

// اعتبارسنجی لاگ (ورودی کاربر/localStorage ممکن است دست‌کاری شده باشد).
export function validateReplayLog(o) {
  if (!o || typeof o !== "object") return { ok: false, reason: "NOT_OBJECT" };
  if (o.v !== REPLAY_V) return { ok: false, reason: "BAD_VERSION" };
  if (!Number.isInteger(o.seed) || o.seed < 0 || o.seed > 4294967295) {
    return { ok: false, reason: "BAD_SEED" };
  }
  if (!Array.isArray(o.cmds) || o.cmds.length > REPLAY_CMD_CAP) {
    return { ok: false, reason: "BAD_CMDS" };
  }
  // درجه سختی (0.50.0، اختیاری → normal؛ لاگ قدیمی ندارد).
  if (o.diff !== undefined && (typeof o.diff !== "string" || !CONFIG.AI.difficulties[o.diff])) {
    return { ok: false, reason: "BAD_DIFF" };
  }
  // شخصیت حریف (0.56.0، اختیاری → گرگ؛ لاگ قدیمی ندارد).
  if (o.pers !== undefined && (typeof o.pers !== "string" || !CONFIG.AI.personalities[o.pers])) {
    return { ok: false, reason: "BAD_PERS" };
  }
  // نقشه سفارشی (0.51.0، اختیاری → زمین خالص سیدی؛ لاگ قدیمی ندارد).
  if (o.map !== undefined) {
    const v = validateMapDoc({ v: 1, name: o.map.name, seed: o.seed, patches: o.map.patches });
    if (!v.ok) return { ok: false, reason: "BAD_MAP" };
  }
  for (const e of o.cmds) {
    if (!e || typeof e !== "object" || !Number.isInteger(e.t) || e.t < 0 || e.t > REPLAY_TICK_CAP) {
      return { ok: false, reason: "BAD_CMD" };
    }
    if (!e.cmd || typeof e.cmd !== "object" || typeof e.cmd.kind !== "string") {
      return { ok: false, reason: "BAD_CMD" };
    }
  }
  return { ok: true, reason: "OK" };
}

// ساخت بازی سولوی تازه از سید — آینه newGame در main.js (placeKeep +
// spawnLord + startAI؛ بدون assignStaff چون newGame هم نمی‌زند).
// mapPatches وصله‌های نقشه سفارشی است (0.51.0؛ غایب = زمین خالص سیدی).
// personality کلید پروفایل است (0.56.0؛ غایب = گرگ خنثی).
export function newSoloFromSeed(seed, diff, mapPatches, mapName, personality) {
  const s = (seed >>> 0) || CONFIG.MAP_SEED;
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = customTerrain(s, mapPatches);
  const state = createState();
  state.mapSeed = s;
  if (mapPatches && mapPatches.length) {
    state.mapName = String(mapName || "");
    state.mapPatches = mapPatches.map((e) => [e[0], e[1]]);
  }
  placeKeep(state, terrain, W, H);
  spawnLord(state, terrain, W, H);
  startAI(state, terrain, W, H, diff, personality);
  return { state, terrain };
}

// بازپخش هم‌گام تا uptoTick: در هر تیک اول فرمان‌های سررسیده صف، بعد یک گام.
// دقیقاً آینه حلقه زنده است (enqueue با nowTick=state.tick → targetTick+1).
export function runReplay(log, uptoTick) {
  const v = validateReplayLog(log);
  if (!v.ok) throw new Error("replay:" + v.reason);
  const upto = Math.max(0, Math.min(uptoTick | 0, REPLAY_TICK_CAP));
  const { state, terrain } = newSoloFromSeed(log.seed, log.diff,
    log.map ? log.map.patches : null, log.map ? log.map.name : "", log.pers);
  const q = createQueue();
  const cmds = log.cmds.slice().sort((a, b) => a.t - b.t); // sort پایدار: ترتیب هم‌تیک حفظ می‌شود
  let i = 0;
  while (state.tick < upto) {
    while (i < cmds.length && cmds[i].t <= state.tick) {
      enqueueCmd(q, cmds[i].cmd, state.tick);
      i++;
    }
    stepSim(state, terrain, 1, q);
  }
  return { state, terrain, tick: state.tick, hash: stateHash(state) };
}

// تأیید ناهم‌گام تکه‌تکه (تا UI قفل نکند) با گزارش پیشرفت.
export function verifyReplayAsync(log, uptoTick, expectHash, onProgress) {
  return new Promise((resolve) => {
    let st;
    try {
      const v = validateReplayLog(log);
      if (!v.ok) { resolve({ ok: false, reason: v.reason }); return; }
      st = newSoloFromSeed(log.seed, log.diff,
        log.map ? log.map.patches : null, log.map ? log.map.name : "", log.pers);
    } catch (e) {
      resolve({ ok: false, reason: String((e && e.message) || e) });
      return;
    }
    const { state, terrain } = st;
    const upto = Math.max(0, Math.min(uptoTick | 0, REPLAY_TICK_CAP));
    const q = createQueue();
    const cmds = log.cmds.slice().sort((a, b) => a.t - b.t);
    let i = 0;
    function chunk() {
      try {
        const end = Math.min(upto, state.tick + 400);
        while (state.tick < end) {
          while (i < cmds.length && cmds[i].t <= state.tick) {
            enqueueCmd(q, cmds[i].cmd, state.tick);
            i++;
          }
          stepSim(state, terrain, 1, q);
        }
      } catch (e) {
        resolve({ ok: false, reason: String((e && e.message) || e) });
        return;
      }
      if (onProgress) {
        try { onProgress(state.tick, upto); } catch (e) { /* مهم نیست */ }
      }
      if (state.tick < upto) { setTimeout(chunk, 0); return; }
      let hash = "";
      try { hash = stateHash(state); } catch (e) { resolve({ ok: false, reason: "HASH" }); return; }
      resolve({ ok: hash === expectHash, hash });
    }
    chunk();
  });
}

export function saveReplaySlot(log) {
  try {
    localStorage.setItem(REPLAY_KEY, JSON.stringify(log));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadReplaySlot() {
  try {
    const raw = localStorage.getItem(REPLAY_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    const v = validateReplayLog(o);
    return v.ok ? o : null;
  } catch (e) {
    return null;
  }
}
