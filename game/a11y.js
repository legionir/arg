// دسترس‌پذیری دسکتاپ (0.57.0 — #۲۶ از FEATURES، الگوی CHG-045 مرجع).
import { t } from "./i18n.js";
import { lazyTable } from "./lazy.js";
// کاتالوگ خالص (فقط متن نمایشی از i18n): پالت‌های کمکی کوررنگی + مقیاس UI + remap کلید.
// اعمال DOM (فیلتر SVG روی بوم‌ها، zoom روی #app، شنونده keydown) در main.js است؛
// sim/ذخیره/هش هیچ‌چیز از این‌ها نمی‌دانند (UI-side کامل).

// سه پالت کمکی (aid، نه شبیه‌سازی و نه تشخیص پزشکی): ماتریس‌های ۴×۵
// feColorMatrix که محور اشتباه‌شونده را جابه‌جا می‌کنند تا یگان قرمز/آبی از
// زمینه سبز جدا بماند. هر سطر مجموع ≈۱ (حفظ روشنایی) — تست t_a11y_catalog.
export const A11Y_PALETTES = {
  off:    { get name() { return t("system.a11y.palette.off"); }, matrix: null },
  deutan: { get name() { return t("system.a11y.palette.deutan"); }, matrix: [
    1, 0, 0, 0, 0,
    0, 0.6, 0.4, 0, 0,
    0, 0.3, 0.7, 0, 0,
    0, 0, 0, 1, 0,
  ] },
  protan: { get name() { return t("system.a11y.palette.protan"); }, matrix: [
    0.8, 0.2, 0, 0, 0,
    0.1, 0.8, 0.1, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
  ] },
  tritan: { get name() { return t("system.a11y.palette.tritan"); }, matrix: [
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
export const KEY_ACTIONS = ["cancel", "pause", "mute", "keep", "sign", "stanceHold", "stanceDefend", "stanceEngage", "speedUp", "speedDown", "lord", "flat", "peek"];
export const KEY_ACTION_FA = lazyTable({ cancel: "system.a11y.key.cancel", pause: "system.a11y.key.pause", mute: "system.a11y.key.mute", keep: "system.a11y.key.keep", sign: "system.a11y.key.sign", stanceHold: "system.a11y.key.stanceHold", stanceDefend: "system.a11y.key.stanceDefend", stanceEngage: "system.a11y.key.stanceEngage", speedUp: "system.a11y.key.speedUp", speedDown: "system.a11y.key.speedDown", lord: "system.a11y.key.lord", flat: "system.a11y.key.flat", peek: "system.a11y.key.peek" });
export const DEFAULT_KEYS = { cancel: "Escape", pause: "KeyP", mute: "KeyM", keep: "KeyH", sign: "KeyS", stanceHold: "KeyQ", stanceDefend: "KeyW", stanceEngage: "KeyE", speedUp: "NumpadAdd", speedDown: "NumpadSubtract", lord: "KeyL", flat: "Space", peek: "KeyV" };

// گام سرعت (0.154.0 — §17/بند 818: +/− نامپد): خالص و UI-side؛ sim بی‌خبر.
// dir=+1 تندتر، ‎−1 کندتر؛ در مرز می‌ماند (برخلاف دکمه که می‌چرخد) تا
// رفت‌وبرگشت نامپد قابل‌پیش‌بینی باشد. speeds خالی/نامعتبر = ورودی.
export function cycleSpeed(speeds, cur, dir) {
  if (!Array.isArray(speeds) || speeds.length === 0) return cur;
  let i = speeds.indexOf(cur);
  if (i < 0) i = dir > 0 ? -1 : speeds.length;
  const n = i + (dir > 0 ? 1 : -1);
  return speeds[Math.max(0, Math.min(speeds.length - 1, n))];
}


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
