// حریف AI سولو (0.42.0 — #۱۱ از FEATURES، فاز ۱).
//
// مدل: مالک مجازی owner=9 (بیرون اسلات‌های MP)، فقط سولو. سه لایه (اقتصاد ←
// ساخت ← نظامی) هر AI.thinkEvery تیک می‌اندیشند. یگان‌های AI از نوع side="enemy"
// اند تا نبرد موجود هر دو سو را رایگان بدهد: موج‌شکن‌ها/برج‌ها به آن‌ها شلیک
// می‌کنند و خودشان ساختمان/سرباز بازیکن را مثل موج هدف می‌گیرند (acquire).
// اقتصاد AI کانتینر جداست (state.ai) — بدون محبوبیت/مالیات/مهاجرت (ساده‌سازی
// ثبت‌شده: درآمد طلای ثابت + رشد کارگر زمانی). یورش‌ها متناهی‌اند تا پیروزی
// (نابودی همه دشمنان) دست‌یافتنی بماند؛ سقوط ستاد AI = خاموشی کامل.
// قطعیت: بدون Math.random — تنها تصادف aiRand(seed,tick,salt) است که تابعی از
// اعداد ذخیره‌شونده است، پس save/load دنباله را نمی‌شکند.
import { CONFIG } from "./config.js";
import { T_GRASS } from "./terrain.js";
import { tryPlace, validate, placeKeepFor } from "./construction.js";
import { hireUnit, orderAttackMove } from "./combat.js";
import { RATES, CAPS, STORE_RES, GRANARY_RES, STORE_BONUS, GRANARY_BONUS, ARMOURY_RES, ARMOURY_BONUS, housingCap } from "./economy.js";
import { underConstruction } from "./construction.js";
import { mulberry32 } from "./rng.js";

export const AI_OWNER = CONFIG.AI.owner;

// درجه سختی (0.50.0 — #۱۸ از FEATURES): پارامترهای مؤثر حریف از روی
// ai.difficulty؛ نامعتبر/غایب = normal (همان رفتار 0.42 — سازگاری قدیمی).
export function aiDifficulty(ai) {
  const d = ai && CONFIG.AI.difficulties[ai.difficulty];
  return d || CONFIG.AI.difficulties.normal;
}

export function aiDiffName(ai) {
  const k = ai && CONFIG.AI.difficulties[ai.difficulty] ? ai.difficulty : "normal";
  return CONFIG.AI.diffNames[k];
}

// شخصیت حریف (0.56.0 — #۱۸ از FEATURES): پروفایل سبک بازی؛ نامعتبر/غایب =
// گرگ خنثی (همان رفتار 0.42 — سازگاری ذخیره/ری‌پلی قدیمی).
export function aiPersonality(ai) {
  const p = ai && CONFIG.AI.personalities[ai.personality];
  return p || CONFIG.AI.personalities[CONFIG.AI.defaultPersonality];
}

export function aiPersonalityName(ai) {
  const k = ai && CONFIG.AI.personalities[ai.personality] ? ai.personality : CONFIG.AI.defaultPersonality;
  return CONFIG.AI.personalities[k].name;
}

// تصادف قطعی بدون حالت: یک draw از سیدی که فقط به (seed,tick,salt) بستگی
// دارد — پس save/load دنباله را نمی‌شکند (هیچ RNG-state ذخیره‌ای نیست).
export function aiRandAt(ai, tick, salt) {
  const rnd = mulberry32((((ai.seed ^ (tick | 0) ^ ((salt | 0) * 0x9e3779b9)) >>> 0)));
  return rnd();
}

function aiBlds(state) {
  return state.buildings.filter((b) => !b.destroyed && (b.owner == null ? 0 : b.owner) === AI_OWNER);
}

// شروع AI: ستاد در گوشه مخالف ستاد بازیکن + کانتینر اقتصادی.
// diff درجه سختی است («easy»/«normal»/«hard»؛ نامعتبر = normal) و personality
// کلید پروفایل (نامعتبر = گرگ خنثی).
export function startAI(state, terrain, W, H, diff, personality) {
  const ai = state.ai;
  if (!ai || ai.active) return { ok: false, reason: "INVALID" };
  const keep = state.buildings.find((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === 0);
  const ac = keep ? (keep.c < W / 2 ? W - 6 : 6) : W - 6;
  const ar = keep ? (keep.r < H / 2 ? H - 6 : 6) : H - 6;
  const r = placeKeepFor(state, terrain, W, H, AI_OWNER, ac, ar);
  if (!r.ok) return r;
  ai.active = true;
  ai.seed = ((state.mapSeed >>> 0) ^ 0xa17e4d) >>> 0;
  ai.resources = { ...CONFIG.AI.startRes };
  ai.workers = CONFIG.AI.startWorkers;
  ai.workerCap = housingCap(state, AI_OWNER);
  ai.freeWorkers = ai.workers;
  ai.phase = "build";
  ai.buildIdx = 0;
  ai.raidsSent = 0;
  ai.nextThink = state.tick + CONFIG.AI.thinkEvery;
  ai.keepId = r.building.id;
  ai.baseC = r.building.c;
  ai.baseR = r.building.r;
  ai.dormant = false;
  ai.difficulty = CONFIG.AI.difficulties[diff] ? diff : "normal";
  ai.personality = CONFIG.AI.personalities[personality] ? personality : CONFIG.AI.defaultPersonality;
  state.events.push(`حریف (${aiPersonalityName(ai)}، درجه ${CONFIG.AI.diffNames[ai.difficulty]}) در گوشه نقشه مستقر شد! (نقطه قرمز)`);
  return { ok: true, reason: "OK" };
}

// نزدیک‌ترین چمن آزاد مارپیچی به نقطه (قطعی) برای جای ساختمان/استخدام.
function spiralSite(state, terrain, W, H, c0, r0, w, h, forUnit) {
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

function aiCap(state, key) {
  let cap = CAPS[key];
  for (const b of aiBlds(state)) {
    if (underConstruction(b)) continue;
    if (b.type === "stockpile" && STORE_RES.includes(key)) cap += STORE_BONUS;
    else if (b.type === "granary" && GRANARY_RES.includes(key)) cap += GRANARY_BONUS;
    else if ((b.type === "armoury" || b.type === "fletcher") && ARMOURY_RES.includes(key)) cap += ARMOURY_BONUS;
  }
  return cap;
}

// تخصیص کارگر حریصانه از استخر AI (آینه assignStaff، جدا چون استخر جداست).
function aiAssignStaff(state) {
  const ai = state.ai;
  let free = ai.workers;
  const sorted = aiBlds(state).slice().sort((a, b) => a.id - b.id);
  const needOf = (b) => {
    if (underConstruction(b)) return 0;
    const r = RATES[b.type];
    return r ? r.workers : 0;
  };
  for (const b of sorted) {
    const need = needOf(b);
    if (need === 0) { b.staffed = true; continue; }
    if (free >= need) { b.staffed = true; free -= need; }
    else b.staffed = false;
  }
  ai.freeWorkers = free;
}

// اقتصاد AI: تولید ساختمان‌هایش به کانتینر خودش + طلای ثابت + رشد زمانی کارگر.
// غذا مصرف نمی‌شود (ساده‌سازی فاز ۱ — ثبت‌شده).
function stepAiEcon(state) {
  const ai = state.ai;
  ai.workerCap = housingCap(state, AI_OWNER);
  aiAssignStaff(state);
  for (const b of aiBlds(state)) {
    const r = RATES[b.type];
    if (!r || !b.staffed || underConstruction(b)) { b.starved = false; continue; }
    if (r.consumes) {
      let lacking = false;
      for (const k of Object.keys(r.consumes)) {
        if ((ai.resources[k] || 0) < r.consumes[k]) { lacking = true; break; }
      }
      b.starved = lacking;
      if (lacking) continue;
    } else {
      b.starved = false;
    }
    b.progress = (b.progress || 0) + 1;
    if (b.progress >= r.everyTicks) {
      b.progress = 0;
      if (r.consumes) {
        for (const k of Object.keys(r.consumes)) ai.resources[k] -= r.consumes[k];
      }
      const k = r.produces;
      ai.resources[k] = Math.min(aiCap(state, k), ai.resources[k] + r.amount);
    }
  }
  if (state.tick > 0 && state.tick % CONFIG.AI.thinkEvery === 0) {
    const d = aiDifficulty(ai), p = aiPersonality(ai);
    ai.resources.gold = Math.min(aiCap(state, "gold"),
      ai.resources.gold + Math.round(ai.workers * CONFIG.AI.goldPerWorker * d.goldMul * p.goldMul));
  }
  const workerEvery = Math.max(1, Math.round(CONFIG.AI.workerEvery * aiDifficulty(ai).workerEveryMul * aiPersonality(ai).workerEveryMul));
  if (state.tick > 0 && state.tick % workerEvery === 0 && ai.workers < ai.workerCap) {
    ai.workers++;
  }
  for (const k of Object.keys(ai.resources)) {
    if (ai.resources[k] < 0) ai.resources[k] = 0;
    if (ai.resources[k] > aiCap(state, k)) ai.resources[k] = aiCap(state, k);
  }
}

// لایه ساخت: یک ساختمانِ بعدی فهرست پروفایل وقتی قبلی تکمیل شد و پول هست.
function aiBuild(state, terrain, W, H) {
  const ai = state.ai;
  const list = aiPersonality(ai).buildList || CONFIG.AI.buildList;
  if (ai.buildIdx >= list.length) return;
  const mine = aiBlds(state);
  if (mine.some((b) => (b.buildLeft || 0) > 0)) return; // یکی در حال ساخت است
  const key = list[ai.buildIdx];
  const def = CONFIG.BUILDINGS[key];
  if (!def) { ai.buildIdx++; return; }
  const site = spiralSite(state, terrain, W, H, ai.baseC, ai.baseR, def.w, def.h, false);
  if (!site) { ai.buildIdx++; return; } // جا نیست — رد شو (بعداً دوباره؟ نه: فاز ۱)
  const v = validate(state, terrain, W, H, site[0], site[1], def, AI_OWNER);
  if (!v.ok) { ai.buildIdx++; return; }
  const r = tryPlace(state, terrain, W, H, site[0], site[1], def, AI_OWNER);
  if (r.ok) {
    aiAssignStaff(state);
    ai.buildIdx++;
  } else {
    ai.buildIdx++;
  }
}

// لایه نظامی: یورش زمان‌بندی‌شده وقتی سربازخانه سالم هست.
// زمان/اندازه از درجه سختی × شخصیت می‌آیند (normal×گرگ = همان جدول پایه).
export function aiRaidPlan(ai, idx) {
  const base = CONFIG.AI.raids[idx];
  if (!base) return null;
  const d = aiDifficulty(ai), p = aiPersonality(ai);
  return {
    at: Math.round(base.at * d.raidAtMul * p.raidAtMul),
    n: Math.max(1, base.n + d.raidSizeAdd + p.raidSizeAdd),
  };
}

function aiRaid(state, terrain, W, H) {
  const ai = state.ai;
  const raids = CONFIG.AI.raids;
  if (ai.raidsSent >= raids.length) return;
  const next = aiRaidPlan(ai, ai.raidsSent);
  if (!next || state.tick < next.at) return;
  const rax = aiBlds(state).find((b) => b.type === "barracks" && !underConstruction(b));
  if (!rax) return; // سربازخانه نیست — این یورش می‌سوزد؟ نه: صبر می‌کند تا نوبت بعد
  const keep = state.buildings.find((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === 0);
  const tc = keep ? keep.c : Math.floor(W / 2), tr = keep ? keep.r : Math.floor(H / 2);
  let hired = 0;
  const archerP = aiPersonality(ai).archerP != null ? aiPersonality(ai).archerP : 0.34;
  for (let i = 0; i < next.n; i++) {
    // ترکیب قطعی ولی نه یکنواخت: draw از (seed,tick,i) + سهم کماندار پروفایل
    const type = aiRandAt(ai, state.tick, ai.raidsSent * 31 + i) < archerP ? "archer" : "swordsman";
    const site = spiralSite(state, terrain, W, H, rax.c, rax.r, 1, 1, true);
    if (!site) break;
    const h = hireUnit(state, terrain, W, H, site[0], site[1], type, AI_OWNER);
    if (!h.ok) break; // پول/جا نیست — بقیه یورش می‌سوزد
    hired++;
    orderAttackMove(state, h.unit, tc, tr);
  }
  if (hired > 0) {
    state.events.push(`یورش حریف! ${hired} مهاجم به سمت قلعه می‌آیند.`);
  }
  ai.raidsSent++;
}

// گام AI — از stepSim (فقط سولو و فعال و بیدار).
export function stepAI(state, terrain) {
  if (state.mp && state.mp.enabled) return;
  const ai = state.ai;
  if (!ai || !ai.active || ai.dormant) return;
  stepAiEcon(state);
  // سقوط ستاد = خاموشی (شکست بازیکن از جای دیگر می‌آید).
  const keep = state.buildings.find((b) => b.id === ai.keepId && !b.destroyed);
  if (!keep) {
    ai.dormant = true;
    state.events.push("ستاد حریف ویران شد! حریف دیگر نیروی تازه نمی‌سازد.");
    return;
  }
  if (state.tick < ai.nextThink) return;
  ai.nextThink = state.tick + CONFIG.AI.thinkEvery;
  aiBuild(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H);
  aiRaid(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H);
  const doneLen = (aiPersonality(ai).buildList || CONFIG.AI.buildList).length;
  if (ai.buildIdx >= doneLen && ai.raidsSent >= CONFIG.AI.raids.length) {
    ai.phase = "done";
  }
}
