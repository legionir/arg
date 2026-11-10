// بالانس (0.244.0 — C-CLN-29): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { T_GRASS, T_OASIS, T_ROCK, makeTerrain } from "../terrain.js";
import { UNITS, spawnUnit, stepCombat, spawnLord } from "../combat.js";
import { stepEconomy, millSupport } from "../economy.js";
import { stepTraining } from "../train.js";
import { placeKeep, tryPlace } from "../construction.js";
import { AI_OWNER, startAI, stepAI } from "../ai.js";
import { MP_SPAWN_ANCHOR } from "../mp.js";
import { completeAll, fresh, must, sim } from "./fixtures.js";

// --- فاز ۳ بالانس (0.227.0 — نقشه‌راه): ماتریس دوئل + زنجیره اقتصاد ---
// زیرساخت دوئل 1v1 headless (الگوی aiLongRun): دو یگان روبه‌رو، جناح دستی، تا مرگ/سقف.
// جدول کامل ۲۸×۲۸ در research/duel-matrix.md (تولید با scratch/duel.js).
function duel1v1(a, b, cap) {
  const f = fresh();
  const ua = spawnUnit(f.state, a, 10.5, 10.5, 0);
  const ub = spawnUnit(f.state, b, 13.5, 10.5, 9);
  ua.side = "player"; ub.side = "enemy";
  completeAll(f.state);
  const idA = ua.id, idB = ub.id;
  const lim = cap == null ? 3000 : cap;
  let n = 0;
  while (n < lim) {
    f.state.tick++; stepCombat(f.state, f.terrain); n++;
    const la = f.state.units.some((u) => u.id === idA);
    const lb = f.state.units.some((u) => u.id === idB);
    if (!la || !lb) return { w: !la && !lb ? "draw" : (!la ? "B" : "A"), t: n };
  }
  return { w: "timeout", t: -1 };
}

// ردیف C-BAL-1 (0.227.0، فاز ۳): ماتریس دوئل — قطعیت + سلسله‌مراتب + نقش‌ها.
// __T_DUEL_MATRIX_ROW__
function t_duel_matrix() {
  must(Object.keys(UNITS).length === 28, "کاتالوگ ۲۸ واحدی است (واحد تازه = بازسازی ماتریس)");
  const k1 = duel1v1("knight", "crusader"), k2 = duel1v1("knight", "crusader");
  must(k1.w === k2.w && k1.t === k2.t && k1.t > 0, "دوئل قطعی است");
  must(duel1v1("crusader", "knight").w === "A" && duel1v1("knight", "crusader").w === "B", "صلیبی شوالیه را هر دو جهت می‌برد");
  must(duel1v1("knight", "lord").w === "A" && duel1v1("lord", "knight").w === "B", "شوالیه ارباب را هر دو جهت می‌برد");
  must(duel1v1("ballista", "soldier").w === "B", "منجنیق صحرایی بی‌دفاع است (نقش ضدساختمان)");
  must(duel1v1("healer", "slave").w === "B", "شفابخش بی‌آسیب است");
  must(duel1v1("horseArcher", "arabian").w === "A", "سواره عرب را می‌برد (باف 0.227.0)");
  must(duel1v1("assassin", "soldier").w === "A" && duel1v1("soldier", "assassin").w === "B", "قاتل سرباز را هر دو جهت می‌برد (شیشه-توپ تهاجمی)");
  return { name: "ماتریس دوئل (C-BAL-1)", pass: true, detail: "قطعیت + سلسله‌مراتب + نقش‌ها" };
}

// جای‌گذاری نوع‌ساز قطعی (پیمایش سطری + tryPlace): برای زنجیره‌های اقتصاد.
function placeType(st, ter, W, H, type) {
  const def = CONFIG.BUILDINGS[type];
  for (let r = 1; r + def.h < H - 1; r++) {
    for (let c = 1; c + def.w < W - 1; c++) {
      let ok = true;
      for (let rr = r; rr < r + def.h && ok; rr++)
        for (let cc = c; cc < c + def.w; cc++)
          if (ter[rr * W + cc] !== T_GRASS || (st.occ && st.occ[rr * W + cc] === 1)) { ok = false; break; }
      if (!ok) continue;
      if (tryPlace(st, ter, W, H, c, r, def).ok) return true;
    }
  }
  return false;
}

// ردیف C-BAL-3 (0.227.0، فاز ۳): زنجیره‌های اقتصاد — خروجی دقیق ۳۶۰۰ تیک +
// تناسب آسیاب (۱۲ نانوا/۳ مزرعه = hint دفترچه). اعداد مرجع/انحراف در
// research/numbers-registry.md؛ این تست رانش نرخ‌ها را می‌گیرد.
// __T_ECON_CHAIN_ROW__
function t_econ_chain() {
  const f = fresh();
  f.state.workers = 40; f.state.resources.wood = 500;
  for (let i = 0; i < 6; i++) must(placeType(f.state, f.terrain, f.W, f.H, "wheatfarm"), "مزرعه گندم " + i);
  for (let i = 0; i < 2; i++) must(placeType(f.state, f.terrain, f.W, f.H, "mill"), "آسیاب " + i);
  for (let i = 0; i < 2; i++) must(placeType(f.state, f.terrain, f.W, f.H, "bakery"), "نانوایی " + i);
  sim(f.state, 3600);
  must(Math.round(f.state.resources.wheat) === 140, "گندم ۱۴۰ است، شد " + f.state.resources.wheat);
  must(Math.round(f.state.resources.flour) === 500, "آرد سقف ۵۰۰ است، شد " + f.state.resources.flour);
  must(Math.round(f.state.resources.food) === 492, "غذای خالص ۴۹۲ است، شد " + f.state.resources.food);
  const ms = millSupport();
  must(ms.bakers === 12 && ms.farms === 3, "تناسب آسیاب ۱۲/۳ است");
  const g = fresh();
  g.state.workers = 20; g.state.resources.food = 0;
  for (let i = 0; i < 4; i++) must(placeType(g.state, g.terrain, g.W, g.H, "orchard"), "باغ " + i);
  sim(g.state, 3600);
  must(Math.round(g.state.resources.apples) === 499, "سیب خالص ۴۹۹ است، شد " + g.state.resources.apples);
  const h = fresh();
  h.state.workers = 20;
  for (let i = 0; i < 4; i++) must(placeType(h.state, h.terrain, h.W, h.H, "hopsfarm"), "رازک " + i);
  for (let i = 0; i < 2; i++) must(placeType(h.state, h.terrain, h.W, h.H, "brewery"), "آبجوسازی " + i);
  sim(h.state, 3600);
  must(Math.round(h.state.resources.hops) === 362, "رازک ۳۶۲ است، شد " + h.state.resources.hops);
  must(Math.round(h.state.resources.beer) === 358, "آبجو ۳۵۸ است، شد " + h.state.resources.beer);
  return { name: "زنجیره اقتصاد (C-BAL-3)", pass: true, detail: "نان + سیب + آبجو + تناسب" };
}

// --- فاز ۳ بالانس (0.228.0 — نقشه‌راه): تورنمنت شخصیت‌ها + کالیبره سختی + تقارن شروع ---
// بنچمارک رخنه (الگوی aiLongRun/duel1v1): ستاد تنها در برابر یورش AI تا نابودی
// ستاد یا سقف. keep-only = بنچمارک خالص تهاجمی (بدون نویز دفاع)؛ keep+lord =
// واقعی‌تر (ارباب ۱۵۰/۸ دفاع می‌کند). جدول کامل هر دو در research/tournament.md.
function aiBreachRun(pers, diff, withLord, cap) {
  const f = fresh();
  placeKeep(f.state, f.terrain, f.W, f.H);
  if (withLord) spawnLord(f.state, f.terrain, f.W, f.H);
  const s = startAI(f.state, f.terrain, f.W, f.H, diff, pers);
  if (!s.ok) return { err: s.reason };
  completeAll(f.state);
  const keep = f.state.buildings.find((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === 0);
  const keepId = keep.id;
  const lim = cap == null ? 6000 : cap;
  let breach = -1;
  for (let i = 0; i < lim; i++) {
    f.state.tick++;
    stepEconomy(f.state, f.terrain);
    stepTraining(f.state, f.terrain);
    stepCombat(f.state, f.terrain);
    stepAI(f.state, f.terrain);
    const k = f.state.buildings.find((b) => b.id === keepId);
    if (!k || k.destroyed) { breach = f.state.tick; break; }
  }
  const k = f.state.buildings.find((b) => b.id === keepId);
  const aiKeepAlive = f.state.buildings.some((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === AI_OWNER);
  return { breach: breach, keepHp: k && !k.destroyed ? Math.round(k.hp) : 0, raids: f.state.ai.raidsSent, aiKeep: aiKeepAlive };
}

// ردیف C-BAL-4 (0.228.0، فاز ۳): تورنمنت ۷ شخصیت — قطعیت + رخنه همگانی +
// ترتیب تماتیک + سلامت پایگاه AI. دو اصلاح رفتار در همین ردیف (یافته بنچمارک):
// ۱) یورش عرب side=enemy می‌شود (ai.js — پیش از این def.side=player بود و
// یورش به بناهای خودی می‌زد: خودزنی + خودسوزی مشعل + خاموشی AI)؛ ۲) موش
// سربازخانه آخر فهرست گرفت (پیش از این هیچ یورشی نمی‌رفت). بدون این دو،
// عرب/صلاح‌الدین همیشه-بازنده و موش همیشه-تماشاچی بودند.
// __T_TOURNAMENT_ROW__
function t_tournament() {
  const order = ["lion", "saladin", "snake", "wolf", "arabLord", "pig", "rat"];
  const res = {};
  for (const p of order) res[p] = aiBreachRun(p, "normal", false, 6000);
  for (const p of order) must(!res[p].err, p + ": بنچمارک باید شروع شود");
  const w1 = aiBreachRun("wolf", "normal", false, 6000);
  const w2 = aiBreachRun("wolf", "normal", false, 6000);
  must(w1.breach === w2.breach && w1.breach > 0 && w1.raids === w2.raids, "رخنه گرگ قطعی است");
  for (const p of order) must(res[p].breach > 0, p + ": باید رخنه کند، شد " + res[p].breach);
  must(res.lion.breach < res.wolf.breach && res.wolf.breach < res.rat.breach, "ترتیب تماتیک: شیر < گرگ < موش");
  must(res.lion.breach < 2000, "شیر زود می‌شکافد، شد " + res.lion.breach);
  must(res.rat.breach > 2500, "موش دیر می‌شکافد، شد " + res.rat.breach);
  for (const p of order) must(res[p].aiKeep, p + ": ستاد AI باید سالم بماند (بی‌خودزنی)");
  return { name: "تورنمنت شخصیت‌ها (C-BAL-4)", pass: true, detail: "۷ رخنه + قطعیت + ترتیب" };
}

// ردیف C-BAL-5 (0.228.0، فاز ۳): کالیبره سختی با داده رخنه — ترتیب یکنوا +
// باندها. داده (research/tournament.md): آسان ~۳۰۰۰، معمولی ~۲۲۰۰، سخت ~۱۵۶۰؛
// ضریب‌ها بی‌تغییر ماندند (داده همان رفتار موردانتظار را نشان داد — پین‌های
// سختی موجود سبز ماندند، بی‌بازپین).
// __T_DIFFICULTY_CALIBRATION_ROW__
function t_difficulty_calibration() {
  const e = aiBreachRun("wolf", "easy", false, 6000);
  const n = aiBreachRun("wolf", "normal", false, 6000);
  const h = aiBreachRun("wolf", "hard", false, 6000);
  must(!e.err && !n.err && !h.err, "هر ۳ درجه باید شروع شوند");
  must(e.breach > 0 && n.breach > 0 && h.breach > 0, "هر ۳ درجه رخنه می‌کنند");
  must(h.breach < n.breach && n.breach < e.breach, "سخت < معمولی < آسان (" + h.breach + "/" + n.breach + "/" + e.breach + ")");
  must(h.breach < 2000, "سخت زود است، شد " + h.breach);
  must(e.breach > 2500, "آسان دیر است، شد " + e.breach);
  return { name: "کالیبره سختی (C-BAL-5)", pass: true, detail: "یکنوایی + باندها" };
}

// ردیف C-BAL-6 (0.228.0، فاز ۳): تقارن شروع ۲/۳/۴نفره — هر ۴ لنگر در شعاع ۱۲
// دقیقاً منابع یکسان دارند (زمین ۴-متقارن است + لنگرها گوشه‌های آینه‌ای)؛
// پس هر زیرمجموعه (۲/۳/۴ بازیکن) هم متقارن است. خالص (فقط زمین + لنگر).
// __T_SPAWN_SYMMETRY_ROW__
function t_spawn_symmetry() {
  for (const seed of [CONFIG.MAP_SEED, 424242, 987654]) {
    const ter = makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, seed);
    const counts = [];
    for (let s = 0; s < 4; s++) {
      const an = MP_SPAWN_ANCHOR[s];
      let grass = 0, rock = 0, oasis = 0;
      for (let r = 0; r < CONFIG.GRID_H; r++) {
        for (let c = 0; c < CONFIG.GRID_W; c++) {
          if (Math.hypot(c - an[0], r - an[1]) > 12) continue;
          const t = ter[r * CONFIG.GRID_W + c];
          if (t === T_GRASS) grass++;
          else if (t === T_ROCK) rock++;
          else if (t === T_OASIS) oasis++;
        }
      }
      counts.push(grass + "/" + rock + "/" + oasis);
    }
    must(counts.every((x) => x === counts[0]), "سید " + seed + ": هر ۴ لنگر یکسان‌اند (" + counts.join(" ") + ")");
  }
  return { name: "تقارن شروع (C-BAL-6)", pass: true, detail: "۴ لنگر × ۳ سید" };
}

export function balanceCases() {
  return [t_duel_matrix, t_econ_chain, t_tournament, t_difficulty_calibration, t_spawn_symmetry];
}
