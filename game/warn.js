// هشدار مشاور + خط اردو (0.243.0 — C-CLN-27): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// getState/sound از بوت می‌آیند (همان الگوی modal.js/flatview.js)؛ lastWarnKeys داخلی کارخانه است.
import { t } from "./i18n.js";
import { faNum } from "./format.js";
import { advisorWarnings, warnAlarmKeys } from "./advisor.js";
import { campGauge, activeEvents } from "./economy.js";

function $(id) { return document.getElementById(id); }

export function warnText(w) {
  if (w.key === "unstaffed") return t("main.warn.unstaffed", { n: faNum(w.n) });
  if (w.key === "starved") return t("main.warn.starved", { n: faNum(w.n) });
  if (w.key === "crowding") return t("main.warn.crowding", { w: faNum(w.workers), cap: faNum(w.cap) });
  return t("main.warn." + w.key);
}

export function createWarnLines({ getState, sound }) {
  let lastWarnKeys = []; // کلیدهای هشدار فریم قبل (بوق فقط برای تازه‌ها — بند 166)
  function paintWarnLine(slot) {
    const el = $("warnEl");
    if (!el) return;
    const ws = advisorWarnings(getState(), slot);
    el.hidden = !ws.length;
    if (ws.length) el.textContent = ws.map(warnText).join(" • ");
    // اعلان صوتی مشاور (0.181.0 — §3.3/بند 166): فقط کلیدهای تازه بوق
    // می‌خورند (edge-trigger روی مجموعه کلیدها، نه تکرار هر فریم).
    const keys = ws.map((w) => w.key);
    const fresh = warnAlarmKeys(lastWarnKeys, ws);
    lastWarnKeys = keys;
    if (fresh.length) sound.ack("alarm");
  }
  // خط آتش اردو (فاز ۱ بند ۱۴): پیشرفت چرخه + جهت + بیکاران کنار آتش.
  function paintCampLine(slot) {
    const el = $("campEl");
    if (!el) return;
    const g = campGauge(getState(), slot);
    el.classList.toggle("camp-red", g.halo === "red");
    el.classList.toggle("camp-crowd", !!g.crowded);
    el.textContent = t("main.camp.line", {
      pct: faNum(Math.floor(g.prog * 100)),
      dir: g.dir > 0 ? "▲" : g.dir < 0 ? "▼" : "●",
      waiting: faNum(g.waiting),
    });
    const evs = activeEvents(getState());
    if (evs.length) el.textContent += " • " + evs.map((k) => t("main.event." + k)).join("، ");
  }
  return { warnText, paintWarnLine, paintCampLine };
}

