// ری‌پلی (0.245.0 — C-CLN-32): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { makeTerrain } from "../terrain.js";
import { createQueue, enqueueCmd, queueLen, stepSim } from "../sim.js";
import { REF_REPLAY_V, REPLAY_CMD_CAP, REPLAY_KEY, REPLAY_V, createRecorder, recordCmd, runReplay, loadReplaySlot, saveReplaySlot, newSoloFromSeed, validateRefReplay, validateReplayLog, verifyRefReplay, fetchRefReplay } from "../replay.js";
import { must, siteNear } from "./fixtures.js";
import { stateHash } from "../mp.js";

// ری‌پلی مرجع shipped (0.78.0 — فاز ۰ بند ۸): بارگذاری هم‌زمان با import،
// همان الگوی لودرهای game/data.js؛ نبود/خرابی آرتیفکت = fail-fast در import.
const REF_SOLO_001 = await fetchRefReplay("ref-solo-001");

// --- ری‌پلی از لاگ فرمان (0.49.0 — #۲۱ از FEATURES): ضبط + بازپخش قطعی + اعتبارسنجی ---

// اجرای نمایشی کاملاً سرتاسری: همه تفاوت‌ها با بازی تازه از فرمان‌های ضبط‌شده
// می‌آیند (حتی سربازخانه و زنجیره آهن برای شمشیر استخدام) تا هش زنده و بازپخش
// قابل مقایسه باشند. یورش ۱۵۰۰ هم در بازه است (determinism نبرد واقعی).
function replayScriptedRun(seed) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const probe = makeTerrain(W, H, seed);
  const occ = new Array(W * H).fill(0);
  const at = {};
  for (const key of ["woodcutter", "farm", "barracks", "ironmine", "armoury"]) {
    const def = CONFIG.BUILDINGS[key];
    const s = siteNear(probe, occ, W, H, 10, 10, def.w, def.h);
    must(s, `جا برای ${key} باید باشد`);
    at[key] = s;
    for (let j = 0; j < def.h; j++) {
      for (let i = 0; i < def.w; i++) occ[(s[1] + j) * W + s[0] + i] = 1;
    }
  }
  const live = newSoloFromSeed(seed);
  const rec = createRecorder(seed);
  const q = createQueue();
  const fed = new Set(); // اندیس فرمان‌های صف‌شده
  const stepTo = (t) => {
    while (live.state.tick < t) {
      for (let k = 0; k < rec.cmds.length; k++) {
        const e = rec.cmds[k];
        if (!fed.has(k) && e.t <= live.state.tick) {
          enqueueCmd(q, e.cmd, live.state.tick);
          fed.add(k);
        }
      }
      stepSim(live.state, live.terrain, 1, q);
    }
  };
  for (const key of ["woodcutter", "farm", "barracks", "ironmine", "armoury"]) {
    recordCmd(rec, 0, { kind: "place", type: key, c: at[key][0], r: at[key][1] });
  }
  recordCmd(rec, 5, { kind: "tax", v: "none" });
  stepTo(400);
  recordCmd(rec, 400, { kind: "hire", type: "soldier", c: 5, r: 5 });
  recordCmd(rec, 400, { kind: "hire", type: "soldier", c: 6, r: 5 });
  stepTo(510); // سفارش‌ها در تیک ۴۰۱ صف می‌شوند؛ تحویل ترتیبی پس از ۵۰+۵۰ تیک آموزش (0.65.0)
  const soldiers = live.state.units.filter((u) => u.type === "soldier" && !u.dead);
  must(soldiers.length === 2, `باید ۲ سرباز استخدام شده باشد، شد ${soldiers.length}`);
  recordCmd(rec, 510, { kind: "order", orderKind: "move", ids: soldiers.map((u) => u.id), c: 9, r: 5 });
  stepTo(1600); // یورش ۱۵۰۰ + نبرد واقعی
  must(queueLen(q) === 0, "صف باید خالی باشد");
  return { hash: stateHash(live.state), rec };
}

function t_replay_roundtrip() {
  const { hash, rec } = replayScriptedRun(CONFIG.MAP_SEED);
  const log = { v: REPLAY_V, seed: rec.seed, cmds: rec.cmds, ticks: 1600 };
  const r = runReplay(log, 1600);
  must(r.tick === 1600, `بازپخش باید به تیک ۱۶۰۰ برسد، رسید ${r.tick}`);
  must(r.hash === hash, `هش بازپخش باید با اجرای زنده یکسان باشد`);
  return { name: "بازپخش یکسان", pass: true, detail: r.hash };
}

function t_replay_determinism() {
  const { rec } = replayScriptedRun(777);
  const log = { v: REPLAY_V, seed: rec.seed, cmds: rec.cmds, ticks: 1600 };
  const a = runReplay(log, 1600).hash;
  const b = runReplay(log, 1600).hash;
  must(a === b, "دو بازپخش باید یکسان باشند");
  const c = runReplay({ v: REPLAY_V, seed: 778, cmds: rec.cmds, ticks: 1600 }, 1600).hash;
  must(c !== a, "سید متفاوت باید هش متفاوت بدهد");
  return { name: "قطعیت بازپخش", pass: true, detail: a };
}

function t_replay_tamper() {
  const { rec } = replayScriptedRun(CONFIG.MAP_SEED);
  const base = runReplay({ v: REPLAY_V, seed: rec.seed, cmds: rec.cmds, ticks: 1600 }, 1600).hash;
  const tampered = rec.cmds.map((e) => ({ t: e.t, cmd: { ...e.cmd } }));
  tampered[0] = { t: 0, cmd: { kind: "place", type: "quarry", c: tampered[0].cmd.c, r: tampered[0].cmd.r } };
  const bad = runReplay({ v: REPLAY_V, seed: rec.seed, cmds: tampered, ticks: 1600 }, 1600).hash;
  must(bad !== base, "دست‌کاری فرمان باید هش را عوض کند (تأیید می‌گیرد)");
  return { name: "حساسیت تأیید", pass: true, detail: "هش متفاوت شد" };
}

function t_replay_validate() {
  const good = { v: REPLAY_V, seed: 123, cmds: [{ t: 0, cmd: { kind: "tax", v: "none" } }], ticks: 10 };
  must(validateReplayLog(good).ok, "لاگ سالم باید قبول شود");
  const rt = JSON.parse(JSON.stringify(good));
  must(validateReplayLog(rt).ok, "رفت‌وبرگشت JSON باید سالم بماند");
  const bads = [
    null, 42, "x",
    { v: 999, seed: 1, cmds: [] },
    { v: REPLAY_V, seed: -1, cmds: [] },
    { v: REPLAY_V, seed: 1, cmds: "no" },
    { v: REPLAY_V, seed: 1, cmds: [{ t: -1, cmd: { kind: "tax" } }] },
    { v: REPLAY_V, seed: 1, cmds: [{ t: 0, cmd: { kind: 42 } }] },
    { v: REPLAY_V, seed: 1, cmds: [{ t: 0 }] },
    { v: REPLAY_V, seed: 1, diff: "x", cmds: [] },
    { v: REPLAY_V, seed: 1, pers: "x", cmds: [] },
    { v: REPLAY_V, seed: 1, map: { name: "x", patches: [[0, 9]] }, cmds: [] },
  ];
  for (const b of bads) {
    must(!validateReplayLog(b).ok, `لاگ خراب باید رد شود: ${JSON.stringify(b)}`);
  }
  let threw = false;
  try { runReplay({ v: 999, seed: 1, cmds: [] }, 10); } catch (e) { threw = true; }
  must(threw, "بازپخش لاگ خراب باید throw بدهد");
  return { name: "اعتبارسنجی لاگ", pass: true, detail: `${bads.length} رد + JSON` };
}

function t_replay_empty() {
  const log = { v: REPLAY_V, seed: CONFIG.MAP_SEED, cmds: [], ticks: 100 };
  const a = runReplay(log, 100).hash;
  const b = runReplay(log, 100).hash;
  must(a === b, "لاگ خالی باید قطعی باشد");
  must(createRecorder(0).seed === CONFIG.MAP_SEED, "سید صفر = پیش‌فرض");
  const rec = createRecorder(55);
  for (let i = 0; i < REPLAY_CMD_CAP + 10; i++) recordCmd(rec, i, { kind: "tax", v: "none" });
  must(rec.cmds.length === REPLAY_CMD_CAP, `سقف ضبط باید ${REPLAY_CMD_CAP} باشد، شد ${rec.cmds.length}`);
  return { name: "لاگ خالی و سقف", pass: true, detail: `سقف ${REPLAY_CMD_CAP}` };
}

// --- ری‌پلی مرجع shipped (0.78.0 — فاز ۰ بند ۸، ۲۲.۱ DoD) ---
// آرتیفکت data/replays/ref-solo-001.json در import بارگذاری شده (REF_SOLO_001)؛
// این تست‌ها ثابت می‌کنند بازپخش همان هش پین‌شده را می‌دهد و دست‌کاری گرفته می‌شود.
function t_replay_ref_file() {
  must(REF_SOLO_001.v === REF_REPLAY_V, "نسخه آرتیفکت باید ۱ باشد");
  must(REF_SOLO_001.name === "ref-solo-001", "نام آرتیفکت");
  must(typeof REF_SOLO_001.gameVersion === "string" && REF_SOLO_001.gameVersion.length > 0, "نسخه بازی آرتیفکت");
  must(REF_SOLO_001.seed === CONFIG.MAP_SEED, "سید مرجع باید سید پیش‌فرض باشد");
  must(REF_SOLO_001.uptoTick === 1600, "طول مرجع باید ۱۶۰۰ تیک باشد");
  must(REF_SOLO_001.cmds.length === 9, `مرجع باید ۹ فرمان داشته باشد، دارد ${REF_SOLO_001.cmds.length}`);
  must(/^[0-9a-f]{8}$/.test(REF_SOLO_001.expectHash), "هش پین‌شده باید ۸ رقم hex باشد");
  must(validateRefReplay(REF_SOLO_001).ok, "آرتیفکت لودشده باید معتبر باشد");
  must(validateRefReplay(JSON.parse(JSON.stringify(REF_SOLO_001))).ok, "رفت‌وبرگشت JSON باید سالم بماند");
  return { name: "فایل ری‌پلی مرجع", pass: true, detail: `۹ فرمان تا تیک ۱۶۰۰ (${REF_SOLO_001.gameVersion})` };
}

// اعتبارسنج خالص سند مرجع: نسخه/نام/هش/فرمان خراب گرفته می‌شوند.
function t_replay_ref_reject() {
  const doc = () => JSON.parse(JSON.stringify(REF_SOLO_001));
  must(validateRefReplay(doc()).ok, "سند پاک باید بی‌خطا باشد");
  const badV = doc(); badV.v = 999;
  must(!validateRefReplay(badV).ok, "نسخه نامعتبر باید رد شود");
  const badName = doc(); badName.name = "../x";
  must(!validateRefReplay(badName).ok, "نام نامعتبر باید رد شود");
  const badHash = doc(); badHash.expectHash = "zzz";
  must(!validateRefReplay(badHash).ok, "هش بدشکل باید رد شود");
  const empty = doc(); empty.cmds = [];
  must(!validateRefReplay(empty).ok, "مرجع بی‌فرمان باید رد شود (دندان ندارد)");
  const badCmd = doc(); badCmd.cmds[0] = { t: -1, cmd: { kind: "tax" } };
  must(!validateRefReplay(badCmd).ok, "فرمان خراب باید رد شود");
  must(!validateRefReplay(null).ok && !validateRefReplay({}).ok, "ریشه خراب باید رد شود");
  return { name: "اعتبارسنج ری‌پلی مرجع", pass: true, detail: "نسخه/نام/هش/فرمان/ریشه" };
}

// بازپخش آرتیفکت باید دقیقاً هش پین‌شده را بدهد.
function t_replay_ref_hash() {
  const r = verifyRefReplay(REF_SOLO_001);
  must(r.tick === REF_SOLO_001.uptoTick, `باید به تیک ${REF_SOLO_001.uptoTick} برسد، رسید ${r.tick}`);
  must(r.ok, `هش بازپخش (${r.hash}) باید با پین‌شده (${r.expect}) یکسان باشد`);
  return { name: "هش ری‌پلی مرجع", pass: true, detail: r.hash };
}

// دو بازپخش مرجع باید یکسان باشند (قطعیت آرتیفکت).
function t_replay_ref_determinism() {
  const a = verifyRefReplay(REF_SOLO_001);
  const b = verifyRefReplay(REF_SOLO_001);
  must(a.ok && b.ok && a.hash === b.hash, "دو تأیید باید یک هش بدهند");
  return { name: "قطعیت ری‌پلی مرجع", pass: true, detail: a.hash };
}

// دست‌کاری آرتیفکت باید در تأیید بیفتد (هش عوض می‌شود).
function t_replay_ref_tamper() {
  const base = verifyRefReplay(REF_SOLO_001);
  must(base.ok, "پایه باید تأیید شود");
  const swapped = JSON.parse(JSON.stringify(REF_SOLO_001));
  swapped.cmds[0] = { t: 0, cmd: { kind: "place", type: "quarry", c: 9, r: 9 } };
  const bad = verifyRefReplay(swapped);
  must(!bad.ok && bad.hash !== base.hash, "جابه‌جایی فرمان باید تأیید را بیندازد");
  const wrongPin = JSON.parse(JSON.stringify(REF_SOLO_001));
  wrongPin.expectHash = "00000000";
  must(!verifyRefReplay(wrongPin).ok, "پین اشتباه باید تأیید را بیندازد");
  return { name: "حساسیت ری‌پلی مرجع", pass: true, detail: "هش متفاوت شد" };
}

// --- اسلات ری‌پلی (0.80.0 — فاز ۰ بند ۱۰، ۲۲.۱ DoD ذخیره/بارگذاری) ---
// رفت‌وبرگشت اسلات واقعی با نگه‌دار/برگردان (سوئیت در صفحه زنده اجرا می‌شود).
function t_replay_slot() {
  let prev = null, had = false;
  try { prev = localStorage.getItem(REPLAY_KEY); had = prev !== null; } catch (e) { prev = null; }
  try {
    const rec = createRecorder(CONFIG.MAP_SEED);
    recordCmd(rec, 0, { kind: "tax", v: "none" });
    const log = { v: REPLAY_V, seed: rec.seed, cmds: rec.cmds, ticks: 60 };
    must(saveReplaySlot(log) === true, "ذخیره اسلات باید true بدهد");
    const back = loadReplaySlot();
    must(back && validateReplayLog(back).ok, "بارخوانده باید معتبر باشد");
    must(runReplay(back, 60).hash === runReplay(log, 60).hash, "هش بارخوانده = هش مستقیم");
    localStorage.setItem(REPLAY_KEY, "{خراب");
    must(loadReplaySlot() === null, "JSON خراب = null");
    localStorage.setItem(REPLAY_KEY, JSON.stringify({ v: 999, seed: 1, cmds: [], ticks: 1 }));
    must(loadReplaySlot() === null, "نسخه نامعتبر = null");
    localStorage.removeItem(REPLAY_KEY);
    must(loadReplaySlot() === null, "کلید غایب = null");
    return { name: "اسلات ری‌پلی", pass: true, detail: "رفت‌وبرگشت + ۳ رد" };
  } finally {
    try { if (had) localStorage.setItem(REPLAY_KEY, prev); else localStorage.removeItem(REPLAY_KEY); } catch (e) { /* نادیده */ }
  }
}
export function replayCases() {
  return [t_replay_roundtrip, t_replay_determinism, t_replay_tamper, t_replay_validate, t_replay_empty, t_replay_slot,
    t_replay_ref_file, t_replay_ref_reject, t_replay_ref_hash, t_replay_ref_determinism, t_replay_ref_tamper];
}
