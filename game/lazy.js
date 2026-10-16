// ابزار جدول‌های متنی زبان‌آگاه: شیء ساده با getterهای enumerable که هنگام خواندن t() صدا می‌زنند.
// هرگز متن را در زمان بارگذاری ماژول کش نمی‌کند (تغییر زبان وسط اجرا دیده می‌شود).
import { t } from "./i18n.js";

/** map: { نامخاصیت: "system.some.key" } */
export function lazyTable(map) {
  const o = {};
  for (const prop of Object.keys(map)) {
    const key = map[prop];
    Object.defineProperty(o, prop, { enumerable: true, configurable: true, get: () => t(key) });
  }
  return o;
}

/** رشته‌مانند تنبل: toString/valueOf/Symbol.toPrimitive و همه متدهای String روی متن فعلی. */
export function lazyString(getter) {
  return new Proxy({}, {
    get(_, p) {
      if (p === Symbol.toPrimitive || p === "toString" || p === "valueOf") return () => String(getter());
      const s = String(getter());
      const v = s[p];
      return typeof v === "function" ? v.bind(s) : v;
    },
    has(_, p) { return p in String.prototype || p === "length"; },
  });
}
