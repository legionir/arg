// اعتبارسنجی ساخت (0.246.0 — C-CLN-35): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { T_GRASS, terrainPins } from "../terrain.js";
import { SaveError, deserialize, deserializeJSON, serializeJSON } from "../persist.js";
import { capFor, housingCap, stepEconomy, workersNeeded } from "../economy.js";
import { completeAll, fresh, grassNear, must, rawTicks, simC } from "./fixtures.js";
import { createQueue, enqueueCmd, queueLen, stepSim } from "../sim.js";
import { demolishBuilding, demolishRefund, hasBarracks, hireUnit, spawnUnit, stepCombat, validateDemolish } from "../combat.js";
import { placeKeep, tryPlace, validate } from "../construction.js";
import { isCellWalkable } from "../pathfind.js";

// --- CONST-001: اعتبارسنجی ساخت (۵ تست اولین گام ایده — تا حالا پوشش صفر بود) ---

function t_const_bounds() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut, tower = CONFIG.BUILDINGS.tower;
  let v = validate(state, terrain, W, H, -1, 5, hut);
  must(!v.ok && v.reason === "OUT_OF_BOUNDS", "x منفی باید OUT_OF_BOUNDS باشد");
  v = validate(state, terrain, W, H, W - 1, H - 1, hut); // ردپای ۲×۲ بیرون می‌زند
  must(!v.ok && v.reason === "OUT_OF_BOUNDS", "ردپای بیرون‌زده باید OUT_OF_BOUNDS باشد");
  v = validate(state, terrain, W, H, W - 2, H - 2, tower); // ردپای ۳×۳ بیرون
  must(!v.ok && v.reason === "OUT_OF_BOUNDS", "برج بیرون‌زده باید OUT_OF_BOUNDS باشد");
  must(state.rejected === 0, "validate خشک نباید شمارنده را تکان دهد");
  const r = tryPlace(state, terrain, W, H, W - 1, H - 1, hut);
  must(!r.ok && state.rejected === 1, "tryPlace ناموفق باید rejected را بشمارد");
  return { name: "مرز نقشه", pass: true, detail: "۳ رد + شمارنده" };
}

function t_const_terrain() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut;
  const pins = terrainPins(W, H);
  must(terrain[pins.lake[1] * W + pins.lake[0]] !== T_GRASS, "پیش‌فرض: دریاچه آب است");
  let v = validate(state, terrain, W, H, pins.lake[0], pins.lake[1], hut);
  must(!v.ok && v.reason === "TERRAIN", "ساخت روی آب باید TERRAIN باشد");
  v = validate(state, terrain, W, H, pins.rock[0], pins.rock[1], hut); // توده سنگ
  must(!v.ok && v.reason === "TERRAIN", "ساخت روی سنگ باید TERRAIN باشد");
  return { name: "زمین نامناسب", pass: true, detail: "آب + سنگ رد شدند" };
}

function t_const_occupied() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut;
  tryPlace(state, terrain, W, H, 1, 1, hut);
  let v = validate(state, terrain, W, H, 1, 1, hut);
  must(!v.ok && v.reason === "OCCUPIED", "خانه اشغال‌شده باید OCCUPIED باشد");
  v = validate(state, terrain, W, H, 0, 0, hut); // ردپا (۱،۱) را می‌پوشاند، لنگر آزاد
  must(!v.ok && v.reason === "OCCUPIED", "هم‌پوشانی جزئی باید OCCUPIED باشد");
  v = validate(state, terrain, W, H, 2, 2, hut); // لنگر داخل بنا
  must(!v.ok && v.reason === "OCCUPIED", "لنگر داخل بنا باید OCCUPIED باشد");
  return { name: "اشغال و هم‌پوشانی", pass: true, detail: "۳ حالت رد شدند" };
}

function t_const_priority() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut, tower = CONFIG.BUILDINGS.tower;
  // کلبه روی چمن نزدیک ساحل دریاچه (جست‌وجوی پویا، مستقل از اندازه نقشه)
  const pins = terrainPins(W, H);
  const shore = grassNear(terrain, null, W, H, pins.lake[0], pins.lake[1]);
  must(shore, "باید چمن نزدیک دریاچه باشد");
  let hutAt = null;
  for (let rad = 0; rad < 12 && !hutAt; rad++) {
    for (let dr = -rad; dr <= rad && !hutAt; dr++) {
      for (let dc = -rad; dc <= rad && !hutAt; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const cc = shore[0] + dc, rr = shore[1] + dr;
        if (validate(state, terrain, W, H, cc, rr, hut).ok) hutAt = [cc, rr];
      }
    }
  }
  must(hutAt, "باید جای کلبه نزدیک ساحل باشد");
  tryPlace(state, terrain, W, H, hutAt[0], hutAt[1], hut);
  // ردپای برج که هم آب را بپوشاند هم کلبه را → زمین بر اشغال مقدم است
  let found = null;
  for (let dr = -3; dr <= 1 && !found; dr++) {
    for (let dc = -3; dc <= 1 && !found; dc++) {
      const cc = hutAt[0] + dc, rr = hutAt[1] + dr;
      if (cc < 0 || rr < 0 || cc + 3 > W || rr + 3 > H) continue;
      let coversWater = false, coversHut = false;
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const x = cc + i, y = rr + j;
          if (terrain[y * W + x] !== T_GRASS) coversWater = true;
          if (x >= hutAt[0] && x < hutAt[0] + 2 && y >= hutAt[1] && y < hutAt[1] + 2) coversHut = true;
        }
      }
      if (coversWater && coversHut) {
        const chk = validate(state, terrain, W, H, cc, rr, tower);
        if (!chk.ok && chk.reason === "TERRAIN") found = [cc, rr];
      }
    }
  }
  must(found, "باید برجی باشد که هم آب هم کلبه را بپوشاند");
  const v = validate(state, terrain, W, H, found[0], found[1], tower);
  must(!v.ok && v.reason === "TERRAIN", `زمین بر اشغال مقدم است، شد ${v.reason}`);
  // مرز بر همه چیز مقدم است
  const w = validate(state, terrain, W, H, W - 2, H - 2, tower);
  must(!w.ok && w.reason === "OUT_OF_BOUNDS", "مرز باید بر همه مقدم باشد");
  return { name: "اولویت دلایل", pass: true, detail: "مرز > زمین > اشغال" };
}

function t_const_ok() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  must(r.ok && r.building.id === 1, "ساخت معتبر باید موفق باشد");
  must(r.building.hp === CONFIG.BUILDINGS.woodcutter.hp, "HP اولیه باید از جدول باشد");
  must(state.placed === 1, "placed باید ۱ شود");
  must(state.resources.wood === 105, `هزینه چوب‌بری (۱۵) باید کم شود، هست ${state.resources.wood}`);
  const v = validate(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(!v.ok && v.reason === "OCCUPIED", "اشغال باید بلافاصله پس از ساخت اعمال شود");
  return { name: "ساخت معتبر", pass: true, detail: "id=1، کسر ۱۵ چوب، اشغال آنی" };
}

function t_const_cost() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut, tower = CONFIG.BUILDINGS.tower;
  tryPlace(state, terrain, W, H, 1, 1, hut); // ۶ چوب (هزینه مرجع 0.147.0)
  must(state.resources.wood === 114, "هزینه کلبه باید کم شود");
  state.resources.wood = 5;
  const v = validate(state, terrain, W, H, 4, 1, hut);
  must(!v.ok && v.reason === "INSUFFICIENT", "کمبود چوب باید INSUFFICIENT باشد");
  const before = state.rejected;
  const r = tryPlace(state, terrain, W, H, 4, 1, hut);
  must(!r.ok && state.resources.wood === 5, "رد نباید منابع کم کند");
  must(state.rejected === before + 1, "رد باید شمرده شود");
  state.resources.wood = 100;
  state.resources.gold = 5;
  const g = validate(state, terrain, W, H, 5, 5, tower); // برج ۳۰ چوب + ۱۰ طلا می‌خواهد
  must(!g.ok && g.reason === "INSUFFICIENT", "کمبود طلا هم باید INSUFFICIENT باشد");
  return { name: "هزینه ساخت", pass: true, detail: "کسر + رد چوب/طلا" };
}

function t_const_spacing() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut, tower = CONFIG.BUILDINGS.tower;
  const wc = CONFIG.BUILDINGS.woodcutter;
  tryPlace(state, terrain, W, H, 1, 1, wc);
  let v = validate(state, terrain, W, H, 4, 1, wc); // فاصله ۱ — مجاز
  must(v.ok, "چوب‌بری با فاصله ۱ باید معتبر باشد");
  v = validate(state, terrain, W, H, 3, 1, wc); // چسبیده (فاصله ۰)
  must(!v.ok && v.reason === "SPACING", `چوب‌بری چسبیده باید SPACING باشد، شد ${v.reason}`);
  tryPlace(state, terrain, W, H, 5, 5, tower);
  v = validate(state, terrain, W, H, 8, 8, tower); // فاصله چبی‌شف ۰ (گوشه‌به‌گوشه)
  must(!v.ok && v.reason === "SPACING", "برج نزدیک باید SPACING باشد");
  v = validate(state, terrain, W, H, 1, 4, hut); // کلبه قانون فاصله ندارد
  must(v.ok, "کلبه چسبیده باید معتبر باشد (بدون قانون خاص)");
  return { name: "قانون فاصله", pass: true, detail: "SPACING چوب‌بری/برج + معافیت کلبه" };
}

// برج سنگ می‌خواهد (0.18.0: ۲۰چ+۱۰ط+۱۰سنگ): کسر هر سه + رد کمبود سنگ.
function t_const_tower_stone() {
  const { W, H, terrain, state } = fresh();
  const tower = CONFIG.BUILDINGS.tower;
  state.resources.stone = 5; // چوب و طلا کافی‌اند
  const v = validate(state, terrain, W, H, 5, 5, tower);
  must(!v.ok && v.reason === "INSUFFICIENT", "کمبود سنگ باید INSUFFICIENT باشد");
  state.resources.stone = 40;
  const r = tryPlace(state, terrain, W, H, 5, 5, tower);
  must(r.ok, "برج با منابع شروع باید ساخته شود");
  must(state.resources.wood === 100 && state.resources.gold === 50 && state.resources.stone === 30,
    `هر سه باید کم شوند: ${state.resources.wood}، ${state.resources.gold}، ${state.resources.stone}`);
  return { name: "هزینه سنگی برج", pass: true, detail: "رد + کسر ۲۰چ+۱۰ط+۱۰سنگ" };
}

export function constCases() {
  return [t_const_bounds, t_const_terrain, t_const_occupied, t_const_priority, t_const_ok,
    t_const_cost, t_const_tower_stone,
    t_const_cost, t_const_spacing, t_const_wall_anchor, t_const_wall_chain, t_const_wall_blocks, t_stockpile_adjoin,
    t_const_gate_anchor,
    t_build_time, t_build_mill_waits, t_build_tower_offline, t_build_barracks_gate, t_build_save,
    t_demolish, t_demolish_refund, t_demolish_refund_cap, t_demolish_keep, t_demolish_queue];
}

// --- ساخت تدریجی و تخریب دستی (0.39.0 — FEATURES #۳) ---

// کلبه (۳۰ تیک): نیمه‌کاره مسکن نمی‌دهد و کارگر نمی‌خواهد؛ پس از تکمیل +۸.
function t_build_time() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  must(r.ok, "کلبه باید ساخته شود");
  must(r.building.buildLeft === 30, `buildLeft باید ۳۰ باشد، هست ${r.building.buildLeft}`);
  must(state.resources.wood === 114, "هزینه همان اول کسر می‌شود");
  rawTicks(state, 29);
  must(r.building.buildLeft === 1, `باید ۱ مانده باشد، هست ${r.building.buildLeft}`);
  must(housingCap(state) === 4, "نیمه‌کاره مسکن نمی‌دهد");
  rawTicks(state, 1);
  must(r.building.buildLeft === 0, "باید تکمیل شود");
  must(housingCap(state) === 12, "پس از تکمیل +۸ مسکن");
  return { name: "ساخت تدریجی کلبه", pass: true, detail: "۳۰ تیک بدون مسکن، بعد +۸" };
}

// آسیاب (۶۰ تیک): نیمه‌کاره نه کارگر می‌خواهد نه مصرف/تولید؛ بعد ۲←۲.
function t_build_mill_waits() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.mill);
  must(r.ok, "آسیاب باید ساخته شود");
  must(workersNeeded(r.building) === 0, "نیمه‌کاره کارگر نمی‌خواهد");
  rawTicks(state, 60);
  must(r.building.buildLeft === 0, "باید تکمیل شود");
  must(workersNeeded(r.building) === 3, "پس از تکمیل ۳ کارگر");
  must(state.resources.wheat === 20 && state.resources.flour === 0, "در ساخت چیزی مصرف/تولید نشود");
  rawTicks(state, 15);
  must(state.resources.wheat === 18, `گندم باید ۱۸ باشد، هست ${state.resources.wheat}`);
  must(state.resources.flour === 2, `آرد باید ۲ باشد، هست ${state.resources.flour}`);
  return { name: "انتظار آسیاب", pass: true, detail: "۶۰ تیک سکوت، بعد ۲گندم←۲آرد" };
}

// برج (۱۰۰ تیک): نیمه‌کاره شلیک نمی‌کند ولی خودش هدف است و ضربه می‌خورد.
function t_build_tower_offline() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.tower);
  spawnUnit(state, "swordsman", 9.5, 6.5);
  for (let i = 0; i < 50; i++) { state.tick++; stepEconomy(state); stepCombat(state, terrain); }
  const foe = state.units.find((u) => u.type === "swordsman");
  must(foe && foe.hp === 60, `دشمن باید سالم بماند، hp=${foe && foe.hp}`);
  const tower = state.buildings.find((b) => b.type === "tower");
  must((tower.buildLeft || 0) === 50, `باید ۵۰ مانده باشد، هست ${tower.buildLeft}`);
  must(tower.hp < 250, "نیمه‌کاره باید ضربه بخورد");
  completeAll(state);
  for (let i = 0; i < 150 && state.units.some((u) => u.type === "swordsman"); i++) {
    state.tick++; stepEconomy(state); stepCombat(state, terrain);
  }
  must(!state.units.some((u) => u.type === "swordsman"), "پس از تکمیل باید بکشد");
  return { name: "برج نیمه‌کاره شلیک نمی‌کند", pass: true, detail: "۵۰ تیک سکوت + ضربه‌پذیری، بعد کشتار" };
}

// سربازخانه نیمه‌کاره استخدام نمی‌دهد؛ پس از تکمیل می‌دهد.
function t_build_barracks_gate() {
  const { W, H, terrain, state } = fresh();
  state.resources.swords = 5; state.resources.bows = 5; // انبار مهمات (0.44.0)
  const def = CONFIG.BUILDINGS.barracks;
  let r = null;
  for (let rr = 1; rr + def.h <= H && !r; rr++) {
    for (let cc = 1; cc + def.w <= W && !r; cc++) {
      if (validate(state, terrain, W, H, cc, rr, def).ok) r = tryPlace(state, terrain, W, H, cc, rr, def);
    }
  }
  must(r && r.ok, "سربازخانه باید ساخته شود");
  must(!hasBarracks(state), "نیمه‌کاره سربازخانه حساب نیست");
  const h = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  must(!h.ok && h.reason === "NO_BARRACKS", `باید NO_BARRACKS باشد، شد ${h.reason}`);
  completeAll(state);
  must(hasBarracks(state), "پس از تکمیل باید حساب باشد");
  must(hireUnit(state, terrain, W, H, 5, 5, "soldier").ok, "پس از تکمیل استخدام باید موفق باشد");
  return { name: "سربازخانه نیمه‌کاره", pass: true, detail: "رد استخدام تا تکمیل" };
}

// buildLeft در ذخیره می‌ماند؛ قدیمی بدون آن = تکمیل؛ منفی رد می‌شود.
function t_build_save() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  rawTicks(state, 5);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.buildings[0].buildLeft === 25, `باید ۲۵ بماند، هست ${loaded.buildings[0].buildLeft}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.buildings[0].buildLeft;
  must(deserialize(old).buildings[0].buildLeft === 0, "قدیمی یعنی تکمیل");
  const bad = JSON.parse(serializeJSON(state));
  bad.buildings[0].buildLeft = -1;
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "buildLeft منفی باید SaveError بدهد");
  return { name: "ذخیره ساخت نیمه‌کاره", pass: true, detail: "حفظ ۲۵ + پیش‌فرض ۰ + رد منفی" };
}

// تخریب دستی: ویرانی + آزادی زمین + غرامت یک‌سوم (ب-۱، 0.62.0) + رویداد جدا.
function t_demolish() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  must(r.ok, "کلبه باید ساخته شود");
  completeAll(state);
  const v = validateDemolish(state, r.building.id);
  must(v.ok, "تخریب کلبه خودی باید معتبر باشد");
  demolishBuilding(state, v.building);
  must(r.building.destroyed, "باید ویران شود");
  must(state.resources.wood === 117, `غرامت کلبه ۳ چوب است (۱۱۴+۳): ${state.resources.wood}`);
  must(state.events.some((e) => e.includes("تخریب")), "رویداد تخریب باید ثبت شود");
  const r2 = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.woodcutter);
  must(r2.ok, "زمین باید آزاد شود");
  return { name: "تخریب دستی", pass: true, detail: "ویرانی + آزادی + غرامت ۳چ" };
}

// غرامت چندمنبعی (ب-۱): برج (۲۰چ+۱۰ط+۱۰سنگ) → ۶چ+۳ط+۳سنگ؛ فرمول خالص.
function t_demolish_refund() {
  const ref = demolishRefund("tower");
  must(ref.wood === 10 && ref.gold === 5 && ref.stone === 5, `فرمول برج: ${JSON.stringify(ref)}`);
  must(JSON.stringify(demolishRefund("wall")) === `{"wood":1}`, "دیوار (۲چ) → ۱چ غرامت");
  must(demolishRefund("hut").wood === 3, "کلبه → ۳چ");
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.tower);
  must(r.ok, "برج باید ساخته شود");
  completeAll(state);
  must(state.resources.wood === 100 && state.resources.gold === 50 && state.resources.stone === 30, "کسر هزینه برج");
  demolishBuilding(state, r.building);
  must(state.resources.wood === 110 && state.resources.gold === 55 && state.resources.stone === 35,
    `غرامت برج: ${state.resources.wood}، ${state.resources.gold}، ${state.resources.stone}`);
  return { name: "غرامت تخریب چندمنبعی", pass: true, detail: "فرمول + ۱۰چ+۵ط+۵سنگ" };
}

// غرامت با سقف (ب-۱): نزدیک سقف پر → تخریب غرامت را در سقف می‌تراشد، نه بیشتر.
function t_demolish_refund_cap() {
  const { W, H, terrain, state } = fresh();
  const cap = capFor(state, "wood");
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  must(r.ok, "کلبه باید ساخته شود");
  completeAll(state);
  state.resources.wood = cap - 1; // نزدیک سقف (غرامت ۳ واحدی سرریز می‌کند)
  demolishBuilding(state, r.building);
  must(state.resources.wood === cap, `غرامت نباید از سقف (${cap}) بگذرد: ${state.resources.wood}`);
  return { name: "سقف غرامت تخریب", pass: true, detail: `تراش در سقف ${cap}` };
}

// ستاد قابل تخریب نیست (وگرنه شکست خودخواسته می‌شد).
function t_demolish_keep() {
  const { W, H, terrain, state } = fresh();
  const r = placeKeep(state, terrain, W, H);
  must(r.ok, "ستاد باید ساخته شود");
  const v = validateDemolish(state, r.building.id);
  must(!v.ok && v.reason === "KEEP", `باید KEEP باشد، شد ${v.reason}`);
  must(!r.building.destroyed, "ستاد باید سالم بماند");
  return { name: "منع تخریب ستاد", pass: true, detail: "KEEP + سلامت" };
}

// مسیر صف سولو: فرمان تخریب در تیک بعد اجرا می‌شود.
function t_demolish_queue() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  must(r.ok, "کلبه باید ساخته شود");
  completeAll(state);
  const q = createQueue();
  must(enqueueCmd(q, { kind: "demolish", bld: r.building.id }, state.tick).ok, "فرمان باید در صف برود");
  stepSim(state, terrain, 2, q);
  must(r.building.destroyed, "باید پس از تخلیه صف ویران شود");
  must(queueLen(q) === 0, "صف باید خالی شود");
  return { name: "تخریب از صف فرمان", pass: true, detail: "enqueue → تخلیه → ویرانی" };
}

// --- دروازه (0.10.0): لنگر اتصال مثل دیوار + هزینه ---

function t_const_gate_anchor() {
  const { W, H, terrain, state } = fresh();
  const gate = CONFIG.BUILDINGS.gate;
  let v = validate(state, terrain, W, H, 5, 5, gate);
  must(!v.ok && v.reason === "ANCHOR", `دروازه تنها باید ANCHOR باشد، شد ${v.reason}`);
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut); // ۶ چوب (هزینه مرجع 0.147.0)
  const r = tryPlace(state, terrain, W, H, 3, 1, gate); // چسبیده به (۲،۱)
  must(r.ok && r.building.hp === 80, "HP اولیه دروازه باید ۸۰ باشد");
  must(state.resources.wood === 110, `چوب باید ۱۱۰ باشد، هست ${state.resources.wood}`);
  return { name: "لنگر دروازه", pass: true, detail: "ANCHOR تنها + کسر ۴ چوب" };
}

// چسبیدگی گسترش انبار (فاز ۱ بند ۲۸): اولی آزاد، دومی به بعد چسبیده به هم‌نوع
// سالم خودی؛ ویرانه و بنای دشمن و همسایگی قطری لنگر نیستند.
function t_stockpile_adjoin() {
  const { W, H, terrain, state } = fresh();
  const sp = CONFIG.BUILDINGS.stockpile, gr = CONFIG.BUILDINGS.granary;
  must(sp.rules && sp.rules.anchorToSame === true, "انبار باید قانون چسبیدگی هم‌نوع داشته باشد");
  must(gr.rules && gr.rules.anchorToSame === true, "انبار غذا باید قانون چسبیدگی هم‌نوع داشته باشد");
  must(tryPlace(state, terrain, W, H, 1, 1, sp).ok, "انبار اول آزاد است");
  let v = validate(state, terrain, W, H, 8, 1, sp);
  must(!v.ok && v.reason === "ANCHOR", `انبار دوم دور باید ANCHOR باشد، شد ${v.reason}`);
  v = validate(state, terrain, W, H, 4, 4, sp);
  must(!v.ok && v.reason === "ANCHOR", "همسایگی قطری لنگر نیست");
  must(tryPlace(state, terrain, W, H, 3, 1, sp).ok, "انبار دوم چسبیده (۳،۱) باید ساخته شود");
  must(tryPlace(state, terrain, W, H, 1, 4, gr).ok, "انبار غذای اول آزاد است (نوع دیگر لنگر نیست)");
  v = validate(state, terrain, W, H, 8, 4, gr);
  must(!v.ok && v.reason === "ANCHOR", "انبار غذای دوم دور باید ANCHOR باشد");
  must(tryPlace(state, terrain, W, H, 3, 4, gr).ok, "انبار غذای دوم چسبیده باید ساخته شود");
  for (const b of state.buildings) if (b.type === "stockpile") b.destroyed = true;
  simC(state, terrain, 1);
  v = validate(state, terrain, W, H, 8, 8, sp);
  must(v.ok, "پس از ویرانی همه، انبارِ دورِ بعدی باید آزاد باشد");
  return { name: "چسبیدگی انبار", pass: true, detail: "اولی آزاد + ANCHOR دور/قطری + ویرانه لنگر نیست" };
}

// --- دیوار سنگی (0.9.0): قانون اتصال، انسداد مسیر، محاصره ---

function t_const_wall_anchor() {
  const { W, H, terrain, state } = fresh();
  const wall = CONFIG.BUILDINGS.wall, hut = CONFIG.BUILDINGS.hut;
  let v = validate(state, terrain, W, H, 5, 5, wall);
  must(!v.ok && v.reason === "ANCHOR", `دیوار تنها باید ANCHOR باشد، شد ${v.reason}`);
  tryPlace(state, terrain, W, H, 1, 1, hut); // ردپا (۱-۲،۱-۲)، ۶ چوب (هزینه مرجع 0.147.0)
  v = validate(state, terrain, W, H, 4, 4, wall); // فقط همسایگی قطری با کلبه
  must(!v.ok && v.reason === "ANCHOR", "همسایگی قطری لنگر نیست");
  v = validate(state, terrain, W, H, 3, 1, wall); // چسبیده به (۲،۱)
  must(v.ok, "دیوار چسبیده به کلبه باید معتبر باشد");
  const r = tryPlace(state, terrain, W, H, 3, 1, wall);
  must(r.ok && r.building.hp === 60, "HP اولیه دیوار باید ۶۰ باشد");
  must(state.resources.wood === 112, `چوب باید ۱۱۲ باشد، هست ${state.resources.wood}`);
  return { name: "اتصال دیوار", pass: true, detail: "ANCHOR تنها/قطری + کسر ۲ چوب" };
}

function t_const_wall_chain() {
  const { W, H, terrain, state } = fresh();
  const wall = CONFIG.BUILDINGS.wall;
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  tryPlace(state, terrain, W, H, 3, 1, wall);
  const r = tryPlace(state, terrain, W, H, 4, 1, wall); // زنجیره به دیوار
  must(r.ok, "دیوار چسبیده به دیوار باید معتبر باشد");
  const v = validate(state, terrain, W, H, 3, 1, wall);
  must(!v.ok && v.reason === "OCCUPIED", `اشغال بر اتصال مقدم است، شد ${v.reason}`);
  const w = validate(state, terrain, W, H, 6, 6, wall);
  must(!w.ok && w.reason === "ANCHOR", "دیوار دورافتاده باید ANCHOR باشد");
  return { name: "زنجیره دیوار", pass: true, detail: "دیوار→دیوار + اولویت OCCUPIED" };
}

function t_const_wall_blocks() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.wall);
  must(!isCellWalkable(terrain, state.occ, W, H, 3, 1), "خانه دیوار نباید walkable باشد");
  must(isCellWalkable(terrain, state.occ, W, H, 4, 1), "خانه آزاد باید walkable بماند");
  return { name: "انسداد مسیر دیوار", pass: true, detail: "occ ← مسدود" };
}
