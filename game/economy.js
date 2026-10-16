// اقتصاد v1: تولید + مالیات + جیره + محبوبیت + مهاجرت (ECON-001/002).
// همه ضرایب placeholder اند (source: guess) — استخراج مرجع در src/research/popularity-extraction.md.
import { CONFIG } from "./config.js";
import { underConstruction } from "./construction.js";

// نرخ‌های تولید — تک‌منبع از CONFIG.BUILDINGS (0.38.0، #۲ از FEATURES):
// هر ساختمان تولیدکننده بلوک econ خودش را دارد و RATES همان‌جا ساخته
// می‌شود تا نرخ منطق و مشخصات کارت از یک جا بیایند. source هم از تعریف
// ساختمان می‌آید (guess تا استخراج مرجع).
export const RATES = {};
for (const [k, def] of Object.entries(CONFIG.BUILDINGS)) {
  if (def && def.econ) RATES[k] = { ...def.econ, source: def.source || "guess" };
}

// میخانه (0.21.0): هر ۵۰ تیک ۱ آبجو می‌خورد و تا چرخه بعد +۳ به هدف محبوبیت
// می‌دهد (بدون انباشت چند میخانه؛ کارگر نمی‌خواهد — ساده‌سازی ثبت‌شده).
export const INN = { beerEveryTicks: 50, popBonus: 3, source: "guess" };

// مالیات: درآمد طلا به ازای هر کارگر استخر، هر ۵۰ تیک. همه guess تا استخراج مرجع.
// رشوه (0.14.0): سطح منفی — پرداخت طلا برای محبوبیت (مثل Tax مرجع).
export const TAX = {
  bribe:  { goldPerWorker: -1, pop: 5,  name: "رشوه", source: "reference: stronghold-wiki/tax" },
  none:   { goldPerWorker: 0, pop: 2,  name: "بدون مالیات", source: "guess" },
  low:    { goldPerWorker: 1, pop: 0,  name: "کم", source: "guess" },
  normal: { goldPerWorker: 2, pop: -2, name: "متوسط", source: "guess" },
  high:   { goldPerWorker: 4, pop: -5, name: "سنگین", source: "guess" },
};

// جیره: مضرب مصرف غذا (foodNum/۲) + اثر محبوبیت. همه guess تا استخراج مرجع.
export const RATIONS = {
  none:   { foodNum: 0, pop: -4, name: "بدون جیره", source: "guess" },
  half:   { foodNum: 1, pop: -1, name: "نصف جیره", source: "guess" },
  normal: { foodNum: 2, pop: 1,  name: "جیره کامل", source: "guess" },
  double: { foodNum: 4, pop: 3,  name: "جیره مضاعف", source: "guess" },
};

export const EAT_THRESHOLD = 400; // = ۲۰۰ تیک × ۲؛ انباشت‌گر صحیح برای قطعیت
export const POP_PERIOD = 50;
export const MIG_PERIOD = 100;
export const POP_STEP = 2;
export const IMM_IN = 55;   // مهاجرت به داخل اگر محبوبیت ≥ ۵۵ و ظرفیت خالی
export const IMM_OUT = 40;  // مهاجرت به خارج اگر محبوبیت ≤ ۴۰
export const BASE_HOUSING = 4;
export const HUT_HOUSING = 4;
export const KEEP_HOUSING = 8; // ستاد سالم = ۸ مسکن (0.19.0، guess تا استخراج مرجع)

export const CAPS = { wood: 500, food: 500, gold: 9999, stone: 500, wheat: 500, flour: 500, hops: 500, beer: 500, iron: 500, swords: 500, bows: 500 };

// ظرفیت انبار (0.34.0): پایه + پله هر انبار/انبار غذای سالم خودی.
// انبار: چوب/سنگ/طلا؛ انبار غذا: غذا/گندم/رازک/آبجو. هرچه بیشتر، سقف بیشتر.
export const STORE_RES = ["wood", "stone", "gold"];
export const GRANARY_RES = ["food", "wheat", "flour", "hops", "beer"];
export const STORE_BONUS = 500;
export const GRANARY_BONUS = 500;
// خانواده سلاح (0.44.0 — #۹): آهن/شمشیر/کمان — هر زرادخانه یا کمان‌سازی سالم
// +۵۰۰ به سقف هر سه می‌دهد (خودشان انبار سلاح‌اند).
export const ARMOURY_RES = ["iron", "swords", "bows"];
export const ARMOURY_BONUS = 500;

export function capFor(state, key, owner) {
  let cap = CAPS[key];
  for (const b of bldsOf(state, owner)) {
    if (b.destroyed || underConstruction(b)) continue; // نیمه‌کاره سقف نمی‌دهد (0.39.0)
    if (b.type === "stockpile" && STORE_RES.includes(key)) cap += STORE_BONUS;
    else if (b.type === "granary" && GRANARY_RES.includes(key)) cap += GRANARY_BONUS;
    else if ((b.type === "armoury" || b.type === "fletcher") && ARMOURY_RES.includes(key)) cap += ARMOURY_BONUS;
  }
  return cap;
}

export function workersNeeded(b) {
  if (underConstruction(b)) return 0; // نیمه‌کاره کارگر نمی‌خواهد (0.39.0)
  const r = RATES[b.type];
  return r ? r.workers : 0;
}

// کانتینر اقتصادی: solo خود state، در MP برش mpres[owner].
export function econOf(state, owner) {
  if (state.mp && state.mp.enabled) return state.mpres[owner == null ? 0 : owner];
  return state;
}

function bldsOf(state, owner) {
  // سولو هم مثل MP به‌ازای مالک فیلتر می‌شود (0.42.0: ساختمان‌های AI با
  // owner=9 سقف/مسکن/کارگر بازیکن را بالا نمی‌برند)؛ پیش‌فرض مالک ۰.
  const ow = owner == null ? 0 : owner;
  if (!(state.mp && state.mp.enabled)) {
    return state.buildings.filter((b) => (b.owner == null ? 0 : b.owner) === ow);
  }
  return state.buildings.filter((b) => (b.owner == null ? 0 : b.owner) === ow);
}

export function housingCap(state, owner) {
  let huts = 0, keep = 0;
  for (const b of bldsOf(state, owner)) {
    if (b.destroyed || underConstruction(b)) continue; // نیمه‌کاره مسکن نمی‌دهد (0.39.0)
    if (b.type === "hut") huts++;
    else if (b.type === "keep") keep++;
  }
  return BASE_HOUSING + HUT_HOUSING * huts + (keep > 0 ? KEEP_HOUSING : 0);
}

// تخصیص حریصانه به ترتیب ساخت از استخر state.workers.
// در MP فقط ساختمان‌های همان مالک از استخر همان مالک سهم می‌گیرند.
export function assignStaff(state, owner) {
  const mp = state.mp && state.mp.enabled;
  if (!mp) {
    // سولو: فقط ساختمان‌های خودی (0.42.0 — AI استخر جدای خودش را دارد).
    let free = state.workers;
    const sorted = state.buildings
      .filter((b) => (b.owner == null ? 0 : b.owner) === 0)
      .slice().sort((a, b) => a.id - b.id);
    for (const b of sorted) {
      const need = workersNeeded(b);
      if (need === 0) { b.staffed = true; continue; }
      if (free >= need) { b.staffed = true; free -= need; }
      else b.staffed = false;
    }
    state.freeWorkers = free;
    return;
  }
  const ow = owner == null ? 0 : owner;
  const ec = state.mpres[ow];
  let free = ec.workers;
  const sorted = state.buildings
    .filter((b) => (b.owner == null ? 0 : b.owner) === ow)
    .slice().sort((a, b) => a.id - b.id);
  for (const b of sorted) {
    const need = workersNeeded(b);
    if (need === 0) { b.staffed = true; continue; }
    if (free >= need) { b.staffed = true; free -= need; }
    else b.staffed = false;
  }
  ec.freeWorkers = free;
}

// اثر موجودی غذا روی محبوبیت — جدول قابل تنظیم (guess تا استخراج مرجع).
export const STOCK_POP = {
  famineAt: 0,   // غذا ≤ این = قحطی
  lowBelow: 50,  // غذا < این = کم
  faminePop: -6,
  lowPop: 0,
  fullPop: 2,    // انبار پر
  source: "guess",
};

function stockPop(food) {
  if (food <= STOCK_POP.famineAt) return STOCK_POP.faminePop;
  if (food < STOCK_POP.lowBelow) return STOCK_POP.lowPop;
  return STOCK_POP.fullPop;
}

export function popTarget(state, owner) {
  const ec = econOf(state, owner);
  const t = 50 + TAX[ec.tax].pop + RATIONS[ec.rations].pop + stockPop(ec.resources.food)
    + (innServed(state, owner) ? INN.popBonus : 0);
  return Math.max(0, Math.min(100, t));
}

// میخانه سروکننده: دست‌کم یک میخانه با served (آبجو خورده در چرخه جاری).
// در MP فقط میخانه خودی.
export function innServed(state, owner) {
  const mp = state.mp && state.mp.enabled;
  const ow = owner == null ? 0 : owner;
  for (const b of state.buildings) {
    if (b.destroyed) continue;
    if (b.type !== "inn" || !b.served) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue; // سولو هم خودی (0.42.0)
    return true;
  }
  return false;
}

export function stepEconomy(state) {
  // شمارش معکوس ساخت‌وساز (0.39.0): یک‌بار برای همه ساختمان‌ها، پیش از
  // اقتصاد — تکمیل‌شده همین تیک وارد چرخه می‌شود (بدون تیک مرده).
  for (const b of state.buildings) {
    if ((b.buildLeft || 0) > 0) b.buildLeft--;
  }
  if (state.mp && state.mp.enabled) {
    for (let ow = 0; ow < state.mp.num; ow++) stepPlayerEconomy(state, ow);
    return;
  }
  state.workerCap = housingCap(state);
  assignStaff(state);

  // تولید با سقف انبار؛ مصرف‌کننده (آسیاب/نانوایی/آبجوسازی) با کمبود ورودی در انتظار
  // می‌ماند (پیشرفت جلو نمی‌رود، بدهی هم ثبت نمی‌شود) و پرچم starved می‌گیرد.
  for (const b of state.buildings) {
    // ساختمان AI در چرخه بازیکن نیست (0.42.0 — چرخه خودش در ai.js است).
    if ((b.owner == null ? 0 : b.owner) !== 0) { b.starved = false; continue; }
    const r = RATES[b.type];
    // نیمه‌کاره تولید نمی‌کند (0.39.0) — مثل بی‌کارگر، بدون بدهی ورودی.
    if (!r || !b.staffed || underConstruction(b)) { b.starved = false; continue; }
    if (r.consumes) {
      let lacking = false;
      for (const k of Object.keys(r.consumes)) {
        if ((state.resources[k] || 0) < r.consumes[k]) { lacking = true; break; }
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
        for (const k of Object.keys(r.consumes)) state.resources[k] -= r.consumes[k];
      }
      const k = r.produces;
      state.resources[k] = Math.min(capFor(state, k), state.resources[k] + r.amount);
      state.producedTotal += r.amount;
    }
  }

  // میخانه (0.21.0): هر ۵۰ تیک ۱ آبجو می‌خورد؛ served تا چرخه بعد می‌ماند
  // (پیش از بلوک مالیات/محبوبیت تا هدف همان تیک تازه باشد). بدون آبجو = خاموش.
  // served ذخیره نمی‌شود (پس از load تا چرخه بعد صبر می‌کند — تحمل‌پذیر).
  for (const b of state.buildings) {
    if (b.type !== "inn") continue;
    if ((b.owner == null ? 0 : b.owner) !== 0) continue; // میخانه AI نه (0.42.0)
    if (!b.staffed) { b.served = false; continue; }
    b.progress = (b.progress || 0) + 1;
    if (b.progress >= INN.beerEveryTicks) {
      b.progress = 0;
      if ((state.resources.beer || 0) >= 1) { state.resources.beer--; b.served = true; }
      else b.served = false;
    }
  }

  // مصرف کسری غذا (صحیح، قطعی)؛ کف صفر + بدهی کمبود — فقط دهان‌های خودی (0.42.0)
  let mouths = 0;
  for (const b of state.buildings) {
    if (!b.staffed || (b.owner == null ? 0 : b.owner) !== 0) continue;
    mouths += workersNeeded(b);
  }
  state.eatAcc += mouths * RATIONS[state.rations].foodNum;
  while (state.eatAcc >= EAT_THRESHOLD) {
    state.eatAcc -= EAT_THRESHOLD;
    if (state.resources.food > 0) { state.resources.food--; state.consumedTotal++; }
    else state.shortageTotal++;
  }

  // مالیات + رانش محبوبیت، هر ۵۰ تیک
  if (state.tick > 0 && state.tick % POP_PERIOD === 0) {
    const tax = TAX[state.tax];
    state.resources.gold = Math.min(capFor(state, "gold"), state.resources.gold + state.workers * tax.goldPerWorker);
    const target = popTarget(state);
    state.popTarget = target;
    const d = target - state.popularity;
    state.popDir = d === 0 ? 0 : Math.sign(d);
    if (d !== 0) state.popularity += Math.sign(d) * Math.min(POP_STEP, Math.abs(d));
  }

  // مهاجرت، هر ۱۰۰ تیک
  if (state.tick > 0 && state.tick % MIG_PERIOD === 0) {
    if (state.popularity >= IMM_IN && state.workers < state.workerCap) state.workers++;
    else if (state.popularity <= IMM_OUT && state.workers > 0) state.workers--;
  }

  // گیره اطمینان (سقف پویا: ویرانی انبار، مازاد را می‌تراشد)
  for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows"]) {
    if (state.resources[k] < 0) state.resources[k] = 0;
    if (state.resources[k] > capFor(state, k)) state.resources[k] = capFor(state, k);
  }
}

// گام اقتصادی یک بازیکن در MP (آینه منطق solo، جدا به‌ازای هر مالک).
export function stepPlayerEconomy(state, ow) {
  const ec = state.mpres[ow];
  ec.workerCap = housingCap(state, ow);
  assignStaff(state, ow);
  const own = (b) => (b.owner == null ? 0 : b.owner) === ow && !b.destroyed;

  for (const b of state.buildings) {
    if (!own(b)) continue;
    const r = RATES[b.type];
    if (!r || !b.staffed || underConstruction(b)) { b.starved = false; continue; }
    if (r.consumes) {
      let lacking = false;
      for (const k of Object.keys(r.consumes)) {
        if ((ec.resources[k] || 0) < r.consumes[k]) { lacking = true; break; }
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
        for (const k of Object.keys(r.consumes)) ec.resources[k] -= r.consumes[k];
      }
      const k = r.produces;
      ec.resources[k] = Math.min(capFor(state, k, ow), ec.resources[k] + r.amount);
      ec.producedTotal += r.amount;
    }
  }

  for (const b of state.buildings) {
    if (!own(b) || b.type !== "inn") continue;
    if (!b.staffed) { b.served = false; continue; }
    b.progress = (b.progress || 0) + 1;
    if (b.progress >= INN.beerEveryTicks) {
      b.progress = 0;
      if ((ec.resources.beer || 0) >= 1) { ec.resources.beer--; b.served = true; }
      else b.served = false;
    }
  }

  let mouths = 0;
  for (const b of state.buildings) if (own(b) && b.staffed) mouths += workersNeeded(b);
  ec.eatAcc += mouths * RATIONS[ec.rations].foodNum;
  while (ec.eatAcc >= EAT_THRESHOLD) {
    ec.eatAcc -= EAT_THRESHOLD;
    if (ec.resources.food > 0) { ec.resources.food--; ec.consumedTotal++; }
    else ec.shortageTotal++;
  }

  if (state.tick > 0 && state.tick % POP_PERIOD === 0) {
    const tax = TAX[ec.tax];
    ec.resources.gold = Math.min(capFor(state, "gold", ow), ec.resources.gold + ec.workers * tax.goldPerWorker);
    const target = popTarget(state, ow);
    ec.popTarget = target;
    const d = target - ec.popularity;
    ec.popDir = d === 0 ? 0 : Math.sign(d);
    if (d !== 0) ec.popularity += Math.sign(d) * Math.min(POP_STEP, Math.abs(d));
  }

  if (state.tick > 0 && state.tick % MIG_PERIOD === 0) {
    if (ec.popularity >= IMM_IN && ec.workers < ec.workerCap) ec.workers++;
    else if (ec.popularity <= IMM_OUT && ec.workers > 0) ec.workers--;
  }

  for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows"]) {
    if (ec.resources[k] < 0) ec.resources[k] = 0;
    if (ec.resources[k] > capFor(state, k, ow)) ec.resources[k] = capFor(state, k, ow);
  }
}

// نرخ خالص تئوریک بر دقیقه (برای پنل) — مصرف ورودی آسیاب/نانوایی هم کم می‌شود
// (تئوریک: بدون قحطی ورودی).
export function netPerMinute(state, key, owner) {
  const mp = state.mp && state.mp.enabled;
  const ec = mp ? state.mpres[owner == null ? 0 : owner] : state;
  if (key === "gold") {
    return (ec.workers * TAX[ec.tax].goldPerWorker * 600) / POP_PERIOD;
  }
  const ow = owner == null ? 0 : owner;
  let gain = 0, loss = 0;
  for (const b of state.buildings) {
    if (b.destroyed) continue;
    if (mp && (b.owner == null ? 0 : b.owner) !== ow) continue;
    const r = RATES[b.type];
    if (!r || !b.staffed || underConstruction(b)) continue; // نیمه‌کاره نرخ ندارد (0.39.0)
    if (r.produces === key) gain += (r.amount * 600) / r.everyTicks;
    if (r.consumes && r.consumes[key]) loss += (r.consumes[key] * 600) / r.everyTicks;
  }
  // مصرف آبجوی میخانه (خارج RATES است چون خروجی منبعی ندارد).
  if (key === "beer") {
    for (const b of state.buildings) {
      if (b.destroyed) continue;
      if (mp && (b.owner == null ? 0 : b.owner) !== ow) continue;
      if (b.type === "inn" && b.staffed && !underConstruction(b)) loss += 600 / INN.beerEveryTicks;
    }
  }
  if (key === "food") {
    let mouths = 0;
    for (const b of state.buildings) {
      if (!b.staffed || b.destroyed) continue;
      if (mp && (b.owner == null ? 0 : b.owner) !== ow) continue;
      mouths += workersNeeded(b);
    }
    loss += (mouths * (RATIONS[ec.rations].foodNum / 2) * 600) / 200;
  }
  return gain - loss;
}
