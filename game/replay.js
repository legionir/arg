// ری‌پلی از لاگ فرمان (0.49.0 — #۲۱ از FEATURES).
// init-block + verify + Save/Watch + حالت watch-only. فقط سولو (MP ورودی
// شبکه‌ای دارد و مشمول نیست).
//
// قرارداد قطعیت: سولو با سید+فرمان‌ها قطعی است (sim هیچ Math.random نمی‌بیند،
// موج‌ها و AI سیدمحورند — تست t_wave_deterministic و t_ai_deterministic).
// پس «ضبط» یعنی سید + [{t, cmd}] و «بازپخش» یعنی بازسازی همان بازی.
// recorder گذراست (با newGame ساخته، با load دور انداخته می‌شود)؛ ذخیره‌شده
// فقط یک اسلات localStorage است. sim هیچ‌چیز از ری‌پلی نمی‌داند.
import { CONFIG, canonPersonality } from "./config.js";
import { makeTerrain } from "./terrain.js";
import { createState } from "./state.js";
import { t } from "./i18n.js";
import { placeKeep } from "./construction.js";
import { spawnLord, spawnStartingForce, validIdentity, pushEvent } from "./combat.js";
import { startAI } from "./ai.js";
import { createQueue, enqueueCmd, stepSim } from "./sim.js";
import { stateHash } from "./mp.js";
import { customTerrain, validateMapDoc } from "./mapedit.js";

export const REPLAY_V = 1;
export const REPLAY_KEY = "scw.replay";
export const REPLAY_CMD_CAP = 4096; // سقف فرمان ضبط‌شده (ضد نفخ حافظه)
const REPLAY_TICK_CAP = 60000; // سقف تیک بازپخش (۱۰۰ دقیقه با ۱۰tps؟ نه: ۲۰tps → ۵۰ دقیقه)

export function createRecorder(seed, diff, map, personality, identity) {
  const rec = { v: REPLAY_V, seed: (seed >>> 0) || CONFIG.MAP_SEED, cmds: [] };
  if (diff) rec.diff = diff;
  if (personality) rec.pers = personality;
  // هویت آغازین (0.153.0 — بند 104): فقط نا-none ضبط می‌شود (لاگ قدیمی = بی‌نیرو).
  { const idv = validIdentity(identity); if (idv && idv !== "none") rec.ident = idv; }
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
  if (o.pers !== undefined) o.pers = canonPersonality(o.pers);
  if (o.pers !== undefined && (typeof o.pers !== "string" || !CONFIG.AI.personalities[o.pers])) {
    return { ok: false, reason: "BAD_PERS" };
  }
  // هویت آغازین (0.153.0، اختیاری → none؛ لاگ قدیمی ندارد).
  if (o.ident !== undefined && !validIdentity(o.ident)) {
    return { ok: false, reason: "BAD_IDENT" };
  }
  // مأموریت کمپین (0.226.0 — فاز ۲، C-CMP-6): کلید اختیاری مأموریت؛ فقط شکل
  // (عضویت در کاتالوگ با main.js است)؛ لاگ قدیمی ندارد.
  if (o.mission !== undefined && (typeof o.mission !== "string" || !o.mission.length || o.mission.length > 32)) {
    return { ok: false, reason: "BAD_MISSION" };
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
export function newSoloFromSeed(seed, diff, mapPatches, mapName, personality, identity) {
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
  state.ident = validIdentity(identity) || "none"; // هویت بازی (هاور ستاد + ری‌استارت تماشا)
  spawnStartingForce(state, terrain, W, H, validIdentity(identity) || "none", 0); // ارتش اولیه هویت (0.153.0 — بند 104)
  startAI(state, terrain, W, H, diff, personality);
  pushEvent(state, t("game.ev.caravan")); // کاروان کالاهای اولیه (فاز ۱ بند ۱۳؛ نمایشی، خارج هش/ذخیره)
  return { state, terrain };
}

// بازپخش هم‌گام تا uptoTick: در هر تیک اول فرمان‌های سررسیده صف، بعد یک گام.
// دقیقاً آینه حلقه زنده است (enqueue با nowTick=state.tick → targetTick+1).
export function runReplay(log, uptoTick) {
  const v = validateReplayLog(log);
  if (!v.ok) throw new Error("replay:" + v.reason);
  const upto = Math.max(0, Math.min(uptoTick | 0, REPLAY_TICK_CAP));
  const { state, terrain } = newSoloFromSeed(log.seed, log.diff,
    log.map ? log.map.patches : null, log.map ? log.map.name : "", log.pers, log.ident);
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
        log.map ? log.map.patches : null, log.map ? log.map.name : "", log.pers, log.ident);
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

// --- ری‌پلی مرجع نسخه‌دار (0.78.0 — فاز ۰ بند ۸، ۲۲.۱ DoD) ---
// آرتیفکت‌های `data/replays/*.json` (سید + فرمان‌های ثابت + هش پایانی پین‌شده):
// سند زنده بازی نیستند (فقط خوانده می‌شوند) و با هر تغییر عمدی sim که هش را
// عوض کند عمداً بازپین می‌شوند (رویه در note هر آرتیفکت + CHANGELOG).
export const REF_REPLAY_V = 1;
export const REF_REPLAY_DIR = "ref-solo-001"; // پیش‌فرض (نام فایل بدون پسوند)

// اعتبارسنجی خالص سند مرجع (بدون fetch — تست‌پذیر).
export function validateRefReplay(doc) {
  if (!doc || typeof doc !== "object") return { ok: false, reason: "NOT_OBJECT" };
  if (doc.v !== REF_REPLAY_V) return { ok: false, reason: "BAD_VERSION" };
  if (typeof doc.name !== "string" || !/^[a-z0-9-]{1,64}$/.test(doc.name)) {
    return { ok: false, reason: "BAD_NAME" };
  }
  if (typeof doc.gameVersion !== "string" || doc.gameVersion.length === 0) {
    return { ok: false, reason: "BAD_GAME_VERSION" };
  }
  if (!Number.isInteger(doc.uptoTick) || doc.uptoTick <= 0 || doc.uptoTick > REPLAY_TICK_CAP) {
    return { ok: false, reason: "BAD_TICK" };
  }
  if (typeof doc.expectHash !== "string" || !/^[0-9a-f]{8}$/.test(doc.expectHash)) {
    return { ok: false, reason: "BAD_HASH" };
  }
  if (!Array.isArray(doc.cmds) || doc.cmds.length === 0 || doc.cmds.length > REPLAY_CMD_CAP) {
    return { ok: false, reason: "BAD_CMDS" };
  }
  // فرمان‌ها با همان قوانین لاگ زنده بررسی می‌شوند (سید/درجه/شخصیت/نقشه اختیاری).
  const v = validateReplayLog({
    v: REPLAY_V, seed: doc.seed, cmds: doc.cmds, diff: doc.diff, pers: doc.pers, map: doc.map, ident: doc.ident, mission: doc.mission,
  });
  if (!v.ok) return v;
  return { ok: true, reason: "OK" };
}

// تأیید یک سند مرجع: بازپخش کامل + مقایسه هش (خالصِ هم‌گام — برای ۱۶۰۰ تیک سریع است).
export function verifyRefReplay(doc) {
  const v = validateRefReplay(doc);
  if (!v.ok) throw new Error("refreplay:" + v.reason);
  const r = runReplay({
    v: REPLAY_V, seed: doc.seed, cmds: doc.cmds, diff: doc.diff, pers: doc.pers, map: doc.map,
  }, doc.uptoTick);
  return { ok: r.hash === doc.expectHash, hash: r.hash, expect: doc.expectHash, tick: r.tick };
}

// بارگذاری آرتیفکت shipped با fail-fast (همان مکانیزم سرو ماژول‌ها).
export async function fetchRefReplay(name) {
  if (typeof name !== "string" || !/^[a-z0-9-]{1,64}$/.test(name)) {
    throw new Error("refreplay:BAD_NAME");
  }
  const url = new URL("../data/replays/" + name + ".json", import.meta.url);
  let doc;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    doc = await res.json();
  } catch (e) {
    throw new Error("replay مرجع بارگذاری نشد (" + url + "): " + String((e && e.message) || e));
  }
  const v = validateRefReplay(doc);
  if (!v.ok) throw new Error("replay مرجع نامعتبر: " + v.reason);
  return doc;
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
