// آزمون‌های خودکار اقتصاد (ECON-001/002) — هدلس، هم‌زمان، زیر یک ثانیه.
// اجرا: window.__slice01.runTests() یا ?test در URL.
import { CONFIG } from "./config.js";
import { t, withLang, getLang, setLang } from "./i18n.js";
import { makeTerrain, terrainPins } from "./terrain.js";
import { createState, occupyFootprint } from "./state.js";
import { assignStaff } from "./economy.js";
import { tryPlace, validate, placeKeep, hasLiveKeep, keepLocked, nearOasis, OASIS_FARM_RADIUS, REASONS } from "./construction.js";
import { stepEconomy, popTarget, campGauge, foodVariety, innServed, innCoverage, innBonus, drunkards, religionCoverage, religionBonus, religionWorking, blessActive, RELIGION, RELIGION_TYPES, FEAR, FIRE, fearLevel, fearRaw, fearNext, fearWorkCoef, fearAttackPct, fearAttackMult, fearPop, workGain, millSupport, foodTotal, eatOneUnit, FOOD_TYPES, FOOD_BONUS, taxIndex, taxAt, housingCap, BASE_HOUSING, HUT_HOUSING, KEEP_HOUSING, STONEKEEP_HOUSING, RATES, TAX, RATIONS, INN, STOCK_POP, EAT_THRESHOLD, POP_PERIOD, MIG_PERIOD, POP_STEP, IMM_IN, IMM_OUT, CAPS, CROWD_POP, crowdPop, activeEvents, eventBonus, STORE_RES, GRANARY_RES, ARMOURY_RES, STORE_BONUS, GRANARY_BONUS, ARMOURY_BONUS, capFor, workersNeeded, hasOxTether, stepPlayerEconomy, takeCow, herdCows, bribeAffordable, POP_CAP, POP_CAP_EXTREME, CAMP_IDLE_MAX, popTotal, atPopCap } from "./economy.js";
import {
  serializeJSON, deserializeJSON, deserialize, SaveError, SCHEMA_VERSION, migrateSaveDoc, validAutosave, autosaveTicks, autosaveDue,
  storageSave, storageDelete, slotInfo, saveSlot, loadSlot, deleteSlot, migrateToIdb, AUTOSAVE_OPTIONS,
  validSaveName, saveNamed, loadNamed, deleteNamed, listNamedSaves, namedSlotKey,
} from "./persist.js";
import { idbAvailable, idbGet, idbDel, IDB_CAP } from "./idb.js";
import {
  BENCH_BUDGET, withinBudget, benchSim, runBench,
} from "./bench.js";
import {
  REGRESSIONS, EXPECTED_HASHES, runRegression, fuzzSaves, fuzzCmds,
} from "./regression.js";
import { COMPAT_ROWS, probeCompat, compatBootable, SUPPORT_LINE } from "./compat.js";
import { buildingInfo, hireGoodsFor, UNITS, spawnUnit, hireUnit, strike, validateHire, hasBarracks, hasCathedral, spawnWave, spawnLord, FINAL_WAVE, waveTimeline, PEACE_TICKS, peaceActive, resupplyAmmo, RESUPPLY_FA, AMMO_RESUPPLY_STONE, AMMO_RESUPPLY_ROCKS, orderMove, orderAttackMove, orderRetreat, setStance, setGuard, guardPost, cancelOrder, stepCombat, occForSide, walkable, gateAt, gateOpen, toggleGate, validateDemolish, demolishBuilding, demolishRefund, unitArmor, effectiveDmg, dmgVs, noFortDmg, deployUnit, garrisonUnit, GARRISON_CAP, simTickHz, qpos, fireCow, stepClouds, healthyApoth, stepHealers, stepFire, isFlammable, strongWallDmg, undoLastBuild, signEdge, signDir, STANCES, DEFEND_RADIUS, ENGAGE_RADIUS, ENGAGE_DROP, provokeRetaliation, fightTarget, IDENTITIES, validIdentity, spawnStartingForce, isGarrisonPost, garrisonCapFor, GARRISON_POSTS, REPAIR_STONE_PER_HP, REPAIR_WOOD_PER_HP, REPAIR_FA, repairCost, validateRepair, repairBuilding, KILLPIT_CHARGES, PIT_COST, pitCostFor, pitVictim, stepKillpits, PIT_RAM_DMG, TOWER_FAMILY, isTowerFamily, towerGuardDmg, ramStrikeDmg, RAM_ONESHOT_WALLS, ramResistDmg, DOGS_PER_CAGE, DOG_REFILL_TICKS, RELEASE_FA, validateRelease, releaseDogs, cageDogs, stepKennels, canGarrisonType, fortifyPick, attackPick, stepGateCapture, orderAttackPos, orderPatrol, orderPatrolAppend, PATROL_MAX, disbandUnit, isCowSiege, queueOrder, isSoloLord, lordKeepOf, lordKeepGate, lordReturnStep, ATTACKPOS_SPLASH, LORD_FLEE_RADIUS, LORD_KEEP_MARGIN, setRally, stableWithHorse, hasStable, stableHorses, restoreHorse, stepStables, HORSES_PER_STABLE, HORSE_REFILL_TICKS, soldierValue, armyValue } from "./combat.js";
import { findPath, nearestWalkable, isCellWalkable } from "./pathfind.js";
import { createRenderer, interpPos, dprCapFor, dayLight, waterPhase, DAY_CYCLE, buildPhase } from "./render.js";
import { toggleInSet, pruneSet, resolveSet, orderAll, retreatAll, stanceAll, guardAll, alarmAll, boxSelectIds, sameTypeIds, groupCentroid, orderHoverMark, armyBreakdown, bookmarkSet, bookmarkGet, bookmarkCycle, lordFocusIds, lordFocusNext } from "./selection.js";
import { T_GRASS, T_WATER, T_ROCK, T_OASIS } from "./terrain.js";
import * as terrainNs from "./terrain.js";
import * as constrNs from "./construction.js";
import { UNIT_DATA } from "./units.gen.js";
import { ensureWakeLock, releaseWakeLock, isWakeLocked, canWakeLock } from "./wakelock.js";
import { HUD_COLLAPSE_PX, hudShouldCollapse, isHudOpen, setHudOpen, toggleHud } from "./mobilehud.js";
import { SHEET_OVERLAY_PX, sheetShouldOverlay, isSheetOpen, setSheetOpen, toggleSheet } from "./mobilesheet.js";
import { MOBILE_BENCH_TICKS } from "./bench.js";
import { spriteInlineCount, spriteCacheSize } from "./sprites.js";
import { ICON_DATA } from "./icons.gen.js";
import { TILE_DATA } from "./tiles.gen.js";
import { DECOR_DATA } from "./decor.gen.js";
import { createQueue, enqueueCmd, queueLen, stepSim, applyCmd } from "./sim.js";
import { mulberry32, seedSimRng, rngNext, rngInt, rngPick, statelessRand } from "./rng.js";
import { validateBuildingFile, BUILDING_CATEGORIES, validateUnitFile, validateBalanceFile, BALANCE, BALANCE_SECTIONS, validateTuningFile, TUNING, TUNING_VERSION, TUNING_SECTIONS, TAX_IDS, RATION_IDS } from "./data.js";
import { createClock } from "./clock.js";
import { queueHire, cancelTrain, stepTraining, barracksOf, trainTimeOf, TRAIN_FA } from "./train.js";
import { MISSION_KINDS, MISSION_FA, validateMission, createRun, updateRun, missionSnap, clockReady, clockText, MISSIONS, validateMissionFile } from "./missions.js";
import { CAMPAIGN_KEY, campaignLoad, campaignSave, campaignRecord, campaignUnlocked, missionByKey, missionIndex, missionName, missionBrief } from "./campaign.js";
import { MASTERS_KEY, MASTERS_CAP, MASTERS_SORTS, masterScore, masterEntry, mastersAdd, mastersDelete, mastersSort, mastersLoad, mastersSave } from "./masters.js";
import { CLOUD_KEY_MIN, CLOUD_KEY_MAX, CLOUD_DATA_MAX, CLOUD_FA, cloudKeyHash, validCloudKey } from "./cloud.js";
import { resolveSocketUrl } from "./selfhost.js";
import { hasMarket, tradeQuote, applyTrade, MARKET_TABS, marketTabOf, marketSelected, marketTrader, marketStage, tradeLocked, stageRank } from "./market.js";
import { startAI, stepAI, aiRandAt, aiDifficulty, aiRaidPlan, aiPersonality, aiPersonalityName, aiRaidUnitType, AI_OWNER } from "./ai.js";
import { drawMinimap, minimapCell, panForCell, paintMapThumb, MINIMAP_W, MINIMAP_H, MM_KEEP_STAR } from "./minimap.js";
import { WALL_LINE_MAX, isLineDragType, wallLineTiles, blockLineIfAnyInvalid } from "./wallline.js";
import {
  PINCH_ZOOM_MIN, PINCH_ZOOM_MAX, LONG_PRESS_MS, LONG_PRESS_SLOP,
  pinchDist, pinchZoom, zoomStep, pinchMid, longPressFired, longPressMoved,
  DRAG_PAN_SLOP, dragMovedFar, panForDrag, ARROW_PAN_STEP, EDGE_PAN_MARGIN, EDGE_PAN_STEP, arrowPanDelta, edgePanDir,
} from "./gestures.js";
import { validateConfig } from "./schema.js";
import {
  GROUP_SLOTS, freshGroups, groupIndex, saveGroup, recallGroup,
} from "./groups.js";
import { BANNED_NAMES, scanBanned, scanContent } from "./legal.js";
import { runFirstTenScenario, FIRST_TEN_TICKS } from "./firstten.js";
import {
  A11Y_PALETTES, A11Y_SCALES, KEY_ACTIONS, DEFAULT_KEYS, KEY_ACTION_FA,
  validPalette, clampScale, validKeyCode, normalizeKeys, cycleSpeed,
} from "./a11y.js";
import {
  VOL_KEY, MAX_EVENTS_PER_TICK, loadVolumes, saveVolumes,
  diffSoundEvents, countWalking, soundSnapshot, createSoundManager,
} from "./sound.js";
import {
  REPLAY_V, REPLAY_KEY, REPLAY_CMD_CAP, createRecorder, recordCmd, validateReplayLog,
  newSoloFromSeed, runReplay, saveReplaySlot, loadReplaySlot, verifyReplayAsync,
  REF_REPLAY_V, validateRefReplay, verifyRefReplay, fetchRefReplay,
} from "./replay.js";
import {
  MAP_V, PATCH_CAP, CUSTOM_KEY, BRUSHES, createMapDoc, patchesList, patchCount,
  baseTerrain, applyPatches, customTerrain, paintCells, clearPatches,
  validateMapDoc, normalizeMapDoc, exportMapDoc, importMapDoc,
  validatePlayable, namedMapByKey, mapNameFor, saveCustomSlot, loadCustomSlot,
} from "./mapedit.js";
import { createMenuNav, MENU_PAGES } from "./menunav.js";
import { nextHint, HINT_STEPS, hintBuilding } from "./hints.js";
import { taxInfo, rationInfo, policySummary, advisorWarnings, warnAlarmKeys, innInfo, religionInfo, fearInfo, approxRes, eatGauge, eatMeter, foodInfo, foodReport, granaryInterior, treasuryInfo, stockpileInterior, stockpilePiles, STOCKPILE_TYPES, STOCK_COLORS, scribeMood, scribeReports, meritRows, sortMerit, powerTier, POWER_COLORS } from "./advisor.js";
import { enableMp, MP_MAX, mpClearSpawns, MP_SPAWN_ANCHOR, INPUT_DELAY, stateHash, updateMpAlive, lootEliminated } from "./mp.js";
import { placeKeepFor } from "./construction.js";
import { validRoomPassword, roomRowHTML, liveRowHTML, myGameRowHTML, roomHostSlot, isRoomHost, hostStar, validMpSession, normalizeMyGames, upsertMyGameList, markMyGameDoneList, removeMyGameList, desyncReportOf } from "./lobby.js";
import { zipStore, zipParse, crc32 } from "../tools/zip-store-lib.mjs";
import { tstCases } from "./tests/tst-phase6.js";
import { mpCases } from "./tests/mp.js";
import { serverCases } from "./tests/server.js";
import { must, fresh, mpFresh, srvCode, srvMake, srvRoom, srvInp, sim, simC, simT, completeAll, rawTicks, grassNear, needBarracks, stubCtx, blankMap, siteNear, aiSim, aiFreshPers, grassInBand, placeGateAt, putNear } from "./tests/fixtures.js";
import { groupCases, legalCases, firstTenCases, schemaCases } from "./tests/basics.js";
import { soundCases } from "./tests/sound.js";
import { gestureCases } from "./tests/gesture.js";
import { mapeditCases } from "./tests/mapedit.js";
import { dataCases } from "./tests/data.js";
import { hardeningCases } from "./tests/hardening.js";
import { missionCases } from "./tests/mission.js";
import { keepCases } from "./tests/keep.js";
import { mastersCases } from "./tests/masters.js";
import { cloudCases } from "./tests/cloud.js";
import { trainCases } from "./tests/train.js";
import { wallCases } from "./tests/wall.js";
import { pathCases } from "./tests/path.js";
import { lordCases } from "./tests/lord.js";
import { gfxCases } from "./tests/gfx.js";
import { balanceCases } from "./tests/balance.js";
import { simCases } from "./tests/sim.js";
import { replayCases } from "./tests/replay.js";
import { aiCases } from "./tests/ai.js";
import { constCases } from "./tests/const.js";
import { combatCases } from "./tests/combat.js";
import { a11yCases } from "./tests/a11y.js";
import { econCases } from "./tests/econ.js";
import { persistCases } from "./tests/persist.js";
import { advisorCases } from "./tests/advisor.js";
import { sysCases } from "./tests/sys.js";
import { costCases } from "./tests/costs.js";
import { fireCases } from "./tests/fire.js";
import { truceCases } from "./tests/truce.js";
import { arabCases } from "./tests/arab.js";
import { ballistaCases } from "./tests/ballista.js";
import { stanceCases } from "./tests/stance.js";
import { aggroCases } from "./tests/aggro.js";
import { fortCases } from "./tests/fort.js";
import { towerCases } from "./tests/tower.js";
import { gateCases } from "./tests/gate.js";
import { gatecaptureCases } from "./tests/gatecapture.js";
import { siegeCases } from "./tests/siege.js";
import { absenceCases } from "./tests/absence.js";
import { fortifyCases } from "./tests/fortify.js";
import { ordersCases } from "./tests/orders.js";
import { attackCases } from "./tests/attack.js";
import { patrolCases } from "./tests/patrol.js";
import { roadsCases } from "./tests/roads.js";import { hireCases } from "./tests/hire.js";import { guildsCases } from "./tests/guilds.js";import { stableCases } from "./tests/stable.js";import { troopsCases } from "./tests/troops.js";
import { servicesCases } from "./tests/services.js";
import { idbCases } from "./tests/idb.js";
import { foeCases } from "./tests/foe.js";
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "./profile.js";








// پیش‌شرط استخدام سرباز در تست‌ها (0.29.0): سربازخانه مستقیم و بدون
// هزینه/شمارنده (تا ادعاهای هزینه و شمارش تست‌ها دست‌نخورده بمانند) در گوشه
// پایین-چپ — دور از نقاط پرکاربرد TL/مرکز؛ اگر پر بود نخستین جای آزاد کل نقشه.
// (0.44.0): انبار مهمات هم پر می‌کند (۳۰ شمشیر/کمان) چون استخدام مزدور از این
// نسخه سلاح می‌خواهد — تست‌های رزمی روی نبرد تمرکز دارند نه زنجیره سلاح
// (خودِ قفل سلاح در t_hire_needs_weapon با انبار خالی آزموده می‌شود).


// محوطه شروع (سطر ۱-۸، ستون ۱-۹) همیشه چمن است.
// نقاط با فاصله ≥۱ خانه خالی (قانون spacing چوب‌بری رعایت می‌شود).
const SPOTS_2X2 = [[1, 1], [4, 1], [7, 1], [1, 4], [4, 4], [7, 4], [1, 7]];






























export function runEconTests() {
  return econCases().map(runFn);
}

function runFn(fn) {
  try {
    return fn();
  } catch (e) {
    return { name: fn.name, pass: false, detail: String((e && e.message) || e) };
  }
}



























































































// آزمون‌ها متن فارسی مرجع را بررسی می‌کنند؛ پس همیشه با زبان fa اجرا می‌شوند (زبان کاربر دست‌نخورده می‌ماند).
export function runAllTests() {
  return withLang("fa", () => [...econCases(), ...persistCases(), ...combatCases(), ...pathCases(),
    ...constCases(), ...keepCases(), ...lordCases(), ...sysCases(), ...mpCases(), ...simCases(), ...aiCases(), ...wallCases(), ...soundCases(), ...advisorCases(), ...mapeditCases(), ...gestureCases(), ...schemaCases(), ...dataCases(), ...a11yCases(), ...hardeningCases(), ...replayCases(), ...groupCases(), ...legalCases(), ...firstTenCases(), ...trainCases(), ...balanceCases(), ...gfxCases(), ...missionCases(), ...cloudCases(), ...serverCases(), ...tstCases(), ...servicesCases(), ...costCases(), ...fireCases(), ...truceCases(), ...arabCases(), ...troopsCases(), ...ballistaCases(), ...stanceCases(), ...aggroCases(), ...fortCases(), ...towerCases(), ...gateCases(), ...gatecaptureCases(), ...siegeCases(), ...absenceCases(), ...fortifyCases(), ...ordersCases(), ...attackCases(), ...patrolCases(), ...roadsCases(), ...hireCases(), ...guildsCases(), ...stableCases(), ...mastersCases(), ...foeCases()].map(runFn));
}

// --- بک‌اند IndexedDB (0.55.0 — #۱۶ از FEATURES): فاز تست ناهمگام ---
// IDB ذاتاً Promise است و runAllTests سینک می‌ماند (جریان ?test/بج)، پس این
// فاز جدا با await اجرا می‌شود: window.__slice01.runIdbTests(). کلیدهای تست
// با پیشوند scw.test. هستند و هر تست خودش تمیز می‌کند؛ اسلات‌های واقعی بازی
// لمس نمی‌شوند. بدون IDB در مرورگر، تست‌های IDB-خالص skip-pass می‌دهند و
// fallback روی localStorage همان‌طور کامل اجرا می‌شود.
export async function runIdbTests() {
  const prev = getLang();
  setLang("fa", { persist: false });
  try { return await runIdbTestsFa(); } finally { setLang(prev, { persist: false }); }
}

async function runIdbTestsFa() {
  const out = [];
  for (const fn of idbCases()) {
    try {
      out.push(await fn());
    } catch (e) {
      out.push({ name: fn.name, pass: false, detail: String((e && e.message) || e).slice(0, 200) });
    }
  }
  return out;
}




































