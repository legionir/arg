// بالیستا و ردیف ستاد (0.252.0 — C-CLN-52): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
// --- 0.152.0: بالیستای آتشین (§۱۹.۳/بند ۱۱۵۵) + ردیف Manor (§۸.۱/بند ۴۰۴) + نام اولین اجرا (§۱.۱/بند ۱۰۳) ---
function ballistaCases() {
  return [t_ballista, t_manor_row, t_first_run];
}

// بالیستای آتشین (0.152.0 — §۱۹.۳/بند ۱۱۵۵): محاصره مستقرشونده که به سازه
// مستحکم (دیوار/برج/دروازه) آسیب نمی‌زند ولی بنای دیگر را می‌زند (×۲)؛ بی‌مهمات
// (پیش‌فرض رم) و بی‌نیاز از سلاح (خدمه‌دار).
function t_ballista() {
  const bd = UNITS.ballista;
  must(bd && bd.side === "player" && bd.requires === "barracks" && bd.building === "barracks", "بالیستا خودیِ سربازخانه است");
  must(bd.siege === true && bd.needsDeploy === true && bd.bonusVsBld === 2 && bd.noVsFort === true, "محاصره مستقرشونده ×۲ با مصونیت مستحکم");
  must(bd.hp === 100 && bd.armor === 1 && bd.dmg === 6 && bd.cd === 25 && bd.range === 9 && bd.minRange === 3, "جان/زره/آسیب/ریلود/برد/کمینه بالیستا");
  must(bd.cost.food === 80 && bd.cost.gold === 120 && bd.goldCost === 120 && bd.trainTicks === 150, "هزینه/آموزش بالیستا");
  must(Array.isArray(bd.equip) && bd.equip.length === 0 && !bd.requiresWeapon && !bd.ammoCap, "بالیستا بی‌سلاح و بی‌مهمات است");
  must(t("game.unit.ballista.name").length > 0, "نام فارسی بالیستا");
  withLang("en", () => {
    must(UNITS.ballista.name === "Bolt Thrower", "نام en بالیستا");
  });
  // گیت خالص.
  const wallT = { kind: "bld", b: { type: "wall", destroyed: false } };
  const hutT = { kind: "bld", b: { type: "hut", destroyed: false } };
  const unitT = { kind: "unit", u: {} };
  must(noFortDmg(bd, wallT, 12) === 0, "بالیستا به دیوار صفر می‌زند");
  must(noFortDmg(bd, hutT, 12) === 12, "بالیستا به کلبه می‌زند");
  must(noFortDmg(bd, unitT, 12) === 12, "یگان گیت نمی‌شود");
  must(noFortDmg(null, wallT, 12) === 12, "بی‌پرچم = همه‌چیز");
  must(noFortDmg(bd, { kind: "bld", b: { type: "wall", destroyed: true } }, 12) === 12, "ویرانه گیت نمی‌شود");
  // نبرد واقعی: دیوار حریف سالم می‌ماند.
  const f = fresh();
  if (f.state.ai && f.state.ai.resources) { f.state.ai.resources.wood = 500; f.state.ai.resources.stone = 500; }
  const ha = putNear(f.state, f.terrain, f.W, f.H, "کلبه لنگر", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(ha.ok, "کلبه لنگر ساخته شود");
  const wl = putNear(f.state, f.terrain, f.W, f.H, "دیوار حریف", 7, 1, CONFIG.BUILDINGS.wall, 9);
  must(wl.ok, "دیوار حریف ساخته شود");
  wl.building.hp = 2000; wl.building.maxHp = 2000;
  f.state.buildings.splice(f.state.buildings.indexOf(ha.building), 1);
  for (let j = 0; j < ha.building.h; j++) for (let k = 0; k < ha.building.w; k++) f.state.occ[(ha.building.r + j) * f.W + (ha.building.c + k)] = 0;
  const ba = spawnUnit(f.state, "ballista", wl.building.c + 0.5, wl.building.r + 5.5, 0);
  completeAll(f.state);
  must(deployUnit(f.state, ba).ok && ba.deployed === true, "استقرار بالیستا");
  simC(f.state, f.terrain, 100);
  must(wl.building.hp === 2000, "دیوار حریف نباید خورده باشد");
  // و کلبه حریف می‌خورد.
  const g = fresh();
  if (g.state.ai && g.state.ai.resources) { g.state.ai.resources.wood = 500; g.state.ai.resources.gold = 500; }
  const hut = putNear(g.state, g.terrain, g.W, g.H, "کلبه حریف", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(hut.ok, "کلبه حریف ساخته شود");
  hut.building.hp = 1000; hut.building.maxHp = 1000;
  const ba2 = spawnUnit(g.state, "ballista", hut.building.c + 0.5, hut.building.r + 5.5, 0);
  completeAll(g.state);
  must(deployUnit(g.state, ba2).ok, "استقرار دوم");
  simC(g.state, g.terrain, 100);
  must(hut.building.hp < 1000, "کلبه حریف باید خورده باشد");
  // استخدام بی‌سلاح.
  const q = fresh();
  needBarracks(q.state, q.terrain, q.W, q.H);
  q.state.resources.swords = 0; q.state.resources.bows = 0;
  q.state.resources.food = 500; q.state.resources.gold = 500;
  const h = hireUnit(q.state, q.terrain, q.W, q.H, 5, 5, "ballista");
  must(h.ok, `استخدام باید موفق باشد، شد ${h.reason}`);
  must(q.state.resources.food === 420 && q.state.resources.gold === 380, "هزینه ۸۰غ+۱۲۰ط کم می‌شود");
  return { name: "بالیستای آتشین", pass: true, detail: "کاتالوگ + مصونیت مستحکم + دیوار سالم/کلبه خورده + استخدام" };
}

// ردیف Manor (0.152.0 — §۸.۱/بند ۴۰۴): برچسب «Small stone gatehouse» مرجع
// Free با توضیح Keep است (مسکن ۸ + پنل مالیات + پیش‌نیاز همه‌ساخت) — هر سه
// جدا مدل‌اند: ستاد رایگانِ پیش‌قرارگرفته + قفل keep + ۱۲ سطح مالیات.
function t_manor_row() {
  const keep = CONFIG.BUILDINGS.keep;
  must(keep && JSON.stringify(keep.cost) === "{}", "ستاد رایگان است (Free مرجع)");
  must(TUNING.housing && TUNING.housing.keep === 8, "مسکن ستاد ۸ (Manor مرجع)");
  const { state } = fresh();
  must(keepLocked(state, 0) === true, "بی‌ستاد: ساخت قفل است (اول ستاد)");
  must(TUNING.tax && TUNING.tax.levels.length === 12, "پنل مالیات ۱۲سطحه");
  return { name: "ردیف Manor", pass: true, detail: "ستاد رایگان + مسکن ۸ + قفل + مالیات" };
}

// نام اولین اجرا (0.152.0 — §۱.۱/بند ۱۰۳): حافظه خالی/خراب = true؛ پروفایل
// معتبر یا نام جنگی قدیمی قابل‌مهاجرت = false (پرسش لازم نیست).
function t_first_run() {
  const store = (obj) => (k) => (Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : null);
  must(firstRunAsk(store({})) === true, "حافظه خالی = اولین اجرا");
  must(firstRunAsk(store({ [PROFILE_KEY]: JSON.stringify({ name: "Ali", logo: 0 }) })) === false, "پروفایل معتبر = نه");
  must(firstRunAsk(store({ [PROFILE_KEY]: "خراب" })) === true, "پروفایل خراب = اولین اجرا");
  must(firstRunAsk(store({ [PROFILE_KEY]: JSON.stringify({ name: "", logo: 0 }) })) === true, "نام خالی = اولین اجرا");
  must(firstRunAsk(store({ stronghold_warname: "Rex" })) === false, "نام جنگی قدیمی = مهاجرت، نه اولین اجرا");
  must(firstRunAsk(store({ stronghold_warname: "" })) === true, "نام قدیمی خالی = اولین اجرا");
  return { name: "نام اولین اجرا", pass: true, detail: "خالی/خراب/قدیمی/معتبر" };
}
export { ballistaCases };
