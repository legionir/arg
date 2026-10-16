// گروه‌های کنترلی یگان‌ها (0.59.0 — رتبه ۱ SOURCE-REVIEW).
// خالص و بدون import (الگوی gestures.js/a11y.js): سه شکاف روی شناسه یگان،
// گذرا و UI-side — sim/هش/ذخیره بی‌خبرند. ذخیره با Ctrl+1/2/3، فراخوانی با 1/2/3
// (پیش‌فرض‌های MATRIX.md:45 منبع). فراخوانی فقط زنده‌ها را به ترتیب ذخیره
// برمی‌گرداند (مرده/رفته ساکت حذف)؛ main.js مالکیت MP را جدا فیلتر می‌کند.
export const GROUP_SLOTS = 3;

// سه شکاف خالی تازه.
export function freshGroups() {
  return [[], [], []];
}

// شماره شکاف معتبر؟ (۱..۳ به اندیس ۰..۲)
export function groupIndex(slot) {
  const n = typeof slot === "number" ? slot : parseInt(slot, 10);
  if (!Number.isInteger(n) || n < 1 || n > GROUP_SLOTS) return -1;
  return n - 1;
}

// ذخیره رونوشت شناسه‌ها در شکاف؛ شکاف نامعتبر = نادیده (همان آرایه برمی‌گردد).
export function saveGroup(slots, slot, ids) {
  const i = groupIndex(slot);
  if (i < 0 || !Array.isArray(slots)) return slots;
  const out = slots.map((s) => (Array.isArray(s) ? s.slice() : []));
  while (out.length < GROUP_SLOTS) out.push([]);
  out[i] = (Array.isArray(ids) ? ids : []).filter((id) => Number.isInteger(id));
  return out;
}

// فراخوانی: شناسه‌های ذخیره‌شده‌ای که هنوز زنده‌اند، به ترتیب ذخیره.
// units: آرایه یگان‌ها با {id, dead}. شکاف نامعتبر/خالی = [].
export function recallGroup(slots, slot, units) {
  const i = groupIndex(slot);
  if (i < 0 || !Array.isArray(slots) || !Array.isArray(slots[i])) return [];
  const live = new Set((Array.isArray(units) ? units : []).filter((u) => u && !u.dead).map((u) => u.id));
  return slots[i].filter((id) => live.has(id));
}
