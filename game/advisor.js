// مشاور نمایشی فاز ۰ بند ۹ (۲۲.۱ DoD: tooltip/panel/warning) — خالص و فقط‌خواندنی.
// هیچ تابعی state را تغییر نمی‌دهد (تست t_advisor_pure) و هیچ عددی hard-code
// نیست: همه اعداد از TUNING لودشده (TAX/RATIONS/STOCK_POP/housingCap) می‌آیند.
import { TAX, RATIONS, STOCK_POP, EAT_THRESHOLD, POP_PERIOD, housingCap, econOf, foodVariety, FOOD_TYPES, workersNeeded, INN, innBonus, drunkards, RELIGION_TYPES, religionCoverage, religionBonus, blessActive, bribeAffordable, FEAR, fearLevel, fearNext, fearWorkCoef, fearAttackPct, fearPop, foodTotal, activeEvents, STORE_RES, capFor, popTarget } from "./economy.js";
import { aiPersonalityName } from "./ai.js";
import { armyValue } from "./combat.js";

// اطلاعات نمایشی یک سطح مالیات (نام چندزبانی + اعداد داده) — tooltip و پنل.
export function taxInfo(id) {
  const lv = TAX[id];
  if (!lv) return null;
  return { id, name: lv.name, goldPerWorker: lv.goldPerWorker, pop: lv.pop };
}

// اطلاعات نمایشی یک سطح جیره — foodNum مضرب مصرف نسبت به کامل (=۲) است.
export function rationInfo(id) {
  const lv = RATIONS[id];
  if (!lv) return null;
  return { id, name: lv.name, foodNum: lv.foodNum, pop: lv.pop };
}

// پنل Inn (فاز ۱ بند ۲۴؛ پاداش از بند ۵۱): بشکه‌ها (آبجوی انبار)،
// میخانه‌های کارا/کل، درصد پوشش جمعیت (هر میخانه کارا perInn نفر از داده
// تنظیم) + پاداش محبوبیت جاری (مقیاس پوشش) — خالص و MP-aware.
export function innInfo(state, owner) {
  const ec = econOf(state, owner);
  const mp = state.mp && state.mp.enabled;
  const ow = mp ? (owner == null ? 0 : owner) : 0;
  let total = 0, working = 0;
  for (const b of state.buildings || []) {
    if (!b || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if (b.type !== "inn" || (b.buildLeft || 0) > 0) continue;
    total++;
    if (b.served) working++;
  }
  const perInn = INN.perInn;
  const workers = (ec && ec.workers) || 0;
  const coverage = workers > 0 ? Math.min(100, Math.round((100 * working * perInn) / workers)) : 100;
  return { barrels: (ec && ec.resources && ec.resources.beer) || 0, total, working, coverage, bonus: innBonus(state, owner), drunkards: drunkards(state, owner) };
}

// پنل مذهب (فاز ۱ بند ۷۴): بناهای دینی کل/کارا (کشیش‌دار)، درصد تبرک‌شده
// جمعیت (پوشش از داده — با رشد جمعیت رقیق می‌شود: بنای بیشتر لازم است) و
// وضعیت پنجره تبرک جاری — خالص و MP-aware (آینه innInfo).
export function religionInfo(state, owner) {
  const mp = state.mp && state.mp.enabled;
  const ow = mp ? (owner == null ? 0 : owner) : 0;
  let total = 0, working = 0;
  for (const b of state.buildings || []) {
    if (!b || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if (!RELIGION_TYPES.includes(b.type) || (b.buildLeft || 0) > 0) continue;
    total++;
    if (b.staffed) working++;
  }
  return { total, working, coverage: religionCoverage(state, owner), active: blessActive((state && state.tick) || 0), bonus: religionBonus(state, owner) };
}

// پنل ترس (فاز ۱ بند ۷۹ — §۵.۷): سطح ∓۵ (خوب‌ها مثبت/بدها منفی، گیره داده) +
// اثرهای جاری (بهره‌وری کار، حمله/روحیه، محبوبیت) — خالص و MP-aware.
export function fearInfo(state, owner) {
  const lv = fearLevel(state, owner);
  return { level: lv, coef: fearWorkCoef(lv), attackPct: fearAttackPct(lv), pop: fearPop(state, owner), next: fearNext(state, owner) };
}

// نشانگر سبز مصرف (فاز ۱ بند ۳۰): کسر پرشدن انباشت مصرف (هر بار پر شدن =
// ۱ واحد غذا) + میله متنی ۵خانه‌ای — خالص و MP-aware.
export function eatGauge(state, owner) {
  const ec = econOf(state, owner);
  const acc = (ec && ec.eatAcc) || 0;
  const prog = EAT_THRESHOLD > 0 ? Math.max(0, Math.min(1, acc / EAT_THRESHOLD)) : 0;
  return { prog };
}
export function eatMeter(prog) {
  const f = Math.max(0, Math.min(5, Math.round((prog || 0) * 5)));
  return "🟢" + "▓".repeat(f) + "░".repeat(5 - f);
}

// سه عدد غذا (فاز ۱ بند ۳۱): موجودی + مدت دوام (دقیقه، با نرخ مصرف جاری —
// آینه فرمول netPerMinute) + انواع (از foodVariety) — خالص و MP-aware.
export function foodInfo(state, owner) {
  const ec = econOf(state, owner);
  const mp = state.mp && state.mp.enabled;
  const ow = mp ? (owner == null ? 0 : owner) : 0;
  let mouths = 0;
  for (const b of state.buildings || []) {
    if (!b || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if (!b.staffed) continue;
    mouths += workersNeeded(b);
  }
  const rate = (mouths * (RATIONS[ec.rations].foodNum / 2) * 600) / 200;
  const stock = foodTotal(ec && ec.resources);
  return { stock, lastsMin: rate > 0 ? stock / rate : null, ...foodVariety(state, owner) };
}

// گزارش دقیق غذا (فاز ۱ بند ۸۶ — §۶.۳): مقدار دقیق هر نوع (برخلاف نوار
// تقریبیِ بند ۲۷ همیشه دقیق است) + وضعیت روشن/خاموش هر نوع + جمع و دوام
// (آینه foodInfo) — خالص و MP-aware.
export function foodReport(state, owner) {
  const ec = econOf(state, owner);
  const res = (ec && ec.resources) || {};
  const off = (ec && ec.offFood) || [];
  const rows = FOOD_TYPES.map((k) => ({ type: k, amount: (res[k] || 0), on: !off.includes(k) }));
  const info = foodInfo(state, owner);
  return { rows, total: info.stock, lastsMin: info.lastsMin, types: info.types };
}

// داخل انبارغذا (فاز ۱ بند ۸۷ — §۶.۳ «hover = سقف برداشته می‌شود»): سهم
// نمایشی هر نوع برای رسم داخل انبار — تا ۴ کیسه به‌ازای هر نوع (هر کیسه ≈
// ۲۵ واحد؛ مقیاس نمایشی ثابت، نه قانون sim) + رنگ هر نوع + روشن/خاموش —
// خالص و MP-aware.
export const FOOD_SACK_UNIT = 25;
export const FOOD_SACK_MAX = 4;
export const FOOD_COLORS = { food: "#d9c48a", meat: "#c46a5a", cheese: "#e8cf6e", apples: "#7fc46a" };
export function granaryInterior(state, owner) {
  const ec = econOf(state, owner);
  const res = (ec && ec.resources) || {};
  const off = (ec && ec.offFood) || [];
  return FOOD_TYPES.map((k) => {
    const amount = (res[k] || 0);
    const sacks = amount <= 0 ? 0 : Math.max(1, Math.min(FOOD_SACK_MAX, Math.ceil(amount / FOOD_SACK_UNIT)));
    return { type: k, amount, on: !off.includes(k), sacks, color: FOOD_COLORS[k] || "#cccccc" };
  });
}

// داخل انبار (فاز ۱ بند ۸۳ — §۶.۱ «هر خانه تا ۴ نوع منبع»): ۴ کالای خانواده
// انبار (STORE_RES از داده: چوب/سنگ/طلا/چرم) + سقف و سهم پرشدگی هر نوع برای
// رسم توده هر خانه — خالص و MP-aware (الگوی granaryInterior).
export const STOCKPILE_TYPES = [...STORE_RES];
export const STOCK_COLORS = { wood: "#8d6b3f", stone: "#8a8d94", gold: "#e3b83c", leather: "#a85638" };
export function stockpileInterior(state, owner) {
  const ec = econOf(state, owner);
  const res = (ec && ec.resources) || {};
  return STOCKPILE_TYPES.map((k) => {
    const amount = (res[k] || 0);
    const cap = Math.max(1, capFor(state, k, owner));
    const share = Math.max(0, Math.min(1, amount / cap));
    return { type: k, amount, cap, share, color: STOCK_COLORS[k] || "#cccccc" };
  });
}

// چیدمان توده‌های هر خانه انبار ۲×۲ (بند ۸۳): خانه i میله‌ای برای هر ۴ نوع
// (ارتفاع ∝ سهم، حداکثر ۴ میله در هر خانه) — خالص، ورودی رندر.
export function stockpilePiles(rows) {
  const list = Array.isArray(rows) ? rows.slice(0, 4) : [];
  const out = [];
  for (let sq = 0; sq < 4; sq++) {
    const bars = [];
    for (const row of list) {
      if ((row.share || 0) <= 0) continue;
      bars.push({ type: row.type, h: row.share, color: row.color });
    }
    out.push({ square: sq, bars: bars.slice(0, 4) });
  }
  return out;
}

// گزارش خزانه (فاز ۱ بند ۳۵): موجودی طلا + درآمد مالیاتی در دقیقه — آینه
// فرمول sim (workers × goldPerWorker × ۶۰۰ / POP_PERIOD، مثل netPerMinute) —
// خالص و MP-aware.
export function treasuryInfo(state, owner) {
  const ec = econOf(state, owner);
  const lv = (ec && TAX[ec.tax]) || TAX.none;
  const workers = (ec && ec.workers) || 0;
  // بند ۹۳: رشوه بدون پوشش کامل درآمد انتظاری ندارد (آینه گیت sim).
  const gated = lv.goldPerWorker < 0 && !bribeAffordable(ec);
  return {
    balance: (ec && ec.resources && ec.resources.gold) || 0,
    workers,
    level: (ec && taxInfo(ec.tax)) || taxInfo("none"),
    perMin: gated ? 0 : (workers * lv.goldPerWorker * 600) / POP_PERIOD,
  };
}

// خلاصه سیاست جاری مالک (پنل مالیات/جیره/میخانه/مصرف/ذخیره/خزانه) — MP-aware مثل refreshPanel.
export function policySummary(state, owner) {
  const ec = econOf(state, owner);
  return {
    tax: taxInfo(ec.tax) || taxInfo("none"),
    rations: rationInfo(ec.rations) || rationInfo("normal"),
    food: foodVariety(state, owner),
    inn: innInfo(state, owner),
    religion: religionInfo(state, owner),
    fear: fearInfo(state, owner),
    eat: eatGauge(state, owner),
    stores: foodInfo(state, owner),
    report: foodReport(state, owner),
    events: activeEvents(state),
    treasury: treasuryInfo(state, owner),
  };
}

// حال‌وحوصله کاتب از محبوبیت (0.146.0 — §۳.۲): خالص؛ آستانه‌ها از داده؟
// نه — سه باند نمایشی ثابت‌اند (مثل eatMeter): glad‎≥۷۵، content‎≥۵۰، وگرنه grim.
export function scribeMood(pop) {
  const p = typeof pop === "number" ? pop : 50;
  if (p >= 75) return "glad";
  if (p >= 50) return "content";
  return "grim";
}

// گزارش‌های کاتب (0.146.0 — §۳.۲): ۶ بخش از infoهای موجود (مالیات/جیره/
// انبار/میخانه/مذهب/ترس) + ۲ بخش 0.147.0 (محبوبیت/خزانه، §۳.۳)؛ هر سطر
// {key,label,value} با label از i18n و value نمایشیِ آماده. خالص و MP-aware
// (مثل policySummary) — state لمس نمی‌شود.
export function scribeReports(state, owner) {
  const tax = taxInfo((econOf(state, owner) || {}).tax) || taxInfo("none");
  const rat = rationInfo((econOf(state, owner) || {}).rations) || rationInfo("normal");
  const stores = foodInfo(state, owner);
  const inn = innInfo(state, owner);
  const rel = religionInfo(state, owner);
  const fear = fearInfo(state, owner);
  const tre = treasuryInfo(state, owner);
  const ec = econOf(state, owner) || {};
  const L = (k) => `main.scribe.${k}`;
  return [
    { key: "tax", rows: [
      { key: "level", label: L("level"), value: tax.name },
      { key: "perMin", label: L("perMin"), value: Math.round(tre.perMin * 10) / 10 },
    ] },
    { key: "rations", rows: [
      { key: "level", label: L("level"), value: rat.name },
    ] },
    { key: "stores", rows: [
      { key: "stock", label: L("stock"), value: stores.stock },
      { key: "lasts", label: L("lasts"), value: stores.lastsMin == null ? null : Math.round(stores.lastsMin * 10) / 10 },
      { key: "types", label: L("types"), value: stores.types },
    ] },
    { key: "inn", rows: [
      { key: "working", label: L("working"), value: `${inn.working}/${inn.total}` },
      { key: "coverage", label: L("coverage"), value: inn.coverage },
      { key: "bonus", label: L("bonus"), value: inn.bonus },
    ] },
    { key: "religion", rows: [
      { key: "working", label: L("working"), value: `${rel.working}/${rel.total}` },
      { key: "coverage", label: L("coverage"), value: rel.coverage },
      { key: "bonus", label: L("bonus"), value: rel.bonus },
    ] },
    { key: "fear", rows: [
      { key: "level", label: L("level"), value: fear.level },
      { key: "pop", label: L("pop"), value: fear.pop },
    ] },
    // محبوبیت (0.147.0 — §۳.۳): فعلی/هدف از econ؛ خالص و MP-aware.
    { key: "popularity", rows: [
      { key: "now", label: L("now"), value: typeof ec.popularity === "number" ? ec.popularity : 50 },
      { key: "target", label: L("target"), value: popTarget(state, owner) },
    ] },
    // خزانه (0.147.0 — §۳.۳): موجودی/درآمد از treasuryInfo؛ خالص و MP-aware.
    { key: "treasury", rows: [
      { key: "balance", label: L("balance"), value: tre.balance },
      { key: "perMin", label: L("perMin"), value: Math.round(tre.perMin * 10) / 10 },
    ] },
  ];
}

// مقدار تقریبی نوار منابع (فاز ۱ بند ۲۷): زیر ۵۰ دقیق، ۵۰+ گرد به دهگان با
// پیشوند ~. خالص و فقط نمایشی (سوئیچ دقیق/تقریبی UI-side در main.js است).
export function approxRes(v) {
  const n = Math.max(0, Math.floor(v || 0));
  if (n < 50) return { text: String(n), approx: false };
  return { text: "~" + (Math.round(n / 10) * 10), approx: true };
}

// هشدارهای عملیاتی فاز-۰ با ترتیب اولویت و سقف ۵: رشوه با خزانه خالی (اثر
// اضافی ندارد — خط ۲۳۰ چک‌لیست)، قحطی غذا، ساختمان بی‌کارگر، انتظار ورودی،
// ازدحام مسکن، هشدار مالیات بی‌رحم‌ترین. فقط ساختمان‌های خودیِ سالمِ تکمیل‌شده شمرده می‌شوند.
export function advisorWarnings(state, owner) {
  const ec = econOf(state, owner);
  const mp = state.mp && state.mp.enabled;
  const ow = mp ? (owner == null ? 0 : owner) : 0;
  const out = [];
  const res = (ec && ec.resources) || {};
  const taxLv = TAX[ec.tax];
  if (taxLv && taxLv.goldPerWorker < 0 && (res.gold || 0) <= 0) out.push({ key: "bribeEmpty" });
  if (foodTotal(res) <= STOCK_POP.famineAt) out.push({ key: "famine" });
  let unstaffed = 0, starved = 0;
  for (const b of state.buildings || []) {
    if (!b || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if ((b.buildLeft || 0) > 0) continue;
    if (b.staffed === false) unstaffed++;
    if (b.starved === true) starved++;
  }
  if (unstaffed > 0) out.push({ key: "unstaffed", n: unstaffed });
  if (starved > 0) out.push({ key: "starved", n: starved });
  const cap = housingCap(state, owner);
  const workers = (ec && ec.workers) || 0;
  if (workers > cap) out.push({ key: "crowding", workers, cap });
  if (ec.tax === "cruellerThanCruel") out.push({ key: "crueller" }); // بند ۶۸: فقط کوتاه‌مدت
  return out.slice(0, 5);
}

// اعلان صوتی مشاور (0.181.0 — §3.3/بند 166): کلیدهای هشدار تازه نسبت به
// دفعه قبل — فقط تازه‌ها بوق می‌خورند، نه تکرار هر فریم. خالص و MP-خنثی
// (ورودی‌اش خروجی advisorWarnings است؛ state را لمس نمی‌کند).
export function warnAlarmKeys(prevKeys, warnings) {
  const seen = new Set(Array.isArray(prevKeys) ? prevKeys : []);
  const fresh = [];
  for (const w of warnings || []) {
    if (!w || seen.has(w.key)) continue;
    seen.add(w.key);
    fresh.push(w.key);
  }
  return fresh;
}

// جدول افتخار (0.177.0 — بند 740: Order of Merit). هر سو/بازیکن: نام،
// طلا، شمار یگان زنده، ارباب زنده. سولو = بازیکن + AI فعال؛ MP = شکاف‌ها.
// خالص و MP-aware؛ مرتب‌سازی با sortMerit در نما (کلید/جهت گذرای UI).
// پله قدرت سپاه (0.180.0 — بند 745/§10.5): ۵ نقطه رنگی از ارزش خرید سپاه.
// آستانه‌ها guess (ثبت در numbers-registry): [150, 400, 800, 1400].
// خالص؛ dots برای رندر، level برای سورت/تست.
const POWER_STEPS = [150, 400, 800, 1400];
export const POWER_COLORS = ["#66bb6a", "#9ccc65", "#ffca28", "#ff9800", "#ef5350"];
export function powerTier(v) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  let level = 1;
  for (const s of POWER_STEPS) if (n >= s) level++;
  const dots = "●".repeat(level) + "○".repeat(5 - level);
  return { level, dots, color: POWER_COLORS[level - 1] };
}

export function meritRows(state) {
  const units = state.units || [];
  const live = (f) => units.filter((u) => !u.dead && f(u));
  const mp = state.mp && state.mp.enabled;
  const rows = [];
  if (mp) {
    const names = state.mpNames || [];
    (state.mpres || []).forEach((pl, i) => {
      const us = live((u) => (u.owner == null ? 0 : u.owner) === i);
      rows.push({
        slot: i,
        name: (pl && pl.name) || names[i] || ("P" + (i + 1)),
        nameKey: null,
        gold: (pl && pl.resources && pl.resources.gold) || 0,
        army: us.length,
        power: armyValue(us),
        lord: us.some((u) => u.type === "lord"),
        alive: !pl || pl.alive !== false,
      });
    });
    return rows;
  }
  const mine = live((u) => u.side !== "enemy");
  rows.push({
    slot: 0,
    name: null,
    nameKey: "main.scribe.merit.you",
    gold: (state.resources && state.resources.gold) || 0,
    army: mine.length,
    power: armyValue(mine),
    lord: mine.some((u) => u.type === "lord"),
    alive: !state.defeated,
  });
  const ai = state.ai;
  if (ai && ai.active) {
    const foe = live((u) => u.side === "enemy");
    rows.push({
      slot: 1,
      name: aiPersonalityName(ai),
      nameKey: null,
      gold: (ai.resources && ai.resources.gold) || 0,
      army: foe.length,
      power: armyValue(foe),
      lord: foe.some((u) => u.type === "lord"),
      alive: true,
    });
  }
  return rows;
}

// مرتب‌سازی جدول افتخار (خالص): کلید gold/army/power/name؛ جهت 1/-1. خالص.
export function sortMerit(rows, key, dir) {
  const k = key === "gold" ? "gold" : key === "power" ? "power" : key === "name" ? "name" : "army";
  const d = dir === 1 ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const va = a[k], vb = b[k];
    if (typeof va === "string" || typeof vb === "string") return d * String(va).localeCompare(String(vb), "fa");
    return d * ((va || 0) - (vb || 0));
  });
}
