// گشت و انحلال (0.256.0 — C-CLN-70): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
function patrolCases() {
  return [t_patrol10, t_disband, t_launchcow, t_digbuild_absence];
}

// گشت پیشرفته ۱۰نقطه‌ای (0.164.0 - بند 237): حلقه pts/pi + شیفت‌کلیک افزودن + سقف FULL + مهاجرت ذخیره قدیمی + دروازه ارباب.
function t_patrol10() {
  must(PATROL_MAX === 10, "سقف دفترچه ۱۰ است");
  const f = fresh();
  const A = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  const B = grassNear(f.terrain, f.state.occ, f.W, f.H, 16, 10);
  const C = grassNear(f.terrain, f.state.occ, f.W, f.H, 16, 16);
  const D = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 16);
  must(!!(A && B && C && D), "چهار گوشه هست");
  const sol = spawnUnit(f.state, "soldier", A[0] + 0.5, A[1] + 0.5, 0);
  must(applyCmd(f.state, f.terrain, { kind: "order", orderKind: "patrol", ids: [sol.id], c: B[0], r: B[1] }).ok, "گشت دویی صادر می‌شود");
  must(sol.order.pts.length === 2 && sol.order.pi === 1, "حلقه دوتایی با نمایه ۱ است");
  must(applyCmd(f.state, f.terrain, { kind: "order", orderKind: "patrol", ids: [sol.id], c: C[0], r: C[1], queue: true }).ok, "نقطه سوم می‌چسبد");
  must(sol.order.pts.length === 3 && !sol.wp, "صف جدا ساخته نمی‌شود");
  must(orderPatrolAppend(f.state, sol, D[0], D[1]).ok, "نقطه چهارم مستقیم می‌چسبد");
  must(sol.order.pts.length === 4, "حلقه چهارتایی است");
  for (let i = 4; i < 10; i++) {
    const P = grassNear(f.terrain, f.state.occ, f.W, f.H, 20 + i, 20);
    must(!!P, "جای پرکن هست");
    must(orderPatrolAppend(f.state, sol, P[0], P[1]).ok, "پرشدن تا ۱۰");
  }
  must(sol.order.pts.length === 10, "حلقه ۱۰تایی است");
  const E = grassNear(f.terrain, f.state.occ, f.W, f.H, 40, 40);
  must(!!E, "جای سرریز هست");
  must(orderPatrolAppend(f.state, sol, E[0], E[1]).reason === "FULL", "یازدهمی FULL است");
  must(sol.order.pts.length === 10, "حلقه پس از FULL دست‌نخورده است");
  must(orderPatrolAppend(f.state, sol, -1, 0).reason === "OUT_OF_BOUNDS", "بیرون نقشه رد است");
  must(orderPatrolAppend(f.state, null, 1, 1).reason === "INVALID", "یگان تهی رد است");
  const g = fresh();
  must(placeKeep(g.state, g.terrain, g.W, g.H).ok, "ستاد ساخته شد");
  must(spawnLord(g.state, g.terrain, g.W, g.H).ok, "ارباب برخاست");
  const L = g.state.units.find((u) => u.type === "lord");
  const K = lordKeepOf(g.state);
  const far = grassNear(g.terrain, g.state.occ, g.W, g.H, K.c + 15, K.r + 10);
  must(!!far, "نقطه دور هست");
  must(orderPatrol(g.state, L, K.c, K.r).ok, "گشت داخل Keep آزاد است");
  must(orderPatrolAppend(g.state, L, far[0], far[1]).reason === "LORD_KEEP", "افزودن دور به ارباب رد است");
  const f2 = fresh();
  const a = grassNear(f2.terrain, f2.state.occ, f2.W, f2.H, 10, 10);
  const b = grassNear(f2.terrain, f2.state.occ, f2.W, f2.H, 14, 10);
  const c = grassNear(f2.terrain, f2.state.occ, f2.W, f2.H, 14, 14);
  must(!!(a && b && c), "سه نقطه چرخه هست");
  const s2 = spawnUnit(f2.state, "soldier", a[0] + 0.5, a[1] + 0.5, 0);
  must(orderPatrol(f2.state, s2, b[0], b[1]).ok, "گشت تازه صادر می‌شود");
  must(orderPatrolAppend(f2.state, s2, c[0], c[1]).ok, "نقطه سوم می‌چسبد");
  const want = [1, 2, 0, 1];
  const seen = [];
  let guard = 0;
  while (seen.length < want.length && guard++ < 4000) {
    simC(f2.state, f2.terrain, 1);
    const pi = s2.order && s2.order.kind === "patrol" ? s2.order.pi : -1;
    if (pi === want[seen.length]) seen.push(pi);
  }
  must(JSON.stringify(seen) === JSON.stringify(want), "حلقه به ترتیب می‌چرخد");
  must(s2.order && s2.order.kind === "patrol" && s2.order.status === "active", "گشت پس از چرخه فعال می‌ماند");
  const old = JSON.parse(serializeJSON(f2.state));
  const ou = old.units.find((u) => u.id === s2.id);
  delete ou.order.pts; delete ou.order.pi;
  const back = deserializeJSON(JSON.stringify(old));
  const bu = back.units.find((u) => u.id === s2.id);
  must(bu.order && bu.order.kind === "patrol" && !Array.isArray(bu.order.pts), "قدیمی بی‌حلقه بار می‌شود");
  simC(back, f2.terrain, 2);
  must(Array.isArray(bu.order.pts) && bu.order.pts.length >= 2, "مهاجرت حلقه در گام رخ می‌دهد");
  const h1 = stateHash(f2.state);
  const loaded = deserializeJSON(serializeJSON(f2.state));
  const lu = loaded.units.find((u) => u.id === s2.id);
  must(lu.order.pts.length === s2.order.pts.length && lu.order.pi === s2.order.pi, "حلقه در ذخیره می‌ماند");
  must(stateHash(loaded) === h1, "هش پس از load می‌خواند");
  const bad = JSON.parse(serializeJSON(f2.state));
  const wu = bad.units.find((u) => u.id === s2.id);
  wu.order.pi = 99;
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "نمایه برون‌حلقه SaveError می‌دهد");
  const bad2 = JSON.parse(serializeJSON(f2.state));
  bad2.units.find((u) => u.id === s2.id).order.pts = [{ c: 1, r: 1 }];
  let threw2 = false;
  try { deserialize(bad2); } catch (e) { threw2 = e instanceof SaveError; }
  must(threw2, "حلقه تک‌نقطه‌ای SaveError می‌دهد");
  return { name: "گشت ۱۰نقطه‌ای", pass: true, detail: "حلقه + سقف + چرخه + مهاجرت + ذخیره" };
}

// انحلال یگان (0.164.0 - بند 246 + §9.1/خط 486): حذف + بازگشت دهقان؛ بی‌ستاد/مسکن‌پر = ناپدید؛ ارباب نه.
function t_disband() {
  const f = fresh();
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد ساخته شد");
  const w0 = f.state.workers;
  const cap = housingCap(f.state, 0);
  must(w0 < cap, "جا برای بازگشت هست");
  const s1 = spawnUnit(f.state, "soldier", 5.5, 5.5, 0);
  const s2 = spawnUnit(f.state, "soldier", 6.5, 5.5, 0);
  const d = disbandUnit(f.state, [s1.id, s2.id], 0);
  must(d.ok && d.n === 2 && d.vanished === 0, "دو یگان منحل می‌شوند");
  must(s1.dead && s2.dead, "منحل‌شده مرده منطقی است");
  must(f.state.workers === w0 + 2, "دو دهقان برگشتند");
  must(spawnLord(f.state, f.terrain, f.W, f.H).ok, "ارباب برخاست");
  const L = f.state.units.find((u) => u.type === "lord" && !u.dead);
  const wl = f.state.workers;
  const dl = disbandUnit(f.state, [L.id], 0);
  must(!dl.ok && dl.reason === "LORD" && !L.dead && f.state.workers === wl, "ارباب منحل نمی‌شود");
  const foe = spawnUnit(f.state, "soldier", 8.5, 8.5, 1);
  must(disbandUnit(f.state, [foe.id], 0).reason === "NOT_OWNED" && !foe.dead, "بیگانه NOT_OWNED است");
  must(disbandUnit(f.state, [], 0).reason === "INVALID", "فهرست تهی رد است");
  const K = lordKeepOf(f.state);
  K.destroyed = true;
  const w1 = f.state.workers;
  const s3 = spawnUnit(f.state, "soldier", 9.5, 9.5, 0);
  const dv = disbandUnit(f.state, [s3.id], 0);
  must(dv.ok && dv.vanished === 1 && f.state.workers === w1, "بی‌ستاد ناپدید می‌شود");
  K.destroyed = false;
  f.state.workers = cap;
  const s4 = spawnUnit(f.state, "soldier", 10.5, 10.5, 0);
  const df = disbandUnit(f.state, [s4.id], 0);
  must(df.ok && df.vanished === 1 && f.state.workers === cap, "مسکن پر ناپدید می‌شود");
  f.state.workers = w0;
  needBarracks(f.state, f.terrain, f.W, f.H);
  const ts = siteNear(f.terrain, f.state.occ, f.W, f.H, 20, 20, 2, 2);
  must(!!ts, "جای دیده‌بانی هست");
  must(tryPlace(f.state, f.terrain, f.W, f.H, ts[0], ts[1], CONFIG.BUILDINGS.lookout).ok, "دیده‌بانی ساخته شد");
  completeAll(f.state);
  const post = f.state.buildings.find((b) => b.type === "lookout");
  const bw = spawnUnit(f.state, "bowman", ts[0] + 0.5, ts[1] + 0.5, 0);
  must(garrisonUnit(f.state, bw, post).ok, "کماندار مستقر می‌شود");
  const wg = f.state.workers;
  must(disbandUnit(f.state, [bw.id], 0).ok, "مستقر منحل می‌شود");
  must((post.garrison || []).length === 0, "برج آزاد شد");
  must(f.state.workers === wg + 1, "دهقان مستقر برگشت");
  const m = mpFresh(2);
  const mu = spawnUnit(m.state, "soldier", 5.5, 5.5, 0);
  const mw = m.state.mpres[0].workers;
  must(applyCmd(m.state, m.terrain, { kind: "disband", ids: [mu.id], owner: 0 }).ok, "فرمان disband از صف MP می‌گذرد");
  must(mu.dead && m.state.mpres[0].workers === mw + 1, "دهقان به کیسه مالک برگشت");
  const loaded = deserializeJSON(serializeJSON(f.state));
  must(loaded.workers === f.state.workers, "شمار دهقانان در ذخیره می‌ماند");
  return { name: "انحلال یگان", pass: true, detail: "بازگشت + ناپدید + ارباب + گاریسون + MP + ذخیره" };
}

// پرتاب گاو با تربوشه و شمار گله (0.164.0 - بند 244): گزینش UI هر دو محاصره + بردِ هر سلاح + مصرف از گله.
function t_launchcow() {
  must(isCowSiege({ id: 1, type: "catapult", dead: false }), "منجنیق گاوافکن است");
  must(isCowSiege({ id: 2, type: "trebuchet", dead: false }), "تربوشه گاوافکن است");
  must(!isCowSiege({ id: 3, type: "soldier", dead: false }), "سرباز نیست");
  must(!isCowSiege({ id: 4, type: "ram", dead: false }), "رم نیست");
  must(!isCowSiege(null) && !isCowSiege({ id: 5, type: "catapult", dead: true }), "تهی/مرده نیست");
  must(t("ui.unit.firecow", { n: 3 }).indexOf("3") >= 0, "شمار گله روی برچسب می‌نشیند");
  const f = fresh();
  f.state.resources.wood = 500; f.state.resources.stone = 500; f.state.resources.food = 500; f.state.resources.gold = 500;
  let dl = null;
  for (let rr = 8; rr < f.H - 4 && !dl; rr += 2) {
    for (let cc = 8; cc < f.W - 4 && !dl; cc += 2) {
      const v = validate(f.state, f.terrain, f.W, f.H, cc, rr, CONFIG.BUILDINGS.dairy);
      if (v.ok) dl = tryPlace(f.state, f.terrain, f.W, f.H, cc, rr, CONFIG.BUILDINGS.dairy);
    }
  }
  must(dl.ok, "گاوداری ساخته شد");
  completeAll(f.state);
  dl.building.cows = 2;
  must(herdCows(f.state, 0) === 2, "گله ۲ است");
  const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 15, 15);
  must(!!g, "جای محاصره هست");
  const c0 = spawnUnit(f.state, "catapult", g[0] + 0.5, g[1] + 0.5, 0);
  const t0 = spawnUnit(f.state, "trebuchet", g[0] + 1.5, g[1] + 0.5, 0);
  c0.deployed = true; t0.deployed = true;
  const T = [g[0] + 11, g[1]];
  must(T[0] < f.W, "هدف در نقشه است");
  const dc = Math.hypot(T[0] + 0.5 - c0.x, T[1] + 0.5 - c0.r);
  const dt = Math.hypot(T[0] + 0.5 - t0.x, T[1] + 0.5 - t0.r);
  must(dc > 10 && dt >= 4 && dt <= 12, "هدف بیرون برد منجنیق و در برد تربوشه است");
  must(fireCow(f.state, [c0.id], T[0], T[1], 0).reason === "OUT_OF_RANGE", "منجنیق به ۱۱ نمی‌رسد");
  const r1 = fireCow(f.state, [t0.id], T[0], T[1], 0);
  must(r1.ok && r1.fired === 1, "تربوشه به ۱۱ می‌رسد");
  must(dl.building.cows === 1 && herdCows(f.state, 0) === 1, "۱ گاو از گله رفت");
  must(f.state.clouds.length === 1, "ابر بیماری نشست");
  return { name: "پرتاب گاو تربوشه", pass: true, detail: "گزینش + برد + شمار + مصرف" };
}

// غیبت حفر و ساخت (0.164.0 - بندهای 242/243، vacuous): نه tunneler نه engineer نه فرمان نه بنا.
function t_digbuild_absence() {
  must(UNITS.tunneler && UNITS.engineer && UNITS.ladderman, "یگان‌های انجمن‌اند (0.167.0) ولی مکانیک حفر/ساخت ندارند");
  must(!Object.keys(UNITS).some((k) => k !== "tunneler" && /tunnel|dig/i.test(k)), "جز حفار یگان حفاری نیست");
  must(!CONFIG.BUILDINGS.tunnel && !CONFIG.BUILDINGS.tunnelentrance && !CONFIG.BUILDINGS.siegetent && !CONFIG.BUILDINGS.tent, "ورودی تونل/چادر نیست");
  const f = fresh();
  must(applyCmd(f.state, f.terrain, { kind: "dig", c: 5, r: 5 }).reason === "INVALID", "فرمان dig ناشناس است");
  must(applyCmd(f.state, f.terrain, { kind: "build", c: 5, r: 5 }).reason === "INVALID", "فرمان build ناشناس است");
  simC(f.state, f.terrain, 100);
  must(f.state.buildings.every((b) => !/tunnel|tent/i.test(b.type)), "پس از ۱۰۰ تیک تونل/چادری نیست");
  return { name: "غیبت حفر و ساخت", pass: true, detail: "vacuous" };
}
export { patrolCases };
