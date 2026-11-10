// نمای تخت (0.242.0 — C-CLN-24): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// flatBtn/renderer از بوت می‌آیند (همان الگوی modal.js)؛ stored خالص localStorage است.
import { t } from "./i18n.js";

export function createFlatView(flatBtn, renderer) {
  function paint(f) {
    if (flatBtn) flatBtn.textContent = f ? t("main.top.flat3d") : t("ui.top.flat");
  }

  function stored() {
    try { return localStorage.getItem("scw.flat") === "1"; } catch { return false; }
  }

  function apply(f, temp) {
    renderer.setFlat(f);
    paint(f);
    if (!temp) { try { localStorage.setItem("scw.flat", f ? "1" : "0"); } catch {} }
  }
  return { paint, stored, apply };
}
