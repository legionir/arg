// مینی‌مپ (0.249.0 — C-CLN-45): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { CONFIG } from "./config.js";
import { drawMinimap, minimapCell, panForCell } from "./minimap.js";

function $(id) { return document.getElementById(id); }
export function createMinimapUI({ renderer, getState, getTerrain, getEditor, blankView }) {
  // مینی‌مپ (0.43.0 — #۱۲ از FEATURES): بازرسم هر ۱۵ فریم (۴fps) +
  // کلیک/درگ = پرش دوربین به همان ناحیه. فقط view را می‌خواند/می‌نویسد.
  const minimapCv = $("minimap");
  let minimapTick = 0;
  function paintMinimap() {
    if (!minimapCv) return;
    const size = renderer.canvasSize();
    const tl = renderer.screenToCell(0, 0);
    const br = renderer.screenToCell(size.W, size.H);
    drawMinimap(minimapCv, getEditor() ? blankView() : getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H,
      { c0: tl.c, r0: tl.r, c1: br.c, r1: br.r });
  }
  function minimapJump(e) {
    if (!minimapCv) return;
    const rect = minimapCv.getBoundingClientRect();
    const cell = minimapCell((e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height, CONFIG.GRID_W, CONFIG.GRID_H);
    const size = renderer.canvasSize();
    const pan = panForCell(cell.c, cell.r, size.W, size.H,
      renderer.view.zoom, CONFIG.GRID_W, CONFIG.GRID_H);
    renderer.view.panX = pan.panX;
    renderer.view.panY = pan.panY;
    renderer.markDirty();
    paintMinimap();
  }
  if (minimapCv) {
    minimapCv.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try { minimapCv.setPointerCapture(e.pointerId); } catch (_) { /* مهم نیست */ }
      minimapJump(e);
      const move = (ev) => minimapJump(ev);
      const up = () => {
        minimapCv.removeEventListener("pointermove", move);
        minimapCv.removeEventListener("pointerup", up);
        minimapCv.removeEventListener("pointercancel", up);
      };
      minimapCv.addEventListener("pointermove", move);
      minimapCv.addEventListener("pointerup", up);
      minimapCv.addEventListener("pointercancel", up);
    });
  }
  function tickMinimap() { if (++minimapTick % 15 === 0) paintMinimap(); }
  return { paintMinimap, minimapJump, tickMinimap };
}
