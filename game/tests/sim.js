// هسته قطعی sim (0.245.0 — C-CLN-31): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { T_GRASS, makeTerrain } from "../terrain.js";
import { createState } from "../state.js";
import { createClock } from "../clock.js";
import { interpPos } from "../render.js";
import { UNITS, spawnUnit, hireUnit, orderMove, stepCombat, spawnLord, spawnWave, simTickHz, qpos } from "../combat.js";
import { stepEconomy } from "../economy.js";
import { placeKeep, tryPlace } from "../construction.js";
import { startAI, stepAI } from "../ai.js";
import { queueHire, stepTraining } from "../train.js";
import { createQueue, enqueueCmd, queueLen, stepSim } from "../sim.js";
import { mulberry32, seedSimRng, rngNext, rngInt, rngPick, statelessRand } from "../rng.js";
import { serializeJSON, deserializeJSON, deserialize } from "../persist.js";
import { stateHash } from "../mp.js";
import { must, fresh, sim, needBarracks, grassNear } from "./fixtures.js";

// --- هسته قطعی sim (0.37.0 — FEATURES #۱) ---

// یک سناریوی نمایشی از صف فرمان: ساخت، استخدام، مالیات، دستور حرکت + نبرد.
function simScriptedRun(seed) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, seed);
  const state = createState();
  state.mapSeed = seed >>> 0;
  placeKeep(state, terrain, W, H); // ستاد پیش‌شرط فرمان (فاز ۱ بند ۱۲)
  const q = createQueue();
  const at = (c) => enqueueCmd(q, c, state.tick);
  must(at({ kind: "place", type: "woodcutter", c: 1, r: 1 }).ok, "صف: ساخت چوب‌بری");
  must(at({ kind: "place", type: "farm", c: 4, r: 1 }).ok, "صف: ساخت مزرعه");
  must(at({ kind: "tax", v: "none" }).ok, "صف: مالیات");
  needBarracks(state, terrain, W, H);
  const h1 = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const h2 = hireUnit(state, terrain, W, H, 6, 5, "soldier");
  must(h1.ok && h2.ok, "استخدام مستقیم پیش‌نیاز باید موفق باشد");
  const ids = state.units.map((u) => u.id);
  must(at({ kind: "order", orderKind: "move", ids, c: 9, r: 5 }).ok, "صف: دستور حرکت");
  spawnUnit(state, "swordsman", 12.5, 5.5); // دشمن قطعی — هر دو اجرا یکسان
  stepSim(state, terrain, 300, q);
  must(queueLen(q) === 0, "صف باید پس از ۳۰۰ تیک خالی باشد");
  return stateHash(state);
}

// سید + فرمان یکسان ⇒ هش یکسان؛ سید متفاوت ⇒ هش متفاوت.
function t_sim_queue_hash() {
  const h1 = simScriptedRun(CONFIG.MAP_SEED);
  const h2 = simScriptedRun(CONFIG.MAP_SEED);
  must(h1 === h2, `هش دو اجرای یکسان باید برابر باشد ${h1}≠${h2}`);
  const h3 = simScriptedRun(999);
  must(h3 !== h1, "سید متفاوت باید هش متفاوت بدهد");
  return { name: "هش قطعی صف فرمان", pass: true, detail: h1 };
}

// فرمان نامعتبر = rejected، نه throw؛ خرج دوباره (double-spend) ممکن نیست.
function t_sim_queue_reject() {
  const { W, H, terrain, state } = fresh();
  const q = createQueue();
  must(placeKeep(state, terrain, W, H).ok, "ستاد پیش‌شرط فرمان است (بند ۱۲)");
  const p0 = state.placed, r0 = state.rejected;
  must(enqueueCmd(q, { kind: "place", type: "hut", c: -1, r: -1 }, state.tick).ok, "صف نامعتبر هم پذیرفته می‌شود");
  state.resources.wood = 20; // فقط یکی از دو چوب‌بری (۱۵ چوبی) جا می‌شود
  must(enqueueCmd(q, { kind: "place", type: "woodcutter", c: 1, r: 1 }, state.tick).ok, "صف اول");
  must(enqueueCmd(q, { kind: "place", type: "woodcutter", c: 4, r: 1 }, state.tick).ok, "صف دوم");
  must(enqueueCmd(q, { kind: "nonsense" }, state.tick).ok, "نوع ناشناس هم در صف می‌ماند");
  stepSim(state, terrain, 3, q);
  must(state.placed === p0 + 1, `فقط یکی باید ساخته شود، placed=${state.placed}`);
  must(state.rejected >= r0 + 2, `دست‌کم ۲ رد (مرز + کمبود) باید ثبت شود، rejected=${state.rejected}`);
  must(state.resources.wood === 5, `چوب باید ۵ بماند، هست ${state.resources.wood}`);
  return { name: "رد امن صف فرمان", pass: true, detail: `placed+1، rejected+${state.rejected - r0}` };
}

// آینه‌بودن stepSim با حلقه دستی قدیمی (تضمین بازنویسی main.js/ff).
function t_sim_mirror() {
  const runManual = () => {
    const { W, H, terrain, state } = fresh();
    tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
    needBarracks(state, terrain, W, H);
    hireUnit(state, terrain, W, H, 5, 5, "soldier");
    spawnUnit(state, "swordsman", 12.5, 5.5);
    for (let i = 0; i < 200; i++) { state.tick++; stepEconomy(state); stepCombat(state, terrain); }
    return stateHash(state);
  };
  const runStep = () => {
    const { W, H, terrain, state } = fresh();
    tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
    needBarracks(state, terrain, W, H);
    hireUnit(state, terrain, W, H, 5, 5, "soldier");
    spawnUnit(state, "swordsman", 12.5, 5.5);
    stepSim(state, terrain, 200);
    return stateHash(state);
  };
  const a = runManual(), b = runStep();
  must(a === b, `stepSim باید آینه حلقه دستی باشد ${a}≠${b}`);
  return { name: "آینه stepSim", pass: true, detail: a };
}

// --- فاز ۰ بند ۱: گام ثابت جدا از رندر + درون‌یابی نمایشی ---

// ساعت گام‌ثابت: انباشت، alpha، توقف، سقف جبران.
function t_clock_alpha() {
  let ticks = 0;
  const c = createClock({ hz: 10, maxPerFrame: 5, onTick: (n) => { ticks += n; } });
  must(c.alpha() === 0, "alpha پس از ساخت صفر است");
  must(c.hz() === 10, "hz باید همان ورودی باشد");
  c.frame(0); // اولین فریم فقط last می‌نشیند
  must(ticks === 0, "فریم اول نباید تیک بزند");
  c.frame(50); // ۰٫۰۵ثانیه < گام ۰٫۱ → بدون تیک
  must(ticks === 0, "نیم‌گام نباید تیک بزند");
  const a = c.alpha();
  must(a > 0.4 && a < 0.6, `alpha باید ~۰٫۵ باشد، هست ${a}`);
  c.frame(100); // مجموع ۰٫۱ → دقیقاً یک تیک
  must(ticks === 1, "یک گام کامل باید یک تیک بزند");
  must(c.alpha() === 0, "پس از تیک alpha باید صفر شود");
  // توقف: زمان می‌گذرد ولی تیک نه، alpha منجمد می‌ماند
  let paused = true;
  const c2 = createClock({ hz: 10, maxPerFrame: 5, onTick: (n) => { ticks += n; } });
  c2.attach(() => ({ paused, speed: 1 }));
  c2.frame(0);
  c2.frame(500);
  must(ticks === 1, "حین pause نباید تیک بزند");
  must(c2.alpha() === 0, "حین pause با acc صفر alpha صفر است");
  paused = false;
  c2.frame(600); // ۰٫۱ثانیه → یک تیک
  must(ticks === 2, "پس از رفع pause باید تیک بزند");
  // سقف جبران: پرش ۱۰ثانیه‌ای فقط maxPerFrame تیک می‌دهد (نه ۱۰۰ تیک)
  let t3 = 0;
  const c3 = createClock({ hz: 10, maxPerFrame: 5, onTick: (n) => { t3 += n; } });
  c3.frame(0);
  c3.frame(10000);
  must(t3 === 2, `پرش بزرگ باید clamp شود (۰٫۲۵ثانیه → ۲ تیک)، شد ${t3}`);
  c3.reset();
  must(c3.alpha() === 0, "پس از reset alpha صفر است");
  return { name: "ساعت گام‌ثابت و alpha", pass: true, detail: "۱۰Hz، نیم‌گام ۰٫۵، pause، clamp" };
}

// نرخ منطق باید از CONFIG بیاید (بدون hard-code) و حرکت هر تیک = speed/HZ باشد.
function t_hz_from_config() {
  must(Number.isInteger(CONFIG.TICK_HZ) && CONFIG.TICK_HZ > 0, "TICK_HZ باید صحیح مثبت باشد");
  must(simTickHz() === CONFIG.TICK_HZ, "نرخ منطق باید همان CONFIG.TICK_HZ باشد");
  const { W, H, terrain, state } = fresh();
  let run = null;
  for (let r = 8; r < H - 8 && !run; r++) {
    for (let c = 4; c < W - 12 && !run; c++) {
      let ok = true;
      for (let k = 0; k < 8; k++) {
        if (terrain[r * W + c + k] !== T_GRASS) { ok = false; break; }
      }
      if (ok) run = [c, r];
    }
  }
  must(run, "باند چمن ۸خانه‌ای باید در نقشه باشد");
  const def = UNITS.soldier;
  const u = spawnUnit(state, "soldier", run[0] + 0.5, run[1] + 0.5);
  const step = def.speed / CONFIG.TICK_HZ;
  orderMove(state, u, run[0] + 7, run[1]);
  const x0 = u.x, r0 = u.r;
  state.tick++;
  stepCombat(state, terrain);
  const d = Math.hypot(u.x - x0, u.r - r0);
  // (فاز ۰ بند ۲ — Q6: حرکت هر تیک speed/HZ است با خطای حداکثر نیم‌کوانتوم
  // نقطه‌ثابت ۱/۶۴؛ خودِ مختصات دقیقاً روی شبکه است.)
  must(Math.abs(d - step) <= 1 / 64 + 1e-9, `حرکت یک تیک باید speed/HZ=${step} تا نیم‌کوانتوم Q6 باشد، هست ${d}`);
  must(u.x * 64 === Math.round(u.x * 64), "مختصات پس از حرکت باید Q6 باشد");
  return { name: "نرخ تیک از CONFIG", pass: true, detail: `HZ=${CONFIG.TICK_HZ}، گام=${step}، Q6` };
}

// sim باید موقعیت قبلی رندر (px/pr) را هر تیک تازه کند.
function t_interp_prev() {
  const { W, H, terrain, state } = fresh();
  let run = null;
  for (let r = 8; r < H - 8 && !run; r++) {
    for (let c = 4; c < W - 12 && !run; c++) {
      let ok = true;
      for (let k = 0; k < 8; k++) {
        if (terrain[r * W + c + k] !== T_GRASS) { ok = false; break; }
      }
      if (ok) run = [c, r];
    }
  }
  must(run, "باند چمن باید باشد");
  const u = spawnUnit(state, "soldier", run[0] + 0.5, run[1] + 0.5);
  must(u.px === u.x && u.pr === u.r, "تازه‌ساخته باید prev=current داشته باشد");
  orderMove(state, u, run[0] + 7, run[1]);
  const x0 = u.x;
  stepSim(state, terrain, 1);
  must(u.px === x0, `prev باید ابتدای تیک باشد (${u.px}≠${x0})`);
  must(u.x !== x0, "واحد باید حرکت کرده باشد");
  const x1 = u.x, px1 = u.px;
  stepSim(state, terrain, 1);
  must(u.px === x1 && px1 !== u.px, "prev باید هر تیک جلو برود");
  // تازه‌ساخته حین تیک: بدون پرش رندر (prev=current)
  const v = spawnUnit(state, "soldier", run[0] + 0.5, run[1] + 0.5);
  stepSim(state, terrain, 0); // صفر تیک: fixup نباید چیزی بشکند
  must(v.px === v.x, "prev تازه‌ساخته باید current باشد");
  return { name: "snapshot موقعیت قبلی", pass: true, detail: `x ${x0}→${x1}، prev=${px1}` };
}

// تابع درون‌یابی: خالص، کلمپ‌شده، با fallback ذخیره قدیمی.
function t_interp_pure() {
  const u = { x: 10, r: 5, px: 8, pr: 4 };
  let p = interpPos(u, 0);
  must(p.x === 8 && p.r === 4, "alpha=۰ باید prev بدهد");
  p = interpPos(u, 1);
  must(p.x === 10 && p.r === 5, "alpha=۱ باید current بدهد");
  p = interpPos(u, 0.5);
  must(p.x === 9 && p.r === 4.5, "alpha=۰٫۵ باید میانه بدهد");
  p = interpPos(u, -2);
  must(p.x === 8, "alpha منفی باید clamp به ۰ شود");
  p = interpPos(u, 99);
  must(p.x === 10, "alpha بزرگ باید clamp به ۱ شود");
  p = interpPos({ x: 3, r: 7 }, 0.5); // ذخیره قدیمی بدون px/pr
  must(p.x === 3 && p.r === 7, "بدون px/pr باید current بدهد");
  return { name: "درون‌یابی خالص", pass: true, detail: "۰/۰٫۵/۱ + clamp + fallback" };
}

// px/pr باید خارج هش و ذخیره باشند؛ load باید prev=current بنشاند.
function t_interp_not_in_hash_save() {
  const { W, H, terrain, state } = fresh();
  const u = spawnUnit(state, "soldier", 10.5, 10.5);
  orderMove(state, u, 20, 10);
  stepSim(state, terrain, 3);
  const h1 = stateHash(state);
  u.px = -999;
  u.pr = -999;
  const h2 = stateHash(state);
  must(h1 === h2, `دست‌کاری px/pr نباید هش را عوض کند ${h1}≠${h2}`);
  u.px = u.x;
  u.pr = u.r;
  const json = serializeJSON(state);
  must(!json.includes('"px"') && !json.includes('"pr"'), "px/pr نباید در ذخیره باشد");
  const back = deserialize(JSON.parse(json));
  const bu = back.units.find((x) => x.id === u.id);
  must(bu && bu.px === bu.x && bu.pr === bu.r, "پس از load باید prev=current باشد");
  must(stateHash(back) === stateHash(state), "هش پس از چرخه ذخیره باید بماند");
  return { name: "جدایی نما از sim", pass: true, detail: `هش ${h1}` };
}

// --- فاز ۰ بند ۲: قطعیت کامل (RNG سیددار + نقطه‌ثابت + ترتیب پین‌شده) ---

// جریان RNG: دنباله از سید، برابر mulberry32، مشتق تنبل از mapSeed.
function t_rng_stream() {
  const mk = (seed) => { const s = createState(); s.mapSeed = seed >>> 0; return s; };
  const a = mk(1234), b = mk(1234);
  must(a.rng === null, "جریان تازه باید null باشد (تنبل)");
  const seqA = [rngNext(a), rngNext(a), rngNext(a)];
  const seqB = [rngNext(b), rngNext(b), rngNext(b)];
  must(seqA.every((v, i) => v === seqB[i]), "دو جریان هم‌سید باید یک دنباله بدهند");
  const ref = mulberry32(1234);
  must(seqA.every((v) => v === ref()), "دنباله جریان باید با mulberry32 یکسان باشد");
  must(Number.isInteger(a.rng) && a.rng >= 0 && a.rng <= 4294967295, "حالت جریان باید uint32 باشد");
  const c = mk(999);
  must(rngNext(c) !== seqA[0], "سید متفاوت باید دنباله متفاوت بدهد");
  seedSimRng(a, 77);
  must(a.rng === 77, "مقداردهی صریح باید بنشیند");
  for (let i = 0; i < 20; i++) {
    const v = rngInt(a, 1, 6);
    must(v >= 1 && v <= 6, "rngInt باید در بازه باشد");
    must(rngPick(a, ["x", "y"]) !== undefined, "rngPick باید عضو بدهد");
  }
  must(statelessRand(42, 100, 7) === statelessRand(42, 100, 7), "draw بی‌حالت باید تکرارپذیر باشد");
  must(statelessRand(42, 100, 7) !== statelessRand(42, 101, 7), "تیک متفاوت باید draw متفاوت بدهد");
  return { name: "جریان RNG سیددار", pass: true, detail: `seq=${seqA[0].toFixed(6)}…` };
}

// RNG در ذخیره می‌ماند: ادامه پس از load با اجرای بی‌وقفه یکی است + رد دست‌کاری.
function t_rng_save_roundtrip() {
  const state = createState();
  state.mapSeed = 4242;
  const drawsA = [rngNext(state), rngNext(state), rngNext(state)];
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.rng === state.rng, `rng باید در ذخیره بماند ${loaded.rng}≠${state.rng}`);
  must(stateHash(loaded) === stateHash(state), "هش پس از load باید بماند");
  const contA = [rngNext(state), rngNext(state)];
  const contB = [rngNext(loaded), rngNext(loaded)];
  must(contA.every((v, i) => v === contB[i]), "ادامه پس از load باید همان دنباله باشد");
  must(drawsA[0] !== contA[0], "دنباله باید جلو رفته باشد");
  const bad = JSON.parse(serializeJSON(state));
  bad.rng = -1;
  let ok = true;
  try { deserialize(bad); } catch { ok = false; }
  must(!ok, "rng منفی باید رد شود");
  return { name: "ماندگاری RNG در ذخیره", pass: true, detail: `rng=${state.rng}` };
}

// ترتیب کامل تیک پین شده: stepSim با حلقه دستی اقتصاد→آموزش→نبرد→AI یکی است.
function t_sim_full_mirror() {
  const setup = () => {
    const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
    const terrain = makeTerrain(W, H, CONFIG.MAP_SEED);
    const state = createState();
    state.mapSeed = CONFIG.MAP_SEED;
    tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
    needBarracks(state, terrain, W, H);
    const spot = grassNear(terrain, state.occ, W, H, 20, 20);
    must(spot, "جای تحویل باید باشد");
    queueHire(state, terrain, W, H, spot[0], spot[1], "soldier", 0);
    spawnUnit(state, "swordsman", 12.5, 5.5);
    placeKeep(state, terrain, W, H);
    spawnLord(state, terrain, W, H);
    startAI(state, terrain, W, H, "normal", "artan");
    for (const b of state.buildings) b.buildLeft = 0;
    return { state, terrain };
  };
  const runStep = () => {
    const { state, terrain } = setup();
    stepSim(state, terrain, 200, null);
    return stateHash(state);
  };
  const runManual = () => {
    const { state, terrain } = setup();
    for (let i = 0; i < 200; i++) {
      state.tick++;
      stepEconomy(state);
      stepTraining(state, terrain);
      stepCombat(state, terrain);
      stepAI(state, terrain);
    }
    return stateHash(state);
  };
  const a = runStep(), b = runManual();
  must(a === b, `ترتیب کامل باید آینه باشد ${a}≠${b}`);
  return { name: "آینه ترتیب کامل تیک", pass: true, detail: a };
}

// سناریوی مختلط (صف + آموزش + دستور + موج + AI + نبرد): دابل + ذخیره میانی.
function t_sim_deterministic_mixed() {
  const run = (withSave) => {
    const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
    const terrain = makeTerrain(W, H, 777);
    const state = createState();
    state.mapSeed = 777;
    placeKeep(state, terrain, W, H);
    spawnLord(state, terrain, W, H);
    startAI(state, terrain, W, H, "easy", "artan");
    const q = createQueue();
    const at = (c) => enqueueCmd(q, c, state.tick);
    must(at({ kind: "place", type: "woodcutter", c: 1, r: 1 }).ok, "صف: چوب‌بری");
    must(at({ kind: "place", type: "farm", c: 4, r: 1 }).ok, "صف: مزرعه");
    must(at({ kind: "tax", v: "none" }).ok, "صف: مالیات");
    needBarracks(state, terrain, W, H);
    const h1 = hireUnit(state, terrain, W, H, 5, 5, "soldier");
    must(h1.ok, "استخدام مستقیم باید موفق باشد");
    const ids = state.units.map((u) => u.id);
    must(at({ kind: "order", orderKind: "move", ids, c: 9, r: 5 }).ok, "صف: دستور حرکت");
    spawnWave(state, terrain, W, H);
    stepSim(state, terrain, 150, q);
    let st = state;
    if (withSave) st = deserializeJSON(serializeJSON(state)); // ادامه از ذخیره میانی
    stepSim(st, terrain, 150, createQueue());
    return stateHash(st);
  };
  const a = run(false), b = run(false);
  must(a === b, `دو اجرای مختلط باید یکسان باشند ${a}≠${b}`);
  const c = run(true);
  must(c === a, `ادامه پس از ذخیره میانی باید یکسان باشد ${c}≠${a}`);
  return { name: "قطعیت مختلط با ذخیره میانی", pass: true, detail: a };
}

// نقطه‌ثابت Q6: همه موقعیت‌ها مضرب دقیق ۱/۶۴ + منابع/HP صحیح + پایداری هش در ذخیره.
function t_fixedpoint_positions() {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, 2024);
  const state = createState();
  state.mapSeed = 2024;
  needBarracks(state, terrain, W, H);
  state.resources.food = 500;
  state.resources.gold = 500;
  const ids = [];
  const spots = [[5, 5], [6, 5], [7, 5], [8, 5]];
  const types = ["soldier", "bowman", "soldier", "bowman"];
  for (let i = 0; i < spots.length; i++) {
    const h = hireUnit(state, terrain, W, H, spots[i][0], spots[i][1], types[i]);
    must(h.ok, "استخدام باید موفق باشد");
    ids.push(h.unit.id);
  }
  const q = createQueue();
  must(enqueueCmd(q, { kind: "order", orderKind: "move", ids, c: 30, r: 30 }, state.tick).ok, "صف: حرکت");
  spawnUnit(state, "swordsman", 20.5, 20.5);
  spawnUnit(state, "archer", 22.5, 20.5);
  stepSim(state, terrain, 250, q);
  must(state.units.length > 0, "یگانی باید مانده باشد");
  for (const u of state.units) {
    must(u.x * 64 === Math.round(u.x * 64) && u.r * 64 === Math.round(u.r * 64),
      `موقعیت یگان ${u.id} باید Q6 باشد (${u.x},${u.r})`);
    must(Number.isInteger(u.hp), "hp باید صحیح باشد");
    must(Number.isInteger(u.cooldown), "cooldown باید صحیح باشد");
  }
  for (const k of Object.keys(state.resources)) {
    must(Number.isInteger(state.resources[k]), `منبع ${k} باید صحیح باشد`);
  }
  must(qpos(2.5) === 2.5, "مضرب ۰٫۵ باید ثابت بماند");
  const qd = qpos(0.1 + 0.2);
  must(qd * 64 === Math.round(qd * 64), "qpos باید روی شبکه ۱/۶۴ بنشیند");
  const h1 = stateHash(state);
  const loaded = deserializeJSON(serializeJSON(state));
  must(stateHash(loaded) === h1, "هش پس از چرخه ذخیره باید دقیقاً بماند");
  return { name: "نقطه‌ثابت Q6 و اعداد صحیح", pass: true, detail: `${state.units.length} یگان، هش ${h1}` };
}

export function simCases() {
  return [t_sim_queue_hash, t_sim_queue_reject, t_sim_mirror,
    t_clock_alpha, t_hz_from_config, t_interp_prev, t_interp_pure, t_interp_not_in_hash_save,
    t_rng_stream, t_rng_save_roundtrip, t_sim_full_mirror, t_sim_deterministic_mixed, t_fixedpoint_positions];
}
