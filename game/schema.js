// اسکیمای رسمی داده (0.54.0 — #۱۳ از FEATURES، الگوی CHG-007 مرجع).
// اعتبارسنجی کاتالوگ‌های CONFIG (+ UNITS از combat) — بدون import تا در boot،
// تست هدلس و هر ابزار دیگری امن باشد (الگوی wallline/gestures).
// خروجی همیشه آرایه خطاست (خالی = معتبر)؛ هر خطا با مسیر می‌آید تا مقصر سریع
// پیدا شود، مثل: "BUILDINGS.mill.econ.consumes.wheat: منبع ناشناخته".
// قانون لایه‌بندی: فقط شکل/ارجاع‌ها بررسی می‌شوند، نه توازن اعداد (حدس‌بودن
// مقادیر با `source` ثبت است و تصمیم طراحی است، نه خطای اسکیما).

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isPosInt = (v) => Number.isInteger(v) && v > 0;
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0;
const isPosNum = (v) => typeof v === "number" && isFinite(v) && v > 0;
const isNonNegNum = (v) => typeof v === "number" && isFinite(v) && v >= 0;
const isNonEmptyStr = (v) => typeof v === "string" && v.length > 0;

// نام نقشه: غیرتهی و کوتاه. سقف دقیق در mapedit.js است (MAP_NAME_MAX)؛ اینجا
// فقط از ورودی‌های نامعقول (خالی/غول‌پیکر) جلوگیری می‌شود تا منبع حقیقت یکی بماند.
const MAP_NAME_LEN_MAX = 64;

// کلیدهای مجاز rules ساختمان (بقیه = تایپی/قانون فراموش‌شده).
const RULE_DEFS = { unique: "bool", anchorToAny: "bool", spacingFromSame: "int" };

function checkRules(rules, path, errs) {
  if (rules === null || rules === undefined) return;
  if (!isObj(rules)) { errs.push(`${path}: rules باید آبجکت یا null باشد`); return; }
  for (const k of Object.keys(rules)) {
    const want = RULE_DEFS[k];
    if (!want) { errs.push(`${path}.${k}: قانون ناشناخته (مجاز: ${Object.keys(RULE_DEFS).join("/")})`); continue; }
    const v = rules[k];
    const ok = want === "bool" ? typeof v === "boolean" : isNonNegInt(v);
    if (!ok) errs.push(`${path}.${k}: باید ${want === "bool" ? "بولین" : "صحیح نامنفی"} باشد`);
  }
}

// cost/consumes/startRes: کلیدها باید منبع شناخته‌شده باشند، مقادیر نامنفی.
// strict=false یعنی صفر/تهی مجاز است (keep با cost تهی).
function checkResMap(obj, path, resKeys, errs, { allowEmpty = true, positive = false } = {}) {
  if (!isObj(obj)) { errs.push(`${path}: باید آبجکت باشد`); return; }
  const keys = Object.keys(obj);
  if (!allowEmpty && keys.length === 0) errs.push(`${path}: تهی مجاز نیست`);
  for (const k of keys) {
    if (!resKeys.has(k)) { errs.push(`${path}.${k}: منبع ناشناخته`); continue; }
    const v = obj[k];
    const ok = positive ? isPosNum(v) : isNonNegNum(v);
    if (!ok) errs.push(`${path}.${k}: باید عدد ${positive ? "مثبت" : "نامنفی"} باشد`);
  }
}

function validateScalars(cfg, errs) {
  if (!isObj(cfg)) { errs.push("(ریشه): CONFIG باید آبجکت باشد"); return; }
  if (!isPosInt(cfg.GRID_W)) errs.push("GRID_W: باید صحیح مثبت باشد");
  if (!isPosInt(cfg.GRID_H)) errs.push("GRID_H: باید صحیح مثبت باشد");
  if (!isPosNum(cfg.TILE_W)) errs.push("TILE_W: باید عدد مثبت باشد");
  if (!isPosNum(cfg.TILE_H)) errs.push("TILE_H: باید عدد مثبت باشد");
  if (!isPosNum(cfg.TICK_HZ)) errs.push("TICK_HZ: باید عدد مثبت باشد");
  if (!isPosInt(cfg.MAX_TICKS_PER_FRAME)) errs.push("MAX_TICKS_PER_FRAME: باید صحیح مثبت باشد");
  if (!isNonNegInt(cfg.MAP_SEED)) errs.push("MAP_SEED: باید صحیح نامنفی باشد");
  if (!Array.isArray(cfg.SPEEDS) || cfg.SPEEDS.length === 0 || !cfg.SPEEDS.every(isPosNum)) {
    errs.push("SPEEDS: آرایه ناتهی از اعداد مثبت");
  }
}

function validateResources(res, errs) {
  if (!Array.isArray(res) || res.length === 0) {
    errs.push("RESOURCES: آرایه ناتهی لازم است");
    return new Set();
  }
  const keys = new Set();
  res.forEach((r, i) => {
    const p = `RESOURCES[${i}]`;
    if (!isObj(r) || !isNonEmptyStr(r.key)) { errs.push(`${p}: کلید غیرتهی لازم است`); return; }
    if (keys.has(r.key)) errs.push(`${p}: کلید تکراری «${r.key}»`);
    keys.add(r.key);
    if (!isNonEmptyStr(r.name)) errs.push(`${p} (${r.key}): نام فارسی لازم است`);
  });
  return keys;
}

function validateBuildings(blds, resKeys, errs) {
  if (!isObj(blds) || Object.keys(blds).length === 0) {
    errs.push("BUILDINGS: آبجکت ناتهی لازم است");
    return new Set();
  }
  const keys = new Set(Object.keys(blds));
  for (const k of keys) {
    const b = blds[k];
    const p = `BUILDINGS.${k}`;
    if (!isObj(b)) { errs.push(`${p}: باید آبجکت باشد`); continue; }
    if (b.key !== k) errs.push(`${p}: فیلد key باید «${k}» باشد`);
    if (!isNonEmptyStr(b.name)) errs.push(`${p}: نام فارسی لازم است`);
    if (!isPosInt(b.w) || !isPosInt(b.h)) errs.push(`${p}: w/h باید صحیح مثبت باشند`);
    if (!isPosNum(b.hp)) errs.push(`${p}: hp باید مثبت باشد`);
    if (typeof b.source !== "string" || b.source.length === 0) errs.push(`${p}: source (مرجع/حدس) لازم است`);
    if (!isNonNegInt(b.buildTime)) errs.push(`${p}: buildTime باید صحیح نامنفی باشد`);
    checkResMap(b.cost, `${p}.cost`, resKeys, errs, { allowEmpty: true });
    checkRules(b.rules, `${p}.rules`, errs);
    if (b.econ !== undefined && b.econ !== null) {
      const e = b.econ, ep = `${p}.econ`;
      if (!isObj(e)) { errs.push(`${ep}: باید آبجکت باشد`); continue; }
      if (!resKeys.has(e.produces)) errs.push(`${ep}.produces: منبع ناشناخته «${e.produces}»`);
      if (!isPosNum(e.amount)) errs.push(`${ep}.amount: باید مثبت باشد`);
      if (!isPosInt(e.everyTicks)) errs.push(`${ep}.everyTicks: باید صحیح مثبت باشد`);
      if (!isPosInt(e.workers)) errs.push(`${ep}.workers: باید صحیح مثبت باشد`);
      if (e.consumes !== undefined) {
        checkResMap(e.consumes, `${ep}.consumes`, resKeys, errs, { positive: true });
      }
      if (b.prod !== undefined && b.prod !== e.produces) {
        errs.push(`${p}: prod («${b.prod}») با econ.produces («${e.produces}») ناسازگار است`);
      }
    } else if (b.prod !== undefined && !resKeys.has(b.prod)) {
      errs.push(`${p}.prod: منبع ناشناخته «${b.prod}»`);
    }
    if (b.weapon !== undefined && b.weapon !== null) {
      const w = b.weapon, wp = `${p}.weapon`;
      if (!isObj(w) || !isPosNum(w.dmg) || !isPosInt(w.cd) || !isPosNum(w.range)) {
        errs.push(`${wp}: باید {dmg مثبت, cd صحیح مثبت, range مثبت} باشد`);
      }
    }
  }
  return keys;
}

function validateMaps(maps, errs) {
  if (!Array.isArray(maps) || maps.length === 0) {
    errs.push("MAPS: آرایه ناتهی لازم است");
    return;
  }
  const keys = new Set(), seeds = new Set();
  maps.forEach((m, i) => {
    const p = `MAPS[${i}]`;
    if (!isObj(m)) { errs.push(`${p}: باید آبجکت باشد`); return; }
    if (!isNonEmptyStr(m.key)) errs.push(`${p}: کلید غیرتهی لازم است`);
    else if (keys.has(m.key)) errs.push(`${p}: کلید تکراری «${m.key}»`);
    else keys.add(m.key);
    if (!isNonEmptyStr(m.name)) errs.push(`${p}: نام فارسی لازم است`);
    else if (m.name.length > MAP_NAME_LEN_MAX) errs.push(`${p}: نام بلندتر از ${MAP_NAME_LEN_MAX} نویسه`);
    if (!isNonNegInt(m.seed)) errs.push(`${p}: seed باید صحیح نامنفی باشد`);
    else if (seeds.has(m.seed)) errs.push(`${p}: سید تکراری ${m.seed}`);
    else seeds.add(m.seed);
  });
}

function validateAI(ai, bldKeys, resKeys, errs) {
  if (!isObj(ai)) { errs.push("AI: آبجکت لازم است"); return; }
  if (!isNonNegInt(ai.owner)) errs.push("AI.owner: باید صحیح نامنفی باشد");
  if (!isPosInt(ai.thinkEvery)) errs.push("AI.thinkEvery: باید صحیح مثبت باشد");
  checkResMap(ai.startRes, "AI.startRes", resKeys, errs, { allowEmpty: true });
  if (!isNonNegInt(ai.startWorkers)) errs.push("AI.startWorkers: باید صحیح نامنفی باشد");
  if (!isPosNum(ai.workerEvery)) errs.push("AI.workerEvery: باید مثبت باشد");
  if (!isNonNegNum(ai.goldPerWorker)) errs.push("AI.goldPerWorker: باید نامنفی باشد");
  if (!Array.isArray(ai.buildList) || ai.buildList.length === 0) {
    errs.push("AI.buildList: آرایه ناتهی لازم است");
  } else {
    ai.buildList.forEach((t, i) => {
      if (!bldKeys.has(t)) errs.push(`AI.buildList[${i}]: ساختمان ناشناخته «${t}»`);
    });
  }
  if (!Array.isArray(ai.raids) || ai.raids.length === 0) {
    errs.push("AI.raids: آرایه ناتهی لازم است");
  } else {
    let prevAt = -1;
    ai.raids.forEach((r, i) => {
      const p = `AI.raids[${i}]`;
      if (!isObj(r) || !isPosInt(r.at) || !isPosInt(r.n)) {
        errs.push(`${p}: باید {at صحیح مثبت, n صحیح مثبت} باشد`);
        return;
      }
      if (r.at <= prevAt) errs.push(`${p}: زمان‌بندی باید صعودی باشد`);
      prevAt = r.at;
    });
  }
  if (!isObj(ai.difficulties)) { errs.push("AI.difficulties: آبجکت لازم است"); return; }
  const wantDiffs = ["easy", "normal", "hard"];
  for (const d of wantDiffs) {
    const p = `AI.difficulties.${d}`;
    const v = ai.difficulties[d];
    if (!isObj(v)) { errs.push(`${p}: تعریف نشده است`); continue; }
    if (!isPosNum(v.raidAtMul)) errs.push(`${p}.raidAtMul: باید مثبت باشد`);
    if (!Number.isInteger(v.raidSizeAdd)) errs.push(`${p}.raidSizeAdd: باید صحیح باشد`);
    if (!isPosNum(v.goldMul)) errs.push(`${p}.goldMul: باید مثبت باشد`);
    if (!isPosNum(v.workerEveryMul)) errs.push(`${p}.workerEveryMul: باید مثبت باشد`);
  }
  if (!isObj(ai.diffNames)) { errs.push("AI.diffNames: آبجکت لازم است"); return; }
  for (const d of wantDiffs) {
    if (!isNonEmptyStr(ai.diffNames[d])) errs.push(`AI.diffNames.${d}: نام فارسی لازم است`);
  }
  // شخصیت‌های حریف (0.56.0): دیتای پروفایل‌ها + پیش‌فرض معتبر.
  if (!isObj(ai.personalities) || Object.keys(ai.personalities).length === 0) {
    errs.push("AI.personalities: آبجکت ناتهی لازم است");
    return;
  }
  if (!ai.personalities[ai.defaultPersonality]) {
    errs.push("AI.defaultPersonality: باید کلید یکی از پروفایل‌ها باشد");
  }
  for (const k of Object.keys(ai.personalities)) {
    const v = ai.personalities[k], p = `AI.personalities.${k}`;
    if (!isObj(v)) { errs.push(`${p}: باید آبجکت باشد`); continue; }
    if (!isNonEmptyStr(v.name)) errs.push(`${p}.name: نام فارسی لازم است`);
    if (typeof v.desc !== "string") errs.push(`${p}.desc: توضیح لازم است`);
    if (!Array.isArray(v.buildList) || v.buildList.length === 0) {
      errs.push(`${p}.buildList: آرایه ناتهی لازم است`);
    } else {
      v.buildList.forEach((t, i) => {
        if (!bldKeys.has(t)) errs.push(`${p}.buildList[${i}]: ساختمان ناشناخته «${t}»`);
      });
    }
    if (!isPosNum(v.raidAtMul)) errs.push(`${p}.raidAtMul: باید مثبت باشد`);
    if (!Number.isInteger(v.raidSizeAdd)) errs.push(`${p}.raidSizeAdd: باید صحیح باشد`);
    if (!isPosNum(v.goldMul)) errs.push(`${p}.goldMul: باید مثبت باشد`);
    if (!isPosNum(v.workerEveryMul)) errs.push(`${p}.workerEveryMul: باید مثبت باشد`);
    if (!(typeof v.archerP === "number" && v.archerP >= 0 && v.archerP <= 1)) {
      errs.push(`${p}.archerP: باید در [۰،۱] باشد`);
    }
  }
}

// بازار (0.64.0 — ب-۳): نرخ‌های خرید/فروش + بسته؛ sell ≤ buy (ضد آربیتراژ)،
// طلا قابل‌معامله نیست، کلیدها منبع شناخته‌شده.
function validateMarket(mkt, resKeys, errs) {
  if (!isObj(mkt)) { errs.push("MARKET: آبجکت لازم است"); return; }
  if (!isPosInt(mkt.lot)) errs.push("MARKET.lot: باید صحیح مثبت باشد");
  if (!isObj(mkt.rates) || Object.keys(mkt.rates).length === 0) {
    errs.push("MARKET.rates: آبجکت ناتهی لازم است");
    return;
  }
  for (const k of Object.keys(mkt.rates)) {
    const p = `MARKET.rates.${k}`;
    if (!resKeys.has(k)) { errs.push(`${p}: منبع ناشناخته`); continue; }
    if (k === "gold") { errs.push(`${p}: طلا ارز واسط است و قابل‌معامله نیست`); continue; }
    const r = mkt.rates[k];
    if (!isObj(r) || !isPosInt(r.buy) || !isPosInt(r.sell)) {
      errs.push(`${p}: باید {buy صحیح مثبت, sell صحیح مثبت} باشد`);
      continue;
    }
    if (r.sell > r.buy) errs.push(`${p}: فروش (sell) نباید از خرید (buy) بیشتر باشد (آربیتراژ)`);
  }
}

// صف آموزش (0.65.0 — انتخاب ۱-الف): سقف صف هر سربازخانه.
function validateTrain(trn, errs) {
  if (!isObj(trn)) { errs.push("TRAIN: آبجکت لازم است"); return; }
  if (!isPosInt(trn.queueCap) || trn.queueCap > 16) errs.push("TRAIN.queueCap: باید صحیح مثبت (حداکثر ۱۶) باشد");
}

function validateUnits(units, bldKeys, resKeys, errs) {
  if (!isObj(units) || Object.keys(units).length === 0) {
    errs.push("UNITS: آبجکت ناتهی لازم است");
    return;
  }
  for (const k of Object.keys(units)) {
    const u = units[k];
    const p = `UNITS.${k}`;
    if (!isObj(u)) { errs.push(`${p}: باید آبجکت باشد`); continue; }
    if (u.side !== "player" && u.side !== "enemy") errs.push(`${p}.side: باید player یا enemy باشد`);
    if (!isNonEmptyStr(u.name)) errs.push(`${p}: نام فارسی لازم است`);
    if (!isPosNum(u.hp)) errs.push(`${p}.hp: باید مثبت باشد`);
    if (!isNonNegInt(u.armor)) errs.push(`${p}.armor: باید صحیح نامنفی باشد`);
    if (!isPosNum(u.dmg)) errs.push(`${p}.dmg: باید مثبت باشد`);
    if (!isPosInt(u.cd)) errs.push(`${p}.cd: باید صحیح مثبت باشد`);
    if (!isPosNum(u.range)) errs.push(`${p}.range: باید مثبت باشد`);
    if (!isPosNum(u.speed)) errs.push(`${p}.speed: باید مثبت باشد`);
    if (!isNonNegNum(u.aggro)) errs.push(`${p}.aggro: باید نامنفی باشد`);
    if (u.cost !== undefined) {
      checkResMap(u.cost, `${p}.cost`, resKeys, errs, { allowEmpty: false });
    }
    if (u.requires !== undefined && !bldKeys.has(u.requires)) {
      errs.push(`${p}.requires: ساختمان ناشناخته «${u.requires}»`);
    }
    if (u.requiresWeapon !== undefined && !resKeys.has(u.requiresWeapon)) {
      errs.push(`${p}.requiresWeapon: منبع ناشناخته «${u.requiresWeapon}»`);
    }
    // مدت آموزش (0.65.0): یگان قابل‌استخدام باید trainTicks صحیح مثبت داشته باشد.
    if (u.side === "player" && u.cost && !u.noHire && !isPosInt(u.trainTicks)) {
      errs.push(`${p}.trainTicks: یگان استخدامی باید مدت آموزش صحیح مثبت داشته باشد`);
    } else if (u.trainTicks !== undefined && !isPosInt(u.trainTicks)) {
      errs.push(`${p}.trainTicks: باید صحیح مثبت باشد`);
    }
    if (u.minRange !== undefined && !(u.minRange >= 0 && u.minRange < u.range)) {
      errs.push(`${p}.minRange: باید نامنفی و کوچک‌تر از range باشد`);
    }
    if (u.bonusVsBld !== undefined && !isPosNum(u.bonusVsBld)) {
      errs.push(`${p}.bonusVsBld: باید مثبت باشد`);
    }
    for (const f of ["siege", "halfVsUnit", "needsDeploy", "noHire"]) {
      if (u[f] !== undefined && typeof u[f] !== "boolean") errs.push(`${p}.${f}: باید بولین باشد`);
    }
  }
}

// نقطه ورود: همه خطاهای شکل/ارجاع CONFIG و UNITS. خالی = معتبر.
export function validateConfig(cfg, units) {
  const errs = [];
  if (!isObj(cfg)) return ["(ریشه): CONFIG باید آبجکت باشد"];
  validateScalars(cfg, errs);
  const resKeys = validateResources(cfg.RESOURCES, errs);
  const bldKeys = validateBuildings(cfg.BUILDINGS, resKeys, errs);
  validateMaps(cfg.MAPS, errs);
  validateMarket(cfg.MARKET, resKeys, errs);
  validateTrain(cfg.TRAIN, errs);
  validateAI(cfg.AI, bldKeys, resKeys, errs);
  validateUnits(units, bldKeys, resKeys, errs);
  return errs;
}
