// انتخاب گروهی یگان‌ها (0.16.0): مجموعه id به ترتیب انتخاب، بدون تکرار.
// خالص و هدلس‌تست‌پذیر؛ main.js از همین‌ها استفاده می‌کند تا رفتار UI و تست
// یکی باشد (تک‌انتخاب = مجموعه تک‌عضوی).
import { orderMove, orderAttackMove, orderRetreat, setStance, setGuard, garrisonUnit, deployUnit } from "./combat.js";

// افزودن/حذف ضامن (شیفت+کلیک): عضو بود حذف، نبود اضافه (به ترتیب).
export function toggleInSet(set, id) {
  const i = set.indexOf(id);
  if (i >= 0) return set.slice(0, i).concat(set.slice(i + 1));
  return set.concat([id]);
}

// هرس شناسه‌های مرده/رفته با حفظ ترتیب (هر فریم در refreshPanel).
export function pruneSet(set, units) {
  const live = new Set(units.filter((u) => !u.dead).map((u) => u.id));
  return set.filter((id) => live.has(id));
}

// اشیای زنده به ترتیب انتخاب.
export function resolveSet(set, units) {
  const byId = new Map(units.filter((u) => !u.dead).map((u) => [u.id, u]));
  const out = [];
  for (const id of set) {
    const u = byId.get(id);
    if (u) out.push(u);
  }
  return out;
}

// انتخاب باکسی (0.40.0 — #۴ از FEATURES): شناسه یگان‌های خودیِ زنده‌ای که
// نقطه‌شان (x,r) در مستطیل سلولی نرمال‌نشده می‌افتد، به ترتیب id.
// additive=true یعنی اجتماع با مجموعه قبلی (شیفت+درگ) با حفظ ترتیب.
// owner: مالک خودی (در سولو ۰)؛ واحد بی‌owner مال ۰ حساب می‌شود.
export function boxSelectIds(units, rect, opts = {}) {
  const c0 = Math.min(rect.c0, rect.c1), c1 = Math.max(rect.c0, rect.c1);
  const r0 = Math.min(rect.r0, rect.r1), r1 = Math.max(rect.r0, rect.r1);
  const owner = opts.owner == null ? 0 : opts.owner;
  const hits = units
    .filter((u) => !u.dead && u.side === "player" &&
      (u.owner == null ? 0 : u.owner) === owner &&
      u.x >= c0 && u.x < c1 + 1 && u.r >= r0 && u.r < r1 + 1)
    .map((u) => u.id)
    .sort((a, b) => a - b);
  if (!opts.additive) return hits;
  const prev = Array.isArray(opts.prev) ? opts.prev : [];
  const seen = new Set(prev);
  const out = prev.slice();
  for (const id of hits) {
    if (!seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

// دستور جمعی حرکت/حمله‌در‌حرکت (نتیجه هر عضو جدا — مقصد ناممکن برای یکی،
/// بقیه را متوقف نمی‌کند).
export function orderAll(state, units, kind, c, r) {
  return units.map((u) => kind === "attackmove"
    ? orderAttackMove(state, u, c, r)
    : orderMove(state, u, c, r));
}

export function retreatAll(state, units) {
  return units.map((u) => orderRetreat(state, u));
}

// موضع جمعی (نتیجه هر عضو جدا).
export function stanceAll(units, stance) {
  return units.map((u) => setStance(u, stance));
}

// نگهبانی جمعی از یک پاسگاه (نتیجه هر عضو جدا).
export function guardAll(state, units, building) {
  return units.map((u) => setGuard(state, u, building));
}

// استقرار جمعی در برج (0.45.0 — نتیجه هر عضو جدا).
export function garrisonAll(state, units, building) {
  return units.map((u) => garrisonUnit(state, u, building));
}

// استقرار/جمع‌کردن جمعی منجنیق‌ها (0.46.0 — نتیجه هر عضو جدا).
export function deployAll(state, units) {
  return units.map((u) => deployUnit(state, u));
}

// زنگ خطر (0.17.0): حمله‌در‌حرکت جمعیِ همه یگان‌های رزمی بازیکن به نقطه
// تجمع — پاسگاه نگهبانان حفظ می‌شود (پس از اتمام به پست برمی‌گردند).
// در MP فقط یگان‌های مالک داده‌شده (solo: همه).
export function alarmAll(state, c, r, owner) {
  const mp = state.mp && state.mp.enabled;
  const ow = owner == null ? null : owner;
  const troops = state.units.filter((u) => {
    if (u.dead || u.side !== "player") return false;
    if (mp && ow != null && (u.owner == null ? 0 : u.owner) !== ow) return false;
    return true;
  });
  return troops.map((u) => orderAttackMove(state, u, c, r));
}
