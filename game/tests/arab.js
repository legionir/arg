// مزدورهای عرب و تربوشه (0.251.0 — C-CLN-50): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
// --- 0.150.0: تربوشه (§۱۲.۲/بند ۵۷۸) + کماندار عرب (§۹.۵) + آتش‌افکن (§۱۲.۲/بند ۵۱۵ + §۱۹.۳/بند ۲۵۴) + ارباب عرب (§۱۸.۵/بند ۱۰۰) ---
function arabCases() {
  return [t_trebuchet, t_arabianbow, t_firethrower, t_arablord];
}

// تربوشه (0.150.0 — §۱۲.۲/بند ۵۷۸، نیمه trebuchet): محاصره دوربرد (۱۲) با
// استقرار اجباری + گاوافکنی + مهمات ۱۰تایی؛ مسیرهای fireCow/resupply ژنریک‌اند
// (بدون تغییر sim — فقط کاتالوگ + رندر بازوی بلندتر).
function t_trebuchet() {
  const td = UNITS.trebuchet;
  must(td && td.side === "player" && td.requires === "barracks" && td.building === "barracks", "تربوشه خودیِ سربازخانه است");
  must(td.siege === true && td.needsDeploy === true && td.cowCd === 150 && td.ammoCap === 10, "محاصره مستقرشونده گاوافکن با سقف ۱۰");
  must(td.range === 12 && td.minRange === 4 && td.bonusVsBld === 3 && td.dmg === 8 && td.hp === 150, "برد/کمینه/ضریب/آسیب/جان تربوشه");
  must(td.cost.food === 100 && td.cost.gold === 150 && td.goldCost === 150 && td.trainTicks === 200, "هزینه/آموزش تربوشه");
  must(Array.isArray(td.equip) && td.equip.length === 0 && !td.requiresWeapon, "تربوشه بی‌سلاح است");
  must(t("game.unit.trebuchet.name").length > 0, "نام فارسی تربوشه");
  withLang("en", () => {
    must(UNITS.trebuchet.name === "Trebuchet", "نام en تربوشه");
  });
  // شلیک واقعی مستقر + مصرف مهمات (محاصره سولو فقط بنای حریف AI را می‌زند).
  const { W, H, terrain, state } = fresh();
  if (state.ai && state.ai.resources) { state.ai.resources.wood = 500; state.ai.resources.stone = 500; }
  const ha = putNear(state, terrain, W, H, "کلبه لنگر", 5, 1, CONFIG.BUILDINGS.hut, 9);
  must(ha.ok, "کلبه لنگر ساخته شود");
  const wl = putNear(state, terrain, W, H, "دیوار حریف", 7, 1, CONFIG.BUILDINGS.wall, 9);
  must(wl.ok, "دیوار حریف ساخته شود");
  wl.building.hp = 2000; wl.building.maxHp = 2000;
  const treb = spawnUnit(state, "trebuchet", wl.building.c + 0.5, wl.building.r + 5.5, 0);
  must(treb.ammo === 10, "تربوشه تازه باید پر (۱۰) باشد");
  completeAll(state);
  must(deployUnit(state, treb).ok && treb.deployed === true, "استقرار");
  const foeHpSum = () => state.buildings
    .filter((b) => !b.destroyed && (b.owner == null ? 0 : b.owner) === 9)
    .reduce((a, b) => a + b.hp, 0);
  const hp0 = foeHpSum();
  simC(state, terrain, 80);
  must(treb.ammo === 8, `باید ۲ شلیک کرده باشد، مهمات=${treb.ammo}`);
  must(foeHpSum() < hp0, "بنای حریف باید خورده باشد");
  // گاو: مستقرِ سردشده شناخته می‌شود (OK یا NO_COW — هر دو یعنی NOT_SIEGE نیست).
  treb.cowCd = 0;
  const fr = fireCow(state, [treb.id], wl.building.c, wl.building.r, 0);
  must(fr.reason === "OK" || fr.reason === "NO_COW", `تربوشه باید گاوافکن شناخته شود، شد ${fr.reason}`);
  // تأمین تا سقف ۱۰.
  treb.ammo = 2; state.resources.stone = 40;
  must(resupplyAmmo(state, [treb.id], 0).reason === "OK" && treb.ammo === 10, "تأمین تا سقف ۱۰");
  // استخدام بی‌سلاح.
  const q = fresh();
  needBarracks(q.state, q.terrain, q.W, q.H);
  q.state.resources.swords = 0; q.state.resources.bows = 0;
  q.state.resources.food = 500; q.state.resources.gold = 500;
  const h = hireUnit(q.state, q.terrain, q.W, q.H, 5, 5, "trebuchet");
  must(h.ok && q.state.resources.food === 400 && q.state.resources.gold === 350, "هزینه تربوشه ۱۰۰غ+۱۵۰ط کم می‌شود");
  return { name: "تربوشه", pass: true, detail: "کاتالوگ + شلیک/مصرف + گاو + تأمین + استخدام" };
}

// کماندار عرب (0.150.0 — §۹.۵، پیش‌نیاز بند ۱۰۰): دوربرد مزدور عربی با کمان
// خودش (equip [] — مثل برده بی‌نیاز از زرادخانه)؛ نقش دوربردی (زوبین‌دار همچنان
// پرآسیب‌ترین/کندترین است).
function t_arabianbow() {
  const ad = UNITS.arabianBow;
  must(ad && ad.side === "player" && ad.requires === "barracks" && ad.building === "barracks", "کماندار عرب خودیِ سربازخانه است");
  must(ad.hp === 45 && ad.dmg === 6 && ad.cd === 15 && ad.range === 6 && ad.speed === 3.4 && ad.aggro === 8, "جان/آسیب/ریلود/برد/سرعت کماندار عرب");
  must(ad.cost.food === 30 && ad.cost.gold === 20 && ad.goldCost === 20 && ad.trainTicks === 50, "هزینه/آموزش کماندار عرب");
  must(Array.isArray(ad.equip) && ad.equip.length === 0 && !ad.requiresWeapon, "کماندار عرب با کمان خودش می‌آید (بی‌سلاح)");
  must(t("game.unit.arabianBow.name").length > 0, "نام فارسی کماندار عرب");
  withLang("en", () => {
    must(UNITS.arabianBow.name === "Arabian Bowman", "نام en کماندار عرب");
  });
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.swords = 0; state.resources.bows = 0;
  state.resources.food = 100; state.resources.gold = 100;
  const h = hireUnit(state, terrain, W, H, 5, 5, "arabianBow");
  must(h.ok, `استخدام بی‌سلاح باید موفق باشد، شد ${h.reason}`);
  must(state.resources.food === 70 && state.resources.gold === 80, "هزینه ۳۰غ+۲۰ط کم می‌شود");
  return { name: "کماندار عرب", pass: true, detail: "کاتالوگ + نقش دوربرد + استخدام بی‌سلاح" };
}

// آتش‌افکن (0.150.0 — §۱۲.۲/بند ۵۱۵ + §۱۹.۳/بند ۲۵۴): پیاده مشعل‌دار با پاشش
// ناحیه‌ای — ضربه مستقیم + همان خسارت به همه دشمنان زنده شعاع (بی‌زنجیره،
// فقط دشمن، مستقر بیرون)؛ مشعل همان مسیر برده را می‌رود.
function t_firethrower() {
  const fd = UNITS.firethrower;
  must(fd && fd.side === "player" && fd.requires === "barracks" && fd.building === "barracks", "آتش‌افکن خودیِ سربازخانه است");
  must(fd.torch === true && fd.splash === 1.5 && fd.range === 2.2 && fd.dmg === 6 && fd.hp === 40, "مشعل + پاشش ۱٫۵ + برد ۲٫۲");
  must(fd.cost.food === 30 && fd.cost.gold === 25 && fd.goldCost === 25 && fd.trainTicks === 50, "هزینه/آموزش آتش‌افکن");
  must(Array.isArray(fd.equip) && fd.equip.length === 0 && !fd.requiresWeapon, "آتش‌افکن بی‌سلاح است");
  must(t("game.unit.firethrower.name").length > 0, "نام فارسی آتش‌افکن");
  withLang("en", () => {
    must(UNITS.firethrower.name === "Fire Thrower", "نام en آتش‌افکن");
  });
  // پاشش واقعی: ۳ شمشیرزن خوشه‌ای + ۱ برده خودی در لبه پاشش (دور از دسترس
  // شمشیر — فقط پاشش می‌توانست بزندش، و نباید بزند چون خودی است).
  const { W, H, terrain, state } = fresh();
  spawnUnit(state, "firethrower", 9.0, 5.5, 0);
  const e1 = spawnUnit(state, "swordsman", 10.5, 5.5);
  const e2 = spawnUnit(state, "swordsman", 11.5, 5.5);
  const e3 = spawnUnit(state, "swordsman", 10.5, 6.5);
  const pal = spawnUnit(state, "slave", 10.5, 4.0, 0);
  const eMax = [e1.maxHp, e2.maxHp, e3.maxHp], pMax = pal.maxHp;
  completeAll(state);
  state.tick++;
  stepCombat(state, terrain);
  must(e1.hp === eMax[0] - 5 && e2.hp === eMax[1] - 5 && e3.hp === eMax[2] - 5, `هر ۳ دشمن باید ۵ خورده باشند، شد ${e1.hp}/${e2.hp}/${e3.hp}`);
  must(pal.hp === pMax, "برده خودی در شعاع پاشش نباید بخورد (فقط دشمن)");
  return { name: "آتش‌افکن", pass: true, detail: "کاتالوگ + پاشش ۳تایی + مصونیت خودی" };
}

// ارباب عرب (0.150.0 — §۱۸.۵/بند ۱۰۰): ششمین شخصیت حریف — همان اندازه گرگ
// ولی زوج عربی (۵/۱۲ کماندار عرب + بقیه برده)؛ انتخاب منو خودکار (داده‌محور).
function t_arablord() {
  must(aiRaidPlan({ personality: "arabLord" }, 0).at === 1500, "ارباب عرب زودرس گرگ‌وار (۱۵۰۰)");
  must(aiRaidPlan({ personality: "arabLord" }, 0).n === 3, "ارباب عرب هم‌اندازه گرگ (۳)");
  const P = aiPersonality({ personality: "arabLord" });
  must(P && P.troops && P.troops.ranged === "arabianBow" && P.troops.melee === "slave", "زوج عربی یورش");
  // ترکیب خالص: فقط عربی، هر دو نوع دیده شوند.
  const seen = new Set();
  for (let i = 0; i < 61; i++) {
    const tp = aiRaidUnitType({ personality: "arabLord", seed: 777 }, 1500, 0, i);
    must(tp === "arabianBow" || tp === "slave", `یورش عرب فقط عربی است، شد ${tp}`);
    seen.add(tp);
  }
  must(seen.size === 2, "هر دو نوع عربی باید بیایند");
  // گرگ دست‌نخورده.
  for (let i = 0; i < 61; i++) {
    const tp = aiRaidUnitType({ personality: "wolf", seed: 777 }, 1500, 0, i);
    must(tp === "archer" || tp === "swordsman", `یورش گرگ همان است، شد ${tp}`);
  }
  // سازگاری ذخیره/ری‌پلی (رشته گذر + رد بیگانه سر جایش).
  const { state } = aiFreshPers("arabLord");
  must(state.ai.personality === "arabLord", "شخصیت عرب ثبت شود");
  must(aiPersonalityName(state.ai) === "ارباب عرب", "نام فارسی ارباب عرب");
  withLang("en", () => {
    must(aiPersonalityName(state.ai) === "Arab Lord", "نام en ارباب عرب");
  });
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.ai.personality === "arabLord", "شخصیت عرب در ذخیره بماند");
  must(validateReplayLog({ v: REPLAY_V, seed: 1, pers: "arabLord", cmds: [], ticks: 10 }).ok, "ری‌پلی با شخصیت عرب قبول شود");
  return { name: "ارباب عرب", pass: true, detail: "همان‌اندازه + زوج عربی + سازگاری" };
}
export { arabCases };
