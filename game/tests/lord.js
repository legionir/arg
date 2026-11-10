// ارباب و پیروزی (0.243.0 — C-CLN-26): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { T_GRASS } from "../terrain.js";
import { UNITS, spawnLord, spawnUnit, hireUnit, validateHire, spawnWave, FINAL_WAVE } from "../combat.js";
import { serializeJSON, deserializeJSON, deserialize, SaveError } from "../persist.js";
import { placeKeep } from "../construction.js";
import { must, fresh, needBarracks, simC } from "./fixtures.js";

// ایزولاسیون مالک: ستاد یک مالک، مالک دیگر را باز نمی‌کند (خالص، بدون زمین).

// ترتیب آغازین: نخستین بنای هر بازی تازه ستاد بازیکن است.

// ارباب جنگجو (0.169.0 — §۱۰.۵/بند 226): مرگبار + مرگ = باخت.
// پین: جان ۱۵۰ (تنومندترین رزمنده غیرمحاصره خودی) + زره ۲/آسیب ۸ + استخدام‌ناپذیر؛
// مرگ = شکست در t_lord_death آزموده می‌شود.
function t_lord_warrior() {
  const L = UNITS.lord;
  must(L && L.hp === 150, "جان ارباب باید ۱۵۰ باشد");
  for (const k of Object.keys(UNITS)) {
    const u = UNITS[k];
    if (u.side === "player" && k !== "lord" && !u.siege) must(L.hp >= u.hp, "ارباب باید تنومندترین رزمنده خودی باشد (نه " + k + ")");
  }
  must(L.armor === 2 && L.dmg === 8, "زره/آسیب ارباب ۲/۸ می‌ماند");
  must(L.noHire === true, "ارباب استخدام‌شدنی نیست");
  return { name: "ارباب جنگجو", pass: true, detail: "۱۵۰ جان + مرگ=باخت" };
}

export function lordCases() {
  return [t_lord_start, t_lord_unique, t_lord_death, t_lord_warrior, t_victory, t_lord_save];
}

// --- ارباب و پیروزی (0.22.0) ---

// جای‌گیری آغازین: یکتا، رایگان، چمن آزاد نزدیک ستاد، جان کامل، قطعی.
function t_lord_start() {
  const run = () => {
    const { W, H, terrain, state } = fresh();
    must(placeKeep(state, terrain, W, H).ok, "ستاد باید ساخته شود");
    const before = { ...state.resources };
    const res = spawnLord(state, terrain, W, H);
    must(res.ok && res.unit, "ارباب باید برخیزد");
    const lords = state.units.filter((u) => u.type === "lord" && !u.dead);
    must(lords.length === 1, "دقیقاً یک ارباب باید باشد");
    const L = lords[0];
    must(L.hp === UNITS.lord.hp && L.side === "player", "ارباب باید خودی با جان کامل باشد");
    const c = Math.floor(L.x), r = Math.floor(L.r);
    must(terrain[r * W + c] === T_GRASS, "زیر ارباب باید چمن باشد");
    must(state.occ[r * W + c] !== 1, "ارباب نباید روی بنا باشد");
    must(state.resources.wood === before.wood && state.resources.food === before.food &&
      state.resources.gold === before.gold && state.resources.stone === before.stone,
      "ارباب آغازین باید رایگان باشد");
    must(state.victorious === false, "بازی تازه نباید پیروزی داشته باشد");
    return `${L.x},${L.r}`;
  };
  const a = run(), b = run();
  must(a === b, `جای ارباب باید قطعی باشد (${a} در برابر ${b})`);
  return { name: "ارباب آغازین", pass: true, detail: `یکتا + رایگان + قطعی (${a})` };
}

// یکتایی: دومین spawnLord و هر استخدامی UNIQUE/INVALID می‌خورند.
function t_lord_unique() {
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد باید ساخته شود");
  must(spawnLord(state, terrain, W, H).ok, "ارباب اول باید برخیزد");
  const again = spawnLord(state, terrain, W, H);
  must(!again.ok && again.reason === "UNIQUE", `ارباب دوم باید UNIQUE باشد، شد ${again.reason}`);
  const before = { ...state.resources };
  const v = validateHire(state, terrain, W, H, 5, 5, "lord");
  must(!v.ok && v.reason === "INVALID", `استخدام ارباب باید INVALID باشد، شد ${v.reason}`);
  const h = hireUnit(state, terrain, W, H, 5, 5, "lord");
  must(!h.ok, "اجرای استخدام ارباب باید رد شود");
  must(state.resources.food === before.food && state.resources.gold === before.gold,
    "استخدام ردشده نباید منابع کم کند");
  must(state.units.filter((u) => u.type === "lord").length === 1, "هنوز باید یک ارباب باشد");
  return { name: "یکتایی ارباب", pass: true, detail: "تکرار UNIQUE + استخدام INVALID" };
}

// مرگ ارباب = شکست + توقف + رویداد؛ مرگ سرباز عادی اثری ندارد.
function t_lord_death() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  must(placeKeep(state, terrain, W, H).ok, "ستاد باید ساخته شود");
  must(spawnLord(state, terrain, W, H).ok, "ارباب باید برخیزد");
  const L = state.units.find((u) => u.type === "lord");
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const S = state.units.find((u) => u.type === "soldier");
  // شاهد: کشته شدن سرباز دور از ارباب نباید شکست باشد
  spawnUnit(state, "swordsman", S.x, S.r);
  const foe = state.units.find((u) => u.type === "swordsman");
  foe.hp = 1; S.hp = S.maxHp; // سرباز شاهد می‌کشد، نه برعکس
  let t = 0;
  while (state.units.some((u) => u.type === "swordsman") && t < 200) { simC(state, terrain, 1); t++; }
  must(!state.units.some((u) => u.type === "swordsman"), "مهاجم شاهد باید بمیرد");
  must(state.defeated === false, "مرگ سرباز نباید شکست باشد");
  // ضربه کاری: ارباب زخمی + شمشیرزن چسبیده
  L.hp = 6;
  spawnUnit(state, "swordsman", L.x, L.r);
  t = 0;
  while (!state.defeated && t < 200) { simC(state, terrain, 1); t++; }
  must(state.defeated === true, "مرگ ارباب باید شکست باشد");
  must(state.paused === true, "شکست باید بازی را متوقف کند");
  must(state.events.some((e) => e.includes("ارباب کشته شد")), "رویداد مرگ ارباب باید ثبت شود");
  must(state.victorious === false, "شکست نباید پیروزی هم باشد");
  return { name: "مرگ ارباب = شکست", pass: true, detail: `قتل در ${t} تیک + توقف` };
}

// پیروزی: پاک‌سازی موج‌های ۱-۴ اثری ندارد؛ نابودی موج FINAL_WAVE = پیروزی + توقف.
function t_victory() {
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد باید ساخته شود");
  must(spawnLord(state, terrain, W, H).ok, "ارباب باید برخیزد");
  must(FINAL_WAVE === 5, "موج آخر باید ۵ باشد");
  for (let w = 1; w <= FINAL_WAVE; w++) {
    const n = spawnWave(state, terrain, W, H);
    must(n === 2 + w, `موج ${w} باید ${2 + w} دشمن داشته باشد، دارد ${n}`);
    must(state.wave === w, `شمارنده موج باید ${w} باشد`);
    for (const e of state.units.filter((u) => u.side === "enemy")) {
      e.hp = 1; // دشمن زخمی؛ مدافعان کار را تمام می‌کنند
      spawnUnit(state, "soldier", e.x, e.r);
    }
    let t = 0;
    while (state.units.some((u) => u.side === "enemy") && t < 600) { simC(state, terrain, 1); t++; }
    must(!state.units.some((u) => u.side === "enemy"), `موج ${w} باید پاک شود`);
    if (w < FINAL_WAVE) {
      must(state.victorious === false, `پاک‌سازی موج ${w} نباید پیروزی باشد`);
      must(state.paused === false, `بازی باید تا موج آخر ادامه یابد`);
    }
  }
  must(state.victorious === true, "نابودی موج آخر باید پیروزی باشد");
  must(state.paused === true, "پیروزی باید بازی را متوقف کند");
  must(state.events.some((e) => e.includes("آخرین موج")), "رویداد پیروزی باید ثبت شود");
  must(state.defeated === false, "پیروزی نباید شکست هم باشد");
  return { name: "پیروزی موج آخر", pass: true, detail: `موج ۵ پاک + توقف` };
}

// ذخیره: حفظ ارباب (جان/جا) و پرچم پیروزی + تحمل قدیمی + رد دست‌کاری.
function t_lord_save() {
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد باید ساخته شود");
  must(spawnLord(state, terrain, W, H).ok, "ارباب باید برخیزد");
  const L = state.units.find((u) => u.type === "lord");
  L.hp = 100; // زخمی
  state.victorious = true;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.victorious === true, "پرچم پیروزی باید حفظ شود");
  const ll = loaded.units.filter((u) => u.type === "lord");
  must(ll.length === 1 && ll[0].hp === 100 && ll[0].x === L.x && ll[0].r === L.r,
    "ارباب باید با جان و جای یکسان بماند");
  // تحمل ذخیره قدیمی: بدون victorious
  const legacy = JSON.parse(serializeJSON(state));
  delete legacy.victorious;
  const old = deserialize(legacy);
  must(old.victorious === false, "victorious غایب باید false شود");
  // رد دست‌کاری
  const bad = JSON.parse(serializeJSON(state));
  bad.victorious = "yes";
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "victorious غیربولی باید رد شود");
  return { name: "ذخیره ارباب و پیروزی", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}
