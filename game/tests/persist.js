// persist (0.248.0 — C-CLN-41): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
// snapOf مشترک است و از fixtures می‌آید.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
import { must, fresh, mpFresh, sim, simC, simT, completeAll, rawTicks, grassNear, needBarracks, stubCtx, blankMap, siteNear, aiSim, aiFreshPers, grassInBand, placeGateAt, putNear, snapOf, srvCode, srvMake, srvRoom, srvInp } from "./fixtures.js";


function t_save_roundtrip() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.woodcutter);
  tryPlace(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.farm);
  state.tax = "high";
  state.rations = "double";
  sim(state, 250);
  const loaded = deserializeJSON(serializeJSON(state));
  must(snapOf(loaded) === snapOf(state), "وضعیت بارگذاری‌شده باید با اسنپ‌شات برابر باشد");
  must(loaded.paused === state.paused, "پرچم توقف باید حفظ شود");
  return { name: "چرخه ذخیره/بازیابی", pass: true, detail: `${serializeJSON(state).length} بایت، تیک ${state.tick}` };
}


function t_save_paused() {
  const { state } = fresh();
  state.paused = true;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.paused === true, "ذخیره حین توقف باید معتبر بماند");
  return { name: "ذخیره حین توقف", pass: true, detail: "paused=true حفظ شد" };
}


function t_save_reject() {
  const bad = ["{خراب", "null", "[]", "{}", `{"v":${SCHEMA_VERSION + 1}}`, '{"v":0}'];
  for (const t of bad) {
    let threw = null;
    try {
      deserializeJSON(t);
    } catch (e) {
      threw = e;
    }
    must(threw instanceof SaveError, `باید SaveError بدهد: ${t.slice(0, 20)}`);
  }
  // دست‌کاری: نوع نامعتبر، مرز خارج، منبع منفی
  const { W, H, state } = fresh();
  const good = JSON.parse(serializeJSON(state));
  const tampered = [
    { ...good, buildings: [{ id: 1, type: "tank", c: 1, r: 1, progress: 0 }] },
    { ...good, buildings: [{ id: 1, type: "hut", c: W - 1, r: H - 1, progress: 0 }] },
    { ...good, mapSeed: -5 },
    { ...good, resources: { ...good.resources, wood: -5 } },
    { ...good, tax: "extreme" },
    { ...good, offFood: ["stone"] },
    { ...good, offFood: ["meat", "meat"] },
  ];
  for (const t of tampered) {
    let ok = true;
    try {
      deserialize(t);
    } catch {
      ok = false;
    }
    must(!ok, "داده دست‌کاری‌شده باید رد شود");
  }
  const rt = deserializeJSON(serializeJSON(state));
  must(rt.mapSeed === (state.mapSeed >>> 0), "سید نقشه باید در ذخیره بماند");
  return { name: "رد داده نامعتبر", pass: true, detail: "۶ خراب + ۷ دست‌کاری رد شدند + سید ماند" };
}


function t_save_occ() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  const loaded = deserializeJSON(serializeJSON(state));
  // اشغال باید بازسازی شده باشد: همان خانه برای ساختمان جدید نامعتبر است
  const v = tryPlace(loaded, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  must(!v.ok && v.reason === "OCCUPIED", "اشغال باید پس از بارگذاری بازسازی شود");
  return { name: "بازسازی اشغال", pass: true, detail: "OCCUPIED پس از load" };
}


function t_save_progress() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  sim(state, 10);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.buildings[0].progress === 10, `پیشرفت باید ۱۰ بماند، هست ${loaded.buildings[0].progress}`);
  return { name: "حفظ پیشرفت تولید", pass: true, detail: "progress=10" };
}


// ویرانه در ذخیره می‌ماند (بند ۶): پیش‌تر load با hp:0 می‌شکست (INVALID_SCHEMA).
function t_save_ruins() {
  const { W, H, terrain, state } = fresh();
  const v = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(v.ok, "کلبه باید ساخته شود");
  completeAll(state);
  demolishBuilding(state, v.building);
  must(v.building.destroyed === true && v.building.hp === 0, "ویرانه دستی باید destroyed با hp صفر باشد");
  const h0 = stateHash(state);
  const json = serializeJSON(state);
  const loaded = deserializeJSON(json);
  const ruin = loaded.buildings.find((b) => b.id === v.building.id);
  must(ruin && ruin.destroyed === true && ruin.hp === 0, "ویرانه باید با پرچم و hp صفر بماند");
  must(stateHash(loaded) === h0, "هش بلافاصله پس از load باید برابر باشد");
  must(serializeJSON(loaded) === json, "سریال مجدد باید بایت‌به‌بایت برابر باشد");
  const v2 = tryPlace(loaded, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(v2.ok, "زمین ویرانه باید آزاد باشد (اشغال بدون ویرانه بازسازی می‌شود)");
  return { name: "ذخیره ویرانه", pass: true, detail: "پرچم + hp صفر + هش + occ آزاد" };
}


// served میخانه در ذخیره می‌ماند (بند ۶): پیش‌تر هدف محبوبیت/هش پس از load می‌لغزید.
function t_save_inn_served() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 200; // میخانه ۱۰۰ طلا (هزینه مرجع 0.171.0)
  const inn = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn);
  must(inn.ok, "میخانه باید ساخته شود");
  completeAll(state);
  state.resources.beer = 5;
  sim(state, 50);
  must(inn.building.served === true, "میخانه باید served باشد");
  const h0 = stateHash(state);
  const loaded = deserializeJSON(serializeJSON(state));
  const li = loaded.buildings.find((b) => b.type === "inn");
  must(li && li.served === true, "served باید در ذخیره بماند");
  must(popTarget(loaded) === popTarget(state), "هدف محبوبیت باید یکسان بماند");
  must(stateHash(loaded) === h0, "هش فوری باید برابر باشد");
  return { name: "ذخیره سرو میخانه", pass: true, detail: "served + هدف + هش" };
}


// برابری فوری هش پس از load (بند ۶): staffed/starved/سقف/استخر هم می‌مانند.
function t_save_derived_parity() {
  const { W, H, terrain, state } = fresh();
  must(tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut).ok, "کلبه");
  let wcSpot = null;
  for (const [c, r] of [[10, 10], [20, 10], [10, 20], [20, 20], [30, 30], [40, 40]]) {
    const t = tryPlace(state, terrain, W, H, c, r, CONFIG.BUILDINGS.woodcutter);
    if (t.ok) { wcSpot = t; break; }
  }
  must(wcSpot, "چوب‌بری باید جایی ساخته شود");
  completeAll(state);
  state.workers = 0;
  sim(state, 1);
  const wc = state.buildings.find((b) => b.type === "woodcutter");
  must(wc.staffed === false, "بدون کارگر باید unstaffed باشد");
  must(state.freeWorkers === 0, "استخر باید صفر باشد");
  must(state.workerCap === 12, `سقف باید ۱۲ باشد (۴ پایه + ۸ کلبه)، هست ${state.workerCap}`);
  const h0 = stateHash(state);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.buildings.find((b) => b.type === "woodcutter").staffed === false,
    "staffed=false باید بماند");
  must(loaded.workerCap === 12 && loaded.freeWorkers === 0, "سقف/استخر باید بمانند");
  must(stateHash(loaded) === h0, "هش فوری باید برابر باشد");
  // سازگاری ذخیره قدیمی بدون میدان‌های جدید:
  const doc = JSON.parse(serializeJSON(state));
  delete doc.workerCap; delete doc.freeWorkers;
  for (const b of doc.buildings) { delete b.staffed; delete b.starved; }
  const old = deserialize(doc);
  must(old.workerCap === 4 && old.freeWorkers === 4, "قدیمی باید پیش‌فرض createState بگیرد");
  must(old.buildings.every((b) => b.staffed === true) && old.buildings.every((b) => !b.starved),
    "قدیمی باید staffed=true/starved=false بگیرد");
  return { name: "برابری فوری پس از load", pass: true, detail: "staffed/سقف/استخر + سازگاری قدیمی" };
}


// ذخیره کامل میان‌بازی (بند ۶ — ۲۱.۴): نقشه، موجودیت‌ها، RNG، تایمر، اهداف، AI.
function t_save_full_roundtrip() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 500; // میخانه ۱۰۰ طلا (هزینه مرجع 0.171.0؛ پایین‌تر دوباره ۵۰۰ می‌شود)
  needBarracks(state, terrain, W, H);
  const hut = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(hut.ok, "کلبه");
  const ts = siteNear(terrain, state.occ, W, H, 10, 10, 3, 3);
  must(ts, "جای برج");
  const tw = tryPlace(state, terrain, W, H, ts[0], ts[1], CONFIG.BUILDINGS.tower);
  must(tw.ok, "برج");
  must(tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn).ok, "میخانه");
  must(tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.wall).ok, "دیوار");
  const gt = tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.gate);
  must(gt.ok, "دروازه");
  must(toggleGate(state, gt.building).ok, "بستن دروازه");
  completeAll(state);
  state.resources.beer = 5;
  state.resources.gold = 500;
  state.tax = "high";
  state.rations = "double";
  state.wave = 2;
  state.mapPatches = [[10, 1]];
  const q = createQueue();
  const spot = grassNear(terrain, state.occ, W, H, 30, 30);
  must(spot, "جای تحویل");
  must(enqueueCmd(q, { kind: "hire", type: "soldier", c: spot[0], r: spot[1] }, state.tick).ok, "صف hire");
  stepSim(state, terrain, 1, q);
  const rax = state.buildings.find((b) => b.type === "barracks");
  must(rax.train.length === 1, "سفارش باید ته صف باشد");
  sim(state, 60); // اقتصاد: served + آمار + محبوبیت
  const s1 = spawnUnit(state, "soldier", 20.5, 20.5);
  must(orderMove(state, s1, 25, 25).ok, "فرمان حرکت");
  setStance(s1, "hold");
  const bw = spawnUnit(state, "bowman", tw.building.c + 3.5, tw.building.r + 0.5);
  must(garrisonUnit(state, bw, tw.building).ok, "گاریسون");
  const cat = spawnUnit(state, "catapult", 35.5, 35.5);
  must(deployUnit(state, cat).ok, "استقرار منجنیق");
  const gd = spawnUnit(state, "spearman", 2.5, 3.5);
  must(setGuard(state, gd, hut.building).ok, "نگهبانی");
  rngNext(state); rngNext(state); rngNext(state);
  must(state.rng !== null, "جریان RNG باید مصرف شده باشد");
  Object.assign(state.ai, { active: true, seed: 777,
    resources: { ...state.ai.resources, gold: 50 }, workers: 3, workerCap: 8,
    phase: "done", buildIdx: 2, raidsSent: 1, nextThink: 99,
    baseC: 5, baseR: 5, dormant: true, difficulty: "hard", personality: "snake" });
  const h0 = stateHash(state);
  const json = serializeJSON(state);
  const loaded = deserializeJSON(json);
  must(serializeJSON(loaded) === json, "سریال مجدد باید بایت‌به‌بایت برابر باشد");
  must(stateHash(loaded) === h0, "هش بلافاصله پس از load باید برابر باشد");
  must(loaded.buildings.find((b) => b.type === "inn").served === true, "served باید بماند");
  must(loaded.buildings.find((b) => b.type === "gate").open === false, "دروازه بسته باید بسته بماند");
  const lrax = loaded.buildings.find((b) => b.type === "barracks");
  must(lrax.train.length === 1 && lrax.train[0].type === "soldier", "صف آموزش باید بماند");
  must(loaded.units.find((u) => u.type === "catapult").deployed === true, "استقرار باید بماند");
  must(loaded.units.find((u) => u.type === "bowman").garrisonTower === tw.building.id,
    "پرچم گاریسون باید از فهرست برج بازسازی شود");
  must(loaded.units.find((u) => u.type === "spearman").guardBld === hut.building.id, "نگهبانی باید بماند");
  must(loaded.ai.seed === 777 && loaded.ai.difficulty === "hard" && loaded.ai.personality === "snake",
    "بلوک AI باید بماند");
  must(loaded.wave === 2 && loaded.rng === state.rng, "موج و RNG باید بمانند");
  must(JSON.stringify(loaded.mapPatches) === "[[10,1]]", "وصله‌های نقشه باید بمانند");
  stepSim(state, terrain, 60, createQueue());
  stepSim(loaded, terrain, 60, createQueue());
  must(stateHash(state) === stateHash(loaded), "پس از ۶۰ تیک آینده نباید واگرا شود");
  return { name: "ذخیره کامل میان‌بازی", pass: true, detail: `${json.length} بایت + آینده ۶۰ تیک یکسان` };
}


// رد دست‌کاری میدان‌های جدید بند ۶ + گردکرد معتبر ویرانه دست‌ساز.
function t_save_reject_v2fields() {
  const { W, H, terrain, state } = fresh();
  must(tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut).ok, "کلبه");
  completeAll(state);
  const good = JSON.parse(serializeJSON(state));
  const clone = () => JSON.parse(JSON.stringify(good));
  const tamp = [];
  { const d = clone(); d.buildings[0].destroyed = true; d.buildings[0].hp = 5; tamp.push(d); }
  { const d = clone(); d.buildings[0].destroyed = true; d.buildings[0].train = []; tamp.push(d); }
  { const d = clone(); d.buildings[0].served = true; tamp.push(d); } // hut نه inn
  { const d = clone(); d.buildings[0].staffed = "yes"; tamp.push(d); }
  { const d = clone(); d.workerCap = -1; tamp.push(d); }
  { const d = clone(); d.buildings[0].destroyed = "yes"; tamp.push(d); }
  for (const t of tamp) {
    let ok = true;
    try { deserialize(t); } catch { ok = false; }
    must(!ok, "دست‌کاری میدان بند ۶ باید رد شود");
  }
  // ویرانه دست‌سازِ معتبر (حداقل‌نگاشت) باید قبول شود:
  const ruin = { id: 1, type: "hut", c: 1, r: 1, owner: 0, destroyed: true };
  const d2 = { ...clone(), buildings: [ruin], nextId: 2 };
  const ls = deserialize(d2);
  must(ls.buildings.length === 1 && ls.buildings[0].destroyed === true && ls.buildings[0].hp === 0,
    "ویرانه معتبر باید با hp صفر بارگذاری شود");
  return { name: "رد دست‌کاری بند ۶", pass: true, detail: "۶ دست‌کاری رد + ویرانه معتبر" };
}



// اطلاعات اسلات ذخیره (0.80.0 — فاز ۰ بند ۱۰): غایب/معتبر/خراب — روی کلید تست، نه اسلات واقعی.
function t_save_slotinfo() {
  const k = "scw.test.slotinfo";
  try { localStorage.removeItem(k); } catch (e) { /* نادیده */ }
  try {
    must(slotInfo(k).exists === false, "غایب = exists:false");
    const { state } = fresh();
    state.tick = 777;
    const s = storageSave(k, serializeJSON(state));
    must(s.ok, "ذخیره تست باید ok باشد");
    const info = slotInfo(k);
    must(info.exists === true && info.tick === 777 && info.bytes > 0, "تیک و بایت خوانده شود");
    localStorage.setItem(k, "{خراب");
    const bad = slotInfo(k);
    must(bad.exists === true && bad.tick === null, "متن خراب: هست ولی تیک null");
    return { name: "اطلاعات اسلات ذخیره", pass: true, detail: "غایب/معتبر/خراب" };
  } finally {
    try { localStorage.removeItem(k); } catch (e) { /* نادیده */ }
  }
}


function persistCases() {
  return [t_save_roundtrip, t_save_paused, t_save_reject, t_save_occ, t_save_progress,
    t_save_units, t_migrate_v1, t_stone_save_compat, t_wheat_save_compat, t_beer_save_compat, t_flour_save_compat, t_weapon_save_compat, t_meat_save_compat, t_cheese_save_compat, t_apples_save_compat,
    t_save_ruins, t_save_inn_served, t_save_derived_parity, t_save_full_roundtrip, t_save_reject_v2fields, t_save_slotinfo];
}


// --- صف آموزش (0.65.0 — انتخاب ۱-الف) ---


// سفارش از صف فرمان: کسر اتمی همان لحظه، بدون تحویل فوری، تحویل پس از ۵۰ تیک.

// لغو از مسیر فرمان: بازپرداخت کامل غذا/طلا/سلاح.

// سقف صف: ۵ سفارش، ششمی QUEUE_FULL.

// ذخیره: صف با left مانده می‌ماند و پس از load ادامه می‌دهد؛ قدیمی بدون train = [].

// راهب جنگجو (فاز ۱ بند ۷۶ — §۵.۵): استخدام فقط با کلیسای جامع سالم خودی؛
// صف روی همان جامع می‌نشیند و پس از trainTicks تحویل می‌دهد (حدس: جان ۷۰،
// آسیب ۹، هزینه ۴۰غذا/۶۰طلا، آموزش ۸۰تیک — مرجع فقط جان نسبی می‌دهد).

// --- زیرساخت مأموریت (0.66.0 — انتخاب ۲-ج: فقط زیرساخت، بدون محتوا) ---

// __T_MISSION_CLOCK__
// ساعت مأموریت (0.182.0 — §2/بند 130): شروع با هم‌حضوری Keep+Granary سالم
// خودی (MP: از آغاز)؛ متن mm:ss با ۱۰ تیک = ۱ ثانیه. خالص + DOM نوار بالا.

// ردیف C-CMP-1 (0.225.0، فاز ۲ کمپین): کاتالوگ ۶ مأموریت داده‌محور —
// هر سند validateMission پاک + کلید/سید یکتا + عضویت difficulty/personality/
// identity در CONFIG + ارجاع typeها به BUILDINGS/UNITS واقعی + بدون میدان sim.
// __T_CMP_CATALOG_ROW__

// ردیف C-CMP-2 (0.225.0، فاز ۲ کمپین): صفحه کمپین + قفل‌گشایی پیشرونده —
// MENU_PAGES هفت‌تایی + section/data-go + progress خالص (unlock/record/load/save) + رندر فهرست.
// __T_CMP_PAGE_ROW__

// ردیف C-CMP-3 (0.225.0، فاز ۲ کمپین): اجرای مأموریت view-side —
// missionSnap + updateRun روی سند واقعی کاتالوگ؛ برد/باخت پرچم view-side است (بدون میدان sim).
// __T_CMP_RUN_ROW__

// ردیف C-CMP-4 (0.226.0، فاز ۲ کمپین): نمایش نام مأموریت در تالار استادان —
// رکورد campaign:key با نام محلی مأموریت رندر می‌شود، نه رشته خام map.
// __T_CMP_MASTERS_ROW__

// ردیف C-CMP-5 (0.226.0، فاز ۲ کمپین): پالایش per-مأموریت تالار —
// all/solo/هر مأموریت؛ از مسیر واقعی UI (change روی select).
// __T_CMP_FILTER_ROW__

// ردیف C-CMP-6 (0.226.0، فاز ۲ کمپین): ری‌پلی مأموریت —
// کلید مأموریت در لاگ ضبط/پذیرفته می‌شود (بی‌اثر بر sim/هش) + تماشا حالت مأموریت را برمی‌گرداند.
// __T_CMP_REPLAY_ROW__





// --- ذخیره ابری (0.67.0 — انتخاب ۳-الف: بخش خالص کلاینت) ---
// منطق سرور (بایت‌چینی/سهمیه) headless تست ندارد — پوشش آن راستی‌آزمایی زنده
// (ذخیره → بارخوانی → مقایسه) است. این‌جا: هش کلید + مرزهای عبارت + سقف داده.



function t_save_units() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  simC(state, terrain, 30);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.units.length === 1, "واحد باید حفظ شود");
  const a = state.units[0], b = loaded.units[0];
  must(b.type === a.type && b.hp === a.hp && Math.abs(b.x - a.x) < 1e-9,
    "موقعیت و HP واحد باید برابر باشد");
  return { name: "ذخیره واحدها", pass: true, detail: `hp=${b.hp}` };
}


function t_migrate_v1() {
  const { state } = fresh();
  const v1 = { ...JSON.parse(serializeJSON(state)), v: 1 };
  delete v1.units;
  delete v1.nextUnitId;
  delete v1.wave;
  for (const b of v1.buildings) delete b.hp;
  const loaded = deserialize(v1);
  must(loaded.units.length === 0, "واحدها باید خالی مهاجرت کنند");
  must(loaded.nextUnitId === 1, "nextUnitId باید ۱ شود");
  return { name: "مهاجرت v1→v2", pass: true, detail: "بدون از دست رفتن" };
}


// سازگاری سنگ (0.18.0): ذخیره قدیمی بدون stone → صفر؛ جدید حفظ می‌شود؛
// خراب (منفی/فراتر از سقف) → SaveError.
function t_stone_save_compat() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.quarry);
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.oxtether);
  sim(state, 50);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.stone === 42, `سنگ باید ۴۲ بماند، هست ${loaded.resources.stone}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.stone;
  must(deserialize(old).resources.stone === 0, "قدیمی بدون سنگ یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.stone = -5;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "سنگ منفی باید SaveError بدهد");
  return { name: "سازگاری ذخیره سنگ", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب" };
}


// سازگاری گندم (0.20.0): حفظ + ذخیره قدیمی بدون wheat → صفر + رد خراب.
function t_wheat_save_compat() {
  const { state } = fresh();
  state.resources.wheat = 37;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.wheat === 37, `گندم باید ۳۷ بماند، هست ${loaded.resources.wheat}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.wheat;
  must(deserialize(old).resources.wheat === 0, "قدیمی بدون گندم یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.wheat = 501;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "گندم بالای سقف باید SaveError بدهد");
  return { name: "سازگاری ذخیره گندم", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب" };
}


// سازگاری رازک/آبجو (0.21.0): حفظ + قدیمی بدون آن‌ها → صفر + رد خراب.
function t_beer_save_compat() {
  const { state } = fresh();
  state.resources.hops = 37;
  state.resources.beer = 12;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.hops === 37, `رازک باید ۳۷ بماند، هست ${loaded.resources.hops}`);
  must(loaded.resources.beer === 12, `آبجو باید ۱۲ بماند، هست ${loaded.resources.beer}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.hops;
  delete old.resources.beer;
  const legacy = deserialize(old);
  must(legacy.resources.hops === 0 && legacy.resources.beer === 0, "قدیمی بدون زنجیره یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.hops = -1;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "رازک منفی باید SaveError بدهد");
  return { name: "سازگاری ذخیره آبجو", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب" };
}


// سازگاری آرد (0.38.0): حفظ + قدیمی بدون آرد → صفر + رد خراب + سقف انبار غذا.
function t_flour_save_compat() {
  const { state } = fresh();
  state.resources.flour = 37;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.flour === 37, `آرد باید ۳۷ بماند، هست ${loaded.resources.flour}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.flour;
  const legacy = deserialize(old);
  must(legacy.resources.flour === 0, "قدیمی بدون آرد یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.flour = -1;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "آرد منفی باید SaveError بدهد");
  must(capFor(state, "flour") === 500, "سقف پایه آرد ۵۰۰ است");
  return { name: "سازگاری ذخیره آرد", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب + سقف" };
}


// سازگاری آهن/شمشیر/کمان (0.44.0): حفظ + قدیمی بدون آن‌ها → صفر + رد خراب + سقف.
function t_weapon_save_compat() {
  const { state } = fresh();
  state.resources.iron = 37; state.resources.swords = 12; state.resources.bows = 5;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.iron === 37 && loaded.resources.swords === 12 && loaded.resources.bows === 5,
    "زنجیره سلاح باید حفظ شود");
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.iron; delete old.resources.swords; delete old.resources.bows;
  const legacy = deserialize(old);
  must(legacy.resources.iron === 0 && legacy.resources.swords === 0 && legacy.resources.bows === 0,
    "قدیمی بدون زنجیره یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.swords = -1;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "شمشیر منفی باید SaveError بدهد");
  must(capFor(state, "iron") === 500, "سقف پایه آهن ۵۰۰ است");
  return { name: "سازگاری ذخیره سلاح", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب + سقف" };
}


// سازگاری گوشت (0.112.0 — بند ۴۰): حفظ + قدیمی بدون آن → صفر + رد خراب + سقف.
function t_meat_save_compat() {
  const { state } = fresh();
  state.resources.meat = 37;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.meat === 37, `گوشت باید ۳۷ بماند، هست ${loaded.resources.meat}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.meat;
  const legacy = deserialize(old);
  must(legacy.resources.meat === 0, "قدیمی بدون گوشت یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.meat = -1;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "گوشت منفی باید SaveError بدهد");
  must(capFor(state, "meat") === 500, "سقف پایه گوشت ۵۰۰ است");
  return { name: "سازگاری ذخیره گوشت", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب + سقف" };
}


// سازگاری پنیر (0.113.0 — بند ۴۰): حفظ + قدیمی بدون آن → صفر + رد خراب + سقف.
function t_cheese_save_compat() {
  const { state } = fresh();
  state.resources.cheese = 37;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.cheese === 37, `پنیر باید ۳۷ بماند، هست ${loaded.resources.cheese}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.cheese;
  const legacy = deserialize(old);
  must(legacy.resources.cheese === 0, "قدیمی بدون پنیر یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.cheese = -1;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "پنیر منفی باید SaveError بدهد");
  must(capFor(state, "cheese") === 500, "سقف پایه پنیر ۵۰۰ است");
  return { name: "سازگاری ذخیره پنیر", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب + سقف" };
}


// سازگاری سیب (0.114.0 — بند ۴۰): حفظ + قدیمی بدون آن → صفر + رد خراب + سقف.
function t_apples_save_compat() {
  const { state } = fresh();
  state.resources.apples = 37;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.apples === 37, `سیب باید ۳۷ بماند، هست ${loaded.resources.apples}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.apples;
  const legacy = deserialize(old);
  must(legacy.resources.apples === 0, "قدیمی بدون سیب یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.apples = -1;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "سیب منفی باید SaveError بدهد");
  must(capFor(state, "apples") === 500, "سقف پایه سیب ۵۰۰ است");
  return { name: "سازگاری ذخیره سیب", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب + سقف" };
}

export { persistCases };
