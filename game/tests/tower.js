// برج و رم (0.254.0 — C-CLN-58): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
// --- 0.156.0: برتری برج (§11.3/بند 261) + Ram (§18.3/بند 262) + خط قرمز (§11.2/بند 260) + سگ‌ها (§11.9/بندهای 288-289) ---
function towerCases() {
  return [t_towerguard, t_ramrow, t_wallpreview, t_wardogs];
}
// برتری دفاعی برج‌ها (0.156.0 — §11.3/بند 261): assassin ضد خانواده‌برج صفر + تیر دوربرد غیرمحاصره ضد برج نصف (guess).
function t_towerguard() {
  must(TOWER_FAMILY.length === 6, "خانواده برج ۶تایی است");
  must(isTowerFamily("tower") && isTowerFamily("lookout") && isTowerFamily("perimeter") && isTowerFamily("defence") && isTowerFamily("squaretower") && isTowerFamily("roundtower"), "هر ۶ برج عضوند");
  must(!isTowerFamily("wall") && !isTowerFamily("gate") && !isTowerFamily("hut") && !isTowerFamily("dogcage"), "دیوار/دروازه/کلبه/قفس برج نیستند");
  const T = (type) => ({ kind: "bld", b: { type, destroyed: false } });
  const H = { kind: "bld", b: { type: "hut", destroyed: false } };
  for (const k of TOWER_FAMILY) must(towerGuardDmg("assassin", UNITS.assassin, T(k), 13) === 0, `قاتل ضد ${k} صفر است`);
  must(towerGuardDmg("assassin", UNITS.assassin, H, 13) === 13, "قاتل ضد کلبه دست‌نخورده است");
  must(towerGuardDmg("bowman", UNITS.bowman, T("tower"), 5) === 2.5, "تیر دوربرد ضد برج نصف است");
  must(towerGuardDmg("bowman", UNITS.bowman, H, 5) === 5, "تیر ضد کلبه دست‌نخورده است");
  must(towerGuardDmg("swordsman", UNITS.swordsman, T("tower"), 7) === 7, "ضربه نزدیک ضد برج دست‌نخورده است");
  must(towerGuardDmg("catapult", UNITS.catapult, T("tower"), 10) === 10, "محاصره ضد برج دست‌نخورده است");
  const live = (type) => {
    const m = mpFresh(2);
    const ts = siteNear(m.terrain, m.state.occ, m.W, m.H, 10, 10, 3, 3);
    must(!!ts, "جای برج هست");
    must(tryPlace(m.state, m.terrain, m.W, m.H, ts[0], ts[1], CONFIG.BUILDINGS.tower, 0).ok, "برج ساخته شد");
    completeAll(m.state);
    const tower = m.state.buildings.find((b) => b.type === "tower");
    spawnUnit(m.state, type, tower.c - 1 + 0.5, tower.r + 1 + 0.5, 1);
    simC(m.state, m.terrain, 60);
    return tower;
  };
  const t1 = live("assassin");
  must(t1.hp === t1.maxHp, `قاتل نباید به برج آسیب بزند، hp=${t1.hp}`);
  const t2 = live("swordsman");
  must(t2.hp < t2.maxHp, `شمشیرزن باید به برج بزند، hp=${t2.hp}`);
  return { name: "برتری برج", pass: true, detail: "قاتل صفر + تیر نصف + زنده" };
}

// قدرت/مقاومت Ram (0.156.0 — §18.3/بند 262): one-shot دیوار تک‌لایه + تیر یک‌چهارم + بالیستا/نزدیک ×۲.
function t_ramrow() {
  must(JSON.stringify(RAM_ONESHOT_WALLS) === JSON.stringify(["wall", "lowwall", "crenwall"]), "دیوارهای تک‌لایه ۳تایند");
  const B = (type, maxHp) => ({ kind: "bld", b: { type, maxHp, destroyed: false } });
  must(ramStrikeDmg("ram", UNITS.ram, B("wall", 60), 24) === 60, "رم دیوار را one-shot می‌کند");
  must(ramStrikeDmg("ram", UNITS.ram, B("lowwall", 24), 24) === 24, "رم دیوار کوتاه را one-shot می‌کند");
  must(ramStrikeDmg("ram", UNITS.ram, B("crenwall", 72), 24) === 72, "رم کنگره‌دار را one-shot می‌کند");
  must(ramStrikeDmg("ram", UNITS.ram, B("gate", 80), 24) === 24, "رم ضد دروازه همان ×۳ است");
  must(ramStrikeDmg("ram", UNITS.ram, B("tower", 250), 24) === 24, "رم ضد برج one-shot نیست");
  must(ramStrikeDmg("swordsman", UNITS.swordsman, B("wall", 60), 7) === 7, "شمشیرزن one-shot ندارد");
  const R = { kind: "unit", u: { type: "ram", dead: false } };
  must(ramResistDmg("bowman", UNITS.bowman, R, 8) === 2, "تیر ضد رم یک‌چهارم است");
  must(ramResistDmg("bowman", UNITS.bowman, R, 5) === 1.25, "تیر ضعیف هم یک‌چهارم است");
  must(ramResistDmg("ballista", UNITS.ballista, R, 8) === 16, "بالیستا ضد رم ×۲ است");
  must(ramResistDmg("swordsman", UNITS.swordsman, R, 7) === 14, "ضربه نزدیک ضد رم ×۲ است");
  must(ramResistDmg("catapult", UNITS.catapult, R, 10) === 10, "محاصره ضد رم دست‌نخورده است");
  const live = (btype) => {
    const m = mpFresh(2);
    m.state.mpres[0].resources.wood = 500;
    m.state.mpres[1].resources.food = 500; m.state.mpres[1].resources.gold = 500;
    needBarracks(m.state, m.terrain, m.W, m.H, 1);
    const hs = siteNear(m.terrain, m.state.occ, m.W, m.H, 10, 10, 2, 2);
    must(!!hs, "جای کلبه لنگر هست");
    must(tryPlace(m.state, m.terrain, m.W, m.H, hs[0], hs[1], CONFIG.BUILDINGS.hut, 0).ok, "کلبه لنگر ساخته شد");
    must(tryPlace(m.state, m.terrain, m.W, m.H, hs[0] + 2, hs[1], CONFIG.BUILDINGS[btype], 0).ok, `${btype} ساخته شد`);
    completeAll(m.state);
    const g = grassNear(m.terrain, m.state.occ, m.W, m.H, hs[0] + 3, hs[1]);
    must(!!g, "جای رم هست");
    const h = hireUnit(m.state, m.terrain, m.W, m.H, g[0], g[1], "ram", 1);
    must(h.ok, `استخدام رم باید موفق باشد، شد ${h.reason}`);
    const target = m.state.buildings.find((b) => b.type === btype);
    simC(m.state, m.terrain, 20);
    return target;
  };
  const w = live("wall");
  must(w.destroyed === true, "دیوار باید در ۲۰ تیک بیفتد");
  const g2 = live("gate");
  must(g2.destroyed !== true && g2.hp <= 56, `دروازه باید زنده ولی زخمی باشد، hp=${g2.hp}`);
  return { name: "قدرت رم", pass: true, detail: "one-shot دیوار + دروازه زنده" };
}

// خط دیوار قرمز کامل (0.156.0 — §11.2/بند 260): هر تایل خراب = کل خط قرمز + رها هیچ.
function t_wallpreview() {
  must(WALL_LINE_MAX === 32, "سقف خط ۳۲ است");
  must(isLineDragType("wall") === true && isLineDragType("gate") === false, "فقط دیوار خط می‌شود");
  const all = [{ c: 0, r: 0, ok: true }, { c: 1, r: 0, ok: true }];
  must(blockLineIfAnyInvalid(all) === all, "خط سالم همان مرجع می‌ماند");
  const mixed = [{ c: 0, r: 0, ok: true }, { c: 1, r: 0, ok: false }, { c: 2, r: 0, ok: true }];
  const blocked = blockLineIfAnyInvalid(mixed);
  must(blocked.length === 3 && blocked.every((x) => !x.ok), "مخلوط کلاً قرمز می‌شود");
  must(blocked[0].c === 0 && blocked[2].c === 2 && blocked[1].r === 0, "مختصات حفظ می‌شود");
  must(mixed[0].ok === true, "ورودی جهش نمی‌خورد");
  must(blockLineIfAnyInvalid([{ c: 5, r: 5, ok: false }]).every((x) => !x.ok), "خط خراب خراب می‌ماند");
  const empty = [];
  must(blockLineIfAnyInvalid(empty) === empty, "خط تهی همان می‌ماند");
  must(blockLineIfAnyInvalid(null) === null, "غیرآرایه همان می‌ماند");
  must(t("main.wall.lineBlocked").length > 0, "پیام انسداد هست");
  withLang("en", () => { must(t("main.wall.lineBlocked").length > 0, "پیام en انسداد"); });
  return { name: "خط قرمز دیوار", pass: true, detail: "مخلوط→کل قرمز" };
}

// سگ‌های جنگی در قفس (0.156.0 — §11.9/بندهای 288-289): قفس ۲×۲/۴سگ + رهاسازی + شارژمجدد + No Dogs.
function t_wardogs() {
  const def = CONFIG.BUILDINGS.dogcage;
  must(!!def && def.w === 2 && def.h === 2 && def.hp === 100, "کاتالوگ ۲×۲/جان۱۰۰ است");
  must(def.cost && def.cost.wood === 10 && def.cost.gold === 100, "هزینه ۱۰چوب+۱۰۰طلا مرجع است");
  must(DOGS_PER_CAGE === 4 && DOG_REFILL_TICKS === 900, "۴ سگ + شارژ ۹۰۰تیک است");
  const wd = UNITS.wardog;
  must(!!wd && wd.hp === 25 && wd.dmg === 5 && wd.speed === 4.6 && wd.aggro === 14, "آمار سگ درست است");
  must(wd.noHire === true && wd.building === "dogcage" && wd.side === "player", "سگ فقط از قفس است");
  must(cageDogs(undefined) === 4 && cageDogs({ dogs: 2 }) === 2, "سگ پیش‌فرض/فعلی درست است");
  const h0 = fresh();
  const hg = grassNear(h0.terrain, h0.state.occ, h0.W, h0.H, 5, 5);
  must(!!hg, "جای استخدام هست");
  must(!hireUnit(h0.state, h0.terrain, h0.W, h0.H, hg[0], hg[1], "wardog").ok, "سگ مستقیم استخدام نمی‌شود");
  const f = fresh();
  f.state.resources.wood = 500; f.state.resources.gold = 500;
  const p = putNear(f.state, f.terrain, f.W, f.H, "قفس", 10, 10, def);
  must(p.ok, "قفس ساخته می‌شود");
  must(p.building.dogs === DOGS_PER_CAGE, "شارژ آغازین پر است");
  must(validateRelease(f.state, { type: "hut" }, 0).reason === "INVALID", "غیرقفس INVALID است");
  const raw = putNear(f.state, f.terrain, f.W, f.H, "قفس خام", 30, 30, def);
  must(raw.ok, "قفس دوم ساخته شد");
  must(validateRelease(f.state, raw.building, 0).reason === "UNDER_CONSTRUCTION", "نیمه‌کاره رد می‌شود");
  completeAll(f.state);
  const mst = mpFresh(2);
  mst.state.mpres[0].resources.wood = 500; mst.state.mpres[0].resources.gold = 500;
  const ms = siteNear(mst.terrain, mst.state.occ, mst.W, mst.H, 32, 32, 2, 2);
  must(!!ms, "جای قفس MP هست");
  must(tryPlace(mst.state, mst.terrain, mst.W, mst.H, ms[0], ms[1], def, 0).ok, "قفس MP ساخته شد");
  completeAll(mst.state);
  const mb = mst.state.buildings.find((b) => b.type === "dogcage");
  must(validateRelease(mst.state, mb, 1).reason === "NOT_OWNED", "بیگانه NOT_OWNED است");
  mst.state.rules = { noDogs: true };
  must(validateRelease(mst.state, mb, 0).reason === "NODOGS", "اتاق NoDogs می‌بندد");
  const ms2 = siteNear(mst.terrain, mst.state.occ, mst.W, mst.H, 40, 40, 2, 2);
  must(!!ms2, "جای قفس دوم MP هست");
  const nd = tryPlace(mst.state, mst.terrain, mst.W, mst.H, ms2[0], ms2[1], def, 0);
  must(!nd.ok && nd.reason === "NODOGS", `ساخت در اتاق NoDogs رد می‌شود، شد ${nd.reason}`);
  mst.state.rules = null;
  const n0 = f.state.units.length;
  const rel = releaseDogs(f.state, f.terrain, f.W, f.H, p.building, 0);
  must(rel.ok && rel.released === 4, `رهاسازی باید ۴ سگ بدهد، شد ${rel.released}`);
  must(p.building.dogs === 0, "قفس پس از رهاسازی تهی است");
  const dogs = f.state.units.slice(n0);
  must(dogs.length === 4 && dogs.every((u) => u.type === "wardog" && u.stance === "engage" && (u.owner == null ? 0 : u.owner) === 0), "۴ سگ درنده مالک ۰");
  must(f.state.events.some((e) => typeof e === "string" && e.includes("سگ")), "رویداد رهاسازی ثبت شد");
  must(validateRelease(f.state, p.building, 0).reason === "EMPTY", "قفس تهی EMPTY است");
  const fg = grassNear(f.terrain, f.state.occ, f.W, f.H, p.building.c + 4, p.building.r);
  must(!!fg, "جای دشمن هست");
  const foe = spawnUnit(f.state, "swordsman", fg[0] + 0.5, fg[1] + 0.5);
  simC(f.state, f.terrain, 300);
  const liveFoe = f.state.units.find((u) => u.id === foe.id && !u.dead);
  must(!liveFoe || liveFoe.hp < 60, "دشمن نزدیک باید زخمی/کشته شود");
  const k = fresh();
  k.state.resources.wood = 500; k.state.resources.gold = 500;
  const kp = putNear(k.state, k.terrain, k.W, k.H, "قفس شارژ", 10, 10, def);
  must(kp.ok, "قفس شارژ ساخته شد");
  completeAll(k.state);
  kp.building.dogs = 0; k.state.tick = 900;
  must(stepKennels(k.state) === 1 && kp.building.dogs === 1, "در تیک ۹۰۰ یک سگ برمی‌گردد");
  k.state.tick = 901;
  must(stepKennels(k.state) === 0 && kp.building.dogs === 1, "تیک نامضرب شارژ نمی‌دهد");
  kp.building.dogs = 4;
  must(stepKennels(k.state) === 0, "قفس پر شارژ نمی‌خواهد");
  const q = fresh();
  q.state.resources.wood = 500; q.state.resources.gold = 500;
  const qp = putNear(q.state, q.terrain, q.W, q.H, "قفس صف", 10, 10, def);
  must(qp.ok, "قفس صف ساخته شد");
  completeAll(q.state);
  must(applyCmd(q.state, q.terrain, { kind: "release", bld: qp.building.id, owner: 0 }).ok, "فرمان release از صف می‌نشیند");
  must(qp.building.dogs === 0, "صف قفس را تهی می‌کند");
  const ql = deserializeJSON(serializeJSON(q.state));
  must(ql.buildings.find((x) => x.id === qp.building.id).dogs === 0, "تهی در ذخیره می‌ماند");
  qp.building.dogs = 1;
  const hh1 = stateHash(q.state);
  qp.building.dogs = 2;
  must(stateHash(q.state) !== hh1, "سگ در هش می‌خواند");
  const bare = JSON.parse(serializeJSON(q.state));
  delete bare.buildings.find((x) => x.id === qp.building.id).dogs;
  must(deserialize(bare).buildings.find((x) => x.id === qp.building.id).dogs === 4, "قدیمی = پر");
  const bad = JSON.parse(serializeJSON(q.state));
  bad.buildings.find((x) => x.id === qp.building.id).dogs = 99;
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "سگ ۹۹ باید SaveError بدهد");
  must(t("game.building.dogcage.name") === "قفس سگ‌های جنگی", "نام فارسی قفس");
  must(t("game.unit.wardog.name") === "سگ جنگی", "نام فارسی سگ");
  withLang("en", () => {
    must(t("game.building.dogcage.name") === "Caged War Dogs", "نام en قفس");
    must(t("game.unit.wardog.name") === "War Dog", "نام en سگ");
  });
  return { name: "سگ‌های جنگی", pass: true, detail: "قفس + رهاسازی + شکار + شارژ + NoDogs + ذخیره/هش" };
}
export { towerCases };
