// هزینه‌های مرجع و گزینه‌های اتاق (0.250.0 — C-CLN-46): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
// --- 0.147.0: هزینه مرجع کلبه/بناهای دینی (§۸.۵) + گزینه No-Cow (§۱۲.۴) ---
function costCases() {
  return [t_hovel_cost, t_chapel_costs, t_nocow, t_nocow_opt, t_nodogs_opt];
}

// هزینه مرجع کلبه (وضعیت ۴۵۵ — §۸.۵): ۶ چوب + ۸ مسکن؛ مسکن از داده دست‌نخورده.
function t_hovel_cost() {
  const hd = CONFIG.BUILDINGS.hut;
  must(hd && hd.cost && hd.cost.wood === 6 && Object.keys(hd.cost).length === 1, "کلبه باید فقط ۶ چوب بخواهد");
  must(HUT_HOUSING === 8 && HUT_HOUSING === TUNING.housing.hut, "مسکن کلبه همان ۸ از داده می‌ماند");
  const { W, H, terrain, state } = fresh();
  const w0 = state.resources.wood;
  const p = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(p.ok, "کلبه باید قرار گیرد");
  must(state.resources.wood === w0 - 6, `۶ چوب کم شود، شد ${w0 - state.resources.wood}`);
  return { name: "هزینه مرجع کلبه", pass: true, detail: "۶ چوب + ۸ مسکن" };
}

// هزینه مرجع بناهای دینی (وضعیت ۴۵۶–۴۵۸ — §۸.۵): نمازخانه ۲۵۰ / کلیسا ۵۰۰ /
// کلیسای جامع ۱۰۰۰ طلا؛ ظرفیت/کشیش/پاداش از داده دست‌نخورده (بندهای ۷۲–۷۵).
function t_chapel_costs() {
  must(CONFIG.BUILDINGS.chapel.cost.gold === 250 && Object.keys(CONFIG.BUILDINGS.chapel.cost).length === 1, "نمازخانه ۲۵۰ طلا");
  must(CONFIG.BUILDINGS.church.cost.gold === 500 && Object.keys(CONFIG.BUILDINGS.church.cost).length === 1, "کلیسا ۵۰۰ طلا");
  must(CONFIG.BUILDINGS.cathedral.cost.gold === 1000 && Object.keys(CONFIG.BUILDINGS.cathedral.cost).length === 1, "جامع ۱۰۰۰ طلا");
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 2000;
  const g0 = state.resources.gold;
  must(tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.chapel).ok, "نمازخانه ساخته شود");
  must(state.resources.gold === g0 - 250, "۲۵۰ طلا کم شود");
  must(tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.church).ok, "کلیسا ساخته شود");
  must(tryPlace(state, terrain, W, H, 12, 12, CONFIG.BUILDINGS.cathedral).ok, "جامع ساخته شود");
  must(state.resources.gold === g0 - 1750, "جمعاً ۱۷۵۰ طلا کم شود");
  // طلای ناکافی: رد.
  const f2 = fresh();
  must(!tryPlace(f2.state, f2.terrain, f2.W, f2.H, 5, 1, CONFIG.BUILDINGS.cathedral).ok, "با ۶۰ طلا جامع رد شود");
  return { name: "هزینه مرجع بناهای دینی", pass: true, detail: "۲۵۰/۵۰۰/۱۰۰۰ طلا + کسر/رد" };
}

// گزینه اتاق «No Cow Throwing» (وضعیت ۶۷۷ — §۱۲.۴/بند ۳۰۳): پرچم rules.noCow
// (پیش‌فرض مجاز) → گیت مقدم fireCow با دلیل NOCOW؛ آینه sim؛ ذخیره/هش شرطی.
function t_nocow() {
  // پیش‌فرض: مجاز.
  const d = createState();
  must(d.rules && d.rules.noCow === false, "پیش‌فرض rules.noCow باید false باشد");
  const { W, H, terrain, state } = fresh();
  const cat = spawnUnit(state, "catapult", 20.5, 20.5, 0);
  const dairy = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.dairy);
  must(dairy.ok, "گاوداری");
  completeAll(state);
  must(deployUnit(state, cat).ok && cat.deployed === true, "استقرار");
  dairy.building.cows = 3;
  // بدون پرچم: پرتاب موفق است (رفتار 0.142.0 دست‌نخورده).
  const ok = fireCow(state, [cat.id], 25, 20, 0);
  must(ok.ok && ok.reason === "OK", "پیش‌فرض باید بزند");
  must(state.clouds.length === 1, "ابر نشسته است");
  // با پرچم: NOCOW مقدم بر همه — بدون ابر/مصرف/سردی.
  state.clouds = [];
  cat.cowCd = 0;
  dairy.building.cows = 3;
  state.rules = { noCow: true };
  const ev0 = state.events.length;
  const r = fireCow(state, [cat.id], 25, 20, 0);
  must(!r.ok && r.reason === "NOCOW", "با پرچم باید NOCOW بدهد");
  must(state.clouds.length === 0, "ابری ننشیند");
  must(dairy.building.cows === 3, "گاوی مصرف نشود");
  must(cat.cowCd === 0, "سردی ننشیند");
  must(state.events.length === ev0, "رویدادی ثبت نشود");
  // حتی ورودی نامعتبر هم NOCOW می‌دهد (گیت مقدم).
  must(fireCow(state, [], 25, 20, 0).reason === "NOCOW", "نامعتبر هم NOCOW است");
  // آینه فرمان sim.
  const m = applyCmd(state, terrain, { kind: "firecow", ids: [cat.id], c: 25, r: 20 });
  must(!m.ok && m.reason === "NOCOW", "آینه sim هم NOCOW بدهد");
  // MP: پرچم حریف هم گیت می‌شود.
  const f2 = fresh();
  enableMp(f2.state, 2, ["A", "B"]);
  f2.state.rules = { noCow: true };
  must(fireCow(f2.state, [], 25, 20, 1).reason === "NOCOW", "در MP هم NOCOW است");
  // نام دلیل در هر دو زبان.
  must(t("game.firecow.NOCOW").length > 0, "نام فارسی NOCOW");
  withLang("en", () => {
    must(t("game.firecow.NOCOW") === "Cow throwing is disabled in this room", "نام en NOCOW");
  });
  // ذخیره: پرچم می‌ماند؛ قدیمی (بی‌rules) = مجاز؛ خراب رد می‌شود.
  const h1 = stateHash(state);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.rules && loaded.rules.noCow === true, "پرچم در ذخیره می‌ماند");
  must(stateHash(loaded) === h1, "هش پس از load باید بخواند");
  const old = JSON.parse(serializeJSON(state));
  delete old.rules;
  must(deserialize(old).rules.noCow === false, "ذخیره قدیمی = مجاز");
  const bad = JSON.parse(serializeJSON(state));
  bad.rules = { noCow: "yes" };
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "پرچم خراب باید رد شود");
  // هش: پرچم فعال هش را عوض می‌کند (تفکیک)، ولی خاموش هیچ churn ندارد.
  const s2 = createState();
  must(stateHash(s2) === stateHash(createState()), "دو وضعیت خاموش هش یکسان دارند");
  s2.rules = { noCow: true };
  must(stateHash(s2) !== stateHash(createState()), "پرچم فعال هش را عوض می‌کند");
  return { name: "گزینه No-Cow اتاق", pass: true, detail: "گیت NOCOW + آینه + ذخیره/هش" };
}
// __T_NOCOW_OPT__
// پین گزینه اتاق No-Cow (0.178.0 — بند 728/§14.2): چک‌باکس + لیبل دوزبانه؛
// اجرا (گیت NOCOW/آینه/ذخیره) از 0.147.0 با t_nocow پوشش دارد.
function t_nocow_opt() {
  if (typeof document === "undefined" || !document.getElementById("mpCard")) return { name: "پین No-Cow", pass: true, detail: "بدون DOM رد شد" };
  const c = document.getElementById("mpNoCowInput");
  must(!!c && c.type === "checkbox", "چک‌باکس mpNoCowInput هست");
  must(t("ui.mp.noCow") !== "ui.mp.noCow" && t("ui.mp.noCow").length > 0, "لیبل fa");
  const en = withLang("en", () => t("ui.mp.noCow"));
  must(en !== "ui.mp.noCow" && en.length > 0, "لیبل en");
  c.checked = true;
  must(c.checked === true, "تیک می‌ماند");
  c.checked = false;
  return { name: "پین No-Cow", pass: true, detail: "چک‌باکس + دوزبانه" };
}


// __T_NODOGS_OPT__
// پین گزینه اتاق No-Dogs (0.178.0 — بند 729/§14.2): چک‌باکس + لیبل دوزبانه؛
// اجرا (گیت NODOGS/ساخت/آزادسازی) با t_wardogs پوشش دارد.
function t_nodogs_opt() {
  if (typeof document === "undefined" || !document.getElementById("mpCard")) return { name: "پین No-Dogs", pass: true, detail: "بدون DOM رد شد" };
  const c = document.getElementById("mpNoDogsInput");
  must(!!c && c.type === "checkbox", "چک‌باکس mpNoDogsInput هست");
  must(t("ui.mp.noDogs") !== "ui.mp.noDogs" && t("ui.mp.noDogs").length > 0, "لیبل fa");
  const en = withLang("en", () => t("ui.mp.noDogs"));
  must(en !== "ui.mp.noDogs" && en.length > 0, "لیبل en");
  c.checked = true;
  must(c.checked === true, "تیک می‌ماند");
  c.checked = false;
  return { name: "پین No-Dogs", pass: true, detail: "چک‌باکس + دوزبانه" };
}
export { costCases };
