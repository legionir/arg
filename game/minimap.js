// مینی‌مپ (#۱۲ از FEATURES، 0.43.0 — شماره ۵ از NEXT-5).
// UI-side خالص: فقط می‌خواند (state/terrain/view) و هیچ‌چیز را تغییر نمی‌دهد —
// صفر اثر روی sim، هش MP و ذخیره. همه توابع خالص و تست‌پذیرند.
import { CONFIG } from "./config.js";
import { T_WATER, T_ROCK } from "./terrain.js";
import { PLAYER_COLORS } from "./mp.js";

export const MINIMAP_W = 150;
export const MINIMAP_H = 150;

// رنگ‌ها (مات تا getImageData دقیق بخواند):
export const MM_GRASS = "#33502e";
export const MM_WATER = "#2e6f8e";
export const MM_ROCK = "#7a7f85";
export const MM_SELF = "#4d9de0";   // آبی مالک ۰ (آینه PLAYER_COLORS[0])
export const MM_AI = "#e05c4d";     // قرمز حریف (آینه رنگ نقطه بنای AI در render.js)
export const MM_ME_UNIT = "#2ecc71"; // سبز: یگان خودی
export const MM_FOE_UNIT = "#e74c3c"; // قرمز: یگان دشمن/حریف/موج
export const MM_KEEP_STAR = "#f0c75e"; // ستاره طلایی مرکز ستاد
export const MM_VIEWPORT = "rgba(255,255,255,0.9)";

function ownerColor(state, owner) {
  const ow = owner == null ? 0 : owner;
  if (ow === CONFIG.AI.owner) return MM_AI;
  if (state.mp && state.mp.enabled) return PLAYER_COLORS[ow] || "#999999";
  return ow === 0 ? MM_SELF : MM_AI;
}

// مختصات نرمال‌شده کلیک (۰..۱) → خانه نقشه (خالص؛ بیرون = چسبیده به لبه).
export function minimapCell(nx, ny, GW, GH) {
  const cx = Math.max(0, Math.min(1, nx));
  const cy = Math.max(0, Math.min(1, ny));
  return {
    c: Math.min(GW - 1, Math.floor(cx * GW)),
    r: Math.min(GH - 1, Math.floor(cy * GH)),
  };
}

// پن دوربین طوری که مرکز خانه (c,r) وسط بوم اصلی بیاید (خالص).
// وارون cellToScreen در render.js است: origin = {W/2 + panX, (H-mh)/2 + panY} و
// cellToScreen = o + ((c−r)·hw, (c+r)·hh)؛ مساوی مرکز بوم (W/2,H/2) می‌گذاریم.
export function panForCell(c, r, cw, ch, zoom, GW, GH) {
  const hw = (CONFIG.TILE_W / 2) * zoom;
  const hh = (CONFIG.TILE_H / 2) * zoom;
  const mh = (GW + GH) * (CONFIG.TILE_H / 2) * zoom;
  const cx = c + 0.5, cy = r + 0.5;
  return { panX: -(cx - cy) * hw, panY: mh / 2 - (cx + cy) * hh };
}

// رسم کامل: زمین هر خانه + بناها (مربع رنگ مالک) + یگان‌ها (نقطه) +
// ستاره ستاد + مستطیل دید. viewport اختیاری: {c0,r0,c1,r1} به مختصات خانه.
export function drawMinimap(cv, state, terrain, GW, GH, viewport) {
  const W = cv.width || MINIMAP_W, H = cv.height || MINIMAP_H;
  const ctx = cv.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0); // مختصات صحیح پیکسلی (تست getImageData)
  const cellW = W / GW, cellH = H / GH;
  for (let r = 0; r < GH; r++) {
    for (let c = 0; c < GW; c++) {
      const t = terrain[r * GW + c];
      ctx.fillStyle = t === T_WATER ? MM_WATER : t === T_ROCK ? MM_ROCK : MM_GRASS;
      ctx.fillRect(c * cellW, r * cellH, cellW + 0.6, cellH + 0.6);
    }
  }
  for (const b of state.buildings) {
    if (b.destroyed) continue;
    ctx.fillStyle = ownerColor(state, b.owner);
    ctx.fillRect(b.c * cellW, b.r * cellH, b.w * cellW + 0.6, b.h * cellH + 0.6);
    if (b.type === "keep") {
      // ستاره مرکز ستاد — خانه اول (c,r) دست‌نخورده می‌ماند (پین تست).
      const sx = (b.c + b.w / 2) * cellW, sy = (b.r + b.h / 2) * cellH;
      ctx.fillStyle = MM_KEEP_STAR;
      ctx.fillRect(sx - 1, sy - 1, 3, 1);
      ctx.fillRect(sx, sy - 2, 1, 5);
    }
  }
  for (const u of state.units) {
    if (u.dead) continue;
    ctx.fillStyle = u.side === "player" ? MM_ME_UNIT : MM_FOE_UNIT;
    const dx = Math.floor(u.x * cellW), dy = Math.floor(u.r * cellH);
    ctx.fillRect(dx - 1, dy - 1, 2, 2);
  }
  if (viewport) {
    ctx.strokeStyle = MM_VIEWPORT;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.max(0, viewport.c0) * cellW + 0.5,
      Math.max(0, viewport.r0) * cellH + 0.5,
      Math.max(1, viewport.c1 - viewport.c0) * cellW,
      Math.max(1, viewport.r1 - viewport.r0) * cellH
    );
  }
}
