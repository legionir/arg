// حریف AI (0.246.0 — C-CLN-34): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { startAI, aiDifficulty, aiRaidPlan, aiPersonality, aiPersonalityName, AI_OWNER } from "../ai.js";
import { runReplay, validateReplayLog, REPLAY_V } from "../replay.js";
import { createQueue, stepSim } from "../sim.js";
import { spawnUnit, stepCombat, demolishBuilding } from "../combat.js";
import { tryPlace } from "../construction.js";
import { deserialize, serializeJSON, deserializeJSON } from "../persist.js";
import { must, fresh, siteNear, aiSim, aiFreshPers } from "./fixtures.js";

// --- حریف AI سولو (0.42.0 — #۱۱ از FEATURES، فاز ۱) ---

function aiFresh() {
  const { W, H, terrain, state } = fresh();
  const r = startAI(state, terrain, W, H);
  must(r.ok, `شروع AI باید موفق باشد، شد ${r.reason}`);
  return { W, H, terrain, state };
}


function aiSummary(state) {
  return JSON.stringify({
    units: state.units.map((u) => [u.type, u.x, u.r, u.hp, u.owner, u.side]),
    blds: state.buildings.map((b) => [b.type, b.c, b.r, b.hp, b.buildLeft || 0, b.owner]),
    ai: state.ai,
  });
}

function t_ai_starts() {
  const { state } = aiFresh();
  must(state.ai.active, "باید فعال باشد");
  const keep = state.buildings.find((b) => b.type === "keep" && (b.owner == null ? 0 : b.owner) === AI_OWNER);
  must(keep, "ستاد حریف (مالک ۹) باید باشد");
  must(state.ai.keepId === keep.id, "keepId باید ثبت شود");
  must(state.ai.resources.wood === 120, `چوب آغازین ۱۲۰، هست ${state.ai.resources.wood}`);
  return { name: "شروع حریف", pass: true, detail: `ستاد در (${keep.c}،${keep.r})` };
}

function t_ai_builds() {
  const { state, terrain } = aiFresh();
  aiSim(state, terrain, 700);
  const done = state.buildings.filter((b) => (b.owner == null ? 0 : b.owner) === AI_OWNER
    && b.type !== "keep" && (b.buildLeft || 0) === 0);
  must(done.length >= 3, `باید ≥۳ بنای تکمیل‌شده، هست ${done.length}`);
  return { name: "ساخت‌وساز حریف", pass: true, detail: `${done.length} بنا: ${done.map((b) => b.type)}` };
}

function t_ai_raids() {
  const { state, terrain } = aiFresh();
  aiSim(state, terrain, 1600); // یورش اول در تیک ۱۵۰۰
  must(state.ai.raidsSent >= 1, `باید ≥۱ یورش رفته باشد، هست ${state.ai.raidsSent}`);
  const raiders = state.units.filter((u) => !u.dead && u.side === "enemy" && (u.owner == null ? 0 : u.owner) === AI_OWNER);
  must(raiders.length >= 2, `باید ≥۲ مهاجم حریف، هست ${raiders.length}`);
  return { name: "یورش حریف", pass: true, detail: `${raiders.length} مهاجم در راه` };
}

function t_ai_deterministic() {
  const run = () => {
    const { state, terrain } = aiFresh();
    aiSim(state, terrain, 400);
    return aiSummary(state);
  };
  const a = run(), b = run();
  must(a === b, "دو اجرای هم‌سید باید یکسان باشند");
  return { name: "قطعیت حریف", pass: true, detail: `${a.length} بایت یکسان` };
}

function t_ai_keep_dormant() {
  const { state, terrain } = aiFresh();
  aiSim(state, terrain, 200);
  const keep = state.buildings.find((b) => b.id === state.ai.keepId);
  demolishBuilding(state, keep); // سقوط ستاد حریف
  aiSim(state, terrain, 1); // جاروی stepCombat ویران‌شده را از آرایه پاک می‌کند
  const nB = state.buildings.length;
  aiSim(state, terrain, 400);
  must(state.ai.dormant, "باید خاموش شود");
  must(state.buildings.length === nB, "پس از خاموشی بنای تازه نه");
  must(state.ai.raidsSent === 0, "پس از خاموشی یورش نه");
  return { name: "خاموشی با سقوط ستاد", pass: true, detail: "dormant + توقف ساخت/یورش" };
}

// گیت AI پشت منو (0.68.0 — ریزه‌کاری ۴-الف): با aiPaused اقتصاد/نبرد/تیک جلو
// می‌رود ولی AI نه فکر می‌کند نه می‌سازد نه یورش می‌فرستد؛ بدون opts رفتار
// قبلی (شاهد: در همان بازه AI می‌سازد).
function t_ai_paused() {
  const g = aiFresh();
  const think0 = g.state.ai.nextThink;
  stepSim(g.state, g.terrain, 700, createQueue(), { aiPaused: true });
  must(g.state.tick === 700, `تیک باید ۷۰۰ باشد، هست ${g.state.tick}`);
  must(g.state.ai.nextThink === think0, "nextThink گیت‌شده باید ثابت بماند");
  const built = g.state.buildings.filter((b) => (b.owner == null ? 0 : b.owner) === AI_OWNER && b.type !== "keep");
  must(built.length === 0, `بنای تازه AI نه، هست ${built.length}`);
  must(g.state.ai.raidsSent === 0, "یورش گیت‌شده نه");
  const c = aiFresh();
  aiSim(c.state, c.terrain, 700); // بدون opts = رفتار قبلی
  const builtC = c.state.buildings.filter((b) => (b.owner == null ? 0 : b.owner) === AI_OWNER
    && b.type !== "keep" && (b.buildLeft || 0) === 0);
  must(builtC.length >= 1, `شاهد بدون گیت باید بسازد، ساخت ${builtC.length}`);
  return { name: "توقف AI پشت منو", pass: true, detail: `گیت: nextThink ثابت + ۰ بنا؛ شاهد: ${builtC.length} بنا` };
}

function t_ai_player_siege() {
  const { state, terrain, W, H } = aiFresh();
  state.ai.resources.wood = 200;
  const def = CONFIG.BUILDINGS.hut;
  const site = siteNear(terrain, state.occ, W, H, state.ai.baseC + 6, state.ai.baseR, def.w, def.h);
  must(site, "جا برای کلبه حریف باید باشد");
  const r = tryPlace(state, terrain, W, H, site[0], site[1], def, AI_OWNER);
  must(r.ok, `کلبه حریف باید ساخته شود، شد ${r.reason}`);
  const hut = r.building;
  hut.buildLeft = 0; // تکمیل فوری برای نبرد
  const me = spawnUnit(state, "soldier", site[0] + 0.5, site[1] + 2.5, 0);
  void me;
  const hp0 = hut.hp;
  aiSim(state, terrain, 40);
  must(hut.hp < hp0, `سرباز باید کلبه حریف را بزند، hp=${hut.hp}/${hp0}`);
  return { name: "محاصره بنای حریف", pass: true, detail: `hp ${hut.hp}/${hp0}` };
}

function t_ai_waves_skip_ai() {
  const { W, H, terrain, state } = fresh();
  // کلبه بازیکن دور + کلبه حریف چسبیده به شمشیرزن موج
  const ph = tryPlace(state, terrain, W, H, 50, 50, CONFIG.BUILDINGS.hut, 0);
  must(ph.ok, "کلبه بازیکن باید ساخته شود");
  state.ai.resources.wood = 200;
  const hutDef = CONFIG.BUILDINGS.hut;
  const site = siteNear(terrain, state.occ, W, H, 10, 10, hutDef.w, hutDef.h);
  must(site, "جا برای کلبه حریف باید باشد");
  const ah = tryPlace(state, terrain, W, H, site[0], site[1], hutDef, AI_OWNER);
  must(ah.ok, `کلبه حریف باید ساخته شود، شد ${ah.reason}`);
  const foe = spawnUnit(state, "swordsman", site[0] + 2.5, site[1] + 0.5);
  void foe; void ah;
  aiSim(state, terrain, 1);
  must(foe.targetKind === "bld" && foe.targetId === ph.building.id,
    `موج باید کلبه بازیکن را بگیرد، شد ${foe.targetKind}:${foe.targetId}`);
  return { name: "موج بنای حریف را نمی‌زند", pass: true, detail: `هدف=${foe.targetId}` };
}

function t_ai_save_compat() {
  const { state, terrain } = aiFresh();
  aiSim(state, terrain, 120);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.ai.active, "فعال باید بماند");
  must(loaded.ai.resources.wood === state.ai.resources.wood, "منابع حریف باید حفظ شود");
  must(loaded.buildings.some((b) => (b.owner == null ? 0 : b.owner) === AI_OWNER), "بنای حریف باید بماند");
  const old = JSON.parse(serializeJSON(state));
  delete old.ai;
  const legacy = deserialize(old);
  must(!legacy.ai.active, "قدیمی بدون ai = غیرفعال");
  return { name: "ذخیره حریف", pass: true, detail: "حفظ + تحمل قدیمی" };
}

function aiFreshDiff(diff) {
  const { W, H, terrain, state } = fresh();
  const r = startAI(state, terrain, W, H, diff);
  must(r.ok, `شروع AI (${diff}) باید موفق باشد، شد ${r.reason}`);
  return { W, H, terrain, state };
}

function t_ai_difficulty_default() {
  const a = aiFresh();
  must(a.state.ai.difficulty === "normal", `پیش‌فرض باید معمولی باشد، هست ${a.state.ai.difficulty}`);
  const b = aiFreshDiff("bogus");
  must(b.state.ai.difficulty === "normal", "سختی نامعتبر باید معمولی شود");
  const c = aiFreshDiff("hard");
  must(c.state.ai.difficulty === "hard", "سخت باید ثبت شود");
  const p = aiRaidPlan(a.state.ai, 0);
  must(p.at === 1500 && p.n === 3, `جدول پایه باید دست‌نخورده بماند، شد ${p.at}/${p.n}`);
  must(aiDifficulty(null).raidAtMul === 1, "ai خالی = معمولی");
  return { name: "پیش‌فرض سختی", pass: true, detail: "normal + جدول پایه" };
}

function t_ai_difficulty_plan() {
  const at = (diff, i) => aiRaidPlan({ difficulty: diff }, i);
  must(at("easy", 0).at === 2250 && at("easy", 0).n === 2, "آسان: دیرتر و کوچک‌تر");
  must(at("easy", 2).at === 5700 && at("easy", 2).n === 4, "آسان: یورش سوم");
  must(at("hard", 0).at === 1050 && at("hard", 0).n === 5, "سخت: زودتر و بزرگ‌تر");
  must(at("hard", 2).at === 2660 && at("hard", 2).n === 7, "سخت: یورش سوم");
  must(at("normal", 1).at === 2600 && at("normal", 1).n === 4, "معمولی = جدول پایه");
  must(aiRaidPlan({ difficulty: "easy" }, 9) === null, "اندیس ناموجود = null");
  must(aiDifficulty({ difficulty: "easy" }).goldMul === 0.5, "طلای آسان نصف");
  must(aiDifficulty({ difficulty: "hard" }).goldMul === 2, "طلای سخت دوبرابر");
  must(aiDifficulty({ difficulty: "easy" }).workerEveryMul === 2, "کارگر آسان کندتر");
  must(aiDifficulty({ difficulty: "hard" }).workerEveryMul === 0.5, "کارگر سخت تندتر");
  return { name: "جدول سختی", pass: true, detail: "زمان/اندازه/اقتصاد هر ۳ سطح" };
}

function t_ai_difficulty_raid_sizes() {
  // رفتاری: سربازخانه دستی + پرش تیک به لحظه یورش هر سطح.
  for (const [diff, atk, n] of [["easy", 2250, 2], ["normal", 1500, 3], ["hard", 1050, 5]]) {
    const { state, terrain, W, H } = aiFreshDiff(diff);
    const def = CONFIG.BUILDINGS.barracks;
    const site = siteNear(terrain, state.occ, W, H, state.ai.baseC + 6, state.ai.baseR, def.w, def.h);
    must(site, `جا برای سربازخانه (${diff}) باید باشد`);
    const r = tryPlace(state, terrain, W, H, site[0], site[1], def, AI_OWNER);
    must(r.ok, `سربازخانه حریف (${diff}) باید ساخته شود، شد ${r.reason}`);
    r.building.buildLeft = 0; // تکمیل فوری برای یورش
    state.ai.resources.food = 5000;
    state.ai.resources.gold = 5000;
    state.tick = atk;
    state.ai.nextThink = atk;
    aiSim(state, terrain, 1);
    must(state.ai.raidsSent === 1, `${diff}: باید ۱ یورش رفته باشد، هست ${state.ai.raidsSent}`);
    const raiders = state.units.filter((u) => !u.dead && u.side === "enemy" && (u.owner == null ? 0 : u.owner) === AI_OWNER);
    must(raiders.length === n, `${diff}: باید ${n} مهاجم، هست ${raiders.length}`);
  }
  return { name: "یورش هر سختی", pass: true, detail: "۲/۳/۵ مهاجم در ۲۲۵۰/۱۵۰۰/۱۰۵۰" };
}

function t_ai_difficulty_save() {
  const { state } = aiFreshDiff("hard");
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.ai.difficulty === "hard", "سختی باید در ذخیره بماند");
  const old = JSON.parse(serializeJSON(state));
  delete old.ai.difficulty;
  must(deserializeJSON(JSON.stringify(old)).ai.difficulty === "normal", "ذخیره قدیمی = معمولی");
  const bad = JSON.parse(serializeJSON(state));
  bad.ai.difficulty = "nightmare";
  let threw = false;
  try { deserializeJSON(JSON.stringify(bad)); } catch (e) { threw = true; }
  must(threw, "سختی نامعتبر باید رد شود");
  return { name: "ذخیره سختی", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}

function t_ai_difficulty_replay() {
  const good = { v: REPLAY_V, seed: 123, diff: "hard", cmds: [{ t: 0, cmd: { kind: "tax", v: "none" } }], ticks: 10 };
  must(validateReplayLog(good).ok, "لاگ با درجه باید قبول شود");
  must(!validateReplayLog({ ...good, diff: "nightmare" }).ok, "درجه نامعتبر باید رد شود");
  const h0 = runReplay({ v: REPLAY_V, seed: 321, cmds: [], ticks: 1200 }, 1200).hash;
  const hN = runReplay({ v: REPLAY_V, seed: 321, diff: "normal", cmds: [], ticks: 1200 }, 1200).hash;
  must(h0 === hN, "لاگ قدیمی (بی‌درجه) باید همان معمولی باشد");
  const hH = runReplay({ v: REPLAY_V, seed: 321, diff: "hard", cmds: [], ticks: 1200 }, 1200).hash;
  const hH2 = runReplay({ v: REPLAY_V, seed: 321, diff: "hard", cmds: [], ticks: 1200 }, 1200).hash;
  must(hH === hH2, "بازپخش سخت باید قطعی باشد");
  must(hH !== hN, "سخت باید از معمولی متفاوت باشد (یورش ۱۰۵۰)");
  return { name: "ری‌پلی سختی", pass: true, detail: "سازگاری + قطعیت + تفاوت" };
}

export function aiCases() {
  return [t_ai_starts, t_ai_builds, t_ai_raids, t_ai_deterministic,
    t_ai_keep_dormant, t_ai_paused, t_ai_player_siege, t_ai_waves_skip_ai, t_ai_save_compat,
    t_ai_difficulty_default, t_ai_difficulty_plan, t_ai_difficulty_raid_sizes,
    t_ai_difficulty_save, t_ai_difficulty_replay,
    t_ai_personality_default, t_ai_personality_plan, t_ai_personality_save, t_ai_personality_replay];
}

// شخصیت حریف (0.56.0 — #۱۸ از FEATURES): ۵ پروفایل، گرگ خنثی = رفتار 0.42.
// (0.150.0 — §۱۸.۵/بند ۱۰۰): + ارباب عرب (زوج عربی یورش) = ۶ پروفایل.

function t_ai_personality_default() {
  const a = aiFresh();
  must(a.state.ai.personality === "wolf", `پیش‌فرض باید گرگ باشد، هست ${a.state.ai.personality}`);
  must(aiPersonalityName(a.state.ai) === "گرگ", "نام فارسی گرگ");
  const b = aiFreshPers("bogus");
  must(b.state.ai.personality === "wolf", "شخصیت نامعتبر باید گرگ شود");
  const c = aiFreshPers("lion");
  must(c.state.ai.personality === "lion", "شیر باید ثبت شود");
  must(aiPersonality(null).raidAtMul === 1 && aiPersonality(null).raidSizeAdd === 0, "ai خالی = گرگ خنثی");
  const p = aiRaidPlan(a.state.ai, 0);
  must(p.at === 1500 && p.n === 3, `گرگ باید جدول پایه را نگه دارد، شد ${p.at}/${p.n}`);
  return { name: "پیش‌فرض شخصیت", pass: true, detail: "گرگ خنثی + جدول پایه" };
}

function t_ai_personality_plan() {
  const at = (pers, i) => aiRaidPlan({ personality: pers }, i);
  must(at("wolf", 0).at === 1500 && at("wolf", 0).n === 3, "گرگ = جدول پایه");
  must(at("rat", 0).at === 2100 && at("rat", 0).n === 2, "موش: دیر و ریز");
  must(at("rat", 2).at === 5320 && at("rat", 2).n === 4, "موش: یورش سوم");
  must(at("snake", 0).at === 1200 && at("snake", 0).n === 3, "مار: زودرس");
  must(at("pig", 0).at === 1800 && at("pig", 0).n === 4, "خوک: دیر ولی سنگین");
  must(at("lion", 0).at === 1200 && at("lion", 0).n === 5, "شیر: زود و بزرگ");
  must(at("lion", 2).at === 3040 && at("lion", 2).n === 7, "شیر: یورش سوم");
  const combo = aiRaidPlan({ difficulty: "hard", personality: "lion" }, 0);
  must(combo.at === 840 && combo.n === 7, `سخت×شیر باید ترکیب شود، شد ${combo.at}/${combo.n}`);
  must(aiPersonality({ personality: "pig" }).goldMul === 1.5, "طلای خوک ۱٫۵×");
  must(aiPersonality({ personality: "rat" }).workerEveryMul === 1.5, "کارگر موش کندتر");
  must(aiPersonality({ personality: "snake" }).archerP === 0.55, "کماندار مار ۵۵٪");
  must(at("arabLord", 0).at === 1500 && at("arabLord", 0).n === 3, "ارباب عرب = جدول پایه (همان اندازه)");
  must(at("saladin", 0).at === 1350 && at("saladin", 0).n === 4, "صلاح‌الدین: زودتر و ۴نفره");
  const stp = aiPersonality({ personality: "saladin" });
  must(stp.troops && stp.troops.ranged === "arabianBow" && stp.troops.melee === "slinger", "زوج بیابان صلاح‌الدین");
  const atp = aiPersonality({ personality: "arabLord" });
  must(atp.troops && atp.troops.ranged === "arabianBow" && atp.troops.melee === "slave", "زوج عربی یورش");
  must(aiRaidPlan({ personality: "rat" }, 9) === null, "اندیس ناموجود = null");
  return { name: "جدول شخصیت‌ها", pass: true, detail: "زمان/اندازه/اقتصاد هر ۷ پروفایل" };
}

function t_ai_personality_save() {
  const { state } = aiFreshPers("lion");
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.ai.personality === "lion", "شخصیت باید در ذخیره بماند");
  const old = JSON.parse(serializeJSON(state));
  delete old.ai.personality;
  must(deserializeJSON(JSON.stringify(old)).ai.personality === "wolf", "ذخیره قدیمی = گرگ");
  const bad = JSON.parse(serializeJSON(state));
  bad.ai.personality = "dragon";
  let threw = false;
  try { deserializeJSON(JSON.stringify(bad)); } catch (e) { threw = true; }
  must(threw, "شخصیت نامعتبر باید رد شود");
  return { name: "ذخیره شخصیت", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}

function t_ai_personality_replay() {
  const good = { v: REPLAY_V, seed: 123, pers: "snake", cmds: [{ t: 0, cmd: { kind: "tax", v: "none" } }], ticks: 10 };
  must(validateReplayLog(good).ok, "لاگ با شخصیت باید قبول شود");
  must(!validateReplayLog({ ...good, pers: "dragon" }).ok, "شخصیت نامعتبر باید رد شود");
  const h0 = runReplay({ v: REPLAY_V, seed: 321, cmds: [], ticks: 2000 }, 2000).hash;
  const hW = runReplay({ v: REPLAY_V, seed: 321, pers: "wolf", cmds: [], ticks: 2000 }, 2000).hash;
  must(h0 === hW, "لاگ قدیمی (بی‌شخصیت) باید همان گرگ باشد");
  const hL = runReplay({ v: REPLAY_V, seed: 321, pers: "lion", cmds: [], ticks: 2000 }, 2000).hash;
  const hL2 = runReplay({ v: REPLAY_V, seed: 321, pers: "lion", cmds: [], ticks: 2000 }, 2000).hash;
  must(hL === hL2, "بازپخش شیر باید قطعی باشد");
  must(hL !== hW, "شیر باید از گرگ متفاوت باشد (یورش ۱۲۰۰)");
  return { name: "ری‌پلی شخصیت", pass: true, detail: "سازگاری + قطعیت + تفاوت" };
}
