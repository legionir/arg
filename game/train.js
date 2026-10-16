// صف آموزش سربازخانه (0.65.0 — انتخاب ۱-الف کاربر).
//
// قرارداد:
// - استخدام بازیکن (سولو/MP) دیگر فوری نیست: فرمان `hire` هزینه را اتمی
//   (غذا/طلا/سلاح، همان چهار شرط validateHire) همان لحظه می‌پردازد و سفارش
//   را ته صفِ سربازخانه خودی می‌گذارد؛ تحویل پس از trainTicks تیک.
// - `hireUnit` فوری می‌ماند و فقط مصرف داخلی دارد (یورش AI، تست‌های رزمی،
//   رگرسیون، firsttenِ Smoke؟ نه — firstten از صف می‌گذرد). توازن یورش‌ها
//   دست‌نخورده می‌ماند؛ این تصمیم در CHANGELOG ثبت است.
// - لغو با `cancelTrain` = بازپرداخت کامل با سقف جاری (الگوی demolishRefund).
// - ویرانی سربازخانه با صف مانده = بازپرداخت خودکار همه سفارش‌ها + رویداد
//   (در stepTraining، پس قطعی و سازگار با MP/ری‌پلی).
// - قطعیت: بدون RNG؛ ترتیب = id سربازخانه، بعد ترتیب صف. هش MP فقط صف‌های
//   غیرخالی را mix می‌کند تا هش‌های پین رگرسیون ۸تایی دست‌نخورده بمانند.
// - ذخیره: `train` اختیاری روی بنا (قدیمی = [])؛ ری‌پلی: خودکار (فرمان‌ها).
import { t } from "./i18n.js";
import { lazyTable } from "./lazytext.js";
import { CONFIG } from "./config.js";
import { UNITS, validateHire, spawnUnit } from "./combat.js";
import { capFor } from "./economy.js";
import { T_GRASS } from "./terrain.js";
import { nearestWalkable } from "./pathfind.js";

export const TRAIN_FA = lazyTable("game.train", ["OK", "QUEUE_FULL", "NOT_OWNED", "BAD_QUEUE", "NO_BARRACKS"]);

// مدت آموزش یک نوع (تیک). پیش‌فرض امن برای نوع‌های بی‌فیلد (دشمن/ارباب).
export function trainTimeOf(type) {
  const def = UNITS[type];
  const t = def && def.trainTicks;
  return Number.isInteger(t) && t > 0 ? t : 40;
}

// سربازخانه سالمِ تکمیل‌شده همان مالک (نخستین id) — میزبان صف.
export function barracksOf(state, owner) {
  owner = owner == null ? 0 : owner;
  let best = null;
  for (const b of state.buildings) {
    if (b.type !== "barracks" || b.destroyed) continue;
    if (b.buildLeft > 0) continue; // نیمه‌کاره صف ندارد (0.39.0)
    if ((b.owner == null ? 0 : b.owner) !== owner) continue;
    if (!best || b.id < best.id) best = b;
  }
  return best;
}

// کانتینر منابع همان منطق hireUnit (MP جدا، سولو خودی/AI جدا).
function resOf(state, owner) {
  const mp = state.mp && state.mp.enabled;
  if (mp) return state.mpres[owner].resources;
  if (owner === CONFIG.AI.owner && state.ai) return state.ai.resources;
  return state.resources;
}

// سفارش آموزش: اعتبارسنجی خشک + کسر اتمی + push. c/r = نقطه تحویل خواسته‌شده.
export function queueHire(state, terrain, W, H, c, r, type, owner) {
  owner = owner == null ? 0 : owner;
  const v = validateHire(state, terrain, W, H, c, r, type, owner);
  if (!v.ok) {
    state.rejected++;
    return v;
  }
  const b = barracksOf(state, owner);
  if (!b) {
    state.rejected++;
    return { ok: false, reason: "NO_BARRACKS" };
  }
  if (!Array.isArray(b.train)) b.train = [];
  const cap = CONFIG.TRAIN && CONFIG.TRAIN.queueCap > 0 ? CONFIG.TRAIN.queueCap : 5;
  if (b.train.length >= cap) {
    state.rejected++;
    return { ok: false, reason: "QUEUE_FULL" };
  }
  const def = UNITS[type];
  const res = resOf(state, owner);
  res.food -= def.cost.food;
  res.gold -= def.cost.gold;
  if (def.requiresWeapon) res[def.requiresWeapon]--;
  const total = trainTimeOf(type);
  b.train.push({ type, c, r, left: total, total });
  state.placed++;
  return { ok: true, reason: "OK", bld: b.id, idx: b.train.length - 1 };
}

// لغو سفارش idx از صف بنای bldId + بازپرداخت کامل با سقف جاری.
export function cancelTrain(state, bldId, idx, owner) {
  owner = owner == null ? 0 : owner;
  const b = state.buildings.find((x) => x.id === bldId && !x.destroyed);
  if (!b || b.type !== "barracks") {
    state.rejected++;
    return { ok: false, reason: "BAD_QUEUE" };
  }
  if ((b.owner == null ? 0 : b.owner) !== owner) {
    state.rejected++;
    return { ok: false, reason: "NOT_OWNED" };
  }
  if (!Array.isArray(b.train) || !Number.isInteger(idx) || idx < 0 || idx >= b.train.length) {
    state.rejected++;
    return { ok: false, reason: "BAD_QUEUE" };
  }
  const [e] = b.train.splice(idx, 1);
  const def = UNITS[e.type];
  if (def && def.cost) {
    const res = resOf(state, owner);
    const mp = state.mp && state.mp.enabled;
    const pseudo = mp ? { buildings: state.buildings, mp: { enabled: true } } : state;
    for (const k of ["food", "gold"]) {
      res[k] = Math.min(capFor(pseudo, k, mp ? owner : undefined), res[k] + def.cost[k]);
    }
    if (def.requiresWeapon) {
      res[def.requiresWeapon] = Math.min(
        capFor(pseudo, def.requiresWeapon, mp ? owner : undefined),
        (res[def.requiresWeapon] || 0) + 1);
    }
  }
  return { ok: true, reason: "OK", type: e.type };
}

// نقطه تحویل: همان (c,r) اگر چمنِ آزاد، وگرنه نزدیک‌ترین قابل‌پیمایش.
function deliverySpot(state, terrain, W, H, c, r) {
  if (Number.isInteger(c) && Number.isInteger(r) && c >= 0 && r >= 0 && c < W && r < H &&
      terrain[r * W + c] === T_GRASS && state.occ[r * W + c] !== 1) {
    return [c, r];
  }
  const s = nearestWalkable(terrain, state.occ, W, H, c | 0, r | 0, 8);
  return s || null;
}

// پیشرفت یک تیک همه صف‌ها + تحویل سررسیده‌ها. از stepSim (سولو) و حلقه MP
// (main.js) صدا زده می‌شود — تنها نقطه جهش صف.
export function stepTraining(state, terrain) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  for (const b of state.buildings) {
    if (b.type !== "barracks" || !Array.isArray(b.train) || !b.train.length) continue;
    const owner = b.owner == null ? 0 : b.owner;
    if (b.destroyed) {
      // ویرانی با صف مانده = بازپرداخت خودکار همه (قطعی، با سقف).
      const mp = state.mp && state.mp.enabled;
      const pseudo = mp ? { buildings: state.buildings, mp: { enabled: true } } : state;
      const res = resOf(state, owner);
      let n = 0;
      for (const e of b.train) {
        const def = UNITS[e.type];
        if (!def || !def.cost) continue;
        for (const k of ["food", "gold"]) {
          res[k] = Math.min(capFor(pseudo, k, mp ? owner : undefined), res[k] + def.cost[k]);
        }
        if (def.requiresWeapon) {
          res[def.requiresWeapon] = Math.min(
            capFor(pseudo, def.requiresWeapon, mp ? owner : undefined),
            (res[def.requiresWeapon] || 0) + 1);
        }
        n++;
      }
      b.train.length = 0;
      if (n > 0) state.events.push(t("game.ev.trainRefund", { count: n }));
      continue;
    }
    if (b.buildLeft > 0) continue; // نیمه‌کاره پیش نمی‌رود
    const head = b.train[0];
    head.left--;
    if (head.left > 0) continue;
    b.train.shift();
    const spot = deliverySpot(state, terrain, W, H, head.c, head.r);
    if (!spot) {
      // جایی برای تحویل نیست — هزینه برمی‌گردد تا پول نسوزد.
      const def = UNITS[head.type];
      if (def && def.cost) {
        const res = resOf(state, owner);
        const mp = state.mp && state.mp.enabled;
        const pseudo = mp ? { buildings: state.buildings, mp: { enabled: true } } : state;
        for (const k of ["food", "gold"]) {
          res[k] = Math.min(capFor(pseudo, k, mp ? owner : undefined), res[k] + def.cost[k]);
        }
        if (def.requiresWeapon) {
          res[def.requiresWeapon] = Math.min(
            capFor(pseudo, def.requiresWeapon, mp ? owner : undefined),
            (res[def.requiresWeapon] || 0) + 1);
        }
      }
      state.events.push(t("game.ev.trainFail", { unit: UNITS[head.type] ? UNITS[head.type].name : head.type }));
      continue;
    }
    spawnUnit(state, head.type, spot[0] + 0.5, spot[1] + 0.5, owner);
  }
}
