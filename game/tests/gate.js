// دروازه (0.254.0 — C-CLN-59): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
// --- 0.157.0: نیاز دروازه (§11.1/بند 257) + جهت دروازه (§11.1/بند 258) + درگ دیوار (§11.2/بند 259) + دیده‌بانی (§11.3/بند 267) ---
function gateCases() {
  return [t_gate_workers, t_gate_sides4, t_walldrag, t_lookout];
}
// دروازه چسبیده به زنجیره (0.157.0: anchorToAny): کلبه + دیوار لنگر + دروازه.

function t_gate_workers() {
  const mk = (withGate) => {
    const f = fresh();
    f.state.resources.wood = 500;
    const hut = putNear(f.state, f.terrain, f.W, f.H, "کلبه لنگر", 4, 4, CONFIG.BUILDINGS.hut);
    must(hut.ok, "کلبه لنگر ساخته شد");
    const site = siteNear(f.terrain, f.state.occ, f.W, f.H, 20, 20, 4, 4);
    must(!!site, "ناحیه ۴×۴ چمن برای حلقه هست");
    const wc = tryPlace(f.state, f.terrain, f.W, f.H, site[0] + 1, site[1] + 1, CONFIG.BUILDINGS.woodcutter);
    must(wc.ok, `چوب‌بری وسط ناحیه ساخته می‌شود، شد ${wc.reason}`);
    const bx = site[0], by = site[1];
    const ring = [[1, 0, false], [2, 0, withGate], [3, 0, false], [3, 1, false], [3, 2, false], [3, 3, false], [2, 3, false], [1, 3, false], [0, 3, false], [0, 2, false], [0, 1, false], [0, 0, false]];
    for (const [dx, dy, gate] of ring) {
      const r = tryPlace(f.state, f.terrain, f.W, f.H, bx + dx, by + dy, CONFIG.BUILDINGS[gate ? "gate" : "wall"]);
      must(r.ok, `حلقه (${bx + dx},${by + dy}) باید ساخته شود، شد ${r.reason}`);
    }
    completeAll(f.state);
    return f;
  };
  const A = mk(false), B = mk(true);
  const w0a = A.state.resources.wood, w0b = B.state.resources.wood;
  simC(A.state, A.terrain, 200); simC(B.state, B.terrain, 200);
  const pa = A.state.resources.wood - w0a, pb = B.state.resources.wood - w0b;
  must(pa > 0 && pb > 0, `تولید باید مثبت باشد: ${pa}/${pb}`);
  must(pa === pb, `حلقه بی‌دروازه و بادروازه باید یکسان تولید کنند: ${pa} در برابر ${pb}`);
  return { name: "کارگران و دروازه", pass: true, detail: `تولید یکسان ${pa} چوب` };
}

// جهت دروازه (0.157.0 — §11.1/بند 258): دروازه ۱×۱ متقارن است و هر ۴ ضلع دیوار می‌پذیرد (anchorToAny).
function t_gate_sides4() {
  const def = CONFIG.BUILDINGS.gate;
  must(def.w === 1 && def.h === 1, "دروازه ۱×۱ متقارن است");
  const f = fresh();
  f.state.resources.wood = 500;
  const hut = putNear(f.state, f.terrain, f.W, f.H, "کلبه", 6, 4, CONFIG.BUILDINGS.hut);
  must(hut.ok, "کلبه ساخته شد");
  const gx = hut.building.c + 2, gy = hut.building.r;
  must(tryPlace(f.state, f.terrain, f.W, f.H, gx, gy, def).ok, "دروازه چسبیده به کلبه ساخته می‌شود");
  must(tryPlace(f.state, f.terrain, f.W, f.H, gx, gy - 1, CONFIG.BUILDINGS.wall).ok, "دیوار شمال دروازه می‌چسبد");
  must(tryPlace(f.state, f.terrain, f.W, f.H, gx, gy + 1, CONFIG.BUILDINGS.wall).ok, "دیوار جنوب دروازه می‌چسبد");
  must(tryPlace(f.state, f.terrain, f.W, f.H, gx + 1, gy, CONFIG.BUILDINGS.wall).ok, "دیوار شرق دروازه می‌چسبد");
  const around = [[gx - 1, gy], [gx + 1, gy], [gx, gy - 1], [gx, gy + 1]];
  must(around.every(([c, r]) => f.state.occ[r * f.W + c] === 1), "هر ۴ ضلع دروازه پر است (غرب = کلبه)");
  return { name: "دروازه چهارسو", pass: true, detail: "اتصال N/S/E/W" };
}

// ساخت دیوار با درگ (0.157.0 — §11.2/بند 259): رها = ساخت + هزینه کافی (مقیاس چوبی ۲چوب/خانه)؛ خط کم‌بضاعت کلاً قرمز (تعامل با بند ۲۶۰).
function t_walldrag() {
  const wall = CONFIG.BUILDINGS.wall;
  must(wall.cost && wall.cost.wood === 2, "دیوار ۲ چوب است (مقیاس چوبی)");
  const f = fresh();
  f.state.resources.wood = 500;
  const hut = putNear(f.state, f.terrain, f.W, f.H, "کلبه", 4, 1, CONFIG.BUILDINGS.hut);
  must(hut.ok, "کلبه لنگر ساخته شد");
  const cells = [[3, 1], [3, 2], [4, 3]];
  const rich = cells.map(([c, r]) => ({ c, r, ok: validate(f.state, f.terrain, f.W, f.H, c, r, wall, 0).ok }));
  must(rich.every((t) => t.ok), "خط ۳تایی با چوب کافی همه ok است");
  must(blockLineIfAnyInvalid(rich) === rich, "خط سالم همان می‌ماند");
  f.state.resources.wood = 0;
  const poor = cells.map(([c, r]) => {
    const v = validate(f.state, f.terrain, f.W, f.H, c, r, wall, 0);
    return { c, r, ok: v.ok, reason: v.reason };
  });
  must(poor.some((t) => !t.ok) && poor.filter((t) => !t.ok).every((t) => t.reason === "INSUFFICIENT"), "با چوب تهی رد = INSUFFICIENT است");
  must(blockLineIfAnyInvalid(poor).every((t) => !t.ok), "خط کم‌بضاعت کلاً قرمز می‌شود");
  return { name: "درگ دیوار", pass: true, detail: "رها=ساخت + قرمز کم‌بضاعت" };
}

// جزئیات دیده‌بانی (0.157.0 — §11.3/بند 267): ارزان (فقط ۱۰ سنگ) + سقف ۵ (کوچک‌ترین تازه‌ها) + بی‌پشتیبانی محاصره + تونل vacuous.
function t_lookout() {
  const lo = CONFIG.BUILDINGS.lookout, tw = CONFIG.BUILDINGS.tower, pe = CONFIG.BUILDINGS.perimeter;
  must(!!lo && lo.cost && lo.cost.stone === 10 && !lo.cost.wood && !lo.cost.gold, "دیده‌بانی فقط ۱۰ سنگ است");
  must((tw.cost.wood || 0) + (tw.cost.gold || 0) > 0, "برج چوب/طلا هم می‌خواهد (گران‌تر است)");
  must(lo.garrisonCap === 5 && pe.garrisonCap === 8, "سقف ۵ کوچک‌ترین تازه‌هاست");
  must(canGarrisonType("bowman") === true, "کماندار گاریسون می‌شود");
  for (const s of ["catapult", "trebuchet", "ram", "ballista"]) must(canGarrisonType(s) === false, `${s} سوار برج نمی‌شود`);
  must(UNITS.tunneler && UNITS.engineer, "حفار/مهندس یگان‌اند (0.167.0) ولی مکانیک تونل نیست");
  const f = fresh();
  f.state.resources.wood = 500; f.state.resources.food = 500; f.state.resources.gold = 500;
  needBarracks(f.state, f.terrain, f.W, f.H);
  const ts = siteNear(f.terrain, f.state.occ, f.W, f.H, 10, 10, 2, 2);
  must(!!ts, "جای دیده‌بانی هست");
  must(tryPlace(f.state, f.terrain, f.W, f.H, ts[0], ts[1], lo).ok, "دیده‌بانی ساخته می‌شود");
  completeAll(f.state);
  const post = f.state.buildings.find((b) => b.type === "lookout");
  const g1 = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
  must(!!g1, "جای استخدام هست");
  const bow = hireUnit(f.state, f.terrain, f.W, f.H, g1[0], g1[1], "bowman");
  must(bow.ok && garrisonUnit(f.state, bow.unit, post).ok, "کماندار مستقر می‌شود");
  const g2 = grassNear(f.terrain, f.state.occ, f.W, f.H, 25, 20);
  must(!!g2, "جای دوم هست");
  const cat = hireUnit(f.state, f.terrain, f.W, f.H, g2[0], g2[1], "catapult");
  must(cat.ok, "استخدام منجنیق موفق است");
  const gr = garrisonUnit(f.state, cat.unit, post);
  must(!gr.ok && gr.reason === "NOT_RANGED", `منجنیق سوار نمی‌شود، شد ${gr.reason}`);
  return { name: "جزئیات دیده‌بانی", pass: true, detail: "ارزان + سقف ۵ + بی‌محاصره" };
}
export { gateCases };
