// رندر ایزومتریک Canvas2D: زمین بافت‌دار قطعی، ساختمان‌های تایپ‌محور،
// واحدهای جهت‌دار با نوار HP کمینه، پیش‌نمایش حجمی، دوربین خودفیت.
// قرارداد پایدار: cellToScreen/screenToCell و خروجی createRenderer عوض نشده
// (تست رفت‌وبرگشت مختصات به آن تکیه دارد). همه تنوع‌ها از هش قطعی (c,r)
// می‌آیند — صفر اثر روی منطق بازی.
import { CONFIG } from "./config.js";
import { T_GRASS, T_WATER, T_ROCK } from "./terrain.js";
import { UNITS } from "./combat.js";
import { getSprite } from "./sprites.js";

// هش قطعی ۰..۱ فقط برای تنوع بصری
function hash2(c, r) {
  let h = (Math.imul(c, 374761393) + Math.imul(r, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const GRASS = ["#4c7d44", "#527f45", "#46753e", "#4e8348"];
const GRASS_TUFT = "rgba(30,60,26,0.55)";
const WATER_A = "#2e6f8e";
const WATER_B = "#2a657f";
const WATER_HI = "rgba(150,210,235,0.6)";
const FOAM = "rgba(220,240,248,0.7)";
const ROCK_A = "#6e7278";
const ROCK_B = "#676b71";

export function createRenderer(canvas) {
  let ctx = canvas.getContext("2d"); // let: thumbها موقتاً روی بوم کوچک می‌کشند
  const view = { panX: 0, panY: 0, zoom: 1, flat: false };
  let W = 0, H = 0, dpr = 1;
  let dirty = false; // true وقتی کاربر دستی زوم/پن کرده (ریسایز دیگر فیت خودکار نکند)
  // کیفیت رسم (0.58.0 — #۲۷): full = همه‌چیز؛ balanced = بدون پاف‌ها؛
  // lite = بدون جلوه/پاف/هایلایت/خط نگهبانی (فقط اطلاعات گیم‌پلی). sim بی‌خبر است.
  let fidelity = "full";
  function setFidelity(f) {
    fidelity = (f === "balanced" || f === "lite") ? f : "full";
  }
  const face = new Map(); // جهت تقریبی واحدها: id -> {x, r, ang}
  // کش فریم: مبدأ/نیم‌گام (هر فریم یک‌بار) + لیست آب + گرادیان پس‌زمینه
  let O = { x: 0, y: 0 }, HW = 18, HH = 9;
  const waterList = [];
  let bgGrad = null, bgH = 0;

  function baseZoom() {
    const mw = (CONFIG.GRID_W + CONFIG.GRID_H) * (CONFIG.TILE_W / 2);
    const mh = (CONFIG.GRID_W + CONFIG.GRID_H) * (CONFIG.TILE_H / 2);
    return Math.max(0.2, Math.min(W / (mw + 80), H / (mh + 80)));
  }

  function resize() {
    const parent = canvas.parentElement;
    // جعبه محتوا (نه border-box): #boardWrap بردر ۱px دارد و خواندن
    // getBoundingClientRect چرخه رشد +۲px می‌ساخت — clientWidth درست است.
    const nw = Math.max(80, parent.clientWidth), nh = Math.max(80, parent.clientHeight);
    if (Math.abs(nw - W) < 0.5 && Math.abs(nh - H) < 0.5) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = nw; H = nh;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    if (!dirty) fit();
  }

  function fit() {
    view.zoom = baseZoom();
    view.panX = 0;
    view.panY = 0;
    dirty = false;
  }

  function markDirty() { dirty = true; }

  function origin() {
    const mh = (CONFIG.GRID_W + CONFIG.GRID_H) * (CONFIG.TILE_H / 2) * view.zoom;
    return { x: W / 2 + view.panX, y: (H - mh) / 2 + view.panY };
  }

  function cellToScreen(c, r) {
    const o = origin();
    const hw = (CONFIG.TILE_W / 2) * view.zoom;
    const hh = (CONFIG.TILE_H / 2) * view.zoom;
    return { x: o.x + (c - r) * hw, y: o.y + (c + r) * hh };
  }

  function screenToCell(sx, sy) {
    const o = origin();
    const hw = (CONFIG.TILE_W / 2) * view.zoom;
    const hh = (CONFIG.TILE_H / 2) * view.zoom;
    const dx = (sx - o.x) / hw;
    const dy = (sy - o.y) / hh;
    return { c: Math.floor((dx + dy) / 2), r: Math.floor((dy - dx) / 2) };
  }

  function diamond(c, r) {
    return [
      { x: O.x + (c - r) * HW, y: O.y + (c + r) * HH },
      { x: O.x + (c + 1 - r) * HW, y: O.y + (c + 1 + r) * HH },
      { x: O.x + (c + 1 - r - 1) * HW, y: O.y + (c + 1 + r + 1) * HH },
      { x: O.x + (c - r - 1) * HW, y: O.y + (c + r + 1) * HH },
    ];
  }

  // مسیر سریع درون‌فریمی (همان ریاضی cellToScreen با مبدأ کش‌شده)
  function cs(c, r) {
    return { x: O.x + (c - r) * HW, y: O.y + (c + r) * HH };
  }

  function poly(points, fill, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }

  function line(a, b, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw || 1;
    ctx.stroke();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const cl = (v) => Math.max(0, Math.min(255, v + amt));
    const r = cl((n >> 16) & 255), g = cl((n >> 8) & 255), b = cl(n & 255);
    return `rgb(${r},${g},${b})`;
  }

  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  // دکور زمین (فایل؛ فقط روی تایل غیرقابل‌بازی تا با occupancy دروغ نگوید)
  function drawDecor(kind, variant, cx, cy, dw, dh) {
    const img = getSprite(`assets/environment/${kind}-${variant}.png`);
    if (!img) { tIncomplete = true; return; }
    const w = dw * view.zoom, h = dh * view.zoom;
    ctx.drawImage(img, cx - w / 2, cy + 3 * view.zoom - h, w, h);
  }

  // --- تایل‌های فایلی (§6): drawImage روی مرکز لوزی؛ fallback وکتوری ---
  function tileImage(kind, idx) {
    return getSprite(`assets/terrain/${kind}-${idx}.png`);
  }

  function blitTile(img, pts) {
    const cx = (pts[0].x + pts[2].x) / 2, cy = (pts[0].y + pts[2].y) / 2;
    const w = CONFIG.TILE_W * view.zoom, h = CONFIG.TILE_H * view.zoom;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  }

  // ---------- زمین ----------

  function tileAt(terrain, GW, GH, c, r) {
    if (c < 0 || r < 0 || c >= GW || r >= GH) return -1;
    return terrain[r * GW + c];
  }

  function drawGrass(pts, c, r, det) {
    const h = hash2(c, r);
    poly(pts, GRASS[(h * GRASS.length) | 0], "rgba(0,0,0,0.10)", 1);
    if (!det) return;
    // دسته علف: دو خط کوتاه در نقطه قطعی داخل لوزی
    if (h < 0.34) {
      const cx = (pts[0].x + pts[2].x) / 2 + (h - 0.17) * 22 * view.zoom;
      const cy = (pts[0].y + pts[2].y) / 2 + (hash2(r, c) - 0.5) * 10 * view.zoom;
      line({ x: cx - 2, y: cy }, { x: cx - 3, y: cy - 4 * view.zoom }, GRASS_TUFT, 1);
      line({ x: cx + 2, y: cy }, { x: cx + 3, y: cy - 4 * view.zoom }, GRASS_TUFT, 1);
    } else if (h > 0.965) {
      // گل وحشی تک‌نقطه‌ای
      const cx = (pts[0].x + pts[2].x) / 2, cy = (pts[0].y + pts[2].y) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, 1.6 * view.zoom), 0, Math.PI * 2);
      ctx.fillStyle = h > 0.985 ? "#e8e6f0" : "#e7c65a";
      ctx.fill();
    }
  }

  function drawWater(pts, c, r, tick, det) {
    poly(pts, (c + r) % 2 ? WATER_A : WATER_B, "rgba(0,0,0,0.12)", 1);
    // برق موج: فاز متحرک با تیک (مکث بازی = توقف موج، درست است)
    const ph = (tick * 0.12 + hash2(c, r) * 6.283) % 6.283;
    if (Math.sin(ph) > 0.82) {
      const mc = mid(pts[0], pts[2]);
      const iw = (pts[1].x - pts[0].x) * 0.32;
      line({ x: mc.x - iw, y: mc.y }, { x: mc.x + iw, y: mc.y }, WATER_HI, Math.max(1, 1.4 * view.zoom));
    }
    if (det && hash2(c * 5 + 9, r * 3 + 1) > 0.93) {
      const mc = mid(pts[1], pts[3]);
      ctx.beginPath();
      ctx.arc(mc.x, mc.y, Math.max(1, 1.2 * view.zoom), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(150,210,235,0.35)";
      ctx.fill();
    }
  }

  // کف ساحل: یال مشترک با همسایه چمن روشن می‌شود
  function drawShore(pts, c, r, terrain, GW, GH) {
    ctx.lineWidth = Math.max(1, 1.6 * view.zoom);
    ctx.strokeStyle = FOAM;
    const edge = (a, b) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    if (tileAt(terrain, GW, GH, c, r - 1) === T_GRASS) edge(pts[0], pts[1]);
    if (tileAt(terrain, GW, GH, c + 1, r) === T_GRASS) edge(pts[1], pts[2]);
    if (tileAt(terrain, GW, GH, c, r + 1) === T_GRASS) edge(pts[3], pts[2]);
    if (tileAt(terrain, GW, GH, c - 1, r) === T_GRASS) edge(pts[0], pts[3]);
  }

  function drawRock(pts, c, r, det) {
    const h = hash2(c * 2 + 1, r * 2 + 3);
    poly(pts, h < 0.5 ? ROCK_A : ROCK_B, "rgba(0,0,0,0.22)", 1);
    // پخیزدگی یال بالا + خال تیره
    line(pts[0], pts[1], "rgba(255,255,255,0.16)", 1);
    if (det) {
      const mc = mid(pts[0], pts[2]);
      ctx.beginPath();
      ctx.arc(mc.x + (h - 0.5) * 8 * view.zoom, mc.y, Math.max(1, 1.8 * view.zoom), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fill();
    }
  }

  // ---------- ساختمان‌ها ----------

  function groundShadow(A, B, C, D, alpha) {
    const cx = (A.x + B.x + C.x + D.x) / 4;
    const cy = (A.y + B.y + C.y + D.y) / 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, (Math.abs(B.x - D.x) / 2) * 0.85 + 2, (Math.abs(C.y - A.y) / 2) * 0.42 + 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fill();
  }

  // شست‌وشوی آسیب روی صفحه بالا + ترک در آسیب سنگین
  function damageWash(topPts, frac, det) {
    if (frac <= 0.02) return;
    poly(topPts, `rgba(24,10,6,${0.5 * frac})`, null, 0);
    if (det && frac > 0.3) {
      const mc = mid(topPts[0], topPts[2]);
      line(topPts[0], mc, "rgba(0,0,0,0.5)", 1);
      line(mc, topPts[2], "rgba(0,0,0,0.5)", 1);
    }
  }

  function drawHut(b, def, det) {
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.28);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    // در روی نمای راست
    const d0 = lerp(B, C, 0.36), d1 = lerp(B, C, 0.64);
    const dh = Math.min(11 * view.zoom, (C.y - Ct.y) * 0.8);
    poly([d0, d1, { x: d1.x, y: d1.y - dh }, { x: d0.x, y: d0.y - dh }], "#3a2c1c", null, 0);
    // سقف شیروانی: خط‌الرأس بین وسط یال چپ و راست صفحه بالا
    const roofH = Math.max(5, 13 * view.zoom);
    const L = mid(At, Dt), R = mid(Bt, Ct);
    const Lp = { x: L.x, y: L.y - roofH }, Rp = { x: R.x, y: R.y - roofH };
    poly([At, Dt, Lp], def.dark, "rgba(0,0,0,0.4)", 1);      // پیشانی چپ
    poly([Bt, Ct, Rp], shade(def.base, -30), "rgba(0,0,0,0.4)", 1); // پیشانی راست
    poly([Lp, At, Bt, Rp], def.top, "rgba(0,0,0,0.35)", 1);  // شیب روشن
    poly([Lp, Rp, Ct, Dt], shade(def.top, -30), "rgba(0,0,0,0.35)", 1); // شیب سایه
    line(Lp, Rp, "rgba(0,0,0,0.45)", 1);
    if (det) {
      for (const t of [0.33, 0.66]) {
        line(lerp(Lp, At, t), lerp(Rp, Bt, t), "rgba(0,0,0,0.14)", 1);
        line(lerp(Lp, Dt, t), lerp(Rp, Ct, t), "rgba(0,0,0,0.14)", 1);
      }
    }
    damageWash([Lp, Rp, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: Math.min(At.y, Bt.y) - roofH };
  }

  // سربازخانه ۴×۳ (0.29.0): تالار سنگی با سقف شیروانی سرخ، درِ بزرگ و
  // شمشیرهای متقاطع روی نما (نشان پیش‌نیاز سرباز).
  function drawBarracks(b, def, det) {
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.32);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.45)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.45)", 1);
    // درِ بزرگ روی نمای راست
    const d0 = lerp(B, C, 0.30), d1 = lerp(B, C, 0.70);
    const dh = Math.min(15 * view.zoom, (C.y - Ct.y) * 0.85);
    poly([d0, d1, { x: d1.x, y: d1.y - dh }, { x: d0.x, y: d0.y - dh }], "#2e2118", null, 0);
    // شمشیرهای متقاطع روی نمای چپ
    const s0 = lerp(lerp(D, Dt, 0.62), lerp(C, Ct, 0.62), 0.30);
    const s1 = lerp(lerp(D, Dt, 0.30), lerp(C, Ct, 0.30), 0.70);
    const t0 = lerp(lerp(D, Dt, 0.62), lerp(C, Ct, 0.62), 0.70);
    const t1 = lerp(lerp(D, Dt, 0.30), lerp(C, Ct, 0.30), 0.30);
    const sw = Math.max(1.6, 2.4 * view.zoom);
    line(s0, s1, "#d7dde3", sw);
    line(t0, t1, "#d7dde3", sw);
    // سقف شیروانی سرخ
    const roofH = Math.max(5, 13 * view.zoom);
    const L = mid(At, Dt), R = mid(Bt, Ct);
    const Lp = { x: L.x, y: L.y - roofH }, Rp = { x: R.x, y: R.y - roofH };
    poly([At, Dt, Lp], shade(def.top, -25), "rgba(0,0,0,0.4)", 1);
    poly([Bt, Ct, Rp], shade(def.top, -45), "rgba(0,0,0,0.4)", 1);
    poly([Lp, At, Bt, Rp], def.top, "rgba(0,0,0,0.35)", 1);
    poly([Lp, Rp, Ct, Dt], shade(def.top, -30), "rgba(0,0,0,0.35)", 1);
    line(Lp, Rp, "rgba(0,0,0,0.45)", 1);
    damageWash([Lp, Rp, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: Math.min(At.y, Bt.y) - roofH };
  }

  // انبار ۲×۲ (0.34.0): سکوی چوبی کوتاه با جعبه‌ها و بشکه — سقف ندارد تا از
  // دور با انبار غذا (سقف‌دار) فرق کند.
  function drawStockpile(b, def, det) {
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.30);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    poly([At, Bt, Ct, Dt], def.top, "rgba(0,0,0,0.45)", 1); // سکوی رویی
    if (det) {
      // دو جعبه روی سکو (لوزی‌های کوچک) + یک بشکه (بیضی)
      const m = mid(At, Ct);
      const iw = (Bt.x - At.x) * 0.16, ih = (Dt.y - At.y) * 0.16;
      const box = (cx, cy) => poly(
        [{ x: cx, y: cy - ih }, { x: cx + iw, y: cy }, { x: cx, y: cy + ih }, { x: cx - iw, y: cy }],
        shade(def.top, -35), "rgba(0,0,0,0.4)", 1);
      box(m.x - iw * 1.2, m.y - ih * 0.4);
      box(m.x + iw * 1.2, m.y + ih * 0.4);
      ctx.beginPath();
      ctx.ellipse(m.x, m.y - ih * 1.4, iw * 0.8, ih * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#6e4a2e";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    damageWash([At, Bt, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: Math.min(At.y, Bt.y) };
  }

  // انبار غذا ۲×۲ (0.34.0): کلبه کوتاه با کیسه‌های غله کنار در.
  function drawGranary(b, def, det) {
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.28);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    const d0 = lerp(B, C, 0.40), d1 = lerp(B, C, 0.60);
    const dh = Math.min(10 * view.zoom, (C.y - Ct.y) * 0.8);
    poly([d0, d1, { x: d1.x, y: d1.y - dh }, { x: d0.x, y: d0.y - dh }], "#3a2c1c", null, 0);
    // کیسه‌های غله: دو بیضی کرم کنار در روی نمای راست
    if (det) {
      const g0 = lerp(B, C, 0.22), g1 = lerp(B, C, 0.78);
      for (const g of [g0, g1]) {
        ctx.beginPath();
        ctx.ellipse(g.x, g.y - 3 * view.zoom, 4.5 * view.zoom, 3.4 * view.zoom, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#d9c48a";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    const roofH = Math.max(4, 10 * view.zoom);
    const L = mid(At, Dt), R = mid(Bt, Ct);
    const Lp = { x: L.x, y: L.y - roofH }, Rp = { x: R.x, y: R.y - roofH };
    poly([At, Dt, Lp], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([Bt, Ct, Rp], shade(def.base, -30), "rgba(0,0,0,0.4)", 1);
    poly([Lp, At, Bt, Rp], def.top, "rgba(0,0,0,0.35)", 1);
    poly([Lp, Rp, Ct, Dt], shade(def.top, -30), "rgba(0,0,0,0.35)", 1);
    line(Lp, Rp, "rgba(0,0,0,0.45)", 1);
    damageWash([Lp, Rp, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: Math.min(At.y, Bt.y) - roofH };
  }

  // بازار ۲×۲ (0.64.0 — ب-۳): سکوی سنگی + سایه‌بان راه‌راه سبز-کرم روی ۴ تیر
  // + نشان سکه طلا روی پیشانی.
  function drawMarket(b, def, det) {
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.28);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    // سکوی سنگی کوتاه
    const plat = 6 * view.zoom;
    poly([D, C, { x: C.x, y: C.y - plat }, { x: D.x, y: D.y - plat }], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, { x: C.x, y: C.y - plat }, { x: B.x, y: B.y - plat }], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    poly([{ x: A.x, y: A.y - plat }, { x: B.x, y: B.y - plat }, { x: C.x, y: C.y - plat }, { x: D.x, y: D.y - plat }],
      def.base, "rgba(0,0,0,0.45)", 1);
    if (det) {
      // ۴ تیر + سایه‌بان راه‌راه (۷ نوار متناوب سبز/کرم روی صفحه سقف)
      const corners = [At, Bt, Ct, Dt];
      for (const q of corners) {
        line({ x: q.x, y: q.y + plat }, q, "#4e3a26", Math.max(1.5, 2.4 * view.zoom));
      }
      const N = 7;
      for (let i = 0; i < N; i++) {
        const t0 = i / N, t1 = (i + 1) / N;
        poly([lerp(At, Bt, t0), lerp(At, Bt, t1), lerp(Dt, Ct, t1), lerp(Dt, Ct, t0)],
          i % 2 ? "#e8d9a8" : def.top, "rgba(0,0,0,0.35)", 1);
      }
      // جعبه‌های کالا زیر سایه‌بان + سکه روی پیشانی میانی
      const m = mid(At, Ct);
      const iw = (Bt.x - At.x) * 0.13, ih = (Dt.y - At.y) * 0.13;
      const box = (cx, cy, col) => poly(
        [{ x: cx, y: cy - ih }, { x: cx + iw, y: cy }, { x: cx, y: cy + ih }, { x: cx - iw, y: cy }],
        col, "rgba(0,0,0,0.4)", 1);
      box(m.x - iw * 1.4, m.y + ih * 1.2, shade(def.base, -30));
      box(m.x + iw * 1.4, m.y + ih * 1.6, "#d9c48a");
      ctx.beginPath();
      ctx.arc(m.x, m.y - ih * 1.1, Math.max(2, 3.4 * view.zoom), 0, Math.PI * 2);
      ctx.fillStyle = "#f0c75e";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    damageWash([At, Bt, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: Math.min(At.y, Bt.y) };
  }

  function drawTower(b, def, tick, det) {
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.34);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.45)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.45)", 1);
    if (det) {
      // بندهای سنگی افقی روی هر دو نما
      for (const t of [0.33, 0.66]) {
        line(lerp(D, Dt, t), lerp(C, Ct, t), "rgba(0,0,0,0.22)", 1);
        line(lerp(B, Bt, t), lerp(C, Ct, t), "rgba(255,255,255,0.10)", 1);
      }
    }
    // شکاف تیراندازی روی نمای راست
    const w0 = lerp(lerp(B, Bt, 0.55), lerp(C, Ct, 0.55), 0.5);
    line({ x: w0.x, y: w0.y - 5 * view.zoom }, { x: w0.x, y: w0.y + 3 * view.zoom }, "rgba(10,10,12,0.85)", Math.max(2, 3 * view.zoom));
    // سکوی بالا
    poly([At, Bt, Ct, Dt], def.top, "rgba(0,0,0,0.5)", 1);
    // کنگره‌ها روی دو یال جلو
    const toothH = Math.max(2.5, 6 * view.zoom);
    const teeth = (P, Q) => {
      for (let i = 0; i < 3; i++) {
        const t0 = 0.12 + i * 0.30, t1 = t0 + 0.17;
        const p0 = lerp(P, Q, t0), p1 = lerp(P, Q, t1);
        poly([p0, p1, { x: p1.x, y: p1.y - toothH }, { x: p0.x, y: p0.y - toothH }], def.top, "rgba(0,0,0,0.45)", 1);
      }
    };
    teeth(Dt, Ct);
    teeth(Bt, Ct);
    // لوزی داخلی حیاط
    const mc = mid(At, Ct);
    const iw = (Bt.x - At.x) * 0.2, ih = (Dt.y - At.y) * 0.2;
    poly(
      [{ x: mc.x, y: mc.y - ih }, { x: mc.x + iw, y: mc.y }, { x: mc.x, y: mc.y + ih }, { x: mc.x - iw, y: mc.y }],
      "rgba(0,0,0,0.22)", null, 0
    );
    // پرچم مواج
    const poleH = 15 * view.zoom;
    const px = mc.x, py = mc.y - ih - poleH;
    line({ x: mc.x, y: mc.y - ih }, { x: px, y: py }, "#3a2c1c", Math.max(1, 1.6 * view.zoom));
    const wave = Math.sin(tick * 0.35) * 2.4 * view.zoom;
    poly([{ x: px, y: py }, { x: px + 11 * view.zoom + wave, y: py + 3 * view.zoom }, { x: px, y: py + 6.5 * view.zoom }],
      "#c0392b", "rgba(0,0,0,0.4)", 1);
    damageWash([At, Bt, Ct, Dt], 1 - b.hp / b.maxHp, det);
    // مدافعان گاریسون (0.45.0): نقطه‌های آبی روی سکو — شمار = طول گاریسون.
    const gar = Array.isArray(b.garrison) ? b.garrison : [];
    for (let i = 0; i < gar.length && i < 4; i++) {
      const gx = mc.x + (i - (gar.length - 1) / 2) * Math.max(7, 9 * view.zoom);
      ctx.beginPath();
      ctx.arc(gx, mc.y, Math.max(2.5, 3.5 * view.zoom), 0, Math.PI * 2);
      ctx.fillStyle = "#4d9de0";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.stroke();
    }
    return { topY: py };
  }

  // ستاد ۴×۴ (0.19.0): تالار سنگی بلند با سکوی کنگره‌دار، تالار مرکزی با
  // سقف شیروانی سرخ، درِ طاق‌دار، شکاف‌های دیده‌بانی و پرچم مواج.
  function drawKeep(b, def, tick, det) {
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.36);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.45)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.45)", 1);
    if (det) {
      for (const t of [0.25, 0.5, 0.75]) {
        line(lerp(D, Dt, t), lerp(C, Ct, t), "rgba(0,0,0,0.22)", 1);
        line(lerp(B, Bt, t), lerp(C, Ct, t), "rgba(255,255,255,0.10)", 1);
      }
    }
    // درِ طاق‌دار روی نمای راست
    const d0 = lerp(B, C, 0.4), d1 = lerp(B, C, 0.6);
    const dh = Math.min(16 * view.zoom, (C.y - Ct.y) * 0.55);
    poly([d0, d1, { x: d1.x, y: d1.y - dh }, { x: d0.x, y: d0.y - dh }], "#2e2620", null, 0);
    // دو شکاف دیده‌بانی روی نمای چپ (نیمه بالا)
    for (const t of [0.3, 0.7]) {
      const w0 = lerp(lerp(D, Dt, 0.6), lerp(C, Ct, 0.6), t);
      line({ x: w0.x, y: w0.y - 5 * view.zoom }, { x: w0.x, y: w0.y + 2 * view.zoom }, "rgba(10,10,12,0.85)", Math.max(2, 2.6 * view.zoom));
    }
    // سکوی بالا (سنگی روشن) + کنگره‌های دو یال جلو
    poly([At, Bt, Ct, Dt], shade(def.base, 14), "rgba(0,0,0,0.5)", 1);
    const toothH = Math.max(2.5, 6 * view.zoom);
    const teeth = (P, Q) => {
      for (let i = 0; i < 4; i++) {
        const t0 = 0.08 + i * 0.23, t1 = t0 + 0.13;
        const p0 = lerp(P, Q, t0), p1 = lerp(P, Q, t1);
        poly([p0, p1, { x: p1.x, y: p1.y - toothH }, { x: p0.x, y: p0.y - toothH }], shade(def.base, 14), "rgba(0,0,0,0.45)", 1);
      }
    };
    teeth(Dt, Ct);
    teeth(Bt, Ct);
    // تالار مرکزی روی سکو (مستطیل فرورفته از لوزی سکو)
    const q = (u, v) => lerp(lerp(At, Bt, u), lerp(Dt, Ct, u), v);
    const hA = q(0.3, 0.3), hB = q(0.7, 0.3), hC = q(0.7, 0.7), hD = q(0.3, 0.7);
    const hallH = 22 * view.zoom;
    const hAt = { x: hA.x, y: hA.y - hallH }, hBt = { x: hB.x, y: hB.y - hallH };
    const hCt = { x: hC.x, y: hC.y - hallH }, hDt = { x: hD.x, y: hD.y - hallH };
    poly([hD, hC, hCt, hDt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([hB, hC, hCt, hBt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    // سقف شیروانی سرخ تالار
    const roofH = Math.max(4, 10 * view.zoom);
    const L = mid(hAt, hDt), R = mid(hBt, hCt);
    const Lp = { x: L.x, y: L.y - roofH }, Rp = { x: R.x, y: R.y - roofH };
    poly([hAt, hDt, Lp], shade(def.top, -30), "rgba(0,0,0,0.4)", 1);
    poly([hBt, hCt, Rp], shade(def.top, -38), "rgba(0,0,0,0.4)", 1);
    poly([Lp, hAt, hBt, Rp], def.top, "rgba(0,0,0,0.35)", 1);
    poly([Lp, Rp, hCt, hDt], shade(def.top, -30), "rgba(0,0,0,0.35)", 1);
    line(Lp, Rp, "rgba(0,0,0,0.45)", 1);
    // پرچم بر خط‌الرأس
    const M = mid(Lp, Rp);
    const poleH = 18 * view.zoom;
    const py = M.y - poleH;
    line(M, { x: M.x, y: py }, "#3a2c1c", Math.max(1, 1.6 * view.zoom));
    const wave = Math.sin(tick * 0.35 + 1.3) * 2.4 * view.zoom;
    poly([{ x: M.x, y: py }, { x: M.x + 12 * view.zoom + wave, y: py + 3 * view.zoom }, { x: M.x, y: py + 7 * view.zoom }],
      "#c0392b", "rgba(0,0,0,0.4)", 1);
    damageWash([At, Bt, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: py };
  }

  function drawWoodcutter(b, def, det) {
    const gray = !def.prod; // palFor خاکستری prod را حذف می‌کند
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.28);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    // سقف یک‌شیب با خطوط تخته
    poly([At, Bt, Ct, Dt], def.top, "rgba(0,0,0,0.4)", 1);
    if (det) {
      line(lerp(At, Dt, 0.5), lerp(Bt, Ct, 0.5), "rgba(0,0,0,0.2)", 1);
      line(lerp(At, Bt, 0.5), lerp(Dt, Ct, 0.5), "rgba(0,0,0,0.2)", 1);
    }
    // توده کنده جلوی بنا (هرم ۳تایی: تهِ کنده با حلقه سال)
    const lr = Math.max(2, 4.6 * view.zoom);
    const gx = C.x, gy = C.y - 3 * view.zoom;
    const logs = [
      { x: gx - lr * 1.1, y: gy - lr * 0.6 },
      { x: gx + lr * 1.1, y: gy - lr * 0.6 },
      { x: gx, y: gy - lr * 2.2 },
    ];
    for (const L of logs) {
      ctx.beginPath();
      ctx.arc(L.x, L.y, lr, 0, Math.PI * 2);
      ctx.fillStyle = gray ? "#969696" : "#a87f4e";
      ctx.fill();
      ctx.strokeStyle = gray ? "#555555" : "#4e3a26";
      ctx.lineWidth = 1;
      ctx.stroke();
      if (det) {
        ctx.beginPath();
        ctx.arc(L.x, L.y, lr * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = gray ? "rgba(85,85,85,0.8)" : "rgba(78,58,38,0.8)";
        ctx.stroke();
      }
    }
    damageWash([At, Bt, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: At.y };
  }

  // معدن سنگ ۲×۲ (0.18.0): سکوی سنگی با گودال تیره، توده قلوه‌سنگ جلو و
  // دیرک چوبی (داربست)؛ خاکستری کامل وقتی بی‌کارگر است (مثل چوب‌بری).
  function drawQuarry(b, def, det) {
    const gray = !def.prod; // palFor خاکستری prod را حذف می‌کند
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.26);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    poly([At, Bt, Ct, Dt], def.top, "rgba(0,0,0,0.4)", 1);
    // گودال استخراج در مرکز سکو
    const pit = [lerp(At, Bt, 0.28), lerp(At, Bt, 0.72), lerp(Dt, Ct, 0.72), lerp(Dt, Ct, 0.28)];
    poly(pit, gray ? "#3a3a3a" : "#2e3237", "rgba(0,0,0,0.5)", 1);
    if (det) {
      line(lerp(At, Dt, 0.5), lerp(Bt, Ct, 0.5), "rgba(0,0,0,0.2)", 1);
    }
    // توده قلوه‌سنگ جلوی معدن (هرم ۳تایی خاکستری)
    const rr = Math.max(2, 4.2 * view.zoom);
    const gx = C.x, gy = C.y - 3 * view.zoom;
    const rocks = [
      { x: gx - rr * 1.1, y: gy - rr * 0.6 },
      { x: gx + rr * 1.1, y: gy - rr * 0.6 },
      { x: gx, y: gy - rr * 2.1 },
    ];
    for (const R of rocks) {
      ctx.beginPath();
      ctx.arc(R.x, R.y, rr, 0, Math.PI * 2);
      ctx.fillStyle = gray ? "#8a8a8a" : "#9aa2ab";
      ctx.fill();
      ctx.strokeStyle = gray ? "#555555" : "#4a5058";
      ctx.lineWidth = 1;
      ctx.stroke();
      if (det) {
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(R.x - rr * 0.3, R.y - rr * 0.3, rr * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // داربست چوبی بالای گودال
    if (det) {
      const p0 = lerp(At, Dt, 0.2), p1 = lerp(Bt, Ct, 0.2);
      const t0 = { x: p0.x, y: p0.y - 10 * view.zoom }, t1 = { x: p1.x, y: p1.y - 10 * view.zoom };
      line(p0, t0, gray ? "#5a5a5a" : "#6b4e2e", Math.max(1.5, 2.5 * view.zoom));
      line(p1, t1, gray ? "#5a5a5a" : "#6b4e2e", Math.max(1.5, 2.5 * view.zoom));
      line(t0, t1, gray ? "#5a5a5a" : "#6b4e2e", Math.max(1.5, 2 * view.zoom));
    }
    damageWash([At, Bt, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: At.y - 10 * view.zoom };
  }

  function drawFarm(b, def, det) {
    const gray = !def.prod; // palFor خاکستری prod را حذف می‌کند
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.16);
    // خاک
    poly([A, B, C, D], gray ? "#636363" : "#7a5a38", def.dark, Math.max(1.5, 2 * view.zoom));
    // شیارها
    for (const t of [0.25, 0.5, 0.75]) {
      line(lerp(A, D, t), lerp(B, C, t), "rgba(40,24,12,0.4)", 1);
    }
    // ردیف‌های محصول
    const rows = b.h * 2, cols = b.w * 2;
    if (view.zoom >= 0.5) {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
          const top = lerp(A, B, u), bot = lerp(D, C, u);
          const p = lerp(top, bot, v);
          ctx.beginPath();
          ctx.arc(p.x, p.y - 1.5 * view.zoom, Math.max(1.2, 2.1 * view.zoom), 0, Math.PI * 2);
          ctx.fillStyle = (i + j) % 2
            ? (gray ? "#7e8878" : "#7fbf4a")
            : (gray ? "#8b957f" : "#93d15c");
          ctx.fill();
        }
      }
    } else {
      for (const t of [0.3, 0.7]) {
        line(lerp(lerp(A, B, 0.08), lerp(D, C, 0.08), t), lerp(lerp(A, B, 0.92), lerp(D, C, 0.92), t), gray ? "#7e8878" : "#7fbf4a", Math.max(1.5, 2.4 * view.zoom));
      }
    }
    // تیرک‌های حصار در ۴ گوشه
    if (det) {
      for (const P of [A, B, C, D]) {
        line(P, { x: P.x, y: P.y - 8 * view.zoom }, gray ? "#4a4a4a" : "#4e3a26", Math.max(1.5, 2.2 * view.zoom));
        ctx.beginPath();
        ctx.arc(P.x, P.y - 8 * view.zoom, Math.max(1.2, 1.8 * view.zoom), 0, Math.PI * 2);
        ctx.fillStyle = gray ? "#5c5c5c" : "#6b4f30";
        ctx.fill();
      }
    }
    damageWash([A, B, C, D], 1 - b.hp / b.maxHp, det);
    return { topY: A.y };
  }

  // مزرعه گندم ۳×۲ (0.20.0): مثل مزرعه ولی محصول طلایی (خوشه گندم).
  function drawWheatFarm(b, def, det) {
    const gray = !def.prod;
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.16);
    poly([A, B, C, D], gray ? "#636363" : "#7a5a38", def.dark, Math.max(1.5, 2 * view.zoom));
    for (const t of [0.25, 0.5, 0.75]) {
      line(lerp(A, D, t), lerp(B, C, t), "rgba(40,24,12,0.4)", 1);
    }
    // خوشه‌های طلایی (بلندتر از محصول سبز مزرعه تا تفکیک شود)
    const rows = b.h * 2, cols = b.w * 2;
    if (view.zoom >= 0.5) {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
          const top = lerp(A, B, u), bot = lerp(D, C, u);
          const p = lerp(top, bot, v);
          line({ x: p.x, y: p.y }, { x: p.x, y: p.y - 4.5 * view.zoom },
            gray ? "#7e8878" : "#8a6d2a", Math.max(1.2, 1.8 * view.zoom));
          ctx.beginPath();
          ctx.arc(p.x, p.y - 5.2 * view.zoom, Math.max(1.2, 2 * view.zoom), 0, Math.PI * 2);
          ctx.fillStyle = (i + j) % 2
            ? (gray ? "#7e8878" : "#d8a93c")
            : (gray ? "#8b957f" : "#e8c25e");
          ctx.fill();
        }
      }
    } else {
      for (const t of [0.3, 0.7]) {
        line(lerp(lerp(A, B, 0.08), lerp(D, C, 0.08), t), lerp(lerp(A, B, 0.92), lerp(D, C, 0.92), t), gray ? "#7e8878" : "#d8a93c", Math.max(1.5, 2.4 * view.zoom));
      }
    }
    if (det) {
      for (const P of [A, B, C, D]) {
        line(P, { x: P.x, y: P.y - 8 * view.zoom }, gray ? "#4a4a4a" : "#4e3a26", Math.max(1.5, 2.2 * view.zoom));
        ctx.beginPath();
        ctx.arc(P.x, P.y - 8 * view.zoom, Math.max(1.2, 1.8 * view.zoom), 0, Math.PI * 2);
        ctx.fillStyle = gray ? "#5c5c5c" : "#6b4f30";
        ctx.fill();
      }
    }
    damageWash([A, B, C, D], 1 - b.hp / b.maxHp, det);
    return { topY: A.y };
  }

  // نانوایی ۲×۲ (0.20.0): خانه گلی با سقف چوبی، دودکش با دود مواج (فقط وقتی
  // واقعاً می‌پزد: staffed و نه starved) و دهانه تنور با تابش نارنجی فعال.
  function drawBakery(b, def, tick, det) {
    const gray = !def.prod; // بی‌کارگر
    const active = !gray && !b.starved; // می‌پزد (رندری: از پرچم واقعی منطق)
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.28);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    // دهانه تنور روی نمای راست (تابش فعال/خاموش)
    const d0 = lerp(B, C, 0.36), d1 = lerp(B, C, 0.64);
    const dh = Math.min(9 * view.zoom, (C.y - Ct.y) * 0.5);
    poly([d0, d1, { x: d1.x, y: d1.y - dh }, { x: d0.x, y: d0.y - dh }],
      active ? "#3a1f0e" : "#2e2620", null, 0);
    if (active && det) {
      ctx.beginPath();
      ctx.arc((d0.x + d1.x) / 2, d1.y - dh * 0.4, Math.max(1.5, 2.6 * view.zoom), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,140,40,0.85)";
      ctx.fill();
    }
    // سقف شیروانی چوبی
    const roofH = Math.max(5, 12 * view.zoom);
    const L = mid(At, Dt), R = mid(Bt, Ct);
    const Lp = { x: L.x, y: L.y - roofH }, Rp = { x: R.x, y: R.y - roofH };
    poly([At, Dt, Lp], shade(def.top, -18), "rgba(0,0,0,0.4)", 1);
    poly([Bt, Ct, Rp], shade(def.top, -30), "rgba(0,0,0,0.4)", 1);
    poly([Lp, At, Bt, Rp], def.top, "rgba(0,0,0,0.35)", 1);
    poly([Lp, Rp, Ct, Dt], shade(def.top, -22), "rgba(0,0,0,0.35)", 1);
    line(Lp, Rp, "rgba(0,0,0,0.45)", 1);
    // دودکش روی شیب سایه + دود مواج
    const chB = lerp(Lp, Rp, 0.7);
    const chT = { x: chB.x, y: chB.y - 9 * view.zoom };
    const chW = Math.max(2, 4 * view.zoom);
    poly([{ x: chB.x - chW / 2, y: chB.y }, { x: chB.x + chW / 2, y: chB.y },
      { x: chB.x + chW / 2, y: chT.y }, { x: chB.x - chW / 2, y: chT.y }],
      gray ? "#5c5c5c" : "#6e5c40", "rgba(0,0,0,0.4)", 1);
    let topY = Math.min(At.y, Bt.y) - roofH;
    if (active) {
      for (let i = 0; i < 3; i++) {
        const ph = ((tick * 0.5 + i * 9) % 27) / 27; // ۰→۱ بالا‌رونده
        const sw = Math.sin(tick * 0.2 + i * 2.1) * 3 * view.zoom;
        ctx.beginPath();
        ctx.arc(chT.x + sw, chT.y - ph * 16 * view.zoom, (1.5 + ph * 3) * view.zoom, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,220,220,${0.5 - ph * 0.35})`;
        ctx.fill();
      }
      topY = chT.y - 16 * view.zoom;
    }
    damageWash([Lp, Rp, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY };
  }

  // آسیاب ۲×۲ (0.38.0): برج سنگی + کلاهک چوبی + ۴ پره چرخان؛ پره‌ها فقط
  // وقتی می‌چرخند که واقعاً کار می‌کند (staffed و نه starved) — زاویه از
  // tick می‌آید پس قطعی است (توقف بازی = توقف پره).
  function drawMill(b, def, tick, det) {
    const gray = !def.prod; // بی‌کارگر
    const active = !gray && !b.starved; // می‌سابد (رندری: از پرچم واقعی منطق)
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.28);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    // رج‌های سنگی افقی روی نمای راست
    if (det) {
      for (const v of [0.33, 0.66]) {
        line(lerp(B, Bt, v), lerp(C, Ct, v), "rgba(0,0,0,0.25)", 1);
      }
    }
    // درِ چوبی روی نمای راست (پایین) + پنجره کوچک روی نمای چپ
    const d0 = lerp(C, B, 0.4), d1 = lerp(C, B, 0.6);
    const dh = Math.min(8 * view.zoom, (C.y - Ct.y) * 0.4);
    poly([d0, d1, { x: d1.x, y: d1.y - dh }, { x: d0.x, y: d0.y - dh }],
      gray ? "#3a3a3a" : "#4e3a26", null, 0);
    const w0 = lerp(D, Dt, 0.55);
    ctx.fillStyle = gray ? "#3a3a3a" : "#2e3a4a";
    ctx.fillRect(w0.x - 2 * view.zoom, w0.y - 2 * view.zoom, 4 * view.zoom, 4 * view.zoom);
    // کلاهک چوبی مخروطی
    const apex = { x: (At.x + Bt.x + Ct.x + Dt.x) / 4, y: Math.min(At.y, Bt.y) - 10 * view.zoom };
    poly([At, Dt, apex], shade(def.top, -18), "rgba(0,0,0,0.4)", 1);
    poly([Bt, Ct, apex], shade(def.top, -30), "rgba(0,0,0,0.4)", 1);
    // توپی پره روی نمای راست (بالا) + ۴ پره مشبک در صفحه نمایش
    const hub = lerp(lerp(B, C, 0.5), lerp(Bt, Ct, 0.5), 0.72);
    const sailLen = 30 * view.zoom;
    const baseAng = active ? tick * 0.06 : 0.5;
    for (let k = 0; k < 4; k++) {
      const ang = baseAng + k * Math.PI / 2;
      const tip = { x: hub.x + Math.cos(ang) * sailLen, y: hub.y + Math.sin(ang) * sailLen };
      line(hub, tip, gray ? "#4a4a4a" : "#4e3a26", Math.max(1.5, 2.5 * view.zoom));
      const px = -Math.sin(ang), py = Math.cos(ang);
      for (const f of [0.4, 0.6, 0.8]) {
        const pf = lerp(hub, tip, f);
        const w = 4.5 * view.zoom * f;
        line({ x: pf.x - px * w, y: pf.y - py * w }, { x: pf.x + px * w, y: pf.y + py * w },
          gray ? "#6a6a6a" : "#d9c89e", Math.max(1, 1.6 * view.zoom));
      }
    }
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, Math.max(2, 3 * view.zoom), 0, Math.PI * 2);
    ctx.fillStyle = gray ? "#4a4a4a" : "#6e5c40";
    ctx.fill();
    let topY = Math.min(At.y, Bt.y, apex.y, hub.y - sailLen);
    damageWash([At, Bt, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY };
  };
  // معدن آهن ۲×۲ (0.44.0): سکوی تیره با گودال، قلوه‌های زنگ‌زده (نقطه
  // نارنجی به‌جای برق سفید معدن سنگ) و دو دیرک چوبی بدون تیر افقی تا از
  // داربست معدن سنگ جدا شود. خاکستری کامل وقتی بی‌کارگر است.
  function drawIronmine(b, def, det) {
    const gray = !def.prod;
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.26);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    poly([At, Bt, Ct, Dt], def.top, "rgba(0,0,0,0.4)", 1);
    const pit = [lerp(At, Bt, 0.28), lerp(At, Bt, 0.72), lerp(Dt, Ct, 0.72), lerp(Dt, Ct, 0.28)];
    poly(pit, gray ? "#3a3a3a" : "#33291f", "rgba(0,0,0,0.5)", 1);
    const rr = Math.max(2, 4.2 * view.zoom);
    const gx = C.x, gy = C.y - 3 * view.zoom;
    const rocks = [
      { x: gx - rr * 1.1, y: gy - rr * 0.6 },
      { x: gx + rr * 1.1, y: gy - rr * 0.6 },
      { x: gx, y: gy - rr * 2.1 },
    ];
    for (const R of rocks) {
      ctx.beginPath();
      ctx.arc(R.x, R.y, rr, 0, Math.PI * 2);
      ctx.fillStyle = gray ? "#8a8a8a" : "#7d7468";
      ctx.fill();
      ctx.strokeStyle = gray ? "#555555" : "#453d33";
      ctx.lineWidth = 1;
      ctx.stroke();
      if (det) {
        // رگه زنگ: نقطه نارنجی (نشان آهن در برابر برق سفید سنگ)
        ctx.fillStyle = gray ? "rgba(255,255,255,0.3)" : "rgba(200,110,50,0.85)";
        ctx.beginPath();
        ctx.arc(R.x - rr * 0.3, R.y - rr * 0.3, rr * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // دو دیرک بدون تیر (قاب ناتمام — فرق با داربست معدن سنگ)
    if (det) {
      const p0 = lerp(At, Dt, 0.2), p1 = lerp(Bt, Ct, 0.2);
      line(p0, { x: p0.x, y: p0.y - 10 * view.zoom }, gray ? "#5a5a5a" : "#6b4e2e", Math.max(1.5, 2.5 * view.zoom));
      line(p1, { x: p1.x, y: p1.y - 10 * view.zoom }, gray ? "#5a5a5a" : "#6b4e2e", Math.max(1.5, 2.5 * view.zoom));
    }
    damageWash([At, Bt, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: At.y - 10 * view.zoom };
  }

  // زرادخانه ۲×۲ (0.44.0): خانه سنگی با سقف خاکستری و نشان شمشیرهای متقاطع
  // نقره‌ای روی نما (آینه نشان سربازخانه ولی تک‌تیغه و کوچک‌تر).
  function drawArmoury(b, def, det) {
    const gray = !def.prod;
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.28);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    const roofH = Math.max(5, 12 * view.zoom);
    const L = mid(At, Dt), R = mid(Bt, Ct);
    const Lp = { x: L.x, y: L.y - roofH }, Rp = { x: R.x, y: R.y - roofH };
    poly([At, Dt, Lp], shade(def.top, -18), "rgba(0,0,0,0.4)", 1);
    poly([Bt, Ct, Rp], shade(def.top, -30), "rgba(0,0,0,0.4)", 1);
    poly([Lp, At, Bt, Rp], def.top, "rgba(0,0,0,0.35)", 1);
    poly([Lp, Rp, Ct, Dt], shade(def.top, -22), "rgba(0,0,0,0.35)", 1);
    line(Lp, Rp, "rgba(0,0,0,0.45)", 1);
    if (det) {
      // شمشیرهای متقاطع روی نمای راست
      const s0 = lerp(lerp(B, Bt, 0.62), lerp(C, Ct, 0.62), 0.34);
      const s1 = lerp(lerp(B, Bt, 0.30), lerp(C, Ct, 0.30), 0.66);
      const t0 = lerp(lerp(B, Bt, 0.62), lerp(C, Ct, 0.62), 0.66);
      const t1 = lerp(lerp(B, Bt, 0.30), lerp(C, Ct, 0.30), 0.34);
      const sw = Math.max(1.6, 2.4 * view.zoom);
      line(s0, s1, gray ? "#6a6a6a" : "#d7dde3", sw);
      line(t0, t1, gray ? "#6a6a6a" : "#d7dde3", sw);
    }
    damageWash([Lp, Rp, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: Math.min(At.y, Bt.y) - roofH };
  }

  // کمان‌سازی ۲×۲ (0.44.0): کلبه چوبی با سقف شیروانی و نشان کمان (قوس +
  // زه) روی نما تا از زرادخانه سنگی جدا شود.
  function drawFletcher(b, def, det) {
    const gray = !def.prod;
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.28);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    if (det) {
      line(lerp(At, Dt, 0.5), lerp(Bt, Ct, 0.5), "rgba(0,0,0,0.2)", 1);
    }
    const roofH = Math.max(5, 12 * view.zoom);
    const L = mid(At, Dt), R = mid(Bt, Ct);
    const Lp = { x: L.x, y: L.y - roofH }, Rp = { x: R.x, y: R.y - roofH };
    poly([At, Dt, Lp], shade(def.top, -18), "rgba(0,0,0,0.4)", 1);
    poly([Bt, Ct, Rp], shade(def.top, -30), "rgba(0,0,0,0.4)", 1);
    poly([Lp, At, Bt, Rp], def.top, "rgba(0,0,0,0.35)", 1);
    poly([Lp, Rp, Ct, Dt], shade(def.top, -22), "rgba(0,0,0,0.35)", 1);
    line(Lp, Rp, "rgba(0,0,0,0.45)", 1);
    if (det) {
      // نشان کمان روی نمای راست: قوس + زه عمودی
      const c0 = lerp(lerp(B, Bt, 0.55), lerp(C, Ct, 0.55), 0.5);
      const cr = Math.max(2.5, 5 * view.zoom);
      ctx.beginPath();
      ctx.arc(c0.x, c0.y, cr, -1.1, 1.1);
      ctx.strokeStyle = gray ? "#6a6a6a" : "#d9c89e";
      ctx.lineWidth = Math.max(1.2, 1.8 * view.zoom);
      ctx.stroke();
      const sy1 = c0.y - cr * 0.89, sy2 = c0.y + cr * 0.89;
      line({ x: c0.x + cr * 0.45, y: sy1 }, { x: c0.x + cr * 0.45, y: sy2 },
        gray ? "#5a5a5a" : "#e8e8e8", 1);
    }
    damageWash([Lp, Rp, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: Math.min(At.y, Bt.y) - roofH };
  }
  // مزرعه رازک ۳×۲ (0.21.0): خاک + داربست (تیرک‌ها و میله افقی) + پیچک سبز
  // بالا‌رونده؛ از مزرعه سبز (نقطه‌ای) و گندم (طلایی) تفکیک می‌شود.
  function drawHopsFarm(b, def, det) {
    const gray = !def.prod;
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.16);
    poly([A, B, C, D], gray ? "#636363" : "#5d4a2c", def.dark, Math.max(1.5, 2 * view.zoom));
    const poleH = 12 * view.zoom;
    const cols = 4, rows = 3;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
        const top = lerp(A, B, u), bot = lerp(D, C, u);
        const p = lerp(top, bot, v);
        // تیرک داربست
        line(p, { x: p.x, y: p.y - poleH }, gray ? "#4a4a4a" : "#4e3a26", Math.max(1.5, 2 * view.zoom));
        // پیچک: دو لپه سبز دور تیرک
        if (view.zoom >= 0.5) {
          for (const [du, dvh] of [[-0.16, 0.45], [0.16, 0.7]]) {
            const w = lerp(A, B, u + du), e2 = lerp(D, C, u + du);
            const q = lerp(w, e2, v);
            ctx.beginPath();
            ctx.arc(q.x, q.y - poleH * dvh, Math.max(1.2, 2 * view.zoom), 0, Math.PI * 2);
            ctx.fillStyle = gray ? "#7e8878" : ((i + j) % 2 ? "#3f7a34" : "#55a047");
            ctx.fill();
          }
        }
      }
    }
    // میله‌های افقی داربست (دو ردیف)
    if (det) {
      for (const v of [0.3, 0.7]) {
        const L = lerp(lerp(A, D, v), { x: lerp(A, D, v).x, y: lerp(A, D, v).y - poleH * 0.8 });
        const R = lerp(lerp(B, C, v), { x: lerp(B, C, v).x, y: lerp(B, C, v).y - poleH * 0.8 });
        line(L, R, gray ? "#4a4a4a" : "#5d4a30", Math.max(1, 1.6 * view.zoom));
      }
    }
    damageWash([A, B, C, D], 1 - b.hp / b.maxHp, det);
    return { topY: A.y - poleH };
  }

  // آبجوسازی ۲×۲ (0.21.0): خانه + بشکه چوبی جلو + بخار فعال (حین تخمیر).
  function drawBrewery(b, def, tick, det) {
    const gray = !def.prod;
    const active = !gray && !b.starved;
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.28);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    // سقف شیروانی
    const roofH = Math.max(5, 12 * view.zoom);
    const L = mid(At, Dt), R = mid(Bt, Ct);
    const Lp = { x: L.x, y: L.y - roofH }, Rp = { x: R.x, y: R.y - roofH };
    poly([At, Dt, Lp], shade(def.top, -18), "rgba(0,0,0,0.4)", 1);
    poly([Bt, Ct, Rp], shade(def.top, -30), "rgba(0,0,0,0.4)", 1);
    poly([Lp, At, Bt, Rp], def.top, "rgba(0,0,0,0.35)", 1);
    poly([Lp, Rp, Ct, Dt], shade(def.top, -22), "rgba(0,0,0,0.35)", 1);
    line(Lp, Rp, "rgba(0,0,0,0.45)", 1);
    // بشکه جلو (دایره با تسمه)
    const br = Math.max(3, 6.5 * view.zoom);
    const bx = C.x, by = C.y - br - 1 * view.zoom;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = gray ? "#7a7a7a" : "#8a6238";
    ctx.fill();
    ctx.strokeStyle = gray ? "#4a4a4a" : "#3d2c18";
    ctx.lineWidth = Math.max(1, 1.6 * view.zoom);
    ctx.stroke();
    if (det) {
      ctx.beginPath();
      ctx.arc(bx, by, br * 0.62, 0, Math.PI * 2);
      ctx.strokeStyle = gray ? "rgba(74,74,74,0.8)" : "rgba(61,44,24,0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();
      line({ x: bx - br, y: by }, { x: bx + br, y: by }, gray ? "#4a4a4a" : "#3d2c18", 1);
    }
    // بخار تخمیر (فقط فعال)
    let topY = Math.min(At.y, Bt.y) - roofH;
    if (active) {
      for (let i = 0; i < 2; i++) {
        const ph = ((tick * 0.4 + i * 13) % 26) / 26;
        const sw = Math.sin(tick * 0.18 + i * 2.6) * 2.5 * view.zoom;
        ctx.beginPath();
        ctx.arc(bx + sw, by - br - ph * 12 * view.zoom, (1.2 + ph * 2.4) * view.zoom, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230,230,230,${0.45 - ph * 0.3})`;
        ctx.fill();
      }
      topY = by - br - 12 * view.zoom;
    }
    damageWash([Lp, Rp, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY };
  }

  // میخانه ۲×۲ (0.21.0): خانه بلندتر + تابلوی آویز + پنجره‌های گرم وقتی سرو
  // می‌کند (served) و سرد وقتی آبجو ندارد — بازخورد مستقیم اثر محبوبیت.
  function drawInn(b, def, tick, det) {
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.3);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.4)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.4)", 1);
    // پنجره‌ها: گرم (سرو) یا سرد
    const served = !!b.served;
    for (const t of [0.3, 0.7]) {
      const w0 = lerp(lerp(D, Dt, 0.55), lerp(C, Ct, 0.55), t);
      line({ x: w0.x, y: w0.y - 4 * view.zoom }, { x: w0.x, y: w0.y + 2 * view.zoom },
        served ? "rgba(255,190,90,0.95)" : "rgba(20,24,30,0.9)", Math.max(2, 3 * view.zoom));
    }
    // سقف شیروانی ارغوانی
    const roofH = Math.max(5, 13 * view.zoom);
    const L = mid(At, Dt), R = mid(Bt, Ct);
    const Lp = { x: L.x, y: L.y - roofH }, Rp = { x: R.x, y: R.y - roofH };
    poly([At, Dt, Lp], shade(def.top, -14), "rgba(0,0,0,0.4)", 1);
    poly([Bt, Ct, Rp], shade(def.top, -26), "rgba(0,0,0,0.4)", 1);
    poly([Lp, At, Bt, Rp], def.top, "rgba(0,0,0,0.35)", 1);
    poly([Lp, Rp, Ct, Dt], shade(def.top, -20), "rgba(0,0,0,0.35)", 1);
    line(Lp, Rp, "rgba(0,0,0,0.45)", 1);
    // تیر تابلو + لیوان آویز (تاب ملایم وقتی سرو می‌کند)
    const post = lerp(B, C, 0.5);
    const postT = { x: post.x, y: post.y - 14 * view.zoom };
    line(post, postT, "#3a2c1c", Math.max(1.5, 2.2 * view.zoom));
    const armL = 9 * view.zoom;
    const armEnd = { x: postT.x + armL, y: postT.y };
    line(postT, armEnd, "#3a2c1c", Math.max(1.5, 2 * view.zoom));
    const swing = served ? Math.sin(tick * 0.25) * 1.6 * view.zoom : 0;
    const signT = { x: armEnd.x + swing * 0.3, y: armEnd.y };
    const signB = { x: armEnd.x + swing, y: armEnd.y + 8 * view.zoom };
    const signW = Math.max(2.5, 5 * view.zoom);
    poly([{ x: signT.x - signW / 2, y: signT.y }, { x: signT.x + signW / 2, y: signT.y },
      { x: signB.x + signW / 2, y: signB.y }, { x: signB.x - signW / 2, y: signB.y }],
      served ? "#c98f2e" : "#5c5c5c", "rgba(0,0,0,0.5)", 1);
    damageWash([Lp, Rp, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: Math.min(At.y, Bt.y) - roofH };
  }
  // دیوار سنگی ۱×۱: بلوک کوتاه با بند سنگی؛ بازوهای خط‌الرأس به همسایه‌های
  // دیواری ۴جهته وصل می‌شوند تا زنجیره یک باروی پیوسته خوانده شود.
  // کنگره فقط روی یال‌های جلوییِ باز (بدون همسایه) می‌نشیند.
  // خانواده بارو: دیوار و دروازه به هم وصل می‌شوند (خط‌الرأس پیوسته).
  function isRampartAt(state, c, r) {
    for (const o of state.buildings) {
      if (o.destroyed || (o.type !== "wall" && o.type !== "gate")) continue;
      if (c >= o.c && c < o.c + o.w && r >= o.r && r < o.r + o.h) return true;
    }
    return false;
  }
  const isWallAt = isRampartAt;

  function drawWall(b, state, def, det) {
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.22);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.45)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.45)", 1);
    poly([At, Bt, Ct, Dt], def.top, "rgba(0,0,0,0.45)", 1);
    if (det) {
      // بند سنگی افقی روی هر دو نما
      line(lerp(D, Dt, 0.5), lerp(C, Ct, 0.5), "rgba(0,0,0,0.25)", 1);
      line(lerp(B, Bt, 0.5), lerp(C, Ct, 0.5), "rgba(0,0,0,0.25)", 1);
    }
    const mc = mid(At, Ct);
    const nE = isWallAt(state, b.c + 1, b.r);
    const nW = isWallAt(state, b.c - 1, b.r);
    const nS = isWallAt(state, b.c, b.r + 1);
    const nN = isWallAt(state, b.c, b.r - 1);
    // بازوی اتصال: شیار تیره + مغز روشن تا زنجیره یک باروی پیوسته خوانده شود
    const ridgeW = Math.max(3, 7 * view.zoom);
    const ridge = (Q) => {
      line(mc, Q, "rgba(0,0,0,0.38)", ridgeW);
      line(mc, Q, shade(def.top, -8), ridgeW * 0.55);
    };
    if (nE) ridge(mid(Bt, Ct));
    if (nW) ridge(mid(At, Dt));
    if (nS) ridge(mid(Ct, Dt));
    if (nN) ridge(mid(At, Bt));
    // کنگره روی یال‌های جلویی باز (پرتر و تیره‌تر از سقف تا خوانا باشد)
    const toothH = Math.max(2.5, 7 * view.zoom);
    const teeth = (P, Q) => {
      for (let i = 0; i < 2; i++) {
        const t0 = 0.14 + i * 0.44, t1 = t0 + 0.26;
        const p0 = lerp(P, Q, t0), p1 = lerp(P, Q, t1);
        poly([p0, p1, { x: p1.x, y: p1.y - toothH }, { x: p0.x, y: p0.y - toothH }],
          shade(def.top, -18), "rgba(0,0,0,0.55)", 1.2);
      }
    };
    if (!nE) teeth(Bt, Ct);
    if (!nS) teeth(Dt, Ct);
    damageWash([At, Bt, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: At.y - toothH };
  }

  // دروازه ۱×۱: بدنه سنگی با دهانه تاریک و نعل چوبی روی هر دو نمای جلو
  // (گذرگاه بدون جهت — ساده‌سازی ثبت‌شده)؛ سقف به باروی مجاور وصل می‌شود.
  // بسته (0.13.0): به‌جای دهانه تاریک، درِ چوبی با تسمه آهنی.
  function drawGate(b, state, def, det) {
    const closed = b.open === false;
    const A = cs(b.c, b.r);
    const B = cs(b.c + b.w, b.r);
    const C = cs(b.c + b.w, b.r + b.h);
    const D = cs(b.c, b.r + b.h);
    groundShadow(A, B, C, D, 0.22);
    const dy = -def.height * view.zoom;
    const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
    const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
    poly([D, C, Ct, Dt], def.dark, "rgba(0,0,0,0.45)", 1);
    poly([B, C, Ct, Bt], shade(def.base, -22), "rgba(0,0,0,0.45)", 1);
    const opening = (P, Q, Pt, Qt) => {
      const o0 = lerp(P, Q, 0.18), o1 = lerp(P, Q, 0.82);
      const o0t = lerp(Pt, Qt, 0.18), o1t = lerp(Pt, Qt, 0.82);
      const l0 = lerp(o0, o0t, 0.58), l1 = lerp(o1, o1t, 0.58);
      // قاب سنگی روشن دور دهانه تا طاق خوانا بماند
      const f0 = lerp(P, Q, 0.12), f1 = lerp(P, Q, 0.88);
      const f0t = lerp(Pt, Qt, 0.12), f1t = lerp(Pt, Qt, 0.88);
      const g0 = lerp(f0, f0t, 0.68), g1 = lerp(f1, f1t, 0.68);
      poly([f0, f1, g1, g0], shade(def.top, -30), null, 0);
      if (closed) {
        // درِ بسته: تخته چوبی با شیار عمودی و دو تسمه آهنی افقی
        const d0t = lerp(o0, o0t, 0.95), d1t = lerp(o1, o1t, 0.95);
        poly([o0, o1, d1t, d0t], "#4a3520", "rgba(0,0,0,0.55)", 1);
        for (let i = 1; i < 4; i++) {
          const t = i / 4;
          line(lerp(o0, o1, t), lerp(d0t, d1t, t), "rgba(0,0,0,0.5)", Math.max(1, 1.8 * view.zoom));
        }
        line(lerp(o0, d0t, 0.3), lerp(o1, d1t, 0.3), "#2b2b2b", Math.max(2, 3.5 * view.zoom));
        line(lerp(o0, d0t, 0.75), lerp(o1, d1t, 0.75), "#2b2b2b", Math.max(2, 3.5 * view.zoom));
        line(l0, l1, "#4a3520", Math.max(3, 5.5 * view.zoom));
        return;
      }
      poly([o0, o1, l1, l0], "#0d0a06", null, 0);
      line(l0, l1, "#4a3520", Math.max(3, 5.5 * view.zoom));
      if (det) {
        line(o0, l0, "#7a5c38", Math.max(1.5, 2.5 * view.zoom));
        line(o1, l1, "#7a5c38", Math.max(1.5, 2.5 * view.zoom));
      }
    };
    opening(B, C, Bt, Ct);
    opening(D, C, Dt, Ct);
    poly([At, Bt, Ct, Dt], def.top, "rgba(0,0,0,0.45)", 1);
    const mc = mid(At, Ct);
    const ridgeW = Math.max(3, 7 * view.zoom);
    const ridge = (Q) => {
      line(mc, Q, "rgba(0,0,0,0.38)", ridgeW);
      line(mc, Q, shade(def.top, -8), ridgeW * 0.55);
    };
    if (isRampartAt(state, b.c + 1, b.r)) ridge(mid(Bt, Ct));
    if (isRampartAt(state, b.c - 1, b.r)) ridge(mid(At, Dt));
    if (isRampartAt(state, b.c, b.r + 1)) ridge(mid(Ct, Dt));
    if (isRampartAt(state, b.c, b.r - 1)) ridge(mid(At, Bt));
    damageWash([At, Bt, Ct, Dt], 1 - b.hp / b.maxHp, det);
    return { topY: At.y };
  }

  function palFor(b) {
    const def = CONFIG.BUILDINGS[b.type];
    if (def.prod && b.staffed === false) {
      return { base: "#6a6a6a", dark: "#454545", top: "#9a9a9a", height: def.height };
    }
    return def;
  }

  function drawBlock(b, tick, det, state) {
    const def = palFor(b);
    const real = CONFIG.BUILDINGS[b.type];
    let topY = 0;
    // نمای تخت: فقط ردپای رنگی روی زمین (بدون دیوار/سقف) تا پشت بنا دیده شود.
    if (view.flat) {
      const A = cs(b.c, b.r);
      const B = cs(b.c + b.w, b.r);
      const C = cs(b.c + b.w, b.r + b.h);
      const D = cs(b.c, b.r + b.h);
      poly([A, B, C, D], def.top, "rgba(0,0,0,0.55)", Math.max(1.2, 1.6 * view.zoom));
      damageWash([A, B, C, D], 1 - b.hp / b.maxHp, det);
      topY = A.y;
    } else if (b.type === "tower") topY = drawTower(b, def, tick, det).topY;
    else if (b.type === "keep") topY = drawKeep(b, def, tick, det).topY;
    else if (b.type === "woodcutter") topY = drawWoodcutter(b, def, det).topY;
    else if (b.type === "quarry") topY = drawQuarry(b, def, det).topY;
    else if (b.type === "farm") topY = drawFarm(b, def, det).topY;
    else if (b.type === "wheatfarm") topY = drawWheatFarm(b, def, det).topY;
    else if (b.type === "bakery") topY = drawBakery(b, def, tick, det).topY;
    else if (b.type === "mill") topY = drawMill(b, def, tick, det).topY;
    else if (b.type === "ironmine") topY = drawIronmine(b, def, det).topY;
    else if (b.type === "armoury") topY = drawArmoury(b, def, det).topY;
    else if (b.type === "fletcher") topY = drawFletcher(b, def, det).topY;
    else if (b.type === "hopsfarm") topY = drawHopsFarm(b, def, det).topY;
    else if (b.type === "brewery") topY = drawBrewery(b, def, tick, det).topY;
    else if (b.type === "barracks") topY = drawBarracks(b, def, det).topY;
    else if (b.type === "stockpile") topY = drawStockpile(b, def, det).topY;
    else if (b.type === "granary") topY = drawGranary(b, def, det).topY;
    else if (b.type === "market") topY = drawMarket(b, def, det).topY;
    else if (b.type === "inn") topY = drawInn(b, def, tick, det).topY;
    else if (b.type === "wall") topY = drawWall(b, state, def, det).topY;
    else if (b.type === "gate") topY = drawGate(b, state, def, det).topY;
    else topY = drawHut(b, def, det).topY;
    // داربست ساخت‌وساز (0.39.0): تیرک‌های چوبی دور ردپا + تخته افقی بالا —
    // نیمه‌کاره در یک نگاه از تکمیل‌شده جدا می‌شود (در نمای تخت فقط ردپا).
    if ((b.buildLeft || 0) > 0 && !view.flat) {
      const A = cs(b.c, b.r);
      const B = cs(b.c + b.w, b.r);
      const C = cs(b.c + b.w, b.r + b.h);
      const D = cs(b.c, b.r + b.h);
      const pts = [A, B, C, D];
      const top = topY - 3 * view.zoom;
      ctx.save();
      ctx.strokeStyle = "#6e5c40";
      ctx.lineWidth = Math.max(1.5, 2.2 * view.zoom);
      for (const p of pts) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, top);
        ctx.stroke();
      }
      ctx.lineWidth = Math.max(1, 1.6 * view.zoom);
      ctx.beginPath();
      ctx.moveTo(A.x, top);
      ctx.lineTo(B.x, top);
      ctx.lineTo(C.x, top);
      ctx.lineTo(D.x, top);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    // حباب «!» برای تولیدکننده بی‌کارگر (فقط در زوم کافی)
    // نکته: def خاکستری prod ندارد، پس از تعریف اصلی چک می‌کنیم.
    if (real.prod && b.staffed === false && view.zoom >= 0.5) {
      const r = Math.max(6, 9 * view.zoom);
      const cx = (cs(b.c, b.r).x + cs(b.c + b.w, b.r + b.h).x) / 2;
      const cy = topY - r - 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#f5f0dc";
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#333";
      ctx.font = `bold ${Math.round(r * 1.2)}px Tahoma`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", cx, cy + 1);
    }
  }

  // ---------- واحدها ----------

  // حافظه بصری واحد: جهت + مسافت راه‌رفته (فقط رندر؛ منطق دست نمی‌خورد)
  function faceEntry(u) {
    const f = face.get(u.id);
    const dx = f ? u.x - f.x : 0;
    const dr = f ? u.r - f.r : 0;
    const dist = Math.hypot(dx, dr);
    let ang = f ? f.ang : Math.PI / 2;
    let walkD = f ? f.walkD : 0;
    if (dist > 0.004) {
      const sx = dx - dr, sy = (dx + dr) * 0.5;
      ang = Math.atan2(sy, sx);
      walkD += dist;
    }
    const e = { x: u.x, r: u.r, ang, walkD, moving: dist > 0.004, type: u.type };
    face.set(u.id, e);
    return e;
  }

  // ژست حمله وقتی مخالف واقعی در برد است (همان قاعده هدف‌گیری نبرد)
  function unitAttacking(state, u, def) {
    const reach = def.range + 0.6;
    for (const e of state.units) {
      if (e.side === u.side) continue;
      if (Math.hypot(u.x - e.x, u.r - e.r) <= reach) return true;
    }
    if (u.side === "enemy") {
      for (const b of state.buildings) {
        const d = Math.hypot(u.x - (b.c + b.w / 2), u.r - (b.r + b.h / 2)) - (b.w + b.h) / 4;
        if (d <= reach) return true;
      }
    }
    return false;
  }

  // اجساد + پاف گردوخاک مرگ (کاملاً رندری: از حذف واحدها بین فریم‌ها ساخته می‌شوند)
  const corpses = []; // {x, r, type, t0}
  const puffs = [];   // {x, r, t0}
  function updateRemains(state) {
    const alive = new Set(state.units.map((u) => u.id));
    for (const [id, f] of face) {
      if (!alive.has(id)) {
        corpses.push({ x: f.x, r: f.r, type: f.type, t0: state.tick });
        puffs.push({ x: f.x, r: f.r, t0: state.tick });
        face.delete(id);
      }
    }
    while (corpses.length > 12) corpses.shift();
    while (puffs.length > 24) puffs.shift();
  }

  function drawGear(type, rad, ang) {
    ctx.save();
    ctx.rotate(ang);
    ctx.strokeStyle = "rgba(20,16,10,0.9)";
    ctx.fillStyle = "rgba(20,16,10,0.9)";
    if (type === "soldier") {
      // سپر + نیزه
      ctx.lineWidth = Math.max(1.2, rad * 0.28);
      ctx.beginPath();
      ctx.moveTo(rad * 0.1, -rad * 1.5);
      ctx.lineTo(rad * 0.1, rad * 1.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-rad * 0.5, 0, rad * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = "#d9c27a";
      ctx.fill();
      ctx.strokeStyle = "rgba(20,16,10,0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (type === "swordsman" || type === "lord") {
      // شمشیر (ارباب هم شمشیرزن است)
      ctx.lineWidth = Math.max(1.2, rad * 0.24);
      ctx.beginPath();
      ctx.moveTo(-rad * 0.4, 0);
      ctx.lineTo(rad * 1.4, 0);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, rad * 0.2);
      ctx.beginPath();
      ctx.moveTo(rad * 0.7, -rad * 0.4);
      ctx.lineTo(rad * 0.7, rad * 0.4);
      ctx.stroke();
    } else {
      // کمان
      ctx.lineWidth = Math.max(1, rad * 0.2);
      ctx.beginPath();
      ctx.arc(rad * 0.2, 0, rad * 0.85, -Math.PI / 2.4, Math.PI / 2.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-rad * 0.5, 0);
      ctx.lineTo(rad * 1.2, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  // مسیر fallback وقتی شیت واحد لود نشده (دایره تیم + جنگ‌افزار)
  function drawUnitVector(u, tick, det) {
    const def = UNITS[u.type];
    const p = cs(u.x, u.r);
    const rad = Math.max(3.5, 7.5 * view.zoom);
    // خط مقصد مأموریت فعال (راهنمای بصری دستور)
    if (u.order && u.order.status === "active") {
      const g = cs(u.order.c + 0.5, u.order.r + 0.5);
      ctx.save();
      ctx.setLineDash([4, 4]);
      line(p, g, "rgba(240,199,94,0.5)", 1.5);
      ctx.restore();
      const s = 4 + Math.sin(tick * 0.4) * 1.5;
      poly(
        [{ x: g.x, y: g.y - s }, { x: g.x + s, y: g.y }, { x: g.x, y: g.y + s }, { x: g.x - s, y: g.y }],
        "rgba(240,199,94,0.25)", "#f0c75e", 1.5
      );
    }
    // سایه
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + rad * 0.5, rad * 0.9, rad * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill();
    // بدن
    ctx.beginPath();
    ctx.arc(p.x, p.y - rad * 0.4, rad, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // برق کلاه‌خود
    ctx.beginPath();
    ctx.arc(p.x, p.y - rad * 0.4, rad * 0.55, Math.PI * 1.1, Math.PI * 1.6);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = Math.max(1, rad * 0.18);
    ctx.stroke();
    // نوار HP: فقط وقتی زخمی است یا زوم کافی (رفع نوارهای غول‌پیکر)
    const frac = Math.max(0, u.hp) / u.maxHp;
    let hpTop = null;
    if (frac < 1 || view.zoom >= 0.7) {
      const bw = Math.min(26, Math.max(9, rad * 2.6));
      const bh = view.zoom >= 0.7 ? 4 : 3;
      const bx = p.x - bw / 2, by = p.y - rad * 0.4 - rad - 6;
      hpTop = by;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = u.side === "player" ? "#2ecc71" : "#e74c3c";
      ctx.fillRect(bx, by, bw * frac, bh);
    }
    // تاج ارباب (0.22.0): سه‌دندانه طلایی بالای سر — پس از نوار HP تا زیرش نماند
    if (u.type === "lord") {
      const cw = rad * 1.1, ch = rad * 0.75;
      const cy = (hpTop != null ? hpTop : p.y - rad * 0.4 - rad - 1) - 1;
      ctx.beginPath();
      ctx.moveTo(p.x - cw / 2, cy);
      ctx.lineTo(p.x - cw / 2, cy - ch * 0.55);
      ctx.lineTo(p.x - cw / 4, cy - ch * 0.2);
      ctx.lineTo(p.x, cy - ch);
      ctx.lineTo(p.x + cw / 4, cy - ch * 0.2);
      ctx.lineTo(p.x + cw / 2, cy - ch * 0.55);
      ctx.lineTo(p.x + cw / 2, cy);
      ctx.closePath();
      ctx.fillStyle = "#f0c75e";
      ctx.fill();
      ctx.strokeStyle = "rgba(20,16,10,0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // جنگ‌افزار هم‌جهت حرکت
    ctx.save();
    ctx.translate(p.x, p.y - rad * 0.4);
    drawGear(u.type, rad, faceEntry(u).ang);
    ctx.restore();
    // فلش اصابت
    const age = tick - u.flashTick;
    if (age >= 0 && age < 3) {
      ctx.beginPath();
      ctx.arc(p.x, p.y - rad * 0.4, rad + 2 + age * 3 * view.zoom, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.8 - age * 0.25})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (det && u.mission === "failed") {
      // علامت شکست مأموریت بالای سر
      ctx.fillStyle = "#e74c3c";
      ctx.font = `bold ${Math.round(Math.max(9, 11 * view.zoom))}px Tahoma`;
      ctx.textAlign = "center";
      ctx.fillText("×", p.x, p.y - rad * 0.4 - rad - 9);
    }
  }

  // ---------- واحدهای اسپرایتی (شیت ۱۲۸×۱۶۰؛ فریم ۳۲×۳۲، لنگر (16,30)) ----------
  const UDIR = (ang) => {
    // کوانتیزه زاویه صفحه به ۴ جهت: E=ردیف۰، S=۱، W=۲، N=۳
    const a = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (a < Math.PI / 4 || a >= Math.PI * 7 / 4) return 0;
    if (a < Math.PI * 3 / 4) return 1;
    if (a < Math.PI * 5 / 4) return 2;
    return 3;
  };

  // ماشین‌های محاصره (0.46.0 — #۱۷): وکتوری خالص (شیت نمی‌خواهند، مثل
  // داربست 0.39.0) — دژکوب: تنه چوبی سقف‌دار با سر قوچی؛ منجنیق: شاسی
  // چرخ‌دار با بازوی پرتاب (مستقر = بالا + میخ‌های زمین، سیار = خوابیده).
  function drawSiege(u, tick, det) {
    const p = cs(u.x, u.r);
    const z = view.zoom;
    const rad = Math.max(3.5, 7.5 * z);
    // خط مقصد مأموریت فعال
    if (u.order && u.order.status === "active") {
      const g = cs(u.order.c + 0.5, u.order.r + 0.5);
      ctx.save();
      ctx.setLineDash([4, 4]);
      line(p, g, "rgba(240,199,94,0.5)", 1.5);
      ctx.restore();
    }
    // سایه تماس (کشیده‌تر — ماشین است)
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, rad * 1.5, rad * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill();
    const wheel = (wx) => {
      ctx.beginPath();
      ctx.arc(wx, p.y - 2 * z, Math.max(2, 3.6 * z), 0, Math.PI * 2);
      ctx.fillStyle = "#2e2620";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.stroke();
    };
    if (u.type === "ram") {
      wheel(p.x - 8 * z);
      wheel(p.x + 8 * z);
      // تنه
      ctx.fillStyle = "#8d7a5c";
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.lineWidth = 1.2;
      ctx.fillRect(p.x - 12 * z, p.y - 14 * z, 24 * z, 10 * z);
      ctx.strokeRect(p.x - 12 * z, p.y - 14 * z, 24 * z, 10 * z);
      // سقف شیروانی
      poly(
        [{ x: p.x - 14 * z, y: p.y - 14 * z }, { x: p.x + 14 * z, y: p.y - 14 * z },
         { x: p.x + 7 * z, y: p.y - 22 * z }, { x: p.x - 7 * z, y: p.y - 22 * z }],
        "#57492f", "rgba(0,0,0,0.6)", 1.2
      );
      // سر قوچی فلزی جلو
      ctx.beginPath();
      ctx.arc(p.x + 13 * z, p.y - 9 * z, Math.max(2, 3 * z), 0, Math.PI * 2);
      ctx.fillStyle = "#6e6e78";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.stroke();
    } else {
      wheel(p.x - 9 * z);
      wheel(p.x + 9 * z);
      // شاسی
      ctx.fillStyle = "#7a5c3e";
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.lineWidth = 1.2;
      ctx.fillRect(p.x - 10 * z, p.y - 11 * z, 20 * z, 5 * z);
      ctx.strokeRect(p.x - 10 * z, p.y - 11 * z, 20 * z, 5 * z);
      // بازو: مستقر = بالا، سیار = خوابیده
      const a = u.deployed ? -Math.PI * 0.42 : -Math.PI * 0.12;
      const L = 18 * z;
      const ex = p.x + Math.cos(a) * L, ey = p.y - 11 * z + Math.sin(a) * L;
      line({ x: p.x, y: p.y - 11 * z }, { x: ex, y: ey }, "#4e3a26", Math.max(2, 3 * z));
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(1.8, 2.6 * z), 0, Math.PI * 2);
      ctx.fillStyle = "#3a2f26";
      ctx.fill();
      if (u.deployed && det) {
        // میخ‌های استقرار دور شاسی
        ctx.fillStyle = "#c9c9c9";
        for (const [sx, sy] of [[-11, -4], [11, -4], [-11, -12], [11, -12]]) {
          ctx.fillRect(p.x + sx * z - 1, p.y + sy * z - 1, 2, 2);
        }
      }
    }
    // نوار HP
    const frac = Math.max(0, u.hp) / u.maxHp;
    if (frac < 1 || view.zoom >= 0.7) {
      const bw = Math.min(26, Math.max(9, rad * 2.6));
      const bh = view.zoom >= 0.7 ? 4 : 3;
      const bx = p.x - bw / 2, by = p.y - 24 * z - 5;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = u.side === "player" ? "#2ecc71" : "#e74c3c";
      ctx.fillRect(bx, by, bw * frac, bh);
    }
    // فلش اصابت
    const age = tick - u.flashTick;
    if (age >= 0 && age < 3) {
      ctx.beginPath();
      ctx.arc(p.x, p.y - 10 * z, rad + 2 + age * 3 * view.zoom, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.8 - age * 0.25})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawUnit(u, tick, det, state) {
    const def = UNITS[u.type];
    if (def.siege) { drawSiege(u, tick, det); return; } // ماشین‌ها وکتوری‌اند (0.46.0)
    const sheet = getSprite(`assets/units/${u.type}.png`);
    if (!sheet) { drawUnitVector(u, tick, det); return; }
    const p = cs(u.x, u.r);
    const S = 30 * view.zoom;
    const fe = faceEntry(u);
    const row = UDIR(fe.ang);
    let col = 0;
    if (unitAttacking(state, u, def)) col = 3;
    else if (fe.moving) col = (((fe.walkD * 2.2) | 0) % 2) + 1;
    // خط مقصد مأموریت فعال
    if (u.order && u.order.status === "active") {
      const g = cs(u.order.c + 0.5, u.order.r + 0.5);
      ctx.save();
      ctx.setLineDash([4, 4]);
      line(p, g, "rgba(240,199,94,0.5)", 1.5);
      ctx.restore();
      const s = 4 + Math.sin(tick * 0.4) * 1.5;
      poly(
        [{ x: g.x, y: g.y - s }, { x: g.x + s, y: g.y }, { x: g.x, y: g.y + s }, { x: g.x - s, y: g.y }],
        "rgba(240,199,94,0.25)", "#f0c75e", 1.5
      );
    }
    // سایه تماس
    const rad = Math.max(3.5, 7.5 * view.zoom);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, rad * 0.9, rad * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill();
    // اسپرایت (پاها روی نقطه زمین)
    ctx.drawImage(sheet, col * 32, row * 32, 32, 32, p.x - S / 2, p.y - S * (30 / 32), S, S);
    // نوار HP بالای سر
    const frac = Math.max(0, u.hp) / u.maxHp;
    if (frac < 1 || view.zoom >= 0.7) {
      const bw = Math.min(26, Math.max(9, rad * 2.6));
      const bh = view.zoom >= 0.7 ? 4 : 3;
      const bx = p.x - bw / 2, by = p.y - S * (25 / 32) - 5;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = u.side === "player" ? "#2ecc71" : "#e74c3c";
      ctx.fillRect(bx, by, bw * frac, bh);
    }
    // فلش اصابت (از flashTick واقعی)
    const age = tick - u.flashTick;
    if (age >= 0 && age < 3) {
      ctx.beginPath();
      ctx.arc(p.x, p.y - S * 0.35, S * 0.28 + age * 3 * view.zoom, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.8 - age * 0.25})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (det && u.mission === "failed") {
      ctx.fillStyle = "#e74c3c";
      ctx.font = `bold ${Math.round(Math.max(9, 11 * view.zoom))}px Tahoma`;
      ctx.textAlign = "center";
      ctx.fillText("×", p.x, p.y - S * (25 / 32) - 8);
    }
  }

  function drawCorpses(tick) {
    for (const c of corpses) {
      const age = tick - c.t0;
      if (age < 0 || age > 10) continue;
      const sheet = getSprite(`assets/units/${c.type}.png`);
      if (!sheet) continue;
      const p = cs(c.x, c.r);
      const S = 30 * view.zoom;
      ctx.save();
      if (age > 6) ctx.globalAlpha = 1 - (age - 6) / 4;
      ctx.drawImage(sheet, 0, 128, 32, 32, p.x - S / 2, p.y - S * (30 / 32), S, S);
      ctx.restore();
    }
    // پاک‌سازی دوره‌ای اجساد کهنه (تیک جلو رفته)
    while (corpses.length && tick - corpses[0].t0 > 12) corpses.shift();
  }

  // جلوه‌ها (0.46.0 قوس منجنیق؛ ب-۲ 0.63.0 جرقه نبرد): سنگ نمایشی ۸ تیکی
  // از مبدأ به هدف + جرقه برخورد ۵ تیکی در میانه دو مبارز + خط شلیک ۴ تیکی —
  // هر سه قطعی (از تیک sim) ولی خارج منطق نبرد؛ نه در هش، نه در ذخیره.
  // در fidelity سبک کلاً کشیده نمی‌شوند (مثل قبل).
  function drawFx(state) {
    const fx = state.fx;
    if (!fx || !fx.length) return;
    for (const f of fx) {
      if (f.kind === "clash") { drawClash(f, state.tick); continue; }
      if (f.kind === "shot") { drawShot(f, state.tick); continue; }
      const LIFE = 8;
      const age = state.tick - f.tick;
      if (age < 0 || age > LIFE) continue;
      const p = age / LIFE;
      const a = cs(f.x0, f.r0), b = cs(f.x1, f.r1);
      const x = a.x + (b.x - a.x) * p;
      const y = a.y + (b.y - a.y) * p - Math.sin(p * Math.PI) * 26 * view.zoom;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, 3 * view.zoom), 0, Math.PI * 2);
      ctx.fillStyle = "#8d949c";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.stroke();
    }
  }

  // جرقه برخورد تن‌به‌تن (ب-۲): حلقه گسترش‌یابنده + ۴ پرتو در میانه دو
  // مبارز — سفید-زرد محوشونده در ۵ تیک.
  function drawClash(f, tick) {
    const LIFE = 5;
    const age = tick - f.tick;
    if (age < 0 || age > LIFE) return;
    const p = age / LIFE, z = view.zoom;
    const a = cs(f.x0, f.r0), b = cs(f.x1, f.r1);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 8 * z;
    const alpha = 1 - p;
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, (2 + p * 11) * z, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,236,170,${0.9 * alpha})`;
    ctx.lineWidth = Math.max(1.5, 2.5 * z);
    ctx.stroke();
    // پرتوها (چرخش از تیک ثبت تا هر ضربه شکل خودش را داشته باشد)
    const a0 = (f.tick % 8) * Math.PI / 4;
    ctx.strokeStyle = `rgba(255,255,255,${0.85 * alpha})`;
    ctx.lineWidth = Math.max(1, 1.8 * z);
    for (let k = 0; k < 4; k++) {
      const an = a0 + k * Math.PI / 2;
      const r1 = (4 + p * 4) * z, r2 = (7 + p * 9) * z;
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(an) * r1, my + Math.sin(an) * r1);
      ctx.lineTo(mx + Math.cos(an) * r2, my + Math.sin(an) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // خط شلیک دوربرد (ب-۲): رگه سریع طلایی از کماندار به هدف در ۴ تیک.
  function drawShot(f, tick) {
    const LIFE = 4;
    const age = tick - f.tick;
    if (age < 0 || age > LIFE) return;
    const p = age / LIFE, z = view.zoom;
    const a = cs(f.x0, f.r0), b = cs(f.x1, f.r1);
    const q = p * p; // شتاب: سریع می‌رسد
    const hx = a.x + (b.x - a.x) * q, hy = a.y + (b.y - a.y) * q - 8 * z;
    ctx.save();
    ctx.strokeStyle = `rgba(255,220,130,${0.9 * (1 - p)})`;
    ctx.lineWidth = Math.max(1.5, 2 * z);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 8 * z);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hx, hy, Math.max(1.5, 2.2 * z), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,240,190,${0.95 * (1 - p)})`;
    ctx.fill();
    ctx.restore();
  }

  function drawPuffs(tick) {
    for (let i = puffs.length - 1; i >= 0; i--) {
      const age = tick - puffs[i].t0;
      if (age < 0 || age > 6) { if (age > 6) puffs.splice(i, 1); continue; }
      const p = cs(puffs[i].x, puffs[i].r);
      ctx.beginPath();
      ctx.arc(p.x, p.y - 4 * view.zoom, (2 + age * 2.4) * view.zoom, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(205,195,175,${0.55 * (1 - age / 7)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // ---------- کش لایه زمین ----------
  let tCache = null, tCacheKey = "", tIncomplete = false;

  function terrainSig(terrain) {
    let h = 17;
    for (let i = 0; i < terrain.length; i++) h = (Math.imul(h, 31) + terrain[i] + 1) | 0;
    return h;
  }

  function paintTerrain(state, terrain, gridStroke, det, GW, GH) {
    waterList.length = 0;
    for (let r = 0; r < GH; r++) {
      for (let c = 0; c < GW; c++) {
        const t = terrain[r * GW + c];
        const pts = diamond(c, r);
        const h = hash2(c, r);
        if (t === T_WATER) {
          const img = tileImage("water", (state.tick >> 4) & 1);
          if (img) blitTile(img, pts);
          else { tIncomplete = true; drawWater(pts, c, r, state.tick, det); }
          waterList.push(c, r);
        } else if (t === T_ROCK) {
          const img = tileImage("rock", (h * 3) | 0);
          if (img) blitTile(img, pts);
          else { tIncomplete = true; drawRock(pts, c, r, det); }
          // تخته‌سنگ: فقط روی سنگ (غیرقابل‌ساخت/غیرقابل‌عبور — بدون دروغ occupancy)
          if (hash2(c * 3 + 1, r * 7) > 0.5) {
            drawDecor("boulder", (h * 2) | 0, (pts[0].x + pts[2].x) / 2, (pts[0].y + pts[2].y) / 2, 22, 20);
          }
        } else {
          // وزن‌دار: ۰-۳ رایج، ۴ (خشک) ~۱۰٪، ۵ (خاک+گل) ~۱۲٪ تا نقشه لکه‌لکه نشود
          const r2 = (h * 7) % 1;
          const gv = r2 > 0.9 ? 4 : r2 > 0.78 ? 5 : (h * 4) | 0;
          const img = tileImage("grass", gv);
          if (img) blitTile(img, pts);
          else { tIncomplete = true; drawGrass(pts, c, r, det); }
        }
        poly(pts, null, gridStroke, 1);
      }
    }
    // کف ساحل فقط روی آب‌ها (نه کل ۱۰۲۴ خانه) + نیزار لبه ساحل
    for (let i = 0; i < waterList.length; i += 2) {
      const c = waterList[i], r = waterList[i + 1];
      const pts = diamond(c, r);
      drawShore(pts, c, r, terrain, GW, GH);
      // نیزار: آبِ مجاور چمن، ~۳۰٪ — روی آب غیرقابل‌عبور، بدون دروغ occupancy
      if (hash2(c * 5 + 2, r * 3 + 4) > 0.7 &&
          (tileAt(terrain, GW, GH, c, r - 1) === T_GRASS || tileAt(terrain, GW, GH, c, r + 1) === T_GRASS ||
           tileAt(terrain, GW, GH, c - 1, r) === T_GRASS || tileAt(terrain, GW, GH, c + 1, r) === T_GRASS)) {
        drawDecor("reeds", (hash2(c, r) * 2) | 0, (pts[0].x + pts[2].x) / 2, (pts[0].y + pts[2].y) / 2, 12, 20);
      }
    }
  }

  function drawTerrainLayer(state, terrain, gridStroke, det, GW, GH) {
    const cv = ctx.canvas;
    const key = [cv.width, cv.height, W, H, dpr, view.zoom, O.x, O.y, gridStroke, det ? 1 : 0, (state.tick >> 4) & 1,
      GW, GH, terrainSig(terrain)].join("|");
    if (tCache && tCacheKey === key && typeof tCache.width === "number") {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(tCache, 0, 0);
      ctx.restore();
      return;
    }
    // ریسم روی بوم خارج‌صحنه (اگر پشتیبانی نشد، مستقیم روی بوم اصلی)
    const main = ctx;
    let off = null;
    try {
      off = tCache || document.createElement("canvas");
      if (off.width !== cv.width || off.height !== cv.height) { off.width = cv.width; off.height = cv.height; }
      const octx = off.getContext("2d");
      if (!octx) off = null; else { ctx = octx; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    } catch (e) { off = null; }
    tIncomplete = false;
    try { paintTerrain(state, terrain, gridStroke, det, GW, GH); } finally { ctx = main; }
    if (off) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(off, 0, 0);
      ctx.restore();
      if (tIncomplete) { tCache = null; tCacheKey = ""; } else { tCache = off; tCacheKey = key; }
    }
  }

  // ---------- قاب اصلی ----------

  function draw(state, terrain, hover, selectedDef, selId, wallLine) {
    const GW = CONFIG.GRID_W, GH = CONFIG.GRID_H;
    const det = view.zoom >= 0.55;
    // کش فریم: مبدأ و نیم‌گام یک‌بار (به‌جای ~۱۰هزار فراخوانی origin)
    O = origin();
    HW = (CONFIG.TILE_W / 2) * view.zoom;
    HH = (CONFIG.TILE_H / 2) * view.zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // پس‌زمینه گرادیانی (کش‌شده بر اساس ارتفاع)
    if (!bgGrad || bgH !== H) {
      bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#1a2430");
      bgGrad.addColorStop(1, "#0b1016");
      bgH = H;
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    // سایه جزیره زیر کل نقشه: دو بیضی متحدالمرکز برای لبه نرم
    const TL = cs(0, 0), TR = cs(GW, 0);
    const BL = cs(0, GH), BR = cs(GW, GH);
    const shCX = (TL.x + BR.x) / 2, shCY = (TL.y + BR.y) / 2 + 7 * view.zoom;
    const shRX = (Math.abs(TR.x - TL.x) / 2) * 1.0 + 4;
    const shRY = (Math.abs(BR.y - TL.y) / 2) * 1.0 + 5;
    ctx.beginPath();
    ctx.ellipse(shCX, shCY, shRX + 14, shRY + 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(shCX, shCY, shRX, shRY, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.fill();
    // زمین (یک گذر؛ خانه‌های آب برای کف ساحل جمع می‌شوند)
    // گرید: محو در بازی عادی، پررنگ‌تر در حالت ساخت (hover گوست فعال است).
    // در زوم دور خط گرید حذف می‌شود — هم نامرئی است هم هزاران stroke کم می‌شود.
    const placement = !!(selectedDef && hover && hover.ghost !== false);
    const gridStroke = placement ? "rgba(0,0,0,0.22)" : (view.zoom >= 0.5 ? "rgba(0,0,0,0.07)" : null);
    // لایه زمین ایستا: با کلید (زمین/مبدأ/زوم/آب/گرید) روی بوم خارج‌صحنه کش می‌شود و
    // در فریم‌های بی‌تغییر یک drawImage می‌شود (به‌جای ~۱۰هزار فراخوانی رسم در هر فریم).
    // تا همه اسپرایت‌ها آماده نشده‌اند (یا fallback وکتوری فعال است) کش ثبت نمی‌شود.
    drawTerrainLayer(state, terrain, gridStroke, det, GW, GH);
    // اجساد روی زمین (زیر ساختمان‌ها/واحدها)
    drawCorpses(state.tick);
    // اجساد/پاف‌ها از حذف واحدها بین فریم‌ها (قبل از مرتب‌سازی عمق)
    updateRemains(state);
    // پاک‌سازی حافظه جهت واحدهای مرده (در updateRemains انجام شد)
    // ساختمان‌ها + واحدها در یک ترتیب عمقی (کلید = c+r لبه پشتی):
    // واحد پشت بنای بلند زیر آن پنهان می‌شود، واحد جلویی روی آن.
    const drawables = [];
    for (const b of state.buildings) drawables.push({ k: b.c + b.r, b });
    // مستقر روی برج با نقطه آبی روی سکو نشان داده می‌شود، نه با اسپرایت (0.45.0).
    for (const u of state.units) {
      if (u.garrisonTower == null) drawables.push({ k: u.x + u.r, u });
    }
    drawables.sort((a, b) => a.k - b.k);
    for (const d of drawables) {
      if (d.b) drawBlock(d.b, state.tick, det, state);
      else drawUnit(d.u, state.tick, det, state);
      // نشان مالک در MP (0.24.0): نقطه رنگی بالای هر بنا/یگان؛
      // در سولو فقط بنای حریف AI نقطه قرمز می‌گیرد (0.42.0).
      const ow = d.b ? (d.b.owner == null ? 0 : d.b.owner) : (d.u.owner == null ? 0 : d.u.owner);
      // یگان AI خودش قرمز است (side=enemy)؛ نقطه فقط برای بنایش.
      if ((state.mp && state.mp.enabled) || (d.b && ow === CONFIG.AI.owner)) {
        const cols = ["#4d9de0", "#e05c4d", "#58b368", "#e0b44d"];
        const pt = d.b ? cs(d.b.c + d.b.w / 2, d.b.r + d.b.h / 2) : cs(d.u.x, d.u.r);
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - Math.max(10, 16 * view.zoom), Math.max(3, 4 * view.zoom), 0, Math.PI * 2);
        ctx.fillStyle = (ow === CONFIG.AI.owner) ? "#e05c4d" : (cols[ow] || "#999");
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.stroke();
        ctx.restore();
      }
      // حلقه انتخاب یگان (طلایی چشمک‌زن روی زمین) — یکتا یا مجموعه (0.16.0)
      if (d.u && !d.u.dead && (Array.isArray(selId) ? selId.includes(d.u.id) : d.u.id === selId)) {
        const p = cs(d.u.x, d.u.r);
        const rr = Math.max(6, 12 * view.zoom);
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -(state.tick * 0.8);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 1, rr, rr * 0.45, 0, 0, Math.PI * 2);
        const owS = (d.u.owner == null ? 0 : d.u.owner);
        const colsS = ["#f0c75e", "#4d9de0", "#e05c4d", "#58b368", "#e0b44d"];
        ctx.strokeStyle = (state.mp && state.mp.enabled) ? (colsS[(owS + 1) % colsS.length] || "#f0c75e") : "#f0c75e";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        // خط نگهبانی (0.15.0): پیوند نقطه‌چین تا پاسگاه زنده + حلقه دور آن
        // (کیفیت lite آن را می‌پرد تا فریم سبک شود — اطلاعات در کارت می‌ماند).
        if (fidelity !== "lite" && d.u.stance === "guard" && d.u.guardBld != null) {
          const post = state.buildings.find((b) => b.id === d.u.guardBld && !b.destroyed);
          if (post) {
            const q = cs(post.c + post.w / 2, post.r + post.h / 2);
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "rgba(240,199,94,0.85)";
            ctx.lineWidth = Math.max(1.5, 2 * view.zoom);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.ellipse(q.x, q.y + 1, rr * 0.8, rr * 0.36, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(240,199,94,0.9)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }
    if (fidelity !== "lite") drawFx(state);
    if (fidelity === "full") drawPuffs(state.tick);
    // هایلایت هاور روی موجود (گوست خاموش است) — در lite نیست
    if (fidelity !== "lite" && hover && hover.ghost === false && hover.c > -4 && hover.r > -4) {
      const inMap = hover.c >= 0 && hover.r >= 0 && hover.c < GW && hover.r < GH;
      if (inMap) {
        poly(diamond(hover.c, hover.r), "rgba(255,255,255,0.10)", "rgba(255,255,255,0.8)", Math.max(1.5, 2 * view.zoom));
      }
    }
    // پیش‌نمایش ساخت: ردپا + حجم نیمه‌شفاف با ارتفاع واقعی (در نمای تخت: فقط ردپا).
    // حین خط دیوار، گوست تکی خاموش و کل خط با رنگ اعتبارسنجی کشیده می‌شود.
    if (wallLine && wallLine.length) {
      for (const t of wallLine) {
        if (t.c < 0 || t.r < 0 || t.c >= GW || t.r >= GH) continue;
        poly(diamond(t.c, t.r),
          t.ok ? "rgba(46,204,113,0.30)" : "rgba(231,76,60,0.34)",
          t.ok ? "#2ecc71" : "#e74c3c", 2);
      }
    } else if (hover && hover.ghost !== false && selectedDef && hover.c > -4 && hover.r > -4) {
      const w = selectedDef.w || 1, h = selectedDef.h || 1;
      const A = cs(hover.c, hover.r);
      const B = cs(hover.c + w, hover.r);
      const C = cs(hover.c + w, hover.r + h);
      const D = cs(hover.c, hover.r + h);
      const ok = hover.valid;
      const fill = ok ? "rgba(46,204,113,0.30)" : "rgba(231,76,60,0.34)";
      const edge = ok ? "#2ecc71" : "#e74c3c";
      poly([A, B, C, D], fill, edge, 2);
      if (selectedDef.height && !view.flat) {
        const dy = -selectedDef.height * view.zoom;
        const At = { x: A.x, y: A.y + dy }, Bt = { x: B.x, y: B.y + dy };
        const Ct = { x: C.x, y: C.y + dy }, Dt = { x: D.x, y: D.y + dy };
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (const P of [A, B, C, D]) {
          line(P, { x: P.x, y: P.y + dy }, edge, 1.5);
        }
        poly([At, Bt, Ct, Dt], fill, edge, 1.5);
        ctx.restore();
      }
    }
  }

  // پیش‌نمایش ساختمان برای دکمه‌های پالت (بازنمایش همان رسم وکتوری نقشه).
  // بوم کوچک شفاف؛ بدون پس‌زمینه تا روی کارت بنشیند. هم‌زمان با فریم نیست
  // (فراخوانی از boot/timeout) پس جابه‌جایی موقت ctx/O/HW/HH امن است.
  function thumbBuilding(type, cv) {
    const def = CONFIG.BUILDINGS[type];
    if (!def) return;
    const W2 = 128, H2 = 112;
    cv.width = W2; cv.height = H2;
    const keep = { ctx, O, HW, HH, zoom: view.zoom };
    try {
      ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, W2, H2);
      const z = Math.min(
        (W2 - 14) / ((def.w + def.h) * (CONFIG.TILE_W / 2)),
        (H2 - 18) / ((def.w + def.h) * (CONFIG.TILE_H / 2) + def.height + 34)
      );
      view.zoom = z;
      HW = (CONFIG.TILE_W / 2) * z;
      HH = (CONFIG.TILE_H / 2) * z;
      const gx = W2 / 2, gy = H2 / 2 + (def.height * z) / 2 - 6;
      O = { x: gx - ((def.w - def.h) / 2) * HW, y: gy - ((def.w + def.h) / 2) * HH };
      const b = {
        c: 0, r: 0, w: def.w, h: def.h, type,
        hp: def.hp, maxHp: def.hp, staffed: true,
        starved: false, served: true, open: true,
      };
      drawBlock(b, 120, true, { buildings: [], units: [], tick: 120 });
    } finally {
      ctx = keep.ctx; O = keep.O; HW = keep.HW; HH = keep.HH;
      view.zoom = keep.zoom;
    }
  }

  // پیش‌نمایش یگان: فریم idle روبه‌جنوب از شیت (سطر ۱، ستون ۰) + سایه؛
  // اگر شیت هنوز لود نشده دایره تیمی (با repaint بعدی جایگزین می‌شود).
  function thumbUnit(type, cv) {
    const def = UNITS[type];
    if (!def) return;
    const W2 = 96, H2 = 84;
    cv.width = W2; cv.height = H2;
    const c2 = cv.getContext("2d");
    c2.clearRect(0, 0, W2, H2);
    const S = 56, px = W2 / 2, py = H2 / 2 + 12;
    c2.beginPath();
    c2.ellipse(px, py + 1, S * 0.26, S * 0.11, 0, 0, Math.PI * 2);
    c2.fillStyle = "rgba(0,0,0,0.3)";
    c2.fill();
    const sheet = def.siege ? null : getSprite(`assets/units/${type}.png`); // ماشین‌های محاصره وکتوری‌اند (بدون شیت)
    if (sheet) {
      c2.drawImage(sheet, 0, 32, 32, 32, px - S / 2, py - S * (30 / 32), S, S);
    } else if (type === "ram" || type === "catapult") {
      // بندانگشتی ماشین محاصره (0.46.0): همان نمای وکتوری، کوچک‌شده.
      c2.fillStyle = "#2e2620";
      c2.beginPath();
      c2.arc(px - S * 0.22, py, S * 0.09, 0, Math.PI * 2);
      c2.arc(px + S * 0.22, py, S * 0.09, 0, Math.PI * 2);
      c2.fill();
      if (type === "ram") {
        c2.fillStyle = "#8d7a5c";
        c2.fillRect(px - S * 0.3, py - S * 0.42, S * 0.6, S * 0.26);
        c2.fillStyle = "#57492f";
        c2.beginPath();
        c2.moveTo(px - S * 0.34, py - S * 0.42);
        c2.lineTo(px + S * 0.34, py - S * 0.42);
        c2.lineTo(px + S * 0.18, py - S * 0.58);
        c2.lineTo(px - S * 0.18, py - S * 0.58);
        c2.closePath();
        c2.fill();
        c2.fillStyle = "#6e6e78";
        c2.beginPath();
        c2.arc(px + S * 0.33, py - S * 0.24, S * 0.07, 0, Math.PI * 2);
        c2.fill();
      } else {
        c2.strokeStyle = "#4e3a26";
        c2.lineWidth = 4;
        c2.beginPath();
        c2.moveTo(px, py - S * 0.2);
        c2.lineTo(px + S * 0.26, py - S * 0.52);
        c2.stroke();
        c2.fillStyle = "#7a5c3e";
        c2.fillRect(px - S * 0.26, py - S * 0.26, S * 0.52, S * 0.12);
      }
      c2.strokeStyle = "rgba(0,0,0,0.65)";
      c2.lineWidth = 1.5;
      c2.strokeRect(px - S * 0.3, py - S * 0.42, S * 0.6, S * 0.42);
    } else {
      c2.beginPath();
      c2.arc(px, py - S * 0.2, S * 0.24, 0, Math.PI * 2);
      c2.fillStyle = def.color;
      c2.fill();
      c2.strokeStyle = "rgba(0,0,0,0.65)";
      c2.lineWidth = 1.5;
      c2.stroke();
    }
  }

  return {
    view, resize, fit, markDirty, draw, cellToScreen, screenToCell,
    thumbBuilding, thumbUnit,
    setFlat: (f) => { view.flat = !!f; },
    isFlat: () => view.flat,
    setFidelity,
    getFidelity: () => fidelity,
    canvasSize: () => ({ W, H }),
    debugRemains: () => ({ corpses: corpses.length, puffs: puffs.length, face: face.size }),
  };
}
