// غیبت‌ها (0.256.0 — C-CLN-64): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
// اجرا: window.__slice01.runTests() یا ?test در URL.
import { CONFIG } from "../config.js";
import { t, withLang, getLang, setLang } from "../i18n.js";
import { makeTerrain, terrainPins } from "../terrain.js";
import { createState, occupyFootprint } from "../state.js";
import { assignStaff } from "../economy.js";
import { tryPlace, validate, placeKeep, hasLiveKeep, keepLocked, nearOasis, OASIS_FARM_RADIUS, REASONS } from "../construction.js";
import { stepEconomy, popTarget, campGauge, foodVariety, innServed, innCoverage, innBonus, drunkards, religionCoverage, religionBonus, religionWorking, blessActive, RELIGION, RELIGION_TYPES, FEAR, FIRE, fearLevel, fearRaw, fearNext, fearWorkCoef, fearAttackPct, fearAttackMult, fearPop, workGain, millSupport, foodTotal, eatOneUnit, FOOD_TYPES, FOOD_BONUS, taxIndex, taxAt, housingCap, BASE_HOUSING, HUT_HOUSING, KEEP_HOUSING, STONEKEEP_HOUSING, RATES, TAX, RATIONS, INN, STOCK_POP, EAT_THRESHOLD, POP_PERIOD, MIG_PERIOD, POP_STEP, IMM_IN, IMM_OUT, CAPS, CROWD_POP, crowdPop, activeEvents, eventBonus, STORE_RES, GRANARY_RES, ARMOURY_RES, STORE_BONUS, GRANARY_BONUS, ARMOURY_BONUS, capFor, workersNeeded, hasOxTether, stepPlayerEconomy, takeCow, herdCows, bribeAffordable, POP_CAP, POP_CAP_EXTREME, CAMP_IDLE_MAX, popTotal, atPopCap } from "../economy.js";
import {
  serializeJSON, deserializeJSON, deserialize, SaveError, SCHEMA_VERSION, migrateSaveDoc, validAutosave, autosaveTicks, autosaveDue,
  storageSave, storageDelete, slotInfo, saveSlot, loadSlot, deleteSlot, migrateToIdb, AUTOSAVE_OPTIONS,
  validSaveName, saveNamed, loadNamed, deleteNamed, listNamedSaves, namedSlotKey,
} from "../persist.js";
import { idbAvailable, idbGet, idbDel, IDB_CAP } from "../idb.js";
import {
  BENCH_BUDGET, withinBudget, benchSim, runBench,
} from "../bench.js";
import {
  REGRESSIONS, EXPECTED_HASHES, runRegression, fuzzSaves, fuzzCmds,
} from "../regression.js";
import { COMPAT_ROWS, probeCompat, compatBootable, SUPPORT_LINE } from "../compat.js";
import { buildingInfo, hireGoodsFor, UNITS, spawnUnit, hireUnit, strike, validateHire, hasBarracks, hasCathedral, spawnWave, spawnLord, FINAL_WAVE, waveTimeline, PEACE_TICKS, peaceActive, resupplyAmmo, RESUPPLY_FA, AMMO_RESUPPLY_STONE, AMMO_RESUPPLY_ROCKS, orderMove, orderAttackMove, orderRetreat, setStance, setGuard, guardPost, cancelOrder, stepCombat, occForSide, walkable, gateAt, gateOpen, toggleGate, validateDemolish, demolishBuilding, demolishRefund, unitArmor, effectiveDmg, dmgVs, noFortDmg, deployUnit, garrisonUnit, GARRISON_CAP, simTickHz, qpos, fireCow, stepClouds, healthyApoth, stepHealers, stepFire, isFlammable, strongWallDmg, undoLastBuild, signEdge, signDir, STANCES, DEFEND_RADIUS, ENGAGE_RADIUS, ENGAGE_DROP, provokeRetaliation, fightTarget, IDENTITIES, validIdentity, spawnStartingForce, isGarrisonPost, garrisonCapFor, GARRISON_POSTS, REPAIR_STONE_PER_HP, REPAIR_WOOD_PER_HP, REPAIR_FA, repairCost, validateRepair, repairBuilding, KILLPIT_CHARGES, PIT_COST, pitCostFor, pitVictim, stepKillpits, PIT_RAM_DMG, TOWER_FAMILY, isTowerFamily, towerGuardDmg, ramStrikeDmg, RAM_ONESHOT_WALLS, ramResistDmg, DOGS_PER_CAGE, DOG_REFILL_TICKS, RELEASE_FA, validateRelease, releaseDogs, cageDogs, stepKennels, canGarrisonType, fortifyPick, attackPick, stepGateCapture, orderAttackPos, orderPatrol, orderPatrolAppend, PATROL_MAX, disbandUnit, isCowSiege, queueOrder, isSoloLord, lordKeepOf, lordKeepGate, lordReturnStep, ATTACKPOS_SPLASH, LORD_FLEE_RADIUS, LORD_KEEP_MARGIN, setRally, stableWithHorse, hasStable, stableHorses, restoreHorse, stepStables, HORSES_PER_STABLE, HORSE_REFILL_TICKS, soldierValue, armyValue } from "../combat.js";
import { findPath, nearestWalkable, isCellWalkable } from "../pathfind.js";
import { createRenderer, interpPos, dprCapFor, dayLight, waterPhase, DAY_CYCLE, buildPhase } from "../render.js";
import { toggleInSet, pruneSet, resolveSet, orderAll, retreatAll, stanceAll, guardAll, alarmAll, boxSelectIds, sameTypeIds, groupCentroid, orderHoverMark, armyBreakdown, bookmarkSet, bookmarkGet, bookmarkCycle, lordFocusIds, lordFocusNext } from "../selection.js";
import { T_GRASS, T_WATER, T_ROCK, T_OASIS } from "../terrain.js";
import * as terrainNs from "../terrain.js";
import * as constrNs from "../construction.js";
import { UNIT_DATA } from "../units.gen.js";
import { ensureWakeLock, releaseWakeLock, isWakeLocked, canWakeLock } from "../wakelock.js";
import { HUD_COLLAPSE_PX, hudShouldCollapse, isHudOpen, setHudOpen, toggleHud } from "../mobilehud.js";
import { SHEET_OVERLAY_PX, sheetShouldOverlay, isSheetOpen, setSheetOpen, toggleSheet } from "../mobilesheet.js";
import { MOBILE_BENCH_TICKS } from "../bench.js";
import { spriteInlineCount, spriteCacheSize } from "../sprites.js";
import { ICON_DATA } from "../icons.gen.js";
import { TILE_DATA } from "../tiles.gen.js";
import { DECOR_DATA } from "../decor.gen.js";
import { createQueue, enqueueCmd, queueLen, stepSim, applyCmd } from "../sim.js";
import { mulberry32, seedSimRng, rngNext, rngInt, rngPick, statelessRand } from "../rng.js";
import { validateBuildingFile, BUILDING_CATEGORIES, validateUnitFile, validateBalanceFile, BALANCE, BALANCE_SECTIONS, validateTuningFile, TUNING, TUNING_VERSION, TUNING_SECTIONS, TAX_IDS, RATION_IDS } from "../data.js";
import { createClock } from "../clock.js";
import { queueHire, cancelTrain, stepTraining, barracksOf, trainTimeOf, TRAIN_FA } from "../train.js";
import { MISSION_KINDS, MISSION_FA, validateMission, createRun, updateRun, missionSnap, clockReady, clockText, MISSIONS, validateMissionFile } from "../missions.js";
import { CAMPAIGN_KEY, campaignLoad, campaignSave, campaignRecord, campaignUnlocked, missionByKey, missionIndex, missionName, missionBrief } from "../campaign.js";
import { MASTERS_KEY, MASTERS_CAP, MASTERS_SORTS, masterScore, masterEntry, mastersAdd, mastersDelete, mastersSort, mastersLoad, mastersSave } from "../masters.js";
import { CLOUD_KEY_MIN, CLOUD_KEY_MAX, CLOUD_DATA_MAX, CLOUD_FA, cloudKeyHash, validCloudKey } from "../cloud.js";
import { resolveSocketUrl } from "../selfhost.js";
import { hasMarket, tradeQuote, applyTrade, MARKET_TABS, marketTabOf, marketSelected, marketTrader, marketStage, tradeLocked, stageRank } from "../market.js";
import { startAI, stepAI, aiRandAt, aiDifficulty, aiRaidPlan, aiPersonality, aiPersonalityName, aiRaidUnitType, AI_OWNER } from "../ai.js";
import { drawMinimap, minimapCell, panForCell, paintMapThumb, MINIMAP_W, MINIMAP_H, MM_KEEP_STAR } from "../minimap.js";
import { WALL_LINE_MAX, isLineDragType, wallLineTiles, blockLineIfAnyInvalid } from "../wallline.js";
import {
  PINCH_ZOOM_MIN, PINCH_ZOOM_MAX, LONG_PRESS_MS, LONG_PRESS_SLOP,
  pinchDist, pinchZoom, zoomStep, pinchMid, longPressFired, longPressMoved,
  DRAG_PAN_SLOP, dragMovedFar, panForDrag, ARROW_PAN_STEP, EDGE_PAN_MARGIN, EDGE_PAN_STEP, arrowPanDelta, edgePanDir,
} from "../gestures.js";
import { validateConfig } from "../schema.js";
import {
  GROUP_SLOTS, freshGroups, groupIndex, saveGroup, recallGroup,
} from "../groups.js";
import { BANNED_NAMES, scanBanned, scanContent } from "../legal.js";
import { runFirstTenScenario, FIRST_TEN_TICKS } from "../firstten.js";
import {
  A11Y_PALETTES, A11Y_SCALES, KEY_ACTIONS, DEFAULT_KEYS, KEY_ACTION_FA,
  validPalette, clampScale, validKeyCode, normalizeKeys, cycleSpeed,
} from "../a11y.js";
import {
  VOL_KEY, MAX_EVENTS_PER_TICK, loadVolumes, saveVolumes,
  diffSoundEvents, countWalking, soundSnapshot, createSoundManager,
} from "../sound.js";
import {
  REPLAY_V, REPLAY_KEY, REPLAY_CMD_CAP, createRecorder, recordCmd, validateReplayLog,
  newSoloFromSeed, runReplay, saveReplaySlot, loadReplaySlot, verifyReplayAsync,
  REF_REPLAY_V, validateRefReplay, verifyRefReplay, fetchRefReplay,
} from "../replay.js";
import {
  MAP_V, PATCH_CAP, CUSTOM_KEY, BRUSHES, createMapDoc, patchesList, patchCount,
  baseTerrain, applyPatches, customTerrain, paintCells, clearPatches,
  validateMapDoc, normalizeMapDoc, exportMapDoc, importMapDoc,
  validatePlayable, namedMapByKey, mapNameFor, saveCustomSlot, loadCustomSlot,
} from "../mapedit.js";
import { createMenuNav, MENU_PAGES } from "../menunav.js";
import { nextHint, HINT_STEPS, hintBuilding } from "../hints.js";
import { taxInfo, rationInfo, policySummary, advisorWarnings, warnAlarmKeys, innInfo, religionInfo, fearInfo, approxRes, eatGauge, eatMeter, foodInfo, foodReport, granaryInterior, treasuryInfo, stockpileInterior, stockpilePiles, STOCKPILE_TYPES, STOCK_COLORS, scribeMood, scribeReports, meritRows, sortMerit, powerTier, POWER_COLORS } from "../advisor.js";
import { enableMp, MP_MAX, mpClearSpawns, MP_SPAWN_ANCHOR, INPUT_DELAY, stateHash, updateMpAlive, lootEliminated } from "../mp.js";
import { placeKeepFor } from "../construction.js";
import { validRoomPassword, roomRowHTML, liveRowHTML, myGameRowHTML, roomHostSlot, isRoomHost, hostStar, validMpSession, normalizeMyGames, upsertMyGameList, markMyGameDoneList, removeMyGameList, desyncReportOf } from "../lobby.js";
import { zipStore, zipParse, crc32 } from "../../tools/zip-store-lib.mjs";
import { tstCases } from "./tst-phase6.js";
import { mpCases } from "./mp.js";
import { serverCases } from "./server.js";
import { must, fresh, mpFresh, srvCode, srvMake, srvRoom, srvInp, sim, simC, simT, completeAll, rawTicks, grassNear, needBarracks, stubCtx, blankMap, siteNear, aiSim, aiFreshPers, grassInBand, placeGateAt, putNear } from "./fixtures.js";
import { groupCases, legalCases, firstTenCases, schemaCases } from "./basics.js";
import { soundCases } from "./sound.js";
import { gestureCases } from "./gesture.js";
import { mapeditCases } from "./mapedit.js";
import { dataCases } from "./data.js";
import { hardeningCases } from "./hardening.js";
import { missionCases } from "./mission.js";
import { keepCases } from "./keep.js";
import { mastersCases } from "./masters.js";
import { cloudCases } from "./cloud.js";
import { trainCases } from "./train.js";
import { wallCases } from "./wall.js";
import { pathCases } from "./path.js";
import { lordCases } from "./lord.js";
import { gfxCases } from "./gfx.js";
import { balanceCases } from "./balance.js";
import { simCases } from "./sim.js";
import { replayCases } from "./replay.js";
import { aiCases } from "./ai.js";
import { constCases } from "./const.js";
import { combatCases } from "./combat.js";
import { a11yCases } from "./a11y.js";
import { econCases } from "./econ.js";
import { persistCases } from "./persist.js";
import { advisorCases } from "./advisor.js";
import { sysCases } from "./sys.js";
import { costCases } from "./costs.js";
import { fireCases } from "./fire.js";
import { truceCases } from "./truce.js";
import { arabCases } from "./arab.js";
import { ballistaCases } from "./ballista.js";
import { stanceCases } from "./stance.js";
import { aggroCases } from "./aggro.js";
import { fortCases } from "./fort.js";
import { towerCases } from "./tower.js";
import { gateCases } from "./gate.js";
import { gatecaptureCases } from "./gatecapture.js";
import { siegeCases } from "./siege.js";
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
// --- 0.160.0: غیبت پله (§11.3-11.4/بندهای 269-272) + غیبت خندق/پل (§11.1/بند 264 + §11.6/بندهای 276/278/279) + غیبت محاصره سواربرج (§11.7/بندهای 281-283) + غیبت روغن/قیر (§11.5/بند 274 + §11.8/بندهای 284-287) ---
function absenceCases() {
  return [t_stairs_absence, t_moatdraw_absence, t_towermounted, t_oil_absence];
}

// غیبت پله (0.160.0 - §11.3/بند 269 + §11.4/بندهای 270-272): نه بنای پله
// نه لایه ارتفاع/بالای‌دیوار در موتور است؛ استقرار در برج آنی و بی‌نیاز از
// دیوار مجاور/پله می‌ماند (انحراف ثبت‌شده از «ورود از طریق دیوار»).
function t_stairs_absence() {
  must(!CONFIG.BUILDINGS.stairs && !CONFIG.BUILDINGS.staircase, "بنای پله در کاتالوگ نیست");
  must(!Object.values(CONFIG.BUILDINGS).some((b) => b && (b.wallTop || b.needsStairs)), "هیچ بنا کلید wallTop/needsStairs ندارد");
  const f = fresh();
  f.state.resources.wood = 500; f.state.resources.stone = 500;
  const tw = putNear(f.state, f.terrain, f.W, f.H, "برج", 20, 20, CONFIG.BUILDINGS.tower);
  must(tw.ok, "برج ساخته شد");
  completeAll(f.state);
  const far = spawnUnit(f.state, "bowman", 5.5, 5.5, 0);
  must(far.z === undefined && far.wallTop === undefined && far.level === undefined, "یگان لایه ارتفاع ندارد");
  must(garrisonUnit(f.state, far, tw.building).ok, "استقرار دوربرد دور از برج آنی است (بی‌نیاز از دیوار/پله)");
  return { name: "غیبت پله", pass: true, detail: "vacuous + استقرار آنی" };
}

// غیبت خندق و پل متحرک (0.160.0 - §11.1/بند 264 + §11.6/بندهای 276/278/279):
// نه خندق نه پل نه طرح حفر در موتور است؛ زمین کم‌ارتفاع/بلند ندارد (۴ تایل
// چمن/آب/سنگ/واحه)؛ پس حذف/پرکردن خندق هم گزاره خلاست.
function t_moatdraw_absence() {
  must(!CONFIG.BUILDINGS.moat && !CONFIG.BUILDINGS.drawbridge && !CONFIG.BUILDINGS.digsite, "خندق/پل/طرح در کاتالوگ نیست");
  must(!Object.keys(CONFIG.BUILDINGS).some((k) => /moat|drawbridge|dig/i.test(k)), "هیچ بنای خندقی نیست");
  const f = fresh();
  must(f.state.moat === undefined && f.state.digPlan === undefined, "وضعیت طرح/خندق ندارد");
  must(f.state.resources.pitch === undefined, "منبع قیر برای ترانشه نیست");
  simC(f.state, f.terrain, 50);
  must(!f.state.buildings.some((b) => /moat|drawbridge|dig/i.test(b.type)), "پس از ۵۰ تیک هم خندقی نیست");
  return { name: "غیبت خندق و پل", pass: true, detail: "vacuous" };
}

// غیبت محاصره سواربرج (0.160.0 - §11.7/بندهای 281-283): نه engineer نه
// mangonel نه شکاف سوارشده در موتور است؛ آتش برج‌ها فقط سلاح خودی + گاریسون
// دوربرد است؛ منجنیق/تربوشه/بالیستا گاریسون نمی‌شوند (NOT_RANGED).
function t_towermounted() {
  must(UNITS.engineer && !UNITS.mangonel, "مهندس یگان است (0.167.0)؛ منجنیق‌سواری نیست");
  must(!Object.values(UNITS).some((d) => d && d.mountedSiege), "محاصره سوارشده نیست");
  must(!Object.keys(UNITS).some((k) => /mounted|mangonel/i.test(k)), "هیچ یگان سوارشده‌ای نیست");
  const sq = CONFIG.BUILDINGS.squaretower, ro = CONFIG.BUILDINGS.roundtower;
  must(!!(sq && sq.weapon) && !sq.mountSlots && !sq.mounted, "مربعی سلاح دارد ولی شکاف سوار ندارد");
  must(!!(ro && ro.weapon) && !ro.mountSlots && !ro.mounted, "گرد سلاح دارد ولی شکاف سوار ندارد");
  const f = fresh();
  f.state.resources.wood = 500; f.state.resources.stone = 500;
  const tw = putNear(f.state, f.terrain, f.W, f.H, "برج", 20, 20, CONFIG.BUILDINGS.tower);
  must(tw.ok, "برج ساخته شد");
  completeAll(f.state);
  const cat = spawnUnit(f.state, "catapult", 5.5, 5.5, 0);
  const gr = garrisonUnit(f.state, cat, tw.building);
  must(gr.ok === false && gr.reason === "NOT_RANGED", "منجنیق گاریسون نمی‌شود");
  return { name: "غیبت محاصره سواربرج", pass: true, detail: "vacuous + NOT_RANGED" };
}

// غیبت روغن داغ و قیر (0.160.0 - §11.5/بند 274 + §11.8/بندهای 284-287):
// نه قیر نه smelter نه منقل نه engineer نه فرمان pour در موتور است؛ آستانه‌های
// موضعی ۱/۳ هم بی‌مصداق‌اند؛ آتش موتور (0.148.0) زنجیره قیر ندارد.
function t_oil_absence() {
  must(!CONFIG.BUILDINGS.oilsmelter && !CONFIG.BUILDINGS.pitchrig && !CONFIG.BUILDINGS.brazier, "smelter/چاله‌قیر/منقل در کاتالوگ نیست");
  must(!Object.keys(CONFIG.BUILDINGS).some((k) => /smelt|brazier|pitch|oil/i.test(k)), "هیچ بنای روغنی نیست");
  must(!!UNITS.engineer, "مهندس یگان است (0.167.0) ولی اپراتور محاصره نیست (بی‌خدمه)");
  const f = fresh();
  must(!("pitch" in f.state.resources) && !("oil" in f.state.resources), "منبع قیر/روغن نیست");
  must(f.state.oil === undefined && f.state.pitchDitch === undefined, "وضعیت روغن/ترانشه ندارد");
  must(!STANCES.pour && !STANCES.oil, "موضع pour/oil نیست");
  return { name: "غیبت روغن و قیر", pass: true, detail: "vacuous" };
}
export { absenceCases };
