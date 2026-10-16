// آزمون‌های خودکار اقتصاد (ECON-001/002) — هدلس، هم‌زمان، زیر یک ثانیه.
// اجرا: window.__slice01.runTests() یا ?test در URL.
import { CONFIG } from "./config.js";
import { makeTerrain, terrainPins } from "./terrain.js";
import { createState, occupyFootprint } from "./state.js";
import { tryPlace, validate, placeKeep } from "./construction.js";
import { stepEconomy, popTarget, housingCap, KEEP_HOUSING, RATES, TAX, RATIONS, STOCK_POP, capFor, workersNeeded } from "./economy.js";
import {
  serializeJSON, deserializeJSON, deserialize, SaveError, SCHEMA_VERSION,
  storageSave, storageDelete, saveSlot, loadSlot, deleteSlot, migrateToIdb,
} from "./persist.js";
import { idbAvailable, idbGet, idbDel, IDB_CAP } from "./idb.js";
import {
  BENCH_BUDGET, withinBudget, benchSim, runBench,
} from "./bench.js";
import {
  REGRESSIONS, EXPECTED_HASHES, runRegression, fuzzSaves, fuzzCmds,
} from "./regression.js";
import { COMPAT_ROWS, probeCompat, compatBootable, SUPPORT_LINE } from "./compat.js";
import { UNITS, spawnUnit, hireUnit, validateHire, hasBarracks, spawnWave, spawnLord, FINAL_WAVE, orderMove, orderAttackMove, orderRetreat, setStance, setGuard, guardPost, cancelOrder, stepCombat, occForSide, gateAt, gateOpen, toggleGate, validateDemolish, demolishBuilding, demolishRefund, unitArmor, effectiveDmg, dmgVs, deployUnit, garrisonUnit, GARRISON_CAP } from "./combat.js";
import { findPath, nearestWalkable, isCellWalkable } from "./pathfind.js";
import { createRenderer } from "./render.js";
import { toggleInSet, pruneSet, resolveSet, orderAll, retreatAll, stanceAll, guardAll, alarmAll, boxSelectIds } from "./selection.js";
import { T_GRASS, T_WATER } from "./terrain.js";
import { UNIT_DATA } from "./units.gen.js";
import { createQueue, enqueueCmd, queueLen, stepSim } from "./sim.js";
import { queueHire, cancelTrain, stepTraining, barracksOf, trainTimeOf, TRAIN_FA } from "./train.js";
import { MISSION_KINDS, MISSION_FA, validateMission, createRun, updateRun, MISSIONS } from "./missions.js";
import { CLOUD_KEY_MIN, CLOUD_KEY_MAX, CLOUD_DATA_MAX, CLOUD_FA, cloudKeyHash, validCloudKey } from "./cloud.js";
import { hasMarket, tradeQuote, applyTrade } from "./market.js";
import { startAI, stepAI, aiRandAt, aiDifficulty, aiRaidPlan, aiPersonality, aiPersonalityName, AI_OWNER } from "./ai.js";
import { drawMinimap, minimapCell, panForCell, MINIMAP_W, MINIMAP_H } from "./minimap.js";
import { WALL_LINE_MAX, isLineDragType, wallLineTiles } from "./wallline.js";
import {
  PINCH_ZOOM_MIN, PINCH_ZOOM_MAX, LONG_PRESS_MS, LONG_PRESS_SLOP,
  pinchDist, pinchZoom, pinchMid, longPressFired, longPressMoved,
  DRAG_PAN_SLOP, dragMovedFar, panForDrag,
} from "./gestures.js";
import { validateConfig } from "./schema.js";
import {
  GROUP_SLOTS, freshGroups, groupIndex, saveGroup, recallGroup,
} from "./groups.js";
import { BANNED_NAMES, scanBanned, scanContent } from "./legal.js";
import { runFirstTenScenario, FIRST_TEN_TICKS } from "./firstten.js";
import {
  A11Y_PALETTES, A11Y_SCALES, KEY_ACTIONS, DEFAULT_KEYS,
  validPalette, clampScale, validKeyCode, normalizeKeys,
} from "./a11y.js";
import {
  VOL_KEY, MAX_EVENTS_PER_TICK, loadVolumes, saveVolumes,
  diffSoundEvents, countWalking, soundSnapshot, createSoundManager,
} from "./sound.js";
import {
  REPLAY_V, REPLAY_CMD_CAP, createRecorder, recordCmd, validateReplayLog,
  newSoloFromSeed, runReplay,
} from "./replay.js";
import {
  MAP_V, PATCH_CAP, CUSTOM_KEY, BRUSHES, createMapDoc, patchesList, patchCount,
  baseTerrain, applyPatches, customTerrain, paintCells, clearPatches,
  validateMapDoc, normalizeMapDoc, exportMapDoc, importMapDoc,
  validatePlayable, namedMapByKey, mapNameFor, saveCustomSlot, loadCustomSlot,
} from "./mapedit.js";
import { enableMp, mpClearSpawns, MP_SPAWN_ANCHOR, stateHash, updateMpAlive } from "./mp.js";
import { placeKeepFor } from "./construction.js";
import { validRoomPassword, roomRowHTML } from "./lobby.js";
import {
  PROFILE_LOGOS, validProfileName, validLogo, loadProfile, saveProfile, profileBadgeHTML,
} from "./profile.js";

function fresh() {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  return { W, H, terrain: makeTerrain(W, H, CONFIG.MAP_SEED), state: createState() };
}

function sim(state, n) {
  completeAll(state); // تست‌های پیشاساخت (#۳): رفتار پس‌از-تکمیل را می‌پینند
  for (let i = 0; i < n; i++) { state.tick++; stepEconomy(state); }
}

// حلقه کامل بازی (تیک + اقتصاد + نبرد) — آینه حلقه اصلی main.js.
function simC(state, terrain, n) {
  completeAll(state); // مثل sim: ساخت‌تدریجی فقط با حلقه خام آزموده می‌شود
  for (let i = 0; i < n; i++) { state.tick++; stepEconomy(state); stepCombat(state, terrain); }
}

// تکمیل فوری ساخت‌وساز (0.39.0): همه ساختمان‌ها تکمیل می‌شوند تا تست‌های
// قدیمی (که زمان‌بندی پساساخت را پین کرده‌اند) دست‌نخورده بمانند.
function completeAll(state) {
  for (const b of state.buildings) b.buildLeft = 0;
}

// حلقه خام بدون تکمیل خودکار — برای آزمودن خودِ ساخت‌تدریجی (0.39.0).
function rawTicks(state, n) {
  for (let i = 0; i < n; i++) { state.tick++; stepEconomy(state); }
}

function must(cond, msg) {
  if (!cond) throw new Error(msg);
}
// نزدیک‌ترین چمن آزاد به نقطه (مارپیچ قطعی) — پین‌های مستقل از اندازه نقشه.
function grassNear(terrain, occ, W, H, c, r) {
  for (let rad = 0; rad < Math.max(W, H); rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= W || rr >= H) continue;
        if (terrain[rr * W + cc] === T_GRASS && (!occ || occ[rr * W + cc] !== 1)) return [cc, rr];
      }
    }
  }
  return null;
}

// نزدیک‌ترین جای ردپای w×h چمنِ آزاد به نقطه (مارپیچ قطعی) — برای بنای تست.
function siteNear(terrain, occ, W, H, c, r, w, h) {
  for (let rad = 0; rad < Math.max(W, H); rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || rr < 0 || cc + w > W || rr + h > H) continue;
        let ok = true;
        for (let j = 0; j < h && ok; j++) {
          for (let i = 0; i < w && ok; i++) {
            if (terrain[(rr + j) * W + (cc + i)] !== T_GRASS || (occ && occ[(rr + j) * W + (cc + i)] === 1)) ok = false;
          }
        }
        if (ok) return [cc, rr];
      }
    }
  }
  return null;
}

// پیش‌شرط استخدام سرباز در تست‌ها (0.29.0): سربازخانه مستقیم و بدون
// هزینه/شمارنده (تا ادعاهای هزینه و شمارش تست‌ها دست‌نخورده بمانند) در گوشه
// پایین-چپ — دور از نقاط پرکاربرد TL/مرکز؛ اگر پر بود نخستین جای آزاد کل نقشه.
// (0.44.0): انبار مهمات هم پر می‌کند (۳۰ شمشیر/کمان) چون استخدام مزدور از این
// نسخه سلاح می‌خواهد — تست‌های رزمی روی نبرد تمرکز دارند نه زنجیره سلاح
// (خودِ قفل سلاح در t_hire_needs_weapon با انبار خالی آزموده می‌شود).
function needBarracks(state, terrain, W, H, owner) {
  const ow = owner == null ? 0 : owner;
  const res = (state.mp && state.mp.enabled) ? state.mpres[ow].resources : state.resources;
  res.swords = Math.max(res.swords || 0, 30);
  res.bows = Math.max(res.bows || 0, 30);
  const def = CONFIG.BUILDINGS.barracks;
  const spots = [[1, H - 1 - def.h]];
  for (let r = 1; r + def.h <= H; r++) {
    for (let c = 1; c + def.w <= W; c++) spots.push([c, r]);
  }
  for (const [c, r] of spots) {
    let free = true;
    for (let j = 0; j < def.h && free; j++) {
      for (let i = 0; i < def.w && free; i++) {
        if (terrain[(r + j) * W + (c + i)] !== T_GRASS || state.occ[(r + j) * W + (c + i)] === 1) {
          free = false;
        }
      }
    }
    if (free) {
      const b = {
        id: state.nextId++, type: "barracks", c, r, w: def.w, h: def.h,
        hp: def.hp, maxHp: def.hp, cooldown: 0, targetId: null,
        owner: owner == null ? 0 : owner,
      };
      state.buildings.push(b);
      occupyFootprint(state, W, c, r, def.w, def.h);
      return b;
    }
  }
  throw new Error("جایی برای سربازخانه نیست");
}

// محوطه شروع (سطر ۱-۸، ستون ۱-۹) همیشه چمن است.
// نقاط با فاصله ≥۱ خانه خالی (قانون spacing چوب‌بری رعایت می‌شود).
const SPOTS_2X2 = [[1, 1], [4, 1], [7, 1], [1, 4], [4, 4], [7, 4], [1, 7]];

function placeAll(state, terrain, W, H, type, spots) {
  for (const [c, r] of spots) {
    const res = tryPlace(state, terrain, W, H, c, r, CONFIG.BUILDINGS[type]);
    must(res.ok, `ساخت ${type} در (${c},${r}) باید موفق باشد`);
  }
}

// --- ECON-001 ---

function t_production() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter); // هزینه ۱۵ چوب
  sim(state, 200);
  must(state.resources.wood === 115, `چوب باید ۱۱۵ باشد، هست ${state.resources.wood}`);
  return { name: "تولید ساده", pass: true, detail: "wood=115 پس از ۲۰۰ تیک (با هزینه ساخت)" };
}

function t_storageCap() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  state.resources.wood = 499; // پس از ساخت (هزینه از ۱۲۰ کم شده بود)
  sim(state, 40);
  must(state.resources.wood === 500, `چوب باید سقف ۵۰۰ بماند، هست ${state.resources.wood}`);
  return { name: "اشباع انبار", pass: true, detail: "wood=500 (بدون انباشت نامرئی)" };
}

// سقف انبار (0.34.0): پایه ۵۰۰؛ هر انبار سالم +۵۰۰ چوب/سنگ/طلا؛ هر انبار
// غذای سالم +۵۰۰ غذا/گندم/رازک/آبجو؛ ویرانی مازاد را می‌تراشد؛ در MP
// به‌ازای مالک؛ موجودی بالای پایه در ذخیره می‌ماند، مازاد بر سقف رد می‌شود.
function t_storage_caps() {
  const { W, H, terrain, state } = fresh();
  state.resources.wood = 500;
  must(capFor(state, "wood") === 500, "پایه سقف چوب ۵۰۰ است");
  const s = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.stockpile);
  must(s.ok, "انبار باید ساخته شود");
  completeAll(state); // سقف پس از تکمیل می‌آید (0.39.0)
  must(capFor(state, "wood") === 1000, "یک انبار: سقف چوب ۱۰۰۰");
  must(capFor(state, "stone") === 1000 && capFor(state, "gold") === 10499, "انبار: سقف سنگ/طلا هم بالا می‌رود");
  must(capFor(state, "food") === 500, "انبار سقف غذا را بالا نمی‌برد");
  const g = tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.granary);
  must(g.ok, "انبار غذا باید ساخته شود");
  completeAll(state);
  must(capFor(state, "food") === 1000 && capFor(state, "beer") === 1000, "انبار غذا: سقف غذا/آبجو ۱۰۰۰");
  must(capFor(state, "wood") === 1000, "انبار غذا سقف چوب را بالا نمی‌برد");
  // موجودی بالای پایه نگه داشته می‌شود (نه تراشیده)
  state.resources.wood = 900; state.resources.food = 900;
  sim(state, 1);
  must(state.resources.wood === 900 && state.resources.food === 900, "زیر سقف تازه نباید تراشیده شود");
  // ویرانی انبار، مازاد چوب را می‌تراشد ولی غذای انبار غذای سالم می‌ماند
  s.building.destroyed = true;
  simC(state, terrain, 1); // جاروی نبرد، ویران‌شده را پاک می‌کند
  must(!state.buildings.some((b) => b.type === "stockpile" && !b.destroyed), "انبار ویران باید پاک شود");
  must(state.resources.wood === 500, `پس از ویرانی چوب باید ۵۰۰ شود، هست ${state.resources.wood}`);
  must(state.resources.food === 900, "غذای انبار غذای سالم باید بماند");
  // ذخیره/بارگذاری با موجودی بالای پایه
  const s2 = tryPlace(state, terrain, W, H, 7, 1, CONFIG.BUILDINGS.stockpile);
  must(s2.ok, "انبار دوم باید ساخته شود");
  completeAll(state);
  state.resources.wood = 900;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.wood === 900, "موجودی بالای پایه باید در ذخیره بماند");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.wood = 1500; // سقف چوب با یک انبار ۱۰۰۰ است
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "مازاد بر سقف انبار باید SaveError بدهد");
  // چندنفره: انبار حریف سقف من را بالا نمی‌برد
  s2.building.destroyed = true;
  simC(state, terrain, 1);
  enableMp(state, 2, ["A", "B"]);
  state.mpres[1].resources.wood = 500;
  const m = tryPlace(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.stockpile, 1);
  must(m.ok, "بازیکن ۱ انبار خودش را می‌سازد");
  completeAll(state);
  must(capFor(state, "wood", 1) === 1000, "سقف چوب بازیکن ۱ باید ۱۰۰۰ باشد");
  must(capFor(state, "wood", 0) === 500, "سقف چوب بازیکن ۰ باید ۵۰۰ بماند");
  must(capFor(state, "food", 0) === 1000, "سقف غذای بازیکن ۰ با انبار غذای خودش ۱۰۰۰ است");
  must(capFor(state, "food", 1) === 500, "سقف غذای بازیکن ۱ باید ۵۰۰ بماند");
  return { name: "سقف انبار", pass: true, detail: "پله/ویرانی/ذخیره/MP" };
}

function t_noWorker() {
  const { W, H, terrain, state } = fresh();
  state.workers = 6; // استخر صریح برای این تست (پیش‌فرض بازی ۴ است)
  placeAll(state, terrain, W, H, "woodcutter", SPOTS_2X2);
  sim(state, 1);
  const idle = state.buildings.filter((b) => b.staffed === false);
  must(idle.length === 1, `باید دقیقاً ۱ ساختمان بی‌کارگر باشد، هست ${idle.length}`);
  sim(state, 19);
  must(state.resources.wood === 21, `چوب باید ۲۱ باشد (۱۵−۱۰۵+۶)، هست ${state.resources.wood}`);
  return { name: "توقف بدون کارگر", pass: true, detail: "هفتمین ساختمان idle، wood=21" };
}

function t_foodFloor() {
  const { W, H, terrain, state } = fresh();
  state.resources.food = 0;
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  sim(state, 200);
  must(state.resources.food === 0, `غذا نباید منفی شود، هست ${state.resources.food}`);
  must(state.shortageTotal === 1, `بدهی کمبود باید ۱ باشد، هست ${state.shortageTotal}`);
  return { name: "کف غذا و بدهی کمبود", pass: true, detail: "food=0، shortage=1" };
}

function t_deterministic() {
  const run = () => {
    const { W, H, terrain, state } = fresh();
    tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
    tryPlace(state, terrain, W, H, 1, 5, CONFIG.BUILDINGS.farm);
    sim(state, 600);
    return JSON.stringify({
      res: state.resources, tick: state.tick, w: state.workers, pop: state.popularity,
      b: state.buildings.map((b) => [b.type, b.c, b.r, b.staffed, b.progress || 0]),
      p: state.producedTotal, c: state.consumedTotal, s: state.shortageTotal,
    });
  };
  const a = run(), b = run();
  must(a === b, "دو اجرای یکسان باید وضعیت یکسان بدهند");
  return { name: "قطعیت شبیه‌سازی", pass: true, detail: "۶۰۰ تیک یکسان" };
}

// --- ECON-002 ---

function t_popRise() {
  const { state } = fresh();
  state.tax = "none";
  state.rations = "double"; // هدف: ۵۰+۲+۳+۲=۵۷
  must(popTarget(state) === 57, `هدف باید ۵۷ باشد، هست ${popTarget(state)}`);
  sim(state, 50);
  must(state.popularity === 52, `محبوبیت باید ۵۲ باشد، هست ${state.popularity}`);
  return { name: "رشد محبوبیت", pass: true, detail: "pop=52، هدف ۵۷" };
}

function t_starve() {
  const { W, H, terrain, state } = fresh();
  state.resources.food = 0;
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  sim(state, 600); // هدف ۴۵؛ مصرف در ۲۰۰/۴۰۰/۶۰۰
  must(state.popularity === 45, `محبوبیت باید ۴۵ باشد، هست ${state.popularity}`);
  must(state.shortageTotal === 3, `بدهی باید ۳ باشد، هست ${state.shortageTotal}`);
  return { name: "اثر قحطی", pass: true, detail: "pop=45، shortage=3" };
}

function t_immigration() {
  const { W, H, terrain, state } = fresh();
  placeAll(state, terrain, W, H, "hut", [[1, 1], [4, 1]]); // سقف ۱۲
  must(state.workerCap === 4, "سقف باید پیش از تیک ۴ باشد (پس از step: ۱۲)");
  state.popularity = 70;
  sim(state, 300); // مهاجرت در ۱۰۰/۲۰۰/۳۰۰ (pop: ۶۶/۶۲/۵۸)
  must(state.workers === 7, `کارگر باید ۷ باشد، هست ${state.workers}`);
  must(state.workerCap === 12, `سقف باید ۱۲ باشد، هست ${state.workerCap}`);
  return { name: "مهاجرت به داخل", pass: true, detail: "workers=7، cap=12" };
}

function t_emigration() {
  const { state } = fresh();
  state.workers = 6;
  state.popularity = 20;
  sim(state, 200); // مهاجرت در ۱۰۰/۲۰۰ (pop: ۲۴/۲۸)
  must(state.workers === 4, `کارگر باید ۴ باشد، هست ${state.workers}`);
  return { name: "مهاجرت به خارج", pass: true, detail: "workers=4" };
}

function t_tax() {
  const { W, H, terrain, state } = fresh();
  state.tax = "high";
  placeAll(state, terrain, W, H, "woodcutter", [[1, 1], [4, 1], [7, 1], [1, 4]]);
  sim(state, 50); // ۴ کارگر × ۴ طلا
  must(state.resources.gold === 76, `طلا باید ۷۶ باشد، هست ${state.resources.gold}`);
  return { name: "درآمد مالیات", pass: true, detail: "gold=76" };
}

export function runEconTests() {
  return econCases().map(runFn);
}

function runFn(fn) {
  try {
    return fn();
  } catch (e) {
    return { name: fn.name, pass: false, detail: String((e && e.message) || e) };
  }
}

function econCases() {
  return [t_production, t_storageCap, t_storage_caps, t_noWorker, t_foodFloor, t_deterministic,
    t_popRise, t_starve, t_immigration, t_emigration, t_tax, t_balance_bribe,
    t_stone_produce, t_bakery_chain, t_bakery_starved, t_bakery_cost,
    t_beer_chain, t_brewery_starved, t_beer_costs, t_inn_cheer, t_mill_cost, t_rates_from_config, t_iron_chain,
    t_market_buy_sell, t_market_gates, t_market_caps, t_market_save];
}

// رشوه (0.14.0): سطح مالیات منفی — هر ۵۰ تیک ۱ طلا به ازای هر کارگر کم می‌کند
// (با کف صفر) و هدف محبوبیت را +۵ بالا می‌برد.
function t_balance_bribe() {
  const { state } = fresh();
  state.tax = "bribe";
  state.workers = 4;
  must(popTarget(state) === 58, `هدف باید ۵۸ باشد (۵۰+۵+۱+۲)، هست ${popTarget(state)}`);
  sim(state, 50);
  must(state.resources.gold === 56, `طلا باید ۵۶ باشد، هست ${state.resources.gold}`);
  // کف صفر: خزانه خالی منفی نمی‌شود
  state.resources.gold = 2;
  sim(state, 50);
  must(state.resources.gold === 0, `طلا نباید منفی شود، هست ${state.resources.gold}`);
  return { name: "رشوه", pass: true, detail: "۴طلا/۵۰تیک + هدف ۵۸ + کف صفر" };
}

// --- سنگ (0.18.0) ---

// معدن سنگ: ۱ سنگ / ۲۵ تیک با ۱ کارگر + سقف ۵۰۰ + قانون فاصله از هم‌نوع.
function t_stone_produce() {
  const { W, H, terrain, state } = fresh();
  const q = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.quarry);
  must(q.ok, "معدن سنگ باید ساخته شود");
  must(state.resources.wood === 105, "هزینه معدن (۱۵ چوب) باید کم شود");
  sim(state, 50); // ۲ سنگ
  must(state.resources.stone === 42, `سنگ باید ۴۲ باشد، هست ${state.resources.stone}`);
  state.resources.stone = 499;
  sim(state, 50);
  must(state.resources.stone === 500, `سقف سنگ ۵۰۰ باید رعایت شود، هست ${state.resources.stone}`);
  const v = validate(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.quarry); // چسبیده
  must(!v.ok && v.reason === "SPACING", `معدن چسبیده باید SPACING باشد، شد ${v.reason}`);
  return { name: "تولید سنگ", pass: true, detail: "۲ سنگ/۵۰تیک + سقف + فاصله" };
}

// --- زنجیره نان سه‌حلقه‌ای (0.20.0؛ 0.38.0 حلقه میانی آسیاب گرفت) ---

// مزرعه + آسیاب + نانوایی، ۲۰۰ تیک: ۲۰ گندم شروع + ۱۰ تولید − ۲۶ مصرف آسیاب = ۴؛
// آسیاب ۱۳ چرخه → ۲۶ آرد؛ نانوایی با یک تیک تأخیر خط لوله (آرد باید اول برسد)
// ۱۲ چرخه → ۲۴ مصرف = ۲ آرد در خط؛ ۱۲ غذا − ۳ خوراک (۳ دهان) = ۱۲۹.
function t_bakery_chain() {
  const { W, H, terrain, state } = fresh();
  const wf = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.wheatfarm);
  must(wf.ok, "مزرعه گندم باید ساخته شود");
  const ml = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.mill);
  must(ml.ok, "آسیاب باید ساخته شود");
  const bk = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.bakery);
  must(bk.ok, "نانوایی باید ساخته شود");
  must(state.resources.wood === 80, `چوب باید ۸۰ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 30, `سنگ باید ۳۰ باشد، هست ${state.resources.stone}`);
  sim(state, 200);
  must(state.resources.wheat === 4, `گندم باید ۴ باشد، هست ${state.resources.wheat}`);
  must(state.resources.flour === 2, `آرد باید ۲ باشد، هست ${state.resources.flour}`);
  must(state.resources.food === 129, `غذا باید ۱۲۹ باشد، هست ${state.resources.food}`);
  must(ml.building.starved === false, "آسیاب با تأمین کامل نباید starved باشد");
  return { name: "زنجیره نان (گندم→آرد→غذا)", pass: true, detail: "گندم=۴، آرد=۲، غذا=۱۲۹ پس از ۲۰۰ تیک" };
}

// قحطی ورودی: بدون آرد کافی پیشرفت جلو نمی‌رود و بدهی ثبت نمی‌شود؛ با رسیدن
// آرد همان چرخه تمام می‌شود.
function t_bakery_starved() {
  const { W, H, terrain, state } = fresh();
  const bk = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.bakery);
  must(bk.ok, "نانوایی باید ساخته شود");
  state.resources.flour = 1; // کمتر از ۲ لازم برای یک چرخه
  sim(state, 60);
  must((bk.building.progress || 0) === 0, "پیشرفت در قحطی نباید جلو برود");
  must(bk.building.starved === true, "پرچم starved باید ست باشد");
  must(state.resources.flour === 1, "آرد نباید کم شود");
  must(state.resources.food === 120, `غذا نباید تغییر کند، هست ${state.resources.food}`);
  state.resources.flour = 10;
  sim(state, 15);
  must(state.resources.flour === 8, `آرد باید ۸ باشد، هست ${state.resources.flour}`);
  must(state.resources.food === 121, `غذا باید ۱۲۱ باشد، هست ${state.resources.food}`);
  must(bk.building.starved === false, "با رسیدن آرد نباید starved بماند");
  return { name: "قحطی ورودی نانوایی", pass: true, detail: "انتظار + ازسرگیری با ۲←۱" };
}

// هزینه نانوایی (۱۰چ+۵سنگ): کسر هر دو + رد کمبود سنگ.
function t_bakery_cost() {
  const { W, H, terrain, state } = fresh();
  const bk = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.bakery);
  must(bk.ok, "نانوایی باید ساخته شود");
  must(state.resources.wood === 110, `چوب باید ۱۱۰ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 35, `سنگ باید ۳۵ باشد، هست ${state.resources.stone}`);
  state.resources.stone = 0;
  const v = validate(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.bakery);
  must(!v.ok && v.reason === "INSUFFICIENT", `بدون سنگ باید INSUFFICIENT باشد، شد ${v.reason}`);
  return { name: "هزینه نانوایی", pass: true, detail: "کسر ۱۰چ+۵سنگ + رد سنگ" };
}

// هزینه آسیاب (۱۰چ+۵سنگ): کسر هر دو + رد کمبود سنگ.
function t_mill_cost() {
  const { W, H, terrain, state } = fresh();
  const ml = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.mill);
  must(ml.ok, "آسیاب باید ساخته شود");
  must(state.resources.wood === 110, `چوب باید ۱۱۰ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 35, `سنگ باید ۳۵ باشد، هست ${state.resources.stone}`);
  state.resources.stone = 0;
  const v = validate(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.mill);
  must(!v.ok && v.reason === "INSUFFICIENT", `بدون سنگ باید INSUFFICIENT باشد، شد ${v.reason}`);
  return { name: "هزینه آسیاب", pass: true, detail: "کسر ۱۰چ+۵سنگ + رد سنگ" };
}

// تک‌منبع بودن نرخ‌ها (0.38.0): RATES از CONFIG.BUILDINGS ساخته می‌شود.
function t_rates_from_config() {
  must(RATES.mill && RATES.mill.produces === "flour", "آسیاب باید آرد بدهد");
  must(RATES.mill.consumes && RATES.mill.consumes.wheat === 2, "آسیاب باید ۲ گندم بخورد");
  must(RATES.bakery.consumes && RATES.bakery.consumes.flour === 2, "نانوایی باید ۲ آرد بخورد");
  must(RATES.bakery.consumes.wheat === undefined, "نانوایی دیگر گندم نمی‌خورد");
  for (const k of ["woodcutter", "farm", "quarry", "wheatfarm", "mill", "bakery", "hopsfarm", "brewery", "ironmine", "armoury", "fletcher"]) {
    must(RATES[k] && RATES[k].source === CONFIG.BUILDINGS[k].source, `نرخ ${k} باید از CONFIG بیاید`);
  }
  return { name: "نرخ‌های تک‌منبع", pass: true, detail: "RATES ← CONFIG.BUILDINGS.econ" };
}

// --- زنجیره سلاح (0.44.0 — #۹ از FEATURES، شماره ۲ از NEXT-5) ---

// معدن آهن×۲ + زرادخانه + کمان‌سازی، ۴۰۰ تیک: شمشیر و کمان هر دو می‌آیند؛
// سقف خانواده سلاح با هر زرادخانه/کمان‌سازی +۵۰۰ (پایه ۵۰۰ + ۲×۵۰۰ = ۱۵۰۰).
function t_iron_chain() {
  const { W, H, terrain, state } = fresh();
  const spots = [[1, 1], [10, 1], [20, 1], [30, 1]];
  const keys = ["ironmine", "ironmine", "armoury", "fletcher"];
  keys.forEach((key, i) => {
    const def = CONFIG.BUILDINGS[key];
    const site = siteNear(terrain, state.occ, W, H, spots[i][0], spots[i][1], def.w, def.h);
    must(site, `جا برای ${def.name} باید باشد`);
    const r = tryPlace(state, terrain, W, H, site[0], site[1], def);
    must(r.ok, `${def.name} باید ساخته شود، شد ${r.reason}`);
  });
  must(state.resources.wood === 50, `چوب باید ۵۰ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 20, `سنگ باید ۲۰ باشد، هست ${state.resources.stone}`);
  sim(state, 400);
  // سقف خانواده سلاح: پایه ۵۰۰ + زرادخانه/کمان‌سازی سالم هرکدام +۵۰۰ (پس از sim تکمیل‌اند).
  must(capFor(state, "swords") === 1500, `سقف شمشیر باید ۱۵۰۰ باشد، هست ${capFor(state, "swords")}`);
  must(state.resources.swords >= 3, `شمشیر باید ≥۳ باشد، هست ${state.resources.swords}`);
  must(state.resources.bows >= 2, `کمان باید ≥۲ باشد، هست ${state.resources.bows}`);
  return { name: "زنجیره سلاح (آهن→شمشیر/کمان)", pass: true, detail: `شمشیر=${state.resources.swords}، کمان=${state.resources.bows} پس از ۴۰۰ تیک` };
}

// --- بازار خرید/فروش (0.64.0 — ب-۳ بک‌لاگ) ---

// بازار ۲×۲ (۲۰چ+۱۰سنگ) + خرید/فروش بسته ۱۰تایی با واسطه طلا، از مسیر صف فرمان.
function t_market_buy_sell() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market);
  must(r.ok, `بازار باید ساخته شود، شد ${r.reason}`);
  must(hasMarket(state) === false, "نیمه‌کاره دروازه معامله نیست");
  completeAll(state);
  must(hasMarket(state) === true, "پس از تکمیل دروازه باز است");
  // خرید ۱۰ چوب (نرخ ۵ط): طلا ۶۰←۱۰، چوب ۱۰۰←۱۱۰ — از صف فرمان سولو
  const q = createQueue();
  must(enqueueCmd(q, { kind: "trade", res: "wood", dir: "buy" }, state.tick).ok, "فرمان معامله باید در صف برود");
  stepSim(state, terrain, 2, q);
  must(state.resources.gold === 10, `طلا باید ۱۰ باشد، هست ${state.resources.gold}`);
  must(state.resources.wood === 110, `چوب باید ۱۱۰ باشد، هست ${state.resources.wood}`);
  // فروش ۱۰ چوب (نرخ ۲ط): چوب ۱۱۰←۱۰۰، طلا ۱۰←۳۰
  const s = applyTrade(state, "wood", "sell", 0);
  must(s.ok && s.n === 10, `فروش باید ۱۰تایی باشد، شد ${JSON.stringify(s)}`);
  must(state.resources.wood === 100 && state.resources.gold === 30, "فروش: چوب−۱۰، طلا+۲۰");
  return { name: "خرید و فروش بازار", pass: true, detail: "خرید از صف + فروش مستقیم" };
}

// نگهبان‌ها: بدون بازار/نیمه‌کاره/طلای تهی/منبع تهی/طلا/شکل خراب.
function t_market_gates() {
  const { W, H, terrain, state } = fresh();
  const no = applyTrade(state, "wood", "buy", 0);
  must(!no.ok && no.reason === "NO_MARKET", `بدون بازار باید NO_MARKET باشد، شد ${no.reason}`);
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market);
  must(r.ok, "بازار باید ساخته شود");
  const raw = applyTrade(state, "wood", "buy", 0);
  must(!raw.ok && raw.reason === "UNDER_CONSTRUCTION", `نیمه‌کاره باید UNDER_CONSTRUCTION باشد، شد ${raw.reason}`);
  completeAll(state);
  state.resources.gold = 0;
  const poor = applyTrade(state, "wood", "buy", 0);
  must(!poor.ok && poor.reason === "NO_GOLD", `طلای تهی باید NO_GOLD باشد، شد ${poor.reason}`);
  state.resources.gold = 60;
  state.resources.iron = 0;
  const empty = applyTrade(state, "iron", "sell", 0);
  must(!empty.ok && empty.reason === "NO_STOCK", `منبع تهی باید NO_STOCK باشد، شد ${empty.reason}`);
  const cur = applyTrade(state, "gold", "buy", 0);
  must(!cur.ok && cur.reason === "UNKNOWN", `طلا باید UNKNOWN باشد، شد ${cur.reason}`);
  const bad = applyTrade(state, "wood", "swap", 0);
  must(!bad.ok && bad.reason === "INVALID", `جهت خراب باید INVALID باشد، شد ${bad.reason}`);
  return { name: "نگهبان‌های بازار", pass: true, detail: "۶ رد تمیز" };
}

// سقف‌ها: خرید نزدیک سقف تراش می‌خورد (هزینه متناسب، بدون اتلاف)؛ فروش با طلای پر هم.
function t_market_caps() {
  const { W, H, terrain, state } = fresh();
  must(tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market).ok, "بازار باید ساخته شود");
  completeAll(state);
  const woodCap = capFor(state, "wood"), goldCap = capFor(state, "gold");
  state.resources.wood = woodCap - 3;
  const b = applyTrade(state, "wood", "buy", 0);
  must(b.ok && b.n === 3, `خرید باید ۳تایی تراش بخورد، شد ${JSON.stringify(b)}`);
  must(state.resources.wood === woodCap, "چوب باید دقیقاً سقف شود");
  must(state.resources.gold === 60 - 15, `طلا باید ۴۵ باشد (۳×۵)، هست ${state.resources.gold}`);
  state.resources.gold = goldCap - 5;
  state.resources.wood = 100;
  const s = applyTrade(state, "wood", "sell", 0);
  must(s.ok && s.n === 2, `فروش باید ۲تایی تراش بخورد (جا ۵ط ÷ ۲)، شد ${JSON.stringify(s)}`);
  must(state.resources.gold === goldCap - 1, `طلا باید سقف−۱ باشد، هست ${state.resources.gold}`);
  return { name: "سقف‌های بازار", pass: true, detail: "تراش خرید ۳ + فروش ۲" };
}

// سازگاری ذخیره: بازار و منابع پس از رفت‌وبرگشت می‌مانند (فیلد تازه‌ای نیست — بدون bump).
function t_market_save() {
  const { W, H, terrain, state } = fresh();
  must(tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market).ok, "بازار باید ساخته شود");
  completeAll(state);
  state.resources.gold = 500;
  must(applyTrade(state, "stone", "buy", 0).ok, "خرید سنگ باید موفق باشد");
  const loaded = deserializeJSON(serializeJSON(state));
  const m = loaded.buildings.find((b) => b.type === "market" && !b.destroyed);
  must(m, "بازار باید در ذخیره بماند");
  must(loaded.resources.stone === 40 && loaded.resources.gold === 420, `سنگ/طلا باید حفظ شوند: ${loaded.resources.stone}، ${loaded.resources.gold}`);
  return { name: "ذخیره بازار", pass: true, detail: "بنا + منابع" };
}

// --- زنجیره آبجو (0.21.0) ---

// مزرعه رازک + آبجوسازی: ۲۰ رازک شروع + ۱۰ تولید − ۲۰ مصرف = ۱۰؛ آبجو = ۱۰.
function t_beer_chain() {
  const { W, H, terrain, state } = fresh();
  const hf = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hopsfarm);
  must(hf.ok, "مزرعه رازک باید ساخته شود");
  const br = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.brewery);
  must(br.ok, "آبجوسازی باید ساخته شود");
  must(state.resources.wood === 90, `چوب باید ۹۰ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 35, `سنگ باید ۳۵ باشد، هست ${state.resources.stone}`);
  state.resources.hops = 20;
  sim(state, 200);
  must(state.resources.hops === 10, `رازک باید ۱۰ باشد، هست ${state.resources.hops}`);
  must(state.resources.beer === 10, `آبجو باید ۱۰ باشد، هست ${state.resources.beer}`);
  must(state.resources.food === 118, `غذا باید ۱۱۸ باشد، هست ${state.resources.food}`);
  must(br.building.starved === false, "با تأمین کامل نباید starved باشد");
  return { name: "زنجیره آبجو", pass: true, detail: "رازک=۱۰، آبجو=۱۰ پس از ۲۰۰ تیک" };
}

// قحطی ورودی آبجوسازی: انتظار بدون پیشرفت + ازسرگیری.
function t_brewery_starved() {
  const { W, H, terrain, state } = fresh();
  const br = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.brewery);
  must(br.ok, "آبجوسازی باید ساخته شود");
  state.resources.hops = 1;
  sim(state, 60);
  must((br.building.progress || 0) === 0, "پیشرفت در قحطی نباید جلو برود");
  must(br.building.starved === true, "پرچم starved باید ست باشد");
  must(state.resources.hops === 1, "رازک نباید کم شود");
  must(state.resources.beer === 0, "آبجو نباید ساخته شود");
  state.resources.hops = 10;
  sim(state, 20);
  must(state.resources.hops === 8, `رازک باید ۸ باشد، هست ${state.resources.hops}`);
  must(state.resources.beer === 1, `آبجو باید ۱ باشد، هست ${state.resources.beer}`);
  must(br.building.starved === false, "با رسیدن رازک نباید starved بماند");
  return { name: "قحطی ورودی آبجوسازی", pass: true, detail: "انتظار + ازسرگیری با ۲←۱" };
}

// هزینه‌ها: مزرعه رازک ۲۰چ، آبجوسازی ۱۰چ+۵سنگ، میخانه ۱۵چ + رد کمبود سنگ.
function t_beer_costs() {
  const { W, H, terrain, state } = fresh();
  must(tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hopsfarm).ok, "مزرعه رازک");
  must(tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.brewery).ok, "آبجوسازی");
  must(tryPlace(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.inn).ok, "میخانه");
  must(state.resources.wood === 75, `چوب باید ۷۵ باشد، هست ${state.resources.wood}`);
  must(state.resources.stone === 35, `سنگ باید ۳۵ باشد، هست ${state.resources.stone}`);
  state.resources.stone = 0;
  const v = validate(state, terrain, W, H, 4, 4, CONFIG.BUILDINGS.brewery);
  must(!v.ok && v.reason === "INSUFFICIENT", `بدون سنگ باید INSUFFICIENT باشد، شد ${v.reason}`);
  return { name: "هزینه زنجیره آبجو", pass: true, detail: "۲۰چ + ۱۰چ۵سنگ + ۱۵چ + رد سنگ" };
}

// میخانه: ۱ آبجو/۵۰تیک ← served و +۳ هدف محبوبیت؛ بدون آبجو خاموش.
function t_inn_cheer() {
  const { W, H, terrain, state } = fresh();
  const inn = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn);
  must(inn.ok, "میخانه باید ساخته شود");
  state.resources.beer = 5;
  sim(state, 50);
  must(state.resources.beer === 4, `آبجو باید ۴ باشد، هست ${state.resources.beer}`);
  must(inn.building.served === true, "میخانه باید served باشد");
  must(popTarget(state) === 56, `هدف باید ۵۶ باشد (۵۰+۰+۱+۲+۳)، هست ${popTarget(state)}`);
  must(state.popularity === 52, `محبوبیت باید ۵۲ باشد، هست ${state.popularity}`);
  state.resources.beer = 0;
  sim(state, 50);
  must(inn.building.served === false, "بدون آبجو نباید served بماند");
  must(popTarget(state) === 53, `هدف بدون سرو باید ۵۳ باشد، هست ${popTarget(state)}`);
  return { name: "شادی میخانه", pass: true, detail: "۵۶ با سرو / ۵۳ بدون سرو" };
}

// --- PERSIST-001 ---

function snapOf(s) {
  return JSON.stringify({
    tick: s.tick, res: s.resources, w: s.workers, pop: s.popularity,
    tax: s.tax, rat: s.rations,
    b: s.buildings.map((b) => [b.type, b.c, b.r, b.progress || 0]),
    p: s.producedTotal, c: s.consumedTotal, sh: s.shortageTotal,
  });
}

function t_save_roundtrip() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.woodcutter);
  tryPlace(state, terrain, W, H, 1, 4, CONFIG.BUILDINGS.farm);
  state.tax = "high";
  state.rations = "double";
  sim(state, 250);
  const loaded = deserializeJSON(serializeJSON(state));
  must(snapOf(loaded) === snapOf(state), "وضعیت بارگذاری‌شده باید با اسنپ‌شات برابر باشد");
  must(loaded.paused === state.paused, "پرچم توقف باید حفظ شود");
  return { name: "چرخه ذخیره/بازیابی", pass: true, detail: `${serializeJSON(state).length} بایت، تیک ${state.tick}` };
}

function t_save_paused() {
  const { state } = fresh();
  state.paused = true;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.paused === true, "ذخیره حین توقف باید معتبر بماند");
  return { name: "ذخیره حین توقف", pass: true, detail: "paused=true حفظ شد" };
}

function t_save_reject() {
  const bad = ["{خراب", "null", "[]", "{}", `{"v":${SCHEMA_VERSION + 1}}`, '{"v":0}'];
  for (const t of bad) {
    let threw = null;
    try {
      deserializeJSON(t);
    } catch (e) {
      threw = e;
    }
    must(threw instanceof SaveError, `باید SaveError بدهد: ${t.slice(0, 20)}`);
  }
  // دست‌کاری: نوع نامعتبر، مرز خارج، منبع منفی
  const { W, H, state } = fresh();
  const good = JSON.parse(serializeJSON(state));
  const tampered = [
    { ...good, buildings: [{ id: 1, type: "tank", c: 1, r: 1, progress: 0 }] },
    { ...good, buildings: [{ id: 1, type: "hut", c: W - 1, r: H - 1, progress: 0 }] },
    { ...good, mapSeed: -5 },
    { ...good, resources: { ...good.resources, wood: -5 } },
    { ...good, tax: "extreme" },
  ];
  for (const t of tampered) {
    let ok = true;
    try {
      deserialize(t);
    } catch {
      ok = false;
    }
    must(!ok, "داده دست‌کاری‌شده باید رد شود");
  }
  const rt = deserializeJSON(serializeJSON(state));
  must(rt.mapSeed === (state.mapSeed >>> 0), "سید نقشه باید در ذخیره بماند");
  return { name: "رد داده نامعتبر", pass: true, detail: "۶ خراب + ۵ دست‌کاری رد شدند + سید ماند" };
}

function t_save_occ() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  const loaded = deserializeJSON(serializeJSON(state));
  // اشغال باید بازسازی شده باشد: همان خانه برای ساختمان جدید نامعتبر است
  const v = tryPlace(loaded, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  must(!v.ok && v.reason === "OCCUPIED", "اشغال باید پس از بارگذاری بازسازی شود");
  return { name: "بازسازی اشغال", pass: true, detail: "OCCUPIED پس از load" };
}

function t_save_progress() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  sim(state, 10);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.buildings[0].progress === 10, `پیشرفت باید ۱۰ بماند، هست ${loaded.buildings[0].progress}`);
  return { name: "حفظ پیشرفت تولید", pass: true, detail: "progress=10" };
}

export function runAllTests() {
  return [...econCases(), ...persistCases(), ...combatCases(), ...pathCases(),
    ...constCases(), ...keepCases(), ...lordCases(), ...sysCases(), ...mpCases(), ...simCases(), ...aiCases(), ...wallCases(), ...soundCases(), ...mapeditCases(), ...gestureCases(), ...schemaCases(), ...a11yCases(), ...hardeningCases(), ...replayCases(), ...groupCases(), ...legalCases(), ...firstTenCases(), ...trainCases(), ...missionCases(), ...cloudCases()].map(runFn);
}

// --- بک‌اند IndexedDB (0.55.0 — #۱۶ از FEATURES): فاز تست ناهمگام ---
// IDB ذاتاً Promise است و runAllTests سینک می‌ماند (جریان ?test/بج)، پس این
// فاز جدا با await اجرا می‌شود: window.__slice01.runIdbTests(). کلیدهای تست
// با پیشوند scw.test. هستند و هر تست خودش تمیز می‌کند؛ اسلات‌های واقعی بازی
// لمس نمی‌شوند. بدون IDB در مرورگر، تست‌های IDB-خالص skip-pass می‌دهند و
// fallback روی localStorage همان‌طور کامل اجرا می‌شود.
export async function runIdbTests() {
  const out = [];
  for (const fn of idbCases()) {
    try {
      out.push(await fn());
    } catch (e) {
      out.push({ name: fn.name, pass: false, detail: String((e && e.message) || e).slice(0, 200) });
    }
  }
  return out;
}

const IDB_TEST_PREFIX = "scw.test.idb.";

function idbCases() {
  return [t_idb_roundtrip, t_idb_cap, t_idb_migrate, t_idb_save_fallback];
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

// --- هسته قطعی sim (0.37.0 — FEATURES #۱) ---

// یک سناریوی نمایشی از صف فرمان: ساخت، استخدام، مالیات، دستور حرکت + نبرد.
function simScriptedRun(seed) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, seed);
  const state = createState();
  state.mapSeed = seed >>> 0;
  const q = createQueue();
  const at = (c) => enqueueCmd(q, c, state.tick);
  must(at({ kind: "place", type: "woodcutter", c: 1, r: 1 }).ok, "صف: ساخت چوب‌بری");
  must(at({ kind: "place", type: "farm", c: 4, r: 1 }).ok, "صف: ساخت مزرعه");
  must(at({ kind: "tax", v: "none" }).ok, "صف: مالیات");
  needBarracks(state, terrain, W, H);
  const h1 = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const h2 = hireUnit(state, terrain, W, H, 6, 5, "soldier");
  must(h1.ok && h2.ok, "استخدام مستقیم پیش‌نیاز باید موفق باشد");
  const ids = state.units.map((u) => u.id);
  must(at({ kind: "order", orderKind: "move", ids, c: 9, r: 5 }).ok, "صف: دستور حرکت");
  spawnUnit(state, "swordsman", 12.5, 5.5); // دشمن قطعی — هر دو اجرا یکسان
  stepSim(state, terrain, 300, q);
  must(queueLen(q) === 0, "صف باید پس از ۳۰۰ تیک خالی باشد");
  return stateHash(state);
}

// سید + فرمان یکسان ⇒ هش یکسان؛ سید متفاوت ⇒ هش متفاوت.
function t_sim_queue_hash() {
  const h1 = simScriptedRun(CONFIG.MAP_SEED);
  const h2 = simScriptedRun(CONFIG.MAP_SEED);
  must(h1 === h2, `هش دو اجرای یکسان باید برابر باشد ${h1}≠${h2}`);
  const h3 = simScriptedRun(999);
  must(h3 !== h1, "سید متفاوت باید هش متفاوت بدهد");
  return { name: "هش قطعی صف فرمان", pass: true, detail: h1 };
}

// فرمان نامعتبر = rejected، نه throw؛ خرج دوباره (double-spend) ممکن نیست.
function t_sim_queue_reject() {
  const { W, H, terrain, state } = fresh();
  const q = createQueue();
  const p0 = state.placed, r0 = state.rejected;
  must(enqueueCmd(q, { kind: "place", type: "hut", c: -1, r: -1 }, state.tick).ok, "صف نامعتبر هم پذیرفته می‌شود");
  state.resources.wood = 20; // فقط یکی از دو چوب‌بری (۱۵ چوبی) جا می‌شود
  must(enqueueCmd(q, { kind: "place", type: "woodcutter", c: 1, r: 1 }, state.tick).ok, "صف اول");
  must(enqueueCmd(q, { kind: "place", type: "woodcutter", c: 4, r: 1 }, state.tick).ok, "صف دوم");
  must(enqueueCmd(q, { kind: "nonsense" }, state.tick).ok, "نوع ناشناس هم در صف می‌ماند");
  stepSim(state, terrain, 3, q);
  must(state.placed === p0 + 1, `فقط یکی باید ساخته شود، placed=${state.placed}`);
  must(state.rejected >= r0 + 2, `دست‌کم ۲ رد (مرز + کمبود) باید ثبت شود، rejected=${state.rejected}`);
  must(state.resources.wood === 5, `چوب باید ۵ بماند، هست ${state.resources.wood}`);
  return { name: "رد امن صف فرمان", pass: true, detail: `placed+1، rejected+${state.rejected - r0}` };
}

// آینه‌بودن stepSim با حلقه دستی قدیمی (تضمین بازنویسی main.js/ff).
function t_sim_mirror() {
  const runManual = () => {
    const { W, H, terrain, state } = fresh();
    tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
    needBarracks(state, terrain, W, H);
    hireUnit(state, terrain, W, H, 5, 5, "soldier");
    spawnUnit(state, "swordsman", 12.5, 5.5);
    for (let i = 0; i < 200; i++) { state.tick++; stepEconomy(state); stepCombat(state, terrain); }
    return stateHash(state);
  };
  const runStep = () => {
    const { W, H, terrain, state } = fresh();
    tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
    needBarracks(state, terrain, W, H);
    hireUnit(state, terrain, W, H, 5, 5, "soldier");
    spawnUnit(state, "swordsman", 12.5, 5.5);
    stepSim(state, terrain, 200);
    return stateHash(state);
  };
  const a = runManual(), b = runStep();
  must(a === b, `stepSim باید آینه حلقه دستی باشد ${a}≠${b}`);
  return { name: "آینه stepSim", pass: true, detail: a };
}

function simCases() {
  return [t_sim_queue_hash, t_sim_queue_reject, t_sim_mirror];
}

function persistCases() {
  return [t_save_roundtrip, t_save_paused, t_save_reject, t_save_occ, t_save_progress,
    t_save_units, t_migrate_v1, t_stone_save_compat, t_wheat_save_compat, t_beer_save_compat, t_flour_save_compat, t_weapon_save_compat];
}

// --- صف آموزش (0.65.0 — انتخاب ۱-الف) ---

function trainCases() {
  return [t_train_queue, t_train_cancel, t_train_full, t_train_save];
}

// سفارش از صف فرمان: کسر اتمی همان لحظه، بدون تحویل فوری، تحویل پس از ۵۰ تیک.
function t_train_queue() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const spot = grassNear(terrain, state.occ, W, H, 20, 20);
  must(spot, "جای تحویل باید باشد");
  const f0 = state.resources.food, g0 = state.resources.gold, s0 = state.resources.swords;
  const h0 = stateHash(state);
  const q = createQueue();
  must(enqueueCmd(q, { kind: "hire", type: "soldier", c: spot[0], r: spot[1] }, state.tick).ok, "صف hire");
  stepSim(state, terrain, 1, q);
  const rax = state.buildings.find((b) => b.type === "barracks");
  must(rax && rax.train && rax.train.length === 1, "سفارش باید ته صف باشد");
  must(state.units.length === 0, "تحویل فوری نباید باشد");
  must(state.resources.food === f0 - 40 && state.resources.gold === g0 - 25, "کسر اتمی غذا/طلا همان لحظه");
  must(state.resources.swords === s0 - 1, "کسر اتمی شمشیر همان لحظه");
  must(stateHash(state) !== h0, "هش باید صف غیرخالی را ببیند");
  stepSim(state, terrain, 49, q); // مجموع ۵۰ = trainTicks سرباز
  const me = state.units.find((u) => u.type === "soldier");
  must(me, "پس از ۵۰ تیک سرباز باید تحویل شود");
  must(rax.train.length === 0, "صف باید خالی شود");
  return { name: "صف آموزش و تحویل", pass: true, detail: "کسر اتمی + تحویل در ۵۰ تیک + هش" };
}

// لغو از مسیر فرمان: بازپرداخت کامل غذا/طلا/سلاح.
function t_train_cancel() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const spot = grassNear(terrain, state.occ, W, H, 20, 20);
  must(spot, "جای تحویل باید باشد");
  const f0 = state.resources.food, g0 = state.resources.gold, b0 = state.resources.bows;
  const r = queueHire(state, terrain, W, H, spot[0], spot[1], "bowman", 0);
  must(r.ok, "سفارش مستقیم باید موفق باشد");
  const q = createQueue();
  must(enqueueCmd(q, { kind: "trainCancel", bld: r.bld, idx: 0 }, state.tick).ok, "صف لغو");
  stepSim(state, terrain, 1, q);
  const rax = state.buildings.find((b) => b.type === "barracks");
  must(rax.train.length === 0, "صف باید خالی شود");
  must(state.units.length === 0, "یگانی نباید تحویل شده باشد");
  must(state.resources.food === f0 && state.resources.gold === g0 && state.resources.bows === b0,
    `بازپرداخت کامل: غذا ${state.resources.food}/${f0}، طلا ${state.resources.gold}/${g0}، کمان ${state.resources.bows}/${b0}`);
  const bad = cancelTrain(state, r.bld, 0, 0);
  must(!bad.ok, "لغو اندیس ناموجود باید رد شود");
  return { name: "لغو آموزش با بازپرداخت", pass: true, detail: "بازپرداخت کامل + رد لغو بد" };
}

// سقف صف: ۵ سفارش، ششمی QUEUE_FULL.
function t_train_full() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 500; state.resources.gold = 500;
  const spot = grassNear(terrain, state.occ, W, H, 20, 20);
  must(spot, "جای تحویل باید باشد");
  for (let i = 0; i < CONFIG.TRAIN.queueCap; i++) {
    const r = queueHire(state, terrain, W, H, spot[0], spot[1], "spearman", 0);
    must(r.ok, `سفارش ${i + 1} باید موفق باشد`);
  }
  const full = queueHire(state, terrain, W, H, spot[0], spot[1], "spearman", 0);
  must(!full.ok && full.reason === "QUEUE_FULL", `ششمی باید QUEUE_FULL بدهد، داد ${full.reason}`);
  return { name: "سقف صف آموزش", pass: true, detail: `${CONFIG.TRAIN.queueCap} سفارش + رد ششمی` };
}

// ذخیره: صف با left مانده می‌ماند و پس از load ادامه می‌دهد؛ قدیمی بدون train = [].
function t_train_save() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const spot = grassNear(terrain, state.occ, W, H, 20, 20);
  must(spot, "جای تحویل باید باشد");
  must(queueHire(state, terrain, W, H, spot[0], spot[1], "bowman", 0).ok, "سفارش کماندار");
  const q = createQueue();
  stepSim(state, terrain, 10, q); // left باید ۳۰ شود
  const doc = JSON.parse(serializeJSON(state));
  const raxDoc = doc.buildings.find((b) => b.type === "barracks");
  must(raxDoc.train && raxDoc.train.length === 1 && raxDoc.train[0].left === 30, `صف باید با left=۳۰ بماند، شد ${raxDoc.train && raxDoc.train[0].left}`);
  const loaded = deserialize(doc);
  const rax = loaded.buildings.find((b) => b.type === "barracks");
  must(rax.train.length === 1 && rax.train[0].type === "bowman", "صف پس از load باید بماند");
  const q2 = createQueue();
  stepSim(loaded, terrain, 30, q2);
  must(loaded.units.some((u) => u.type === "bowman"), "پس از load تحویل باید ادامه یابد");
  delete raxDoc.train;
  const old = deserialize(doc);
  must(old.buildings.find((b) => b.type === "barracks").train.length === 0, "قدیمی بدون train = صف خالی");
  return { name: "ذخیره صف آموزش", pass: true, detail: "left=۳۰ + ادامه پس از load + سازگاری" };
}

// --- زیرساخت مأموریت (0.66.0 — انتخاب ۲-ج: فقط زیرساخت، بدون محتوا) ---

function missionCases() {
  return [t_mission_validate, t_mission_run];
}

const SAMPLE_MISSION = {
  key: "sample",
  name: "مأموریت نمونه",
  objectives: [
    { id: "hut2", kind: "haveBuilding", type: "hut", count: 2 },
    { id: "swords2", kind: "haveUnit", type: "soldier", count: 2 },
    { id: "gold50", kind: "resource", res: "gold", amount: 50 },
    { id: "t100", kind: "tick", at: 100 },
    { id: "w2", kind: "wave", n: 2 },
  ],
};

function t_mission_validate() {
  must(validateMission(SAMPLE_MISSION).length === 0, "نمونه معتبر باید پاک باشد");
  const bads = [
    null,
    {},
    { key: "x", name: "ن", objectives: [] },
    { key: "x", name: "ن", objectives: [{ id: "a", kind: "warp" }] },
    { key: "x", name: "ن", objectives: [{ id: "a", kind: "tick", at: 5 }, { id: "a", kind: "tick", at: 6 }] },
    { key: "x", name: "ن", objectives: [{ id: "a", kind: "haveBuilding", type: "hut", count: 0 }] },
    { key: "x", name: "ن", objectives: [{ id: "a", kind: "resource", res: "gold", amount: -1 }] },
    { key: "x", name: "ن", objectives: [{ id: "a", kind: "wave", n: 0 }] },
    { key: "x", name: "ن", objectives: [{ id: "a", kind: "haveUnit", count: 1 }] },
  ];
  for (let i = 0; i < bads.length; i++) {
    must(validateMission(bads[i]).length > 0, `سند خراب ${i} باید رد شود`);
  }
  must(MISSIONS.length === 0, "کاتالوگ shipped باید خالی بماند (محتوا پارک)");
  return { name: "اعتبارسنجی مأموریت", pass: true, detail: `نمونه پاک + ${bads.length} رد + کاتالوگ خالی` };
}

function t_mission_run() {
  const run = createRun(SAMPLE_MISSION);
  must(run.status === "active", "شروع باید active باشد");
  let fresh = updateRun(run, SAMPLE_MISSION, {
    buildings: [{ type: "hut" }, { type: "hut", destroyed: true }],
    units: [{ type: "soldier" }, { type: "soldier", dead: true }],
    resources: { gold: 10 }, tick: 10, wave: 0,
  });
  must(fresh.length === 0 && run.status === "active", "ویران/مرده نباید بشمارد");
  fresh = updateRun(run, SAMPLE_MISSION, {
    buildings: [{ type: "hut" }, { type: "hut" }],
    units: [{ type: "soldier" }, { type: "soldier" }],
    resources: { gold: 60 }, tick: 120, wave: 3,
  });
  must(fresh.length === 5 && run.status === "done" && run.doneTick === 120, `همه باید done شوند، شدند ${fresh.length}`);
  must(updateRun(run, SAMPLE_MISSION, { tick: 999 }).length === 0, "پس از done چیزی تازه نیست");
  let threw = false;
  try { createRun({ key: "bad", name: "", objectives: [] }); } catch (e) { threw = true; }
  must(threw, "ساخت run از سند خراب باید throw بدهد");
  return { name: "اجرای مأموریت", pass: true, detail: "پیشرفت پلکانی + done در ۱۲۰ + قفل پس از پایان" };
}

// --- ذخیره ابری (0.67.0 — انتخاب ۳-الف: بخش خالص کلاینت) ---
// منطق سرور (بایت‌چینی/سهمیه) headless تست ندارد — پوشش آن راستی‌آزمایی زنده
// (ذخیره → بارخوانی → مقایسه) است. این‌جا: هش کلید + مرزهای عبارت + سقف داده.

function cloudCases() {
  return [t_cloud_key, t_cloud_guards];
}

function t_cloud_key() {
  must(cloudKeyHash("") === "811c9dc5", "بردار تهی FNV-1a باید 811c9dc5 باشد");
  const a = cloudKeyHash("قلعه من ۱۲۳");
  must(/^[0-9a-f]{8}$/.test(a), `هش باید ۸ هگز باشد، شد ${a}`);
  must(cloudKeyHash("قلعه من ۱۲۳") === a, "هش باید قطعی باشد");
  must(cloudKeyHash("قلعه من ۱۲۴") !== a, "عبارت متفاوت باید هش متفاوت بدهد");
  must(validCloudKey("abcd") && validCloudKey("  abcde  "), "مرز ۴ با حاشیه");
  must(validCloudKey("x".repeat(32)) && !validCloudKey("x".repeat(33)), "سقف ۳۲");
  must(!validCloudKey("abc") && !validCloudKey("") && !validCloudKey(null), "کوتاه/تهی رد");
  return { name: "کلید ابری", pass: true, detail: `هش ${a} + مرزهای ۴/۳۲` };
}

function t_cloud_guards() {
  must(CLOUD_KEY_MIN === 4 && CLOUD_KEY_MAX === 32, "ثابت‌های مرز عبارت");
  must(CLOUD_DATA_MAX === 32768, "سقف داده آینه سرور");
  for (const k of ["BAD_KEY", "TOO_BIG", "EMPTY", "FULL", "OFFLINE", "SLOW"]) {
    must(typeof CLOUD_FA[k] === "string" && CLOUD_FA[k].length > 0, `پیام ${k}`);
  }
  for (const k of ["slow", "bad", "key", "big", "full", "empty"]) {
    must(typeof CLOUD_FA[k] === "string" && CLOUD_FA[k].length > 0, `کد سرور ${k}`);
  }
  return { name: "نگهبان‌های ابری", pass: true, detail: "مرزها + پیام‌های فارسی" };
}

// --- MIL-001 ---

function t_combat_range() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  must(h.ok, "استخدام باید موفق باشد");
  spawnUnit(state, "swordsman", 8.5, 5.5); // فاصله ۳ — خارج برد، هر دو نزدیک می‌شوند
  simC(state, terrain, 1);
  const foe = state.units.find((u) => u.type === "swordsman");
  must(foe.hp === 60, `پس از ۱ تیک هنوز نباید خسارت دیده باشد، hp=${foe.hp}`);
  simC(state, terrain, 40);
  must(foe.hp < 60, "پس از نزدیک شدن باید خسارت ببیند");
  const me = state.units.find((u) => u.type === "soldier");
  must(me.hp < 60, "دشمن هم باید پاسخ بدهد");
  return { name: "برد و نزدیک شدن", pass: true, detail: `foe=${foe.hp}، me=${me.hp}` };
}

function t_combat_2v1() {
  const run = () => {
    const { W, H, terrain, state } = fresh();
    needBarracks(state, terrain, W, H);
    hireUnit(state, terrain, W, H, 5, 5, "soldier");
    hireUnit(state, terrain, W, H, 6, 5, "soldier");
    spawnUnit(state, "swordsman", 5.5, 7.5);
    let t = 0;
    while (state.units.some((u) => u.type === "swordsman") && t < 200) {
      simC(state, terrain, 1);
      t++;
    }
    return { t, alive: state.units.filter((u) => u.type === "soldier").length };
  };
  const a = run(), b = run();
  must(a.t === b.t, "مدت نبرد باید قطعی باشد");
  must(a.alive >= 1, "حداقل یک سرباز باید زنده بماند");
  must(a.t > 0 && a.t < 200, `مدت باید معقول باشد، هست ${a.t}`);
  return { name: "نبرد ۲ در برابر ۱", pass: true, detail: `${a.t} تیک، ${a.alive} بازمانده` };
}

// جرقه نبرد (ب-۲، 0.63.0): ضربه تن‌به‌تن = clash در میانه دو مبارز،
// ضربه دوربرد = shot؛ نمایشی ولی قطعی (دو اجرای هم‌سید یک دنباله می‌دهند)،
// خارج هش (stateHash فیلد fx را نمی‌خواند) و خارج ذخیره (serialize فیلدبه‌فیلد).
function t_combat_clash_fx() {
  const run = (type) => {
    const { W, H, terrain, state } = fresh();
    needBarracks(state, terrain, W, H);
    const h = hireUnit(state, terrain, W, H, 5, 5, type);
    must(h.ok, `استخدام ${type} باید موفق باشد، شد ${h.reason}`);
    spawnUnit(state, "swordsman", 6.5, 5.5); // چسبیده: در برد هر دو
    simC(state, terrain, 30);
    return { state, kinds: state.fx.map((f) => f.kind || "arc") };
  };
  const melee = run("soldier");
  must(melee.kinds.some((k) => k === "clash"), "ضربه تن‌به‌تن باید clash ثبت کند");
  const ranged = run("bowman");
  must(ranged.kinds.some((k) => k === "shot"), "ضربه دوربرد (برد ۵٫۵) باید shot ثبت کند");
  // قطعیت سرتاسری با جلوه: هشِ دو اجرای هم‌سید یکسان (fx در هش نیست ولی
  // ضربه‌ها همان‌اند — جلوه نباید واگرایی بسازد).
  const a = run("soldier"), b = run("soldier");
  must(a.kinds.join(",") === b.kinds.join(",") && a.kinds.length > 0, "دنباله جلوه باید قطعی و ناتهی باشد");
  must(stateHash(a.state) === stateHash(b.state), "هش دو اجرای هم‌سید باید یکسان باشد");
  // خارج ذخیره
  must(!serializeJSON(a.state).includes("clash") && !serializeJSON(a.state).includes('"fx"'), "جلوه نباید در ذخیره باشد");
  return { name: "جرقه نبرد", pass: true, detail: "clash + shot + قطعیت + خارج هش/ذخیره" };
}

function t_combat_cleanup() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  spawnUnit(state, "swordsman", 6.5, 5.5);
  simC(state, terrain, 200); // یکی می‌میرد
  must(state.units.length <= 1, "باید حداکثر یک واحد بماند");
  simC(state, terrain, 30); // بدون خطا ادامه یابد
  for (const u of state.units) {
    const okRef = u.targetKind === null ||
      (u.targetKind === "unit" && state.units.some((e) => e.id === u.targetId)) ||
      (u.targetKind === "bld" && state.buildings.some((b) => b.id === u.targetId));
    must(okRef, "ارجاع کهنه نباید بماند");
  }
  return { name: "پاک‌سازی ارجاع مرده", pass: true, detail: `${state.units.length} واحد باقی` };
}

function t_combat_bld() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  spawnUnit(state, "swordsman", 9.5, 6.5);
  let t = 0;
  while (state.buildings.length > 0 && t < 500) {
    simC(state, terrain, 1);
    t++;
  }
  must(state.buildings.length === 0, "کلبه باید ویران شود");
  must(state.events.some((e) => e.includes("ویران")), "رویداد ویرانی باید ثبت شود");
  const v = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.woodcutter);
  must(v.ok, "اشغال باید پس از ویرانی آزاد شود");
  return { name: "ویرانی ساختمان", pass: true, detail: `${t} تیک تا ویرانی` };
}

function t_combat_tower() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.tower);
  spawnUnit(state, "swordsman", 9.5, 6.5); // فاصله ۳: در برد برج، خارج برد شمشیر
  simC(state, terrain, 200);
  must(!state.units.some((u) => u.type === "swordsman"), "شمشیرزن باید کشته شود");
  const tower = state.buildings.find((b) => b.type === "tower");
  must(tower && tower.hp > 150, `برج باید سالم بماند، hp=${tower && tower.hp}`);
  return { name: "دفاع برج", pass: true, detail: `hp برج=${tower.hp}` };
}

// دروازه سربازخانه (0.29.0 سرباز، 0.30.0 سرباز و کماندار): بدون سربازخانه
// سالم خودی، هیچ مزدوری نه؛ ویرانی دوباره قفل می‌کند؛ در MP فقط خودی.
function t_barracks_gate() {
  const { W, H, terrain, state } = fresh();
  state.resources.swords = 5; state.resources.bows = 5; // انبار مهمات (0.44.0)
  must(!hasBarracks(state), "اول نباید سربازخانه باشد");
  const h = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  must(!h.ok && h.reason === "NO_BARRACKS", `بدون سربازخانه باید NO_BARRACKS باشد، شد ${h.reason}`);
  const b = hireUnit(state, terrain, W, H, 5, 5, "bowman");
  must(!b.ok && b.reason === "NO_BARRACKS", `کماندار هم بدون سربازخانه باید NO_BARRACKS باشد، شد ${b.reason}`);
  must(state.resources.food === 120 && state.resources.gold === 60, "رد نباید منابع کم کند");
  must(state.units.length === 0, "واحدی نباید ساخته شود");
  // ساخت واقعی از پالت (نخستین جای آزاد)
  const def = CONFIG.BUILDINGS.barracks;
  let r = null;
  for (let rr = 1; rr + def.h <= H && !r; rr++) {
    for (let cc = 1; cc + def.w <= W && !r; cc++) {
      if (validate(state, terrain, W, H, cc, rr, def).ok) {
        r = tryPlace(state, terrain, W, H, cc, rr, def);
      }
    }
  }
  must(r && r.ok, "سربازخانه باید ساخته شود");
  completeAll(state); // این تست دروازه استخدام است، نه ساخت‌تدریجی (0.39.0)
  must(hasBarracks(state), "حالا باید سربازخانه باشد");
  const h2 = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  must(h2.ok, "با سربازخانه استخدام باید موفق باشد");
  const hb = hireUnit(state, terrain, W, H, 7, 5, "bowman");
  must(hb.ok, "با سربازخانه استخدام کماندار هم باید موفق باشد");
  r.building.destroyed = true;
  must(!hasBarracks(state), "ویران‌شده شمرده نمی‌شود");
  const h3 = hireUnit(state, terrain, W, H, 7, 5, "soldier");
  must(!h3.ok && h3.reason === "NO_BARRACKS", "پس از ویرانی دوباره قفل است");
  // چندنفره: سربازخانه حریف به کار من نمی‌آید
  enableMp(state, 2, ["A", "B"]);
  needBarracks(state, terrain, W, H, 1);
  const g1 = grassNear(terrain, state.occ, W, H, 20, 20);
  must(g1, "باید جای خالی برای تست MP باشد");
  const m0 = hireUnit(state, terrain, W, H, g1[0], g1[1], "soldier", 0);
  must(!m0.ok && m0.reason === "NO_BARRACKS", "سربازخانه حریف به کار من نمی‌آید");
  state.occ[g1[1] * W + g1[0]] = 1; // موقتاً بگیر تا خانه دوم جدا باشد
  const g2 = grassNear(terrain, state.occ, W, H, 22, 20);
  state.occ[g1[1] * W + g1[0]] = 0;
  must(g2, "باید جای دوم برای تست MP باشد");
  const m1 = hireUnit(state, terrain, W, H, g2[0], g2[1], "soldier", 1);
  must(m1.ok, "مالک سربازخانه باید استخدام کند");
  return { name: "دروازه سربازخانه", pass: true, detail: "رد هر دو/ساخت/ویرانی/MP" };
}

// قفل سلاح استخدام (0.44.0 — #۹): بدون شمشیر/کمان NEEDS_WEAPON؛ با آن موفق
// + ۱ واحد کم می‌شود (غذا/طلا دست‌نخورده در همین مسیر آزموده می‌شود).
function t_hire_needs_weapon() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.swords = 0; state.resources.bows = 0; // انبار خالی (نقطه شروع بازی)
  state.resources.food = 200; state.resources.gold = 200;
  const g = grassNear(terrain, state.occ, W, H, 5, 5);
  must(g, "جای استخدام باید باشد");
  let h = hireUnit(state, terrain, W, H, g[0], g[1], "soldier");
  must(!h.ok && h.reason === "NEEDS_WEAPON", `سرباز بدون شمشیر باید NEEDS_WEAPON باشد، شد ${h.reason}`);
  h = hireUnit(state, terrain, W, H, g[0], g[1], "bowman");
  must(!h.ok && h.reason === "NEEDS_WEAPON", `کماندار بدون کمان باید NEEDS_WEAPON باشد، شد ${h.reason}`);
  state.resources.swords = 1;
  h = hireUnit(state, terrain, W, H, g[0], g[1], "soldier");
  must(h.ok, "سرباز با شمشیر باید موفق باشد");
  must(state.resources.swords === 0, "شمشیر باید مصرف شده باشد");
  state.resources.bows = 1;
  const g2 = grassNear(terrain, state.occ, W, H, 8, 5);
  must(g2, "جای دوم باید باشد");
  h = hireUnit(state, terrain, W, H, g2[0], g2[1], "bowman");
  must(h.ok, "کماندار با کمان باید موفق باشد");
  must(state.resources.bows === 0, "کمان باید مصرف شده باشد");
  return { name: "قفل سلاح استخدام", pass: true, detail: "NEEDS_WEAPON + مصرف ۱ واحد" };
}

// گاریسون برج (0.45.0 — #۱۰): ۴ مدافع دوربرد خودی؛ پنجمی FULL؛ پیاده
// NOT_RANGED؛ بنای غیربرج NOT_TOWER؛ تکراریِ همان برج موفقِ بی‌اثر.
function t_garrison_assign() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 500; state.resources.gold = 500; // ۵ کماندار (۲۰غ+۱۵ط هر یک)
  const ts = siteNear(terrain, state.occ, W, H, 10, 10, 3, 3);
  must(ts, "جای برج باید باشد");
  const tr = tryPlace(state, terrain, W, H, ts[0], ts[1], CONFIG.BUILDINGS.tower);
  must(tr.ok, "برج باید ساخته شود");
  completeAll(state);
  const tower = tr.building;
  must(GARRISON_CAP === 4, "سقف گاریسون ۴ است");
  const crew = [];
  for (let i = 0; i < 5; i++) {
    const g = grassNear(terrain, state.occ, W, H, 20 + i * 3, 20);
    must(g, "جای استخدام باید باشد");
    const h = hireUnit(state, terrain, W, H, g[0], g[1], "bowman");
    must(h.ok, "استخدام کماندار باید موفق باشد");
    crew.push(h.unit);
  }
  for (let i = 0; i < 4; i++) {
    const r = garrisonUnit(state, crew[i], tower);
    must(r.ok, `استقرار ${i + 1} باید موفق باشد`);
  }
  must(tower.garrison.length === 4, `گاریسون باید ۴ باشد، هست ${tower.garrison.length}`);
  must(crew[0].x === tower.c + 1.5 && crew[0].r === tower.r + 1.5, "مستقر روی مرکز برج می‌ایستد");
  must(crew[0].garrisonTower === tower.id, "پرچم گاریسون مدافع باید ست باشد");
  const dup = garrisonUnit(state, crew[0], tower);
  must(dup.ok && tower.garrison.length === 4, "تکراری همان برج موفق بی‌اثر است");
  const full = garrisonUnit(state, crew[4], tower);
  must(!full.ok && full.reason === "FULL", `پنجمی باید FULL باشد، شد ${full.reason}`);
  const g2 = grassNear(terrain, state.occ, W, H, 40, 40);
  must(g2, "جای سرباز باید باشد");
  const s = hireUnit(state, terrain, W, H, g2[0], g2[1], "soldier");
  must(s.ok, "استخدام سرباز باید موفق باشد");
  const nr = garrisonUnit(state, s.unit, tower);
  must(!nr.ok && nr.reason === "NOT_RANGED", `پیاده باید NOT_RANGED باشد، شد ${nr.reason}`);
  const hut = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(hut.ok, "کلبه باید ساخته شود");
  completeAll(state);
  const nt = garrisonUnit(state, crew[4], hut.building);
  must(!nt.ok && nt.reason === "NOT_TOWER", `کلبه باید NOT_TOWER باشد، شد ${nt.reason}`);
  return { name: "استقرار گاریسون", pass: true, detail: "۴ مدافع + FULL پنجمی + رد پیاده/کلبه" };
}

// شلیک تقویتی (0.45.0): برج با ۲ گاریسون در ۱۰۰ تیک ≥۲ برابر برج خالی
// خسارت می‌زند (۳ شمشیرزن در برد برج و کمان، بیرون برد شمشیر).
function t_garrison_shoot() {
  const run = (withGar) => {
    const { W, H, terrain, state } = fresh();
    const ts = siteNear(terrain, state.occ, W, H, 10, 10, 3, 3);
    must(ts, "جای برج باید باشد");
    const tr = tryPlace(state, terrain, W, H, ts[0], ts[1], CONFIG.BUILDINGS.tower);
    must(tr.ok, "برج باید ساخته شود");
    completeAll(state);
    const tower = tr.building;
    const cx = tower.c + 1.5, cy = tower.r + 1.5;
    const foes = [];
    for (const [dx, dy] of [[4, 0], [0, 4], [-4, 0]]) {
      foes.push(spawnUnit(state, "swordsman", cx + dx, cy + dy));
    }
    if (withGar) {
      needBarracks(state, terrain, W, H);
      for (let i = 0; i < 2; i++) {
        const g = grassNear(terrain, state.occ, W, H, 30 + i * 2, 30);
        must(g, "جای استخدام باید باشد");
        const h = hireUnit(state, terrain, W, H, g[0], g[1], "bowman");
        must(h.ok, "استخدام باید موفق باشد");
        must(garrisonUnit(state, h.unit, tower).ok, "استقرار باید موفق باشد");
      }
    }
    simC(state, terrain, 100);
    let dealt = 0;
    for (const f of foes) {
      const live = state.units.find((u) => u.id === f.id && !u.dead);
      dealt += live ? (60 - live.hp) : 60;
    }
    return dealt;
  };
  const a = run(false), b = run(true);
  must(a > 0, "برج خالی باید خسارت بزند");
  must(b >= 2 * a, `گاریسون باید ≥۲ برابر بزند: خالی=${a}، با گاریسون=${b}`);
  return { name: "شلیک تقویتی گاریسون", pass: true, detail: `خالی=${a}، گاریسون=${b}` };
}

// آزادی پس از ویرانی (0.45.0): مدافعان زنده با hp حفظ روی ردپای برج،
// موضع engage، بدون دستور — نه گیرکرده.
function t_garrison_post_lost() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const ts = siteNear(terrain, state.occ, W, H, 10, 10, 3, 3);
  must(ts, "جای برج باید باشد");
  const tr = tryPlace(state, terrain, W, H, ts[0], ts[1], CONFIG.BUILDINGS.tower);
  must(tr.ok, "برج باید ساخته شود");
  completeAll(state);
  const tower = tr.building;
  const ids = [];
  for (let i = 0; i < 2; i++) {
    const g = grassNear(terrain, state.occ, W, H, 30 + i * 2, 30);
    must(g, "جای استخدام باید باشد");
    const h = hireUnit(state, terrain, W, H, g[0], g[1], "bowman");
    must(h.ok, "استخدام باید موفق باشد");
    must(garrisonUnit(state, h.unit, tower).ok, "استقرار باید موفق باشد");
    ids.push(h.unit.id);
  }
  demolishBuilding(state, tower); // همان releaseGarrison ویرانی جنگی (تخریب دستی هم آزاد می‌کند)
  must((tower.garrison || []).length === 0, "گاریسون برج ویران باید خالی شود");
  for (const id of ids) {
    const u = state.units.find((x) => x.id === id && !x.dead);
    must(u && u.hp === 40, "مدافع باید زنده با hp کامل باشد");
    must(u.garrisonTower == null, "پرچم گاریسون باید پاک باشد");
    must(u.stance === "engage", "موضع پس از آزادی engage است");
    must(u.x >= tower.c && u.x <= tower.c + tower.w, "آزادشده روی ردپای برج است");
  }
  simC(state, terrain, 1); // جاروی ویرانه + یک تیک بدون گیرکردن
  const freed = state.units.find((x) => x.id === ids[0] && !x.dead);
  const o = orderMove(state, freed, 20, 20);
  must(o.ok, "آزادشده باید دستور بگیرد");
  return { name: "آزادی گاریسون پس از ویرانی", pass: true, detail: "۲ مدافع آزاد + engage" };
}

// ذخیره گاریسون (0.45.0): حفظ فهرست + بازسازی پرچم مدافع؛ قدیمی بدون
// فیلد = خالی (بدون bump).
function t_garrison_save() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const ts = siteNear(terrain, state.occ, W, H, 10, 10, 3, 3);
  must(ts, "جای برج باید باشد");
  const tr = tryPlace(state, terrain, W, H, ts[0], ts[1], CONFIG.BUILDINGS.tower);
  must(tr.ok, "برج باید ساخته شود");
  completeAll(state);
  const g = grassNear(terrain, state.occ, W, H, 30, 30);
  must(g, "جای استخدام باید باشد");
  const h = hireUnit(state, terrain, W, H, g[0], g[1], "bowman");
  must(h.ok, "استخدام باید موفق باشد");
  must(garrisonUnit(state, h.unit, tr.building).ok, "استقرار باید موفق باشد");
  const loaded = deserializeJSON(serializeJSON(state));
  const lt = loaded.buildings.find((b) => b.type === "tower");
  must(lt && lt.garrison.length === 1 && lt.garrison[0] === h.unit.id, "گاریسون باید در ذخیره بماند");
  const lu = loaded.units.find((u) => u.id === h.unit.id);
  must(lu && lu.garrisonTower === lt.id, "پرچم مدافع باید بازسازی شود");
  must(lu.x === lt.c + 1.5 && lu.r === lt.r + 1.5, "مدافع سر مرکز برج می‌ماند");
  const bare = JSON.parse(serializeJSON(state));
  delete bare.buildings.find((b) => b.type === "tower").garrison;
  const legacy = deserialize(bare);
  const ot = legacy.buildings.find((b) => b.type === "tower");
  must(ot && (ot.garrison || []).length === 0, "قدیمی بدون گاریسون = خالی");
  const bad = JSON.parse(serializeJSON(state));
  bad.buildings.find((b) => b.type === "tower").garrison = [1, 2, 3, 4, 5];
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "گاریسون ۵نفره باید SaveError بدهد");
  return { name: "ذخیره گاریسون", pass: true, detail: "حفظ + تحمل قدیمی + رد دست‌کاری" };
}

// یکتایی سربازخانه (0.34.0): دومی UNIQUE است (منابع دست‌نخورده)؛ ویرانی
// راه را باز می‌کند؛ در MP یکتا به‌ازای هر مالک است.
function t_barracks_unique() {
  const { W, H, terrain, state } = fresh();
  state.resources.wood = 500; state.resources.stone = 500;
  const def = CONFIG.BUILDINGS.barracks;
  const free43 = () => {
    for (let r = 1; r + def.h <= H; r++) {
      for (let c = 1; c + def.w <= W; c++) {
        let free = true;
        for (let j = 0; j < def.h && free; j++) {
          for (let i = 0; i < def.w && free; i++) {
            if (terrain[(r + j) * W + (c + i)] !== T_GRASS || state.occ[(r + j) * W + (c + i)] === 1) free = false;
          }
        }
        if (free) return [c, r];
      }
    }
    return null;
  };
  const s1 = free43();
  must(s1, "باید جای ۴×۳ آزاد باشد");
  const r1 = tryPlace(state, terrain, W, H, s1[0], s1[1], def);
  must(r1.ok, "سربازخانه اول باید ساخته شود");
  const s2 = free43();
  must(s2, "باید جای ۴×۳ آزاد دیگری باشد");
  const w0 = state.resources.wood, st0 = state.resources.stone;
  const r2 = tryPlace(state, terrain, W, H, s2[0], s2[1], def);
  must(!r2.ok && r2.reason === "UNIQUE", `دومی باید UNIQUE باشد، شد ${r2.reason}`);
  must(state.resources.wood === w0 && state.resources.stone === st0, "رد نباید منابع کم کند");
  r1.building.destroyed = true;
  const r3 = tryPlace(state, terrain, W, H, s2[0], s2[1], def);
  must(r3.ok, "پس از ویرانی باید دوباره شود ساخت");
  // چندنفره: بازیکن ۱ سربازخانه خودش را می‌سازد، دومی هرکس UNIQUE است
  enableMp(state, 2, ["A", "B"]);
  state.mpres[1].resources.wood = 500; state.mpres[1].resources.stone = 500;
  const s3 = free43();
  must(s3, "باید جای ۴×۳ آزاد برای بازیکن ۱ باشد");
  const m1 = tryPlace(state, terrain, W, H, s3[0], s3[1], def, 1);
  must(m1.ok, "بازیکن ۱ باید سربازخانه خودش را بسازد");
  const s4 = free43();
  must(s4, "باید جای دیگری برای تلاش دوم باشد");
  const m0 = tryPlace(state, terrain, W, H, s4[0], s4[1], def, 0);
  must(!m0.ok && m0.reason === "UNIQUE", `دومی بازیکن ۰ باید UNIQUE باشد، شد ${m0.reason}`);
  return { name: "یکتایی سربازخانه", pass: true, detail: "رد/ویرانی/MP" };
}

function t_hire_cost() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  must(h.ok, "استخدام باید موفق باشد");
  must(state.resources.food === 80 && state.resources.gold === 35,
    `هزینه باید کم شود: ${state.resources.food}، ${state.resources.gold}`);
  state.resources.food = 10;
  const h2 = hireUnit(state, terrain, W, H, 7, 5, "soldier");
  must(!h2.ok && h2.reason === "INSUFFICIENT", "کمبود منابع باید رد شود");
  must(state.resources.food === 10, "منابع نباید کم شود");
  return { name: "هزینه استخدام", pass: true, detail: "کسر + رد INSUFFICIENT" };
}

// کماندار خودی (0.11.0): هزینه غذا/طلا + رد کمبود + چرخه ذخیره نوع جدید.
// (0.14.0): ارزان مثل Archer مرجع — ۲۰غ+۱۵ط.
function t_hire_bowman() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = hireUnit(state, terrain, W, H, 5, 5, "bowman");
  must(h.ok, "استخدام کماندار باید موفق باشد");
  must(h.unit.side === "player" && h.unit.hp === 40, "مشخصات اولیه باید از جدول باشد");
  must(state.resources.food === 100 && state.resources.gold === 45,
    `هزینه باید کم شود: ${state.resources.food}، ${state.resources.gold}`);
  state.resources.gold = 10;
  const h2 = hireUnit(state, terrain, W, H, 7, 5, "bowman");
  must(!h2.ok && h2.reason === "INSUFFICIENT", "کمبود طلا باید رد شود");
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.units.length === 1 && loaded.units[0].type === "bowman",
    "نوع جدید باید در ذخیره بماند");
  return { name: "استخدام کماندار", pass: true, detail: "کسر ۲۰غ+۱۵ط + حفظ در ذخیره" };
}

// فهرست مزدورها (0.36.0): ۱۰ استخدامی (سرباز/کماندار/نیزه‌دار/گرزدار/شوالیه +
// شمشیرزن صلیبی/زوبین‌دار/شمشیرزن عرب/قاتل/کماندار سواره)؛ همه پشت سربازخانه‌اند؛
// هزینه‌ها کسر می‌شوند؛ نوع‌های تازه در ذخیره می‌مانند.
function t_hire_roster() {
  // (0.46.0): ۱۰ مزدور + ۲ ماشین محاصره (دژکوب/منجنیق — پشت همان سربازخانه).
  const hireables = Object.entries(UNITS).filter(([, d]) => d.side === "player" && !d.noHire && d.cost);
  must(hireables.length === 12, `باید ۱۲ قابل‌استخدام باشد، هست ${hireables.length}`);
  for (const [, d] of hireables) {
    must(d.requires === "barracks", `مزدور ${d.name} باید پیش‌نیاز سربازخانه داشته باشد`);
  }
  {
    const { W, H, terrain, state } = fresh();
    for (const [key] of hireables) {
      const r = hireUnit(state, terrain, W, H, 5, 5, key);
      must(!r.ok && r.reason === "NO_BARRACKS", `${key} بدون سربازخانه باید NO_BARRACKS باشد، شد ${r.reason}`);
    }
    must(state.units.length === 0, "واحدی نباید ساخته شود");
  }
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 600; state.resources.gold = 600; // ۱۲ استخدام (۵۰۵غ، ۴۸۵ط)
  const spots = [[5, 5], [7, 5], [9, 5], [11, 5], [13, 5], [5, 7], [7, 7], [9, 7], [11, 7], [13, 7], [5, 9], [7, 9]];
  let i = 0;
  for (const [key, def] of hireables) {
    const f0 = state.resources.food, g0 = state.resources.gold;
    const h = hireUnit(state, terrain, W, H, spots[i][0], spots[i][1], key);
    must(h.ok, `استخدام ${key} باید موفق باشد`);
    must(h.unit.hp === def.hp && h.unit.side === "player", `مشخصات ${key} باید از جدول باشد`);
    must(state.resources.food === f0 - def.cost.food && state.resources.gold === g0 - def.cost.gold,
      `هزینه ${key} باید کم شود`);
    i++;
  }
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.units.length === 12, "هر ۱۲ واحد باید در ذخیره بمانند");
  must(loaded.units.every((u, j) => u.type === hireables[j][0]), "ترتیب و نوع واحدها باید حفظ شود");
  return { name: "فهرست مزدورها", pass: true, detail: "۱۲ استخدام + دروازه + هزینه + ذخیره" };
}

// سیم‌کشی اسپرایت مزدورها (0.36.0): هر استخدامی باید ورودی dataURL معتبر در
// UNIT_DATA داشته باشد تا کارت و نقشه به‌جای دایره وکتوری، اسپرایت واقعی نشان دهند.
// (0.46.0): ماشین‌های محاصره شیت ندارند — وکتوری خالص‌اند (مثل داربست).
function t_merc_sprites() {
  const hireables = Object.entries(UNITS).filter(([, d]) => d.side === "player" && !d.noHire && d.cost && !d.siege);
  must(hireables.length === 10, `باید ۱۰ مزدور باشد، هست ${hireables.length}`);
  for (const [key] of hireables) {
    const url = UNIT_DATA[key];
    must(typeof url === "string" && url.startsWith("data:image/png;base64,iVBOR"),
      `${key} باید dataURL شیت PNG داشته باشد`);
    must(url.length > 2000, `شیت ${key} نباید خالی باشد`);
  }
  must(!UNIT_DATA.ram && !UNIT_DATA.catapult, "ماشین محاصره شیت ندارد (وکتوری)");
  return { name: "اسپرایت مزدورها", pass: true, detail: "۱۰ شیت معتبر + ۲ وکتوری" };
}

// نقش‌های فهرست (0.36.0): قفل‌های طراحی از روی tier کاربر —
// زوبین‌دار پرآسیب‌ترین دورزن با کندترین ریلود؛ قاتل تندترین پیاده؛ صلیبی
// پرجان‌ترین و کندترین پیاده؛ سواره تندترین و گران‌ترین کل فهرست.
// (0.46.0): ماشین‌های محاصره (siege) بیرون نقش‌های مزدورند.
function t_roster_roles() {
  const U = UNITS;
  const ranged = ["bowman", "crossbowman", "horseArcher"];
  for (const k of ranged) must(U[k].range > 2, `${k} باید دورزن باشد`);
  must(U.crossbowman.dmg >= U.bowman.dmg && U.crossbowman.dmg >= U.horseArcher.dmg,
    "زوبین‌دار باید پرآسیب‌ترین دورزن باشد");
  must(U.crossbowman.cd > U.bowman.cd && U.crossbowman.cd > U.horseArcher.cd,
    "زوبین‌دار باید کندترین ریلود را داشته باشد");
  const speeds = Object.entries(U).filter(([, d]) => d.side === "player" && !d.noHire && d.cost && !d.siege);
  const maxSpeed = Math.max(...speeds.map(([, d]) => d.speed));
  must(U.horseArcher.speed === maxSpeed, "سواره باید تندترین کل فهرست باشد");
  const foot = speeds.filter(([k]) => k !== "horseArcher");
  must(U.assassin.speed === Math.max(...foot.map(([, d]) => d.speed)), "قاتل باید تندترین پیاده باشد");
  must(U.crusader.speed === Math.min(...foot.map(([, d]) => d.speed)), "صلیبی باید کندترین پیاده باشد");
  must(U.crusader.hp === Math.max(...speeds.map(([, d]) => d.hp)), "صلیبی باید پرجان‌ترین مزدور باشد");
  must(U.horseArcher.cost.gold === Math.max(...speeds.map(([, d]) => d.cost.gold)),
    "سواره باید گران‌ترین مزدور باشد");
  return { name: "نقش‌های فهرست", pass: true, detail: "زوبین/قاتل/صلیبی/سواره" };
}

// دوئل دوربرد ایستا (فاصله ۵، هر دو در برد): دشمن می‌میرد، خودی زنده می‌ماند،
// هیچ تماسی رخ نمی‌دهد (minD) و دو اجرا یکسان‌اند (قطعیت).
function t_combat_bowman_range() {
  const run = () => {
    const { W, H, terrain, state } = fresh();
    needBarracks(state, terrain, W, H);
    hireUnit(state, terrain, W, H, 5, 5, "bowman");
    spawnUnit(state, "archer", 10.5, 5.5);
    let t = 0, minD = Infinity;
    while (state.units.some((u) => u.type === "archer") && t < 200) {
      simC(state, terrain, 1);
      t++;
      const a = state.units.find((u) => u.type === "archer");
      const m = state.units.find((u) => u.type === "bowman");
      if (a && m) minD = Math.min(minD, Math.hypot(a.x - m.x, a.r - m.r));
    }
    const m = state.units.find((u) => u.type === "bowman");
    return { t, minD, meHp: m ? m.hp : -1, foeAlive: state.units.some((u) => u.type === "archer") };
  };
  const a = run(), b = run();
  must(!a.foeAlive && a.t < 200, "کماندار دشمن باید بمیرد");
  must(a.meHp > 0 && a.meHp < 40, `خودی باید زنده ولی زخمی باشد، hp=${a.meHp}`);
  must(a.minD > 2, `نبرد باید کاملاً دوربرد باشد، minD=${a.minD}`);
  must(a.t === b.t && a.meHp === b.meHp, "دوئل باید قطعی باشد");
  return { name: "دوئل دوربرد", pass: true, detail: `${a.t} تیک، hp خودی=${a.meHp}` };
}

function t_save_units() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  simC(state, terrain, 30);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.units.length === 1, "واحد باید حفظ شود");
  const a = state.units[0], b = loaded.units[0];
  must(b.type === a.type && b.hp === a.hp && Math.abs(b.x - a.x) < 1e-9,
    "موقعیت و HP واحد باید برابر باشد");
  return { name: "ذخیره واحدها", pass: true, detail: `hp=${b.hp}` };
}

function t_migrate_v1() {
  const { state } = fresh();
  const v1 = { ...JSON.parse(serializeJSON(state)), v: 1 };
  delete v1.units;
  delete v1.nextUnitId;
  delete v1.wave;
  for (const b of v1.buildings) delete b.hp;
  const loaded = deserialize(v1);
  must(loaded.units.length === 0, "واحدها باید خالی مهاجرت کنند");
  must(loaded.nextUnitId === 1, "nextUnitId باید ۱ شود");
  return { name: "مهاجرت v1→v2", pass: true, detail: "بدون از دست رفتن" };
}

// سازگاری سنگ (0.18.0): ذخیره قدیمی بدون stone → صفر؛ جدید حفظ می‌شود؛
// خراب (منفی/فراتر از سقف) → SaveError.
function t_stone_save_compat() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.quarry);
  sim(state, 50);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.stone === 42, `سنگ باید ۴۲ بماند، هست ${loaded.resources.stone}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.stone;
  must(deserialize(old).resources.stone === 0, "قدیمی بدون سنگ یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.stone = -5;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "سنگ منفی باید SaveError بدهد");
  return { name: "سازگاری ذخیره سنگ", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب" };
}

// سازگاری گندم (0.20.0): حفظ + ذخیره قدیمی بدون wheat → صفر + رد خراب.
function t_wheat_save_compat() {
  const { state } = fresh();
  state.resources.wheat = 37;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.wheat === 37, `گندم باید ۳۷ بماند، هست ${loaded.resources.wheat}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.wheat;
  must(deserialize(old).resources.wheat === 0, "قدیمی بدون گندم یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.wheat = 501;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "گندم بالای سقف باید SaveError بدهد");
  return { name: "سازگاری ذخیره گندم", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب" };
}

// سازگاری رازک/آبجو (0.21.0): حفظ + قدیمی بدون آن‌ها → صفر + رد خراب.
function t_beer_save_compat() {
  const { state } = fresh();
  state.resources.hops = 37;
  state.resources.beer = 12;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.hops === 37, `رازک باید ۳۷ بماند، هست ${loaded.resources.hops}`);
  must(loaded.resources.beer === 12, `آبجو باید ۱۲ بماند، هست ${loaded.resources.beer}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.hops;
  delete old.resources.beer;
  const legacy = deserialize(old);
  must(legacy.resources.hops === 0 && legacy.resources.beer === 0, "قدیمی بدون زنجیره یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.hops = -1;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "رازک منفی باید SaveError بدهد");
  return { name: "سازگاری ذخیره آبجو", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب" };
}

// سازگاری آرد (0.38.0): حفظ + قدیمی بدون آرد → صفر + رد خراب + سقف انبار غذا.
function t_flour_save_compat() {
  const { state } = fresh();
  state.resources.flour = 37;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.flour === 37, `آرد باید ۳۷ بماند، هست ${loaded.resources.flour}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.flour;
  const legacy = deserialize(old);
  must(legacy.resources.flour === 0, "قدیمی بدون آرد یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.flour = -1;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "آرد منفی باید SaveError بدهد");
  must(capFor(state, "flour") === 500, "سقف پایه آرد ۵۰۰ است");
  return { name: "سازگاری ذخیره آرد", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب + سقف" };
}

// سازگاری آهن/شمشیر/کمان (0.44.0): حفظ + قدیمی بدون آن‌ها → صفر + رد خراب + سقف.
function t_weapon_save_compat() {
  const { state } = fresh();
  state.resources.iron = 37; state.resources.swords = 12; state.resources.bows = 5;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.resources.iron === 37 && loaded.resources.swords === 12 && loaded.resources.bows === 5,
    "زنجیره سلاح باید حفظ شود");
  const old = JSON.parse(serializeJSON(state));
  delete old.resources.iron; delete old.resources.swords; delete old.resources.bows;
  const legacy = deserialize(old);
  must(legacy.resources.iron === 0 && legacy.resources.swords === 0 && legacy.resources.bows === 0,
    "قدیمی بدون زنجیره یعنی صفر");
  const badData = JSON.parse(serializeJSON(state));
  badData.resources.swords = -1;
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "شمشیر منفی باید SaveError بدهد");
  must(capFor(state, "iron") === 500, "سقف پایه آهن ۵۰۰ است");
  return { name: "سازگاری ذخیره سلاح", pass: true, detail: "حفظ + پیش‌فرض صفر + رد خراب + سقف" };
}

// انتخاب باکسی (0.40.0 — #۴ از FEATURES): مستطیل، نرمال‌سازی، افزایشی،
// فیلتر مالک/مرگ/دشمن.
function t_boxsel_rect() {
  const { state } = fresh();
  const a = spawnUnit(state, "soldier", 5.5, 5.5, 0);
  const b = spawnUnit(state, "soldier", 7.5, 6.5, 0);
  spawnUnit(state, "soldier", 20.5, 20.5, 0);
  const ids = boxSelectIds(state.units, { c0: 5, r0: 5, c1: 7, r1: 6 }, { owner: 0 });
  must(ids.length === 2 && ids.includes(a.id) && ids.includes(b.id), `باید ۲ یگان بگیرد، گرفت ${ids}`);
  return { name: "باکس مستطیل", pass: true, detail: `ids=${ids}` };
}

function t_boxsel_normalize_add() {
  const { state } = fresh();
  const a = spawnUnit(state, "soldier", 5.5, 5.5, 0);
  spawnUnit(state, "soldier", 7.5, 6.5, 0);
  // گوشه‌ها برعکس داده شوند — باید نرمال شود
  const ids = boxSelectIds(state.units, { c0: 7, r0: 6, c1: 5, r1: 5 }, { owner: 0 });
  must(ids.length === 2, `نرمال‌سازی باید ۲ بگیرد، گرفت ${ids.length}`);
  // افزایشی: اجتماع با قبلی با حفظ ترتیب، بدون تکرار
  const added = boxSelectIds(state.units, { c0: 5, r0: 5, c1: 5, r1: 5 }, { owner: 0, additive: true, prev: [999, a.id] });
  must(added.length === 2 && added[0] === 999 && added[1] === a.id, `اجتماع باید [999,${a.id}] باشد، شد ${added}`);
  return { name: "باکس نرمال+افزایشی", pass: true, detail: `added=${added}` };
}

function t_boxsel_filters() {
  const { state } = fresh();
  spawnUnit(state, "soldier", 5.5, 5.5, 0);
  spawnUnit(state, "soldier", 6.5, 5.5, 1); // مالک دیگر
  spawnUnit(state, "swordsman", 5.5, 6.5); // دشمن
  const dead = spawnUnit(state, "soldier", 6.5, 6.5, 0);
  dead.dead = true;
  const ids = boxSelectIds(state.units, { c0: 5, r0: 5, c1: 6, r1: 6 }, { owner: 0 });
  must(ids.length === 1, `فقط خودیِ زنده: ۱، شد ${ids.length}`);
  return { name: "فیلتر باکس", pass: true, detail: "مالک/مرگ/دشمن بیرون" };
}

// زره رسمی (0.41.0 — #۵ از FEATURES): فرمول max(1, حمله−زره) + اثر در نبرد
// واقعی + پیش‌فرض صفر برای ناشناخته.
function t_armor_formula() {
  must(effectiveDmg(6, 1) === 5, "۶−۱ باید ۵ شود");
  must(effectiveDmg(4, 0) === 4, "زره صفر نباید کم کند");
  must(effectiveDmg(3, 5) === 1, "کف خسارت ۱ است");
  must(effectiveDmg(6, 6) === 1, "زره مساوی حمله هم کف ۱ می‌دهد");
  must(unitArmor({ type: "knight" }) === 3, "شوالیه زره ۳ دارد");
  must(unitArmor({ type: "nope" }) === 0, "نوع ناشناخته زره ۰ دارد");
  return { name: "فرمول زره", pass: true, detail: "max(1,atk−armor)" };
}

function t_armor_strike() {
  const { state, terrain } = fresh();
  const me = spawnUnit(state, "soldier", 5.5, 5.5, 0);
  const foe = spawnUnit(state, "swordsman", 6.5, 5.5);
  simC(state, terrain, 1); // چسبیده: هر دو در همان تیک اول می‌زنند
  must(foe.hp === 55, `شمشیرزن (زره ۱) باید ۵ بخورد، hp=${foe.hp}`);
  must(me.hp === 54, `سرباز (زره ۱) باید ۶ بخورد، hp=${me.hp}`);
  return { name: "زره در نبرد", pass: true, detail: `foe=${foe.hp}، me=${me.hp}` };
}

// --- حریف AI سولو (0.42.0 — #۱۱ از FEATURES، فاز ۱) ---

function aiFresh() {
  const { W, H, terrain, state } = fresh();
  const r = startAI(state, terrain, W, H);
  must(r.ok, `شروع AI باید موفق باشد، شد ${r.reason}`);
  return { W, H, terrain, state };
}

function aiSim(state, terrain, n) {
  stepSim(state, terrain, n, createQueue()); // صف تازه: ورودی بازیکن نیست
}

function aiSummary(state) {
  return JSON.stringify({
    units: state.units.map((u) => [u.type, u.x, u.r, u.hp, u.owner, u.side]),
    blds: state.buildings.map((b) => [b.type, b.c, b.r, b.hp, b.buildLeft || 0, b.owner]),
    ai: state.ai,
  });
}

function t_ai_starts() {
  const { state } = aiFresh();
  must(state.ai.active, "باید فعال باشد");
  const keep = state.buildings.find((b) => b.type === "keep" && (b.owner == null ? 0 : b.owner) === AI_OWNER);
  must(keep, "ستاد حریف (مالک ۹) باید باشد");
  must(state.ai.keepId === keep.id, "keepId باید ثبت شود");
  must(state.ai.resources.wood === 120, `چوب آغازین ۱۲۰، هست ${state.ai.resources.wood}`);
  return { name: "شروع حریف", pass: true, detail: `ستاد در (${keep.c}،${keep.r})` };
}

function t_ai_builds() {
  const { state, terrain } = aiFresh();
  aiSim(state, terrain, 700);
  const done = state.buildings.filter((b) => (b.owner == null ? 0 : b.owner) === AI_OWNER
    && b.type !== "keep" && (b.buildLeft || 0) === 0);
  must(done.length >= 3, `باید ≥۳ بنای تکمیل‌شده، هست ${done.length}`);
  return { name: "ساخت‌وساز حریف", pass: true, detail: `${done.length} بنا: ${done.map((b) => b.type)}` };
}

function t_ai_raids() {
  const { state, terrain } = aiFresh();
  aiSim(state, terrain, 1600); // یورش اول در تیک ۱۵۰۰
  must(state.ai.raidsSent >= 1, `باید ≥۱ یورش رفته باشد، هست ${state.ai.raidsSent}`);
  const raiders = state.units.filter((u) => !u.dead && u.side === "enemy" && (u.owner == null ? 0 : u.owner) === AI_OWNER);
  must(raiders.length >= 2, `باید ≥۲ مهاجم حریف، هست ${raiders.length}`);
  return { name: "یورش حریف", pass: true, detail: `${raiders.length} مهاجم در راه` };
}

function t_ai_deterministic() {
  const run = () => {
    const { state, terrain } = aiFresh();
    aiSim(state, terrain, 400);
    return aiSummary(state);
  };
  const a = run(), b = run();
  must(a === b, "دو اجرای هم‌سید باید یکسان باشند");
  return { name: "قطعیت حریف", pass: true, detail: `${a.length} بایت یکسان` };
}

function t_ai_keep_dormant() {
  const { state, terrain } = aiFresh();
  aiSim(state, terrain, 200);
  const keep = state.buildings.find((b) => b.id === state.ai.keepId);
  demolishBuilding(state, keep); // سقوط ستاد حریف
  aiSim(state, terrain, 1); // جاروی stepCombat ویران‌شده را از آرایه پاک می‌کند
  const nB = state.buildings.length;
  aiSim(state, terrain, 400);
  must(state.ai.dormant, "باید خاموش شود");
  must(state.buildings.length === nB, "پس از خاموشی بنای تازه نه");
  must(state.ai.raidsSent === 0, "پس از خاموشی یورش نه");
  return { name: "خاموشی با سقوط ستاد", pass: true, detail: "dormant + توقف ساخت/یورش" };
}

// گیت AI پشت منو (0.68.0 — ریزه‌کاری ۴-الف): با aiPaused اقتصاد/نبرد/تیک جلو
// می‌رود ولی AI نه فکر می‌کند نه می‌سازد نه یورش می‌فرستد؛ بدون opts رفتار
// قبلی (شاهد: در همان بازه AI می‌سازد).
function t_ai_paused() {
  const g = aiFresh();
  const think0 = g.state.ai.nextThink;
  stepSim(g.state, g.terrain, 700, createQueue(), { aiPaused: true });
  must(g.state.tick === 700, `تیک باید ۷۰۰ باشد، هست ${g.state.tick}`);
  must(g.state.ai.nextThink === think0, "nextThink گیت‌شده باید ثابت بماند");
  const built = g.state.buildings.filter((b) => (b.owner == null ? 0 : b.owner) === AI_OWNER && b.type !== "keep");
  must(built.length === 0, `بنای تازه AI نه، هست ${built.length}`);
  must(g.state.ai.raidsSent === 0, "یورش گیت‌شده نه");
  const c = aiFresh();
  aiSim(c.state, c.terrain, 700); // بدون opts = رفتار قبلی
  const builtC = c.state.buildings.filter((b) => (b.owner == null ? 0 : b.owner) === AI_OWNER
    && b.type !== "keep" && (b.buildLeft || 0) === 0);
  must(builtC.length >= 1, `شاهد بدون گیت باید بسازد، ساخت ${builtC.length}`);
  return { name: "توقف AI پشت منو", pass: true, detail: `گیت: nextThink ثابت + ۰ بنا؛ شاهد: ${builtC.length} بنا` };
}

function t_ai_player_siege() {
  const { state, terrain, W, H } = aiFresh();
  state.ai.resources.wood = 200;
  const def = CONFIG.BUILDINGS.hut;
  const site = siteNear(terrain, state.occ, W, H, state.ai.baseC + 6, state.ai.baseR, def.w, def.h);
  must(site, "جا برای کلبه حریف باید باشد");
  const r = tryPlace(state, terrain, W, H, site[0], site[1], def, AI_OWNER);
  must(r.ok, `کلبه حریف باید ساخته شود، شد ${r.reason}`);
  const hut = r.building;
  hut.buildLeft = 0; // تکمیل فوری برای نبرد
  const me = spawnUnit(state, "soldier", site[0] + 0.5, site[1] + 2.5, 0);
  void me;
  const hp0 = hut.hp;
  aiSim(state, terrain, 40);
  must(hut.hp < hp0, `سرباز باید کلبه حریف را بزند، hp=${hut.hp}/${hp0}`);
  return { name: "محاصره بنای حریف", pass: true, detail: `hp ${hut.hp}/${hp0}` };
}

function t_ai_waves_skip_ai() {
  const { W, H, terrain, state } = fresh();
  // کلبه بازیکن دور + کلبه حریف چسبیده به شمشیرزن موج
  const ph = tryPlace(state, terrain, W, H, 50, 50, CONFIG.BUILDINGS.hut, 0);
  must(ph.ok, "کلبه بازیکن باید ساخته شود");
  state.ai.resources.wood = 200;
  const hutDef = CONFIG.BUILDINGS.hut;
  const site = siteNear(terrain, state.occ, W, H, 10, 10, hutDef.w, hutDef.h);
  must(site, "جا برای کلبه حریف باید باشد");
  const ah = tryPlace(state, terrain, W, H, site[0], site[1], hutDef, AI_OWNER);
  must(ah.ok, `کلبه حریف باید ساخته شود، شد ${ah.reason}`);
  const foe = spawnUnit(state, "swordsman", site[0] + 2.5, site[1] + 0.5);
  void foe; void ah;
  aiSim(state, terrain, 1);
  must(foe.targetKind === "bld" && foe.targetId === ph.building.id,
    `موج باید کلبه بازیکن را بگیرد، شد ${foe.targetKind}:${foe.targetId}`);
  return { name: "موج بنای حریف را نمی‌زند", pass: true, detail: `هدف=${foe.targetId}` };
}

function t_ai_save_compat() {
  const { state, terrain } = aiFresh();
  aiSim(state, terrain, 120);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.ai.active, "فعال باید بماند");
  must(loaded.ai.resources.wood === state.ai.resources.wood, "منابع حریف باید حفظ شود");
  must(loaded.buildings.some((b) => (b.owner == null ? 0 : b.owner) === AI_OWNER), "بنای حریف باید بماند");
  const old = JSON.parse(serializeJSON(state));
  delete old.ai;
  const legacy = deserialize(old);
  must(!legacy.ai.active, "قدیمی بدون ai = غیرفعال");
  return { name: "ذخیره حریف", pass: true, detail: "حفظ + تحمل قدیمی" };
}

function aiFreshDiff(diff) {
  const { W, H, terrain, state } = fresh();
  const r = startAI(state, terrain, W, H, diff);
  must(r.ok, `شروع AI (${diff}) باید موفق باشد، شد ${r.reason}`);
  return { W, H, terrain, state };
}

function t_ai_difficulty_default() {
  const a = aiFresh();
  must(a.state.ai.difficulty === "normal", `پیش‌فرض باید معمولی باشد، هست ${a.state.ai.difficulty}`);
  const b = aiFreshDiff("bogus");
  must(b.state.ai.difficulty === "normal", "سختی نامعتبر باید معمولی شود");
  const c = aiFreshDiff("hard");
  must(c.state.ai.difficulty === "hard", "سخت باید ثبت شود");
  const p = aiRaidPlan(a.state.ai, 0);
  must(p.at === 1500 && p.n === 3, `جدول پایه باید دست‌نخورده بماند، شد ${p.at}/${p.n}`);
  must(aiDifficulty(null).raidAtMul === 1, "ai خالی = معمولی");
  return { name: "پیش‌فرض سختی", pass: true, detail: "normal + جدول پایه" };
}

function t_ai_difficulty_plan() {
  const at = (diff, i) => aiRaidPlan({ difficulty: diff }, i);
  must(at("easy", 0).at === 2250 && at("easy", 0).n === 2, "آسان: دیرتر و کوچک‌تر");
  must(at("easy", 2).at === 5700 && at("easy", 2).n === 4, "آسان: یورش سوم");
  must(at("hard", 0).at === 1050 && at("hard", 0).n === 5, "سخت: زودتر و بزرگ‌تر");
  must(at("hard", 2).at === 2660 && at("hard", 2).n === 7, "سخت: یورش سوم");
  must(at("normal", 1).at === 2600 && at("normal", 1).n === 4, "معمولی = جدول پایه");
  must(aiRaidPlan({ difficulty: "easy" }, 9) === null, "اندیس ناموجود = null");
  must(aiDifficulty({ difficulty: "easy" }).goldMul === 0.5, "طلای آسان نصف");
  must(aiDifficulty({ difficulty: "hard" }).goldMul === 2, "طلای سخت دوبرابر");
  must(aiDifficulty({ difficulty: "easy" }).workerEveryMul === 2, "کارگر آسان کندتر");
  must(aiDifficulty({ difficulty: "hard" }).workerEveryMul === 0.5, "کارگر سخت تندتر");
  return { name: "جدول سختی", pass: true, detail: "زمان/اندازه/اقتصاد هر ۳ سطح" };
}

function t_ai_difficulty_raid_sizes() {
  // رفتاری: سربازخانه دستی + پرش تیک به لحظه یورش هر سطح.
  for (const [diff, atk, n] of [["easy", 2250, 2], ["normal", 1500, 3], ["hard", 1050, 5]]) {
    const { state, terrain, W, H } = aiFreshDiff(diff);
    const def = CONFIG.BUILDINGS.barracks;
    const site = siteNear(terrain, state.occ, W, H, state.ai.baseC + 6, state.ai.baseR, def.w, def.h);
    must(site, `جا برای سربازخانه (${diff}) باید باشد`);
    const r = tryPlace(state, terrain, W, H, site[0], site[1], def, AI_OWNER);
    must(r.ok, `سربازخانه حریف (${diff}) باید ساخته شود، شد ${r.reason}`);
    r.building.buildLeft = 0; // تکمیل فوری برای یورش
    state.ai.resources.food = 5000;
    state.ai.resources.gold = 5000;
    state.tick = atk;
    state.ai.nextThink = atk;
    aiSim(state, terrain, 1);
    must(state.ai.raidsSent === 1, `${diff}: باید ۱ یورش رفته باشد، هست ${state.ai.raidsSent}`);
    const raiders = state.units.filter((u) => !u.dead && u.side === "enemy" && (u.owner == null ? 0 : u.owner) === AI_OWNER);
    must(raiders.length === n, `${diff}: باید ${n} مهاجم، هست ${raiders.length}`);
  }
  return { name: "یورش هر سختی", pass: true, detail: "۲/۳/۵ مهاجم در ۲۲۵۰/۱۵۰۰/۱۰۵۰" };
}

function t_ai_difficulty_save() {
  const { state } = aiFreshDiff("hard");
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.ai.difficulty === "hard", "سختی باید در ذخیره بماند");
  const old = JSON.parse(serializeJSON(state));
  delete old.ai.difficulty;
  must(deserializeJSON(JSON.stringify(old)).ai.difficulty === "normal", "ذخیره قدیمی = معمولی");
  const bad = JSON.parse(serializeJSON(state));
  bad.ai.difficulty = "nightmare";
  let threw = false;
  try { deserializeJSON(JSON.stringify(bad)); } catch (e) { threw = true; }
  must(threw, "سختی نامعتبر باید رد شود");
  return { name: "ذخیره سختی", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}

function t_ai_difficulty_replay() {
  const good = { v: REPLAY_V, seed: 123, diff: "hard", cmds: [{ t: 0, cmd: { kind: "tax", v: "none" } }], ticks: 10 };
  must(validateReplayLog(good).ok, "لاگ با درجه باید قبول شود");
  must(!validateReplayLog({ ...good, diff: "nightmare" }).ok, "درجه نامعتبر باید رد شود");
  const h0 = runReplay({ v: REPLAY_V, seed: 321, cmds: [], ticks: 1200 }, 1200).hash;
  const hN = runReplay({ v: REPLAY_V, seed: 321, diff: "normal", cmds: [], ticks: 1200 }, 1200).hash;
  must(h0 === hN, "لاگ قدیمی (بی‌درجه) باید همان معمولی باشد");
  const hH = runReplay({ v: REPLAY_V, seed: 321, diff: "hard", cmds: [], ticks: 1200 }, 1200).hash;
  const hH2 = runReplay({ v: REPLAY_V, seed: 321, diff: "hard", cmds: [], ticks: 1200 }, 1200).hash;
  must(hH === hH2, "بازپخش سخت باید قطعی باشد");
  must(hH !== hN, "سخت باید از معمولی متفاوت باشد (یورش ۱۰۵۰)");
  return { name: "ری‌پلی سختی", pass: true, detail: "سازگاری + قطعیت + تفاوت" };
}

function aiCases() {
  return [t_ai_starts, t_ai_builds, t_ai_raids, t_ai_deterministic,
    t_ai_keep_dormant, t_ai_paused, t_ai_player_siege, t_ai_waves_skip_ai, t_ai_save_compat,
    t_ai_difficulty_default, t_ai_difficulty_plan, t_ai_difficulty_raid_sizes,
    t_ai_difficulty_save, t_ai_difficulty_replay,
    t_ai_personality_default, t_ai_personality_plan, t_ai_personality_save, t_ai_personality_replay];
}

// شخصیت حریف (0.56.0 — #۱۸ از FEATURES): ۵ پروفایل، گرگ خنثی = رفتار 0.42.
function aiFreshPers(pers) {
  const { W, H, terrain, state } = fresh();
  const r = startAI(state, terrain, W, H, "normal", pers);
  must(r.ok, `شروع AI (${pers}) باید موفق باشد، شد ${r.reason}`);
  return { W, H, terrain, state };
}

function t_ai_personality_default() {
  const a = aiFresh();
  must(a.state.ai.personality === "wolf", `پیش‌فرض باید گرگ باشد، هست ${a.state.ai.personality}`);
  must(aiPersonalityName(a.state.ai) === "گرگ", "نام فارسی گرگ");
  const b = aiFreshPers("bogus");
  must(b.state.ai.personality === "wolf", "شخصیت نامعتبر باید گرگ شود");
  const c = aiFreshPers("lion");
  must(c.state.ai.personality === "lion", "شیر باید ثبت شود");
  must(aiPersonality(null).raidAtMul === 1 && aiPersonality(null).raidSizeAdd === 0, "ai خالی = گرگ خنثی");
  const p = aiRaidPlan(a.state.ai, 0);
  must(p.at === 1500 && p.n === 3, `گرگ باید جدول پایه را نگه دارد، شد ${p.at}/${p.n}`);
  return { name: "پیش‌فرض شخصیت", pass: true, detail: "گرگ خنثی + جدول پایه" };
}

function t_ai_personality_plan() {
  const at = (pers, i) => aiRaidPlan({ personality: pers }, i);
  must(at("wolf", 0).at === 1500 && at("wolf", 0).n === 3, "گرگ = جدول پایه");
  must(at("rat", 0).at === 2100 && at("rat", 0).n === 2, "موش: دیر و ریز");
  must(at("rat", 2).at === 5320 && at("rat", 2).n === 4, "موش: یورش سوم");
  must(at("snake", 0).at === 1200 && at("snake", 0).n === 3, "مار: زودرس");
  must(at("pig", 0).at === 1800 && at("pig", 0).n === 4, "خوک: دیر ولی سنگین");
  must(at("lion", 0).at === 1200 && at("lion", 0).n === 5, "شیر: زود و بزرگ");
  must(at("lion", 2).at === 3040 && at("lion", 2).n === 7, "شیر: یورش سوم");
  const combo = aiRaidPlan({ difficulty: "hard", personality: "lion" }, 0);
  must(combo.at === 840 && combo.n === 7, `سخت×شیر باید ترکیب شود، شد ${combo.at}/${combo.n}`);
  must(aiPersonality({ personality: "pig" }).goldMul === 1.5, "طلای خوک ۱٫۵×");
  must(aiPersonality({ personality: "rat" }).workerEveryMul === 1.5, "کارگر موش کندتر");
  must(aiPersonality({ personality: "snake" }).archerP === 0.55, "کماندار مار ۵۵٪");
  must(aiRaidPlan({ personality: "rat" }, 9) === null, "اندیس ناموجود = null");
  return { name: "جدول شخصیت‌ها", pass: true, detail: "زمان/اندازه/اقتصاد هر ۵ پروفایل" };
}

function t_ai_personality_save() {
  const { state } = aiFreshPers("lion");
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.ai.personality === "lion", "شخصیت باید در ذخیره بماند");
  const old = JSON.parse(serializeJSON(state));
  delete old.ai.personality;
  must(deserializeJSON(JSON.stringify(old)).ai.personality === "wolf", "ذخیره قدیمی = گرگ");
  const bad = JSON.parse(serializeJSON(state));
  bad.ai.personality = "dragon";
  let threw = false;
  try { deserializeJSON(JSON.stringify(bad)); } catch (e) { threw = true; }
  must(threw, "شخصیت نامعتبر باید رد شود");
  return { name: "ذخیره شخصیت", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}

function t_ai_personality_replay() {
  const good = { v: REPLAY_V, seed: 123, pers: "snake", cmds: [{ t: 0, cmd: { kind: "tax", v: "none" } }], ticks: 10 };
  must(validateReplayLog(good).ok, "لاگ با شخصیت باید قبول شود");
  must(!validateReplayLog({ ...good, pers: "dragon" }).ok, "شخصیت نامعتبر باید رد شود");
  const h0 = runReplay({ v: REPLAY_V, seed: 321, cmds: [], ticks: 2000 }, 2000).hash;
  const hW = runReplay({ v: REPLAY_V, seed: 321, pers: "wolf", cmds: [], ticks: 2000 }, 2000).hash;
  must(h0 === hW, "لاگ قدیمی (بی‌شخصیت) باید همان گرگ باشد");
  const hL = runReplay({ v: REPLAY_V, seed: 321, pers: "lion", cmds: [], ticks: 2000 }, 2000).hash;
  const hL2 = runReplay({ v: REPLAY_V, seed: 321, pers: "lion", cmds: [], ticks: 2000 }, 2000).hash;
  must(hL === hL2, "بازپخش شیر باید قطعی باشد");
  must(hL !== hW, "شیر باید از گرگ متفاوت باشد (یورش ۱۲۰۰)");
  return { name: "ری‌پلی شخصیت", pass: true, detail: "سازگاری + قطعیت + تفاوت" };
}

function combatCases() {
  return [t_combat_range, t_combat_2v1, t_combat_clash_fx, t_combat_cleanup, t_combat_bld,
    t_combat_tower, t_combat_wall_siege, t_ram_bonus, t_catapult_deploy, t_siege_vs_wall, t_gate_sides, t_gate_mission,
    t_hire_cost, t_barracks_gate, t_barracks_unique, t_hire_bowman, t_hire_roster, t_merc_sprites, t_roster_roles, t_combat_bowman_range,
    t_stance_hold, t_attackmove, t_retreat, t_orders_persist,
    t_boxsel_rect, t_boxsel_normalize_add, t_boxsel_filters,
    t_armor_formula, t_armor_strike, t_hire_needs_weapon,
    t_garrison_assign, t_garrison_shoot, t_garrison_post_lost, t_garrison_save,
    t_gate_open_close, t_gate_closed_siege, t_gate_toggle_invalid, t_gate_persist,
    t_guard_engage, t_guard_leash, t_guard_post_lost, t_guard_persist];
}

// موضع دفاعی (0.12.0): بدون حرکت داوطلبانه ولی ضربه در برد؛ برگشت به تهاجمی
// دوباره تعقیب را فعال می‌کند. مقدار نامعتبر رد می‌شود.
function t_stance_hold() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const me = state.units[0];
  must(me.stance === "engage", "موضع پیش‌فرض باید engage باشد");
  must(setStance(me, "hold").ok && me.stance === "hold", "تغییر موضع باید موفق باشد");
  must(!setStance(me, "fly").ok, "موضع نامعتبر باید رد شود");
  spawnUnit(state, "archer", 9.5, 5.5); // فاصله ۴: بیرون برد سرباز، در برد کماندار
  const x0 = me.x;
  simC(state, terrain, 30);
  must(me.x === x0 && me.r === 5.5, "hold نباید قدم بزند");
  must(me.hp < 60, "کماندار باید سرباز ثابت را بزند");
  must(me.mission === "idle", "بدون دستور، مأموریت idle می‌ماند");
  setStance(me, "engage");
  simC(state, terrain, 30);
  must(me.x !== x0, "engage باید تعقیب را از سر بگیرد");
  return { name: "موضع دفاعی", pass: true, detail: `ثبات + ضربه‌پذیری + تعقیب مجدد` };
}

// حرکت تهاجمی: در راه دشمن را می‌زند و بعد به مقصد می‌رسد (done).
// دشمن کماندار شکننده است چون شمشیرزن 0.14.0 تانک مرجع است و تک‌سرباز را
// می‌برد (نبرد ۱v1 با شمشیرزن در t_combat_2v1 پوشش داده شده).
function t_attackmove() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const me = state.units[0];
  spawnUnit(state, "archer", 8.5, 5.5); // سر راه مقصد (۱۲،۵)
  const o = orderAttackMove(state, me, 12, 5);
  must(o.ok && me.order.kind === "attackmove", "دستور باید attackmove ثبت شود");
  let t = 0;
  while (me.mission === "active" && t < 250) {
    simC(state, terrain, 1);
    t++;
  }
  const foe = state.units.find((u) => u.type === "archer");
  must(me.mission === "done", `باید به مقصد برسد، شد ${me.mission}`);
  must(!foe || foe.hp < 30, "دشمن سر راه باید خسارت دیده باشد");
  return { name: "حرکت تهاجمی", pass: true, detail: `done در ${t} تیک + درگیری` };
}

// عقب‌نشینی: فرار بدون ضدحمله تا done؛ فاصله زیاد می‌شود.
function t_retreat() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 8, 5, "soldier"); // شرق دشمن تا فرار به زمین باز برود، نه دیوار نقشه
  const me = state.units[0];
  spawnUnit(state, "swordsman", 7.5, 5.5);
  const o = orderRetreat(state, me);
  must(o.ok && me.order.kind === "retreat", "دستور باید retreat ثبت شود");
  const d0 = Math.hypot(me.x - 7.5, me.r - 5.5);
  let t = 0;
  while (me.mission === "active" && t < 120) {
    simC(state, terrain, 1);
    t++;
  }
  const foe = state.units.find((u) => u.type === "swordsman");
  const d1 = Math.hypot(me.x - foe.x, me.r - foe.r);
  must(me.mission === "done", `عقب‌نشینی باید تمام شود، شد ${me.mission}`);
  must(d1 > d0, `فاصله باید زیاد شود: ${d0.toFixed(2)} → ${d1.toFixed(2)}`);
  must(foe.hp === 60, "حین فرار نباید ضدحمله شود");
  return { name: "عقب‌نشینی", pass: true, detail: `done در ${t} تیک` };
}

// ذخیره موضع و دستورهای جدید + تحمل نسخه قدیم + رد دست‌کاری.
function t_orders_persist() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const me = state.units[0];
  setStance(me, "hold");
  orderAttackMove(state, me, 9, 6);
  const loaded = deserializeJSON(serializeJSON(state));
  const lu = loaded.units[0];
  must(lu.stance === "hold", "موضع باید حفظ شود");
  must(lu.order && lu.order.kind === "attackmove" && lu.order.c === 9, "نوع دستور باید حفظ شود");
  // تحمل: ذخیره قدیمی بدون stance/elapsed
  const bare = JSON.parse(serializeJSON(state));
  delete bare.units[0].stance;
  delete bare.units[0].order.elapsed;
  const tolerant = deserialize(bare);
  must(tolerant.units[0].stance === "engage", "stance غایب باید engage شود");
  must(tolerant.units[0].order.elapsed === 0, "elapsed غایب باید ۰ شود");
  // رد: موضع/نوع نامعتبر
  for (const twist of [
    (b) => { b.units[0].stance = "fly"; },
    (b) => { b.units[0].order.kind = "teleport"; },
    (b) => { b.units[0].order.elapsed = -1; },
  ]) {
    const bad = JSON.parse(serializeJSON(state));
    twist(bad);
    let ok = true;
    try { deserialize(bad); } catch { ok = false; }
    must(!ok, "دست‌کاری موضع/دستور باید رد شود");
  }
  return { name: "ذخیره دستورها", pass: true, detail: "حفظ + تحمل + ۳ رد" };
}

// دشمن نزدیک‌ترین بنا را می‌زند: دیوار سپر کلبه می‌شود، ویرانی‌اش اشغال را
// آزاد می‌کند و می‌توان سر جایش دوباره دیوار چسباند (کلبه هنوز لنگر است).
// دژکوب (0.46.0 — #۱۷): ضد دروازه ≥۲ برابر شمشیرزن واقعی در ۴۰ تیک
// (۷۲ در برابر ۲۸)؛ ضد یگان نصف (فرمول)؛ فقط ساختمان را هدف می‌گیرد
// (شمشیرزن مجاور سالم می‌ماند). نبرد MP: دروازه مالک ۰، مهاجمان مالک ۱.
function t_ram_bonus() {
  must(dmgVs(UNITS.ram, "bld") === 24, "دژکوب ضد ساختمان ۲۴ (۸×۳) است");
  must(dmgVs(UNITS.ram, "unit") === 4, "دژکوب ضد یگان نصف (۸/۲) است");
  must(dmgVs(UNITS.soldier, "bld") === 6, "پیاده عادی ضریب ندارد");
  const run = (kind) => {
    const { W, H, terrain, state } = fresh();
    enableMp(state, 2, ["A", "B"]);
    state.mpres[0].resources.wood = 500;
    state.mpres[1].resources.wood = 500;
    state.mpres[1].resources.food = 500;
    state.mpres[1].resources.gold = 500;
    const hs = siteNear(terrain, state.occ, W, H, 10, 10, 2, 2);
    must(hs, "جای کلبه باید باشد");
    must(tryPlace(state, terrain, W, H, hs[0], hs[1], CONFIG.BUILDINGS.hut, 0).ok, "کلبه باید ساخته شود");
    const gx = hs[0] + 2, gy = hs[1]; // چسبیده به ضلع شرقی کلبه
    const gr = tryPlace(state, terrain, W, H, gx, gy, CONFIG.BUILDINGS.gate, 0);
    must(gr.ok, "دروازه باید ساخته شود");
    completeAll(state);
    const gate = gr.building;
    const g = grassNear(terrain, state.occ, W, H, gx + 1, gy);
    must(g, "جای مهاجم باید باشد");
    if (kind === "ram") {
      needBarracks(state, terrain, W, H, 1);
      const h = hireUnit(state, terrain, W, H, g[0], g[1], "ram", 1);
      must(h.ok, `استخدام دژکوب باید موفق باشد، شد ${h.reason}`);
    } else {
      spawnUnit(state, "swordsman", g[0] + 0.5, g[1] + 0.5, 1);
    }
    const atk = state.units[state.units.length - 1];
    const dGate = Math.hypot(atk.x - (gx + 0.5), atk.r - (gy + 0.5));
    must(dGate <= 1.7, `مهاجم باید چسبیده به دروازه باشد، فاصله=${dGate}`);
    // مزاحم دور از دروازه (تا خسارتش قاطی نشود): شمشیرزن مالک ۰ در گوشه نقشه —
    // دژکوب فقط ساختمان را هدف می‌گیرد پس او سالم می‌ماند.
    const fg = grassNear(terrain, state.occ, W, H, 50, 50);
    must(fg, "جای مزاحم باید باشد");
    const foe = spawnUnit(state, "swordsman", fg[0] + 0.5, fg[1] + 0.5, 0);
    simC(state, terrain, 40);
    const liveFoe = state.units.find((u) => u.id === foe.id && !u.dead);
    return { dealt: 80 - gate.hp, foeHp: liveFoe ? liveFoe.hp : -1 };
  };
  const a = run("swordsman"), b = run("ram");
  must(a.dealt === 28, `شمشیرزن باید ۲۸ بزند، زد ${a.dealt}`);
  must(b.dealt === 72, `دژکوب باید ۷۲ بزند، زد ${b.dealt}`);
  must(b.dealt >= 2 * a.dealt, `دژکوب باید ≥۲ برابر بزند: ${b.dealt} در برابر ${a.dealt}`);
  must(b.foeHp === 60, `مزاحم مجاور باید سالم بماند، hp=${b.foeHp}`);
  return { name: "ضریب دژکوب", pass: true, detail: `دروازه: دژکوب=${b.dealt}، شمشیرزن=${a.dealt}` };
}

// منجنیق (0.46.0 — #۱۷): سیار = حرکتِ بی‌شلیک؛ مستقر = شلیک آزاد با برد
// بلند (۱۰) ولی حداقل برد ۳؛ قوس پرتاب ثبت می‌شود؛ فرمان = جمع‌کردن.
// هدف solo: کلبه حریف AI (مالک ۹).
function t_catapult_deploy() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 500; state.resources.gold = 500;
  state.ai.resources.wood = 500;
  const hs = siteNear(terrain, state.occ, W, H, 10, 10, 2, 2);
  must(hs, "جای کلبه حریف باید باشد");
  must(tryPlace(state, terrain, W, H, hs[0], hs[1], CONFIG.BUILDINGS.hut, 9).ok, "کلبه حریف باید ساخته شود");
  completeAll(state);
  const hut = state.buildings.find((b) => (b.owner == null ? 0 : b.owner) === 9);
  const hx = hut.c + 1, hy = hut.r + 1;
  const g = grassNear(terrain, state.occ, W, H, Math.round(hx + 6), Math.round(hy));
  must(g, "جای منجنیق باید باشد");
  const h = hireUnit(state, terrain, W, H, g[0], g[1], "catapult");
  must(h.ok, `استخدام منجنیق باید موفق باشد، شد ${h.reason}`);
  const cat = h.unit;
  const d0 = Math.hypot(cat.x - hx, cat.r - hy);
  must(d0 >= 3 && d0 <= 10, `فاصله باید در برد (۳..۱۰) باشد، هست ${d0}`);
  const x0 = cat.x, r0 = cat.r;
  simC(state, terrain, 30);
  must(hut.hp === 100, "سیار نباید شلیک کند");
  must(cat.x === x0 && cat.r === r0, "سیارِ در برد می‌ایستد");
  must(deployUnit(state, cat).ok && cat.deployed, "استقرار باید موفق باشد");
  simC(state, terrain, 80);
  must(hut.hp === 80, `مستقر باید ۲۰ بزند (۲×۱۰)، hp=${hut.hp}`);
  must(state.fx.length > 0, "قوس پرتاب باید ثبت شود");
  must(cat.x === x0 && cat.r === r0, "مستقر جابه‌جا نمی‌شود (سرعت ۰)");
  const o = orderMove(state, cat, Math.min(62, Math.round(x0) + 15), Math.min(62, Math.round(r0) + 12));
  must(o.ok && !cat.deployed, "فرمان باید جمع کند");
  let t = 0;
  while (cat.mission === "active" && t < 400) {
    simC(state, terrain, 1);
    t++;
  }
  must(cat.mission === "done", `سیار باید به مقصد برسد، شد ${cat.mission}`);
  must(Math.hypot(cat.x - x0, cat.r - r0) > 5, "سیار باید واقعاً جابه‌جا شده باشد");
  // حداقل برد ۳: چسبیده به کلبه دوم، مستقر = سکوت
  const hs2 = siteNear(terrain, state.occ, W, H, 40, 40, 2, 2);
  must(hs2, "جای کلبه دوم باید باشد");
  must(tryPlace(state, terrain, W, H, hs2[0], hs2[1], CONFIG.BUILDINGS.hut, 9).ok, "کلبه دوم باید ساخته شود");
  completeAll(state);
  const hut2 = state.buildings.find((b) => (b.owner == null ? 0 : b.owner) === 9 && b.id !== hut.id);
  cat.x = hut2.c + 1 + 2; cat.r = hut2.r + 1; // فاصله ۲ < حداقل ۳
  must(deployUnit(state, cat).ok && cat.deployed, "استقرار دوم باید موفق باشد");
  simC(state, terrain, 60);
  must(hut2.hp === 100, `زیر حداقل برد نباید بزند، hp=${hut2.hp}`);
  // ذخیره استقرار
  const loaded = deserializeJSON(serializeJSON(state));
  const lc = loaded.units.find((u) => u.id === cat.id);
  must(lc && lc.deployed === true, "استقرار باید در ذخیره بماند");
  return { name: "استقرار منجنیق", pass: true, detail: "سکوت سیار + شلیک مستقر + حداقل برد + ذخیره" };
}

// دیوار در برابر محاصره (0.46.0): دژکوب دیوار حریف را در بودجه ۸۰۰ تیک
// (بودجه t_combat_wall_siege) می‌اندازد — خیلی زودتر.
function t_siege_vs_wall() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 500; state.resources.gold = 500;
  state.ai.resources.wood = 500;
  const hs = siteNear(terrain, state.occ, W, H, 10, 10, 2, 2);
  must(hs, "جای کلبه حریف باید باشد");
  must(tryPlace(state, terrain, W, H, hs[0], hs[1], CONFIG.BUILDINGS.hut, 9).ok, "کلبه حریف باید ساخته شود");
  const wx = hs[0] + 2, wy = hs[1]; // چسبیده به ضلع شرقی کلبه
  must(tryPlace(state, terrain, W, H, wx, wy, CONFIG.BUILDINGS.wall, 9).ok, "دیوار حریف باید ساخته شود");
  completeAll(state);
  const g = grassNear(terrain, state.occ, W, H, wx + 1, wy);
  must(g, "جای دژکوب باید باشد");
  const h = hireUnit(state, terrain, W, H, g[0], g[1], "ram");
  must(h.ok, `استخدام دژکوب باید موفق باشد، شد ${h.reason}`);
  const ram = h.unit;
  const wall = state.buildings.find((b) => b.type === "wall");
  const hut = state.buildings.find((b) => b.type === "hut");
  const dW = Math.hypot(ram.x - (wall.c + 0.5), ram.r - (wall.r + 0.5));
  const dH = Math.hypot(ram.x - (hut.c + 1), ram.r - (hut.r + 1));
  must(dW < dH, `دیوار باید نزدیک‌ترین هدف باشد: دیوار=${dW}، کلبه=${dH}`);
  let t = 0;
  while (state.buildings.some((b) => b.type === "wall") && t < 800) {
    simC(state, terrain, 1);
    t++;
  }
  must(!state.buildings.some((b) => b.type === "wall"), "دیوار باید در ۸۰۰ تیک بیفتد");
  must(t <= 100, `دژکوب باید خیلی زودتر بزند، شد ${t} تیک`);
  must(state.occ[wy * W + wx] === 0, "اشغال باید پس از ویرانی آزاد شود");
  return { name: "دژکوب ضد دیوار", pass: true, detail: `${t} تیک تا ویرانی` };
}

function t_combat_wall_siege() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut); // ردپا (۵-۶،۵-۶)
  tryPlace(state, terrain, W, H, 7, 5, CONFIG.BUILDINGS.wall); // چسبیده به ضلع شرقی
  spawnUnit(state, "swordsman", 9.5, 5.5); // نزدیک‌ترین بنا دیوار است
  let t = 0;
  while (state.buildings.some((b) => b.type === "wall") && t < 800) {
    simC(state, terrain, 1);
    t++;
  }
  must(!state.buildings.some((b) => b.type === "wall"), "دیوار باید ویران شود");
  must(state.occ[5 * W + 7] === 0, "اشغال باید پس از ویرانی آزاد شود");
  must(state.events.some((e) => e.includes("دیوار سنگی") && e.includes("ویران")),
    "رویداد ویرانی دیوار باید ثبت شود");
  const v = tryPlace(state, terrain, W, H, 7, 5, CONFIG.BUILDINGS.wall);
  must(v.ok, "پس از ویرانی باید بتوان سر جایش دیوار چسباند");
  return { name: "محاصره دیوار", pass: true, detail: `${t} تیک تا ویرانی + آزادی اشغال` };
}

// دید دوطرفه: occ واقعی همیشه اشغال است (ساخت/استخدام)؛ فقط مسیریابی خودی
// دروازه را باز می‌بیند. بدون دروازه همان مرجع برمی‌گردد (بدون کپی بیهوده).
function t_gate_sides() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.wall);
  tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.gate);
  const gi = 1 * W + 4, wi = 1 * W + 3;
  must(state.occ[gi] === 1, "occ دروازه باید اشغال بماند");
  must(occForSide(state, "player")[gi] === 0, "خودی دروازه را باز می‌بیند");
  must(occForSide(state, "enemy")[gi] === 1, "دشمن دروازه را بسته می‌بیند");
  must(occForSide(state, "player")[wi] === 1, "دیوار برای خودی هم بسته است");
  const { state: bare } = fresh();
  must(occForSide(bare, "player") === bare.occ, "بدون دروازه باید همان مرجع برگردد");
  return { name: "دید دوطرفه دروازه", pass: true, detail: "خودی باز / دشمن بسته" };
}

// حلقه محاصره با تنها روزنه دروازه: سرباز خودی بیرون می‌آید (done) ولی
// برای دشمن هیچ مسیری به داخل نیست (null). روی محوطه شروع (همه چمن).
function t_gate_mission() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const wall = CONFIG.BUILDINGS.wall, gate = CONFIG.BUILDINGS.gate;
  tryPlace(state, terrain, W, H, 1, 6, CONFIG.BUILDINGS.hut); // (۱-۲،۶-۷)
  for (const [c, r] of [[3, 6], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3], [6, 3],
      [6, 4], [6, 5], [4, 5], [4, 4]]) {
    const res = tryPlace(state, terrain, W, H, c, r, wall);
    must(res.ok, `دیوار زنجیره (${c},${r}) باید ساخته شود`);
  }
  const g = tryPlace(state, terrain, W, H, 5, 5, gate); // تنها روزنه، ضلع جنوبی
  must(g.ok, "دروازه باید به زنجیره بچسبد");
  hireUnit(state, terrain, W, H, 5, 4, "soldier"); // داخل حلقه
  const me = state.units[0];
  orderMove(state, me, 5, 7); // بیرون حلقه
  let t = 0;
  while (me.mission === "active" && t < 200) {
    simC(state, terrain, 1);
    t++;
  }
  must(me.mission === "done", `سرباز باید از دروازه بیرون بیاید، شد ${me.mission}`);
  const foe = findPath(terrain, occForSide(state, "enemy"), W, H, 5, 8, 5, 4);
  must(foe === null, "دشمن نباید راهی به داخل حلقه داشته باشد");
  const pal = findPath(terrain, occForSide(state, "player"), W, H, 5, 8, 5, 4);
  must(pal && pal.some(([c, r]) => c === 5 && r === 5), "مسیر خودی باید از دروازه بگذرد");
  return { name: "گذر از دروازه", pass: true, detail: `done در ${t} تیک + دشمن null` };
}

// --- دروازه باز/بسته‌شونده (0.13.0) ---

// پیش‌فرض باز + چرخه بستن/بازگشایی؛ occ واقعی همیشه اشغال می‌ماند.
function t_gate_open_close() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  const g = tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.gate);
  must(g.ok, "دروازه باید به کلبه بچسبد");
  const gate = g.building;
  must(gate.open !== false && gateOpen(gate), "دروازه نو باید باز باشد");
  const gi = 1 * W + 3;
  must(occForSide(state, "player")[gi] === 0, "باز: خودی گذر می‌کند");
  const t1 = toggleGate(state, gate);
  must(t1.ok && gate.open === false && !gateOpen(gate), "بستن باید موفق باشد");
  must(occForSide(state, "player")[gi] === 1, "بسته: خودی هم بسته می‌بیند");
  must(occForSide(state, "enemy")[gi] === 1, "بسته: دشمن بسته می‌بیند");
  must(state.occ[gi] === 1, "occ واقعی همیشه اشغال می‌ماند");
  must(state.events.some((e) => e.includes("بسته")), "رویداد بستن باید ثبت شود");
  const t2 = toggleGate(state, gate);
  must(t2.ok && gate.open === true, "بازگشایی باید موفق باشد");
  must(occForSide(state, "player")[gi] === 0, "پس از بازگشایی گذر برمی‌گردد");
  return { name: "باز/بسته دروازه", pass: true, detail: "پیش‌فرض باز + چرخه کامل" };
}

// حلقه محاصره با دروازه بسته: سرباز خودی شکست می‌خورد (failed) و هیچ مسیری
// نیست؛ با بازگشایی، گذر برمی‌گردد. دشمن در هر دو حالت پشت دیوار می‌ماند.
function t_gate_closed_siege() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const wall = CONFIG.BUILDINGS.wall, gate = CONFIG.BUILDINGS.gate;
  tryPlace(state, terrain, W, H, 1, 6, CONFIG.BUILDINGS.hut);
  for (const [c, r] of [[3, 6], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3], [6, 3],
      [6, 4], [6, 5], [4, 5], [4, 4]]) {
    const res = tryPlace(state, terrain, W, H, c, r, wall);
    must(res.ok, `دیوار زنجیره (${c},${r}) باید ساخته شود`);
  }
  const g = tryPlace(state, terrain, W, H, 5, 5, gate);
  must(g.ok, "دروازه باید به زنجیره بچسبد");
  must(toggleGate(state, g.building).ok, "بستن دروازه باید موفق باشد");
  must(findPath(terrain, occForSide(state, "player"), W, H, 5, 8, 5, 4) === null,
    "با دروازه بسته خودی هم راهی به داخل ندارد");
  must(findPath(terrain, occForSide(state, "enemy"), W, H, 5, 8, 5, 4) === null,
    "دشمن نباید راهی به داخل داشته باشد");
  hireUnit(state, terrain, W, H, 5, 4, "soldier"); // داخل حلقه
  const me = state.units[0];
  orderMove(state, me, 5, 7); // بیرون حلقه
  simC(state, terrain, 10);
  must(me.mission === "failed", `مأموریت محال باید failed شود، شد ${me.mission}`);
  must(toggleGate(state, g.building).ok, "بازگشایی باید موفق باشد");
  const pal = findPath(terrain, occForSide(state, "player"), W, H, 5, 8, 5, 4);
  must(pal && pal.some(([c, r]) => c === 5 && r === 5), "پس از بازگشایی مسیر از دروازه می‌گذرد");
  return { name: "محاصره با دروازه بسته", pass: true, detail: "failed + بازگشت گذر" };
}

// تغییر وضعیت نامعتبر: دروازه ویران‌شده و ساختمان غیردروازه رد می‌شوند.
function t_gate_toggle_invalid() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  const w = tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.wall);
  must(w.ok, "دیوار باید ساخته شود");
  const g = tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.gate);
  must(g.ok, "دروازه باید ساخته شود");
  must(!toggleGate(state, w.building).ok, "دیوار قابل باز/بسته نیست");
  must(!toggleGate(state, null).ok, "null باید رد شود");
  // ویرانی واقعی در نبرد: دو شمشیرزن چسبیده به دروازه تا آوار شود.
  spawnUnit(state, "swordsman", 4.5, 2.5);
  spawnUnit(state, "swordsman", 5.5, 2.5);
  let t = 0;
  while (!g.building.destroyed && t < 600) { simC(state, terrain, 1); t++; }
  must(g.building.destroyed, "دروازه باید در نبرد ویران شود");
  must(!toggleGate(state, g.building).ok, "دروازه ویران‌شده قابل تغییر نیست");
  must(!gateOpen(g.building), "ویران‌شده گذرگاه نیست");
  return { name: "رد تغییر نامعتبر", pass: true, detail: `ویرانی در ${t} تیک + رد` };
}

// ذخیره وضعیت دروازه: بسته می‌ماند؛ ذخیره قدیمی بدون open یعنی باز؛
/// مقدار خراب رد می‌شود.
function t_gate_persist() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  const g = tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.gate);
  must(g.ok, "دروازه باید ساخته شود");
  toggleGate(state, g.building);
  const loaded = deserializeJSON(serializeJSON(state));
  const lg = loaded.buildings.find((b) => b.type === "gate");
  must(lg && lg.open === false, "دروازه بسته باید بسته بماند");
  must(occForSide(loaded, "player")[1 * W + 3] === 1, "بارگذاری‌شده بسته را سد می‌بیند");
  // تحمل ذخیره قدیمی (بدون open) → باز
  const old = JSON.parse(serializeJSON(state));
  for (const b of old.buildings) delete b.open;
  const legacy = deserialize(old);
  const og = legacy.buildings.find((b) => b.type === "gate");
  must(og && og.open !== false, "ذخیره قدیمی باید باز تلقی شود");
  // دست‌کاری → خطا
  const badData = JSON.parse(serializeJSON(state));
  badData.buildings.find((b) => b.type === "gate").open = "yes";
  let threw = false;
  try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "open خراب باید SaveError بدهد");
  return { name: "ذخیره دروازه", pass: true, detail: "بسته می‌ماند + تحمل قدیمی + رد خراب" };
}

// --- نگهبانی از ساختمان (0.15.0) ---

// درگیری با مزاحمِ در شعاع پاسگاه: سرباز پاسگاه کلبه را ترک می‌کند، کماندار
// مهاجم را می‌کشد و مأموریت idle می‌ماند (نگهبانی وضعیت است).
function t_guard_engage() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه باید ساخته شود");
  hireUnit(state, terrain, W, H, 3, 1, "soldier");
  const me = state.units[0];
  must(setGuard(state, me, h.building).ok, "گماشتن نگهبان باید موفق باشد");
  must(me.stance === "guard" && guardPost(state, me) === h.building, "موضع و پاسگاه باید ثبت شود");
  must(!setGuard(state, me, null).ok, "پاسگاه نامعتبر باید رد شود");
  spawnUnit(state, "archer", 5.5, 2.5); // فاصله ۳٫۵ از مرکز پاسگاه (۲،۲) — در شعاع
  simC(state, terrain, 80);
  const foe = state.units.find((u) => u.type === "archer");
  must(!foe, "کماندار مهاجم باید کشته شود");
  must(me.mission === "idle", "نگهبانی مأموریت فعال نمی‌سازد");
  const d = Math.hypot(me.x - 2, me.r - 2);
  must(d <= 7, `نگهبان باید نزدیک پاسگاه بماند، فاصله=${d.toFixed(2)}`);
  must(state.events.some((e) => e.includes("نگهبانی")), "رویداد گماشتن باید ثبت شود");
  return { name: "درگیری نگهبان", pass: true, detail: "کشته شدن مهاجم + ماندن در قلمرو" };
}

// افسار: دشمنِ بیرون شعاع نادیده گرفته می‌شود — نگهبان سر پست می‌ایستد و
// مزاحم دست‌نخورده می‌ماند (با شمشیرزن کند: ۱۰ تیک برای نرسیدن به شعاع کافی است).
function t_guard_leash() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه باید ساخته شود");
  hireUnit(state, terrain, W, H, 3, 1, "soldier");
  const me = state.units[0];
  setGuard(state, me, h.building);
  spawnUnit(state, "swordsman", 12.5, 2.5); // فاصله ۱۰٫۵ از پاسگاه — بیرون شعاع
  const x0 = me.x, r0 = me.r;
  simC(state, terrain, 10);
  const foe = state.units.find((u) => u.type === "swordsman");
  must(foe && foe.hp === 60, "مزاحم دور باید دست‌نخورده بماند");
  must(me.x === x0 && me.r === r0, "نگهبان نباید پست را ترک کند");
  must(me.mission === "idle", "مأموریت باید idle بماند");
  return { name: "افسار نگهبان", pass: true, detail: "بی‌اعتنایی به دشمن دور" };
}

// از دست رفتن پاسگاه (ویرانی واقعی): بازگشت خودکار به engage + پاک شدن ارجاع.
function t_guard_post_lost() {
  const { W, H, terrain, state } = fresh();
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه باید ساخته شود");
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 4, "bowman");
  const me = state.units[0];
  setGuard(state, me, h.building);
  spawnUnit(state, "swordsman", 3.5, 1.5);
  spawnUnit(state, "swordsman", 3.5, 2.5);
  let t = 0;
  while (state.buildings.length > 0 && t < 600) { simC(state, terrain, 1); t++; }
  must(state.buildings.length === 0, "کلبه باید ویران شود");
  simC(state, terrain, 5); // فرصت یک گام پس از ویرانی تا بازگشت ثبت شود
  must(me.stance === "engage" && me.guardBld == null, "نگهبان باید تهاجمی شود");
  must(state.events.some((e) => e.includes("تهاجمی")), "رویداد بازگشت باید ثبت شود");
  return { name: "از دست رفتن پاسگاه", pass: true, detail: `ویرانی در ${t} تیک + بازگشت` };
}

// ذخیره نگهبانی: موضع + پاسگاه حفظ می‌شود؛ قدیمی بدون guardBld → null؛
// خراب (guardBld/stance) → SaveError.
function t_guard_persist() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه باید ساخته شود");
  hireUnit(state, terrain, W, H, 3, 1, "soldier");
  setGuard(state, state.units[0], h.building);
  const loaded = deserializeJSON(serializeJSON(state));
  const lu = loaded.units[0];
  must(lu.stance === "guard" && lu.guardBld === h.building.id, "موضع و پاسگاه باید حفظ شوند");
  must(guardPost(loaded, lu) !== null, "پاسگاه بارگذاری‌شده باید زنده باشد");
  const old = JSON.parse(serializeJSON(state));
  delete old.units[0].guardBld;
  must(deserialize(old).units[0].guardBld == null, "قدیمی بدون guardBld یعنی null");
  for (const patch of [(d) => { d.units[0].guardBld = "x"; }, (d) => { d.units[0].stance = "fly"; }]) {
    const badData = JSON.parse(serializeJSON(state));
    patch(badData);
    let threw = false;
    try { deserialize(badData); } catch (e) { threw = e instanceof SaveError; }
    must(threw, "دست‌کاری نگهبانی باید SaveError بدهد");
  }
  return { name: "ذخیره نگهبانی", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}

// --- CORE-001: مسیریابی A* ---

function blankMap(w, h) {
  return {
    terrain: new Uint8Array(w * h).fill(T_GRASS),
    occ: new Uint8Array(w * h),
  };
}

function t_path_open() {
  const W = 8, H = 8;
  const { terrain, occ } = blankMap(W, H);
  const p = findPath(terrain, occ, W, H, 0, 0, 4, 0);
  must(p && p.length === 5, `مسیر باز باید ۵ خانه باشد، هست ${p && p.length}`);
  must(p[0][0] === 0 && p[4][0] === 4, "سر و ته مسیر باید درست باشد");
  for (let i = 1; i < p.length; i++) {
    const d = Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]);
    must(d === 1, "گام‌ها باید چهارجهته باشند");
  }
  const q = findPath(terrain, occ, W, H, 0, 0, 4, 0);
  must(JSON.stringify(p) === JSON.stringify(q), "مسیر باید قطعی باشد");
  return { name: "مسیر باز", pass: true, detail: "طول ۵، قطعی" };
}

function t_path_detour() {
  const W = 7, H = 7;
  const { terrain, occ } = blankMap(W, H);
  // دیوار در ستون ۲ به‌جز شکاف (۲،۲)
  for (let r = 0; r < H; r++) {
    if (r !== 2) occ[r * W + 2] = 1;
  }
  const p = findPath(terrain, occ, W, H, 0, 0, 4, 0);
  must(p, "مسیر از شکاف باید پیدا شود");
  must(p.some(([c, r]) => c === 2 && r === 2), "مسیر باید از شکاف (۲،۲) بگذرد");
  must(p.length > 5, `مسیر انحرافی باید بلندتر از منهتن باشد، هست ${p.length}`);
  return { name: "انحراف از شکاف", pass: true, detail: `طول ${p.length} از شکاف` };
}

function t_path_unreachable() {
  const W = 5, H = 5;
  const { terrain, occ } = blankMap(W, H);
  occ[2 * W + 2] = 1; // هدف اشغال
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    occ[(2 + dr) * W + (2 + dc)] = 1; // حلقه محاصره
  }
  const p = findPath(terrain, occ, W, H, 0, 0, 2, 2);
  must(p === null, "هدف محاصره‌شده باید null بدهد");
  const g = nearestWalkable(terrain, occ, W, H, 2, 2, 4);
  must(g, "باید نزدیک‌ترین همسایه باز پیدا شود");
  must(isCellWalkable(terrain, occ, W, H, g[0], g[1]), "همسایه پیشنهادی باید باز باشد");
  return { name: "هدف ناممکن", pass: true, detail: `null + همسایه (${g})` };
}

function t_path_around_rocks() {
  // سناریوی واقعی در پارتیشن غربی: خط مستقیم از توده سنگ می‌گذرد —
  // لغزش خطی قدیمی اینجا گیر می‌کند، A* دور می‌زند (نقاط نسبی به توده سنگ).
  const run = () => {
    const { W, H, terrain, state } = fresh();
    const pins = terrainPins(W, H);
    const R0 = pins.rocks[0];
    // هر دو چمن‌اند (نزدیک‌ترین چمن به دو سوی توده سنگ شمال‌غربی)
    const A = grassNear(terrain, null, W, H, R0[0] - 6, R0[1] - 5);
    const B = grassNear(terrain, null, W, H, R0[0] + 6, R0[1] + 4);
    must(A && B, "نقاط دو سوی سنگ باید چمن باشند");
    must(terrain[A[1] * W + A[0]] === T_GRASS, "نقطه غرب باید چمن باشد");
    must(terrain[B[1] * W + B[0]] === T_GRASS, "نقطه شرق باید چمن باشد");
    spawnUnit(state, "soldier", A[0] + 0.5, A[1] + 0.5);
    spawnUnit(state, "swordsman", B[0] + 0.5, B[1] + 0.5);
    let dmgTick = -1;
    for (let i = 0; i < 800; i++) {
      simC(state, terrain, 1);
      const foe = state.units.find((u) => u.type === "swordsman");
      const me = state.units.find((u) => u.type === "soldier");
      if ((foe && foe.hp < 60) || (me && me.hp < 60)) { dmgTick = i + 1; break; }
      if (!foe || !me) { dmgTick = i + 1; break; } // یکی کشته شد = رسیدند
    }
    return dmgTick;
  };
  const a = run(), b = run();
  must(a > 0, "واحدها باید در ۸۰۰ تیک دور سنگ به هم برسند و بجنگند");
  must(a === b, "زمان رسیدن باید قطعی باشد");
  return { name: "دور زدن سنگ", pass: true, detail: `نخستین ضربه تیک ${a}` };
}

function t_path_after_load() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  spawnUnit(state, "swordsman", 12.5, 8.5);
  simC(state, terrain, 5); // مسیر محاسبه شده ولی هنوز در راه‌اند (فاصله ~۷)
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.units[0].path == null, "مسیر نباید ذخیره شود (بازمحاسبه پس از load)");
  const snap = loaded.units.map((u) => [u.x, u.r, u.hp]);
  for (let i = 0; i < 60; i++) { loaded.tick++; stepEconomy(loaded); stepCombat(loaded, terrain); }
  const progressed = loaded.units.some((u, i) =>
    Math.abs(u.x - snap[i][0]) > 1e-9 || Math.abs(u.r - snap[i][1]) > 1e-9 || u.hp < snap[i][2]);
  must(progressed, "واحد باید پس از load حرکت یا نبرد را ادامه دهد");
  return { name: "مسیر پس از بارگذاری", pass: true, detail: "بازمحاسبه موفق" };
}

function t_map_connected4() {
  // نقشه متقارن ۴گوشه: هر پایگاه باید به هر پایگاه دیگر راه داشته باشد
  // (دریاچه مرکزی نباید هیچ ربعی را جدا کند).
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, CONFIG.MAP_SEED);
  mpClearSpawns(terrain, W, H);
  const occ = new Uint8Array(W * H); // خالی — ساختمان نداریم
  const pts = [];
  for (const [qc, qr] of [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]]) {
    const g = grassNear(terrain, null, W, H, qc, qr);
    must(g, `ربع (${qc},${qr}) باید چمن داشته باشد`);
    pts.push(g);
  }
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const p = findPath(terrain, occ, W, H, pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
      must(p, `ربع ${i} باید به ربع ${j} وصل باشد`);
      must(p.length < 500, `مسیر ربع ${i}→${j} باید معقول باشد، هست ${p.length}`);
      for (let k = 1; k < p.length; k++) {
        const d = Math.abs(p[k][0] - p[k - 1][0]) + Math.abs(p[k][1] - p[k - 1][1]);
        must(d === 1, "گام‌ها باید چهارجهته باشند");
        must(isCellWalkable(terrain, occ, W, H, p[k][0], p[k][1]), "همه گام‌ها باید باز باشند");
      }
      total += p.length;
    }
  }
  const q = findPath(terrain, occ, W, H, pts[0][0], pts[0][1], pts[3][0], pts[3][1]);
  const q2 = findPath(terrain, occ, W, H, pts[0][0], pts[0][1], pts[3][0], pts[3][1]);
  must(JSON.stringify(q) === JSON.stringify(q2), "مسیر باید قطعی باشد");
  return { name: "اتصال ۴ گوشه", pass: true, detail: `۶ مسیر، جمع طول ${total}` };
}

function pathCases() {
  return [t_path_open, t_path_detour, t_path_unreachable,
    t_path_around_rocks, t_path_after_load, t_map_connected4];
}

// --- CONST-001: اعتبارسنجی ساخت (۵ تست اولین گام ایده — تا حالا پوشش صفر بود) ---

function t_const_bounds() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut, tower = CONFIG.BUILDINGS.tower;
  let v = validate(state, terrain, W, H, -1, 5, hut);
  must(!v.ok && v.reason === "OUT_OF_BOUNDS", "x منفی باید OUT_OF_BOUNDS باشد");
  v = validate(state, terrain, W, H, W - 1, H - 1, hut); // ردپای ۲×۲ بیرون می‌زند
  must(!v.ok && v.reason === "OUT_OF_BOUNDS", "ردپای بیرون‌زده باید OUT_OF_BOUNDS باشد");
  v = validate(state, terrain, W, H, W - 2, H - 2, tower); // ردپای ۳×۳ بیرون
  must(!v.ok && v.reason === "OUT_OF_BOUNDS", "برج بیرون‌زده باید OUT_OF_BOUNDS باشد");
  must(state.rejected === 0, "validate خشک نباید شمارنده را تکان دهد");
  const r = tryPlace(state, terrain, W, H, W - 1, H - 1, hut);
  must(!r.ok && state.rejected === 1, "tryPlace ناموفق باید rejected را بشمارد");
  return { name: "مرز نقشه", pass: true, detail: "۳ رد + شمارنده" };
}

function t_const_terrain() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut;
  const pins = terrainPins(W, H);
  must(terrain[pins.lake[1] * W + pins.lake[0]] !== T_GRASS, "پیش‌فرض: دریاچه آب است");
  let v = validate(state, terrain, W, H, pins.lake[0], pins.lake[1], hut);
  must(!v.ok && v.reason === "TERRAIN", "ساخت روی آب باید TERRAIN باشد");
  v = validate(state, terrain, W, H, pins.rock[0], pins.rock[1], hut); // توده سنگ
  must(!v.ok && v.reason === "TERRAIN", "ساخت روی سنگ باید TERRAIN باشد");
  return { name: "زمین نامناسب", pass: true, detail: "آب + سنگ رد شدند" };
}

function t_const_occupied() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut;
  tryPlace(state, terrain, W, H, 1, 1, hut);
  let v = validate(state, terrain, W, H, 1, 1, hut);
  must(!v.ok && v.reason === "OCCUPIED", "خانه اشغال‌شده باید OCCUPIED باشد");
  v = validate(state, terrain, W, H, 0, 0, hut); // ردپا (۱،۱) را می‌پوشاند، لنگر آزاد
  must(!v.ok && v.reason === "OCCUPIED", "هم‌پوشانی جزئی باید OCCUPIED باشد");
  v = validate(state, terrain, W, H, 2, 2, hut); // لنگر داخل بنا
  must(!v.ok && v.reason === "OCCUPIED", "لنگر داخل بنا باید OCCUPIED باشد");
  return { name: "اشغال و هم‌پوشانی", pass: true, detail: "۳ حالت رد شدند" };
}

function t_const_priority() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut, tower = CONFIG.BUILDINGS.tower;
  // کلبه روی چمن نزدیک ساحل دریاچه (جست‌وجوی پویا، مستقل از اندازه نقشه)
  const pins = terrainPins(W, H);
  const shore = grassNear(terrain, null, W, H, pins.lake[0], pins.lake[1]);
  must(shore, "باید چمن نزدیک دریاچه باشد");
  let hutAt = null;
  for (let rad = 0; rad < 12 && !hutAt; rad++) {
    for (let dr = -rad; dr <= rad && !hutAt; dr++) {
      for (let dc = -rad; dc <= rad && !hutAt; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const cc = shore[0] + dc, rr = shore[1] + dr;
        if (validate(state, terrain, W, H, cc, rr, hut).ok) hutAt = [cc, rr];
      }
    }
  }
  must(hutAt, "باید جای کلبه نزدیک ساحل باشد");
  tryPlace(state, terrain, W, H, hutAt[0], hutAt[1], hut);
  // ردپای برج که هم آب را بپوشاند هم کلبه را → زمین بر اشغال مقدم است
  let found = null;
  for (let dr = -3; dr <= 1 && !found; dr++) {
    for (let dc = -3; dc <= 1 && !found; dc++) {
      const cc = hutAt[0] + dc, rr = hutAt[1] + dr;
      if (cc < 0 || rr < 0 || cc + 3 > W || rr + 3 > H) continue;
      let coversWater = false, coversHut = false;
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const x = cc + i, y = rr + j;
          if (terrain[y * W + x] !== T_GRASS) coversWater = true;
          if (x >= hutAt[0] && x < hutAt[0] + 2 && y >= hutAt[1] && y < hutAt[1] + 2) coversHut = true;
        }
      }
      if (coversWater && coversHut) {
        const chk = validate(state, terrain, W, H, cc, rr, tower);
        if (!chk.ok && chk.reason === "TERRAIN") found = [cc, rr];
      }
    }
  }
  must(found, "باید برجی باشد که هم آب هم کلبه را بپوشاند");
  const v = validate(state, terrain, W, H, found[0], found[1], tower);
  must(!v.ok && v.reason === "TERRAIN", `زمین بر اشغال مقدم است، شد ${v.reason}`);
  // مرز بر همه چیز مقدم است
  const w = validate(state, terrain, W, H, W - 2, H - 2, tower);
  must(!w.ok && w.reason === "OUT_OF_BOUNDS", "مرز باید بر همه مقدم باشد");
  return { name: "اولویت دلایل", pass: true, detail: "مرز > زمین > اشغال" };
}

function t_const_ok() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.woodcutter);
  must(r.ok && r.building.id === 1, "ساخت معتبر باید موفق باشد");
  must(r.building.hp === CONFIG.BUILDINGS.woodcutter.hp, "HP اولیه باید از جدول باشد");
  must(state.placed === 1, "placed باید ۱ شود");
  must(state.resources.wood === 105, `هزینه چوب‌بری (۱۵) باید کم شود، هست ${state.resources.wood}`);
  const v = validate(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(!v.ok && v.reason === "OCCUPIED", "اشغال باید بلافاصله پس از ساخت اعمال شود");
  return { name: "ساخت معتبر", pass: true, detail: "id=1، کسر ۱۵ چوب، اشغال آنی" };
}

function t_const_cost() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut, tower = CONFIG.BUILDINGS.tower;
  tryPlace(state, terrain, W, H, 1, 1, hut); // ۱۰ چوب
  must(state.resources.wood === 110, "هزینه کلبه باید کم شود");
  state.resources.wood = 5;
  const v = validate(state, terrain, W, H, 4, 1, hut);
  must(!v.ok && v.reason === "INSUFFICIENT", "کمبود چوب باید INSUFFICIENT باشد");
  const before = state.rejected;
  const r = tryPlace(state, terrain, W, H, 4, 1, hut);
  must(!r.ok && state.resources.wood === 5, "رد نباید منابع کم کند");
  must(state.rejected === before + 1, "رد باید شمرده شود");
  state.resources.wood = 100;
  state.resources.gold = 5;
  const g = validate(state, terrain, W, H, 5, 5, tower); // برج ۳۰ چوب + ۱۰ طلا می‌خواهد
  must(!g.ok && g.reason === "INSUFFICIENT", "کمبود طلا هم باید INSUFFICIENT باشد");
  return { name: "هزینه ساخت", pass: true, detail: "کسر + رد چوب/طلا" };
}

function t_const_spacing() {
  const { W, H, terrain, state } = fresh();
  const hut = CONFIG.BUILDINGS.hut, tower = CONFIG.BUILDINGS.tower;
  const wc = CONFIG.BUILDINGS.woodcutter;
  tryPlace(state, terrain, W, H, 1, 1, wc);
  let v = validate(state, terrain, W, H, 4, 1, wc); // فاصله ۱ — مجاز
  must(v.ok, "چوب‌بری با فاصله ۱ باید معتبر باشد");
  v = validate(state, terrain, W, H, 3, 1, wc); // چسبیده (فاصله ۰)
  must(!v.ok && v.reason === "SPACING", `چوب‌بری چسبیده باید SPACING باشد، شد ${v.reason}`);
  tryPlace(state, terrain, W, H, 5, 5, tower);
  v = validate(state, terrain, W, H, 8, 8, tower); // فاصله چبی‌شف ۰ (گوشه‌به‌گوشه)
  must(!v.ok && v.reason === "SPACING", "برج نزدیک باید SPACING باشد");
  v = validate(state, terrain, W, H, 1, 4, hut); // کلبه قانون فاصله ندارد
  must(v.ok, "کلبه چسبیده باید معتبر باشد (بدون قانون خاص)");
  return { name: "قانون فاصله", pass: true, detail: "SPACING چوب‌بری/برج + معافیت کلبه" };
}

// برج سنگ می‌خواهد (0.18.0: ۲۰چ+۱۰ط+۱۰سنگ): کسر هر سه + رد کمبود سنگ.
function t_const_tower_stone() {
  const { W, H, terrain, state } = fresh();
  const tower = CONFIG.BUILDINGS.tower;
  state.resources.stone = 5; // چوب و طلا کافی‌اند
  const v = validate(state, terrain, W, H, 5, 5, tower);
  must(!v.ok && v.reason === "INSUFFICIENT", "کمبود سنگ باید INSUFFICIENT باشد");
  state.resources.stone = 40;
  const r = tryPlace(state, terrain, W, H, 5, 5, tower);
  must(r.ok, "برج با منابع شروع باید ساخته شود");
  must(state.resources.wood === 100 && state.resources.gold === 50 && state.resources.stone === 30,
    `هر سه باید کم شوند: ${state.resources.wood}، ${state.resources.gold}، ${state.resources.stone}`);
  return { name: "هزینه سنگی برج", pass: true, detail: "رد + کسر ۲۰چ+۱۰ط+۱۰سنگ" };
}

function constCases() {
  return [t_const_bounds, t_const_terrain, t_const_occupied, t_const_priority, t_const_ok,
    t_const_cost, t_const_tower_stone,
    t_const_cost, t_const_spacing, t_const_wall_anchor, t_const_wall_chain, t_const_wall_blocks,
    t_const_gate_anchor,
    t_build_time, t_build_mill_waits, t_build_tower_offline, t_build_barracks_gate, t_build_save,
    t_demolish, t_demolish_refund, t_demolish_refund_cap, t_demolish_keep, t_demolish_queue];
}

// --- ساخت تدریجی و تخریب دستی (0.39.0 — FEATURES #۳) ---

// کلبه (۳۰ تیک): نیمه‌کاره مسکن نمی‌دهد و کارگر نمی‌خواهد؛ پس از تکمیل +۴.
function t_build_time() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  must(r.ok, "کلبه باید ساخته شود");
  must(r.building.buildLeft === 30, `buildLeft باید ۳۰ باشد، هست ${r.building.buildLeft}`);
  must(state.resources.wood === 110, "هزینه همان اول کسر می‌شود");
  rawTicks(state, 29);
  must(r.building.buildLeft === 1, `باید ۱ مانده باشد، هست ${r.building.buildLeft}`);
  must(housingCap(state) === 4, "نیمه‌کاره مسکن نمی‌دهد");
  rawTicks(state, 1);
  must(r.building.buildLeft === 0, "باید تکمیل شود");
  must(housingCap(state) === 8, "پس از تکمیل +۴ مسکن");
  return { name: "ساخت تدریجی کلبه", pass: true, detail: "۳۰ تیک بدون مسکن، بعد +۴" };
}

// آسیاب (۶۰ تیک): نیمه‌کاره نه کارگر می‌خواهد نه مصرف/تولید؛ بعد ۲←۲.
function t_build_mill_waits() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.mill);
  must(r.ok, "آسیاب باید ساخته شود");
  must(workersNeeded(r.building) === 0, "نیمه‌کاره کارگر نمی‌خواهد");
  rawTicks(state, 60);
  must(r.building.buildLeft === 0, "باید تکمیل شود");
  must(workersNeeded(r.building) === 1, "پس از تکمیل ۱ کارگر");
  must(state.resources.wheat === 20 && state.resources.flour === 0, "در ساخت چیزی مصرف/تولید نشود");
  rawTicks(state, 15);
  must(state.resources.wheat === 18, `گندم باید ۱۸ باشد، هست ${state.resources.wheat}`);
  must(state.resources.flour === 2, `آرد باید ۲ باشد، هست ${state.resources.flour}`);
  return { name: "انتظار آسیاب", pass: true, detail: "۶۰ تیک سکوت، بعد ۲گندم←۲آرد" };
}

// برج (۱۰۰ تیک): نیمه‌کاره شلیک نمی‌کند ولی خودش هدف است و ضربه می‌خورد.
function t_build_tower_offline() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.tower);
  spawnUnit(state, "swordsman", 9.5, 6.5);
  for (let i = 0; i < 50; i++) { state.tick++; stepEconomy(state); stepCombat(state, terrain); }
  const foe = state.units.find((u) => u.type === "swordsman");
  must(foe && foe.hp === 60, `دشمن باید سالم بماند، hp=${foe && foe.hp}`);
  const tower = state.buildings.find((b) => b.type === "tower");
  must((tower.buildLeft || 0) === 50, `باید ۵۰ مانده باشد، هست ${tower.buildLeft}`);
  must(tower.hp < 250, "نیمه‌کاره باید ضربه بخورد");
  completeAll(state);
  for (let i = 0; i < 150 && state.units.some((u) => u.type === "swordsman"); i++) {
    state.tick++; stepEconomy(state); stepCombat(state, terrain);
  }
  must(!state.units.some((u) => u.type === "swordsman"), "پس از تکمیل باید بکشد");
  return { name: "برج نیمه‌کاره شلیک نمی‌کند", pass: true, detail: "۵۰ تیک سکوت + ضربه‌پذیری، بعد کشتار" };
}

// سربازخانه نیمه‌کاره استخدام نمی‌دهد؛ پس از تکمیل می‌دهد.
function t_build_barracks_gate() {
  const { W, H, terrain, state } = fresh();
  state.resources.swords = 5; state.resources.bows = 5; // انبار مهمات (0.44.0)
  const def = CONFIG.BUILDINGS.barracks;
  let r = null;
  for (let rr = 1; rr + def.h <= H && !r; rr++) {
    for (let cc = 1; cc + def.w <= W && !r; cc++) {
      if (validate(state, terrain, W, H, cc, rr, def).ok) r = tryPlace(state, terrain, W, H, cc, rr, def);
    }
  }
  must(r && r.ok, "سربازخانه باید ساخته شود");
  must(!hasBarracks(state), "نیمه‌کاره سربازخانه حساب نیست");
  const h = hireUnit(state, terrain, W, H, 5, 5, "soldier");
  must(!h.ok && h.reason === "NO_BARRACKS", `باید NO_BARRACKS باشد، شد ${h.reason}`);
  completeAll(state);
  must(hasBarracks(state), "پس از تکمیل باید حساب باشد");
  must(hireUnit(state, terrain, W, H, 5, 5, "soldier").ok, "پس از تکمیل استخدام باید موفق باشد");
  return { name: "سربازخانه نیمه‌کاره", pass: true, detail: "رد استخدام تا تکمیل" };
}

// buildLeft در ذخیره می‌ماند؛ قدیمی بدون آن = تکمیل؛ منفی رد می‌شود.
function t_build_save() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  rawTicks(state, 5);
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.buildings[0].buildLeft === 25, `باید ۲۵ بماند، هست ${loaded.buildings[0].buildLeft}`);
  const old = JSON.parse(serializeJSON(state));
  delete old.buildings[0].buildLeft;
  must(deserialize(old).buildings[0].buildLeft === 0, "قدیمی یعنی تکمیل");
  const bad = JSON.parse(serializeJSON(state));
  bad.buildings[0].buildLeft = -1;
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "buildLeft منفی باید SaveError بدهد");
  return { name: "ذخیره ساخت نیمه‌کاره", pass: true, detail: "حفظ ۲۵ + پیش‌فرض ۰ + رد منفی" };
}

// تخریب دستی: ویرانی + آزادی زمین + غرامت یک‌سوم (ب-۱، 0.62.0) + رویداد جدا.
function t_demolish() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  must(r.ok, "کلبه باید ساخته شود");
  completeAll(state);
  const v = validateDemolish(state, r.building.id);
  must(v.ok, "تخریب کلبه خودی باید معتبر باشد");
  demolishBuilding(state, v.building);
  must(r.building.destroyed, "باید ویران شود");
  must(state.resources.wood === 113, `غرامت کلبه ۳ چوب است (۱۱۰+۳): ${state.resources.wood}`);
  must(state.events.some((e) => e.includes("تخریب")), "رویداد تخریب باید ثبت شود");
  const r2 = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.woodcutter);
  must(r2.ok, "زمین باید آزاد شود");
  return { name: "تخریب دستی", pass: true, detail: "ویرانی + آزادی + غرامت ۳چ" };
}

// غرامت چندمنبعی (ب-۱): برج (۲۰چ+۱۰ط+۱۰سنگ) → ۶چ+۳ط+۳سنگ؛ فرمول خالص.
function t_demolish_refund() {
  const ref = demolishRefund("tower");
  must(ref.wood === 6 && ref.gold === 3 && ref.stone === 3, `فرمول برج: ${JSON.stringify(ref)}`);
  must(JSON.stringify(demolishRefund("wall")) === "{}", "دیوار (۲چ) غرامت ندارد (کف صفر)");
  must(demolishRefund("hut").wood === 3, "کلبه → ۳چ");
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.tower);
  must(r.ok, "برج باید ساخته شود");
  completeAll(state);
  must(state.resources.wood === 100 && state.resources.gold === 50 && state.resources.stone === 30, "کسر هزینه برج");
  demolishBuilding(state, r.building);
  must(state.resources.wood === 106 && state.resources.gold === 53 && state.resources.stone === 33,
    `غرامت برج: ${state.resources.wood}، ${state.resources.gold}، ${state.resources.stone}`);
  return { name: "غرامت تخریب چندمنبعی", pass: true, detail: "فرمول + ۶چ+۳ط+۳سنگ" };
}

// غرامت با سقف (ب-۱): نزدیک سقف پر → تخریب غرامت را در سقف می‌تراشد، نه بیشتر.
function t_demolish_refund_cap() {
  const { W, H, terrain, state } = fresh();
  const cap = capFor(state, "wood");
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  must(r.ok, "کلبه باید ساخته شود");
  completeAll(state);
  state.resources.wood = cap - 1; // نزدیک سقف (غرامت ۳ واحدی سرریز می‌کند)
  demolishBuilding(state, r.building);
  must(state.resources.wood === cap, `غرامت نباید از سقف (${cap}) بگذرد: ${state.resources.wood}`);
  return { name: "سقف غرامت تخریب", pass: true, detail: `تراش در سقف ${cap}` };
}

// ستاد قابل تخریب نیست (وگرنه شکست خودخواسته می‌شد).
function t_demolish_keep() {
  const { W, H, terrain, state } = fresh();
  const r = placeKeep(state, terrain, W, H);
  must(r.ok, "ستاد باید ساخته شود");
  const v = validateDemolish(state, r.building.id);
  must(!v.ok && v.reason === "KEEP", `باید KEEP باشد، شد ${v.reason}`);
  must(!r.building.destroyed, "ستاد باید سالم بماند");
  return { name: "منع تخریب ستاد", pass: true, detail: "KEEP + سلامت" };
}

// مسیر صف سولو: فرمان تخریب در تیک بعد اجرا می‌شود.
function t_demolish_queue() {
  const { W, H, terrain, state } = fresh();
  const r = tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.hut);
  must(r.ok, "کلبه باید ساخته شود");
  completeAll(state);
  const q = createQueue();
  must(enqueueCmd(q, { kind: "demolish", bld: r.building.id }, state.tick).ok, "فرمان باید در صف برود");
  stepSim(state, terrain, 2, q);
  must(r.building.destroyed, "باید پس از تخلیه صف ویران شود");
  must(queueLen(q) === 0, "صف باید خالی شود");
  return { name: "تخریب از صف فرمان", pass: true, detail: "enqueue → تخلیه → ویرانی" };
}

function keepCases() {
  return [t_keep_start, t_keep_unique, t_keep_defeat, t_keep_save];
}

function lordCases() {
  return [t_lord_start, t_lord_unique, t_lord_death, t_victory, t_lord_save];
}

// --- ارباب و پیروزی (0.22.0) ---

// جای‌گیری آغازین: یکتا، رایگان، چمن آزاد نزدیک ستاد، جان کامل، قطعی.
function t_lord_start() {
  const run = () => {
    const { W, H, terrain, state } = fresh();
    must(placeKeep(state, terrain, W, H).ok, "ستاد باید ساخته شود");
    const before = { ...state.resources };
    const res = spawnLord(state, terrain, W, H);
    must(res.ok && res.unit, "ارباب باید برخیزد");
    const lords = state.units.filter((u) => u.type === "lord" && !u.dead);
    must(lords.length === 1, "دقیقاً یک ارباب باید باشد");
    const L = lords[0];
    must(L.hp === UNITS.lord.hp && L.side === "player", "ارباب باید خودی با جان کامل باشد");
    const c = Math.floor(L.x), r = Math.floor(L.r);
    must(terrain[r * W + c] === T_GRASS, "زیر ارباب باید چمن باشد");
    must(state.occ[r * W + c] !== 1, "ارباب نباید روی بنا باشد");
    must(state.resources.wood === before.wood && state.resources.food === before.food &&
      state.resources.gold === before.gold && state.resources.stone === before.stone,
      "ارباب آغازین باید رایگان باشد");
    must(state.victorious === false, "بازی تازه نباید پیروزی داشته باشد");
    return `${L.x},${L.r}`;
  };
  const a = run(), b = run();
  must(a === b, `جای ارباب باید قطعی باشد (${a} در برابر ${b})`);
  return { name: "ارباب آغازین", pass: true, detail: `یکتا + رایگان + قطعی (${a})` };
}

// یکتایی: دومین spawnLord و هر استخدامی UNIQUE/INVALID می‌خورند.
function t_lord_unique() {
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد باید ساخته شود");
  must(spawnLord(state, terrain, W, H).ok, "ارباب اول باید برخیزد");
  const again = spawnLord(state, terrain, W, H);
  must(!again.ok && again.reason === "UNIQUE", `ارباب دوم باید UNIQUE باشد، شد ${again.reason}`);
  const before = { ...state.resources };
  const v = validateHire(state, terrain, W, H, 5, 5, "lord");
  must(!v.ok && v.reason === "INVALID", `استخدام ارباب باید INVALID باشد، شد ${v.reason}`);
  const h = hireUnit(state, terrain, W, H, 5, 5, "lord");
  must(!h.ok, "اجرای استخدام ارباب باید رد شود");
  must(state.resources.food === before.food && state.resources.gold === before.gold,
    "استخدام ردشده نباید منابع کم کند");
  must(state.units.filter((u) => u.type === "lord").length === 1, "هنوز باید یک ارباب باشد");
  return { name: "یکتایی ارباب", pass: true, detail: "تکرار UNIQUE + استخدام INVALID" };
}

// مرگ ارباب = شکست + توقف + رویداد؛ مرگ سرباز عادی اثری ندارد.
function t_lord_death() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  must(placeKeep(state, terrain, W, H).ok, "ستاد باید ساخته شود");
  must(spawnLord(state, terrain, W, H).ok, "ارباب باید برخیزد");
  const L = state.units.find((u) => u.type === "lord");
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const S = state.units.find((u) => u.type === "soldier");
  // شاهد: کشته شدن سرباز دور از ارباب نباید شکست باشد
  spawnUnit(state, "swordsman", S.x, S.r);
  const foe = state.units.find((u) => u.type === "swordsman");
  foe.hp = 1; S.hp = S.maxHp; // سرباز شاهد می‌کشد، نه برعکس
  let t = 0;
  while (state.units.some((u) => u.type === "swordsman") && t < 200) { simC(state, terrain, 1); t++; }
  must(!state.units.some((u) => u.type === "swordsman"), "مهاجم شاهد باید بمیرد");
  must(state.defeated === false, "مرگ سرباز نباید شکست باشد");
  // ضربه کاری: ارباب زخمی + شمشیرزن چسبیده
  L.hp = 6;
  spawnUnit(state, "swordsman", L.x, L.r);
  t = 0;
  while (!state.defeated && t < 200) { simC(state, terrain, 1); t++; }
  must(state.defeated === true, "مرگ ارباب باید شکست باشد");
  must(state.paused === true, "شکست باید بازی را متوقف کند");
  must(state.events.some((e) => e.includes("ارباب کشته شد")), "رویداد مرگ ارباب باید ثبت شود");
  must(state.victorious === false, "شکست نباید پیروزی هم باشد");
  return { name: "مرگ ارباب = شکست", pass: true, detail: `قتل در ${t} تیک + توقف` };
}

// پیروزی: پاک‌سازی موج‌های ۱-۴ اثری ندارد؛ نابودی موج FINAL_WAVE = پیروزی + توقف.
function t_victory() {
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد باید ساخته شود");
  must(spawnLord(state, terrain, W, H).ok, "ارباب باید برخیزد");
  must(FINAL_WAVE === 5, "موج آخر باید ۵ باشد");
  for (let w = 1; w <= FINAL_WAVE; w++) {
    const n = spawnWave(state, terrain, W, H);
    must(n === 2 + w, `موج ${w} باید ${2 + w} دشمن داشته باشد، دارد ${n}`);
    must(state.wave === w, `شمارنده موج باید ${w} باشد`);
    for (const e of state.units.filter((u) => u.side === "enemy")) {
      e.hp = 1; // دشمن زخمی؛ مدافعان کار را تمام می‌کنند
      spawnUnit(state, "soldier", e.x, e.r);
    }
    let t = 0;
    while (state.units.some((u) => u.side === "enemy") && t < 600) { simC(state, terrain, 1); t++; }
    must(!state.units.some((u) => u.side === "enemy"), `موج ${w} باید پاک شود`);
    if (w < FINAL_WAVE) {
      must(state.victorious === false, `پاک‌سازی موج ${w} نباید پیروزی باشد`);
      must(state.paused === false, `بازی باید تا موج آخر ادامه یابد`);
    }
  }
  must(state.victorious === true, "نابودی موج آخر باید پیروزی باشد");
  must(state.paused === true, "پیروزی باید بازی را متوقف کند");
  must(state.events.some((e) => e.includes("آخرین موج")), "رویداد پیروزی باید ثبت شود");
  must(state.defeated === false, "پیروزی نباید شکست هم باشد");
  return { name: "پیروزی موج آخر", pass: true, detail: `موج ۵ پاک + توقف` };
}

// ذخیره: حفظ ارباب (جان/جا) و پرچم پیروزی + تحمل قدیمی + رد دست‌کاری.
function t_lord_save() {
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد باید ساخته شود");
  must(spawnLord(state, terrain, W, H).ok, "ارباب باید برخیزد");
  const L = state.units.find((u) => u.type === "lord");
  L.hp = 100; // زخمی
  state.victorious = true;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.victorious === true, "پرچم پیروزی باید حفظ شود");
  const ll = loaded.units.filter((u) => u.type === "lord");
  must(ll.length === 1 && ll[0].hp === 100 && ll[0].x === L.x && ll[0].r === L.r,
    "ارباب باید با جان و جای یکسان بماند");
  // تحمل ذخیره قدیمی: بدون victorious
  const legacy = JSON.parse(serializeJSON(state));
  delete legacy.victorious;
  const old = deserialize(legacy);
  must(old.victorious === false, "victorious غایب باید false شود");
  // رد دست‌کاری
  const bad = JSON.parse(serializeJSON(state));
  bad.victorious = "yes";
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "victorious غیربولی باید رد شود");
  return { name: "ذخیره ارباب و پیروزی", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}

// --- ستاد یکتا و شکست (0.19.0) ---

// جای‌گیری آغازین: ۴×۴ چمن نزدیک مرکز، رایگان، +۸ مسکن، بدون شکست.
function t_keep_start() {
  const { W, H, terrain, state } = fresh();
  const before = { ...state.resources };
  const res = placeKeep(state, terrain, W, H);
  must(res.ok && res.building, "ستاد باید ساخته شود");
  const keeps = state.buildings.filter((b) => b.type === "keep");
  must(keeps.length === 1, "دقیقاً یک ستاد باید باشد");
  const k = keeps[0];
  must(k.w === 4 && k.h === 4, "ستاد باید ۴×۴ باشد");
  must(k.hp === CONFIG.BUILDINGS.keep.hp, "جان ستاد باید کامل باشد");
  must(state.resources.wood === before.wood && state.resources.food === before.food &&
    state.resources.gold === before.gold && state.resources.stone === before.stone,
    "ستاد آغازین باید رایگان باشد");
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      must(terrain[(k.r + j) * W + (k.c + i)] === T_GRASS,
        `زیر ستاد (${k.c + i},${k.r + j}) باید چمن باشد`);
      must(state.occ[(k.r + j) * W + (k.c + i)] === 1, "ردپای ستاد باید اشغال باشد");
    }
  }
  must(housingCap(state) === 4 + KEEP_HOUSING, `سقف مسکن باید ${4 + KEEP_HOUSING} باشد`);
  must(state.defeated === false, "بازی تازه نباید شکست داشته باشد");
  return { name: "ستاد آغازین", pass: true, detail: `(${k.c},${k.r}) رایگان + سقف ${4 + KEEP_HOUSING}` };
}

// یکتایی: ستاد دوم و ساخت دستی روی زمین آزاد هم UNIQUE می‌خورند.
function t_keep_unique() {
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد اول باید ساخته شود");
  const again = placeKeep(state, terrain, W, H);
  must(!again.ok && again.reason === "UNIQUE", `ستاد دوم باید UNIQUE باشد، شد ${again.reason}`);
  let spot = null;
  outer:
  for (let r = 0; r <= H - 4; r++) {
    for (let c = 0; c <= W - 4; c++) {
      let free = true;
      for (let j = 0; j < 4 && free; j++) {
        for (let i = 0; i < 4 && free; i++) {
          if (terrain[(r + j) * W + (c + i)] !== T_GRASS || state.occ[(r + j) * W + (c + i)] === 1) free = false;
        }
      }
      if (free) { spot = [c, r]; break outer; }
    }
  }
  must(spot, "باید جای ۴×۴ آزاد دیگری روی نقشه باشد");
  const v = validate(state, terrain, W, H, spot[0], spot[1], CONFIG.BUILDINGS.keep);
  must(!v.ok && v.reason === "UNIQUE", `زمین آزاد هم باید UNIQUE بدهد، داد ${v.reason}`);
  return { name: "یکتایی ستاد", pass: true, detail: "تکرار + زمین آزاد = UNIQUE" };
}

// شکست: ویرانی کلبه اثر ندارد، سقوط ستاد = defeated + توقف + رویداد.
function t_keep_defeat() {
  const { W, H, terrain, state } = fresh();
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه شاهد باید ساخته شود");
  spawnUnit(state, "swordsman", 1.5, 3.5); // جنوب کلبه، محوطه شروع (چمن)
  let t = 0;
  while (state.buildings.some((b) => b.type === "hut") && t < 600) { simC(state, terrain, 1); t++; }
  must(!state.buildings.some((b) => b.type === "hut"), "کلبه باید ویران شود");
  must(state.defeated === false, "ویرانی کلبه نباید شکست باشد");
  const k = placeKeep(state, terrain, W, H);
  must(k.ok, "ستاد باید ساخته شود");
  const keep = k.building;
  const cx = keep.c + keep.w / 2, cr = keep.r + keep.h / 2;
  const ring = [];
  for (let dr = -1; dr <= keep.h; dr++) {
    for (let dc = -1; dc <= keep.w; dc++) {
      if (dr !== -1 && dr !== keep.h && dc !== -1 && dc !== keep.w) continue;
      const c = keep.c + dc, r = keep.r + dr;
      if (c < 0 || r < 0 || c >= W || r >= H) continue;
      if (state.occ[r * W + c] === 1) continue;
      if (terrain[r * W + c] !== T_GRASS) continue;
      ring.push([c, r, Math.hypot(c + 0.5 - cx, r + 0.5 - cr)]);
    }
  }
  ring.sort((a, b) => a[2] - b[2]); // نزدیک‌ترین همسایه‌ها اول (متعامد = در برد)
  must(ring.length >= 3, "ستاد باید دست‌کم ۳ همسایه چمن آزاد داشته باشد");
  for (const [c, r] of ring.slice(0, 3)) spawnUnit(state, "swordsman", c + 0.5, r + 0.5);
  t = 0;
  while (state.buildings.some((b) => b.type === "keep") && t < 1500) { simC(state, terrain, 1); t++; }
  must(!state.buildings.some((b) => b.type === "keep"), "ستاد باید ویران شود");
  must(state.defeated === true, "سقوط ستاد باید شکست باشد");
  must(state.paused === true, "شکست باید بازی را متوقف کند");
  must(state.events.some((e) => e.includes("ستاد سقوط کرد")), "رویداد سقوط باید ثبت شود");
  return { name: "سقوط ستاد = شکست", pass: true, detail: `ویرانی در ${t} تیک + توقف` };
}

// ذخیره: حفظ ستاد و پرچم شکست + تحمل ذخیره قدیمی + رد دست‌کاری.
function t_keep_save() {
  const { W, H, terrain, state } = fresh();
  const k = placeKeep(state, terrain, W, H);
  must(k.ok, "ستاد باید ساخته شود");
  k.building.hp -= 10; // آسیب‌دیده
  state.defeated = true;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.defeated === true, "پرچم شکست باید حفظ شود");
  const lk = loaded.buildings.find((b) => b.type === "keep");
  must(!!lk && lk.hp === k.building.hp && lk.c === k.building.c && lk.r === k.building.r,
    "ستاد باید با جان و جای یکسان بماند");
  // تحمل ذخیره قدیمی: بدون defeated و بدون ستاد
  const legacy = JSON.parse(serializeJSON(state));
  delete legacy.defeated;
  legacy.buildings = legacy.buildings.filter((b) => b.type !== "keep");
  const old = deserialize(legacy);
  must(old.defeated === false, "defeated غایب باید false شود");
  must(!old.buildings.some((b) => b.type === "keep"), "ذخیره بدون ستاد باید بارگذاری شود");
  // رد دست‌کاری
  const bad = JSON.parse(serializeJSON(state));
  bad.defeated = "yes";
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "defeated غیربولی باید رد شود");
  return { name: "ذخیره ستاد و شکست", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}

// --- دروازه (0.10.0): لنگر اتصال مثل دیوار + هزینه ---

function t_const_gate_anchor() {
  const { W, H, terrain, state } = fresh();
  const gate = CONFIG.BUILDINGS.gate;
  let v = validate(state, terrain, W, H, 5, 5, gate);
  must(!v.ok && v.reason === "ANCHOR", `دروازه تنها باید ANCHOR باشد، شد ${v.reason}`);
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut); // ۱۰ چوب
  const r = tryPlace(state, terrain, W, H, 3, 1, gate); // چسبیده به (۲،۱)
  must(r.ok && r.building.hp === 80, "HP اولیه دروازه باید ۸۰ باشد");
  must(state.resources.wood === 106, `چوب باید ۱۰۶ باشد، هست ${state.resources.wood}`);
  return { name: "لنگر دروازه", pass: true, detail: "ANCHOR تنها + کسر ۴ چوب" };
}

// --- دیوار سنگی (0.9.0): قانون اتصال، انسداد مسیر، محاصره ---

function t_const_wall_anchor() {
  const { W, H, terrain, state } = fresh();
  const wall = CONFIG.BUILDINGS.wall, hut = CONFIG.BUILDINGS.hut;
  let v = validate(state, terrain, W, H, 5, 5, wall);
  must(!v.ok && v.reason === "ANCHOR", `دیوار تنها باید ANCHOR باشد، شد ${v.reason}`);
  tryPlace(state, terrain, W, H, 1, 1, hut); // ردپا (۱-۲،۱-۲)، ۱۰ چوب
  v = validate(state, terrain, W, H, 4, 4, wall); // فقط همسایگی قطری با کلبه
  must(!v.ok && v.reason === "ANCHOR", "همسایگی قطری لنگر نیست");
  v = validate(state, terrain, W, H, 3, 1, wall); // چسبیده به (۲،۱)
  must(v.ok, "دیوار چسبیده به کلبه باید معتبر باشد");
  const r = tryPlace(state, terrain, W, H, 3, 1, wall);
  must(r.ok && r.building.hp === 60, "HP اولیه دیوار باید ۶۰ باشد");
  must(state.resources.wood === 108, `چوب باید ۱۰۸ باشد، هست ${state.resources.wood}`);
  return { name: "اتصال دیوار", pass: true, detail: "ANCHOR تنها/قطری + کسر ۲ چوب" };
}

function t_const_wall_chain() {
  const { W, H, terrain, state } = fresh();
  const wall = CONFIG.BUILDINGS.wall;
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  tryPlace(state, terrain, W, H, 3, 1, wall);
  const r = tryPlace(state, terrain, W, H, 4, 1, wall); // زنجیره به دیوار
  must(r.ok, "دیوار چسبیده به دیوار باید معتبر باشد");
  const v = validate(state, terrain, W, H, 3, 1, wall);
  must(!v.ok && v.reason === "OCCUPIED", `اشغال بر اتصال مقدم است، شد ${v.reason}`);
  const w = validate(state, terrain, W, H, 6, 6, wall);
  must(!w.ok && w.reason === "ANCHOR", "دیوار دورافتاده باید ANCHOR باشد");
  return { name: "زنجیره دیوار", pass: true, detail: "دیوار→دیوار + اولویت OCCUPIED" };
}

function t_const_wall_blocks() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  tryPlace(state, terrain, W, H, 3, 1, CONFIG.BUILDINGS.wall);
  must(!isCellWalkable(terrain, state.occ, W, H, 3, 1), "خانه دیوار نباید walkable باشد");
  must(isCellWalkable(terrain, state.occ, W, H, 4, 1), "خانه آزاد باید walkable بماند");
  return { name: "انسداد مسیر دیوار", pass: true, detail: "occ ← مسدود" };
}

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
  // نام: فارسی/لاتین/رقم قبول، خالی/طولانی/ایموجی/تگ رد؛ لوگو: ۰..۱۱ قبول.
  must(validProfileName("شیرشاه") === "شیرشاه", "نام فارسی باید قبول شود");
  must(validProfileName("  Ali-92_ro ") === "Ali-92_ro", "نام لاتین با trim باید قبول شود");
  must(validProfileName("") === null, "نام خالی باید رد شود");
  must(validProfileName("   ") === null, "فاصله‌خالی باید رد شود");
  must(validProfileName("1234567890123") === null, "نام ۱۳ نویسه‌ای باید رد شود");
  must(validProfileName("Ali😀") === null, "ایموجی در نام باید رد شود");
  must(validProfileName("<b>hi</b>") === null, "تگ در نام باید رد شود");
  must(validLogo(0) === 0 && validLogo(11) === 11, "لوگوی ۰ و ۱۱ باید قبول شوند");
  must(validLogo(-1) === null && validLogo(12) === null && validLogo(1.5) === null, "لوگوی بیرون بازه باید رد شود");
  must(PROFILE_LOGOS.length === 12, "۱۲ لوگو باید باشد");
  const badge = profileBadgeHTML({ name: "<img>", logo: 3 });
  must(badge.indexOf("<img>") < 0, "تگ نباید خام در نشان بیاید");
  must(badge.indexOf("بی‌نام") >= 0, "نام نامعتبر باید به پیش‌فرض برگردد");
  must(badge.indexOf(PROFILE_LOGOS[3]) >= 0, "نشان باید لوگو را داشته باشد");
  const badge2 = profileBadgeHTML({ name: "شیرشاه", logo: 0 });
  must(badge2.indexOf("شیرشاه") >= 0 && badge2.indexOf(PROFILE_LOGOS[0]) >= 0, "نشان معتبر باید نام و لوگو را داشته باشد");
  return { name: "پروفایل", pass: true, detail: "نام + لوگو + escape" };
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
  must(priv.indexOf("🦁") < 0, "لوگوی نامعتبر نباید ایموجی بدهد");
  return { name: "ردیف فهرست اتاق", pass: true, detail: "عمومی/خصوصی + escape" };
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
  } finally {
    cv.remove();
  }
  return { name: "رفت‌وبرگشت مختصات", pass: true, detail: "۵ خانه دقیق" };
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

// --- خط دیوار (0.47.0 — #۲۰ از FEATURES): سوپرکاور خالص + دروازه نوع + سقف + صف ---

function t_wallline_horiz() {
  const line = wallLineTiles(2, 3, 6, 3);
  const key = line.map((t) => t.x + "," + t.y).join(" ");
  must(key === "2,3 3,3 4,3 5,3 6,3", `خط افقی باید ۵ تایل پیوسته باشد، شد ${key}`);
  const rev = wallLineTiles(6, 3, 2, 3).map((t) => t.x + "," + t.y).join(" ");
  must(rev === "6,3 5,3 4,3 3,3 2,3", `ترتیب باید جهت درگ باشد، شد ${rev}`);
  return { name: "خط افقی دیوار", pass: true, detail: key };
}

function t_wallline_diag() {
  const line = wallLineTiles(0, 0, 4, 4);
  must(line.length === 5, `قطر باید ۵ تایل باشد، شد ${line.length}`);
  must(line[0].x === 0 && line[0].y === 0, "شروع باید سر درگ باشد");
  must(line[4].x === 4 && line[4].y === 4, "پایان باید ته درگ باشد");
  for (let i = 1; i < line.length; i++) {
    const dx = Math.abs(line[i].x - line[i - 1].x), dy = Math.abs(line[i].y - line[i - 1].y);
    must(dx <= 1 && dy <= 1 && (dx + dy) > 0, `گام ${i} باید ۸-پیوسته باشد`);
  }
  const one = wallLineTiles(7, 7, 7, 7);
  must(one.length === 1 && one[0].x === 7 && one[0].y === 7, "تک‌نقطه = همان یک تایل");
  return { name: "قطر پیوسته دیوار", pass: true, detail: "۵ تایل ۸-پیوسته + تک‌نقطه" };
}

function t_wallline_cap_gate() {
  must(isLineDragType("wall") === true, "دیوار باید مال خط باشد");
  must(!isLineDragType("tower") && !isLineDragType("gate") && !isLineDragType(null), "برج/دروازه/خالی مال خط نیستند");
  must(WALL_LINE_MAX === 32, "سقف ۳۲ است");
  const long = wallLineTiles(0, 5, 200, 5);
  must(long.length === 32, `خط بلند باید در ۳۲ ببرد، شد ${long.length}`);
  must(long[0].x === 0 && long[31].x === 31, "برش باید از سر درگ باشد");
  return { name: "سقف و دروازه خط", pass: true, detail: "۳۲ + فقط wall" };
}

function t_wallline_queue() {
  // خط ۶تایی چسبیده به کلبه: هر تایل یک place جدا از صف → ۶ دیوار زنجیره‌ای
  // (هر تایل روی قبلی لنگر می‌گیرد؛ همان معنای ۶ تک‌کلیک).
  const { W, H, terrain, state } = fresh();
  const hut = tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.hut);
  must(hut.ok, `کلبه لنگر باید ساخته شود، شد ${hut.reason}`);
  const tiles = wallLineTiles(3, 1, 3, 6);
  must(tiles.length === 6, `خط باید ۶ تایل باشد، شد ${tiles.length}`);
  const q = createQueue();
  const p0 = state.placed;
  for (const t of tiles) {
    must(enqueueCmd(q, { kind: "place", type: "wall", c: t.x, r: t.y }, state.tick).ok, "صف تایل خط");
  }
  stepSim(state, terrain, 8, q);
  must(queueLen(q) === 0, "صف خط باید خالی شود");
  const walls = state.buildings.filter((b) => b.type === "wall" && !b.destroyed);
  must(walls.length === 6, `باید ۶ دیوار ساخته شود، شد ${walls.length}`);
  must(state.placed === p0 + 6, `صف خط باید ۶+ به شمارنده بدهد (کلبه مستقیم شمرده نمی‌شود)، شد ${state.placed - p0}`);
  return { name: "صف خط دیوار", pass: true, detail: "۶ دیوار زنجیره‌ای از صف" };
}

function t_wallline_preview() {
  // رسم قاب با خط نباید خطا بدهد (گوست تکی خاموش، خط رنگی روشن).
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.hut);
  const cv = document.createElement("canvas");
  document.body.appendChild(cv);
  try {
    const R = createRenderer(cv);
    R.resize();
    R.fit();
    const line = wallLineTiles(3, 1, 3, 6).map((t) => ({ c: t.x, r: t.y, ok: true }));
    R.draw(state, terrain, null, CONFIG.BUILDINGS.wall, [], line);
    const bad = wallLineTiles(3, 1, 3, 6).map((t) => ({ c: t.x, r: t.y, ok: false }));
    R.draw(state, terrain, null, CONFIG.BUILDINGS.wall, [], bad);
  } finally {
    cv.remove();
  }
  return { name: "پیش‌نمایش خط", pass: true, detail: "رسم قاب سبز/قرمز" };
}

function wallCases() {
  return [t_wallline_horiz, t_wallline_diag, t_wallline_cap_gate, t_wallline_queue, t_wallline_preview];
}

// --- صدای سنتزشده (0.48.0 — #۲۵ از FEATURES): diff خالص + ولوم + مدیر با ctx قلابی ---

function sndSnap(buildings, units, flags) {
  return {
    buildings: buildings || [], units: units || [],
    victorious: !!(flags && flags.victorious), defeated: !!(flags && flags.defeated),
  };
}
function sndBld(id, extra) {
  return Object.assign({ id, type: "hut", buildLeft: 0, destroyed: false }, extra || {});
}
function sndUnit(id, extra) {
  return Object.assign({ id, cooldown: 0, dead: false, x: 5, r: 5 }, extra || {});
}

function t_sound_diff_bld() {
  const before = sndSnap([], []);
  let ev = diffSoundEvents(before, sndSnap([sndBld(1)], []));
  must(ev.length === 1 && ev[0].kind === "placed", `ساخت باید placed بدهد، شد ${JSON.stringify(ev)}`);
  const half = sndSnap([sndBld(2, { buildLeft: 15 })], []);
  const done = sndSnap([sndBld(2, { buildLeft: 0 })], []);
  ev = diffSoundEvents(half, done);
  must(ev.length === 1 && ev[0].kind === "completed", `اتمام باید completed بدهد، شد ${JSON.stringify(ev)}`);
  ev = diffSoundEvents(done, sndSnap([sndBld(2, { destroyed: true })], []));
  must(ev.length === 1 && ev[0].kind === "razed", `ویرانی باید razed بدهد، شد ${JSON.stringify(ev)}`);
  ev = diffSoundEvents(done, sndSnap([], []));
  must(ev.length === 1 && ev[0].kind === "razed", "حذف هم razed است");
  must(diffSoundEvents(before, before).length === 0, "سکون باید بی‌صدا باشد");
  return { name: "diff ساختمان صدا", pass: true, detail: "placed/completed/razed + سکون" };
}

function t_sound_diff_unit() {
  const calm = sndSnap([], [sndUnit(1)]);
  const struck = sndSnap([], [sndUnit(1, { cooldown: 10 })]);
  let ev = diffSoundEvents(calm, struck);
  must(ev.length === 1 && ev[0].kind === "strike", `ضربه باید strike بدهد، شد ${JSON.stringify(ev)}`);
  ev = diffSoundEvents(struck, sndSnap([], [sndUnit(1, { dead: true })]));
  must(ev.length === 1 && ev[0].kind === "death", `مرگ باید death بدهد، شد ${JSON.stringify(ev)}`);
  ev = diffSoundEvents(calm, sndSnap([], [sndUnit(1)], { victorious: true }));
  must(ev.some((e) => e.kind === "victory" && e.outcome === "victory"), "پیروزی باید fanfare بدهد");
  ev = diffSoundEvents(calm, sndSnap([], [sndUnit(1)], { defeated: true }));
  must(ev.some((e) => e.kind === "victory" && e.outcome === "defeat"), "شکست باید مرثیه بدهد");
  return { name: "diff یگان و پایان صدا", pass: true, detail: "strike/death/victory/defeat" };
}

function t_sound_cap_walk() {
  const units = [];
  for (let i = 1; i <= 20; i++) units.push(sndUnit(i));
  const ev = diffSoundEvents(sndSnap([], units), sndSnap([], []));
  must(ev.length === MAX_EVENTS_PER_TICK, `سقف باید ${MAX_EVENTS_PER_TICK} باشد، شد ${ev.length}`);
  must(ev[0].kind === "death", "ترتیب باید ترتیب اسنپ‌شات باشد");
  const a = JSON.stringify(diffSoundEvents(sndSnap([], units), sndSnap([], [])));
  must(a === JSON.stringify(diffSoundEvents(sndSnap([], units), sndSnap([], []))), "باید قطعی باشد");
  const w0 = sndSnap([], [sndUnit(1, { x: 5 }), sndUnit(2, { x: 7 })]);
  const w1 = sndSnap([], [sndUnit(1, { x: 6 }), sndUnit(2, { x: 7 })]);
  must(countWalking(w0, w1) === 1, "فقط متحرک شمرده می‌شود");
  must(countWalking(w0, w0) === 0 && countWalking(null, w1) === 0, "سکون/تهی صفر است");
  return { name: "سقف و راهپیمایی صدا", pass: true, detail: `سقف ${MAX_EVENTS_PER_TICK} + walk=1` };
}

function t_sound_snapshot_live() {
  // اسنپ‌شات از وضعیت واقعی: ساختمان/یگان/پرچم‌ها را می‌بیند.
  const { state, terrain, W, H } = fresh();
  tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.hut);
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const snap = soundSnapshot(state);
  must(snap.buildings.length >= 2, `باید ≥۲ ساختمان ببیند، دید ${snap.buildings.length}`);
  must(snap.units.length >= 1, "باید یگان ببیند");
  must(snap.buildings.every((b) => b.id && b.type && (b.buildLeft || 0) >= 0), "فیلدهای ساختمان کامل‌اند");
  must(snap.victorious === false && snap.defeated === false, "پرچم‌های پایان falseاند");
  state.victorious = true;
  must(soundSnapshot(state).victorious === true, "پیروزی در اسنپ‌شات می‌آید");
  state.victorious = false;
  return { name: "اسنپ‌شات زنده صدا", pass: true, detail: "ساختمان/یگان/پرچم" };
}

function stubCtx() {
  const calls = { tones: 0, noises: 0, buffers: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const ctx = {
    state: "running",
    currentTime: 100,
    sampleRate: 44100,
    destination: {},
    resumed: 0,
    resume() { this.resumed += 1; },
    createGain() { return { gain: param(), connect() {} }; },
    createOscillator() {
      calls.tones += 1;
      return { type: "", frequency: param(), connect() {}, start() {}, stop() {} };
    },
    createBuffer(ch, len) {
      calls.buffers += 1;
      return { getChannelData: () => new Float32Array(len) };
    },
    createBufferSource() { return { buffer: null, loop: false, connect() {}, start() {} }; },
    createBiquadFilter() { return { type: "", frequency: param(), connect() {} }; },
  };
  return { ctx, calls };
}

function t_sound_mgr_stub() {
  const { ctx, calls } = stubCtx();
  const mgr = createSoundManager({ ctxFactory: () => ctx });
  must(!mgr.started, "زود شروع نکرده باشد");
  mgr.ack("order"); // پیش از شروع بی‌صدا می‌ریزد
  must(mgr.update(sndSnap([], []), sndSnap([sndBld(1)], [])).length === 0, "پیش از شروع رویداد نیست");
  must(mgr.ensureStarted() && mgr.started, "باید شروع شود");
  const ev = mgr.update(sndSnap([], []), sndSnap([sndBld(1)], []));
  must(ev.length === 1 && ev[0].kind === "placed", "پس از شروع placed می‌آید");
  const fight0 = sndSnap([], [sndUnit(1)]);
  const fight1 = sndSnap([], [sndUnit(1, { cooldown: 10 })]);
  must(mgr.update(fight0, fight1).some((e) => e.kind === "strike"), "باید strike بدهد");
  must(calls.tones > 0, "باید نوسان‌ساز زمان‌بندی شده باشد");
  must(mgr.log.includes("strike"), "لاگ باید strike داشته باشد");
  mgr.ack("order");
  mgr.ack("deny");
  return { name: "مدیر صدا با ctx قلابی", pass: true, detail: "شروع/زمان‌بندی/لاگ" };
}

function t_sound_mgr_nofail() {
  const mgr = createSoundManager({ ctxFactory: () => { throw new Error("no webaudio"); } });
  must(mgr.ensureStarted() === false, "نباید ادعای شروع کند");
  mgr.ack("order");
  must(mgr.update(sndSnap([], [sndUnit(1)]), sndSnap([], [])).length === 0, "بدون ctx رویداد نیست");
  const mgr2 = createSoundManager({ ctxFactory: () => stubCtx().ctx });
  mgr2.setMusic(2);
  mgr2.setSfx(-1);
  must(mgr2.volumes.music === 1 && mgr2.volumes.sfx === 0, "ولوم باید clamp شود");
  const back = loadVolumes();
  must(back.music === 1 && back.sfx === 0, `ماندگاری ولوم: ${JSON.stringify(back)}`);
  mgr2.setMusic(0.6);
  mgr2.setSfx(0.8);
  mgr2.setMuted(false);
  saveVolumes(mgr2.volumes);
  try { localStorage.removeItem(VOL_KEY); } catch (e) {}
  return { name: "خرابی صدا بازی را نمی‌شکند", pass: true, detail: "factory خراب + clamp + persist" };
}

function soundCases() {
  return [t_sound_diff_bld, t_sound_diff_unit, t_sound_cap_walk,
    t_sound_snapshot_live, t_sound_mgr_stub, t_sound_mgr_nofail];
}

// --- ری‌پلی از لاگ فرمان (0.49.0 — #۲۱ از FEATURES): ضبط + بازپخش قطعی + اعتبارسنجی ---

// اجرای نمایشی کاملاً سرتاسری: همه تفاوت‌ها با بازی تازه از فرمان‌های ضبط‌شده
// می‌آیند (حتی سربازخانه و زنجیره آهن برای شمشیر استخدام) تا هش زنده و بازپخش
// قابل مقایسه باشند. یورش ۱۵۰۰ هم در بازه است (determinism نبرد واقعی).
function replayScriptedRun(seed) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const probe = makeTerrain(W, H, seed);
  const occ = new Array(W * H).fill(0);
  const at = {};
  for (const key of ["woodcutter", "farm", "barracks", "ironmine", "armoury"]) {
    const def = CONFIG.BUILDINGS[key];
    const s = siteNear(probe, occ, W, H, 10, 10, def.w, def.h);
    must(s, `جا برای ${key} باید باشد`);
    at[key] = s;
    for (let j = 0; j < def.h; j++) {
      for (let i = 0; i < def.w; i++) occ[(s[1] + j) * W + s[0] + i] = 1;
    }
  }
  const live = newSoloFromSeed(seed);
  const rec = createRecorder(seed);
  const q = createQueue();
  const fed = new Set(); // اندیس فرمان‌های صف‌شده
  const stepTo = (t) => {
    while (live.state.tick < t) {
      for (let k = 0; k < rec.cmds.length; k++) {
        const e = rec.cmds[k];
        if (!fed.has(k) && e.t <= live.state.tick) {
          enqueueCmd(q, e.cmd, live.state.tick);
          fed.add(k);
        }
      }
      stepSim(live.state, live.terrain, 1, q);
    }
  };
  for (const key of ["woodcutter", "farm", "barracks", "ironmine", "armoury"]) {
    recordCmd(rec, 0, { kind: "place", type: key, c: at[key][0], r: at[key][1] });
  }
  recordCmd(rec, 5, { kind: "tax", v: "none" });
  stepTo(400);
  recordCmd(rec, 400, { kind: "hire", type: "soldier", c: 5, r: 5 });
  recordCmd(rec, 400, { kind: "hire", type: "soldier", c: 6, r: 5 });
  stepTo(510); // سفارش‌ها در تیک ۴۰۱ صف می‌شوند؛ تحویل ترتیبی پس از ۵۰+۵۰ تیک آموزش (0.65.0)
  const soldiers = live.state.units.filter((u) => u.type === "soldier" && !u.dead);
  must(soldiers.length === 2, `باید ۲ سرباز استخدام شده باشد، شد ${soldiers.length}`);
  recordCmd(rec, 510, { kind: "order", orderKind: "move", ids: soldiers.map((u) => u.id), c: 9, r: 5 });
  stepTo(1600); // یورش ۱۵۰۰ + نبرد واقعی
  must(queueLen(q) === 0, "صف باید خالی باشد");
  return { hash: stateHash(live.state), rec };
}

function t_replay_roundtrip() {
  const { hash, rec } = replayScriptedRun(CONFIG.MAP_SEED);
  const log = { v: REPLAY_V, seed: rec.seed, cmds: rec.cmds, ticks: 1600 };
  const r = runReplay(log, 1600);
  must(r.tick === 1600, `بازپخش باید به تیک ۱۶۰۰ برسد، رسید ${r.tick}`);
  must(r.hash === hash, `هش بازپخش باید با اجرای زنده یکسان باشد`);
  return { name: "بازپخش یکسان", pass: true, detail: r.hash };
}

function t_replay_determinism() {
  const { rec } = replayScriptedRun(777);
  const log = { v: REPLAY_V, seed: rec.seed, cmds: rec.cmds, ticks: 1600 };
  const a = runReplay(log, 1600).hash;
  const b = runReplay(log, 1600).hash;
  must(a === b, "دو بازپخش باید یکسان باشند");
  const c = runReplay({ v: REPLAY_V, seed: 778, cmds: rec.cmds, ticks: 1600 }, 1600).hash;
  must(c !== a, "سید متفاوت باید هش متفاوت بدهد");
  return { name: "قطعیت بازپخش", pass: true, detail: a };
}

function t_replay_tamper() {
  const { rec } = replayScriptedRun(CONFIG.MAP_SEED);
  const base = runReplay({ v: REPLAY_V, seed: rec.seed, cmds: rec.cmds, ticks: 1600 }, 1600).hash;
  const tampered = rec.cmds.map((e) => ({ t: e.t, cmd: { ...e.cmd } }));
  tampered[0] = { t: 0, cmd: { kind: "place", type: "quarry", c: tampered[0].cmd.c, r: tampered[0].cmd.r } };
  const bad = runReplay({ v: REPLAY_V, seed: rec.seed, cmds: tampered, ticks: 1600 }, 1600).hash;
  must(bad !== base, "دست‌کاری فرمان باید هش را عوض کند (تأیید می‌گیرد)");
  return { name: "حساسیت تأیید", pass: true, detail: "هش متفاوت شد" };
}

function t_replay_validate() {
  const good = { v: REPLAY_V, seed: 123, cmds: [{ t: 0, cmd: { kind: "tax", v: "none" } }], ticks: 10 };
  must(validateReplayLog(good).ok, "لاگ سالم باید قبول شود");
  const rt = JSON.parse(JSON.stringify(good));
  must(validateReplayLog(rt).ok, "رفت‌وبرگشت JSON باید سالم بماند");
  const bads = [
    null, 42, "x",
    { v: 999, seed: 1, cmds: [] },
    { v: REPLAY_V, seed: -1, cmds: [] },
    { v: REPLAY_V, seed: 1, cmds: "no" },
    { v: REPLAY_V, seed: 1, cmds: [{ t: -1, cmd: { kind: "tax" } }] },
    { v: REPLAY_V, seed: 1, cmds: [{ t: 0, cmd: { kind: 42 } }] },
    { v: REPLAY_V, seed: 1, cmds: [{ t: 0 }] },
    { v: REPLAY_V, seed: 1, diff: "x", cmds: [] },
    { v: REPLAY_V, seed: 1, pers: "x", cmds: [] },
    { v: REPLAY_V, seed: 1, map: { name: "x", patches: [[0, 9]] }, cmds: [] },
  ];
  for (const b of bads) {
    must(!validateReplayLog(b).ok, `لاگ خراب باید رد شود: ${JSON.stringify(b)}`);
  }
  let threw = false;
  try { runReplay({ v: 999, seed: 1, cmds: [] }, 10); } catch (e) { threw = true; }
  must(threw, "بازپخش لاگ خراب باید throw بدهد");
  return { name: "اعتبارسنجی لاگ", pass: true, detail: `${bads.length} رد + JSON` };
}

function t_replay_empty() {
  const log = { v: REPLAY_V, seed: CONFIG.MAP_SEED, cmds: [], ticks: 100 };
  const a = runReplay(log, 100).hash;
  const b = runReplay(log, 100).hash;
  must(a === b, "لاگ خالی باید قطعی باشد");
  must(createRecorder(0).seed === CONFIG.MAP_SEED, "سید صفر = پیش‌فرض");
  const rec = createRecorder(55);
  for (let i = 0; i < REPLAY_CMD_CAP + 10; i++) recordCmd(rec, i, { kind: "tax", v: "none" });
  must(rec.cmds.length === REPLAY_CMD_CAP, `سقف ضبط باید ${REPLAY_CMD_CAP} باشد، شد ${rec.cmds.length}`);
  return { name: "لاگ خالی و سقف", pass: true, detail: `سقف ${REPLAY_CMD_CAP}` };
}

// --- ژست‌های لمسی (0.53.0 — #۲۳ از FEATURES) ---
function gestureCases() {
  return [t_pinch_zoom, t_pinch_dist_mid, t_long_press, t_middle_pan];
}

// زوم از نسبت فاصله‌ها + سقف [۰٫۳، ۳] (همان چرخ موس) + نگهبان d0 نامعتبر.
function t_pinch_zoom() {
  must(pinchZoom(1, 100, 200) === 2, "فاصله دوبرابر = زوم دوبرابر");
  must(pinchZoom(1, 200, 100) === 0.5, "فاصله نصف = زوم نصف");
  must(pinchZoom(2, 100, 200) === PINCH_ZOOM_MAX, "سقف بالا ۳");
  must(pinchZoom(0.4, 100, 50) === PINCH_ZOOM_MIN, "سقف پایین ۰٫۳");
  must(pinchZoom(1.5, 0, 200) === 1.5, "d0 صفر = بدون تغییر");
  must(pinchZoom(1.5, -5, 200) === 1.5, "d0 منفی = بدون تغییر");
  must(pinchZoom(1, 100, 100) === 1, "فاصله ثابت = زوم ثابت");
  return { name: "زوم پینچ", pass: true, detail: "نسبت + سقف ۰٫۳/۳ + نگهبان" };
}

// فاصله ۳-۴-۵ و نقطه میانی.
function t_pinch_dist_mid() {
  must(pinchDist(0, 0, 3, 4) === 5, "فاصله ۳-۴-۵");
  must(pinchDist(7, 7, 7, 7) === 0, "نقطه یکسان = صفر");
  const m = pinchMid(0, 0, 10, 20);
  must(m.x === 5 && m.y === 10, "میانه (۵،۱۰)");
  return { name: "فاصله و مرکز پینچ", pass: true, detail: "۵ + (۵،۱۰)" };
}

// لمس طولانی: مرز ۵۰۰ms + تحمل ۱۰px (مانهتن)؛ مرزها دقیق.
function t_long_press() {
  must(LONG_PRESS_MS === 500 && LONG_PRESS_SLOP === 10, "ثابت‌ها: ۵۰۰ms و ۱۰px");
  must(longPressFired(0, 0, 1000, 0, 0, 1500) === true, "دقیقاً ۵۰۰ms بی‌حرکت = رخ داده");
  must(longPressFired(0, 0, 1000, 0, 0, 1499) === false, "۴۹۹ms = هنوز نه");
  must(longPressFired(0, 0, 1000, 6, 4, 1600) === true, "مانهتن ۱۰ = درون تحمل");
  must(longPressFired(0, 0, 1000, 6, 5, 1600) === false, "مانهتن ۱۱ = بیرون تحمل");
  must(longPressMoved(0, 0, 6, 4) === false, "مانهتن ۱۰ = لغو نیست");
  must(longPressMoved(0, 0, 6, 5) === true, "مانهتن ۱۱ = لغو تایمر");
  return { name: "لمس طولانی", pass: true, detail: "مرز ۵۰۰ms + تحمل ۱۰px" };
}

// درگ وسط = پن با همان ریاضی درگ-پن چپ (0.68.0 — ریزه‌کاری ۴-ب): آفست
// دوربین حفظ می‌شود + آستانه ۶px مشترک هر دو دکمه؛ مرزها دقیق.
function t_middle_pan() {
  must(DRAG_PAN_SLOP === 6, "آستانه پن همان ۶px درگ-پن چپ");
  const p = panForDrag(100, 50, 10, 10, 30, -5);
  must(p.panX === 120 && p.panY === 35, `پن = آفست + جابه‌جایی، شد (${p.panX}،${p.panY})`);
  const q = panForDrag(-7, 3, 0, 0, 0, 0);
  must(q.panX === -7 && q.panY === 3, "بدون حرکت = بدون تغییر پن");
  must(dragMovedFar(0, 0, 3, 3) === false, "مانهتن ۶ = هنوز پن نه");
  must(dragMovedFar(0, 0, 4, 3) === true, "مانهتن ۷ = پن");
  must(dragMovedFar(0, 0, -5, -2) === true, "جهت منفی هم پن");
  return { name: "پن دکمه وسط", pass: true, detail: "ریاضی مشترک + آستانه ۶" };
}

// --- گروه‌های کنترلی (0.59.0 — رتبه ۱ SOURCE-REVIEW) ---
function groupCases() {
  return [t_group_save_recall, t_group_prune, t_group_guards];
}

// ذخیره و فراخوانی: ترتیب حفظ می‌شود، شکاف‌ها مستقل‌اند.
function t_group_save_recall() {
  must(GROUP_SLOTS === 3, "سه شکاف ۱..۳");
  let g = freshGroups();
  g = saveGroup(g, 1, [7, 3, 5]);
  g = saveGroup(g, 2, [9]);
  const units = [3, 5, 7, 9].map((id) => ({ id, dead: false }));
  must(JSON.stringify(recallGroup(g, 1, units)) === "[7,3,5]", "فراخوانی ۱ با ترتیب ذخیره");
  must(JSON.stringify(recallGroup(g, 2, units)) === "[9]", "فراخوانی ۲ مستقل است");
  must(recallGroup(g, 3, units).length === 0, "شکاف خالی = []");
  return { name: "ذخیره و فراخوانی گروه", pass: true, detail: "ترتیب + استقلال شکاف‌ها" };
}

// مرده/رفته در فراخوانی ساکت حذف می‌شود؛ ذخیره رونوشت است نه ارجاع.
function t_group_prune() {
  const ids = [1, 2, 3];
  let g = saveGroup(freshGroups(), 1, ids);
  ids.push(4);
  const units = [{ id: 1, dead: false }, { id: 2, dead: true }, { id: 4, dead: false }];
  must(JSON.stringify(recallGroup(g, 1, units)) === "[1]", "فقط زنده ذخیره‌شده (۱)؛ مرده و جدید حذف");
  return { name: "هرس گروه در فراخوانی", pass: true, detail: "۲ مرده + ۴ تازه حذف" };
}

// نگهبان‌ها: شکاف نامعتبر، یگان نامعتبر، ورودی خراب.
function t_group_guards() {
  must(groupIndex(0) === -1 && groupIndex(4) === -1, "شکاف ۰ و ۴ نامعتبر");
  must(groupIndex(2) === 1, "شکاف ۲ = اندیس ۱");
  const g = freshGroups();
  must(saveGroup(g, 9, [1]) === g, "ذخیره در شکاف نامعتبر = نادیده");
  must(recallGroup(g, 0, []).length === 0, "فراخوانی نامعتبر = []");
  must(recallGroup(null, 1, []).length === 0, "شکاف خراب = []");
  const g2 = saveGroup(g, 1, [1, "x", 2.5, null, 3]);
  must(JSON.stringify(g2[0]) === "[1,3]", "فقط شناسه صحیح ذخیره می‌شود");
  return { name: "نگهبان‌های گروه", pass: true, detail: "شکاف/شناسه نامعتبر" };
}

// --- اسکن حقوقی (0.60.0 — رتبه ۲ SOURCE-REVIEW) ---
function legalCases() {
  return [t_legal_scanner, t_legal_content];
}

// اسکنر: هر ۸ شناسه (با حروف بزرگ هم) گرفته می‌شوند؛ موارد مجاز رد می‌شوند.
// توجه: فیکسچرهای مثبت این تست عمداً حاوی شناسه‌ها هستند و از اسکن مستثنایند
// (همان قرارداد legal.js؛ اسکن کامل فضای کاری در VER ایستاست).
function t_legal_scanner() {
  must(BANNED_NAMES.length === 8, "فهرست باید ۸ شناسه باشد");
  must(scanBanned("Made by Firefly Studios Ltd").length === 1, "حروف بزرگ هم گرفته می‌شود");
  must(scanBanned("a STRONGHOLD CRUSADER clone")[0] === "stronghold crusader", "عنوان دقیق");
  must(scanBanned("Stronghold 2 and stronghold 3")[0] === "stronghold 2", "دنباله‌ها");
  must(scanBanned("my stronghold stands").length === 0, "stronghold تنها مجاز است");
  must(scanBanned("crusader swordsman attacks").length === 0, "crusader عام مجاز است");
  must(scanBanned("reference: stronghold-wiki/archer").length === 0, "ارجاع ویکی مجاز است");
  must(scanBanned("built with phaser on perchance").length === 0, "ابزارها مجازند");
  must(scanBanned("").length === 0 && scanBanned(null).length === 0, "ورودی خالی/خراب = []");
  return { name: "اسکنر حقوقی", pass: true, detail: "۸ مثبت + ۵ منفی" };
}

// محتوای واقعی بازی (نام‌ها/توضیحات CONFIG + UNITS) باید پاک باشد.
function t_legal_content() {
  const r = scanContent(CONFIG, UNITS);
  must(r.checked > 30, `باید ده‌ها رشته خوانده شود، شد ${r.checked}`);
  must(r.hits.length === 0, `محتوا باید پاک باشد: ${r.hits.join(",")}`);
  return { name: "پاکی محتوای بازی", pass: true, detail: `${r.checked} رشته، صفر برخورد` };
}

// --- سناریوی ۱۰ دقیقه اول (0.61.0 — تصمیم کاربر ۳-ب) ---
function firstTenCases() {
  return [t_firstten_smoke];
}

// دود سریع (۶۰۰ تیک ×۲): بدون throw، قطعی (دو هش یکسان)، ستاد زنده + ساخت‌وساز.
function t_firstten_smoke() {
  const a = runFirstTenScenario(1337, 600);
  const b = runFirstTenScenario(1337, 600);
  must(a.hash === b.hash, "دو اجرای هم‌سید باید یک هش بدهند");
  must(a.outcome === "open", `در ۶۰۰ تیک نباید پایان باشد، شد ${a.outcome}`);
  must(a.playerBuildings >= 2, `ستاد + دست‌کم یک بنا، شد ${a.playerBuildings}`);
  must(a.ticks === 600 && b.ticks === 600, "شمار تیک‌ها");
  return { name: "دود ۱۰ دقیقه اول", pass: true, detail: `هش ${a.hash.slice(0, 12)}… + ${a.playerBuildings} بنا` };
}

// --- اسکیمای داده (0.54.0 — #۱۳ از FEATURES) ---
function schemaCases() {
  return [t_schema_valid, t_schema_catches, t_schema_config_guard];
}

// کانفیگ واقعی بازی باید بی‌خطا باشد (همان چیزی که boot می‌بیند).
function t_schema_valid() {
  const errs = validateConfig(CONFIG, UNITS);
  must(errs.length === 0, `اسکیمای واقعی باید پاک باشد: ${errs.slice(0, 3).join(" | ")}`);
  return { name: "اعتبار اسکیمای واقعی", pass: true, detail: `${Object.keys(CONFIG.BUILDINGS).length} بنا + ${Object.keys(UNITS).length} یگان پاک` };
}

// هشت خرابی عمدی در هشت گوشه کاتالوگ‌ها — هر هشت باید با مسیر درست گرفته شوند.
function t_schema_catches() {
  const bad = JSON.parse(JSON.stringify(CONFIG));
  const badU = JSON.parse(JSON.stringify(UNITS));
  bad.BUILDINGS.mill.econ.consumes.nope = 2; // منبع ناموجود در consumes
  bad.BUILDINGS.hut.hp = -5; // hp منفی
  bad.RESOURCES.push({ key: "wood", name: "چوب تکراری" }); // کلید تکراری
  bad.AI.buildList.push("castle"); // ساختمان ناموجود در فهرست AI
  bad.MAPS[1].seed = 1337; // سید تکراری نقشه
  badU.soldier.dmg = 0; // خسارت صفر
  badU.catapult.minRange = 99; // حداقل برد بزرگ‌تر از برد
  bad.MARKET.rates.wood.sell = 99; // فروش گران‌تر از خرید (آربیتراژ)
  const errs = validateConfig(bad, badU);
  must(errs.length >= 8, `دست‌کم ۸ خطا باید گرفته شود، شد ${errs.length}`);
  for (const needle of ["mill", "hut", "RESOURCES", "buildList", "MAPS", "soldier", "catapult", "MARKET"]) {
    must(errs.some((e) => e.includes(needle)), `خطای «${needle}» باید با مسیر باشد`);
  }
  return { name: "گرفتن خطای اسکیما", pass: true, detail: `${errs.length} خطا با مسیر` };
}

// ورودی نامعتبر به validator نباید throw بدهد — خطا برمی‌گرداند.
function t_schema_config_guard() {
  must(validateConfig(null, UNITS).length > 0, "کانفیگ null باید خطا بدهد");
  must(validateConfig(CONFIG, null).length > 0, "یگان null باید خطا بدهد");
  must(validateConfig({}, {}).length > 0, "آبجکت تهی باید خطا بدهد");
  return { name: "نگهبان ورودی اسکیما", pass: true, detail: "بدون throw" };
}

// --- دسترس‌پذیری دسکتاپ (0.57.0 — #۲۶ از FEATURES) ---
function a11yCases() {
  return [t_a11y_catalog, t_a11y_scale, t_a11y_keys];
}

// ۳ پالت + خاموش: نام فارسی + ماتریس ۲۰تایی با سطرهای حفظ روشنایی (مجموع ≈۱).
function t_a11y_catalog() {
  const ids = Object.keys(A11Y_PALETTES);
  must(ids.length === 4 && ids.includes("off"), `باید ۴ گزینه (خاموش+۳ پالت) باشد، هست ${ids.join(",")}`);
  must(A11Y_PALETTES.off.matrix === null, "خاموش ماتریس ندارد");
  for (const id of ["deutan", "protan", "tritan"]) {
    const p = A11Y_PALETTES[id];
    must(typeof p.name === "string" && p.name.length > 0, `نام ${id}`);
    must(Array.isArray(p.matrix) && p.matrix.length === 20, `ماتریس ۲۰تایی ${id}`);
    for (let r = 0; r < 4; r++) {
      const sum = p.matrix.slice(r * 5, r * 5 + 4).reduce((a, b) => a + b, 0);
      must(Math.abs(sum - 1) < 1e-9, `سطر ${r} پالت ${id} باید مجموع ۱ داشته باشد، شد ${sum}`);
    }
  }
  must(validPalette("deutan") === "deutan", "پالت معتبر می‌ماند");
  must(validPalette("bogus") === "off", "پالت نامعتبر = خاموش");
  return { name: "کاتالوگ پالت‌ها", pass: true, detail: "۳ ماتریس + خاموش" };
}

// مقیاس: فقط ۱/۱٫۲۵/۱٫۵، بقیه = ۱.
function t_a11y_scale() {
  must(JSON.stringify(A11Y_SCALES) === "[1,1.25,1.5]", "پله‌های مقیاس");
  must(clampScale("1.25") === 1.25, "۱۲۵٪ قبول");
  must(clampScale(1.5) === 1.5, "۱۵۰٪ قبول");
  must(clampScale("2") === 1, "۲۰۰٪ رد = ۱۰۰٪");
  must(clampScale("bogus") === 1, "نامعتبر = ۱۰۰٪");
  return { name: "مقیاس رابط", pass: true, detail: "۱۰۰/۱۲۵/۱۵۰٪" };
}

// کلیدها: پیش‌فرض‌ها + ادغام امن ذخیره (نامعتبر دور ریخته می‌شود).
function t_a11y_keys() {
  must(DEFAULT_KEYS.cancel === "Escape" && DEFAULT_KEYS.pause === "KeyP" && DEFAULT_KEYS.mute === "KeyM", "پیش‌فرض‌ها");
  must(validKeyCode("KeyP") && validKeyCode("Space") && !validKeyCode("x!") && !validKeyCode(""), "شکل e.code");
  const n = normalizeKeys({ pause: "Space", mute: "oops!", cancel: 42 });
  must(n.pause === "Space" && n.mute === "KeyM" && n.cancel === "Escape", "ادغام: خوب می‌ماند، بد دور می‌رود");
  must(JSON.stringify(Object.keys(normalizeKeys(null)).sort()) === JSON.stringify(KEY_ACTIONS.slice().sort()), "کلید تهی = پیش‌فرض کامل");
  return { name: "remap کلیدها", pass: true, detail: "پیش‌فرض + ادغام امن" };
}

// --- سختی‌سنجی (0.58.0 — #۲۷ از FEATURES) ---
function hardeningCases() {
  return [t_fidelity_levels, t_bench_budget, t_regression_hashes,
    t_fuzz_saves, t_fuzz_cmds, t_compat_matrix];
}

// هر سه کیفیت باید بدون خطا یک قاب کامل بکشند + نامعتبر = full.
function t_fidelity_levels() {
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
    for (const f of ["full", "balanced", "lite"]) {
      R.setFidelity(f);
      must(R.getFidelity() === f, `کیفیت باید ${f} شود`);
      R.draw(state, terrain, null, null, []);
    }
    R.setFidelity("bogus");
    must(R.getFidelity() === "full", "نامعتبر = full");
  } finally {
    cv.remove();
  }
  return { name: "کیفیت سه‌وضعیتی", pass: true, detail: "رسم قاب در هر ۳ سطح" };
}

// داور بودجه خالص + دود بنچ واقعی (بودجه گشاد تا گوشی ضعیف قرمز نشود).
function t_bench_budget() {
  must(withinBudget({ ticks: 600, ms: 60 }), "۶۰۰ تیک در ۶۰ms باید در بودجه باشد");
  must(!withinBudget({ ticks: 600, ms: 60000 }), "۶۰۰ تیک در ۶۰ ثانیه باید خارج بودجه باشد");
  must(!withinBudget({ ticks: 0, ms: 0 }), "نمونه تهی نامعتبر است");
  must(BENCH_BUDGET.tickMs === 3 && BENCH_BUDGET.ticksPerSec === 300, "بودجه: ۳ms/تیک و ۳۰۰ تیک/ثانیه");
  const s = benchSim(CONFIG.MAP_SEED, 60);
  must(s.ticks === 60 && s.ms >= 0 && typeof s.hash === "string", "بنچ باید عدد + هش بدهد");
  must(withinBudget(s), `بنچ واقعی باید در بودجه باشد (${s.tickMs.toFixed(3)}ms/تیک)`);
  return { name: "بنچمارک و بودجه", pass: true, detail: `${s.tickMs.toFixed(3)}ms/تیک` };
}

// ۸ سناریو: هش پین‌شده + قطعیت دوباره‌اجرا.
function t_regression_hashes() {
  must(REGRESSIONS.length === 8, `باید ۸ سناریو باشد، هست ${REGRESSIONS.length}`);
  const first = runRegression();
  must(first.length === 8, "هر ۸ باید اجرا شوند");
  for (const r of first) {
    must(EXPECTED_HASHES[r.key] !== undefined, `هش پین‌شده ${r.key} باید ثبت باشد`);
    must(r.hash === EXPECTED_HASHES[r.key], `هش ${r.key} عوض شده: ${r.hash} ≠ ${EXPECTED_HASHES[r.key]}`);
  }
  const second = runRegression();
  for (let i = 0; i < first.length; i++) {
    must(second[i].hash === first[i].hash, `دوباره‌اجرای ${first[i].key} باید یکسان باشد`);
  }
  return { name: "رگرسیون ۸ هش", pass: true, detail: "پین + قطعیت هر ۸" };
}

// ۲۰۰ سند جهش‌یافته سیددار: فقط SaveError، هرگز throw خام.
function t_fuzz_saves() {
  const r = fuzzSaves(200, 1234);
  must(r.ran === 200, "باید ۲۰۰ اجرا شود");
  must(r.unexpected.length === 0, `throw خام نباید باشد: ${r.unexpected.join("; ")}`);
  return { name: "فاز ذخیره", pass: true, detail: `${r.saveErrors} رد تمیز + ${r.passed} تحمل` };
}

// ۳۰۰ فرمان خصمانه: sim نباید throw بدهد (رد/نادیده = درست).
function t_fuzz_cmds() {
  const r = fuzzCmds(300, 5678);
  must(r.ran === 300, "باید ۳۰۰ اجرا شود");
  must(r.simThrow === null, `sim نباید throw بدهد: ${r.simThrow}`);
  return { name: "فاز فرمان", pass: true, detail: `${r.enqueued} صف + ${r.rejected} رد` };
}

// ماتریس سازگاری روی envهای قلابی: کامل/تهی/جزئی + قانون بوت.
function t_compat_matrix() {
  must(COMPAT_ROWS.length === 8, `باید ۸ سطر باشد، هست ${COMPAT_ROWS.length}`);
  const full = {};
  for (const row of COMPAT_ROWS) full[row.key] = true;
  const pf = probeCompat(full);
  must(pf.every((r) => r.ok) && compatBootable(pf), "env کامل = بوت");
  const pe = probeCompat({});
  must(pe.every((r) => !r.ok) && !compatBootable(pe), "env تهی = نبوت");
  const partial = { canvas: true, localStorage: true, audio: true };
  const pp = probeCompat(partial);
  must(compatBootable(pp), "requiredها کافی‌اند = بوت");
  must(!probeCompat({ indexedDB: true }).find((r) => r.key === "canvas").ok, "کلید غایب = false");
  const noOpt = { canvas: true, localStorage: true };
  must(compatBootable(probeCompat(noOpt)), "اختیاری‌ها لازم نیستند");
  must(SUPPORT_LINE.indexOf("Chrome") >= 0 && SUPPORT_LINE.indexOf("Firefox") >= 0, "خط پشتیبانی: Chrome و Firefox");
  must(SUPPORT_LINE.indexOf("Safari") >= 0, "خط پشتیبانی: وضعیت Safari/iOS روشن است");
  return { name: "ماتریس سازگاری", pass: true, detail: "کامل/تهی/جزئی + بوت" };
}

// --- نقشه‌ساز داخل‌بازی (0.51.0 — #۲۲ از FEATURES) ---

function t_mapedit_paint_erase() {
  const W = CONFIG.GRID_W;
  const doc = createMapDoc("آزمون", CONFIG.MAP_SEED);
  const base = baseTerrain(CONFIG.MAP_SEED);
  const idx = 20 * W + 20;
  const other = base[idx] === 1 ? 2 : 1; // حتماً متفاوت از سید
  let r = paintCells(doc, base, 20, 20, 2, other);
  must(r.painted === 4 && !r.capped, `قلم ۲×۲ باید ۴ بنشاند، نشست ${r.painted}`);
  must(patchCount(doc) === 4, "۴ وصله باید باشد");
  r = paintCells(doc, base, 20, 20, 2, other);
  must(r.painted === 0, "نقاشی تکراری نباید وصله تازه بسازد");
  r = paintCells(doc, base, 20, 20, 2, base[idx]); // هم‌سان سید = پاک
  must(r.painted === 4 && patchCount(doc) === 0, "برگشت به تایل سید باید وصله را حذف کند");
  paintCells(doc, base, 20, 20, 1, other);
  r = paintCells(doc, base, 20, 20, 1, null); // پاک‌کن صریح
  must(patchCount(doc) === 0, "پاک‌کن باید وصله را حذف کند");
  return { name: "نقاشی و پاک‌کن", pass: true, detail: "۴/۰/حذف" };
}

function t_mapedit_brush_clip() {
  const doc = createMapDoc("گوشه", 7);
  const base = baseTerrain(7);
  const r = paintCells(doc, base, -2, -2, 4, 1);
  must(!r.capped, "نباید سقف بگیرد");
  // فقط (۰..۱، ۰..۱) در نقشه است — ولی تایل سیدِ آب/سنگ، وصله نمی‌شود
  const W = CONFIG.GRID_W;
  let expect = 0;
  for (let rr = 0; rr <= 1; rr++) {
    for (let cc = 0; cc <= 1; cc++) {
      if (base[rr * W + cc] !== 1) expect++;
    }
  }
  must(r.painted === expect && patchCount(doc) === expect, `برش گوشه باید ${expect} باشد، شد ${r.painted}`);
  must(BRUSHES.includes(32) && BRUSHES[0] === 1, "قلم‌ها ۱ تا ۳۲");
  return { name: "برش قلم در مرز", pass: true, detail: `${expect} خانه` };
}

function t_mapedit_cap() {
  const doc = createMapDoc("پر", 9);
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  for (let i = 0; i < PATCH_CAP; i++) doc.patches[i] = 1;
  void W; void H;
  const base = baseTerrain(9);
  const r = paintCells(doc, base, 40, 40, 1, base[40 * CONFIG.GRID_W + 40] === 1 ? 2 : 1);
  must(r.capped && patchCount(doc) === PATCH_CAP, "پس از سقف نباید وصله تازه نشست");
  return { name: "سقف وصله", pass: true, detail: `سقف ${PATCH_CAP}` };
}

function t_mapedit_apply() {
  const W = CONFIG.GRID_W;
  const base = baseTerrain(CONFIG.MAP_SEED);
  const before = base[10 * W + 10];
  const out = applyPatches(base, [[10 * W + 10, before === 1 ? 2 : 1]]);
  must(base[10 * W + 10] === before, "زمین پایه نباید جهش بخورد");
  must(out[10 * W + 10] !== before, "زمین خروجی باید وصله را داشته باشد");
  const plain = customTerrain(CONFIG.MAP_SEED, null);
  must(plain.length === base.length && plain.every((v, i) => v === base[i]), "بی‌وصله = همان سید");
  return { name: "اعمال خالص وصله", pass: true, detail: "کپی + برابری سید" };
}

function t_mapedit_validate() {
  const good = { v: MAP_V, name: "دشت", seed: 5, patches: [[0, 1], [4095, 2]] };
  must(validateMapDoc(good).ok, "سند سالم باید قبول شود");
  const objForm = { v: MAP_V, name: "دشت", seed: 5, patches: { 3: 1, 4: 2 } };
  must(validateMapDoc(objForm).ok, "فرم نگاشتی باید قبول شود");
  const bads = [
    null, 42, "x", [],
    { v: 999, name: "x", seed: 1, patches: [] },
    { v: MAP_V, name: "  ", seed: 1, patches: [] },
    { v: MAP_V, name: "x", seed: -1, patches: [] },
    { v: MAP_V, name: "x", seed: 1, patches: "no" },
    { v: MAP_V, name: "x", seed: 1, patches: [[-1, 1]] },
    { v: MAP_V, name: "x", seed: 1, patches: [[4096, 1]] },
    { v: MAP_V, name: "x", seed: 1, patches: [[0, 3]] },
    { v: MAP_V, name: "x", seed: 1, patches: [[0]] },
  ];
  for (const b of bads) {
    must(!validateMapDoc(b).ok, `سند خراب باید رد شود: ${JSON.stringify(b)}`);
  }
  const big = { v: MAP_V, name: "x", seed: 1, patches: [] };
  for (let i = 0; i <= PATCH_CAP; i++) big.patches.push([i, 1]);
  must(!validateMapDoc(big).ok, "بیش از سقف باید رد شود");
  return { name: "اعتبارسنجی سند", pass: true, detail: `${bads.length + 1} رد` };
}

function t_mapedit_export_import() {
  const doc = createMapDoc("  دشت   من  ", 77);
  must(doc.name === "دشت من", `نام باید تمیز شود، شد «${doc.name}»`);
  const base = baseTerrain(77);
  paintCells(doc, base, 10, 10, 2, 1);
  paintCells(doc, base, 10, 10, 2, 2); // بازنویسی: آخری می‌برد
  const text = exportMapDoc(doc);
  const r = importMapDoc(text);
  must(r.ok, `رفت‌وبرگشت باید سالم باشد، شد ${r.reason}`);
  must(r.doc.name === doc.name && r.doc.seed === 77, "نام/سید باید بماند");
  must(JSON.stringify(patchesList(r.doc)) === JSON.stringify(patchesList(doc)), "وصله‌ها باید بمانند");
  must(!importMapDoc("{oops").ok, "JSON خراب باید رد شود");
  must(!importMapDoc('{"v":1,"name":"x","seed":1,"patches":[[0,9]]}').ok, "تایل نامعتبر باید رد شود");
  return { name: "خروجی/ورودی", pass: true, detail: `${text.length} نویسه` };
}

function t_mapedit_playable() {
  const ok = validatePlayable(CONFIG.MAP_SEED, null);
  must(ok.ok, `سید خالص باید قابل‌بازی باشد، شد ${ok.reason}`);
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const flood = [];
  for (let i = 0; i < W * H; i++) flood.push([i, 1]); // همه آب
  const bad = validatePlayable(CONFIG.MAP_SEED, flood);
  must(!bad.ok && bad.reason === "KEEP", `سیل کامل باید در ستاد رد شود، شد ${bad.reason}`);
  return { name: "قابل‌بازی‌بودن", pass: true, detail: "سید ✓ / سیل ✗(KEEP)" };
}

function t_mapedit_save_load() {
  const W = CONFIG.GRID_W;
  const base = baseTerrain(CONFIG.MAP_SEED);
  const idx = 30 * W + 30;
  const patches = [[idx, base[idx] === 1 ? 2 : 1]];
  const { state } = newSoloFromSeed(CONFIG.MAP_SEED, "normal", patches, "جزیره");
  must(state.mapName === "جزیره", "نام باید در state بنشیند");
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.mapName === "جزیره", "نام باید در ذخیره بماند");
  must(JSON.stringify(loaded.mapPatches) === JSON.stringify(patches), "وصله‌ها باید در ذخیره بمانند");
  const old = JSON.parse(serializeJSON(state));
  delete old.mapName; delete old.mapPatches;
  const legacy = deserializeJSON(JSON.stringify(old));
  must(legacy.mapName === "" && legacy.mapPatches === null, "ذخیره قدیمی = زمین خالص سیدی");
  const bad = JSON.parse(serializeJSON(state));
  bad.mapPatches = [[0, 7]];
  let threw = false;
  try { deserializeJSON(JSON.stringify(bad)); } catch (e) { threw = true; }
  must(threw, "وصله نامعتبر باید رد شود");
  return { name: "ذخیره نقشه سفارشی", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}

function t_mapedit_replay() {
  const W = CONFIG.GRID_W;
  const base = baseTerrain(913);
  // آب در نقطه‌ای که حتماً چمن سید است (دور از دریاچه/سنگ با جست‌وجو)
  let cell = -1;
  for (let r = 45; r < 60 && cell < 0; r++) {
    for (let c = 45; c < 60 && cell < 0; c++) {
      if (base[r * W + c] === 0) cell = r * W + c;
    }
  }
  must(cell >= 0, "خانه چمن برای وصله باید باشد");
  const map = { name: "تست", patches: [[cell, 1]] };
  const a = runReplay({ v: REPLAY_V, seed: 913, map, cmds: [], ticks: 200 }, 200);
  must(a.terrain[cell] === 1, "زمین بازپخش باید وصله را داشته باشد");
  must(a.state.mapName === "تست", "نام باید در state بازپخش بنشیند");
  const b = runReplay({ v: REPLAY_V, seed: 913, map, cmds: [], ticks: 200 }, 200);
  must(a.hash === b.hash, "بازپخش نقشه سفارشی باید قطعی باشد");
  must(!validateReplayLog({ v: REPLAY_V, seed: 1, map: { name: "", patches: [] }, cmds: [] }).ok,
    "نقشه بی‌نام در لاگ باید رد شود");
  must(!validateReplayLog({ v: REPLAY_V, seed: 1, map: { name: "x", patches: [[0, 5]] }, cmds: [] }).ok,
    "وصله خراب در لاگ باید رد شود");
  return { name: "ری‌پلی نقشه سفارشی", pass: true, detail: "اعمال + قطعیت + رد خراب" };
}

function t_mapedit_slot() {
  const doc = createMapDoc("اسلات", 55);
  const base = baseTerrain(55);
  paintCells(doc, base, 12, 12, 2, 1);
  must(saveCustomSlot(doc), "ذخیره اسلات باید موفق باشد");
  const back = loadCustomSlot();
  must(back && back.name === "اسلات" && back.seed === 55, "اسلات باید برگردد");
  must(JSON.stringify(patchesList(back)) === JSON.stringify(patchesList(doc)), "وصله‌های اسلات باید بمانند");
  try { localStorage.setItem(CUSTOM_KEY, "{خراب"); } catch (e) {}
  must(loadCustomSlot() === null, "اسلات خراب = null");
  try { localStorage.removeItem(CUSTOM_KEY); } catch (e) {}
  must(loadCustomSlot() === null, "اسلات خالی = null");
  return { name: "اسلات محلی", pass: true, detail: "رفت‌وبرگشت + تحمل خرابی" };
}

function mapeditCases() {
  return [t_mapedit_paint_erase, t_mapedit_brush_clip, t_mapedit_cap, t_mapedit_apply,
    t_mapedit_validate, t_mapedit_export_import, t_mapedit_playable,
    t_mapedit_save_load, t_mapedit_replay, t_mapedit_slot, t_named_maps];
}

// --- نقشه‌های نام‌دار (0.52.0 — #۱۸ از FEATURES) ---

function t_named_maps() {
  const maps = CONFIG.MAPS;
  must(Array.isArray(maps) && maps.length === 3, `کاتالوگ باید ۳ نقشه باشد، هست ${maps && maps.length}`);
  const keys = new Set(), seeds = new Set();
  for (const m of maps) {
    must(m && typeof m.key === "string" && m.key, "کلید باید باشد");
    must(typeof m.name === "string" && m.name.trim() && m.name.length <= 24, `نام «${m.name}» باید ۱..۲۴ نویسه باشد`);
    must(Number.isInteger(m.seed) && m.seed >= 1 && m.seed <= 4294967295, `سید «${m.key}» باید معتبر باشد`);
    must(!keys.has(m.key), `کلید تکراری: ${m.key}`);
    must(!seeds.has(m.seed), `سید تکراری: ${m.seed}`);
    keys.add(m.key); seeds.add(m.seed);
  }
  must(namedMapByKey("highlands").seed === 424242, "جست‌وجوی کلید باید کار کند");
  must(namedMapByKey("nope") === null, "کلید ناموجود = null");
  must(mapNameFor(1337) === "دشت آغازین", "نام سید کاتالوگ باید برگردد");
  must(mapNameFor(123456789) === "", "سید ناشناس = بی‌نام");
  const terrains = maps.map((m) => {
    const v = validatePlayable(m.seed, null);
    must(v.ok, `«${m.name}» باید قابل‌بازی باشد، شد ${v.reason}`);
    return baseTerrain(m.seed);
  });
  const diff = (a, b) => {
    let n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
    return n;
  };
  must(diff(terrains[0], terrains[1]) > 0, "دشت و کوهستان باید فرق کنند");
  must(diff(terrains[0], terrains[2]) > 0, "دشت و گذرگاه باید فرق کنند");
  must(diff(terrains[1], terrains[2]) > 0, "کوهستان و گذرگاه باید فرق کنند");
  return { name: "نقشه‌های نام‌دار", pass: true, detail: maps.map((m) => m.name).join(" + ") };
}

function replayCases() {
  return [t_replay_roundtrip, t_replay_determinism, t_replay_tamper, t_replay_validate, t_replay_empty];
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

function sysCases() {
  return [t_hire_reasons, t_terrain_deterministic, t_terrain_seed, t_map_seed_variety, t_map_quadrants_fair, t_profile_name_logo, t_profile_persist, t_mp_password_rules, t_room_row_html, t_wave_deterministic,
    t_render_roundtrip, t_render_flat, t_minimap_dots, t_minimap_click, t_tick_both_systems, t_balance_sources, t_balance_speed_order,
    t_select_toggle, t_select_prune, t_select_group, t_alarm_all, t_alarm_guard_resume,
    t_mission_move, t_mission_reject, t_mission_cancel, t_mission_failed, t_mission_save];
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
  must(TAX.bribe && TAX.bribe.goldPerWorker < 0 && TAX.bribe.pop > 0,
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

// --- نبرد رقابتی (0.24.0) ---

function mpFresh(num) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, CONFIG.MAP_SEED);
  mpClearSpawns(terrain, W, H);
  const state = createState();
  const names = [];
  for (let i = 0; i < num; i++) names.push("P" + (i + 1));
  enableMp(state, num, names);
  for (let s = 0; s < num; s++) {
    const an = MP_SPAWN_ANCHOR[s];
    const r = placeKeepFor(state, terrain, W, H, s, an[0], an[1]);
    must(r.ok, `ستاد بازیکن ${s} باید ساخته شود`);
  }
  for (let s = 0; s < num; s++) must(spawnLord(state, terrain, W, H, s).ok, `ارباب ${s}`);
  return { W, H, terrain, state };
}

function t_mp_spawns() {
  const { state } = mpFresh(2);
  const keeps = state.buildings.filter((b) => b.type === "keep");
  must(keeps.length === 2, "دو ستاد باید باشد");
  must(keeps[0].owner !== keeps[1].owner, "مالک‌ها جدا باشند");
  const d = Math.abs(keeps[0].c - keeps[1].c) + Math.abs(keeps[0].r - keeps[1].r);
  must(d > 30, `ستادها باید دور باشند، فاصله=${d}`);
  const lords = state.units.filter((u) => u.type === "lord");
  must(lords.length === 2 && lords[0].owner !== lords[1].owner, "دو ارباب جدا");
  return { name: "اسپاون رقابتی", pass: true, detail: `فاصله ستادها ${d}` };
}

function t_mp_econ_isolation() {
  const { W, H, terrain, state } = mpFresh(2);
  const w0 = state.mpres[0].resources.wood, w1 = state.mpres[1].resources.wood;
  // کلبه نزدیک ستاد بازیکن ۰ (گوشه بالا-چپ)
  const keep0 = state.buildings.find((b) => b.type === "keep" && b.owner === 0);
  const c = keep0.c, r = Math.min(H - 3, keep0.r + keep0.h + 1);
  const res = tryPlace(state, terrain, W, H, c, r, CONFIG.BUILDINGS.hut, 0);
  must(res.ok, "ساخت بازیکن ۰ باید موفق باشد");
  must(state.mpres[0].resources.wood === w0 - 10, "هزینه فقط از بازیکن ۰");
  must(state.mpres[1].resources.wood === w1, "بازیکن ۱ دست‌نخورده");
  // فاصله/یکتا به‌ازای هر مالک: بازیکن ۱ هم کلبه خودش را می‌سازد
  // (نقطه ثابت نزدیک ستاد ۱ گاهی روی آب/سنگ می‌افتد — جست‌وجوی مارپیچ قطعی)
  const keep1 = state.buildings.find((b) => b.type === "keep" && b.owner === 1);
  let r2 = null;
  for (let rad = 1; rad < 10 && !r2; rad++) {
    for (let dr = -rad; dr <= rad && !r2; dr++) {
      for (let dc = -rad; dc <= rad && !r2; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const cc = keep1.c + dc, rr = keep1.r + dr;
        const v = validate(state, terrain, W, H, cc, rr, CONFIG.BUILDINGS.hut, 1);
        if (v.ok) r2 = tryPlace(state, terrain, W, H, cc, rr, CONFIG.BUILDINGS.hut, 1);
      }
    }
  }
  must(r2 && r2.ok, "بازیکن ۱ هم باید بسازد");
  return { name: "اقتصاد جدا", pass: true, detail: "هزینه/ساخت به‌ازای مالک" };
}

function t_mp_combat_targets() {
  const { terrain, state } = mpFresh(2);
  const a = spawnUnit(state, "soldier", 10.5, 10.5, 0);
  const b = spawnUnit(state, "soldier", 11.5, 10.5, 1);
  simC(state, terrain, 60);
  must(a.hp < 60 && b.hp < 60, `دو سرباز دشمن باید بجنگند a=${a.hp} b=${b.hp}`);
  return { name: "نبرد بازیکنان", pass: true, detail: `a=${a.hp} b=${b.hp}` };
}

function t_mp_hash_deterministic() {
  const mk = () => {
    const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
    const terrain = makeTerrain(W, H, CONFIG.MAP_SEED);
    mpClearSpawns(terrain, W, H);
    const state = createState();
    enableMp(state, 2, ["A", "B"]);
    for (let s = 0; s < 2; s++) {
      const an = MP_SPAWN_ANCHOR[s];
      placeKeepFor(state, terrain, W, H, s, an[0], an[1]);
    }
    for (let s = 0; s < 2; s++) spawnLord(state, terrain, W, H, s);
    for (let s = 0; s < 2; s++) needBarracks(state, terrain, W, H, s);
    // استخدام نزدیک ستاد خودی (جست‌وجوی مارپیچ قطعی — مستقل از اندازه نقشه)
    for (let s = 0; s < 2; s++) {
      const keep = state.buildings.find((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === s);
      must(keep, "ستاد باید باشد");
      let hired = false;
      for (let rad = 1; rad < 12 && !hired; rad++) {
        for (let dr = -rad; dr <= rad && !hired; dr++) {
          for (let dc = -rad; dc <= rad && !hired; dc++) {
            if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
            if (hireUnit(state, terrain, W, H, keep.c + dc, keep.r + dr, "soldier", s).ok) hired = true;
          }
        }
      }
      must(hired, "استخدام نزدیک ستاد " + s + " ممکن نشد");
    }
    for (let i = 0; i < 120; i++) { state.tick++; stepEconomy(state); stepCombat(state, terrain); }
    return stateHash(state);
  };
  const h1 = mk(), h2 = mk();
  must(h1 === h2, `هش دو اجرای یکسان باید برابر باشد ${h1}≠${h2}`);
  return { name: "هش قطعی MP", pass: true, detail: h1 };
}

function t_mp_victory() {
  const { state } = mpFresh(2);
  // حذف بازیکن ۱ (ستاد + ارباب)
  for (const b of state.buildings) if (b.owner === 1) b.destroyed = true;
  state.buildings = state.buildings.filter((b) => !b.destroyed);
  state.units = state.units.filter((u) => u.owner !== 1);
  const w = updateMpAlive(state);
  must(w === 0 && state.mp.over, `برنده باید ۰ باشد، هست ${w}`);
  must(state.mpres[0].alive && !state.mpres[1].alive, "زنده/حذف درست باشد");
  return { name: "برد رقابتی", pass: true, detail: "آخرین بازمانده" };
}

function mpCases() {
  return [t_mp_spawns, t_mp_econ_isolation, t_mp_combat_targets, t_mp_hash_deterministic, t_mp_victory];
}
