// اقتصاد v1: تولید + مالیات + جیره + محبوبیت + مهاجرت (ECON-001/002).
// همه ضرایب placeholder اند (source: guess) — استخراج مرجع در src/research/popularity-extraction.md.
// (فاز ۰ بند ۷ — ۲۲.۱ داده‌محور): همه اعداد تنظیم این فایل از data/tuning.json می‌آیند
import { t } from "./i18n.js";
import { CONFIG } from "./config.js";
import { TUNING, TAX_IDS } from "./data.js";
import { underConstruction } from "./construction.js";

// نرخ‌های تولید — تک‌منبع از CONFIG.BUILDINGS (0.38.0، #۲ از FEATURES):
// هر ساختمان تولیدکننده بلوک econ خودش را دارد و RATES همان‌جا ساخته
// می‌شود تا نرخ منطق و مشخصات کارت از یک جا بیایند. source هم از تعریف
// ساختمان می‌آید (guess تا استخراج مرجع).
export const RATES = {};
for (const [k, def] of Object.entries(CONFIG.BUILDINGS)) {
  if (def && def.econ) RATES[k] = { ...def.econ, source: def.source || "guess" };
}

// میخانه (0.21.0): هر ۵۰ تیک ۱ آبجو می‌خورد. پاداش محبوبیت پوششی است
// (فاز ۱ بند ۵۱): هر میخانه کارا perInn نفر را پوشش می‌دهد و پاداش =
// fullBonus × پله پوشش ۲۵/۵۰/۷۵/۱۰۰٪ (بند ۹۴؛ پوشش کامل = +۸ مرجع ✅)؛ بدون سرو = ۰.
// میخانه کارا (فاز ۱ بند ۲۳) = آبجو + مهماندار.
// (فاز ۰ بند ۷: تک‌منبع data/tuning.json — inn.)
export const INN = {
  beerEveryTicks: TUNING.inn.beerEveryTicks,
  fullBonus: TUNING.inn.fullBonus,
  perInn: TUNING.inn.perInn,
  drunkardsPerInn: TUNING.inn.drunkardsPerInn,
  keepers: TUNING.inn.keepers,
  source: TUNING.inn.source,
};

// ساختمان‌های دینی (فاز ۱ بند ۷۲ — §۵.۵): با ساخت نمازخانه/کلیسا/کلیسای جامع،
// کشیش‌ها می‌آیند و مردم را تبرک می‌کنند. هر بنای کارا (سالم + تکمیل‌شده +
// کشیش‌دار) به‌اندازه ظرفیت داده تبرک می‌دهد؛ پوشش = ظرفیت جمعی / جمعیت
// (فرسایش دوره‌ای در بند ۷۳، نمایش درصد در بند ۷۴، پاداش در بند ۷۵).
// (فاز ۰ بند ۷: تک‌منبع data/tuning.json — religion.)
export const RELIGION_TYPES = ["chapel", "church", "cathedral"];
export const RELIGION = {
  chapel: TUNING.religion.chapel,
  church: TUNING.religion.church,
  cathedral: TUNING.religion.cathedral,
  priests: TUNING.religion.priests,
  blessEveryTicks: TUNING.religion.blessEveryTicks,
  blessDurationTicks: TUNING.religion.blessDurationTicks,
  steps: [...TUNING.religion.steps],
  stepBonus: [...TUNING.religion.stepBonus],
  churchBonus: TUNING.religion.churchBonus,
  cathedralBonus: TUNING.religion.cathedralBonus,
  source: TUNING.religion.source,
};
// پنجره تبرک جاری (فاز ۱ بند ۷۳ — فرسایش دائمی §۵.۵): تبرک پس از مدت داده
// می‌خوابد و چرخه بعد دوباره می‌آید؛ خالص از tick (الگوی رویدادهای بند ۷۰/۷۱ —
// بدون میدان تازه → بدون تغییر ذخیره/هش‌مدل/ری‌پلی‌فرمت).
export function blessActive(tick) {
  const t = Math.max(0, tick || 0);
  return (t % RELIGION.blessEveryTicks) < RELIGION.blessDurationTicks;
}

// پشتیبانی آسیاب (فاز ۱ بند ۳۳): چند نانوا/مزرعه گندم با نرخ‌های زنده RATES
// اشباع می‌شوند — خالص و داده‌محور (۱۲ نانوا + ۳ مزرعه عین hint دفترچه).
export function millSupport() {
  const mill = RATES.mill, bak = RATES.bakery, wf = RATES.wheatfarm;
  const bakers = Math.floor((mill.amount / mill.everyTicks) / (bak.consumes.flour / bak.everyTicks));
  const farms = Math.ceil((mill.consumes.wheat / mill.everyTicks) / (wf.amount / wf.everyTicks));
  return { bakers, farms };
}

// مالیات (فاز ۰ بند ۷ — ۲۲.۱ داده‌محور): درآمد طلا به ازای هر کارگر استخر،
// هر ۵۰ تیک؛ سطح‌ها عین data/tuning.json (ترتیب کلیدها ثابت — sim و UI با
// کلید می‌خوانند). رشوه (0.14.0): سطح منفی — پرداخت طلا برای محبوبیت.
function taxLevel(id) {
  const lv = TUNING.tax.levels.find((l) => l.id === id);
  return {
    goldPerWorker: lv.goldPerWorker,
    pop: lv.pop,
    nameKey: lv.nameKey,
    get name() { return t(lv.nameKey); },
    source: lv.source,
  };
}
// (فاز ۱ بند ۳۴ — ۱۲ سطح مرجع): TAX از TAX_IDS ساخته می‌شود، بدون لیترال موازی.
export const TAX = {};
for (const id of TAX_IDS) TAX[id] = taxLevel(id);

// اسلایدر مالیات (فاز ۱ بند ۲۲): نگاشت خالص جایگاه↔سطح، داده‌محور از TAX_IDS.
// نامعتبر = جایگاه none (پیش‌فرض)؛ برون‌بازه = گیره به دو سر.
export function taxIndex(id) {
  const i = TAX_IDS.indexOf(id);
  return i < 0 ? TAX_IDS.indexOf("none") : i;
}
export function taxAt(i) {
  const n = Math.max(0, Math.min(TAX_IDS.length - 1, i | 0));
  return TAX_IDS[n];
}

// جیره (فاز ۰ بند ۷ — ۲۲.۱ داده‌محور): مضرب مصرف غذا (foodNum/۲) + اثر
// محبوبیت؛ سطح‌ها عین data/tuning.json (ترتیب کلیدها ثابت).
function rationLevel(id) {
  const lv = TUNING.rations.levels.find((l) => l.id === id);
  return {
    foodNum: lv.foodNum,
    pop: lv.pop,
    nameKey: lv.nameKey,
    get name() { return t(lv.nameKey); },
    source: lv.source,
  };
}
export const RATIONS = {
  none: rationLevel("none"),
  half: rationLevel("half"),
  normal: rationLevel("normal"),
  extra: rationLevel("extra"),
  double: rationLevel("double"),
};

export const EAT_THRESHOLD = TUNING.timing.eatThreshold; // = ۲۰۰ تیک × ۲؛ انباشت‌گر صحیح برای قطعیت
export const POP_PERIOD = TUNING.timing.popPeriod;
export const MIG_PERIOD = TUNING.timing.migPeriod;
export const POP_STEP = TUNING.timing.popStep;
export const IMM_IN = TUNING.timing.immIn;   // مهاجرت به داخل اگر محبوبیت ≥ ۵۵ و ظرفیت خالی
export const IMM_OUT = TUNING.timing.immOut;  // مهاجرت به خارج اگر محبوبیت ≤ ۴۰
export const BASE_HOUSING = TUNING.housing.base;
export const HUT_HOUSING = TUNING.housing.hut;
export const KEEP_HOUSING = TUNING.housing.keep; // ستاد سالم = ۸ مسکن (0.19.0، guess تا استخراج مرجع)
export const STONEKEEP_HOUSING = TUNING.housing.stonekeep; // ستاد سنگی = ۱۰ مسکن (0.154.0 — §8.1/بند 405، guess تا استخراج مرجع)
// سقف جمعیت/نیرو (فاز ۱ بند ۱۰۱ — §۱۸.۵: Crusader ۲۰۰۰، Extreme ۱۰٬۰۰۰؛ حالت
// Extreme در بازی نیست پس فقط crusader اعمال می‌شود) + سقف بیکار کنار آتش
// (بند ۶۷: حداکثر ۲۴ دهقان بیکار؛ مازاد باید کار پیدا کند). تک‌منبع population.
export const POP_CAP = TUNING.population.crusader;
export const POP_CAP_EXTREME = TUNING.population.extreme;
export const CAMP_IDLE_MAX = TUNING.population.campIdleMax;

export const CAPS = { ...TUNING.caps.base }; // (فاز ۰ بند ۷: تک‌منبع data/tuning.json — caps.base)

// ظرفیت انبار (0.34.0): پایه + پله هر انبار/انبار غذای سالم خودی.
// (فاز ۰ بند ۷: تک‌منبع data/tuning.json — caps.store/granary.)
// انبار: چوب/سنگ/طلا؛ انبار غذا: غذا/گندم/رازک/آبجو. هرچه بیشتر، سقف بیشتر.
export const STORE_RES = [...TUNING.caps.store.res];
export const GRANARY_RES = [...TUNING.caps.granary.res];
export const STORE_BONUS = TUNING.caps.store.bonus;
export const GRANARY_BONUS = TUNING.caps.granary.bonus;
// خانواده سلاح (0.44.0 — #۹): آهن/شمشیر/کمان — هر زرادخانه یا کمان‌سازی سالم
// +۵۰۰ به سقف هر سه می‌دهد (خودشان انبار سلاح‌اند).
// (فاز ۰ بند ۷: تک‌منبع data/tuning.json — caps.armoury.)
export const ARMOURY_RES = [...TUNING.caps.armoury.res];
export const ARMOURY_BONUS = TUNING.caps.armoury.bonus;

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

// جمعیت شمارش‌شده مالک برای سقف (بند ۱۰۱): استخر کارگران همان مالک +
// یگان‌های زنده غیرسناریویی‌اش (موج/یورش side=enemy بیرون سقف‌اند — guess؛
// مرجع فقط عدد سقف را می‌دهد). خالص و MP-aware؛ سولو مالک غیرصفر = AI.
export function popTotal(state, owner) {
  const mp = state.mp && state.mp.enabled;
  const ow = owner == null ? 0 : owner;
  let w = 0;
  if (mp) w = (state.mpres[ow] || {}).workers || 0;
  else if (ow !== 0 && state.ai) w = state.ai.workers || 0;
  else if (ow === 0) w = state.workers || 0;
  let u = 0;
  for (const x of state.units || []) {
    if (!x || x.dead) continue;
    if ((x.owner == null ? 0 : x.owner) !== ow) continue;
    if (x.side === "enemy") continue;
    u++;
  }
  return w + u;
}
export function atPopCap(state, owner) {
  return popTotal(state, owner) >= POP_CAP;
}
export function workersNeeded(b) {
  if (underConstruction(b)) return 0; // نیمه‌کاره کارگر نمی‌خواهد (0.39.0)
  if (b.type === "inn") return INN.keepers; // مهماندار میخانه (فاز ۱ بند ۲۳)
  if (b.type === "oxtether") return 1; // گاوبان آغل (دفترچه §۶.۲: ۱ کارگر؛ 0.138.1)
  if (b.type === "apothecary") return 1; // عطار عطاری (دفترچه §۸.۵: ۱ کارگر؛ 0.146.0)
  if (b.type === "well") return 1; // چاه‌بان چاه (دفترچه §۸.۵: ۱ کارگر؛ 0.148.0)
  if (b.type === "waterpot") return 3; // حوض‌بان حوض (دفترچه §۸.۵: ۳ کارگر؛ 0.148.0)
  if (RELIGION_TYPES.includes(b.type)) return RELIGION.priests; // کشیش ساختمان دینی (فاز ۱ بند ۷۲)
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

// آغل گاو سالم مالک (فاز ۱ بند ۸۴ — §۶.۲ «معدن به Ox tether نیاز دارد»):
// دروازه تولید معدن سنگ (نیمه‌کاره/ویرانه/بی‌کارگر حساب نیست — دفترچه: ۱ کارگر؛ 0.138.1). خالص و MP-aware.
export function hasOxTether(state, owner) {
  const ow = owner == null ? 0 : owner;
  return (state.buildings || []).some((b) =>
    b && b.type === "oxtether" && !b.destroyed && !underConstruction(b) && b.staffed !== false &&
    (b.owner == null ? 0 : b.owner) === ow);
}

export function housingCap(state, owner) {
  let huts = 0, keep = 0, stonekeep = 0;
  for (const b of bldsOf(state, owner)) {
    if (b.destroyed || underConstruction(b)) continue; // نیمه‌کاره مسکن نمی‌دهد (0.39.0)
    if (b.type === "hut") huts++;
    else if (b.type === "keep") keep++;
    else if (b.type === "stonekeep") stonekeep++; // ستاد سنگی (0.154.0 — بند 405)
  }
  return BASE_HOUSING + HUT_HOUSING * huts + (keep > 0 ? KEEP_HOUSING : 0) +
    (stonekeep > 0 ? STONEKEEP_HOUSING : 0); // هر دو ستاد = جمع (guess — مرجع ارتقاست، نه انباشت)
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

// اثر موجودی غذا روی محبوبیت (فاز ۰ بند ۷: تک‌منبع data/tuning.json — stockPop).
// جریمه ازدحام (فاز ۱ بند ۶۹ — 🔧 حدس: بخش ۴ عدد نمی‌دهد): جمعیت > مسکن.
// (فاز ۰ بند ۷: تک‌منبع data/tuning.json — crowding.)
export const CROWD_POP = TUNING.crowding.pop;
export function crowdPop(state, owner) {
  const e = econOf(state, owner);
  return (e.workers || 0) > housingCap(state, owner) ? CROWD_POP : 0;
}
export const STOCK_POP = {
  famineAt: TUNING.stockPop.famineAt,   // غذا ≤ این = قحطی
  lowBelow: TUNING.stockPop.lowBelow,  // غذا < این = کم
  faminePop: TUNING.stockPop.faminePop,
  lowPop: TUNING.stockPop.lowPop,
  fullPop: TUNING.stockPop.fullPop,    // انبار پر
  source: TUNING.stockPop.source,
};

function stockPop(food) {
  if (food <= STOCK_POP.famineAt) return STOCK_POP.faminePop;
  if (food < STOCK_POP.lowBelow) return STOCK_POP.lowPop;
  return STOCK_POP.fullPop;
}

// تنوع غذا (فاز ۱ بند ۱۸ — ورودی اول §۵.۱): شمار انواع خوردنیِ موجود در انبار
// + پاداش جدول داده (۱ نوع → +۰، ۲ → +۱، ۳ → +۲، ۴ → +۳). امروز فقط «غذا»
// خوردنی نهایی است (آبجو پوشش میخانه است، گندم/آرد/رازک واسطه‌اند)؛ با آمدن
// شکار/لبنیات/باغ (بند ۴۰) همین فهرست داده بزرگ می‌شود.
export const FOOD_TYPES = [...TUNING.foodVariety.types];
export const FOOD_BONUS = [...TUNING.foodVariety.bonus];
export function foodVariety(state, owner) {
  const ec = econOf(state, owner);
  const res = (ec && ec.resources) || {};
  const off = (ec && ec.offFood) || [];
  let n = 0;
  for (const k of FOOD_TYPES) if (!off.includes(k) && (res[k] || 0) > 0) n++;
  return { types: n, bonus: FOOD_BONUS[Math.max(0, Math.min(n - 1, FOOD_BONUS.length - 1))] };
}

// مجموع غذای انبار (همه انواع — فاز ۱ بند ۴۰): قحطی/دوام روی جمع قضاوت می‌کنند.
export function foodTotal(res) {
  let s = 0;
  for (const k of FOOD_TYPES) s += (res && res[k]) || 0;
  return s;
}

// یک واحد از نخستین نوعِ موجود و روشن (ترتیب FOOD_TYPES از داده) — خالص روی مخزن.
export function eatOneUnit(bag, off) {
  const k = FOOD_TYPES.find((t) => !(off || []).includes(t) && (bag[t] || 0) > 0);
  if (!k) return false;
  bag[k]--;
  return true;
}

// رشوه ماهانه از خزانه پرداخت می‌شود (بند ۲۱؛ سه سطح رشوه از بند ۳۴): هر سطح
// پولی (goldPerWorker<۰) با خزانه خالی اثر اضافی ندارد.
// رشوه فقط با پوشش کامل هزینه دوره از خزانه (فاز ۱ بند ۹۳): خزانه کم =
// نه کسر، نه اثر (all-or-nothing هر POP_PERIOD). سطح رایگان/مالیات همیشه.
export function bribeAffordable(ec) {
  const lv = TAX[(ec && ec.tax) || "none"] || TAX.none;
  if (lv.goldPerWorker >= 0) return true;
  return ((ec && ec.resources && ec.resources.gold) || 0) >= ((ec && ec.workers) || 0) * -lv.goldPerWorker;
}
function taxPop(ec) {
  const lv = TAX[ec.tax];
  if (lv.goldPerWorker < 0 && !bribeAffordable(ec)) return 0;
  return lv.pop;
}

// پوشش جمعیتی میخانه‌های کارا (۰..۱۰۰؛ بدون کارگر = ۱۰۰، آینه innInfo مشاور).
export function innCoverage(state, owner) {
  const ec = econOf(state, owner);
  const mp = state.mp && state.mp.enabled;
  const ow = mp ? (owner == null ? 0 : owner) : 0;
  let working = 0;
  for (const b of state.buildings || []) {
    if (!b || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if (b.type !== "inn" || (b.buildLeft || 0) > 0) continue;
    if (b.served) working++;
  }
  if (working === 0) return 0;
  const workers = (ec && ec.workers) || 0;
  if (workers <= 0) return 100;
  return Math.min(100, Math.round((100 * working * INN.perInn) / workers));
}
// پاداش محبوبیت میخانه: پله پوششی مرجع (۲۵/۵۰/۷۵/۱۰۰٪ → ۰٫۲۵/۰٫۵/۰٫۷۵/۱
// × fullBonus = ۰/۲/۴/۶/۸؛ فاز ۱ بند ۹۴ — دفترچه پله می‌دهد، نه خطی).
export function innBonus(state, owner) {
  const cov = innCoverage(state, owner);
  const step = cov >= 100 ? 1 : cov >= 75 ? 0.75 : cov >= 50 ? 0.5 : cov >= 25 ? 0.25 : 0;
  return Math.round(INN.fullBonus * step);
}
// شمار مست‌ها (فاز ۱ بند ۷۸ — §۵.۶): هر میخانه کارا (سروکننده) به‌اندازه داده
// مست می‌سازد؛ صرفاً نمایشی و مشتق خالص (بدون میدان تازه → بدون تغییر
// ذخیره/هش‌مدل/ری‌پلی). خالص و MP-aware (آینه innCoverage).
export function drunkards(state, owner) {
  const mp = state.mp && state.mp.enabled;
  const ow = mp ? (owner == null ? 0 : owner) : 0;
  let working = 0;
  for (const b of state.buildings || []) {
    if (!b || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if (b.type !== "inn" || (b.buildLeft || 0) > 0) continue;
    if (b.served) working++;
  }
  return working * INN.drunkardsPerInn;
}
// شمار بناهای دینی کارا به‌تفکیک نوع (سالم + تکمیل‌شده + کشیش‌دار خودی) —
// پایه پاداش ثابت کلیسا/کلیسای جامع (بند ۷۵). خالص و MP-aware.
export function religionWorking(state, owner) {
  const mp = state.mp && state.mp.enabled;
  const ow = mp ? (owner == null ? 0 : owner) : 0;
  const out = { chapel: 0, church: 0, cathedral: 0 };
  for (const b of state.buildings || []) {
    if (!b || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if (!RELIGION_TYPES.includes(b.type) || (b.buildLeft || 0) > 0) continue;
    if (!b.staffed) continue;
    out[b.type]++;
  }
  return out;
}
// پاداش محبوبیت مذهب (فاز ۱ بند ۷۵): پله پوششی جدول §۵.۵ (۲۵→+۲ … ۱۰۰→+۸،
// بالاترین پله ردشده) + ثابت حضور: کلیسای کارا +۱ و کلیسای جامع کارا +۲
// (متن §۳.۵؛ ⚠️ جدول ساختمان‌ها هر دو را +۲ می‌گوید — متن §۳.۵ ملاک شد).
// پوشش در شکاف فرسایش ۰ است ولی ثابت حضور («وجود») می‌ماند.
export function religionBonus(state, owner) {
  const cov = religionCoverage(state, owner);
  let step = 0;
  for (let i = 0; i < RELIGION.steps.length; i++) {
    if (cov >= RELIGION.steps[i]) step = RELIGION.stepBonus[i];
  }
  const w = religionWorking(state, owner);
  return step + (w.church > 0 ? RELIGION.churchBonus : 0) + (w.cathedral > 0 ? RELIGION.cathedralBonus : 0);
}
// پوشش تبرک مذهبی (۰..۱۰۰؛ فاز ۱ بند ۷۲): ظرفیت جمعی بناهای دینی کارا
// (سالم + تکمیل‌شده + کشیش‌دار خودی) تقسیم بر جمعیت؛ بدون کارگر = ۱۰۰،
// بدون بنای کارا = ۰. خالص و MP-aware (آینه innCoverage).
export function religionCoverage(state, owner) {
  const ec = econOf(state, owner);
  const mp = state.mp && state.mp.enabled;
  const ow = mp ? (owner == null ? 0 : owner) : 0;
  let cap = 0;
  for (const b of state.buildings || []) {
    if (!b || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if (!RELIGION_TYPES.includes(b.type) || (b.buildLeft || 0) > 0) continue;
    if (!b.staffed) continue;
    cap += RELIGION[b.type];
  }
  if (cap === 0) return 0;
  if (!blessActive(state.tick || 0)) return 0; // فرسایش دوره‌ای (فاز ۱ بند ۷۳)
  const workers = (ec && ec.workers) || 0;
  if (workers <= 0) return 100;
  return Math.min(100, Math.round((100 * cap) / workers));
}
// عامل ترس (فاز ۱ بند ۷۹ — §۵.۷): مقیاس min..max (مرجع ∓۵)؛ چیزهای خوب
// (باغ/تندیس، بند ۸۰) امتیاز مثبت و چیزهای بد (بند ۸۱) امتیاز منفی می‌دهند —
// هر بنا به‌اندازه fearGood/fearBad کاتالوگ (سالم + تکمیل‌شده + خودی)؛ هر
// ptsPerLevel امتیاز = ۱ سطح (بند ۹۷ — §۱۸.۵)، بعد گیره به بازه داده. اثرها
// عین مرجع: بهره‌وری کار ∓workPct٪ هر سطح (خوب‌ها کار را کند می‌کنند —
// معطلی پس از تحویل در باغ)، حمله/روحیه ±attackPct٪ هر سطح (جدول
// Attack Rating)، محبوبیت popPer هر سطح. خالص و MP-aware؛ بدون میدان تازه.
export const FEAR = {
  min: TUNING.fear.min,
  max: TUNING.fear.max,
  workPct: TUNING.fear.workPct,
  attackPct: TUNING.fear.attackPct,
  popPer: TUNING.fear.popPer,
  ptsPerLevel: TUNING.fear.ptsPerLevel,
  source: TUNING.fear.source,
};
// آتش (0.148.0 — §۱۸.۴/#۲۱۵): شانس اشتعال با هر ضربه جنگی + درصد سوختن
// در ثانیه + شعاع/شانس گسترش به همسایه. سنگی نمی‌سوزد (پرچم flammable
// کاتالوگ)؛ چاه/حوض با شعاع extinguish خودشان خاموش می‌کنند.
// (فاز ۰ بند ۷: تک‌منبع data/tuning.json — fire.)
export const FIRE = {
  ignite: TUNING.fire.ignite,
  dmgPct: TUNING.fire.dmgPct,
  spreadRadius: TUNING.fire.spreadRadius,
  spreadChance: TUNING.fire.spreadChance,
  source: TUNING.fire.source,
};
export function fearLevel(state, owner) {
  return Math.max(FEAR.min, Math.min(FEAR.max, Math.trunc(fearRaw(state, owner) / FEAR.ptsPerLevel)));
}
// جمع خام امتیاز ترس (بدون تقسیم/گیره): خوب‌ها مثبت، بدها منفی — پایه
// fearLevel/fearNext. یک باغ تنها (۲ امتیاز) هنوز سطح نمی‌دهد.
export function fearRaw(state, owner) {
  const mp = state.mp && state.mp.enabled;
  const ow = mp ? (owner == null ? 0 : owner) : 0;
  let lv = 0;
  for (const b of state.buildings || []) {
    if (!b || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if ((b.buildLeft || 0) > 0) continue;
    const def = CONFIG.BUILDINGS[b.type];
    lv += ((def && def.fearGood) || 0) - ((def && def.fearBad) || 0);
  }
  return lv;
}
// امتیاز لازم برای سطح بعد (فاز ۱ بند ۸۲ — پنل Fear Factor): up = چند امتیاز
// خوب تا lv+۱ (در سقف null)، down = چند امتیاز بد تا lv−۱ (در کف null) — خالص.
export function fearNext(state, owner) {
  const raw = fearRaw(state, owner);
  const lv = Math.max(FEAR.min, Math.min(FEAR.max, Math.trunc(raw / FEAR.ptsPerLevel)));
  return {
    up: lv >= FEAR.max ? null : (lv + 1) * FEAR.ptsPerLevel - raw,
    down: lv <= FEAR.min ? null : raw - (lv - 1) * FEAR.ptsPerLevel,
  };
}
export function fearWorkCoef(lv) {
  return 1 - (FEAR.workPct / 100) * (lv || 0);
}
export function fearAttackPct(lv) {
  return FEAR.attackPct * (lv || 0);
}
export function fearAttackMult(state, owner) {
  return 1 + fearAttackPct(fearLevel(state, owner)) / 100;
}
export function fearPop(state, owner) {
  return FEAR.popPer * fearLevel(state, owner);
}
// بهره‌وری کارگر همان بنا (مالک بنا در MP): در سطح ۰ دقیقاً ۱ (بدون اثر).
export function workGain(state, b) {
  return fearWorkCoef(fearLevel(state, b && b.owner));
}
export function popTarget(state, owner) {
  const ec = econOf(state, owner);
  const t = 50 + taxPop(ec) + RATIONS[ec.rations].pop + stockPop(foodTotal(ec.resources)) + foodVariety(state, owner).bonus
    + innBonus(state, owner) + religionBonus(state, owner) + fearPop(state, owner) + crowdPop(state, owner) + eventBonus(state);
  return Math.max(0, Math.min(100, t));
}

// میخانه سروکننده: دست‌کم یک میخانه با served (آبجو خورده در چرخه جاری).
// در MP فقط میخانه خودی.
// رویدادهای موقت §۵.۴ (فاز ۱ بندهای ۷۰/۷۱): پنجره‌های دوره‌ای خالص از tick —
// بدون میدان تازه، پس بدون تغییر ذخیره/هش‌مدل/ری‌پلی‌فرمت (فقط مقدار هش وقتی
// پنجره‌ای در بازه سناریو باشد)؛ در MP سراسری (همان tick برای همه).
export function activeEvents(state) {
  const t = (state && state.tick) || 0;
  const out = [];
  for (const k of ["fair", "lion", "disease"]) {
    const e = TUNING.events[k];
    if (t >= e.offsetTicks && ((t - e.offsetTicks) % e.everyTicks) < e.durationTicks) out.push(k);
  }
  return out;
}
export function eventBonus(state) {
  let s = 0;
  for (const k of activeEvents(state)) s += TUNING.events[k].pop;
  return s;
}
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

// نشانگر آتش اردو (فاز ۱ بند ۱۴): هر چرخش کامل دوره مهاجرت = ۱ دهقان.
// خالص و مشتق از tick (بدون میدان تازه → بدون تغییر ذخیره/هش/ری‌پلی): prog
// کسر چرخه جاری (۰ تا <۱؛ در تیک مهاجرت صفر چون ورود همان تیک رخ داده)،
// dir جهت چرخه (+۱ ورود / −۱ ترک / ۰ خنثی — همان شرط‌های حلقه مهاجرت)،
// waiting دهقانان بیکار کنار آتش (استخر آزاد پس از تخصیص).
export function campGauge(state, owner) {
  const ec = econOf(state, owner);
  const cap = housingCap(state, owner);
  const prog = MIG_PERIOD > 0 ? (state.tick % MIG_PERIOD) / MIG_PERIOD : 0;
  let dir = 0;
  if (ec.popularity >= IMM_IN && ec.workers < cap) dir = 1;
  else if (ec.popularity <= IMM_OUT && ec.workers > 0) dir = -1;
  // هاله قرمز = نامحبوب (بند ۱۵؛ آستانه §۵: زیر ۵۰ قرمز، ۵۰+ خنثی).
  const halo = ec.popularity < 50 ? "red" : "none";
  // ازدحام (بند ۱۷): جمعیت > مسکن — نشانگر جمعیت قرمز می‌شود.
  const crowded = ec.workers > cap;
  return { prog, dir, waiting: ec.freeWorkers, halo, crowded };
}

// برداشت ۱ گاو از گله خودی برای مصرف‌کننده‌های رقیب (فاز ۱ بند ۹۲ — رقابت
// پنیر/چرم/پرتاب‌گاو): از پرگاوترین لبنیاتی سالم خودی (تساوی = کمترین id)؛
// گاو کم می‌شود پس شیردوشی آن لبنیاتی تا رشد دوباره می‌خوابد. خالی = false.
// در sim صدا زده می‌شود (جهش بنا) ولی تصمیم خالص و آزمون‌پذیر است.
export function takeCow(state, owner) {
  const ow = owner == null ? 0 : owner;
  let best = null;
  for (const b of state.buildings || []) {
    if (!b || b.type !== "dairy" || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if ((b.cows || 0) <= 0) continue;
    if (!best || (b.cows || 0) > (best.cows || 0) ||
      ((b.cows || 0) === (best.cows || 0) && b.id < best.id)) best = b;
  }
  if (!best) return false;
  best.cows--;
  return true;
}

// شمار گاوهای گله خودی (لبنیاتی‌های سالم) — پیش‌بررسی خالص پرتاب/دباغی.
export function herdCows(state, owner) {
  const ow = owner == null ? 0 : owner;
  let n = 0;
  for (const b of state.buildings || []) {
    if (!b || b.type !== "dairy" || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    n += (b.cows || 0);
  }
  return n;
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
    // معدن سنگ بدون آغل گاو سالم خودی: گاوها سنگ را به انبار می‌برند (بند ۸۴)؛
    // پیشرفت فریز می‌شود و پرچم starved تا مشاور/هاور بگوید.
    if (b.type === "quarry" && !hasOxTether(state, 0)) { b.starved = true; continue; }
    if (r.needsCows) continue;
    if (r.consumesCow) continue; // دباغی چرخه خودش را دارد (پایین) // لبنیاتی چرخه خودش را دارد (گاوها → شیردوشی، پایین)
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
    b.progress = (b.progress || 0) + workGain(state, b);
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

  // لبنیاتی (فاز ۱ بند ۴۰): نخست گاوها (تا needsCows، هر cowGrowthTicks تیک
  // کارگری ۱ گاو) بعد شیردوشی (۱پنیر/everyTicks). گاوها سرمایه‌اند، کم نمی‌شوند.
  for (const b of state.buildings) {
    if (b.type !== "dairy") continue;
    if ((b.owner == null ? 0 : b.owner) !== 0) continue;
    if (!b.staffed || underConstruction(b)) continue;
    b.starved = false;
    const r = RATES.dairy;
    if ((b.cows || 0) < r.needsCows) {
      b.cowTicks = (b.cowTicks || 0) + 1;
      if (b.cowTicks >= r.cowGrowthTicks) { b.cowTicks = 0; b.cows = (b.cows || 0) + 1; }
      continue;
    }
    b.progress = (b.progress || 0) + workGain(state, b);
    if (b.progress >= r.everyTicks) {
      b.progress = 0;
      state.resources.cheese = Math.min(capFor(state, "cheese"), state.resources.cheese + r.amount);
      state.producedTotal += r.amount;
    }
  }

  // دباغی (فاز ۱ بند ۲۰۰): هر چرخه ۱ گاو از گله خودی ← ۱ چرم. بی‌گاو =
  // starved (در انتظار گاو؛ پیشرفت در آستانه می‌ماند تا با رسیدن گاو همان
  // تیک بزند). رقابت با شیردوشی از takeCow می‌آید (بند ۹۲).
  for (const b of state.buildings) {
    if (b.type !== "tannery") continue;
    if ((b.owner == null ? 0 : b.owner) !== 0) continue;
    if (!b.staffed || underConstruction(b)) continue;
    const r = RATES.tannery;
    if ((b.progress || 0) < r.everyTicks) {
      b.starved = false;
      b.progress = (b.progress || 0) + workGain(state, b);
    }
    if ((b.progress || 0) >= r.everyTicks) {
      if (takeCow(state, 0)) {
        b.progress = 0;
        b.starved = false;
        state.resources.leather = Math.min(capFor(state, "leather"), (state.resources.leather || 0) + r.amount);
        state.producedTotal += r.amount;
      } else {
        b.starved = true;
        b.progress = r.everyTicks;
      }
    }
  }

  // میخانه (0.21.0): هر ۵۰ تیک ۱ آبجو می‌خورد؛ served تا چرخه بعد می‌ماند
  // (پیش از بلوک مالیات/محبوبیت تا هدف همان تیک تازه باشد). بدون آبجو = خاموش.
  // served در ذخیره می‌ماند (بند ۶) — پس از load چرخه همان‌جا ادامه می‌یابد.
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
    if (eatOneUnit(state.resources, state.offFood)) state.consumedTotal++;
    else state.shortageTotal++;
  }

  // مالیات + رانش محبوبیت، هر ۵۰ تیک
  if (state.tick > 0 && state.tick % POP_PERIOD === 0) {
    const tax = TAX[state.tax];
    // بند ۹۳: رشوه بدون پوشش کامل = نه کسر، نه اثر.
    if (tax.goldPerWorker >= 0 || bribeAffordable(state)) {
      state.resources.gold = Math.min(capFor(state, "gold"), state.resources.gold + state.workers * tax.goldPerWorker);
    }
    const target = popTarget(state);
    state.popTarget = target;
    const d = target - state.popularity;
    state.popDir = d === 0 ? 0 : Math.sign(d);
    if (d !== 0) state.popularity += Math.sign(d) * Math.min(POP_STEP, Math.abs(d));
  }

  // مهاجرت، هر ۱۰۰ تیک (بند ۶۷: بیش از ۲۴ بیکار کنار آتش نه؛ بند ۱۰۱: سقف جمعیت)
  if (state.tick > 0 && state.tick % MIG_PERIOD === 0) {
    if (state.popularity >= IMM_IN && state.workers < state.workerCap && state.freeWorkers < CAMP_IDLE_MAX && !atPopCap(state)) state.workers++;
    else if (state.popularity <= IMM_OUT && state.workers > 0) state.workers--;
  }

  // گیره اطمینان (سقف پویا: ویرانی انبار، مازاد را می‌تراشد)
  for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows", "meat", "cheese", "apples", "leather"]) {
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
    if (b.type === "quarry" && !hasOxTether(state, ow)) { b.starved = true; continue; }
    if (r.needsCows) continue;
    if (r.consumesCow) continue; // دباغی چرخه خودش را دارد (پایین) // لبنیاتی چرخه خودش را دارد (گاوها → شیردوشی، پایین)
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
    b.progress = (b.progress || 0) + workGain(state, b);
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
    if (!own(b) || b.type !== "dairy") continue;
    if (!b.staffed || underConstruction(b)) continue;
    b.starved = false;
    const r = RATES.dairy;
    if ((b.cows || 0) < r.needsCows) {
      b.cowTicks = (b.cowTicks || 0) + 1;
      if (b.cowTicks >= r.cowGrowthTicks) { b.cowTicks = 0; b.cows = (b.cows || 0) + 1; }
      continue;
    }
    b.progress = (b.progress || 0) + workGain(state, b);
    if (b.progress >= r.everyTicks) {
      b.progress = 0;
      ec.resources.cheese = Math.min(capFor(state, "cheese", ow), ec.resources.cheese + r.amount);
      ec.producedTotal += r.amount;
    }
  }

  // دباغی (فاز ۱ بند ۲۰۰ — آینه سولو، جدا به‌ازای هر مالک).
  for (const b of state.buildings) {
    if (!own(b) || b.type !== "tannery") continue;
    if (!b.staffed || underConstruction(b)) continue;
    const r = RATES.tannery;
    if ((b.progress || 0) < r.everyTicks) {
      b.starved = false;
      b.progress = (b.progress || 0) + workGain(state, b);
    }
    if ((b.progress || 0) >= r.everyTicks) {
      if (takeCow(state, ow)) {
        b.progress = 0;
        b.starved = false;
        ec.resources.leather = Math.min(capFor(state, "leather", ow), (ec.resources.leather || 0) + r.amount);
        ec.producedTotal += r.amount;
      } else {
        b.starved = true;
        b.progress = r.everyTicks;
      }
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
    if (eatOneUnit(ec.resources, ec.offFood)) ec.consumedTotal++;
    else ec.shortageTotal++;
  }

  if (state.tick > 0 && state.tick % POP_PERIOD === 0) {
    const tax = TAX[ec.tax];
    // بند ۹۳ (آینه سولو): رشوه بدون پوشش کامل = نه کسر، نه اثر.
    if (tax.goldPerWorker >= 0 || bribeAffordable(ec)) {
      ec.resources.gold = Math.min(capFor(state, "gold", ow), ec.resources.gold + ec.workers * tax.goldPerWorker);
    }
    const target = popTarget(state, ow);
    ec.popTarget = target;
    const d = target - ec.popularity;
    ec.popDir = d === 0 ? 0 : Math.sign(d);
    if (d !== 0) ec.popularity += Math.sign(d) * Math.min(POP_STEP, Math.abs(d));
  }

  if (state.tick > 0 && state.tick % MIG_PERIOD === 0) {
    if (ec.popularity >= IMM_IN && ec.workers < ec.workerCap && ec.freeWorkers < CAMP_IDLE_MAX && !atPopCap(state, ow)) ec.workers++;
    else if (ec.popularity <= IMM_OUT && ec.workers > 0) ec.workers--;
  }

  for (const k of ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows", "meat", "cheese", "apples", "leather"]) {
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
    // بند ۹۳: رشوه بدون پوشش کامل درآمد انتظاری ندارد (آینه گیت sim).
    if (TAX[ec.tax].goldPerWorker < 0 && !bribeAffordable(ec)) return 0;
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
