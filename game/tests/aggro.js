// موضع تهاجمی و واحه (0.253.0 — C-CLN-55): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
// --- 0.154.0: موضع تهاجمی (§10.3/بند 568) ---
function aggroCases() {
  return [t_aggressive, t_stonekeep, t_speed_hotkeys, t_oasis];
}
// موضع تهاجمی (0.154.0 — §10.3/بند 568): کسب لنگرِ پست (دید aggro) + افسار
// 40/42 + بازگشت به پست + زنجیره هدف + شکار تلافی‌جویانه تیرِ از بیرون دید
// (مستقر/برج = شکار برج) + نگه‌داشت huntId در ذخیره/هش.
function t_aggressive() {
  must(ENGAGE_RADIUS === 40 && ENGAGE_DROP === 42, "ثابت‌های تهاجمی ۴۰/۴۲");
  // ۱. کسب لنگرِ پست: کماندارِ ۱۵خانه دور از پست، مزاحم نزدیک پست را می‌زند
  // (رفتار قدیم از جای خود و با دید ۸ او را نمی‌دید).
  const f = fresh();
  const fg = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  const bow = spawnUnit(f.state, "bowman", fg[0] + 0.5, fg[1] + 0.5, 0);
  const hx = bow.homeX, hr = bow.homeR;
  const away = grassInBand(f.terrain, f.W, f.H, hx, hr, 14, 16);
  must(!!away, "جای دور برای کماندار هست");
  bow.x = away[0] + 0.5; bow.r = away[1] + 0.5;
  const inTile = grassInBand(f.terrain, f.W, f.H, hx, hr, 5, 7);
  must(!!inTile, "جای درون‌شعاع هست");
  const foe = spawnUnit(f.state, "archer", inTile[0] + 0.5, inTile[1] + 0.5);
  setStance(foe, "hold");
  must(Math.hypot(bow.x - foe.x, bow.r - foe.r) > 10, "فاصله بیش از دید کماندار است");
  simC(f.state, f.terrain, 200);
  must(foe.hp < 30, "مزاحم نزدیک پست با کسب لنگرِ پست خورده است");
  must(!bow.dead, "کماندار تهاجمی زنده می‌ماند");
  // ۲. افسار: مزاحمِ بیرون ۴۰ از پست نادیده گرفته می‌شود.
  const g = fresh();
  const gg = grassNear(g.terrain, g.state.occ, g.W, g.H, 12, 12);
  const bow2 = spawnUnit(g.state, "bowman", gg[0] + 0.5, gg[1] + 0.5, 0);
  const farTile = grassInBand(g.terrain, g.W, g.H, bow2.homeX, bow2.homeR, 41, 44);
  must(!!farTile, "جای بیرون افسار هست");
  const foe2 = spawnUnit(g.state, "archer", farTile[0] + 0.5, farTile[1] + 0.5);
  setStance(foe2, "hold");
  const bx0 = bow2.x, br0 = bow2.r;
  simC(g.state, g.terrain, 30);
  must(foe2.hp === 30, "مزاحم بیرون افسار دست‌نخورده می‌ماند");
  must(bow2.x === bx0 && bow2.r === br0, "تهاجمیِ بی‌هدفِ سرِ پست نمی‌رود");
  // ۳. بازگشت: بی‌هدفِ دور از پست برمی‌گردد.
  const h = fresh();
  const sol = spawnUnit(h.state, "soldier", 10.5, 10.5, 0);
  const ht = grassInBand(h.terrain, h.W, h.H, 10.5, 10.5, 16, 24);
  must(!!ht, "پست دور هست");
  sol.homeX = ht[0] + 0.5; sol.homeR = ht[1] + 0.5;
  const d0 = Math.hypot(sol.x - sol.homeX, sol.r - sol.homeR);
  simC(h.state, h.terrain, 30);
  must(Math.hypot(sol.x - sol.homeX, sol.r - sol.homeR) < d0 - 4, "بی‌هدفِ دور از پست برمی‌گردد");
  // ۴. زنجیره: پس از اولی، دومی هم زده می‌شود.
  const k = fresh();
  const kg = grassNear(k.terrain, k.state.occ, k.W, k.H, 14, 14);
  const ch = spawnUnit(k.state, "soldier", kg[0] + 0.5, kg[1] + 0.5, 0);
  const c1 = grassInBand(k.terrain, k.W, k.H, ch.homeX, ch.homeR, 4, 6);
  const c2 = grassInBand(k.terrain, k.W, k.H, ch.homeX, ch.homeR, 5, 7.5);
  must(!!c1 && !!c2, "دو جای نزدیک هست");
  const fa1 = spawnUnit(k.state, "archer", c1[0] + 0.5, c1[1] + 0.5);
  const fa2 = spawnUnit(k.state, "archer", c2[0] + 0.5, c2[1] + 0.5);
  setStance(fa1, "hold"); setStance(fa2, "hold");
  simC(k.state, k.terrain, 250);
  must(fa1.hp < 30 && fa2.hp < 30, "هر دو مزاحم در زنجیره خورده‌اند");
  // ۵. شکار زنده: ضربه مستقیم بالیستا (برد ۹) به کماندارِ بی‌هدف از ۸٫۵
  // (بیرون دید ۸) = شکار ضارب؛ از درون دید = بی‌واکنش.
  const r = fresh();
  const bg = grassNear(r.terrain, r.state.occ, r.W, r.H, 20, 20);
  const bal = spawnUnit(r.state, "ballista", bg[0] + 0.5, bg[1] + 0.5, 0);
  bal.deployed = true; bal.cooldown = 0;
  const vTile = grassInBand(r.terrain, r.W, r.H, bal.x, bal.r, 8, 9);
  must(!!vTile, "جای بیرون‌دید ولی درون‌برد هست");
  const vic = spawnUnit(r.state, "bowman", vTile[0] + 0.5, vTile[1] + 0.5, 0);
  const vd = Math.hypot(vic.x - bal.x, vic.r - bal.r);
  must(vd > 8 && vd <= 9, "قربانی بیرون دید و درون برد است");
  fightTarget(r.state, r.terrain, r.W, r.H, bal, UNITS.ballista, { kind: "unit", u: vic });
  must(vic.hp < 40, "ضربه بالیستا خورده است");
  must(vic.huntId === bal.id && vic.targetKind === "unit" && vic.targetId === bal.id, "تیرِ از بیرون دید = شکار ضارب");
  bal.cooldown = 0;
  const vTile2 = grassInBand(r.terrain, r.W, r.H, bal.x, bal.r, 5, 7);
  must(!!vTile2, "جای درون‌دید هست");
  const vic2 = spawnUnit(r.state, "bowman", vTile2[0] + 0.5, vTile2[1] + 0.5, 0);
  fightTarget(r.state, r.terrain, r.W, r.H, bal, UNITS.ballista, { kind: "unit", u: vic2 });
  must(vic2.huntId == null && vic2.targetKind == null, "تیرِ از درون دید شکار نمی‌سازد");
  // ۶. سرکوب: قربانیِ درگیرِ هدف زنده، تیر تازه را نادیده می‌گیرد.
  bal.cooldown = 0;
  const live = spawnUnit(r.state, "swordsman", vTile2[0] + 0.5, vTile2[1] + 0.5);
  setStance(live, "hold");
  vic2.targetKind = "unit"; vic2.targetId = live.id;
  fightTarget(r.state, r.terrain, r.W, r.H, bal, UNITS.ballista, { kind: "unit", u: vic2 });
  must(vic2.huntId == null && vic2.targetId === live.id, "درگیریِ فعال بر تیر تازه مقدم است");
  // ۷. قلاب خالص: حالت‌های رد و پذیرش.
  const p = fresh();
  const pv = spawnUnit(p.state, "soldier", 10.5, 10.5, 0);
  const ps = spawnUnit(p.state, "archer", 21.5, 10.5);
  must(provokeRetaliation(p.state, null, { kind: "unit", u: ps }) === false, "قربانی تهی رد می‌شود");
  pv.dead = true;
  must(provokeRetaliation(p.state, pv, { kind: "unit", u: ps }) === false, "قربانی مرده رد می‌شود");
  pv.dead = false;
  setStance(pv, "hold");
  must(provokeRetaliation(p.state, pv, { kind: "unit", u: ps }) === false, "غیرتهاجمی رد می‌شود");
  setStance(pv, "engage");
  const pm = spawnUnit(p.state, "soldier", 12.5, 10.5);
  must(provokeRetaliation(p.state, pv, { kind: "unit", u: pm }) === false, "ضارب تن‌به‌تن رد می‌شود");
  must(provokeRetaliation(p.state, pv, { kind: "unit", u: ps }) === true, "تیرِ از بیرون دید (۱۱>۱۰) شکار می‌شود");
  must(pv.huntId === ps.id && pv.targetId === ps.id, "شکار و هدف ثبت می‌شود");
  pv.targetKind = null; pv.targetId = null; pv.huntId = null;
  ps.x = 19.5;
  must(provokeRetaliation(p.state, pv, { kind: "unit", u: ps }) === false, "تیرِ از درون دید (۹<۱۰) رد می‌شود");
  must(pv.huntId == null, "شکاری ثبت نمی‌شود");
  const dead = spawnUnit(p.state, "archer", 30.5, 10.5); dead.dead = true;
  must(provokeRetaliation(p.state, pv, { kind: "unit", u: dead }) === false, "ضارب مرده رد می‌شود");
  const cat = spawnUnit(p.state, "catapult", 30.5, 12.5, 0);
  cat.x = 25.5;
  must(provokeRetaliation(p.state, cat, { kind: "unit", u: ps }) === false, "قربانی محاصره شکار نمی‌کند");
  const heal = spawnUnit(p.state, "healer", 11.5, 11.5, 0);
  must(provokeRetaliation(p.state, heal, { kind: "unit", u: ps }) === false, "قربانی بی‌برد شکار نمی‌کند");
  p.state.rules = { noRush: true }; p.state.peaceUntil = 99999; p.state.tick = 0;
  must(provokeRetaliation(p.state, pv, { kind: "unit", u: ps }) === false, "در صلح واکنشی نیست");
  p.state.rules = null;
  pv.targetKind = "unit"; pv.targetId = pm.id;
  must(provokeRetaliation(p.state, pv, { kind: "unit", u: ps }) === false, "هدف زنده مانع شکار تازه است");
  pv.targetKind = null; pv.targetId = null; pm.dead = true;
  // ۸. برج ویران = رد؛ برج سالم = شکار.
  const q = fresh();
  const qv = spawnUnit(q.state, "soldier", 10.5, 10.5, 0);
  const tw = { id: 424242, destroyed: true };
  must(provokeRetaliation(q.state, qv, { kind: "bld", b: tw }) === false, "برج ویران رد می‌شود");
  // ۹. ذخیره و هش شکار.
  const s = fresh();
  const su = spawnUnit(s.state, "soldier", 10.5, 10.5, 0);
  const suFoe = spawnUnit(s.state, "swordsman", 14.5, 10.5); // هدف زنده واقعی تا پاک‌سازی load نگهش دارد
  su.huntId = suFoe.id; su.targetKind = "unit"; su.targetId = suFoe.id; // شکار زنده واقعی
  const sh0 = stateHash(s.state);
  const sloaded = deserializeJSON(serializeJSON(s.state));
  must(sloaded.units[0].huntId === suFoe.id, "شکار در ذخیره می‌ماند");
  must(stateHash(sloaded) === sh0, "هش پس از load برابر است");
  const sold = JSON.parse(serializeJSON(s.state));
  delete sold.units[0].huntId;
  must(deserialize(sold).units[0].huntId == null, "قدیمی بی‌شکار یعنی نیست");
  const sbad = JSON.parse(serializeJSON(s.state));
  sbad.units[0].huntId = "x";
  let threw = false;
  try { deserialize(sbad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "شکار خراب باید SaveError بدهد");
  const sa = fresh(); const ua = spawnUnit(sa.state, "soldier", 10.5, 10.5, 0);
  const sb = fresh(); const ub = spawnUnit(sb.state, "soldier", 10.5, 10.5, 0);
  must(stateHash(sa.state) === stateHash(sb.state), "بی‌شکار هش یکسان دارد");
  ua.huntId = 5;
  must(stateHash(sa.state) !== stateHash(sb.state), "شکار هش را عوض می‌کند");
  // ۱۰. موضع/فرمان تازه شکار را پاک می‌کند.
  su.huntId = 9;
  setStance(su, "hold");
  must(su.huntId == null, "موضع تازه شکار را پاک می‌کند");
  su.huntId = 9;
  orderMove(s.state, su, 12, 12);
  must(su.huntId == null, "فرمان تازه شکار را پاک می‌کند");
  must(t("game.stance.engage").length > 0, "نام تهاجمی هست");
  return { name: "موضع تهاجمی", pass: true, detail: "پست + افسار + بازگشت + زنجیره + شکار + ذخیره" };
}

// ستاد سنگی (0.154.0 — §8.1/بند 405): ردیف دوم جدول (۲۰ سنگ) = گام بعدی
// ستاد: یکتا، مسکن ۱۰ (انباشت با ستاد: ۸+۱۰)، ستادبه‌حساب‌آمدن برای قفل پالت.
function t_stonekeep() {
  const def = CONFIG.BUILDINGS.stonekeep;
  must(!!def, "ستاد سنگی در کاتالوگ هست");
  must(def.cost && def.cost.stone === 20, "هزینه دقیق ۲۰ سنگ (مرجع)");
  must(def.rules && def.rules.unique === true, "یکتاست");
  must(def.category === "castle" && def.w === 4 && def.h === 4, "قلعه ۴×۴");
  must(def.hp === 800 && def.buildTime === 150, "جان/زمان ساخت");
  must(STONEKEEP_HOUSING === 10, "مسکن ستاد سنگی ۱۰");
  must(KEEP_HOUSING === 8, "مسکن ستاد ۸ می‌ماند");
  const f = fresh();
  f.state.resources.stone = 100;
  must(keepLocked(f.state, 0), "بی‌ستاد قفل است");
  const site = siteNear(f.terrain, f.state.occ, f.W, f.H, 20, 20, 4, 4);
  must(!!site, "جای ۴×۴ هست");
  const r = tryPlace(f.state, f.terrain, f.W, f.H, site[0], site[1], def, 0);
  must(r.ok, "ستاد سنگی ساخته می‌شود");
  completeAll(f.state); // پایان ساخت‌تدریجی تا مسکن حساب شود (الگوی 0.39.0)
  must(housingCap(f.state, 0) === BASE_HOUSING + 10, "مسکن = پایه + ۱۰");
  must(!keepLocked(f.state, 0), "ستاد سنگی قفل پالت را باز می‌کند");
  const site2 = siteNear(f.terrain, f.state.occ, f.W, f.H, 40, 40, 4, 4);
  must(!!site2, "جای دوم ۴×۴ هست");
  const r2 = tryPlace(f.state, f.terrain, f.W, f.H, site2[0], site2[1], def, 0);
  must(!r2.ok && r2.reason === "UNIQUE", "دومی یکتایی رد می‌شود");
  placeKeep(f.state, f.terrain, f.W, f.H);
  must(housingCap(f.state, 0) === BASE_HOUSING + 8 + 10, "ستاد + ستاد سنگی = ۸+۱۰ انباشته");
  const loaded = deserializeJSON(serializeJSON(f.state));
  must(loaded.buildings.some((b) => b.type === "stonekeep" && !b.destroyed), "ستاد سنگی در ذخیره می‌ماند");
  must(t("game.building.stonekeep.name").length > 0, "نام فارسی هست");
  withLang("en", () => {
    must(t("game.building.stonekeep.name") === "Stone Citadel", "نام en");
  });
  return { name: "ستاد سنگی", pass: true, detail: "کاتالوگ + مسکن + یکتا + ذخیره" };
}

// کلیدهای سرعت بازی (0.154.0 — §17/بند 818: +/− نامپد): دو کنش قابل‌تغییر
// با پیش‌فرض NumpadAdd/NumpadSubtract + پله خالص با توقف در مرز.
function t_speed_hotkeys() {
  must(KEY_ACTIONS.includes("speedUp") && KEY_ACTIONS.includes("speedDown"), "دو کنش سرعت هست");
  must(DEFAULT_KEYS.speedUp === "NumpadAdd" && DEFAULT_KEYS.speedDown === "NumpadSubtract", "پیش‌فرض نامپد");
  must(validKeyCode("NumpadAdd") && validKeyCode("NumpadSubtract"), "کدهای نامپد معتبرند");
  const d = normalizeKeys({});
  must(d.speedUp === "NumpadAdd" && d.speedDown === "NumpadSubtract", "پیش‌فرض‌ها در نرمال‌سازی می‌مانند");
  const c = normalizeKeys({ speedUp: "KeyU", speedDown: "nope!!" });
  must(c.speedUp === "KeyU" && c.speedDown === "NumpadSubtract", "معتبر می‌ماند، نامعتبر به پیش‌فرض برمی‌گردد");
  must(KEY_ACTION_FA.speedUp && KEY_ACTION_FA.speedDown, "نام نمایشی کنش‌ها هست");
  const S = [1, 2, 4];
  must(cycleSpeed(S, 1, 1) === 2 && cycleSpeed(S, 2, 1) === 4, "پله بالا");
  must(cycleSpeed(S, 4, 1) === 4, "سقف می‌ماند (بی‌چرخش)");
  must(cycleSpeed(S, 4, -1) === 2 && cycleSpeed(S, 2, -1) === 1, "پله پایین");
  must(cycleSpeed(S, 1, -1) === 1, "کف می‌ماند");
  must(cycleSpeed(S, 9, 1) === 1 && cycleSpeed(S, 9, -1) === 4, "سرعت ناشناس به نزدیک‌ترین مرز می‌رود");
  must(cycleSpeed([], 2, 1) === 2, "فهرست خالی = بی‌تغییر");
  must(t("system.a11y.key.speedUp").length > 0 && t("system.a11y.key.speedDown").length > 0, "نام فارسی هست");
  withLang("en", () => {
    must(t("system.a11y.key.speedUp") === "Faster (game speed)", "نام en تندتر");
    must(t("system.a11y.key.speedDown") === "Slower (game speed)", "نام en کندتر");
  });
  return { name: "کلیدهای سرعت بازی", pass: true, detail: "پیش‌فرض + نرمال‌سازی + پله" };
}

// واحه و مزارع نزدیک آن (0.154.0 — §1.2/بند 107): زمین واحه متقارنِ سیدساز
// + مزارع فقط روی چمنِ در شعاع ۸ (آسیاب/نانوایی و بقیه معاف؛ عبور آزاد).
function t_oasis() {
  must(T_OASIS === 3 && OASIS_FARM_RADIUS === 8, "ثابت‌های واحه");
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const p1 = terrainPins(W, H, CONFIG.MAP_SEED), p2 = terrainPins(W, H, CONFIG.MAP_SEED);
  must([3, 4, 6].includes(p1.oasis[0]) && p1.oasis[1] === 10, "مرکز واحه زیر محوطه شروع است (۳/۴/۶، ۱۰)");
  must(p1.oasis[0] === p2.oasis[0] && p1.oasis[1] === p2.oasis[1], "پین واحه قطعی است");
  const { terrain } = fresh();
  let n = 0;
  for (let k = 0; k < W * H; k++) if (terrain[k] === T_OASIS) n++;
  must(n >= 16, `واحه‌ها هستند (۴ ربع × ~۵ خانه): ${n}`);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (terrain[r * W + c] !== T_OASIS) continue;
      must(terrain[r * W + (W - 1 - c)] === T_OASIS && terrain[(H - 1 - r) * W + c] === T_OASIS, "تقارن چهارطرفه واحه");
    }
  }
  // مزرعه نزدیک واحه قبول، دور رد؛ غیرمزرعه دور قبول.
  const f = fresh();
  must(validate(f.state, f.terrain, f.W, f.H, 1, 1, CONFIG.BUILDINGS.wheatfarm).ok, "مزرعه گندم گوشه نزدیک واحه است");
  must(validate(f.state, f.terrain, f.W, f.H, 5, 1, CONFIG.BUILDINGS.hopsfarm).ok, "مزرعه رازک نزدیک واحه است");
  let far = null;
  for (let r = 20; r + 2 <= 50 && !far; r++) {
    for (let c = 20; c + 3 <= 50 && !far; c++) {
      let grass = true;
      for (let j = 0; j < 2 && grass; j++) for (let i = 0; i < 3 && grass; i++) {
        if (f.terrain[(r + j) * f.W + (c + i)] !== T_GRASS || f.state.occ[(r + j) * f.W + (c + i)] === 1) grass = false;
      }
      if (grass && !nearOasis(f.terrain, f.W, f.H, c, r, 3, 2, OASIS_FARM_RADIUS)) far = [c, r];
    }
  }
  must(!!far, "جای چمنِ دور از واحه هست");
  const v = validate(f.state, f.terrain, f.W, f.H, far[0], far[1], CONFIG.BUILDINGS.farm);
  must(!v.ok && v.reason === REASONS.NO_OASIS && v.reason === "NO_OASIS", "مزرعه دور رد می‌شود");
  must(validate(f.state, f.terrain, f.W, f.H, far[0], far[1], CONFIG.BUILDINGS.woodcutter).ok, "غیرمزرعه دور قبول می‌شود");
  must(!tryPlace(f.state, f.terrain, f.W, f.H, far[0], far[1], CONFIG.BUILDINGS.orchard).ok, "باغ دور ساخته نمی‌شود");
  // ردپا روی خود واحه = زمین نامناسب (نه NO_OASIS).
  let oc = -1;
  for (let k = 0; k < f.W * f.H; k++) if (f.terrain[k] === T_OASIS) { oc = k; break; }
  must(oc >= 0, "خانه واحه هست");
  const orr = Math.floor(oc / f.W), occ2 = oc % f.W;
  const v2 = validate(f.state, f.terrain, f.W, f.H, occ2, orr, CONFIG.BUILDINGS.farm);
  must(!v2.ok && v2.reason === "TERRAIN", "ردپا روی واحه زمین نامناسب است");
  // خالص nearOasis روی زمین مصنوعی (لبه شعاع).
  const synth = new Uint8Array(20 * 20); synth[10 * 20 + 10] = T_OASIS;
  must(nearOasis(synth, 20, 20, 1, 1, 3, 2, 8) === true, "فاصله ۸ قبول است");
  must(nearOasis(synth, 20, 20, 0, 0, 3, 2, 8) === false, "فاصله ۹ رد می‌شود");
  must(nearOasis(synth, 20, 20, 1, 1, 3, 2, 2) === false, "شعاع کوچک‌تر رد می‌کند");
  // عبور: واحه walkable است، آب نیست.
  const occ0 = new Uint8Array(f.W * f.H);
  must(isCellWalkable(f.terrain, occ0, f.W, f.H, occ2, orr) === true, "واحه قابل‌عبور است");
  const lake = terrainPins(f.W, f.H, CONFIG.MAP_SEED).lake;
  must(isCellWalkable(f.terrain, occ0, f.W, f.H, lake[0], lake[1]) === false, "آب قابل‌عبور نیست (شاهد)");
  // هموارسازی MP واحه‌ها را پاک نمی‌کند.
  const mf = fresh();
  mpClearSpawns(mf.terrain, mf.W, mf.H);
  let mn = 0;
  for (let k = 0; k < mf.W * mf.H; k++) if (mf.terrain[k] === T_OASIS) mn++;
  must(mn >= 16, "واحه‌ها پس از هموارسازی MP می‌مانند");
  // ویرایشگر: قلم واحه + گردش سند.
  const doc = createMapDoc("t", CONFIG.MAP_SEED);
  const pr = paintCells(doc, f.terrain, far[0], far[1], 1, T_OASIS); // وصله واقعی روی چمن دور
  must(pr.painted === 1, "نقاشی واحه یک وصله می‌سازد");
  const rt = importMapDoc(exportMapDoc(doc));
  must(rt.ok && validateMapDoc(rt.doc).ok, "گردش سند با وصله واحه معتبر است");
  const bad = JSON.parse(exportMapDoc(doc));
  bad.patches = [[0, 9]];
  must(!validateMapDoc(bad).ok, "تایل ۹ همچنان رد می‌شود");
  must(t("game.reason.NO_OASIS").length > 0, "دلیل فارسی هست");
  must(t("system.map.tile.oasis").length > 0, "نام فارسی تایل هست");
  withLang("en", () => {
    must(t("game.reason.NO_OASIS").indexOf("oasis") >= 0, "دلیل en");
    must(t("system.map.tile.oasis") === "Oasis", "نام en تایل");
  });
  return { name: "واحه و مزارع", pass: true, detail: "زمین + شعاع ۸ + عبور + ویرایشگر" };
}
export { aggroCases };
