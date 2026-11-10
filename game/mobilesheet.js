// پنل کشویی موبایل (0.224.0 — C-MOB-5): در 800px سایدبار شیت پایین می‌شود و
// نقشه تمام‌قد می‌ماند. خالص + نازک DOM (کلاس sheet-open روی body).
// sim/هش/ذخیره دست‌نخورده.
export const SHEET_OVERLAY_PX = 800;

export function sheetShouldOverlay(w) {
  return typeof w === "number" && isFinite(w) && w <= SHEET_OVERLAY_PX;
}

export function isSheetOpen() {
  if (typeof document === "undefined") return false;
  return document.body.classList.contains("sheet-open");
}

export function setSheetOpen(open) {
  if (typeof document === "undefined") return !!open;
  document.body.classList.toggle("sheet-open", !!open);
  return !!open;
}

export function toggleSheet() {
  return setSheetOpen(!isSheetOpen());
}
