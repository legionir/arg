// انجمن‌ها (0.259.0 — C-CLN-74): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
function guildsCases() {
  return [t_guilds];
}

// انجمن‌ها (0.167.0 — §8.1/ردیف‌های 129-130 + §9.3/بندهای 172-174): دو بنای
// انجمن (۱۰چوب+۱۰۰طلا مرجع) + سه یگان طلایی (مهندس ۳۰/نردبان‌بر ۴/حفار ۳۰)؛
// گیت NO_ENG_GUILD/NO_TUN_GUILD؛ صف روی بنای انجمن؛ تحویل + پرچم rally؛ ذخیره/هش.
// انحراف‌های ثبت‌شده: اداره محاصره (مهندس) + عبور از دیوار (نردبان‌بر) + حفر
// زیر دیوار (حفار) در موتور نیستند (vacuous — تصمیم‌های 0.161.0/0.160.0)؛
// یگان‌ها پیاده‌نظام سبک‌اند (نردبان‌بر تند/شکننده، مهندس سفت، حفار میانی).
function t_guilds() {
  for (const [id, w, h] of [["engineerguild", 3, 2], ["tunnelerguild", 3, 2]]) {
    const d = CONFIG.BUILDINGS[id];
    must(!!d && d.w === w && d.h === h, "ابعاد انجمن " + id + " باید ۳×۲ باشد");
    must(d.cost && d.cost.wood === 10 && d.cost.gold === 100, "هزینه مرجع انجمن " + id + " باید ۱۰چوب+۱۰۰طلا باشد");
    must(d.rules && d.rules.unique === true, "انجمن " + id + " یکتاست");
    must(d.category === "town", "دسته انجمن town است");
  }
  const E = UNITS.engineer, L = UNITS.ladderman, T = UNITS.tunneler;
  must(E && E.side === "player" && !E.noHire && E.cost, "مهندس قابل‌استخدام است");
  must(E.requires === "engineerguild" && E.building === "engineerguild", "مهندس از انجمن مهندسین است");
  must(E.goldCost === 30 && E.cost.gold === 30 && E.cost.food === 0 && !E.requiresWeapon && Array.isArray(E.equip) && E.equip.length === 0, "مهندس ۳۰ طلای بی‌سلاح است");
  must(E.hp === 55 && E.dmg === 5 && E.armor === 1 && E.trainTicks === 60, "آمار مهندس ۵۵/۵/۱/۶۰ است");
  must(L && L.requires === "engineerguild" && L.goldCost === 4 && L.cost.gold === 4 && L.cost.food === 0, "نردبان‌بر ۴ طلاست");
  must(L.hp === 20 && L.dmg === 4 && L.speed === 3.8 && L.trainTicks === 30, "نردبان‌بر ۲۰جان/تند/۳۰تیک است");
  must(L.canClimbLadder === false, "نردبان‌بر بالا نمی‌رود (مکانیک غایب)");
  must(T && T.requires === "tunnelerguild" && T.goldCost === 30 && T.cost.gold === 30, "حفار ۳۰ طلاست");
  must(T.hp === 40 && T.dmg === 6 && T.trainTicks === 50 && T.canDigMoat === false, "حفار ۴۰/۶/۵۰ است و حفر نمی‌کند");
  must(t("game.unit.engineer.name").length > 0 && t("game.unit.ladderman.name").length > 0 && t("game.unit.tunneler.name").length > 0, "نام فارسی یگان‌ها");
  must(t("game.building.engineerguild.name").length > 0 && t("game.building.tunnelerguild.name").length > 0, "نام فارسی انجمن‌ها");
  withLang("en", () => {
    must(UNITS.engineer.name === "Engineer" && UNITS.ladderman.name === "Ladderman" && UNITS.tunneler.name === "Tunneler", "نام en یگان‌ها");
    must(CONFIG.BUILDINGS.engineerguild.name === "Engineer Guild" && CONFIG.BUILDINGS.tunnelerguild.name === "Tunneler Guild", "نام en انجمن‌ها");
  });
  const f = fresh();
  needBarracks(f.state, f.terrain, f.W, f.H);
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد ساخته شد");
  const spot = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
  must(!!spot, "جای تحویل هست");
  for (const [type, want] of [["engineer", "NO_ENG_GUILD"], ["ladderman", "NO_ENG_GUILD"], ["tunneler", "NO_TUN_GUILD"]]) {
    const v = validateHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], type, 0);
    must(!v.ok && v.reason === want, type + " بی‌انجمن باید " + want + " بدهد، داد " + v.reason);
  }
  f.state.resources.wood = 500; f.state.resources.gold = 500;
  const s1 = siteNear(f.terrain, f.state.occ, f.W, f.H, 10, 10, 3, 2);
  const s2 = siteNear(f.terrain, f.state.occ, f.W, f.H, 40, 40, 3, 2);
  must(!!s1 && !!s2, "جای انجمن‌ها هست");
  const g1 = tryPlace(f.state, f.terrain, f.W, f.H, s1[0], s1[1], CONFIG.BUILDINGS.engineerguild, 0);
  const g2 = tryPlace(f.state, f.terrain, f.W, f.H, s2[0], s2[1], CONFIG.BUILDINGS.tunnelerguild, 0);
  must(g1.ok && g2.ok, "هر دو انجمن ساخته شدند");
  completeAll(f.state);
  const g0 = f.state.resources.gold, f0 = f.state.resources.food;
  const q = queueHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "ladderman", 0);
  must(q.ok, "سفارش نردبان‌بر");
  const host = f.state.buildings.find((b) => b.id === q.bld);
  must(host && host.type === "engineerguild", "صف روی انجمن می‌نشیند");
  must(f.state.resources.gold === g0 - 4 && f.state.resources.food === f0, "فقط ۴ طلا کم شد");
  const c = cancelTrain(f.state, q.bld, 0, 0);
  must(c.ok && f.state.resources.gold === g0 && f.state.resources.food === f0, "لغو = بازپرداخت کامل ۴ طلا");
  must(setRally(f.state, "engineer", 30, 30, 0).ok, "پرچم مهندس");
  must(queueHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "engineer", 0).ok, "سفارش مهندس");
  must(queueHire(f.state, f.terrain, f.W, f.H, spot[0], spot[1], "tunneler", 0).ok, "سفارش حفار");
  simT(f.state, f.terrain, 70); // trainTicks مهندس = ۶۰
  const eng = f.state.units.find((u) => u.type === "engineer");
  const tun = f.state.units.find((u) => u.type === "tunneler");
  must(!!eng && !!tun, "هر دو تحویل شدند");
  must(eng.order && eng.order.kind === "move" && eng.order.c === 30 && eng.order.r === 30, "مهندس به پرچم می‌رود نه نقطه کلیک");
  must(pitCostFor("engineer") === 1 && pitCostFor("ladderman") === 1 && pitCostFor("tunneler") === 1, "گودال برای هر سه سبک ۱ است");
  const h1 = stateHash(f.state);
  const loaded = deserializeJSON(serializeJSON(f.state));
  must(stateHash(loaded) === h1, "هش پس از load می‌خواند");
  return { name: "انجمن‌ها", pass: true, detail: "بنا+یگان+گیت+صف+پرچم+ذخیره" };
}
export { guildsCases };
