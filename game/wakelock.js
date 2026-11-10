// قفل بیداری صفحه (0.223.0 — C-MOB-3): نمایشگر موبایل وسط نبرد خاموش نشود.
// خالص و تزریق‌پذیر برای تست (navigator قلابی): بدون Wake Lock = false بی‌خطا.
// sim هیچ‌چیز نمی‌داند؛ main.js در hideMenu می‌گیرد، در showMenu رها می‌کند،
// و در visibilitychange وقتی منو پنهان است (نبرد فعال) دوباره می‌گیرد.
let sentinel = null;

export function isWakeLocked() {
  return !!sentinel;
}

export function canWakeLock(nv) {
  const nav = nv !== undefined ? nv : (typeof navigator !== "undefined" ? navigator : null);
  return !!(nav && nav.wakeLock && typeof nav.wakeLock.request === "function");
}

export async function ensureWakeLock(nv) {
  const nav = nv !== undefined ? nv : (typeof navigator !== "undefined" ? navigator : null);
  if (!canWakeLock(nav)) return false;
  if (sentinel) return true;
  try {
    sentinel = await nav.wakeLock.request("screen");
    return !!sentinel;
  } catch (e) {
    sentinel = null;
    return false;
  }
}

export function releaseWakeLock() {
  try {
    if (sentinel && typeof sentinel.release === "function") sentinel.release();
  } catch (e) {}
  sentinel = null;
}
