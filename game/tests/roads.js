// بستن دروازه و جاده (0.256.0 — C-CLN-71): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
function roadsCases() {
  return [t_gateclosure, t_redx, t_roadcost];
}

// بسته‌شدن مسیر (0.165.0 - §19.2/بند 229): دروازه باز = گذرگاه خودی، بسته =
// سد هر دو جناح، ویران‌شده هرگز گذرگاه نیست؛ drawbridge/moat/غرق‌شدن حین حفر
// در موتور نیستند (vacuous — مکمل t_moatdraw_absence/t_tunnelmoat).
function t_gateclosure() {
  const f = fresh();
  f.state.resources.wood = 500;
  const g = placeGateAt(f.state, f.terrain, f.W, f.H, 30, 30);
  const gi = g.r * f.W + g.c;
  must(g.open !== false && gateOpen(g), "دروازه نو باز است");
  must(occForSide(f.state, "player")[gi] === 0, "باز: خودی می‌گذرد");
  must(walkable(f.state, f.terrain, f.W, f.H, g.c + 0.5, g.r + 0.5, "player", 0), "باز: walkable خودی");
  const src = grassNear(f.terrain, f.state.occ, f.W, f.H, g.c - 4, g.r);
  must(!!src, "مبدأ نزدیک دروازه هست");
  must(findPath(f.terrain, occForSide(f.state, "player"), f.W, f.H, src[0], src[1], g.c, g.r), "باز: مسیر تا خود خانه دروازه هست");
  must(toggleGate(f.state, g).ok && g.open === false, "بستن موفق است");
  must(occForSide(f.state, "player")[gi] === 1, "بسته: خودی هم سد می‌بیند");
  must(occForSide(f.state, "enemy")[gi] === 1, "بسته: دشمن سد می‌بیند");
  must(!walkable(f.state, f.terrain, f.W, f.H, g.c + 0.5, g.r + 0.5, "player", 0), "بسته: walkable خودی نیست");
  must(!walkable(f.state, f.terrain, f.W, f.H, g.c + 0.5, g.r + 0.5, "enemy", 0), "بسته: walkable دشمن نیست");
  must(findPath(f.terrain, occForSide(f.state, "player"), f.W, f.H, src[0], src[1], g.c, g.r) === null, "بسته: مسیری تا خانه دروازه نیست");
  g.destroyed = true; g.open = true;
  must(occForSide(f.state, "player")[gi] === 1, "ویران‌شده گذرگاه نیست");
  must(!walkable(f.state, f.terrain, f.W, f.H, g.c + 0.5, g.r + 0.5, "player", 0), "ویران‌شده walkable نیست");
  must(!CONFIG.BUILDINGS.drawbridge && !CONFIG.BUILDINGS.moat && !CONFIG.BUILDINGS.digsite, "پل/خندق/طرح در کاتالوگ نیست");
  must(!Object.keys(CONFIG.BUILDINGS).some((k) => /drawbridge|moat|dig/i.test(k)), "هیچ بنای خندقی نیست");
  must(UNITS.tunneler && UNITS.tunneler.canDigMoat === false, "حفار یگان است ولی حفر نمی‌کند (غرق‌شدن بی‌مصداق)");
  return { name: "بسته‌شدن مسیر", pass: true, detail: "باز/بسته/ویران + خلأ پل/خندق" };
}

// «ضربدر قرمز» (0.165.0 - §19.2/بند 230): شکست NO_PATH = نشان nopath روی
// مقصد (+ «×» بالای سر از mission failed)؛ پله/نردبان/برج‌محاصره نیست پس
// مقصدِ بالای دیوار با پله بی‌مصداق است (vacuous — مکمل t_stairs_absence).
function t_redx() {
  const f = fresh();
  needBarracks(f.state, f.terrain, f.W, f.H);
  const wall = CONFIG.BUILDINGS.wall, gate = CONFIG.BUILDINGS.gate;
  tryPlace(f.state, f.terrain, f.W, f.H, 1, 6, CONFIG.BUILDINGS.hut);
  for (const [c, r] of [[3, 6], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3], [6, 3],
      [6, 4], [6, 5], [4, 5], [4, 4]]) {
    must(tryPlace(f.state, f.terrain, f.W, f.H, c, r, wall).ok, "دیوار زنجیره ساخته شد");
  }
  const g = tryPlace(f.state, f.terrain, f.W, f.H, 5, 5, gate);
  must(g.ok, "دروازه ساخته شد");
  must(toggleGate(f.state, g.building).ok, "دروازه بسته شد");
  hireUnit(f.state, f.terrain, f.W, f.H, 5, 4, "soldier");
  const me = f.state.units[0];
  must(orderMove(f.state, me, 5, 7).ok, "فرمان بیرون صادر می‌شود");
  let guard = 0;
  while (me.mission !== "failed" && guard++ < 60) simC(f.state, f.terrain, 1);
  must(me.mission === "failed", "مأموریت محال failed می‌شود");
  const marks = (f.state.fx || []).filter((e) => e.kind === "nopath");
  must(marks.length >= 1, "نشان قرمز روی مقصد هست");
  must(marks.some((e) => e.x === 5.5 && e.r === 7.5), "نشان دقیقاً روی خانه مقصد است");
  must(!CONFIG.BUILDINGS.stairs && !CONFIG.BUILDINGS.staircase, "پله در کاتالوگ نیست");
  must(UNITS.ladderman && UNITS.ladderman.canClimbLadder === false && !UNITS.siegetower, "نردبان‌بر یگان است ولی بالا نمی‌رود؛ برج محاصره نیست");
  return { name: "ضربدر قرمز", pass: true, detail: "failed + نشان مقصد + خلأ پله" };
}

// هزینه راه (0.165.0 - §19.2/بند 250، vacuous): نه پله نه نردبان نه تونل نه
// جدول هزینه در موتور است؛ مسیریاب یک‌هزینه است (هر گام ۱).
function t_roadcost() {
  must(CONFIG.PATH_COST === undefined && CONFIG.MOVE_COST === undefined, "جدول هزینه در CONFIG نیست");
  must(!Object.keys(CONFIG).some((k) => /^(PATH|MOVE|STAIR|LADDER|TUNNEL)/i.test(k)), "کلید راه/پله در CONFIG نیست");
  for (const k of ["stairs", "staircase", "ladder", "tunnel", "tunnelentrance", "moat", "drawbridge"]) {
    must(!CONFIG.BUILDINGS[k], "بنای " + k + " نیست");
  }
  for (const k of ["siegetower"]) {
    must(!UNITS[k], "یگان " + k + " نیست");
  }
  must(UNITS.ladderman && UNITS.tunneler && UNITS.engineer, "یگان‌های انجمن‌اند (0.167.0) ولی ضریب راه ندارند");
  for (const k of Object.keys(UNITS)) {
    const d = UNITS[k] || {};
    must(d.pathCost === undefined && d.stairMult === undefined && d.ladderMult === undefined && d.tunnelMult === undefined, "ضریب راه در " + k + " نیست");
  }
  const W = 8, H = 8;
  const open = blankMap(W, H);
  const p = findPath(open.terrain, open.occ, W, H, 0, 0, 4, 3);
  must(p && p.length === 4 + 3 + 1, "زمین باز: طول = منهتن+۱ (یک‌هزینه)");
  const W2 = 7, H2 = 7;
  const m2 = blankMap(W2, H2);
  for (let r = 1; r <= 5; r++) m2.occ[r * W2 + 3] = 1;
  const q = findPath(m2.terrain, m2.occ, W2, H2, 1, 3, 5, 3);
  must(!!q, "راه دور میله هست");
  must(q.length === bfsLen(m2.occ, W2, H2, 1, 3, 5, 3), "طول = کوتاه‌ترین گام (BFS)");
  for (let i = 1; i < q.length; i++) {
    must(Math.abs(q[i][0] - q[i - 1][0]) + Math.abs(q[i][1] - q[i - 1][1]) === 1, "گام چهارجهته است");
  }
  return { name: "هزینه راه (خلأ)", pass: true, detail: "بی‌جدول + یک‌هزینه + BFS" };
}

// کوتاه‌ترین طول مسیر (خانه‌شمار، شامل دو سر) روی گرید چهارجهته — مرجع
// مستقل برای پین یک‌هزینه‌بودن findPath (بند 250).
function bfsLen(occ, W, H, sc, sr, gc, gr) {
  const dist = new Int32Array(W * H).fill(-1);
  const qx = [sc], qr = [sr];
  dist[sr * W + sc] = 1;
  let head = 0;
  while (head < qx.length) {
    const c = qx[head], r = qr[head]; head++;
    if (c === gc && r === gr) return dist[r * W + c];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= W || nr >= H) continue;
      if (occ[nr * W + nc] === 1 || dist[nr * W + nc] !== -1) continue;
      dist[nr * W + nc] = dist[r * W + c] + 1;
      qx.push(nc); qr.push(nr);
    }
  }
  return -1;
}


export { roadsCases };
