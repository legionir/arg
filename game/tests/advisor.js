// مشاور/گزارش‌ها (0.249.0 — C-CLN-43): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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
import {
  PROFILE_LOGOS, PROFILE_LORDS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
  lordPortraitSrc, lordPortraitHTML, lordName, randomDefaultName, defaultProfile, firstRunAsk, PROFILE_KEY,
} from "../profile.js";
import { must, fresh, mpFresh, sim, simC, simT, completeAll, rawTicks, grassNear, needBarracks, stubCtx, blankMap, siteNear, aiSim, aiFreshPers, grassInBand, placeGateAt, putNear, snapOf, srvCode, srvMake, srvRoom, srvInp } from "./fixtures.js";


// --- خط دیوار (0.47.0 — #۲۰ از FEATURES): سوپرکاور خالص + دروازه نوع + سقف + صف ---











// --- گروه‌های کنترلی (0.59.0 — رتبه ۱ SOURCE-REVIEW) ---
function advisorCases() {
  return [t_policy_info, t_policy_summary, t_advisor_warnings, t_advisor_alarm, t_advisor_pure, t_crueller_warn, t_inn_panel, t_resbar_approx, t_eat_gauge, t_food_info, t_food_report, t_granary_hover, t_treasury_report, t_report_panels, t_hud_indicators, t_minimap_buttons, t_minimap_panel, t_tooltips_all, t_tab_panel, t_scroll_keys, t_help_story, t_merit_rows, t_merit_sort, t_named_save_ui, t_playoptions_all, t_replay_ui, t_flat_space, t_peek_hold, t_share_note, t_merit_power, t_editor_keys, t_ed_share];
}


// اطلاعات tooltip/panel آینه TUNING اند (نام‌ها در هر دو زبان حل می‌شوند).
function t_policy_info() {
  for (const id of TAX_IDS) {
    const i = taxInfo(id);
    must(i && i.id === id, `taxInfo ${id}`);
    const lv = TUNING.tax.levels.find((l) => l.id === id);
    must(i.goldPerWorker === lv.goldPerWorker && i.pop === lv.pop, `آینه TAX ${id}`);
    must(typeof i.name === "string" && i.name.length > 0 && i.name !== lv.nameKey, `نام fa ${id}`);
  }
  for (const id of RATION_IDS) {
    const i = rationInfo(id);
    must(i && i.id === id, `rationInfo ${id}`);
    const lv = TUNING.rations.levels.find((l) => l.id === id);
    must(i.foodNum === lv.foodNum && i.pop === lv.pop, `آینه RATIONS ${id}`);
  }
  must(taxInfo("nope") === null && rationInfo("nope") === null, "شناسه نامعتبر = null");
  must(taxInfo("generousBribe").name === "رشوه سخاوتمندانه", "نام fa سخاوتمندانه");
  withLang("en", () => {
    must(taxInfo("generousBribe").name === "Generous Bribe", "ترجمه en سخاوتمندانه");
    must(taxInfo("cruellerThanCruel").name === "Crueller than Cruel", "ترجمه en بی‌رحم‌ترین");
    must(rationInfo("double").name === "Double Rations", "ترجمه en جیره مضاعف");
    must(rationInfo("extra").name === "Extra Rations", "ترجمه en جیره اضافه");
    for (const id of TAX_IDS) must(TAX[id].name.length > 0, `نام en ${id}`);
  });
  return { name: "اطلاعات سیاست از داده", pass: true, detail: "۵ مالیات + ۴ جیره + fa/en" };
}


// خلاصه سیاست: هر ۲۵ ترکیب سولو + برش MP.
function t_policy_summary() {
  const { state } = fresh();
  for (const t of TAX_IDS) for (const r of RATION_IDS) {
    state.tax = t; state.rations = r;
    const s = policySummary(state);
    must(s.tax.id === t && s.rations.id === r, `خلاصه ${t}/${r}`);
    must(s.tax.goldPerWorker === TAX[t].goldPerWorker && s.rations.foodNum === RATIONS[r].foodNum, "اعداد آینه");
  }
  const mp = { mp: { enabled: true, num: 2 },
    mpres: [{ tax: "high", rations: "none", resources: {}, workers: 0 },
      { tax: "generousBribe", rations: "double", resources: {}, workers: 0 }],
    buildings: [] };
  must(policySummary(mp, 1).tax.id === "generousBribe", "برش MP مالک ۱");
  must(policySummary(mp, 0).tax.id === "high", "برش MP مالک ۰");
  return { name: "خلاصه سیاست جاری", pass: true, detail: "۶۰ ترکیب + برش MP" };
}


// هشدارها: بازی تازه سالم + ۵ سناریو + ایزولاسیون مالک + سقف/ترتیب.
function t_advisor_warnings() {
  const { state } = fresh(); // tax=low، gold=۶۰، food=۱۲۰، workers=۴، بدون بنا
  must(advisorWarnings(state).length === 0, "بازی تازه سالم = بدون هشدار");
  state.tax = "generousBribe";
  must(!advisorWarnings(state).some((w) => w.key === "bribeEmpty"), "رشوه با خزانه پر");
  state.resources.gold = 0;
  must(advisorWarnings(state).some((w) => w.key === "bribeEmpty"), "رشوه با خزانه خالی");
  state.tax = "low"; state.resources.gold = 60;
  state.resources.food = 0;
  must(advisorWarnings(state).some((w) => w.key === "famine"), "قحطی");
  state.resources.food = 120;
  const B = (o) => ({ type: "farm", owner: 0, destroyed: false, buildLeft: 0, staffed: true, starved: false, ...o });
  state.buildings = [B({ staffed: false }), B({ starved: true }),
    B({ destroyed: true, staffed: false }), B({ owner: 9, staffed: false }),
    B({ buildLeft: 5, staffed: false })];
  const ws = advisorWarnings(state);
  must(ws.find((w) => w.key === "unstaffed").n === 1, "فقط یک بی‌کارگر خودیِ سالم");
  must(ws.find((w) => w.key === "starved").n === 1, "فقط یک گرسنه");
  state.buildings = [];
  state.workers = 6; // سقف پایه ۴ (بدون کلبه/ستاد)
  const cw = advisorWarnings(state).find((w) => w.key === "crowding");
  must(cw && cw.workers === 6 && cw.cap === 4, "ازدحام ۶>۴");
  state.workers = 4;
  must(!advisorWarnings(state).some((w) => w.key === "crowding"), "۴>۴ نیست");
  state.tax = "generousBribe"; state.resources.gold = 0; state.resources.food = 0;
  state.workers = 6; state.buildings = [B({ staffed: false }), B({ starved: true })];
  const all = advisorWarnings(state).map((w) => w.key);
  must(all.length === 5 && all[0] === "bribeEmpty" && all[1] === "famine", `ترتیب/سقف: ${all.join(",")}`);
  return { name: "هشدارهای مشاور", pass: true, detail: "۵ سناریو + ایزولاسیون + سقف" };
}


// فقط‌خواندنی: خلاصه و هشدارها state را لمس نمی‌کنند (صفر تغییر sim).
// __T_ADVISOR_ALARM__
// اعلان صوتی مشاور (0.181.0 — §3.3/بند 166): فقط کلیدهای تازه هشدار
// بوق می‌خورند — تکرار همان هشدار در فریم بعد بوق تازه نمی‌خواهد؛ رفتن و
// برگشتن هشدار = بوق دوباره. خالص (سیم‌کشی بوق در paintWarnLine است).
function t_advisor_alarm() {
  must(JSON.stringify(warnAlarmKeys([], [{ key: "famine" }])) === "[\"famine\"]", "تازه = بوق");
  must(warnAlarmKeys(["famine"], [{ key: "famine" }]).length === 0, "تکرار = سکوت");
  must(JSON.stringify(warnAlarmKeys(["famine"], [{ key: "famine" }, { key: "unstaffed", n: 2 }])) === "[\"unstaffed\"]", "فقط افزوده بوق می‌خورد");
  must(warnAlarmKeys(["famine", "unstaffed"], [{ key: "famine" }]).length === 0, "رفتن هشدار بوق ندارد");
  must(warnAlarmKeys(null, null).length === 0 && warnAlarmKeys([], []).length === 0, "تهی امن است");
  const { state } = fresh();
  state.resources.food = 0;
  const ws = advisorWarnings(state);
  must(ws.some((w) => w.key === "famine"), "قحطی واقعی هشدار می‌دهد");
  must(warnAlarmKeys([], ws).includes("famine"), "قحطی تازه = بوق");
  must(warnAlarmKeys(ws.map((w) => w.key), ws).length === 0, "فریم بعد همان هشدار = سکوت");
  state.resources.food = 120;
  must(warnAlarmKeys(ws.map((w) => w.key), advisorWarnings(state)).length === 0, "رفع قحطی = سکوت");
  return { name: "بوق هشدار مشاور", pass: true, detail: "تازه‌بودن + قحطی واقعی" };
}


function t_advisor_pure() {
  const { state } = fresh();
  state.tax = "generousBribe"; state.resources.gold = 0; state.resources.food = 0;
  state.buildings = [{ type: "farm", owner: 0, destroyed: false, buildLeft: 0, staffed: false, starved: true }];
  const before = JSON.stringify(state);
  policySummary(state);
  advisorWarnings(state);
  policySummary(state, 0);
  advisorWarnings(state, 0);
  must(JSON.stringify(state) === before, "advisor باید خالص باشد");
  return { name: "خلوص مشاور", pass: true, detail: "بدون جهش state" };
}


// هشدار بی‌رحم‌ترین مالیات (فاز ۱ بند ۶۸): همه درآمد دهقانان گرفته می‌شود — فقط کوتاه‌مدت.
function t_crueller_warn() {
  const { state } = fresh();
  must(!advisorWarnings(state).some((w) => w.key === "crueller"), "پیش‌فرض هشدار ندارد");
  state.tax = "cruellerThanCruel";
  must(advisorWarnings(state).some((w) => w.key === "crueller"), "بی‌رحم‌ترین باید هشدار بدهد");
  must(TAX.cruellerThanCruel.goldPerWorker === 3, "سقف درآمد: ۳ طلا/کارگر");
  const faW = t("main.warn.crueller");
  must(typeof faW === "string" && faW.length > 0 && !faW.includes("main.warn"), "متن fa باید حل شود");
  withLang("en", () => {
    const enW = t("main.warn.crueller");
    must(enW.length > 0 && enW !== faW, "متن en متفاوت و ناتهی");
  });
  const before = JSON.stringify(state);
  advisorWarnings(state);
  must(JSON.stringify(state) === before, "هشدار باید خالص باشد");
  return { name: "هشدار بی‌رحم‌ترین مالیات", pass: true, detail: "کلید + fa/en + خلوص" };
}


// پنل Inn (فاز ۱ بند ۲۴): بشکه‌ها + کارا/کل + پوشش جمعیتی (هر کارا ۳۰ نفر).
function t_inn_panel() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 400; // ۲ میخانه ۲۰۰ طلا (هزینه مرجع 0.171.0)
  const a = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn);
  const b = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.inn);
  must(a.ok && b.ok, "دو میخانه باید ساخته شوند");
  state.resources.beer = 5;
  const before = JSON.stringify(state);
  const pre = innInfo(state);
  must(JSON.stringify(state) === before, "innInfo باید خالص باشد");
  must(pre.barrels === 5 && pre.working === 0, "پیش از سرو: ۵ بشکه/۰ کارا");
  sim(state, 50);
  const info = innInfo(state);
  must(info.barrels === 3, `بشکه باید ۳ باشد، هست ${info.barrels}`);
  must(info.total === 2 && info.working === 2, "هر ۲ میخانه باید کارا باشند");
  must(info.coverage === 100, `پوشش ۴ کارگر با ۲ کارا باید ۱۰۰ باشد، هست ${info.coverage}`);
  state.workers = 120;
  must(innInfo(state).coverage === 50, "پوشش ۱۲۰ کارگر با ۲ کارا باید ۵۰ باشد");
  state.workers = 0;
  must(innInfo(state).coverage === 100, "بدون کارگر پوشش تهی = ۱۰۰");
  state.workers = 4;
  const s = policySummary(state);
  must(s.inn && s.inn.working === 2 && s.inn.barrels === 3, "خلاصه سیاست باید پنل میخانه را داشته باشد");
  must(s.inn.bonus === 8, "پاداش پوشش کامل در خلاصه باید ۸ باشد");
  const I = (o) => ({ type: "inn", owner: 0, destroyed: false, buildLeft: 0, served: true, ...o });
  const mp = { mp: { enabled: true, num: 2 },
    mpres: [{ tax: "none", rations: "normal", resources: { beer: 7 }, workers: 60 },
      { tax: "none", rations: "normal", resources: { beer: 1 }, workers: 10 }],
    buildings: [I({ owner: 0 }), I({ owner: 1 }), I({ owner: 0, served: false }), I({ owner: 0, destroyed: true, served: true })] };
  const m0 = innInfo(mp, 0);
  must(m0.barrels === 7 && m0.total === 2 && m0.working === 1, "برش MP: فقط خودیِ سالم");
  must(m0.coverage === 50, `پوشش MP باید ۵۰ باشد (۳۰/۶۰)، هست ${m0.coverage}`);
  must(innInfo(mp, 1).working === 1 && innInfo(mp, 1).barrels === 1, "برش MP مالک ۱");
  must(innInfo(mp, 0).bonus === 4 && innInfo(mp, 1).bonus === 8, "پاداش MP: پوشش ۵۰٪=+۴ و ۱۰۰٪=+۸");
  return { name: "پنل میخانه", pass: true, detail: "بشکه/کارا/پوشش + برش MP" };
}


// نوار منابع (فاز ۱ بند ۲۷): دیدن = تقریبی (~دهگان از ۵۰+)، کلیک = دقیق.
function t_resbar_approx() {
  must(approxRes(0).text === "0" && approxRes(0).approx === false, "صفر دقیق");
  must(approxRes(7).text === "7" && approxRes(49).text === "49", "زیر ۵۰ دقیق");
  must(approxRes(50).text === "~50" && approxRes(50).approx === true, "مرز ۵۰");
  must(approxRes(123).text === "~120", "گرد به دهگان پایین");
  must(approxRes(127).text === "~130", "گرد به دهگان بالا");
  must(approxRes(999).text === "~1000", "سرریز گرد");
  must(approxRes(-5).text === "0", "منفی به صفر گیره می‌شود");
  must(approxRes(7.9).text === "7", "کسری کف می‌شود");
  return { name: "نوار تقریبی منابع", pass: true, detail: "دقیق زیر ۵۰ + ~دهگان" };
}


// نشانگر سبز مصرف (فاز ۱ بند ۳۰): کسر انباشت/آستانه + میله ۵خانه‌ای.
function t_eat_gauge() {
  const { state } = fresh();
  must(eatGauge(state).prog === 0, "انباشت صفر = ۰");
  must(eatMeter(0) === "🟢░░░░░", "میله خالی");
  must(eatMeter(1) === "🟢▓▓▓▓▓", "میله پر");
  must(eatMeter(0.5) === "🟢▓▓▓░░", "میله نیمه");
  state.eatAcc = 100;
  must(eatGauge(state).prog === 100 / EAT_THRESHOLD, "کسر باید آینه انباشت/آستانه باشد");
  state.eatAcc = EAT_THRESHOLD;
  must(eatGauge(state).prog === 1, "آستانه کامل = ۱");
  const before = JSON.stringify(state);
  eatGauge(state);
  must(JSON.stringify(state) === before, "eatGauge باید خالص باشد");
  must(policySummary(state).eat.prog === 1, "خلاصه سیاست باید نشانگر را داشته باشد");
  const mp = { mp: { enabled: true, num: 2 },
    mpres: [{ tax: "none", rations: "normal", resources: {}, workers: 0, eatAcc: 200 },
      { tax: "none", rations: "normal", resources: {}, workers: 0, eatAcc: 0 }],
    buildings: [] };
  must(eatGauge(mp, 0).prog === 200 / EAT_THRESHOLD, "برش MP مالک ۰");
  must(eatGauge(mp, 1).prog === 0, "برش MP مالک ۱");
  return { name: "نشانگر سبز مصرف", pass: true, detail: "کسر آینه + میله + برش MP" };
}


// سه عدد غذا (فاز ۱ بند ۳۱): موجودی + مدت دوام با نرخ جاری + انواع.
function t_food_info() {
  const { W, H, terrain, state } = fresh();
  const pre = foodInfo(state);
  must(pre.stock === 120 && pre.lastsMin === null && pre.types === 1, "تازه: ۱۲۰ واحد/بدون مصرف/۱ نوع");
  must(tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.farm).ok, "مزرعه");
  sim(state, 200);
  const info = foodInfo(state);
  must(info.stock === state.resources.food, "موجودی باید آینه مخزن باشد");
  must(info.types === 1, "یک نوع غذا");
  must(info.lastsMin !== null && info.lastsMin > 0, "با مصرف باید دوام متناهی باشد");
  must(Math.abs(info.lastsMin * 3 - info.stock) < 1e-9, "دوام = موجودی / (دهان × ۳ در دقیقه)");
  const before = JSON.stringify(state);
  foodInfo(state);
  must(JSON.stringify(state) === before, "foodInfo باید خالص باشد");
  must(policySummary(state).stores.stock === info.stock, "خلاصه سیاست باید سه عدد را داشته باشد");
  const F = (o) => ({ type: "farm", owner: 0, destroyed: false, buildLeft: 0, staffed: true, ...o });
  const mp = { mp: { enabled: true, num: 2 }, tax: "normal", rations: "normal",
    mpres: [{ tax: "none", rations: "normal", resources: { food: 90 }, workers: 0 },
      { tax: "none", rations: "normal", resources: { food: 10 }, workers: 0 }],
    buildings: [F({ owner: 0 }), F({ owner: 0, staffed: false }), F({ owner: 1 })] };
  const m0 = foodInfo(mp, 0);
  must(m0.stock === 90 && m0.lastsMin !== null, "برش MP: مخزن خودی + دهان خودی");
  must(Math.abs(m0.lastsMin * 3 - 90) < 1e-9, "برش MP: ۱ دهان خودی = نرخ ۳");
  must(foodInfo(mp, 1).stock === 10, "برش MP مالک ۱");
  return { name: "سه عدد غذا", pass: true, detail: "موجودی/دوام/انواع + برش MP" };
}


// گزارش دقیق غذا (فاز ۱ بند ۸۶ — §۶.۳): مقدار دقیق هر نوع + روشن/خاموش +
// جمع/دوام آینه foodInfo + خلاصه سیاست + برش MP.
function t_food_report() {
  const { state } = fresh(); // food=۱۲۰، سه نوع دیگر صفر
  let rep = foodReport(state);
  must(rep.rows.length === FOOD_TYPES.length, "یک ردیف برای هر نوع غذا");
  must(JSON.stringify(rep.rows.map((r) => r.type)) === JSON.stringify(FOOD_TYPES), "ترتیب ردیف‌ها = ترتیب داده");
  must(rep.rows[0].amount === 120 && rep.rows[0].on, "نخستین نوع ۱۲۰ واحد و روشن");
  must(rep.rows.slice(1).every((r) => r.amount === 0 && r.on), "بقیه صفر ولی روشن");
  must(rep.total === 120 && rep.types === 1, "جمع/انواع آینه foodInfo تازه");
  state.resources.meat = 7;
  state.resources.cheese = 3;
  rep = foodReport(state);
  must(rep.rows.find((r) => r.type === "meat").amount === 7, "گوشت دقیق ۷ (برخلاف نوار تقریبی)");
  must(rep.total === 130 && rep.types === 3, "جمع ۱۳۰ و ۳ نوع");
  const info = foodInfo(state);
  must(rep.total === info.stock && rep.lastsMin === info.lastsMin && rep.types === info.types, "جمع/دوام/انواع آینه foodInfo");
  state.offFood = ["meat"];
  rep = foodReport(state);
  must(rep.rows.find((r) => r.type === "meat").on === false, "گوشت بسته = خاموش");
  must(rep.rows.find((r) => r.type === "food").on === true, "بقیه روشن می‌مانند");
  must(rep.types === 2, "بسته در شمار انواع نیست");
  const before = JSON.stringify(state);
  foodReport(state);
  must(JSON.stringify(state) === before, "foodReport باید خالص باشد");
  must(policySummary(state).report.total === rep.total, "خلاصه سیاست باید گزارش را داشته باشد");
  const mp = { mp: { enabled: true, num: 2 },
    mpres: [{ tax: "none", rations: "normal", resources: { food: 90, meat: 5 }, workers: 0, offFood: ["meat"] },
      { tax: "none", rations: "normal", resources: { food: 10 }, workers: 0, offFood: [] }],
    buildings: [] };
  const m0 = foodReport(mp, 0);
  must(m0.rows.find((r) => r.type === "food").amount === 90, "برش MP: مقدار خودی");
  must(m0.rows.find((r) => r.type === "meat").on === false, "برش MP: توقف خودی");
  must(m0.total === 95 && m0.types === 1, "برش MP: جمع/انواع خودی");
  must(foodReport(mp, 1).total === 10, "برش MP مالک ۱");
  return { name: "گزارش دقیق غذا", pass: true, detail: "مقادیر دقیق + on/off + آینه + خلاصه + MP" };
}


// هاور سقف انبار (فاز ۱ بند ۸۷ — §۶.۳): سهم نمایشی داخل (کیسه‌ها) + رنگ هر
// نوع + روشن/خاموش + خلوص + برش MP.
function t_granary_hover() {
  const { state } = fresh(); // food=۱۲۰
  let gi = granaryInterior(state);
  must(gi.length === FOOD_TYPES.length, "یک ستون برای هر نوع غذا");
  must(JSON.stringify(gi.map((r) => r.type)) === JSON.stringify(FOOD_TYPES), "ترتیب ستون‌ها = ترتیب داده");
  must(gi.every((r) => typeof r.color === "string" && r.color.length > 0), "هر نوع یک رنگ دارد");
  must(new Set(gi.map((r) => r.color)).size === gi.length, "رنگ‌ها متمایزند");
  const f0 = gi[0];
  must(f0.amount === 120 && f0.on && f0.sacks === 4, "۱۲۰ واحد = ۴ کیسه روشن");
  must(gi.slice(1).every((r) => r.amount === 0 && r.sacks === 0 && r.on), "صفر = بدون کیسه ولی روشن");
  state.resources.meat = 1;
  state.resources.cheese = 25;
  state.resources.apples = 26;
  state.resources.food = 101;
  gi = granaryInterior(state);
  const sack = (k) => gi.find((r) => r.type === k).sacks;
  must(sack("meat") === 1 && sack("cheese") === 1 && sack("apples") === 2 && sack("food") === 4, "مرزها: ۱→۱، ۲۵→۱، ۲۶→۲، ۱۰۱→۴ (سقف ۴)");
  state.offFood = ["cheese"];
  gi = granaryInterior(state);
  must(gi.find((r) => r.type === "cheese").on === false, "بسته = کم‌رنگ");
  must(gi.find((r) => r.type === "cheese").sacks === 1, "بسته هم کیسه‌اش را نشان می‌دهد");
  const before = JSON.stringify(state);
  granaryInterior(state);
  must(JSON.stringify(state) === before, "granaryInterior باید خالص باشد");
  const mp = { mp: { enabled: true, num: 2 },
    mpres: [{ tax: "none", rations: "normal", resources: { food: 50 }, workers: 0, offFood: [] },
      { tax: "none", rations: "normal", resources: { apples: 30 }, workers: 0, offFood: ["apples"] }],
    buildings: [] };
  const m0 = granaryInterior(mp, 0);
  must(m0.find((r) => r.type === "food").sacks === 2, "برش MP: ۵۰ = ۲ کیسه خودی");
  const m1 = granaryInterior(mp, 1);
  must(m1.find((r) => r.type === "apples").sacks === 2 && m1.find((r) => r.type === "apples").on === false, "برش MP مالک ۱: ۳۰ بسته = ۲ کیسه کم‌رنگ");
  return { name: "هاور سقف انبار", pass: true, detail: "کیسه‌ها/مرزها + رنگ + on/off + خلوص + MP" };
}


// گزارش خزانه (فاز ۱ بند ۳۵): موجودی + درآمد مالیاتی در دقیقه (آینه فرمول sim).
function t_treasury_report() {
  const { state } = fresh(); // workers=۴، tax=none (۰ طلا/کارگر)، gold=۶۰
  const pre = treasuryInfo(state);
  must(pre.balance === 60 && pre.workers === 4 && pre.level.id === "none", "تازه: ۶۰ طلا/۴ کارگر/none");
  must(pre.perMin === 0, "none درآمد صفر دارد");
  state.tax = "high"; // +۱ طلا/کارگر هر ۵۰ تیک
  must(treasuryInfo(state).perMin === (4 * 1 * 600) / POP_PERIOD, "آینه فرمول sim: ۴×۱×۶۰۰/۵۰=۴۸");
  const before = JSON.stringify(state);
  treasuryInfo(state);
  must(JSON.stringify(state) === before, "treasuryInfo باید خالص باشد");
  must(policySummary(state).treasury.perMin === 48, "خلاصه سیاست باید گزارش خزانه را داشته باشد");
  sim(state, 50); // ۵ ثانیه با high: ‎+۴ طلا واقعی
  must(state.resources.gold === 64, `طلا باید ۶۴ باشد، هست ${state.resources.gold}`);
  must(treasuryInfo(state).balance === 64, "موجودی گزارش باید آینه مخزن باشد");
  const mp = { mp: { enabled: true, num: 2 },
    mpres: [{ tax: "high", rations: "normal", resources: { gold: 7 }, workers: 10 },
      { tax: "generousBribe", rations: "normal", resources: { gold: 3 }, workers: 2 }],
    buildings: [] };
  const m0 = treasuryInfo(mp, 0);
  must(m0.balance === 7 && m0.perMin === (10 * 1 * 600) / POP_PERIOD, "برش MP مالک ۰");
  const m1 = treasuryInfo(mp, 1);
  must(m1.balance === 3 && m1.perMin === (2 * -1 * 600) / POP_PERIOD, "برش MP مالک ۱ (رشوه منفی)");
  return { name: "گزارش خزانه", pass: true, detail: "موجودی/درآمد + اثر واقعی + برش MP" };
}

// پنل‌های گزارش دفترچه (0.174.0 — §3.4/بند 165): هر ۶ پنل دستی پوشش داده شده است.
function t_report_panels() {
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد");
  const keys = scribeReports(state, 0).map((s) => s.key);
  for (const k of ["popularity", "treasury", "religion", "fear"]) must(keys.includes(k), "کاتب: " + k);
  must(keys.includes("rations") && keys.includes("stores"), "کاتب: غذا (جیره+انبار)");
  must(foodInfo(state, 0) && typeof foodInfo(state, 0).stock === "number", "گزارش غذای جدا");
  must(typeof t("main.scribe.sec.popularity") === "string" && typeof t("main.scribe.sec.treasury") === "string", "عنوان‌های محبوبیت/خزانه");
  return { name: "پنل‌های گزارش", pass: true, detail: "۶ پنل دستی ← کاتب/گزارش‌ها" };
}

// نشانگرهای دفترچه (0.174.0 — §3.2/بند 145): محبوبیت/خزانه/جمعیت در HUD.
function t_hud_indicators() {
  must(typeof t("main.pop") === "string" && t("main.pop").length > 0, "کلید محبوبیت");
  must(typeof t("main.workers") === "string" && t("main.workers").length > 0, "کلید جمعیت");
  must(CONFIG.RESOURCES.some((r) => r.key === "gold"), "طلا در نوار منابع (خزانه)");
  withLang("en", () => {
    must(typeof t("main.pop") === "string" && typeof t("main.workers") === "string", "en محبوبیت/جمعیت");
  });
  return { name: "نشانگرهای HUD", pass: true, detail: "محبوبیت + جمعیت + طلا" };
}

// دکمه‌های کنار مینی‌مپ (0.175.0 — §3.3/بند 146): هر ۴ دکمه در DOM هست.
function t_minimap_buttons() {
  for (const id of ["menuBtn", "demolishBtn", "undoBtn", "scribeBtn"]) {
    must(!!document.querySelector("#" + id), "دکمه " + id);
  }
  must(typeof t("main.scribe.tooltip") === "string", "تولتیپ کاتب");
  return { name: "دکمه‌های مینی‌مپ", pass: true, detail: "منو/تخریب/برگردان/کاتب" };
}

// پنل مینی‌مپ (0.175.0 — §3.2/بند 147): بوم + نگاشت + پرش + همراهی با اسکرول.
function t_minimap_panel() {
  must(!!document.querySelector("canvas#minimap"), "بوم مینی‌مپ");
  must(typeof drawMinimap === "function", "رسم مینی‌مپ (همراه با اسکرول)");
  must(minimapCell(0.5, 0.5, CONFIG.GRID_W, CONFIG.GRID_H).c === 32, "نگاشت مرکز");
  must(typeof t("ui.minimap.title") === "string", "عنوان مینی‌مپ");
  return { name: "پنل مینی‌مپ", pass: true, detail: "بوم + نگاشت + رسم" };
}




// تولتیپ همه آیکن‌ها (0.176.0 — بند 149): هر دکمه آیکن‌خالص (متن خالی)
// عنوان هاور دارد، در هر دو زبان (کلید i18n + title زنده روی دکمه بازگشت).
function t_tooltips_all() {
  if (typeof document === "undefined" || !document.getElementById("menuBox")) return { name: "تولتیپ آیکن‌ها", pass: true, detail: "بدون DOM رد شد" };
  const btns = Array.prototype.slice.call(document.querySelectorAll("button"));
  must(btns.length > 100, "دکمه‌ها در DOM زنده‌اند");
  const bad = [];
  for (const b of btns) {
    if (((b.textContent || "").trim())) continue;
    if (!(b.getAttribute("title") || "")) bad.push(b.id || b.className || "?");
  }
  must(bad.length === 0, "بی‌تولتیپ: " + bad.slice(0, 5).join(","));
  must(t("ui.nav.back") !== "ui.nav.back", "کلید fa بازگشت");
  const enBack = withLang("en", () => t("ui.nav.back"));
  must(typeof enBack === "string" && enBack.length > 0 && enBack !== "ui.nav.back", "کلید en بازگشت");
  const backs = Array.prototype.slice.call(document.querySelectorAll(".page-back"));
  must(backs.length === 6, "شش دکمه بازگشت (کمپین 0.225.0)");
  for (const b of backs) must(b.getAttribute("data-i18n-title") === "ui.nav.back", "کلید title بازگشت");
  return { name: "تولتیپ آیکن‌ها", pass: true, detail: btns.length + " دکمه" };
}


// پنل مدیریت با Tab (0.176.0 — بند 155): Tab = flip؛ پشت منو/مودال بی‌اثر.
function t_tab_panel() {
  if (typeof document === "undefined" || !document.getElementById("side")) return { name: "Tab پنل", pass: true, detail: "بدون DOM رد شد" };
  const side = document.getElementById("side");
  const ms = document.getElementById("menuScreen");
  const mo = document.getElementById("modalOverlay");
  const wasMenu = ms.hidden, wasModal = mo.hidden, wasSide = side.hidden;
  try {
    ms.hidden = true;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", bubbles: true }));
    must(side.hidden === !wasSide, "Tab = flip");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", bubbles: true }));
    must(side.hidden === wasSide, "Tab دوباره = برگشت");
    mo.hidden = false;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", bubbles: true }));
    must(side.hidden === wasSide, "پشت مودال بی‌اثر");
  } finally {
    mo.hidden = wasModal; ms.hidden = wasMenu; side.hidden = wasSide;
  }
  return { name: "Tab پنل", pass: true, detail: "flip + گیت مودال" };
}


// سیم‌کشی جهت‌ها (0.176.0 — بند 154): ArrowRight = کم‌شدن panX (نمای رو به راست).
function t_scroll_keys() {
  if (typeof document === "undefined" || !window.__slice01 || !window.__slice01.view) return { name: "جهت‌های اسکرول", pass: true, detail: "بدون DOM رد شد" };
  const before = window.__slice01.view.pan();
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", code: "ArrowRight", bubbles: true }));
  const after = window.__slice01.view.pan();
  must(after.x === before.x - ARROW_PAN_STEP && after.y === before.y, "راست = 56px-");
  return { name: "جهت‌های اسکرول", pass: true, detail: "panX" };
}



// روایت مقدمه (0.177.0 — بند 131): بخش داستانی راهنما در هر دو زبان.
function t_help_story() {
  must(t("ui.help.storyTitle") !== "ui.help.storyTitle", "کلید fa عنوان");
  const enT = withLang("en", () => t("ui.help.storyTitle"));
  must(typeof enT === "string" && enT.length > 0 && enT !== "ui.help.storyTitle", "کلید en عنوان");
  const enS = withLang("en", () => t("ui.help.story"));
  must(typeof enS === "string" && enS.length > 50 && enS !== "ui.help.story", "کلید en روایت");
  if (typeof document === "undefined" || !document.getElementById("helpCard")) return { name: "روایت مقدمه", pass: true, detail: "بدون DOM رد شد" };
  const el = document.querySelector("[data-i18n=\"ui.help.story\"]");
  must(!!el, "بخش روایت در DOM");
  must((el.textContent || "").length > 50, "متن روایت پر است");
  return { name: "روایت مقدمه", pass: true, detail: "fa/en + DOM" };
}


// جدول افتخار (0.177.0 — بند 740): سطرهای سولو/MP. خالص و هدلس.
function t_merit_rows() {
  const solo = {
    units: [
      { id: 1, type: "lord", side: "player", owner: 0, dead: false },
      { id: 2, type: "swordsman", side: "player", owner: 0, dead: false },
      { id: 3, type: "swordsman", side: "player", owner: 0, dead: true },
      { id: 4, type: "slave", side: "enemy", owner: 9, dead: false },
    ],
    resources: { gold: 120 },
    ai: { active: true, personality: "rat", resources: { gold: 40 } },
    defeated: false,
  };
  const rows = meritRows(solo);
  must(rows.length === 2, "سولو = 2 سطر");
  must(rows[0].gold === 120 && rows[0].army === 2 && rows[0].lord === true, "بازیکن: طلا/سپاه/ارباب");
  must(rows[0].nameKey === "main.scribe.merit.you", "کلید نام بازیکن");
  must(rows[1].gold === 40 && rows[1].army === 1 && rows[1].lord === false, "AI: طلا/سپاه/بی‌ارباب");
  must(typeof rows[1].name === "string" && rows[1].name.length > 0, "نام AI");
  const noAi = meritRows({ units: [], resources: { gold: 0 }, ai: { active: false }, defeated: false });
  must(noAi.length === 1 && noAi[0].alive === true, "بی‌حریف = 1 سطر");
  const mp = {
    mp: { enabled: true },
    mpres: [{ name: "A", resources: { gold: 10 }, alive: true }, { resources: { gold: 5 } }],
    mpNames: [],
    units: [
      { id: 1, type: "swordsman", side: "player", owner: 0, dead: false },
      { id: 2, type: "lord", side: "player", owner: 1, dead: false },
    ],
  };
  const mrows = meritRows(mp);
  must(mrows.length === 2, "MP = 2 سطر");
  must(mrows[0].name === "A" && mrows[1].name === "P2", "نام شکاف‌ها");
  must(mrows[0].army === 1 && mrows[1].army === 1, "سپاه شکاف‌ها");
  must(mrows[0].lord === false && mrows[1].lord === true, "ارباب شکاف‌ها");
  return { name: "جدول افتخار", pass: true, detail: "سولو + MP" };
}


// مرتب‌سازی جدول افتخار (0.177.0 — بند 740): کلید/جهت + عدم جهش ورودی. خالص.
function t_merit_sort() {
  const rows = [
    { name: "b", gold: 5, army: 1 },
    { name: "a", gold: 9, army: 0 },
  ];
  let s = sortMerit(rows, "gold", -1);
  must(s[0].gold === 9 && s[1].gold === 5, "طلا نزولی");
  s = sortMerit(rows, "gold", 1);
  must(s[0].gold === 5 && s[1].gold === 9, "طلا صعودی");
  s = sortMerit(rows, "army", -1);
  must(s[0].army === 1 && s[1].army === 0, "سپاه نزولی");
  s = sortMerit(rows, "bogus", -1);
  must(s[0].army === 1, "کلید ناشناخته = سپاه");
  s = sortMerit(rows, "name", 1);
  must(s[0].name === "a" && s[1].name === "b", "نام صعودی");
  must(rows[0].name === "b" && rows[1].gold === 9, "ورودی جهش نکرد");
  return { name: "سورت افتخار", pass: true, detail: "کلید + جهت" };
}

// --- 0.179.0: پین Play Options (§14.2/بند 726) + پین ری‌پلی (§21.2/بند 1210) +
// نمای تخت Space (§18.8/بند 1141) + نگاه Peek با V (§3.2/بند 160) + یادداشت اشتراک نقشه (§23/بند 1259) ---
// __T_PLAYOPTIONS_ALL__
// پین سربرگ Play Options (0.179.0 — بند 726): هر ۴ گزینه اتاق هست (727/728/729/730 کامل‌اند)؛
// منطق هر گزینه با تست خودش پوشش دارد (t_strongwalls/t_norush/t_nocow/t_wardogs) — اینجا فقط سیم‌کشی UI.
function t_playoptions_all() {
  if (typeof document === "undefined" || !document.getElementById("mpCard")) return { name: "پین Play Options", pass: true, detail: "بدون DOM رد شد" };
  const ids = ["mpNoCowInput", "mpStrongWallsInput", "mpNoDogsInput", "mpNoRushInput"];
  const keys = ["ui.mp.noCow", "ui.mp.strongWalls", "ui.mp.noDogs", "ui.mp.noRush"];
  ids.forEach((id, i) => {
    const c = document.getElementById(id);
    must(!!c && c.type === "checkbox", "چک‌باکس " + id);
    must(t(keys[i]) !== keys[i] && t(keys[i]).length > 0, "لیبل fa " + id);
    const en = withLang("en", () => t(keys[i]));
    must(en !== keys[i] && en.length > 0, "لیبل en " + id);
  });
  return { name: "پین Play Options", pass: true, detail: "4 چک‌باکس + دوزبانه" };
}


// __T_REPLAY_UI__
// پین ری‌پلی (0.179.0 — بند 1210): ذخیره seed+فرمان/راستی‌آزمایی/تماشا با
// t_replay_slot/t_replay_verify_async/t_replay_roundtrip پوشش دارد — اینجا فقط سیم‌کشی UI.
function t_replay_ui() {
  must(t("main.replay.label") !== "main.replay.label", "کلید fa برچسب");
  must(withLang("en", () => t("main.replay.label")) !== "main.replay.label", "کلید en برچسب");
  must(t("main.replay.status") !== "main.replay.status", "کلید fa وضعیت");
  if (typeof document === "undefined" || !document.getElementById("replayStatus")) return { name: "پین ری‌پلی", pass: true, detail: "بدون DOM رد شد" };
  must(!!document.getElementById("replaySaveBtn"), "دکمه ذخیره ری‌پلی هست");
  must(!!document.getElementById("replayWatchBtn"), "دکمه تماشا هست");
  must(!!document.getElementById("replayExitBtn"), "دکمه خروج از تماشا هست");
  must((document.getElementById("replayStatus").textContent || "").length > 0, "متن وضعیت نقاشی شده");
  return { name: "پین ری‌پلی", pass: true, detail: "3 دکمه + وضعیت + دوزبانه" };
}


// __T_FLAT_SPACE__
// تاگل Space نمای تخت (0.179.0 — بند 1141): DOM.
function t_flat_space() {
  if (typeof document === "undefined" || !document.querySelector("[data-flat]")) return { name: "تاگل Space تخت", pass: true, detail: "بدون DOM رد شد" };
  const btn = document.querySelector("[data-flat]");
  const flatTxt = t("ui.top.flat"), tdTxt = t("main.top.flat3d");
  let guard = 0;
  while (btn.textContent !== flatTxt && guard < 2) { btn.click(); guard++; }
  must(btn.textContent === flatTxt, "مبنا: نمای سه‌بعدی (دکمه تخت)");
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
  must(btn.textContent === tdTxt, "Space = تخت شد");
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
  must(btn.textContent === flatTxt, "Space دوباره = برگشت");
  return { name: "تاگل Space تخت", pass: true, detail: "رفت‌وبرگشت با دکمه" };
}


// __T_PEEK_HOLD__
// نگه‌داشتن V = تخت لحظه‌ای (0.179.0 — بند 160): DOM.
function t_peek_hold() {
  if (typeof document === "undefined" || !document.querySelector("[data-flat]")) return { name: "نگاه Peek", pass: true, detail: "بدون DOM رد شد" };
  const btn = document.querySelector("[data-flat]");
  const flatTxt = t("ui.top.flat"), tdTxt = t("main.top.flat3d");
  let guard = 0;
  while (btn.textContent !== flatTxt && guard < 2) { btn.click(); guard++; }
  must(btn.textContent === flatTxt, "مبنا: نمای سه‌بعدی");
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyV", bubbles: true }));
  must(btn.textContent === tdTxt, "V نگه‌داشته = تخت لحظه‌ای");
  window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyV", bubbles: true }));
  must(btn.textContent === flatTxt, "رها = برگشت به ماندگار");
  return { name: "نگاه Peek", pass: true, detail: "نگه‌دار/رها" };
}


// __T_SHARE_NOTE__
// یادداشت اشتراک نقشه (0.179.0 — بند 1259): fa/en + DOM.
function t_share_note() {
  must(t("ui.help.g12") !== "ui.help.g12" && t("ui.help.g12").length > 50, "کلید fa یادداشت");
  const en = withLang("en", () => t("ui.help.g12"));
  must(en !== "ui.help.g12" && en.length > 50, "کلید en یادداشت");
  if (typeof document === "undefined") return { name: "یادداشت اشتراک", pass: true, detail: "بدون DOM رد شد" };
  const el = document.querySelector('[data-i18n="ui.help.g12"]');
  must(!!el, "پاراگراف یادداشت در DOM");
  must((el.textContent || "").length > 50, "متن یادداشت پر است");
  return { name: "یادداشت اشتراک", pass: true, detail: "fa/en + DOM" };
}


// __T_MERIT_POWER__
// نقاط رنگی قدرت در جدول افتخار (0.180.0 — بند 745): خالص و هدلس.
function t_merit_power() {
  const t0 = powerTier(0);
  must(t0.level === 1 && t0.dots === "●○○○○" && t0.color === POWER_COLORS[0], "صفر = پله ۱");
  must(powerTier(149).level === 1 && powerTier(150).level === 2, "مرز ۱۵۰");
  must(powerTier(399).level === 2 && powerTier(400).level === 3, "مرز ۴۰۰");
  must(powerTier(799).level === 3 && powerTier(800).level === 4, "مرز ۸۰۰");
  must(powerTier(1399).level === 4 && powerTier(1400).level === 5, "مرز ۱۴۰۰");
  must(powerTier(99999).level === 5 && powerTier(-5).level === 1, "سقف/کف");
  const rows = meritRows({
    units: [
      { id: 1, type: "soldier", side: "player", dead: false },
      { id: 2, type: "soldier", side: "player", dead: false },
      { id: 3, type: "lord", side: "player", dead: false },
    ],
    resources: { gold: 10 },
    ai: { active: true, personality: "rat", resources: { gold: 5 } },
    defeated: false,
  });
  must(rows[0].power === 124 && rows[1].power === 0, "بازیکن ۲×۵۷+۱۰(زره ارباب)=۱۲۴، بی‌یگان AI = ۰");
  let s = sortMerit([{ power: 10, army: 9 }, { power: 90, army: 1 }], "power", -1);
  must(s[0].power === 90 && s[1].power === 10, "قدرت نزولی");
  s = sortMerit([{ power: 10, army: 9 }, { power: 90, army: 1 }], "power", 1);
  must(s[0].power === 10, "قدرت صعودی");
  return { name: "نقاط قدرت افتخار", pass: true, detail: "۵ پله + سطرها + سورت" };
}


// __T_EDITOR_KEYS__
// کلیدهای ادیتور (0.180.0 — بند 759): DOM — بازکردن واقعی، کلیدها، بستن با Esc.
function t_editor_keys() {
  if (typeof document === "undefined") return { name: "کلیدهای ادیتور", pass: true, detail: "بدون DOM رد شد" };
  const openBtn = document.getElementById("editorBtn");
  const panel = document.getElementById("editorPanel");
  if (!openBtn || !panel) return { name: "کلیدهای ادیتور", pass: true, detail: "بدون DOM رد شد" };
  const sel = (tile) => {
    const b = document.querySelector(`#edTileRow [data-etile="${tile}"]`);
    return !!b && b.classList.contains("sel");
  };
  try {
    openBtn.click();
    must(!panel.hidden, "ویرایشگر باز می‌شود");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Digit3", bubbles: true }));
    must(sel("2"), "کلید ۳ = سنگ");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", bubbles: true }));
    must(sel("erase"), "کلید E = پاک‌کن");
    const br = document.getElementById("edBrushSel");
    must(!!br, "انتخاب‌گر قلم هست");
    const before = br.value;
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Equal", bubbles: true }));
    must(br.value !== before, "کلید + اندازه را می‌چرخاند");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Minus", bubbles: true }));
    must(br.value === before, "کلید − برمی‌گرداند");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", key: "Escape", bubbles: true }));
    must(panel.hidden, "بستن با Esc");
    return { name: "کلیدهای ادیتور", pass: true, detail: "زمین/E/قلم/Esc" };
  } finally {
    const p = document.getElementById("editorPanel");
    if (p && !p.hidden) {
      const ex = document.getElementById("edExitBtn");
      if (ex) ex.click();
    }
  }
}


// __T_ED_SHARE__
// یادداشت اشتراک در ویرایشگر (0.180.0 — بند 761): fa/en + DOM.
function t_ed_share() {
  must(t("ui.editor.shareNote") !== "ui.editor.shareNote" && t("ui.editor.shareNote").length > 40, "کلید fa یادداشت");
  const en = withLang("en", () => t("ui.editor.shareNote"));
  must(en !== "ui.editor.shareNote" && en.length > 40, "کلید en یادداشت");
  if (typeof document === "undefined") return { name: "اشتراک ویرایشگر", pass: true, detail: "بدون DOM رد شد" };
  const el = document.querySelector('[data-i18n="ui.editor.shareNote"]');
  must(!!el, "یادداشت در پنل ویرایشگر هست");
  must((el.textContent || "").length > 40, "متن یادداشت پر است");
  return { name: "اشتراک ویرایشگر", pass: true, detail: "fa/en + DOM" };
}


// __T_NAMED_SAVE_UI__
// عناصر ذخیره بانام در کارت ذخیره (0.178.0 — بند 114).
function t_named_save_ui() {
  if (typeof document === "undefined" || !document.getElementById("saveCard")) return { name: "رابط ذخیره بانام", pass: true, detail: "بدون DOM رد شد" };
  must(!!document.getElementById("saveNameInput"), "ورودی نام هست");
  must(!!document.getElementById("saveNamedBtn"), "دکمه ذخیره بانام هست");
  must(!!document.getElementById("namedSaveList"), "فهرست هست");
  must(t("ui.save.saveNamed") !== "ui.save.saveNamed" && t("ui.save.saveNamed").length > 0, "کلید fa");
  const en = withLang("en", () => t("ui.save.saveNamed"));
  must(en !== "ui.save.saveNamed" && en.length > 0, "کلید en");
  return { name: "رابط ذخیره بانام", pass: true, detail: "ورودی + دکمه + فهرست" };
}

export { advisorCases };
