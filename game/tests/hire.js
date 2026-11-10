// تحویل نیرو و پرچم تجمع (0.259.0 — C-CLN-73): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
function hireCases() {
  return [t_campwalk, t_mercpost, t_rally];
}

// ظهور در campfire و راه رفتن تا تحویل (0.166.0 - §9.1/بند 168): تحویل صف با
// ستاد زنده = ظهور در درِ ستاد + فرمان move تا نقطه کلیک (یا پرچم)؛ بی‌ستاد =
// رفتار قدیمی (ظهور در نقطه).
function t_campwalk() {
  const f = fresh();
  needBarracks(f.state, f.terrain, f.W, f.H);
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد ساخته شد");
  const keep = f.state.buildings.find((b) => b.type === "keep");
  const spot = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
  must(!!spot, "جای تحویل هست");
  must(queueHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "soldier", 0).ok, "سفارش سرباز");
  simT(f.state, f.terrain, 60); // trainTicks سرباز = ۵۰
  const me = f.state.units.find((u) => u.type === "soldier");
  must(!!me, "سرباز تحویل شد");
  const near = Math.max(keep.c - me.x, me.x - (keep.c + keep.w - 1), keep.r - me.r, me.r - (keep.r + keep.h - 1));
  must(near <= 8, "ظهور در درِ ستاد است");
  must(me.order && me.order.kind === "move" && me.order.c === spot[0] && me.order.r === spot[1], "در راه نقطه کلیک است");
  const g = fresh();
  needBarracks(g.state, g.terrain, g.W, g.H);
  const s2 = grassNear(g.terrain, g.state.occ, g.W, g.H, 20, 20);
  must(!!s2, "جای تحویل بی‌ستاد هست");
  must(queueHire(g.state, g.terrain, g.W, g.H, s2[0], s2[1], "soldier", 0).ok, "سفارش بی‌ستاد");
  simT(g.state, g.terrain, 60);
  const me2 = g.state.units.find((u) => u.type === "soldier");
  must(!!me2, "تحویل بی‌ستاد هم هست");
  must(Math.abs(me2.x - (s2[0] + 0.5)) < 0.6 && Math.abs(me2.r - (s2[1] + 0.5)) < 0.6, "بی‌ستاد در نقطه ظاهر می‌شود");
  must(!me2.order, "بی‌ستاد فرمانی نمی‌گیرد");
  return { name: "ظهور در campfire", pass: true, detail: "درِ ستاد + راه + fallback" };
}

// پست مزدور (0.166.0 - §9.1/بند 169): استخدام طلایی مزدورها (فقط طلا، بی‌غذا
// بی‌سلاح) با پست زنده؛ وگرنه مسیر سربازخانه قدیمی. صف/لغو/ویرانی/ذخیره/هش.
function t_mercpost() {
    must(CONFIG.BUILDINGS.mercpost.cost && CONFIG.BUILDINGS.mercpost.cost.wood === 10 && !("stone" in CONFIG.BUILDINGS.mercpost.cost), "هزینه مرجع پست ۱۰چوب است (بی‌سنگ)");
must(CONFIG.BUILDINGS.mercpost && CONFIG.BUILDINGS.mercpost.w === 3, "پست مزدور ۳×۲ است");
  for (const [id, mg] of [["arabian", 70], ["arabianBow", 50], ["slinger", 27], ["assassin", 70], ["firethrower", 55], ["horseArcher", 150]]) {
    must(UNITS[id].merc === true && UNITS[id].mercGold === mg, "بهای طلایی " + id + " باید " + mg + " باشد");
  }
  const f = fresh();
  needBarracks(f.state, f.terrain, f.W, f.H);
  f.state.resources.food = 0; f.state.resources.swords = 0; f.state.resources.bows = 0; f.state.resources.gold = 200;
  const legacy = validateHire(f.state, f.terrain, f.W, f.H, 5, 5, "arabianBow", 0);
  must(!legacy.ok && legacy.reason === 'INSUFFICIENT', 'بی‌پست: مسیر قدیمی غذا می‌خواهد');
  const site = siteNear(f.terrain, f.state.occ, f.W, f.H, 30, 30, 3, 2);
  must(!!site, "جای پست هست");
  const mp = tryPlace(f.state, f.terrain, f.W, f.H, site[0], site[1], CONFIG.BUILDINGS.mercpost, 0);
  must(mp.ok, "پست ساخته شد");
  simC(f.state, f.terrain, 1);
  const v = validateHire(f.state, f.terrain, f.W, f.H, 5, 5, "arabianBow", 0);
  must(v.ok, "با پست: فقط طلا کافی است");
  const spot = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
  must(!!spot, "جای تحویل هست");
  const g0 = f.state.resources.gold;
  const q = queueHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "arabianBow", 0);
  must(q.ok, "سفارش مزدور");
  must(q.bld === mp.building.id, "صف روی پست می‌نشیند");
  must(f.state.resources.gold === g0 - 50 && f.state.resources.food === 0, "فقط ۵۰ طلا کم شد");
  const host = f.state.buildings.find((b) => b.id === q.bld);
  must(host.train.length === 1 && host.train[0].merc === true, "پرچم merc روی ورودی است");
  const h1 = stateHash(f.state);
  const loaded = deserializeJSON(serializeJSON(f.state));
  must(stateHash(loaded) === h1, "هش پس از load می‌خواند");
  const lh = loaded.buildings.find((b) => b.id === q.bld);
  must(lh.train.length === 1 && lh.train[0].merc === true, "پرچم merc در ذخیره می‌ماند");
  const c = cancelTrain(loaded, q.bld, 0, 0);
  must(c.ok, "لغو موفق است");
  must(loaded.resources.gold === g0 && loaded.resources.food === 0, "بازپرداخت همان ۵۰ طلاست");
  must(queueHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "arabianBow", 0).ok, "سفارش دوم");
  simT(f.state, f.terrain, 50); // trainTicks کماندار عرب = ۵۰
  must(f.state.units.some((u) => u.type === "arabianBow"), "مزدور تحویل شد");
  return { name: "پست مزدور", pass: true, detail: "طلا+صف+لغو+ذخیره" };
}

// پرچم تجمع (0.166.0 - §9.1/بند 170): setRally + فرمان rally + تحویل به پرچم +
// ذخیره/هش + MP. guildهای مهندس/حفار غایب‌اند (vacuous).
function t_rally() {
  must(UNITS.engineer && UNITS.tunneler && UNITS.ladderman, "یگان‌های انجمن‌اند (0.167.0) و پرچم می‌گیرند");
  const f = fresh();
  needBarracks(f.state, f.terrain, f.W, f.H);
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد ساخته شد");
  must(!setRally(f.state, "nosuch", 5, 5, 0).ok, "نوع ناشناس رد است");
  must(!setRally(f.state, "soldier", -1, 5, 0).ok, "بیرون نقشه رد است");
  must(!setRally(f.state, "swordsman", 5, 5, 0).ok, "نوع دشمن رد است");
  const rp = grassNear(f.terrain, f.state.occ, f.W, f.H, 40, 40);
  must(!!rp, "جای پرچم هست");
  must(setRally(f.state, "soldier", rp[0], rp[1], 0).ok, "پرچم سرباز");
  must(f.state.rally["0:soldier"].c === rp[0], "کلید مالک:نوع است");
  const ap = applyCmd(f.state, f.terrain, { kind: "rally", type: "bowman", c: 10, r: 10 });
  must(ap.ok, "فرمان rally از صف می‌آید");
  must(f.state.rally["0:bowman"].r === 10, "پرچم دوم نشست");
  must(setRally(f.state, "engineer", 12, 12, 0).ok, "پرچم مهندس انجمن هم می‌نشیند (0.167.0)");
  must(!applyCmd(f.state, f.terrain, { kind: "rally", type: "bowman", c: -2, r: 0 }).ok, "فرمان بد رد است");
  const spot = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
  must(!!spot, "جای تحویل هست");
  must(queueHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "soldier", 0).ok, "سفارش سرباز");
  simT(f.state, f.terrain, 60);
  const me = f.state.units.find((u) => u.type === "soldier");
  must(!!me, "سرباز تحویل شد");
  must(me.order && me.order.kind === "move" && me.order.c === rp[0] && me.order.r === rp[1], "مقصد پرچم است نه کلیک");
  const h1 = stateHash(f.state);
  const loaded = deserializeJSON(serializeJSON(f.state));
  must(stateHash(loaded) === h1, "هش پس از load می‌خواند");
  must(loaded.rally["0:soldier"].c === rp[0] && loaded.rally["0:bowman"].r === 10, "پرچم‌ها در ذخیره می‌مانند");
  const old = JSON.parse(serializeJSON(f.state));
  delete old.rally;
  const back = deserializeJSON(JSON.stringify(old));
  must(back.rally && Object.keys(back.rally).length === 0, "قدیمی بی‌پرچم = خالی");
  const mst = mpFresh(2);
  must(setRally(mst.state, "soldier", 8, 8, 0).ok && setRally(mst.state, "soldier", 40, 40, 1).ok, "پرچم جداگانه هر اسلات");
  must(mst.state.rally["0:soldier"].c === 8 && mst.state.rally["1:soldier"].c === 40, "کلیدها جدا هستند");
  const bad = JSON.parse(serializeJSON(f.state));
  bad.rally["0:soldier"] = { c: -1, r: 5 };
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "پرچم دست‌کاری‌شده SaveError می‌دهد");
  return { name: "پرچم تجمع", pass: true, detail: "set+فرمان+تحویل+ذخیره+MP" };
}
export { hireCases };
