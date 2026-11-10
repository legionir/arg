// هویت و مواضع (0.252.0 — C-CLN-53): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
// --- 0.153.0: هویت آغازین (§1.1/بند 104) + فاصله ذخیره خودکار (§1.3/بند 117) + موضع تدافعی (§10.3/بند 567) + شعاع پابرجا (§10.3/بند 566) ---
function stanceCases() {
  return [t_identity, t_autosave, t_defensive, t_defend_save, t_stand];
}
// هویت آغازین (0.153.0 — §1.1/بند 104): کاتالوگ none/crusader/arab + ارتش
// اولیه رایگان دور ستاد (صلیبی ۵ کماندار+۷ سرباز، عربی ۵ کماندار عرب+۷ برده؛
// none = رفتار امروز) + گردش در لاگ ری‌پلی (قدیمی = بی‌نیرو).
function t_identity() {
  must(IDENTITIES.none && IDENTITIES.none.troops.length === 0, "none بی‌نیروست");
  must(validIdentity("crusader") === "crusader" && validIdentity("arab") === "arab", "صلیبی/عرب معتبرند");
  must(validIdentity("xx") === null && validIdentity(undefined) === null, "ناشناس رد می‌شود");
  const flat = (id) => IDENTITIES[id].troops.flatMap(([tp, n]) => Array(n).fill(tp)).sort().join(",");
  must(flat("crusader") === [...Array(5).fill("bowman"), ...Array(7).fill("soldier")].sort().join(","), "ترکیب صلیبی ۵+۷");
  must(flat("arab") === [...Array(5).fill("arabianBow"), ...Array(7).fill("slave")].sort().join(","), "ترکیب عربی ۵+۷");
  const f0 = fresh();
  const r0 = spawnStartingForce(f0.state, f0.terrain, f0.W, f0.H, "none", 0);
  must(r0.placed === 0 && r0.ok && f0.state.units.length === 0, "none هیچ یگانی نمی‌سازد");
  const f = fresh();
  placeKeep(f.state, f.terrain, f.W, f.H);
  const r = spawnStartingForce(f.state, f.terrain, f.W, f.H, "crusader", 0);
  must(r.ok && r.placed === 12, "صلیبی ۱۲ نیرو می‌نشاند");
  must(f.state.units.map((u) => u.type).sort().join(",") === flat("crusader"), "نوع‌های صلیبی دقیق");
  must(f.state.units.every((u) => u.side === "player" && u.stance === "engage" && (u.owner == null ? 0 : u.owner) === 0), "خودی/تهاجمی/مالک ۰");
  must(f.state.units.every((u) => f.terrain[Math.floor(u.r) * f.W + Math.floor(u.x)] === T_GRASS), "همه روی چمن‌اند");
  const g = fresh();
  placeKeep(g.state, g.terrain, g.W, g.H);
  spawnStartingForce(g.state, g.terrain, g.W, g.H, "crusader", 0);
  must(f.state.units.map((u) => u.x + "," + u.r).join("|") === g.state.units.map((u) => u.x + "," + u.r).join("|"), "جای نیروها قطعی است");
  const h = fresh();
  placeKeep(h.state, h.terrain, h.W, h.H);
  const ra = spawnStartingForce(h.state, h.terrain, h.W, h.H, "arab", 0);
  must(ra.ok && ra.placed === 12 && h.state.units.map((u) => u.type).sort().join(",") === flat("arab"), "عربی ۱۲ نیرو");
  must(validateReplayLog({ v: REPLAY_V, seed: 1, cmds: [], ident: "arab" }).ok, "لاگ با هویت عرب قبول می‌شود");
  must(validateReplayLog({ v: REPLAY_V, seed: 1, cmds: [] }).ok, "لاگ قدیمی بی‌هویت قبول می‌شود");
  must(!validateReplayLog({ v: REPLAY_V, seed: 1, cmds: [], ident: "xx" }).ok, "هویت خراب رد می‌شود");
  const sNone = newSoloFromSeed(7, "normal", null, "", "wolf");
  const sArab = newSoloFromSeed(7, "normal", null, "", "wolf", "arab");
  const cnt = (s) => s.state.units.filter((u) => u.side === "player" && u.type !== "lord").length;
  must(cnt(sNone) === 0 && cnt(sArab) === 12, "بازسازی سولو: none بی‌نیرو، عرب ۱۲");
  must(sNone.state.ident === "none" && sArab.state.ident === "arab", "هویت بازی در بازسازی می‌ماند");
  must(t("ui.menu.ident.crusader").length > 0, "نام فارسی هویت");
  withLang("en", () => {
    must(t("ui.menu.ident.crusader").indexOf("Crusader") >= 0, "نام en صلیبی");
  });
  return { name: "هویت آغازین", pass: true, detail: "کاتالوگ + ۱۲نیرو/قطعی + ری‌پلی" };
}

// فاصله ذخیره خودکار (0.153.0 — §1.3/بند 117): خاموش/۳۰ثانیه/۲دقیقه/۵دقیقه؛
// پیش‌فرض همان رفتار امروز (هر ۳۰۰ تیک) تا هیچ پینی نلغزد.
function t_autosave() {
  must(AUTOSAVE_OPTIONS.off === 0 && AUTOSAVE_OPTIONS.s30 === 300 && AUTOSAVE_OPTIONS.m2 === 1200 && AUTOSAVE_OPTIONS.m5 === 3000, "گزینه‌ها و تیک‌ها");
  must(validAutosave("s30") === "s30" && validAutosave("off") === "off" && validAutosave("m5") === "m5", "معتبر قبول می‌شود");
  must(validAutosave("xx") === null && validAutosave(undefined) === null && validAutosave("") === null, "نامعتبر رد می‌شود");
  must(autosaveTicks("off") === 0 && autosaveTicks("m2") === 1200 && autosaveTicks("m5") === 3000, "تیک هر گزینه");
  must(autosaveTicks("xx") === 300 && autosaveTicks(undefined) === 300, "پیش‌فرض ۳۰۰ (رفتار امروز)");
  must(autosaveDue(300, 0, "s30") === true && autosaveDue(299, 0, "s30") === false, "سررسید ۳۰ثانیه");
  must(autosaveDue(100000, 0, "off") === false, "خاموش هرگز سررسید ندارد");
  must(autosaveDue(1200, 0, "m2") === true && autosaveDue(1199, 0, "m2") === false, "سررسید ۲دقیقه");
  must(autosaveDue(500, 200, "s30") === true && autosaveDue(499, 200, "s30") === false, "تفاضل از آخرین ذخیره");
  must(t("ui.menu.autosave").length > 0 && t("ui.menu.autosave.off").length > 0, "نام فارسی تنظیم");
  return { name: "فاصله ذخیره خودکار", pass: true, detail: "گزینه‌ها + سررسید خالص" };
}

// موضع تدافعی (0.153.0 — §10.3/بند 567): گیت موضع + پستِ همراه + افسار ۲۰/۲۲
// + بازگشت به پست + پستِ تازه پس از رسیدن به مقصد صریح.
function t_defensive() {
  must(STANCES.DEFEND === "defend" && DEFEND_RADIUS === 20, "ثابت‌های تدافعی");
  const f = fresh();
  const me = spawnUnit(f.state, "soldier", 10.5, 10.5, 0);
  must(me.homeX === 10.5 && me.homeR === 10.5, "پست آغاز = جای ظهور");
  must(setStance(me, "defend").ok && me.stance === "defend", "تدافعی پذیرفته می‌شود");
  must(!setStance(me, "fly").ok && me.stance === "defend", "موضع نامعتبر رد می‌شود");
  must(stanceAll([me], "defend").every((r) => r.ok), "موضع جمعی تدافعی ثبت می‌شود");
  me.x = 15.5;
  setStance(me, "hold");
  must(me.homeX === 15.5 && me.homeR === 10.5, "موضع تازه = پست تازه");
  setStance(me, "defend");
  const hx = me.homeX, hr = me.homeR;
  const farTile = grassInBand(f.terrain, f.W, f.H, hx, hr, 23, 40);
  must(!!farTile, "جای دور روی چمن هست");
  const foe = spawnUnit(f.state, "swordsman", farTile[0] + 0.5, farTile[1] + 0.5);
  const mx0 = me.x, mr0 = me.r;
  simC(f.state, f.terrain, 10);
  must(foe.hp === 60, "مزاحم بیرون افسار دست‌نخورده می‌ماند");
  must(me.x === mx0 && me.r === mr0, "مدافع پست را ترک نمی‌کند");
  must(me.mission === "idle", "مأموریت تدافعی idle می‌ماند");
  const g = fresh();
  const gh = grassNear(g.terrain, g.state.occ, g.W, g.H, 10, 10);
  const bow = spawnUnit(g.state, "bowman", gh[0] + 0.5, gh[1] + 0.5, 0);
  setStance(bow, "defend");
  const bhx = bow.homeX, bhr = bow.homeR;
  const inTile = grassInBand(g.terrain, g.W, g.H, bhx, bhr, 5, 7.5);
  must(!!inTile, "جای درون‌شعاع هست");
  const foe2 = spawnUnit(g.state, "swordsman", inTile[0] + 0.5, inTile[1] + 0.5);
  const outTile = grassInBand(g.terrain, g.W, g.H, bhx, bhr, 12, 19);
  must(!!outTile, "جای بیرون‌دید هست");
  const foe3 = spawnUnit(g.state, "swordsman", outTile[0] + 0.5, outTile[1] + 0.5);
  setStance(foe3, "hold"); // بی‌حرکت می‌ماند تا دیده‌شدن/نشدن خالص بماند
  simC(g.state, g.terrain, 40);
  must(foe2.hp < 60, "مزاحم درون شعاع خورده است");
  must(!bow.dead, "کماندار تدافعی زنده می‌ماند");
  must(foe3.hp === 60, "مزاحم بیرون دید (ولی درون ۲۰) نادیده گرفته می‌شود");
  must(Math.hypot(bow.x - bhx, bow.r - bhr) <= 22, "کماندار در افسار مانده است");
  const h = fresh();
  const sol = spawnUnit(h.state, "soldier", 10.5, 10.5, 0);
  setStance(sol, "defend");
  const ht = grassInBand(h.terrain, h.W, h.H, 10.5, 10.5, 16, 24);
  must(!!ht, "پست دور هست");
  sol.homeX = ht[0] + 0.5; sol.homeR = ht[1] + 0.5;
  const d0 = Math.hypot(sol.x - sol.homeX, sol.r - sol.homeR);
  simC(h.state, h.terrain, 30);
  const d1 = Math.hypot(sol.x - sol.homeX, sol.r - sol.homeR);
  must(d1 < d0 - 4, "بی‌هدفِ دور از پست برمی‌گردد");
  const k = fresh();
  const mv = spawnUnit(k.state, "soldier", 10.5, 10.5, 0);
  setStance(mv, "defend");
  const dst = grassInBand(k.terrain, k.W, k.H, 10.5, 10.5, 10, 20);
  must(!!dst, "مقصد هست");
  orderMove(k.state, mv, dst[0], dst[1]);
  let n = 0;
  while (mv.mission === "active" && n < 400) { simC(k.state, k.terrain, 1); n++; }
  must(mv.mission === "done", "به مقصد صریح می‌رسد");
  must(mv.homeX === mv.x && mv.homeR === mv.r, "رسیدن به مقصد = پست تازه");
  return { name: "موضع تدافعی", pass: true, detail: "گیت + افسار + بازگشت + پست مقصد" };
}

// ذخیره/هش پست تدافعی (0.153.0): حفظ موضع+پست، تحمل قدیمی بی‌پست، رد خراب،
// هش پس از load برابر، و پست فقط در هش تدافعی‌ها (بی‌churn برای بقیه).
function t_defend_save() {
  const { terrain, state } = fresh();
  const me = spawnUnit(state, "soldier", 10.5, 10.5, 0);
  setStance(me, "defend");
  me.homeX = 20.5; me.homeR = 10.5;
  const h0 = stateHash(state);
  const loaded = deserializeJSON(serializeJSON(state));
  const lu = loaded.units[0];
  must(lu.stance === "defend" && lu.homeX === 20.5 && lu.homeR === 10.5, "موضع و پست حفظ می‌شوند");
  must(stateHash(loaded) === h0, "هش بلافاصله پس از load برابر است");
  const old = JSON.parse(serializeJSON(state));
  delete old.units[0].homeX; delete old.units[0].homeR;
  const lo = deserialize(old);
  must(lo.units[0].homeX === lo.units[0].x && lo.units[0].homeR === lo.units[0].r, "قدیمی بی‌پست یعنی جای فعلی");
  for (const patch of [(d) => { d.units[0].homeX = "x"; }, (d) => { d.units[0].homeR = -1; }, (d) => { d.units[0].homeX = 9999; }, (d) => { d.units[0].stance = "fly"; }]) {
    const bd = JSON.parse(serializeJSON(state));
    patch(bd);
    let threw = false;
    try { deserialize(bd); } catch (e) { threw = e instanceof SaveError; }
    must(threw, "دست‌کاری پست/موضع باید SaveError بدهد");
  }
  const fa = fresh(); const ua = spawnUnit(fa.state, "soldier", 10.5, 10.5, 0);
  const fb = fresh(); const ub = spawnUnit(fb.state, "soldier", 10.5, 10.5, 0);
  ua.homeX = 11.5; ub.homeX = 12.5;
  must(stateHash(fa.state) === stateHash(fb.state), "پستِ تهاجمی در هش نیست");
  setStance(ua, "defend"); setStance(ub, "defend");
  ua.homeX = 11.5; ub.homeX = 12.5;
  must(stateHash(fa.state) !== stateHash(fb.state), "پستِ تدافعی در هش است");
  return { name: "ذخیره پست تدافعی", pass: true, detail: "حفظ + قدیمی + هش گزینشی" };
}

// شعاع پابرجا (0.153.0 — §10.3/بند 566): کسب خودکار سقف ۸ + نام Stand +
// کلیدهای Q/W/E (قابل‌تغییر، با پیش‌فرض دفترچه).
function t_stand() {
  must(t("game.stance.hold") === "پابرجا" && t("game.stance.defend") === "تدافعی", "نام فارسی مواضع");
  must(t("ui.unit.hold") === "پابرجا" && t("ui.unit.defend") === "تدافعی", "برچسب دکمه‌های موضع");
  withLang("en", () => {
    must(t("game.stance.hold") === "Stand Ground" && t("game.stance.defend") === "Defensive", "نام en مواضع");
  });
  const f = fresh();
  const ah = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  const me = spawnUnit(f.state, "soldier", ah[0] + 0.5, ah[1] + 0.5, 0);
  setStance(me, "hold");
  const bt = grassInBand(f.terrain, f.W, f.H, me.x, me.r, 8.5, 10);
  must(!!bt, "جای دشمن در باند ۸٫۵-۱۰ هست");
  const foe = spawnUnit(f.state, "swordsman", bt[0] + 0.5, bt[1] + 0.5);
  setStance(foe, "hold");
  simC(f.state, f.terrain, 20);
  must(foe.hp === 60 && me.hp === 60, "پابرجا دشمن بیرون ۸ را نادیده می‌گیرد");
  setStance(me, "engage");
  simC(f.state, f.terrain, 60);
  must(foe.hp < 60, "تهاجمی همان دشمن را می‌گیرد (aggro سرباز ۱۰)");
  must(DEFAULT_KEYS.stanceHold === "KeyQ" && DEFAULT_KEYS.stanceDefend === "KeyW" && DEFAULT_KEYS.stanceEngage === "KeyE", "پیش‌فرض Q/W/E");
  must(KEY_ACTIONS.includes("stanceHold") && KEY_ACTIONS.includes("stanceDefend") && KEY_ACTIONS.includes("stanceEngage"), "کنش‌های موضع در فهرست کلیدها");
  must(normalizeKeys({}).stanceHold === "KeyQ", "نشست قدیمی بی‌کلید = پیش‌فرض");
  must(normalizeKeys({ stanceDefend: "KeyZ" }).stanceDefend === "KeyZ", "remap کاربر می‌ماند");
  must(normalizeKeys({ stanceHold: "!!" }).stanceHold === "KeyQ", "کلید خراب = پیش‌فرض");
  must(KEY_ACTION_FA.stanceHold.length > 0 && KEY_ACTION_FA.stanceDefend.length > 0 && KEY_ACTION_FA.stanceEngage.length > 0, "نام نمایشی کنش‌ها");
  return { name: "شعاع پابرجا", pass: true, detail: "سقف ۸ + نام + Q/W/E" };
}
export { stanceCases };
