// دکمه‌های کلیدها (0.246.0 — C-CLN-36): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// keyMap/keyRecAction از بوت می‌آیند (reassign می‌شوند → getter؛ الگوی policy.js).
import { t } from "./i18n.js";
import { KEY_ACTION_FA } from "./a11y.js";

export function createKeyButtons({ getKeyMap, getRecAction }) {
  function paintKeyButtons() {
    for (const b of document.querySelectorAll("[data-keyact]")) {
      const a = b.dataset.keyact;
      b.textContent = `${KEY_ACTION_FA[a] || a}: ${getRecAction() === a ? t("main.keys.press") : getKeyMap()[a]}`;
    }
  }
  return { paint: paintKeyButtons };
}
