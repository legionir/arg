// رجیستری دارایی‌های تصویری (spec §16): بارگذاری کش‌شده، fallback امن.
// قرارداد: getSprite(path) در اولین نیاز Image می‌سازد؛ تا آماده شدن null
// برمی‌گرداند تا رندر از مسیر وکتوری fallback استفاده کند. خطا فقط یک‌بار warn می‌شود.
// دارایی‌های inline (dataURL، تولیدشده از src/assets) هیچ شبکه/CORS لازم ندارند و
// بوم را taint نمی‌کنند؛ بقیه مسیرها با crossOrigin ناشناس لود می‌شوند.
import { TILE_DATA } from "./tiles.gen.js";
import { UNIT_DATA } from "./units.gen.js";
import { DECOR_DATA } from "./decor.gen.js";
import { ICON_DATA } from "./icons.gen.js";

const cache = new Map();
const bad = new Set();

// جدول inline: مسیر فایل → dataURL (بدون شبکه/CORS/taint)
const INLINE = {};
for (const k in TILE_DATA) INLINE[`assets/terrain/${k}.png`] = TILE_DATA[k];
for (const k in UNIT_DATA) INLINE[`assets/units/${k}.png`] = UNIT_DATA[k];
for (const k in DECOR_DATA) INLINE[`assets/environment/${k}.png`] = DECOR_DATA[k];

export function getSprite(path) {
  let e = cache.get(path);
  if (!e) {
    const e2 = { img: new Image(), ready: false };
    e2.img.onload = () => { e2.ready = true; };
    e2.img.onerror = () => {
      if (!bad.has(path)) {
        bad.add(path);
        console.warn("[assets] sprite missing, using vector fallback:", path);
      }
    };
    if (INLINE[path] !== undefined) e2.img.src = INLINE[path];
    else if (/^assets\/(units|terrain|environment)\//.test(path)) {
      // این پوشه‌ها کاملاً inline‌اند: مسیر ناموجود = fallback وکتوری بی‌درخواست شبکه (۴۰۴ بی‌جا نمی‌دهد)
      bad.add(path);
      console.warn("[assets] sprite missing, using vector fallback:", path);
    } else {
      e2.img.crossOrigin = "anonymous";
      e2.img.src = path;
    }
    e = e2;
    cache.set(path, e);
  }
  return e.ready ? e.img : null;
}

// برای تست/اعتبارسنجی: آیا همه مسیرهای داده‌شده آماده‌اند؟
export function spritesReady(paths) {
  return paths.every((p) => {
    const e = cache.get(p);
    return e && e.ready;
  });
}

// آیکون رابط کاربری: dataURL آماده (بدون شبکه) یا مسیر فایل
export function iconSrc(key) {
  return ICON_DATA[key] || `assets/resources/${key}.png`;
}
