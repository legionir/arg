// انتخاب گروهی یگان‌ها (0.16.0): مجموعه id به ترتیب انتخاب، بدون تکرار.
// خالص و هدلس‌تست‌پذیر؛ main.js از همین‌ها استفاده می‌کند تا رفتار UI و تست
// یکی باشد (تک‌انتخاب = مجموعه تک‌عضوی).
import { orderMove, orderAttackMove, orderPatrol, orderAttackPos, queueOrder, orderRetreat, setStance, setGuard, garrisonUnit, deployUnit } from "./combat.js";
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

// دابل‌کلیک هم‌نوع (0.173.0 — §3.3/بند 167 + §10.1/بند 552 تکراری): شناسه
// یگان‌های خودیِ زندهٔ هم‌نوع هدف، به ترتیب id؛ onScreen اختیاری (نمای
// «روی صفحه» دفترچه — main.js با cellToScreen/rect بوم می‌سازد)؛ owner در
// سولو ۰ (در MP فقط خودی، آینه boxSelectIds). خالص.
export function sameTypeIds(units, target, opts = {}) {
  if (!target) return [];
  const owner = opts.owner == null ? 0 : opts.owner;
  const onScreen = typeof opts.onScreen === "function" ? opts.onScreen : null;
  return (Array.isArray(units) ? units : [])
    .filter((u) => u && !u.dead && u.side === "player" && u.type === target.type &&
      (u.owner == null ? 0 : u.owner) === owner &&
      (!onScreen || onScreen(u)))
    .map((u) => u.id)
    .sort((a, b) => a - b);
}

// مرکز ثقل گروه زنده (0.173.0 — رفتن به محل گروه، بند 554): میانگین x/r
// یگان‌های زندهٔ فهرست؛ خالی = null. خالص.
export function groupCentroid(units, ids) {
  const live = new Map((Array.isArray(units) ? units : []).filter((u) => u && !u.dead).map((u) => [u.id, u]));
  let sx = 0, sr = 0, n = 0;
  for (const id of Array.isArray(ids) ? ids : []) {
    const u = live.get(id);
    if (!u || typeof u.x !== "number" || typeof u.r !== "number") continue;
    sx += u.x; sr += u.r; n++;
  }
  if (!n) return null;
  return { x: sx / n, r: sr / n };
}
// نشان سبز مقصد (0.174.0 — §10.3/بند 558): هاور مقصدِ معتبرِ فرمانِ حرکتی =
// لوزی سبز (مکمل ضربدر قرمز nopath)؛ بقیه حالت‌ها (ساخت/استخدام/ویژه) = سفید/گوست.
// خالص: kinds حرکتی + خنثیِ بامنتخب → true.
export function orderHoverMark(pendingKind, nSels) {
  const n = Number(nSels) || 0;
  if (n <= 0) return false;
  if (!pendingKind) return true;
  return pendingKind === 'attackmove' || pendingKind === 'patrol' ||
    pendingKind === 'attackpos' || pendingKind === 'guard' || pendingKind === 'garrison';
}
// پنل ارتش (0.175.0 — §10.3/بند 553): تجمیع منتخب‌های زنده بر حسب نوع
// (تعداد + مجموع جان)، مرتب بر حسب type. خالص.
export function armyBreakdown(sels) {
  const m = new Map();
  for (const u of Array.isArray(sels) ? sels : []) {
    if (!u || u.dead || typeof u.type !== 'string') continue;
    const e = m.get(u.type) || { type: u.type, n: 0, hp: 0 };
    e.n++;
    e.hp += (typeof u.hp === 'number' ? u.hp : 0);
    m.set(u.type, e);
  }
  return [...m.keys()].sort().map((k) => m.get(k));
}



// دستور جمعی حرکت/حمله‌در‌حرکت/گشت (نتیجه هر عضو جدا — مقصد ناممکن برای
// یکی، بقیه را متوقف نمی‌کند).
export function orderAll(state, units, kind, c, r) {
  return units.map((u) => kind === "attackmove"
    ? orderAttackMove(state, u, c, r)
    : kind === "attackpos"
      ? orderAttackPos(state, u, c, r)
      : kind === "patrol"
        ? orderPatrol(state, u, c, r)
        : orderMove(state, u, c, r));
}

// صف وی‌پوینت جمعی (0.162.0 — §10.2/بند 238 — نتیجه هر عضو جدا).
export function queueAll(state, units, kind, c, r) {
  return units.map((u) => queueOrder(state, u, kind, c, r));
}

// بوکمارک دوربین (0.162.0 — §10.1/بند 235): گذرا و UI-side (مثل ctrlGroups)؛
// store نگاشت شکاف ۱..۹ به {x,y,z} (= panX/panY/zoom رندرر) است.
// خالص و هدلس‌تست‌پذیر — اجرا (خوانش/نوشتن view) در main.js است.
export function bookmarkSlotOk(slot) { return Number.isInteger(slot) && slot >= 1 && slot <= 9; }
export function bookmarkSet(store, slot, view) {
  if (!store || !bookmarkSlotOk(slot) || !view) return null;
  store[slot] = { x: view.panX, y: view.panY, z: view.zoom };
  return slot;
}
export function bookmarkGet(store, slot) {
  if (!store || !bookmarkSlotOk(slot)) return null;
  const b = store[slot];
  return b && typeof b.x === "number" && typeof b.y === "number" && typeof b.z === "number"
    ? { x: b.x, y: b.y, z: b.z } : null;
}
// گردش: نخستین شکافِ پر پس از from (چرخه‌ای ۱..۹)؛ فروشگاه خالی = null.
export function bookmarkCycle(store, from) {
  if (!store) return null;
  const f = bookmarkSlotOk(from) ? from : 0;
  for (let i = 1; i <= 9; i++) {
    const s = ((f + i - 1) % 9) + 1;
    if (bookmarkGet(store, s)) return s;
  }
  return null;
}

// lord focus (0.163.0): alive own lord ids sorted; fromId = current (Shift+L = next, cyclic).
export function lordFocusIds(units, owner) {
  const ow = owner == null ? 0 : owner;
  return units.filter((u) => !u.dead && u.type === "lord" && u.side === "player" && ((u.owner == null ? 0 : u.owner) === ow))
    .map((u) => u.id).sort((a, b) => a - b);
}
export function lordFocusNext(ids, fromId) {
  if (!Array.isArray(ids) || !ids.length) return null;
  const k = ids.indexOf(fromId);
  return ids[(k + 1) % ids.length];
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
