// استحکامات (0.253.0 — C-CLN-56): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
// --- 0.155.0: برج‌های تازه (§8.1/بندهای 123-125) + دیوارهای تازه (§11.2/بندهای 265-266) + تعمیر (§18.3/بند 210) + گودال (§11.5/بند 273) ---
function fortCases() {
  return [t_towers, t_walls, t_lowwall_row111, t_repair, t_killpit];
}
// برج‌های تازه (0.155.0 — §8.1/بندهای 123-125): دیده‌بانی/پیرامونی/دفاعی با
// هزینه مرجع (۱۰/۱۰/۱۵ سنگ) + سقف داده‌محور ۵/۸/۱۲ (۵ مرجع ✅، ۸/۱۲ حدس) +
// برد ۹/۷/۸ + استقرار/شلیک/ذخیره چندبرجی (برج همان ۴ می‌ماند).
function t_towers() {
  const lo = CONFIG.BUILDINGS.lookout, pe = CONFIG.BUILDINGS.perimeter, de = CONFIG.BUILDINGS.defence;
  must(!!lo && !!pe && !!de, "هر ۳ برج در کاتالوگ‌اند");
  must(lo.cost && lo.cost.stone === 10 && pe.cost.stone === 10 && de.cost.stone === 15, "هزینه مرجع ۱۰/۱۰/۱۵ سنگ");
  must(lo.hp === 150 && pe.hp === 300 && de.hp === 450, "جان ۱۵۰/۳۰۰/۴۵۰");
  must(lo.w === 2 && lo.h === 2 && pe.w === 2 && pe.h === 2 && de.w === 3 && de.h === 3, "ابعاد ۲×۲/۲×۲/۳×۳");
  must(lo.weapon && lo.weapon.range === 9 && pe.weapon.range === 7 && de.weapon.range === 8, "برد ۹/۷/۸ (بلندترین = دیده‌بانی)");
  must(lo.weapon.source && pe.weapon.source && de.weapon.source, "منشأ سلاح‌ها هست");
  must(lo.garrisonCap === 5 && pe.garrisonCap === 8 && de.garrisonCap === 12, "سقف ۵/۸/۱۲");
  must(CONFIG.BUILDINGS.tower.garrisonCap === 4, "سقف برج همان ۴ می‌ماند");
  must(lo.fortified === true && pe.fortified === true && de.fortified === true, "هر ۳ مستحکم‌اند");
  must(isGarrisonPost("tower") && isGarrisonPost("lookout") && isGarrisonPost("perimeter") && isGarrisonPost("defence"), "هر ۴ پاسگاه‌اند");
  must(!isGarrisonPost("wall") && !isGarrisonPost("killpit") && !isGarrisonPost("hut"), "دیوار/گودال/کلبه پاسگاه نیستند");
  must(garrisonCapFor("tower") === 4 && garrisonCapFor("lookout") === 5 && garrisonCapFor("wall") === 4, "سقف داده‌محور + پیش‌فرض ۴");
  must(GARRISON_POSTS.length === 6, "۶ پاسگاه ثبت‌اند");
  // ساخت هر ۳ + سقف دیده‌بانی (۵ قبول، ۶ رد) + سقف برج (۴ قبول، ۵ رد).
  const f = fresh();
  f.state.resources.stone = 500; f.state.resources.wood = 500; f.state.resources.gold = 500;
  f.state.resources.food = 500;
  needBarracks(f.state, f.terrain, f.W, f.H);
  const s1 = siteNear(f.terrain, f.state.occ, f.W, f.H, 10, 10, 2, 2);
  must(!!s1, "جای ۲×۲ هست");
  const p1 = tryPlace(f.state, f.terrain, f.W, f.H, s1[0], s1[1], lo);
  must(p1.ok, `دیده‌بانی ساخته می‌شود، شد ${p1.reason}`);
  const s2 = siteNear(f.terrain, f.state.occ, f.W, f.H, 30, 30, 2, 2);
  must(!!s2, "جای دوم هست");
  must(tryPlace(f.state, f.terrain, f.W, f.H, s2[0], s2[1], pe).ok, "پیرامونی ساخته می‌شود");
  const s3 = siteNear(f.terrain, f.state.occ, f.W, f.H, 45, 45, 3, 3);
  must(!!s3, "جای ۳×۳ هست");
  must(tryPlace(f.state, f.terrain, f.W, f.H, s3[0], s3[1], de).ok, "دفاعی ساخته می‌شود");
  completeAll(f.state);
  const archers = [];
  for (let i = 0; i < 7; i++) {
    const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 50 + i, 50);
    must(g, "جای استخدام هست");
    const h = hireUnit(f.state, f.terrain, f.W, f.H, g[0], g[1], "bowman");
    must(h.ok, "استخدام کماندار موفق است");
    archers.push(h.unit);
  }
  for (let i = 0; i < 5; i++) must(garrisonUnit(f.state, archers[i], p1.building).ok, `استقرار ${i + 1}/۵ در دیده‌بانی`);
  must(!garrisonUnit(f.state, archers[5], p1.building).ok && garrisonUnit(f.state, archers[5], p1.building).reason === "FULL", "ششمی در دیده‌بانی FULL است");
  must(!garrisonUnit(f.state, archers[5], { id: -1 }).ok, "برج ناشناس INVALID است");
  // شلیک پایه دیده‌بانی (برد ۹): دشمن در فاصله ۸ می‌خورد.
  const cx = p1.building.c + 1, cy = p1.building.r + 1;
  const foe = spawnUnit(f.state, "swordsman", cx + 8, cy);
  simC(f.state, f.terrain, 60);
  const live = f.state.units.find((u) => u.id === foe.id && !u.dead);
  const dealt = live ? 60 - live.hp : 60;
  must(dealt > 0, `دیده‌بانی باید بزند، زد ${dealt}`);
  // ذخیره: گاریسون دیده‌بانی می‌ماند + قدیمی = خالی + فراسقف رد می‌شود.
  const loaded = deserializeJSON(serializeJSON(f.state));
  const lt = loaded.buildings.find((b) => b.type === "lookout");
  must(lt && lt.garrison.length === 5, "گاریسون ۵نفره دیده‌بانی در ذخیره می‌ماند");
  const bare = JSON.parse(serializeJSON(f.state));
  delete bare.buildings.find((b) => b.type === "lookout").garrison;
  must((deserialize(bare).buildings.find((b) => b.type === "lookout").garrison || []).length === 0, "قدیمی = خالی");
  const bad = JSON.parse(serializeJSON(f.state));
  bad.buildings.find((b) => b.type === "lookout").garrison.push(999999);
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "گاریسون ۶نفره دیده‌بانی باید SaveError بدهد");
  // نام‌ها.
  must(t("game.building.lookout.name") === "برج دیده‌بانی", "نام فارسی دیده‌بانی");
  must(t("game.building.perimeter.name") === "برج پیرامونی", "نام فارسی پیرامونی");
  must(t("game.building.defence.name") === "برجک دفاعی", "نام فارسی دفاعی");
  withLang("en", () => {
    must(t("game.building.lookout.name") === "Lookout Tower", "نام en دیده‌بانی");
    must(t("game.building.perimeter.name") === "Perimeter Tower", "نام en پیرامونی");
    must(t("game.building.defence.name") === "Defence Turret", "نام en دفاعی");
  });
  return { name: "برج‌های تازه", pass: true, detail: "کاتالوگ + سقف ۵/۸/۱۲ + شلیک + ذخیره" };
}

// دیوارهای تازه (0.155.0 — §11.2/بندهای 265-266 + §18.3): کوتاه (۴۰٪ جان،
// ۱ چوب) + کنگره‌دار (۷۲ جان، ۲ چوب)؛ هر دو مستحکم و لنگردار مثل دیوار.
function t_walls() {
  const wall = CONFIG.BUILDINGS.wall, lw = CONFIG.BUILDINGS.lowwall, cw = CONFIG.BUILDINGS.crenwall;
  must(!!lw && !!cw, "هر ۲ دیوار در کاتالوگ‌اند");
  must(lw.hp === 24 && lw.hp === Math.round(wall.hp * 0.4), "دیوار کوتاه ۴۰٪ دیوار بلند است");
  must(lw.cost && lw.cost.wood === 1, "دیوار کوتاه ۱ چوب است");
  must(cw.hp === 72 && cw.cost && cw.cost.wood === 2, "کنگره‌دار ۷۲ جان / ۲ چوب است");
  must(lw.fortified === true && cw.fortified === true, "هر ۲ مستحکم‌اند");
  must(lw.w === 1 && lw.h === 1 && cw.w === 1 && cw.h === 1, "هر ۲ ۱×۱اند");
  must(lw.rules && lw.rules.anchorToAny === true && cw.rules.anchorToAny === true, "لنگر به هر بنا");
  const f = fresh();
  f.state.resources.wood = 500;
  const hut = putNear(f.state, f.terrain, f.W, f.H, "کلبه لنگر", 5, 5, CONFIG.BUILDINGS.hut);
  must(hut.ok, "کلبه لنگر ساخته شد");
  const solo = siteNear(f.terrain, f.state.occ, f.W, f.H, 50, 50, 1, 1);
  must(!!solo, "جای دور هست");
  must(!tryPlace(f.state, f.terrain, f.W, f.H, solo[0], solo[1], lw).ok, "دیوار تنها لنگر می‌خواهد");
  must(tryPlace(f.state, f.terrain, f.W, f.H, solo[0], solo[1], lw).reason === "ANCHOR", "دلیل تنها ANCHOR است");
  const adj = (b) => {
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
        const cc = b.c + i + dc, rr = b.r + j + dr;
        if (cc < 0 || rr < 0 || cc >= f.W || rr >= f.H) continue;
        if (f.terrain[rr * f.W + cc] === T_GRASS && f.state.occ[rr * f.W + cc] !== 1) return [cc, rr];
      }
    }
    return null;
  };
  const a1 = adj(hut.building);
  must(!!a1, "همسایه کلبه هست");
  must(tryPlace(f.state, f.terrain, f.W, f.H, a1[0], a1[1], CONFIG.BUILDINGS.wall).ok, "دیوار کنار کلبه ساخته می‌شود");
  const wl = f.state.buildings.find((b) => b.type === "wall");
  const a2 = adj(wl);
  must(!!a2, "همسایه دیوار هست");
  must(tryPlace(f.state, f.terrain, f.W, f.H, a2[0], a2[1], lw).ok, "دیوار کوتاه کنار دیوار ساخته می‌شود");
  const lo = f.state.buildings.find((b) => b.type === "lowwall");
  const a3 = adj(lo);
  must(!!a3, "همسایه دیوار کوتاه هست");
  must(tryPlace(f.state, f.terrain, f.W, f.H, a3[0], a3[1], cw).ok, "کنگره‌دار کنار کوتاه ساخته می‌شود");
  completeAll(f.state);
  const loaded = deserializeJSON(serializeJSON(f.state));
  must(loaded.buildings.some((b) => b.type === "lowwall" && !b.destroyed), "کوتاه در ذخیره می‌ماند");
  must(loaded.buildings.some((b) => b.type === "crenwall" && !b.destroyed), "کنگره‌دار در ذخیره می‌ماند");
  must(t("game.building.lowwall.name") === "دیوار کوتاه", "نام فارسی کوتاه");
  must(t("game.building.crenwall.name") === "دیوار کنگره‌دار", "نام فارسی کنگره‌دار");
  withLang("en", () => {
    must(t("game.building.lowwall.name") === "Low Wall", "نام en کوتاه");
    must(t("game.building.crenwall.name") === "Crenellated Wall", "نام en کنگره‌دار");
  });
  return { name: "دیوارهای تازه", pass: true, detail: "کاتالوگ + لنگر + ذخیره" };
}

// __T_LOWWALL_ROW111__
// دیوار کوتاه + دیده‌بانی (0.182.0 — §1.2/بند 111): lowwall در کاتالوگ
// (۲۴ جان/۱ چوب/مستحکم/لنگر) + دیوار چوبی نیست (جایگزینی کامل) +
// lookout (۱۰ سنگ/سقف ۵) + گاریسون کماندار (نه محاصره).
function t_lowwall_row111() {
  const lw = CONFIG.BUILDINGS.lowwall, lo = CONFIG.BUILDINGS.lookout;
  must(!!lw && lw.hp === 24 && lw.cost.wood === 1 && lw.fortified === true, "کوتاه: ۲۴ جان/۱ چوب/مستحکم");
  must(!CONFIG.BUILDINGS.woodenwall && !CONFIG.BUILDINGS.woodwall, "دیوار چوبی در کاتالوگ نیست");
  must(!!lo && lo.cost.stone === 10 && lo.garrisonCap === 5, "دیده‌بانی: ۱۰ سنگ/سقف ۵");
  must(canGarrisonType("bowman") === true && canGarrisonType("catapult") === false, "کماندار بله، محاصره نه");
  const f = fresh();
  f.state.resources.wood = 500; f.state.resources.stone = 500;
  const hut = siteNear(f.terrain, f.state.occ, f.W, f.H, 10, 10, 2, 2);
  must(!!hut, "جا برای کلبه هست");
  must(tryPlace(f.state, f.terrain, f.W, f.H, hut[0], hut[1], CONFIG.BUILDINGS.hut).ok, "کلبه ساخته شد");
  completeAll(f.state);
  const hb = f.state.buildings.find((b) => b.type === "hut");
  let spot = null;
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const cc = hb.c + dc, rr = hb.r + dr;
    if (cc < 0 || rr < 0 || cc >= f.W || rr >= f.H) continue;
    if (f.terrain[rr * f.W + cc] === T_GRASS && f.state.occ[rr * f.W + cc] !== 1) { spot = [cc, rr]; break; }
  }
  must(!!spot, "همسایه آزاد کلبه هست");
  must(tryPlace(f.state, f.terrain, f.W, f.H, spot[0], spot[1], lw).ok, "کوتاه چسبیده ساخته می‌شود");
  if (typeof document === "undefined") return { name: "دیوار کوتاه و دیده‌بانی", pass: true, detail: "بدون DOM رد شد" };
  must(!!document.querySelector('#buildPal [data-b="lowwall"]'), "کوتاه در پالت ساخت هست");
  return { name: "دیوار کوتاه و دیده‌بانی", pass: true, detail: "کاتالوگ + بی‌چوبی + پالت" };
}

// تعمیر (0.155.0 — §18.3/بند 210): هزینه متناسب با آسیب (مستحکم ۱سنگ/۱۰۰HP،
// بقیه ۱چوب/۵۰HP، دست‌کم ۱) + گیت‌ها + فرمان صف + ذخیره (آسیب می‌ماند).
function t_repair() {
  must(REPAIR_STONE_PER_HP === 100 && REPAIR_WOOD_PER_HP === 50, "نرخ ۱۰۰/۵۰ است");
  must(JSON.stringify(repairCost("wall", 60)) === JSON.stringify({ res: "stone", n: 1 }), "دیوار ۶۰ آسیب = ۱ سنگ");
  must(repairCost("wall", 101).n === 2, "۱۰۱ آسیب = ۲ سنگ");
  must(repairCost("wall", 1).n === 1, "دست‌کم ۱ سنگ");
  must(JSON.stringify(repairCost("hut", 50)) === JSON.stringify({ res: "wood", n: 1 }), "کلبه ۵۰ آسیب = ۱ چوب");
  must(repairCost("tower", 250).res === "stone" && repairCost("lookout", 100).res === "stone", "مستحکم‌ها سنگی‌اند");
  must(repairCost("hut", 0) === null && repairCost("nope", 10) === null, "صفر/ناشناخته = null");
  must(REPAIR_FA.FULL.length > 0 && REPAIR_FA.INSUFFICIENT.length > 0, "دلایل فارسی‌اند");
  const f = fresh();
  f.state.resources.wood = 500; f.state.resources.stone = 500;
  const hut = putNear(f.state, f.terrain, f.W, f.H, "کلبه", 5, 5, CONFIG.BUILDINGS.hut);
  must(hut.ok, "کلبه ساخته شد");
  completeAll(f.state);
  const b = hut.building;
  must(validateRepair(f.state, 9999, 0).reason === "INVALID", "ناشناس INVALID است");
  must(validateRepair(f.state, b.id, 0).reason === "FULL", "سالم FULL است");
  must(validateRepair(f.state, b.id, 1).reason === "NOT_OWNED", "بیگانه NOT_OWNED است");
  b.hp = 50; // ۵۰ آسیب از ۱۰۰
  must(validateRepair(f.state, b.id, 0).ok, "آسیب‌دیده معتبر است");
  f.state.resources.wood = 0;
  must(validateRepair(f.state, b.id, 0).reason === "INSUFFICIENT", "بی‌چوب INSUFFICIENT است");
  f.state.resources.wood = 500;
  const r = repairBuilding(f.state, b, 0);
  must(r.ok && b.hp === b.maxHp, "تعمیر = جان کامل");
  must(f.state.resources.wood === 499, "۱ چوب کم شد");
  must(f.state.events.some((e) => typeof e === "string" && e.includes("تعمیر شد")), "رویداد تعمیر ثبت شد");
  const hut2 = putNear(f.state, f.terrain, f.W, f.H, "کلبه نو", 20, 20, CONFIG.BUILDINGS.hut);
  must(hut2.ok, "کلبه دوم ساخته شد");
  hut2.building.hp = 50;
  must(validateRepair(f.state, hut2.building.id, 0).reason === "UNDER_CONSTRUCTION", "نیمه‌کاره رد می‌شود");
  b.hp = 20;
  f.state.resources.wood = 500;
  const m = applyCmd(f.state, f.terrain, { kind: "repair", bld: b.id, owner: 0 });
  must(m.ok && b.hp === b.maxHp, "فرمان repair از صف می‌نشیند");
  must(f.state.resources.wood === 498, "۸۰ آسیب = ۲ چوب کم شد");
  must(!applyCmd(f.state, f.terrain, { kind: "repair", bld: 424242 }).ok, "فرمان خراب INVALID است");
  b.hp = 30;
  const loaded = deserializeJSON(serializeJSON(f.state));
  must(loaded.buildings.find((x) => x.id === b.id).hp === 30, "آسیب در ذخیره می‌ماند");
  return { name: "تعمیر", pass: true, detail: "هزینه + گیت‌ها + صف + ذخیره" };
}

// گودال کشتار (0.155.0 — §11.5/بند 273): تله ۳شارژه؛ هزینه گودالی نوع‌ها؛
// دوست ایمن؛ شارژ ناکافی = عبور؛ صفر = مصرف + آزادی زمین؛ صلح/نیمه‌کاره
// خاموش؛ شارژ در هش/ذخیره شرطی (قدیمی = پر).
function t_killpit() {
  const def = CONFIG.BUILDINGS.killpit;
  must(!!def && def.w === 1 && def.h === 1 && def.hp === 40, "کاتالوگ ۱×۱/جان۴۰ است");
  must(def.cost && def.cost.wood === 6, "هزینه ۶ چوب مرجع است");
  must(!def.fortified && !def.flammable, "نه مستحکم نه چوبی است");
  must(KILLPIT_CHARGES === 3, "۳ شارژ است");
  must(pitCostFor("spearman") === 1 && pitCostFor("bowman") === 1, "سبک‌ها ۱اند");
  must(pitCostFor("knight") === 2 && pitCostFor("swordsman") === 2, "متوسط‌ها ۲اند");
  must(pitCostFor("pikeman") === 3 && pitCostFor("lord") === 3, "سنگین‌ها ۳اند");
  must(pitCostFor("catapult") === 1 && pitCostFor("trebuchet") === 1 && pitCostFor("ballista") === 1 && pitCostFor("ram") === KILLPIT_CHARGES, "محاصره ۳ است");
  must(JSON.stringify(Object.keys(PIT_COST).sort()) === JSON.stringify(["knight", "lord", "pikeman", "swordsman"]), "جدول هزینه ۴ ورودی است");
  const f = fresh();
  f.state.resources.wood = 500;
  const p = putNear(f.state, f.terrain, f.W, f.H, "گودال", 10, 10, def);
  must(p.ok, "گودال ساخته می‌شود");
  must(p.building.charges === KILLPIT_CHARGES, "شارژ آغازین پر است");
  completeAll(f.state);
  const cx = p.building.c + 0.5, cy = p.building.r + 0.5;
  const s1 = spawnUnit(f.state, "swordsman", cx, cy);
  simC(f.state, f.terrain, 1);
  must(s1.dead === true, "شمشیرزن دشمن در گودال می‌میرد");
  must(p.building.charges === 1, "۲ شارژ خورده است");
  const fr = spawnUnit(f.state, "soldier", cx, cy, 0);
  simC(f.state, f.terrain, 1);
  must(fr.dead !== true, "سرباز خودی ایمن است");
  must(p.building.charges === 1, "شارژ دوست را نمی‌خورد");
  const sw2 = spawnUnit(f.state, "swordsman", cx, cy);
  simC(f.state, f.terrain, 1);
  must(sw2.dead !== true && p.building.charges === 1, "شارژ ناکافی = عبور بی‌آسیب");
  p.building.charges = 1;
  const s2 = spawnUnit(f.state, "archer", cx, cy);
  simC(f.state, f.terrain, 1);
  must(s2.dead === true, "کماندار دشمن می‌میرد");
  must(p.building.destroyed === true, "گودال مصرف می‌شود");
  simC(f.state, f.terrain, 1);
  must(f.state.occ[p.building.r * f.W + p.building.c] === 0, "زمین آزاد می‌شود");
  must(f.state.events.some((e) => typeof e === "string" && e.includes("گودال")), "رویداد گودال ثبت شد");
  // نیمه‌کاره ماشه نمی‌خورد.
  const f2 = fresh();
  f2.state.resources.wood = 500;
  const p2 = putNear(f2.state, f2.terrain, f2.W, f2.H, "گودال نو", 10, 10, def);
  must(p2.ok, "گودال دوم ساخته شد");
  const s3 = spawnUnit(f2.state, "archer", p2.building.c + 0.5, p2.building.r + 0.5);
  f2.state.tick++; stepCombat(f2.state, f2.terrain);
  must(s3.dead !== true, "نیمه‌کاره ماشه نمی‌خورد");
  // صلح No Rush گودال را خاموش می‌کند.
  const f3 = fresh();
  f3.state.resources.wood = 500;
  const p3 = putNear(f3.state, f3.terrain, f3.W, f3.H, "گودال صلح", 10, 10, def);
  must(p3.ok, "گودال سوم ساخته شد");
  completeAll(f3.state);
  f3.state.rules = { noRush: true };
  f3.state.peaceUntil = PEACE_TICKS;
  const s4 = spawnUnit(f3.state, "archer", p3.building.c + 0.5, p3.building.r + 0.5);
  f3.state.tick++; stepCombat(f3.state, f3.terrain);
  must(s4.dead !== true && p3.building.charges === 3, "در صلح خاموش است");
  // گزاره MP: فقط بیگانه ماشه می‌خورد.
  const mst = mpFresh(2);
  const mu = spawnUnit(mst.state, "soldier", 10.5, 10.5, 1);
  must(pitVictim(mst.state, mu, 0) === true, "MP: یگان بیگانه ماشه می‌خورد");
  must(pitVictim(mst.state, mu, 1) === false, "MP: یگان خودی ایمن است");
  must(pitVictim(f.state, mu, 0) === false, "سولو: یگان خودی ماشه نمی‌خورد");
  const mp2 = mpFresh(2);
  mp2.state.mpres[0].resources.wood = 500;
  const psite = siteNear(mp2.terrain, mp2.state.occ, mp2.W, mp2.H, 32, 32, 1, 1);
  must(!!psite, "جای گودال MP هست");
  const pp = tryPlace(mp2.state, mp2.terrain, mp2.W, mp2.H, psite[0], psite[1], def, 0);
  must(pp.ok, "گودال MP ساخته شد");
  completeAll(mp2.state);
  const kn = spawnUnit(mp2.state, "knight", pp.building.c + 0.5, pp.building.r + 0.5, 1);
  mp2.state.tick++; stepCombat(mp2.state, mp2.terrain);
  must(kn.dead === true, "شوالیه بیگانه MP می‌میرد");
  must(pp.building.charges === 1, "شوالیه ۲ شارژ خورد");
  // ذخیره: شارژ می‌ماند + قدیمی = پر + خراب رد می‌شود + هش شارژ را می‌خواند.
  const f4 = fresh();
  f4.state.resources.wood = 500;
  const p4 = putNear(f4.state, f4.terrain, f4.W, f4.H, "گودال ذخیره", 10, 10, def);
  must(p4.ok, "گودال چهارم ساخته شد");
  completeAll(f4.state);
  p4.building.charges = 1;
  const loaded = deserializeJSON(serializeJSON(f4.state));
  must(loaded.buildings.find((x) => x.id === p4.building.id).charges === 1, "شارژ در ذخیره می‌ماند");
  const hh1 = stateHash(f4.state);
  p4.building.charges = 2;
  must(stateHash(f4.state) !== hh1, "شارژ در هش می‌خواند");
  p4.building.charges = 1;
  const bare = JSON.parse(serializeJSON(f4.state));
  delete bare.buildings.find((x) => x.id === p4.building.id).charges;
  must(deserialize(bare).buildings.find((x) => x.id === p4.building.id).charges === 3, "قدیمی = پر");
  const bad = JSON.parse(serializeJSON(f4.state));
  bad.buildings.find((x) => x.id === p4.building.id).charges = 99;
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "شارژ ۹۹ باید SaveError بدهد");
  const hut = putNear(f4.state, f4.terrain, f4.W, f4.H, "کلبه شاهد", 30, 30, CONFIG.BUILDINGS.hut);
  must(hut.ok, "کلبه شاهد ساخته شد");
  const bad2 = JSON.parse(serializeJSON(f4.state));
  bad2.buildings.find((x) => x.id === hut.building.id).charges = 1;
  let threw2 = false;
  try { deserialize(bad2); } catch (e) { threw2 = e instanceof SaveError; }
  must(threw2, "شارژ روی غیرگودال باید SaveError بدهد");
  must(t("game.building.killpit.name") === "گودال کشتار", "نام فارسی گودال");
  withLang("en", () => {
    must(t("game.building.killpit.name") === "Killing Pit", "نام en گودال");
  });
  return { name: "گودال کشتار", pass: true, detail: "ماشه + هزینه + مصرف + صلح + ذخیره/هش" };
}
export { fortCases };
