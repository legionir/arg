// آتش/چاه/دیوارهای تقویت‌شده (0.250.0 — C-CLN-47): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
// --- 0.148.0: آتش (§۱۸.۴/#۲۱۵) + چاه/حوض (§۸.۵/بند ۴۵۹-۴۶۰) + Strong Walls (§۱۴.۲/بند ۳۷۰) ---
function fireCases() {
  return [t_fire, t_well, t_waterpot, t_strongwalls];
}

// هسته سیم آتش (وضعیت ۱۰۱۶ — §۱۸.۴/#۲۱۵): اشتعال چوبی با ضربه جنگی +
// سوختن ۲٪/s + گسترش ۲۰٪/۲tile + سنگی‌ایمن + ذخیره/هش.
function t_fire() {
  // داده: آینه FIRE و پرچم‌های اشتعال‌پذیری.
  must(FIRE.ignite === 0.1 && FIRE.ignite === TUNING.fire.ignite, "اشتعال ۰٫۱ از داده");
  must(FIRE.dmgPct === 2 && FIRE.dmgPct === TUNING.fire.dmgPct, "سوختن ۲٪ از داده");
  must(FIRE.spreadRadius === 2 && FIRE.spreadChance === 0.2, "گسترش ۲۰٪/۲tile از داده");
  must(FIRE.source === TUNING.fire.source, "منشأ آتش آینه داده");
  for (const k of ["hut", "stockpile", "granary", "woodcutter", "hunterpost", "dairy", "tannery", "orchard", "farm", "wheatfarm", "hopsfarm", "inn", "apothecary", "gallows", "oxtether", "signpost"]) {
    must(CONFIG.BUILDINGS[k] && CONFIG.BUILDINGS[k].flammable === true, `${k} باید چوبی (flammable) باشد`);
  }
  for (const k of ["tower", "wall", "gate", "keep", "barracks", "church", "garden", "dungeon", "well", "waterpot"]) {
    must(CONFIG.BUILDINGS[k] && !CONFIG.BUILDINGS[k].flammable, `${k} باید سنگی (غیرقابل‌سوختن) باشد`);
  }
  must(isFlammable({ type: "hut" }) === true, "کلبه اشتعال‌پذیر است");
  must(isFlammable({ type: "wall" }) === false, "دیوار نیست");
  must(isFlammable({ type: "hut", destroyed: true }) === false, "ویرانه نمی‌سوزد");
  must(isFlammable(null) === false, "تهی نیست");
  // اشتعال در نبرد واقعی: سرباز خودی کلبه حریف AI را می‌زند تا آتش بگیرد.
  const f = fresh();
  if (f.state.ai && f.state.ai.resources) { f.state.ai.resources.wood = 500; f.state.ai.resources.gold = 500; }
  const hut = putNear(f.state, f.terrain, f.W, f.H, "کلبه حریف", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(hut.ok, "کلبه حریف ساخته شود");
  hut.building.hp = 1000; hut.building.maxHp = 1000; // زنده بماند تا شانس ۰٫۱ بنشیند
  spawnUnit(f.state, "soldier", 8.5, 2.5, 0);
  completeAll(f.state);
  let lit = -1;
  for (let i = 0; i < 400; i++) {
    f.state.tick++;
    stepCombat(f.state, f.terrain);
    if (hut.building.fire > 0) { lit = f.state.tick; break; }
    must(!hut.building.destroyed, "کلبه نباید پیش از اشتعال بیفتد");
  }
  must(lit > 0, "کلبه چوبی باید در ۴۰۰ تیک آتش بگیرد");
  must(f.state.events.some((e) => typeof e === "string" && e.includes("آتش گرفت")), "رویداد اشتعال ثبت شود");
  // سنگی در همان شرایط هرگز: دیوار حریف زیر ضربه (دیوار لنگر می‌خواهد —
  // کلبه همسایه لنگر است).
  const f2 = fresh();
  if (f2.state.ai && f2.state.ai.resources) { f2.state.ai.resources.wood = 500; f2.state.ai.resources.stone = 500; }
  const ha = putNear(f2.state, f2.terrain, f2.W, f2.H, "کلبه لنگر", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(ha.ok, "کلبه لنگر ساخته شود");
  const wall = putNear(f2.state, f2.terrain, f2.W, f2.H, "دیوار حریف", 7, 1, CONFIG.BUILDINGS.wall, 9);
  must(wall.ok, "دیوار حریف ساخته شود");
  wall.building.hp = 2000; wall.building.maxHp = 2000;
  spawnUnit(f2.state, "soldier", 8.5, 2.5, 0);
  completeAll(f2.state);
  for (let i = 0; i < 200; i++) { f2.state.tick++; stepCombat(f2.state, f2.terrain); }
  must(!(wall.building.fire > 0), "دیوار سنگی نباید آتش بگیرد");
  // سوختن: ۲٪ maxHp در هر ثانیه (تیک مضرب ۱۰)، بیرون آن هیچ.
  const f3 = fresh();
  const hb = putNear(f3.state, f3.terrain, f3.W, f3.H, "کلبه", 5, 1, CONFIG.BUILDINGS.hut);
  must(hb.ok, "کلبه ساخته شود");
  completeAll(f3.state);
  hb.building.hp = 1000; hb.building.maxHp = 1000; hb.building.fire = 1;
  f3.state.tick = 10;
  stepFire(f3.state);
  must(hb.building.hp === 980, `سوختن باید ۲۰ کم کند، شد ${1000 - hb.building.hp}`);
  f3.state.tick = 11;
  stepFire(f3.state);
  must(hb.building.hp === 980, "بیرون ثانیه نباید بسوزد");
  // سوختن تا ویرانی: آتش با ویرانی می‌میرد.
  hb.building.hp = 1;
  f3.state.tick = 20;
  stepFire(f3.state);
  must(hb.building.destroyed === true && !(hb.building.fire > 0), "ویرانی آتش را می‌خواباند");
  // گسترش: کلبه همسایه (فاصله مرکز ≤۲) با چرخه ثانیه می‌گیرد.
  const f4 = fresh();
  const a = putNear(f4.state, f4.terrain, f4.W, f4.H, "کلبه آتش", 5, 1, CONFIG.BUILDINGS.hut);
  const nb = putNear(f4.state, f4.terrain, f4.W, f4.H, "کلبه همسایه", 7, 1, CONFIG.BUILDINGS.hut);
  must(a.ok && nb.ok, "دو کلبه همسایه ساخته شوند");
  completeAll(f4.state);
  a.building.hp = 1000; a.building.maxHp = 1000;
  nb.building.hp = 1000; nb.building.maxHp = 1000;
  a.building.fire = 1;
  let spread = -1;
  for (let i = 0; i < 300; i++) {
    f4.state.tick++;
    stepFire(f4.state);
    if (nb.building.fire > 0) { spread = f4.state.tick; break; }
  }
  must(spread > 0, "آتش باید در ۳۰۰ تیک به همسایه بپرد");
  // ذخیره (سولو — ذخیره‌ها solo-only اند؛ MP از lockstep/اتصال‌مجدد می‌آید):
  // آتش می‌ماند؛ قدیمی (بی‌fire) = خاموش؛ خراب رد می‌شود.
  const f5 = fresh();
  const sv = putNear(f5.state, f5.terrain, f5.W, f5.H, "کلبه", 5, 1, CONFIG.BUILDINGS.hut);
  must(sv.ok, "کلبه ذخیره ساخته شود");
  completeAll(f5.state);
  sv.building.fire = 1;
  const h1 = stateHash(f5.state);
  const loaded = deserializeJSON(serializeJSON(f5.state));
  const lb = loaded.buildings.find((b) => b.id === sv.building.id);
  must(lb && lb.fire === 1, "آتش در ذخیره می‌ماند");
  must(stateHash(loaded) === h1, "هش پس از load باید بخواند");
  const old = JSON.parse(serializeJSON(f5.state));
  for (const b of old.buildings) delete b.fire;
  must(deserialize(old).buildings.every((b) => (b.fire | 0) === 0), "ذخیره قدیمی = خاموش");
  const bad = JSON.parse(serializeJSON(f5.state));
  bad.buildings.find((b) => b.id === sv.building.id).fire = 2;
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "آتش خراب (۲) باید رد شود");
  // هش: سوختن هش را عوض می‌کند، خاموشی churn ندارد.
  must(stateHash(createState()) === stateHash(createState()), "دو وضعیت خاموش هش یکسان دارند");
  const s2 = createState();
  const w2 = putNear(s2, makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, CONFIG.MAP_SEED), CONFIG.GRID_W, CONFIG.GRID_H, "کلبه", 5, 1, CONFIG.BUILDINGS.hut);
  must(w2.ok, "کلبه هش ساخته شود");
  const hOff = stateHash(s2);
  w2.building.fire = 1;
  must(stateHash(s2) !== hOff, "سوختن هش را عوض می‌کند");
  return { name: "سیم آتش", pass: true, detail: `اشتعال تیک ${lit} + گسترش تیک ${spread} + سوختن/ویرانی/ذخیره/هش` };
}

// چاه آب (وضعیت ۴۵۹ — §۸.۵): ۳۰ طلا، ۱ کارگر، خاموشی شعاع ۱۰.
function t_well() {
  const wd = CONFIG.BUILDINGS.well;
  must(wd && wd.w === 1 && wd.h === 1 && wd.category === "town", "چاه ۱×۱ town");
  must(wd.cost && wd.cost.gold === 30 && Object.keys(wd.cost).length === 1, "چاه فقط ۳۰ طلا می‌خواهد");
  must(wd.hp === 60 && wd.buildTime === 60, "جان/زمان چاه ۶۰/۶۰");
  must(wd.extinguish === 10, "شعاع خاموشی چاه ۱۰ است");
  must(!RATES.well, "چاه نرخ تولید ندارد");
  must(!wd.flammable, "چاه سنگی است و نمی‌سوزد");
  must(workersNeeded({ type: "well", buildLeft: 0 }) === 1, "چاه ۱ کارگر می‌خواهد");
  must(t("game.building.well.name").length > 0, "نام فارسی چاه");
  withLang("en", () => {
    must(t("game.building.well.name") === "Well", "نام en چاه");
  });
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 100;
  state.workers = 10;
  const p = putNear(state, terrain, W, H, "چاه", 5, 1, CONFIG.BUILDINGS.well);
  must(p.ok, "چاه باید قرار گیرد");
  must(state.resources.gold === 70, "۳۰ طلا کم شود");
  completeAll(state);
  assignStaff(state);
  must(p.building.staffed !== false, "چاه باید کارگر داشته باشد");
  // خاموشی: کلبه در حال سوختن در شعاع (فاصله مرکز ≈۹٫۵) با چرخه ثانیه می‌خوابد.
  const hb = putNear(state, terrain, W, H, "کلبه", 14, 1, CONFIG.BUILDINGS.hut);
  must(hb.ok, "کلبه ساخته شود");
  completeAll(state);
  hb.building.hp = 1000; hb.building.maxHp = 1000; hb.building.fire = 1;
  state.tick = 10;
  stepFire(state);
  must(!(hb.building.fire > 0), "چاه کارگردار نزدیک باید آتش را بخواباند");
  must(state.events.some((e) => typeof e === "string" && e.includes("خاموش شد")), "رویداد خاموشی ثبت شود");
  // بی‌کارگر نمی‌خواباند.
  hb.building.fire = 1;
  p.building.staffed = false;
  state.tick = 20;
  stepFire(state);
  must(hb.building.fire > 0, "چاه بی‌کارگر نباید بخواباند");
  // بیرون شعاع نمی‌رسد.
  p.building.staffed = true;
  const far = putNear(state, terrain, W, H, "کلبه دور", 16, 4, CONFIG.BUILDINGS.hut);
  must(far.ok, "کلبه دور ساخته شود");
  completeAll(state);
  far.building.hp = 1000; far.building.maxHp = 1000; far.building.fire = 1;
  state.tick = 30;
  stepFire(state);
  must(far.building.fire > 0, "کلبه بیرون شعاع ۱۰ باید بسوزد");
  return { name: "چاه آب", pass: true, detail: "۳۰طلا/۱کارگر/شعاع۱۰ + خاموشی/کارگر/برد" };
}

// حوض آب (وضعیت ۴۶۰ — §۸.۵): ۶۰ طلا، ۳ کارگر، مثل چاه ولی کارآمدتر (شعاع ۱۴).
function t_waterpot() {
  const pd = CONFIG.BUILDINGS.waterpot;
  must(pd && pd.w === 2 && pd.h === 2 && pd.category === "town", "حوض ۲×۲ town");
  must(pd.cost && pd.cost.gold === 60 && Object.keys(pd.cost).length === 1, "حوض فقط ۶۰ طلا می‌خواهد");
  must(pd.hp === 100 && pd.buildTime === 90, "جان/زمان حوض ۱۰۰/۹۰");
  must(pd.extinguish === 14, "شعاع خاموشی حوض ۱۴ است");
  must(!RATES.waterpot, "حوض نرخ تولید ندارد");
  must(!pd.flammable, "حوض سنگی است و نمی‌سوزد");
  must(workersNeeded({ type: "waterpot", buildLeft: 0 }) === 3, "حوض ۳ کارگر می‌خواهد");
  must(t("game.building.waterpot.name").length > 0, "نام فارسی حوض");
  withLang("en", () => {
    must(t("game.building.waterpot.name") === "Water Pot", "نام en حوض");
  });
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 200;
  state.workers = 10;
  const p = putNear(state, terrain, W, H, "حوض", 5, 5, CONFIG.BUILDINGS.waterpot);
  must(p.ok, "حوض باید قرار گیرد");
  must(state.resources.gold === 140, "۶۰ طلا کم شود");
  completeAll(state);
  assignStaff(state);
  must(p.building.staffed !== false, "حوض باید کارگر داشته باشد");
  // تمایز از چاه: کلبه در فاصله ≈۱۲ (بیرون ۱۰، داخل ۱۴) را حوض می‌خواباند.
  const hb = putNear(state, terrain, W, H, "کلبه", 15, 5, CONFIG.BUILDINGS.hut);
  must(hb.ok, "کلبه ساخته شود");
  completeAll(state);
  hb.building.hp = 1000; hb.building.maxHp = 1000; hb.building.fire = 1;
  state.tick = 10;
  stepFire(state);
  must(!(hb.building.fire > 0), "حوض باید آتش فاصله ۱۲ را بخواباند (چاه نمی‌رسد)");
  return { name: "حوض آب", pass: true, detail: "۶۰طلا/۳کارگر/شعاع۱۴ + تمایز از چاه" };
}

// گزینه اتاق «Strong Walls» (وضعیت ۳۷۰/۲۵۱ — §۱۴.۲/§۱۹.۳): فقط ماشین
// محاصره به دیوار/برج/دروازه آسیب می‌زند؛ پرچم rules.strongWalls.
function t_strongwalls() {
  // پیش‌فرض خاموش؛ پرچم مستحکم فقط دیوار/برج/دروازه.
  const d = createState();
  must(d.rules && d.rules.strongWalls === false, "پیش‌فرض rules.strongWalls باید false باشد");
  for (const k of ["wall", "tower", "gate"]) {
    must(CONFIG.BUILDINGS[k] && CONFIG.BUILDINGS[k].fortified === true, `${k} باید مستحکم باشد`);
  }
  for (const k of ["keep", "hut", "barracks", "cathedral"]) {
    must(CONFIG.BUILDINGS[k] && !CONFIG.BUILDINGS[k].fortified, `${k} نباید مستحکم باشد`);
  }
  // گیت خالص.
  const wallT = { kind: "bld", b: { type: "wall", destroyed: false } };
  const hutT = { kind: "bld", b: { type: "hut", destroyed: false } };
  const ruinT = { kind: "bld", b: { type: "wall", destroyed: true } };
  const unitT = { kind: "unit", u: {} };
  const sDef = UNITS.soldier, cDef = UNITS.catapult;
  must(cDef && cDef.siege === true && !(sDef && sDef.siege), "منجنیق محاصره است، سرباز نیست");
  must(strongWallDmg(d, sDef, wallT, 6) === 6, "خاموش: سرباز به دیوار می‌زند");
  const on = createState();
  on.rules = { strongWalls: true };
  must(strongWallDmg(on, sDef, wallT, 6) === 0, "روشن: سرباز به دیوار صفر می‌زند");
  must(strongWallDmg(on, cDef, wallT, 40) === 40, "روشن: منجنیق به دیوار می‌زند");
  must(strongWallDmg(on, sDef, hutT, 6) === 6, "روشن: سرباز به کلبه می‌زند (غیرمستحکم)");
  must(strongWallDmg(on, sDef, ruinT, 6) === 6, "ویرانه گیت نمی‌شود");
  must(strongWallDmg(on, sDef, unitT, 6) === 6, "یگان گیت نمی‌شود");
  must(strongWallDmg(on, null, wallT, 6) === 0, "مهاجم نامشخص هم به مستحکم نمی‌زند (پیش‌فرض امن)");
  // نبرد واقعی: سرباز در برابر دیوار حریف — خاموش می‌خورد، روشن نه.
  const run = (flag) => {
    const f = fresh();
    if (f.state.ai && f.state.ai.resources) { f.state.ai.resources.wood = 500; f.state.ai.resources.stone = 500; }
    if (flag) f.state.rules = { strongWalls: true };
    const ha = putNear(f.state, f.terrain, f.W, f.H, "کلبه لنگر", 5, 1, CONFIG.BUILDINGS.hut, 9);
    must(ha.ok, "کلبه لنگر ساخته شود");
    const w = putNear(f.state, f.terrain, f.W, f.H, "دیوار حریف", 7, 1, CONFIG.BUILDINGS.wall, 9);
    must(w.ok, "دیوار حریف ساخته شود");
    w.building.hp = 2000; w.building.maxHp = 2000;
    spawnUnit(f.state, "soldier", 8.5, 2.5, 0);
    completeAll(f.state);
    simC(f.state, f.terrain, 60);
    return w.building.hp;
  };
  const hpOff = run(false), hpOn = run(true);
  must(hpOff < 2000, `خاموش دیوار باید خورده باشد، هست ${hpOff}`);
  must(hpOn === 2000, `روشن دیوار نباید خورده باشد، هست ${hpOn}`);
  // منجنیق مستقر با پرچم روشن دیوار را می‌زند.
  const f2 = fresh();
  f2.state.rules = { strongWalls: true };
  if (f2.state.ai && f2.state.ai.resources) { f2.state.ai.resources.wood = 500; f2.state.ai.resources.stone = 500; }
  const ha2 = putNear(f2.state, f2.terrain, f2.W, f2.H, "کلبه لنگر", 5, 4, CONFIG.BUILDINGS.hut, 9);
  must(ha2.ok, "کلبه لنگر ساخته شود");
  const w2 = putNear(f2.state, f2.terrain, f2.W, f2.H, "دیوار حریف", 7, 4, CONFIG.BUILDINGS.wall, 9);
  must(w2.ok, "دیوار حریف ساخته شود");
  w2.building.hp = 2000; w2.building.maxHp = 2000;
  const cat = spawnUnit(f2.state, "catapult", 12.5, 4.5, 0);
  completeAll(f2.state);
  must(deployUnit(f2.state, cat).ok && cat.deployed === true, "استقرار منجنیق");
  simC(f2.state, f2.terrain, 60);
  must(w2.building.hp < 2000, `منجنیق باید دیوار را بزند، هست ${w2.building.hp}`);
  // MP: پرچم حریف هم گیت می‌شود.
  const f3 = fresh();
  enableMp(f3.state, 2, ["A", "B"]);
  f3.state.rules = { noCow: false, strongWalls: true };
  must(strongWallDmg(f3.state, UNITS.soldier, wallT, 6) === 0, "در MP هم صفر است");
  // نام گزینه در هر دو زبان.
  must(t("ui.mp.strongWalls").length > 0, "نام فارسی Strong Walls");
  withLang("en", () => {
    must(t("ui.mp.strongWalls") === "🧱 Strong walls (siege only)", "نام en Strong Walls");
  });
  // ذخیره (سولو — ذخیره‌ها solo-only اند): پرچم می‌ماند؛ قدیمی = خاموش؛ خراب رد می‌شود.
  const f4 = fresh();
  f4.state.rules = { noCow: false, strongWalls: true };
  const h1 = stateHash(f4.state);
  const loaded = deserializeJSON(serializeJSON(f4.state));
  must(loaded.rules && loaded.rules.strongWalls === true, "پرچم در ذخیره می‌ماند");
  must(stateHash(loaded) === h1, "هش پس از load باید بخواند");
  const old = JSON.parse(serializeJSON(f4.state));
  delete old.rules;
  must(deserialize(old).rules.strongWalls === false, "ذخیره قدیمی = خاموش");
  const bad = JSON.parse(serializeJSON(f4.state));
  bad.rules = { strongWalls: "yes" };
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "پرچم خراب باید رد شود");
  // هش: ترکیب‌ها از هم تفکیک می‌شوند، خاموش churn ندارد.
  const sA = createState(), sB = createState(), sC = createState();
  must(stateHash(sA) === stateHash(createState()), "خاموش هش یکسان دارد");
  sB.rules = { strongWalls: true };
  sC.rules = { noCow: true, strongWalls: true };
  const fN = fresh();
  fN.state.rules = { noCow: true };
  must(stateHash(sB) !== stateHash(createState()), "فعال هش را عوض می‌کند");
  must(stateHash(sC) !== stateHash(sB) && stateHash(sC) !== stateHash(fN.state), "ترکیب‌ها تفکیک می‌شوند");
  return { name: "گزینه Strong Walls اتاق", pass: true, detail: "گیت محاصره + نبرد/منجنیق + ذخیره/هش" };
}
export { fireCases };
