// مأموریت و استادان (0.257.0 — C-CLN-69): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { CONFIG } from "./config.js";
import { t, getLang } from "./i18n.js";
import { faNum } from "./format.js";
import { missionByKey, missionIndex, missionName, missionBrief, campaignUnlocked, campaignLoad, campaignSave, campaignRecord } from "./campaign.js";
import { createRun, updateRun, missionSnap, MISSIONS } from "./missions.js";
import { mastersLoad, mastersSave, mastersAdd, mastersDelete, mastersSort, MASTERS_SORTS, masterEntry } from "./masters.js";
import { loadReplaySlot } from "./replay.js";

function $(id) { return document.getElementById(id); }

export function createMissionUI({ getState, getMpSession, getReplayWatch, getRecLog, getEditor, startWatch, newGame, hideMenu, refreshPanel }) {
  let missionActive = null, missionWon = false, missionLost = false, lastMissionKey = null, campaignProg = campaignLoad(); // حالت مأموریت (0.225.0 — فاز ۲؛ گذرا + view-side، نه در getState())
  let mastersList = mastersLoad(); // حافظه کاری استادان (منبع حقیقت localStorage است)
  let mastersSortKey = "score", mastersSortDir = -1;
  let mastersFilter = "all"; // پالایش تالار (0.226.0 — C-CMP-5): all/solo/campaign:key
  // استادان نبرد (0.182.0 — §1.1/بند 102): ثبت پایان سولو + فهرست ۲۵۰تایی
  // با ۴ سورت دفترچه (امتیاز/نام/زمان/تاریخ)؛ کلیک = جزئیات، راست‌کلیک/✕ = حذف.
  // فقط view + localStorage؛ sim/هش/ذخیره/ری‌پلی بی‌خبرند.
  function recordMasters(outcome, mapOverride) { // mapOverride: برد مأموریت با نقشه campaign:key (0.225.0 — فاز ۲)
    mastersList = mastersAdd(mastersList, masterEntry({
      seed: getState().mapSeed >>> 0,
      map: mapOverride || getState().mapName || ("seed:" + (getState().mapSeed >>> 0)),
      outcome, ticks: getState().tick, date: new Date().toISOString(),
    }));
    mastersSave(mastersList);
  }
  // ---- مأموریت کمپین (0.225.0 — فاز ۲): اجرا view-side، بدون میدان sim ----
// missionActive گذراست (با newGame/load/watch پاک می‌شود)؛ برد/باخت مأموریت
// پرچم view-side است (missionWon/missionLost) — sim/هش/ذخیره/ری‌پلی بی‌خبرند.
function missionLabel(doc) {
  if (!doc) return "";
  const lang = (typeof getLang === "function" ? getLang() : "fa");
  return missionName(doc, lang);
}
function startMission(key) {
  const doc = missionByKey(key);
  if (!doc) return false;
  if (!campaignUnlocked(campaignLoad(), missionIndex(key))) return false;
  newGame(doc.seed, doc.difficulty, undefined, doc.personality, doc.identity);
  missionActive = { key, run: createRun(doc) };
  lastMissionKey = key;
  if (getRecLog()) getRecLog().mission = key; // ضبط سید/فرمان‌ها به نام مأموریت (0.226.0 — C-CMP-6)
  hideMenu();
  return true;
}
function checkMission() {
  if (!missionActive || getMpSession() || getEditor()) return;
  const doc = missionByKey(missionActive.key);
  if (!doc) { missionActive = null; return; }
  updateRun(missionActive.run, doc, missionSnap(getState()));
  if (missionActive.run.status === "done") {
    const key = missionActive.key;
    missionActive = null;
    missionWon = true;
    if (!getReplayWatch()) { // تماشا فقط بنر می‌زند (0.226.0 — C-CMP-6): بدون ثبت progress/استادان
      campaignProg = campaignRecord(campaignProg, key, getState().tick);
      campaignSave(campaignProg);
      recordMasters("victory", "campaign:" + key);
      paintCampaign();
    }
    refreshPanel();
    return;
  }
  const needsLord = doc.objectives.some((o) => o.kind === "keepLordAlive" && missionActive.run.states[o.id] !== "done");
  if (needsLord && !getState().units.some((u) => !u.dead && u.type === "lord" && (u.side == null || u.side !== "enemy"))) {
    missionActive = null;
    missionLost = true;
    refreshPanel();
  }
}
function paintCampaign() {
  const box = $("campaignList");
  if (!box) return;
  campaignProg = campaignLoad();
  const lang = (typeof getLang === "function" ? getLang() : "fa");
  box.innerHTML = "";
  MISSIONS.forEach((doc, i) => {
    const row = document.createElement("div");
    row.className = "mrow";
    const rec = campaignProg.done ? campaignProg.done[doc.key] : null;
    const open = campaignUnlocked(campaignProg, i);
    const head = document.createElement("button");
    head.type = "button";
    head.className = "mrow-head";
    head.textContent = (i + 1) + ". " + missionName(doc, lang) + " — " +
      (!open ? t("ui.campaign.locked") : rec ? t("ui.campaign.best", { ticks: faNum(rec.ticks) }) : t("ui.campaign.play"));
    if (!open) { head.disabled = true; }
    else { head.addEventListener("click", () => { startMission(doc.key); }); }
    const det = document.createElement("div");
    det.className = "lbl";
    det.textContent = missionBrief(doc, lang);
    row.appendChild(head);
    row.appendChild(det);
    if (rec) { // تماشای ری‌پلی مأموریت (0.226.0 — C-CMP-6): اگر اسلات ذخیره همین مأموریت است
      let savedW = null;
      try { savedW = loadReplaySlot(); } catch (e) { savedW = null; }
      if (savedW && savedW.mission === doc.key) {
        const wbox = document.createElement("div");
        wbox.className = "opts";
        const wb = document.createElement("button");
        wb.type = "button";
        wb.textContent = t("ui.campaign.watch");
        wb.addEventListener("click", () => { startWatch(savedW, t("main.replay.savedLabel")); });
        wbox.appendChild(wb);
        row.appendChild(wbox);
      }
    }
    box.appendChild(row);
  });
}
function masterMapLabel(e) { // نام نمایشی نقشه (0.226.0 — C-CMP-4): رکورد کمپین = نام مأموریت
  const m = (e && e.map) || "";
  if (m.indexOf("campaign:") === 0) {
    const doc = missionByKey(m.slice(9));
    if (doc) return missionLabel(doc);
  }
  return m;
}
function masterDur(e) {
    const s = Math.max(0, (e && e.secs) | 0);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  function paintMasters() {
    const box = $("mastersList");
    if (!box) return;
    mastersList = mastersLoad();
    { const lang = (typeof getLang === "function" ? getLang() : "fa"); // گزینه‌های پالایش (0.226.0 — C-CMP-5)
      const filt = $("mastersFilter");
      if (filt) {
        const keepM = mastersFilter;
        filt.innerHTML = "";
        const opt = (v, label) => { const o = document.createElement("option"); o.value = v; o.textContent = label; filt.appendChild(o); };
        opt("all", t("ui.masters.filterAll"));
        opt("solo", t("ui.masters.filterSolo"));
        for (const mm of MISSIONS) opt("campaign:" + mm.key, missionName(mm, lang));
        filt.value = (keepM === "all" || keepM === "solo" || missionByKey(String(keepM).slice(9))) ? keepM : "all";
        mastersFilter = filt.value;
      } }
    const sortBox = $("mastersSort");
    if (sortBox) {
      for (const b of sortBox.querySelectorAll("[data-msort]")) {
        const k = b.dataset.msort;
        b.classList.toggle("sel", k === mastersSortKey);
        b.textContent = t("ui.masters.sort." + k) + (k === mastersSortKey ? (mastersSortDir === 1 ? " ▲" : " ▼") : "");
      }
    }
    const frows = mastersSort(mastersList, mastersSortKey, mastersSortDir).filter((e) => {
      if (mastersFilter === "all") return true;
      if (mastersFilter === "solo") return (e.map || "").indexOf("campaign:") !== 0;
      return e.map === mastersFilter;
    });
    const cnt = $("mastersCount");
    if (cnt) cnt.textContent = t("ui.masters.count", { n: faNum(frows.length) });
    box.innerHTML = "";
    if (!frows.length) {
      const d = document.createElement("div");
      d.className = "lbl";
      d.textContent = t("ui.masters.empty");
      box.appendChild(d);
      return;
    }
    for (const e of frows) {
      const row = document.createElement("div");
      row.className = "mrow";
      row.dataset.mid = e.id;
      const head = document.createElement("button");
      head.type = "button";
      head.className = "mrow-head";
      head.textContent = `${faNum(e.score)} • ${masterMapLabel(e)} • ${t(e.outcome === "victory" ? "ui.masters.win" : "ui.masters.lose")} • ${masterDur(e)}`;
      const det = document.createElement("div");
      det.className = "lbl";
      det.hidden = true;
      det.textContent = t("ui.masters.detail", { seed: faNum(e.seed), date: e.date, ticks: faNum(e.ticks), score: faNum(e.score) });
      head.addEventListener("click", () => { det.hidden = !det.hidden; });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "mdel";
      del.title = t("ui.masters.del");
      del.textContent = "✕";
      del.addEventListener("click", (ev) => { ev.stopPropagation(); dropMaster(e.id); });
      row.addEventListener("contextmenu", (ev) => { ev.preventDefault(); dropMaster(e.id); });
      row.appendChild(head); row.appendChild(del); row.appendChild(det);
      box.appendChild(row);
    }
  }
  function dropMaster(id) {
    mastersList = mastersDelete(mastersList, id);
    mastersSave(mastersList);
    paintMasters();
  }
  function wireMasters() {
    const filt = $("mastersFilter"); // پالایش per-مأموریت (0.226.0 — C-CMP-5)
    if (filt) filt.addEventListener("change", () => { mastersFilter = filt.value || "all"; paintMasters(); });
    const sortBox = $("mastersSort");
    if (sortBox) sortBox.addEventListener("click", (e) => {
      const b = e.target && e.target.closest ? e.target.closest("[data-msort]") : null;
      if (!b) return;
      const k = b.dataset.msort;
      if (!MASTERS_SORTS.includes(k)) return;
      if (k === mastersSortKey) mastersSortDir = mastersSortDir === 1 ? -1 : 1;
      else { mastersSortKey = k; mastersSortDir = k === "name" ? 1 : -1; }
      paintMasters();
    });
  }
  return { missionLabel, startMission, checkMission, recordMasters, paintCampaign, paintMasters, wireMasters, getMissionActive: () => missionActive, getMissionWon: () => missionWon, getMissionLost: () => missionLost, getLastMissionKey: () => lastMissionKey, setMissionActive: (v) => { missionActive = v; }, setMissionWon: (v) => { missionWon = v; }, setMissionLost: (v) => { missionLost = v; }, setLastMissionKey: (v) => { lastMissionKey = v; }, setMastersFilter: (v) => { mastersFilter = v; } };
}
