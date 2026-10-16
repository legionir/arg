// ماتریس سازگاری (0.58.0 — #۲۷ از FEATURES، الگوی CHG-032…036 مرجع).
import { t } from "./i18n.js";
import { lazyString } from "./lazy.js";
// probe خالص روی env تزریقی (تست با env قلابی) + liveEnv برای مرورگر واقعی.
// sim/ذخیره/هش هیچ‌چیز از این‌ها نمی‌دانند (فقط گزارش).

// required=true یعنی بدون آن بازی بالا نمی‌آید؛ false یعنی degrade شیک
// (fallback) دارد و در probe گزارش می‌شود.
export const COMPAT_ROWS = [
  { key: "canvas", get name() { return t("system.compat.canvas"); }, required: true },
  { key: "localStorage", get name() { return t("system.compat.localStorage"); }, required: true },
  { key: "indexedDB", get name() { return t("system.compat.indexedDB"); }, required: false },
  { key: "audio", get name() { return t("system.compat.audio"); }, required: false },
  { key: "pointer", get name() { return t("system.compat.pointer"); }, required: false },
  { key: "zoom", get name() { return t("system.compat.zoom"); }, required: false },
  { key: "offscreen", get name() { return t("system.compat.offscreen"); }, required: false },
  { key: "worker", get name() { return t("system.compat.worker"); }, required: false },
];

// خط پشتیبانی رسمی (0.61.0 — تصمیم کاربر: فقط Chrome و Firefox دسکتاپ؛
// بقیه فرضی‌اند و Safari/iOS و موبایل تأیید نشده).
// رشته‌مانند تنبل (toString/indexOf/... روی متن زبان فعلی)؛ supportLine() متن ساده می‌دهد.
export const SUPPORT_LINE = lazyString(() => t("system.compat.supportLine"));
export function supportLine() { return t("system.compat.supportLine"); }

// env: آبجکت پرچم {canvas, localStorage, indexedDB, audio, pointer, zoom,
// offscreen, worker} — کلید غایب = false. خالص.
export function probeCompat(env) {
  const e = env && typeof env === "object" ? env : {};
  return COMPAT_ROWS.map((row) => ({
    key: row.key,
    name: row.name,
    required: row.required,
    ok: !!e[row.key],
  }));
}

// آیا با این نتیجه بازی بالا می‌آید؟ (همه requiredها سبز)
export function compatBootable(probed) {
  return probed.every((r) => !r.required || r.ok);
}

// env واقعی مرورگر. هر تشخیص در try/catch تا probe هرگز throw ندهد.
export function liveEnv() {
  const out = {};
  try { out.canvas = !!document.createElement("canvas").getContext("2d"); } catch { out.canvas = false; }
  try {
    localStorage.setItem("scw.probe", "1");
    localStorage.removeItem("scw.probe");
    out.localStorage = true;
  } catch { out.localStorage = false; }
  try { out.indexedDB = typeof indexedDB !== "undefined" && !!indexedDB; } catch { out.indexedDB = false; }
  try { out.audio = typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined"; } catch { out.audio = false; }
  try { out.pointer = typeof PointerEvent !== "undefined"; } catch { out.pointer = false; }
  try { out.zoom = CSS && typeof CSS.supports === "function" ? CSS.supports("zoom", "1.5") : "zoom" in document.body.style; } catch { out.zoom = false; }
  try { out.offscreen = typeof OffscreenCanvas !== "undefined"; } catch { out.offscreen = false; }
  try { out.worker = typeof Worker !== "undefined"; } catch { out.worker = false; }
  return out;
}
