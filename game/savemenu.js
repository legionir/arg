// راه‌اندازی بازی/منو/ذخیره (0.268.0 — C-CLN-88): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { createMissionUI } from "./missionui.js";
import { createMenuUI, wireMenuUI } from "./menuui.js";
import { startNewGame } from "./newgame.js";
import { createNamedSavePainter } from "./namedsave.js";
import { serializeJSON, deserializeJSON, SaveError, SAVE_FA, SLOTS, saveSlot, loadSlot, deleteSlot, validSaveName, saveNamed, loadNamed, deleteNamed, listNamedSaves } from "./persist.js";
import { bindMenuNav } from "./menunav.js";
import { t } from "./i18n.js";
import { faNum } from "./format.js";
import { parseSeed, randomSeed, paintSeed } from "./seed.js";
import { wireProfileUI } from "./profileui.js";

export function createSaveMenuUI({ getMpSession, getState, getRecLog, getSoloDiff, setSoloDiff, getSoloIdentity, setSoloIdentity, getSoloMapKey, setSoloMapKey, getSoloPersonality, setSoloPersonality, getA11yPalette, setA11yPalette, getProfile, setProfile, getSoloAutosave, setSoloAutosave, getUiScale, setUiScale, getDayNight, getFidelity, getTerrain, getReplayWatch, setBookmarks, setCmdQueue, setCtrlGroups, setHover, setLastAutoTick, setLastGroupRecall, setLastSoundSnap, setMastersLogged, setMclockStart, setMpDesync, setMpDesyncSent, setMpNextSeq, setMpSession, setPendingKind, setRecLog, setReplayWatch, setSelBldId, setSelIds, setState, setTerrain, later, $, applyA11y, applyDayNight, applyFidelity, clock, delBtn, hideReplayBar, keyUI, getKeyRecAction, setKeyRecAction, loadBtn, lobby, mpHashes, mpPending, online, paintMapPreview, paintReplayStatus, refreshPanel, renderer, saveBtn, saveStatus, setTick, sound }) {
  // شروع تازه (0.19.0): وضعیت نو + ستاد آغازین؛ دکمه‌های شروع دوباره همین‌اند.
  // در MP صدا زده نمی‌شود (خروج از اتاق مسیر جداست)؛ برای اطمینان session را تمیز می‌کند.
  // seed داده شود نقشه همان سید ساخته می‌شود، وگرنه سید فعلی حفظ می‌شود (0.26.0).
  // diff درجه سختی حریف است (0.50.0)؛ داده نشود همان انتخاب ذخیره‌شده می‌ماند.
  // custom نقشه سفارشی است (0.51.0: {name, patches})؛ داده نشود زمین خالص سیدی.
  const newGame = (seed, diff, custom, personality, identity, pickKeep) => startNewGame({ seed, diff, custom, personality, identity, pickKeep, setMpSession: (v) => { setMpSession(v); }, setMpNextSeq: (v) => { setMpNextSeq(v); }, setMpDesync: (v) => { setMpDesync(v); }, setMpDesyncSent: (v) => { setMpDesyncSent(v); }, setCmdQueue: (v) => { setCmdQueue(v); }, setSoloDiff: (v) => { setSoloDiff(v); }, setSoloPersonality: (v) => { setSoloPersonality(v); }, setSoloIdentity: (v) => { setSoloIdentity(v); }, setState: (v) => { setState(v); }, setTerrain: (v) => { setTerrain(v); }, setRecLog: (v) => { setRecLog(v); }, setReplayWatch: (v) => { setReplayWatch(v); }, setMclockStart: (v) => { setMclockStart(v); }, setMastersLogged: (v) => { setMastersLogged(v); }, setLastAutoTick: (v) => { setLastAutoTick(v); }, setLastSoundSnap: (v) => { setLastSoundSnap(v); }, setHover: (v) => { setHover(v); }, setSelIds: (v) => { setSelIds(v); }, setCtrlGroups: (v) => { setCtrlGroups(v); }, setLastGroupRecall: (v) => { setLastGroupRecall(v); }, setSelBldId: (v) => { setSelBldId(v); }, setBookmarks: (v) => { setBookmarks(v); }, setPendingKind: (v) => { setPendingKind(v); }, getSoloDiff: () => getSoloDiff(), getSoloPersonality: () => getSoloPersonality(), getSoloIdentity: () => getSoloIdentity(), getState: () => getState(), getTerrain: () => getTerrain(), mpPending, mpHashes, hideReplayBar, online, clock, setTick, refreshPanel, paintReplayStatus, later: () => ({ getEditor: (...a) => later().getEditor(...a), closeEditor: (...a) => later().closeEditor(...a), setMissionActive, setMissionWon, setMissionLost }) });


  (function wireSeedCard() {
    const inp = $("seedInput");
    const apply = $("seedApplyBtn"), rnd = $("seedRandomBtn");
    const say = (m) => {
      saveStatus.textContent = m;
      const mm = $("menuMsgEl");
      if (mm) mm.textContent = m;
    };
    // سید صریح = حالت سفارشی (0.52.0): سلکت نقشه نام‌دار خلع می‌شود.
    const toCustom = () => {
      setSoloMapKey("custom");
      try { localStorage.setItem("scw.map", "custom"); } catch (e) {}
      const ms = $("mapSel");
      if (ms) ms.value = "custom";
      paintMapPreview();
    };
    if (apply) apply.addEventListener("click", () => {
      if (getMpSession()) { say(t("main.seed.noMp")); return; }
      const s = parseSeed(inp && inp.value);
      if (s == null) { say(t("main.seed.invalid")); return; }
      toCustom();
      newGame(s, undefined, undefined, undefined, undefined, true);
      say(t("main.seed.created", { seed: s }));
    });
    if (rnd) rnd.addEventListener("click", () => {
      if (getMpSession()) { say(t("main.seed.noMp")); return; }
      const s = randomSeed();
      toCustom();
      newGame(s, undefined, undefined, undefined, undefined, true);
      if (inp) inp.value = "";
      say(t("main.seed.created", { seed: s }));
    });
    paintSeed(getState());
  })();

  // ---- پروفایل + منوی شروع (0.27.0) ----
  const missionUI = createMissionUI({ getState: () => getState(), getMpSession: () => getMpSession(), getReplayWatch: () => getReplayWatch(), getRecLog: () => getRecLog(), getEditor: (...a) => later().getEditor(...a), startWatch: (...a) => later().startWatch(...a), newGame, hideMenu: (...a) => hideMenu(...a), refreshPanel });
  const missionLabel = missionUI.missionLabel;
  const startMission = missionUI.startMission;
  const checkMission = missionUI.checkMission;
  const recordMasters = missionUI.recordMasters;
  const paintCampaign = missionUI.paintCampaign;
  const paintMasters = missionUI.paintMasters;
  const wireMasters = missionUI.wireMasters;
  const getMissionActive = missionUI.getMissionActive;
  const getMissionWon = missionUI.getMissionWon;
  const getMissionLost = missionUI.getMissionLost;
  const getLastMissionKey = missionUI.getLastMissionKey;
  const setMissionActive = missionUI.setMissionActive;
  const setMissionWon = missionUI.setMissionWon;
  const setMissionLost = missionUI.setMissionLost;
  const setLastMissionKey = missionUI.setLastMissionKey;
  const setMastersFilter = missionUI.setMastersFilter;
  const menuUI = createMenuUI({ getMpSession: () => getMpSession(), getState: () => getState(), sound, renderer, refreshPanel });
  const menuMsg = menuUI.menuMsg;
  const showMenu = menuUI.showMenu;
  const hideMenu = menuUI.hideMenu;
  const getMenuNavApi = menuUI.getMenuNavApi;
  const setMenuNavApi = menuUI.setMenuNavApi;
  const getMenuRelabelFns = menuUI.getMenuRelabelFns;
  wireProfileUI({ getProfile: () => getProfile(), setProfile: (v) => { setProfile(v); }, menuMsg, lobby });
  setMenuNavApi(bindMenuNav({ onPage: (p) => { if (p === "masters") paintMasters(); if (p === "campaign") paintCampaign(); } }));
  wireMenuUI({ getSoloDiff: () => getSoloDiff(), setSoloDiff: (v) => { setSoloDiff(v); }, getSoloMapKey: () => getSoloMapKey(), setSoloMapKey: (v) => { setSoloMapKey(v); }, getSoloPersonality: () => getSoloPersonality(), setSoloPersonality: (v) => { setSoloPersonality(v); }, getSoloIdentity: () => getSoloIdentity(), setSoloIdentity: (v) => { setSoloIdentity(v); }, getA11yPalette: () => getA11yPalette(), setA11yPalette: (v) => { setA11yPalette(v); }, getUiScale: () => getUiScale(), setUiScale: (v) => { setUiScale(v); }, getKeyRecAction, setKeyRecAction: (v) => { setKeyRecAction(v); }, getSoloAutosave: () => getSoloAutosave(), setSoloAutosave: (v) => { setSoloAutosave(v); }, getDayNight: () => getDayNight(), getFidelity: () => getFidelity(), getMpSession: () => getMpSession(), getState: () => getState(), getStartWatch: (...a) => later().startWatch(...a), menuMsg, showMenu, hideMenu, getMenuRelabelFns, wireMasters, paintMasters, paintCampaign, setLastMissionKey, keyUI, paintMapPreview, applyA11y, applyDayNight, applyFidelity, newGame });

  saveBtn.addEventListener("click", () => {
    if (getMpSession()) return; // در MP ذخیره نداریم
    const json = serializeJSON(getState());
    const tickNow = getState().tick;
    saveStatus.textContent = t("main.save.saving");
    saveSlot(SLOTS.manual, json).then((r) => {
      saveStatus.textContent = r.ok
        ? t("main.save.manual", { tick: tickNow, bytes: r.bytes })
        : t("main.err.prefix", { msg: SAVE_FA[r.error] || r.error });
    });
  });
  loadBtn.addEventListener("click", () => {
    const { applyLoaded, closeEditor, getEditor, startWatch } = later();
    if (getMpSession()) return;
    saveStatus.textContent = t("main.save.loading");
    loadSlot(SLOTS.manual).then((r) => {
      if (r.ok) {
        try {
          applyLoaded(deserializeJSON(r.text), t("main.save.manualLoaded"));
        } catch (e) {
          saveStatus.textContent = t("main.err.prefix", { msg: e instanceof SaveError ? SAVE_FA[e.code] : e });
        }
        return;
      }
      // اگر دستی خالی است، خودکار را امتحان کن
      loadSlot(SLOTS.auto).then((a) => {
        if (!a.ok) {
          saveStatus.textContent = t("main.err.prefix", { msg: SAVE_FA[r.error] || r.error });
          return;
        }
        try {
          applyLoaded(deserializeJSON(a.text), t("main.save.autoLoaded"));
        } catch (e) {
          saveStatus.textContent = t("main.err.prefix", { msg: e instanceof SaveError ? SAVE_FA[e.code] : e });
        }
      });
    });
  });
  delBtn.addEventListener("click", () => {
    saveStatus.textContent = t("main.save.deleting");
    deleteSlot(SLOTS.manual).then(() => deleteSlot(SLOTS.auto)).then(() => {
      saveStatus.textContent = t("main.save.deleted");
    });
  });
  // ذخیره‌های بانام (0.178.0 — بند 114/§۱.۳): ورودی نام + فهرست (بارگذاری/حذف).
  const saveNameInput = $("saveNameInput"), saveNamedBtn = $("saveNamedBtn"), namedSaveList = $("namedSaveList");
  const paintNamedSaves = createNamedSavePainter({ namedSaveList, listNamedSaves, t, faNum });
  if (saveNamedBtn) saveNamedBtn.addEventListener("click", () => {
    if (getMpSession()) return; // در MP ذخیره نداریم
    const s = validSaveName(saveNameInput && saveNameInput.value);
    if (s === null) { saveStatus.textContent = t("ui.save.nameInvalid"); return; }
    saveStatus.textContent = t("main.save.saving");
    saveNamed(s, serializeJSON(getState())).then((r) => {
      saveStatus.textContent = r.ok
        ? t("ui.save.namedSaved", { name: r.name, tick: faNum(getState().tick) })
        : t("main.err.prefix", { msg: r.error });
      paintNamedSaves();
    });
  });
  if (namedSaveList) namedSaveList.addEventListener("click", (ev) => {
    const { applyLoaded, closeEditor, getEditor, startWatch } = later();
    if (getMpSession()) return;
    const b = ev.target && ev.target.closest ? ev.target.closest("button[data-load],button[data-del]") : null;
    if (!b) return;
    if (b.dataset.load) {
      saveStatus.textContent = t("main.save.loading");
      loadNamed(b.dataset.load).then((r) => {
        if (!r.ok) { saveStatus.textContent = t("main.err.prefix", { msg: SAVE_FA[r.error] || r.error }); return; }
        try {
          applyLoaded(deserializeJSON(r.text), t("ui.save.namedLoaded", { name: b.dataset.load }));
          paintNamedSaves();
        } catch (e) {
          saveStatus.textContent = t("main.err.prefix", { msg: e instanceof SaveError ? SAVE_FA[e.code] : e });
        }
      });
    } else if (b.dataset.del) {
      deleteNamed(b.dataset.del).then(() => {
        saveStatus.textContent = t("ui.save.namedDeleted", { name: b.dataset.del });
        paintNamedSaves();
      });
    }
  });
  const saveIconEl = $("saveIconBtn");
  if (saveIconEl) saveIconEl.addEventListener("click", () => { paintNamedSaves(); });
  return { newGame, startMission, getLastMissionKey, missionLabel, checkMission, recordMasters, paintCampaign, paintMasters, getMissionActive, getMissionWon, getMissionLost, setMissionActive, setMissionWon, setMissionLost, setLastMissionKey, setMastersFilter, menuMsg, showMenu, hideMenu, getMenuNavApi, getMenuRelabelFns };
}
