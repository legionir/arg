// اصطبل و غیبت ناوگراف (0.260.0 — C-CLN-76): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import { absenceCases } from "./absence.js";
import { fortifyCases } from "./fortify.js";
import { ordersCases } from "./orders.js";
import { attackCases } from "./attack.js";
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
function stableCases() {
  return [t_stable, t_navgraph_absence];
}

// اصطبل و اسب (0.168.0 — §8.1/ردیف 419 + §18.1/ردیف 870): بنای 3×2/جان150/
// 20چوب+400طلا(مرجع)/یکتا + 4 اسب با شارژ 600تیکه + گیت NO_STABLE/NO_HORSE شوالیه.
function t_stable() {
  const d = CONFIG.BUILDINGS.stable;
  must(!!d && d.w === 3 && d.h === 2, "اصطبل 3×2 است");
  must(d.cost && d.cost.wood === 20 && d.cost.gold === 400 && !("stone" in d.cost), "هزینه مرجع اصطبل 20چوب+400طلاست");
  must(d.hp === 150 && d.rules && d.rules.unique === true && d.category === "town", "جان/یکتا/رده اصطبل");
  must(HORSES_PER_STABLE === 4 && HORSE_REFILL_TICKS === 600, "مدل 4 اسب + 60 ثانیه");
  const K = UNITS.knight;
  must(K && K.requiresHorse === true && K.requires === "barracks", "شوالیه سربازخانه‌ای اسب‌خواه است");
  must(K.cost.food === 60 && K.cost.gold === 50 && K.requiresWeapon === "swords", "بهای شوالیه 60غ+50ط+شمشیر می‌ماند");
  must(t("game.building.stable.name").length > 0, "نام فارسی اصطبل");
  must(t("game.hire.NO_STABLE").length > 0 && t("game.hire.NO_HORSE").length > 0, "پیام فارسی بی‌اصطبل/بی‌اسب");
  withLang("en", () => {
    must(CONFIG.BUILDINGS.stable.name === "Stable", "نام en اصطبل");
    must(t("game.hire.NO_STABLE") === "Build a stable first", "نام en بی‌اصطبل");
  });
  const f = fresh();
  needBarracks(f.state, f.terrain, f.W, f.H);
  const spot = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
  must(!!spot, "جای تحویل هست");
  const v0 = validateHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "knight", 0);
  must(!v0.ok && v0.reason === "NO_STABLE", "شوالیه بی‌اصطبل باید NO_STABLE بدهد، داد " + v0.reason);
  f.state.resources.wood = 500; f.state.resources.gold = 900;
  const s = siteNear(f.terrain, f.state.occ, f.W, f.H, 10, 10, 3, 2);
  must(!!s, "جای اصطبل هست");
  const p = tryPlace(f.state, f.terrain, f.W, f.H, s[0], s[1], CONFIG.BUILDINGS.stable, 0);
  must(p.ok, "اصطبل ساخته شد");
  completeAll(f.state);
  const st = f.state.buildings.find((b) => b.type === "stable");
  must(st && stableHorses(st) === 4, "اصطبل تازه پر (4 اسب) است");
  f.state.resources.food = 500; f.state.resources.gold = 500;
  const q = queueHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "knight", 0);
  must(q.ok, "سفارش شوالیه");
  const host = f.state.buildings.find((b) => b.id === q.bld);
  must(host && host.type === "barracks", "صف شوالیه روی سربازخانه می‌ماند");
  must(stableHorses(st) === 3, "1 اسب مصرف شد");
  const g0 = f.state.resources.gold, f0 = f.state.resources.food, w0 = (f.state.resources.swords || 0);
  const c = cancelTrain(f.state, q.bld, 0, 0);
  must(c.ok && stableHorses(st) === 4, "لغو اسب را برمی‌گرداند");
  must(f.state.resources.gold === g0 + 50 && f.state.resources.food === f0 + 60, "بازپرداخت کامل بهای شوالیه");
  must((f.state.resources.swords || 0) === w0 + 1, "شمشیر برمی‌گردد");
  for (let i = 0; i < 4; i++) must(queueHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "knight", 0).ok, "سفارش " + (i + 1));
  must(stableHorses(st) === 0, "هر 4 اسب مصرف شدند");
  const v1 = validateHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "knight", 0);
  must(!v1.ok && v1.reason === "NO_HORSE", "اصطبل خالی باید NO_HORSE بدهد، داد " + v1.reason);
  for (let i = 0; i < 600; i++) { f.state.tick++; stepStables(f.state); }
  must(stableHorses(st) === 1, "پس از 600 تیک 1 اسب برگشت");
  for (let i = 0; i < 1800; i++) { f.state.tick++; stepStables(f.state); }
  must(stableHorses(st) === 4, "پس از 2400 تیک پر است");
  simT(f.state, f.terrain, 90); // trainTicks شوالیه = 80
  must(f.state.units.some((u) => u.type === "knight"), "شوالیه تحویل شد");
  const h1 = stateHash(f.state);
  const loaded = deserializeJSON(serializeJSON(f.state));
  must(stateHash(loaded) === h1, "هش پس از load می‌خواند");
  const lst = loaded.buildings.find((b) => b.type === "stable");
  must(lst && lst.horses === 4, "موجودی اسب در ذخیره می‌ماند");
  return { name: "اصطبل و اسب", pass: true, detail: "بنا+گیت+مصرف+لغو+شارژ+ذخیره" };
}


// غیبت ناوگراف چندلایه و HPA/flow-field (0.168.0 — §19.2/بندهای 227-228، vacuous):
// مسیریاب همان A* تک‌لایه زمینی است (CORE-001)؛ نه لایه wallTop/tower/tunnel،
// نه سلسله‌مراتب، نه میدان‌جریان، نه فاصله‌گذاری گروهی در موتور است.
function t_navgraph_absence() {
  must(!Object.values(CONFIG.BUILDINGS).some((b) => b && (b.wallTop || b.wallLayer || b.tunnelLayer)), "هیچ بنا کلید لایه ندارد");
  must(!CONFIG.BUILDINGS.tunnel && !Object.keys(CONFIG.BUILDINGS).some((k) => /walltop|navmesh|gangplank|grapple/i.test(k)), "هیچ بنای لایه‌ای نیست");
  must(!Object.keys(UNITS).some((k) => /flow|flock|formation/i.test(k)), "هیچ یگان گروهی نیست");
  for (const [, dd] of Object.entries(UNITS)) {
    must(dd.z === undefined && dd.layer === undefined && dd.flow === undefined, "یگان بی‌میدان لایه/جریان است");
  }
  const f = fresh();
  must(f.state.flowField === undefined && f.state.navgraph === undefined && f.state.layers === undefined, "وضعیت میدان/گراف ندارد");
  const A = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  const B = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
  must(!!A && !!B, "دو نقطه هست");
  const p = findPath(f.terrain, f.state.occ, f.W, f.H, A[0], A[1], B[0], B[1]);
  must(Array.isArray(p) && p.length > 0, "مسیر تک‌لایه هست");
  for (let i = 1; i < p.length; i++) {
    must(Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]) === 1, "گام‌های مسیر همسایه‌اند");
  }
  return { name: "غیبت ناوگراف چندلایه", pass: true, detail: "vacuous" };
}
export { stableCases };
