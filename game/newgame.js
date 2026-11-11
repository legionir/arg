// شروع بازی تازه (0.263.0 — C-CLN-83): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { CONFIG } from "./config.js";
import { stepSim, createQueue, enqueueCmd, snapPrev, fixNewPrev } from "./sim.js";
import {
  REPLAY_CMD_CAP, createRecorder, recordCmd, validateReplayLog,
  newSoloFromSeed, verifyReplayAsync, saveReplaySlot, loadReplaySlot,
} from "./replay.js";
import { createState } from "./state.js";
import {
  MAP_NAME_MAX, PATCH_CAP, TILE_NAMES, BRUSHES, createMapDoc, patchesList, patchCount,
  baseTerrain, applyPatches, customTerrain, paintCells, clearPatches,
  validateMapDoc, normalizeMapDoc, exportMapDoc, importMapDoc,
  validatePlayable, namedMapByKey, mapNameFor, saveCustomSlot, loadCustomSlot,
} from "./mapedit.js";
import { freshGroups, saveGroup, recallGroup } from "./groups.js";
import { makeTerrain, soloLakeCenter } from "./terrain.js";
import { parseSeed, randomSeed, paintSeed } from "./seed.js";
import { validate, tryPlace, placeKeep, placeKeepFor, REASON_FA, underConstruction, hasLiveKeep, keepLocked } from "./construction.js";
import { FINAL_WAVE, PEACE_TICKS, peaceActive, HIRE_FA, hasBarracks, hasCathedral, validateHire, hireUnit, spawnWave, waveTimeline, spawnLord, validIdentity, spawnStartingForce, ORDER_FA, STANCE_FA, ORDER_KIND_FA, setStance, guardPost, setGuard, isGarrisonPost, garrisonCapFor, GARRISON_FA, canGarrisonType, garrisonUnit, fortifyPick, ATTACK_FA, attackPick, deployUnit, FIRECOW_FA, fireCow, isCowSiege, AMMO_RESUPPLY_STONE, AMMO_RESUPPLY_ROCKS, RESUPPLY_FA, resupplyAmmo, signEdge, orderMove, orderAttackMove, orderPatrol, mercpostOf, guildOf, hasStable, stableWithHorse, setRally, isSoloLord, lordKeepGate, orderAttackPos, orderPatrolAppend, PATROL_MAX, disbandUnit, queueOrder, orderRetreat, cancelOrder, pushEvent, toggleGate, KILLPIT_CHARGES, DOGS_PER_CAGE, HORSES_PER_STABLE, RELEASE_FA, cageDogs, validateRelease, releaseDogs, stepKennels, stepStables, DEMOLISH_FA, demolishBuilding, REPAIR_FA, validateRepair, repairBuilding, undoLastBuild, stepCombat, buildingInfo, hireGoodsFor, soldierValue, UNITS } from "./combat.js";
import { startAI } from "./ai.js";
import { initI18n, t, onLangChange, getLang, hasKey } from "./i18n.js";

export function startNewGame({ seed, diff, custom, personality, identity, pickKeep, setMpSession, setMpNextSeq, setMpDesync, setMpDesyncSent, setCmdQueue, setSoloDiff, setSoloPersonality, setSoloIdentity, setState, setTerrain, setRecLog, setReplayWatch, setMclockStart, setMastersLogged, setLastAutoTick, setLastSoundSnap, setHover, setSelIds, setCtrlGroups, setLastGroupRecall, setSelBldId, setBookmarks, setPendingKind, getSoloDiff, getSoloPersonality, getSoloIdentity, getState, getTerrain, mpPending, mpHashes, hideReplayBar, online, clock, setTick, refreshPanel, paintReplayStatus, later }) {
  const { getEditor, closeEditor, setMissionActive, setMissionWon, setMissionLost } = later();
    setMpSession(null);
    mpPending.clear();
    setMpNextSeq(1);
    mpHashes.clear();
    setMpDesync(null);
    setMpDesyncSent(false);
    setCmdQueue(createQueue()); // صف گذراست — با بازی تازه دور انداخته می‌شود
    if (diff && CONFIG.AI.difficulties[diff]) {
      setSoloDiff(diff);
      try { localStorage.setItem("scw.difficulty", diff); } catch (e) {}
    }
    if (personality && CONFIG.AI.personalities[personality]) {
      setSoloPersonality(personality);
      try { localStorage.setItem("scw.personality", personality); } catch (e) {}
    }
    // هویت آغازین (0.153.0 — بند 104): صریح > بازی جاری (ری‌استارت) > ماندگاری.
    const ident = validIdentity(identity) || validIdentity(getState().ident) || validIdentity(getSoloIdentity()) || "none";
    setSoloIdentity(ident);
    try { localStorage.setItem("scw.identity", getSoloIdentity()); } catch (e) {}
    if (getEditor()) closeEditor(true); // بازی تازه از داخل ویرایشگر = خروج خاموش
    const s = (seed == null ? getState().mapSeed : seed) >>> 0 || CONFIG.MAP_SEED;
    // شروع دوباره روی نقشه سفارشی: وصله‌ها از بازی جاری به ارث می‌رسند (0.52.0؛
    // فقط وقتی سید تازه داده نشده — seedApply با سید صریح زمین خالص می‌سازد).
    const inherit = (seed == null && !custom && getState().mapPatches && getState().mapPatches.length)
      ? { name: getState().mapName, patches: getState().mapPatches } : null;
    const eff = custom || inherit;
    const patches = eff && Array.isArray(eff.patches) && eff.patches.length ? eff.patches : null;
    // سولوی ستاد-انتخابی (0.292.0): دریاچه از سید، ستاد را بازیکن در نیمه‌ی خودش می‌گذارد.
    // شروع دوباره (بدون سید تازه) همان دریاچه را نگه می‌دارد؛ نقشه سفارشی/وصله همان رفتار قدیم.
    const inheritLake = seed == null && !custom && !patches ? getState().mapLake : null;
    const lake = !patches && (pickKeep === true || inheritLake)
      ? (inheritLake ? [inheritLake[0], inheritLake[1]] : soloLakeCenter(s, CONFIG.GRID_W, CONFIG.GRID_H)) : null;
    setTerrain(patches ? customTerrain(s, patches) : makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, s, lake));
    setState(createState());
    getState().mapSeed = s;
    getState().mapLake = lake;
    // نام نقشه (0.51.0 سفارشی، 0.52.0 نام‌دار): صریح > سید کاتالوگ > خالی.
    getState().mapName = eff && eff.name ? String(eff.name) : mapNameFor(s);
    getState().mapPatches = patches ? patches.map((e) => [e[0], e[1]]) : null;
    setRecLog(createRecorder(s, getSoloDiff(), patches ? { name: getState().mapName, patches } : null, getSoloPersonality(), ident, lake ? { lake } : null)); // ضبط ری‌پلی تازه (0.49.0؛ درجه از 0.50.0؛ نقشه از 0.51.0؛ شخصیت از 0.56.0)
    setReplayWatch(null);
    hideReplayBar();
    if (lake) {
      // منتظر ستاد: ارباب، ارتش و حریف پس از انتخاب بازیکن می‌آیند (pickKeepAt در main.js).
      getState().pendingKeep = true;
      getState().paused = true;
      getState().ident = ident;
    } else {
      placeKeep(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H);
      spawnLord(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H); // ارباب آغازین (0.22.0)
      getState().ident = ident; // هویت بازی جاری (هاور ستاد + ماندگاری ری‌استارت)
      spawnStartingForce(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H, ident, 0); // ارتش اولیه هویت (0.153.0 — بند 104)
      startAI(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H, getSoloDiff(), getSoloPersonality()); // حریف سولو (0.42.0؛ جا نبود = بی‌حریف)
      pushEvent(getState(), t("game.ev.caravan")); // کاروان کالاهای اولیه (فاز ۱ بند ۱۳)
    }
    online.onNewGame(); // پیروزی بازی تازه هنوز ثبت نشده (0.23.0)
    clock.reset();
    setMclockStart(null); setMastersLogged(false); // ساعت/استادان بازی تازه (0.182.0 — بندهای 130/102)
    setMissionActive(null); setMissionWon(false); setMissionLost(false); // حالت مأموریت گذراست (0.225.0 — پشت newGame پاک می‌شود؛ نه در getState())
    setLastAutoTick(0);
    setLastSoundSnap(null); // baseline صدا تازه شود تا سیل رویداد ندهد (0.48.0)
    setHover(null);
    setSelIds([]); setCtrlGroups(freshGroups()); setLastGroupRecall(null); setSelBldId(null); setBookmarks({}); // بوکمارک هم گذراست (0.162.0)
    setPendingKind(null);
    setTick(0);
    paintSeed(getState());
    refreshPanel();
    paintReplayStatus();
}
