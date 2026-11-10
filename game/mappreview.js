// پیش‌نمایش نقشه (0.250.0 — C-CLN-48): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { CONFIG } from "./config.js";
import { t } from "./i18n.js";
import { paintMapThumb } from "./minimap.js";
import { namedMapByKey } from "./mapedit.js";
import { parseSeed } from "./seed.js";

function $(id) { return document.getElementById(id); }
export function createMapPreviewUI({ getSoloMapKey }) {
  // پیش‌نمایش نقشه (0.177.0 — بند 90: thumbnail + توضیح کوتاه). سید
  // انتخاب (نام‌دار یا سفارشی) را می‌کشد؛ متن از کلید game.map.*.desc.
  function paintMapPreview() {
    const cv = $("mapThumb"), desc = $("mapDesc");
    const sel = $("mapSel");
    const nm = namedMapByKey(sel ? sel.value : soloMapKey);
    const key = nm ? nm.key : "custom";
    let seed = nm ? nm.seed : parseSeed(($("seedInput") || {}).value);
    if (seed == null) seed = CONFIG.MAP_SEED;
    if (cv) paintMapThumb(cv, seed);
    if (desc) desc.textContent = t(key === "custom" ? "game.map.custom.desc" : "game.map." + key + ".desc");
  }
  // پیش‌نمایش نقشه لابی (0.219.0 — §۱۴.۲/بند 722): سید اتاق → thumbnail +
  // توضیح (همان کاتالوگ game.map.*.desc منوی سولو)؛ ارسال نقشه بی‌مصداق است
  // (زمین تابع خالص سید است — همه اعضا یکسان می‌سازند؛ اتاق فقط سید حمل می‌کند).
  function paintMpMapPreview() {
    const cv = $("mpMapThumb"), desc = $("mpMapDesc");
    const inp = $("mpSeedInput");
    const raw = inp && inp.value ? inp.value.trim() : "";
    let seed = raw ? parseSeed(raw) : null;
    if (seed == null) seed = CONFIG.MAP_SEED;
    const nm = CONFIG.MAPS.find((m) => m.seed === (seed >>> 0));
    if (cv) paintMapThumb(cv, seed);
    if (desc) desc.textContent = t(nm ? "game.map." + nm.key + ".desc" : "game.map.custom.desc");
  }
  return { paintMapPreview, paintMpMapPreview };
}
