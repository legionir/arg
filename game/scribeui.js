// کاتب و جدول افتخار (0.253.0 — C-CLN-57): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { t } from "./i18n.js";
import { faNum } from "./format.js";
import { scribeMood, scribeReports, meritRows, sortMerit, powerTier } from "./advisor.js";

function $(id) { return document.getElementById(id); }
export function createScribeUI({ getState, getMpSession, viewSlotOf }) {
  // گزارش‌های کاتب (0.146.0 — §۳.۲): اورلی روی نوار ساختمان (الگوی بازار)؛
  // همیشه تازه‌رندر می‌شود (paintReports در refreshPanel) — بدون میزبان.
  let reportsOpen = false;
  let meritSort = { key: "army", dir: -1 }; // مرتب‌سازی جدول افتخار (0.177.0 — بند 740؛ گذرای UI).
  function hideReports() { reportsOpen = false; const o = $("reportsOverlay"); if (o) o.hidden = true; }
  function showReports() { reportsOpen = true; const o = $("reportsOverlay"); if (o) o.hidden = false; }
  function paintScribe(slot) {
    const face = $("scribeFace");
    if (face) {
      const mood = scribeMood((getMpSession() ? getState().mpres[viewSlotOf(getMpSession())] : getState()).popularity);
      face.textContent = mood === "glad" ? "🙂" : mood === "content" ? "😐" : "😟";
      const btn = $("scribeBtn");
      if (btn) btn.title = `${t("main.scribe.tooltip")} — ${t("main.scribe.mood." + mood)}`;
    }
    const o = $("reportsOverlay"), box = $("reportsRows");
    if (!o || !box || o.hidden || !reportsOpen) return;
    const secs = scribeReports(getState(), slot);
    let html = "";
    // جدول افتخار (0.177.0 — بند 740: Order of Merit) — بالای گزارش کاتب؛
    // هدرهای کلیک‌شونده = مرتب‌سازی (وضعیت در meritSort).
    {
      const mr = meritRows(getState());
      const msrt = sortMerit(mr, meritSort.key, meritSort.dir);
      const mArrow = (k) => meritSort.key === k ? (meritSort.dir === 1 ? " \u25B2" : " \u25BC") : "";
      html += `<div class="mrow" id="meritBox"><span class="mname">${t("main.scribe.merit.title")}</span>`;
      for (const mc of ["name", "gold", "army", "power", "lord"]) {
        html += `<button type="button" data-mcol="${mc}">${t("main.scribe.merit." + mc)}${mArrow(mc)}</button>`;
      }
      for (const r of msrt) {
        const mn = r.nameKey ? t(r.nameKey) : r.name;
        const pt = powerTier(r.power); // نقاط رنگی قدرت (0.180.0 — بند 745)
        html += `<span>${mn}: ${faNum(r.gold)} / ${faNum(r.army)} <span style="color:${pt.color}" title="${faNum(r.power || 0)}">${pt.dots}</span>${r.lord ? " \u265B" : ""}${r.alive ? "" : " \u2020"}</span>`;
      }
      html += `</div>`;
    }
    for (const s of secs) {
      html += `<div class="mrow"><span class="mname">${t("main.scribe.sec." + s.key)}</span>`;
      for (const row of s.rows) {
        const v = row.value == null ? "—" : (typeof row.value === "number" ? faNum(row.value) : row.value);
        html += `<span>${t(row.label)}: <b>${v}</b></span>`;
      }
      html += `</div>`;
    }
    box.innerHTML = html;
  }
  function isReportsOpen() { return reportsOpen; }
  function cycleMerit(k) {
    if (meritSort.key === k) meritSort.dir = -meritSort.dir;
    else { meritSort.key = k; meritSort.dir = k === "name" ? 1 : -1; }
  }
  function wireScribe({ refreshPanel }) {
  // گزارش‌های کاتب (0.146.0 — §۳.۲): تاگل اورلی + رندر تازه.
  const scribeBtn = $("scribeBtn");
  if (scribeBtn) scribeBtn.addEventListener("click", () => {
    if (isReportsOpen()) hideReports();
    else { showReports(); paintScribe(viewSlotOf(getMpSession())); }
    refreshPanel();
  });
  { // مرتب‌سازی جدول افتخار (0.177.0 — بند 740): کلیک هدر = چرخش کلید/جهت.
    const rbox = $("reportsRows");
    if (rbox && !rbox.dataset.meritWired) {
      rbox.dataset.meritWired = "1";
      rbox.addEventListener("click", (e) => {
        const b = e.target && e.target.closest ? e.target.closest("[data-mcol]") : null;
        if (!b) return;
        const k = b.dataset.mcol;
        cycleMerit(k);
        paintScribe(viewSlotOf(getMpSession()));
        refreshPanel();
      });
    }
  }
  const reportsClose = $("reportsClose");
  if (reportsClose) reportsClose.addEventListener("click", () => { hideReports(); refreshPanel(); });
  }
  return { hideReports, showReports, paintScribe, isReportsOpen, cycleMerit, wireScribe };
}
