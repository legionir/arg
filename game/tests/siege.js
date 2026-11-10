// روش‌های تصرف و مهمات (0.255.0 — C-CLN-62): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
// --- 0.159.0: روش‌های تصرف دروازه (§12.2/بند 296) + برج‌های مربع/گرد (§11.3/بند 268) + پین مهمات (§18.4) ---
function siegeCases() {
  return [t_gatecapture_methods, t_squaretower, t_ammorocks];
}

// روش‌های تصرف دروازه (0.159.0 - §12.2/بند 296): فقط پیاده می‌گیرد؛ ماشین
// محاصره (ram/catapult/trebuchet/ballista) روی ردپا تصرف نیست؛ قاتل می‌گیرد؛
// نردبان‌بر/برج‌محاصره/تونل‌زن/مهندس در موتور نیستند (vacuous).
function t_gatecapture_methods() {
  const f = fresh();
  f.state.resources.wood = 500;
  const g = { building: placeGateAt(f.state, f.terrain, f.W, f.H, 30, 30) };
  must(toggleGate(f.state, g.building).ok, "بستن دروازه");
  const cx = g.building.c + 0.5, cy = g.building.r + 0.5;
  const ram = spawnUnit(f.state, "ram", cx, cy);
  const cat = spawnUnit(f.state, "catapult", cx, cy);
  cat.deployed = true;
  const treb = spawnUnit(f.state, "trebuchet", cx, cy);
  const bal = spawnUnit(f.state, "ballista", cx, cy);
  stepGateCapture(f.state);
  must(g.building.owner === 0, "هیچ ماشین محاصره دروازه را تصرف نمی‌کند");
  ram.dead = true; cat.dead = true; treb.dead = true; bal.dead = true;
  const as = spawnUnit(f.state, "assassin", cx, cy);
  as.side = "enemy"; // موتور موج (مانند t_pitnumbers)
  stepGateCapture(f.state);
  must(g.building.owner === 9, "قاتل دروازه را تصرف می‌کند");
  must(as.dead !== true, "قاتل مدعی زنده می‌ماند");
  must(UNITS.ladderman && !UNITS.siegetower, "نردبان‌بر یگان است ولی مکانیک/برج محاصره نیست");
  return { name: "روش‌های تصرف دروازه", pass: true, detail: "محاصره نه + قاتل بله + vacuous" };
}

// برج‌های مربع/گرد (0.159.0 - §11.3/بند 268 + ردیف‌های جدول 126/127):
// 35/40 سنگ مرجع + جان 480/600 (0.3× مرجع) + سقف 36 مرجع + مصونیت تونل/mounted خلا.
function t_squaretower() {
  const sq = CONFIG.BUILDINGS.squaretower, ro = CONFIG.BUILDINGS.roundtower;
  must(!!sq && !!ro, "هر 2 برج تازه در کاتالوگ‌اند");
  must(sq.cost && sq.cost.stone === 35 && ro.cost && ro.cost.stone === 40, "هزینه مرجع 35/40 سنگ");
  must(sq.hp === 480 && ro.hp === 600, "جان 480/600");
  must(sq.w === 3 && sq.h === 3 && ro.w === 3 && ro.h === 3, "ابعاد 3x3");
  must(sq.weapon && sq.weapon.range === 8 && ro.weapon && ro.weapon.range === 8, "برد 8");
  must(sq.weapon.source && ro.weapon.source, "منشا سلاح‌ها هست");
  must(sq.garrisonCap === 36 && ro.garrisonCap === 36, "سقف 36 مرجع");
  must(CONFIG.BUILDINGS.tower.garrisonCap === 4, "سقف برج همان 4 می‌ماند");
  must(sq.fortified === true && ro.fortified === true, "هر 2 مستحکم‌اند");
  must(isGarrisonPost("squaretower") && isGarrisonPost("roundtower"), "هر 2 پاسگاه‌اند");
  must(!isGarrisonPost("wall") && !isGarrisonPost("gate"), "دیوار/دروازه پاسگاه نیستند");
  must(isTowerFamily("squaretower") && isTowerFamily("roundtower"), "هر 2 خانواده‌برج‌اند");
  must(GARRISON_POSTS.length === 6, "6 پاسگاه ثبت‌اند");
  const T2 = (type) => ({ kind: "bld", b: { type, destroyed: false } });
  must(towerGuardDmg("assassin", UNITS.assassin, T2("squaretower"), 13) === 0, "قاتل ضد مربعی صفر است");
  must(towerGuardDmg("assassin", UNITS.assassin, T2("roundtower"), 13) === 0, "قاتل ضد گرد صفر است");
  must(towerGuardDmg("bowman", UNITS.bowman, T2("squaretower"), 13) === 6.5, "تیر دوربرد ضد مربعی نصف است");
  must(!Object.values(UNITS).some((d) => d && d.undermine), "هیچ یگانی میدان زیرکنی ندارد");
  must(!Object.values(UNITS).some((d) => d && d.mountedSiege), "محاصره سوارکار نیست");
  const rc = repairCost("squaretower", 100);
  must(rc.res === "stone" && rc.n === 1, "تعمیر مربعی سنگی است");
  const on = createState(); on.rules = { strongWalls: true };
  must(strongWallDmg(on, UNITS.soldier, T2("squaretower"), 6) === 0, "سرباز به مربعی مستحکم صفر می‌زند");
  const f = fresh();
  f.state.resources.stone = 500; f.state.resources.wood = 500;
  f.state.resources.food = 500; f.state.resources.gold = 500;
  const s1 = siteNear(f.terrain, f.state.occ, f.W, f.H, 10, 10, 3, 3);
  must(!!s1, "جای 3x3 هست");
  const p1 = tryPlace(f.state, f.terrain, f.W, f.H, s1[0], s1[1], sq);
  must(p1.ok, "مربعی ساخته می‌شود");
  const s2 = siteNear(f.terrain, f.state.occ, f.W, f.H, 30, 30, 3, 3);
  must(!!s2, "جای دوم هست");
  must(tryPlace(f.state, f.terrain, f.W, f.H, s2[0], s2[1], ro).ok, "گرد ساخته می‌شود");
  completeAll(f.state);
  const archers = [];
  for (let i = 0; i < 37; i++) archers.push(spawnUnit(f.state, "bowman", 20 + (i % 10) + 0.5, 44 + Math.floor(i / 10) + 0.5, 0));
  for (let i = 0; i < 36; i++) must(garrisonUnit(f.state, archers[i], p1.building).ok, "استقرار در مربعی");
  must(!garrisonUnit(f.state, archers[36], p1.building).ok && garrisonUnit(f.state, archers[36], p1.building).reason === "FULL", "37می در مربعی FULL است");
  const loaded = deserializeJSON(serializeJSON(f.state));
  const lt = loaded.buildings.find((b) => b.type === "squaretower");
  must(lt && lt.garrison.length === 36, "گاریسون 36نفره مربعی در ذخیره می‌ماند");
  const cx = p1.building.c + 1, cy = p1.building.r + 1;
  const foe = spawnUnit(f.state, "swordsman", cx + 7, cy);
  simC(f.state, f.terrain, 60);
  const liveF = f.state.units.find((u) => u.id === foe.id && !u.dead);
  const dealt = liveF ? 60 - liveF.hp : 60;
  must(dealt > 0, "مربعی باید بزند");
  return { name: "برج‌های مربع/گرد", pass: true, detail: "کاتالوگ + سقف 36 + ذخیره + شلیک" };
}

// پین مهمات (0.159.0 - §18.4/ردیف مهمات): 10 سنگ = 20 سنگ‌پرتابه
// (AMMO_RESUPPLY_STONE/ROCKS) + سقف‌ها (catapult 20، trebuchet 10) + خالی = توقف شلیک + کسر از stockpile.
function t_ammorocks() {
  must(AMMO_RESUPPLY_STONE === 10 && AMMO_RESUPPLY_ROCKS === 20, "10 سنگ = 20 سنگ‌پرتابه");
  must(UNITS.catapult.ammoCap === 20 && UNITS.trebuchet.ammoCap === 10, "سقف‌ها 20/10");
  must(!UNITS.ballista.ammoCap && !UNITS.ram.ammoCap, "بالیستا/رم بی‌مهمات‌اند");
  const fw = fresh();
  if (fw.state.ai && fw.state.ai.resources) { fw.state.ai.resources.wood = 500; fw.state.ai.resources.stone = 500; }
  const ha = putNear(fw.state, fw.terrain, fw.W, fw.H, "کلبه لنگر", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(ha.ok, "کلبه لنگر ساخته شود");
  const wl = putNear(fw.state, fw.terrain, fw.W, fw.H, "دیوار حریف", 7, 1, CONFIG.BUILDINGS.wall, 9);
  must(wl.ok, "دیوار حریف ساخته شود");
  wl.building.hp = 2000; wl.building.maxHp = 2000;
  const treb = spawnUnit(fw.state, "trebuchet", wl.building.c + 0.5, wl.building.r + 6.5, 0);
  must(treb.ammo === 10, "تربوشه تازه باید پر (10) باشد");
  completeAll(fw.state);
  must(deployUnit(fw.state, treb).ok && treb.deployed === true, "استقرار");
  const foeHpSum = () => fw.state.buildings.filter((b) => !b.destroyed && (b.owner == null ? 0 : b.owner) === 9).reduce((a, b) => a + b.hp, 0);
  const hp0 = foeHpSum();
  simC(fw.state, fw.terrain, 70);
  must(treb.ammo < 10, "باید شلیک کرده باشد");
  must(foeHpSum() < hp0, "بنای حریف باید خورده باشد");
  treb.ammo = 0; treb.cooldown = 0;
  const hp1 = foeHpSum();
  simC(fw.state, fw.terrain, 100);
  must(treb.ammo === 0, "مهمات صفر می‌ماند");
  must(foeHpSum() === hp1, "بی‌سنگ نباید بزند");
  fw.state.resources.stone = 40;
  const rr = resupplyAmmo(fw.state, [treb.id], 0);
  must(rr.ok && rr.reason === "OK", "تأمین باید موفق باشد");
  must(treb.ammo === 10, "باید تا سقف پر شود");
  must(fw.state.resources.stone === 30, "10 سنگ کم شود");
  return { name: "پین مهمات 10=20", pass: true, detail: "سقف‌ها + توقف + تأمین" };
}
export { siegeCases };
