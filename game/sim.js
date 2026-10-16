// گام یکپارچه sim + صف فرمان (0.37.0 — هسته قطعی #۱ از FEATURES).
//
// قرارداد:
// - تنها حلقه تیک بازی همین‌جاست: tick++ ← تخلیه فرمان‌های سررسیده ←
//   اقتصاد ← نبرد ← (در MP) به‌روزرسانی زنده‌بودن. main.js (سولو/MP) و
//   قلاب تست ff همگی همین را صدا می‌زنند تا آینه بمانند.
// - صف فرمان گذراست (transient): در ذخیره نمی‌ماند؛ load/newGame آن را
//   می‌اندازد. فرمان نامعتبر در اجرا = rejected (نه throw).
// - اعتبارسنجی سنگین در اجرا (applyCmd) انجام می‌شود، نه در enqueue؛
//   پس خرج دوباره (double-spend) ممکن نیست.
// - path واحدها عمداً در هش نیست (گذراست و پس از load بازمحاسبه می‌شود).
import { t } from "./i18n.js";
import { CONFIG } from "./config.js";
import { tryPlace } from "./construction.js";
import { stepEconomy, assignStaff, TAX, RATIONS } from "./economy.js";
import { hireUnit, toggleGate, stepCombat, STANCES, demolishBuilding } from "./combat.js";
import { queueHire, cancelTrain, stepTraining } from "./train.js";
import { applyTrade } from "./market.js";
import { stepAI } from "./ai.js";
import { orderAll, retreatAll, stanceAll, guardAll, garrisonAll, deployAll, alarmAll } from "./selection.js";
import { updateMpAlive } from "./mp.js";

export const CMD_CAP = 1024; // سقف فرمان معوق (ضد انباشت بی‌نهایت)
const IDS_CAP = 64; // سقف شناسه در فرمان‌های جمعی سولو (MP سقف ۳۲ خود را دارد)

// --- صف فرمان ---

export function createQueue() {
  return { items: [] };
}

export function queueLen(q) {
  return q ? q.items.length : 0;
}

// enqueue سبک است: فقط شکل را چک می‌کند، نه منابع/مالکیت را.
export function enqueueCmd(q, cmd, nowTick) {
  if (!q || !cmd || typeof cmd !== "object") return { ok: false, reason: "INVALID" };
  if (q.items.length >= CMD_CAP) return { ok: false, reason: "FULL" };
  if (typeof cmd.kind !== "string") return { ok: false, reason: "INVALID" };
  q.items.push({ ...cmd, targetTick: (nowTick | 0) + 1 });
  return { ok: true, reason: "OK" };
}

function drainQueue(state, terrain, q) {
  if (!q || !q.items.length) return;
  const due = [];
  const later = [];
  for (const c of q.items) {
    if ((c.targetTick | 0) <= state.tick) due.push(c);
    else later.push(c);
  }
  q.items = later;
  for (const c of due) {
    try {
      applyCmd(state, terrain, c);
    } catch (e) {
      state.rejected++; // فرمان بد هرگز حلقه را نمی‌شکند
    }
  }
}

// --- مالکیت ---

function unitOwned(state, id, owner) {
  const u = state.units.find((x) => x.id === id && !x.dead);
  if (!u) return null;
  const mp = state.mp && state.mp.enabled;
  const ow = owner == null ? 0 : owner;
  if (mp) {
    if ((u.owner == null ? 0 : u.owner) !== ow) return null;
    return u;
  }
  if (u.side !== "player") return null;
  if ((u.owner == null ? 0 : u.owner) !== ow) return null;
  return u;
}

function bldOwned(state, id, owner) {
  const b = state.buildings.find((x) => x.id === id && !x.destroyed);
  if (!b) return null;
  const ow = owner == null ? 0 : owner;
  if ((b.owner == null ? 0 : b.owner) !== ow) return null;
  return b;
}

const isInt = (n) => Number.isInteger(n);

function checkIds(ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > IDS_CAP) return null;
  const out = [];
  for (const id of ids) {
    if (!isInt(id) || id < 1) return null;
    out.push(id);
  }
  return out;
}

// --- اعمال یک فرمان (آینه applyMpInput در main.js؛ یکپارچه‌سازی کامل پس از تست زنده MP) ---

export function applyCmd(state, terrain, cmd) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const mp = state.mp && state.mp.enabled;
  const owner = cmd.owner == null ? 0 : cmd.owner;
  switch (cmd.kind) {
    case "place": {
      const def = typeof cmd.type === "string" ? CONFIG.BUILDINGS[cmd.type] : null;
      if (!def || def.key === "keep") return { ok: false, reason: "INVALID" };
      if (!isInt(cmd.c) || !isInt(cmd.r)) return { ok: false, reason: "INVALID" };
      const r = tryPlace(state, terrain, W, H, cmd.c, cmd.r, def, owner);
      if (r.ok) assignStaff(state, owner);
      return r;
    }
    case "hire": {
      // استخدام بازیکن (0.65.0 — صف آموزش): هزینه اتمی + ته صف سربازخانه
      // خودی؛ تحویل پس از trainTicks در stepTraining. آینه ورودی MP در main.js.
      if (typeof cmd.type !== "string" || !isInt(cmd.c) || !isInt(cmd.r)) {
        return { ok: false, reason: "INVALID" };
      }
      return queueHire(state, terrain, W, H, cmd.c, cmd.r, cmd.type, owner);
    }
    case "trainCancel": {
      // لغو سفارش آموزش + بازپرداخت کامل (0.65.0): آینه ورودی MP در main.js.
      if (!isInt(cmd.bld) || !isInt(cmd.idx)) return { ok: false, reason: "INVALID" };
      return cancelTrain(state, cmd.bld, cmd.idx, owner);
    }
    case "order": {
      const ids = checkIds(cmd.ids);
      if (!ids || !isInt(cmd.c) || !isInt(cmd.r)) return { ok: false, reason: "INVALID" };
      const kind = cmd.orderKind === "attackmove" ? "attackmove" : "move";
      const units = [];
      for (const id of ids) {
        const u = unitOwned(state, id, owner);
        if (u) units.push(u);
      }
      if (!units.length) return { ok: false, reason: "INVALID" };
      return { ok: true, reason: "OK", results: orderAll(state, units, kind, cmd.c, cmd.r) };
    }
    case "retreat": {
      const ids = checkIds(cmd.ids);
      if (!ids) return { ok: false, reason: "INVALID" };
      const units = [];
      for (const id of ids) {
        const u = unitOwned(state, id, owner);
        if (u) units.push(u);
      }
      if (!units.length) return { ok: false, reason: "INVALID" };
      return { ok: true, reason: "OK", results: retreatAll(state, units) };
    }
    case "stance": {
      const ids = checkIds(cmd.ids);
      if (!ids) return { ok: false, reason: "INVALID" };
      if (cmd.stance !== STANCES.ENGAGE && cmd.stance !== STANCES.HOLD && cmd.stance !== STANCES.GUARD) {
        return { ok: false, reason: "INVALID" };
      }
      const units = [];
      for (const id of ids) {
        const u = unitOwned(state, id, owner);
        if (u) units.push(u);
      }
      if (!units.length) return { ok: false, reason: "INVALID" };
      return { ok: true, reason: "OK", results: stanceAll(units, cmd.stance) };
    }
    case "guard": {
      const ids = checkIds(cmd.ids);
      if (!ids || !isInt(cmd.bld)) return { ok: false, reason: "INVALID" };
      const b = bldOwned(state, cmd.bld, owner);
      if (!b) return { ok: false, reason: "INVALID" };
      const units = [];
      for (const id of ids) {
        const u = unitOwned(state, id, owner);
        if (u) units.push(u);
      }
      if (!units.length) return { ok: false, reason: "INVALID" };
      return { ok: true, reason: "OK", results: guardAll(state, units, b) };
    }
    case "gate": {
      if (!isInt(cmd.bld)) return { ok: false, reason: "INVALID" };
      const b = bldOwned(state, cmd.bld, owner);
      if (!b || b.type !== "gate") return { ok: false, reason: "INVALID" };
      return toggleGate(state, b);
    }
    case "trade": {
      // بازار (0.64.0 — ب-۳): خرید/فروش با واسطه طلا؛ اعتبارسنجی سنگین
      // (بازار خودی/نرخ/استطاعت/جا) در applyTrade است. آینه ورودی MP در main.js.
      if (typeof cmd.res !== "string" || (cmd.dir !== "buy" && cmd.dir !== "sell")) {
        return { ok: false, reason: "INVALID" };
      }
      return applyTrade(state, cmd.res, cmd.dir, owner);
    }
    case "deploy": {
      // استقرار/جمع منجنیق (0.46.0): آینه ورودی MP در main.js.
      const ids = checkIds(cmd.ids);
      if (!ids) return { ok: false, reason: "INVALID" };
      const units = [];
      for (const id of ids) {
        const u = unitOwned(state, id, owner);
        if (u) units.push(u);
      }
      if (!units.length) return { ok: false, reason: "INVALID" };
      return { ok: true, reason: "OK", results: deployAll(state, units) };
    }
    case "garrison": {
      // استقرار در برج (0.45.0): آینه ورودی MP در main.js — اعتبارسنجی سنگین
      // در garrisonUnit است (برج خودی/دوربرد/سقف ۴).
      const ids = checkIds(cmd.ids);
      if (!ids || !isInt(cmd.bld)) return { ok: false, reason: "INVALID" };
      const b = bldOwned(state, cmd.bld, owner);
      if (!b) return { ok: false, reason: "INVALID" };
      const units = [];
      for (const id of ids) {
        const u = unitOwned(state, id, owner);
        if (u) units.push(u);
      }
      if (!units.length) return { ok: false, reason: "INVALID" };
      return { ok: true, reason: "OK", results: garrisonAll(state, units, b) };
    }
    case "demolish": {
      // تخریب دستی (0.39.0؛ 0.62.0 — ب-۱: با غرامت یک‌سوم در demolishBuilding):
      // مالکیت + ستاد‌بودن همین‌جا چک می‌شود (آینه MP).
      if (!isInt(cmd.bld)) return { ok: false, reason: "INVALID" };
      const b = state.buildings.find((x) => x.id === cmd.bld && !x.destroyed);
      if (!b) return { ok: false, reason: "INVALID" };
      if ((b.owner == null ? 0 : b.owner) !== owner) return { ok: false, reason: "NOT_OWNED" };
      if (b.type === "keep") return { ok: false, reason: "KEEP" };
      return demolishBuilding(state, b, owner);
    }
    case "tax": {
      if (typeof cmd.v !== "string" || !TAX[cmd.v]) return { ok: false, reason: "INVALID" };
      if (mp) state.mpres[owner].tax = cmd.v;
      else state.tax = cmd.v;
      return { ok: true, reason: "OK" };
    }
    case "rations": {
      if (typeof cmd.v !== "string" || !RATIONS[cmd.v]) return { ok: false, reason: "INVALID" };
      if (mp) state.mpres[owner].rations = cmd.v;
      else state.rations = cmd.v;
      return { ok: true, reason: "OK" };
    }
    case "alarm": {
      if (!isInt(cmd.c) || !isInt(cmd.r)) return { ok: false, reason: "INVALID" };
      const rs = alarmAll(state, cmd.c, cmd.r, mp ? owner : undefined);
      if (!mp && rs.some((r) => r.ok)) {
        state.events.push(t("game.ev.alarm", { c: cmd.c, r: cmd.r }));
      }
      return { ok: true, reason: "OK", results: rs };
    }
    default:
      return { ok: false, reason: "INVALID" };
  }
}

// --- گام یکپارچه: تنها حلقه تیک مجاز ---

export function stepSim(state, terrain, n, queue, opts) {
  const aiPaused = !!(opts && opts.aiPaused); // گیت 0.68.0: پشت منو AI فکر نمی‌کند
  for (let i = 0; i < n; i++) {
    state.tick++;
    drainQueue(state, terrain, queue);
    stepEconomy(state);
    stepTraining(state, terrain); // صف آموزش (0.65.0) — پس از اقتصاد، پیش از نبرد
    stepCombat(state, terrain);
    if (!aiPaused) stepAI(state, terrain); // حریف سولو (0.42.0؛ در MP و بازی بی‌حریف بی‌اثر)
    if (state.mp && state.mp.enabled) updateMpAlive(state);
  }
  return state.tick;
}
