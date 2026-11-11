// زمین قطعی (0.27.0): همه‌چیز از seed ساخته می‌شود — دریاچه (شعاع/کشیدگی/لبه)،
// توده‌های سنگ (جای/شعاع) و پراکنده‌ها. تقارن چهارطرفه دقیق حفظ است تا هر ۴
// گوشه برابر بمانند: همه مؤلفه‌ها آینه‌ای‌اند (نویز لبه با مختصات آینه‌ای
// نمونه‌برداری می‌شود). ۰=چمن (ساختنی)، ۱=آب، ۲=سنگ.
import { CONFIG } from "./config.js";
import { mulberry32 } from "./rng.js";

export { mulberry32 };
export const T_GRASS = 0;
export const T_WATER = 1;
export const T_ROCK = 2;
// واحه (0.154.0 — §1.2/بند 107): چمنِ دارای نخل/برکه — قابل‌عبور مثل چمن،
// غیرقابل‌ساخت (ردپا چمن خالص می‌خواهد)؛ مزارع فقط نزدیک آن (شعاع ۸).
export const T_OASIS = 3;

// پارامترهای دریاچه از سید: مرکز همیشه وسط نقشه (تقارن)، شعاع‌های بیضی ۴..۸،
// گرید نویز ۱۲×۱۲ برای لبه نامنظم (دامنه ±~۲۰٪ مرز). هسته r≤۲٫۵ همیشه آب است
// تا نقطه شاخص مرکزی تست‌ها پایدار بماند.
export function lakeParams(seed, w, h) {
  const r = mulberry32((seed ^ 0x51ab27) >>> 0);
  const rx = 4 + Math.floor(r() * 5); // ۴..۸
  const ry = 4 + Math.floor(r() * 5); // ۴..۸
  const n = 12;
  const grid = new Float32Array(n * n);
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  return { rx, ry, grid, n };
}

// پارامترهای واحه از سید (0.154.0 — بند 107): مرکز زیر محوطه شروع ربع
// بالا-چپ + آینه‌ای؛ شکل به‌علاوه (۵ خانه).
export function oasisParams(seed) {
  const r = mulberry32(((seed == null ? CONFIG.MAP_SEED : seed) ^ 0x0a515) >>> 0);
  // ستون از {۳،۴،۶}: بازوهای (oqx,9) و (oqx,11) هرگز روی نقاط استخدام پین‌شده
  // (ستون‌های فرد ۵..۱۳) نمی‌نشینند؛ سطر ثابت ۱۰ (بازوها ۹..۱۱: بیرون محوطه‌ها،
  // درون شعاع ۸ همه مزارع آزمونی). آینه‌ای در ۳ ربع دیگر.
  const oqx = [3, 4, 6][Math.floor(r() * 3)];
  const oqy = 10;
  return { oqx, oqy };
}

// پارامترهای توده‌های سنگ از سید: مرکز توده در ربع بالا-چپ (کسر ۰٫۲۰..۰٫۳۴
// از ابعاد — با فاصله امن از دریاچه و محوطه‌های شروع) و آینه‌ای در ۳ ربع
// دیگر؛ شعاع ۲..۴.
export function rockParams(seed, w, h) {
  const r = mulberry32((seed ^ 0x2b7c1a) >>> 0);
  const qx = Math.round(w * (0.20 + r() * 0.14)); // ۰٫۲۰..۰٫۳۴ عرض
  const qy = Math.round(h * (0.20 + r() * 0.14)); // ۰٫۲۰..۰٫۳۴ ارتفاع
  const sr = 2 + Math.floor(r() * 3); // ۲..۴
  return { qx, qy, sr };
}

// مرکز دریاچه‌ی بازی سولو از سید (0.292.0): وسط نقشه نیست؛ در بازه‌ی ۳۸٪..۶۲٪ ابعاد تا دو گوشه‌ی
// شروع (چمنِ اجباری) همیشه سالم بمانند. فقط سولو؛ چندنفره و سید پیش‌فرض متقارن و دست‌نخورده‌اند.
export function soloLakeCenter(seed, w, h) {
  const r = mulberry32(((seed >>> 0) ^ 0x7a3c19) >>> 0);
  return [Math.round(w * (0.38 + r() * 0.24)), Math.round(h * (0.38 + r() * 0.24))];
}

export function makeTerrain(w, h, seed, lakeAt) {
  const t = new Uint8Array(w * h);
  const at = (c, r) => r * w + c;
  const s = seed >>> 0;
  const cx0 = (w - 1) / 2, cy0 = (h - 1) / 2;
  const cx = lakeAt ? lakeAt[0] : cx0, cy = lakeAt ? lakeAt[1] : cy0; // lakeAt = [c, r] فقط سولو (0.292.0)
  // --- دریاچه مرکزی از سید ---
  const lake = lakeParams(s, w, h);
  const gx = lake.n - 1, gy = lake.n - 1;
  const noiseAt = (c, r) => {
    // مختصات آینه‌ای: هر ۴ همتای آینه‌ای دقیقاً یک نویز می‌بینند → تقارن کامل.
    if (lakeAt) { c = Math.max(0, Math.min(w - 1, c - (cx - cx0))); r = Math.max(0, Math.min(h - 1, r - (cy - cy0))); } // نویز همراه دریاچه جابه‌جا می‌شود
    const mc = Math.min(c, w - 1 - c) / (w - 1);
    const mr = Math.min(r, h - 1 - r) / (h - 1);
    const fx = mc * gx, fy = mr * gy;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(gx, x0 + 1), y1 = Math.min(gy, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const g = lake.grid;
    const a = g[y0 * lake.n + x0], b = g[y0 * lake.n + x1];
    const cc = g[y1 * lake.n + x0], d = g[y1 * lake.n + x1];
    return a + (b - a) * tx + (cc - a) * ty + (a - b - cc + d) * tx * ty;
  };
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const dx = c - cx, dy = r - cy;
      if (dx * dx + dy * dy <= 6.25) { t[at(c, r)] = T_WATER; continue; } // هسته همیشه آب
      const e = (dx * dx) / (lake.rx * lake.rx) + (dy * dy) / (lake.ry * lake.ry);
      if (e <= 1 + (noiseAt(c, r) - 0.5) * 0.45) t[at(c, r)] = T_WATER;
    }
  }
  // --- ۴ توده سنگ متقارن از سید ---
  const rock = rockParams(s, w, h);
  const clusters = [
    [rock.qx, rock.qy], [w - 1 - rock.qx, rock.qy],
    [rock.qx, h - 1 - rock.qy], [w - 1 - rock.qx, h - 1 - rock.qy],
  ];
  for (const [sx, sy] of clusters) {
    const r0 = Math.max(0, sy - rock.sr - 1), r1 = Math.min(h - 1, sy + rock.sr + 1);
    const c0 = Math.max(0, sx - rock.sr - 1), c1 = Math.min(w - 1, sx + rock.sr + 1);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const dx = c - sx, dy = r - sy;
        if (dx * dx + dy * dy <= rock.sr * rock.sr && t[at(c, r)] === T_GRASS) {
          t[at(c, r)] = T_ROCK;
        }
      }
    }
  }
  // سنگ‌های پراکنده قطعی — در ربع بالا-چپ می‌رویند و آینه‌ای تکثیر می‌شوند
  // تا تقارن (و عدالت گوشه‌ها) حفظ شود؛ تراکم ثابت ~۳٫۵٪.
  const rnd = mulberry32((s ^ 0x9e37) >>> 0);
  const hw = Math.ceil(w / 2), hh = Math.ceil(h / 2);
  const target = Math.round(w * h * 0.035);
  let placed = 0, guard = 0;
  const mirror = (c, r) => [[c, r], [w - 1 - c, r], [c, h - 1 - r], [w - 1 - c, h - 1 - r]];
  while (placed < target && guard++ < target * 60) {
    const c = Math.floor(rnd() * hw), r = Math.floor(rnd() * hh);
    const ms = mirror(c, r);
    if (!ms.every(([mc, mr]) => t[at(mc, mr)] === T_GRASS)) continue;
    for (const [mc, mr] of ms) t[at(mc, mr)] = T_ROCK;
    placed += ms.length;
  }
  // محوطه‌های شروع همیشه چمن — هر ۴ گوشه آینه‌ای تا تقارن دقیق (و عدالت
  // ربع‌ها برای هر سید) حفظ شود. سولو فقط بالا-چپ را استفاده می‌کند.
  for (let r = 1; r <= 8; r++) {
    for (let c = 1; c <= 9; c++) {
      t[at(c, r)] = T_GRASS;
      t[at(w - 1 - c, r)] = T_GRASS;
      t[at(c, h - 1 - r)] = T_GRASS;
      t[at(w - 1 - c, h - 1 - r)] = T_GRASS;
    }
  }
  // --- واحه‌های متقارن (0.154.0 — بند 107): پس از سنگ‌ها (رویشان می‌نشیند)،
  // پس از محوطه‌ها (روی چمن اجباری گوشه هم می‌نشیند — قطعی؛ ستاد مارپیچ جابه‌جا می‌شود).
  {
    const s = seed >>> 0;
    const o = oasisParams(s);
    const centers = [
      [o.oqx, o.oqy], [w - 1 - o.oqx, o.oqy],
      [o.oqx, h - 1 - o.oqy], [w - 1 - o.oqx, h - 1 - o.oqy],
    ];
    for (const [sc, sr] of centers) {
      for (const [dc, dr] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const cc = sc + dc, rr = sr + dr;
        if (cc < 0 || rr < 0 || cc >= w || rr >= h) continue;
        if (t[at(cc, rr)] === T_WATER) continue; // برکه روی دریاچه نمی‌نشیند
        t[at(cc, rr)] = T_OASIS;
      }
    }
  }
  return t;
}

// نقاط شاخص زمین — حالا سیدآگاه (پیش‌فرض: سید پیش‌فرض): مرکز دریاچه همیشه
// آب است و مرکز توده سنگ همیشه سنگ (فاصله امن از دریاچه/محوطه‌ها).
export function terrainPins(w, h, seed) {
  const s = (seed == null ? CONFIG.MAP_SEED : seed) >>> 0;
  const rock = rockParams(s, w, h);
  const rocks = [
    [rock.qx, rock.qy], [w - 1 - rock.qx, rock.qy],
    [rock.qx, h - 1 - rock.qy], [w - 1 - rock.qx, h - 1 - rock.qy],
  ];
  return {
    lake: [Math.floor((w - 1) / 2), Math.floor((h - 1) / 2)],
    rock: [rock.qx, rock.qy],
    oasis: (() => { const o = oasisParams(s); return [o.oqx, o.oqy]; })(), // مرکز واحه ربع بالا-چپ (0.154.0 — بند 107)
    rocks,
    quadrant: [Math.ceil(w / 2), Math.ceil(h / 2)],
  };
}

export function terrainAt(t, w, h, c, r) {
  if (c < 0 || r < 0 || c >= w || r >= h) return -1;
  return t[r * w + c];
}
