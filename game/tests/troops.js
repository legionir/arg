// یگان‌های رزمی 0.151.0 (0.260.0 — C-CLN-77): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
function troopsCases() {
  return [t_slinger, t_pikeman, t_horsearcher, t_saladin];
}

// پرتاب گاو با تربوشه (0.157.0 — §12.4/بند ۳۰۱ — تکمیل پین 0.152.0): مستقرِ سرد در برد می‌زند + ابر + سردی + رم NOT_SIEGE.
function t_firecow_treb() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 500; state.resources.gold = 500;
  state.ai = state.ai || {};
  state.ai.resources = state.ai.resources || {};
  state.ai.resources.wood = 500;
  const hs = siteNear(terrain, state.occ, W, H, 10, 10, 2, 2);
  must(!!hs, "جای کلبه حریف باید باشد");
  must(tryPlace(state, terrain, W, H, hs[0], hs[1], CONFIG.BUILDINGS.hut, 9).ok, "کلبه حریف باید ساخته شود");
  const dairy = tryPlace(state, terrain, W, H, 30, 30, CONFIG.BUILDINGS.dairy);
  must(dairy.ok, "گاوداری برای گله لازم است");
  completeAll(state);
  dairy.building.cows = 3;
  const hx = hs[0] + 1, hy = hs[1] + 1;
  const g = grassNear(terrain, state.occ, W, H, Math.round(hx + 8), Math.round(hy));
  must(!!g, "جای تربوشه باید باشد");
  const h = hireUnit(state, terrain, W, H, g[0], g[1], "trebuchet");
  must(h.ok, `استخدام تربوشه باید موفق باشد، شد ${h.reason}`);
  const treb = h.unit;
  must(deployUnit(state, treb).ok && treb.deployed, "استقرار باید موفق باشد");
  const d0 = Math.hypot(hx - treb.x, hy - treb.r);
  must(d0 >= 4 && d0 <= 12, `فاصله باید در برد (۴..۱۲) باشد، هست ${d0}`);
  const r1 = fireCow(state, [treb.id], Math.round(hx), Math.round(hy), 0);
  must(r1.ok && r1.fired === 1, `پرتاب باید موفق باشد، شد ${r1.reason}`);
  must(state.clouds.length === 1, "ابر بیماری باید بنشیند");
  must((treb.cowCd || 0) > 0, "سردی باید بنشیند");
  must(!fireCow(state, [treb.id], Math.round(hx), Math.round(hy), 0).ok, "پرتاب دوم در سردی رد می‌شود");
  const ram = spawnUnit(state, "ram", treb.x + 2, treb.r);
  const r2 = fireCow(state, [ram.id], Math.round(hx), Math.round(hy), 0);
  must(!r2.ok && r2.reason === "NOT_SIEGE", `رم باید NOT_SIEGE باشد، شد ${r2.reason}`);
  return { name: "گاوافکن تربوشه", pass: true, detail: "پرتاب + ابر + سردی" };
}


















// --- 0.151.0: فلاخن‌انداز (§۹.۵/بند ۵۱۱) + نیزه‌دار زرهی (§۱۹.۳/بند ۱۱۵۴) + شلیک حین حرکت سواره (§۹.۵/بند ۵۱۳) + صلاح‌الدین (§۱۸.۵) ---

// فلاخن‌انداز (0.151.0 — §۹.۵/بند ۵۱۱): دوربرد مزدور عربی — آسیب بالا (۸)
// ولی برد کوتاه (۳٫۵)؛ مثل برده/کماندار عرب با فلاخن خودش می‌آید (equip []،
// بی‌نیاز از زرادخانه).
function t_slinger() {
  const sd = UNITS.slinger;
  must(sd && sd.side === "player" && sd.requires === "barracks" && sd.building === "barracks", "فلاخن‌انداز خودیِ سربازخانه است");
  must(sd.hp === 30 && sd.dmg === 8 && sd.cd === 14 && sd.range === 3.5 && sd.speed === 3.6 && sd.aggro === 8, "جان/آسیب/ریلود/برد/سرعت فلاخن‌انداز");
  must(sd.cost.food === 15 && sd.cost.gold === 12 && sd.goldCost === 12 && sd.trainTicks === 40, "هزینه/آموزش فلاخن‌انداز");
  must(Array.isArray(sd.equip) && sd.equip.length === 0 && !sd.requiresWeapon, "فلاخن‌انداز بی‌سلاح است");
  must(t("game.unit.slinger.name").length > 0, "نام فارسی فلاخن‌انداز");
  withLang("en", () => {
    must(UNITS.slinger.name === "Slinger", "نام en فلاخن‌انداز");
  });
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.swords = 0; state.resources.bows = 0;
  state.resources.food = 100; state.resources.gold = 100;
  const h = hireUnit(state, terrain, W, H, 5, 5, "slinger");
  must(h.ok, `استخدام بی‌سلاح باید موفق باشد، شد ${h.reason}`);
  must(state.resources.food === 85 && state.resources.gold === 88, "هزینه ۱۵غ+۱۲ط کم می‌شود");
  return { name: "فلاخن‌انداز", pass: true, detail: "کاتالوگ + برد کوتاه + استخدام بی‌سلاح" };
}

// نیزه‌دار زرهی (0.151.0 — §۱۹.۳/بند ۱۱۵۴): پیاده سنگین اروپایی با پاداش
// ۱٫۵× ضد ساختمان (دروازه شمشیر زرادخانه)؛ شمشیرزن عرب همان بند را از سمت
// دیگر می‌بندد — ضد ساختمان ضعیف (۰٫۵×). هر دو guess (دفترچه عدد نمی‌دهد).
function t_pikeman() {
  const pd = UNITS.pikeman;
  must(pd && pd.side === "player" && pd.requires === "barracks" && pd.building === "barracks", "نیزه‌دار خودیِ سربازخانه است");
  must(pd.hp === 80 && pd.armor === 2 && pd.dmg === 7 && pd.cd === 11 && pd.range === 1.6 && pd.speed === 2.6, "جان/زره/آسیب/ریلود/برد/سرعت نیزه‌دار");
  must(pd.cost.food === 45 && pd.cost.gold === 35 && pd.goldCost === 35 && pd.trainTicks === 70, "هزینه/آموزش نیزه‌دار");
  must(JSON.stringify(pd.equip) === '["swords"]' && pd.requiresWeapon === "swords", "نیزه‌دار شمشیر زرادخانه می‌خواهد");
  must(pd.bonusVsBld === 1.5, "پاداش ۱٫۵× ضد ساختمان");
  must(t("game.unit.pikeman.name").length > 0, "نام فارسی نیزه‌دار");
  withLang("en", () => {
    must(UNITS.pikeman.name === "Pikeman", "نام en نیزه‌دار");
  });
  must(dmgVs(UNITS.pikeman, "bld") === 10.5, "نیزه‌دار ضد ساختمان ۱۰٫۵ (۷×۱٫۵) است");
  must(dmgVs(UNITS.arabian, "bld") === 4, "شمشیرزن عرب ضد ساختمان ۴ (۸×۰٫۵) است");
  must(dmgVs(UNITS.soldier, "bld") === 6, "پیاده عادی بی‌ضریب مانده");
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 500; state.resources.gold = 500; state.resources.swords = 0;
  const r0 = hireUnit(state, terrain, W, H, 5, 5, "pikeman");
  must(!r0.ok && r0.reason === "NEEDS_WEAPON", `بی‌شمشیر باید NEEDS_WEAPON باشد، شد ${r0.reason}`);
  state.resources.swords = 5;
  const h = hireUnit(state, terrain, W, H, 5, 5, "pikeman");
  must(h.ok && state.resources.food === 455 && state.resources.gold === 465 && state.resources.swords === 4, "هزینه ۴۵غ+۳۵ط+۱ شمشیر کم می‌شود");
  const f = fresh();
  if (f.state.ai && f.state.ai.resources) { f.state.ai.resources.wood = 500; f.state.ai.resources.stone = 500; }
  const hut = putNear(f.state, f.terrain, f.W, f.H, "کلبه حریف", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(hut.ok, "کلبه حریف ساخته شود");
  hut.building.hp = 1000; hut.building.maxHp = 1000;
  spawnUnit(f.state, "pikeman", 8.5, 2.5, 0);
  completeAll(f.state);
  simC(f.state, f.terrain, 120);
  must(hut.building.hp < 1000, "نیزه‌دار باید به کلبه حریف ضربه بزند");
  return { name: "نیزه‌دار زرهی", pass: true, detail: "کاتالوگ + پاداش ساختمان + دروازه شمشیر + ضربه واقعی" };
}

// کماندار سواره: شلیک حین حرکت (0.151.0 — §۹.۵/بند ۵۱۳): پرچم fireOnMove —
// با فرمان move، هدفِ در برد را می‌زند و به راهش ادامه می‌دهد (بی‌تعقیب).
// چرخش دور حریف = میکروی بازیکن با همین فرمان‌هاست (بازی میکروی خودکار ندارد).
function t_horsearcher() {
  must(UNITS.horseArcher.fireOnMove === true, "پرچم شلیک حین حرکت سواره");
  const run = (kind) => {
    const { W, H, terrain, state } = fresh();
    const me = spawnUnit(state, kind, 5.5, 5.5, 0);
    const foe = spawnUnit(state, "swordsman", 10.5, 5.5);
    completeAll(state);
    must(orderMove(state, me, 15, 5).ok, "فرمان حرکت");
    simC(state, terrain, 25);
    const f = state.units.find((u) => u.id === foe.id);
    const m = state.units.find((u) => u.id === me.id);
    return { foeHp: f ? f.hp : 0, meX: m ? m.x : -1 };
  };
  const ha = run("horseArcher");
  must(ha.foeHp < 60, `سواره حین حرکت باید زده باشد، جان دشمن=${ha.foeHp}`);
  must(ha.meX > 6, `سواره باید به راهش ادامه داده باشد، x=${ha.meX}`);
  const bo = run("bowman");
  must(bo.foeHp === 60, "کماندار پیاده حین حرکت نمی‌زند (شاهد)");
  const ha2 = run("horseArcher");
  must(ha2.foeHp === ha.foeHp && ha2.meX === ha.meX, "شلیک حین حرکت باید قطعی باشد");
  return { name: "شلیک حین حرکت", pass: true, detail: "سواره می‌زند و می‌رود؛ پیاده نه + قطعیت" };
}

// صلاح‌الدین (0.151.0 — §۱۸.۵): هفتمین شخصیت حریف — یورش زودتر و ۴نفره با
// زوج بیابان (کماندار عرب + فلاخن‌انداز)؛ شاخه troops ژنریک است (بدون تغییر sim).
function t_saladin() {
  must(aiRaidPlan({ personality: "azarm" }, 0).at === 1350, "صلاح‌الدین زودرس (۱۳۵۰)");
  must(aiRaidPlan({ personality: "azarm" }, 0).n === 4, "صلاح‌الدین ۴نفره");
  const P = aiPersonality({ personality: "azarm" });
  must(P && P.troops && P.troops.ranged === "arabianBow" && P.troops.melee === "slinger", "زوج بیابان یورش");
  const seen = new Set();
  for (let i = 0; i < 61; i++) {
    const tp = aiRaidUnitType({ personality: "azarm", seed: 777 }, 1350, 0, i);
    must(tp === "arabianBow" || tp === "slinger", `یورش صلاح‌الدین فقط زوج بیابان است، شد ${tp}`);
    seen.add(tp);
  }
  must(seen.size === 2, "هر دو نوع بیابان باید بیایند");
  const { state } = aiFreshPers("azarm");
  must(state.ai.personality === "azarm", "شخصیت صلاح‌الدین ثبت شود");
  must(aiPersonalityName(state.ai) === "آذرم شب‌تاز", "نام فارسی صلاح‌الدین");
  withLang("en", () => {
    must(aiPersonalityName(state.ai) === "Azarm Night-Raider", "نام en صلاح‌الدین");
  });
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.ai.personality === "azarm", "صلاح‌الدین در ذخیره بماند");
  must(validateReplayLog({ v: REPLAY_V, seed: 1, pers: "azarm", cmds: [], ticks: 10 }).ok, "ری‌پلی با صلاح‌الدین قبول شود");
  return { name: "صلاح‌الدین", pass: true, detail: "یورش ۴نفره + زوج بیابان + سازگاری" };
}
export { troopsCases };
