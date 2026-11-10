// اقتصاد (0.248.0 — C-CLN-40): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
// placeAll محلی همین سوئیت است؛ putNear/snapOf مشترک‌اند و از fixtures می‌آیند.
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


const SPOTS_2X2 = [[1, 1], [4, 1], [7, 1], [1, 4], [4, 4], [7, 4], [1, 7]];

function placeAll(state, terrain, W, H, type, spots) {
  for (const [c, r] of spots) {
    const res = tryPlace(state, terrain, W, H, c, r, CONFIG.BUILDINGS[type]);
    must(res.ok, `ساخت ${type} در (${c},${r}) باید موفق باشد`);
  }
}


// --- ECON-001 ---

function t_production() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter); // هزینه ۱۵ چوب
  sim(state, 200);
  must(state.resources.wood === 115, `چوب باید ۱۱۵ باشد، هست ${state.resources.wood}`);
  return { name: "تولید ساده", pass: true, detail: "wood=115 پس از ۲۰۰ تیک (با هزینه ساخت)" };
}


// انبار مرکزی واحد (فاز ۱ بند ۲۶): همه زنجیره‌ها در همان مخزن مشترک می‌ریزند
// و هیچ بنایی موجودی محلی نگه نمی‌دارد (بدون انباشت نامرئی خارج سقف).
function t_stockpile_central() {
  const { W, H, terrain, state } = fresh();
  must(tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter).ok, "چوب‌بری");
  must(tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.hopsfarm).ok, "مزرعه رازک");
  sim(state, 200);
  must(state.resources.wood === 100, `چوب مخزن باید ۱۰۰ باشد (۱۲۰−۳۰+۱۰)، هست ${state.resources.wood}`);
  must(state.resources.hops === 10, `رازک مخزن باید ۱۰ باشد، هست ${state.resources.hops}`);
  const goods = ["wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows"];
  for (const b of state.buildings) {
    for (const k of Object.keys(b)) must(!goods.includes(k), `بنا نباید موجودی محلی داشته باشد (${b.type}.${k})`);
  }
  return { name: "انبار مرکزی واحد", pass: true, detail: "چوب+رازک در یک مخزن، بدون موجودی محلی" };
}


function t_storageCap() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  state.resources.wood = 499; // پس از ساخت (هزینه از ۱۲۰ کم شده بود)
  sim(state, 40);
  must(state.resources.wood === 500, `چوب باید سقف ۵۰۰ بماند، هست ${state.resources.wood}`);
  return { name: "اشباع انبار", pass: true, detail: "wood=500 (بدون انباشت نامرئی)" };
}


// سقف انبار (0.34.0): پایه ۵۰۰؛ هر انبار سالم +۵۰۰ چوب/سنگ/طلا؛ هر انبار
// غذای سالم +۵۰۰ غذا/گندم/رازک/آبجو؛ ویرانی مازاد را می‌تراشد؛ در MP
// به‌ازای مالک؛ موجودی بالای پایه در ذخیره می‌ماند، مازاد بر سقف رد می‌شود.
function t_storage_caps() {
  const { W, H, terrain, state } = fresh();
  state.resources.wood = 500;
  must(capFor(state, "wood") === 500, "پایه سقف چوب ۵۰۰ است");
  const s = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.stockpile);
  must(s.ok, "انبار باید ساخته شود");
  completeAll(state); // سقف پس از تکمیل می‌آید (0.39.0)
  must(capFor(state, "wood") === 1000, "یک انبار: سقف چوب ۱۰۰۰");
  must(capFor(state, "stone") === 1000 && capFor(state, "gold") === 10499, "انبار: سقف سنگ/طلا هم بالا می‌رود");
  must(capFor(state, "food") === 500, "انبار سقف غذا را بالا نمی‌برد");
  const g = tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.granary);
  must(g.ok, "انبار غذا باید ساخته شود");
  completeAll(state);
  must(capFor(state, "food") === 1000 && capFor(state, "beer") === 1000, "انبار غذا: سقف غذا/آبجو ۱۰۰۰");
  must(capFor(state, "wood") === 1000, "انبار غذا سقف چوب را بالا نمی‌برد");
  // موجودی بالای پایه نگه داشته می‌شود (نه تراشیده)
  state.resources.wood = 900; state.resources.food = 900;
  sim(state, 1);
  must(state.resources.wood === 900 && state.resources.food === 900, "زیر سقف تازه نباید تراشیده شود");
  // ویرانی انبار، مازاد چوب را می‌تراشد ولی غذای انبار غذای سالم می‌ماند
  s.building.destroyed = true;
  simC(state, terrain, 1); // جاروی نبرد، ویران‌شده را پاک می‌کند
  must(!state.buildings.some((b) => b.type === "stockpile" && !b.destroyed), "انبار ویران باید پاک شود");
  must(state.resources.wood === 500, `پس از ویرانی چوب باید ۵۰۰ شود، هست ${state.resources.wood}`);
  must(state.resources.food === 900, "غذای انبار غذای سالم باید بماند");
  // ذخیره/بارگذاری با موجودی بالای پایه
  const s2 = tryPlace(state, terrain, W, H, 7, 1, CONFIG.BUILDINGS.stockpile);
  must(s2.ok, "انبار دوم باید ساخته شود");
  completeAll(state);
  state.resources.wood = 900;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.wood === 900, "موجودی بالای پایه باید در ذخیره بماند");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.wood = 1500; // سقف چوب با یک انبار ۱۰۰۰ است
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "مازاد بر سقف انبار باید SaveError بدهد");
  // چندنفره: انبار حریف سقف من را بالا نمی‌برد
  s2.building.destroyed = true;
  simC(state, terrain, 1);
  enableMp(state, 2, ["A", "B"]);
  state.mpres[1].resources.wood = 500;
  const m = tryPlace(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.stockpile, 1);
  must(m.ok, "بازیکن ۱ انبار خودش را می‌سازد");
  completeAll(state);
  must(capFor(state, "wood", 1) === 1000, "سقف چوب بازیکن ۱ باید ۱۰۰۰ باشد");
  must(capFor(state, "wood", 0) === 500, "سقف چوب بازیکن ۰ باید ۵۰۰ بماند");
  must(capFor(state, "food", 0) === 1000, "سقف غذای بازیکن ۰ با انبار غذای خودش ۱۰۰۰ است");
  must(capFor(state, "food", 1) === 500, "سقف غذای بازیکن ۱ باید ۵۰۰ بماند");
  return { name: "سقف انبار", pass: true, detail: "پله/ویرانی/ذخیره/MP" };
}


function t_noWorker() {
  const { W, H, terrain, state } = fresh();
  state.workers = 6; // استخر صریح برای این تست (پیش‌فرض بازی ۴ است)
  placeAll(state, terrain, W, H, "woodcutter", SPOTS_2X2);
  sim(state, 1);
  const idle = state.buildings.filter((b) => b.staffed === false);
  must(idle.length === 1, `باید دقیقاً ۱ ساختمان بی‌کارگر باشد، هست ${idle.length}`);
  sim(state, 19);
  must(state.resources.wood === 21, `چوب باید ۲۱ باشد (۱۵−۱۰۵+۶)، هست ${state.resources.wood}`);
  return { name: "توقف بدون کارگر", pass: true, detail: "هفتمین ساختمان idle، wood=21" };
}


function t_foodFloor() {
  const { W, H, terrain, state } = fresh();
  state.resources.food = 0;
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  sim(state, 200);
  must(state.resources.food === 0, `غذا نباید منفی شود، هست ${state.resources.food}`);
  must(state.shortageTotal === 1, `بدهی کمبود باید ۱ باشد، هست ${state.shortageTotal}`);
  return { name: "کف غذا و بدهی کمبود", pass: true, detail: "food=0، shortage=1" };
}


function t_deterministic() {
  const run = () => {
    const { W, H, terrain, state } = fresh();
    tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
    tryPlace(state, terrain, W, H, 1, 5, CONFIG.BUILDINGS.farm);
    sim(state, 600);
    return JSON.stringify({
      res: state.resources, tick: state.tick, w: state.workers, pop: state.popularity,
      b: state.buildings.map((b) => [b.type, b.c, b.r, b.staffed, b.progress || 0]),
      p: state.producedTotal, c: state.consumedTotal, s: state.shortageTotal,
    });
  };
  const a = run(), b = run();
  must(a === b, "دو اجرای یکسان باید وضعیت یکسان بدهند");
  return { name: "قطعیت شبیه‌سازی", pass: true, detail: "۶۰۰ تیک یکسان" };
}


// --- ECON-002 ---

function t_popRise() {
  const { state } = fresh();
  state.tax = "none";
  state.rations = "double"; // هدف: ۵۰+۱+۸+۲=۶۱
  must(popTarget(state) === 61, `هدف باید ۶۱ باشد، هست ${popTarget(state)}`);
  sim(state, 50);
  must(state.popularity === 52, `محبوبیت باید ۵۲ باشد، هست ${state.popularity}`);
  return { name: "رشد محبوبیت", pass: true, detail: "pop=52، هدف ۵۷" };
}


function t_starve() {
  const { W, H, terrain, state } = fresh();
  state.resources.food = 0;
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  sim(state, 600); // هدف ۴۵؛ مصرف در ۲۰۰/۴۰۰/۶۰۰
  must(state.popularity === 45, `محبوبیت باید ۴۵ باشد، هست ${state.popularity}`);
  must(state.shortageTotal === 3, `بدهی باید ۳ باشد، هست ${state.shortageTotal}`);
  return { name: "اثر قحطی", pass: true, detail: "pop=45، shortage=3" };
}


// فرمول محبوبیت (فاز ۱ بند ۵۲): شروع ۵۰ + جمع اثرها با گیره ۰..۱۰۰ + گام پلکانی.
function t_popularity_formula() {
  const { state } = fresh();
  must(state.popularity === 50 && createState().popularity === 50, "شروع محبوبیت باید ۵۰ باشد");
  for (const t of TAX_IDS) for (const r of RATION_IDS) {
    state.tax = t; state.rations = r;
    const v = popTarget(state);
    must(v >= 0 && v <= 100, `هدف ${t}/${r} باید در بازه ۰..۱۰۰ باشد`);
  }
  state.tax = "generousBribe"; state.rations = "double"; state.resources.gold = 500;
  must(popTarget(state) === 67, "سقف reachable باید ۶۷ باشد (۵۰+۷+۸+۲)");
  state.tax = "cruellerThanCruel"; state.rations = "none"; state.resources.food = 0; state.resources.gold = 0;
  must(popTarget(state) === 12, "کف reachable باید ۱۲ باشد (۵۰−۲۴−۸−۶)");
  must(POP_STEP === 2, "گام نرم‌شدن به‌سمت هدف باید ۲ باشد");
  return { name: "فرمول محبوبیت", pass: true, detail: "شروع ۵۰ + بازه + سقف/کف" };
}


function t_immigration() {
  const { W, H, terrain, state } = fresh();
  placeAll(state, terrain, W, H, "hut", [[1, 1], [4, 1]]); // سقف ۲۰ (۴ پایه + ۲×۸)
  must(state.workerCap === 4, "سقف باید پیش از تیک ۴ باشد (پس از step: ۲۰)");
  state.popularity = 70;
  sim(state, 300); // مهاجرت در ۱۰۰/۲۰۰/۳۰۰ (pop: ۶۶/۶۲/۵۸)
  must(state.workers === 7, `کارگر باید ۷ باشد، هست ${state.workers}`);
  must(state.workerCap === 20, `سقف باید ۲۰ باشد، هست ${state.workerCap}`);
  return { name: "مهاجرت به داخل", pass: true, detail: "workers=7، cap=20" };
}


function t_emigration() {
  const { state } = fresh();
  state.workers = 6;
  state.popularity = 20;
  sim(state, 200); // مهاجرت در ۱۰۰/۲۰۰ (pop: ۲۲/۲۴)
  must(state.workers === 4, `کارگر باید ۴ باشد، هست ${state.workers}`);
  return { name: "مهاجرت به خارج", pass: true, detail: "workers=4" };
}


// --- آتش اردو (فاز ۱ بند ۱۴): نشانگر خالص و مشتق از tick است (بدون میدان تازه).
function t_camp_gauge() {
  const { state } = fresh();
  state.tick = 30; state.popularity = 70; state.workers = 3; // سقف پایه ۴
  let g = campGauge(state);
  must(g.dir === 1 && g.prog === 0.3, `ورود: dir=${g.dir} prog=${g.prog}`);
  must(g.waiting === state.freeWorkers, "انتظار = استخر آزاد");
  state.workers = 4; // پر = خنثی
  must(campGauge(state).dir === 0, "سقف پر = خنثی");
  state.popularity = 20; state.workers = 6;
  g = campGauge(state);
  must(g.dir === -1 && g.prog === 0.3, `ترک: dir=${g.dir} prog=${g.prog}`);
  state.workers = 0;
  must(campGauge(state).dir === 0, "بدون جمعیت = خنثی");
  state.tick = MIG_PERIOD - 1; state.popularity = 70; state.workers = 0;
  must(campGauge(state).prog === (MIG_PERIOD - 1) / MIG_PERIOD, "کسر از MIG_PERIOD داده");
  const mp = { tick: 50, mp: { enabled: true, num: 2 },
    mpres: [{ popularity: 80, workers: 1, freeWorkers: 1 }, { popularity: 10, workers: 3, freeWorkers: 0 }],
    buildings: [] };
  must(campGauge(mp, 0).dir === 1 && campGauge(mp, 1).dir === -1, "برش MP ورود/ترک");
  must(campGauge(mp, 0).prog === 0.5 && campGauge(mp, 0).waiting === 1, "پیشرفت/انتظار MP");
  return { name: "نشانگر آتش اردو", pass: true, detail: "ورود/ترک/خنثی + MP" };
}


// چرخش کامل نشانگر = ۱ دهقان که کنار آتش منتظر کار می‌ماند.
function t_camp_arrival() {
  const { W, H, terrain, state } = fresh();
  placeAll(state, terrain, W, H, "hut", [[1, 1], [4, 1]]); // سقف ۲۰
  state.popularity = 70;
  sim(state, 100); // مهاجرت در ۱۰۰ (pop: ۶۶)
  must(state.workers === 5, `کارگر باید ۵ باشد، هست ${state.workers}`);
  const g = campGauge(state);
  must(g.prog === 0 && g.dir === 1, `پس از چرخش: prog=${g.prog} dir=${g.dir}`);
  must(g.waiting === state.freeWorkers, "انتظار = استخر آزاد");
  sim(state, 1); // تازه‌وارد تیک بعد در استخر آزاد می‌نشیند (تخصیص پیش از مهاجرت همان تیک است)
  must(state.freeWorkers === 5 && campGauge(state).waiting === 5, `۵ بیکار کنار آتش، هست ${state.freeWorkers}`);
  return { name: "ورود دهقان هر چرخش", pass: true, detail: "workers=5، ۵ بیکار" };
}


// --- سقف جمعیت/نیرو (فاز ۱ بند ۱۰۱ — §۱۸.۵): Crusader ۲۰۰۰ (اعمال‌شده)،
// Extreme ۱۰٬۰۰۰ (فقط پین داده — حالتی در بازی نیست). شمارش = استخر کارگران
// همان مالک + یگان‌های زنده غیرسناریویی‌اش (موج‌ها side=enemy بیرون‌اند).
// در سقف: مهاجرت (سولو/MP/AI) نمی‌آید و سررسیده قطار آموزش در صف می‌ماند
// (بدون بازپرداخت/رویداد) تا جا باز شود؛ هسته spawnUnit گیت نمی‌شود تا
// spawnLord همیشه کار کند.
function t_pop_caps() {
  must(POP_CAP === 2000 && POP_CAP_EXTREME === 10000 && CAMP_IDLE_MAX === 24, "سقف‌ها باید ۲۰۰۰/۱۰٬۰۰۰/۲۴ از داده باشند");
  must(POP_CAP === TUNING.population.crusader && POP_CAP_EXTREME === TUNING.population.extreme &&
    CAMP_IDLE_MAX === TUNING.population.campIdleMax, "سقف‌ها باید آینه داده باشند");
  // شمارش خالص: استخر + یگان خودی زنده؛ مرده/دشمن‌ساید/مالک دیگر بیرون.
  const c = fresh();
  c.state.workers = 10;
  for (let i = 0; i < 3; i++) c.state.units.push({ type: "soldier", owner: 0, side: "player", dead: false, hp: 10, maxHp: 10, x: 5, r: 5 });
  c.state.units.push({ type: "soldier", owner: 0, side: "player", dead: true, hp: 0, maxHp: 10, x: 5, r: 5 });
  c.state.units.push({ type: "swordsman", owner: 0, side: "enemy", dead: false, hp: 10, maxHp: 10, x: 6, r: 5 });
  c.state.units.push({ type: "soldier", owner: 1, side: "player", dead: false, hp: 10, maxHp: 10, x: 7, r: 5 });
  must(popTotal(c.state, 0) === 13, `شمارش مالک ۰ باید ۱۳ باشد، هست ${popTotal(c.state, 0)}`);
  const before = JSON.stringify(c.state);
  popTotal(c.state, 0); atPopCap(c.state, 0);
  must(JSON.stringify(c.state) === before, "شمارش/سقف باید خالص باشند");
  // مرز سقف (تمیز، بدون یگان): ۱۹۹۹ باز، ۲۰۰۰ بسته.
  const b = fresh();
  b.state.workers = 1999;
  must(atPopCap(b.state, 0) === false, "۱۹۹۹ زیر سقف است");
  b.state.workers = 2000;
  must(atPopCap(b.state, 0) === true, "۲۰۰۰ در سقف است");
  // گیت مهاجرت سولو: همه گیت‌های دیگر باز ولی سقف پر → هیچ‌کس نمی‌آید؛
  // یکی کمتر → +۱. (یگان‌ها زیر sim() بی‌اثرند — فقط در شمارش‌اند.)
  const runSolo = (extras) => {
    const f = fresh();
    placeAll(f.state, f.terrain, f.W, f.H, "hut", [[1, 1], [4, 1]]); // سقف ۲۰
    f.state.workers = 10;
    f.state.popularity = 100;
    for (let i = 0; i < extras; i++) f.state.units.push({ type: "soldier", owner: 0, side: "player", dead: false, hp: 10, maxHp: 10, x: 5, r: 5 });
    f.state.tick = MIG_PERIOD - 1;
    sim(f.state, 1);
    return f.state.workers;
  };
  must(runSolo(1990) === 10, "۱۰+۱۹۹۰=۲۰۰۰: مهاجرت بسته است");
  must(runSolo(1989) === 11, "۱۰+۱۹۸۹=۱۹۹۹: مهاجرت باز است (+۱)");
  // آینه MP: مالک ۰ در سقف می‌ماند، مالک ۱ (زیر سقف) +۱ می‌گیرد.
  const m = fresh();
  enableMp(m.state, 2, ["A", "B"]);
  for (const ow of [0, 1]) m.state.mpres[ow].resources.wood = 200;
  placeAll(m.state, m.terrain, m.W, m.H, "hut", [[1, 1], [4, 1]]); // مالک ۰
  for (const [cc, rr] of [[1, 4], [4, 4]]) {
    const p = tryPlace(m.state, m.terrain, m.W, m.H, cc, rr, CONFIG.BUILDINGS.hut, 1);
    must(p.ok, `کلبه مالک ۱ در (${cc}،${rr}) باید ساخته شود`);
  }
  m.state.mpres[0].workers = 10; m.state.mpres[0].popularity = 100;
  m.state.mpres[1].popularity = 100;
  for (let i = 0; i < 1990; i++) m.state.units.push({ type: "soldier", owner: 0, side: "player", dead: false, hp: 10, maxHp: 10, x: 5, r: 5 });
  m.state.tick = MIG_PERIOD - 1;
  sim(m.state, 1);
  must(m.state.mpres[0].workers === 10, `مالک ۰ در سقف می‌ماند، هست ${m.state.mpres[0].workers}`);
  must(m.state.mpres[1].workers === 5, `مالک ۱ باید +۱ بگیرد، هست ${m.state.mpres[1].workers}`);
  // سررسیده قطار در سقف در صف می‌ماند (بدون تحویل/بازپرداخت)؛ با جا تحویل می‌شود.
  const tr = fresh();
  needBarracks(tr.state, tr.terrain, tr.W, tr.H);
  const spot = grassNear(tr.terrain, tr.state.occ, tr.W, tr.H, 20, 20);
  must(spot, "جای تحویل باید باشد");
  must(queueHire(tr.state, tr.terrain, tr.W, tr.H, spot[0], spot[1], "soldier", 0).ok, "سفارش باید موفق باشد");
  const rax = tr.state.buildings.find((x) => x.type === "barracks");
  rax.train[0].left = 1;
  tr.state.workers = 2000;
  stepTraining(tr.state, tr.terrain);
  must(rax.train.length === 1 && tr.state.units.length === 0, "در سقف: صف می‌ماند و تحویلی نیست");
  tr.state.workers = 10;
  stepTraining(tr.state, tr.terrain);
  must(rax.train.length === 0 && tr.state.units.length === 1, "با جا: تحویل می‌شود");
  // شاخه AI شمارش (خالص): استخر ai + یگان‌های AI_OWNER.
  const a = fresh();
  a.state.ai.workers = 10;
  for (let i = 0; i < 1990; i++) a.state.units.push({ type: "soldier", owner: AI_OWNER, side: "player", dead: false, hp: 10, maxHp: 10, x: 5, r: 5 });
  must(popTotal(a.state, AI_OWNER) === 2000 && atPopCap(a.state, AI_OWNER) === true, "AI در سقف است");
  a.state.units.pop();
  must(popTotal(a.state, AI_OWNER) === 1999 && atPopCap(a.state, AI_OWNER) === false, "AI یکی کمتر = باز");
  must(popTotal(a.state, 0) === a.state.workers, "یگان AI در شمارش بازیکن نیست");
  return { name: "سقف جمعیت/نیرو", pass: true, detail: "۲۰۰۰/۱۰٬۰۰۰ + شمارش/مرز + گیت سولو/MP + صف قطار + AI" };
}


// --- سقف بیکار کنار آتش (فاز ۱ بند ۶۷): حداکثر ۲۴ دهقان بیکار؛ مهاجرت
// تازه فقط اگر استخر آزاد < ۲۴ باشد. کارگران گماشته‌شده (استخر کم ولی
// جمعیت زیاد) مهاجرت را نمی‌بندند — فقط بیکاران کنار آتش شمرده می‌شوند.
function t_camp_idle() {
  must(CAMP_IDLE_MAX === 24 && CAMP_IDLE_MAX === TUNING.population.campIdleMax, "سقف بیکار باید ۲۴ از داده باشد");
  const runSolo = (workers) => {
    const f = fresh();
    placeAll(f.state, f.terrain, f.W, f.H, "hut", [[1, 1], [4, 1], [7, 1]]); // سقف ۲۸
    f.state.workers = workers;
    f.state.popularity = 100;
    f.state.tick = MIG_PERIOD - 1;
    sim(f.state, 1);
    return f.state.workers;
  };
  must(runSolo(24) === 24, "۲۴ بیکار: مهاجرت بسته است");
  must(runSolo(23) === 24, "۲۳ بیکار: +۱ می‌آید");
  // آینه MP: مالک ۰ با ۲۴ بیکار می‌ماند، مالک ۱ با ۲۳ بیکار +۱ می‌گیرد.
  const m = fresh();
  enableMp(m.state, 2, ["A", "B"]);
  for (const ow of [0, 1]) m.state.mpres[ow].resources.wood = 200;
  placeAll(m.state, m.terrain, m.W, m.H, "hut", [[1, 1], [4, 1], [7, 1]]); // مالک ۰
  for (const [cc, rr] of [[1, 4], [4, 4], [7, 4]]) {
    const p = tryPlace(m.state, m.terrain, m.W, m.H, cc, rr, CONFIG.BUILDINGS.hut, 1);
    must(p.ok, `کلبه مالک ۱ در (${cc}،${rr}) باید ساخته شود`);
  }
  m.state.mpres[0].workers = 24; m.state.mpres[0].popularity = 100;
  m.state.mpres[1].workers = 23; m.state.mpres[1].popularity = 100;
  m.state.tick = MIG_PERIOD - 1;
  sim(m.state, 1);
  must(m.state.mpres[0].workers === 24, `مالک ۰ می‌ماند، هست ${m.state.mpres[0].workers}`);
  must(m.state.mpres[0].freeWorkers === 24, `بیکار مالک ۰ باید ۲۴ باشد، هست ${m.state.mpres[0].freeWorkers}`);
  must(m.state.mpres[1].workers === 24, `مالک ۱ باید +۱ بگیرد، هست ${m.state.mpres[1].workers}`);
  return { name: "سقف بیکار کنار آتش", pass: true, detail: "۲۴ بسته/۲۳ باز + آینه MP" };
}


// --- مسکن (فاز ۱ بند ۱۶): ستاد مسکن اولیه می‌دهد؛ هر Hovel (کلبه) +۸.
// ظرفیت‌ها از TUNING می‌آیند؛ نیمه‌کاره/ویرانه مسکن نمی‌دهد.
function t_hovel_housing() {
  const { W, H, terrain, state } = fresh();
  must(housingCap(state) === BASE_HOUSING, "بی‌بنا = پایه");
  must(placeKeep(state, terrain, W, H).ok, "ستاد");
  completeAll(state);
  must(housingCap(state) === BASE_HOUSING + KEEP_HOUSING, `ستاد = پایه + ${KEEP_HOUSING}`);
  must(KEEP_HOUSING === 8, "مسکن اولیه ستاد ۸ است (§۴: Manor/Keep)");
  placeAll(state, terrain, W, H, "hut", [[1, 1], [4, 1]]);
  completeAll(state);
  must(HUT_HOUSING === 8 && HUT_HOUSING === TUNING.housing.hut, "کلبه +۸ از داده");
  must(housingCap(state) === BASE_HOUSING + KEEP_HOUSING + 2 * HUT_HOUSING,
    `سقف باید ${BASE_HOUSING + KEEP_HOUSING + 2 * HUT_HOUSING} باشد، هست ${housingCap(state)}`);
  const huts = state.buildings.filter((b) => b.type === "hut");
  huts[0].buildLeft = 5;
  must(housingCap(state) === BASE_HOUSING + KEEP_HOUSING + HUT_HOUSING, "نیمه‌کاره مسکن نمی‌دهد");
  huts[0].buildLeft = 0; huts[1].destroyed = true;
  must(housingCap(state) === BASE_HOUSING + KEEP_HOUSING + HUT_HOUSING, "ویرانه مسکن نمی‌دهد");
  return { name: "مسکن ستاد و کلبه", pass: true, detail: "پایه+۸+۲×۸، نیمه‌کاره/ویرانه صفر" };
}


// --- ازدحام (فاز ۱ بند ۱۷): جمعیت > مسکن = نشانگر قرمز (پرچم خالص campGauge).
// علت‌ها (تخریب خانه) و راه‌حل (مسکن بیشتر) در sim؛ disband با فاز ۹ می‌آید (#171).
function t_crowding_flag() {
  const { W, H, terrain, state } = fresh(); // workers=۴، سقف پایه ۴
  must(campGauge(state).crowded === false, "۴>۴ نیست");
  state.workers = 6;
  must(campGauge(state).crowded === true, "۶>۴ = ازدحام");
  const before = JSON.stringify(state);
  campGauge(state);
  must(JSON.stringify(state) === before, "پرچم state را لمس نمی‌کند");
  const mp = { tick: 7, mp: { enabled: true, num: 2 },
    mpres: [{ popularity: 60, workers: 9, freeWorkers: 2 }, { popularity: 60, workers: 3, freeWorkers: 3 }],
    buildings: [] };
  must(campGauge(mp, 0).crowded === true && campGauge(mp, 1).crowded === false, "ازدحام برش MP");
  const t2 = fresh();
  t2.state.workers = 10;
  placeAll(t2.state, t2.terrain, t2.W, t2.H, "hut", [[1, 1]]); // سقف ۱۲
  sim(t2.state, 1);
  must(campGauge(t2.state).crowded === false, "۱۰<۱۲ = جا هست");
  const hut = t2.state.buildings.find((b) => b.type === "hut");
  demolishBuilding(t2.state, hut); // تخریب خانه → سقف ۴
  must(campGauge(t2.state).crowded === true, "تخریب خانه = ازدحام (۱۰>۴)");
  return { name: "پرچم ازدحام", pass: true, detail: "مرز + MP + تخریب/راه‌حل" };
}


// اثر منفی ازدحام (فاز ۱ بند ۶۹): جمعیت > مسکن = −۲ به هدف محبوبیت (🔧 حدس).
function t_crowding_pop() {
  const { state } = fresh(); // workers=۴، سقف ۴ → بدون ازدحام
  const base = popTarget(state);
  must(crowdPop(state) === 0, "۴>۴ نیست");
  state.workers = 6;
  must(crowdPop(state) === CROWD_POP && popTarget(state) === base + CROWD_POP, "ازدحام ۶>۴ = −۲ به هدف");
  state.workers = 4;
  must(popTarget(state) === base, "با رفع ازدحام اثر می‌رود");
  const mp = { mp: { enabled: true, num: 2 },
    mpres: [{ tax: "none", rations: "normal", resources: { food: 120 }, workers: 6 },
      { tax: "none", rations: "normal", resources: { food: 120 }, workers: 2 }],
    buildings: [] };
  must(crowdPop(mp, 0) === -2 && crowdPop(mp, 1) === 0, "برش MP: فقط مالک شلوغ جریمه می‌شود");
  must(popTarget(mp, 0) === popTarget(mp, 1) - 2, "هدف MP با جریمه می‌خواند");
  return { name: "اثر منفی ازدحام", pass: true, detail: "−۲ + برش MP" };
}


// رویدادهای موقت §۵.۴ (فاز ۱ بندهای ۷۰/۷۱): نمایشگاه (+۴) + شیر/بیماری (−۳) —
// پنجره‌های دوره‌ای خالص از tick (بدون میدان تازه) + اثر در هدف محبوبیت.
function t_events() {
  const mk = (tick) => ({ tick });
  must(activeEvents(mk(1499)).length === 0, "پیش از نمایشگاه هیچ رویدادی نیست");
  must(JSON.stringify(activeEvents(mk(1500))) === '["fair"]', "نمایشگاه ۱۵۰۰–۱۸۰۰");
  must(activeEvents(mk(1799)).includes("fair") && !activeEvents(mk(1800)).includes("fair"), "پایان پنجره نمایشگاه (شیر از ۱۸۰۰ شروع می‌شود)");
  must(eventBonus(mk(1600)) === 4, "پاداش نمایشگاه +۴ است");
  must(JSON.stringify(activeEvents(mk(1800))) === '["lion"]' && eventBonus(mk(1900)) === -3, "شیر ۱۸۰۰–۲۰۰۰ با −۳");
  must(activeEvents(mk(2200)).includes("disease") && activeEvents(mk(2450)).length === 0, "بیماری ۲۲۰۰–۲۴۵۰ با −۳");
  must(activeEvents(mk(3500)).includes("fair"), "تکرار چرخه‌ای نمایشگاه (۱۵۰۰+۲۰۰۰)");
  must(JSON.stringify(activeEvents(mk(1600))) === JSON.stringify(activeEvents(mk(1600))), "خالص و قطعی");
  const { state } = fresh();
  const base = popTarget(state);
  state.tick = 1600;
  must(popTarget(state) === base + 4, "هدف در پنجره نمایشگاه +۴ می‌گیرد");
  must(policySummary(state).events.includes("fair"), "خلاصه سیاست رویداد فعال را دارد");
  const faF = t("main.event.fair");
  must(typeof faF === "string" && faF.includes("نمایشگاه") && !faF.includes("main.event"), "نام fa نمایشگاه حل شود");
  withLang("en", () => {
    must(t("main.event.lion").includes("Lion"), "نام en شیر حل شود");
  });
  const before = JSON.stringify(state);
  activeEvents(state); eventBonus(state);
  must(JSON.stringify(state) === before, "رویدادها خالص‌اند");
  return { name: "رویدادهای موقت", pass: true, detail: "نمایشگاه/شیر/بیماری + خلاصه + fa/en" };
}


// --- تنوع غذا (فاز ۱ بند ۱۸): ورودی اول §۵.۱ — شمار انواع خوردنیِ موجود + پاداش جدول.
function t_food_variety() {
  const { state } = fresh(); // food=۱۲۰
  let v = foodVariety(state);
  must(v.types === 1 && v.bonus === 0, `۱ نوع = +۰، شد ${v.types}/${v.bonus}`);
  state.resources.food = 0;
  v = foodVariety(state);
  must(v.types === 0 && v.bonus === 0, "انبار خالی = +۰ (قحطی جدا اثر می‌کند)");
  state.resources.beer = 5;
  must(foodVariety(state).types === 0, "آبجو نوع غذا نیست (پوشش میخانه جداست)");
  must(JSON.stringify(FOOD_TYPES) === JSON.stringify(TUNING.foodVariety.types) &&
    JSON.stringify(FOOD_BONUS) === JSON.stringify(TUNING.foodVariety.bonus),
    "فهرست/جدول آینه داده");
  must(JSON.stringify(FOOD_BONUS) === "[0,1,2,3]", "جدول §۵.۱: ۰/+۱/+۲/+۳");



  const mp = { tick: 3, mp: { enabled: true, num: 2 },
    mpres: [{ popularity: 50, resources: { food: 10 } }, { popularity: 50, resources: {} }],
    buildings: [] };
  must(foodVariety(mp, 0).types === 1 && foodVariety(mp, 1).types === 0, "برش MP");
  const s = policySummary(state);
  must(s.food && s.food.types === 0 && s.food.bonus === 0, "خلاصه سیاست تنوع را دارد");
  const ps = fresh().state; // سیم‌کشی در هدف: پاداش تنوع جزئی از جمع است
  must(popTarget(ps) === 50 + TAX[ps.tax].pop + RATIONS[ps.rations].pop + STOCK_POP.fullPop + foodVariety(ps).bonus,
    "هدف شامل پاداش تنوع است");
  const before = JSON.stringify(state);
  foodVariety(state); popTarget(state);
  must(JSON.stringify(state) === before, "خوانش‌ها state را لمس نمی‌کنند");
  return { name: "تنوع انواع غذا", pass: true, detail: "۱ نوع +۰ + آینه داده + MP + سیم‌کشی" };
}


// --- پنج سطح جیره (فاز ۱ بند ۱۹): زیر Full منفی، بالای Full مثبت (جدول خط ۲۰۹).
function t_ration_extra() {
  const { state } = fresh();
  must(popTarget(state) === 53, `هدف Full باید ۵۳ باشد (۵۰+۱+۰+۲)، هست ${popTarget(state)}`);
  state.rations = "extra";
  must(popTarget(state) === 57, `هدف Extra باید ۵۷ باشد، هست ${popTarget(state)}`);
  state.rations = "none";
  must(popTarget(state) === 45, `هدف None باید ۴۵ باشد (قحطی‌وار)، هست ${popTarget(state)}`);
  const a = fresh().state; // رانش تفاضلی: extra پس از ۱۰۰ تیک بالاتر می‌ایستد
  const b = fresh().state; b.rations = "extra";
  sim(a, 100); sim(b, 100);
  must(a.popularity === 53 && b.popularity === 54, `رانش باید ۵۳/۵۴ باشد، هست ${a.popularity}/${b.popularity}`);
  return { name: "پنج سطح جیره", pass: true, detail: "Full=۵۳/Extra=۵۷/None=۴۵ + رانش" };
}


// --- پیش‌فرض و علامت‌های مالیات (بند ۲۰؛ ۱۲ سطح از بند ۳۴): پیش‌فرض No Taxes؛
// هر ۸ مالیات مثبت منفی، هر ۳ رشوه مثبت.
function t_tax_default() {
  const { state } = fresh();
  must(state.tax === "none", `پیش‌فرض سولو باید none باشد، هست ${state.tax}`);
  enableMp(state, 2);
  must(state.mpres[0].tax === "none" && state.mpres[1].tax === "none", "پیش‌فرض MP هم none است");
  for (const id of ["low", "average", "high", "mean", "extortionate", "downrightCruel", "evenCrueler", "cruellerThanCruel"]) must(TAX[id].pop < 0, `مالیات ${id} باید منفی باشد`);
  for (const id of ["generousBribe", "largeBribe", "smallBribe"]) must(TAX[id].pop > 0, `رشوه ${id} باید مثبت باشد`);
  must(TAX.none.goldPerWorker === 0 && TAX.low.goldPerWorker > 0, "none رایگان و low درآمدزا");
  must(Object.keys(TAX).length === 12, "باید ۱۲ سطح مالیات باشد");
  return { name: "پیش‌فرض و علامت مالیات", pass: true, detail: "none پیش‌فرض + ۱۲ سطح" };
}


// --- اسلایدر مالیات (بند ۲۲؛ ۱۲ پله از بند ۳۴): نگاشت خالص جایگاه↔سطح از TAX_IDS.
function t_tax_slider() {
  for (const id of TAX_IDS) must(taxAt(taxIndex(id)) === id, `رفت‌وبرگشت ${id}`);
  must(TAX_IDS.length === 12, "اسلایدر باید ۱۲ پله باشد");
  must(taxIndex("bogus") === TAX_IDS.indexOf("none"), "نامعتبر = جایگاه none");
  must(taxAt(-5) === TAX_IDS[0] && taxAt(999) === TAX_IDS[TAX_IDS.length - 1], "گیره دو سر");
  must(JSON.stringify(TAX_IDS) === JSON.stringify(TUNING.tax.levels.map((l) => l.id)), "ترتیب آینه داده");
  must(taxIndex("generousBribe") === 0 && taxIndex("cruellerThanCruel") === TAX_IDS.length - 1, "سخاوتمند اول و بی‌رحم‌ترین آخر");
  must(taxIndex("none") === 3, "پیش‌فرض none در جایگاه ۳");
  return { name: "نگاشت اسلایدر مالیات", pass: true, detail: "۱۲ پله + رفت‌وبرگشت + گیره + آینه" };
}


// --- رشوه ماهانه (بند ۲۱؛ سه سطح از بند ۳۴): پرداخت از خزانه؛ خزانه خالی =
// بدون اثر اضافی (فقط سطوح پولی). رشوه کوچک رایگان است و همیشه +۳ می‌دهد.
function t_bribe_effect() {
  const { state } = fresh();
  state.tax = "largeBribe";
  state.resources.gold = 0;
  must(popTarget(state) === 52, `خزانه خالی باید ۵۲ بدهد (۵۰+۰+۰+۲)، هست ${popTarget(state)}`);
  state.resources.gold = 10;
  must(popTarget(state) === 57, `با خزانه باید ۵۷ بدهد، هست ${popTarget(state)}`);
  sim(state, 50); // ۴ کارگر × ۱ طلا = ۴ از خزانه
  must(state.resources.gold === 6, `طلا باید ۶ باشد، هست ${state.resources.gold}`);
  must(state.popularity === 52, `محبوبیت باید ۵۲ باشد، هست ${state.popularity}`);
  state.resources.gold = 0;
  sim(state, 50);
  must(state.resources.gold === 0, "خزانه خالی منفی نمی‌شود");
  must(state.popularity === 52, "بدون اثر اضافی همان ۵۲ می‌ماند");
  // بند ۹۳: پوشش ناکامل (۲ < هزینه ۴ دوره) = نه کسر، نه اثر + آینه خزانه.
  state.tax = "largeBribe";
  state.resources.gold = 2;
  must(bribeAffordable(state) === false, "۲ برای هزینه ۴ کافی نیست");
  must(popTarget(state) === 52, "رشوه با پوشش ناکامل اثر ندارد");
  must(treasuryInfo(state).perMin === 0, "خزانه باید صفر نشان دهد");
  sim(state, 50);
  must(state.resources.gold === 2, "بدون پوشش کسری هم نیست");
  must(state.popularity === 52, "بدون اثر همان ۵۲ می‌ماند");
  state.resources.gold = 4;
  must(bribeAffordable(state) === true, "پوشش دقیق کافی است");
  must(popTarget(state) === 57, "با پوشش کامل اثر هست");
  must(treasuryInfo(state).perMin === (4 * -1 * 600) / POP_PERIOD, "آینه درآمد رشوه باید ۴۸- باشد");
  // MP: گیت کسر به‌ازای هر مالک.
  const g2 = fresh();
  enableMp(g2.state, 2, ["A", "B"]);
  g2.state.mpres[1].tax = "largeBribe";
  g2.state.mpres[1].workers = 4;
  g2.state.mpres[1].resources = { food: 120, gold: 2 };
  for (let i = 0; i < 50; i++) { g2.state.tick++; stepPlayerEconomy(g2.state, 0); stepPlayerEconomy(g2.state, 1); }
  must(g2.state.mpres[1].resources.gold === 2, "MP: بدون پوشش کسری نیست");
  must(popTarget(g2.state, 1) === 52, "MP: بدون پوشش اثری نیست");
  state.tax = "generousBribe";
  state.resources.gold = 0;
  must(popTarget(state) === 52, "رشوه سخاوتمندانه بی‌پول هم بلوکه می‌شود");
  state.resources.gold = 10;
  must(popTarget(state) === 59, `سخاوتمندانه باید ۵۹ بدهد (۵۰+۷+۰+۲)، هست ${popTarget(state)}`);
  state.tax = "smallBribe";
  state.resources.gold = 0;
  must(popTarget(state) === 55, `رشوه کوچک رایگان است: ۵۵ (۵۰+۳+۰+۲)، هست ${popTarget(state)}`);
  const mp = { tick: 5, mp: { enabled: true, num: 2 },
    mpres: [{ tax: "largeBribe", rations: "normal", resources: { food: 120, gold: 0 }, workers: 4 },
      { tax: "largeBribe", rations: "normal", resources: { food: 120, gold: 7 }, workers: 4 }],
    buildings: [] };
  must(popTarget(mp, 0) === 52 && popTarget(mp, 1) === 57, "اثر مشروط برش MP");
  return { name: "اثر مشروط رشوه", pass: true, detail: "سه سطح + پرداخت + کف صفر" };
}


// --- هاله قرمز و سرعت ترک (فاز ۱ بند ۱۵): نامحبوب = زیر ۵۰ (§۵)؛ نشانگر
// همان چرخه مهاجرت را با جهت −۱ نشان می‌دهد. campGauge خالص است.
function t_camp_halo() {
  const { state } = fresh();
  state.popularity = 50; state.workers = 3;
  must(campGauge(state).halo === "none", "۵۰ = خنثی (مرز)");
  state.popularity = 49;
  must(campGauge(state).halo === "red", "۴۹ = هاله قرمز");
  const before = JSON.stringify(state);
  campGauge(state);
  must(JSON.stringify(state) === before, "نشانگر state را لمس نمی‌کند");
  const mp = { tick: 10, mp: { enabled: true, num: 2 },
    mpres: [{ popularity: 90, workers: 1, freeWorkers: 1 }, { popularity: 30, workers: 2, freeWorkers: 0 }],
    buildings: [] };
  must(campGauge(mp, 0).halo === "none" && campGauge(mp, 1).halo === "red", "هاله برش MP");
  const t2 = fresh();
  t2.state.workers = 6; t2.state.popularity = 20;
  sim(t2.state, 100); // ترک در ۱۰۰ (pop: ۲۴؛ هاله قرمز)
  must(t2.state.workers === 5, `کارگر باید ۵ باشد، هست ${t2.state.workers}`);
  const g = campGauge(t2.state);
  must(g.dir === -1 && g.prog === 0 && g.halo === "red", `ترک: dir=${g.dir} prog=${g.prog} halo=${g.halo}`);
  return { name: "هاله قرمز و ترک", pass: true, detail: "مرز ۵۰ + ترک ۱۰۰تیکی" };
}


function t_tax() {
  const { W, H, terrain, state } = fresh();
  state.tax = "high";
  placeAll(state, terrain, W, H, "woodcutter", [[1, 1], [4, 1], [7, 1], [1, 4]]);
  sim(state, 50); // ۴ کارگر × ۱ طلا (بند ۳۴: high مرجع −۶/۱)
  must(state.resources.gold === 64, `طلا باید ۶۴ باشد، هست ${state.resources.gold}`);
  return { name: "درآمد مالیات", pass: true, detail: "gold=64" };
}


function t_starting_goods() {
  const { state } = fresh();
  const want = { wood: 120, food: 120, gold: 60, stone: 40, wheat: 20, flour: 0, hops: 0, beer: 0, iron: 0, swords: 0, bows: 0, meat: 0, cheese: 0, apples: 0, leather: 0 };
  must(JSON.stringify(state.resources) === JSON.stringify(want), "ست آغازین باید پین باشد");
  const live = newSoloFromSeed(CONFIG.MAP_SEED);
  const last = live.state.events[live.state.events.length - 1];
  must(typeof last === "string" && last.length > 0 && last !== "game.ev.caravan", "رویداد کاروان باید متن حل‌شده باشد");
  withLang("en", () => {
    const e2 = newSoloFromSeed(CONFIG.MAP_SEED);
    const l2 = e2.state.events[e2.state.events.length - 1];
    must(l2 !== last && l2.length > 0, "متن en باید متفاوت و ناتهی باشد");
  });
  return { name: "کالاهای اولیه و کاروان", pass: true, detail: "ست پین + رویداد fa/en" };
}

// __T_GRANARY_START_ROW175__
// شروع انبارغذا (0.183.0 — §۴/بند 175): غذای آغازین ۱۲۰ از تیک ۰ در مخزن مرکزی
// است (انتقال بی‌مصداق)؛ انبارغذا سقف غذا ۵۰۰→۱۰۰۰ می‌برد؛ «شروع بازی» =
// آماده‌شدن ساعت (Keep+Granary). پین ترکیبی، بدون کد محصول تازه.
function t_granary_start_row175() {
  const live = newSoloFromSeed(CONFIG.MAP_SEED);
  const state = live.state, terrain = live.terrain;
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  must(state.resources.food === 120, "غذای آغازین باید ۱۲۰ باشد");
  must(capFor(state, "food") === 500, "بی‌انبارغذا سقف غذا ۵۰۰ است");
  must(clockReady(state.buildings, 0) === false, "بی‌انبارغذا ساعت ناآماده است");
  const keep = state.buildings.find((b) => b.type === "keep" && !b.destroyed);
  must(keep, "ستاد آغازین باید باشد");
  const def = CONFIG.BUILDINGS.granary;
  const spot = siteNear(terrain, state.occ, W, H, keep.c, keep.r, def.w, def.h);
  must(spot, "جا برای انبارغذا باید باشد");
  must(tryPlace(state, terrain, W, H, spot[0], spot[1], def).ok, "انبارغذا ساخته شد");
  completeAll(state); // سقف پس از تکمیل می‌آید (0.39.0)
  must(capFor(state, "food") === 1000, "یک انبارغذا: سقف غذا ۱۰۰۰");
  must(clockReady(state.buildings, 0) === true, "ستاد+انبارغذا = ساعت آماده (شروع بازی)");
  return { name: "شروع انبارغذا", pass: true, detail: "غذا ۱۲۰ + سقف ۵۰۰/۱۰۰۰ + ساعت" };
}


// __T_DELIVERY_ROW1070__
// تحویل مرکزی (0.183.0 — §کار/بند 1070، vacuous): کارگر «نزدیک‌ترین انبار» را
// انتخاب نمی‌کند — در موتور نیست: تولید مستقیم در مخزن مشترک می‌نشیند
// (t_stockpile_central)؛ هیچ بنایی مقصد تحویل ندارد؛ فاصله انبار بی‌اثر است.
function t_delivery_no_target_row1070() {
  const run = (withStore) => {
    const f = fresh();
    must(tryPlace(f.state, f.terrain, f.W, f.H, 1, 1, CONFIG.BUILDINGS.woodcutter).ok, "چوب‌بری");
    if (withStore) {
      const def = CONFIG.BUILDINGS.stockpile;
      const spot = siteNear(f.terrain, f.state.occ, f.W, f.H, 6, 1, def.w, def.h);
      must(spot, "جا برای انبار باید باشد");
      must(tryPlace(f.state, f.terrain, f.W, f.H, spot[0], spot[1], def).ok, "انبار مجاور");
    }
    const before = f.state.resources.wood;
    sim(f.state, 200);
    for (const b of f.state.buildings) {
      must(b.deliverTo === undefined && b.dropAt === undefined && b.targetStock === undefined,
        "بنا نباید مقصد تحویل داشته باشد (" + b.type + ")");
    }
    return f.state.resources.wood - before;
  };
  const gA = run(true), gB = run(false);
  must(gA > 0 && gA === gB, "سود چوب با/بی انبار مجاور یکسان است");
  return { name: "تحویل مرکزی", pass: true, detail: "فاصله بی‌اثر + بی‌مقصد" };
}

function econCases() {
  return [t_production, t_storageCap, t_storage_caps, t_noWorker, t_foodFloor, t_deterministic,
    t_popRise, t_starve, t_popularity_formula, t_immigration, t_emigration, t_camp_gauge, t_camp_arrival, t_pop_caps, t_camp_idle, t_camp_halo, t_hovel_housing, t_crowding_flag, t_crowding_pop, t_events, t_food_variety, t_ration_extra, t_tax_default, t_bribe_effect, t_tax_slider, t_tax, t_balance_bribe,
    t_stone_produce, t_ox_tether, t_bakery_chain, t_bakery_starved, t_building_lifecycle, t_bakery_cost,
    t_beer_chain, t_brewery_starved, t_beer_costs, t_inn_cheer, t_innkeeper_required, t_inn_drink_rate, t_mill_cost, t_mill_support, t_rates_from_config, t_iron_chain, t_armoury_store, t_starting_goods, t_stockpile_central, t_granary_start_row175, t_delivery_no_target_row1070,
    t_market_buy_sell, t_market_gates, t_market_caps, t_market_save, t_market_tabs, t_market_select, t_market_sell_ratio, t_market_trader, t_market_stage, t_market_rates,
    t_hunter_meat, t_food_types, t_dairy_cheese, t_orchard_apples, t_producer_rates, t_priest_bless, t_bless_decay, t_bless_dilution, t_religion_bonus, t_drunkards, t_fear_scale, t_good_things, t_bad_things, t_fear_next, t_food_toggle,
    t_tax_rates, t_stockpile_squares, t_tannery_leather, t_cow_take, t_firecow_cloud, t_ale_steps, t_bless_appendix, t_fear_sign];
}


// رشوه (0.14.0): سطح مالیات منفی — هر ۵۰ تیک ۱ طلا به ازای هر کارگر کم می‌کند
// (با کف صفر) و هدف محبوبیت را +۵ بالا می‌برد.
function t_balance_bribe() {
  const { state } = fresh();
  state.tax = "largeBribe";
  state.workers = 4;
  must(popTarget(state) === 57, `هدف باید ۵۷ باشد (۵۰+۵+۰+۲)، هست ${popTarget(state)}`);
  sim(state, 50);
  must(state.resources.gold === 56, `طلا باید ۵۶ باشد، هست ${state.resources.gold}`);
  // کف صفر: خزانه خالی منفی نمی‌شود
  // بند ۹۳: پوشش ناکامل (۲ < هزینه ۴) = نه کسر، نه اثر.
  state.resources.gold = 2;
  must(popTarget(state) === 52, "رشوه با پوشش ناکامل اثر ندارد");
  sim(state, 50);
  must(state.resources.gold === 2, "بدون پوشش، کسری هم نیست");
  return { name: "رشوه", pass: true, detail: "۴طلا/۵۰تیک + هدف ۵۷ + گیت پوشش (بند ۹۳)" };
}


// --- سنگ (0.18.0) ---

// معدن سنگ: ۱ سنگ / ۲۵ تیک با ۱ کارگر + آغل گاو لازم (بند ۸۴) + سقف ۵۰۰ + قانون فاصله.
function t_stone_produce() {
  const { W, H, terrain, state } = fresh();
  const q = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.quarry);
  must(q.ok, "معدن سنگ باید ساخته شود");
  must(tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.oxtether).ok, "آغل گاو باید ساخته شود");
  must(state.resources.wood === 100, "هزینه معدن+آغل (۱۵+۵ چوب) باید کم شود");
  sim(state, 50); // ۲ سنگ
  must(state.resources.stone === 42, `سنگ باید ۴۲ باشد، هست ${state.resources.stone}`);
  state.resources.stone = 499;
  sim(state, 50);
  must(state.resources.stone === 500, `سقف سنگ ۵۰۰ باید رعایت شود، هست ${state.resources.stone}`);
  const v = validate(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.quarry); // چسبیده
  must(!v.ok && v.reason === "SPACING", `معدن چسبیده باید SPACING باشد، شد ${v.reason}`);
  return { name: "تولید سنگ", pass: true, detail: "۲ سنگ/۵۰تیک با آغل + سقف + فاصله" };
}


// آغل گاو (فاز ۱ بند ۸۴ — §۶.۲ «معدن به Ox tether نیاز دارد»):
// معدن سنگ بدون آغل سالم خودی (تکمیل‌شده، ناویرانه) تولید نمی‌کند؛ گاوها سنگ
// را به انبار می‌برند. گیت در هر دو چرخه (solo + برش MP) + خلوص helper.
function t_ox_tether() {
  const { W, H, terrain, state } = fresh();
  must(hasOxTether(state, 0) === false, "بی‌آغل = false");
  const q = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.quarry);
  must(q.ok, "معدن باید ساخته شود");
  sim(state, 50); // completeAll داخل sim؛ آغل نیست
  must(state.resources.stone === 40, `بی‌آغل سنگ نباید بیاید، هست ${state.resources.stone}`);
  must(q.building.starved === true, "معدن بی‌آغل باید starved باشد");
  must((q.building.progress || 0) === 0, "پیشرفت بی‌آغل نباید جلو برود");
  const ox = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.oxtether);
  must(ox.ok, "آغل باید ساخته شود");
  sim(state, 50);
  must(state.resources.stone === 42, `با آغل ۲ سنگ باید بیاید، هست ${state.resources.stone}`);
  must(q.building.starved === false, "معدن با آغل نباید starved باشد");
  must(hasOxTether(state, 0) === true, "با آغل سالم = true");
  ox.building.buildLeft = 30; // نیمه‌کاره (rawTicks: بدون completeAll)
  rawTicks(state, 50);
  must(state.resources.stone === 42, "آغل نیمه‌کاره نباید تولید بدهد");
  ox.building.buildLeft = 0; ox.building.destroyed = true; // ویرانه
  rawTicks(state, 50);
  must(state.resources.stone === 42, "آغل ویرانه نباید تولید بدهد");
  const mp = { buildings: [{ type: "oxtether", owner: 1, buildLeft: 0 }, { type: "oxtether", owner: 0, buildLeft: 5 }] };
  must(hasOxTether(mp, 0) === false, "آغل بیگانه/نیمه‌کاره برای مالک ۰ نه");
  must(hasOxTether(mp, 1) === true, "آغل سالم برای مالک ۱ بله");
  const before = JSON.stringify(mp);
  hasOxTether(mp, 1);
  must(JSON.stringify(mp) === before, "hasOxTether باید خالص باشد");
  // برش MP: گیت در چرخه بازیکن هم کار می‌کند (دلتا، نه مقدار مطلق).
  const f2 = fresh();
  enableMp(f2.state, 2, ["A", "B"]);
  f2.state.mpres[1].workers = 3;
  const qd = CONFIG.BUILDINGS.quarry, od = CONFIG.BUILDINGS.oxtether;
  f2.state.buildings.push({ id: f2.state.nextId++, type: "quarry", c: 30, r: 30, w: qd.w, h: qd.h, hp: qd.hp, maxHp: qd.hp, owner: 1, staffed: true });
  const s0 = f2.state.mpres[1].resources.stone || 0;
  for (let i = 0; i < 50; i++) { f2.state.tick++; stepPlayerEconomy(f2.state, 1); }
  must((f2.state.mpres[1].resources.stone || 0) === s0, "MP بی‌آغل نباید سنگ بدهد");
  f2.state.buildings.push({ id: f2.state.nextId++, type: "oxtether", c: 33, r: 30, w: od.w, h: od.h, hp: od.hp, maxHp: od.hp, owner: 1, staffed: true });
  for (let i = 0; i < 50; i++) { f2.state.tick++; stepPlayerEconomy(f2.state, 1); }
  must((f2.state.mpres[1].resources.stone || 0) === s0 + 2, "MP با آغل باید ۲ سنگ بدهد");
  // دفترچه §۶.۲ (0.138.1): آغل ۱ کارگر می‌خواهد؛ آغل بی‌کارگر گیت است.
  must(workersNeeded({ type: "oxtether" }) === 1, "آغل باید ۱ کارگر بخواهد");
  must(hasOxTether({ buildings: [{ type: "oxtether", owner: 0, buildLeft: 0, staffed: false }] }, 0) === false, "آغل staffed:false گیت است");
  const f3 = fresh();
  tryPlace(f3.state, f3.terrain, f3.W, f3.H, 1, 1, CONFIG.BUILDINGS.quarry);
  tryPlace(f3.state, f3.terrain, f3.W, f3.H, 5, 5, CONFIG.BUILDINGS.oxtether);
  f3.state.workers = 1; // فقط معدن سهم می‌گیرد؛ آغل بی‌کارگر می‌ماند
  sim(f3.state, 50);
  const oxb = f3.state.buildings.find((b) => b.type === "oxtether");
  must(oxb && oxb.staffed === false, "با ۱ کارگر آغل باید بی‌کارگر بماند");
  must(hasOxTether(f3.state, 0) === false, "آغل بی‌کارگر نباید گیت را باز کند");
  must(f3.state.resources.stone === 40, `با آغل بی‌کارگر سنگ نباید بیاید، هست ${f3.state.resources.stone}`);
  return { name: "آغل گاو و معدن سنگ", pass: true, detail: "گیت solo/MP + نیمه‌کاره/ویرانه/بیگانه/بی‌کارگر + خلوص" };
}


// --- زنجیره نان سه‌حلقه‌ای (0.20.0؛ 0.38.0 حلقه میانی آسیاب گرفت) ---

// مزرعه + آسیاب + نانوایی، ۲۰۰ تیک: ۲۰ گندم شروع + ۱۰ تولید − ۲۶ مصرف آسیاب = ۴؛
// آسیاب ۱۳ چرخه → ۲۶ آرد؛ نانوایی با یک تیک تأخیر خط لوله (آرد باید اول برسد)
// ۱۲ چرخه → ۲۴ مصرف = ۲ آرد در خط؛ ۱۲ غذا − ۵ خوراک (۵ دهان) = ۱۳۱.
function t_bakery_chain() {
  const { W, H, terrain, state } = fresh();
  state.workers = 5; // آسیاب مرجع ۳ کارگر می‌خواهد (۱+۳+۱=۵؛ پیش‌فرض بازی ۴ است)
  const wf = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.wheatfarm);
  must(wf.ok, "مزرعه گندم باید ساخته شود");
  const ml = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.mill);
  must(ml.ok, "آسیاب باید ساخته شود");
  const bk = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.bakery);
  must(bk.ok, "نانوایی باید ساخته شود");
  must(state.resources.wood === 75, `چوب باید ۷۵ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 40, `سنگ باید ۴۰ باشد، هست ${state.resources.stone}`);
  sim(state, 200);
  must(state.resources.wheat === 4, `گندم باید ۴ باشد، هست ${state.resources.wheat}`);
  must(state.resources.flour === 24, `آرد باید ۲۴ باشد، هست ${state.resources.flour}`);
  must(state.resources.food === 131, `غذا باید ۱۳۱ باشد، هست ${state.resources.food}`);
  must(ml.building.starved === false, "آسیاب با تأمین کامل نباید starved باشد");
  must(bk.building.starved === false, "نانوایی با تأمین کامل نباید starved باشد");
  return { name: "زنجیره نان (گندم→آرد→غذا)", pass: true, detail: "گندم=۴، آرد=۲۴، غذا=۱۳۱ پس از ۲۰۰ تیک (۱آرد→۸غذا، ۵ دهان)" };
}


// قحطی ورودی: بدون آرد کافی پیشرفت جلو نمی‌رود و بدهی ثبت نمی‌شود؛ با رسیدن
// آرد همان چرخه تمام می‌شود.
function t_bakery_starved() {
  const { W, H, terrain, state } = fresh();
  const bk = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.bakery);
  must(bk.ok, "نانوایی باید ساخته شود");
  state.resources.flour = 0; // کمتر از ۱ لازم برای یک چرخه (۱آرد→۸غذا/۹۰تیک)
  sim(state, 60);
  must((bk.building.progress || 0) === 0, "پیشرفت در قحطی نباید جلو برود");
  must(bk.building.starved === true, "پرچم starved باید ست باشد");
  must(bk.building.staffed === true, "کارگر در قحطی ورودی در ساختمان می‌ماند");
  must(state.resources.flour === 0, "آرد نباید کم شود");
  must(state.resources.food === 120, `غذا نباید تغییر کند، هست ${state.resources.food}`);
  state.resources.flour = 5;
  sim(state, 90);
  must(state.resources.flour === 4, `آرد باید ۴ باشد، هست ${state.resources.flour}`);
  must(state.resources.food === 128, `غذا باید ۱۲۸ باشد، هست ${state.resources.food}`);
  must(bk.building.starved === false, "با رسیدن آرد نباید starved بماند");
  return { name: "قحطی ورودی نانوایی", pass: true, detail: "انتظار + ازسرگیری با ۱←۸" };
}


// هزینه نانوایی (۱۰چ): کسر + رد کمبود چوب.
function t_bakery_cost() {
  const { W, H, terrain, state } = fresh();
  const bk = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.bakery);
  must(bk.ok, "نانوایی باید ساخته شود");
  must(state.resources.wood === 110, `چوب باید ۱۱۰ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 40, `سنگ باید ۴۰ باشد، هست ${state.resources.stone}`);
  state.resources.wood = 0;
  const v = validate(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.bakery);
  must(!v.ok && v.reason === "INSUFFICIENT", `بدون چوب باید INSUFFICIENT باشد، شد ${v.reason}`);
  return { name: "هزینه نانوایی", pass: true, detail: "کسر ۱۰چ + رد چوب" };
}


// هزینه آسیاب (۲۰چ؛ مرجع §8.3): کسر چوب + رد کمبود چوب.
function t_mill_cost() {
  const { W, H, terrain, state } = fresh();
  const ml = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.mill);
  must(ml.ok, "آسیاب باید ساخته شود");
  must(state.resources.wood === 100, `چوب باید ۱۰۰ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 40, `سنگ باید ۴۰ باشد، هست ${state.resources.stone}`);
  state.resources.wood = 0;
  const v = validate(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.mill);
  must(!v.ok && v.reason === "INSUFFICIENT", `بدون چوب باید INSUFFICIENT باشد، شد ${v.reason}`);
  return { name: "هزینه آسیاب", pass: true, detail: "کسر ۲۰چ + رد چوب" };
}


// پشتیبانی آسیاب (فاز ۱ بند ۳۳): ۱۲ نانوا + ۳ مزرعه گندم — مشتق از نرخ‌های زنده.
function t_mill_support() {
  const ms = millSupport();
  const expB = Math.floor((RATES.mill.amount / RATES.mill.everyTicks) /
    (RATES.bakery.consumes.flour / RATES.bakery.everyTicks));
  const expF = Math.ceil((RATES.mill.consumes.wheat / RATES.mill.everyTicks) /
    (RATES.wheatfarm.amount / RATES.wheatfarm.everyTicks));
  must(ms.bakers === expB && ms.farms === expF, "پشتیبانی باید از RATES مشتق باشد");
  must(ms.bakers === 12 && ms.farms === 3, `باید ۱۲ نانوا + ۳ مزرعه باشد، شد ${ms.bakers}/${ms.farms}`);
  must(BALANCE.economy.millSupport.bakers === 12 && BALANCE.economy.millSupport.wheatFarms === 3,
    "باید عین hint مرجع (manbook) باشد");
  return { name: "پشتیبانی آسیاب", pass: true, detail: "۱۲ نانوا + ۳ مزرعه از RATES" };
}


// تک‌منبع بودن نرخ‌ها (0.38.0): RATES از CONFIG.BUILDINGS ساخته می‌شود.
function t_rates_from_config() {
  must(RATES.mill && RATES.mill.produces === "flour", "آسیاب باید آرد بدهد");
  must(RATES.mill.consumes && RATES.mill.consumes.wheat === 2, "آسیاب باید ۲ گندم بخورد");
  must(RATES.bakery.consumes && RATES.bakery.consumes.flour === 1, "نانوایی باید ۱ آرد بخورد");
  must(RATES.bakery.amount === 8 && RATES.bakery.everyTicks === 90, "نانوایی باید ۸ غذا/۹۰تیک بدهد");
  must(RATES.bakery.consumes.wheat === undefined, "نانوایی دیگر گندم نمی‌خورد");
  must(RATES.fletcher.consumes && RATES.fletcher.consumes.wood === 2 && RATES.fletcher.consumes.iron === undefined, "کمان‌سازی باید ۲ چوب بخورد (مرجع §8.6) نه آهن");
  for (const k of ["woodcutter", "farm", "quarry", "wheatfarm", "mill", "bakery", "hopsfarm", "brewery", "ironmine", "armoury", "fletcher"]) {
    must(RATES[k] && RATES[k].source === CONFIG.BUILDINGS[k].source, `نرخ ${k} باید از CONFIG بیاید`);
  }
  return { name: "نرخ‌های تک‌منبع", pass: true, detail: "RATES ← CONFIG.BUILDINGS.econ" };
}


// --- زنجیره سلاح (0.44.0 — #۹ از FEATURES، شماره ۲ از NEXT-5) ---

// معدن آهن×۲ + زرادخانه + کمان‌سازی، ۴۰۰ تیک: شمشیر و کمان هر دو می‌آیند؛
// سقف خانواده سلاح با هر زرادخانه/کمان‌سازی +۵۰۰ (پایه ۵۰۰ + ۲×۵۰۰ = ۱۵۰۰).
function t_iron_chain() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 400; // کمان‌سازی ۱۰۰ طلا می‌خواهد (هزینه مرجع 0.172.0)
  const spots = [[1, 1], [10, 1], [20, 1], [30, 1]];
  const keys = ["ironmine", "ironmine", "armoury", "fletcher"];
  keys.forEach((key, i) => {
    const def = CONFIG.BUILDINGS[key];
    const site = siteNear(terrain, state.occ, W, H, spots[i][0], spots[i][1], def.w, def.h);
    must(site, `جا برای ${def.name} باید باشد`);
    const r = tryPlace(state, terrain, W, H, site[0], site[1], def);
    must(r.ok, `${def.name} باید ساخته شود، شد ${r.reason}`);
  });
  must(state.resources.wood === 65, `چوب باید ۵۰ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 40, `سنگ باید ۴۰ باشد، هست ${state.resources.stone}`);

  sim(state, 400);
  // سقف خانواده سلاح: پایه ۵۰۰ + زرادخانه/کمان‌سازی سالم هرکدام +۵۰۰ (پس از sim تکمیل‌اند).
  must(capFor(state, "swords") === 1500, `سقف شمشیر باید ۱۵۰۰ باشد، هست ${capFor(state, "swords")}`);
  must(state.resources.swords >= 3, `شمشیر باید ≥۳ باشد، هست ${state.resources.swords}`);
  must(state.resources.bows >= 2, `کمان باید ≥۲ باشد، هست ${state.resources.bows}`);
  return { name: "زنجیره سلاح (آهن→شمشیر/کمان)", pass: true, detail: `شمشیر=${state.resources.swords}، کمان=${state.resources.bows} پس از ۴۰۰ تیک` };
}


// زرادخانه انبار مرکزی سلاح است (فاز ۱ بند ۴۱): هر زرادخانه/کمان‌سازی سالم +۵۰۰
// به سقف هر سه خانواده سلاح می‌دهد؛ سلاح‌ها در مخزن مشترک‌اند (بدون موجودی محلی)؛
// ویرانی سقف را برمی‌گرداند و مازاد را می‌تراشد.
function t_armoury_store() {
  const { W, H, terrain, state } = fresh();
  must(capFor(state, "swords") === 500 && capFor(state, "bows") === 500 && capFor(state, "iron") === 500, "پایه سقف خانواده سلاح ۵۰۰ است");
  must(tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.armoury).ok, "زرادخانه باید ساخته شود");
  completeAll(state);
  must(capFor(state, "swords") === 1000 && capFor(state, "bows") === 1000 && capFor(state, "iron") === 1000, "یک زرادخانه سالم = سقف ۱۰۰۰ هر سه");
  state.resources.swords = 1200;
  sim(state, 1);
  must(state.resources.swords === 1000, "مازاد باید به سقف تراش بخورد");
  const arm = state.buildings.find((b) => b.type === "armoury" && !b.destroyed);
  demolishBuilding(state, arm);
  must(capFor(state, "swords") === 500, "پس از ویرانی سقف به پایه برمی‌گردد");
  sim(state, 1);
  must(state.resources.swords === 500, "مازاد پس از ویرانی تراشیده می‌شود");
  must(JSON.stringify(ARMOURY_RES) === JSON.stringify(TUNING.caps.armoury.res) && ARMOURY_BONUS === TUNING.caps.armoury.bonus, "خانواده/پله باید آینه داده باشند");
  return { name: "انبار مرکزی سلاح", pass: true, detail: "سقف ۵۰۰/۱۰۰۰ + تراش ویرانی" };
}


// --- بازار خرید/فروش (0.64.0 — ب-۳ بک‌لاگ) ---

// بازار ۲×۲ (۲۰چ+۱۰سنگ) + خرید/فروش بسته ۵تایی با واسطه طلا، از مسیر صف فرمان.
function t_market_buy_sell() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market);
  must(r.ok, `بازار باید ساخته شود، شد ${r.reason}`);
  must(hasMarket(state) === false, "نیمه‌کاره دروازه معامله نیست");
  completeAll(state);
  must(hasMarket(state) === true, "پس از تکمیل دروازه باز است");
  // خرید ۵ چوب (نرخ ۵ط): طلا ۶۰←۳۵، چوب ۱۰۰←۱۰۵ — از صف فرمان سولو
  const q = createQueue();
  must(enqueueCmd(q, { kind: "trade", res: "wood", dir: "buy" }, state.tick).ok, "فرمان معامله باید در صف برود");
  stepSim(state, terrain, 2, q);
  must(state.resources.gold === 35, `طلا باید ۳۵ باشد، هست ${state.resources.gold}`);
  must(state.resources.wood === 105, `چوب باید ۱۰۵ باشد، هست ${state.resources.wood}`);
  // فروش ۵ چوب (نرخ ۲ط): چوب ۱۰۵←۱۰۰، طلا ۳۵←۴۵
  const s = applyTrade(state, "wood", "sell", 0);
  must(s.ok && s.n === 5, `فروش باید ۵تایی باشد، شد ${JSON.stringify(s)}`);
  must(state.resources.wood === 100 && state.resources.gold === 45, "فروش: چوب−۵، طلا+۱۰");
  return { name: "خرید و فروش بازار", pass: true, detail: "خرید از صف + فروش مستقیم" };
}


// نگهبان‌ها: بدون بازار/نیمه‌کاره/طلای تهی/منبع تهی/طلا/شکل خراب.
function t_market_gates() {
  const { W, H, terrain, state } = fresh();
  const no = applyTrade(state, "wood", "buy", 0);
  must(!no.ok && no.reason === "NO_MARKET", `بدون بازار باید NO_MARKET باشد، شد ${no.reason}`);
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market);
  must(r.ok, "بازار باید ساخته شود");
  const raw = applyTrade(state, "wood", "buy", 0);
  must(!raw.ok && raw.reason === "UNDER_CONSTRUCTION", `نیمه‌کاره باید UNDER_CONSTRUCTION باشد، شد ${raw.reason}`);
  completeAll(state);
  state.resources.gold = 0;
  const poor = applyTrade(state, "wood", "buy", 0);
  must(!poor.ok && poor.reason === "NO_GOLD", `طلای تهی باید NO_GOLD باشد، شد ${poor.reason}`);
  state.resources.gold = 60;
  state.resources.iron = 0;
  const empty = applyTrade(state, "iron", "sell", 0);
  must(!empty.ok && empty.reason === "NO_STOCK", `منبع تهی باید NO_STOCK باشد، شد ${empty.reason}`);
  const cur = applyTrade(state, "gold", "buy", 0);
  must(!cur.ok && cur.reason === "UNKNOWN", `طلا باید UNKNOWN باشد، شد ${cur.reason}`);
  const bad = applyTrade(state, "wood", "swap", 0);
  must(!bad.ok && bad.reason === "INVALID", `جهت خراب باید INVALID باشد، شد ${bad.reason}`);
  return { name: "نگهبان‌های بازار", pass: true, detail: "۶ رد تمیز" };
}


// سقف‌ها: خرید نزدیک سقف تراش می‌خورد (هزینه متناسب، بدون اتلاف)؛ فروش با طلای پر هم.
function t_market_caps() {
  const { W, H, terrain, state } = fresh();
  must(tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market).ok, "بازار باید ساخته شود");
  completeAll(state);
  const woodCap = capFor(state, "wood"), goldCap = capFor(state, "gold");
  state.resources.wood = woodCap - 3;
  const b = applyTrade(state, "wood", "buy", 0);
  must(b.ok && b.n === 3, `خرید باید ۳تایی تراش بخورد، شد ${JSON.stringify(b)}`);
  must(state.resources.wood === woodCap, "چوب باید دقیقاً سقف شود");
  must(state.resources.gold === 60 - 15, `طلا باید ۴۵ باشد (۳×۵)، هست ${state.resources.gold}`);
  state.resources.gold = goldCap - 5;
  state.resources.wood = 100;
  const s = applyTrade(state, "wood", "sell", 0);
  must(s.ok && s.n === 2, `فروش باید ۲تایی تراش بخورد (جا ۵ط ÷ ۲)، شد ${JSON.stringify(s)}`);
  must(state.resources.gold === goldCap - 1, `طلا باید سقف−۱ باشد، هست ${state.resources.gold}`);
  return { name: "سقف‌های بازار", pass: true, detail: "تراش خرید ۳ + فروش ۲" };
}


// سازگاری ذخیره: بازار و منابع پس از رفت‌وبرگشت می‌مانند (فیلد تازه‌ای نیست — بدون bump).
function t_market_save() {
  const { W, H, terrain, state } = fresh();
  must(tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market).ok, "بازار باید ساخته شود");
  completeAll(state);
  state.resources.gold = 500;
  must(applyTrade(state, "stone", "buy", 0).ok, "خرید سنگ باید موفق باشد");
  const loaded = deserializeJSON(serializeJSON(state));
  const m = loaded.buildings.find((b) => b.type === "market" && !b.destroyed);
  must(m, "بازار باید در ذخیره بماند");
  must(loaded.resources.stone === 35 && loaded.resources.gold === 460, `سنگ/طلا باید حفظ شوند: ${loaded.resources.stone}، ${loaded.resources.gold}`);
  return { name: "ذخیره بازار", pass: true, detail: "بنا + منابع" };
}


// سه تب پنل trade (فاز ۱ بند ۳۶): غذا/منابع/کالای نظامی — افراز کالاهای قابل‌معامله.
function t_market_tabs() {
  must(JSON.stringify(MARKET_TABS) === '["food","resources","military"]', "سه تب ثابت");
  const keys = Object.keys(CONFIG.MARKET.rates);
  const seen = [];
  for (const id of MARKET_TABS) {
    const list = CONFIG.MARKET.tabs[id];
    must(Array.isArray(list) && list.length > 0, `تب ${id} باید ناتهی باشد`);
    for (const k of list) must(marketTabOf(k) === id, `${k} باید در تب ${id} باشد`);
    seen.push(...list);
  }
  must(seen.length === keys.length && keys.every((k) => seen.includes(k)), "تب‌ها باید افراز rates باشند");
  must(marketTabOf("gold") === null && marketTabOf("nope") === null && marketTabOf(null) === null, "نامعتبر = null");
  must(CONFIG.MARKET.tabs.food.includes("beer") && CONFIG.MARKET.tabs.resources.includes("iron") &&
    CONFIG.MARKET.tabs.military.includes("bows"), "نمونه عضویت تب‌ها");
  return { name: "تب‌های بازار", pass: true, detail: "۳ تب + افراز ۱۱ کالا" };
}


// انتخاب کالا + سربرگ قیمت (فاز ۱ بندهای ۳۷/۳۸): کلیک روی کالا آن را برای
// Buy/Sell برمی‌گزیند؛ سربرگ ⚖ (بسته داده‌محور) و hint انتخاب در هر دو زبان.
function t_market_select() {
  const food = CONFIG.MARKET.tabs.food;
  must(marketSelected(food, "wheat") === "wheat", "عضو فهرست می‌ماند");
  must(marketSelected(food, "wood") === "food", "نامعضو = نخستین");
  must(marketSelected(food, null) === "food", "تهی = نخستین");
  must(marketSelected([], "food") === null && marketSelected(null, "food") === null, "فهرست تهی/خراب = null");
  const faScale = t("main.market.scale", { n: 5 });
  const faPick = t("main.market.pick");
  must(typeof faScale === "string" && faScale.includes("⚖") && faScale.includes("5"), "سربرگ fa با بسته");
  must(typeof faPick === "string" && faPick.length > 0 && !faPick.includes("main.market"), "hint fa حل شود");
  withLang("en", () => {
    const enScale = t("main.market.scale", { n: 5 });
    const enPick = t("main.market.pick");
    must(enScale.includes("5") && enScale !== faScale, "سربرگ en متفاوت و ناتهی");
    must(enPick.length > 0 && enPick !== faPick, "hint en متفاوت و ناتهی");
  });
  return { name: "انتخاب کالا و سربرگ قیمت", pass: true, detail: "هلپر + کلیدهای fa/en" };
}


// قاعده فروش ۴۰–۵۰٪ خرید (فاز ۱ بند ۵۶): همه نرخ‌ها از داده در بازه‌اند.
function t_market_sell_ratio() {
  for (const [k, r] of Object.entries(CONFIG.MARKET.rates)) {
    const q = r.sell / r.buy;
    must(q >= 0.4 && q <= 0.5, `نسبت فروش ${k} باید ۰٫۴–۰٫۵ باشد، هست ${q}`);
  }
  must(CONFIG.MARKET.rates.stone.sell === 4 && CONFIG.MARKET.rates.beer.sell === 4 &&
    CONFIG.MARKET.rates.wheat.buy === 2, "سه اصلاح قاعده (سنگ/آبجو/گندم)");
  must(JSON.stringify(CONFIG.MARKET.rates) === JSON.stringify(TUNING.market.rates), "نرخ‌ها آینه داده‌اند");
  return { name: "قاعده فروش بازار", pass: true, detail: "۱۰ نرخ در ۰٫۴–۰٫۵" };
}


// بازرگان بازار (فاز ۱ بند ۹۰ — §۶.۶): با بازار سالمِ تکمیل‌شده خودی می‌آید؛
// نیمه‌کاره/ویرانه/بیگانه شمرده نمی‌شود. خالص و MP-aware؛ فقط نما.
function t_market_trader() {
  const { W, H, terrain, state } = fresh();
  must(marketTrader(state).present === false && marketTrader(state).count === 0, "بی‌بازار = غایب");
  must(tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market).ok, "بازار باید ساخته شود");
  must(marketTrader(state).present === false, "نیمه‌کاره = غایب");
  completeAll(state);
  const one = marketTrader(state);
  must(one.present === true && one.count === 1, "تکمیل‌شده = ۱ بازرگان حاضر");
  must(tryPlace(state, terrain, W, H, 8, 8, CONFIG.BUILDINGS.market).ok, "بازار دوم باید ساخته شود");
  completeAll(state);
  must(marketTrader(state).count === 2, "دو بازار = ۲ بازرگان");
  state.buildings.find((b) => b.type === "market").destroyed = true;
  must(marketTrader(state).count === 1, "ویرانه شمرده نمی‌شود");
  const B = (o) => ({ type: "market", owner: 0, destroyed: false, buildLeft: 0, ...o });
  const mp = { mp: { enabled: true, num: 2 },
    buildings: [B({ owner: 0 }), B({ owner: 1 }), B({ owner: 1, buildLeft: 5 }), B({ type: "farm", owner: 0 })] };
  must(marketTrader(mp, 0).count === 1, "برش MP مالک ۰");
  must(marketTrader(mp, 1).count === 1, "برش MP مالک ۱ (نیمه‌کاره نه)");
  const before = JSON.stringify(mp);
  marketTrader(mp, 1);
  must(JSON.stringify(mp) === before, "marketTrader باید خالص باشد");
  return { name: "بازرگان بازار", pass: true, detail: "حضور/شمار + ویرانه/نیمه‌کاره + MP" };
}


// قفل مرحله‌ای بازار (فاز ۱ بند ۸۹ — §۶.۶): early پیش‌فرض؛ mid با سربازخانه؛ late با کلیسای جامع
function t_market_stage() {
  must(CONFIG.MARKET.stages.mid === "barracks" && CONFIG.MARKET.stages.late === "cathedral", "milestoneها باید سربازخانه/کلیسای جامع باشند");
  must(CONFIG.MARKET.rates.swords.minStage === "mid" && CONFIG.MARKET.rates.bows.minStage === "mid", "شمشیر/کمان باید mid+ باشند");
  must(CONFIG.MARKET.rates.wood.minStage === undefined && CONFIG.MARKET.rates.iron.minStage === undefined, "چوب/آهن بدون minStage = early");
  must(stageRank("early") === 0 && stageRank("mid") === 1 && stageRank("late") === 2 && stageRank("nope") === 0, "رتبه مرحله‌ها باید ۰/۱/۲ و ناشناخته ۰ باشد");
  const B = (type, o) => ({ type, owner: 0, destroyed: false, buildLeft: 0, ...o });
  const s0 = { buildings: [] };
  must(marketStage(s0, 0) === "early", "بی‌بنا = early");
  must(tradeLocked(s0, "swords", 0) === "mid", "شمشیر بی‌بنا قفل mid است");
  must(tradeLocked(s0, "wood", 0) === null, "چوب همیشه آزاد است");
  const s1 = { buildings: [B("barracks"), B("barracks", { buildLeft: 9 }), B("church", { destroyed: true })] };
  must(marketStage(s1, 0) === "mid", "سربازخانه سالم = mid");
  must(tradeLocked(s1, "swords", 0) === null, "mid شمشیر را باز می‌کند");
  const s2 = { buildings: [B("cathedral")] };
  must(marketStage(s2, 0) === "late", "کلیسای جامع = late");
  const mp = { mp: { enabled: true }, buildings: [B("barracks", { owner: 1 })] };
  must(marketStage(mp, 0) === "early", "سربازخانه بیگانه برای مالک ۰ نه");
  must(marketStage(mp, 1) === "mid", "سربازخانه برای مالک ۱ بله");
  const before = JSON.stringify(mp);
  marketStage(mp, 1); tradeLocked(mp, "swords", 1);
  must(JSON.stringify(mp) === before, "هلپرهای مرحله باید خالص باشند");
  const { W, H, terrain, state } = fresh();
  must(tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market).ok, "بازار باید ساخته شود");
  completeAll(state);
  state.resources.gold = 500; state.resources.swords = 10;
  const qb = tradeQuote(state, "swords", "buy", 0);
  must(!qb.ok && qb.reason === "STAGE", "خرید شمشیر early باید STAGE باشد");
  const qs = tradeQuote(state, "swords", "sell", 0);
  must(!qs.ok && qs.reason === "STAGE", "فروش شمشیر early هم STAGE است");
  const ap = applyTrade(state, "swords", "sell", 0);
  must(!ap.ok && ap.reason === "STAGE" && state.resources.swords === 10 && state.resources.gold === 500, "اجرا هم گیت است");
  const woodQ = tradeQuote(state, "wood", "buy", 0);
  must(woodQ.ok && woodQ.n === 5, "چوب early آزاد است");
  const bd = CONFIG.BUILDINGS.barracks;
  state.buildings.push({ id: state.nextId++, type: "barracks", c: 10, r: 10, w: bd.w, h: bd.h, hp: bd.hp, maxHp: bd.hp, owner: 0, buildLeft: 0 });
  must(marketStage(state, 0) === "mid", "با سربازخانه باید mid شود");
  const qb2 = tradeQuote(state, "swords", "buy", 0);
  must(qb2.ok && qb2.n === 5, "خرید شمشیر mid باید ۵تایی موفق باشد");
  must(tradeQuote(state, "meat", "buy", 0).reason === "UNKNOWN", "گوشت بدون نرخ = UNKNOWN می‌ماند");
  must(!t("game.trade.STAGE").includes("game.trade"), "کلید STAGE fa باید حل شود");
  must(!t("game.stage.mid").includes("game.stage"), "کلید نام مرحله fa باید حل شود");
  must(!t("main.market.locked", { stage: t("game.stage.mid") }).includes("main.market"), "کلید قفل fa با پارامتر باید حل شود");
  withLang("en", () => {
    must(t("game.trade.STAGE").includes("stage"), "کلید STAGE en باید حل شود");
    must(t("main.market.locked", { stage: t("game.stage.late") }).includes("Late game"), "کلید قفل en باید نام مرحله را بگیرد");
  });
  return { name: "قفل مرحله‌ای بازار", pass: true, detail: "داده + early/mid/late + STAGE + خلوص/MP/fa-en" };
}



// شکارچی → گوشت (فاز ۱ بند ۴۰): ۱ گوشت/۳۳تیک (≈۰٫۳ مرجع 🔧) با ۱ کارگر + سقف انبارغذا.
// قیمت‌های بازار (فاز ۱ بند ۹۱ — §۶.۶ «قیمت‌ها: دفترچه نمی‌گوید»):
// هر ۱۰ نرخِ حدسِ متوازن پین می‌شود (تغییر = عمدی و ثبت‌شده) + ناورداها:
// sell اکیداً کمتر از buy (بدون آربیتراژ حتی لبه سقف) + پله خام<فرآوری<نظامی +
// زنجیره غذا گندم<آرد<آبجو + هم‌رده‌های نظامی هم‌قیمت.
function t_market_rates() {
  const R = CONFIG.MARKET.rates;
  must(Object.keys(R).length === 11, "بازار باید ۱۱ نرخ داشته باشد");
  const pins = { wood: [5, 2], stone: [8, 4], food: [4, 2], wheat: [2, 1], flour: [5, 2],
    hops: [4, 2], beer: [8, 4], iron: [10, 4], swords: [20, 8], bows: [20, 8], leather: [12, 5] };
  for (const [k, [buy, sell]] of Object.entries(pins)) {
    must(R[k] && R[k].buy === buy && R[k].sell === sell, `نرخ ${k} باید ${buy}/${sell} باشد`);
  }
  for (const [k, r] of Object.entries(R)) {
    must(Number.isInteger(r.buy) && Number.isInteger(r.sell) && r.buy > 0 && r.sell > 0 && r.sell < r.buy,
      `${k} باید صحیح مثبت با sell اکیداً کمتر از buy باشد`);
  }
  must(R.wood.buy < R.stone.buy && R.stone.buy < R.iron.buy && R.iron.buy < R.swords.buy,
    "پله قیمت باید خام (چوب) < سنگ < آهن < نظامی باشد");
  must(R.iron.buy < R.leather.buy && R.leather.buy < R.swords.buy, "چرم باید میان آهن و شمشیر باشد");
  must(R.wheat.buy < R.flour.buy && R.flour.buy < R.beer.buy, "زنجیره غذا باید گندم < آرد < آبجو باشد");
  must(R.swords.buy === R.bows.buy && R.swords.sell === R.bows.sell, "هم‌رده‌های نظامی (شمشیر/کمان) باید هم‌قیمت باشند");
  return { name: "قیمت‌های بازار", pass: true, detail: "پین ۱۱ نرخ + ناورداها" };
}


function t_hunter_meat() {
  const { W, H, terrain, state } = fresh();
  const h = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hunterpost);
  must(h.ok, "کلبه شکارچی باید ساخته شود");
  sim(state, 33); // completeAll داخل sim: نیاز کارگری پس از تکمیل خوانده می‌شود
  must(workersNeeded(h.building) === 1, "شکارچی ۱ کارگر می‌خواهد");
  must(RATES.hunterpost.produces === "meat" && RATES.hunterpost.amount === 1 && RATES.hunterpost.everyTicks === 33,
    "نرخ شکارچی باید ۱/۳۳ از کاتالوگ باشد");
  const nm = CONFIG.BUILDINGS.hunterpost.name;
  must(typeof nm === "string" && nm.length > 0 && nm !== "game.building.hunterpost.name", "نام شکارچی باید حل شود");
  withLang("en", () => {
    const e = CONFIG.BUILDINGS.hunterpost.name;
    must(e === "Hunter's Post", `نام en باید Hunter's Post باشد، شد ${e}`);
  });
  must(state.resources.meat === 1, `گوشت باید ۱ باشد، هست ${state.resources.meat}`);
  sim(state, 300); // جمعاً ۳۳۳ تیک = ۱۰ چرخه؛ غذا اول خورده می‌شود نه گوشت
  must(state.resources.meat === 10, `گوشت باید ۱۰ باشد، هست ${state.resources.meat}`);
  must(state.resources.food === 119, `غذا باید ۱۱۹ باشد، هست ${state.resources.food}`);
  state.resources.meat = 600;
  sim(state, 1);
  must(state.resources.meat === 500, `سقف گوشت ۵۰۰ باید رعایت شود، هست ${state.resources.meat}`);
  return { name: "شکارچی و گوشت", pass: true, detail: "۱/۳۳تیک + ترتیب مصرف + سقف" };
}


// ترتیب مصرف و جمع انواع (بند ۴۰): نخست food بعد گوشت + قحطی/تنوع روی جمع.
function t_food_types() {
  const { state } = fresh();
  must(foodTotal(state.resources) === 120, "جمع تازه ۱۲۰ است");
  state.resources.food = 0; state.resources.meat = 7;
  must(foodTotal(state.resources) === 7, "جمع = گوشت");
  must(foodVariety(state).types === 1 && foodVariety(state).bonus === 0, "۱ نوع = +۰");
  state.eatAcc = EAT_THRESHOLD; // یک واحد همین تیک
  sim(state, 1);
  must(state.resources.meat === 6 && state.shortageTotal === 0, "عبور آستانه از گوشت می‌خورد");
  state.resources.food = 60; // جمع ۶۶ = پر → fullPop
  must(foodVariety(state).types === 2 && foodVariety(state).bonus === 1, "۲ نوع = +۱ (تنوع زنده)");
  must(popTarget(state) === 50 + TAX.none.pop + RATIONS.normal.pop + STOCK_POP.fullPop + 1,
    "هدف شامل پاداش تنوع زنده است");
  const bag = { food: 0, meat: 2 };
  must(eatOneUnit(bag) === true && bag.meat === 1, "نخستین نوع موجود کم می‌شود");
  must(eatOneUnit({}) === false, "مخزن تهی = false");
  state.resources.food = 3; state.resources.meat = 2; state.resources.cheese = 1; state.resources.apples = 4;
  must(foodTotal(state.resources) === 10, "جمع ۴ نوع = ۱۰");
  must(foodVariety(state).types === 4 && foodVariety(state).bonus === 3, "۴ نوع = +۳");
  const bag4 = { food: 0, meat: 0, cheese: 2, apples: 5 };
  must(eatOneUnit(bag4) === true && bag4.cheese === 1 && bag4.apples === 5, "ترتیب داده: پنیر پیش از سیب");
  return { name: "ترتیب مصرف و جمع غذا", pass: true, detail: "foodاول + تنوع ۴نوعی +۳" };
}


// لبنیاتی → پنیر با گاوها (فاز ۱ بند ۴۰): ۳ گاو (هر ۱۰۰تیک کارگری) بعد ۱پنیر/۳۳تیک.
function t_dairy_cheese() {
  const { W, H, terrain, state } = fresh();
  const d = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.dairy);
  must(d.ok, "گاوداری باید ساخته شود");
  must(RATES.dairy.produces === "cheese" && RATES.dairy.needsCows === 3 && RATES.dairy.cowGrowthTicks === 100,
    "نرخ لبنیاتی باید دروازه گاوی از کاتالوگ داشته باشد");
  sim(state, 100); // completeAll داخل sim است
  must(workersNeeded(d.building) === 1, "گاوداری ۱ کارگر می‌خواهد");
  must((d.building.cows || 0) === 1, "پس از ۱۰۰ تیک ۱ گاو");
  must(state.resources.cheese === 0, "پیش از ۳ گاو پنیر نیست");
  sim(state, 200); // جمعاً ۳۰۰: ۳ گاو کامل، هنوز پنیر نیست
  must(d.building.cows === 3, "۳ گاو کامل شدند");
  must(state.resources.cheese === 0, "هنوز پنیر نیست");
  sim(state, 33);
  must(state.resources.cheese === 1, "شیردوشی: ۱ پنیر پس از ۳۳ تیک");
  // ذخیره گاوها + رد خراب/بیجا
  const loaded = deserializeJSON(serializeJSON(state));
  const ld = loaded.buildings.find((b) => b.type === "dairy" && !b.destroyed);
  must(ld && ld.cows === 3, "گاوها در ذخیره می‌مانند");
  const bad = JSON.parse(serializeJSON(state));
  bad.buildings.find((b) => b.type === "dairy").cows = 99;
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "گاو ۹۹ باید رد شود");
  const stray = JSON.parse(serializeJSON(state));
  stray.buildings.find((b) => b.type === "dairy").type = "farm";
  let threw2 = false;
  try { deserialize(stray); } catch (e) { threw2 = e instanceof SaveError; }
  must(threw2, "گاو روی غیردییری باید رد شود");
  // بی‌کارگر: رشد و شیردوشی می‌ایستند
  state.workers = 0;
  sim(state, 200);
  must(d.building.cows === 3 && state.resources.cheese === 1, "بی‌کارگر توقف کامل");
  return { name: "گاوداری و پنیر", pass: true, detail: "۳گاو/۳۰۰تیک + شیردوشی + ذخیره" };
}


// باغ سیب → سیب (فاز ۱ بند ۴۰): ۱ سیب/۲۰تیک (≈۰٫۵ مرجع 🔧) با ۱ کارگر.
function t_orchard_apples() {
  const { W, H, terrain, state } = fresh();
  const o = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.orchard);
  must(o.ok, "باغ سیب باید ساخته شود");
  must(RATES.orchard.produces === "apples" && RATES.orchard.amount === 1 && RATES.orchard.everyTicks === 20,
    "نرخ باغ باید ۱/۲۰ از کاتالوگ باشد");
  sim(state, 20); // completeAll داخل sim است
  must(workersNeeded(o.building) === 1, "باغ ۱ کارگر می‌خواهد");
  must(state.resources.apples === 1, `سیب باید ۱ باشد، هست ${state.resources.apples}`);
  sim(state, 200); // جمعاً ۲۲۰ تیک = ۱۱ چرخه
  must(state.resources.apples === 11, `سیب باید ۱۱ باشد، هست ${state.resources.apples}`);
  state.resources.apples = 600;
  sim(state, 1);
  must(state.resources.apples === 500, `سقف سیب ۵۰۰ باید رعایت شود، هست ${state.resources.apples}`);
  return { name: "باغ سیب", pass: true, detail: "۱/۲۰تیک + سقف" };
}


// نرخ‌های تولیدکننده (فاز ۱ بند ۵۰): واحد/ثانیه از کاتالوگ (۱۰ تیک/ثانیه) در برابر
// ردیف‌های 🔧 مرجع + ترتیب نان > سیب > پنیر؛ شکار ناپایدار است (واحد حیوان نداریم).
function t_producer_rates() {
  const perSec = (k) => (RATES[k].amount * 10) / RATES[k].everyTicks;
  const ref = BALANCE.economy.producerRates;
  must(perSec("orchard") === ref.orchard, "سیب ۰٫۵/ثانیه = مرجع");
  must(Math.abs(perSec("hunterpost") - ref.hunter) < 0.02, "شکارچی ≈ ۰٫۳/ثانیه");
  must(Math.abs(perSec("dairy") - ref.dairy) < 0.02 && RATES.dairy.needsCows === 3, "لبنیاتی ≈ ۰٫۳/ثانیه پس از ۳ گاو");
  must(Math.abs(perSec("bakery") - ref.bakery) < 0.1, "نانوایی ≈ ۰٫۸/ثانیه");
  must(perSec("bakery") > perSec("orchard") && perSec("orchard") > perSec("dairy"), "ترتیب مرجع: نان > سیب > پنیر");
  must(RATES.brewery.consumes.hops === 1 && RATES.brewery.amount === 1, "آبجوسازی: ۱ رازک → ۱ آبجو (بند ۴۸)");
  must(ref.order.includes("bread"), "ردیف مرجع باید ترتیب را ثبت کرده باشد");
  return { name: "نرخ‌های تولیدکننده", pass: true, detail: "۰٫۸۹/۰٫۵/۰٫۳ + ترتیب + ۱←۱" };
}


// --- زنجیره آبجو (0.21.0) ---

// مزرعه رازک + آبجوسازی: ۲۰ رازک شروع + ۱۰ تولید − ۲۰ مصرف = ۱۰؛ آبجو = ۱۰.
function t_beer_chain() {
  const { W, H, terrain, state } = fresh();
  const hf = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hopsfarm);
  must(hf.ok, "مزرعه رازک باید ساخته شود");
  const br = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.brewery);
  must(br.ok, "آبجوسازی باید ساخته شود");
  must(state.resources.wood === 95, `چوب باید ۹۵ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 40, `سنگ باید ۴۰ باشد، هست ${state.resources.stone}`);
  state.resources.hops = 20;
  sim(state, 200);
  must(state.resources.hops === 20, `رازک باید ۲۰ باشد (۱←۱)، هست ${state.resources.hops}`);
  must(state.resources.beer === 10, `آبجو باید ۱۰ باشد، هست ${state.resources.beer}`);
  must(state.resources.food === 118, `غذا باید ۱۱۸ باشد، هست ${state.resources.food}`);
  must(br.building.starved === false, "با تأمین کامل نباید starved باشد");
  return { name: "زنجیره آبجو", pass: true, detail: "رازک=۲۰، آبجو=۱۰ پس از ۲۰۰ تیک (۱←۱)" };
}


// قحطی ورودی آبجوسازی: انتظار بدون پیشرفت + ازسرگیری (۱ رازک ← ۱ آبجو، بند ۴۸).
function t_brewery_starved() {
  const { W, H, terrain, state } = fresh();
  const br = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.brewery);
  must(br.ok, "آبجوسازی باید ساخته شود");
  state.resources.hops = 0;
  sim(state, 60);
  must((br.building.progress || 0) === 0, "پیشرفت در قحطی نباید جلو برود");
  must(br.building.starved === true, "پرچم starved باید ست باشد");
  must(state.resources.hops === 0, "رازک نباید کم شود");
  must(state.resources.beer === 0, "آبجو نباید ساخته شود");
  state.resources.hops = 10;
  sim(state, 20);
  must(state.resources.hops === 9, `رازک باید ۹ باشد (۱←۱)، هست ${state.resources.hops}`);
  must(state.resources.beer === 1, `آبجو باید ۱ باشد، هست ${state.resources.beer}`);
  must(br.building.starved === false, "با رسیدن رازک نباید starved بماند");
  return { name: "قحطی ورودی آبجوسازی", pass: true, detail: "انتظار + ازسرگیری با ۱←۱" };
}


// چرخه ساختمان (فاز ۱ بند ۵۳): نیمه‌کاره (Idle) ← بی‌کارگر (NeedsWorker) ←
// انتظار ورودی (Waiting: پیشرفت صفر + starved) ← کار (Working) ← تحویل به مخزن
// مرکزی (بدون حمل فیزیکی/موجودی محلی — انبار متمرکز بند ۲۶).
function t_building_lifecycle() {
  const { W, H, terrain, state } = fresh();
  const m = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.mill);
  must(m.ok, "آسیاب باید ساخته شود");
  must((m.building.buildLeft || 0) > 0, "تازه‌ساخت نیمه‌کاره است (Idle)");
  completeAll(state); state.workers = 0;
  rawTicks(state, 3);
  must(m.building.staffed === false, "بدون دهقان آزاد = NeedsWorker");
  state.workers = 4; state.resources.wheat = 0;
  rawTicks(state, 20);
  must(m.building.staffed === true && m.building.starved === true, "با کارگر و بی‌ورودی = انتظار");
  must((m.building.progress || 0) === 0, "پیشرفت در انتظار جلو نمی‌رود");
  state.resources.wheat = 20;
  rawTicks(state, 20);
  must(m.building.starved === false, "با ورودی نباید starved بماند");
  must(state.resources.flour === 2 && state.resources.wheat === 18, "یک چرخه: ۲ گندم ← ۲ آرد در مخزن");
  for (const k of ["wheat", "flour"]) must(!(k in m.building), `بنا نباید موجودی محلی ${k} داشته باشد`);
  return { name: "چرخه ساختمان", pass: true, detail: "Idle←NeedsWorker←Waiting←Working" };
}


// هزینه‌ها: مزرعه رازک ۱۵چ، آبجوسازی ۱۰چ، میخانه ۲۰چ+۱۰۰طلا + رد کمبود چوب.
function t_beer_costs() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 400; // میخانه ۱۰۰ طلا (هزینه مرجع 0.171.0)
  must(tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hopsfarm).ok, "مزرعه رازک");
  must(tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.brewery).ok, "آبجوسازی");
  must(tryPlace(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.inn).ok, "میخانه");
  must(state.resources.wood === 75, `چوب باید ۷۵ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 40, `سنگ باید ۴۰ باشد، هست ${state.resources.stone}`);
  state.resources.wood = 0;
  const v = validate(state, terrain, W, H, 4, 4, CONFIG.BUILDINGS.brewery);
  must(!v.ok && v.reason === "INSUFFICIENT", `بدون چوب باید INSUFFICIENT باشد، شد ${v.reason}`);
  return { name: "هزینه زنجیره آبجو", pass: true, detail: "۱۵چ + ۱۰چ + ۲۰چ۱۰۰طلا + رد چوب" };
}


// میخانه: ۱ آبجو/۵۰تیک ← served و +۳ هدف محبوبیت؛ بدون آبجو خاموش.
function t_inn_cheer() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 200; // میخانه ۱۰۰ طلا (هزینه مرجع 0.171.0)
  const inn = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn);
  must(inn.ok, "میخانه باید ساخته شود");
  state.resources.beer = 5;
  sim(state, 50);
  must(state.resources.beer === 4, `آبجو باید ۴ باشد، هست ${state.resources.beer}`);
  must(inn.building.served === true, "میخانه باید served باشد");
  must(innCoverage(state) === 100, "پوشش ۴ کارگر با ۱ کارا باید ۱۰۰ باشد");
  must(innBonus(state) === 8, "پوشش کامل = +۸ مرجع");
  must(popTarget(state) === 61, `هدف باید ۶۱ باشد (۵۰+۱+۰+۲+۸)، هست ${popTarget(state)}`);
  must(state.popularity === 52, `محبوبیت باید ۵۲ باشد، هست ${state.popularity}`);
  state.workers = 120; // پوشش جزئی: ۱ کارا برای ۱۲۰ نفر = ۲۵٪ → +۲
  must(innCoverage(state) === 25, "پوشش ۱۲۰ کارگر با ۱ کارا باید ۲۵ باشد");
  must(innBonus(state) === 2 && popTarget(state) === 53, "پاداش جزئی +۲ و هدف ۵۵−۲=۵۳ (ازدحام ۱۲۰>۴، بند ۶۹)");
  state.workers = 4;
  state.resources.beer = 0;
  sim(state, 50);
  must(inn.building.served === false, "بدون آبجو نباید served بماند");
  must(innBonus(state) === 0, "بدون سرو پاداش صفر است");
  must(popTarget(state) === 53, `هدف بدون سرو باید ۵۳ باشد، هست ${popTarget(state)}`);
  return { name: "شادی میخانه", pass: true, detail: "۶۱ کامل / ۵۳ جزئی شلوغ / ۵۳ بدون سرو" };
}


// میخانه کارا = آبجو + مهماندار (فاز ۱ بند ۲۳): بدون کارگر آزاد میخانه
// بی‌کارگر می‌ماند و سرو نمی‌کند؛ با کارگر، مهماندار می‌گیرد و سرو می‌کند.
// --- پله‌های پاداش میخانه (فاز ۱ بند ۹۴ — §۱۸.۵): ۲۵/۵۰/۷۵/۱۰۰٪ → ۲/۴/۶/۸.
// دفترچه پله می‌دهد نه خطی؛ مرزها (۲۴/۲۵، ۴۹/۵۰، ۷۳/۷۵) خطی را رد می‌کنند.
function t_ale_steps() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 200; // میخانه ۱۰۰ طلا (هزینه مرجع 0.171.0)
  const inn = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn);
  must(inn.ok, "میخانه باید ساخته شود");
  state.resources.beer = 30;
  sim(state, 50);
  must(inn.building.served === true, "میخانه باید served باشد");
  const bonusAt = (workers) => { state.workers = workers; return innBonus(state); };
  must(bonusAt(4) === 8, "۱۰۰٪ → +۸");
  must(bonusAt(40) === 6, "۷۵٪ → +۶");
  must(bonusAt(41) === 4, "۷۳٪ → +۴ (خطی ۶ می‌داد)");
  must(bonusAt(60) === 4, "۵۰٪ → +۴");
  must(bonusAt(61) === 2, "۴۹٪ → +۲ (خطی ۴ می‌داد)");
  must(bonusAt(120) === 2, "۲۵٪ → +۲");
  must(bonusAt(125) === 0, "۲۴٪ → ۰");
  must(bonusAt(200) === 0, "۱۵٪ → ۰ (خطی ۱ می‌داد)");
  state.workers = 41;
  const t = popTarget(state);
  state.workers = 40;
  must(popTarget(state) === t + 2, "۷۵٪ باید ۲ بیشتر از ۷۳٪ بدهد");
  must(innInfo(state).bonus === innBonus(state), "پنل آینه پاداش است");
  const f2 = fresh();
  enableMp(f2.state, 2, ["A", "B"]);
  f2.state.mpres[1].resources.gold = 200; // میخانه ۱۰۰ طلا (هزینه مرجع 0.171.0)
  const m = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 5, 1, CONFIG.BUILDINGS.inn, 1);
  must(m.ok, "میخانه بازیکن ۱");
  f2.state.mpres[1].resources.beer = 30;
  completeAll(f2.state);
  for (let i = 0; i < 50; i++) { f2.state.tick++; stepPlayerEconomy(f2.state, 0); stepPlayerEconomy(f2.state, 1); }
  must(innBonus(f2.state, 1) === 8, "MP: پوشش کامل بازیکن ۱ = +۸");
  must(innBonus(f2.state, 0) === 0, "MP: بازیکن ۰ سروی ندارد");
  return { name: "پله‌های پاداش میخانه", pass: true, detail: "۰/۲/۴/۶/۸ + مرزها + MP" };
}


function t_innkeeper_required() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 200; // میخانه ۱۰۰ طلا (هزینه مرجع 0.171.0)
  const inn = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn);
  must(inn.ok, "میخانه باید ساخته شود");
  state.workers = 0;
  state.resources.beer = 5;
  sim(state, 50);
  must(workersNeeded(inn.building) === 1 && INN.keepers === 1, "میخانه باید ۱ مهماندار بخواهد");
  must(inn.building.staffed === false, "بدون کارگر باید بی‌کارگر باشد");
  must(inn.building.served === false, "بدون مهماندار نباید سرو کند");
  state.workers = 4;
  sim(state, 50);
  must(inn.building.staffed === true, "با کارگر باید مهماندار بگیرد");
  must(inn.building.served === true, "با مهماندار و آبجو باید سرو کند");
  must(inn.building.served === innServed(state), "پرچم served باید با innServed بخواند");
  return { name: "مهماندار میخانه", pass: true, detail: "کارا = آبجو + ۱ مهماندار" };
}


// نرخ یکسان + صف مهماندار شلوغ (فاز ۱ بند ۲۵): همه میخانه‌ها با همان چرخه
// داده (beerEveryTicks) می‌نوشند؛ آبجوی کم اول به قدیمی‌ترها (ترتیب id) می‌رسد
// و بقیه همین چرخه بی‌سرو می‌مانند؛ با آبجوی کافی همه یک چرخه سرو می‌شوند.
function t_inn_drink_rate() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 400; // ۲ میخانه ۲۰۰ طلا (هزینه مرجع 0.171.0)
  const a = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn);
  const b = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.inn);
  must(a.ok && b.ok, "دو میخانه باید ساخته شوند");
  state.resources.beer = 1;
  sim(state, 50);
  must(state.resources.beer === 0, "۱ آبجو باید خورده شود");
  must(a.building.served === true && b.building.served === false, "کمبود: فقط قدیمی‌تر سرو می‌شود");
  must(a.building.progress === 0 && b.building.progress === 0, "هر دو چرخه یکسان را تمام کرده‌اند");
  state.resources.beer = 2;
  sim(state, 50);
  must(state.resources.beer === 0, "۲ آبجو باید خورده شود");
  must(a.building.served === true && b.building.served === true, "با آبجوی کافی هر دو سرو می‌شوند");
  must(innServed(state) === true, "innServed باید با پرچم‌ها بخواند");
  return { name: "نرخ یکسان میخانه‌ها", pass: true, detail: "چرخه یکسان + صف قدیمی‌تر" };
}


// تبرک کشیش‌ها (فاز ۱ بند ۷۲ — §۵.۵): با ساخت نمازخانه/کلیسا/کلیسای جامع،
// کشیش (۱ کارگر از داده) می‌آید و به‌اندازه ظرفیت داده تبرک می‌کند؛ پوشش =
// ظرفیت جمعی بناهای کارا / جمعیت (بدون بنای کارا = ۰). فرسایش در بند ۷۳.
function t_priest_bless() {
  must(JSON.stringify(RELIGION_TYPES) === '["chapel","church","cathedral"]', "انواع دینی باید ۳تای ثابت باشند");
  must(RELIGION.chapel === 20 && RELIGION.church === 50 && RELIGION.cathedral === 100 && RELIGION.priests === 1,
    "ظرفیت‌ها باید ۲۰/۵۰/۱۰۰ و کشیش ۱ از داده باشند");
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 2000; // نمازخانه ۲۵۰ طلا (هزینه مرجع 0.147.0)
  const ch = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.chapel);
  must(ch.ok, "نمازخانه باید ساخته شود");
  state.workers = 0;
  sim(state, 50);
  must(workersNeeded(ch.building) === 1, "نمازخانه باید ۱ کشیش بخواهد");
  must(ch.building.staffed === false, "بدون کارگر باید بی‌کشیش باشد");
  must(religionCoverage(state) === 0, "بدون بنای کارا پوشش باید ۰ باشد");
  state.workers = 4;
  sim(state, 50);
  must(ch.building.staffed === true, "با کارگر باید کشیش بگیرد");
  must(religionCoverage(state) === 100, "ظرفیت ۲۰ برای ۴ نفر باید ۱۰۰ باشد");
  state.workers = 40;
  must(religionCoverage(state) === 50, "ظرفیت ۲۰ برای ۴۰ نفر باید ۵۰ باشد");
  // کلیسا/کلیسای جامع (ظرفیت‌های ۵۰/۱۰۰ از داده).
  const f2 = fresh();
  f2.state.resources.gold = 2000; // کلیسا ۵۰۰ طلا (هزینه مرجع 0.147.0)
  const cu = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 5, 1, CONFIG.BUILDINGS.church);
  must(cu.ok, "کلیسا باید ساخته شود");
  f2.state.workers = 100;
  sim(f2.state, 50);
  must(religionCoverage(f2.state) === 50, "ظرفیت ۵۰ برای ۱۰۰ نفر باید ۵۰ باشد");
  const f3 = fresh();
  f3.state.resources.gold = 2000; // کلیسای جامع ۱۰۰۰ طلا (هزینه مرجع 0.147.0)
  const ca = tryPlace(f3.state, f3.terrain, f3.W, f3.H, 5, 1, CONFIG.BUILDINGS.cathedral);
  must(ca.ok, "کلیسای جامع باید ساخته شود");
  f3.state.workers = 100;
  sim(f3.state, 50);
  must(religionCoverage(f3.state) === 100, "ظرفیت ۱۰۰ برای ۱۰۰ نفر باید ۱۰۰ باشد");
  // MP: بنای حریف پوشش من را بالا نمی‌برد.
  const f4 = fresh();
  enableMp(f4.state, 2, ["A", "B"]);
  f4.state.mpres[0].workers = 4;
  f4.state.mpres[1].workers = 40;
  f4.state.mpres[1].resources.gold = 2000; // نمازخانه ۲۵۰ طلا (هزینه مرجع 0.147.0)
  const m = tryPlace(f4.state, f4.terrain, f4.W, f4.H, 5, 1, CONFIG.BUILDINGS.chapel, 1);
  must(m.ok, "بازیکن ۱ نمازخانه خودش را می‌سازد");
  sim(f4.state, 50); // تخصیص کشیش در حلقه MP
  must(religionCoverage(f4.state, 1) === 50, "پوشش بازیکن ۱ باید ۵۰ باشد");
  must(religionCoverage(f4.state, 0) === 0, "پوشش بازیکن ۰ باید ۰ بماند");
  // نام‌ها در هر دو زبان از واژگان حل شوند.
  withLang("en", () => {
    must(CONFIG.BUILDINGS.chapel.name === "Chapel", "نام en نمازخانه");
    must(CONFIG.BUILDINGS.church.name === "Church", "نام en کلیسا");
    must(CONFIG.BUILDINGS.cathedral.name === "Cathedral", "نام en کلیسای جامع");
  });
  return { name: "تبرک کشیش‌ها", pass: true, detail: "۳ بنا + کشیش + پوشش/MP" };
}


// فرسایش تبرک (فاز ۱ بند ۷۳ — §۵.۵ «فرایند دائمی»): پنجره داده‌محور از tick؛
// تبرک پس از مدت می‌خوابد (پوشش ۰ ولی کشیش سر جایش) و چرخه بعد دوباره می‌آید.
function t_bless_decay() {
  must(RELIGION.blessEveryTicks === 1200 && RELIGION.blessDurationTicks === 600, "چرخه/مدت تبرک باید ۱۲۰۰/۶۰۰ از داده باشند");
  must(blessActive(0) === true && blessActive(599) === true, "آغاز چرخه باید مبرک باشد");
  must(blessActive(600) === false && blessActive(1199) === false, "پس از مدت باید فرسوده باشد");
  must(blessActive(1200) === true && blessActive(1800) === false, "چرخه بعد باید دوباره مبرک شود");
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 2000; // نمازخانه ۲۵۰ طلا (هزینه مرجع 0.147.0)
  const ch = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.chapel);
  must(ch.ok, "نمازخانه باید ساخته شود");
  state.workers = 4;
  sim(state, 50); // تیک ۵۰: در پنجره
  must(ch.building.staffed === true, "کشیش باید گرفته شده باشد");
  must(religionCoverage(state) === 100, "تیک ۵۰ باید ۱۰۰ باشد");
  sim(state, 650); // تیک ۷۰۰: شکاف فرسایش
  must(state.tick === 700, `تیک باید ۷۰۰ باشد، هست ${state.tick}`);
  must(ch.building.staffed === true, "کشیش در شکاف هم می‌ماند (فقط تبرک می‌خوابد)");
  must(religionCoverage(state) === 0, "تیک ۷۰۰ باید ۰ باشد");
  sim(state, 500); // تیک ۱۲۰۰: چرخه تازه
  must(religionCoverage(state) === 100, "تیک ۱۲۰۰ باید دوباره ۱۰۰ باشد");
  return { name: "فرسایش تبرک", pass: true, detail: "۱۰۰ → ۰ → ۱۰۰ در چرخه ۱۲۰۰" };
}


// رقیق‌شدن تبرک با رشد جمعیت (فاز ۱ بند ۷۴ — §۵.۵): درصد تبرک‌شده با جمعیت
// می‌افتد و با بنای دینی بیشتر برمی‌گردد؛ religionInfo آن را نمایش می‌دهد
// (کل/کارا/درصد/پنجره، در خلاصه سیاست و خط policyEl).
function t_bless_dilution() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 2000; // نمازخانه ۲۵۰ + کلیسا ۵۰۰ (هزینه مرجع 0.147.0)
  const ch = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.chapel);
  must(ch.ok, "نمازخانه باید ساخته شود");
  state.workers = 10;
  sim(state, 50); // تیک ۵۰: در پنجره
  let info = religionInfo(state);
  must(info.total === 1 && info.working === 1, "۱ بنای کارا");
  must(info.coverage === 100 && info.active === true, "۲۰ ظرفیت برای ۱۰ نفر = ۱۰۰٪ مبرک");
  state.workers = 40;
  info = religionInfo(state);
  must(info.coverage === 50, "با رشد به ۴۰ نفر باید ۵۰٪ شود");
  const cu = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.church);
  must(cu.ok, "کلیسا باید ساخته شود");
  sim(state, 1); // تخصیص کشیش کلیسا (تیک ۵۱: هنوز در پنجره)
  info = religionInfo(state);
  must(info.total === 2 && info.working === 2, "۲ بنای کارا پس از بنای بیشتر");
  must(info.coverage === 100, "۷۰ ظرفیت برای ۴۰ نفر = ۱۰۰٪");
  state.workers = 100;
  must(religionInfo(state).coverage === 70, "۷۰ ظرفیت برای ۱۰۰ نفر = ۷۰٪");
  must(policySummary(state).religion.coverage === 70, "خلاصه سیاست باید درصد را داشته باشد");
  sim(state, 650); // تیک ۷۰۰: شکاف
  info = religionInfo(state);
  must(info.active === false && info.coverage === 0 && info.working === 2, "شکاف: ۰٪ ولی ۲ کارا");
  return { name: "رقیق‌شدن تبرک", pass: true, detail: "۱۰۰→۵۰→۱۰۰→۷۰٪ + پنل" };
}


// پاداش مذهب در هدف محبوبیت (فاز ۱ بند ۷۵): پله پوششی §۵.۵ (۲۵→+۲ … ۱۰۰→+۸)
// + ثابت حضور کلیسا +۱ / کلیسای جامع +۲ (متن §۳.۵). ثابت در شکاف فرسایش
// می‌ماند (وجود، نه تبرک)؛ بنای بی‌کشیش/ویرانه/حریف چیزی نمی‌دهد.
// --- فرمول تبرک پیوست (فاز ۱ بند ۹۵ — §۱۸.۵): min(1, Σظرفیت/جمعیت) +
// ظرفیت‌های ۲۰/۵۰/۱۰۰ + انقضای ۶۰ثانیه‌ای (چرخه ۱۲۰۰/مدت ۶۰۰). رفتار در
// t_priest_bless/t_bless_decay/t_bless_dilution؛ اینجا پین داده و مرز پنجره.
function t_bless_appendix() {
  must(RELIGION.blessEveryTicks === 1200 && RELIGION.blessDurationTicks === 600, "چرخه ۱۲۰۰ + مدت ۶۰۰ (۶۰ ثانیه مرجع) از داده است");
  must(RELIGION.blessEveryTicks === TUNING.religion.blessEveryTicks && RELIGION.blessDurationTicks === TUNING.religion.blessDurationTicks, "آینه داده");
  must(blessActive(0) === true && blessActive(599) === true, "پنجره ۰..۵۹۹ فعال است");
  must(blessActive(600) === false && blessActive(1199) === false, "شکاف ۶۰۰..۱۱۹۹ خاموش است");
  must(blessActive(1200) === true && blessActive(1800) === false, "چرخه بعد تکرار می‌شود");
  const { W, H, terrain, state } = fresh();
  state.resources.stone = 100;
  state.resources.gold = 2000; // هر سه بنا: ۲۵۰+۵۰۰+۱۰۰۰ (هزینه مرجع 0.147.0)
  const a = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.chapel);
  const b = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.church);
  const c = tryPlace(state, terrain, W, H, 12, 12, CONFIG.BUILDINGS.cathedral);
  must(a.ok && b.ok && c.ok, "هر سه بنا باید ساخته شوند");
  state.workers = 340;
  sim(state, 50);
  must(religionCoverage(state) === 50, "min(1, ۱۷۰/۳۴۰) = ۵۰٪");
  state.workers = 100;
  must(religionCoverage(state) === 100, "۱۷۰ برای ۱۰۰ نفر گیره ۱۰۰ است");
  const f2 = fresh();
  enableMp(f2.state, 2, ["A", "B"]);
  f2.state.mpres[1].resources.gold = 2000; // نمازخانه ۲۵۰ طلا (هزینه مرجع 0.147.0)
  const m = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 5, 1, CONFIG.BUILDINGS.chapel, 1);
  must(m.ok, "نمازخانه بازیکن ۱");
  m.building.buildLeft = 0;
  m.building.staffed = true;
  f2.state.mpres[1].workers = 40;
  must(religionCoverage(f2.state, 1) === 50, "۲۰ برای ۴۰ نفر = ۵۰٪");
  must(religionCoverage(f2.state, 0) === 0, "بازیکن ۰ بنایی ندارد");
  return { name: "فرمول تبرک پیوست", pass: true, detail: "min-form + پنجره ۶۰ثانیه + MP" };
}


function t_religion_bonus() {
  must(JSON.stringify(RELIGION.steps) === "[25,50,75,100]" && JSON.stringify(RELIGION.stepBonus) === "[2,4,6,8]",
    "پله‌های پوشش باید ۲۵/۵۰/۷۵/۱۰۰ → ۲/۴/۶/۸ از داده باشند");
  must(RELIGION.churchBonus === 1 && RELIGION.cathedralBonus === 2, "ثابت کلیسا/جامع باید ۱/۲ از داده باشند");
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 2000; // نمازخانه ۲۵۰ + کلیسا ۵۰۰ (هزینه مرجع 0.147.0)
  const ch = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.chapel);
  must(ch.ok, "نمازخانه باید ساخته شود");
  state.workers = 4;
  sim(state, 50); // تیک ۵۰: پوشش ۱۰۰ → پله +۸، بدون ثابت
  must(religionBonus(state) === 8, "نمازخانه تنها در ۱۰۰٪ باید +۸ بدهد");
  must(popTarget(state) === 61, `هدف باید ۶۱ باشد (۵۰+۱+۰+۲+۰+۸)، هست ${popTarget(state)}`);
  const cu = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.church);
  must(cu.ok, "کلیسا باید ساخته شود");
  sim(state, 1); // تیک ۵۱: پوشش ۱۰۰ (۷۰/۴) → +۸ و ثابت +۱
  must(religionWorking(state).church === 1, "۱ کلیسای کارا");
  must(religionBonus(state) === 9, "کلیسا در ۱۰۰٪ باید ۸+۱ بدهد");
  state.workers = 80; // پوشش ۸۸ → پله +۶ و ثابت +۱
  must(religionCoverage(state) === 88, "۷۰ ظرفیت برای ۸۰ نفر باید ۸۸ باشد");
  must(religionBonus(state) === 7, "کلیسا در ۸۸٪ باید ۶+۱ بدهد");
  sim(state, 649); // تیک ۷۰۰: شکاف — پله ۰ ولی ثابت +۱ می‌ماند
  must(religionBonus(state) === 1, "شکاف باید فقط ثابت +۱ بماند");
  must(popTarget(state) === 52, `هدف شکاف باید ۵۲ باشد (۵۰+۱+۰+۲+۰+۱−۲)، هست ${popTarget(state)}`);
  sim(state, 500); // تیک ۱۲۰۰: چرخه تازه → ۶+۱
  must(religionBonus(state) === 7, "چرخه تازه کلیسا در ۸۸٪ باید ۶+۱ بدهد");
  // کلیسای جامع: ۱۰۰/۱۰۰ → +۸ و ثابت +۲؛ با کلیسا هر دو ثابت.
  const f2 = fresh();
  f2.state.resources.gold = 2000; // کلیسای جامع ۱۰۰۰ + کلیسا ۵۰۰ (هزینه مرجع 0.147.0)
  const ca = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 5, 1, CONFIG.BUILDINGS.cathedral);
  must(ca.ok, "کلیسای جامع باید ساخته شود");
  f2.state.workers = 100;
  sim(f2.state, 50);
  must(religionBonus(f2.state) === 10, "جامع در ۱۰۰٪ باید ۸+۲ بدهد");
  f2.state.resources.stone = 100; // جامع سنگ اولیه را برده است
  const cu2 = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 8, 1, CONFIG.BUILDINGS.church);
  must(cu2.ok, "کلیسای دوم باید ساخته شود");
  sim(f2.state, 1);
  must(religionBonus(f2.state) === 11, "جامع+کلیسا در ۱۰۰٪ باید ۸+۲+۱ بدهد");
  // MP: بنای حریف پاداش من نمی‌شود.
  const f3 = fresh();
  enableMp(f3.state, 2, ["A", "B"]);
  f3.state.mpres[1].resources.gold = 2000; // کلیسای جامع ۱۰۰۰ طلا (هزینه مرجع 0.147.0)
  const m = tryPlace(f3.state, f3.terrain, f3.W, f3.H, 5, 1, CONFIG.BUILDINGS.cathedral, 1);
  must(m.ok, "بازیکن ۱ جامع خودش را می‌سازد");
  sim(f3.state, 50);
  must(religionBonus(f3.state, 0) === 0, "پاداش بازیکن ۰ باید ۰ بماند");
  must(religionBonus(f3.state, 1) > 0, "پاداش بازیکن ۱ باید مثبت باشد");
  return { name: "پاداش مذهب", pass: true, detail: "پله ۲/۴/۶/۸ + ثابت ۱/۲ + شکاف/MP" };
}


// مست‌ها با میخانه کارا ظاهر می‌شوند (فاز ۱ بند ۷۸ — §۵.۶): هر میخانه
// سروکننده به‌اندازه داده مست می‌سازد (صرفاً نمایشی، مشتق خالص)؛ بدون سرو،
// ویرانه، نیمه‌کاره یا حریف چیزی نمی‌دهد. در خط سیاست (innInfo) هم هست.
function t_drunkards() {
  must(INN.drunkardsPerInn === TUNING.inn.drunkardsPerInn && INN.drunkardsPerInn === 2,
    "هر میخانه کارا باید ۲ مست از داده بسازد");
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 400; // ۲ میخانه ۲۰۰ طلا (هزینه مرجع 0.171.0)
  must(drunkards(state) === 0, "بدون میخانه مستی نیست");
  const a = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn);
  const b = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.inn);
  must(a.ok && b.ok, "دو میخانه باید ساخته شوند");
  const before = JSON.stringify(state);
  must(drunkards(state) === 0, "پیش از سرو مستی نیست");
  must(JSON.stringify(state) === before, "drunkards باید خالص باشد");
  state.resources.beer = 1;
  sim(state, 50); // فقط قدیمی‌تر سرو می‌شود (صف بند ۲۵)
  must(a.building.served === true && b.building.served === false, "فقط یکی سرو می‌شود");
  must(drunkards(state) === 2, "۱ کارا = ۲ مست");
  must(innInfo(state).drunkards === 2, "پنل باید شمار مست‌ها را داشته باشد");
  must(policySummary(state).inn.drunkards === 2, "خلاصه سیاست باید مست‌ها را داشته باشد");
  state.resources.beer = 2;
  sim(state, 50);
  must(drunkards(state) === 4, "۲ کارا = ۴ مست");
  state.resources.beer = 0;
  sim(state, 50);
  must(drunkards(state) === 0, "بدون سرو مستی نیست");
  // ویرانه/حریف شمرده نمی‌شوند.
  state.resources.beer = 5;
  sim(state, 50);
  must(drunkards(state) === 4, "پیش از ویرانی ۴ مست");
  a.building.destroyed = true;
  must(drunkards(state) === 2, "ویرانه مست نمی‌سازد");
  const f3 = fresh();
  enableMp(f3.state, 2, ["A", "B"]);
  f3.state.mpres[1].resources.gold = 200; // میخانه ۱۰۰ طلا (هزینه مرجع 0.171.0)
  const m = tryPlace(f3.state, f3.terrain, f3.W, f3.H, 5, 1, CONFIG.BUILDINGS.inn, 1);
  must(m.ok, "بازیکن ۱ میخانه خودش را می‌سازد");
  m.building.buildLeft = 0;
  m.building.served = true;
  must(drunkards(f3.state, 0) === 0, "مست حریف برای بازیکن ۰ نیست");
  must(drunkards(f3.state, 1) === 2, "مست خودی برای بازیکن ۱ هست");
  return { name: "مست‌های میخانه", pass: true, detail: "۰/۲/۴/۰ + ویرانه/MP + پنل" };
}


// مقیاس ترس ∓۵ (فاز ۱ بند ۷۹ — §۵.۷ + جدول Attack Rating): سطح از چیزهای
// خوب/بد کاتالوگ می‌آید (باغ/تندیس + چوبه/سیاه‌چال، بندهای ۸۰/۸۱)؛ اثرها عین
// مرجع: کار ∓۵٪ هر سطح، حمله ±۵٪ هر سطح، محبوبیت +۱ هر سطح. سیم‌کشی تولید و
// ضربه در سطح ۰ دقیقاً خنثی است (۱ و ×۱) — پین‌های موجود (تولید/نبرد/هش‌ها) گواه‌اند.
function t_fear_scale() {
  must(FEAR.min === -5 && FEAR.max === 5, "بازه باید ∓۵ از داده باشد");
  must(FEAR.min === TUNING.fear.min && FEAR.max === TUNING.fear.max && FEAR.workPct === TUNING.fear.workPct &&
    FEAR.attackPct === TUNING.fear.attackPct && FEAR.popPer === TUNING.fear.popPer && FEAR.ptsPerLevel === TUNING.fear.ptsPerLevel, "مقیاس باید آینه داده باشد");
  const { state } = fresh();
  const before = JSON.stringify(state);
  must(fearLevel(state) === 0, "بدون چیز خوب/بد سطح ۰ است");
  must(JSON.stringify(state) === before, "fearLevel باید خالص باشد");
  must(!Object.values(CONFIG.BUILDINGS).some((d) => d.fearGood && d.fearBad), "هیچ بنایی نباید هم‌زمان خوب و بد باشد");
  must(fearWorkCoef(0) === 1 && fearWorkCoef(5) === 0.75 && fearWorkCoef(-5) === 1.25, "کار باید ۱∓۰.۰۵×سطح باشد");
  must(fearAttackPct(0) === 0 && fearAttackPct(1) === 5 && fearAttackPct(5) === 25 && fearAttackPct(-5) === -25, "حمله باید ±۵٪ هر سطح (جدول Attack Rating) باشد");
  must(fearAttackMult(state) === 1 && workGain(state, { type: "woodcutter" }) === 1, "سیم‌کشی در سطح ۰ باید خنثی باشد");
  must(fearPop(state) === 0, "محبوبیت ترس در سطح ۰ صفر است");
  const fi = fearInfo(state);
  must(fi.level === 0 && fi.coef === 1 && fi.attackPct === 0 && fi.pop === 0, "پنل ترس در سطح ۰ خنثی است");
  must(policySummary(state).fear.level === 0, "خلاصه سیاست باید ترس را داشته باشد");
  const f3 = fresh();
  enableMp(f3.state, 2, ["A", "B"]);
  must(fearLevel(f3.state, 0) === 0 && fearLevel(f3.state, 1) === 0, "برش MP در سطح ۰");
  must(fearInfo(f3.state, 1).level === 0 && policySummary(f3.state, 1).fear.level === 0, "پنل MP باید برش مالک باشد");
  return { name: "مقیاس ترس", pass: true, detail: "∓۵ + کار/حمله/محبوبیت + MP + پنل" };
}


// چیزهای خوب (فاز ۱ بند ۸۰ — §۵.۷): باغ (۲×۲، ۲۰ طلا، ۲ امتیاز) و تندیس
// (۱×۱، ۳۰ طلا، ۱ امتیاز) — بزرگ‌تر ارزان‌تر (هم کل هم به‌ازای هر امتیاز).
// سطح = هر ۴ امتیاز (بند ۹۷): باغ تنها هنوز سطح ۰ است؛ ۲ باغ = ۴ امتیاز =
// سطح +۱ → محبوبیت/روحیه (حمله) ↑ و بهره‌وری کار ↓؛ بدون کارگر، town، چمن.
function t_good_things() {
  const g = CONFIG.BUILDINGS.garden, s = CONFIG.BUILDINGS.statue;
  must(g && s, "باغ و تندیس باید در کاتالوگ باشند");
  must(g.w * g.h > s.w * s.h && g.cost.gold < s.cost.gold, "بزرگ‌تر (۴>۱) باید ارزان‌تر (۲۰<۳۰) باشد");
  must((g.cost.gold / g.fearGood) < (s.cost.gold / s.fearGood), "بزرگ‌تر به‌ازای هر امتیاز هم ارزان‌تر است (۱۰<۳۰)");
  must(workersNeeded({ type: "garden", buildLeft: 0 }) === 0 && workersNeeded({ type: "statue", buildLeft: 0 }) === 0, "کارگر نمی‌خواهند");
  const { W, H, terrain, state } = fresh();
  const base = popTarget(state);
  must(fearLevel(state) === 0, "بدون چیز خوب سطح ۰ است");
  state.resources.gold = 100;
  const gd = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.garden);
  must(gd.ok, "باغ باید ساخته شود");
  must(state.resources.gold === 80, "باغ باید ۲۰ طلا برده باشد");
  must(fearLevel(state) === 0, "نیمه‌کاره در سطح شمرده نمی‌شود");
  sim(state, 1);
  must(fearRaw(state) === 2 && fearLevel(state) === 0, "باغ تنها = ۲ امتیاز ولی هنوز سطح ۰ (بند ۹۷)");
  must(fearPop(state) === 0 && popTarget(state) === base, "زیر ۴ امتیاز هدف فرقی نمی‌کند");
  const st = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.statue);
  must(st.ok, "تندیس باید ساخته شود");
  sim(state, 1);
  must(fearRaw(state) === 3 && fearLevel(state) === 0, "باغ+تندیس = ۳ امتیاز، باز سطح ۰");
  const gd2 = putNear(state, terrain, W, H, "باغ دوم", 11, 1, CONFIG.BUILDINGS.garden);
  must(gd2.ok, "باغ دوم باید ساخته شود");
  sim(state, 1);
  must(fearRaw(state) === 5 && fearLevel(state) === 1, "۵ امتیاز = سطح +۱");
  must(fearPop(state) === 1 && popTarget(state) === base + 1, "هدف باید ۱ بیشتر شده باشد");
  must(fearAttackPct(fearLevel(state)) === 5, "حمله در سطح ۱ باید +۵٪ باشد");
  must(fearInfo(state).level === 1 && policySummary(state).fear.level === 1, "پنل باید سطح ۱ را داشته باشد");
  // کندی کار: با سطح ۳ (۰.۸۵×) چوب ۲۰۰تیک باید از ۱۱۵ مبنای بی‌ترس کمتر باشد.
  state.resources.gold = 500;
  for (const [cc, rr] of [[14, 1], [5, 4], [8, 4], [11, 4]]) {
    putNear(state, terrain, W, H, "باغ", cc, rr, CONFIG.BUILDINGS.garden);
  }
  sim(state, 1);
  must(fearRaw(state) === 13 && fearLevel(state) === 3, "۱۳ امتیاز = سطح +۳");
  const wc = putNear(state, terrain, W, H, "هیزم‌شکن", 14, 4, CONFIG.BUILDINGS.woodcutter);
  must(wc.ok, "هیزم‌شکن باید ساخته شود");
  sim(state, 200);
  must(state.resources.wood < 115, `چوب با ترس +۳ باید از ۱۱۵ کمتر باشد، هست ${state.resources.wood}`);
  // گیره سقف ∓۵: ۴ باغ دیگر (۱۳+۸=۲۱ → ۵).
  for (const [cc, rr] of [[17, 1], [20, 1], [17, 4], [20, 4]]) {
    putNear(state, terrain, W, H, "باغ", cc, rr, CONFIG.BUILDINGS.garden);
  }
  sim(state, 1);
  must(fearRaw(state) === 21 && fearLevel(state) === 5, "۲۱ امتیاز باید به سقف ۵ گیره شود");
  // ویرانه سطح نمی‌دهد: ۲ باغ = ۴ امتیاز = سطح ۱؛ ویرانی یکی = ۲ امتیاز = سطح ۰.
  const f2 = fresh();
  f2.state.resources.gold = 100;
  const g2a = putNear(f2.state, f2.terrain, f2.W, f2.H, "باغ", 5, 1, CONFIG.BUILDINGS.garden);
  const g2b = putNear(f2.state, f2.terrain, f2.W, f2.H, "باغ", 11, 1, CONFIG.BUILDINGS.garden);
  must(g2a.ok && g2b.ok, "دو باغ باید ساخته شوند");
  sim(f2.state, 1);
  must(fearLevel(f2.state) === 1, "پیش از ویرانی سطح ۱");
  g2a.building.destroyed = true;
  must(fearLevel(f2.state) === 0, "ویرانه سطح نمی‌دهد");
  // MP: باغ حریف شمرده نمی‌شود (۲ باغ خودی = ۴ امتیاز = سطح ۱).
  const f3 = fresh();
  enableMp(f3.state, 2, ["A", "B"]);
  const m1 = putNear(f3.state, f3.terrain, f3.W, f3.H, "باغ", 5, 1, CONFIG.BUILDINGS.garden, 1);
  const m2 = putNear(f3.state, f3.terrain, f3.W, f3.H, "باغ", 11, 1, CONFIG.BUILDINGS.garden, 1);
  must(m1.ok && m2.ok, "بازیکن ۱ باغ‌های خودش را می‌سازد");
  m1.building.buildLeft = 0; m2.building.buildLeft = 0;
  must(fearLevel(f3.state, 0) === 0, "باغ حریف برای بازیکن ۰ نیست");
  must(fearLevel(f3.state, 1) === 1, "۴ امتیاز خودی برای بازیکن ۱ سطح ۱ است");
  // نبرد: ضربه سرباز خودی با ترس +۱ (×۱.۰۵) باید دشمن را بیشتر بزند.
  const run = (withGarden) => {
    const f = fresh();
    f.state.resources.gold = 100;
    if (withGarden) {
      const p1 = putNear(f.state, f.terrain, f.W, f.H, "باغ", 14, 1, CONFIG.BUILDINGS.garden);
      const p2 = putNear(f.state, f.terrain, f.W, f.H, "باغ", 5, 1, CONFIG.BUILDINGS.garden);
      must(p1.ok && p2.ok, "باغ‌های میدان نبرد باید ساخته شوند");
    }
    spawnUnit(f.state, "soldier", 5.5, 5.5);
    spawnUnit(f.state, "swordsman", 6.5, 5.5);
    simC(f.state, f.terrain, 30);
    const foe = f.state.units.find((u) => u.type === "swordsman");
    must(foe, "شمشیرزن دشمن باید باشد");
    return foe.hp;
  };
  const hpPlain = run(false), hpFear = run(true);
  must(hpFear < hpPlain, `دشمن با ترس باید بیشتر خورده باشد (${hpFear} در برابر ${hpPlain})`);
  return { name: "چیزهای خوب", pass: true, detail: "باغ/تندیس + ۲۰/۳۰طلا + امتیاز/سطح/هدف/کار/گیره/ویرانه/MP/نبرد" };
}


// چیزهای بد (فاز ۱ بند ۸۱ — §۵.۷): چوبه دار (۱×۱، ۵۰ طلا، بار ۱) و سیاه‌چال
// (۲×۲، ۴۰ طلا، بار ۲) — بزرگ‌تر ارزان‌تر (هم کل هم به‌ازای هر واحد: ۲۰<۵۰).
// سطح = هر ۴ امتیاز (بند ۹۷): چوبه تنها (−۱ امتیاز) هنوز سطح ۰ است؛ سطح
// منفی → بار اضافه (کار ↑) ولی محبوبیت/روحیه (حمله) ↓؛ بدون کارگر.
function t_bad_things() {
  const g = CONFIG.BUILDINGS.gallows, d = CONFIG.BUILDINGS.dungeon;
  must(g && d, "چوبه دار و سیاه‌چال باید در کاتالوگ باشند");
  must(d.w * d.h > g.w * g.h && d.cost.gold < g.cost.gold, "بزرگ‌تر (۴>۱) باید ارزان‌تر (۴۰<۵۰) باشد");
  must((d.cost.gold / d.fearBad) < (g.cost.gold / g.fearBad), "بزرگ‌تر به‌ازای هر واحد هم ارزان‌تر است (۲۰<۵۰)");
  must(workersNeeded({ type: "gallows", buildLeft: 0 }) === 0 && workersNeeded({ type: "dungeon", buildLeft: 0 }) === 0, "کارگر نمی‌خواهند");
  const { W, H, terrain, state } = fresh();
  const base = popTarget(state);
  must(fearLevel(state) === 0, "بدون چیز بد سطح ۰ است");
  state.resources.gold = 100;
  const ga = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.gallows);
  must(ga.ok, "چوبه دار باید ساخته شود");
  must(state.resources.gold === 50, "چوبه دار باید ۵۰ طلا برده باشد");
  sim(state, 1);
  must(fearRaw(state) === -1 && fearLevel(state) === 0, "چوبه تنها = ۱− امتیاز ولی هنوز سطح ۰ (بند ۹۷)");
  must(fearPop(state) === 0 && popTarget(state) === base, "زیر ۴ امتیاز هدف فرقی نمی‌کند");
  const du = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.dungeon);
  must(du.ok, "سیاه‌چال باید ساخته شود");
  sim(state, 1);
  must(fearRaw(state) === -3 && fearLevel(state) === 0, "چوبه+سیاه‌چال = ۳− امتیاز، باز سطح ۰");
  state.resources.gold = 100;
  const ga2 = putNear(state, terrain, W, H, "چوبه دوم", 11, 1, CONFIG.BUILDINGS.gallows);
  must(ga2.ok, "چوبه دوم باید ساخته شود");
  sim(state, 1);
  must(fearRaw(state) === -4 && fearLevel(state) === -1, "۴− امتیاز = سطح −۱");
  must(fearPop(state) === -1 && popTarget(state) === base - 1, "هدف باید ۱ کمتر شده باشد");
  must(fearAttackPct(fearLevel(state)) === -5, "حمله در سطح −۱ باید −۵٪ باشد");
  must(fearInfo(state).level === -1 && policySummary(state).fear.level === -1, "پنل باید سطح −۱ را داشته باشد");
  // بار اضافه: با سطح −۳ (۱.۱۵×) چوب ۲۰۰تیک باید از ۱۱۵ مبنای بی‌ترس بیشتر باشد.
  state.resources.gold = 500;
  for (const [cc, rr] of [[14, 1], [5, 4], [8, 4], [11, 4]]) {
    putNear(state, terrain, W, H, "سیاه‌چال", cc, rr, CONFIG.BUILDINGS.dungeon);
  }
  sim(state, 1);
  must(fearRaw(state) === -12 && fearLevel(state) === -3, "۱۲− امتیاز = سطح −۳");
  const wc = putNear(state, terrain, W, H, "هیزم‌شکن", 14, 4, CONFIG.BUILDINGS.woodcutter);
  must(wc.ok, "هیزم‌شکن باید ساخته شود");
  sim(state, 200);
  must(state.resources.wood > 115, `چوب با ترس −۳ باید از ۱۱۵ بیشتر باشد، هست ${state.resources.wood}`);
  // گیره کف ∓۵: ۴ سیاه‌چال دیگر (۱۲−۸−=۲۰− → ۵−).
  state.resources.gold = 500;
  for (const [cc, rr] of [[17, 1], [20, 1], [17, 4], [20, 4]]) {
    putNear(state, terrain, W, H, "سیاه‌چال", cc, rr, CONFIG.BUILDINGS.dungeon);
  }
  sim(state, 1);
  must(fearRaw(state) === -20 && fearLevel(state) === -5, "۲۰− امتیاز باید به کف ۵− گیره شود");
  // ویرانه سطح نمی‌دهد: ۲ سیاه‌چال = ۴− امتیاز = سطح −۱؛ ویرانی یکی = ۲− = سطح ۰.
  const f2 = fresh();
  f2.state.resources.gold = 100;
  const d2a = putNear(f2.state, f2.terrain, f2.W, f2.H, "سیاه‌چال", 5, 1, CONFIG.BUILDINGS.dungeon);
  const d2b = putNear(f2.state, f2.terrain, f2.W, f2.H, "سیاه‌چال", 11, 1, CONFIG.BUILDINGS.dungeon);
  must(d2a.ok && d2b.ok, "دو سیاه‌چال باید ساخته شوند");
  sim(f2.state, 1);
  must(fearLevel(f2.state) === -1, "پیش از ویرانی سطح −۱");
  d2a.building.destroyed = true;
  must(fearLevel(f2.state) === 0, "ویرانه سطح نمی‌دهد");
  // MP: سیاه‌چال حریف شمرده نمی‌شود (۲ سیاه‌چال خودی = ۴− امتیاز = سطح −۱).
  const f3 = fresh();
  enableMp(f3.state, 2, ["A", "B"]);
  f3.state.mpres[1].resources.gold = 200;
  const m1 = putNear(f3.state, f3.terrain, f3.W, f3.H, "سیاه‌چال", 5, 1, CONFIG.BUILDINGS.dungeon, 1);
  const m2 = putNear(f3.state, f3.terrain, f3.W, f3.H, "سیاه‌چال", 11, 1, CONFIG.BUILDINGS.dungeon, 1);
  must(m1.ok && m2.ok, "بازیکن ۱ سیاه‌چال‌های خودش را می‌سازد");
  m1.building.buildLeft = 0; m2.building.buildLeft = 0;
  must(fearLevel(f3.state, 0) === 0, "سیاه‌چال حریف برای بازیکن ۰ نیست");
  must(fearLevel(f3.state, 1) === -1, "۴− امتیاز خودی برای بازیکن ۱ سطح −۱ است");
  // نبرد: ضربه سرباز خودی با ترس −۱ (×۰.۹۵) باید دشمن را کمتر بزند.
  const run = (withBad) => {
    const f = fresh();
    f.state.resources.gold = 100;
    if (withBad) {
      const p1 = putNear(f.state, f.terrain, f.W, f.H, "سیاه‌چال", 14, 1, CONFIG.BUILDINGS.dungeon);
      const p2 = putNear(f.state, f.terrain, f.W, f.H, "سیاه‌چال", 5, 1, CONFIG.BUILDINGS.dungeon);
      must(p1.ok && p2.ok, "سیاه‌چال‌های میدان نبرد باید ساخته شوند");
    }
    spawnUnit(f.state, "soldier", 5.5, 5.5);
    spawnUnit(f.state, "swordsman", 6.5, 5.5);
    simC(f.state, f.terrain, 30);
    const foe = f.state.units.find((u) => u.type === "swordsman");
    must(foe, "شمشیرزن دشمن باید باشد");
    return foe.hp;
  };
  const hpPlain = run(false), hpBad = run(true);
  must(hpBad > hpPlain, `دشمن با ترس بد باید کمتر خورده باشد (${hpBad} در برابر ${hpPlain})`);
  return { name: "چیزهای بد", pass: true, detail: "چوبه/سیاه‌چال + ۵۰/۴۰طلا + امتیاز/سطح/هدف/کار/گیره/ویرانه/MP/نبرد" };
}


// پنل Fear Factor (فاز ۱ بند ۸۲ — §۵.۷): هر چهار چیز (باغ/تندیس/چوبه/سیاه‌چال)
// از دکمه‌های پالت قابل ساخت‌اند (sim-side: tryPlace) و پنل می‌گوید برای سطح
// بعد چند بار خوب (↑) / بد (↓) لازم است — خالص و MP-aware.
// --- قرارداد علامت ترس (فاز ۱ بند ۹۶ — §۱۸.۵/۵.۷): سطح مثبت (چیز خوب) =
// روحیه/حمله ↑ و کار ↓؛ سطح منفی (چیز بد) = برعکس. فرمول در t_fear_scale؛
// اینجا تقاطع رفتاری هر دو سو در یک‌جا.
function t_fear_sign() {
  must(FEAR.workPct === 5 && FEAR.attackPct === 5, "۵٪ هر سطح از داده است");
  must(FEAR.ptsPerLevel === 4, "هر ۴ امتیاز = ۱ سطح (بند ۹۷)");
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 100;
  const gd1 = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.garden);
  const gd2 = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.garden);
  must(gd1.ok && gd2.ok, "دو باغ باید ساخته شوند");
  sim(state, 1);
  must(fearRaw(state) === 4 && fearLevel(state) === 1, "۲ باغ = ۴ امتیاز = سطح +۱");
  must(workGain(state, { type: "woodcutter" }) < 1, "خوب: کار کند می‌شود");
  must(fearAttackMult(state) > 1 && fearPop(state) > 0, "خوب: حمله/محبوبیت بالا می‌رود");
  const f2 = fresh();
  f2.state.resources.gold = 100;
  const du1 = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 5, 1, CONFIG.BUILDINGS.dungeon);
  const du2 = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 8, 1, CONFIG.BUILDINGS.dungeon);
  must(du1.ok && du2.ok, "دو سیاه‌چال باید ساخته شوند");
  sim(f2.state, 1);
  must(fearRaw(f2.state) === -4 && fearLevel(f2.state) === -1, "۲ سیاه‌چال = ۴− امتیاز = سطح −۱");
  must(workGain(f2.state, { type: "woodcutter" }) > 1, "بد: کار تند می‌شود");
  must(fearAttackMult(f2.state) < 1 && fearPop(f2.state) < 0, "بد: حمله/محبوبیت پایین می‌رود");
  return { name: "قرارداد علامت ترس", pass: true, detail: "خوب ↑روحیه/↓کار، بد برعکس" };
}


function t_fear_next() {
  // هر چهار چیز قابل ساخت‌اند (دکمه‌های Town Buildings در پالت).
  const f0 = fresh();
  f0.state.resources.gold = 500;
  for (const [key, c, r] of [["garden", 5, 1], ["statue", 8, 1], ["gallows", 10, 1], ["dungeon", 14, 1]]) {
    const p = tryPlace(f0.state, f0.terrain, f0.W, f0.H, c, r, CONFIG.BUILDINGS[key]);
    must(p.ok, `${key} باید قابل ساخت باشد، شد ${p.reason}`);
  }
  sim(f0.state, 1);
  must(fearRaw(f0.state) === 0 && fearLevel(f0.state) === 0, "۲+۱−۱−۲ = خام ۰ و سطح ۰");
  // شمارش امتیازی (بند ۹۷): تهی → هر سو ۴؛ باغ (خام ۲) → بالا ۲ / پایین ۶.
  const { W, H, terrain, state } = fresh();
  const before = JSON.stringify(state);
  must(JSON.stringify(fearNext(state)) === '{"up":4,"down":4}', "تهی: هر سو ۴ امتیاز");
  must(JSON.stringify(state) === before, "fearNext باید خالص باشد");
  state.resources.gold = 100;
  const gd = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.garden);
  must(gd.ok, "باغ باید ساخته شود");
  sim(state, 1);
  must(fearRaw(state) === 2, "خام باغ = ۲");
  must(JSON.stringify(fearNext(state)) === '{"up":2,"down":6}', "سطح ۰ با خام ۲: بالا ۲، پایین ۶");
  // ۵ باغ دیگر (خام ۱۲ → سطح ۳): بالا ۴، پایین ۴.
  state.resources.gold = 500;
  for (const [cc, rr] of [[8, 1], [14, 1], [5, 4], [8, 4], [11, 4]]) {
    putNear(state, terrain, W, H, "باغ", cc, rr, CONFIG.BUILDINGS.garden);
  }
  sim(state, 1);
  must(fearRaw(state) === 12 && fearLevel(state) === 3, "خام ۱۲ → سطح ۳");
  must(JSON.stringify(fearNext(state)) === '{"up":4,"down":4}', "در سطح ۳: هر سو ۴ امتیاز");
  // گیره بالا: ۵ باغ دیگر (خام ۲۲ → سطح ۵): بالا null، پایین ۲۲−۱۶=۶.
  state.resources.gold = 500;
  for (const [cc, rr] of [[17, 1], [20, 1], [14, 4], [17, 4], [20, 4]]) {
    putNear(state, terrain, W, H, "باغ", cc, rr, CONFIG.BUILDINGS.garden);
  }
  sim(state, 1);
  must(fearRaw(state) === 22 && fearLevel(state) === 5, "خام ۲۲ → سطح ۵");
  must(JSON.stringify(fearNext(state)) === '{"up":null,"down":6}', "در سقف: بالا null و پایین ۶");
  // گیره پایین: ۱۰ سیاه‌چال (خام −۲۰ → سطح −۵): بالا −۱۶+۲۰=۴، پایین null.
  const f2 = fresh();
  f2.state.resources.gold = 500;
  for (const [cc, rr] of [[5, 1], [8, 1], [11, 1], [14, 1], [17, 1], [20, 1], [5, 4], [8, 4], [11, 4], [14, 4]]) {
    putNear(f2.state, f2.terrain, f2.W, f2.H, "سیاه‌چال", cc, rr, CONFIG.BUILDINGS.dungeon);
  }
  sim(f2.state, 1);
  must(fearRaw(f2.state) === -20 && fearLevel(f2.state) === -5, "خام −۲۰ → سطح −۵");
  must(JSON.stringify(fearNext(f2.state)) === '{"up":4,"down":null}', "در کف: بالا ۴ و پایین null");
  // پنل و خلاصه + MP.
  must(JSON.stringify(fearInfo(state).next) === '{"up":null,"down":6}', "پنل باید شمارش را داشته باشد");
  must(JSON.stringify(policySummary(state).fear.next) === '{"up":null,"down":6}', "خلاصه باید شمارش را داشته باشد");
  const f3 = fresh();
  enableMp(f3.state, 2, ["A", "B"]);
  const m = putNear(f3.state, f3.terrain, f3.W, f3.H, "باغ", 5, 1, CONFIG.BUILDINGS.garden, 1);
  must(m.ok, "بازیکن ۱ باغ خودش را می‌سازد");
  m.building.buildLeft = 0;
  must(JSON.stringify(fearNext(f3.state, 0)) === '{"up":4,"down":4}', "برش ۰ تهی است");
  must(JSON.stringify(fearNext(f3.state, 1)) === '{"up":2,"down":6}', "برش ۱ (خام ۲): بالا ۲، پایین ۶");
  return { name: "شمارش سطح بعد ترس", pass: true, detail: "۴ دکمه + ↑/↓ امتیازی + سقف/کف + پنل/MP" };
}


// توقف/شروع مصرف غذا (فاز ۱ بند ۸۵ — §۶.۳): کلیک روی نوع غذا (فرمان food، در
// MP هم) مصرف آن را می‌بندد/باز می‌کند؛ بسته از چرخه خوردن و تنوع بیرون است؛
// در ذخیره می‌ماند (قدیمی → []).
function t_food_toggle() {
  const { W, H, terrain, state } = fresh();
  must(Array.isArray(state.offFood) && state.offFood.length === 0, "تازه: هیچ توقفی نیست");
  let r = applyCmd(state, terrain, { kind: "food", v: "meat" });
  must(r.ok && JSON.stringify(state.offFood) === '["meat"]', "تاگل باید گوشت را ببندد");
  r = applyCmd(state, terrain, { kind: "food", v: "meat" });
  must(r.ok && state.offFood.length === 0, "تاگل دوباره باید باز کند");
  r = applyCmd(state, terrain, { kind: "food", v: "stone" });
  must(!r.ok && state.offFood.length === 0, "نوع نامناسب باید INVALID شود");
  // خالص: بسته پریده می‌شود.
  const bag = { food: 0, meat: 3, cheese: 2, apples: 0 };
  must(eatOneUnit(bag, ["meat"]) === true && bag.meat === 3 && bag.cheese === 1, "گوشت بسته باید پریده شود");
  must(eatOneUnit({}, ["food", "meat", "cheese", "apples"]) === false, "همه‌بسته یعنی نخوردن");
  // تنوع: بسته شمرده نمی‌شود.
  state.resources.food = 5;
  state.resources.meat = 5;
  must(foodVariety(state).types === 2, "پیش از بستن ۲ نوع است");
  applyCmd(state, terrain, { kind: "food", v: "meat" });
  must(foodVariety(state).types === 1 && foodVariety(state).bonus === 0, "پس از بستن ۱ نوع است");
  // sim: با گوشت بسته، گوشت خورده نمی‌شود و کمبود ثبت می‌شود.
  const eat = (off) => {
    const f = fresh();
    const w = tryPlace(f.state, f.terrain, f.W, f.H, 5, 1, CONFIG.BUILDINGS.woodcutter);
    must(w.ok, "هیزم‌شکن باید ساخته شود");
    f.state.resources.food = 0;
    f.state.resources.cheese = 0;
    f.state.resources.apples = 0;
    f.state.resources.meat = 5;
    if (off) applyCmd(f.state, f.terrain, { kind: "food", v: "meat" });
    sim(f.state, 200);
    return f.state;
  };
  const open = eat(false);
  must(open.resources.meat < 5 && open.consumedTotal > 0, "باز: گوشت خورده می‌شود");
  const shut = eat(true);
  must(shut.resources.meat === 5 && shut.consumedTotal === 0 && shut.shortageTotal > 0, "بسته: گوشت می‌ماند و کمبود ثبت می‌شود");
  // ذخیره: می‌ماند؛ قدیمی (بی‌میدان) → [].
  const loaded = deserializeJSON(serializeJSON(shut));
  must(JSON.stringify(loaded.offFood) === '["meat"]', "توقف باید در ذخیره بماند");
  must(snapOf(loaded) === snapOf(shut), "اسنپ‌شات پس از load باید بخواند");
  const oldDoc = JSON.parse(serializeJSON(shut));
  delete oldDoc.offFood;
  must(JSON.stringify(deserialize(oldDoc).offFood) === "[]", "ذخیره قدیمی → []");
  // MP: برش مالک.
  const f3 = fresh();
  enableMp(f3.state, 2, ["A", "B"]);
  const m = applyCmd(f3.state, f3.terrain, { kind: "food", v: "meat", owner: 1 });
  must(m.ok, "فرمان MP باید موفق باشد");
  must(f3.state.mpres[1].offFood.length === 1 && f3.state.mpres[0].offFood.length === 0, "توقف باید برش مالک باشد");
  return { name: "توقف مصرف غذا", pass: true, detail: "تاگل/INVALID + خوردن/تنوع + sim + ذخیره/قدیمی + MP" };
}


// --- 0.142.0: طلای ۱۲ سطح مالیات (فاز ۱ بند ۸۸ — §۶.۵ «دفترچه نمی‌گوید») ---
// پین حدس + رفتار دلتای طلا + آینه گزارش خزانه. بدون تغییر sim.
function t_tax_rates() {
  const pins = {
    generousBribe: [-1, 7], largeBribe: [-1, 5], smallBribe: [0, 3], none: [0, 1],
    low: [1, -2], average: [1, -4], high: [1, -6], mean: [1, -8],
    extortionate: [1, -12], downrightCruel: [2, -16], evenCrueler: [2, -20],
    cruellerThanCruel: [3, -24],
  };
  must(Object.keys(pins).length === 12, "باید ۱۲ سطح باشد");
  for (const [id, [g, p]] of Object.entries(pins)) {
    must(TAX[id] && TAX[id].goldPerWorker === g && TAX[id].pop === p, `سطح ${id} باید ${g}/${p} باشد`);
  }
  // رفتار: ۴ کارگر × ۵۰ تیک → دلتای طلا = ۴×نرخ (رشوه با خزانه ۶۰، کف صفر لازم نیست).
  for (const [id, [g]] of Object.entries(pins)) {
    const solo = fresh();
    solo.state.tax = id;
    solo.state.workers = 4;
    sim(solo.state, 50);
    must(solo.state.resources.gold === 60 + 4 * g, `${id}: طلا باید ${60 + 4 * g} باشد، هست ${solo.state.resources.gold}`);
  }
  // گزارش خزانه آینه فرمول sim است (بند ۳۵).
  const f2 = fresh();
  f2.state.tax = "high";
  f2.state.workers = 4;
  const rep = treasuryInfo(f2.state);
  must(rep.perMin === (4 * 1 * 600) / POP_PERIOD && rep.balance === 60 && rep.workers === 4, "خزانه باید آینه نرخ باشد");
  return { name: "طلای ۱۲ سطح مالیات", pass: true, detail: "پین ۱۲ نرخ + رفتار ۱۲ دلتا + خزانه" };
}


// --- 0.142.0: انبار چندنوعی هر خانه (فاز ۱ بند ۸۳ — §۶.۱) ---
// ۴ نوع خانواده انبار + سهم پرشدگی + خلوص + برش MP. نمایشی محض، بدون تغییر sim.
function t_stockpile_squares() {
  const { W, H, terrain, state } = fresh();
  must(JSON.stringify(STOCKPILE_TYPES) === '["wood","stone","gold","leather"]', "۴ نوع خانواده انبار");
  const before = JSON.stringify(state);
  const rows = stockpileInterior(state);
  must(rows.length === 4, "۴ ردیف");
  must(rows[0].type === "wood" && rows[0].amount === 120 && rows[0].cap === 500, "چوب ۱۲۰/۵۰۰");
  must(rows[1].type === "stone" && rows[1].amount === 40, "سنگ ۴۰");
  must(rows[2].type === "gold" && rows[2].amount === 60, "طلا ۶۰");
  must(rows[3].type === "leather" && rows[3].amount === 0 && rows[3].share === 0, "چرم تهی");
  must(Math.abs(rows[0].share - 0.24) < 1e-9, "سهم چوب ۰٫۲۴");
  must(rows.every((x) => typeof x.color === "string" && x.color[0] === "#"), "رنگ هر نوع");
  must(STOCK_COLORS.wood === rows[0].color && STOCK_COLORS.leather === rows[3].color, "رنگ از جدول");
  must(JSON.stringify(state) === before, "خالص باید باشد");
  const piles = stockpilePiles(rows);
  must(piles.length === 4, "۴ خانه");
  for (const sq of piles) {
    must(sq.bars.length === 3, "هر خانه ۳ میله (چرم تهی جا می‌ماند)");
    must(sq.bars.every((x) => x.h > 0 && x.h <= 1), "ارتفاع میله در (۰،۱]");
  }
  must(piles[0].bars[0].type === "wood", "ترتیب میله‌ها = ترتیب انواع");
  must(JSON.stringify(stockpilePiles(null)) !== "", "ورودی خراب نباید بترکد");
  // سقف با انبار: سهم عوض می‌شود.
  const s = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.stockpile);
  must(s.ok, "انبار ساخته شود");
  completeAll(state);
  const rows2 = stockpileInterior(state);
  must(rows2[0].amount === 100 && rows2[0].cap === 1000 && Math.abs(rows2[0].share - 0.1) < 1e-9, "با انبار: ۱۰۰ چوب، سقف ۱۰۰۰ و سهم ۰٫۱");
  // MP: برش مالک.
  enableMp(state, 2, ["A", "B"]);
  state.mpres[1].resources.wood = 100;
  must(stockpileInterior(state, 1)[0].amount === 100, "چوب بازیکن ۱ باید ۱۰۰ باشد");
  must(stockpileInterior(state, 0)[0].amount === 120, "چوب بازیکن ۰ باید ۱۲۰ بماند");
  return { name: "انبار چندنوعی هر خانه", pass: true, detail: "۴ نوع + سهم + خلوص + MP" };
}


// --- 0.142.0: دباغی و چرم (فاز ۱ بند ۲۰۰) ---
function t_tannery_leather() {
  const { W, H, terrain, state } = fresh();
  must(RATES.tannery.produces === "leather" && RATES.tannery.amount === 1 &&
    RATES.tannery.everyTicks === 50 && RATES.tannery.workers === 1 && RATES.tannery.consumesCow === 1,
    "کاتالوگ دباغی باید از داده باشد");
  const nm = CONFIG.BUILDINGS.tannery.name;
  must(typeof nm === "string" && nm.length > 0 && nm !== "game.building.tannery.name", "نام دباغی باید حل شود");
  withLang("en", () => {
    must(CONFIG.BUILDINGS.tannery.name === "Tannery", "نام en باید Tannery باشد");
  });
  const d = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.dairy);
  must(d.ok, "گاوداری باید ساخته شود");
  const tn = tryPlace(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.tannery);
  must(tn.ok, "دباغی باید ساخته شود");
  completeAll(state);
  must(workersNeeded(tn.building) === 1, "دباغی ۱ کارگر می‌خواهد");
  // گله خالی: دباغی به آستانه می‌رسد و در انتظار می‌ماند، چرم صفر.
  d.building.cows = 0; d.building.cowTicks = 0;
  sim(state, 60);
  must(state.resources.leather === 0 && tn.building.starved === true, "بی‌گاو: چرم صفر و در انتظار");
  // گله پر: شیردوشی کامل (۱ پنیر در تیک ۳۳) بعد دباغی در تیک ۵۰ می‌زند.
  d.building.cows = 3; d.building.cowTicks = 0; tn.building.progress = 0;
  sim(state, 50);
  must(state.resources.leather === 1, "پس از ۵۰ تیک: ۱ چرم");
  must(d.building.cows === 2, "۱ گاو مصرف شد");
  must(state.resources.cheese === 1, "پیش از مصرف گله کامل بود: ۱ پنیر");
  // گله ناقص: شیر می‌خوابد (رقابت بند ۹۲)؛ چرخه دوم در تیک ۵۰ می‌زند.
  sim(state, 50);
  must(state.resources.leather === 2, "چرخه دوم: ۲ چرم");
  must(d.building.cows === 1, "دوباره ۱ گاو رفت");
  must(state.resources.cheese === 1, "تا گله کامل نشود پنیر دوم نیست");
  // سقف پایه ۵۰۰ از خانواده انبار + تراش مازاد.
  must(capFor(state, "leather") === 500, "سقف پایه چرم ۵۰۰ است");
  state.resources.leather = 600;
  sim(state, 1);
  must(state.resources.leather === 500, "مازاد باید تراشیده شود");
  // ذخیره: چرم می‌ماند؛ قدیمی → ۰.
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.leather === 500, "چرم در ذخیره می‌ماند");
  const oldDoc = JSON.parse(serializeJSON(state));
  delete oldDoc.resources.leather;
  must(deserialize(oldDoc).resources.leather === 0, "ذخیره قدیمی → ۰");
  // MP: برش مالک.
  const f2 = fresh();
  enableMp(f2.state, 2, ["A", "B"]);
  const d2 = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 5, 5, CONFIG.BUILDINGS.dairy, 1);
  const t2 = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 1, 4, CONFIG.BUILDINGS.tannery, 1);
  must(d2.ok && t2.ok, "بناهای بازیکن ۱");
  d2.building.cows = 3;
  completeAll(f2.state);
  for (let i = 0; i < 50; i++) { f2.state.tick++; stepPlayerEconomy(f2.state, 0); stepPlayerEconomy(f2.state, 1); }
  must(f2.state.mpres[1].resources.leather === 1, "چرم بازیکن ۱ باید ۱ باشد");
  must(f2.state.mpres[0].resources.leather === 0, "چرم بازیکن ۰ باید ۰ بماند");
  return { name: "دباغی و چرم", pass: true, detail: "کاتالوگ + ۲ چرخه + انتظار + سقف + ذخیره + MP" };
}


// --- 0.142.0: رقابت گاو (فاز ۱ بند ۹۲) — takeCow + خوابیدن شیردوشی ---
function t_cow_take() {
  const { W, H, terrain, state } = fresh();
  const a = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.dairy);
  const b = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.dairy);
  must(a.ok && b.ok, "دو گاوداری");
  must(a.building.id < b.building.id, "ترتیب شناسه");
  a.building.cows = 3;
  b.building.cows = 1;
  completeAll(state);
  must(herdCows(state, 0) === 4, "گله ۴ است");
  must(takeCow(state, 0) === true && a.building.cows === 2, "از پرگاوتر برمی‌دارد");
  must(takeCow(state, 0) === true && a.building.cows === 1 && b.building.cows === 1, "باز هم از پرگاوتر");
  must(takeCow(state, 0) === true && a.building.cows === 0 && b.building.cows === 1, "تساوی → کمترین id");
  must(herdCows(state, 0) === 1, "گله ۱");
  must(takeCow(state, 0) === true && b.building.cows === 0, "آخری");
  must(takeCow(state, 0) === false && herdCows(state, 0) === 0, "خالی = false");
  b.building.cows = 2;
  b.building.destroyed = true;
  must(takeCow(state, 0) === false, "ویرانه نادیده گرفته می‌شود");
  // رقابت با شیردوشی: برداشت رقیب، شیر را می‌خواباند تا رشد دوباره.
  const f2 = fresh();
  const d = tryPlace(f2.state, f2.terrain, f2.W, f2.H, 5, 5, CONFIG.BUILDINGS.dairy);
  must(d.ok, "گاوداری دوم");
  d.building.cows = 3;
  completeAll(f2.state);
  sim(f2.state, 33);
  must(f2.state.resources.cheese === 1, "با ۳ گاو شیر هست");
  must(takeCow(f2.state, 0) === true, "برداشت رقیب موفق است");
  sim(f2.state, 33);
  must(f2.state.resources.cheese === 1 && d.building.cows === 2, "پس از برداشت شیر خوابید");
  // MP: گله بیگانه جدا.
  enableMp(f2.state, 2, ["A", "B"]);
  must(takeCow(f2.state, 1) === false && herdCows(f2.state, 1) === 0, "گله بیگانه جدا است");
  must(herdCows(f2.state, 0) === 2, "گله خودی ۲ است");
  return { name: "رقابت گاو", pass: true, detail: "پرگاوتر/تساوی/ویرانه + خواب شیردوشی + MP" };
}


// --- 0.142.0: پرتاب گاو و ابر بیماری (بند ۹۲ + ۲۱۴) ---
function t_firecow_cloud() {
  const { W, H, terrain, state } = fresh();
  const cat = spawnUnit(state, "catapult", 20.5, 20.5, 0);
  const ram = spawnUnit(state, "ram", 22.5, 20.5, 0);
  const bow = spawnUnit(state, "bowman", 24.5, 20.5, 0);
  const dairy = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.dairy);
  must(dairy.ok, "گاوداری");
  completeAll(state);
  // دلایل رد.
  must(fireCow(state, [], 25, 20, 0).reason === "INVALID", "بی‌یگان INVALID");
  must(fireCow(state, [999], 25, 20, 0).reason === "INVALID", "شناسه نایاب INVALID");
  must(fireCow(state, [ram.id], 25, 20, 0).reason === "NOT_SIEGE", "دژکوب NOT_SIEGE");
  must(fireCow(state, [cat.id], 25, 20, 0).reason === "NOT_DEPLOYED", "سیار NOT_DEPLOYED");
  must(deployUnit(state, cat).ok && cat.deployed === true, "استقرار موفق است");
  must(fireCow(state, [cat.id], 25, 20, 0).reason === "NO_COW", "بی‌گاو NO_COW");
  dairy.building.cows = 3;
  must(fireCow(state, [cat.id], 21, 20, 0).reason === "OUT_OF_RANGE", "چسبیده OUT_OF_RANGE");
  must(fireCow(state, [cat.id], 60, 60, 0).reason === "OUT_OF_RANGE", "دور OUT_OF_RANGE");
  // پرتاب موفق.
  const ok = fireCow(state, [cat.id], 25, 20, 0);
  must(ok.ok && ok.fired === 1, "پرتاب باید موفق باشد");
  must(dairy.building.cows === 2, "۱ گاو رفت");
  must(cat.cowCd === 150, "سردی باید ۱۵۰ باشد");
  must(state.clouds.length === 1 && state.clouds[0].c === 25 &&
    state.clouds[0].r === 20 && state.clouds[0].left === 300, "ابر باید بنشیند");
  must(state.events.length > 0, "رویداد پرتاب باید ثبت شود");
  must(fireCow(state, [cat.id], 25, 20, 0).reason === "COOLDOWN", "سردی COOLDOWN می‌دهد");
  // خسارت ابر: هر ۶ تیک ۱ جان مستقیم (کماندار در شعاع است).
  const hp0 = bow.hp;
  stepClouds(state);
  must(bow.hp === hp0, "تیک ۱ بدون خسارت است");
  for (let i = 0; i < 5; i++) stepClouds(state);
  must(bow.hp === hp0 - 1, `پس از ۶ تیک ۱ خسارت، هست ${bow.hp}`);
  // انقضا: پاک می‌شود.
  state.clouds[0].left = 2;
  stepClouds(state);
  stepClouds(state);
  must(state.clouds.length === 0, "ابر منقضی باید پاک شود");
  // آینه فرمان sim (پس از سردی دستی).
  cat.cowCd = 0;
  const m = applyCmd(state, terrain, { kind: "firecow", ids: [cat.id], c: 26, r: 20 });
  must(m.ok && m.fired === 1 && state.clouds.length === 1, "آینه فرمان باید بزند");
  // سردشدن در گام نبرد.
  stepCombat(state, terrain);
  must(cat.cowCd === 149, "سردی باید در گام نبرد کم شود");
  // ذخیره/هش: ابر و سردی می‌مانند و هش عوض نمی‌شود.
  const h1 = stateHash(state);
  const loaded = deserializeJSON(serializeJSON(state));
must(stateHash(loaded) === h1, "هش پس از load باید بخواند");
  const lcat = loaded.units.find((u) => u.id === cat.id);
  must(lcat && lcat.cowCd === 149, "سردی در ذخیره می‌ماند");
  must(loaded.clouds.length === 1 && loaded.clouds[0].left === 299, "ابر در ذخیره می‌ماند");
  // رد خراب.
  const bad = JSON.parse(serializeJSON(state));
  bad.clouds = [{ c: 1, r: 1, left: -5 }];
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "ابر خراب باید رد شود");
  const bad2 = JSON.parse(serializeJSON(state));
  bad2.units.find((u) => u.id === cat.id).cowCd = -1;
  let threw2 = false;
  try { deserialize(bad2); } catch (e) { threw2 = e instanceof SaveError; }
  must(threw2, "سردی منفی باید رد شود");
  return { name: "پرتاب گاو و ابر بیماری", pass: true, detail: "۶ دلیل + ابر/خسارت/انقضا + آینه + ذخیره/هش" };
}

export { econCases };
