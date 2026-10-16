// متن تنبل (lazy) برای جدول‌های داده: هر خواندن، زبان فعلی را می‌گیرد؛ هیچ متنی در بارگذاری ماژول کش نمی‌شود.
// فقط از i18n.js می‌خواند (بدون چرخه با lang/*).
import { t } from "./i18n.js";

/** آبجکت با getterهای شمارش‌پذیر: obj[k] === t(prefix + "." + k). ترتیب کلیدها = keys. */
export function lazyTable(prefix, keys) {
  const o = {};
  for (const k of keys) {
    Object.defineProperty(o, k, { enumerable: true, configurable: true, get() { return t(`${prefix}.${k}`); } });
  }
  return o;
}

/** متن یک کد از جدول (یا خود کد اگر ترجمه نبود). */
export function tableText(prefix, code) {
  const key = `${prefix}.${code}`;
  const v = t(key);
  return v === key ? String(code) : v;
}
