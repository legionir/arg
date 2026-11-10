// جلوه‌های نمایشی (0.244.0 — C-CLN-28): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { ICON_DATA } from "../icons.gen.js";
import { T_WATER } from "../terrain.js";
import { buildPhase, createRenderer, dayLight, waterPhase, DAY_CYCLE } from "../render.js";
import { completeAll, fresh, grassNear, must, needBarracks, siteNear } from "./fixtures.js";
import { hireUnit, orderMove, spawnUnit, stepCombat } from "../combat.js";
import { placeKeep, tryPlace } from "../construction.js";

function gfxCanvas() {
  const cv = document.createElement("canvas");
  document.body.appendChild(cv);
  return cv;
}
// ردیف C-GFX-1 (0.229.0، فاز ۴): ذره‌موتور — دود/آتش سوختن + گرد راه +
// پاشش قوس روی آب؛ قطعی و سقف‌دار؛ full=همه، balanced=دود+آتش، lite=هیچ.
// __T_GFX_PARTICLES_ROW__
function t_gfx_particles() {
  const f = fresh();
  placeKeep(f.state, f.terrain, f.W, f.H);
  completeAll(f.state);
  const keep = f.state.buildings.find((b) => b.type === "keep" && !b.destroyed);
  keep.fire = 1;
  const cv = gfxCanvas();
  try {
    const R = createRenderer(cv);
    R.resize(); R.fit();
    for (let i = 0; i < 10; i++) { f.state.tick++; R.draw(f.state, f.terrain, null, null, []); }
    const c = R.debugParticles();
    must(c.smoke > 0, "دود سوختن باید باشد");
    must(c.flame > 0, "آتش باید باشد");
    // گرد راه: سرباز به گوشه دور + ۵۰ تیک نبرد + قاب هر تیک
    needBarracks(f.state, f.terrain, f.W, f.H);
    const h = hireUnit(f.state, f.terrain, f.W, f.H, 5, 8, "soldier");
    must(h.ok, "سرباز استخدام شود");
    orderMove(f.state, h.unit, f.W - 2, f.H - 2);
    for (let i = 0; i < 50; i++) { f.state.tick++; stepCombat(f.state, f.terrain); R.draw(f.state, f.terrain, null, null, []); }
    must(R.debugParticles().dust > 0, "گرد راه متحرک باید باشد");
    // پاشش: قوس روی خانه آب
    let wx = -1, wy = -1;
    for (let r = 0; r < f.H && wx < 0; r++) {
      for (let c0 = 0; c0 < f.W; c0++) {
        if (f.terrain[r * f.W + c0] === T_WATER) { wx = c0; wy = r; break; }
      }
    }
    must(wx >= 0, "خانه آب روی نقشه سیدی هست");
    f.state.fx.push({ x0: 10.5, r0: 10.5, x1: wx + 0.5, r1: wy + 0.5, tick: f.state.tick });
    f.state.tick++;
    R.draw(f.state, f.terrain, null, null, []);
    must(R.debugParticles().splash > 0, "پاشش روی آب باید باشد");
    must(R.debugParticles().total <= 240, "سقف ذرات");
    R.setFidelity("lite");
    f.state.tick++;
    R.draw(f.state, f.terrain, null, null, []); // در lite نباید بیفتد
  } finally {
    cv.remove();
  }
  return { name: "ذره‌موتور (C-GFX-1)", pass: true, detail: "دود+آتش+گرد+پاشش" };
}
// ردیف C-GFX-2 (0.229.0، فاز ۴): شب/روز — تابع خالص + ۳ حالت + سلکت DOM؛
// پیش‌فرض روز؛ sim/هش/ذخیره دست‌نخورده.
// __T_GFX_DAYNIGHT_ROW__
function t_gfx_daynight() {
  must(DAY_CYCLE === 3600, "دوره ۳۶۰۰ است");
  must(dayLight(0) === 0 && dayLight(900) === 1 && dayLight(1800) === 0 && dayLight(2700) === 0, "بامداد۰/ظهر۱/غروب۰/نیمه‌شب۰");
  for (let s = 0; s < 3600; s += 100) {
    const v = dayLight(s);
    must(v >= 0 && v <= 1, "نور در ۰..۱ است");
  }
  must(dayLight(-100) >= 0 && dayLight(-100) <= 1, "تیک منفی هم در بازه است");
  const f = fresh();
  placeKeep(f.state, f.terrain, f.W, f.H);
  const cv = gfxCanvas();
  try {
    const R = createRenderer(cv);
    R.resize(); R.fit();
    R.setDayNight("night");
    must(R.getDayNight() === "night", "شب باید ثبت شود");
    R.draw(f.state, f.terrain, null, null, []);
    R.setDayNight("cycle");
    f.state.tick = 900;
    R.draw(f.state, f.terrain, null, null, []);
    R.setDayNight("bogus");
    must(R.getDayNight() === "day", "نامعتبر = روز");
    R.draw(f.state, f.terrain, null, null, []);
  } finally {
    cv.remove();
  }
  const sel = document.getElementById("daySel");
  must(!!sel && sel.options.length === 3, "سلکت شب/روز ۳ گزینه دارد");
  return { name: "شب/روز (C-GFX-2)", pass: true, detail: "خالص + ۳ حالت + DOM" };
}
// ردیف C-GFX-3 (0.229.0، فاز ۴): آب متحرک — فاز خالص + قاب در فازهای کش + کف.
// __T_GFX_WATER_ROW__
function t_gfx_water() {
  must(waterPhase(0, 5, 5) === waterPhase(0, 5, 5), "فاز قطعی است");
  must(waterPhase(0, 5, 5) !== waterPhase(53, 5, 5), "فاز با تیک می‌چرخد");
  must(waterPhase(10, 5, 5) !== waterPhase(10, 6, 5), "فاز با خانه فرق دارد");
  const f = fresh();
  placeKeep(f.state, f.terrain, f.W, f.H);
  const cv = gfxCanvas();
  try {
    const R = createRenderer(cv);
    R.resize(); R.fit();
    for (const tk of [0, 16, 32, 64]) {
      f.state.tick = tk;
      R.draw(f.state, f.terrain, null, null, []);
    }
  } finally {
    cv.remove();
  }
  return { name: "آب متحرک (C-GFX-3)", pass: true, detail: "فاز + ۴ قاب" };
}
// __T_GFX_BUILDSTAGES_ROW__
function t_gfx_buildstages() {
  const def = CONFIG.BUILDINGS.barracks; // buildTime=۸۰
  must(buildPhase(null, def) === 3, "بی‌بنا = تکمیل");
  must(buildPhase({ buildLeft: 0 }, def) === 3, "صفر = تکمیل");
  must(buildPhase({ buildLeft: 10 }, null) === 3, "بی‌تعریف = تکمیل");
  must(buildPhase({ buildLeft: 80 }, def) === 0, "تازه = پی");
  must(buildPhase({ buildLeft: 50 }, def) === 1, "نیمه‌راه = اسکلت");
  must(buildPhase({ buildLeft: 10 }, def) === 2, "پایانی = نزدیک‌تمام");
  must(buildPhase({ buildLeft: 0 }, def) === 3, "پایان = تکمیل");
  const f = fresh();
  placeKeep(f.state, f.terrain, f.W, f.H);
  const site = siteNear(f.terrain, f.state.occ, f.W, f.H, 10, 10, def.w, def.h);
  must(!!site, "جا برای سربازخانه هست");
  const r = tryPlace(f.state, f.terrain, f.W, f.H, site[0], site[1], def);
  must(r.ok, "سربازخانه ساخته شد");
  const b = r.building;
  const cv = gfxCanvas();
  try {
    const R = createRenderer(cv);
    R.resize(); R.fit();
    for (const left of [b.buildLeft, Math.floor(def.buildTime / 2), 1, 0]) {
      b.buildLeft = left;
      f.state.tick++;
      R.draw(f.state, f.terrain, null, null, []);
    }
  } finally {
    cv.remove();
  }
  return { name: "مراحل ساخت (C-GFX-4)", pass: true, detail: "پی/اسکلت/نزدیک/تمام" };
}
// ردیف C-GFX-5 (0.230.0، فاز ۴): سایه نرم واحدها — هر ۳ مسیر (شیت/وکتور/محاصره)
// با دارایی واقعی روی قاب می‌روند و نمی‌افتند.
// __T_GFX_SOFTSHADOW_ROW__
function t_gfx_softshadow() {
  const f = fresh();
  placeKeep(f.state, f.terrain, f.W, f.H);
  completeAll(f.state);
  needBarracks(f.state, f.terrain, f.W, f.H);
  for (const ty of ["soldier", "slave", "arabianBow"]) {
    const h = hireUnit(f.state, f.terrain, f.W, f.H, 5, 8, ty);
    must(h.ok, ty + ": استخدام شود");
  }
  for (const ty of ["ram", "catapult"]) {
    const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
    must(!!g, ty + ": چمن آزاد هست");
    spawnUnit(f.state, ty, g[0] + 0.5, g[1] + 0.5, 0); // ماشین: مستقیم (اعتبارسنجی استخدام ندارد)
  }
  const cv = gfxCanvas();
  try {
    const R = createRenderer(cv);
    R.resize(); R.fit();
    for (const fl of ["full", "balanced", "lite"]) {
      R.setFidelity(fl);
      f.state.tick++;
      R.draw(f.state, f.terrain, null, null, []);
    }
  } finally {
    cv.remove();
  }
  return { name: "سایه نرم (C-GFX-5)", pass: true, detail: "شیت+وکتور+محاصره" };
}
// __T_GFX_ICONS_ROW__
function t_gfx_icons() {
  const keys = ["meat", "cheese", "apples", "wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows", "leather"];
  must(JSON.stringify(Object.keys(ICON_DATA).sort()) === JSON.stringify(keys.slice().sort()), "۱۵ کلید آیکون است");
  const seen = new Set();
  for (const k of keys) {
    const u = ICON_DATA[k];
    must(typeof u === "string" && u.startsWith("data:image/png;base64,iVBOR"), k + ": PNG دیتا-یوآرال است");
    must(u.length > 500, k + ": خالی نیست");
    must(!seen.has(u), k + ": یکتاست");
    seen.add(u);
    const bin = atob(u.split(",")[1]);
    const w = (bin.charCodeAt(16) << 24) | (bin.charCodeAt(17) << 16) | (bin.charCodeAt(18) << 8) | bin.charCodeAt(19);
    const h = (bin.charCodeAt(20) << 24) | (bin.charCodeAt(21) << 16) | (bin.charCodeAt(22) << 8) | bin.charCodeAt(23);
    must(w === 24 && h === 24, k + ": باید ۲۴×۲۴ باشد، شد " + w + "×" + h);
  }
  return { name: "آیکون‌ها (C-GFX-6)", pass: true, detail: "۱۵ کلید + ۲۴×۲۴ + تمایز" };
}
export function gfxCases() {
  return [t_gfx_particles, t_gfx_daynight, t_gfx_water, t_gfx_buildstages, t_gfx_softshadow, t_gfx_icons];
}
