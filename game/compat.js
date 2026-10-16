// ماتریس سازگاری (0.58.0 — #۲۷ از FEATURES، الگوی CHG-032…036 مرجع).
// probe خالص روی env تزریقی (تست با env قلابی) + liveEnv برای مرورگر واقعی.
// sim/ذخیره/هش هیچ‌چیز از این‌ها نمی‌دانند (فقط گزارش).

// required=true یعنی بدون آن بازی بالا نمی‌آید؛ false یعنی degrade شیک
// (fallback) دارد و در probe گزارش می‌شود.
export const COMPAT_ROWS = [
  { key: "canvas", name: "بوم دوبعدی (رسم)", required: true },
  { key: "localStorage", name: "حافظه محلی (ترجیحات)", required: true },
  { key: "indexedDB", name: "ایندکس‌دی‌بی (ذخیره‌ها)", required: false },
  { key: "audio", name: "وب‌آدیو (صدا)", required: false },
  { key: "pointer", name: "رویدادهای اشاره (تاچ/پینچ)", required: false },
  { key: "zoom", name: "مقیاس رابط (CSS zoom)", required: false },
  { key: "offscreen", name: "بوم آفلاین", required: false },
  { key: "worker", name: "ورکر وب", required: false },
];

// خط پشتیبانی رسمی (0.61.0 — تصمیم کاربر: فقط Chrome و Firefox دسکتاپ؛
// بقیه فرضی‌اند و Safari/iOS و موبایل تأیید نشده).
export const SUPPORT_LINE =
  "پشتیبانی رسمی: Chrome و Firefox دسکتاپ (دو نسخه آخر) — Safari/iOS و موبایل تأیید نشده‌اند.";

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
