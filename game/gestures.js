// ژست‌های لمسی (0.53.0 — #۲۳ از FEATURES، الگوی CHG-044 مرجع).
// ریاضیات خالص پینچ + قانون لمس طولانی، بدون import: برای تست هدلس امن است.
// قانون لایه‌بندی: sim هیچ‌چیز از ژست نمی‌داند — main.js پینچ را به زوم دوربین
// و لمس طولانی را به همان خلعِ راست‌کلیک ترجمه می‌کند (UI-side کامل؛ بدون
// تغییر sim/هش/ذخیره). سقف‌های زوم همان چرخ موس‌اند (۰٫۳ تا ۳).

export const PINCH_ZOOM_MIN = 0.3;
export const PINCH_ZOOM_MAX = 3;
// لمس طولانی: ≥۵۰۰ms تقریباً بی‌حرکت (مانهتن ≤۱۰px). آستانه حرکت عمداً از
// آستانه درگ (۶px) بزرگ‌تر است تا نگه‌داشتنِ پس از یک لغزش ریز هم خلع بدهد.
export const LONG_PRESS_MS = 500;
export const LONG_PRESS_SLOP = 10;

// فاصله اقلیدسی دو انگشت. خالص.
export function pinchDist(x0, y0, x1, y1) {
  return Math.hypot(x1 - x0, y1 - y0);
}

// زوم تازه از روی نسبت فاصله‌ها (d0 = شروع پینچ، d1 = اکنون). d0 نامعتبر =
// بدون تغییر؛ خروجی همیشه در سقف [۰٫۳، ۳]. خالص.
export function pinchZoom(z0, d0, d1) {
  if (!(d0 > 0) || !(d1 >= 0) || !(z0 > 0)) return z0;
  const z = z0 * (d1 / d0);
  return Math.min(PINCH_ZOOM_MAX, Math.max(PINCH_ZOOM_MIN, z));
}

// نقطه میانی دو انگشت (مرکز پینچ). خالص.
export function pinchMid(x0, y0, x1, y1) {
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

// آیا لمس طولانی رخ داده؟ (sx,sy,t0) = شروع فشار، (x,y,now) = اکنون.
// خالص — main.js همین را پشت setTimeout نگه می‌دارد.
export function longPressFired(sx, sy, t0, x, y, now) {
  if (now - t0 < LONG_PRESS_MS) return false;
  return Math.abs(x - sx) + Math.abs(y - sy) <= LONG_PRESS_SLOP;
}

// آیا انگشت از آستانه تحمل بیرون رفته (تایمر باید لغو شود)؟ خالص.
export function longPressMoved(sx, sy, x, y) {
  return Math.abs(x - sx) + Math.abs(y - sy) > LONG_PRESS_SLOP;
}

// پن با درگ موس (0.68.0 — ریزه‌کاری ۴-ب کاربر): دکمه وسط = درگِ فقط-پن.
// آستانه شروع پن همان ۶px درگ-پن چپ است تا هر دو دکمه یک حس داشته باشند.
// ریاضیات خالص و مشترک هر دو مسیر (چپ + وسط) + تست هدلس: پن = آفست
// ذخیره‌شده دوربین + جابه‌جایی موس از نقطه فشار.
export const DRAG_PAN_SLOP = 6;

// آیا درگ از آستانه پن گذشته؟ (مانهتن، مرز دقیق: ۶ = نه، ۷ = بله). خالص.
export function dragMovedFar(x0, y0, x, y) {
  return Math.abs(x - x0) + Math.abs(y - y0) > DRAG_PAN_SLOP;
}

// پن تازه از روی نقطه فشار + آفست ذخیره‌شده دوربین. خالص.
export function panForDrag(panX0, panY0, x0, y0, x, y) {
  return { panX: panX0 + (x - x0), panY: panY0 + (y - y0) };
}
