// نبرد (0.247.0 — C-CLN-37): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { T_GRASS } from "../terrain.js";
import { UNIT_DATA } from "../units.gen.js";
import { GARRISON_CAP, UNITS, dmgVs, effectiveDmg, unitArmor, deployUnit, demolishBuilding, garrisonUnit, gateOpen, guardPost, hasBarracks, hireUnit, occForSide, orderAttackMove, orderMove, orderRetreat, setGuard, setStance, spawnUnit, toggleGate } from "../combat.js";
import { SaveError, deserialize, deserializeJSON, serializeJSON } from "../persist.js";
import { boxSelectIds } from "../selection.js";
import { findPath } from "../pathfind.js";
import { enableMp, stateHash } from "../mp.js";
import { must, fresh, needBarracks, simC, siteNear, completeAll, grassNear } from "./fixtures.js";
import { tryPlace, validate } from "../construction.js";

// --- MIL-001 ---

function t_combat_range() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  must(h.ok, "استخدام باید موفق باشد");
  spawnUnit(state, "swordsman", 8.5, 5.5); // فاصله ۳ — خارج برد، هر دو نزدیک می‌شوند
  simC(state, terrain, 1);
  const foe = state.units.find((u) => u.type === "swordsman");
  must(foe.hp === 60, `پس از ۱ تیک هنوز نباید خسارت دیده باشد، hp=${foe.hp}`);
  simC(state, terrain, 40);
  must(foe.hp < 60, "پس از نزدیک شدن باید خسارت ببیند");
  const me = state.units.find((u) => u.type === "soldier");
  must(me.hp < 60, "دشمن هم باید پاسخ بدهد");
  return { name: "برد و نزدیک شدن", pass: true, detail: `foe=${foe.hp}، me=${me.hp}` };
}

function t_combat_2v1() {
  const run = () => {
    const { W, H, terrain, state } = fresh();
    needBarracks(state, terrain, W, H);
    hireUnit(state, terrain, W, H, 5, 5, "soldier");
    hireUnit(state, terrain, W, H, 6, 5, "soldier");
    spawnUnit(state, "swordsman", 5.5, 7.5);
    let t = 0;
    while (state.units.some((u) => u.type === "swordsman") && t < 200) {
      simC(state, terrain, 1);
      t++;
    }
    return { t, alive: state.units.filter((u) => u.type === "soldier").length };
  };
  const a = run(), b = run();
  must(a.t === b.t, "مدت نبرد باید قطعی باشد");
  must(a.alive >= 1, "حداقل یک سرباز باید زنده بماند");
  must(a.t > 0 && a.t < 200, `مدت باید معقول باشد، هست ${a.t}`);
  return { name: "نبرد ۲ در برابر ۱", pass: true, detail: `${a.t} تیک، ${a.alive} بازمانده` };
}

// جرقه نبرد (ب-۲، 0.63.0): ضربه تن‌به‌تن = clash در میانه دو مبارز،
// ضربه دوربرد = shot؛ نمایشی ولی قطعی (دو اجرای هم‌سید یک دنباله می‌دهند)،
// خارج هش (stateHash فیلد fx را نمی‌خواند) و خارج ذخیره (serialize فیلدبه‌فیلد).
function t_combat_clash_fx() {
  const run = (type) => {
    const { W, H, terrain, state } = fresh();
    needBarracks(state, terrain, W, H);
    const h = hireUnit(state, terrain, W, H, 5, 5, type);
    must(h.ok, `استخدام ${type} باید موفق باشد، شد ${h.reason}`);
    spawnUnit(state, "swordsman", 6.5, 5.5); // چسبیده: در برد هر دو
    simC(state, terrain, 30);
    return { state, kinds: state.fx.map((f) => f.kind || "arc") };
  };
  const melee = run("soldier");
  must(melee.kinds.some((k) => k === "clash"), "ضربه تن‌به‌تن باید clash ثبت کند");
  const ranged = run("bowman");
  must(ranged.kinds.some((k) => k === "shot"), "ضربه دوربرد (برد ۵٫۵) باید shot ثبت کند");
  // قطعیت سرتاسری با جلوه: هشِ دو اجرای هم‌سید یکسان (fx در هش نیست ولی
  // ضربه‌ها همان‌اند — جلوه نباید واگرایی بسازد).
  const a = run("soldier"), b = run("soldier");
  must(a.kinds.join(",") === b.kinds.join(",") && a.kinds.length > 0, "دنباله جلوه باید قطعی و ناتهی باشد");
  must(stateHash(a.state) === stateHash(b.state), "هش دو اجرای هم‌سید باید یکسان باشد");
  // خارج ذخیره
  must(!serializeJSON(a.state).includes("clash") && !serializeJSON(a.state).includes('"fx"'), "جلوه نباید در ذخیره باشد");
  return { name: "جرقه نبرد", pass: true, detail: "clash + shot + قطعیت + خارج هش/ذخیره" };
}

function t_combat_cleanup() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  spawnUnit(state, "swordsman", 6.5, 5.5);
  simC(state, terrain, 200); // یکی می‌میرد
  must(state.units.length <= 1, "باید حداکثر یک واحد بماند");
  simC(state, terrain, 30); // بدون خطا ادامه یابد
  for (const u of state.units) {
    const okRef = u.targetKind === null ||
      (u.targetKind === "unit" && state.units.some((e) => e.id === u.targetId)) ||
      (u.targetKind === "bld" && state.buildings.some((b) => b.id === u.targetId));
    must(okRef, "ارجاع کهنه نباید بماند");
  }
  return { name: "پاک‌سازی ارجاع مرده", pass: true, detail: `${state.units.length} واحد باقی` };
}

function t_combat_bld() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  spawnUnit(state, "swordsman", 9.5, 6.5);
  let t = 0;
  while (state.buildings.length > 0 && t < 500) {
    simC(state, terrain, 1);
    t++;
  }
  must(state.buildings.length === 0, "کلبه باید ویران شود");
  must(state.events.some((e) => e.includes("ویران")), "رویداد ویرانی باید ثبت شود");
  const v = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.woodcutter);
  must(v.ok, "اشغال باید پس از ویرانی آزاد شود");
  return { name: "ویرانی ساختمان", pass: true, detail: `${t} تیک تا ویرانی` };
}

function t_combat_tower() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.tower);
  spawnUnit(state, "swordsman", 9.5, 6.5); // فاصله ۳: در برد برج، خارج برد شمشیر
  simC(state, terrain, 200);
  must(!state.units.some((u) => u.type === "swordsman"), "شمشیرزن باید کشته شود");
  const tower = state.buildings.find((b) => b.type === "tower");
  must(tower && tower.hp > 150, `برج باید سالم بماند، hp=${tower && tower.hp}`);
  return { name: "دفاع برج", pass: true, detail: `hp برج=${tower.hp}` };
}

// دروازه سربازخانه (0.29.0 سرباز، 0.30.0 سرباز و کماندار): بدون سربازخانه
// سالم خودی، هیچ مزدوری نه؛ ویرانی دوباره قفل می‌کند؛ در MP فقط خودی.
function t_barracks_gate() {
  const { W, H, terrain, state } = fresh();
  state.resources.swords = 5; state.resources.bows = 5; // انبار مهمات (0.44.0)
  must(!hasBarracks(state), "اول نباید سربازخانه باشد");
  const h = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  must(!h.ok && h.reason === "NO_BARRACKS", `بدون سربازخانه باید NO_BARRACKS باشد، شد ${h.reason}`);
  const b = hireUnit(state, terrain, W, H, 5, 5, "bowman");
  must(!b.ok && b.reason === "NO_BARRACKS", `کماندار هم بدون سربازخانه باید NO_BARRACKS باشد، شد ${b.reason}`);
  must(state.resources.food === 120 && state.resources.gold === 60, "رد نباید منابع کم کند");
  must(state.units.length === 0, "واحدی نباید ساخته شود");
  // ساخت واقعی از پالت (نخستین جای آزاد)
  const def = CONFIG.BUILDINGS.barracks;
  let r = null;
  for (let rr = 1; rr + def.h <= H && !r; rr++) {
    for (let cc = 1; cc + def.w <= W && !r; cc++) {
      if (validate(state, terrain, W, H, cc, rr, def).ok) {
        r = tryPlace(state, terrain, W, H, cc, rr, def);
      }
    }
  }
  must(r && r.ok, "سربازخانه باید ساخته شود");
  completeAll(state); // این تست دروازه استخدام است، نه ساخت‌تدریجی (0.39.0)
  must(hasBarracks(state), "حالا باید سربازخانه باشد");
  const h2 = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  must(h2.ok, "با سربازخانه استخدام باید موفق باشد");
  const hb = hireUnit(state, terrain, W, H, 7, 5, "bowman");
  must(hb.ok, "با سربازخانه استخدام کماندار هم باید موفق باشد");
  r.building.destroyed = true;
  must(!hasBarracks(state), "ویران‌شده شمرده نمی‌شود");
  const h3 = hireUnit(state, terrain, W, H, 7, 5, "soldier");
  must(!h3.ok && h3.reason === "NO_BARRACKS", "پس از ویرانی دوباره قفل است");
  // چندنفره: سربازخانه حریف به کار من نمی‌آید
  enableMp(state, 2, ["A", "B"]);
  needBarracks(state, terrain, W, H, 1);
  const g1 = grassNear(terrain, state.occ, W, H, 20, 20);
  must(g1, "باید جای خالی برای تست MP باشد");
  const m0 = hireUnit(state, terrain, W, H, g1[0], g1[1], "soldier", 0);
  must(!m0.ok && m0.reason === "NO_BARRACKS", "سربازخانه حریف به کار من نمی‌آید");
  state.occ[g1[1] * W + g1[0]] = 1; // موقتاً بگیر تا خانه دوم جدا باشد
  const g2 = grassNear(terrain, state.occ, W, H, 22, 20);
  state.occ[g1[1] * W + g1[0]] = 0;
  must(g2, "باید جای دوم برای تست MP باشد");
  const m1 = hireUnit(state, terrain, W, H, g2[0], g2[1], "soldier", 1);
  must(m1.ok, "مالک سربازخانه باید استخدام کند");
  return { name: "دروازه سربازخانه", pass: true, detail: "رد هر دو/ساخت/ویرانی/MP" };
}

// قفل سلاح استخدام (0.44.0 — #۹): بدون شمشیر/کمان NEEDS_WEAPON؛ با آن موفق
// + ۱ واحد کم می‌شود (غذا/طلا دست‌نخورده در همین مسیر آزموده می‌شود).
function t_hire_needs_weapon() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.swords = 0; state.resources.bows = 0; // انبار خالی (نقطه شروع بازی)
  state.resources.food = 200; state.resources.gold = 200;
  const g = grassNear(terrain, state.occ, W, H, 5, 5);
  must(g, "جای استخدام باید باشد");
  let h = hireUnit(state, terrain, W, H, g[0], g[1], "soldier");
  must(!h.ok && h.reason === "NEEDS_WEAPON", `سرباز بدون شمشیر باید NEEDS_WEAPON باشد، شد ${h.reason}`);
  h = hireUnit(state, terrain, W, H, g[0], g[1], "bowman");
  must(!h.ok && h.reason === "NEEDS_WEAPON", `کماندار بدون کمان باید NEEDS_WEAPON باشد، شد ${h.reason}`);
  state.resources.swords = 1;
  h = hireUnit(state, terrain, W, H, g[0], g[1], "soldier");
  must(h.ok, "سرباز با شمشیر باید موفق باشد");
  must(state.resources.swords === 0, "شمشیر باید مصرف شده باشد");
  state.resources.bows = 1;
  const g2 = grassNear(terrain, state.occ, W, H, 8, 5);
  must(g2, "جای دوم باید باشد");
  h = hireUnit(state, terrain, W, H, g2[0], g2[1], "bowman");
  must(h.ok, "کماندار با کمان باید موفق باشد");
  must(state.resources.bows === 0, "کمان باید مصرف شده باشد");
  return { name: "قفل سلاح استخدام", pass: true, detail: "NEEDS_WEAPON + مصرف ۱ واحد" };
}

// گاریسون برج (0.45.0 — #۱۰): ۴ مدافع دوربرد خودی؛ پنجمی FULL؛ پیاده
// NOT_RANGED؛ بنای غیربرج NOT_TOWER؛ تکراریِ همان برج موفقِ بی‌اثر.
function t_garrison_assign() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 500; state.resources.gold = 500; // ۵ کماندار (۲۰غ+۱۵ط هر یک)
  const ts = siteNear(terrain, state.occ, W, H, 10, 10, 3, 3);
  must(ts, "جای برج باید باشد");
  const tr = tryPlace(state, terrain, W, H, ts[0], ts[1], CONFIG.BUILDINGS.tower);
  must(tr.ok, "برج باید ساخته شود");
  completeAll(state);
  const tower = tr.building;
  must(GARRISON_CAP === 4, "سقف گاریسون ۴ است");
  const crew = [];
  for (let i = 0; i < 5; i++) {
    const g = grassNear(terrain, state.occ, W, H, 20 + i * 3, 20);
    must(g, "جای استخدام باید باشد");
    const h = hireUnit(state, terrain, W, H, g[0], g[1], "bowman");
    must(h.ok, "استخدام کماندار باید موفق باشد");
    crew.push(h.unit);
  }
  for (let i = 0; i < 4; i++) {
    const r = garrisonUnit(state, crew[i], tower);
    must(r.ok, `استقرار ${i + 1} باید موفق باشد`);
  }
  must(tower.garrison.length === 4, `گاریسون باید ۴ باشد، هست ${tower.garrison.length}`);
  must(crew[0].x === tower.c + 1.5 && crew[0].r === tower.r + 1.5, "مستقر روی مرکز برج می‌ایستد");
  must(crew[0].garrisonTower === tower.id, "پرچم گاریسون مدافع باید ست باشد");
  const dup = garrisonUnit(state, crew[0], tower);
  must(dup.ok && tower.garrison.length === 4, "تکراری همان برج موفق بی‌اثر است");
  const full = garrisonUnit(state, crew[4], tower);
  must(!full.ok && full.reason === "FULL", `پنجمی باید FULL باشد، شد ${full.reason}`);
  const g2 = grassNear(terrain, state.occ, W, H, 40, 40);
  must(g2, "جای سرباز باید باشد");
  const s = hireUnit(state, terrain, W, H, g2[0], g2[1], "soldier");
  must(s.ok, "استخدام سرباز باید موفق باشد");
  const nr = garrisonUnit(state, s.unit, tower);
  must(!nr.ok && nr.reason === "NOT_RANGED", `پیاده باید NOT_RANGED باشد، شد ${nr.reason}`);
  const hut = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(hut.ok, "کلبه باید ساخته شود");
  completeAll(state);
  const nt = garrisonUnit(state, crew[4], hut.building);
  must(!nt.ok && nt.reason === "NOT_TOWER", `کلبه باید NOT_TOWER باشد، شد ${nt.reason}`);
  return { name: "استقرار گاریسون", pass: true, detail: "۴ مدافع + FULL پنجمی + رد پیاده/کلبه" };
}

// شلیک تقویتی (0.45.0): برج با ۲ گاریسون در ۱۰۰ تیک ≥۲ برابر برج خالی
// خسارت می‌زند (۳ شمشیرزن در برد برج و کمان، بیرون برد شمشیر).
function t_garrison_shoot() {
  const run = (withGar) => {
    const { W, H, terrain, state } = fresh();
    const ts = siteNear(terrain, state.occ, W, H, 10, 10, 3, 3);
    must(ts, "جای برج باید باشد");
    const tr = tryPlace(state, terrain, W, H, ts[0], ts[1], CONFIG.BUILDINGS.tower);
    must(tr.ok, "برج باید ساخته شود");
    completeAll(state);
    const tower = tr.building;
    const cx = tower.c + 1.5, cy = tower.r + 1.5;
    const foes = [];
    for (const [dx, dy] of [[4, 0], [0, 4], [-4, 0]]) {
      foes.push(spawnUnit(state, "swordsman", cx + dx, cy + dy));
    }
    if (withGar) {
      needBarracks(state, terrain, W, H);
      for (let i = 0; i < 2; i++) {
        const g = grassNear(terrain, state.occ, W, H, 30 + i * 2, 30);
        must(g, "جای استخدام باید باشد");
        const h = hireUnit(state, terrain, W, H, g[0], g[1], "bowman");
        must(h.ok, "استخدام باید موفق باشد");
        must(garrisonUnit(state, h.unit, tower).ok, "استقرار باید موفق باشد");
      }
    }
    simC(state, terrain, 100);
    let dealt = 0;
    for (const f of foes) {
      const live = state.units.find((u) => u.id === f.id && !u.dead);
      dealt += live ? (60 - live.hp) : 60;
    }
    return dealt;
  };
  const a = run(false), b = run(true);
  must(a > 0, "برج خالی باید خسارت بزند");
  must(b >= 2 * a, `گاریسون باید ≥۲ برابر بزند: خالی=${a}، با گاریسون=${b}`);
  return { name: "شلیک تقویتی گاریسون", pass: true, detail: `خالی=${a}، گاریسون=${b}` };
}

// آزادی پس از ویرانی (0.45.0): مدافعان زنده با hp حفظ روی ردپای برج،
// موضع engage، بدون دستور — نه گیرکرده.
function t_garrison_post_lost() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const ts = siteNear(terrain, state.occ, W, H, 10, 10, 3, 3);
  must(ts, "جای برج باید باشد");
  const tr = tryPlace(state, terrain, W, H, ts[0], ts[1], CONFIG.BUILDINGS.tower);
  must(tr.ok, "برج باید ساخته شود");
  completeAll(state);
  const tower = tr.building;
  const ids = [];
  for (let i = 0; i < 2; i++) {
    const g = grassNear(terrain, state.occ, W, H, 30 + i * 2, 30);
    must(g, "جای استخدام باید باشد");
    const h = hireUnit(state, terrain, W, H, g[0], g[1], "bowman");
    must(h.ok, "استخدام باید موفق باشد");
    must(garrisonUnit(state, h.unit, tower).ok, "استقرار باید موفق باشد");
    ids.push(h.unit.id);
  }
  demolishBuilding(state, tower); // همان releaseGarrison ویرانی جنگی (تخریب دستی هم آزاد می‌کند)
  must((tower.garrison || []).length === 0, "گاریسون برج ویران باید خالی شود");
  for (const id of ids) {
    const u = state.units.find((x) => x.id === id && !x.dead);
    must(u && u.hp === 40, "مدافع باید زنده با hp کامل باشد");
    must(u.garrisonTower == null, "پرچم گاریسون باید پاک باشد");
    must(u.stance === "engage", "موضع پس از آزادی engage است");
    must(u.x >= tower.c && u.x <= tower.c + tower.w, "آزادشده روی ردپای برج است");
  }
  simC(state, terrain, 1); // جاروی ویرانه + یک تیک بدون گیرکردن
  const freed = state.units.find((x) => x.id === ids[0] && !x.dead);
  const o = orderMove(state, freed, 20, 20);
  must(o.ok, "آزادشده باید دستور بگیرد");
  return { name: "آزادی گاریسون پس از ویرانی", pass: true, detail: "۲ مدافع آزاد + engage" };
}

// ذخیره گاریسون (0.45.0): حفظ فهرست + بازسازی پرچم مدافع؛ قدیمی بدون
// فیلد = خالی (بدون bump).
function t_garrison_save() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const ts = siteNear(terrain, state.occ, W, H, 10, 10, 3, 3);
  must(ts, "جای برج باید باشد");
  const tr = tryPlace(state, terrain, W, H, ts[0], ts[1], CONFIG.BUILDINGS.tower);
  must(tr.ok, "برج باید ساخته شود");
  completeAll(state);
  const g = grassNear(terrain, state.occ, W, H, 30, 30);
  must(g, "جای استخدام باید باشد");
  const h = hireUnit(state, terrain, W, H, g[0], g[1], "bowman");
  must(h.ok, "استخدام باید موفق باشد");
  must(garrisonUnit(state, h.unit, tr.building).ok, "استقرار باید موفق باشد");
  const loaded = deserializeJSON(serializeJSON(state));
  const lt = loaded.buildings.find((b) => b.type === "tower");
  must(lt && lt.garrison.length === 1 && lt.garrison[0] === h.unit.id, "گاریسون باید در ذخیره بماند");
  const lu = loaded.units.find((u) => u.id === h.unit.id);
  must(lu && lu.garrisonTower === lt.id, "پرچم مدافع باید بازسازی شود");
  must(lu.x === lt.c + 1.5 && lu.r === lt.r + 1.5, "مدافع سر مرکز برج می‌ماند");
  const bare = JSON.parse(serializeJSON(state));
  delete bare.buildings.find((b) => b.type === "tower").garrison;
  const legacy = deserialize(bare);
  const ot = legacy.buildings.find((b) => b.type === "tower");
  must(ot && (ot.garrison || []).length === 0, "قدیمی بدون گاریسون = خالی");
  const bad = JSON.parse(serializeJSON(state));
  bad.buildings.find((b) => b.type === "tower").garrison = [1, 2, 3, 4, 5];
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "گاریسون ۵نفره باید SaveError بدهد");
  return { name: "ذخیره گاریسون", pass: true, detail: "حفظ + تحمل قدیمی + رد دست‌کاری" };
}

// یکتایی سربازخانه (0.34.0): دومی UNIQUE است (منابع دست‌نخورده)؛ ویرانی
// راه را باز می‌کند؛ در MP یکتا به‌ازای هر مالک است.
function t_barracks_unique() {
  const { W, H, terrain, state } = fresh();
  state.resources.wood = 500; state.resources.stone = 500;
  const def = CONFIG.BUILDINGS.barracks;
  const free43 = () => {
    for (let r = 1; r + def.h <= H; r++) {
      for (let c = 1; c + def.w <= W; c++) {
        let free = true;
        for (let j = 0; j < def.h && free; j++) {
          for (let i = 0; i < def.w && free; i++) {
            if (terrain[(r + j) * W + (c + i)] !== T_GRASS || state.occ[(r + j) * W + (c + i)] === 1) free = false;
          }
        }
        if (free) return [c, r];
      }
    }
    return null;
  };
  const s1 = free43();
  must(s1, "باید جای ۴×۳ آزاد باشد");
  const r1 = tryPlace(state, terrain, W, H, s1[0], s1[1], def);
  must(r1.ok, "سربازخانه اول باید ساخته شود");
  const s2 = free43();
  must(s2, "باید جای ۴×۳ آزاد دیگری باشد");
  const w0 = state.resources.wood, st0 = state.resources.stone;
  const r2 = tryPlace(state, terrain, W, H, s2[0], s2[1], def);
  must(!r2.ok && r2.reason === "UNIQUE", `دومی باید UNIQUE باشد، شد ${r2.reason}`);
  must(state.resources.wood === w0 && state.resources.stone === st0, "رد نباید منابع کم کند");
  r1.building.destroyed = true;
  const r3 = tryPlace(state, terrain, W, H, s2[0], s2[1], def);
  must(r3.ok, "پس از ویرانی باید دوباره شود ساخت");
  // چندنفره: بازیکن ۱ سربازخانه خودش را می‌سازد، دومی هرکس UNIQUE است
  enableMp(state, 2, ["A", "B"]);
  state.mpres[1].resources.wood = 500; state.mpres[1].resources.stone = 500;
  const s3 = free43();
  must(s3, "باید جای ۴×۳ آزاد برای بازیکن ۱ باشد");
  const m1 = tryPlace(state, terrain, W, H, s3[0], s3[1], def, 1);
  must(m1.ok, "بازیکن ۱ باید سربازخانه خودش را بسازد");
  const s4 = free43();
  must(s4, "باید جای دیگری برای تلاش دوم باشد");
  const m0 = tryPlace(state, terrain, W, H, s4[0], s4[1], def, 0);
  must(!m0.ok && m0.reason === "UNIQUE", `دومی بازیکن ۰ باید UNIQUE باشد، شد ${m0.reason}`);
  return { name: "یکتایی سربازخانه", pass: true, detail: "رد/ویرانی/MP" };
}

function t_hire_cost() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  must(h.ok, "استخدام باید موفق باشد");
  must(state.resources.food === 80 && state.resources.gold === 35,
    `هزینه باید کم شود: ${state.resources.food}، ${state.resources.gold}`);
  state.resources.food = 10;
  const h2 = hireUnit(state, terrain, W, H, 7, 5, "soldier");
  must(!h2.ok && h2.reason === "INSUFFICIENT", "کمبود منابع باید رد شود");
  must(state.resources.food === 10, "منابع نباید کم شود");
  return { name: "هزینه استخدام", pass: true, detail: "کسر + رد INSUFFICIENT" };
}

// کماندار خودی (0.11.0): هزینه غذا/طلا + رد کمبود + چرخه ذخیره نوع جدید.
// (0.14.0): ارزان مثل Archer مرجع — ۲۰غ+۱۵ط.
function t_hire_bowman() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = hireUnit(state, terrain, W, H, 5, 5, "bowman");
  must(h.ok, "استخدام کماندار باید موفق باشد");
  must(h.unit.side === "player" && h.unit.hp === 40, "مشخصات اولیه باید از جدول باشد");
  must(state.resources.food === 100 && state.resources.gold === 45,
    `هزینه باید کم شود: ${state.resources.food}، ${state.resources.gold}`);
  state.resources.gold = 10;
  const h2 = hireUnit(state, terrain, W, H, 7, 5, "bowman");
  must(!h2.ok && h2.reason === "INSUFFICIENT", "کمبود طلا باید رد شود");
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.units.length === 1 && loaded.units[0].type === "bowman",
    "نوع جدید باید در ذخیره بماند");
  return { name: "استخدام کماندار", pass: true, detail: "کسر ۲۰غ+۱۵ط + حفظ در ذخیره" };
}

// فهرست مزدورها (0.36.0): ۱۰ استخدامی (سرباز/کماندار/نیزه‌دار/گرزدار/شوالیه +
// شمشیرزن صلیبی/زوبین‌دار/شمشیرزن عرب/قاتل/کماندار سواره)؛ همه پشت سربازخانه‌اند؛
// هزینه‌ها کسر می‌شوند؛ نوع‌های تازه در ذخیره می‌مانند.
// (0.46.0): ۱۰ مزدور + ۲ ماشین محاصره (دژکوب/منجنیق — پشت همان سربازخانه). (0.167.0): + ۳ یگان انجمن (پشت انجمن خودشان).
// (0.127.0): + راهب جنگجو — پشت کلیسای جامع (NO_CATHEDRAL).
function t_hire_roster() {
  // (0.46.0): ۱۰ مزدور + ۲ ماشین محاصره (دژکوب/منجنیق — پشت همان سربازخانه).
  const hireables = Object.entries(UNITS).filter(([, d]) => d.side === "player" && !d.noHire && d.cost);
    must(hireables.length === 23, `باید ۲۳ قابل‌استخدام باشد، هست ${hireables.length}`);
  for (const [, d] of hireables) {
    must(d.requires === "barracks" || d.requires === "cathedral" || d.requires === "engineerguild" || d.requires === "tunnelerguild", `مزدور ${d.name} باید پیش‌نیاز سربازخانه/جامع/انجمن داشته باشد`);
  }
  {
    const { W, H, terrain, state } = fresh();
    for (const [key, def] of hireables) {
      const want = def.requires === "cathedral" ? "NO_CATHEDRAL" : def.requires === "engineerguild" ? "NO_ENG_GUILD" : def.requires === "tunnelerguild" ? "NO_TUN_GUILD" : "NO_BARRACKS";
      const r = hireUnit(state, terrain, W, H, 5, 5, key);
      must(!r.ok && r.reason === want, `${key} بدون پیش‌نیاز باید ${want} باشد، شد ${r.reason}`);
    }
    must(state.units.length === 0, "واحدی نباید ساخته شود");
  }
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 2000; // کلیسای جامع ۱۰۰۰ طلا (هزینه مرجع 0.147.0)
  needBarracks(state, terrain, W, H);
  const ca = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.cathedral);
  must(ca.ok, "جامع برای فهرست لازم است");
  const es = siteNear(state.terrain || terrain, state.occ, W, H, 12, 1, 3, 2);
  must(!!es, "جای انجمن مهندسین هست");
  const eg = tryPlace(state, terrain, W, H, es[0], es[1], CONFIG.BUILDINGS.engineerguild);
  must(eg.ok, "انجمن مهندسین برای فهرست لازم است");
  const ts = siteNear(state.terrain || terrain, state.occ, W, H, 30, 5, 3, 2);
  must(!!ts, "جای انجمن حفاران هست");
  const tg = tryPlace(state, terrain, W, H, ts[0], ts[1], CONFIG.BUILDINGS.tunnelerguild);
  must(tg.ok, "انجمن حفاران برای فهرست لازم است");
  const ss = siteNear(state.terrain || terrain, state.occ, W, H, 30, 13, 3, 2);
  must(!!ss, "جای اصطبل هست");
  const sb = tryPlace(state, terrain, W, H, ss[0], ss[1], CONFIG.BUILDINGS.stable);
  must(sb.ok, "اصطبل برای فهرست لازم است");
  completeAll(state);
  state.resources.food = 950; state.resources.gold = 2700; // ۲۳ استخدام (۸۵۵غ+۰، ۹۱۲ط+۶۴ط انجمن)
  const spots = [[5, 5], [7, 5], [9, 5], [11, 5], [13, 5], [5, 7], [7, 7], [9, 7], [11, 7], [13, 7], [5, 9], [7, 9], [9, 9], [11, 9], [13, 9], [5, 11], [7, 11], [9, 11], [11, 11], [13, 11]];
  for (let k = spots.length; k < hireables.length; k++) { // جای guildها: چمن قطعی نزدیک ردیف ۱۳
    const g = grassNear(terrain, state.occ, W, H, 5 + (k % 5) * 2, 13);
    must(!!g, "جای استخدام guild هست");
    spots.push(g);
  }
  let i = 0;
  for (const [key, def] of hireables) {
    const f0 = state.resources.food, g0 = state.resources.gold;
    const h = hireUnit(state, terrain, W, H, spots[i][0], spots[i][1], key);
    must(h.ok, `استخدام ${key} باید موفق باشد`);
    must(h.unit.hp === def.hp && h.unit.side === "player", `مشخصات ${key} باید از جدول باشد`);
    must(state.resources.food === f0 - def.cost.food && state.resources.gold === g0 - def.cost.gold,
      `هزینه ${key} باید کم شود`);
    i++;
  }
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.units.length === 23, "هر ۲۳ واحد باید در ذخیره بمانند");
  must(loaded.units.every((u, j) => u.type === hireables[j][0]), "ترتیب و نوع واحدها باید حفظ شود");
  return { name: "فهرست مزدورها", pass: true, detail: "۲۳ استخدام + دروازه + هزینه + ذخیره" };
}

// سیم‌کشی اسپرایت مزدورها (0.36.0): هر استخدامی باید ورودی dataURL معتبر در
// UNIT_DATA داشته باشد تا کارت و نقشه به‌جای دایره وکتوری، اسپرایت واقعی نشان دهند.
// (0.46.0): ماشین‌های محاصره شیت ندارند — وکتوری خالص‌اند (مثل داربست).
  // (0.149.0 — §۱۲.۲/بند ۱۷۷): + برده مشعل‌دار (ارزان‌ترین مزدور) = ۱۴.
  // (0.150.0 — §۱۲.۲): + تربوشه/کماندار عرب/آتش‌افکن = ۱۷.
  // (0.276.0): هر ۱۹ مزدور شیت دارند + ۴ ماشین محاصره تک‌اسپرایت (بدون وکتور).
function t_merc_sprites() {
  const hireables = Object.entries(UNITS).filter(([, d]) => d.side === "player" && !d.noHire && d.cost && !d.siege);
  must(hireables.length === 19, `باید ۱۹ مزدور باشد، هست ${hireables.length}`);
  for (const [key] of hireables) {
    const url = UNIT_DATA[key];
    must(typeof url === "string" && url.startsWith("data:image/png;base64,iVBOR"),
      `${key} باید dataURL شیت PNG داشته باشد`);
    must(url.length > 2000, `شیت ${key} نباید خالی باشد`);
  }
  for (const key of ["ram", "catapult", "trebuchet", "ballista"]) {
    const url = UNIT_DATA[key];
    must(typeof url === "string" && url.startsWith("data:image/png;base64,iVBOR"),
      `${key} باید dataURL تک‌اسپرایت PNG داشته باشد`);
    must(url.length > 1000, `تک‌اسپرایت ${key} نباید خالی باشد`);
  }
  return { name: "اسپرایت مزدورها", pass: true, detail: "۱۹ شیت معتبر + ۴ تک‌اسپرایت محاصره" };
}

// نقش‌های فهرست (0.36.0): قفل‌های طراحی از روی tier کاربر —
// زوبین‌دار پرآسیب‌ترین دورزن با کندترین ریلود؛ قاتل تندترین پیاده؛ صلیبی
// پرجان‌ترین و کندترین پیاده؛ سواره تندترین و گران‌ترین کل فهرست.
// (0.46.0): ماشین‌های محاصره (siege) بیرون نقش‌های مزدورند.
function t_roster_roles() {
  const U = UNITS;
  const ranged = ["bowman", "crossbowman", "horseArcher", "arabianBow", "slinger"];
  for (const k of ranged) must(U[k].range > 2, `${k} باید دورزن باشد`);
  must(U.crossbowman.dmg >= U.bowman.dmg && U.crossbowman.dmg >= U.horseArcher.dmg && U.crossbowman.dmg >= U.slinger.dmg,
    "زوبین‌دار باید پرآسیب‌ترین دورزن باشد");
  must(U.crossbowman.cd > U.bowman.cd && U.crossbowman.cd > U.horseArcher.cd && U.crossbowman.cd > U.slinger.cd,
    "زوبین‌دار باید کندترین ریلود را داشته باشد");
  const speeds = Object.entries(U).filter(([, d]) => d.side === "player" && !d.noHire && d.cost && !d.siege);
  const maxSpeed = Math.max(...speeds.map(([, d]) => d.speed));
  must(U.horseArcher.speed === maxSpeed, "سواره باید تندترین کل فهرست باشد");
  const foot = speeds.filter(([k]) => k !== "horseArcher");
  must(U.assassin.speed === Math.max(...foot.map(([, d]) => d.speed)), "قاتل باید تندترین پیاده باشد");
  must(U.crusader.speed === Math.min(...foot.map(([, d]) => d.speed)), "صلیبی باید کندترین پیاده باشد");
  must(U.crusader.hp === Math.max(...speeds.map(([, d]) => d.hp)), "صلیبی باید پرجان‌ترین مزدور باشد");
  must(U.horseArcher.cost.gold === Math.max(...speeds.map(([, d]) => d.cost.gold)),
    "سواره باید گران‌ترین مزدور باشد");
  return { name: "نقش‌های فهرست", pass: true, detail: "زوبین/قاتل/صلیبی/سواره" };
}

// دوئل دوربرد ایستا (فاصله ۵، هر دو در برد): دشمن می‌میرد، خودی زنده می‌ماند،
// هیچ تماسی رخ نمی‌دهد (minD) و دو اجرا یکسان‌اند (قطعیت).
function t_combat_bowman_range() {
  const run = () => {
    const { W, H, terrain, state } = fresh();
    needBarracks(state, terrain, W, H);
    hireUnit(state, terrain, W, H, 5, 5, "bowman");
    spawnUnit(state, "archer", 10.5, 5.5);
    let t = 0, minD = Infinity;
    while (state.units.some((u) => u.type === "archer") && t < 200) {
      simC(state, terrain, 1);
      t++;
      const a = state.units.find((u) => u.type === "archer");
      const m = state.units.find((u) => u.type === "bowman");
      if (a && m) minD = Math.min(minD, Math.hypot(a.x - m.x, a.r - m.r));
    }
    const m = state.units.find((u) => u.type === "bowman");
    return { t, minD, meHp: m ? m.hp : -1, foeAlive: state.units.some((u) => u.type === "archer") };
  };
  const a = run(), b = run();
  must(!a.foeAlive && a.t < 200, "کماندار دشمن باید بمیرد");
  must(a.meHp > 0 && a.meHp < 40, `خودی باید زنده ولی زخمی باشد، hp=${a.meHp}`);
  must(a.minD > 2, `نبرد باید کاملاً دوربرد باشد، minD=${a.minD}`);
  must(a.t === b.t && a.meHp === b.meHp, "دوئل باید قطعی باشد");
  return { name: "دوئل دوربرد", pass: true, detail: `${a.t} تیک، hp خودی=${a.meHp}` };
}


// انتخاب باکسی (0.40.0 — #۴ از FEATURES): مستطیل، نرمال‌سازی، افزایشی،
// فیلتر مالک/مرگ/دشمن.
function t_boxsel_rect() {
  const { state } = fresh();
  const a = spawnUnit(state, "soldier", 5.5, 5.5, 0);
  const b = spawnUnit(state, "soldier", 7.5, 6.5, 0);
  spawnUnit(state, "soldier", 20.5, 20.5, 0);
  const ids = boxSelectIds(state.units, { c0: 5, r0: 5, c1: 7, r1: 6 }, { owner: 0 });
  must(ids.length === 2 && ids.includes(a.id) && ids.includes(b.id), `باید ۲ یگان بگیرد، گرفت ${ids}`);
  return { name: "باکس مستطیل", pass: true, detail: `ids=${ids}` };
}

function t_boxsel_normalize_add() {
  const { state } = fresh();
  const a = spawnUnit(state, "soldier", 5.5, 5.5, 0);
  spawnUnit(state, "soldier", 7.5, 6.5, 0);
  // گوشه‌ها برعکس داده شوند — باید نرمال شود
  const ids = boxSelectIds(state.units, { c0: 7, r0: 6, c1: 5, r1: 5 }, { owner: 0 });
  must(ids.length === 2, `نرمال‌سازی باید ۲ بگیرد، گرفت ${ids.length}`);
  // افزایشی: اجتماع با قبلی با حفظ ترتیب، بدون تکرار
  const added = boxSelectIds(state.units, { c0: 5, r0: 5, c1: 5, r1: 5 }, { owner: 0, additive: true, prev: [999, a.id] });
  must(added.length === 2 && added[0] === 999 && added[1] === a.id, `اجتماع باید [999,${a.id}] باشد، شد ${added}`);
  return { name: "باکس نرمال+افزایشی", pass: true, detail: `added=${added}` };
}

function t_boxsel_filters() {
  const { state } = fresh();
  spawnUnit(state, "soldier", 5.5, 5.5, 0);
  spawnUnit(state, "soldier", 6.5, 5.5, 1); // مالک دیگر
  spawnUnit(state, "swordsman", 5.5, 6.5); // دشمن
  const dead = spawnUnit(state, "soldier", 6.5, 6.5, 0);
  dead.dead = true;
  const ids = boxSelectIds(state.units, { c0: 5, r0: 5, c1: 6, r1: 6 }, { owner: 0 });
  must(ids.length === 1, `فقط خودیِ زنده: ۱، شد ${ids.length}`);
  return { name: "فیلتر باکس", pass: true, detail: "مالک/مرگ/دشمن بیرون" };
}

// زره رسمی (0.41.0 — #۵ از FEATURES): فرمول max(1, حمله−زره) + اثر در نبرد
// واقعی + پیش‌فرض صفر برای ناشناخته.
function t_armor_formula() {
  must(effectiveDmg(6, 1) === 5, "۶−۱ باید ۵ شود");
  must(effectiveDmg(4, 0) === 4, "زره صفر نباید کم کند");
  must(effectiveDmg(3, 5) === 1, "کف خسارت ۱ است");
  must(effectiveDmg(6, 6) === 1, "زره مساوی حمله هم کف ۱ می‌دهد");
  must(unitArmor({ type: "knight" }) === 3, "شوالیه زره ۳ دارد");
  must(unitArmor({ type: "nope" }) === 0, "نوع ناشناخته زره ۰ دارد");
  return { name: "فرمول زره", pass: true, detail: "max(1,atk−armor)" };
}

function t_armor_strike() {
  const { state, terrain } = fresh();
  const me = spawnUnit(state, "soldier", 5.5, 5.5, 0);
  const foe = spawnUnit(state, "swordsman", 6.5, 5.5);
  simC(state, terrain, 1); // چسبیده: هر دو در همان تیک اول می‌زنند
  must(foe.hp === 55, `شمشیرزن (زره ۱) باید ۵ بخورد، hp=${foe.hp}`);
  must(me.hp === 54, `سرباز (زره ۱) باید ۶ بخورد، hp=${me.hp}`);
  return { name: "زره در نبرد", pass: true, detail: `foe=${foe.hp}، me=${me.hp}` };
}


export function combatCases() {
  return [t_combat_range, t_combat_2v1, t_combat_clash_fx, t_combat_cleanup, t_combat_bld,
    t_combat_tower, t_combat_wall_siege, t_ram_bonus, t_catapult_deploy, t_siege_vs_wall, t_gate_sides, t_gate_mission,
    t_hire_cost, t_barracks_gate, t_barracks_unique, t_hire_bowman, t_hire_roster, t_merc_sprites, t_roster_roles, t_combat_bowman_range,
    t_stance_hold, t_attackmove, t_retreat, t_orders_persist,
    t_boxsel_rect, t_boxsel_normalize_add, t_boxsel_filters,
    t_armor_formula, t_armor_strike, t_hire_needs_weapon,
    t_garrison_assign, t_garrison_shoot, t_garrison_post_lost, t_garrison_save,
    t_gate_open_close, t_gate_closed_siege, t_gate_toggle_invalid, t_gate_persist,
    t_guard_engage, t_guard_leash, t_guard_post_lost, t_guard_persist];
}

// موضع دفاعی (0.12.0): بدون حرکت داوطلبانه ولی ضربه در برد؛ برگشت به تهاجمی
// دوباره تعقیب را فعال می‌کند. مقدار نامعتبر رد می‌شود.
function t_stance_hold() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const me = state.units[0];
  must(me.stance === "engage", "موضع پیش‌فرض باید engage باشد");
  must(setStance(me, "hold").ok && me.stance === "hold", "تغییر موضع باید موفق باشد");
  must(!setStance(me, "fly").ok, "موضع نامعتبر باید رد شود");
  spawnUnit(state, "archer", 9.5, 5.5); // فاصله ۴: بیرون برد سرباز، در برد کماندار
  const x0 = me.x;
  simC(state, terrain, 30);
  must(me.x === x0 && me.r === 5.5, "hold نباید قدم بزند");
  must(me.hp < 60, "کماندار باید سرباز ثابت را بزند");
  must(me.mission === "idle", "بدون دستور، مأموریت idle می‌ماند");
  setStance(me, "engage");
  simC(state, terrain, 30);
  must(me.x !== x0, "engage باید تعقیب را از سر بگیرد");
  return { name: "موضع دفاعی", pass: true, detail: `ثبات + ضربه‌پذیری + تعقیب مجدد` };
}

// حرکت تهاجمی: در راه دشمن را می‌زند و بعد به مقصد می‌رسد (done).
// دشمن کماندار شکننده است چون شمشیرزن 0.14.0 تانک مرجع است و تک‌سرباز را
// می‌برد (نبرد ۱v1 با شمشیرزن در t_combat_2v1 پوشش داده شده).
function t_attackmove() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const me = state.units[0];
  spawnUnit(state, "archer", 8.5, 5.5); // سر راه مقصد (۱۲،۵)
  const o = orderAttackMove(state, me, 12, 5);
  must(o.ok && me.order.kind === "attackmove", "دستور باید attackmove ثبت شود");
  let t = 0;
  while (me.mission === "active" && t < 250) {
    simC(state, terrain, 1);
    t++;
  }
  const foe = state.units.find((u) => u.type === "archer");
  must(me.mission === "done", `باید به مقصد برسد، شد ${me.mission}`);
  must(!foe || foe.hp < 30, "دشمن سر راه باید خسارت دیده باشد");
  return { name: "حرکت تهاجمی", pass: true, detail: `done در ${t} تیک + درگیری` };
}

// عقب‌نشینی: فرار بدون ضدحمله تا done؛ فاصله زیاد می‌شود.
function t_retreat() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 8, 5, "soldier"); // شرق دشمن تا فرار به زمین باز برود، نه دیوار نقشه
  const me = state.units[0];
  spawnUnit(state, "swordsman", 7.5, 5.5);
  const o = orderRetreat(state, me);
  must(o.ok && me.order.kind === "retreat", "دستور باید retreat ثبت شود");
  const d0 = Math.hypot(me.x - 7.5, me.r - 5.5);
  let t = 0;
  while (me.mission === "active" && t < 120) {
    simC(state, terrain, 1);
    t++;
  }
  const foe = state.units.find((u) => u.type === "swordsman");
  const d1 = Math.hypot(me.x - foe.x, me.r - foe.r);
  must(me.mission === "done", `عقب‌نشینی باید تمام شود، شد ${me.mission}`);
  must(d1 > d0, `فاصله باید زیاد شود: ${d0.toFixed(2)} → ${d1.toFixed(2)}`);
  must(foe.hp === 60, "حین فرار نباید ضدحمله شود");
  return { name: "عقب‌نشینی", pass: true, detail: `done در ${t} تیک` };
}

// ذخیره موضع و دستورهای جدید + تحمل نسخه قدیم + رد دست‌کاری.
function t_orders_persist() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const me = state.units[0];
  setStance(me, "hold");
  orderAttackMove(state, me, 9, 6);
  const loaded = deserializeJSON(serializeJSON(state));
  const lu = loaded.units[0];
  must(lu.stance === "hold", "موضع باید حفظ شود");
  must(lu.order && lu.order.kind === "attackmove" && lu.order.c === 9, "نوع دستور باید حفظ شود");
  // تحمل: ذخیره قدیمی بدون stance/elapsed
  const bare = JSON.parse(serializeJSON(state));
  delete bare.units[0].stance;
  delete bare.units[0].order.elapsed;
  const tolerant = deserialize(bare);
  must(tolerant.units[0].stance === "engage", "stance غایب باید engage شود");
  must(tolerant.units[0].order.elapsed === 0, "elapsed غایب باید ۰ شود");
  // رد: موضع/نوع نامعتبر
  for (const twist of [
    (b) => { b.units[0].stance = "fly"; },
    (b) => { b.units[0].order.kind = "teleport"; },
    (b) => { b.units[0].order.elapsed = -1; },
  ]) {
    const bad = JSON.parse(serializeJSON(state));
    twist(bad);
    let ok = true;
    try { deserialize(bad); } catch { ok = false; }
    must(!ok, "دست‌کاری موضع/دستور باید رد شود");
  }
  return { name: "ذخیره دستورها", pass: true, detail: "حفظ + تحمل + ۳ رد" };
}

// دشمن نزدیک‌ترین بنا را می‌زند: دیوار سپر کلبه می‌شود، ویرانی‌اش اشغال را
// آزاد می‌کند و می‌توان سر جایش دوباره دیوار چسباند (کلبه هنوز لنگر است).
// دژکوب (0.46.0 — #۱۷): ضد دروازه ≥۲ برابر شمشیرزن واقعی در ۴۰ تیک
// (۷۲ در برابر ۲۸)؛ ضد یگان نصف (فرمول)؛ فقط ساختمان را هدف می‌گیرد
// (شمشیرزن مجاور سالم می‌ماند). نبرد MP: دروازه مالک ۰، مهاجمان مالک ۱.
function t_ram_bonus() {
  must(dmgVs(UNITS.ram, "bld") === 24, "دژکوب ضد ساختمان ۲۴ (۸×۳) است");
  must(dmgVs(UNITS.ram, "unit") === 4, "دژکوب ضد یگان نصف (۸/۲) است");
  must(dmgVs(UNITS.soldier, "bld") === 6, "پیاده عادی ضریب ندارد");
  const run = (kind) => {
    const { W, H, terrain, state } = fresh();
    enableMp(state, 2, ["A", "B"]);
    state.mpres[0].resources.wood = 500;
    state.mpres[1].resources.wood = 500;
    state.mpres[1].resources.food = 500;
    state.mpres[1].resources.gold = 500;
    const hs = siteNear(terrain, state.occ, W, H, 10, 10, 2, 2);
    must(hs, "جای کلبه باید باشد");
    must(tryPlace(state, terrain, W, H, hs[0], hs[1], CONFIG.BUILDINGS.hut, 0).ok, "کلبه باید ساخته شود");
    const gx = hs[0] + 2, gy = hs[1]; // چسبیده به ضلع شرقی کلبه
    const gr = tryPlace(state, terrain, W, H, gx, gy, CONFIG.BUILDINGS.gate, 0);
    must(gr.ok, "دروازه باید ساخته شود");
    completeAll(state);
    const gate = gr.building;
    const g = grassNear(terrain, state.occ, W, H, gx + 1, gy);
    must(g, "جای مهاجم باید باشد");
    if (kind === "ram") {
      needBarracks(state, terrain, W, H, 1);
      const h = hireUnit(state, terrain, W, H, g[0], g[1], "ram", 1);
      must(h.ok, `استخدام دژکوب باید موفق باشد، شد ${h.reason}`);
    } else {
      spawnUnit(state, "swordsman", g[0] + 0.5, g[1] + 0.5, 1);
    }
    const atk = state.units[state.units.length - 1];
    const dGate = Math.hypot(atk.x - (gx + 0.5), atk.r - (gy + 0.5));
    must(dGate <= 1.7, `مهاجم باید چسبیده به دروازه باشد، فاصله=${dGate}`);
    // مزاحم دور از دروازه (تا خسارتش قاطی نشود): شمشیرزن مالک ۰ در گوشه نقشه —
    // دژکوب فقط ساختمان را هدف می‌گیرد پس او سالم می‌ماند.
    const fg = grassNear(terrain, state.occ, W, H, 50, 50);
    must(fg, "جای مزاحم باید باشد");
    const foe = spawnUnit(state, "swordsman", fg[0] + 0.5, fg[1] + 0.5, 0);
    simC(state, terrain, 40);
    const liveFoe = state.units.find((u) => u.id === foe.id && !u.dead);
    return { dealt: 80 - gate.hp, foeHp: liveFoe ? liveFoe.hp : -1 };
  };
  const a = run("swordsman"), b = run("ram");
  must(a.dealt === 28, `شمشیرزن باید ۲۸ بزند، زد ${a.dealt}`);
  must(b.dealt === 72, `دژکوب باید ۷۲ بزند، زد ${b.dealt}`);
  must(b.dealt >= 2 * a.dealt, `دژکوب باید ≥۲ برابر بزند: ${b.dealt} در برابر ${a.dealt}`);
  must(b.foeHp === 60, `مزاحم مجاور باید سالم بماند، hp=${b.foeHp}`);
  return { name: "ضریب دژکوب", pass: true, detail: `دروازه: دژکوب=${b.dealt}، شمشیرزن=${a.dealt}` };
}

// منجنیق (0.46.0 — #۱۷): سیار = حرکتِ بی‌شلیک؛ مستقر = شلیک آزاد با برد
// بلند (۱۰) ولی حداقل برد ۳؛ قوس پرتاب ثبت می‌شود؛ فرمان = جمع‌کردن.
// هدف solo: کلبه حریف AI (مالک ۹).
function t_catapult_deploy() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 500; state.resources.gold = 500;
  state.ai.resources.wood = 500;
  const hs = siteNear(terrain, state.occ, W, H, 10, 10, 2, 2);
  must(hs, "جای کلبه حریف باید باشد");
  must(tryPlace(state, terrain, W, H, hs[0], hs[1], CONFIG.BUILDINGS.hut, 9).ok, "کلبه حریف باید ساخته شود");
  completeAll(state);
  const hut = state.buildings.find((b) => (b.owner == null ? 0 : b.owner) === 9);
  const hx = hut.c + 1, hy = hut.r + 1;
  const g = grassNear(terrain, state.occ, W, H, Math.round(hx + 6), Math.round(hy));
  must(g, "جای منجنیق باید باشد");
  const h = hireUnit(state, terrain, W, H, g[0], g[1], "catapult");
  must(h.ok, `استخدام منجنیق باید موفق باشد، شد ${h.reason}`);
  const cat = h.unit;
  const d0 = Math.hypot(cat.x - hx, cat.r - hy);
  must(d0 >= 3 && d0 <= 10, `فاصله باید در برد (۳..۱۰) باشد، هست ${d0}`);
  const x0 = cat.x, r0 = cat.r;
  simC(state, terrain, 30);
  must(hut.hp === 100, "سیار نباید شلیک کند");
  must(cat.x === x0 && cat.r === r0, "سیارِ در برد می‌ایستد");
  must(deployUnit(state, cat).ok && cat.deployed, "استقرار باید موفق باشد");
  simC(state, terrain, 80);
  must(hut.hp === 80, `مستقر باید ۲۰ بزند (۲×۱۰)، hp=${hut.hp}`);
  must(state.fx.length > 0, "قوس پرتاب باید ثبت شود");
  must(cat.x === x0 && cat.r === r0, "مستقر جابه‌جا نمی‌شود (سرعت ۰)");
  const o = orderMove(state, cat, Math.min(62, Math.round(x0) + 15), Math.min(62, Math.round(r0) + 12));
  must(o.ok && !cat.deployed, "فرمان باید جمع کند");
  let t = 0;
  while (cat.mission === "active" && t < 400) {
    simC(state, terrain, 1);
    t++;
  }
  must(cat.mission === "done", `سیار باید به مقصد برسد، شد ${cat.mission}`);
  must(Math.hypot(cat.x - x0, cat.r - r0) > 5, "سیار باید واقعاً جابه‌جا شده باشد");
  // حداقل برد ۳: چسبیده به کلبه دوم، مستقر = سکوت
  const hs2 = siteNear(terrain, state.occ, W, H, 40, 40, 2, 2);
  must(hs2, "جای کلبه دوم باید باشد");
  must(tryPlace(state, terrain, W, H, hs2[0], hs2[1], CONFIG.BUILDINGS.hut, 9).ok, "کلبه دوم باید ساخته شود");
  completeAll(state);
  const hut2 = state.buildings.find((b) => (b.owner == null ? 0 : b.owner) === 9 && b.id !== hut.id);
  cat.x = hut2.c + 1 + 2; cat.r = hut2.r + 1; // فاصله ۲ < حداقل ۳
  must(deployUnit(state, cat).ok && cat.deployed, "استقرار دوم باید موفق باشد");
  simC(state, terrain, 60);
  must(hut2.hp === 100, `زیر حداقل برد نباید بزند، hp=${hut2.hp}`);
  // ذخیره استقرار
  const loaded = deserializeJSON(serializeJSON(state));
  const lc = loaded.units.find((u) => u.id === cat.id);
  must(lc && lc.deployed === true, "استقرار باید در ذخیره بماند");
  return { name: "استقرار منجنیق", pass: true, detail: "سکوت سیار + شلیک مستقر + حداقل برد + ذخیره" };
}

// دیوار در برابر محاصره (0.46.0): دژکوب دیوار حریف را در بودجه ۸۰۰ تیک
// (بودجه t_combat_wall_siege) می‌اندازد — خیلی زودتر.
function t_siege_vs_wall() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 500; state.resources.gold = 500;
  state.ai.resources.wood = 500;
  const hs = siteNear(terrain, state.occ, W, H, 10, 10, 2, 2);
  must(hs, "جای کلبه حریف باید باشد");
  must(tryPlace(state, terrain, W, H, hs[0], hs[1], CONFIG.BUILDINGS.hut, 9).ok, "کلبه حریف باید ساخته شود");
  const wx = hs[0] + 2, wy = hs[1]; // چسبیده به ضلع شرقی کلبه
  must(tryPlace(state, terrain, W, H, wx, wy, CONFIG.BUILDINGS.wall, 9).ok, "دیوار حریف باید ساخته شود");
  completeAll(state);
  const g = grassNear(terrain, state.occ, W, H, wx + 1, wy);
  must(g, "جای دژکوب باید باشد");
  const h = hireUnit(state, terrain, W, H, g[0], g[1], "ram");
  must(h.ok, `استخدام دژکوب باید موفق باشد، شد ${h.reason}`);
  const ram = h.unit;
  const wall = state.buildings.find((b) => b.type === "wall");
  const hut = state.buildings.find((b) => b.type === "hut");
  const dW = Math.hypot(ram.x - (wall.c + 0.5), ram.r - (wall.r + 0.5));
  const dH = Math.hypot(ram.x - (hut.c + 1), ram.r - (hut.r + 1));
  must(dW < dH, `دیوار باید نزدیک‌ترین هدف باشد: دیوار=${dW}، کلبه=${dH}`);
  let t = 0;
  while (state.buildings.some((b) => b.type === "wall") && t < 800) {
    simC(state, terrain, 1);
    t++;
  }
  must(!state.buildings.some((b) => b.type === "wall"), "دیوار باید در ۸۰۰ تیک بیفتد");
  must(t <= 100, `دژکوب باید خیلی زودتر بزند، شد ${t} تیک`);
  must(state.occ[wy * W + wx] === 0, "اشغال باید پس از ویرانی آزاد شود");
  return { name: "دژکوب ضد دیوار", pass: true, detail: `${t} تیک تا ویرانی` };
}

function t_combat_wall_siege() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut); // ردپا (۵-۶،۵-۶)
  tryPlace(state, terrain, W, H, 7, 5, CONFIG.BUILDINGS.wall); // چسبیده به ضلع شرقی
  spawnUnit(state, "swordsman", 9.5, 5.5); // نزدیک‌ترین بنا دیوار است
  let t = 0;
  while (state.buildings.some((b) => b.type === "wall") && t < 800) {
    simC(state, terrain, 1);
    t++;
  }
  must(!state.buildings.some((b) => b.type === "wall"), "دیوار باید ویران شود");
  must(state.occ[5 * W + 7] === 0, "اشغال باید پس از ویرانی آزاد شود");
  must(state.events.some((e) => e.includes("دیوار سنگی") && e.includes("ویران")),
    "رویداد ویرانی دیوار باید ثبت شود");
  const v = tryPlace(state, terrain, W, H, 7, 5, CONFIG.BUILDINGS.wall);
  must(v.ok, "پس از ویرانی باید بتوان سر جایش دیوار چسباند");
  return { name: "محاصره دیوار", pass: true, detail: `${t} تیک تا ویرانی + آزادی اشغال` };
}

// دید دوطرفه: occ واقعی همیشه اشغال است (ساخت/استخدام)؛ فقط مسیریابی خودی
// دروازه را باز می‌بیند. بدون دروازه همان مرجع برمی‌گردد (بدون کپی بیهوده).
function t_gate_sides() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.wall);
  tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.gate);
  const gi = 1 * W + 4, wi = 1 * W + 3;
  must(state.occ[gi] === 1, "occ دروازه باید اشغال بماند");
  must(occForSide(state, "player")[gi] === 0, "خودی دروازه را باز می‌بیند");
  must(occForSide(state, "enemy")[gi] === 1, "دشمن دروازه را بسته می‌بیند");
  must(occForSide(state, "player")[wi] === 1, "دیوار برای خودی هم بسته است");
  const { state: bare } = fresh();
  must(occForSide(bare, "player") === bare.occ, "بدون دروازه باید همان مرجع برگردد");
  return { name: "دید دوطرفه دروازه", pass: true, detail: "خودی باز / دشمن بسته" };
}

// حلقه محاصره با تنها روزنه دروازه: سرباز خودی بیرون می‌آید (done) ولی
// برای دشمن هیچ مسیری به داخل نیست (null). روی محوطه شروع (همه چمن).
function t_gate_mission() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const wall = CONFIG.BUILDINGS.wall, gate = CONFIG.BUILDINGS.gate;
  tryPlace(state, terrain, W, H, 1, 6, CONFIG.BUILDINGS.hut); // (۱-۲،۶-۷)
  for (const [c, r] of [[3, 6], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3], [6, 3],
      [6, 4], [6, 5], [4, 5], [4, 4]]) {
    const res = tryPlace(state, terrain, W, H, c, r, wall);
    must(res.ok, `دیوار زنجیره (${c},${r}) باید ساخته شود`);
  }
  const g = tryPlace(state, terrain, W, H, 5, 5, gate); // تنها روزنه، ضلع جنوبی
  must(g.ok, "دروازه باید به زنجیره بچسبد");
  hireUnit(state, terrain, W, H, 5, 4, "soldier"); // داخل حلقه
  const me = state.units[0];
  orderMove(state, me, 5, 7); // بیرون حلقه
  let t = 0;
  while (me.mission === "active" && t < 200) {
    simC(state, terrain, 1);
    t++;
  }
  must(me.mission === "done", `سرباز باید از دروازه بیرون بیاید، شد ${me.mission}`);
  const foe = findPath(terrain, occForSide(state, "enemy"), W, H, 5, 8, 5, 4);
  must(foe === null, "دشمن نباید راهی به داخل حلقه داشته باشد");
  const pal = findPath(terrain, occForSide(state, "player"), W, H, 5, 8, 5, 4);
  must(pal && pal.some(([c, r]) => c === 5 && r === 5), "مسیر خودی باید از دروازه بگذرد");
  return { name: "گذر از دروازه", pass: true, detail: `done در ${t} تیک + دشمن null` };
}

// --- دروازه باز/بسته‌شونده (0.13.0) ---

// پیش‌فرض باز + چرخه بستن/بازگشایی؛ occ واقعی همیشه اشغال می‌ماند.
function t_gate_open_close() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  const g = tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.gate);
  must(g.ok, "دروازه باید به کلبه بچسبد");
  const gate = g.building;
  must(gate.open !== false && gateOpen(gate), "دروازه نو باید باز باشد");
  const gi = 1 * W + 3;
  must(occForSide(state, "player")[gi] === 0, "باز: خودی گذر می‌کند");
  const t1 = toggleGate(state, gate);
  must(t1.ok && gate.open === false && !gateOpen(gate), "بستن باید موفق باشد");
  must(occForSide(state, "player")[gi] === 1, "بسته: خودی هم بسته می‌بیند");
  must(occForSide(state, "enemy")[gi] === 1, "بسته: دشمن بسته می‌بیند");
  must(state.occ[gi] === 1, "occ واقعی همیشه اشغال می‌ماند");
  must(state.events.some((e) => e.includes("بسته")), "رویداد بستن باید ثبت شود");
  const t2 = toggleGate(state, gate);
  must(t2.ok && gate.open === true, "بازگشایی باید موفق باشد");
  must(occForSide(state, "player")[gi] === 0, "پس از بازگشایی گذر برمی‌گردد");
  return { name: "باز/بسته دروازه", pass: true, detail: "پیش‌فرض باز + چرخه کامل" };
}

// حلقه محاصره با دروازه بسته: سرباز خودی شکست می‌خورد (failed) و هیچ مسیری
// نیست؛ با بازگشایی، گذر برمی‌گردد. دشمن در هر دو حالت پشت دیوار می‌ماند.
function t_gate_closed_siege() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const wall = CONFIG.BUILDINGS.wall, gate = CONFIG.BUILDINGS.gate;
  tryPlace(state, terrain, W, H, 1, 6, CONFIG.BUILDINGS.hut);
  for (const [c, r] of [[3, 6], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3], [6, 3],
      [6, 4], [6, 5], [4, 5], [4, 4]]) {
    const res = tryPlace(state, terrain, W, H, c, r, wall);
    must(res.ok, `دیوار زنجیره (${c},${r}) باید ساخته شود`);
  }
  const g = tryPlace(state, terrain, W, H, 5, 5, gate);
  must(g.ok, "دروازه باید به زنجیره بچسبد");
  must(toggleGate(state, g.building).ok, "بستن دروازه باید موفق باشد");
  must(findPath(terrain, occForSide(state, "player"), W, H, 5, 8, 5, 4) === null,
    "با دروازه بسته خودی هم راهی به داخل ندارد");
  must(findPath(terrain, occForSide(state, "enemy"), W, H, 5, 8, 5, 4) === null,
    "دشمن نباید راهی به داخل داشته باشد");
  hireUnit(state, terrain, W, H, 5, 4, "soldier"); // داخل حلقه
  const me = state.units[0];
  orderMove(state, me, 5, 7); // بیرون حلقه
  simC(state, terrain, 10);
  must(me.mission === "failed", `مأموریت محال باید failed شود، شد ${me.mission}`);
  must(toggleGate(state, g.building).ok, "بازگشایی باید موفق باشد");
  const pal = findPath(terrain, occForSide(state, "player"), W, H, 5, 8, 5, 4);
  must(pal && pal.some(([c, r]) => c === 5 && r === 5), "پس از بازگشایی مسیر از دروازه می‌گذرد");
  return { name: "محاصره با دروازه بسته", pass: true, detail: "failed + بازگشت گذر" };
}

// تغییر وضعیت نامعتبر: دروازه ویران‌شده و ساختمان غیردروازه رد می‌شوند.
function t_gate_toggle_invalid() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  const w = tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.wall);
  must(w.ok, "دیوار باید ساخته شود");
  const g = tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.gate);
  must(g.ok, "دروازه باید ساخته شود");
  must(!toggleGate(state, w.building).ok, "دیوار قابل باز/بسته نیست");
  must(!toggleGate(state, null).ok, "null باید رد شود");
  // ویرانی واقعی در نبرد: دو شمشیرزن چسبیده به دروازه تا آوار شود.
  spawnUnit(state, "swordsman", 4.5, 2.5);
  spawnUnit(state, "swordsman", 5.5, 2.5);
  let t = 0;
  while (!g.building.destroyed && t < 600) { simC(state, terrain, 1); t++; }
  must(g.building.destroyed, "دروازه باید در نبرد ویران شود");
  must(!toggleGate(state, g.building).ok, "دروازه ویران‌شده قابل تغییر نیست");
  must(!gateOpen(g.building), "ویران‌شده گذرگاه نیست");
  return { name: "رد تغییر نامعتبر", pass: true, detail: `ویرانی در ${t} تیک + رد` };
}

// ذخیره وضعیت دروازه: بسته می‌ماند؛ ذخیره قدیمی بدون open یعنی باز؛
/// مقدار خراب رد می‌شود.
function t_gate_persist() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  const g = tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.gate);
  must(g.ok, "دروازه باید ساخته شود");
  toggleGate(state, g.building);
  const loaded = deserializeJSON(serializeJSON(state));
  const lg = loaded.buildings.find((b) => b.type === "gate");
  must(lg && lg.open === false, "دروازه بسته باید بسته بماند");
  must(occForSide(loaded, "player")[1 * W + 3] === 1, "بارگذاری‌شده بسته را سد می‌بیند");
  // تحمل ذخیره قدیمی (بدون open) → باز
  const old = JSON.parse(serializeJSON(state));
  for (const b of old.buildings) delete b.open;
  const legacy = deserialize(old);
  const og = legacy.buildings.find((b) => b.type === "gate");
  must(og && og.open !== false, "ذخیره قدیمی باید باز تلقی شود");
  // دست‌کاری → خطا
  const badData = JSON.parse(serializeJSON(state));
  badData.buildings.find((b) => b.type === "gate").open = "yes";
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "open خراب باید SaveError بدهد");
  return { name: "ذخیره دروازه", pass: true, detail: "بسته می‌ماند + تحمل قدیمی + رد خراب" };
}

// --- نگهبانی از ساختمان (0.15.0) ---

// درگیری با مزاحمِ در شعاع پاسگاه: سرباز پاسگاه کلبه را ترک می‌کند، کماندار
// مهاجم را می‌کشد و مأموریت idle می‌ماند (نگهبانی وضعیت است).
function t_guard_engage() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه باید ساخته شود");
  hireUnit(state, terrain, W, H, 3, 1, "soldier");
  const me = state.units[0];
  must(setGuard(state, me, h.building).ok, "گماشتن نگهبان باید موفق باشد");
  must(me.stance === "guard" && guardPost(state, me) === h.building, "موضع و پاسگاه باید ثبت شود");
  must(!setGuard(state, me, null).ok, "پاسگاه نامعتبر باید رد شود");
  spawnUnit(state, "archer", 5.5, 2.5); // فاصله ۳٫۵ از مرکز پاسگاه (۲،۲) — در شعاع
  simC(state, terrain, 80);
  const foe = state.units.find((u) => u.type === "archer");
  must(!foe, "کماندار مهاجم باید کشته شود");
  must(me.mission === "idle", "نگهبانی مأموریت فعال نمی‌سازد");
  const d = Math.hypot(me.x - 2, me.r - 2);
  must(d <= 7, `نگهبان باید نزدیک پاسگاه بماند، فاصله=${d.toFixed(2)}`);
  must(state.events.some((e) => e.includes("نگهبانی")), "رویداد گماشتن باید ثبت شود");
  return { name: "درگیری نگهبان", pass: true, detail: "کشته شدن مهاجم + ماندن در قلمرو" };
}

// افسار: دشمنِ بیرون شعاع نادیده گرفته می‌شود — نگهبان سر پست می‌ایستد و
// مزاحم دست‌نخورده می‌ماند (با شمشیرزن کند: ۱۰ تیک برای نرسیدن به شعاع کافی است).
function t_guard_leash() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه باید ساخته شود");
  hireUnit(state, terrain, W, H, 3, 1, "soldier");
  const me = state.units[0];
  setGuard(state, me, h.building);
  spawnUnit(state, "swordsman", 12.5, 2.5); // فاصله ۱۰٫۵ از پاسگاه — بیرون شعاع
  const x0 = me.x, r0 = me.r;
  simC(state, terrain, 10);
  const foe = state.units.find((u) => u.type === "swordsman");
  must(foe && foe.hp === 60, "مزاحم دور باید دست‌نخورده بماند");
  must(me.x === x0 && me.r === r0, "نگهبان نباید پست را ترک کند");
  must(me.mission === "idle", "مأموریت باید idle بماند");
  return { name: "افسار نگهبان", pass: true, detail: "بی‌اعتنایی به دشمن دور" };
}

// از دست رفتن پاسگاه (ویرانی واقعی): بازگشت خودکار به engage + پاک شدن ارجاع.
function t_guard_post_lost() {
  const { W, H, terrain, state } = fresh();
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه باید ساخته شود");
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 4, "bowman");
  const me = state.units[0];
  setGuard(state, me, h.building);
  spawnUnit(state, "swordsman", 3.5, 1.5);
  spawnUnit(state, "swordsman", 3.5, 2.5);
  let t = 0;
  while (state.buildings.length > 0 && t < 600) { simC(state, terrain, 1); t++; }
  must(state.buildings.length === 0, "کلبه باید ویران شود");
  simC(state, terrain, 5); // فرصت یک گام پس از ویرانی تا بازگشت ثبت شود
  must(me.stance === "engage" && me.guardBld == null, "نگهبان باید تهاجمی شود");
  must(state.events.some((e) => e.includes("تهاجمی")), "رویداد بازگشت باید ثبت شود");
  return { name: "از دست رفتن پاسگاه", pass: true, detail: `ویرانی در ${t} تیک + بازگشت` };
}

// ذخیره نگهبانی: موضع + پاسگاه حفظ می‌شود؛ قدیمی بدون guardBld → null؛
// خراب (guardBld/stance) → SaveError.
function t_guard_persist() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه باید ساخته شود");
  hireUnit(state, terrain, W, H, 3, 1, "soldier");
  setGuard(state, state.units[0], h.building);
  const loaded = deserializeJSON(serializeJSON(state));
  const lu = loaded.units[0];
  must(lu.stance === "guard" && lu.guardBld === h.building.id, "موضع و پاسگاه باید حفظ شوند");
  must(guardPost(loaded, lu) !== null, "پاسگاه بارگذاری‌شده باید زنده باشد");
  const old = JSON.parse(serializeJSON(state));
  delete old.units[0].guardBld;
  must(deserialize(old).units[0].guardBld == null, "قدیمی بدون guardBld یعنی null");
  for (const patch of [(d) => { d.units[0].guardBld = "x"; }, (d) => { d.units[0].stance = "fly"; }]) {
    const badData = JSON.parse(serializeJSON(state));
    patch(badData);
    let threw = false;
    try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
    must(threw, "دست‌کاری نگهبانی باید SaveError بدهد");
  }
  return { name: "ذخیره نگهبانی", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}
