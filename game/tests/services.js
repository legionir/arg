// خدمات شهری 0.146.0 (0.261.0 — C-CLN-79): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import { patrolCases } from "./patrol.js";
import { roadsCases } from "./roads.js";import { hireCases } from "./hire.js";import { guildsCases } from "./guilds.js";import { stableCases } from "./stable.js";import { troopsCases } from "./troops.js";
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";

// --- 0.146.0: عطاری+شفادهنده (§۸.۵/بند ۱۴۲)، undo (§۳.۱)، کاتب (§۳.۲)، تابلوی راهنما (§۳.۴) ---
function servicesCases() {
  return [t_apothecary_healer, t_undo, t_scribe, t_signpost];
}

function t_apothecary_healer() {
  // کاتالوگ.
  const ad = CONFIG.BUILDINGS.apothecary;
  must(ad && ad.w === 2 && ad.h === 2 && ad.category === "town", "عطاری ۲×۲ town");
  must(ad.cost && ad.cost.wood === 20 && ad.cost.gold === 150, "هزینه عطاری ۲۰ چوب + ۱۵۰ طلا");
  must(ad.hp === 80 && ad.buildTime === 60, "جان/زمان عطاری ۸۰/۶۰");
  const hd = UNITS.healer;
  must(hd && hd.side === "player" && hd.hp === 30, "شفادهنده خودی با ۳۰ جان");
  must(hd.dmg === 0 && hd.range === 0 && hd.aggro === 0 && hd.noHire === true, "شفادهنده هرگز نمی‌جنگد + noHire");
  must(hd.building === "apothecary" && !hd.cost && !hd.trainTicks, "از عطاری، بدون cost/trainTicks");
  must(workersNeeded({ type: "apothecary" }) === 1, "عطاری ۱ کارگر می‌خواهد");
  withLang("en", () => {
    must(CONFIG.BUILDINGS.apothecary.name === "Apothecary", "نام en عطاری");
    must(UNITS.healer.name === "Healer", "نام en شفادهنده");
  });
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 500;
  const site = siteNear(terrain, state.occ, W, H, 10, 10, 2, 2);
  must(site, "جای عطاری");
  const p = tryPlace(state, terrain, W, H, site[0], site[1], CONFIG.BUILDINGS.apothecary);
  must(p.ok, "عطاری باید قرار گیرد");
  completeAll(state);
  assignStaff(state);
  const AB = p.building;
  must(AB.staffed !== false, "عطاری باید کارگر داشته باشد");
  must(healthyApoth(state, 0) === 1, "۱ عطاری سالم");
  must(healthyApoth(state, 1) === 0, "مالک دیگر صفر");
  // spawn: ۱ شفادهنده با homeBld + سقف.
  stepHealers(state, terrain);
  let healers = state.units.filter((u) => !u.dead && u.type === "healer");
  must(healers.length === 1, `باید ۱ شفادهنده باشد، هست ${healers.length}`);
  must(healers[0].homeBld === AB.id, "homeBld باید عطاری باشد");
  stepHealers(state, terrain);
  must(state.units.filter((u) => !u.dead && u.type === "healer").length === 1, "سقف ۱ شفادهنده");
  // جست‌وجو: ابر دور → فاصله کم می‌شود.
  state.clouds = [{ c: 40, r: 40, left: 300 }];
  const d0 = Math.hypot(40.5 - healers[0].x, 40.5 - healers[0].r);
  for (let i = 0; i < 30; i++) stepHealers(state, terrain);
  const d1 = Math.hypot(40.5 - healers[0].x, 40.5 - healers[0].r);
  must(d1 < d0, `شفادهنده باید نزدیک شود ${d0}←${d1}`);
  // پراکنده‌کردن: نزدیک ابر → left با healDrain کم می‌شود.
  healers[0].x = 40.5; healers[0].r = 40.5;
  state.clouds = [{ c: 40, r: 40, left: 300 }];
  stepHealers(state, terrain);
  must(state.clouds[0].left === 300 - TUNING.disease.healDrain, "پراکنده باید healDrain کم کند");
  // کاهش آسیب: با عطاری سالم، یگان خودی در ابر آسیب نمی‌بیند.
  const bow = spawnUnit(state, "bowman", 40.5, 40.5, 0);
  const hp0 = bow.hp;
  for (let i = 0; i < 12; i++) stepClouds(state);
  must(bow.hp === hp0, "با عطاری، ابر نباید بزند");
  // یگان دشمن (side دشمن) بیرون حمایت است.
  const enemyKey = Object.keys(UNITS).find((k) => UNITS[k].side === "enemy");
  must(enemyKey, "باید یگان دشمن در کاتالوگ باشد");
  state.clouds = [{ c: 40, r: 40, left: 300 }];
  const foe = spawnUnit(state, enemyKey, 40.5, 40.5, 0);
  const hf = foe.hp;
  for (let i = 0; i < 6; i++) stepClouds(state);
  must(foe.hp === hf - 1, "یگان دشمن باید کامل بخورد");
  // ایزولاسیون مالک: یگان مالک دیگر کامل می‌خورد.
  state.clouds = [{ c: 40, r: 40, left: 300 }];
  const alien = spawnUnit(state, "bowman", 40.5, 40.5, 1);
  const ha = alien.hp;
  for (let i = 0; i < 6; i++) stepClouds(state);
  must(alien.hp === ha - 1, "یگان مالک دیگر باید کامل بخورد");
  // هرگز نمی‌جنگد: ۶۰ تیک نبرد، جان دشمن تکان نمی‌خورد.
  const f3 = fresh();
  const hh = spawnUnit(f3.state, "healer", 20.5, 20.5, 0);
  const en = spawnUnit(f3.state, enemyKey, 21.5, 20.5, 0);
  must(hh && en, "یگان‌ها");
  const he0 = en.hp;
  simC(f3.state, f3.terrain, 60);
  must(en.hp === he0, "شفادهنده هرگز نباید بزند");
  // استخدام‌ناپذیر.
  must(!hireUnit(f3.state, f3.terrain, f3.W, f3.H, 10, 10, "healer").ok, "شفادهنده استخدام‌شدنی نیست");
  // ذخیره: homeBld می‌ماند.
  const loaded = deserializeJSON(serializeJSON(state));
  const lh = loaded.units.find((u) => u.type === "healer" && !u.dead);
  must(lh && lh.homeBld === AB.id, "homeBld در ذخیره می‌ماند");
  return { name: "عطاری و شفادهنده", pass: true, detail: "کاتالوگ + spawn/سقف + جست‌وجو + پراکنده + کاهش آسیب + ایزولاسیون + بی‌جنگی + ذخیره" };
}

function t_undo() {
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد");
  const hutCost = CONFIG.BUILDINGS.hut.cost.wood;
  const spot = () => {
    for (let r = 1; r < H - 1; r++) {
      for (let c = 1; c < W - 1; c++) {
        if (validate(state, terrain, W, H, c, r, CONFIG.BUILDINGS.hut).ok) return { c, r };
      }
    }
    return null;
  };
  // بی‌pending → INVALID.
  must(applyCmd(state, terrain, { kind: "undo" }).reason === "INVALID", "بی‌ساخت INVALID");
  must(state.undo == null, "undo تهی می‌ماند");
  // ساخت موفق → pending + بازپرداخت کامل.
  const wood0 = state.resources.wood;
  const s1 = spot();
  must(s1, "جای کلبه");
  const p = applyCmd(state, terrain, { kind: "place", type: "hut", c: s1.c, r: s1.r });
  must(p.ok, "کلبه");
  must(state.undo && state.undo.bld === p.building.id && state.undo.owner === 0, "pending می‌نشیند");
  must(state.resources.wood === wood0 - hutCost, "هزینه کم شده");
  const u = applyCmd(state, terrain, { kind: "undo" });
  must(u.ok && u.reason === "OK", "undo موفق");
  must(state.resources.wood === wood0, `بازپرداخت کامل چوب ${state.resources.wood}≠${wood0}`);
  must(state.undo == null, "pending پاک می‌شود");
  must(!state.buildings.some((b) => b.id === p.building.id), "بنا رفته");
  // اشغال آزاد → بازساخت همان خانه‌ها.
  const p2 = applyCmd(state, terrain, { kind: "place", type: "hut", c: s1.c, r: s1.r });
  must(p2.ok, "بازساخت همان خانه‌ها");
  must(applyCmd(state, terrain, { kind: "undo" }).ok, "undo دوم (pending تازه)");
  must(applyCmd(state, terrain, { kind: "undo" }).reason === "INVALID", "تکراری INVALID");
  // تخریب‌شده → INVALID.
  const s3 = spot();
  must(s3, "جای کلبه دوم");
  const p3 = applyCmd(state, terrain, { kind: "place", type: "hut", c: s3.c, r: s3.r });
  must(p3.ok, "کلبه دوم");
  must(applyCmd(state, terrain, { kind: "demolish", bld: p3.building.id }).ok, "تخریب");
  must(applyCmd(state, terrain, { kind: "undo" }).reason === "INVALID", "ویرانه INVALID");
  // مالک دیگر → NOT_OWNED؛ خودی موفق.
  const s4 = spot();
  must(s4, "جای کلبه سوم");
  const p4 = applyCmd(state, terrain, { kind: "place", type: "hut", c: s4.c, r: s4.r });
  must(p4.ok, "کلبه سوم");
  must(applyCmd(state, terrain, { kind: "undo", owner: 1 }).reason === "NOT_OWNED", "بیگانه NOT_OWNED");
  must(state.undo && state.undo.bld === p4.building.id, "pending بیگانه پاک نمی‌شود");
  must(applyCmd(state, terrain, { kind: "undo" }).ok, "خودی موفق");
  // MP: undo خودیِ مالک ۱ با بازپرداخت به کیسه خودش.
  const m = fresh();
  enableMp(m.state, 2, ["A", "B"]);
  mpClearSpawns(m.terrain, m.W, m.H);
  const an = MP_SPAWN_ANCHOR[1];
  must(placeKeepFor(m.state, m.terrain, m.W, m.H, 1, an[0], an[1]).ok, "ستاد مالک ۱");
  const ms = siteNear(m.terrain, m.state.occ, m.W, m.H, an[0] + 5, an[1], 2, 2);
  must(ms, "جای کلبه MP");
  const w1 = m.state.mpres[1].resources.wood;
  const pm = applyCmd(m.state, m.terrain, { kind: "place", type: "hut", c: ms[0], r: ms[1], owner: 1 });
  must(pm.ok, "ساخت MP: " + pm.reason);
  must(applyCmd(m.state, m.terrain, { kind: "undo", owner: 1 }).ok, "undo خودی MP");
  must(m.state.mpres[1].resources.wood === w1, "بازپرداخت به کیسه مالک ۱");
  // ذخیره: pending می‌ماند؛ قدیمی بدون undo → null؛ خراب رد می‌شود.
  const s5 = spot();
  must(s5, "جای کلبه چهارم");
  const p5 = applyCmd(state, terrain, { kind: "place", type: "hut", c: s5.c, r: s5.r });
  must(p5.ok, "کلبه چهارم");
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.undo && loaded.undo.bld === p5.building.id, "pending در ذخیره می‌ماند");
  const bare = JSON.parse(serializeJSON(state));
  delete bare.undo;
  must(deserialize(bare).undo == null, "قدیمی بدون undo → null");
  const bad = JSON.parse(serializeJSON(state));
  bad.undo = { bld: "x" };
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "undo خراب رد می‌شود");
  return { name: "برگرداندن آخرین ساخت", pass: true, detail: "بازپرداخت کامل + اشغال + INVALID/NOT_OWNED + MP + ذخیره" };
}

function t_scribe() {
  // باندهای حال‌وحوصله.
  must(scribeMood(100) === "glad" && scribeMood(75) === "glad", "۷۵+ خوشحال");
  must(scribeMood(74) === "content" && scribeMood(50) === "content", "۵۰–۷۴ راضی");
  must(scribeMood(49) === "grim" && scribeMood(0) === "grim", "زیر ۵۰ گرفته");
  must(t("main.scribe.mood.glad").length > 0 && t("main.scribe.mood.grim").length > 0, "نام‌های فارسی");
  withLang("en", () => {
    must(t("main.scribe.mood.glad") === "Glad 🙂", "نام en خوشحال");
  });
  // ۶ بخش از infoهای موجود + ۲ بخش 0.147.0 (محبوبیت/خزانه، §۳.۳) + خلوص.
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد");
  state.tax = "high";
  state.rations = "double";
  const h1 = stateHash(state);
  const secs = scribeReports(state, 0);
  must(stateHash(state) === h1, "گزارش نباید state را لمس کند");
  must(Array.isArray(secs) && secs.length === 8, `باید ۸ بخش باشد، هست ${secs.length}`);
  must(JSON.stringify(secs.map((s) => s.key)) === '["tax","rations","stores","inn","religion","fear","popularity","treasury"]', "ترتیب بخش‌ها");
  const tax = secs[0];
  must(tax.rows[0].value === taxInfo("high").name, "سطح مالیات از info می‌آید");
  must(tax.rows[0].label === "main.scribe.level", "لیبل از i18n می‌آید");
  must(typeof t(tax.rows[0].label) === "string" && t(tax.rows[0].label).length > 0, "لیبل فارسی حل می‌شود");
  const rat = secs[1];
  must(rat.rows[0].value === rationInfo("double").name, "سطح جیره از info می‌آید");
  const stores = secs[2];
  must(stores.rows[0].value === foodInfo(state, 0).stock, "موجودی از foodInfo می‌آید");
  const inn = secs[3];
  must(inn.rows[0].value === `${innInfo(state, 0).working}/${innInfo(state, 0).total}`, "میخانه از innInfo می‌آید");
  const fear = secs[5];
  must(fear.rows[0].value === fearInfo(state, 0).level, "ترس از fearInfo می‌آید");
  // ۲ بخش 0.147.0 (§۳.۳): محبوبیت فعلی/هدف + خزانه موجودی/درآمد.
  const pop = secs[6];
  must(pop.rows[0].label === "main.scribe.now" && pop.rows[0].value === state.popularity, "محبوبیت فعلی از econ می‌آید");
  must(pop.rows[1].label === "main.scribe.target" && pop.rows[1].value === popTarget(state, 0), "هدف از popTarget می‌آید");
  const tre = secs[7];
  must(tre.rows[0].label === "main.scribe.balance" && tre.rows[0].value === treasuryInfo(state, 0).balance, "موجودی از treasuryInfo می‌آید");
  must(tre.rows[1].label === "main.scribe.perMin" && tre.rows[1].value === Math.round(treasuryInfo(state, 0).perMin * 10) / 10, "درآمد از treasuryInfo می‌آید");
  must(tre.rows[0].value === state.resources.gold, "موجودی خزانه همان طلای کیسه است");
  must(typeof t("main.scribe.sec.popularity") === "string" && t("main.scribe.sec.popularity").length > 0, "عنوان محبوبیت حل می‌شود");
  must(typeof t("main.scribe.sec.treasury") === "string" && t("main.scribe.sec.treasury").length > 0, "عنوان خزانه حل می‌شود");
  withLang("en", () => {
    must(t("main.scribe.sec.popularity") === "Popularity" && t("main.scribe.sec.treasury") === "Treasury", "عنوان‌های en");
    must(t("main.scribe.now") === "Now" && t("main.scribe.target") === "Target" && t("main.scribe.balance") === "Gold", "لیبل‌های en");
  });
  // MP: گزارش بازیکن ۱ از mpres خودش می‌آید.
  const f2 = fresh();
  enableMp(f2.state, 2, ["A", "B"]);
  f2.state.mpres[1].popularity = 80;
  f2.state.mpres[1].resources.gold = 123;
  const mpSecs = scribeReports(f2.state, 1);
  must(mpSecs.length === 8, "در MP هم ۸ بخش است");
  must(mpSecs[6].rows[0].value === 80, "محبوبیت MP از mpres بازیکن می‌آید");
  must(mpSecs[7].rows[0].value === 123, "موجودی MP از کیسه بازیکن می‌آید");
  return { name: "چهره و گزارش کاتب", pass: true, detail: "۳ باند + ۸ بخش + خلوص + MP" };
}

function t_signpost() {
  // کاتالوگ.
  const sd = CONFIG.BUILDINGS.signpost;
  must(sd && sd.w === 1 && sd.h === 1 && sd.category === "town", "تابلوی ۱×۱ town");
  must(sd.cost && sd.cost.wood === 5, "هزینه تابلو ۵ چوب");
  must(sd.hp === 40 && sd.buildTime === 30, "جان/زمان تابلو ۴۰/۳۰");
  withLang("en", () => {
    must(CONFIG.BUILDINGS.signpost.name === "Signpost", "نام en تابلو");
  });
  const { W, H, terrain, state } = fresh();
  const site = siteNear(terrain, state.occ, W, H, 20, 20, 1, 1);
  must(site, "جای تابلو");
  must(tryPlace(state, terrain, W, H, site[0], site[1], CONFIG.BUILDINGS.signpost).ok, "تابلو باید قرار گیرد");
  // چهار نقطه میانی لبه‌ها.
  const pts = signEdge(W, H);
  must(pts.length === 4, "۴ نقطه");
  must(pts[0].c === W / 2 && pts[0].r === 0, "شمال");
  must(pts[1].c === W / 2 && pts[1].r === H - 1, "جنوب");
  must(pts[2].c === 0 && pts[2].r === H / 2, "غرب");
  must(pts[3].c === W - 1 && pts[3].r === H / 2, "شرق");
  // نزدیک‌ترین لبه + خلوص.
  must(JSON.stringify(signDir({ c: 1, r: 1, w: 1, h: 1 }, W, H)) === '{"dx":0,"dr":-1}', "گوشه شمال‌غرب → شمال");
  must(JSON.stringify(signDir({ c: W - 2, r: 30, w: 1, h: 1 }, W, H)) === '{"dx":1,"dr":0}', "کنار شرق → شرق");
  const bb = { c: 30, r: 30, w: 2, h: 2 };
  must(JSON.stringify(signDir(bb, W, H)) === JSON.stringify(signDir(bb, W, H)), "قطعی");
  must(JSON.stringify(signDir(bb, W, H)) === JSON.stringify(signDir({ c: 30, r: 30, w: 2, h: 2 }, W, H)), "خالص");
  // ثبت کلید.
  must(KEY_ACTIONS.includes("sign"), "کنش sign ثبت است");
  must(DEFAULT_KEYS.sign === "KeyS", "پیش‌فرض S است");
  must(KEY_ACTION_FA.sign === t("system.a11y.key.sign"), "نام فارسی از i18n می‌آید");
  must(JSON.stringify(Object.keys(normalizeKeys(null)).sort()) === JSON.stringify(KEY_ACTIONS.slice().sort()), "کلید تهی = پیش‌فرض کامل");
  return { name: "تابلوی راهنما و کلید S", pass: true, detail: "کاتالوگ + ۴ لبه + جهت + ثبت کلید" };
}
export { servicesCases };
