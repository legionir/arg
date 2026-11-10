// بک‌اند ناهمگام IDB (0.261.0 — C-CLN-80): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
// اجرا: window.__slice01.runIdbTests().
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
import { servicesCases } from "./services.js";
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";

const IDB_TEST_PREFIX = "scw.test.idb.";

// تأیید ناهمگام تکه‌تکه (همان مسیر دکمه «تأیید» UI): هش = runReplay، پیشرفت
// یکنوا تا سقف، لاگ نامعتبر و هش نادرست = ok:false. فاز ناهمگام سوئیت.
async function t_replay_verify_async() {
  const rec = createRecorder(CONFIG.MAP_SEED);
  recordCmd(rec, 0, { kind: "tax", v: "none" });
  const log = { v: REPLAY_V, seed: rec.seed, cmds: rec.cmds, ticks: 60 };
  const expect = runReplay(log, 60).hash;
  const seen = [];
  const r = await verifyReplayAsync(log, 60, expect, (tk, upto) => seen.push([tk, upto]));
  must(r.ok === true && r.hash === expect, "تأیید باید ok با همان هش باشد");
  must(seen.length >= 1 && seen[seen.length - 1][0] === 60, "پیشرفت باید به سقف برسد");
  for (let i = 1; i < seen.length; i++) must(seen[i][0] >= seen[i - 1][0], "پیشرفت نباید پسرفت کند");
  must((await verifyReplayAsync({ v: 999 }, 60, expect, null)).ok === false, "لاگ نامعتبر = ok:false");
  const wrong = await verifyReplayAsync(log, 60, "00000000", null);
  must(wrong.ok === false && wrong.hash === expect, "هش نادرست = ok:false ولی هش واقعی برمی‌گردد");
  return { name: "تأیید ناهمگام ری‌پلی", pass: true, detail: "هش + پیشرفت + ۲ رد" };
}
// __T_NAMED_SAVES__
// ذخیره بانام (0.178.0 — بند 114/§1.3): رفت‌وبرگشت + اعتبار + ایندکس + هرس.
async function t_named_saves() {
  const N1 = "t178-alef", N2 = "t178-be";
  const doc = (tk) => JSON.stringify({ v: 2, tick: tk });
  try {
    must(validSaveName("  نبرد  اول  ") === "نبرد اول", "نرمال‌سازی فاصله");
    must(validSaveName("") === null && validSaveName("   ") === null, "خالی رد می‌شود");
    must(validSaveName("x".repeat(25)) === null, "بلند رد می‌شود");
    must(validSaveName("a/b") === null && validSaveName(7) === null, "نویسه بد/نوع بد رد می‌شود");
    must(validSaveName("my-save_1 (2)") === "my-save_1 (2)", "لاتین قبول است");
    const l0 = await listNamedSaves();
    must(!l0.some((e) => e.name === N1 || e.name === N2), "تمیز شروع می‌شود");
    const w1 = await saveNamed(N1, doc(11));
    must(w1.ok && w1.name === N1, "ذخیره اول");
    const w2 = await saveNamed(N2, doc(22));
    must(w2.ok, "ذخیره دوم");
    const l1 = await listNamedSaves();
    must(l1.some((e) => e.name === N1 && e.tick === 11), "فهرست اول");
    must(l1.some((e) => e.name === N2 && e.tick === 22), "فهرست دوم");
    const w3 = await saveNamed(N1, doc(33));
    must(w3.ok, "بازنویسی");
    const l2 = await listNamedSaves();
    must(l2.filter((e) => e.name === N1).length === 1 && l2.find((e) => e.name === N1).tick === 33, "بازنویسی تکرار نمی‌سازد");
    const r = await loadNamed(N1);
    must(r.ok && r.text === doc(33), "بارگذاری همان رشته");
    must(!(await loadNamed("t178-missing")).ok, "ناموجود خطا می‌دهد");
    must(!(await saveNamed("!!", doc(1))).ok, "نام بد ذخیره نمی‌شود");
    must(await deleteNamed(N2), "حذف");
    const l3 = await listNamedSaves();
    must(!l3.some((e) => e.name === N2) && l3.some((e) => e.name === N1), "ایندکس پس از حذف");
    await deleteSlot(namedSlotKey(N1));
    const l4 = await listNamedSaves();
    must(!l4.some((e) => e.name === N1), "ورودی بی‌اسلات هرس می‌شود");
    return { name: "ذخیره بانام", pass: true, detail: "رفت‌وبرگشت + ایندکس + هرس" };
  } finally {
    await deleteNamed(N1); await deleteNamed(N2);
  }
}

function idbCases() {
  return [t_idb_roundtrip, t_idb_cap, t_idb_migrate, t_idb_save_fallback, t_replay_verify_async, t_named_saves];
}

function idbSkip() {
  return { name: "IDB", pass: true, detail: "این مرورگر IndexedDB ندارد — رد شد" };
}

async function t_idb_roundtrip() {
  if (!idbAvailable()) return { ...idbSkip(), name: "رفت‌وبرگشت IDB" };
  const k = IDB_TEST_PREFIX + "roundtrip";
  const doc = JSON.stringify({ v: 2, tick: 1234, note: "تست فارسی — بایت UTF-8" });
  try {
    const w = await saveSlot(k, doc);
    must(w.ok, `نوشتن باید موفق باشد: ${w.error || ""}`);
    const r = await loadSlot(k);
    must(r.ok && r.text === doc, "خواندن باید همان رشته را بدهد");
    const info = await loadSlot(k);
    must(info.ok, "خواندن مجدد باید موفق باشد");
    return { name: "رفت‌وبرگشت IDB", pass: true, detail: `${doc.length} نویسه با فارسی` };
  } finally {
    await deleteSlot(k);
  }
}

async function t_idb_cap() {
  if (!idbAvailable()) return { ...idbSkip(), name: "سقف ۴MB" };
  const k = IDB_TEST_PREFIX + "cap";
  const big = "x".repeat(IDB_CAP + 1);
  try {
    const r = await saveSlot(k, big);
    must(!r.ok && r.error === "TOO_BIG", `بزرگ‌تر از سقف باید TOO_BIG بدهد، داد ${r.error || "ok"}`);
    const g = await idbGet(k);
    must(!g.ok, "مقدار بیش‌ازسقف نباید نوشته شده باشد");
    return { name: "سقف ۴MB", pass: true, detail: "TOO_BIG + بدون نوشتن" };
  } finally {
    await idbDel(k);
  }
}

async function t_idb_migrate() {
  if (!idbAvailable()) return { ...idbSkip(), name: "مهاجرت به IDB" };
  const k = IDB_TEST_PREFIX + "migrate";
  const doc = JSON.stringify({ v: 2, tick: 777 });
  try {
    const s = storageSave(k, doc); // وانمود ذخیره قدیمی localStorage
    must(s.ok, "seed در localStorage باید موفق باشد");
    await idbDel(k); // مبادا از اجرای قبلی مانده باشد
    const m = await migrateToIdb([k]);
    must(m.ok && m.slots === 1, `مهاجرت باید ۱ اسلات ببرد، برد ${m.slots}`);
    const r = await idbGet(k);
    must(r.ok && r.text === doc, "پس از مهاجرت IDB باید همان را بدهد");
    return { name: "مهاجرت به IDB", pass: true, detail: "localStorage → IDB با محتوای یکسان" };
  } finally {
    await idbDel(k);
    storageDelete(k);
  }
}

async function t_idb_save_fallback() {
  // روی هر دو بک‌اند کار می‌کند (IDB اگر هست، وگرنه localStorage) — پس همیشه اجراست.
  const k = IDB_TEST_PREFIX + "fallback";
  const doc = JSON.stringify({ v: 2, tick: 4242 });
  try {
    const w = await saveSlot(k, doc);
    must(w.ok, `نوشتن باید موفق باشد: ${w.error || ""}`);
    const r = await loadSlot(k);
    must(r.ok && r.text === doc, "خواندن باید همان را بدهد");
    return { name: "ذخیره/بارگذاری یکپارچه", pass: true, detail: idbAvailable() ? "مسیر IDB" : "مسیر fallback" };
  } finally {
    await deleteSlot(k);
  }
}
export { idbCases };
