// سید نقشه (0.238.0 — C-CLN-12): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { t } from "./i18n.js";

function $(id) { return document.getElementById(id); }

export function parseSeed(v) {
    const n = typeof v === "number" ? v : parseInt(String(v == null ? "" : v).replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n) || n < 1 || n > 4294967295) return null;
    return n >>> 0;
  }
export function randomSeed() {
    let s = 0;
    while (s === 0) s = (Math.random() * 4294967296) >>> 0;
    return s;
  }
export function paintSeed(state) {
    const el = $("seedCurEl");
    if (el) el.textContent = state.mapName
      ? `${t("main.mp.seed", { seed: state.mapSeed >>> 0 })} • ${state.mapName}`
      : String(state.mapSeed >>> 0);
    const mpIn = $("mpSeedInput");
    if (mpIn && document.activeElement !== mpIn && !mpIn.value) mpIn.value = String(state.mapSeed >>> 0);
  }