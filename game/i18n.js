// i18n — چندزبانی (فارسی/انگلیسی). خالص و بدون وابستگی به sim: فقط لایه نمایش.
//
// قرارداد:
//  - هیچ‌چیز از locale وارد state/sim/هش/ذخیره نمی‌شود (فقط متن نمایشی).
//  - کلیدها نقطه‌دار و ثابت‌اند: t("main.status.ready"). پارامتر: t("k", { n: 3 }) با {n} در متن.
//  - جمع: اگر params.n عدد باشد و کلید k.one / k.other موجود باشد، بر اساس Intl.PluralRules انتخاب می‌شود.
//  - سقوط (fallback): زبان فعلی → فارسی (زبان مرجع) → خود کلید (تا خطا هرگز نمایش خام نشود).
//  - فایل‌های واژگان: game/lang/*.js (هر کدام { fa: {...}, en: {...} }) و در lang/index.js جمع می‌شوند.
//  - HTML ایستا: data-i18n / data-i18n-title / data-i18n-placeholder / data-i18n-aria-label / data-i18n-html.
import LANG_PACKS from "./lang/index.js";

export const LANGS = {
  fa: { code: "fa", name: "فارسی", short: "FA", dir: "rtl", locale: "fa-IR" },
  en: { code: "en", name: "English", short: "EN", dir: "ltr", locale: "en-US" },
};
export const DEFAULT_LANG = "fa";
const STORE_KEY = "scw.lang";

const DICT = { fa: Object.create(null), en: Object.create(null) };
for (const pack of LANG_PACKS) {
  for (const lang of Object.keys(DICT)) Object.assign(DICT[lang], pack[lang] || {});
}

let current = DEFAULT_LANG;
const listeners = new Set();
const hasWin = typeof window !== "undefined" && typeof document !== "undefined";

function validLang(l) { return typeof l === "string" && Object.prototype.hasOwnProperty.call(LANGS, l) ? l : null; }

export function detectLang() {
  if (!hasWin) return DEFAULT_LANG;
  try {
    const q = validLang(new URLSearchParams(window.location.search).get("lang"));
    if (q) return q;
  } catch (e) { /* ignore */ }
  try {
    const s = validLang(window.localStorage.getItem(STORE_KEY));
    if (s) return s;
  } catch (e) { /* ignore */ }
  const nav = (typeof navigator !== "undefined" && (navigator.language || "")) || "";
  return nav.toLowerCase().startsWith("fa") ? "fa" : "en";
}

export function getLang() { return current; }
export function getDir() { return LANGS[current].dir; }
export function isRTL() { return LANGS[current].dir === "rtl"; }

function lookup(lang, key) { const v = DICT[lang][key]; return v === undefined ? undefined : v; }

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (params[k] === undefined || params[k] === null ? m : String(params[k])));
}

/** ترجمه کلید. اگر کلید نبود، فارسی، وگرنه خود کلید. */
export function t(key, params) {
  let k = key;
  if (params && typeof params.n === "number") {
    const cat = new Intl.PluralRules(LANGS[current].locale).select(params.n);
    const pk = `${key}.${cat}`;
    if (lookup(current, pk) !== undefined || lookup("fa", pk) !== undefined) k = pk;
    else if (lookup(current, `${key}.other`) !== undefined || lookup("fa", `${key}.other`) !== undefined) k = `${key}.other`;
  }
  let v = lookup(current, k);
  if (v === undefined) v = lookup("fa", k);
  if (v === undefined) return key;
  return typeof v === "function" ? String(v(params || {})) : interpolate(String(v), params);
}

/** آیا کلید برای زبان فعلی (یا مرجع) تعریف شده؟ */
export function hasKey(key) { return lookup(current, key) !== undefined || lookup("fa", key) !== undefined; }

/** قالب‌بندی عدد بر اساس زبان فعلی. */
export function nf(n, opts) {
  try { return new Intl.NumberFormat(LANGS[current].locale, opts).format(n); } catch (e) { return String(n); }
}

/** بررسی کامل بودن واژگان: کلیدهای فارسی که در انگلیسی نیستند (برای تست/ابزار). */
export function missingKeys(lang = "en") {
  return Object.keys(DICT.fa).filter((k) => DICT[lang][k] === undefined);
}
export function dictSize(lang) { return Object.keys(DICT[lang] || {}).length; }

const ATTRS = ["title", "placeholder", "aria-label", "value", "alt"];

/** اعمال ترجمه روی DOM ایستا (و هر زیردرختی که JS می‌سازد). */
export function applyDom(root) {
  if (!hasWin) return;
  const scope = root || document;
  scope.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
  scope.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
  for (const a of ATTRS) {
    scope.querySelectorAll(`[data-i18n-${a}]`).forEach((el) => { el.setAttribute(a, t(el.getAttribute(`data-i18n-${a}`))); });
  }
}

function applyDocument() {
  if (!hasWin) return;
  const L = LANGS[current];
  const root = document.documentElement;
  root.lang = L.code;
  root.dir = L.dir;
  document.title = t("app.title");
  syncSwitchers();
}

function syncSwitchers() {
  if (!hasWin) return;
  document.querySelectorAll("[data-lang-set]").forEach((el) => {
    el.setAttribute("aria-pressed", String(el.getAttribute("data-lang-set") === current));
  });
}

/** تغییر زبان: ذخیره، به‌روزرسانی lang/dir، DOM ایستا و اطلاع‌رسانی شنوندگان. */
export function setLang(lang, { persist = true } = {}) {
  const l = validLang(lang);
  if (!l) return false;
  const changed = l !== current;
  current = l;
  if (persist && hasWin) { try { window.localStorage.setItem(STORE_KEY, l); } catch (e) { /* ignore */ } }
  applyDocument();
  applyDom();
  if (changed) for (const fn of listeners) { try { fn(l); } catch (e) { /* ignore */ } }
  return changed;
}

/** ثبت شنونده تغییر زبان (برای بازسازی UI پویا). تابع لغو برمی‌گرداند. */
export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** اجرای موقت با زبان دیگر (تست‌ها). */
export function withLang(lang, fn) {
  const prev = current;
  current = validLang(lang) || prev;
  try { return fn(); } finally { current = prev; }
}

/** راه‌اندازی در بوت: تشخیص زبان، اعمال، و سیم‌کشی دکمه‌های [data-lang-set]. */
export function initI18n() {
  current = detectLang();
  if (hasWin) {
    document.addEventListener("click", (ev) => {
      const b = ev.target && ev.target.closest ? ev.target.closest("[data-lang-set]") : null;
      if (b) setLang(b.getAttribute("data-lang-set"));
    });
  }
  applyDocument();
  applyDom();
  return current;
}
