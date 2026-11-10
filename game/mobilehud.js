// HUD جمع‌شونده موبایل (0.224.0 — C-MOB-4): در 480px نوار بالا پشت دکمه ☰ می‌رود.
// خالص + نازک DOM (کلاس hud-open روی body). sim/هش/ذخیره دست‌نخورده.
export const HUD_COLLAPSE_PX = 480;

export function hudShouldCollapse(w) {
  return typeof w === "number" && isFinite(w) && w <= HUD_COLLAPSE_PX;
}

export function isHudOpen() {
  if (typeof document === "undefined") return false;
  return document.body.classList.contains("hud-open");
}

export function setHudOpen(open) {
  if (typeof document === "undefined") return !!open;
  document.body.classList.toggle("hud-open", !!open);
  return !!open;
}

export function toggleHud() {
  return setHudOpen(!isHudOpen());
}
