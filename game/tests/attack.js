// حمله و ارباب (0.256.0 — C-CLN-68): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
function attackCases() {
  return [t_attackpos, t_lord_keep, t_lord_hotkey, t_ailord_absence];
}

// حمله به اینجا (0.163.0 - بند 240): بمباران پاششی نقطه توسط دوربرد (بی‌تعقیب) + میلی attackmoveوار + ماندگاری + صف + ذخیره.
function t_attackpos() {
  const f = fresh();
  const B = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  must(!!B, "جای کماندار هست");
  const bow = spawnUnit(f.state, "bowman", B[0] + 0.5, B[1] + 0.5, 0);
  const bx = bow.x, br = bow.r;
  const P = grassNear(f.terrain, f.state.occ, f.W, f.H, B[0] + 4, B[1]);
  must(!!P, "نقطه بمباران هست");
  const E1 = spawnUnit(f.state, "swordsman", P[0] + 0.5, P[1] + 0.5, 0);
  const E2 = grassNear(f.terrain, f.state.occ, f.W, f.H, B[0] - 3, B[1]);
  must(!!E2, "جای دشمن دوم هست");
  const e2 = spawnUnit(f.state, "swordsman", E2[0] + 0.5, E2[1] + 0.5, 0);
  const hp1 = E1.hp, hp2 = e2.hp;
  const m = applyCmd(f.state, f.terrain, { kind: "order", orderKind: "attackpos", ids: [bow.id], c: P[0], r: P[1] });
  must(m.ok && bow.order && bow.order.kind === "attackpos", "فرمان حمله‌به‌اینجا صادر می‌شود");
  simC(f.state, f.terrain, 3);
  must(orderAttackPos(f.state, bow, -1, 0).reason === "OUT_OF_BOUNDS", "بیرون نقشه رد است");
  must(orderAttackPos(f.state, null, 1, 1).reason === "INVALID", "یگان تهی رد است");
  must(E1.hp < hp1, "دشمن روی نقطه بمباران می‌شود");
  must(e2.hp === hp2, "دشمن بیرون پاشش هدف نیست (بی‌تعقیب)");
  must(Math.hypot(bow.x - bx, bow.r - br) < 0.6, "کماندار درجا می‌ماند (بمباران، نه یورش)");
  must(bow.order && bow.order.kind === "attackpos" && bow.order.status === "active", "فرمان پس از بمباران فعال می‌ماند");
  // میلی (وضعیت تازه، جدا از نبرد کماندار): یورش به نقطه + درگیری در راه
  const f2 = fresh();
  const S = grassNear(f2.terrain, f2.state.occ, f2.W, f2.H, 30, 30);
  must(!!S, "جای سرباز هست");
  const sol = spawnUnit(f2.state, "soldier", S[0] + 0.5, S[1] + 0.5, 0);
  const F = spawnUnit(f2.state, "swordsman", S[0] + 1.5, S[1] + 0.5, 0);
  const fh = F.hp;
  const D = grassNear(f2.terrain, f2.state.occ, f2.W, f2.H, 45, 40);
  must(!!D, "مقصد دوردست هست");
  must(applyCmd(f2.state, f2.terrain, { kind: "order", orderKind: "attackpos", ids: [sol.id], c: D[0], r: D[1] }).ok, "میلی هم فرمان می‌گیرد");
  simC(f2.state, f2.terrain, 30);
  must(F.hp < fh, "میلی در راه درگیر می‌شود");
  must(sol.order && sol.order.kind === "attackpos", "فرمان میلی ماندگار است");
  const q = applyCmd(f2.state, f2.terrain, { kind: "order", orderKind: "attackpos", ids: [sol.id], c: D[0], r: D[1], queue: true });
  must(q.ok && sol.wp && sol.wp.length === 1 && sol.wp[0].kind === "attackpos", "گونه attackpos در صف می‌نشیند");
  const loaded = deserializeJSON(serializeJSON(f.state));
  const lb = loaded.units.find((u) => u.id === bow.id);
  must(lb && lb.order && lb.order.kind === "attackpos" && lb.order.c === P[0] && lb.order.r === P[1], "حمله‌به‌اینجا در ذخیره می‌ماند");
  return { name: "حمله به اینجا", pass: true, detail: "بمباران + میلی + صف + ذخیره" };
}

// قانون Keep ارباب در تک‌نفره (0.163.0 - بند 247): حرکت فقط Keep (مگر حمله) + بازگشت خودکار در حضور دشمن.
function t_lord_keep() {
  const f = fresh();
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد ساخته شد");
  must(spawnLord(f.state, f.terrain, f.W, f.H).ok, "ارباب برخاست");
  const L = f.state.units.find((u) => u.type === "lord");
  const K = lordKeepOf(f.state);
  must(K && K.type === "keep", "لنگر Keep هست");
  must(isSoloLord(f.state, L), "ارباب خودیِ سولوست");
  must(!isSoloLord(f.state, null) && !isSoloLord(f.state, { dead: true, type: "lord" }), "تهی/مرده solo نیست");
  const far = grassNear(f.terrain, f.state.occ, f.W, f.H, K.c + 20, K.r + 12);
  must(!!far, "نقطه دوردست هست");
  must(orderMove(f.state, L, far[0], far[1]).reason === "LORD_KEEP", "حرکت دور رد است");
  must(orderMove(f.state, L, K.c, K.r).ok, "حرکت به Keep آزاد است");
  must(orderPatrol(f.state, L, far[0], far[1]).reason === "LORD_KEEP", "گشت دور رد است");
  must(orderAttackMove(f.state, L, far[0], far[1]).ok, "دستور حمله آزاد است");
  cancelOrder(L);
  must(queueOrder(f.state, L, "move", far[0], far[1]).reason === "LORD_KEEP", "صف حرکت دور رد است");
  must(LORD_KEEP_MARGIN === 1 && lordKeepGate(f.state, K.c - 1, K.r - 1), "حاشیه ۱ حلقه مجاز است");
  must(!lordKeepGate(f.state, far[0], far[1]), "دوردست بیرون دروازه است");
  f.state.mp = { enabled: true };
  must(!isSoloLord(f.state, L), "در MP ارباب solo نیست");
  must(orderMove(f.state, L, far[0], far[1]).ok, "در MP حرکت آزاد است");
  const g = fresh();
  must(placeKeep(g.state, g.terrain, g.W, g.H).ok, "ستاد دوم ساخته شد");
  must(spawnLord(g.state, g.terrain, g.W, g.H).ok, "ارباب دوم برخاست");
  const L2 = g.state.units.find((u) => u.type === "lord");
  const K2 = lordKeepOf(g.state);
  const out = grassNear(g.terrain, g.state.occ, g.W, g.H, K2.c + 18, K2.r + 10);
  must(!!out, "نقطه بیرونی هست");
  must(orderAttackMove(g.state, L2, out[0], out[1]).ok, "ارباب به بیرون می‌رود");
  let i = 0;
  while (lordKeepGate(g.state, Math.floor(L2.x), Math.floor(L2.r)) && i < 600) { simC(g.state, g.terrain, 1); i++; }
  must(!lordKeepGate(g.state, Math.floor(L2.x), Math.floor(L2.r)), "ارباب از Keep دور شد");
  cancelOrder(L2); // پایان راهبری دستی تا بازگشت خودکار بی‌ابهام آزموده شود
  must(!L2.order, "فرمان حمله پس از رسیدن تمام است");
  spawnUnit(g.state, "swordsman", L2.x, L2.r);
  simC(g.state, g.terrain, 3);
  must(L2.order && L2.order.kind === "move" && lordKeepGate(g.state, L2.order.c, L2.order.r), "با دشمن نزدیک، ارباب به Keep برمی‌گردد");
  must(orderAttackMove(g.state, L2, out[0], out[1]).ok, "دستور حمله تازه");
  spawnUnit(g.state, "swordsman", L2.x + 1, L2.r);
  simC(g.state, g.terrain, 3);
  must(L2.order && L2.order.kind === "attackmove", "سفارش حمله بازیکن لمس نمی‌شود");
  const h = fresh();
  must(placeKeep(h.state, h.terrain, h.W, h.H).ok, "ستاد سوم ساخته شد");
  must(spawnLord(h.state, h.terrain, h.W, h.H).ok, "ارباب سوم برخاست");
  const L3 = h.state.units.find((u) => u.type === "lord");
  must(orderAttackMove(h.state, L3, out[0], out[1]).ok, "ارباب سوم به بیرون می‌رود");
  let j = 0;
  while (L3.order && j < 900) { simC(h.state, h.terrain, 1); j++; }
  must(!L3.order, "بی‌دشمن فرمان تمام می‌شود");
  simC(h.state, h.terrain, 5);
  must(!L3.order, "بی‌دشمن بازگشتی در کار نیست");
  return { name: "قانون Keep ارباب", pass: true, detail: "دروازه + بازگشت + استثنا" };
}

// هات‌کی Lord (0.163.0 - بند 249): پیش‌فرض L + گردش چرخه‌ای شناسه‌ها.
function t_lord_hotkey() {
  must(DEFAULT_KEYS.lord === "KeyL", "پیش‌فرض L است");
  must(KEY_ACTIONS.includes("lord"), "کنش lord ثبت است");
  must(normalizeKeys({}).lord === "KeyL", "نشست قدیمی بی‌کلید = پیش‌فرض");
  must(normalizeKeys({ lord: "KeyX" }).lord === "KeyX", "remap کاربر می‌ماند");
  must(typeof KEY_ACTION_FA.lord === "string" && KEY_ACTION_FA.lord.length > 0, "برچسب کلید هست");
  const f = fresh();
  const a = spawnUnit(f.state, "lord", 5.5, 5.5, 0);
  const b = spawnUnit(f.state, "lord", 6.5, 5.5, 0);
  const dead = spawnUnit(f.state, "lord", 7.5, 5.5, 0);
  dead.dead = true;
  const mp1 = spawnUnit(f.state, "lord", 8.5, 5.5, 1);
  spawnUnit(f.state, "soldier", 9.5, 5.5, 0);
  must(JSON.stringify(lordFocusIds(f.state.units, 0)) === JSON.stringify([a.id, b.id]), "فقط Lordهای زنده خودی‌اند");
  must(JSON.stringify(lordFocusIds(f.state.units, 1)) === JSON.stringify([mp1.id]), "اسلات دیگر جداست");
  must(lordFocusNext([a.id, b.id], a.id) === b.id, "بعدی");
  must(lordFocusNext([a.id, b.id], b.id) === a.id, "گردش چرخه‌ای است");
  must(lordFocusNext([a.id], 999) === a.id, "تکی همیشه خودش");
  must(lordFocusNext([], a.id) === null, "تهی null است");
  return { name: "هات‌کی Lord", pass: true, detail: "L + گردش" };
}

// غیبت Lord حریف AI (0.163.0 - بند 248، vacuous): نه یورش، نه موج، نه کاتالوگ ارباب دشمن دارد.
function t_ailord_absence() {
  for (const pers of ["wolf", "saladin", "arabLord"]) {
    for (let s = 0; s < 4; s++) {
      for (let k = 0; k < 12; k++) {
        const tp = aiRaidUnitType({ personality: pers, seed: 777 }, 1500, s, k);
        must(tp !== "lord", `یورش ${pers} ارباب ندارد (${tp})`);
      }
    }
  }
  must(!UNITS.ailord, "نوع ailord در کاتالوگ نیست");
  const f = fresh();
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد ساخته شد");
  for (let w = 0; w < 6; w++) spawnWave(f.state, f.terrain, f.W, f.H);
  must(!f.state.units.some((u) => u.type === "lord" && u.side === "enemy"), "موج‌ها ارباب ندارند");
  return { name: "غیبت Lord حریف", pass: true, detail: "یورش/موج/کاتالوگ" };
}
export { attackCases };
