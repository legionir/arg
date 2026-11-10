// سوئیت رقابتی (0.236.0 — C-CLN-5): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { makeTerrain } from "../terrain.js";
import { must, fresh, mpFresh, simC, needBarracks } from "./fixtures.js";
import { createState } from "../state.js";
import { tryPlace, validate, placeKeepFor } from "../construction.js";
import { spawnUnit, hireUnit, stepCombat, spawnLord } from "../combat.js";
import { stepEconomy } from "../economy.js";
import { stepTraining } from "../train.js";
import { enableMp, mpClearSpawns, MP_SPAWN_ANCHOR, stateHash, updateMpAlive, lootEliminated } from "../mp.js";

// --- نبرد رقابتی (0.24.0) ---



// 0.70.2: بدون هیچ ورودی، ۴ بازیکن نباید همدیگر را بی‌دخالت از بین ببرند (قبلاً ارباب‌ها از تیک ۰ می‌دویدند).
function t_mp_no_rush() {
  const { terrain, state } = mpFresh(4);
  for (let i = 0; i < 1500; i++) {
    state.tick++;
    stepEconomy(state); stepTraining(state, terrain); stepCombat(state, terrain); updateMpAlive(state);
  }
  const lords = state.units.filter((u) => u.type === "lord" && !u.dead);
  must(lords.length === 4, `هر ۴ ارباب باید زنده بمانند، ${lords.length}`);
  must(state.mpres.every((p) => p.alive) && !state.mp.over, "هیچ بازیکنی بی‌ورودی حذف نمی‌شود");
  const keeps = state.buildings.filter((b) => b.type === "keep");
  must(keeps.length === 4 && keeps.every((b) => b.hp === b.maxHp), "ستادها دست‌نخورده");
  // ارباب‌ها دور از خانه نرفته‌اند
  for (const u of lords) {
    const k = keeps.find((b) => b.owner === u.owner);
    must(Math.abs(u.x - (k.c + 2)) + Math.abs(u.r - (k.r + 2)) < 12, `ارباب ${u.owner} از پایگاه دور شد`);
  }
  return { name: "بدون هجوم خودکار در MP", pass: true, detail: "۱۵۰۰ تیک، ۴ بازیکن" };
}

function t_mp_spawns() {
  const { state } = mpFresh(2);
  const keeps = state.buildings.filter((b) => b.type === "keep");
  must(keeps.length === 2, "دو ستاد باید باشد");
  must(keeps[0].owner !== keeps[1].owner, "مالک‌ها جدا باشند");
  const d = Math.abs(keeps[0].c - keeps[1].c) + Math.abs(keeps[0].r - keeps[1].r);
  must(d > 30, `ستادها باید دور باشند، فاصله=${d}`);
  const lords = state.units.filter((u) => u.type === "lord");
  must(lords.length === 2 && lords[0].owner !== lords[1].owner, "دو ارباب جدا");
  return { name: "اسپاون رقابتی", pass: true, detail: `فاصله ستادها ${d}` };
}

function t_mp_econ_isolation() {
  const { W, H, terrain, state } = mpFresh(2);
  const w0 = state.mpres[0].resources.wood, w1 = state.mpres[1].resources.wood;
  // کلبه نزدیک ستاد بازیکن ۰ (گوشه بالا-چپ)
  const keep0 = state.buildings.find((b) => b.type === "keep" && b.owner === 0);
  const c = keep0.c, r = Math.min(H - 3, keep0.r + keep0.h + 1);
  const res = tryPlace(state, terrain, W, H, c, r, CONFIG.BUILDINGS.hut, 0);
  must(res.ok, "ساخت بازیکن ۰ باید موفق باشد");
  must(state.mpres[0].resources.wood === w0 - 6, "هزینه فقط از بازیکن ۰");
  must(state.mpres[1].resources.wood === w1, "بازیکن ۱ دست‌نخورده");
  // فاصله/یکتا به‌ازای هر مالک: بازیکن ۱ هم کلبه خودش را می‌سازد
  // (نقطه ثابت نزدیک ستاد ۱ گاهی روی آب/سنگ می‌افتد — جست‌وجوی مارپیچ قطعی)
  const keep1 = state.buildings.find((b) => b.type === "keep" && b.owner === 1);
  let r2 = null;
  for (let rad = 1; rad < 10 && !r2; rad++) {
    for (let dr = -rad; dr <= rad && !r2; dr++) {
      for (let dc = -rad; dc <= rad && !r2; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const cc = keep1.c + dc, rr = keep1.r + dr;
        const v = validate(state, terrain, W, H, cc, rr, CONFIG.BUILDINGS.hut, 1);
        if (v.ok) r2 = tryPlace(state, terrain, W, H, cc, rr, CONFIG.BUILDINGS.hut, 1);
      }
    }
  }
  must(r2 && r2.ok, "بازیکن ۱ هم باید بسازد");
  return { name: "اقتصاد جدا", pass: true, detail: "هزینه/ساخت به‌ازای مالک" };
}

function t_mp_combat_targets() {
  const { terrain, state } = mpFresh(2);
  const a = spawnUnit(state, "soldier", 10.5, 10.5, 0);
  const b = spawnUnit(state, "soldier", 11.5, 10.5, 1);
  simC(state, terrain, 60);
  must(a.hp < 60 && b.hp < 60, `دو سرباز دشمن باید بجنگند a=${a.hp} b=${b.hp}`);
  return { name: "نبرد بازیکنان", pass: true, detail: `a=${a.hp} b=${b.hp}` };
}

function t_mp_hash_deterministic() {
  const mk = () => {
    const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
    const terrain = makeTerrain(W, H, CONFIG.MAP_SEED);
    mpClearSpawns(terrain, W, H);
    const state = createState();
    enableMp(state, 2, ["A", "B"]);
    for (let s = 0; s < 2; s++) {
      const an = MP_SPAWN_ANCHOR[s];
      placeKeepFor(state, terrain, W, H, s, an[0], an[1]);
    }
    for (let s = 0; s < 2; s++) spawnLord(state, terrain, W, H, s);
    for (let s = 0; s < 2; s++) needBarracks(state, terrain, W, H, s);
    // استخدام نزدیک ستاد خودی (جست‌وجوی مارپیچ قطعی — مستقل از اندازه نقشه)
    for (let s = 0; s < 2; s++) {
      const keep = state.buildings.find((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === s);
      must(keep, "ستاد باید باشد");
      let hired = false;
      for (let rad = 1; rad < 12 && !hired; rad++) {
        for (let dr = -rad; dr <= rad && !hired; dr++) {
          for (let dc = -rad; dc <= rad && !hired; dc++) {
            if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
            if (hireUnit(state, terrain, W, H, keep.c + dc, keep.r + dr, "soldier", s).ok) hired = true;
          }
        }
      }
      must(hired, "استخدام نزدیک ستاد " + s + " ممکن نشد");
    }
    for (let i = 0; i < 120; i++) { state.tick++; stepEconomy(state); stepCombat(state, terrain); }
    return stateHash(state);
  };
  const h1 = mk(), h2 = mk();
  must(h1 === h2, `هش دو اجرای یکسان باید برابر باشد ${h1}≠${h2}`);
  return { name: "هش قطعی MP", pass: true, detail: h1 };
}

function t_mp_victory() {
  const { state } = mpFresh(2);
  // حذف بازیکن ۱ (ستاد + ارباب)
  for (const b of state.buildings) if (b.owner === 1) b.destroyed = true;
  state.buildings = state.buildings.filter((b) => !b.destroyed);
  state.units = state.units.filter((u) => u.owner !== 1);
  const w = updateMpAlive(state);
  must(w === 0 && state.mp.over, `برنده باید ۰ باشد، هست ${w}`);
  must(state.mpres[0].alive && !state.mpres[1].alive, "زنده/حذف درست باشد");
  return { name: "برد رقابتی", pass: true, detail: "آخرین بازمانده" };
}

// __T_ALLIANCE_ROW129__
// غیبت اتحاد (0.183.0 — §۲/بند 129، vacuous): حالت اتحاد/تیم در MP نیست —
// state.mp خالص FFA است؛ برد = آخرین بازمانده (updateMpAlive)، نه برد مشترک.
function t_alliance_absence_row129() {
  const f = mpFresh(3);
  for (const k of ["team", "teams", "ally", "allies", "alliance", "pact", "sharedWin"]) {
    must(f.state.mp[k] === undefined, "mp نباید " + k + " داشته باشد");
    for (const p of f.state.mpres) must(p[k] === undefined, "بازیکن نباید " + k + " داشته باشد");
  }
  for (const b of f.state.buildings) if (b.owner === 2) b.destroyed = true;
  f.state.buildings = f.state.buildings.filter((b) => !b.destroyed);
  f.state.units = f.state.units.filter((u) => u.owner !== 2);
  const w = updateMpAlive(f.state);
  must(!f.state.mp.over && w === -1, "با دو بازمانده بازی تمام نیست (برد مشترک نیست)");
  must(f.state.mpres[0].alive && f.state.mpres[1].alive && !f.state.mpres[2].alive, "۰/۱ زنده، ۲ حذف");
  return { name: "غیبت اتحاد", pass: true, detail: "FFA ادامه دارد" };
}

// __T_MP_LOOT__
// غنیمت حذف (0.183.0 — §۱۸.۱/بند 871): با حذف یک بازیکن MP، طلای کامل او +
// نصفِ کفِ هر کالای دیگرش بین بازماندگان (مساوی؛ باقیمانده به کمترین اسلات) با
// سقف cap + رویداد. فقط MP (سولو حریف lordدار ندارد).
function t_mp_loot() {
  must(lootEliminated(fresh().state, 0) === null, "بی‌MP غنیمت نیست");
  const elim = (state, slot) => {
    for (const b of state.buildings) if (b.owner === slot) b.destroyed = true;
    state.buildings = state.buildings.filter((b) => !b.destroyed);
    state.units = state.units.filter((u) => u.owner !== slot);
  };
  // ۲نفره: همه غنیمت به تنها بازمانده
  const a = mpFresh(2);
  a.state.mpres[1].resources.gold = 100;
  a.state.mpres[1].resources.wood = 50;
  a.state.mpres[1].resources.stone = 7;
  const g0 = a.state.mpres[0].resources.gold, w0 = a.state.mpres[0].resources.wood, s0 = a.state.mpres[0].resources.stone;
  const ev0 = a.state.events.length;
  elim(a.state, 1);
  must(updateMpAlive(a.state) === 0 && a.state.mp.over, "برنده ۰ و پایان");
  must(a.state.mpres[0].resources.gold === g0 + 100, "طلای کامل به برنده");
  must(a.state.mpres[0].resources.wood === w0 + 25, "نصف چوب (۵۰→۲۵)");
  must(a.state.mpres[0].resources.stone === s0 + 3, "نصف کف سنگ (۷→۳)");
  must(a.state.mpres[1].resources.gold === 0 && a.state.mpres[1].resources.wood === 25, "برداشت از حذف‌شده");
  must(a.state.events.length === ev0 + 1, "یک رویداد غنیمت");
  // ۳نفره: تقسیم مساوی + قطعیت هش
  const mk3 = () => {
    const f = mpFresh(3);
    f.state.mpres[2].resources.gold = 10;
    f.state.mpres[2].resources.wood = 9;
    elim(f.state, 2);
    return f;
  };
  const b = mk3(), c = mk3();
  updateMpAlive(b.state); updateMpAlive(c.state);
  must(stateHash(b.state) === stateHash(c.state), "غنیمت قطعی است");
  must(!b.state.mp.over, "با دو بازمانده پایان نیست");
  must(b.state.mpres[0].resources.gold === 65 && b.state.mpres[1].resources.gold === 65, "طلا ۵/۵");
  must(b.state.mpres[0].resources.wood === 122 && b.state.mpres[1].resources.wood === 122, "چوب ۲/۲");
  return { name: "غنیمت حذف", pass: true, detail: "۲نفره + ۳نفره + قطعیت" };
}
export function mpCases() {
  return [t_mp_spawns, t_mp_econ_isolation, t_mp_combat_targets, t_mp_hash_deterministic, t_mp_victory, t_mp_no_rush, t_alliance_absence_row129, t_mp_loot];
}