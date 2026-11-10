// صلح و محاصره سبک (0.251.0 — C-CLN-49): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
// --- 0.149.0: صلح No Rush (§۱۴.۲/بند ۷۳۰) + مهمات منجنیق (§۱۲.۲) + خط زمانی موج (§۱۹.۴) + برده مشعل‌دار (§۹.۵/§۱۹.۳) ---
// --- 0.149.0: گزینه No Rush (§۱۴.۲/بند ۷۳۰) + مهمات منجنیق (§۱۲.۲/بند ۵۷۸) + خط زمانی موج‌ها (§۱۹.۴/بند ۱۱۷۴) + برده مشعل‌دار (§۱۲.۲/بند ۱۷۷) ---
function truceCases() {
  return [t_norush, t_catapult_ammo, t_wavetimeline, t_timeline_row125, t_slave];
}

// گزینه اتاق «No Rush» (وضعیت ۷۳۰ — §۱۴.۲/بند ۷۳۰): صلح تایمردار آغاز بازی.
// در صلح: ضربه (strike) بی‌اثر + پرتاب گاو NORUSH + سفارش آموزش NORUSH +
// صف در جریان یخ می‌زند؛ پس از peaceUntil همه عادی. ذخیره/هش شرطی.
function t_norush() {
  // پیش‌فرض: بی‌صلح.
  const d = createState();
  must(d.rules && d.rules.noRush === false, "پیش‌فرض rules.noRush باید false باشد");
  must(d.peaceUntil === 0, "پیش‌فرض peaceUntil باید ۰ باشد");
  must(PEACE_TICKS === 1800, "صلح ۱۸۰۰ تیک (۳ دقیقه با HZ=۱۰) است");
  must(peaceActive(d) === false, "بی‌پرچم صلح نیست");
  must(peaceActive(null) === false, "وضعیت تهی صلح نیست");
  // نبرد واقعی: سرباز در برابر دیوار حریف — در صلح نمی‌خورد، پس از صلح می‌خورد.
  const f = fresh();
  if (f.state.ai && f.state.ai.resources) { f.state.ai.resources.wood = 500; f.state.ai.resources.stone = 500; }
  f.state.rules = { noRush: true };
  f.state.peaceUntil = PEACE_TICKS;
  must(peaceActive(f.state) === true, "با پرچم و شمارنده صلح فعال است");
  const ha = putNear(f.state, f.terrain, f.W, f.H, "کلبه لنگر", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(ha.ok, "کلبه لنگر ساخته شود");
  const w = putNear(f.state, f.terrain, f.W, f.H, "دیوار حریف", 7, 1, CONFIG.BUILDINGS.wall, 9);
  must(w.ok, "دیوار حریف ساخته شود");
  w.building.hp = 2000; w.building.maxHp = 2000;
  spawnUnit(f.state, "soldier", 8.5, 2.5, 0);
  completeAll(f.state);
  simC(f.state, f.terrain, 60);
  must(w.building.hp === 2000, `در صلح دیوار نباید خورده باشد، هست ${w.building.hp}`);
  f.state.tick = PEACE_TICKS; // پایان صلح
  must(peaceActive(f.state) === false, "پس از شمارنده صلح تمام است");
  simC(f.state, f.terrain, 120);
  must(w.building.hp < 2000, `پس از صلح دیوار باید خورده باشد، هست ${w.building.hp}`);
  // پرتاب گاو در صلح: NORUSH مقدم بر اعتبارسنجی؛ بی‌اثر کامل.
  const f2 = fresh();
  const cat = spawnUnit(f2.state, "catapult", 20.5, 20.5, 0);
  const dairy = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 5, 5, CONFIG.BUILDINGS.dairy);
  must(dairy.ok, "گاوداری");
  completeAll(f2.state);
  must(deployUnit(f2.state, cat).ok && cat.deployed === true, "استقرار");
  dairy.building.cows = 3;
  const okShot = fireCow(f2.state, [cat.id], 25, 20, 0);
  must(okShot.ok && okShot.reason === "OK", "بی‌صلح باید بزند");
  must(f2.state.clouds.length === 1, "ابر نشسته است");
  f2.state.clouds = [];
  cat.cowCd = 0;
  dairy.building.cows = 3;
  f2.state.rules = { noRush: true };
  f2.state.peaceUntil = PEACE_TICKS;
  const ev0 = f2.state.events.length;
  const r = fireCow(f2.state, [cat.id], 25, 20, 0);
  must(!r.ok && r.reason === "NORUSH", "در صلح باید NORUSH بدهد");
  must(f2.state.clouds.length === 0, "ابری ننشیند");
  must(dairy.building.cows === 3, "گاوی مصرف نشود");
  must(cat.cowCd === 0, "سردی ننشیند");
  must(f2.state.events.length === ev0, "رویدادی ثبت نشود");
  must(fireCow(f2.state, [], 25, 20, 0).reason === "NORUSH", "نامعتبر هم NORUSH است");
  const m = applyCmd(f2.state, f2.terrain, { kind: "firecow", ids: [cat.id], c: 25, r: 20 });
  must(!m.ok && m.reason === "NORUSH", "آینه sim هم NORUSH بدهد");
  // تقدم noCow بر صلح (ممنوعیت مطلق اول).
  f2.state.rules = { noCow: true, noRush: true };
  must(fireCow(f2.state, [cat.id], 25, 20, 0).reason === "NOCOW", "noCow مقدم است");
  // شمارنده صفر با پرچم روشن = بی‌صلح (سازگاری).
  f2.state.rules = { noRush: true };
  f2.state.peaceUntil = 0;
  cat.cowCd = 0;
  dairy.building.cows = 3;
  must(fireCow(f2.state, [cat.id], 25, 20, 0).ok, "با شمارنده صفر پرتاب آزاد است");
  // آموزش در صلح: سفارش NORUSH + یخ صف.
  const f3 = fresh();
  needBarracks(f3.state, f3.terrain, f3.W, f3.H);
  completeAll(f3.state);
  const q0 = queueHire(f3.state, f3.terrain, f3.W, f3.H, 5, 5, "spearman", 0);
  must(q0.ok && q0.reason === "OK", "بی‌صلح سفارش موفق است");
  const host = f3.state.buildings.find((b) => b.id === q0.bld);
  const left0 = host.train[0].left;
  const rej0 = f3.state.rejected;
  f3.state.rules = { noRush: true };
  f3.state.peaceUntil = PEACE_TICKS;
  const q1 = queueHire(f3.state, f3.terrain, f3.W, f3.H, 6, 6, "spearman", 0);
  must(!q1.ok && q1.reason === "NORUSH", "در صلح سفارش NORUSH می‌دهد");
  must(f3.state.rejected === rej0 + 1, "ردی شمارش شود");
  must(host.train.length === 1, "صفی اضافه نشود");
  stepTraining(f3.state, f3.terrain);
  stepTraining(f3.state, f3.terrain);
  must(host.train[0].left === left0, "صف در صلح یخ می‌زند");
  f3.state.tick = PEACE_TICKS;
  stepTraining(f3.state, f3.terrain);
  must(host.train[0].left === left0 - 1, "پس از صلح صف پیش می‌رود");
  // MP: پرچم حریف هم گیت می‌شود.
  const f4 = fresh();
  enableMp(f4.state, 2, ["A", "B"]);
  f4.state.rules = { noRush: true };
  f4.state.peaceUntil = PEACE_TICKS;
  must(peaceActive(f4.state) === true, "در MP هم صلح فعال است");
  must(fireCow(f4.state, [], 25, 20, 1).reason === "NORUSH", "در MP هم NORUSH است");
  // نام‌ها در هر دو زبان.
  must(t("game.firecow.NORUSH").length > 0, "نام فارسی NORUSH پرتاب");
  must(t("game.train.NORUSH").length > 0, "نام فارسی NORUSH آموزش");
  must(t("ui.mp.noRush").length > 0, "نام فارسی No Rush");
  must(t("main.battle.peace", { s: 180 }).includes("180"), "شمارش صلح ثانیه را نشان می‌دهد");
  withLang("en", () => {
    must(t("game.firecow.NORUSH") === "No cow throwing during peace", "نام en NORUSH پرتاب");
    must(t("game.train.NORUSH") === "No training during peace", "نام en NORUSH آموزش");
    must(t("ui.mp.noRush") === "🕊️ Starting peace (no attacks, no training)", "نام en No Rush");
  });
  // ذخیره: پرچم+شمارنده می‌مانند؛ قدیمی = بی‌صلح؛ خراب رد می‌شود.
  // ذخیره‌ها solo-only اند (0.141.0) — گرد state سولو، گیت MP جدا در بالا.
  const f5 = fresh();
  f5.state.rules = { noCow: false, strongWalls: false, noRush: true };
  f5.state.peaceUntil = PEACE_TICKS;
  const h1 = stateHash(f5.state);
  const loaded = deserializeJSON(serializeJSON(f5.state));
  must(loaded.rules && loaded.rules.noRush === true, "پرچم در ذخیره می‌ماند");
  must(loaded.peaceUntil === PEACE_TICKS, "شمارنده در ذخیره می‌ماند");
  must(stateHash(loaded) === h1, "هش پس از load باید بخواند");
  const old = JSON.parse(serializeJSON(f5.state));
  delete old.rules;
  delete old.peaceUntil;
  must(deserialize(old).rules.noRush === false, "ذخیره قدیمی = خاموش");
  must(deserialize(old).peaceUntil === 0, "ذخیره قدیمی = بی‌صلح");
  const bad = JSON.parse(serializeJSON(f5.state));
  bad.rules = { noRush: "yes" };
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "پرچم خراب باید رد شود");
  const bad2 = JSON.parse(serializeJSON(f5.state));
  bad2.peaceUntil = -5;
  let threw2 = false;
  try { deserialize(bad2); } catch (e) { threw2 = e instanceof SaveError; }
  must(threw2, "شمارنده خراب باید رد شود");
  // هش: فعال/شمارنده هش را عوض می‌کنند (تفکیک)، خاموش churn ندارد.
  const sA = createState(), sB = createState(), sC = createState(), sD = createState();
  must(stateHash(sA) === stateHash(createState()), "خاموش هش یکسان دارد");
  sB.rules = { noRush: true };
  sB.peaceUntil = PEACE_TICKS;
  sC.rules = { noRush: true };
  sD.peaceUntil = 100;
  must(stateHash(sB) !== stateHash(createState()), "صلح فعال هش را عوض می‌کند");
  must(stateHash(sD) !== stateHash(createState()), "شمارنده هش را عوض می‌کند");
  must(stateHash(sB) !== stateHash(sC) && stateHash(sB) !== stateHash(sD), "ترکیب‌ها تفکیک می‌شوند");
  return { name: "گزینه No Rush اتاق", pass: true, detail: "صلح/گیت‌ها/یخ صف + ذخیره/هش" };
}
// ذخیره مهمات منجنیق (وضعیت ۵۷۸ — §۱۲.۲: «۱۰ stone = ۲۰ rocks»): سقف ۲۰ از
// کاتالوگ + هر شلیک ۱ سنگ + خالی = بی‌شلیک + تأمین با سنگ انبار + ذخیره/هش.
// ذخیره مهمات منجنیق (وضعیت ۵۷۸ — §۱۲.۲: «۱۰ stone = ۲۰ rocks»): سقف ۲۰ از
// کاتالوگ + هر شلیک ۱ سنگ + خالی = بی‌شلیک + تأمین با سنگ انبار + ذخیره/هش.
// ذخیره مهمات منجنیق (وضعیت ۵۷۸ — §۱۲.۲: «۱۰ stone = ۲۰ rocks»): سقف ۲۰ از
// کاتالوگ + هر شلیک ۱ سنگ + خالی = بی‌شلیک + تأمین با سنگ انبار + ذخیره/هش.
// ذخیره مهمات منجنیق (وضعیت ۵۷۸ — §۱۲.۲: «۱۰ stone = ۲۰ rocks»): سقف ۲۰ از
// کاتالوگ + هر شلیک ۱ سنگ + خالی = بی‌شلیک + تأمین با سنگ انبار + ذخیره/هش.
// ذخیره مهمات منجنیق (وضعیت ۵۷۸ — §۱۲.۲: «۱۰ stone = ۲۰ rocks»): سقف ۲۰ از
// کاتالوگ + هر شلیک ۱ سنگ + خالی = بی‌شلیک + تأمین با سنگ انبار + ذخیره/هش.
// ذخیره مهمات منجنیق (وضعیت ۵۷۸ — §۱۲.۲: «۱۰ stone = ۲۰ rocks»): سقف ۲۰ از
// کاتالوگ + هر شلیک ۱ سنگ + خالی = بی‌شلیک + تأمین با سنگ انبار + ذخیره/هش.
// ذخیره مهمات منجنیق (وضعیت ۵۷۸ — §۱۲.۲: «۱۰ stone = ۲۰ rocks»): سقف ۲۰ از
// کاتالوگ + هر شلیک ۱ سنگ + خالی = بی‌شلیک + تأمین با سنگ انبار + ذخیره/هش.
function t_catapult_ammo() {
  // داده: سقف و نرخ از کاتالوگ/ثابت‌ها.
  must(UNITS.catapult.ammoCap === 20, "سقف مهمات منجنیق باید ۲۰ باشد");
  must(AMMO_RESUPPLY_STONE === 10 && AMMO_RESUPPLY_ROCKS === 20, "تأمین باید ۱۰ سنگ = +۲۰ باشد");
  must(!UNITS.ram.ammoCap, "دژکوب مهمات ندارد (تک نزدیک‌زن)");
  must(!UNITS.soldier.ammoCap, "پیاده مهمات ندارد");
  // spawn: منجنیق پر، بقیه بی‌فیلد.
  const { W, H, terrain, state } = fresh();
  const sold = spawnUnit(state, "soldier", 35.5, 35.5, 0);
  must(sold.ammo === undefined, "پیاده نباید فیلد مهمات داشته باشد");
  // شلیک واقعی مصرف می‌کند (محاصره سولو فقط بنای حریف AI را می‌زند).
  if (state.ai && state.ai.resources) { state.ai.resources.wood = 500; state.ai.resources.stone = 500; }
  const ha = putNear(state, terrain, W, H, "کلبه لنگر", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(ha.ok, "کلبه لنگر ساخته شود");
  const wl = putNear(state, terrain, W, H, "دیوار حریف", 7, 1, CONFIG.BUILDINGS.wall, 9);
  must(wl.ok, "دیوار حریف ساخته شود");
  wl.building.hp = 2000; wl.building.maxHp = 2000;
  const cat = spawnUnit(state, "catapult", wl.building.c + 0.5, wl.building.r + 4.5, 0);
  must(cat.ammo === 20, "منجنیق تازه باید پر (۲۰) باشد");
  completeAll(state);
  must(deployUnit(state, cat).ok && cat.deployed === true, "استقرار");
  // نزدیک‌ترین بنای حریف هدف است (کلبه یا دیوار) — جمع جان هر دو را می‌پاییم.
  const foeHpSum = () => state.buildings
    .filter((b) => !b.destroyed && (b.owner == null ? 0 : b.owner) === 9)
    .reduce((a, b) => a + b.hp, 0);
  const hp0 = foeHpSum();
  simC(state, terrain, 50);
  must(cat.ammo < 20 && cat.ammo >= 18, `باید ۱-۲ شلیک کرده باشد، مهمات=${cat.ammo}`);
  must(foeHpSum() < hp0, "بنای حریف باید خورده باشد");
  // خالی = بی‌شلیک (سردی هم نمی‌نشیند تا با تأمین فوری بزند).
  cat.ammo = 0;
  cat.cooldown = 0;
  const hp1 = foeHpSum();
  simC(state, terrain, 100);
  must(cat.ammo === 0, "مهمات صفر می‌ماند");
  must(foeHpSum() === hp1, "بی‌سنگ نباید بزند");
  must(cat.cooldown === 0, "سردی نباید بنشیند");
  // تأمین: ۱۰ سنگ = پر تا سقف.
  state.resources.stone = 40;
  const st0 = state.resources.stone;
  const r = resupplyAmmo(state, [cat.id], 0);
  must(r.ok && r.reason === "OK" && r.supplied === 1, "تأمین باید موفق باشد");
  must(cat.ammo === 20, "باید تا سقف پر شود");
  must(state.resources.stone === st0 - 10, "۱۰ سنگ کم شود");
  // پر = FULL (سنگی کم نشود).
  const st1 = state.resources.stone;
  must(resupplyAmmo(state, [cat.id], 0).reason === "FULL", "پر باید FULL بدهد");
  must(state.resources.stone === st1, "در FULL سنگی کم نشود");
  // سنگ ناکافی = NO_STONE.
  cat.ammo = 5;
  state.resources.stone = 9;
  must(resupplyAmmo(state, [cat.id], 0).reason === "NO_STONE", "سنگ کم باید NO_STONE بدهد");
  must(cat.ammo === 5 && state.resources.stone === 9, "در NO_STONE چیزی عوض نشود");
  // نامعتبر/بیگانه.
  must(resupplyAmmo(state, [], 0).reason === "INVALID", "خالی INVALID است");
  must(resupplyAmmo(state, [999999], 0).reason === "INVALID", "ناشناخته INVALID است");
  must(resupplyAmmo(state, [sold.id], 0).reason === "INVALID", "غیرمنجنیق INVALID است");
  const foeCat = spawnUnit(state, "catapult", 30.5, 20.5, 9);
  must(resupplyAmmo(state, [foeCat.id], 0).reason === "NOT_OWNED", "منجنیق بیگانه NOT_OWNED است");
  // آینه فرمان sim.
  state.resources.stone = 40;
  cat.ammo = 3;
  const m = applyCmd(state, terrain, { kind: "resupply", ids: [cat.id] });
  must(m.ok && m.reason === "OK", "آینه sim باید موفق باشد");
  must(cat.ammo === 20 && state.resources.stone === 30, "آینه sim اثر کند");
  // MP: کیسه مالک + آینه.
  const f2 = fresh();
  enableMp(f2.state, 2, ["A", "B"]);
  const c2 = spawnUnit(f2.state, "catapult", 20.5, 20.5, 1);
  c2.ammo = 7;
  f2.state.mpres[1].resources.stone = 25;
  const m2 = applyCmd(f2.state, f2.terrain, { kind: "resupply", ids: [c2.id], owner: 1 });
  must(m2.ok, "در MP باید موفق باشد");
  must(c2.ammo === 20, "در MP تا سقف پر شود");
  must(f2.state.mpres[1].resources.stone === 15, "از کیسه مالک کم شود");
  must(f2.state.mpres[0].resources.stone === 40, "کیسه حریف دست‌نخورده بماند");
  // نام‌ها در هر دو زبان.
  must(t("game.resupply.FULL").length > 0, "نام فارسی FULL");
  must(t("game.ev.resupply", { n: 2 }).length > 0, "رویداد فارسی تأمین");
  withLang("en", () => {
    must(t("game.resupply.NO_STONE") === "Not enough stone (10 stone)", "نام en NO_STONE");
    must(t("game.ev.resupply", { n: 2 }) === "Rocks resupplied (2 catapult(s))", "رویداد en تأمین");
  });
  // ذخیره: مهمات می‌ماند؛ قدیمی (بی‌ammo) = سقف کامل؛ فراسقف/منفی رد می‌شود.
  // (روی state جدا — دیوار ۲۰۰۰جانی بخش نبرد اعتبارسنجی ذخیره را رد می‌کند.)
  const f3 = fresh();
  const cat3 = spawnUnit(f3.state, "catapult", 20.5, 20.5, 0);
  cat3.ammo = 17;
  const h1 = stateHash(f3.state);
  const loaded = deserializeJSON(serializeJSON(f3.state));
  const lc = loaded.units.find((u) => u.id === cat3.id);
  must(lc && lc.ammo === 17, "مهمات در ذخیره بماند");
  must(stateHash(loaded) === h1, "هش پس از load باید بخواند");
  const old = JSON.parse(serializeJSON(f3.state));
  delete old.units.find((u) => u.id === cat3.id).ammo;
  must(deserialize(old).units.find((u) => u.id === cat3.id).ammo === 20, "قدیمی بی‌مهمات = سقف کامل");
  const bad = JSON.parse(serializeJSON(f3.state));
  bad.units.find((u) => u.id === cat3.id).ammo = 99;
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "مهمات فراسقف باید رد شود");
  // هش: شلیک‌کرده از پر تفکیک می‌شود؛ بی‌مهمات‌ها churn ندارند.
  const a1 = fresh(), a2 = fresh();
  spawnUnit(a1.state, "catapult", 10.5, 10.5, 0);
  spawnUnit(a2.state, "catapult", 10.5, 10.5, 0);
  must(stateHash(a1.state) === stateHash(a2.state), "دو منجنیق پر هش یکسان دارند");
  a1.state.units[0].ammo = 19;
  must(stateHash(a1.state) !== stateHash(a2.state), "مهمات خورده هش را عوض می‌کند");
  const b1 = fresh(), b2 = fresh();
  spawnUnit(b1.state, "soldier", 10.5, 10.5, 0);
  spawnUnit(b2.state, "soldier", 10.5, 10.5, 0);
  must(stateHash(b1.state) === stateHash(b2.state), "بی‌مهمات‌ها churn ندارند");
  return { name: "مهمات منجنیق", pass: true, detail: "مصرف/تأمین + آینه/MP + ذخیره/هش" };
}
// خط زمانی موج‌ها (وضعیت ۱۱۷۴ — §۱۹.۴، نیمه timeline): نمای خالص ۱..۵ +
// نشان پایان آخرین موج؛ رندر DOM کنار دکمه موج (فقط سولو).
function t_wavetimeline() {
  must(FINAL_WAVE === 5, "باید ۵ موج نهایی باشد");
  // خلوص: ورودی تهی هم معتبر است.
  const z = waveTimeline(null);
  must(z.rows.length === 5 && z.rows.every((r) => r.status === "upcoming"), "تهی = همه در انتظار");
  must(z.end === "locked" && z.wave === 0, "تهی = قفل + موج صفر");
  // آغاز بازی: همه در انتظار، پایان قفل.
  const s0 = createState();
  const t0 = waveTimeline(s0);
  must(t0.rows.map((r) => r.n).join(",") === "1,2,3,4,5", "ردیف‌ها ۱ تا ۵ باشند");
  must(t0.rows.every((r) => r.status === "upcoming"), "در آغاز همه در انتظارند");
  must(t0.end === "locked", "پایان در آغاز قفل است");
  // میانه: گذشته تمام‌شده، جاری مشخص، آینده در انتظار.
  const s2 = createState();
  s2.wave = 2;
  const t2 = waveTimeline(s2);
  must(t2.rows[0].status === "done" && t2.rows[1].status === "current", "موج ۱ تمام و ۲ جاری است");
  must(t2.rows.slice(2).every((r) => r.status === "upcoming"), "۳ تا ۵ در انتظارند");
  must(t2.end === "locked", "پایان در میانه قفل است");
  // موج آخر در جریان: نشان پایان (نه قفل).
  const s5 = createState();
  s5.wave = 5;
  const t5 = waveTimeline(s5);
  must(t5.rows.slice(0, 4).every((r) => r.status === "done"), "۱ تا ۴ تمام‌اند");
  must(t5.rows[4].status === "current", "موج ۵ جاری است");
  must(t5.end === "final", "پایان آخرین موج نشان‌دار است");
  // پیروزی: همه تمام + جام.
  const sw = createState();
  sw.wave = 5;
  sw.victorious = true;
  const tw = waveTimeline(sw);
  must(tw.rows.every((r) => r.status === "done"), "در پیروزی همه تمام‌اند");
  must(tw.end === "victory", "پایان پیروزی است");
  // شکست: نشان ضربدر، ردیف‌ها دست‌نخورده.
  const sd = createState();
  sd.wave = 3;
  sd.defeated = true;
  const td = waveTimeline(sd);
  must(td.end === "defeat", "پایان شکست است");
  must(td.rows[2].status === "current", "ردیف جاری در شکست حفظ می‌شود");
  // خلوص واقعی: دو فراخوانی یکسان + عدم جهش state.
  const sp = createState();
  sp.wave = 2;
  const before = JSON.stringify({ w: sp.wave, v: sp.victorious, d: sp.defeated });
  const r1 = waveTimeline(sp), r2 = waveTimeline(sp);
  must(JSON.stringify(r1) === JSON.stringify(r2), "تابع قطعی است");
  must(JSON.stringify({ w: sp.wave, v: sp.victorious, d: sp.defeated }) === before, "ورودی جهش نمی‌خورد");
  // نام خط در هر دو زبان.
  must(t("main.wave.timeline", { done: 2, total: 5, cur: 3 }).length > 0, "نام فارسی خط موج‌ها");
  withLang("en", () => {
    must(t("main.wave.timeline", { done: 2, total: 5, cur: 3 }) === "Wave timeline: 2/5 done — current: 3", "نام en خط موج‌ها");
  });
  // (DOM نوار در راستی‌آزمایی زنده وارسی می‌شود — مقدارش به state زنده صفحه
  // بستگی دارد، نه state تست.)
  return { name: "خط زمانی موج‌ها", pass: true, detail: "خلوص + پایان + نام" };
}

// __T_TIMELINE_ROW125__
// timeline نابودی همه دشمنان (0.181.0 — §2/بند 125): نوار خط موج‌ها کنار
// دکمه موج — موج‌ها دستی‌اند پس شمارش‌معکوس نداریم؛ نوار پیشرفت ۱..۵ +
// نشان پایان آخرین حمله را می‌دهد (waveTimeline خالص + رندر DOM).
function t_timeline_row125() {
  const tl = waveTimeline({ wave: 3 });
  must(tl.rows.length === 5, "۵ ردیف موج");
  must(tl.rows[2].status === "current" && tl.rows[0].status === "done", "جاری/تمام");
  must(tl.end === "locked", "میانه = قفل");
  must(waveTimeline({ wave: 5 }).end === "final", "موج آخر = نشان پایان");
  must(t("main.wave.timeline", { done: 2, total: 5, cur: 3 }).length > 0, "نام fa");
  must(withLang("en", () => t("main.wave.timeline", { done: 2, total: 5, cur: 3 })).length > 0, "نام en");
  if (typeof document === "undefined") return { name: "timeline نابودی", pass: true, detail: "بدون DOM رد شد" };
  const el = document.getElementById("waveTimelineEl"), btn = document.getElementById("waveBtn");
  must(!!el && !!btn, "نوار + دکمه موج در DOM");
  must(el.tagName === "SPAN", "نوار اسپن است");
  must(btn.nextElementSibling === el, "نوار کنار دکمه موج است");
  return { name: "timeline نابودی", pass: true, detail: "خلوص + نام دوزبانه + DOM" };
}

// برده مشعل‌دار (0.149.0 — §۱۲.۲/بند ۱۷۷ + نقشه‌راه #۱۷۷/#۲۵۴؛ #۱۰۰ می‌ماند):
// ارزان‌ترین مزدور (۱۰غ+۵ط)، بی‌سلاح (equip [] — قفل NEEDS_WEAPON ندارد)،
// مشعل‌دار (torch) که با هر ضربه بنای چوبیِ تکمیل‌شده را بی‌شانس آتش می‌زند
// (سنگی هرگز)؛ شیت ندارد — رندر وکتوری (fallback خودکار render.js).
function t_slave() {
  const sd = UNITS.slave;
  must(sd && sd.side === "player" && sd.requires === "barracks" && sd.building === "barracks", "برده خودیِ سربازخانه است");
  must(sd.cost.food === 10 && sd.cost.gold === 5 && sd.goldCost === 5, "برده ۱۰غ+۵ط است");
  must(sd.hp === 25 && sd.dmg === 3 && sd.speed === 3.6 && sd.trainTicks === 30, "جان/آسیب/سرعت/آموزش برده ۲۵/۳/۳.۶/۳۰");
  must(sd.torch === true && Array.isArray(sd.equip) && sd.equip.length === 0 && !sd.requiresWeapon, "مشعل‌دار بی‌سلاح است");
  must(t("game.unit.slave.name").length > 0, "نام فارسی برده");
  withLang("en", () => {
    must(UNITS.slave.name === "Irregular", "نام en برده");
  });
  // ارزان‌ترین مزدور فهرست.
  const hireables = Object.entries(UNITS).filter(([, d]) => d.side === "player" && !d.noHire && d.cost);
  must(hireables.length === 23, `باید ۲۳ قابل‌استخدام باشد، هست ${hireables.length}`);
  const barracksHire = hireables.filter(([, d]) => d.requires === "barracks"); // ارزان‌ترینِ سربازخانه (انجمن جدا: نردبان‌بر ۴ طلا)
  const minFood = Math.min(...barracksHire.map(([, d]) => d.cost.food));
  const minGold = Math.min(...barracksHire.map(([, d]) => d.cost.gold));
  must(sd.cost.food === minFood && sd.cost.gold === minGold, "برده ارزان‌ترین مزدور سربازخانه است");
  // استخدام بی‌سلاح: انبار خالی (۰ شمشیر/کمان) هم OK.
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.swords = 0; state.resources.bows = 0;
  state.resources.food = 100; state.resources.gold = 100;
  const h = hireUnit(state, terrain, W, H, 5, 5, "slave");
  must(h.ok, `استخدام برده بی‌سلاح باید موفق باشد، شد ${h.reason}`);
  must(state.resources.food === 90 && state.resources.gold === 95, "هزینه برده ۱۰غ+۵ط کم می‌شود");
  // اشتعال مشعل در نبرد واقعی: برده خودی کلبه حریف را می‌زند — نخستین
  // ضربه همان تیک آتش می‌زند (بی‌شانس، در همان فراخوان strike).
  const f = fresh();
  if (f.state.ai && f.state.ai.resources) { f.state.ai.resources.wood = 500; f.state.ai.resources.gold = 500; }
  const hut = putNear(f.state, f.terrain, f.W, f.H, "کلبه حریف", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(hut.ok, "کلبه حریف ساخته شود");
  hut.building.hp = 1000; hut.building.maxHp = 1000;
  spawnUnit(f.state, "slave", 8.5, 2.5, 0);
  completeAll(f.state);
  let firstDmg = -1, lit = -1;
  for (let i = 0; i < 200; i++) {
    f.state.tick++;
    stepCombat(f.state, f.terrain);
    if (firstDmg < 0 && hut.building.hp < 1000) firstDmg = f.state.tick;
    if (hut.building.fire > 0) { lit = f.state.tick; break; }
    must(!hut.building.destroyed, "کلبه نباید پیش از اشتعال بیفتد");
  }
  must(firstDmg > 0, "برده باید به کلبه ضربه بزند");
  must(lit === firstDmg, `مشعل همان تیک نخستین ضربه آتش می‌زند (ضربه ${firstDmg}، اشتعال ${lit})`);
  must(f.state.events.some((e) => typeof e === "string" && e.includes("آتش گرفت")), "رویداد اشتعال ثبت شود");
  // سنگی زیر مشعل هرگز: دیوار حریف (کلبه لنگر فقط برای اعتبارسنجی جاست و
  // پس از ساخت حذف می‌شود تا برده فقط دیوار را بزند).
  const f2 = fresh();
  if (f2.state.ai && f2.state.ai.resources) { f2.state.ai.resources.wood = 500; f2.state.ai.resources.stone = 500; }
  const ha = putNear(f2.state, f2.terrain, f2.W, f2.H, "کلبه لنگر", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(ha.ok, "کلبه لنگر ساخته شود");
  const wall = putNear(f2.state, f2.terrain, f2.W, f2.H, "دیوار حریف", 7, 1, CONFIG.BUILDINGS.wall, 9);
  must(wall.ok, "دیوار حریف ساخته شود");
  wall.building.hp = 2000; wall.building.maxHp = 2000;
  f2.state.buildings.splice(f2.state.buildings.indexOf(ha.building), 1);
  for (let j = 0; j < ha.building.h; j++) for (let k = 0; k < ha.building.w; k++) f2.state.occ[(ha.building.r + j) * f2.W + (ha.building.c + k)] = 0;
  spawnUnit(f2.state, "slave", 8.5, 2.5, 0);
  completeAll(f2.state);
  for (let i = 0; i < 300; i++) { f2.state.tick++; stepCombat(f2.state, f2.terrain); }
  must(wall.building.hp < 2000, "برده باید به دیوار ضربه بزند");
  must(!(wall.building.fire > 0), "دیوار سنگی نباید با مشعل آتش بگیرد");
  return { name: "برده مشعل‌دار", pass: true, detail: `ارزان‌ترین + بی‌سلاح + اشتعال تیک ${lit}` };
}
export { truceCases };
