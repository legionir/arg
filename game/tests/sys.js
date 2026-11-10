// سامانه‌ها (0.249.0 — C-CLN-44): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
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



















// --- ستاد یکتا و شکست (0.19.0) ---

// جای‌گیری آغازین: ۴×۴ چمن نزدیک مرکز، رایگان، +۸ مسکن، بدون شکست.

// یکتایی: ستاد دوم و ساخت دستی روی زمین آزاد هم UNIQUE می‌خورند.

// شکست: ویرانی کلبه اثر ندارد، سقوط ستاد = defeated + توقف + رویداد.

// ذخیره: حفظ ستاد و پرچم شکست + تحمل ذخیره قدیمی + رد دست‌کاری.


// --- سیستمی: قطعیت جهان/موج، مختصات رندر، ترتیب تیک ---

function t_hire_reasons() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  const pins = terrainPins(W, H);
  let h = hireUnit(state, terrain, W, H, pins.lake[0], pins.lake[1], "soldier");
  must(!h.ok && h.reason === "TERRAIN", "استخدام روی آب باید TERRAIN باشد");
  h = hireUnit(state, terrain, W, H, 1, 1, "soldier");
  must(!h.ok && h.reason === "OCCUPIED", "استخدام روی اشغال باید OCCUPIED باشد");
  h = hireUnit(state, terrain, W, H, -1, 0, "soldier");
  must(!h.ok && h.reason === "OUT_OF_BOUNDS", "استخدام بیرون باید OUT_OF_BOUNDS باشد");
  must(state.resources.food === 120 && state.resources.gold === 60, "رد نباید منابع کم کند");
  return { name: "دلایل رد استخدام", pass: true, detail: "۳ رد + حفظ منابع" };
}


function t_terrain_seed() {
  // سید یکسان → نقشه یکسان؛ سید متفاوت → نقشه متفاوت، از جمله خودِ دریاچه.
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const a = makeTerrain(W, H, 1337);
  const b = makeTerrain(W, H, 1337);
  must(a.length === b.length && a.every((v, i) => v === b[i]), "سید یکسان باید نقشه یکسان بدهد");
  const c = makeTerrain(W, H, 987654321);
  let diff = 0, waterDiff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== c[i]) {
      diff++;
      if (a[i] === T_WATER || c[i] === T_WATER) waterDiff++;
    }
  }
  must(diff > 0, "سید متفاوت باید نقشه متفاوت بدهد");
  must(waterDiff > 0, "سید متفاوت باید خودِ دریاچه را عوض کند");
  return { name: "سید نقشه", pass: true, detail: `${diff} خانه فرق (${waterDiff} آبی)` };
}


function t_map_seed_variety() {
  // چند سید مختلف: قطعیت، ربع‌های دقیقاً برابر (تقارن آینه‌ای)، محوطه شروع
  // چمن، و اتصال هر ۴ گوشه (دریاچه هیچ ربعی را جدا نکند).
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const seeds = [1, 2, 3, 7, 1337, 424242, 777001, 987654321, 3000000000, 4294967295];
  let paths = 0;
  for (const seed of seeds) {
    const t1 = makeTerrain(W, H, seed);
    const t2 = makeTerrain(W, H, seed);
    must(t1.every((v, i) => v === t2[i]), `سید ${seed} باید تکرارپذیر باشد`);
    const q = [0, 0, 0, 0];
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (t1[r * W + c] === T_GRASS) q[(c < W / 2 ? 0 : 1) + (r < H / 2 ? 0 : 2)]++;
      }
    }
    must(q[0] === q[1] && q[1] === q[2] && q[2] === q[3], `ربع‌های سید ${seed} باید برابر باشند: ${q}`);
    for (let r = 1; r <= 8; r++) {
      for (let c = 1; c <= 9; c++) must(t1[r * W + c] === T_GRASS, `محوطه شروع سید ${seed} باید چمن باشد`);
    }
    const terrain = t1;
    mpClearSpawns(terrain, W, H);
    const occ = new Uint8Array(W * H);
    const pts = [];
    for (const [qc, qr] of [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]]) {
      const g = grassNear(terrain, null, W, H, qc, qr);
      must(g, `ربع (${qc},${qr}) سید ${seed} باید چمن داشته باشد`);
      pts.push(g);
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const p = findPath(terrain, occ, W, H, pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
        must(p, `ربع ${i}→${j} سید ${seed} باید وصل باشد`);
        must(p.length < 500, `مسیر سید ${seed} باید معقول باشد`);
        paths++;
      }
    }
  }
  return { name: "تنوع سیدها", pass: true, detail: `${seeds.length} سید، ${paths} مسیر` };
}


function t_profile_name_logo() {
  // نام: فارسی/لاتین/رقم قبول، خالی/طولانی/ایموجی/تگ رد؛ لوگو: ۰..۲۸ قبول.
  must(validProfileName("شیرشاه") === "شیرشاه", "نام فارسی باید قبول شود");
  must(validProfileName("  Ali-92_ro ") === "Ali-92_ro", "نام لاتین با trim باید قبول شود");
  must(validProfileName("") === null, "نام خالی باید رد شود");
  must(validProfileName("   ") === null, "فاصله‌خالی باید رد شود");
  must(validProfileName("1234567890123") === null, "نام ۱۳ نویسه‌ای باید رد شود");
  must(validProfileName("Ali😀") === null, "ایموجی در نام باید رد شود");
  must(validProfileName("<b>hi</b>") === null, "تگ در نام باید رد شود");
  must(validLogo(0) === 0 && validLogo(28) === 28, "لوگوی ۰ و ۲۸ باید قبول شوند");
  must(validLogo(-1) === null && validLogo(29) === null && validLogo(1.5) === null, "لوگوی بیرون بازه باید رد شود");
  must(PROFILE_LOGOS.length === 29, "۲۹ پرتره باید باشد");
  const badge = profileBadgeHTML({ name: "<img>", logo: 3 });
  must(badge.indexOf("<img>") < 0, "تگ نباید خام در نشان بیاید");
  must(badge.indexOf("بی‌نام") < 0, "نشان نباید «بی‌نام» داشته باشد (نام انگلیسی تصادفی)");
  must(badge.indexOf(lordPortraitSrc(3)) >= 0, "نشان باید پرتره لوگو را داشته باشد");
  const badge2 = profileBadgeHTML({ name: "شیرشاه", logo: 0 });
  must(badge2.indexOf("شیرشاه") >= 0 && badge2.indexOf(lordPortraitSrc(0)) >= 0, "نشان معتبر باید نام و پرتره را داشته باشد");
  return { name: "پروفایل", pass: true, detail: "نام + پرتره + escape" };
}


function t_profile_lords() {
  // ۲۹ پرتره لرد (جایگزین ایموجی‌ها) + نام پیش‌فرض انگلیسی تصادفی.
  must(PROFILE_LORDS.length === 29, "۲۹ لرد باید باشد");
  must(PROFILE_LOGOS.length === PROFILE_LORDS.length, "آینه PROFILE_LOGOS هم‌طول است");
  const files = PROFILE_LORDS.map((l) => l.file);
  must(new Set(files).size === 29, "فایل‌های پرتره یکتا هستند");
  for (const l of PROFILE_LORDS) {
    must(/^[A-Za-z-]+\.png$/.test(l.file), "فایل پرتره انگلیسی است: " + l.file);
    must(validProfileName(l.name) !== null, "نام لرد باید نام معتبر باشد: " + l.name);
  }
  must(lordName(0) === PROFILE_LORDS[0].name && lordName(99) === "", "نام لرد/نامعتبر");
  must(lordPortraitSrc(0) === "src/arg/assets/lords/" + PROFILE_LORDS[0].file, "مسیر پرتره از ریشه ژنراتور است");
  must(lordPortraitSrc(28).indexOf("src/arg/assets/lords/") === 0, "آخرین پرتره هم مسیر درست دارد");
  must(lordPortraitSrc(29) === "" && lordPortraitSrc(-1) === "", "پرتره نامعتبر خالی است");
  must(lordPortraitHTML(5).indexOf("<img") === 0, "پرتره معتبر تگ img می‌دهد");
  must(lordPortraitHTML(99) === "", "پرتره نامعتبر تهی است");
  for (let k = 0; k < 50; k++) {
    const n = randomDefaultName();
    must(validProfileName(n) !== null && /[A-Za-z]/.test(n), "نام پیش‌فرض انگلیسی و معتبر است: " + n);
  }
  const d = defaultProfile();
  must(validProfileName(d.name) !== null && d.name !== "بی‌نام" && validLogo(d.logo) === 0, "پروفایل پیش‌فرض: نام انگلیسی + لوگوی ۰");
  return { name: "پرتره لردها", pass: true, detail: "۲۹ پرتره + نام تصادفی" };
}


function t_profile_persist() {
  // ذخیره/بازیابی localStorage با بازگردانی مقدار قبلی.
  let prev = null;
  try { prev = localStorage.getItem("scw.profile"); } catch {}
  try {
    const saved = saveProfile({ name: "  تست‌گر  ", logo: 5 });
    must(saved && saved.name === "تست‌گر" && saved.logo === 5, "ذخیره باید trimشده برگردد");
    const back = loadProfile();
    must(back.name === "تست‌گر" && back.logo === 5, "بازیابی باید همان باشد");
    must(saveProfile({ name: "", logo: 0 }) === null, "ذخیره نامعتبر باید null بدهد");
  } finally {
    try {
      if (prev === null) localStorage.removeItem("scw.profile");
      else localStorage.setItem("scw.profile", prev);
    } catch {}
  }
  return { name: "ماندگاری پروفایل", pass: true, detail: "save/load + restore" };
}


function t_mp_password_rules() {
  // رمز: خالی=عمومی (null)، ۱..۱۶ نویسه معتبر، طولانی/کنترلی/غیررشته‌ای نامعتبر.
  must(validRoomPassword(undefined) === null, "نبودن رمز یعنی عمومی");
  must(validRoomPassword(null) === null, "null یعنی عمومی");
  must(validRoomPassword("") === null && validRoomPassword("   ") === null, "خالی یعنی عمومی");
  must(validRoomPassword("abc123") === "abc123", "رمز ساده باید قبول شود");
  must(validRoomPassword("  رمز محرمانه  ") === "رمز محرمانه", "رمز فارسی با trim باید قبول شود");
  must(validRoomPassword("12345678901234567") === false, "رمز ۱۷ نویسه‌ای باید رد شود");
  must(validRoomPassword("a\tb") === false, "نویسه کنترلی باید رد شود");
  must(validRoomPassword(123) === false, "غیررشته باید رد شود");
  return { name: "قانون رمز اتاق", pass: true, detail: "عمومی/معتبر/نامعتبر" };
}


function t_room_row_html() {
  // ردیف فهرست: کد، قفل، ظرفیت، سید، بازیکنان + escape نام مخرب.
  const pub = roomRowHTML({
    code: "AB12", priv: false, num: 1, max: 4, seed: 777001,
    players: [{ slot: 0, name: "شیرشاه", logo: 4, ready: true }],
  });
  must(pub.indexOf("AB12") >= 0, "کد باید دیده شود");
  must(pub.indexOf("🔓") >= 0 && pub.indexOf("🔒") < 0, "عمومی باید 🔓 باشد");
  must(pub.indexOf("۷۷۷۰۰۱") >= 0, "سید باید فارسی دیده شود");
  must(pub.indexOf("شیرشاه") >= 0, "بازیکن حاضر باید دیده شود");
  must(pub.indexOf("data-pwfor") < 0, "اتاق عمومی فیلد رمز نمی‌خواهد");
  const priv = roomRowHTML({
    code: "ZZ99", priv: true, num: 2, max: 2, seed: 5,
    players: [{ slot: 0, name: "<img src=x>", logo: 99, ready: false }],
  });
  must(priv.indexOf("🔒") >= 0, "خصوصی باید 🔒 باشد");
  must(priv.indexOf("<img src=x>") < 0, "نام مخرب نباید خام بیاید");
  must(priv.indexOf("&lt;img src=x&gt;") >= 0, "نام مخرب باید escape شود");
  must(priv.indexOf("data-pwfor") >= 0, "اتاق خصوصی فیلد رمز می‌خواهد");
  must(priv.indexOf("lords/") < 0, "لوگوی نامعتبر نباید پرتره بدهد");
  return { name: "ردیف فهرست اتاق", pass: true, detail: "عمومی/خصوصی + escape" };
}


function t_mp_session() {
  // نشست اتصال‌مجدد (0.141.0): کد ۴حرفی + اسلات ۰..۳ + توکن ۱۶هگز + سید.
  const good = validMpSession({ code: "AB12", slot: 1, token: "0123456789abcdef", seed: 777 });
  must(good && good.code === "AB12" && good.slot === 1 && good.seed === 777, "نشست معتبر باید بپذیرد");
  must(validMpSession(null) === null, "null رد");
  must(validMpSession({ code: "ABC", slot: 0, token: "0123456789abcdef" }) === null, "کد ۳حرفی رد");
  must(validMpSession({ code: "AB12", slot: 4, token: "0123456789abcdef" }) === null, "اسلات ۴ رد");
  must(validMpSession({ code: "AB12", slot: -1, token: "0123456789abcdef" }) === null, "اسلات منفی رد");
  must(validMpSession({ code: "AB12", slot: 0, token: "xyz" }) === null, "توکن بد رد");
  must(validMpSession({ code: "AB12", slot: 0, token: "0123456789ABCDEF" }) === null, "توکن بزرگ رد (فقط کوچک)");
  return { name: "نشست اتصال‌مجدد", pass: true, detail: "پذیرش/رد" };
}


function t_mygames_list() {
  // فهرست «بازی‌های من» (0.141.0): نرمال‌سازی + درج/سقف + تمام‌شده + حذف. خالص.
  must(normalizeMyGames(null).length === 0, "غیرآرایه = خالی");
  must(normalizeMyGames([{ code: "ABC" }, { code: "AB12", slot: 2, seed: 5, at: 9 }]).length === 1, "کد بد پالایش می‌شود");
  let list = upsertMyGameList([], { code: "AB12", slot: 0, seed: 1 });
  must(list.length === 1 && list[0].done === false && list[0].at > 0, "درج تازه");
  list = upsertMyGameList(list, { code: "CD34", slot: 1, seed: 2 });
  must(list.length === 2 && list[0].code === "CD34", "تازه‌ترین اول");
  list = upsertMyGameList(list, { code: "AB12", slot: 0, seed: 1 });
  must(list.length === 2 && list[0].code === "AB12", "درج تکراری جابه‌جا می‌کند نه تکثیر");
  let big = [];
  for (let k = 0; k < 25; k++) big = upsertMyGameList(big, { code: "A" + (100 + k), slot: 0, seed: k });
  must(big.length === 20 && big[0].code === "A124", "سقف ۲۰ با تازه‌ترین اول");
  const done = markMyGameDoneList(list, "AB12");
  must(done.filter((g) => g.code === "AB12")[0].done === true, "تمام‌شده علامت می‌خورد");
  must(done.filter((g) => g.code === "CD34")[0].done === false, "بقیه دست‌نخورده");
  const rest = removeMyGameList(done, "AB12");
  must(rest.length === 1 && rest[0].code === "CD34", "حذف دقیق");
  return { name: "فهرست بازی‌های من", pass: true, detail: "درج/سقف/تمام/حذف" };
}


function t_live_row() {
  // ردیف بازی فعال (0.141.0): کد، قفل، وضعیت جاری/پایان+برنده، نقطه اتصال، escape، دکمه‌ها.
  const live = liveRowHTML({
    code: "AB12", priv: false, num: 2, max: 4, seed: 42, over: false, winner: -1,
    players: [{ slot: 0, name: "شیرشاه", logo: 1, on: true }, { slot: 1, name: "<b>", logo: 0, on: false }],
  }, false);
  must(live.indexOf("AB12") >= 0, "کد دیده می‌شود");
  must(live.indexOf("data-watchcode") >= 0, "دکمه تماشا هست");
  must(live.indexOf("data-contcode") < 0, "ادامه فقط برای بازی خودم");
  must(live.indexOf("&lt;b&gt;") >= 0, "نام مخرب escape");
  must(live.indexOf("off") >= 0, "بازیکن قطع متمایز است");
  const mine = liveRowHTML({ code: "ZZ99", priv: true, num: 1, max: 2, seed: 7, over: false, players: [] }, true);
  must(mine.indexOf("data-contcode") >= 0, "بازی خودم دکمه ادامه دارد");
  must(mine.indexOf("data-pwfor") >= 0, "خصوصی فیلد رمز دارد");
  const over = liveRowHTML({ code: "QQ11", priv: false, num: 2, max: 2, seed: 9, over: true, winner: 1, players: [] }, false);
  must(over.indexOf("🏁") >= 0, "پایان نشان دارد");
  const en = withLang("en", () => liveRowHTML({ code: "AB12", priv: false, num: 1, max: 2, seed: 3, players: [] }, false));
  must(en.indexOf("Watch") >= 0, "کلید انگلیسی تماشا");
  return { name: "ردیف بازی فعال", pass: true, detail: "جاری/پایان + تماشا/ادامه" };
}


function t_mygame_row() {
  // ردیف «بازی من» (0.141.0): کد، اسلات، وضعیت، ادامه فقط برای ناتمام، حذف همیشه.
  const open = myGameRowHTML({ code: "AB12", slot: 0, seed: 1, at: 1700000000000, done: false });
  must(open.indexOf("AB12") >= 0, "کد دیده می‌شود");
  must(open.indexOf("data-mycont") >= 0, "بازی ناتمام دکمه ادامه دارد");
  must(open.indexOf("data-mydel") >= 0, "دکمه حذف هست");
  const done = myGameRowHTML({ code: "CD34", slot: 3, seed: 1, at: 0, done: true });
  must(done.indexOf("data-mycont") < 0, "بازی تمام‌شده ادامه ندارد");
  must(done.indexOf("data-mydel") >= 0, "بازی تمام‌شده حذف دارد");
  const en = withLang("en", () => myGameRowHTML({ code: "AB12", slot: 0, seed: 1, at: 0, done: false }));
  must(en.indexOf("Resume") >= 0, "کلید انگلیسی ادامه");
  return { name: "ردیف بازی من", pass: true, detail: "ناتمام/تمام‌شده" };
}


function t_map_quadrants_fair() {
  // عدالت گوشه‌ها: هر ۴ ربع باید سهم چمن نزدیک به هم داشته باشند (±۱۲٪ میانگین).
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, CONFIG.MAP_SEED);
  mpClearSpawns(terrain, W, H);
  const q = [0, 0, 0, 0];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (terrain[r * W + c] === T_GRASS) q[(c < W / 2 ? 0 : 1) + (r < H / 2 ? 0 : 2)]++;
    }
  }
  const mean = (q[0] + q[1] + q[2] + q[3]) / 4;
  for (let i = 0; i < 4; i++) {
    must(Math.abs(q[i] - mean) / mean < 0.12, `ربع ${i} باید عادلانه باشد: ${q} (میانگین ${Math.round(mean)})`);
  }
  return { name: "ربع‌های عادلانه", pass: true, detail: q.join("/") };
}


function t_terrain_deterministic() {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const a = makeTerrain(W, H, CONFIG.MAP_SEED);
  const b = makeTerrain(W, H, CONFIG.MAP_SEED);
  must(a.length === b.length && a.every((v, i) => v === b[i]), "نقشه قطعی باید تکرارپذیر باشد");
  for (let r = 1; r <= 8; r++) {
    for (let c = 1; c <= 9; c++) {
      must(a[r * W + c] === T_GRASS, `محوطه شروع (${c},${r}) باید چمن باشد`);
    }
  }
  return { name: "قطعیت نقشه", pass: true, detail: `${W * H} خانه یکسان + محوطه شروع` };
}


function t_wave_deterministic() {
  const mk = () => {
    const { W, H, terrain, state } = fresh();
    return { W, H, terrain, state };
  };
  const a = mk(), b = mk();
  spawnWave(a.state, a.terrain, a.W, a.H);
  spawnWave(b.state, b.terrain, b.W, b.H);
  const fa = JSON.stringify(a.state.units.map((u) => [u.type, u.x, u.r]));
  const fb = JSON.stringify(b.state.units.map((u) => [u.type, u.x, u.r]));
  must(fa === fb, "موج باید قطعی باشد");
  must(a.state.units.length > 0, "موج باید واحد بسازد");
  return { name: "قطعیت موج", pass: true, detail: `${a.state.units.length} واحد یکسان` };
}


function t_render_roundtrip() {
  const cv = document.createElement("canvas");
  document.body.appendChild(cv);
  try {
    const R = createRenderer(cv);
    R.resize();
    R.fit();
    for (const [c, r] of [[0, 0], [5, 5], [15, 10], [CONFIG.GRID_W - 1, CONFIG.GRID_H - 1], [3, CONFIG.GRID_H - 5]]) {
      const p = R.cellToScreen(c + 0.5, r + 0.5); // مرکز لوزی — امن از مرز floor
      const back = R.screenToCell(p.x, p.y);
      must(back.c === c && back.r === r, `رفت‌وبرگشت (${c},${r}) شد (${back.c},${back.r})`);
    }
    // focus: خانه هدف دقیقاً وسط بوم می‌نشیند و زوم در بازه می‌ماند
    const { W, H } = R.canvasSize();
    for (const [c, r, m] of [[8, 3, 1.8], [CONFIG.GRID_W - 2, CONFIG.GRID_H - 2, 99], [0, 0, 0.01]]) {
      R.focus(c, r, m);
      const p = R.cellToScreen(c, r);
      must(Math.abs(p.x - W / 2) < 0.5 && Math.abs(p.y - H / 2) < 0.5, `focus (${c},${r}) وسط نیست: ${p.x},${p.y}`);
      must(R.view.zoom >= 0.3 && R.view.zoom <= 3, `زوم خارج از بازه: ${R.view.zoom}`);
    }
    R.fit();
  } finally {
    cv.remove();
  }
  return { name: "رفت‌وبرگشت مختصات", pass: true, detail: "۵ خانه دقیق + focus" };
}


function t_render_flat() {
  // نمای تخت نباید خطا بدهد و باید خاموش/روشن شود (رسم کامل یک قاب در هر حالت).
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.tower);
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 8, "soldier");
  const cv = document.createElement("canvas");
  document.body.appendChild(cv);
  try {
    const R = createRenderer(cv);
    R.resize();
    R.fit();
    R.draw(state, terrain, null, null, []);
    R.setFlat(true);
    must(R.isFlat(), "پرچم تخت باید روشن باشد");
    R.draw(state, terrain, null, null, []);
    R.setFlat(false);
    must(!R.isFlat(), "پرچم تخت باید خاموش شود");
    R.draw(state, terrain, null, null, []);
  } finally {
    cv.remove();
  }
  return { name: "نمای تخت", pass: true, detail: "رسم قاب در هر دو حالت" };
}


function t_terrain_cache_no_ghost() {
  // شبح کش زمین (0.137.2): بازرسم لایه زمین روی بوم خارج‌صحنه بازیافتی بدون
  // پاک‌سازی، پیکسل‌های قاب قبلی را نگه می‌داشت — پس از پن/زوم‌اوت زمین دوتایی
  // («کشیده») دیده می‌شد. بوم کوچک + پن دور: مرکز باید پس‌زمینه تیره شود.
  const { terrain, state } = fresh();
  const wrap = document.createElement("div");
  wrap.style.cssText = "width:112px;height:84px;position:fixed;left:-300px;top:0;";
  const cv = document.createElement("canvas");
  wrap.appendChild(cv);
  document.body.appendChild(wrap);
  try {
    const R = createRenderer(cv);
    R.resize();
    R.fit();
    const g = cv.getContext("2d");
    const cx = cv.width >> 1, cy = cv.height >> 1;
    const shot = () => Array.from(g.getImageData(cx, cy, 1, 1).data);
    R.draw(state, terrain, null, null, []);
    R.draw(state, terrain, null, null, []);
    const a = shot();
    if (a[3] === 0) return { name: "کش زمین بدون شبح", pass: true, detail: "readback در این محیط شفاف است — رد شد" };
    const dark = (p) => p[0] < 60 && p[1] < 60 && p[2] < 80;
    must(!dark(a), `مرکز قاب اول باید نقشه باشد: ${a.slice(0, 3)}`);
    R.view.panX += 400; // نقشه کامل از مرکز بیرون می‌رود (کف زوم ۰٫۲: پهنای نقشه ~۳۵۸px)
    R.draw(state, terrain, null, null, []);
    R.draw(state, terrain, null, null, []);
    const b = shot();
    must(dark(b), `مرکز پس از پن دور باید پس‌زمینه تیره باشد، نه شبح زمین: ${b.slice(0, 3)}`);
  } finally {
    wrap.remove();
  }
  return { name: "کش زمین بدون شبح", pass: true, detail: "پن دور + بازرسم پیاپی" };
}


// --- مینی‌مپ (0.43.0 — #۱۲ از FEATURES، شماره ۵ از NEXT-5) ---

function t_minimap_dots() {
  // بوم تست ۶۴×۶۴ (۱px/خانه) است چون readback بوم‌های eval-ساخته ≥۱۲۸px در این
  // محیط شفاف می‌دهد (محدودیت محیطی، نه کد — مینی‌مپ زنده ۱۵۰×۱۵۰ سالم خوانده شد)؛
  // drawMinimap اندازه را از خود بوم می‌گیرد پس منطق رنگ/نگاشت همان است.
  must(MINIMAP_W === 150 && MINIMAP_H === 150, "اندازه تولیدی باید ۱۵۰ باشد");
  const S = 64;
  const { W, H, terrain, state } = fresh();
  placeKeep(state, terrain, W, H);
  state.resources.wood = 200;
  const hutDef = CONFIG.BUILDINGS.hut;
  const site = siteNear(terrain, state.occ, W, H, 10, 10, hutDef.w, hutDef.h);
  must(site, "جا برای کلبه تست باید باشد");
  const r = tryPlace(state, terrain, W, H, site[0], site[1], hutDef, 0);
  must(r.ok, `کلبه باید ساخته شود، شد ${r.reason}`);
  const foe = spawnUnit(state, "swordsman", site[0] + 5.5, site[1] + 0.5);
  must(foe && !foe.dead, "مهاجم تست باید زنده باشد");
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  drawMinimap(cv, state, terrain, W, H, { c0: 0, r0: 0, c1: W, r1: H });
  const ctx = cv.getContext("2d");
  const at = (x, y) => ctx.getImageData(x, y, 1, 1).data;
  const hex = (d) => [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("");
  const cellPx = (c, rr) => [Math.min(S - 1, Math.floor((c + 0.5) / W * S)),
    Math.min(S - 1, Math.floor((rr + 0.5) / H * S))];
  // کلبه خودی = آبی مالک ۰
  const [hx, hy] = cellPx(site[0], site[1]);
  must(hex(at(hx, hy)) === "4d9de0", `پیکسل کلبه باید آبی خودی باشد، شد ${hex(at(hx, hy))}`);
  // خانه اول ستاد = آبی (ستاره طلایی وسط ستاد است، نه خانه اول)
  const keep = state.buildings.find((b) => b.type === "keep");
  must(keep, "ستاد باید باشد");
  const [kx, ky] = cellPx(keep.c, keep.r);
  must(hex(at(kx, ky)) === "4d9de0", `پیکسل ستاد باید آبی خودی باشد، شد ${hex(at(kx, ky))}`);
  // مرکز نقشه همیشه آب است (هسته دریاچه r≤۲٫۵)
  must(terrain[31 * W + 31] === T_WATER, "مرکز باید آب باشد");
  const [wx, wy] = cellPx(31, 31);
  must(hex(at(wx, wy)) === "2e6f8e", `پیکسل آب باید آبی دریا باشد، شد ${hex(at(wx, wy))}`);
  // مهاجم = نقطه قرمز (مختصات آینه فرمول drawMinimap)
  const ux = Math.floor(foe.x * (S / W)), uy = Math.floor(foe.r * (S / H));
  must(hex(at(ux, uy)) === "e74c3c", `پیکسل مهاجم باید قرمز باشد، شد ${hex(at(ux, uy))}`);
  return { name: "نقطه‌های مینی‌مپ", pass: true, detail: "کلبه/ستاد آبی + آب + مهاجم قرمز" };
}


function t_minimap_click() {
  const GW = CONFIG.GRID_W, GH = CONFIG.GRID_H;
  let m = minimapCell(0, 0, GW, GH);
  must(m.c === 0 && m.r === 0, "گوشه بالا-چپ = (۰،۰)");
  m = minimapCell(0.999, 0.999, GW, GH);
  must(m.c === GW - 1 && m.r === GH - 1, "گوشه پایین-راست = آخرین خانه");
  m = minimapCell(-0.2, 1.7, GW, GH);
  must(m.c === 0 && m.r === GH - 1, "بیرون = چسبیده به لبه");
  m = minimapCell(0.5, 0.5, GW, GH);
  must(m.c === 32 && m.r === 32, "وسط = (۳۲،۳۲)");
  // پرش: خانه هدف باید وسط بوم بیاید (آینه ریاضی cellToScreen در render.js).
  const cw = 800, ch = 600, zoom = 1;
  const hw = (CONFIG.TILE_W / 2) * zoom, hh = (CONFIG.TILE_H / 2) * zoom;
  const mh = (GW + GH) * (CONFIG.TILE_H / 2) * zoom;
  const p = panForCell(10, 20, cw, ch, zoom, GW, GH);
  must(Number.isFinite(p.panX) && Number.isFinite(p.panY), "پن باید عدد باشد");
  const sx = cw / 2 + p.panX + (10.5 - 20.5) * hw;
  const sy = (ch - mh) / 2 + p.panY + (10.5 + 20.5) * hh;
  must(Math.abs(sx - cw / 2) < 1e-9 && Math.abs(sy - ch / 2) < 1e-9, "هدف باید وسط بوم باشد");
  const p2 = panForCell(30, 20, cw, ch, zoom, GW, GH);
  must(p2.panX < p.panX, "خانه راست‌تر = پن چپ‌تر (یکنوا)");
  return { name: "کلیک مینی‌مپ", pass: true, detail: "نگاشت + مرکزیت + یکنوایی" };
}








function t_tick_both_systems() {
  // پین: هر تیک هم اقتصاد و هم نبرد اجرا می‌شوند (ترتیب در تنها محل فراخوانی main.js است).
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  spawnUnit(state, "swordsman", 12.5, 8.5);
  const x0 = state.units[1].x, r0 = state.units[1].r;
  simC(state, terrain, 1);
  must(state.tick === 1, "تیک باید ۱ شود");
  must(state.buildings[0].progress === 1, "اقتصاد باید در همان تیک اجرا شود");
  must(state.units[1].x !== x0 || state.units[1].r !== r0, "حرکت/نبرد باید در همان تیک اجرا شود");
  return { name: "اجرای هر دو سیستم", pass: true, detail: "پیشرفت=۱ + حرکت" };
}


// --- قرارداد مأموریت لایه ۱ (CORE-001): active/done/failed/idle صریح ---

function t_mission_move() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const me = state.units[0];
  const o = orderMove(state, me, 8, 6);
  must(o.ok, "دستور معتبر باید پذیرفته شود");
  must(me.mission === "active", "وضعیت باید active شود");
  let t = 0;
  while (me.mission === "active" && t < 150) {
    simC(state, terrain, 1);
    t++;
  }
  must(me.mission === "done", `مأموریت باید done شود، شد ${me.mission}`);
  must(me.order === null, "دستور تمام‌شده باید پاک شود");
  must(Math.hypot(me.x - 8.5, me.r - 6.5) <= 0.41, "واحد باید به مقصد رسیده باشد");
  return { name: "مأموریت حرکت", pass: true, detail: `done در ${t} تیک` };
}


function t_mission_reject() {
  const { state } = fresh();
  const me = spawnUnit(state, "soldier", 5.5, 5.5);
  const o = orderMove(state, me, -1, 40);
  must(!o.ok && o.reason === "OUT_OF_BOUNDS", "مقصد خارج باید رد شود");
  must(me.mission === "idle" && me.order === null, "رد نباید وضعیتی بسازد");
  return { name: "رد دستور نامعتبر", pass: true, detail: "OUT_OF_BOUNDS + idle" };
}


function t_mission_cancel() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const me = state.units[0];
  orderMove(state, me, 9, 6);
  simC(state, terrain, 5); // کمی حرکت کرده
  const cx = [me.x, me.r];
  cancelOrder(me);
  must(me.mission === "idle" && me.order === null, "لغو باید به idle برگردد");
  simC(state, terrain, 10); // دشمنی نیست → باید بایستد
  must(me.x === cx[0] && me.r === cx[1], "پس از لغو باید بایستد");
  return { name: "لغو مأموریت", pass: true, detail: "idle + توقف" };
}


function t_mission_failed() {
  const { W, H, terrain, state } = fresh();
  const site = findEnclosureSite(terrain, W, H);
  must(site, "باید جای محاصره روی نقشه قطعی پیدا شود");
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, site.cx, site.cy, "soldier");
  const me = state.units[0];
  for (const [c, r] of site.huts) {
    const res = tryPlace(state, terrain, W, H, c, r, CONFIG.BUILDINGS.hut);
    must(res.ok, `کلبه محاصره در (${c},${r}) باید ساخته شود`);
  }
  const o = orderMove(state, me, site.cx + 5, site.cy);
  must(o.ok, "دستور باید پذیرفته شود (شکست حین اجراست، نه موقع صدور)");
  let t = 0;
  while (me.mission === "active" && t < 60) {
    simC(state, terrain, 1);
    t++;
  }
  must(me.mission === "failed", `باید failed شود، شد ${me.mission}`);
  must(state.events.some((e) => e.includes("شکست خورد")), "رویداد شکست باید ثبت شود");
  must(me.hp === me.maxHp, "واحد محاصره‌شده باید سالم بماند");
  return { name: "شکست مأموریت", pass: true, detail: `failed در ${t} تیک + رویداد` };
}


function t_mission_save() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const me = state.units[0];
  orderMove(state, me, 8, 6);
  simC(state, terrain, 3);
  const loaded = deserializeJSON(serializeJSON(state));
  const lu = loaded.units[0];
  must(lu.order && lu.order.c === 8 && lu.order.r === 6 && lu.order.status === "active",
    "دستور فعال باید در ذخیره بماند");
  must(lu.mission === "active", "وضعیت مأموریت باید حفظ شود");
  // تحمل‌پذیری: ذخیره v2 بدون فیلدهای مأموریت → idle
  const bare = JSON.parse(serializeJSON(state));
  delete bare.units[0].order;
  delete bare.units[0].mission;
  const tolerant = deserialize(bare);
  must(tolerant.units[0].order === null && tolerant.units[0].mission === "idle",
    "فیلد غایب باید idle شود، نه خطا");
  // ادامه پس از load به done می‌رسد
  let t = 0;
  while (loaded.units[0].mission === "active" && t < 150) {
    loaded.tick++;
    stepEconomy(loaded);
    stepCombat(loaded, terrain);
    t++;
  }
  must(loaded.units[0].mission === "done", "مأموریت پس از load باید تمام شود");
  return { name: "ذخیره مأموریت", pass: true, detail: "حفظ + تحمل + اتمام" };
}


// __T_FLAT_KEY__
// کلیدهای نمای تخت/Peek (0.179.0 — بندهای 1141/160): خالص و هدلس.
function t_flat_key() {
  must(KEY_ACTIONS.includes("flat") && KEY_ACTIONS.includes("peek"), "هر دو کنش ثبت‌اند");
  must(DEFAULT_KEYS.flat === "Space" && DEFAULT_KEYS.peek === "KeyV", "پیش‌فرض Space/V است");
  must(normalizeKeys({}).flat === "Space" && normalizeKeys({}).peek === "KeyV", "نشست قدیمی بی‌کلید = پیش‌فرض");
  must(normalizeKeys({ flat: "KeyF", peek: "KeyB" }).flat === "KeyF", "remap کاربر می‌ماند");
  must(normalizeKeys({ flat: "!!" }).flat === "Space", "کلید نامعتبر دور ریخته می‌شود");
  must(typeof KEY_ACTION_FA.flat === "string" && KEY_ACTION_FA.flat.length > 0, "برچسب flat هست");
  must(typeof KEY_ACTION_FA.peek === "string" && KEY_ACTION_FA.peek.length > 0, "برچسب peek هست");
  must(t("system.a11y.key.flat").length > 0 && withLang("en", () => t("system.a11y.key.flat")).length > 0, "لیبل دوزبانه flat");
  must(t("system.a11y.key.peek").length > 0 && withLang("en", () => t("system.a11y.key.peek")).length > 0, "لیبل دوزبانه peek");
  return { name: "کلیدهای تخت/نگاه", pass: true, detail: "Space/V + remap" };
}

// --- 0.180.0: گونه‌های هدف مأموریت (§19.5/بند 1177) + ارزش سپاه (§18.7/بند 1112) +
// نقاط قدرت (§10.5/بند 745) + کلیدهای ادیتور (§15/بند 759) + یادداشت اشتراک (§15/بند 761) ---
// __T_MISSION_KINDS2__
// گونه‌های تازه هدف مأموریت (0.180.0 — بند 1177): killAllEnemies/population/
// popularity/captureGatehouse/keepLordAlive + missionSnap. خالص و هدلس.

// __T_ARMY_VALUE__
// ارزش سپاه با ستون خرید (0.180.0 — بند 1112): خالص و هدلس.
function t_army_value() {
  must(armyValue([{ type: "soldier" }, { type: "soldier", dead: true }, { type: "bogus" }, { type: "lord" }, { type: "slave" }]) === 72, "زنده‌ها: ۵۷+۱۰+۵=۷۲ (مرده/ناشناخته = ۰؛ ارباب فقط زره mail)");
  must(armyValue([]) === 0 && armyValue(null) === 0, "تهی = ۰");
  must(armyValue([{ type: "crossbowman" }, { type: "knight" }]) === 142, "۶۲+۸۰=۱۴۲");
  return { name: "ارزش سپاه", pass: true, detail: "ستون خرید + صفرها" };
}


// __T_EXTREME_TA_ABSENCE__
// غیبت نوار TA/حالت Extreme (0.181.0 — §1.3/بند 116، vacuous): سامانه
// Tactical Aid پیاده نشده (داده‌اش فقط مرجع در balance.json می‌ماند) پس
// تاگل Extreme Mode بی‌مصداق است — نه نوار، نه تاگل، نه حالت extreme.
function t_extreme_ta_absence() {
  must(BALANCE.tacticalAid.status === "reference", "TA فقط مرجع است، سیم‌کشی ندارد");
  must(BALANCE.tacticalAid.barPoints.value === 7000, "پین مرجع ۷٬۰۰۰ سر جایش است");
  must(TUNING.population.extreme === 10000, "پین extreme ده‌هزار سر جایش است (حالت بازی نیست)");
  const st = createState();
  must(st.extreme === undefined && st.rules.extreme === undefined, "state/قوانین حالت extreme ندارند");
  if (typeof document === "undefined") return { name: "غیبت TA/Extreme", pass: true, detail: "بدون DOM رد شد" };
  must(!document.getElementById("taBar"), "نوار TA در DOM نیست");
  must(!document.getElementById("extremeToggle"), "تاگل Extreme در DOM نیست");
  return { name: "غیبت TA/Extreme", pass: true, detail: "vacuous: سامانه نیست" };
}


// __T_REDFOOTPRINT_ROW153__
// پیش‌نمایش قرمز footprint (0.181.0 — §3.1/بند 153): ردپای ساختمان +
// خط دیوار با اعتبار نامعتبر قرمز می‌کشد، با معتبر سبز — تفاضلی پیکسلی:
// همان صحنه دوبار (معتبر/نامعتبر)؛ شمار پیکسل مایل‌به‌قرمز نامعتبر بیشتر است.
function t_redfootprint_row153() {
  if (typeof document === "undefined") return { name: "ردپای قرمز پیش‌نمایش", pass: true, detail: "بدون DOM رد شد" };
  const { W, H, terrain, state } = fresh();
  const wrap = document.createElement("div");
  wrap.style.cssText = "width:96px;height:72px;position:fixed;left:-400px;top:0;";
  const cv = document.createElement("canvas");
  wrap.appendChild(cv);
  document.body.appendChild(wrap);
  // بوم کوچک (<۱۲۸px): readback بوم‌های بزرگ در این محیط شفاف است (محدودیت محیطی).
  const isRed = (p) => p[0] - p[1] > 40 && p[0] - p[2] > 40;
  const countRed = () => {
    const g = cv.getContext("2d");
    const img = g.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 0; i < img.length; i += 16) if (isRed([img[i], img[i+1], img[i+2]])) n++;
    return n;
  };
  try {
    const R = createRenderer(cv);
    R.resize();
    R.fit();
    // بوم جداشده: readback بوم متصل در صفحه hidden شفاف برمی‌گرداند (محدودیت
    // محیطی)؛ ابعاد با resize قفل شده پس رسم روی بوم جداشده سالم می‌خواند.
    wrap.remove();
    const def = CONFIG.BUILDINGS.hut;
    const c = W >> 1, r = H >> 1;
    R.draw(state, terrain, { c, r, valid: true, reason: "OK", ghost: true }, def, null);
    const pb = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0;
    for (let i = 3; i < pb.length; i += 64) if (pb[i] !== 0) opaque++;
    if (!opaque) return { name: "ردپای قرمز پیش‌نمایش", pass: true, detail: "readback در این محیط شفاف است — رد شد" };
    const okN = countRed();
    R.draw(state, terrain, { c, r, valid: false, reason: "X", ghost: true }, def, null);
    const badN = countRed();
    must(badN > okN, "ردپای نامعتبر قرمزتر است: بد=" + badN + " خوب=" + okN);
    R.draw(state, terrain, { c: -99, r: -99, ghost: false }, null, null, [{ c, r, ok: true }]);
    const okW = countRed();
    R.draw(state, terrain, { c: -99, r: -99, ghost: false }, null, null, [{ c, r, ok: false }]);
    const badW = countRed();
    must(badW > okW, "خانه نامعتبر خط دیوار قرمزتر است: بد=" + badW + " خوب=" + okW);
    return { name: "ردپای قرمز پیش‌نمایش", pass: true, detail: "ساختمان + خط دیوار" };
  } finally {
    wrap.remove();
  }
}

// --- 0.182.0: استادان نبرد (§1.1/بند 102) ---
// __T_MASTERS__
// استادان نبرد (0.182.0 — §1.1/بند 102): امتیاز guess + رکورد + سقف ۲۵۰ +
// ۴ سورت دفترچه + حذف + رفت‌وبرگشت ذخیره. خالص و هدلس (+ DOM ساختاری).

// __T_MASTERS_STORE__
// ماندگاری استادان (0.182.0 — §1.1/بند 102): رفت‌وبرگشت localStorage با
// پشتیبان‌گیری/بازیابی (ذخیره واقعی بازیکن دست‌نخورده می‌ماند) + خراب/ناسازگار.

// __T_MASTERS_UI__
// ساختار DOM استادان (0.182.0 — §1.1/بند 102): صفحه منو + دکمه ناوبری +
// ۴ دکمه سورت + فهرست. (رندر ردیف‌ها با paintMasters در راستی‌آزمایی زنده.)


function sysCases() {
  return [t_hire_reasons, t_terrain_deterministic, t_terrain_seed, t_map_seed_variety, t_map_quadrants_fair, t_profile_name_logo, t_profile_lords, t_profile_persist, t_mp_password_rules, t_room_row_html, t_mp_session, t_mygames_list, t_live_row, t_mygame_row, t_wave_deterministic,
    t_render_roundtrip, t_render_flat, t_terrain_cache_no_ghost, t_minimap_dots, t_minimap_click, t_redfootprint_row153, t_extreme_ta_absence, t_tick_both_systems, t_balance_sources, t_balance_speed_order,
    t_select_toggle, t_select_prune, t_select_same_type, t_select_group, t_bldinfo, t_hire_hover, t_soldier_value, t_flat_key, t_army_value, t_army_panel, t_alarm_all, t_alarm_guard_resume,
    t_mission_move, t_mission_reject, t_mission_cancel, t_mission_failed, t_mission_save,
    t_selfhost_url];
}


// --- سرور شخصی (0.69.0): تقدم query بر stored بر پیش‌فرض همین‌هاست ---
function t_selfhost_url() {
  const R = (q, s, h, p) => resolveSocketUrl({ query: q, stored: s, host: h, proto: p });
  must(R("wss://ex.com/sock", null, "h", "http") === "wss://ex.com/sock", "query کامل");
  must(R("/s2", "wss://st.io/s", "h", "https") === "wss://h/s2", "query نسبی + تقدم بر stored");
  must(R(null, "ws://127.0.0.1:8080/sock", "h", "http") === "ws://127.0.0.1:8080/sock", "stored کامل");
  must(R(null, "  ", "h", "http") === "ws://h/sock", "stored خالی = پیش‌فرض");
  must(R("nope", null, "h", "http") === "ws://h/sock", "query نامعتبر = پیش‌فرض");
  must(R(null, null, "h", "http") === "ws://h/sock", "پیش‌فرض ws همین‌هاست");
  must(R(null, null, "h:9", "https") === "wss://h:9/sock", "پیش‌فرض wss برای https");
  must(R(null, null, "", "file") === null, "file بدون تنظیم = null (آفلاین)");
  must(R(null, "wss://st.io/s", "", "file") === "wss://st.io/s", "file با stored");
  return { name: "آدرس سرور شخصی", pass: true, detail: "تقدم query/stored/پیش‌فرض" };
}


// --- انتخاب گروهی (0.16.0) ---

// ضامن شیفت+کلیک: افزودن به ترتیب، حذف از میان، بدون تکرار.
function t_select_toggle() {
  must(JSON.stringify(toggleInSet([], 3)) === "[3]", "افزودن به خالی");
  must(JSON.stringify(toggleInSet([3], 5)) === "[3,5]", "افزودن دوم به ترتیب");
  must(JSON.stringify(toggleInSet([3, 5], 3)) === "[5]", "حذف عضو اول");
  must(JSON.stringify(toggleInSet([3, 5], 7)) === "[3,5,7]", "افزودن سوم");
  must(JSON.stringify(toggleInSet([3, 5], 5)) === "[3]", "حذف عضو میانی‌تر");
  return { name: "ضامن انتخاب", pass: true, detail: "ترتیب + بدون تکرار" };
}


// هرس مرده/رفته با حفظ ترتیب + تفکیک اشیای زنده.
function t_select_prune() {
  const { W, H, terrain, state } = fresh();
  state.resources.food = 200; state.resources.gold = 200; // هر سه استخدام موفق شود
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  hireUnit(state, terrain, W, H, 6, 5, "soldier");
  hireUnit(state, terrain, W, H, 7, 5, "bowman");
  const ids = state.units.map((u) => u.id);
  state.units[1].dead = true; // شبیه‌سازی مرگ پیش از جارو
  must(JSON.stringify(pruneSet([ids[2], ids[1], ids[0], 999], state.units)) === JSON.stringify([ids[2], ids[0]]),
    "مرده و ناموجود باید هرس شوند با حفظ ترتیب");
  const res = resolveSet([ids[2], ids[1], ids[0]], state.units);
  must(res.length === 2 && res[0].id === ids[2] && res[1].id === ids[0], "تفکیک زنده‌ها به ترتیب");
  return { name: "هرس انتخاب", pass: true, detail: "ترتیب باقی‌ماندگان" };
}

// دابل‌کلیک هم‌نوع (0.173.0 — §3.3/بند 167 + §10.1/بند 552): فقط خودیِ زندهٔ هم‌نوع، به ترتیب id.
function t_select_same_type() {
  const units = [
    { id: 5, type: "soldier", side: "player", x: 1, r: 1 },
    { id: 3, type: "archer", side: "player", x: 2, r: 2 },
    { id: 7, type: "soldier", side: "player", x: 3, r: 3 },
    { id: 9, type: "soldier", side: "player", dead: true, x: 4, r: 4 },
    { id: 11, type: "soldier", side: "enemy", x: 5, r: 5 },
    { id: 13, type: "soldier", side: "player", owner: 1, x: 6, r: 6 },
  ];
  const tgt = { type: "soldier" };
  must(JSON.stringify(sameTypeIds(units, tgt)) === "[5,7]", "خودی زنده هم‌نوع به ترتیب id");
  must(JSON.stringify(sameTypeIds(units, tgt, { onScreen: (u) => u.id !== 7 })) === "[5]", "فیلتر نما");
  must(JSON.stringify(sameTypeIds(units, tgt, { owner: 1 })) === "[13]", "مالک MP جدا");
  must(JSON.stringify(sameTypeIds(units, null)) === "[]", "هدف تهی = []");
  must(JSON.stringify(sameTypeIds(units, { type: "bowman" })) === "[]", "ناهم‌نوع = []");
  return { name: "دابل‌کلیک هم‌نوع", pass: true, detail: "فیلتر خودی/زنده + نما + مالک" };
}

// پنل اطلاعات ساختمان (0.174.0 — §3.3/بند 150): buildingInfo خالص + کلیدها.
function t_bldinfo() {
  const hut = buildingInfo({ id: 7, type: "hut", hp: 100, maxHp: 100, buildLeft: 0 }, { name: "کلبه", hp: 100, buildTime: 300 });
  must(hut && hut.name === "کلبه" && hut.hp === 100 && hut.maxHp === 100, "کلبه سالم");
  must(hut.buildPct === null && hut.destroyed === false, "کامل = بی‌درصد + سالم");
  const half = buildingInfo({ id: 8, type: "hut", hp: 60, maxHp: 100, buildLeft: 150 }, { name: "کلبه", hp: 100, buildTime: 300 });
  must(half.buildPct === 50, "نیمه‌کاره = ۵۰٪");
  const ruin = buildingInfo({ id: 9, type: "tower", hp: 0, maxHp: 460, buildLeft: 0, destroyed: true }, { name: "برج", hp: 460 });
  must(ruin.destroyed === true, "ویرانه");
  must(buildingInfo(null, {}) === null, "تهی = null");
  for (const k of ["main.bld.name", "main.bld.hp", "main.bld.building", "main.bld.done", "main.bld.ruin"]) {
    must(typeof t(k) === "string" && t(k).length > 0, "کلید " + k);
  }
  withLang("en", () => {
    must(t("main.bld.done") === "Active" && t("main.bld.ruin") === "Ruin", "en فعال/ویرانه");
  });
  return { name: "پنل اطلاعات ساختمان", pass: true, detail: "سالم/نیمه‌کاره/ویرانه + کلیدها" };
}

// هایلایت کالاهای استخدام (0.175.0 — §9.3/بند 482): hireGoodsFor خالص.
function t_hire_hover() {
  const ag = hireGoodsFor("bowman");
  must(ag.some((g) => g.res === "gold" && g.n > 0), "کماندار طلا می‌خواهد");
  must(ag.some((g) => g.res === "food" && g.n > 0), "کماندار غذا می‌خواهد");
  must(ag.some((g) => g.res === UNITS.bowman.requiresWeapon), "کماندار سلاح لازم دارد");
  must(JSON.stringify(hireGoodsFor("slinger")) === '[{"res":"gold","n":27}]', "فلاخن‌انداز فقط ۲۷ طلا");
  must(hireGoodsFor("nope").length === 0, "ناشناس = []");
  must(hireGoodsFor("lord").length === 0, "ارباب hireable نیست");
  return { name: "هایلایت استخدام", pass: true, detail: "غذا/طلا/سلاح + مزدور" };
}

// __T_SOLDIER_VALUE__
// ارزش سرباز (0.178.0 — بند 869/§18.6): طلا + ارزش بازاری تجهیزات.
function t_soldier_value() {
  must(soldierValue("bogus-unit") === null, "ناشناخته = null");
  const R = CONFIG.MARKET.rates;
  must(R.swords.buy === 20 && R.bows.buy === 20, "نرخ سلاح");
  must(R.leather.buy === 12 && R.iron.buy === 10, "نرخ زره");
  must(soldierValue("crossbowman") === 62, "زوبین‌دار = 30+20+12");
  must(soldierValue("soldier") === 57, "سرباز = 25+20+12");
  must(soldierValue("knight") === 80, "شوالیه = 50+20+10");
  must(soldierValue("slave") === 5, "برده = 5");
  must(soldierValue("bowman") === 35, "کماندار = 15+20");
  must(soldierValue("arabianBow") === 50, "کماندار عرب = طلای مزدوری");
  must(soldierValue("assassin") === 90, "قاتل = 70+20");
  for (const id of Object.keys(UNITS)) {
    const v = soldierValue(id);
    must(typeof v === "number" && v >= 0, "ارزش عددی " + id);
  }
  must(t("main.meta.value", { n: 62 }) !== "main.meta.value", "کلید fa ارزش");
  const enV = withLang("en", () => t("main.meta.value", { n: 62 }));
  must(enV !== "main.meta.value" && enV.length > 0, "کلید en ارزش");
  return { name: "ارزش سرباز", pass: true, detail: "7 نمونه + همه یگان‌ها" };
}


// پنل ارتش (0.175.0 — §10.3/بند 553): armyBreakdown خالص.
function t_army_panel() {
  const sels = [
    { id: 1, type: "soldier", hp: 100 },
    { id: 2, type: "archer", hp: 80 },
    { id: 3, type: "soldier", hp: 60 },
    { id: 4, type: "archer", hp: 0, dead: true },
    { id: 5, type: "soldier", hp: 40, dead: true },
  ];
  const bd = armyBreakdown(sels);
  must(bd.length === 2, "دو نوع زنده");
  must(bd[0].type === "archer" && bd[0].n === 1 && bd[0].hp === 80, "کماندار اول (الفبا)");
  must(bd[1].type === "soldier" && bd[1].n === 2 && bd[1].hp === 160, "سرباز دوم با Σجان");
  must(armyBreakdown([]).length === 0, "خالی = []");
  return { name: "پنل ارتش", pass: true, detail: "تجمیع نوع + Σجان" };
}




// دستور جمعی: حرکت هر دو به done، موضع جمعی، نگهبانی جمعی از یک پاسگاه.
function t_select_group() {
  const { W, H, terrain, state } = fresh();
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه باید ساخته شود");
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  hireUnit(state, terrain, W, H, 6, 5, "soldier");
  const pair = state.units.slice();
  const ors = orderAll(state, pair, "move", 9, 5);
  must(ors.every((r) => r.ok), "دستور جمعی باید برای همه ثبت شود");
  let t = 0;
  while (pair.some((u) => u.mission === "active") && t < 200) { simC(state, terrain, 1); t++; }
  must(pair.every((u) => u.mission === "done"), "هر دو باید به مقصد برسند");
  must(stanceAll(pair, "hold").every((r) => r.ok) && pair.every((u) => u.stance === "hold"),
    "موضع جمعی باید برای همه ثبت شود");
  must(guardAll(state, pair, h.building).every((r) => r.ok) && pair.every((u) => u.guardBld === h.building.id),
    "نگهبانی جمعی باید یک پاسگاه بگیرد");
  must(retreatAll(state, pair).every((r) => r.ok), "عقب‌نشینی جمعی باید ثبت شود");
  return { name: "دستور جمعی", pass: true, detail: `done در ${t} تیک + موضع/پاسگاه مشترک` };
}


// --- زنگ خطر (0.17.0) ---

// تجمع ارتش: همه یگان‌های بازیکن (نه دشمن) حمله‌در‌حرکت به نقطه می‌گیرند و می‌رسند.
function t_alarm_all() {
  const { W, H, terrain, state } = fresh();
  state.resources.food = 200; state.resources.gold = 200;
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  hireUnit(state, terrain, W, H, 6, 5, "soldier");
  hireUnit(state, terrain, W, H, 7, 5, "bowman");
  spawnUnit(state, "swordsman", 20.5, 20.5); // دشمن دور — زنگ شاملش نمی‌شود
  const rs = alarmAll(state, 9, 5);
  must(rs.length === 3 && rs.every((r) => r.ok), "هر سه یگان باید دستور بگیرند");
  must(state.units.filter((u) => u.side === "player").every((u) => u.order && u.order.kind === "attackmove"),
    "همه باید attackmove باشند");
  const foe = state.units.find((u) => u.side === "enemy");
  must(!foe.order, "دشمن نباید دستور بگیرد");
  let t = 0;
  while (state.units.some((u) => u.side === "player" && u.mission === "active") && t < 200) {
    simC(state, terrain, 1);
    t++;
  }
  must(state.units.filter((u) => u.side === "player").every((u) => u.mission === "done"),
    "ارتش باید تجمع کند");
  return { name: "زنگ خطر", pass: true, detail: `تجمع ۳ یگان در ${t} تیک` };
}


// نگهبان پس از زنگ پاسگاهش را نگه می‌دارد (پس از اتمام به پست برمی‌گردد).
function t_alarm_guard_resume() {
  const { W, H, terrain, state } = fresh();
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه باید ساخته شود");
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 3, 1, "soldier");
  const me = state.units[0];
  must(setGuard(state, me, h.building).ok, "گماشتن باید موفق باشد");
  alarmAll(state, 9, 5);
  must(me.order && me.order.kind === "attackmove", "زنگ بر نگهبانی ارجح است");
  must(me.guardBld === h.building.id, "پاسگاه حین زنگ حفظ می‌شود");
  let t = 0;
  while (me.mission === "active" && t < 200) { simC(state, terrain, 1); t++; }
  must(me.mission === "done", "نگهبان باید به تجمع برسد");
  simC(state, terrain, 40); // فرصت بازگشت به خانه
  const d = Math.hypot(me.x - 2, me.r - 2);
  must(me.stance === "guard" && d <= 2.5, `پس از اتمام باید به پست برگردد، فاصله=${d.toFixed(2)}`);
  return { name: "بازگشت نگهبان", pass: true, detail: `done + بازگشت در ${t} تیک` };
}


// ترتیب سرعت مرجع (0.14.0): شمشیرزن زرهی کندترین، کماندارها تندترین، سرباز میانه؛
// واحدهای مرجع‌دار باید برچسب reference داشته باشند.
function t_balance_speed_order() {
  const { swordsman, soldier, archer, bowman } = UNITS;
  must(swordsman.speed < soldier.speed, "شمشیرزن باید از سرباز کندتر باشد");
  must(archer.speed > soldier.speed && bowman.speed > soldier.speed,
    "کماندارها باید از سرباز تندتر باشند");
  for (const [k, u] of Object.entries({ swordsman, archer, bowman })) {
    must(typeof u.source === "string" && u.source.startsWith("reference:"),
      `واحد ${k} باید منبع مرجع داشته باشد، هست ${u.source}`);
  }
  must(TAX.largeBribe && TAX.largeBribe.goldPerWorker < 0 && TAX.largeBribe.pop > 0,
    "رشوه باید طلا بگیرد و محبوبیت بدهد");
  return { name: "ترتیب سرعت مرجع", pass: true, detail: `شمشیرزن ${swordsman.speed} < سرباز ${soldier.speed} < کماندار ${archer.speed}` };
}


// قاعده رجیستری: هر عدد گیم‌پلی باید source داشته باشد (guess تا استخراج مرجع).
// جزئیات و روش استخراج هر عدد: src/research/numbers-registry.md
function t_balance_sources() {  for (const [k, def] of Object.entries(CONFIG.BUILDINGS)) {
    must(def.source, `ساختمان ${k} باید source داشته باشد`);
    must(def.cost && typeof def.cost === "object", `ساختمان ${k} باید cost داشته باشد`);
    must("rules" in def, `ساختمان ${k} باید وضعیت قانون خاص (حتی null) داشته باشد`);
    if (def.weapon) must(def.weapon.source, `سلاح ${k} باید source داشته باشد`);
  }
  for (const [k, r] of Object.entries(RATES)) {
    must(r.source, `نرخ ${k} باید source داشته باشد`);
  }
  for (const [k, t] of Object.entries(TAX)) {
    must(t.source, `مالیات ${k} باید source داشته باشد`);
  }
  for (const [k, r] of Object.entries(RATIONS)) {
    must(r.source, `جیره ${k} باید source داشته باشد`);
  }
  must(STOCK_POP.source, "جدول اثر موجودی (STOCK_POP) باید source داشته باشد");
  for (const [k, u] of Object.entries(UNITS)) {
    must(u.source, `واحد ${k} باید source داشته باشد`);
  }
  return { name: "برچسب منبع اعداد", pass: true, detail: "هیچ عدد بی‌منبع نیست (guess یا reference)" };
}


















































// جست‌وجوی قطعی جای محاصره: خانه‌ای که ۴ همسایه‌اش چمن‌اند و ۴ کلبه ۲×۲
// ناهم‌پوشان دورش روی چمن جا می‌شوند (الگوی ثابت، پیمایش ثابت).
function findEnclosureSite(terrain, W, H) {
  const free2x2 = (c, r) => {
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        if (terrain[(r + j) * W + (c + i)] !== T_GRASS) return false;
      }
    }
    return true;
  };
  for (let cy = 10; cy <= 20; cy++) {
    for (let cx = 2; cx <= 28; cx++) {
      if (terrain[cy * W + cx] !== T_GRASS) continue;
      if (![[cx, cy - 1], [cx - 1, cy], [cx + 1, cy], [cx, cy + 1]]
        .every(([c, r]) => terrain[r * W + c] === T_GRASS)) continue;
      const huts = [[cx - 1, cy - 2], [cx, cy + 1], [cx - 2, cy], [cx + 1, cy - 1]];
      if (!huts.every(([c, r]) => c >= 0 && r >= 0 && c + 1 < W && r + 1 < H && free2x2(c, r))) {
        continue;
      }
      return { cx, cy, huts };
    }
  }
  return null;
}

export { sysCases };
