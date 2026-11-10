// تصرف دروازه و حفر (0.255.0 — C-CLN-61): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
// --- 0.158.0: تصرف دروازه (S11.1/بند 263) + ستون حفر (S11.6/بند 277) + تونل/خندق (S11.6/بند 280) + اعداد گودال (S18.3/بند 290) ---
function gatecaptureCases() {
  return [t_gatecapture, t_gatereach, t_gatemulti, t_gatecapture_row110, t_digcolumn, t_tunnelmoat, t_pitnumbers];
}

// تصرف دروازه (0.158.0 - S11.1/بند 263): ناحیه ردپا + 0.6؛ مالک بیگانه +
// باز + رویداد + پاکسازی هدف/مسیر؛ سولو دشمن -> 9 / خودی -> 0؛ MP اسلات مهاجم.
function t_gatecapture() {
  const f = fresh();
  f.state.resources.wood = 500;
  const g = { building: placeGateAt(f.state, f.terrain, f.W, f.H, 30, 30) };
  must(toggleGate(f.state, g.building).ok, "بستن دروازه");
  must(g.building.open === false, "بسته است");
  const cx = g.building.c + 0.5, cy = g.building.r + 0.5;
  const e1 = spawnUnit(f.state, "swordsman", cx, cy);
  e1.path = [[1, 1]]; e1.targetKind = "bld"; e1.targetId = g.building.id;
  const s1 = spawnUnit(f.state, "soldier", 5.5, 5.5, 0);
  s1.path = [[2, 2]];
  simC(f.state, f.terrain, 1);
  must(g.building.owner === 9, "تصرف شد (مالک 9)");
  must(g.building.open === true, "باز شد");
  must(f.state.events.some((e) => typeof e === "string" && e.includes("تصرف")), "رویداد تصرف ثبت شد");
  must(!(e1.targetKind === "bld" && e1.targetId === g.building.id), "هدف دروازه‌ای مهاجم پاک شد");
  must(e1.path === null && s1.path === null, "مسیرها باطل شد");
  const occE = occForSide(f.state, "enemy");
  must(occE[g.building.r * f.W + g.building.c] === 0, "دشمن از تصرف‌شده باز می‌گذرد");
  must(walkable(f.state, f.terrain, f.W, f.H, cx, cy, "enemy", 0) === true, "walkable دشمن باز است");
  g.building.open = false;
  must(walkable(f.state, f.terrain, f.W, f.H, cx, cy, "enemy", 0) === false, "بسته سد است");
  g.building.open = true;
  // بازپس‌گیری با حضور خودی.
  e1.dead = true;
  const s2 = spawnUnit(f.state, "soldier", cx, cy, 0);
  simC(f.state, f.terrain, 1);
  must(g.building.owner === 0, "بازپس گرفته شد");
  simC(f.state, f.terrain, 1);
  must(g.building.owner === 0, "دروازه خودی با حضور خودی ثابت می‌ماند");
  // فرمان سولو روی دروازه تصرف‌شده برای مالک قبلی نامعتبر است.
  g.building.owner = 9;
  const denied = applyCmd(f.state, f.terrain, { kind: "gate", bld: g.building.id, owner: 0 });
  must(denied.ok === false && denied.reason === "INVALID", "تغییر دروازه بیگانه رد می‌شود");
  // خودکار-هدف سولو: نه خودی دروازه تصرف‌شده را می‌زند نه موج.
  const arc = spawnUnit(f.state, "bowman", g.building.c + 4.5, cy, 0);
  simC(f.state, f.terrain, 1);
  must(arc.targetKind === null, "کماندار خودی دروازه تصرف‌شده را هدف نمی‌گیرد");
  const e2 = spawnUnit(f.state, "swordsman", g.building.c + 6.5, cy);
  simC(f.state, f.terrain, 1);
  must(!(e2.targetKind === "bld" && e2.targetId === g.building.id), "موج دروازه تصرف‌شده را نمی‌زند");
  return { name: "تصرف دروازه", pass: true, detail: "سولو رفت/برگشت + گیت‌ها + گذر" };
}

// __T_GATECAPTURE_ROW110__
// تصرف با رسیدن به بالای دروازه (0.181.0 — §1.2/بند 110): جمله دفترچه —
// یگان پیاده دشمن روی ردپا = تصرف (مالک 9 + باز)؛ سرباز خودی = بازپس‌گیری.
function t_gatecapture_row110() {
  const f = fresh();
  f.state.resources.wood = 500;
  const g = placeGateAt(f.state, f.terrain, f.W, f.H, 30, 30);
  must(toggleGate(f.state, g).ok, "بستن دروازه");
  const cx = g.c + 0.5, cy = g.r + 0.5;
  const foe = spawnUnit(f.state, "swordsman", cx, cy);
  must(foe.side === "enemy", "شمشیرزن موج دشمن است");
  simC(f.state, f.terrain, 1);
  must(g.owner === 9, "رسیدن دشمن به بالای دروازه = تصرف");
  must(g.open === true, "پس از تصرف باز است");
  foe.dead = true;
  spawnUnit(f.state, "soldier", cx, cy, 0);
  simC(f.state, f.terrain, 1);
  must(g.owner === 0, "رسیدن خودی = بازپس‌گیری");
  return { name: "تصرف با رسیدن", pass: true, detail: "دشمن می‌گیرد + خودی پس می‌گیرد" };
}

// برد تصرف (0.158.0 - بند 263): چسبیده (1 خانه) می‌گیرد، 2 خانه نه.
function t_gatereach() {
  const f = fresh();
  f.state.resources.wood = 500;
  const g1 = placeGateAt(f.state, f.terrain, f.W, f.H, 20, 20);
  const near = spawnUnit(f.state, "swordsman", g1.c + 1.5, g1.r + 0.5);
  simC(f.state, f.terrain, 1);
  must(g1.owner === 0, "مجاورت تصرف نیست");
  must(near.targetKind === "bld" && near.targetId === g1.id, "مهاجم چسبیده دروازه را می‌زند (نبرد نمی‌خوابد)");
  return { name: "برد تصرف دروازه", pass: true, detail: "فقط ردپا؛ مجاورت = حمله" };
}

// تصرف در MP (0.158.0 - بند 263): مالک = اسلات مهاجم؛ بازپس‌گیری متقابل؛
// گذر دشمن در MP مثل قبل سد است.
function t_gatemulti() {
  const mst = mpFresh(2);
  mst.state.mpres[0].resources.wood = 500;
  const gb = placeGateAt(mst.state, mst.terrain, mst.W, mst.H, 32, 32, 0);
  const cx = gb.c + 0.5, cy = gb.r + 0.5;
  const inv = spawnUnit(mst.state, "soldier", cx, cy, 1);
  mst.state.tick++; stepCombat(mst.state, mst.terrain);
  must(gb.owner === 1, "مالک = اسلات مهاجم");
  must(gb.open === true, "باز شد");
  const occ0 = occForSide(mst.state, "player", 0);
  const occ1 = occForSide(mst.state, "player", 1);
  must(occ0[gb.r * mst.W + gb.c] === 1, "مالک قبلی سد می‌بیند");
  must(occ1[gb.r * mst.W + gb.c] === 0, "مالک تازه گذر دارد");
  must(occForSide(mst.state, "enemy") === mst.state.occ, "گذر دشمن در MP دست‌نخورده");
  inv.dead = true;
  const rec = spawnUnit(mst.state, "soldier", cx, cy, 0);
  mst.state.tick++; stepCombat(mst.state, mst.terrain);
  must(gb.owner === 0, "بازپس‌گیری MP");
  must(rec.dead !== true, "بازپس‌گیر زنده است");
  return { name: "تصرف دروازه در MP", pass: true, detail: "اسلات + گذر + برگشت" };
}

// ستون حفر خندق (0.158.0 - S11.6/بند 277): از جدول‌های مرجع 9.6/9.7؛
// بله = archer/bowman/spearman/slave/maceman/pikeman/arabianBow؛ بقیه خیر.
function t_digcolumn() {
  const DIGGERS = ["archer", "arabianBow", "bowman", "maceman", "pikeman", "slave", "spearman"];
  must(Object.keys(UNITS).length === 28, "28 یگان");
  for (const k of Object.keys(UNITS)) {
    const want = DIGGERS.includes(k);
    must(UNITS[k].canDigMoat === want, "حفر " + k + " باید " + want + " باشد");
  }
  for (const k of Object.keys(UNITS)) must(UNITS[k].canClimbLadder === false, "نردبان " + k + " هنوز false");
  return { name: "ستون حفر خندق", pass: true, detail: "7 حفرکن + نردبان false" };
}

// تونل زیر خندق (0.158.0 - S11.6/بند 280): نه تونل‌زن/مهندس نه خندق در موتور
// است — گزاره خلا (همان الگوی vacuous بندهای 259/267).
function t_tunnelmoat() {
  must(UNITS.tunneler && UNITS.engineer, "حفار/مهندس یگان‌اند (0.167.0) ولی خندق/تونل نیست");
  must(!CONFIG.BUILDINGS.moat && !CONFIG.BUILDINGS.tunnel, "خندق/تونل در کاتالوگ نیست");
  return { name: "تونل زیر خندق (خلا)", pass: true, detail: "vacuous" };
}

// اعداد گودال (0.158.0 - S18.3/بند 290): پیاده 1/2/3 (مرجع) + محاصره سبک 1
// (Catapult 1 مرجع) + رم 17 آسیب/گودال با مصرف کامل (9 گودال = 153 >= 150).
function t_pitnumbers() {
  must(PIT_RAM_DMG === 17, "17 آسیب/گودال");
  must(9 * PIT_RAM_DMG >= 150, "9 گودال رم (جان 150) را می‌اندازد");
  must(pitCostFor("catapult") === 1 && pitCostFor("trebuchet") === 1 && pitCostFor("ballista") === 1, "سبک‌ها 1");
  must(pitCostFor("ram") === KILLPIT_CHARGES, "رم = کل گودال");
  must(pitCostFor("knight") === 2 && pitCostFor("swordsman") === 2, "متوسط 2 (مرجع)");
  must(pitCostFor("pikeman") === 3 && pitCostFor("lord") === 3, "سنگین 3 (مرجع)");
  must(pitCostFor("spearman") === 1 && pitCostFor("maceman") === 1 && pitCostFor("archer") === 1 && pitCostFor("blackmonk") === 1, "سبک 1 (مرجع)");
  const siegeIds = Object.values(UNITS).filter((d) => d && d.siege).map((d) => d.id).sort();
  must(JSON.stringify(siegeIds) === JSON.stringify(["ballista", "catapult", "ram", "trebuchet"]), "محاصره همین 4تاست (siege tower غایب)");
  const f = fresh();
  f.state.resources.wood = 500;
  const p = putNear(f.state, f.terrain, f.W, f.H, "گودال", 10, 10, CONFIG.BUILDINGS.killpit);
  must(p.ok, "گودال ساخته شد");
  completeAll(f.state);
  const cx = p.building.c + 0.5, cy = p.building.r + 0.5;
  const cat = spawnUnit(f.state, "catapult", cx, cy);
  cat.side = "enemy"; // موتور موج (def یگان خودی است)
  simC(f.state, f.terrain, 1);
  must(cat.dead === true && p.building.charges === 2, "منجنیق با 1 گودال می‌میرد و 2 شارژ می‌ماند");
  const f2 = fresh();
  f2.state.resources.wood = 500;
  const rg = grassNear(f2.terrain, f2.state.occ, f2.W, f2.H, 20, 20);
  must(!!rg, "جای رم هست");
  const ram = spawnUnit(f2.state, "ram", rg[0] + 0.5, rg[1] + 0.5);
  ram.side = "enemy"; // موتور موج
  for (let i = 0; i < 9; i++) {
    const pp = tryPlace(f2.state, f2.terrain, f2.W, f2.H, Math.floor(ram.x), Math.floor(ram.r), CONFIG.BUILDINGS.killpit);
    must(pp.ok, "گودال " + i + " ساخته شد");
    completeAll(f2.state);
    simC(f2.state, f2.terrain, 1);
    if (i === 0) must(ram.dead !== true && ram.hp === 150 - PIT_RAM_DMG && pp.building.destroyed === true, "رم اولین گودال را با 133 جان پشت سر می‌گذارد");
    if (i < 8) must(ram.dead !== true, "رم تا گودال 9 زنده است");
  }
  must(ram.dead === true, "رم پس از 9 گودال می‌میرد");
  return { name: "اعداد گودال", pass: true, detail: "سبک 1 + رم 9 گودال" };
}
export { gatecaptureCases };
