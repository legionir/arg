// تماشا و بارگذاری (0.258.0 — C-CLN-72): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { CONFIG } from "./config.js";
import { makeTerrain } from "./terrain.js";
import { t } from "./i18n.js";
import { customTerrain } from "./mapedit.js";
import { validateReplayLog, newSoloFromSeed } from "./replay.js";
import { createQueue } from "./sim.js";
import { missionByKey } from "./campaign.js";
import { createRun } from "./missions.js";
import { freshGroups } from "./groups.js";

function $(id) { return document.getElementById(id); }

export function createWatchUI({ getState, setState, setTerrain, getMpPending, getMpHashes, getSoloDiff, getSoloPersonality, setMpSession, setMpNextSeq, setMpDesync, setMpDesyncSent, setCmdQueue, setRecLog, setReplayWatch, setLastAutoTick, setLastSoundSnap, setHover, setSelIds, setCtrlGroups, setLastGroupRecall, setSelBldId, setBookmarks, setSelectedKey, setSelectedUnit, setPendingKind, setMclockStart, setMastersLogged, setMissionActive, setMissionWon, setMissionLost, setLastMissionKey, getEditor, closeEditor, online, clock, saveStatus, paintSeed, setTick, hideReplayBar, paintReplayBar, paintReplayStatus, hideMenu, showMenu, newGame, hideMercs, hideMarket, clearWallLine, refreshPanel }) {
  // ---- ری‌پلی: تماشا (0.49.0 — #۲۱ از FEATURES) ----
  function replayLogOf(rec, uptoTick) {
    const out = { v: 1, seed: rec.seed >>> 0, diff: rec.diff || getSoloDiff() || "normal",
      pers: rec.pers || getSoloPersonality() || CONFIG.AI.defaultPersonality,
      cmds: rec.cmds.map((e) => ({ t: e.t, cmd: e.cmd })), ticks: uptoTick | 0 };
    if (rec.ident) out.ident = rec.ident; // هویت آغازین (0.153.0 — بند 104)
    if (typeof rec.mission === "string" && rec.mission) out.mission = rec.mission; // مأموریت کمپین (0.226.0 — C-CMP-6)
    if (rec.map) out.map = { name: rec.map.name, patches: rec.map.patches.map((e) => [e[0], e[1]]) };
    return out;
  }
  function startWatch(log, label) {
    const v = validateReplayLog(log);
    if (!v.ok) return v;
    if (getEditor()) closeEditor(true); // تماشا از داخل ویرایشگر = خروج خاموش (0.51.0)
    const fresh = newSoloFromSeed(log.seed, log.diff,
      log.map ? log.map.patches : null, log.map ? log.map.name : "", log.pers, log.ident,
      log.lake ? { lake: log.lake, keep: log.keep } : null);
    setMpSession(null);
    getMpPending().clear();
    setMpNextSeq(1);
    getMpHashes().clear();
    setMpDesync(null);
    setMpDesyncSent(false);
    setCmdQueue(createQueue());
    setState(fresh.state);
    setTerrain(fresh.terrain);
    setRecLog(null); // تماشا ضبط نمی‌شود
    setMissionActive(null); setMissionWon(false); setMissionLost(false); setLastMissionKey(null);
    { const wdoc = (log.mission && missionByKey(log.mission)) || null; // تماشای مأموریت (0.226.0 — C-CMP-6): حالت view-side بازیابی می‌شود
      if (wdoc) { setMissionActive({ key: wdoc.key, run: createRun(wdoc) }); setLastMissionKey(wdoc.key); } }
    online.onNewGame();
    clock.reset();
    setLastAutoTick(0);
    setLastSoundSnap(null);
    setHover(null);
    setSelIds([]); setCtrlGroups(freshGroups()); setLastGroupRecall(null); setSelBldId(null); setBookmarks({}); // بوکمارک هم گذراست (0.162.0)
    setSelectedKey(null);
    setSelectedUnit(null);
    setPendingKind(null);
    clearWallLine();
    hideMercs(); hideMarket();
    getState().paused = false;
    getState().speed = 1;
    setReplayWatch({
      cmds: log.cmds.slice().sort((a, b) => a.t - b.t),
      i: 0,
      upto: Math.max(0, log.ticks | 0 || 0),
      label: label || t("main.replay.label"),
    });
    hideMenu();
    setTick(0);
    paintSeed(getState());
    refreshPanel();
    paintReplayBar();
    return { ok: true, reason: "OK" };
  }
  function exitWatch(toMenu) {
    setReplayWatch(null);
    hideReplayBar();
    if (toMenu) { showMenu(); }
    else { newGame(); showMenu(); }
    refreshPanel();
  }
  function applyLoaded(s, label) {
    setState(s);
    setRecLog(null); // بازی بارگذاری‌شده: تاریخ پیش از load نیست پس ری‌پلی ندارد (0.49.0)
    setMissionActive(null); setMissionWon(false); setMissionLost(false); // بارگذاری مأموریت نیست (0.225.0)
    setReplayWatch(null);
    hideReplayBar();
    if (getEditor()) closeEditor(true); // بارگذاری از داخل ویرایشگر = خروج خاموش
    setCmdQueue(createQueue()); // فرمان‌های معوق بازی قبلی در بازی تازه اجرا نشوند
    // زمینِ سیدِ ذخیره را بازسازی کن (ذخیره قدیمی بدون سید → پیش‌فرض؛
    // نقشه سفارشی 0.51.0 با وصله‌ها روی همان سید).
    const ls = (s.mapSeed == null ? CONFIG.MAP_SEED : s.mapSeed) >>> 0 || CONFIG.MAP_SEED;
    setTerrain(s.mapPatches && s.mapPatches.length
      ? customTerrain(ls, s.mapPatches)
      : makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, ls, s.mapLake || null));
    online.onNewGame(s.victorious === true); // بردِ قدیمیِ بارگذاری‌شده دوباره جشن گرفته نشود (0.23.0)
    clock.reset();
    setMclockStart(null); setMastersLogged(!!(s.victorious || s.defeated)); // بارگذاری: ثبت‌نشدهِ قدیمی دوباره ثبت نشود (0.182.0)
    setLastAutoTick(s.tick);
    setLastSoundSnap(null); // baseline صدا تازه شود (0.48.0)
    setHover(null);
    setSelIds([]); setCtrlGroups(freshGroups()); setLastGroupRecall(null); setSelBldId(null); setBookmarks({}); // بوکمارک هم گذراست (0.162.0)
    setPendingKind(null);
    setTick(s.tick);
    paintSeed(getState());
    refreshPanel();
    paintReplayStatus();
    saveStatus.textContent = t("main.save.loadedInfo", { label, tick: s.tick, seed: s.mapSeed >>> 0 });
  }
  return { replayLogOf, startWatch, exitWatch, applyLoaded };
}
