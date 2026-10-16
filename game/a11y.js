// دسترس‌پذیری دسکتاپ (0.57.0 — #۲۶ از FEATURES، الگوی CHG-045 مرجع).
// کاتالوگ خالص بدون import: پالت‌های کمکی کوررنگی + مقیاس UI + remap کلید.
// اعمال DOM (فیلتر SVG روی بوم‌ها، zoom روی #app، شنونده keydown) در main.js است؛
// sim/ذخیره/هش هیچ‌چیز از این‌ها نمی‌دانند (UI-side کامل).

// سه پالت کمکی (aid، نه شبیه‌سازی و نه تشخیص پزشکی): ماتریس‌های ۴×۵
// feColorMatrix که محور اشتباه‌شونده را جابه‌جا می‌کنند تا یگان قرمز/آبی از
// زمینه سبز جدا بماند. هر سطر مجموع ≈۱ (حفظ روشنایی) — تست t_a11y_catalog.
export const A11Y_PALETTES = {
  off:    { name: "خاموش", matrix: null },
  deutan: { name: "دوتان (سبز) — سبزها به فیروزه‌ای", matrix: [
    1, 0, 0, 0, 0,
    0, 0.6, 0.4, 0, 0,
    0, 0.3, 0.7, 0, 0,
    0, 0, 0, 1, 0,
  ] },
  protan: { name: "پروتان (قرمز) — قرمزها به نارنجی", matrix: [
    0.8, 0.2, 0, 0, 0,
    0.1, 0.8, 0.1, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
  ] },
  tritan: { name: "تریتان (آبی) — آبی‌ها خنثی‌تر", matrix: [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0.25, 0.25, 0.5, 0, 0,
    0, 0, 0, 1, 0,
  ] },
};

// مقیاس UI (zoom روی #app): ۱۰۰/۱۲۵/۱۵۰٪.
export const A11Y_SCALES = [1, 1.25, 1.5];

// کنش‌های قابل remap + پیش‌فرض‌ها (e.code — مستقل از چیدمان صفحه‌کلید).
// Escape همیشه خلع می‌کند (fallback سخت) حتی اگر remap شود.
export const KEY_ACTIONS = ["cancel", "pause", "mute"];
export const KEY_ACTION_FA = { cancel: "خلع/لغو", pause: "توقف/ادامه", mute: "بی‌صدا/باصدا" };
export const DEFAULT_KEYS = { cancel: "Escape", pause: "KeyP", mute: "KeyM" };

export function validPalette(id) {
  return A11Y_PALETTES[id] ? id : "off";
}

export function clampScale(v) {
  const n = Number(v);
  if (A11Y_SCALES.includes(n)) return n;
  return 1;
}

// e.code معتبر: حروفی-عددی (Escape/KeyP/Digit1/Space/ArrowUp/...).
export function validKeyCode(code) {
  return typeof code === "string" && /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(code);
}

// ادغام ذخیره کاربر روی پیش‌فرض‌ها؛ نامعتبرها دور ریخته می‌شوند. خالص.
export function normalizeKeys(saved) {
  const out = { ...DEFAULT_KEYS };
  if (saved && typeof saved === "object") {
    for (const a of KEY_ACTIONS) {
      if (validKeyCode(saved[a])) out[a] = saved[a];
    }
  }
  return out;
}
