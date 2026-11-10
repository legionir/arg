// ژست‌ها و ریاضیات نما (0.238.0 — C-CLN-10): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import {
  PINCH_ZOOM_MIN, PINCH_ZOOM_MAX, LONG_PRESS_MS, LONG_PRESS_SLOP,
  pinchDist, pinchZoom, zoomStep, pinchMid, longPressFired, longPressMoved,
  DRAG_PAN_SLOP, dragMovedFar, panForDrag, ARROW_PAN_STEP, EDGE_PAN_MARGIN, EDGE_PAN_STEP, arrowPanDelta, edgePanDir,
} from "../gestures.js";
import { orderHoverMark } from "../selection.js";
import { must } from "./fixtures.js";

// --- ژست‌های لمسی (0.53.0 — #۲۳ از FEATURES) ---
export function gestureCases() {
  return [t_pinch_zoom, t_pinch_dist_mid, t_long_press, t_middle_pan, t_zoom_step, t_order_mark, t_scroll_math];
}

// زوم از نسبت فاصله‌ها + سقف [۰٫۳، ۳] (همان چرخ موس) + نگهبان d0 نامعتبر.
function t_pinch_zoom() {
  must(pinchZoom(1, 100, 200) === 2, "فاصله دوبرابر = زوم دوبرابر");
  must(pinchZoom(1, 200, 100) === 0.5, "فاصله نصف = زوم نصف");
  must(pinchZoom(2, 100, 200) === PINCH_ZOOM_MAX, "سقف بالا ۳");
  must(pinchZoom(0.4, 100, 50) === PINCH_ZOOM_MIN, "سقف پایین ۰٫۳");
  must(pinchZoom(1.5, 0, 200) === 1.5, "d0 صفر = بدون تغییر");
  must(pinchZoom(1.5, -5, 200) === 1.5, "d0 منفی = بدون تغییر");
  must(pinchZoom(1, 100, 100) === 1, "فاصله ثابت = زوم ثابت");
  return { name: "زوم پینچ", pass: true, detail: "نسبت + سقف ۰٫۳/۳ + نگهبان" };
}

// فاصله ۳-۴-۵ و نقطه میانی.
function t_pinch_dist_mid() {
  must(pinchDist(0, 0, 3, 4) === 5, "فاصله ۳-۴-۵");
  must(pinchDist(7, 7, 7, 7) === 0, "نقطه یکسان = صفر");
  const m = pinchMid(0, 0, 10, 20);
  must(m.x === 5 && m.y === 10, "میانه (۵،۱۰)");
  return { name: "فاصله و مرکز پینچ", pass: true, detail: "۵ + (۵،۱۰)" };
}

// لمس طولانی: مرز ۵۰۰ms + تحمل ۱۰px (مانهتن)؛ مرزها دقیق.
function t_long_press() {
  must(LONG_PRESS_MS === 500 && LONG_PRESS_SLOP === 10, "ثابت‌ها: ۵۰۰ms و ۱۰px");
  must(longPressFired(0, 0, 1000, 0, 0, 1500) === true, "دقیقاً ۵۰۰ms بی‌حرکت = رخ داده");
  must(longPressFired(0, 0, 1000, 0, 0, 1499) === false, "۴۹۹ms = هنوز نه");
  must(longPressFired(0, 0, 1000, 6, 4, 1600) === true, "مانهتن ۱۰ = درون تحمل");
  must(longPressFired(0, 0, 1000, 6, 5, 1600) === false, "مانهتن ۱۱ = بیرون تحمل");
  must(longPressMoved(0, 0, 6, 4) === false, "مانهتن ۱۰ = لغو نیست");
  must(longPressMoved(0, 0, 6, 5) === true, "مانهتن ۱۱ = لغو تایمر");
  return { name: "لمس طولانی", pass: true, detail: "مرز ۵۰۰ms + تحمل ۱۰px" };
}

// درگ وسط = پن با همان ریاضی درگ-پن چپ (0.68.0 — ریزه‌کاری ۴-ب): آفست
// دوربین حفظ می‌شود + آستانه ۶px مشترک هر دو دکمه؛ مرزها دقیق.
function t_middle_pan() {
  must(DRAG_PAN_SLOP === 6, "آستانه پن همان ۶px درگ-پن چپ");
  const p = panForDrag(100, 50, 10, 10, 30, -5);
  must(p.panX === 120 && p.panY === 35, `پن = آفست + جابه‌جایی، شد (${p.panX}،${p.panY})`);
  const q = panForDrag(-7, 3, 0, 0, 0, 0);
  must(q.panX === -7 && q.panY === 3, "بدون حرکت = بدون تغییر پن");
  must(dragMovedFar(0, 0, 3, 3) === false, "مانهتن ۶ = هنوز پن نه");
  must(dragMovedFar(0, 0, 4, 3) === true, "مانهتن ۷ = پن");
  must(dragMovedFar(0, 0, -5, -2) === true, "جهت منفی هم پن");
  return { name: "پن دکمه وسط", pass: true, detail: "ریاضی مشترک + آستانه ۶" };
}
// گام زوم صفحه‌کلید (0.173.0 — §3.2/بند 159): همان ضرایب چرخ + سقف [۰٫۳، ۳].
function t_zoom_step() {
  must(zoomStep(1, true) === 1.12, "نزدیک = ×۱٫۱۲");
  must(zoomStep(1, false) === 0.89, "دور = ×۰٫۸۹");
  must(zoomStep(2.9, true) === PINCH_ZOOM_MAX, "سقف بالا ۳");
  must(zoomStep(0.31, false) === PINCH_ZOOM_MIN, "سقف پایین ۰٫۳");
  must(zoomStep(0, true) === 0, "زوم نامعتبر = بدون تغییر");
  must(zoomStep(-1, false) === -1, "زوم منفی = بدون تغییر");
  return { name: "گام زوم صفحه‌کلید", pass: true, detail: "۱٫۱۲/۰٫۸۹ + سقف ۰٫۳/۳" };
}
// نشان سبز مقصد (0.174.0 — §10.3/بند 558): هاورِ مقصدِ فرمانِ حرکتی = سبز.
function t_order_mark() {
  must(orderHoverMark("attackmove", 3) === true, "attackmove بامنتخب = سبز");
  must(orderHoverMark("patrol", 1) === true, "patrol = سبز");
  must(orderHoverMark("attackpos", 2) === true, "attackpos = سبز");
  must(orderHoverMark("guard", 1) === true, "guard = سبز");
  must(orderHoverMark("garrison", 4) === true, "garrison = سبز");
  must(orderHoverMark(null, 2) === true, "خنثی بامنتخب (حرکت) = سبز");
  must(orderHoverMark("alarm", 5) === false, "زنگ = ویژه، نه سبز");
  must(orderHoverMark("demolish", 1) === false, "تخریب = ویژه");
  must(orderHoverMark("repair", 1) === false, "تعمیر = ویژه");
  must(orderHoverMark("firecow", 1) === false, "گاو = ویژه");
  must(orderHoverMark("attackmove", 0) === false, "بی‌منتخب = هیچ");
  must(orderHoverMark(null, 0) === false, "خنثیِ خالی = هیچ");
  return { name: "نشان سبز مقصد", pass: true, detail: "۵ kind حرکتی + خنثی سبز؛ ویژه‌ها نه" };
}
// ریاضیات اسکرول (0.176.0 — بند 154): جهت‌ها + لبه. خالص و هدلس.
function t_scroll_math() {
  must(ARROW_PAN_STEP === 56 && EDGE_PAN_MARGIN === 10 && EDGE_PAN_STEP === 10, "ثابت‌ها");
  must(JSON.stringify(arrowPanDelta("ArrowLeft")) === JSON.stringify({ dx: 56, dy: 0 }), "چپ");
  must(JSON.stringify(arrowPanDelta("ArrowRight")) === JSON.stringify({ dx: -56, dy: 0 }), "راست");
  must(JSON.stringify(arrowPanDelta("ArrowUp")) === JSON.stringify({ dx: 0, dy: 56 }), "بالا");
  must(JSON.stringify(arrowPanDelta("ArrowDown")) === JSON.stringify({ dx: 0, dy: -56 }), "پایین");
  must(arrowPanDelta("KeyA") === null && arrowPanDelta("") === null, "ناشناخته = null");
  let d = edgePanDir(3, 100, 800, 600);
  must(d.dx === 1 && d.dy === 0, "لبه چپ");
  d = edgePanDir(797, 100, 800, 600);
  must(d.dx === -1 && d.dy === 0, "لبه راست");
  d = edgePanDir(400, 2, 800, 600);
  must(d.dx === 0 && d.dy === 1, "لبه بالا");
  d = edgePanDir(400, 599, 800, 600);
  must(d.dx === 0 && d.dy === -1, "لبه پایین");
  d = edgePanDir(0, 0, 800, 600);
  must(d.dx === 1 && d.dy === 1, "گوشه = قطری");
  d = edgePanDir(400, 300, 800, 600);
  must(d.dx === 0 && d.dy === 0, "میانه = صفر");
  d = edgePanDir(-50, 900, 800, 600);
  must(d.dx === 1 && d.dy === -1, "بیرون = نزدیک‌ترین لبه");
  d = edgePanDir(5, 5, 0, 600);
  must(d.dx === 0 && d.dy === 0, "قاب نامعتبر = صفر");
  d = edgePanDir(5, 5, 800, 600, 8);
  must(d.dx === 1 && d.dy === 1, "حاشیه سفارشی");
  return { name: "ریاضیات اسکرول", pass: true, detail: "جهت + لبه" };
}