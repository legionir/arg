// نقطه ورود برش اول: سیم‌کشی ساعت، ساخت، رندر و پنل‌ها.
import { CONFIG } from "./config.js";
import { makeTerrain } from "./terrain.js";
import { createState } from "./state.js";
import { validate, tryPlace, placeKeep, placeKeepFor, REASON_FA, underConstruction } from "./construction.js";
import { stepEconomy, assignStaff, netPerMinute, popTarget, CAPS, capFor, RATES, HUT_HOUSING, INN, econOf, TAX, RATIONS } from "./economy.js";
import { UNITS, HIRE_FA, validateHire, hireUnit, hasBarracks, spawnWave, spawnLord, orderMove, orderAttackMove, orderRetreat, setStance, setGuard, guardPost, toggleGate, STANCE_FA, ORDER_KIND_FA, cancelOrder, stepCombat, DEMOLISH_FA, demolishBuilding, GARRISON_FA, GARRISON_CAP, canGarrisonType, garrisonUnit, DEPLOY_FA, deployUnit } from "./combat.js";
import { queueHire, cancelTrain, stepTraining, barracksOf, trainTimeOf, TRAIN_FA } from "./train.js";
import { toggleInSet, pruneSet, resolveSet, orderAll, retreatAll, stanceAll, guardAll, alarmAll, boxSelectIds } from "./selection.js";
import { freshGroups, saveGroup, recallGroup } from "./groups.js";
import { enableMp, mpClearSpawns, MP_SPAWN_ANCHOR, INPUT_DELAY, PLAYER_COLORS, stateHash, updateMpAlive } from "./mp.js";
import { initMpLobby, validRoomPassword, roomRowHTML } from "./lobby.js";
import { runAllTests, runIdbTests } from "./tests.js";
import {
  serializeJSON, deserializeJSON, SaveError, SAVE_FA, SLOTS,
  saveSlot, loadSlot, deleteSlot, infoSlot, migrateToIdb,
} from "./persist.js";
import { createClock } from "./clock.js";
import { stepSim, createQueue, enqueueCmd } from "./sim.js";
import { startAI } from "./ai.js";
import { drawMinimap, minimapCell, panForCell } from "./minimap.js";
import { createRenderer } from "./render.js";
import { WALL_LINE_MAX, isLineDragType, wallLineTiles } from "./wallline.js";
import { pinchDist, pinchZoom, LONG_PRESS_MS, LONG_PRESS_SLOP, longPressMoved, dragMovedFar, panForDrag } from "./gestures.js";
import { createSoundManager, soundSnapshot } from "./sound.js";
import { hasMarket, tradeQuote, applyTrade, TRADE_FA } from "./market.js";
import {
  REPLAY_CMD_CAP, createRecorder, recordCmd, validateReplayLog,
  newSoloFromSeed, verifyReplayAsync, saveReplaySlot, loadReplaySlot,
} from "./replay.js";
import {
  MAP_NAME_MAX, PATCH_CAP, TILE_NAMES, BRUSHES, createMapDoc, patchesList, patchCount,
  baseTerrain, applyPatches, customTerrain, paintCells, clearPatches,
  validateMapDoc, normalizeMapDoc, exportMapDoc, importMapDoc,
  validatePlayable, namedMapByKey, mapNameFor, saveCustomSlot, loadCustomSlot,
} from "./mapedit.js";
import { iconSrc } from "./sprites.js";
import { initI18n, t, onLangChange } from "./i18n.js";
import { validateConfig } from "./schema.js";
import {
  A11Y_PALETTES, A11Y_SCALES, KEY_ACTIONS, KEY_ACTION_FA, DEFAULT_KEYS,
  validPalette, clampScale, validKeyCode, normalizeKeys,
} from "./a11y.js";
import { probeCompat, compatBootable, liveEnv, SUPPORT_LINE } from "./compat.js";
import { runBench } from "./bench.js";
import { runFirstTen } from "./firstten.js";
import { runRegression, runScenario, REGRESSIONS, fuzzSaves, fuzzCmds } from "./regression.js";
import { initOnline } from "./online.js";
import { initCloud, validCloudKey, CLOUD_FA, CLOUD_STORE_KEY } from "./cloud.js";
import {
  PROFILE_LOGOS, validProfileName, validLogo,
  loadProfile, saveProfile, profileBadgeHTML,
} from "./profile.js";

function $(id) { return document.getElementById(id); }

function boot() {
  initI18n();
  const canvas = $("board");
  const tickEl = $("tickEl"), statusEl = $("statusEl"), resEl = $("resEl");
  const pauseBtn = $("pauseBtn"), speedBtn = $("speedBtn"), resetBtn = $("resetBtn");
  const placedEl = $("placedEl"), rejectedEl = $("rejectedEl"), fpsEl = $("fpsEl");
  const workersEl = $("workersEl"), testBadge = $("testBadge"), popEl = $("popEl");
  const saveBtn = $("saveBtn"), loadBtn = $("loadBtn"), delBtn = $("delBtn");
  const saveStatus = $("saveStatus");
  const waveBtn = $("waveBtn"), battleEl = $("battleEl"), alarmBtn = $("alarmBtn"), demolishBtn = $("demolishBtn");
  const defeatBanner = $("defeatBanner"), defeatRestartBtn = $("defeatRestartBtn");
  const victoryBanner = $("victoryBanner"), victoryRestartBtn = $("victoryRestartBtn");
  const taxBtns = Array.from(document.querySelectorAll("[data-tax]"));
  const ratBtns = Array.from(document.querySelectorAll("[data-rat]"));
  // لایه آنلاین (0.23.0): افزودنی — قطعی‌اش تک‌نفره را لمس نمی‌کند.
  // نام از پروفایل منو می‌آید (0.27.0).
  const online = initOnline({
    card: $("onlineCard"), count: $("onlineCount"), hall: $("hallEl"),
    nameInput: $("profileNameInput"), toast: $("onlineToast"),
  });

  // ---- پروفایل بازیکن (0.27.0): نام + لوگو، ذخیره محلی، نمایش در اتاق ----
  let profile = loadProfile();
  // ---- اسکیمای داده (0.54.0 — #۱۳ از FEATURES): اعتبارسنجی کاتالوگ‌ها در بوت.
  // CONFIG/UNITS دستی ویرایش می‌شوند و تایپی در آن‌ها (= ساختمان/منبع/قانون
  // ناموجود) قبلاً فقط در رانتایم می‌ترکید؛ حالا همان اول در کنسول + نشان
  // تست دیده می‌شود. غیرکشنده است تا بازی همیشه بالا بیاید.
  {
    const schemaErrors = validateConfig(CONFIG, UNITS);
    if (schemaErrors.length) {
      for (const err of schemaErrors) console.error("[schema] " + err);
      testBadge.hidden = false;
      testBadge.className = "fail";
      testBadge.textContent = `اسکیما: ${faNum(schemaErrors.length)} خطا (کنسول)`;
    }
  }

  // ---- نبرد رقابتی (0.24.0): lockstep سبک، فقط شروع هم‌زمان ----
  let mpSession = null; // {code, slot, num, names}
  // صف فرمان سولو (0.37.0 — هسته قطعی #۱): ورودی UI به‌جای اجرای مستقیم،
  // در تیک بعد از صف تخلیه می‌شود؛ گذراست و با newGame/load دور انداخته می‌شود.
  let cmdQueue = createQueue();
  // ری‌پلی (0.49.0 — #۲۱ از FEATURES): ضبط سید + فرمان‌های سولو. همه ورودی‌های
  // بازیکن از playerCmd می‌گذرند (نه enqueueCmd مستقیم) تا لاگ کامل بماند؛
  // تغذیه تماشا و قلاب تست از enqueueCmd خام استفاده می‌کنند (بدون ضبط مجدد).
  // فقط سولو ضبط می‌شود؛ بازی بارگذاری‌شده لاگ ندارد (تاریخ پیش از load نیست).
  let recLog = null;
  let replayWatch = null; // {cmds, i, upto} یا null = بازی عادی
  // درجه سختی حریف سولو (0.50.0 — #۱۸ از FEATURES): در localStorage می‌ماند و
  // با هر بازی تازه (سید/تصادفی/ری‌استارت) به startAI و ضبط ری‌پلی می‌رسد.
  let soloDiff = "normal";
  try {
    const d = localStorage.getItem("scw.difficulty");
    if (d && CONFIG.AI.difficulties[d]) soloDiff = d;
  } catch (e) {}
  // نقشه نام‌دار سولو (0.52.0 — #۱۸): کلید کاتالوگ یا "custom" (سید دستی).
  let soloMapKey = "custom";
  try {
    const k = localStorage.getItem("scw.map");
    if (k && (k === "custom" || namedMapByKey(k))) soloMapKey = k;
  } catch (e) {}
  // شخصیت حریف سولو (0.56.0 — #۱۸ از FEATURES): کلید پروفایل، در localStorage
  // می‌ماند و با هر بازی تازه به startAI و ضبط ری‌پلی می‌رسد.
  let soloPersonality = CONFIG.AI.defaultPersonality;
  try {
    const p = localStorage.getItem("scw.personality");
    if (p && CONFIG.AI.personalities[p]) soloPersonality = p;
  } catch (e) {}
  // دسترس‌پذیری (0.57.0 — #۲۶ از FEATURES): پالت/مقیاس/کلیدها در localStorage
  // می‌مانند و با applyA11y روی DOM می‌نشینند (sim بی‌خبر است).
  let a11yPalette = "off";
  try { a11yPalette = validPalette(localStorage.getItem("scw.a11y")); } catch (e) {}
  let uiScale = 1;
  try { uiScale = clampScale(localStorage.getItem("scw.uiscale")); } catch (e) {}
  let keyMap = { ...DEFAULT_KEYS };
  try { keyMap = normalizeKeys(JSON.parse(localStorage.getItem("scw.keys"))); } catch (e) {}
  function applyA11y() {
    const board = $("board"), mini = $("minimap"), app = $("app");
    const f = a11yPalette !== "off" ? `url(#a11y-${a11yPalette})` : "";
    if (board) board.style.filter = f;
    if (mini) mini.style.filter = f;
    if (app) app.style.zoom = uiScale === 1 ? "" : String(uiScale);
  }
  // کیفیت رسم (0.58.0 — #۲۷): سه‌وضعیتی با ماندگاری + افت خودکار با fps.
  // اعمال روی renderer در wireMenu است (renderer جلوتر ساخته می‌شود).
  let fidelity = "full";
  try {
    const f = localStorage.getItem("scw.fidelity");
    if (f === "balanced" || f === "lite") fidelity = f;
  } catch (e) {}
  let fidelityAuto = false; // true وقتی افت خودکار پله‌ای کم کرده است
  function applyFidelity(f, auto) {
    fidelity = (f === "balanced" || f === "lite") ? f : "full";
    renderer.setFidelity(fidelity);
    if (!auto) {
      fidelityAuto = false;
      try { localStorage.setItem("scw.fidelity", fidelity); } catch (e) {}
    }
    const sel = $("fidSel");
    if (sel) sel.value = fidelity;
  }
  function playerCmd(cmd) {
    const r = enqueueCmd(cmdQueue, cmd, state.tick);
    if (!mpSession && !replayWatch && recLog && recLog.cmds.length < REPLAY_CMD_CAP) {
      recordCmd(recLog, state.tick, cmd);
    }
    return r;
  }
  const mpPending = new Map(); // seq -> msg (ترتیب اجرا)
  let mpNextSeq = 1;
  const mpHashes = new Map(); // "slot:tick" -> h (تشخیص desync)
  let mpDesync = null;
  const mpActive = () => !!mpSession;
  const mySlot = () => (mpSession ? mpSession.slot : 0);
  const myEcon = () => (mpSession ? state.mpres[mpSession.slot] : state);
  // در MP ورودی فقط ارسال می‌شود (اجرای هم‌زمان پس از echo با seq).
  function mpSend(kind, args) {
    if (!mpSession) return false;
    try { lobby.send(kind, args); } catch (e) {}
    refreshPanel();
    return true;
  }
  function warName() {
    return profile.name || "بی‌نام";
  }
  function warLogo() {
    return profile.logo | 0;
  }
  function paintBadge() {
    const el = $("profileBadgeEl");
    if (el) el.innerHTML = profileBadgeHTML(profile);
  }

  const renderer = createRenderer(canvas);
  renderer.resize();
  renderer.fit();
  // فیت مجدد پس از نشستن لایه‌بندی (بوت ممکن است پیش از اندازه نهایی اجرا شود)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    renderer.resize();
    renderer.fit();
  }));

  // پالت ساختمان/مزدور (0.23.2): کارت‌واره — تصویر + آیکون هزینه از داده‌ها.
  const FA_D = "۰۱۲۳۴۵۶۷۸۹";
  function faNum(n) {
    return String(n).replace(/\./g, "٫").replace(/\d/g, (d) => FA_D[d]);
  }
  function escName(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function resName(key) {
    const r = CONFIG.RESOURCES.find((x) => x.key === key);
    return r ? r.name : key;
  }
  function costHTML(cost) {
    const ks = Object.keys(cost || {});
    if (!ks.length) return `<span class="free">رایگان</span>`;
    return ks.map((k) =>
      `<span><img src="${iconSrc(k)}" alt="${resName(k)}">${faNum(cost[k])}</span>`).join("");
  }
  function buildingMeta(key, def) {
    const parts = [];
    const rate = RATES[key];
    if (rate && rate.workers) parts.push(`${faNum(rate.workers)} کارگر`);
    if (def.buildTime > 0) parts.push(`ساخت ${faNum(Math.ceil(def.buildTime / 10))}ث`);
    if (rate && rate.produces && !rate.consumes) {
      parts.push(`${resName(rate.produces)} ${faNum(Math.round((rate.amount * 600) / rate.everyTicks))}/دقیقه`);
    }
    if (rate && rate.consumes) {
      const ck = Object.keys(rate.consumes)[0];
      parts.push(`${faNum(rate.consumes[ck])}${resName(ck)}←${faNum(rate.amount)}${resName(rate.produces)}`);
    }
    if (key === "hut") parts.push(`+${faNum(HUT_HOUSING)} مسکن`);
    if (def.weapon) parts.push(`برد ${faNum(def.weapon.range)}`);
    if (key === "tower") parts.push(`گاریسون ${faNum(GARRISON_CAP)} مدافع دوربرد`);
    if (def.rules && def.rules.spacingFromSame) parts.push("فاصله از هم‌نوع");
    if (def.rules && def.rules.anchorToAny) parts.push("بچسبد به بنا");
    if (key === "gate") parts.push("باز/بسته با کلیک");
    if (key === "inn") parts.push(`${faNum(1)}آبجو/${faNum(INN.beerEveryTicks)}تیک ← +${faNum(INN.popBonus)} محبوبیت`);
    if (key === "barracks") { parts.push("پیش‌نیاز مزدورها"); parts.push("فقط یکی"); }
    if (key === "market") { parts.push("خرید و فروش منابع"); parts.push("کلیک = پنل معامله"); }
    if (key === "stockpile") parts.push("+۵۰۰ سقف چوب/سنگ/طلا");
    if (key === "granary") parts.push("+۵۰۰ سقف غذا/گندم/آرد/رازک/آبجو");
    return parts.join(" • ");
  }
  // برچسب منبع اعداد (0.41.0 — #۵ از FEATURES): مرجع استخراج‌شده یا حدس وب.
  function srcTag(def) {
    const s = (def && def.source) || "guess";
    return s.startsWith("reference:") ? "مرجع" : "حدس";
  }
  function unitMeta(def) {
    const parts = [`جان ${faNum(def.hp)}`];
    parts.push(def.range > 2 ? `برد ${faNum(def.range)}` : `آسیب ${faNum(def.dmg)}`);
    parts.push(`زره ${faNum(def.armor || 0)}`);
    parts.push(srcTag(def));
    if (def.requiresWeapon === "swords") parts.push("+۱ شمشیر");
    else if (def.requiresWeapon === "bows") parts.push("+۱ کمان");
    if (def.trainTicks) parts.push(`آموزش ${faNum(Math.ceil(def.trainTicks / 10))} ثانیه`); // (0.65.0 — صف آموزش)
    if (def.siege) parts.push(`×${faNum(def.bonusVsBld || 1)} ضد ساختمان`);
    if (def.needsDeploy) parts.push("نیاز به استقرار");
    if (def.minRange) parts.push(`حداقل برد ${faNum(def.minRange)}`);
    if (def.requires === "barracks") parts.push("نیاز به سربازخانه");
    return parts.join(" • ");
  }
  const PALETTE = ["hut", "tower", "barracks", "market", "stockpile", "granary", "woodcutter", "quarry", "ironmine", "farm", "wheatfarm",
    "mill", "bakery", "armoury", "fletcher", "hopsfarm", "brewery", "inn", "wall", "gate"];
  function paintThumbs() {
    for (const btn of document.querySelectorAll("#buildPal [data-b]")) {
      renderer.thumbBuilding(btn.dataset.b, btn.querySelector("canvas"));
    }
    for (const btn of document.querySelectorAll("#unitPal [data-u]")) {
      renderer.thumbUnit(btn.dataset.u, btn.querySelector("canvas"));
    }
  }
  function buildPalette() {
    const bp = $("buildPal"), up = $("unitPal");
    if (!bp || !up) return;
    bp.innerHTML = ""; up.innerHTML = "";
    for (const key of PALETTE) {
      const def = CONFIG.BUILDINGS[key];
      if (!def) continue;
      const btn = document.createElement("button");
      btn.className = "bcard"; btn.dataset.b = key;
      btn.innerHTML = `<canvas class="bthumb" width="128" height="112"></canvas>` +
        `<span class="binfo"><span class="bname">${def.name} <i>${faNum(def.w)}×${faNum(def.h)}</i></span>` +
        `<span class="bmeta">${buildingMeta(key, def)}</span>` +
        `<span class="bcost">${costHTML(def.cost)}</span></span>`;
      bp.appendChild(btn);
    }
    for (const [key, def] of Object.entries(UNITS)) {
      if (def.side !== "player" || def.noHire || !def.cost) continue;
      const btn = document.createElement("button");
      btn.className = "bcard"; btn.dataset.u = key;
      btn.innerHTML = `<canvas class="bthumb" width="96" height="84"></canvas>` +
        `<span class="binfo"><span class="bname">${def.name}</span>` +
        `<span class="bmeta">${unitMeta(def)}</span>` +
        `<span class="bcost">${costHTML(def.cost)}</span></span>`;
      up.appendChild(btn);
    }
    paintThumbs();
    // شیت واحدها async لود می‌شود — یک repaint تا اسپرایت واقعی بنشیند
    setTimeout(paintThumbs, 1500);
  }
  buildPalette();
  // پنل بازار (0.64.0 — ب-۳): ردیف زنده هر منبع قابل‌معامله — موجودی + نرخ
  // + دکمه خرید/فروش بسته‌ای (وضعیت دکمه از پیش‌فاکتور همان تیک).
  function paintMarket() {
    const o = $("marketOverlay"), rows = $("marketRows");
    if (!o || !rows || o.hidden || marketFor == null) return;
    const slot = mpSession ? mpSession.slot : 0;
    const ec = mpSession ? state.mpres[slot] : state;
    const M = CONFIG.MARKET;
    let html = "";
    for (const k of Object.keys(M.rates)) {
      const rate = M.rates[k];
      const have = (ec.resources[k] || 0);
      const qb = tradeQuote(state, k, "buy", slot), qs = tradeQuote(state, k, "sell", slot);
      html += `<div class="mrow"><span class="mname">${resName(k)} <b>${faNum(have)}</b></span>` +
        `<span class="mrate">خرید ${faNum(rate.buy)}ط • فروش ${faNum(rate.sell)}ط</span>` +
        `<button data-trade="buy:${k}"${qb.ok ? "" : ` disabled title="${TRADE_FA[qb.reason] || qb.reason}"`}>${qb.ok ? `خرید ${faNum(qb.n)}` : "خرید"}</button>` +
        `<button data-trade="sell:${k}"${qs.ok ? "" : ` disabled title="${TRADE_FA[qs.reason] || qs.reason}"`}>${qs.ok ? `فروش ${faNum(qs.n)}` : "فروش"}</button></div>`;
    }
    rows.innerHTML = html;
  }
  // صف آموزش (0.65.0 — انتخاب ۱-الف): ردیف زنده سفارش‌های سربازخانه میزبان —
  // نام + درصد پیشرفت + دکمه لغو با بازپرداخت. فقط view (sim بی‌خبر).
  function paintTrain() {
    const o = $("mercsOverlay"), box = $("trainQueueEl");
    if (!o || !box || o.hidden || mercsFor == null) return;
    const b = state.buildings.find((x) => x.id === mercsFor);
    const q = b && !b.destroyed && Array.isArray(b.train) ? b.train : [];
    const cap = CONFIG.TRAIN.queueCap;
    let html = `<div class="lbl">صف آموزش (${faNum(q.length)}/${faNum(cap)})</div>`;
    q.forEach((e, i) => {
      const def = UNITS[e.type];
      const pct = Math.max(0, Math.min(100, Math.round(((e.total - e.left) / e.total) * 100)));
      html += `<div class="trow"><span>${def ? escName(def.name) : e.type} <b>${faNum(pct)}٪</b></span>` +
        `<button data-tcancel="${i}" title="لغو با بازپرداخت کامل">✕</button></div>`;
    });
    if (!q.length) html += `<div class="lbl">خالی — روی نقشه کلیک کن تا سفارش بدهی</div>`;
    box.innerHTML = html;
  }
  const unitBtns = Array.from(document.querySelectorAll("[data-u]"));
  const palBtns = Array.from(document.querySelectorAll("[data-b]"));

  let state = createState();
  let terrain = makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, state.mapSeed);
  placeKeep(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H); // ستاد آغازین (0.19.0)
  spawnLord(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H); // ارباب آغازین (0.22.0)
  let selectedKey = null; // حالت خنثی (0.23.4): هیچ ساختمانی مسلح نیست تا کلیکِ سرباز با ساخت قاطی نشود
  let selectedUnit = null; // حالت استخدام: null یا کلید واحد
  let selIds = []; // یگان‌های منتخب به ترتیب انتخاب (دستور/موضع جمعی) — مستقل از حالت استخدام
  let ctrlGroups = freshGroups(); // گروه‌های کنترلی ۱..۳ (0.59.0): گذرا و UI-side — با بازی/بارگذاری تازه صفر می‌شود
  let pendingKind = null; // "attackmove" یعنی کلیک بعدی حمله‌در‌حرکت است (تک‌بار)
  let hover = null; // {c, r, valid, reason, ghost}
  let lastAutoTick = 0;
  // نوار مزدورها (0.33.0): با کلیک خنثی روی سربازخانه خودی، روی نوار ساختمان باز می‌شود.
  let mercsFor = null; // شناسه سربازخانه میزبان، یا null = بسته
  function hideMercs() { mercsFor = null; const o = $("mercsOverlay"); if (o) o.hidden = true; }
  function showMercs(id) { mercsFor = id; const o = $("mercsOverlay"); if (o) o.hidden = false; }
  function toggleMercs(id) {
    const o = $("mercsOverlay");
    if (mercsFor === id && o && !o.hidden) hideMercs();
    else showMercs(id);
  }
  function pruneMercs() { // سربازخانه میزبان از دست رفته/دشمن شده → بستن خودکار
    if (mercsFor == null) return;
    const b = state.buildings.find((x) => x.id === mercsFor);
    const mine = !!b && !b.destroyed && (!mpSession || (b.owner == null ? 0 : b.owner) === mpSession.slot);
    if (!mine) hideMercs();
  }
  // پنل بازار (0.64.0 — ب-۳): کلیک خنثی روی بازار خودی، روی نوار ساختمان باز می‌شود (الگوی نوار مزدورها).
  let marketFor = null; // شناسه بازار میزبان، یا null = بسته
  function hideMarket() { marketFor = null; const o = $("marketOverlay"); if (o) o.hidden = true; }
  function showMarket(id) { marketFor = id; const o = $("marketOverlay"); if (o) o.hidden = false; }
  function toggleMarket(id) {
    const o = $("marketOverlay");
    if (marketFor === id && o && !o.hidden) hideMarket();
    else showMarket(id);
  }
  function pruneMarket() { // بازار میزبان از دست رفته/دشمن شده → بستن خودکار
    if (marketFor == null) return;
    const b = state.buildings.find((x) => x.id === marketFor);
    const mine = !!b && !b.destroyed && (!mpSession || (b.owner == null ? 0 : b.owner) === mpSession.slot);
    if (!mine) hideMarket();
  }

  // صدا (0.48.0 — #۲۵ از FEATURES): مدیر سنتزشده WebAudio؛ sim هیچ‌چیز از
  // صدا نمی‌داند — حلقه فریم اسنپ‌شات سبک می‌دهد. شروع فقط با ژست کاربر.
  const sound = createSoundManager();
  let lastSoundSnap = null;
  document.addEventListener("pointerdown", () => sound.ensureStarted(), { capture: true });
  const clock = createClock({
    hz: CONFIG.TICK_HZ,
    maxPerFrame: CONFIG.MAX_TICKS_PER_FRAME,
    onTick: (n) => {
      if (mpSession) {
        for (let i = 0; i < n; i++) { state.tick++; mpDrain(); stepEconomy(state); stepTraining(state, terrain); stepCombat(state, terrain); updateMpAlive(state); }
        tickEl.textContent = "تیک " + state.tick;
        if (state.tick % 100 === 0 && state.tick > 0) {
          try { lobby.send("hash", { h: stateHash(state), tick: state.tick }); } catch (e) {}
          checkMpEnd();
        }
        refreshPanel();
        return;
      }
      // تغذیه تماشا (0.49.0): فرمان‌های سررسیده لاگ، خام (بدون ضبط) صف می‌شوند —
      // دقیقاً همان قانون targetTick+1 حلقه زنده.
      if (replayWatch) {
        const w = replayWatch;
        while (w.i < w.cmds.length && w.cmds[w.i].t <= state.tick) {
          enqueueCmd(cmdQueue, w.cmds[w.i].cmd, state.tick);
          w.i++;
        }
      }
      stepSim(state, terrain, n, cmdQueue, { aiPaused: !$("menuScreen").hidden }); // گام یکپارچه + تخلیه صف فرمان (0.37.0؛ گیت AI پشت منو 0.68.0)
      tickEl.textContent = "تیک " + state.tick;
      refreshPanel();
      if (replayWatch) {
        paintReplayBar();
        // پایان لاگ = مکث + اعلام (بازیکن با خروج یا سرعت/ادامه کنترل دارد)
        if (state.tick >= replayWatch.upto) {
          state.paused = true;
          paintReplayBar();
          refreshPanel();
        }
        return; // حین تماشا ذخیره خودکار نیست
      }
      // ذخیره خودکار هر ۳۰۰ تیک (۳۰ ثانیه) — بک‌اند IDB ناهمگام است (0.55.0)،
      // پس fire-and-forget: رشته همان لحظه منجمد شده و نتیجه بعداً می‌آید.
      if (state.tick - lastAutoTick >= 300) {
        lastAutoTick = state.tick;
        const tickNow = state.tick;
        saveSlot(SLOTS.auto, serializeJSON(state)).then((r) => {
          saveStatus.textContent = r.ok
            ? `خودکار: تیک ${tickNow} (${r.bytes} بایت)`
            : `خطای ذخیره خودکار: ${SAVE_FA[r.error] || r.error}`;
        });
      }
    },
  });
  clock.attach(() => (mpSession ? { paused: state.mp && state.mp.over ? true : false, speed: 1 } : { paused: state.paused, speed: state.speed }));

  // ---- اجرای ورودی‌های نوبتی (ترتیب seq، سر execTick) ----
  function mpDrain() {
    for (;;) {
      const m = mpPending.get(mpNextSeq);
      if (!m) return;
      const exec = (m.tick | 0) + INPUT_DELAY;
      if (state.tick < exec) return;
      mpPending.delete(mpNextSeq);
      mpNextSeq++;
      try { applyMpInput(m); } catch (e) { /* ورودی بد = نادیده، ترتیب حفظ می‌شود */ }
    }
  }

  function mpUnitOwned(id, slot) {
    const u = state.units.find((x) => x.id === id && !x.dead);
    if (!u) return null;
    if ((u.owner == null ? 0 : u.owner) !== slot) return null;
    return u;
  }

  function applyMpInput(m) {
    const slot = m.slot | 0, kind = m.kind, a = m.args || {};
    if (kind === "hash") {
      if (slot === (mpSession ? mpSession.slot : -1)) return;
      const key = slot + ":" + (a.tick | 0);
      mpHashes.set(key, String(a.h || ""));
      const mine = stateHash(state);
      // مقایسه با تأخیر: هش هم‌تیک خودم را وقتی به همان تیک رسیدم چک می‌کنم
      return;
    }
    if (!mpSession || slot < 0 || slot >= mpSession.num) return;
    const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
    if (kind === "place") {
      const def = typeof a.type === "string" ? CONFIG.BUILDINGS[a.type] : null;
      if (!def || def.key === "keep") return;
      if (!Number.isInteger(a.c) || !Number.isInteger(a.r)) return;
      const r = tryPlace(state, terrain, W, H, a.c, a.r, def, slot);
      if (r.ok) assignStaff(state, slot);
    } else if (kind === "hire") {
      // استخدام بازیکن (0.65.0 — صف آموزش): آینه applyCmd در sim.js.
      if (typeof a.type !== "string" || !Number.isInteger(a.c) || !Number.isInteger(a.r)) return;
      queueHire(state, terrain, W, H, a.c, a.r, a.type, slot);
    } else if (kind === "trainCancel") {
      // لغو سفارش آموزش + بازپرداخت (0.65.0): آینه applyCmd در sim.js.
      if (!Number.isInteger(a.bld) || !Number.isInteger(a.idx)) return;
      cancelTrain(state, a.bld, a.idx, slot);
    } else if (kind === "order") {
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      if (!Number.isInteger(a.c) || !Number.isInteger(a.r)) return;
      for (const id of a.ids) {
        const u = mpUnitOwned(id, slot);
        if (!u) continue;
        if (a.kind === "attackmove") orderAttackMove(state, u, a.c, a.r);
        else orderMove(state, u, a.c, a.r);
      }
    } else if (kind === "retreat") {
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      for (const id of a.ids) {
        const u = mpUnitOwned(id, slot);
        if (u) orderRetreat(state, u);
      }
    } else if (kind === "stance") {
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      if (a.stance !== "engage" && a.stance !== "hold") return;
      for (const id of a.ids) {
        const u = mpUnitOwned(id, slot);
        if (u) setStance(u, a.stance);
      }
    } else if (kind === "guard") {
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      if (!Number.isInteger(a.bld)) return;
      const b = state.buildings.find((x) => x.id === a.bld && !x.destroyed);
      if (!b || (b.owner == null ? 0 : b.owner) !== slot) return;
      for (const id of a.ids) {
        const u = mpUnitOwned(id, slot);
        if (u) setGuard(state, u, b);
      }
    } else if (kind === "garrison") {
      // استقرار در برج (0.45.0): آینه فرمان garrison در sim.js — برج خودی + دوربرد.
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      if (!Number.isInteger(a.bld)) return;
      const b = state.buildings.find((x) => x.id === a.bld && !x.destroyed);
      if (!b || b.type !== "tower" || (b.owner == null ? 0 : b.owner) !== slot) return;
      for (const id of a.ids) {
        const u = mpUnitOwned(id, slot);
        if (u) garrisonUnit(state, u, b);
      }
    } else if (kind === "gate") {
      if (!Number.isInteger(a.bld)) return;
      const b = state.buildings.find((x) => x.id === a.bld && !x.destroyed);
      if (!b || b.type !== "gate" || (b.owner == null ? 0 : b.owner) !== slot) return;
      toggleGate(state, b);
    } else if (kind === "deploy") {
      // استقرار/جمع منجنیق (0.46.0): آینه فرمان deploy در sim.js.
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      for (const id of a.ids) {
        const u = mpUnitOwned(id, slot);
        if (u) deployUnit(state, u);
      }
    } else if (kind === "demolish") {
      // تخریب دستی (0.39.0؛ 0.62.0 — ب-۱: با غرامت یک‌سوم): آینه applyCmd در sim.js — مال خودی، غیر ستاد.
      if (!Number.isInteger(a.bld)) return;
      const b = state.buildings.find((x) => x.id === a.bld && !x.destroyed);
      if (!b || (b.owner == null ? 0 : b.owner) !== slot) return;
      if (b.type === "keep") return;
      demolishBuilding(state, b, slot);
    } else if (kind === "trade") {
      // بازار (0.64.0 — ب-۳): آینه فرمان trade در sim.js — بازار خودی + نرخ + استطاعت همین‌جا در applyTrade.
      if (typeof a.res !== "string" || (a.dir !== "buy" && a.dir !== "sell")) return;
      applyTrade(state, a.res, a.dir, slot);
    } else if (kind === "tax") {
      if (typeof a.v !== "string" || !TAX[a.v]) return;
      state.mpres[slot].tax = a.v;
    } else if (kind === "rations") {
      if (typeof a.v !== "string" || !RATIONS[a.v]) return;
      state.mpres[slot].rations = a.v;
    } else if (kind === "alarm") {
      if (!Number.isInteger(a.c) || !Number.isInteger(a.r)) return;
      const rs = alarmAll(state, a.c, a.r, slot);
      if (rs.some((r) => r.ok)) state.events.push(`یورش بازیکن ${slot + 1}!`);
    }
  }

  // ارجاع تنبل حذف شد (TAX/RATIONS مستقیم import می‌شوند).
  function eliminateSlot(slot) {
    for (const b of state.buildings) {
      if ((b.owner == null ? 0 : b.owner) !== slot || b.destroyed) continue;
      b.destroyed = true;
      const W = CONFIG.GRID_W;
      for (let j = 0; j < b.h; j++) {
        for (let i = 0; i < b.w; i++) state.occ[(b.r + j) * W + (b.c + i)] = 0;
      }
    }
    state.buildings = state.buildings.filter((b) => !b.destroyed);
    state.units = state.units.filter((u) => (u.owner == null ? 0 : u.owner) !== slot);
    if (state.mpres && state.mpres[slot]) state.mpres[slot].alive = false;
    updateMpAlive(state);
    refreshPanel();
  }

  function checkMpEnd() {
    if (!mpSession || !state.mp || !state.mp.over) return;
    refreshPanel();
  }

  function startMpGame(room, seed) {
    // زمین مشترک از سید اتاق (میزبان) — همه کلاینت‌ها یک نقشه می‌سازند.
    const s = (seed == null ? 0 : seed) >>> 0 || CONFIG.MAP_SEED;
    terrain = makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, s);
    mpClearSpawns(terrain, CONFIG.GRID_W, CONFIG.GRID_H);
    state = createState();
    state.mapSeed = s;
    const sorted = room.players.slice().sort((a, b) => a.slot - b.slot);
    const names = [], logos = [];
    for (const p of sorted) { names[p.slot] = p.name; logos[p.slot] = (p.logo | 0) || 0; }
    enableMp(state, room.max && sorted.length <= room.max ? Math.max(sorted.length, 2) : sorted.length, names);
    // تعداد واقعی = حاضرین (میزبان همه را ready کرده)
    state.mp.num = sorted.length;
    state.mpres.length = sorted.length;
    state.mp.seed = seed | 0;
    for (const p of sorted) {
      const an = MP_SPAWN_ANCHOR[p.slot] || [Math.floor(CONFIG.GRID_W / 2), Math.floor(CONFIG.GRID_H / 2)];
      placeKeepFor(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, p.slot, an[0], an[1]);
    }
    for (const p of sorted) spawnLord(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, p.slot);
    for (const p of sorted) assignStaff(state, p.slot);
    mpSession = { code: room.code, slot: room.slot, num: sorted.length, names, logos };
    // نکته: room.slot میزبانِ اتاق است یا اسلات خودم؟ lobby.mySlot اسلات خودم است.
    mpSession.slot = lobby.mySlot >= 0 ? lobby.mySlot : room.slot;
    mpPending.clear();
    mpNextSeq = 1;
    mpHashes.clear();
    mpDesync = null;
    cmdQueue = createQueue(); // در MP ورودی فقط از شبکه می‌آید
    clock.reset();
    lastAutoTick = state.tick;
    hover = null;
    selIds = []; ctrlGroups = freshGroups();
    pendingKind = null;
    selectedKey = null;
    selectedUnit = null;
    tickEl.textContent = "تیک 0";
    state.events.push(`نبرد ${sorted.length} نفره آغاز شد — ستاد و اربابت را نگه دار! (سید نقشه: ${s})`);
    paintSeed();
    refreshPanel();
  }

  // ---- لابی ----
  const lobby = initMpLobby(
    {},
    {
      warName,
      warLogo,
      getTick: () => state.tick,
      gameActive: () => !!mpSession,
      onLeave: () => {
        mpSession = null;
        mpPending.clear();
        newGame();
        showMenu();
      },
      onError: (msg) => { mpStatus(msg || "خطا"); },
      paint: () => paintMp(lobby),
      onStart: (room, seed) => {
        const myRoom = { code: room.code, slot: lobby.mySlot, players: room.players, max: room.max };
        startMpGame(myRoom, seed);
        hideMenu();
        mpStatus(`شروع شد! تو بازیکن ${lobby.mySlot + 1} هستی. (سید نقشه: ${(seed >>> 0) || CONFIG.MAP_SEED})`);
      },
      onInput: (m) => {
        if (!mpSession) return;
        if (typeof m.seq !== "number" || m.seq < 1) return;
        if (mpPending.has(m.seq) || m.seq < mpNextSeq) return;
        mpPending.set(m.seq, m);
        mpDrain();
        refreshPanel();
      },
      onPeerLeft: (slot) => {
        if (!mpSession) return;
        state.events.push(`بازیکن ${slot + 1} رفت — قلعه‌اش ویران شد.`);
        eliminateSlot(slot);
      },
    }
  );

  function mpStatus(msg) {
    const el = $("mpStatusEl");
    if (el && msg !== undefined) el.textContent = msg;
  }

  function paintMp(api) {
    const conn = $("mpConn"), box = $("mpRosterEl"), list = $("mpListEl");
    if (conn) conn.textContent = api.connected ? "(متصل)" : "(قطع)";
    if (!box) return;
    if (!api.room) {
      box.innerHTML = `<div class="lbl">در اتاقی نیستی — بساز یا بپیوند.</div>`;
      mpStatus(api.connected ? "آماده‌ای." : "در حال اتصال…");
      return;
    }
    const r = api.room;
    const me = r.players.find((p) => p.slot === api.mySlot);
    const lockTxt = r.priv ? " 🔒خصوصی" : " 🔓عمومی";
    const seedTxt = (r.seed | 0) ? ` — سید ${r.seed >>> 0}` : "";
    box.innerHTML = `<div class="lbl">کد: <b>${r.code}</b>${lockTxt}${seedTxt} — تو: بازیکن ${api.mySlot + 1}${r.started ? " — بازی شروع شده" : ""}</div>` +
      r.players.map((p) => `<div class="stat"><span><span class="rosterLogo">${PROFILE_LOGOS[(p.logo | 0)] || ""}</span>${escName(p.name)} (بازیکن ${p.slot + 1})</span><span>${p.ready ? "آماده ✓" : "…"}</span></div>`).join("");
    if (!r.started) {
      mpStatus(!me ? "…" : me.ready ? "آماده‌ای — منتظر دیگران…" : "«آماده» را بزن.");
    }
    if (list && list.dataset && list.dataset.show === "1") void 0;
  }

  function selectedDef() { return selectedKey ? CONFIG.BUILDINGS[selectedKey] : null; }

  function ghostDef() {
    if (pendingKind === "alarm") return null;
    if (selectedUnit) return { w: 1, h: 1 };
    // گوست ساختمان فقط وقتی هیچ یگانی منتخب نیست — وگرنه حس «ساختمان‌سازی» روی دستور سایه می‌انداخت
    if (selectedKey && selIds.length === 0) return selectedDef();
    return null;
  }

  function mpRosterHTML() {
    if (!mpSession || !state.mp) return "";
    return state.mpres.map((pl, i) => {
      const col = PLAYER_COLORS[i] || "#999";
      const nm = escName((mpSession.names && mpSession.names[i]) || `بازیکن ${i + 1}`);
      const logo = (mpSession.logos && PROFILE_LOGOS[mpSession.logos[i]]) || "";
      const tag = i === mpSession.slot ? " (تو)" : "";
      const st = pl.alive === false ? "💀" : "●";
      return `<div class="res"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col};"></i><span class="rosterLogo">${logo}</span> ${nm}${tag}</span><b>${st}</b></div>`;
    }).join("");
  }

  function refreshPanel() {
    // بنرهای solo + بنر MP (برنده/بازیکن حذف‌شده).
    if (mpSession && state.mp && state.mp.enabled) {
      const me = mpSession.slot;
      const alive = state.mpres[me] && state.mpres[me].alive;
      const over = state.mp.over;
      const winner = state.mp.winner;
      defeatBanner.hidden = !(over && alive === false);
      victoryBanner.hidden = !(over && alive === true && winner === me);
      if (over && winner !== me && alive !== false) {
        // بازی تمام شده ولی من نه برنده‌ام نه بازنده (نباید رخ دهد در FFA) — هر دو پنهان
        defeatBanner.hidden = true;
        victoryBanner.hidden = true;
      }
      const vb = victoryBanner.querySelector("p");
      const db = defeatBanner.querySelector("p");
      if (over && winner === me && vb) vb.textContent = `آخرین قلعه پابرجاست — تو برنده‌ای (بازیکن ${me + 1})!`;
      if (over && alive === false && db) db.textContent = `قلعه‌ات سقوط کرد — بازیکن ${winner + 1} برد.`;
    } else {
      defeatBanner.hidden = !state.defeated; // بنر شکست (0.19.0) — کل صفحه را می‌پوشاند
      victoryBanner.hidden = !state.victorious; // بنر پیروزی (0.22.0)
    }
    if (!mpSession) online.maybeReport(state); // ثبت پیروزی در تالار مشترک (0.23.0؛ فقط یک‌بار)
    pruneMercs(); // سربازخانه میزبان نوار مزدورها ویران شده؟ بستن خودکار
    pruneMarket(); // بازار میزبان پنل معامله ویران شده؟ بستن خودکار
    paintMarket(); // ردیف‌های زنده پنل بازار (موجودی/قیمت/وضعیت دکمه‌ها)
    paintTrain(); // ردیف‌های زنده صف آموزش (0.65.0)
    const ec = mpSession ? state.mpres[mpSession.slot] : state;
    for (const b of palBtns) b.classList.toggle("sel", !selectedUnit && b.dataset.b === selectedKey);
    for (const b of unitBtns) b.classList.toggle("sel", b.dataset.u === selectedUnit);
    // قفل مزدورها (0.29.0 سرباز، 0.30.0 سرباز و کماندار، 0.35.0 همه requiresدارها):
    // بدون سربازخانه سالم خودی، کارت‌ها کم‌رنگ‌اند.
    const slot = mpSession ? mpSession.slot : 0;
    const barracksOk = hasBarracks(state, slot);
    for (const b of unitBtns) {
      if (UNITS[b.dataset.u] && UNITS[b.dataset.u].requires === "barracks") {
        b.classList.toggle("locked", !barracksOk);
        b.title = barracksOk ? "" : HIRE_FA.NO_BARRACKS;
      }
      // قفل سلاح (0.44.0 — #۹): بدون شمشیر/کمانِ همان نوع، کارت کم‌رنگ است.
      const wpn = UNITS[b.dataset.u] && UNITS[b.dataset.u].requiresWeapon;
      if (wpn && barracksOk) {
        const has = ((mpSession ? state.mpres[mpSession.slot].resources : state.resources)[wpn] || 0) >= 1;
        b.classList.toggle("locked", !has);
        b.title = has ? "" : HIRE_FA.NEEDS_WEAPON;
      }
    }
    for (const b of taxBtns) b.classList.toggle("sel", b.dataset.tax === ec.tax);
    for (const b of ratBtns) b.classList.toggle("sel", b.dataset.rat === ec.rations);
    pauseBtn.textContent = mpSession ? "چندنفره (۱x)" : state.paused ? "ادامه" : "توقف";
    speedBtn.textContent = mpSession ? "سرعت 1x 🔒" : "سرعت " + state.speed + "x";
    pauseBtn.disabled = !!mpSession;
    speedBtn.disabled = !!mpSession;
    waveBtn.disabled = !!mpSession;
    saveBtn.disabled = !!mpSession;
    loadBtn.disabled = !!mpSession;
    for (const id of ["cloudSaveBtn", "cloudLoadBtn", "cloudDelBtn"]) { // ابری فقط سولو (0.67.0)
      const el = $(id);
      if (el) el.disabled = !!mpSession;
    }
    placedEl.textContent = state.placed;
    rejectedEl.textContent = state.rejected;
    workersEl.textContent = `${ec.freeWorkers != null ? ec.freeWorkers : state.freeWorkers} آزاد / ${ec.workers} / سقف ${ec.workerCap != null ? ec.workerCap : state.workerCap}`;
    const p = ec.popularity;
    popEl.textContent = `${p} ${ec.popDir > 0 ? "▲" : ec.popDir < 0 ? "▼" : "●"} (هدف ${popTarget(state, mpSession ? mpSession.slot : undefined)})`;
    popEl.className = p >= 55 ? "hi" : p < 40 ? "lo" : "me";
    resEl.innerHTML = CONFIG.RESOURCES.map((r) => {
      const net = netPerMinute(state, r.key, mpSession ? mpSession.slot : undefined);
      const sign = net > 0 ? "+" : "";
      const have = mpSession ? state.mpres[mpSession.slot].resources[r.key] : state.resources[r.key];
      return `<div class="res"><span><img src="${iconSrc(r.key)}" alt="" width="18" height="18" style="vertical-align:-4px"> ${r.name}</span><b>${have} / ${capFor(state, r.key, slot)} <i>(${sign}${net}/دقیقه)</i></b></div>`;
    }).join("") + (mpSession ? mpRosterHTML() : "");
    if (mpSession && state.mp && state.mp.over) {
      battleEl.textContent = state.mp.winner === mpSession.slot ? "بردی! 🏆" : "بازی تمام شد.";
    } else battleEl.textContent = state.defeated
      ? "شکست! ستاد ویران شد — «شروع دوباره» بزن"
      : state.victorious
      ? "پیروزی! آخرین موج در هم شکست — «بازی دوباره» بزن"
      : (pendingKind === "alarm"
        ? "کلیک بعدی: زنگ خطر — محل تجمع ارتش را بزن"
        : (pendingKind === "demolish"
          ? "کلیک بعدی: تخریب — روی ساختمان خودت کلیک کن (ستاد نه؛ یک‌سوم هزینه برمی‌گردد)"
          : (mpDesync ? `⚠ ناهمگامی: ${mpDesync}` : (state.events.length ? state.events[state.events.length - 1] : "آرامش…"))));
    alarmBtn.classList.toggle("sel", pendingKind === "alarm");
    demolishBtn.classList.toggle("sel", pendingKind === "demolish");
    // کارت یگان‌های منتخب (مرده/رفته → هرس خودکار با حفظ ترتیب)
    selIds = pruneSet(selIds, state.units);
    // زنگ خطر و تخریب سراسری‌اند و به انتخاب نیاز ندارند — پاک نشوند.
    if (!selIds.length && pendingKind !== "alarm" && pendingKind !== "demolish") pendingKind = null;
    const sels = resolveSet(selIds, state.units);
    const sel = sels[0] || null;
    unitCard.hidden = !sel;
    if (sel) {
      const udef = UNITS[sel.type];
      if (sels.length === 1) {
        unitNameEl.textContent = `${udef.name} #${sel.id} — ${STANCE_FA[sel.stance] || sel.stance}`;
        unitHpEl.textContent = `${sel.hp}/${sel.maxHp}`;
      } else {
        const hpSum = sels.reduce((a, u) => a + u.hp, 0);
        unitNameEl.textContent = `${sels.length} یگان منتخب`;
        unitHpEl.textContent = `Σ${hpSum}`;
      }
      stanceEngageBtn.classList.toggle("sel", sel.stance !== "hold" && sel.stance !== "guard");
      stanceHoldBtn.classList.toggle("sel", sel.stance === "hold");
      attackMoveBtn.classList.toggle("sel", pendingKind === "attackmove");
      guardBtn.classList.toggle("sel", pendingKind === "guard" || sel.stance === "guard");
      if (garrisonBtn) garrisonBtn.classList.toggle("sel", pendingKind === "garrison");
      // دکمه استقرار منجنیق (0.46.0): روشن وقتی منتخبِ منجنیق مستقر است.
      if (deployBtn) {
        deployBtn.hidden = !sels.some((u) => UNITS[u.type].needsDeploy);
        deployBtn.classList.toggle("sel", !!sel.deployed);
      }
      const post = guardPost(state, sel);
      const activeOrders = sels.filter((u) => u.order && u.order.status === "active").length;
      unitOrderEl.textContent = activeOrders > 0
        ? (sels.length === 1
          ? `مأموریت: ${ORDER_KIND_FA[sel.order.kind] || sel.order.kind} (${sel.mission})`
          : `مأموریت فعال: ${activeOrders} از ${sels.length} یگان`)
        : (pendingKind === "attackmove" ? "کلیک بعدی: حمله‌در‌حرکت"
        : (pendingKind === "guard" ? "کلیک بعدی: نگهبانی — روی ساختمان کلیک کن"
        : (pendingKind === "garrison" ? "کلیک بعدی: گاریسون — روی برج خودی کلیک کن"
        : (sels.length > 1 ? `${sels.length} یگان — کلیک روی نقشه: دستور جمعی`
        : (udef.needsDeploy
          ? (sel.deployed ? "منجنیق مستقر — شلیک آزاد (برد ۱۰، حداقل ۳)" : "منجنیق سیار — بدون شلیک؛ دکمه استقرار")
        : (sel.garrisonTower != null ? "مستقر در برج 🏰 — کلیک روی نقشه: خروج و حرکت"
        : (sel.stance === "guard"
          ? (post ? `نگهبانی از ${CONFIG.BUILDINGS[post.type].name}` : "پاسگاه از دست رفته")
          : `وضعیت: ${sel.mission} — کلیک روی نقشه: حرکت`)))))));
    }
  }

  function buildingAt(c, r) {
    return state.buildings.find((b) => c >= b.c && c < b.c + b.w && r >= b.r && r < b.r + b.h) || null;
  }

  function unitAt(c, r) {
    // نزدیک‌ترین واحد به مرکز خانه (شعاع ۰٫۷)
    let best = null, bd = 0.7;
    for (const u of state.units) {
      const d = Math.hypot(u.x - (c + 0.5), u.r - (r + 0.5));
      if (d <= bd) { bd = d; best = u; }
    }
    return best;
  }

  function updateHover(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const cell = renderer.screenToCell(sx - rect.left, sy - rect.top);
    const hit = buildingAt(cell.c, cell.r);
    if (hit) {
      const def = CONFIG.BUILDINGS[hit.type];
      const hpTxt = ` — ${hit.hp}/${hit.maxHp}`;
      if (hit.type === "gate" && !hit.destroyed) {
        statusEl.innerHTML = `${def.name}${hpTxt} — ${hit.open === false ? '<b class="bad">بسته</b>' : '<b class="ok">باز</b>'} (کلیک: باز/بسته)`;
      } else if (hit.type === "keep" && !hit.destroyed) {
        statusEl.innerHTML = `${def.name}${hpTxt} — <b class="ok">+۸ مسکن؛ سقوطش = شکست</b>`;
      } else if (hit.type === "tower" && !hit.destroyed) {
        // گاریسون برج (0.45.0): شمار مدافعان روی هاور.
        const g = hit.garrison && hit.garrison.length ? hit.garrison.length : 0;
        const buildTxt = (hit.buildLeft || 0) > 0
          ? ` — <b class="bad">در حال ساخت (${faNum(Math.ceil(hit.buildLeft / 10))} ثانیه)</b>`
          : "";
        statusEl.innerHTML = `${def.name}${hpTxt} — گاریسون ${faNum(g)}/${faNum(GARRISON_CAP)}${buildTxt}`;
      } else if (hit.type === "inn" && !hit.destroyed) {
        statusEl.innerHTML = `${def.name}${hpTxt} — ${hit.served ? '<b class="ok">سرو می‌کند (+۳ محبوبیت)</b>' : '<b class="bad">بدون آبجو — سروی نیست</b>'}`;
      } else if (def.prod) {
        if ((hit.buildLeft || 0) > 0) {
          statusEl.innerHTML = `${def.name}${hpTxt} — <b class="bad">در حال ساخت (${faNum(Math.ceil(hit.buildLeft / 10))} ثانیه)</b>`;
        } else statusEl.innerHTML = hit.staffed === false
          ? `${def.name}${hpTxt} — <b class="bad">بدون کارگر، تولید متوقف</b>`
          : (hit.starved
            ? `${def.name}${hpTxt} — <b class="bad">در انتظار ورودی (${escName(resName(Object.keys((RATES[hit.type] || {}).consumes || { "?": 0 })[0]))})</b>`
            : `${def.name}${hpTxt} — <b class="ok">تولید فعال</b>`);
      } else {
        statusEl.innerHTML = (hit.buildLeft || 0) > 0
          ? `${def.name}${hpTxt} — <b class="bad">در حال ساخت (${faNum(Math.ceil(hit.buildLeft / 10))} ثانیه)</b>`
          : `${def.name}${hpTxt}`;
      }
      hover = { c: cell.c, r: cell.r, valid: true, reason: "OK", ghost: false };
      return;
    }
    const hu = unitAt(cell.c, cell.r);
    if (hu) {
      const def = UNITS[hu.type];
      const lordTag = hu.type === "lord" ? " — <b class=\"bad\">مرگش = شکست</b>" : "";
      statusEl.innerHTML = `${def.name} — <b class="${hu.side === "player" ? "ok" : "bad"}">${hu.hp}/${hu.maxHp}</b> • زره ${faNum(def.armor || 0)} • ${srcTag(def)}${lordTag}`;
      hover = { c: cell.c, r: cell.r, valid: true, reason: "OK", ghost: false };
      return;
    }
    const inMap = cell.c >= 0 && cell.r >= 0 && cell.c < CONFIG.GRID_W && cell.r < CONFIG.GRID_H;
    if (pendingKind === "alarm") {
      hover = { c: cell.c, r: cell.r, valid: true, reason: "OK", ghost: false };
      statusEl.innerHTML = inMap ? `زنگ خطر — کلیک: تجمع ارتش در (${cell.c}، ${cell.r})` : `خارج از نقشه`;
      return;
    }
    if (selectedUnit) {
      const v = validateHire(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, cell.c, cell.r, selectedUnit, mpSession ? mpSession.slot : 0);
      hover = { c: cell.c, r: cell.r, valid: v.ok, reason: v.reason, ghost: true };
      const fa = HIRE_FA[v.reason] || v.reason;
      statusEl.innerHTML = inMap
        ? `خانه (${cell.c}، ${cell.r}) — <b class="${v.ok ? "ok" : "bad"}">${fa}</b>`
        : `خارج از نقشه — <b class="bad">${HIRE_FA.OUT_OF_BOUNDS}</b>`;
      return;
    }
    const def = selIds.length === 0 ? selectedDef() : null;
    if (def) {
      const v = validate(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, cell.c, cell.r, def, mpSession ? mpSession.slot : 0);
      hover = { c: cell.c, r: cell.r, valid: v.ok, reason: v.reason, ghost: true };
      const fa = REASON_FA[v.reason] || v.reason;
      statusEl.innerHTML = inMap
        ? `خانه (${cell.c}، ${cell.r}) — <b class="${v.ok ? "ok" : "bad"}">${fa}</b>`
        : `خارج از نقشه — <b class="bad">${HIRE_FA.OUT_OF_BOUNDS}</b>`;
      return;
    }
    // حالت فرمان/خنثی: گوست ساخت خاموش تا کلیکِ سرباز حس ساختمان ندهد
    hover = { c: cell.c, r: cell.r, valid: true, reason: "OK", ghost: false };
    if (!inMap) {
      statusEl.innerHTML = `خارج از نقشه`;
      return;
    }
    const sels = resolveSet(selIds, state.units);
    if (pendingKind === "attackmove" && sels.length) {
      statusEl.innerHTML = `حمله‌در‌حرکت — کلیک: یورش به (${cell.c}، ${cell.r})`;
    } else if (pendingKind === "guard" && sels.length) {
      statusEl.innerHTML = `نگهبانی — روی ساختمان کلیک کن (نه زمین خالی)`;
    } else if (pendingKind === "garrison" && sels.length) {
      statusEl.innerHTML = `گاریسون — روی برج خودی کلیک کن (نه زمین خالی)`;
    } else if (sels.length > 1) {
      statusEl.innerHTML = `${faNum(sels.length)} یگان منتخب — کلیک: دستور جمعی به (${cell.c}، ${cell.r})`;
    } else if (sels.length === 1) {
      statusEl.innerHTML = `کلیک: حرکت یگان به (${cell.c}، ${cell.r}) — کلیک دشمن: حمله`;
    } else {
      statusEl.innerHTML = `حالت انتخاب — کلیک سرباز: فرمان؛ شیفت+درگ: انتخاب باکسی؛ کارت پالت: مسلح‌شدن برای ساخت/استخدام`;
    }
  }

  // تعامل: درگ برای جابه‌جایی، کلیک برای ساخت/استخدام/دستور، چرخ برای زوم.
  // اولویت کلیک: حالت استخدام > انتخاب یگان خودی > دستور به منتخب > ساخت.
  // رفع گیرکردن درگ: اگر pointerup گم می‌شد (pointercancel، رها بیرون،
  // Alt-Tab، لمس دوم) نقشه به موس می‌چسبید و «خودبه‌خود» حرکت می‌کرد.
  let downPos = null, panning = false, movedFar = false, activePointerId = null, midPan = false;
  canvas.style.touchAction = "none";
  // دکمه وسط (0.68.0): جلوگیری از autoscroll مرورگر تا درگِ فقط-پن کار کند.
  canvas.addEventListener("mousedown", (e) => { if (e.button === 1) e.preventDefault(); });
  // ژست‌های لمسی (0.53.0 — #۲۳ از FEATURES): دو انگشت = پینچ-زوم، نگه‌داشتن
  // یک انگشت (≥۵۰۰ms بی‌حرکت) = خلع مثل راست‌کلیک. touchPts فقط انگشت‌های
  // لمسی را نگه می‌دارد؛ موس همان مسیر قبلی را می‌رود.
  let touchPts = new Map(), pinchState = null; // pinchState = {d0, z0}
  let longPressArmed = null, longPressDoneId = -1; // armed = {id, x, y, t0, timer}
  function cancelLongPress() {
    if (longPressArmed) { clearTimeout(longPressArmed.timer); longPressArmed = null; }
  }
  function fireLongPress() {
    // همان خلعِ راست‌کلیک (انتخاب یگان می‌ماند) + پیام؛ رها = بدون کلیک.
    longPressArmed = null;
    selectedUnit = null; selectedKey = null; pendingKind = null; clearWallLine();
    movedFar = true;
    statusEl.textContent = "لمس طولانی: خلع شد (مثل راست‌کلیک)";
    sound.ack("deny");
    refreshPanel();
  }
  function armLongPress(e) {
    cancelLongPress();
    const sx = e.clientX, sy = e.clientY, id = e.pointerId, t0 = Date.now();
    longPressArmed = {
      id, x: sx, y: sy, t0,
      timer: setTimeout(() => {
        if (longPressArmed && longPressArmed.id === id) {
          longPressDoneId = id;
          fireLongPress();
        }
      }, LONG_PRESS_MS),
    };
  }
  // انتخاب باکسی (0.40.0 — #۴ از FEATURES): شیفت+درگ مستطیل می‌کشد (به‌جای
  // جابه‌جایی نقشه) و یگان‌های خودیِ داخلش را به انتخاب اضافه می‌کند.
  let boxSel = null; // {x0,y0,x1,y1,active} با مختصات client
  let boxEl = null;
  function boxOverlay() {
    if (!boxEl) {
      boxEl = document.createElement("div");
      boxEl.id = "boxSel";
      boxEl.hidden = true;
      boxEl.style.cssText = "position:fixed;z-index:50;pointer-events:none;border:1px solid #ffd75e;background:rgba(255,215,94,.12);";
      document.body.appendChild(boxEl);
    }
    return boxEl;
  }
  function hideBox() { if (boxEl) boxEl.hidden = true; boxSel = null; }
  // خط دیوار (0.47.0 — #۲۰ از FEATURES): با دیوار مسلح، درگ (نه کلیک) یک خط
  // دیوار می‌سازد. wallLine = [{c,r,ok}] پیش‌نمایشِ همان تایل‌هایی است که رها
  // صف می‌کند؛ downCell خانه شروع فشار است. شیفت همچنان مال باکس است.
  let wallLine = null, downCell = null;
  function wallArmed() {
    return selectedKey && isLineDragType(selectedKey)
      && !selectedUnit && !pendingKind && selIds.length === 0;
  }
  function clearWallLine() { wallLine = null; downCell = null; }
  function buildWallLine(toC, toR) {
    const own = mpSession ? mpSession.slot : 0;
    const def = CONFIG.BUILDINGS.wall;
    wallLine = wallLineTiles(downCell.c, downCell.r, toC, toR).map((t) => ({
      c: t.x, r: t.y,
      ok: validate(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, t.x, t.y, def, own).ok,
    }));
  }
  function paintBox() {
    const el = boxOverlay();
    el.hidden = false;
    el.style.left = Math.min(boxSel.x0, boxSel.x1) + "px";
    el.style.top = Math.min(boxSel.y0, boxSel.y1) + "px";
    el.style.width = Math.abs(boxSel.x1 - boxSel.x0) + "px";
    el.style.height = Math.abs(boxSel.y1 - boxSel.y0) + "px";
  }
  function endDrag(e) {
    if (e && e.pointerId !== undefined && activePointerId !== null && e.pointerId !== activePointerId) return false;
    const wasPan = movedFar;
    downPos = null; panning = false; activePointerId = null;
    try { if (e && e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); } catch (_) { /* مهم نیست */ }
    return wasPan;
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (editor) { // نقاشی نقشه‌ساز (0.51.0): درگ = قلم، نه فرمان/پن
      if (e.isPrimary === false) return;
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== undefined) return;
      activePointerId = e.pointerId;
      editor.painting = true;
      edPaintAt(edCellFromEvent(e));
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* رویداد مصنوعی */ }
      return;
    }
    if (e.isPrimary === false && e.pointerType !== "touch") return; // لمس دوم/چندلمسی: نادیده تا نقشه نپرد
    if (e.pointerType === "mouse" && e.button === 1) { // درگ وسط (0.68.0) = فقط پن: بدون باکس/دیوار/کلیک/لانگ‌پرس
      if (activePointerId !== null) return;
      activePointerId = e.pointerId; midPan = true;
      downPos = { x: e.clientX, y: e.clientY, panX: renderer.view.panX, panY: renderer.view.panY };
      panning = false; movedFar = false;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* رویداد مصنوعی */ }
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== undefined) return; // فقط کلیک چپ
    if (e.pointerType === "touch") {
      // انگشت دوم = شروع پینچ: حالت تک‌انگشتی را بی‌صدا ببند تا رها شدن
      // انگشت‌ها کلیک/باکس/خط صادر نکند؛ زوم از نسبت فاصله‌هاست.
      touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touchPts.size >= 2 && !pinchState) {
        cancelLongPress();
        hideBox(); clearWallLine();
        const pts = [...touchPts.values()];
        pinchState = {
          d0: Math.max(1, pinchDist(pts[0].x, pts[0].y, pts[1].x, pts[1].y)),
          z0: renderer.view.zoom,
        };
        downPos = null; panning = false; movedFar = true; activePointerId = null;
        try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* رویداد مصنوعی */ }
        return;
      }
      if (pinchState) return; // انگشت سوم حین پینچ: نادیده
    }
    if (activePointerId !== null) return; // یک درگ فعال است
    activePointerId = e.pointerId;
    downPos = { x: e.clientX, y: e.clientY, panX: renderer.view.panX, panY: renderer.view.panY };
    if (e.shiftKey) boxSel = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, active: false };
    else if (wallArmed()) {
      const rect = canvas.getBoundingClientRect();
      downCell = renderer.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
    }
    panning = false;
    movedFar = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* رویداد مصنوعی/لمسی بدون pointer معتبر */ }
    // لمس طولانی (0.53.0): فقط انگشت تکی لمسی بیرون ویرایشگر/تماشا مسلح می‌شود.
    if (e.pointerType === "touch" && !replayWatch) armLongPress(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (editor) { // نقاشی نقشه‌ساز (0.51.0): حرکت با قلم پایین = رنگ
      if (editor.painting && e.pointerId === activePointerId) edPaintAt(edCellFromEvent(e));
      return;
    }
    if (e.pointerType === "touch" && touchPts.has(e.pointerId)) {
      touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // پینچ (0.53.0): زوم از نسبت فاصله دو انگشت؛ پن/کلیک تک‌انگشتی مرده است.
      if (pinchState && touchPts.size >= 2) {
        const pts = [...touchPts.values()];
        renderer.view.zoom = pinchZoom(pinchState.z0, pinchState.d0,
          pinchDist(pts[0].x, pts[0].y, pts[1].x, pts[1].y));
        renderer.markDirty();
        return;
      }
      // لغزش بیش از تحمل = لغو تایمر لمس طولانی.
      if (longPressArmed && e.pointerId === longPressArmed.id
        && longPressMoved(longPressArmed.x, longPressArmed.y, e.clientX, e.clientY)) {
        cancelLongPress();
      }
    }
    if (downPos && e.pointerId === activePointerId) {
      if (midPan) { // درگ وسط (0.68.0): فقط پن با همان ریاضی درگ-پن چپ
        const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y;
        if (dragMovedFar(downPos.x, downPos.y, e.clientX, e.clientY)) { panning = true; movedFar = true; }
        if (panning) {
          const p = panForDrag(downPos.panX, downPos.panY, downPos.x, downPos.y, e.clientX, e.clientY);
          renderer.view.panX = p.panX; renderer.view.panY = p.panY;
          renderer.markDirty();
          return;
        }
        updateHover(e.clientX, e.clientY);
        return;
      }
      if (boxSel) {
        boxSel.x1 = e.clientX; boxSel.y1 = e.clientY;
        if (Math.abs(boxSel.x1 - boxSel.x0) + Math.abs(boxSel.y1 - boxSel.y0) > 6) {
          boxSel.active = true; movedFar = true; paintBox();
        }
        updateHover(e.clientX, e.clientY);
        return;
      }
      // دکمه رها شده ولی pointerup نرسیده: درگ را ببند، نقشه را نکش
      if (e.pointerType === "mouse" && e.buttons === 0) {
        endDrag(e);
        updateHover(e.clientX, e.clientY);
        return;
      }
      const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y;
      if (dragMovedFar(downPos.x, downPos.y, e.clientX, e.clientY)) { panning = true; movedFar = true; }
      // خط دیوار مال درگ است، نه جابه‌جایی: از آستانه به بعد پیش‌نمایش خط
      if (downCell && !boxSel && wallArmed() && movedFar) {
        const rect = canvas.getBoundingClientRect();
        const cell = renderer.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
        buildWallLine(cell.c, cell.r);
        panning = false;
        renderer.markDirty();
        const okN = wallLine.filter((t) => t.ok).length;
        statusEl.innerHTML = `خط دیوار: <b>${faNum(wallLine.length)} خانه</b> (سالم ${faNum(okN)}، سقف ${faNum(WALL_LINE_MAX)}) — رها = ساخت، Esc = لغو`;
        return;
      }
      if (panning) {
        const p = panForDrag(downPos.panX, downPos.panY, downPos.x, downPos.y, e.clientX, e.clientY);
        renderer.view.panX = p.panX;
        renderer.view.panY = p.panY;
        renderer.markDirty();
        return;
      }
    }
    updateHover(e.clientX, e.clientY);
  });
  canvas.addEventListener("pointerup", (e) => {
    if (editor) { // نقاشی نقشه‌ساز (0.51.0): رها = پایان ضربه قلم
      if (e.pointerId === activePointerId) {
        editor.painting = false;
        activePointerId = null;
        try { if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      return;
    }
    if (e.pointerType === "touch") {
      // پایان ژست لمسی (0.53.0): انگشت را از ردیابی بردار؛ اگر پینچ بود یا
      // لمس طولانی رخ داده بود، بقیه حالت را کامل ریست کن تا کلیک کاذب نیاید.
      const wasPinch = !!pinchState;
      touchPts.delete(e.pointerId);
      if (touchPts.size < 2) pinchState = null;
      cancelLongPress();
      if (wasPinch || e.pointerId === longPressDoneId) {
        if (e.pointerId === longPressDoneId) longPressDoneId = -1;
        downPos = null; panning = false; activePointerId = null;
        try { if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); } catch (_) { /* مهم نیست */ }
        return;
      }
      if (e.pointerId !== activePointerId) return;
    } else if (e.pointerId !== activePointerId) return;
    const wasPan = endDrag(e);
    if (midPan) { midPan = false; return; } // درگ وسط (0.68.0): فقط پن بود، کلیک نه
    // تماشای ری‌پلی (0.49.0): ورودی بسته است — فقط پن/زوم؛ فرمان نه.
    if (replayWatch) {
      hideBox();
      clearWallLine();
      if (!wasPan) statusEl.textContent = "📼 حالت تماشا — ورودی بسته است (Esc = خروج)";
      return;
    }
    // پایان باکس (0.40.0): مستطیل فعال = انتخاب افزایشی خودی‌های داخل؛
    // بدون درگ = کلیک معمولی شیفت‌دار (مسیر پایین).
    if (boxSel) {
      const box = boxSel;
      hideBox();
      if (box.active) {
        const rect = canvas.getBoundingClientRect();
        const a = renderer.screenToCell(box.x0 - rect.left, box.y0 - rect.top);
        const b = renderer.screenToCell(box.x1 - rect.left, box.y1 - rect.top);
        selIds = boxSelectIds(state.units, { c0: a.c, r0: a.r, c1: b.c, r1: b.r },
          { owner: mpSession ? mpSession.slot : 0, additive: true, prev: selIds });
        pendingKind = null;
        refreshPanel();
        return;
      }
    }
    if (wasPan && !wallLine) return;
    // پایان خط دیوار (0.47.0): هر تایل یک place جدا — همان معنای تک‌کلیک
    // (اعتبار/رد/هزینه در اجرا)؛ دیوار مسلح می‌ماند تا زنجیره بعدی.
    if (wallLine && wallLine.length) {
      const line = wallLine;
      clearWallLine();
      if (mpSession) {
        for (const t of line) mpSend("place", { type: "wall", c: t.c, r: t.r });
      } else {
        for (const t of line) playerCmd( { kind: "place", type: "wall", c: t.c, r: t.r }, state.tick);
      }
      sound.ack("place");
      refreshPanel();
      return;
    }
    if (wasPan) return;
    const rect = canvas.getBoundingClientRect();
    const cell = renderer.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
    const bHit = buildingAt(cell.c, cell.r), uHit = unitAt(cell.c, cell.r);
    const ownUnit = (u) => u && u.side === "player" && (!mpSession || (u.owner == null ? 0 : u.owner) === mpSession.slot);
    // خودی در سولو یعنی مالک ۰ (0.42.0: بنای حریف AI خودی نیست — دروازه/سربازخانه/پاسگاهش لمس نمی‌شود).
    const ownBld = (b) => b && !b.destroyed && (b.owner == null ? 0 : b.owner) === (mpSession ? mpSession.slot : 0);
    if (selectedUnit) {
      // سربازخانه خودی حین استخدام مسلح (0.33.0): فقط نوار مزدورها toggle می‌شود؛ استخدام مسلح می‌ماند.
      if (bHit && bHit.type === "barracks" && ownBld(bHit)) { toggleMercs(bHit.id); refreshPanel(); return; }
      // بازار خودی حین استخدام مسلح (0.64.0 — ب-۳): فقط پنل معامله toggle می‌شود.
      if (bHit && bHit.type === "market" && ownBld(bHit)) { toggleMarket(bHit.id); refreshPanel(); return; }
      if (bHit || uHit) return; // روی موجود: کاری نکن
      if (mpSession) { mpSend("hire", { type: selectedUnit, c: cell.c, r: cell.r }); sound.ack("place"); return; }
      playerCmd( { kind: "hire", type: selectedUnit, c: cell.c, r: cell.r }, state.tick);
      sound.ack("place");
      refreshPanel();
      return;
    }
    // زنگ خطر (0.17.0): مسلح و سراسری — هر کلیک نقشه = تجمع ارتش در آن نقطه
    // (حتی روی ساختمان؛ مقصد ناممکن به همسایه باز حل می‌شود).
    if (pendingKind === "alarm") {
      if (mpSession) { mpSend("alarm", { c: cell.c, r: cell.r }); pendingKind = null; sound.ack("order"); refreshPanel(); return; }
      playerCmd( { kind: "alarm", c: cell.c, r: cell.r }, state.tick);
      pendingKind = null;
      sound.ack("order");
      refreshPanel();
      return;
    }
    // تخریب دستی (0.39.0): مسلح و سراسری — کلیک روی ساختمان خودی (غیر ستاد).
    // نامعتبر = پیام دلیل و مسلح می‌ماند؛ کلیک خالی = خلع.
    if (pendingKind === "demolish") {
      const own = mpSession ? mpSession.slot : 0;
      const v = bHit && !bHit.destroyed
        ? (((bHit.owner == null ? 0 : bHit.owner) !== own) ? { ok: false, reason: "NOT_OWNED" }
          : bHit.type === "keep" ? { ok: false, reason: "KEEP" } : { ok: true, reason: "OK" })
        : null;
      if (v && v.ok) {
        if (mpSession) { mpSend("demolish", { bld: bHit.id }); }
        else playerCmd( { kind: "demolish", bld: bHit.id }, state.tick);
        pendingKind = null;
        sound.ack("place");
      } else if (v) {
        statusEl.textContent = DEMOLISH_FA[v.reason] || v.reason;
        sound.ack("deny");
      } else {
        pendingKind = null;
      }
      refreshPanel();
      return;
    }
    // انتخاب یگان خودی (0.16.0): کلیک = تک‌انتخاب (تکرار = لغو)؛
    // شیفت+کلیک = افزودن/حذف ضامن به مجموعه انتخاب. در MP فقط یگان خودی.
    if (uHit && ownUnit(uHit)) {
      if (e.shiftKey) {
        selIds = toggleInSet(selIds, uHit.id);
      } else {
        selIds = (selIds.length === 1 && selIds[0] === uHit.id) ? [] : [uHit.id];
      }
      // در MP انتخابِ واحد чужی قاطی نشود
      if (mpSession) selIds = selIds.filter((id) => {
        const u = state.units.find((x) => x.id === id && !x.dead);
        return u && (u.owner == null ? 0 : u.owner) === mpSession.slot;
      });
      pendingKind = null;
      refreshPanel();
      return;
    }
    // دستور جمعی به یگان‌های منتخب زنده (فقط خودی)
    const sels = resolveSet(selIds, state.units).filter((u) => !mpSession || (u.owner == null ? 0 : u.owner) === mpSession.slot);
    if (sels.length) {
      const ids = sels.map((u) => u.id);
      if (uHit && !ownUnit(uHit)) {
        if (mpSession) { mpSend("order", { ids, kind: "attackmove", c: cell.c, r: cell.r }); pendingKind = null; sound.ack("order"); refreshPanel(); return; }
        playerCmd( { kind: "order", orderKind: "attackmove", ids, c: cell.c, r: cell.r }, state.tick); // حمله به دشمن
        pendingKind = null;
        sound.ack("order");
        refreshPanel();
        return;
      }
      // دروازه سالم (0.13.0): کلیک = باز/بسته (مثل ساختمان، مقصد دستور نیست).
      if (bHit && bHit.type === "gate" && !bHit.destroyed && ownBld(bHit)) {
        if (mpSession) { mpSend("gate", { bld: bHit.id }); pendingKind = null; sound.ack("place"); refreshPanel(); return; }
        playerCmd( { kind: "gate", bld: bHit.id }, state.tick);
        pendingKind = null;
        sound.ack("place");
        refreshPanel();
        return;
      }
      // نگهبانی (0.15.0): در حالت pending، کلیک روی ساختمان = پاسگاه جمعی.
      if (pendingKind === "guard") {
        if (bHit && !bHit.destroyed && ownBld(bHit)) {
          if (mpSession) { mpSend("guard", { ids, bld: bHit.id }); pendingKind = null; sound.ack("order"); refreshPanel(); return; }
          playerCmd( { kind: "guard", ids, bld: bHit.id }, state.tick);
          sound.ack("order");
        }
        pendingKind = null;
        refreshPanel();
        return;
      }
      // گاریسون (0.45.0): در حالت pending، کلیک روی برج خودی = استقرار جمعی.
      if (pendingKind === "garrison") {
        if (bHit && bHit.type === "tower" && !bHit.destroyed && ownBld(bHit)) {
          if (mpSession) { mpSend("garrison", { ids, bld: bHit.id }); pendingKind = null; sound.ack("order"); refreshPanel(); return; }
          playerCmd( { kind: "garrison", ids, bld: bHit.id }, state.tick);
          sound.ack("order");
        }
        pendingKind = null;
        refreshPanel();
        return;
      }
      if (!bHit && !uHit) {
        const kind = pendingKind === "attackmove" ? "attackmove" : "move";
        if (mpSession) { mpSend("order", { ids, kind, c: cell.c, r: cell.r }); pendingKind = null; sound.ack("order"); refreshPanel(); return; }
        playerCmd( { kind: "order", orderKind: kind, ids, c: cell.c, r: cell.r }, state.tick);
        pendingKind = null;
        sound.ack("order");
        refreshPanel();
        return;
      }
      updateHover(e.clientX, e.clientY); // روی ساختمان: فقط نمایش، انتخاب می‌ماند
      return;
    }
    selIds = [];
    // دروازه سالم بدون یگان منتخب هم با کلیک باز/بسته می‌شود (فقط خودی).
    if (bHit && bHit.type === "gate" && !bHit.destroyed && ownBld(bHit)) {
      if (mpSession) { mpSend("gate", { bld: bHit.id }); pendingKind = null; sound.ack("place"); refreshPanel(); return; }
      playerCmd( { kind: "gate", bld: bHit.id }, state.tick);
      pendingKind = null;
      sound.ack("place");
      refreshPanel();
      return;
    }
    // سربازخانه خودی (0.33.0): کلیک خنثی = نوار افقی مزدورها روی نوار ساختمان (تکرار = بستن).
    if (bHit && bHit.type === "barracks" && ownBld(bHit)) {
      toggleMercs(bHit.id);
      pendingKind = null;
      refreshPanel();
      return;
    }
    // بازار خودی (0.64.0 — ب-۳): کلیک خنثی = پنل معامله روی نوار ساختمان (تکرار = بستن).
    if (bHit && bHit.type === "market" && ownBld(bHit)) {
      toggleMarket(bHit.id);
      pendingKind = null;
      refreshPanel();
      return;
    }
    const def = selectedDef();
    if (!def) { updateHover(e.clientX, e.clientY); refreshPanel(); return; } // حالت خنثی: کلیک خالی کاری نمی‌کند
    if (mpSession) { mpSend("place", { type: def.key, c: cell.c, r: cell.r }); sound.ack("place"); return; }
    playerCmd( { kind: "place", type: def.key, c: cell.c, r: cell.r }, state.tick);
    sound.ack("place");
    refreshPanel();
  });
  canvas.addEventListener("pointercancel", (e) => { if (editor) editor.painting = false; hideBox(); clearWallLine(); touchPts.delete(e.pointerId); if (touchPts.size < 2) pinchState = null; cancelLongPress(); endDrag(e); midPan = false; hover = null; });
  canvas.addEventListener("lostpointercapture", (e) => {
    if (editor) editor.painting = false;
    touchPts.delete(e.pointerId); if (touchPts.size < 2) pinchState = null; cancelLongPress();
    if (e.pointerId === activePointerId && downPos) { hideBox(); clearWallLine(); endDrag(e); midPan = false; }
  });
  window.addEventListener("blur", () => { hideBox(); clearWallLine(); touchPts.clear(); pinchState = null; cancelLongPress(); downPos = null; panning = false; midPan = false; movedFar = false; activePointerId = null; });
  // راست‌کلیک: خلع ساختمان/استخدام (انتخاب یگان می‌ماند) — راه سریع برگشت به فرمان
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (editor) return; // ویرایشگر: راست‌کلیک خلع ندارد
    selectedUnit = null; selectedKey = null; pendingKind = null; clearWallLine();
    refreshPanel();
  });
  canvas.addEventListener("pointerleave", (e) => {
    if (downPos && e.pointerId === activePointerId) return; // حین درگ (با کپچر، leave کاذب می‌آید)
    hover = null;
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const z0 = renderer.view.zoom;
    const z1 = Math.min(3, Math.max(0.3, z0 * (e.deltaY < 0 ? 1.12 : 0.89)));
    renderer.view.zoom = z1;
    renderer.markDirty();
  }, { passive: false });

  for (const b of palBtns) {
    b.addEventListener("click", () => {
      if (replayWatch) return; // تماشا: مسلح‌شدن نیست (0.49.0)
      // کلیک دوباره روی کارت فعال = خلع (برگشت به حالت انتخاب/فرمان)
      if (!selectedUnit && selectedKey === b.dataset.b) { selectedKey = null; }
      else { selectedKey = b.dataset.b; selectedUnit = null; pendingKind = null; selIds = []; }
      clearWallLine();
      refreshPanel();
    });
  }
  for (const b of unitBtns) {
    b.addEventListener("click", () => {
      if (replayWatch) return; // تماشا: استخدام نیست (0.49.0)
      if (selectedUnit === b.dataset.u) { selectedUnit = null; }
      else { selectedUnit = b.dataset.u; pendingKind = null; selIds = []; }
      refreshPanel();
    });
  }
  function paintKeyButtons() {
    for (const b of document.querySelectorAll("[data-keyact]")) {
      const a = b.dataset.keyact;
      b.textContent = `${KEY_ACTION_FA[a] || a}: ${keyRecAction === a ? "کلید را بزن…" : keyMap[a]}`;
    }
  }
  // Esc: لغو همه‌چیز — نوار مزدورها، مودال، انتخاب، حالت‌ها و ساختمان/استخدام مسلح.
  // کلیدها قابل remapاند (0.57.0 — #۲۶): cancel اضافه بر Escape همیشه کار می‌کند؛
  // pause/mute حین تایپ در ورودی‌ها شلیک نمی‌شوند.
  let keyRecAction = null; // کنش در حال ضبط کلید تازه (null = عادی)
  window.addEventListener("keydown", (e) => {
    if (e.code === keyMap.cancel || e.key === "Escape") {
      if (editor) { closeEditor(false); return; } // ویرایشگر: خروج به منو (0.51.0)
      if (replayWatch) { exitWatch(true); return; } // تماشا: خروج به منو (0.49.0)
      if (!$("mercsOverlay").hidden) hideMercs();
      if ($("marketOverlay") && !$("marketOverlay").hidden) hideMarket();
      if (modalOverlay && !modalOverlay.hidden) closeModal();
      selIds = []; pendingKind = null; selectedUnit = null; selectedKey = null; clearWallLine(); refreshPanel();
      return;
    }
    const tag = (e.target && e.target.tagName) || "";
    // دکمه فوکوس‌شده فعال‌سازی بومی خودش را دارد (Space/Enter) — میان‌بر نزن تا دو بار عمل نکند.
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) return;
    if (e.code === keyMap.pause) {
      e.preventDefault();
      if (!mpSession) pauseBtn.click();
    } else if (e.code === keyMap.mute) {
      e.preventDefault();
      soundIconBtn.click();
    } else if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") {
      // گروه‌های کنترلی (0.59.0 — رتبه ۱ SOURCE-REVIEW): Ctrl+شماره = ذخیره
      // منتخب‌های فعلی، شماره خالی = فراخوانی. گذرا و UI-side (sim بی‌خبر).
      if (editor || replayWatch) return;
      const slot = Number(e.code.slice(5));
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const ids = selUnits().map((u) => u.id);
        if (!ids.length) { statusEl.textContent = "گروه ذخیره نشد — اول یگان انتخاب کن"; return; }
        ctrlGroups = saveGroup(ctrlGroups, slot, ids);
        statusEl.textContent = `گروه ${slot} ذخیره شد (${ids.length} یگان)`;
      } else {
        const ids = recallGroup(ctrlGroups, slot, state.units);
        if (!ids.length) { statusEl.textContent = `گروه ${slot} خالی است (Ctrl+${slot} ذخیره می‌کند)`; return; }
        const byId = new Map(state.units.map((u) => [u.id, u]));
        selIds = ids.filter((id) => {
          const u = byId.get(id);
          if (!u || u.dead) return false;
          if (mpSession && (u.owner == null ? 0 : u.owner) !== mpSession.slot) return false;
          return true;
        });
        pendingKind = null;
        statusEl.textContent = `گروه ${slot}: ${selIds.length} یگان`;
        refreshPanel();
      }
    }
  });
  // ضبط کلید تازه (capture + توقف انتشار تا هندلر اصلی نبیند).
  window.addEventListener("keydown", (e) => {
    if (!keyRecAction) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key !== "Escape" && validKeyCode(e.code)) {
      keyMap[keyRecAction] = e.code;
      try { localStorage.setItem("scw.keys", JSON.stringify(keyMap)); } catch (_) {}
    }
    keyRecAction = null;
    paintKeyButtons();
  }, { capture: true });
  // مودال‌های نوار پایین (0.31.0): کارت‌های ذخیره/راهنما/آنلاین از پنل کناری
  // به جعبه‌های مودال می‌روند و با آیکون‌های انتهای چپ استاتوس‌بار باز می‌شوند.
  // همان گره‌ها جابه‌جا می‌شوند، پس همه سیم‌کشی‌ها (ذخیره/تالار/…) سر جایشان‌اند.
  const modalOverlay = $("modalOverlay");
  const modals = { tax: $("taxModal"), save: $("saveModal"), help: $("helpModal"), online: $("onlineModal") };
  $("taxModal").appendChild($("taxCard"));
  $("saveModal").appendChild($("saveCard"));
  $("helpModal").appendChild($("helpCard"));
  $("onlineModal").appendChild($("onlineCard"));
  function openModal(key) {
    for (const [k, el] of Object.entries(modals)) el.hidden = k !== key;
    modalOverlay.hidden = false;
  }
  function closeModal() { modalOverlay.hidden = true; }
  function toggleModal(key) {
    if (!modalOverlay.hidden && !modals[key].hidden) closeModal();
    else openModal(key);
  }
  $("saveIconBtn").addEventListener("click", () => toggleModal("save"));
  $("helpIconBtn").addEventListener("click", () => toggleModal("help"));
  $("taxIconBtn").addEventListener("click", () => toggleModal("tax"));
  // صدا (0.48.0): دکمه بی‌صدا/باصدا با ماندگاری localStorage؛ شروع واقعی
  // AudioContext با اولین ژست (pointerdown سراسری) است، این دکمه فقط mute است.
  const soundIconBtn = $("soundIconBtn");
  function paintSoundBtn() {
    soundIconBtn.textContent = sound.volumes.muted ? "🔇" : "🔊";
    soundIconBtn.title = sound.volumes.muted ? "بی‌صدا — کلیک: روشن" : "باصدا — کلیک: بی‌صدا";
  }
  paintSoundBtn();
  soundIconBtn.addEventListener("click", () => {
    sound.setMuted(!sound.volumes.muted);
    paintSoundBtn();
    sound.ack("place");
  });
  $("mercsClose").addEventListener("click", () => { hideMercs(); refreshPanel(); });
  // لغو سفارش آموزش (0.65.0): دکمه ✕ هر ردیف صف — بازپرداخت کامل با سقف.
  $("mercsOverlay").addEventListener("click", (e) => {
    const t = e.target && e.target.closest ? e.target.closest("[data-tcancel]") : null;
    if (!t) return;
    if (replayWatch) return; // تماشا: لغو نیست (0.49.0)
    const idx = Number(t.dataset.tcancel);
    if (mercsFor == null || !Number.isInteger(idx)) return;
    if (mpSession) { mpSend("trainCancel", { bld: mercsFor, idx }); sound.ack("place"); return; }
    playerCmd({ kind: "trainCancel", bld: mercsFor, idx }, state.tick);
    sound.ack("place");
    refreshPanel();
  });
  $("marketClose").addEventListener("click", () => { hideMarket(); refreshPanel(); });
  $("marketOverlay").addEventListener("click", (e) => {
    const t = e.target && e.target.closest ? e.target.closest("[data-trade]") : null;
    if (!t || t.disabled) return;
    if (replayWatch) return; // تماشا: معامله نیست (0.49.0)
    const parts = String(t.dataset.trade).split(":");
    const dir = parts[0], res = parts[1];
    if (mpSession) { mpSend("trade", { res, dir }); sound.ack("place"); return; }
    playerCmd({ kind: "trade", res, dir }, state.tick);
    sound.ack("place");
    refreshPanel();
  });
  const onlineIconBtn = $("onlineIconBtn");
  onlineIconBtn.addEventListener("click", () => toggleModal("online"));
  // آیکون آنلاین فقط وقتی که اتصال هست (آینه hidden کارت تالار)
  onlineIconBtn.hidden = $("onlineCard").hidden;
  new MutationObserver(() => { onlineIconBtn.hidden = $("onlineCard").hidden; })
    .observe($("onlineCard"), { attributes: true, attributeFilter: ["hidden"] });
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay || e.target.closest("[data-close]")) closeModal();
  });
  // کارت یگان: موضع + دستورهای فوری
  const unitCard = $("unitCard"), unitNameEl = $("unitNameEl"), unitHpEl = $("unitHpEl");
  const stanceEngageBtn = $("stanceEngageBtn"), stanceHoldBtn = $("stanceHoldBtn");
  const attackMoveBtn = $("attackMoveBtn"), retreatBtn = $("retreatBtn"), guardBtn = $("guardBtn"), garrisonBtn = $("garrisonBtn"), deployBtn = $("deployBtn"), unitOrderEl = $("unitOrderEl");
  function selUnit() {
    const s = resolveSet(selIds, state.units);
    return s[0] || null;
  }
  function selUnits() {
    const all = resolveSet(selIds, state.units);
    if (!mpSession) return all;
    return all.filter((u) => (u.owner == null ? 0 : u.owner) === mpSession.slot);
  }
  stanceEngageBtn.addEventListener("click", () => {
    if (mpSession) { const ids = selUnits().map((u) => u.id); if (ids.length) mpSend("stance", { ids, stance: "engage" }); return; }
    const ids = selUnits().map((u) => u.id);
    if (ids.length) playerCmd( { kind: "stance", ids, stance: "engage" }, state.tick);
    refreshPanel();
  });
  stanceHoldBtn.addEventListener("click", () => {
    if (mpSession) { const ids = selUnits().map((u) => u.id); if (ids.length) mpSend("stance", { ids, stance: "hold" }); return; }
    const ids = selUnits().map((u) => u.id);
    if (ids.length) playerCmd( { kind: "stance", ids, stance: "hold" }, state.tick);
    refreshPanel();
  });
  attackMoveBtn.addEventListener("click", () => {
    pendingKind = pendingKind === "attackmove" ? null : "attackmove";
    refreshPanel();
  });
  // نگهبانی (0.15.0): تک‌بار — کلیک بعدی روی ساختمان، پاسگاه می‌شود.
  guardBtn.addEventListener("click", () => {
    if (!selUnit()) return;
    pendingKind = pendingKind === "guard" ? null : "guard";
    refreshPanel();
  });
  // گاریسون برج (0.45.0): تک‌بار — کلیک بعدی روی برج خودی، استقرار جمعی است.
  if (garrisonBtn) garrisonBtn.addEventListener("click", () => {
    const sels = selUnits();
    if (!sels.some((u) => u.garrisonTower == null && canGarrisonType(u.type))) {
      statusEl.textContent = "استقرار: یک یگان دوربرد آزاد (کماندار/زوبین‌دار/سواره) انتخاب کن";
      return;
    }
    pendingKind = pendingKind === "garrison" ? null : "garrison";
    refreshPanel();
  });
  // استقرار منجنیق (0.46.0): آنی (تک‌بار نیست) — جمع/باز کردن منتخب‌ها.
  if (deployBtn) deployBtn.addEventListener("click", () => {
    const sels = selUnits().filter((u) => UNITS[u.type].needsDeploy);
    if (!sels.length) return;
    if (mpSession) {
      mpSend("deploy", { ids: sels.map((u) => u.id) });
      pendingKind = null;
      refreshPanel();
      return;
    }
    playerCmd( { kind: "deploy", ids: sels.map((u) => u.id) }, state.tick);
    pendingKind = null;
    refreshPanel();
  });
  retreatBtn.addEventListener("click", () => {
    if (mpSession) { const ids = selUnits().map((u) => u.id); if (ids.length) mpSend("retreat", { ids }); pendingKind = null; refreshPanel(); return; }
    const ids = selUnits().map((u) => u.id);
    if (ids.length) playerCmd( { kind: "retreat", ids }, state.tick);
    pendingKind = null;
    refreshPanel();
  });
  waveBtn.addEventListener("click", () => {
    if (mpSession) return; // در نبرد رقابتی موج خنثی نداریم
    const n = spawnWave(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H);
    if (n === 0) state.events.push("جایی برای ورود دشمن نیست!");
    refreshPanel();
  });
  // زنگ خطر (0.17.0): تک‌بار و سراسری — کلیک بعدی روی نقشه = تجمع ارتش.
  alarmBtn.addEventListener("click", () => {
    if (replayWatch) return; // تماشا (0.49.0)
    selectedUnit = null; // حالت استخدام با زنگ جمع نمی‌شود
    pendingKind = pendingKind === "alarm" ? null : "alarm";
    refreshPanel();
  });
  // تخریب دستی (0.39.0): تک‌بار و سراسری — کلیک بعدی روی ساختمان خودی (غیر ستاد).
  demolishBtn.addEventListener("click", () => {
    if (replayWatch) return; // تماشا (0.49.0)
    selectedUnit = null;
    selectedKey = null;
    pendingKind = pendingKind === "demolish" ? null : "demolish";
    refreshPanel();
  });
  for (const b of taxBtns) {
    b.addEventListener("click", () => {
      if (replayWatch) return; // تماشا (0.49.0)
      if (mpSession) { mpSend("tax", { v: b.dataset.tax }); return; }
      playerCmd( { kind: "tax", v: b.dataset.tax }, state.tick);
      refreshPanel();
    });
  }
  for (const b of ratBtns) {
    b.addEventListener("click", () => {
      if (replayWatch) return; // تماشا (0.49.0)
      if (mpSession) { mpSend("rations", { v: b.dataset.rat }); return; }
      playerCmd( { kind: "rations", v: b.dataset.rat }, state.tick);
      refreshPanel();
    });
  }
  pauseBtn.addEventListener("click", () => { if (mpSession) return; state.paused = !state.paused; refreshPanel(); });
  speedBtn.addEventListener("click", () => {
    if (mpSession) return;
    const i = CONFIG.SPEEDS.indexOf(state.speed);
    state.speed = CONFIG.SPEEDS[(i + 1) % CONFIG.SPEEDS.length];
    refreshPanel();
  });
  resetBtn.addEventListener("click", () => {
    if (mpSession) { try { lobby.leave(); } catch (e) {} return; }
    newGame();
  });
  defeatRestartBtn.addEventListener("click", () => {
    if (mpSession) { try { lobby.leave(); } catch (e) {} return; }
    newGame();
  });
  victoryRestartBtn.addEventListener("click", () => {
    if (mpSession) { try { lobby.leave(); } catch (e) {} return; }
    newGame();
  });

  // شروع تازه (0.19.0): وضعیت نو + ستاد آغازین؛ دکمه‌های شروع دوباره همین‌اند.
  // در MP صدا زده نمی‌شود (خروج از اتاق مسیر جداست)؛ برای اطمینان session را تمیز می‌کند.
  // seed داده شود نقشه همان سید ساخته می‌شود، وگرنه سید فعلی حفظ می‌شود (0.26.0).
  // diff درجه سختی حریف است (0.50.0)؛ داده نشود همان انتخاب ذخیره‌شده می‌ماند.
  // custom نقشه سفارشی است (0.51.0: {name, patches})؛ داده نشود زمین خالص سیدی.
  function newGame(seed, diff, custom, personality) {
    mpSession = null;
    mpPending.clear();
    mpNextSeq = 1;
    mpHashes.clear();
    mpDesync = null;
    cmdQueue = createQueue(); // صف گذراست — با بازی تازه دور انداخته می‌شود
    if (diff && CONFIG.AI.difficulties[diff]) {
      soloDiff = diff;
      try { localStorage.setItem("scw.difficulty", diff); } catch (e) {}
    }
    if (personality && CONFIG.AI.personalities[personality]) {
      soloPersonality = personality;
      try { localStorage.setItem("scw.personality", personality); } catch (e) {}
    }
    if (editor) closeEditor(true); // بازی تازه از داخل ویرایشگر = خروج خاموش
    const s = (seed == null ? state.mapSeed : seed) >>> 0 || CONFIG.MAP_SEED;
    // شروع دوباره روی نقشه سفارشی: وصله‌ها از بازی جاری به ارث می‌رسند (0.52.0؛
    // فقط وقتی سید تازه داده نشده — seedApply با سید صریح زمین خالص می‌سازد).
    const inherit = (seed == null && !custom && state.mapPatches && state.mapPatches.length)
      ? { name: state.mapName, patches: state.mapPatches } : null;
    const eff = custom || inherit;
    const patches = eff && Array.isArray(eff.patches) && eff.patches.length ? eff.patches : null;
    terrain = patches ? customTerrain(s, patches) : makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, s);
    state = createState();
    state.mapSeed = s;
    // نام نقشه (0.51.0 سفارشی، 0.52.0 نام‌دار): صریح > سید کاتالوگ > خالی.
    state.mapName = eff && eff.name ? String(eff.name) : mapNameFor(s);
    state.mapPatches = patches ? patches.map((e) => [e[0], e[1]]) : null;
    recLog = createRecorder(s, soloDiff, patches ? { name: state.mapName, patches } : null, soloPersonality); // ضبط ری‌پلی تازه (0.49.0؛ درجه از 0.50.0؛ نقشه از 0.51.0؛ شخصیت از 0.56.0)
    replayWatch = null;
    hideReplayBar();
    placeKeep(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H);
    spawnLord(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H); // ارباب آغازین (0.22.0)
    startAI(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, soloDiff, soloPersonality); // حریف سولو (0.42.0؛ جا نبود = بی‌حریف)
    online.onNewGame(); // پیروزی بازی تازه هنوز ثبت نشده (0.23.0)
    clock.reset();
    lastAutoTick = 0;
    lastSoundSnap = null; // baseline صدا تازه شود تا سیل رویداد ندهد (0.48.0)
    hover = null;
    selIds = []; ctrlGroups = freshGroups();
    pendingKind = null;
    tickEl.textContent = "تیک 0";
    paintSeed();
    refreshPanel();
    paintReplayStatus();
  }

  // ---- ری‌پلی: تماشا (0.49.0 — #۲۱ از FEATURES) ----
  function replayLogOf(rec, uptoTick) {
    const out = { v: 1, seed: rec.seed >>> 0, diff: rec.diff || soloDiff || "normal",
      pers: rec.pers || soloPersonality || CONFIG.AI.defaultPersonality,
      cmds: rec.cmds.map((e) => ({ t: e.t, cmd: e.cmd })), ticks: uptoTick | 0 };
    if (rec.map) out.map = { name: rec.map.name, patches: rec.map.patches.map((e) => [e[0], e[1]]) };
    return out;
  }
  function startWatch(log, label) {
    const v = validateReplayLog(log);
    if (!v.ok) return v;
    if (editor) closeEditor(true); // تماشا از داخل ویرایشگر = خروج خاموش (0.51.0)
    const fresh = newSoloFromSeed(log.seed, log.diff,
      log.map ? log.map.patches : null, log.map ? log.map.name : "", log.pers);
    mpSession = null;
    mpPending.clear();
    mpNextSeq = 1;
    mpHashes.clear();
    mpDesync = null;
    cmdQueue = createQueue();
    state = fresh.state;
    terrain = fresh.terrain;
    recLog = null; // تماشا ضبط نمی‌شود
    online.onNewGame();
    clock.reset();
    lastAutoTick = 0;
    lastSoundSnap = null;
    hover = null;
    selIds = []; ctrlGroups = freshGroups();
    selectedKey = null;
    selectedUnit = null;
    pendingKind = null;
    clearWallLine();
    hideMercs(); hideMarket();
    state.paused = false;
    state.speed = 1;
    replayWatch = {
      cmds: log.cmds.slice().sort((a, b) => a.t - b.t),
      i: 0,
      upto: Math.max(0, log.ticks | 0 || 0),
      label: label || "ری‌پلی",
    };
    hideMenu();
    tickEl.textContent = "تیک 0";
    paintSeed();
    refreshPanel();
    paintReplayBar();
    return { ok: true, reason: "OK" };
  }
  function exitWatch(toMenu) {
    replayWatch = null;
    hideReplayBar();
    if (toMenu) { showMenu(); }
    else { newGame(); showMenu(); }
    refreshPanel();
  }
  function paintReplayBar() {
    const bar = $("replayBar");
    if (!bar) return;
    if (!replayWatch) { bar.hidden = true; return; }
    bar.hidden = false;
    const done = state.tick >= replayWatch.upto;
    const lbl = $("replayBarTxt");
    if (lbl) lbl.textContent = `📼 ${replayWatch.label}: تیک ${faNum(state.tick)} از ${faNum(replayWatch.upto)}${done ? " — پایان" : ""} (ورودی بسته است؛ Esc = خروج)`;
  }
  function hideReplayBar() {
    replayWatch = null;
    const bar = $("replayBar");
    if (bar) bar.hidden = true;
  }
  function applyLoaded(s, label) {
    state = s;
    recLog = null; // بازی بارگذاری‌شده: تاریخ پیش از load نیست پس ری‌پلی ندارد (0.49.0)
    replayWatch = null;
    hideReplayBar();
    if (editor) closeEditor(true); // بارگذاری از داخل ویرایشگر = خروج خاموش
    cmdQueue = createQueue(); // فرمان‌های معوق بازی قبلی در بازی تازه اجرا نشوند
    // زمینِ سیدِ ذخیره را بازسازی کن (ذخیره قدیمی بدون سید → پیش‌فرض؛
    // نقشه سفارشی 0.51.0 با وصله‌ها روی همان سید).
    const ls = (s.mapSeed == null ? CONFIG.MAP_SEED : s.mapSeed) >>> 0 || CONFIG.MAP_SEED;
    terrain = s.mapPatches && s.mapPatches.length
      ? customTerrain(ls, s.mapPatches)
      : makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, ls);
    online.onNewGame(s.victorious === true); // بردِ قدیمیِ بارگذاری‌شده دوباره جشن گرفته نشود (0.23.0)
    clock.reset();
    lastAutoTick = s.tick;
    lastSoundSnap = null; // baseline صدا تازه شود (0.48.0)
    hover = null;
    selIds = []; ctrlGroups = freshGroups();
    pendingKind = null;
    tickEl.textContent = "تیک " + s.tick;
    paintSeed();
    refreshPanel();
    paintReplayStatus();
    saveStatus.textContent = `${label}: تیک ${s.tick} (سید ${s.mapSeed >>> 0})`;
  }

  // ---- کارت نقشه: سید (0.26.0) ----
  function parseSeed(v) {
    const n = typeof v === "number" ? v : parseInt(String(v == null ? "" : v).replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n) || n < 1 || n > 4294967295) return null;
    return n >>> 0;
  }
  function randomSeed() {
    let s = 0;
    while (s === 0) s = (Math.random() * 4294967296) >>> 0;
    return s;
  }
  function paintSeed() {
    const el = $("seedCurEl");
    if (el) el.textContent = state.mapName
      ? `سید ${state.mapSeed >>> 0} • ${state.mapName}`
      : String(state.mapSeed >>> 0);
    const mpIn = $("mpSeedInput");
    if (mpIn && document.activeElement !== mpIn && !mpIn.value) mpIn.value = String(state.mapSeed >>> 0);
  }
  (function wireSeedCard() {
    const inp = $("seedInput");
    const apply = $("seedApplyBtn"), rnd = $("seedRandomBtn");
    const say = (m) => {
      saveStatus.textContent = m;
      const mm = $("menuMsgEl");
      if (mm) mm.textContent = m;
    };
    // سید صریح = حالت سفارشی (0.52.0): سلکت نقشه نام‌دار خلع می‌شود.
    const toCustom = () => {
      soloMapKey = "custom";
      try { localStorage.setItem("scw.map", "custom"); } catch (e) {}
      const ms = $("mapSel");
      if (ms) ms.value = "custom";
    };
    if (apply) apply.addEventListener("click", () => {
      if (mpSession) { say("در نبرد سید عوض نمی‌شود"); return; }
      const s = parseSeed(inp && inp.value);
      if (s == null) { say("سید باید عدد ۱ تا ۴۲۹۴۹۶۷۲۹۵ باشد"); return; }
      toCustom();
      newGame(s);
      say(`نقشه تازه با سید ${s} ساخته شد — «شروع تک‌نفره» را بزن`);
    });
    if (rnd) rnd.addEventListener("click", () => {
      if (mpSession) { say("در نبرد سید عوض نمی‌شود"); return; }
      const s = randomSeed();
      toCustom();
      newGame(s);
      if (inp) inp.value = "";
      say(`نقشه تازه با سید ${s} ساخته شد — «شروع تک‌نفره» را بزن`);
    });
    paintSeed();
  })();

  // ---- پروفایل + منوی شروع (0.27.0) ----
  function menuMsg(m) {
    const el = $("menuMsgEl");
    if (el) el.textContent = m || "";
  }
  let menuStarted = false; // پس از نخستین شروع، «بازگشت به بازی» فعال می‌شود
  function showMenu() {
    if (!mpSession) state.paused = true; // بازی پشت منو متوقف می‌ماند
    const ms = $("menuScreen");
    if (ms) ms.hidden = false;
    const mc = $("menuCloseBtn");
    if (mc) mc.hidden = !menuStarted && !mpSession;
    menuMsg("");
    refreshPanel();
  }
  function hideMenu() {
    const ms = $("menuScreen");
    if (ms) ms.hidden = true;
    menuStarted = true;
    const mc = $("menuCloseBtn");
    if (mc) mc.hidden = false;
    if (!mpSession && !state.defeated && !state.victorious) state.paused = false;
    renderer.resize();
    renderer.fit();
    menuMsg("");
    refreshPanel();
  }
  function syncProfileInput() {
    const inp = $("profileNameInput");
    if (inp && document.activeElement !== inp) inp.value = profile.name;
    paintBadge();
    const grid = $("profileLogoGrid");
    if (grid) {
      for (const btn of grid.querySelectorAll("[data-logo]")) {
        btn.classList.toggle("sel", (btn.dataset.logo | 0) === profile.logo);
      }
    }
  }
  (function wireProfile() {
    const inp = $("profileNameInput");
    if (inp) {
      inp.value = profile.name;
      inp.addEventListener("change", () => {
        const v = validProfileName(inp.value);
        if (v === null) {
          inp.value = profile.name;
          menuMsg("نام باید ۱ تا ۱۲ نویسه (فارسی/لاتین/رقم/فاصله/خط) باشد");
          return;
        }
        const saved = saveProfile({ name: v, logo: profile.logo });
        if (saved) {
          profile = saved;
          menuMsg("");
          try { if (lobby.isInRoom()) lobby.updateProfile(); } catch (e) {}
        }
        syncProfileInput();
      });
    }
    const grid = $("profileLogoGrid");
    if (grid) {
      grid.innerHTML = "";
      PROFILE_LOGOS.forEach((emoji, i) => {
        const btn = document.createElement("button");
        btn.dataset.logo = i;
        btn.textContent = emoji;
        btn.title = `لوگوی ${i + 1}`;
        btn.addEventListener("click", () => {
          const saved = saveProfile({ name: profile.name, logo: i });
          if (saved) {
            profile = saved;
            try { if (lobby.isInRoom()) lobby.updateProfile(); } catch (e) {}
          }
          syncProfileInput();
        });
        grid.appendChild(btn);
      });
    }
    syncProfileInput();
  })();
  (function wireMenu() {
    const solo = $("soloBtn"), close = $("menuCloseBtn"), mb = $("menuBtn"), badge = $("profileBadgeEl");
    const diffSel = $("diffSel");
    // درجه سختی (0.50.0): انتخاب در localStorage می‌ماند و با شروع تک‌نفره اعمال می‌شود.
    if (diffSel) {
      diffSel.value = soloDiff;
      diffSel.addEventListener("change", () => {
        if (CONFIG.AI.difficulties[diffSel.value]) {
          soloDiff = diffSel.value;
          try { localStorage.setItem("scw.difficulty", soloDiff); } catch (e) {}
        } else {
          diffSel.value = soloDiff;
        }
      });
    }
    // نقشه نام‌دار (0.52.0): سلکت گزینه‌ها را می‌سازد؛ انتخاب = پرکردن ورودی
    // سید + ماندگاری؛ شروع از ورودی خوانده می‌شود (نام در newGame از کاتالوگ).
    const mapSel = $("mapSel");
    if (mapSel) {
      mapSel.innerHTML = "";
      const oc = document.createElement("option");
      oc.value = "custom";
      oc.textContent = "سفارشی (سید دستی/تصادفی)";
      mapSel.appendChild(oc);
      for (const m of CONFIG.MAPS) {
        const o = document.createElement("option");
        o.value = m.key;
        o.textContent = `${m.name} (سید ${m.seed})`;
        mapSel.appendChild(o);
      }
      mapSel.value = soloMapKey;
      const nm0 = namedMapByKey(soloMapKey);
      const inp0 = $("seedInput");
      if (nm0 && inp0 && !inp0.value) inp0.value = String(nm0.seed);
      mapSel.addEventListener("change", () => {
        const nm = namedMapByKey(mapSel.value);
        soloMapKey = nm ? nm.key : "custom";
        try { localStorage.setItem("scw.map", soloMapKey); } catch (e) {}
        const inp = $("seedInput");
        if (inp && nm) inp.value = String(nm.seed);
      });
    }
    // شخصیت حریف (0.56.0): گزینه‌ها از CONFIG ساخته می‌شوند؛ انتخاب = ماندگاری.
    const persSel = $("persSel");
    if (persSel) {
      persSel.innerHTML = "";
      for (const [key, p] of Object.entries(CONFIG.AI.personalities)) {
        const o = document.createElement("option");
        o.value = key;
        o.textContent = `${p.name} — ${p.desc}`;
        persSel.appendChild(o);
      }
      persSel.value = soloPersonality;
      persSel.addEventListener("change", () => {
        if (CONFIG.AI.personalities[persSel.value]) {
          soloPersonality = persSel.value;
          try { localStorage.setItem("scw.personality", soloPersonality); } catch (e) {}
        } else {
          persSel.value = soloPersonality;
        }
      });
    }
    // دسترس‌پذیری (0.57.0 — #۲۶): پالت/مقیاس/کلیدها — انتخاب = اعمال + ماندگاری.
    const palSel = $("a11yPalSel");
    if (palSel) {
      palSel.innerHTML = "";
      for (const [key, p] of Object.entries(A11Y_PALETTES)) {
        const o = document.createElement("option");
        o.value = key;
        o.textContent = p.name;
        palSel.appendChild(o);
      }
      palSel.value = a11yPalette;
      palSel.addEventListener("change", () => {
        a11yPalette = validPalette(palSel.value);
        palSel.value = a11yPalette;
        try { localStorage.setItem("scw.a11y", a11yPalette); } catch (e) {}
        applyA11y();
      });
    }
    const scaleSel = $("a11yScaleSel");
    if (scaleSel) {
      scaleSel.value = String(uiScale);
      scaleSel.addEventListener("change", () => {
        uiScale = clampScale(scaleSel.value);
        scaleSel.value = String(uiScale);
        try { localStorage.setItem("scw.uiscale", String(uiScale)); } catch (e) {}
        applyA11y();
      });
    }
    for (const b of document.querySelectorAll("[data-keyact]")) {
      b.addEventListener("click", () => {
        const a = b.dataset.keyact;
        keyRecAction = keyRecAction === a ? null : a; // کلیک دوباره = انصراف
        paintKeyButtons();
      });
    }
    paintKeyButtons();
    applyA11y(); // نشست اولیه روی بوت (ماندگاری‌های قبلی)
    // کیفیت رسم (0.58.0 — #۲۷): سلکت + نشست اولیه روی renderer.
    const fidSel = $("fidSel");
    if (fidSel) {
      fidSel.value = fidelity;
      fidSel.addEventListener("change", () => applyFidelity(fidSel.value, false));
    }
    applyFidelity(fidelity, true);
    if (solo) solo.addEventListener("click", () => {
      if (mpSession) { menuMsg("اول از اتاق چندنفره خارج شو"); return; }
      const inp = $("seedInput");
      const typed = inp && inp.value ? inp.value.trim() : "";
      const diff = diffSel && CONFIG.AI.difficulties[diffSel.value] ? diffSel.value : soloDiff;
      const pers = persSel && CONFIG.AI.personalities[persSel.value] ? persSel.value : soloPersonality;
      const ms = $("mapSel");
      const named = ms ? namedMapByKey(ms.value) : null;
      if (typed) {
        const s = parseSeed(typed);
        if (s == null) { menuMsg("سید باید عدد ۱ تا ۴۲۹۴۹۶۷۲۹۵ باشد"); return; }
        newGame(s, diff, undefined, pers); // نام (کاتالوگ/خالی) در newGame حل می‌شود
      } else if (named) {
        newGame(named.seed, diff, undefined, pers);
      } else {
        newGame(undefined, diff, undefined, pers);
      }
      state.paused = false;
      hideMenu();
    });
    if (close) close.addEventListener("click", hideMenu);
    if (mb) mb.addEventListener("click", showMenu);
    if (badge) badge.addEventListener("click", showMenu);
    // تماشای ری‌پلی ذخیره‌شده از منو (0.49.0)
    const mrp = $("menuReplayBtn");
    if (mrp) mrp.addEventListener("click", () => {
      if (mpSession) { menuMsg("اول از اتاق چندنفره خارج شو"); return; }
      const saved = loadReplaySlot();
      if (!saved) { menuMsg("ری‌پلی ذخیره‌شده‌ای نیست — اول یک بازی تازه کن و از کارت ذخیره «ذخیره ری‌پلی» را بزن"); return; }
      const r = startWatch(saved, "ری‌پلی ذخیره‌شده");
      if (!r.ok) menuMsg("خطا: " + r.reason);
    });
  })();

  saveBtn.addEventListener("click", () => {
    if (mpSession) return; // در MP ذخیره نداریم
    const json = serializeJSON(state);
    const tickNow = state.tick;
    saveStatus.textContent = "در حال ذخیره…";
    saveSlot(SLOTS.manual, json).then((r) => {
      saveStatus.textContent = r.ok
        ? `دستی: تیک ${tickNow} (${r.bytes} بایت)`
        : `خطا: ${SAVE_FA[r.error] || r.error}`;
    });
  });
  loadBtn.addEventListener("click", () => {
    if (mpSession) return;
    saveStatus.textContent = "در حال بارگذاری…";
    loadSlot(SLOTS.manual).then((r) => {
      if (r.ok) {
        try {
          applyLoaded(deserializeJSON(r.text), "دستی بارگذاری شد");
        } catch (e) {
          saveStatus.textContent = `خطا: ${e instanceof SaveError ? SAVE_FA[e.code] : e}`;
        }
        return;
      }
      // اگر دستی خالی است، خودکار را امتحان کن
      loadSlot(SLOTS.auto).then((a) => {
        if (!a.ok) {
          saveStatus.textContent = `خطا: ${SAVE_FA[r.error] || r.error}`;
          return;
        }
        try {
          applyLoaded(deserializeJSON(a.text), "خودکار بارگذاری شد");
        } catch (e) {
          saveStatus.textContent = `خطا: ${e instanceof SaveError ? SAVE_FA[e.code] : e}`;
        }
      });
    });
  });
  delBtn.addEventListener("click", () => {
    saveStatus.textContent = "در حال حذف…";
    deleteSlot(SLOTS.manual).then(() => deleteSlot(SLOTS.auto)).then(() => {
      saveStatus.textContent = "ذخیره‌ها حذف شدند";
    });
  });
  // ---- ذخیره ابری (0.67.0 — انتخاب ۳-الف): همان JSON محلی روی سرور، با عبارت کاربر ----
  const cloud = initCloud();
  const cloudStatus = $("cloudStatus"), cloudKeyInput = $("cloudKeyInput");
  try {
    const savedKey = localStorage.getItem(CLOUD_STORE_KEY);
    if (savedKey && cloudKeyInput) cloudKeyInput.value = savedKey;
  } catch (e) {}
  if (cloudKeyInput) {
    cloudKeyInput.addEventListener("change", () => {
      try { localStorage.setItem(CLOUD_STORE_KEY, cloudKeyInput.value); } catch (e) {}
    });
  }
  const cloudSay = (m) => { if (cloudStatus) cloudStatus.textContent = m; };
  const cloudKey = () => (cloudKeyInput && cloudKeyInput.value) || "";
  $("cloudSaveBtn").addEventListener("click", async () => {
    if (mpSession) return; // در MP ابری نداریم
    const k = cloudKey();
    if (!validCloudKey(k)) { cloudSay(CLOUD_FA.BAD_KEY); return; }
    cloudSay("در حال ذخیره ابری…");
    const r = await cloud.save(k, serializeJSON(state));
    cloudSay(r.ok ? `ابری ذخیره شد (تیک ${state.tick})` : `خطا: ${CLOUD_FA[r.error] || r.error}`);
  });
  $("cloudLoadBtn").addEventListener("click", async () => {
    if (mpSession) return;
    const k = cloudKey();
    if (!validCloudKey(k)) { cloudSay(CLOUD_FA.BAD_KEY); return; }
    cloudSay("در حال بارگذاری ابری…");
    const r = await cloud.load(k);
    if (!r.ok) { cloudSay(`خطا: ${CLOUD_FA[r.error] || r.error}`); return; }
    try {
      applyLoaded(deserializeJSON(r.text), "ابری بارگذاری شد");
      cloudSay(`ابری بارگذاری شد (تیک ${state.tick})`);
    } catch (e) {
      cloudSay(`خطا: ${e instanceof SaveError ? SAVE_FA[e.code] : e}`);
    }
  });
  $("cloudDelBtn").addEventListener("click", async () => {
    if (mpSession) return;
    const k = cloudKey();
    if (!validCloudKey(k)) { cloudSay(CLOUD_FA.BAD_KEY); return; }
    cloudSay("در حال حذف ابری…");
    const r = await cloud.del(k);
    cloudSay(r.ok ? "ابری حذف شد" : `خطا: ${CLOUD_FA[r.error] || r.error}`);
  });
  // ---- ری‌پلی: ذخیره/تماشا/تأیید (0.49.0 — #۲۱ از FEATURES، فقط سولو) ----
  const replayStatus = $("replayStatus");
  function paintReplayStatus() {
    if (!replayStatus) return;
    if (mpSession) { replayStatus.textContent = "در چندنفره ری‌پلی نیست"; return; }
    const saved = loadReplaySlot();
    const cur = recLog ? `${faNum(recLog.cmds.length)} فرمان` : "ندارد (بازی بارگذاری‌شده)";
    replayStatus.textContent = `جاری: ${cur} — ذخیره‌شده: ${saved ? `${faNum(saved.cmds.length)} فرمان، تیک ${faNum(saved.ticks | 0)}${saved.verified ? " ✓" : ""}` : "ندارد"}`;
  }
  $("replaySaveBtn").addEventListener("click", () => {
    if (mpSession || replayWatch) return;
    if (!recLog) { replayStatus.textContent = "ری‌پلی فقط برای بازی تازه است (بارگذاری‌شده ندارد)"; return; }
    const log = { ...replayLogOf(recLog, state.tick), hash: stateHash(state), verified: false };
    replayStatus.textContent = `در حال تأیید ${faNum(log.cmds.length)} فرمان تا تیک ${faNum(log.ticks)}…`;
    verifyReplayAsync(log, log.ticks, log.hash, (t, upto) => {
      replayStatus.textContent = `در حال تأیید… تیک ${faNum(t)} از ${faNum(upto)}`;
    }).then((r) => {
      log.verified = r.ok;
      if (r.ok) saveReplaySlot(log);
      replayStatus.textContent = r.ok
        ? `ذخیره شد ✓ (هش یکسان تا تیک ${faNum(log.ticks)})`
        : `تأیید نشد ✗ (${r.reason || "هش متفاوت"}) — ذخیره نشد`;
      paintReplayStatus();
    });
  });
  $("replayWatchBtn").addEventListener("click", () => {
    if (mpSession || replayWatch) return;
    if (recLog && recLog.cmds.length) {
      const r = startWatch(replayLogOf(recLog, state.tick), "بازی جاری");
      if (!r.ok) replayStatus.textContent = `خطا: ${r.reason}`;
      return;
    }
    const saved = loadReplaySlot();
    if (!saved) { replayStatus.textContent = "ری‌پلی‌ای برای تماشا نیست (اول بازی تازه شروع کن)"; return; }
    const r = startWatch(saved, "ری‌پلی ذخیره‌شده");
    if (!r.ok) replayStatus.textContent = `خطا: ${r.reason}`;
  });
  $("replayExitBtn").addEventListener("click", () => exitWatch(true));

  // ---- نقشه‌ساز داخل‌بازی (0.51.0 — #۲۲ از FEATURES، الگوی CHG-043) ----
  // نقاشی مستقیم روی بوم اصلی با terrain موقت؛ بازی pause و ساختمان/یگان
  // مخفی‌اند (blankView)؛ ناوبری با نقشه کوچک + زوم. ورود/خروج همیشه از منو.
  let editor = null; // {doc, base, tile, brush, painting} یا null = بازی عادی
  const ED_ERR_FA = { KEEP: "جایی برای ستاد بازیکن نیست", LORD: "جایی برای ارباب نیست",
    AI: "ستاد حریف جا نمی‌شود", TERRAIN: "زمین خراب است" };
  function blankView() {
    return { ...state, buildings: [], units: [], fx: [] };
  }
  function edStatus(m) {
    const el = $("edStatusEl");
    if (el) el.textContent = m || "";
  }
  function edCounts() {
    if (!editor) return;
    const n = patchCount(editor.doc);
    edStatus(`«${editor.doc.name}» — سید ${faNum(editor.doc.seed)} — ${faNum(n)} وصله${n >= PATCH_CAP ? " (سقف!)" : ""}`);
  }
  function edRefreshTerrain() {
    terrain = applyPatches(editor.base, editor.doc.patches);
    renderer.markDirty();
    paintMinimap();
  }
  function syncEditorPanel() {
    if (!editor) return;
    const row = $("edTileRow");
    if (row) {
      for (const b of row.querySelectorAll("[data-etile]")) {
        b.classList.toggle("sel", String(editor.tile) === b.dataset.etile);
      }
    }
    const br = $("edBrushSel");
    if (br && document.activeElement !== br) br.value = String(editor.brush);
    const nm = $("edNameInput");
    if (nm && document.activeElement !== nm) nm.value = editor.doc.name;
    const sd = $("edSeedInput");
    if (sd && document.activeElement !== sd) sd.value = String(editor.doc.seed);
  }
  function openEditor() {
    if (mpSession) { menuMsg("نقشه‌ساز در نبرد چندنفره نیست"); return; }
    if (replayWatch) exitWatch(true);
    if (editor) return;
    const saved = loadCustomSlot();
    const doc = saved || createMapDoc("", state.mapSeed);
    editor = { doc, base: baseTerrain(doc.seed), tile: 1, brush: 4, painting: false };
    terrain = applyPatches(editor.base, doc.patches);
    selectedKey = null; selectedUnit = null; pendingKind = null; selIds = [];
    hover = null;
    hideMercs(); hideMarket(); clearWallLine(); hideBox();
    hideMenu();
    state.paused = true; // پس از hideMenu (که unpause می‌کند)
    const p = $("editorPanel");
    if (p) p.hidden = false;
    syncEditorPanel();
    edCounts();
    renderer.markDirty();
    refreshPanel();
  }
  function closeEditor(silent) {
    if (!editor) return;
    editor = null;
    const p = $("editorPanel");
    if (p) p.hidden = true;
    // terrain بازی جاری را از نو بساز (ویرایشگر آن را عوض کرده بود)
    const ls = (state.mapSeed == null ? CONFIG.MAP_SEED : state.mapSeed) >>> 0 || CONFIG.MAP_SEED;
    terrain = state.mapPatches && state.mapPatches.length
      ? customTerrain(ls, state.mapPatches)
      : makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, ls);
    renderer.markDirty();
    paintMinimap();
    refreshPanel();
    if (!silent) showMenu();
  }
  function edCellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return renderer.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
  }
  function edPaintAt(cell) {
    if (!editor || !cell) return 0;
    const tile = editor.tile === "erase" ? null : editor.tile;
    const r = paintCells(editor.doc, editor.base, cell.c, cell.r, editor.brush, tile);
    if (r.painted) edRefreshTerrain();
    if (r.capped) edStatus(`سقف ${faNum(PATCH_CAP)} وصله پر شد — اول جایی را پاک کن`);
    else edCounts();
    return r.painted;
  }
  function edCheckPlayable() {
    const v = validatePlayable(editor.doc.seed, patchesList(editor.doc));
    edStatus(v.ok
      ? "قابل‌بازی است ✓ (ستاد + ارباب + حریف می‌نشینند)"
      : `قابل‌بازی نیست: ${ED_ERR_FA[v.reason] || v.reason}`);
    return v.ok;
  }
  function edReadName() {
    const nm = $("edNameInput");
    const clean = nm ? nm.value.trim().replace(/\s+/g, " ").slice(0, MAP_NAME_MAX) : "";
    editor.doc.name = clean || "نقشه سفارشی";
    if (nm) nm.value = editor.doc.name;
  }
  (function wireEditor() {
    const row = $("edTileRow");
    if (row) {
      for (const b of row.querySelectorAll("[data-etile]")) {
        b.addEventListener("click", () => {
          if (!editor) return;
          const v = b.dataset.etile;
          editor.tile = v === "erase" ? "erase" : parseInt(v, 10);
          syncEditorPanel();
        });
      }
    }
    const br = $("edBrushSel");
    if (br) {
      br.innerHTML = "";
      for (const s of BRUSHES) {
        const o = document.createElement("option");
        o.value = String(s);
        o.textContent = s === 1 ? "۱ خانه" : `${faNum(s)}×${faNum(s)}`;
        br.appendChild(o);
      }
      br.value = "4";
      br.addEventListener("change", () => {
        if (!editor) return;
        const s = parseInt(br.value, 10);
        editor.brush = BRUSHES.includes(s) ? s : 4;
      });
    }
    const seedBtn = $("edSeedBtn");
    if (seedBtn) seedBtn.addEventListener("click", () => {
      if (!editor) return;
      const inp = $("edSeedInput");
      const s = parseSeed(inp && inp.value);
      if (s == null) { edStatus("سید پایه باید عدد ۱ تا ۴۲۹۴۹۶۷۲۹۵ باشد"); return; }
      editor.doc.seed = s;
      editor.doc.patches = {}; // سید تازه = بوم تازه
      editor.base = baseTerrain(s);
      edRefreshTerrain();
      syncEditorPanel();
      edStatus(`زمین سید ${faNum(s)} ساخته شد — وصله‌ها پاک شدند`);
    });
    const chk = $("edCheckBtn");
    if (chk) chk.addEventListener("click", () => { if (editor) edCheckPlayable(); });
    const clr = $("edClearBtn");
    if (clr) clr.addEventListener("click", () => {
      if (!editor) return;
      clearPatches(editor.doc);
      edRefreshTerrain();
      edCounts();
    });
    const sv = $("edSaveBtn");
    if (sv) sv.addEventListener("click", () => {
      if (!editor) return;
      edReadName();
      if (!edCheckPlayable()) return; // فقط قابل‌بازی ذخیره می‌شود
      edStatus(saveCustomSlot(editor.doc)
        ? `ذخیره شد ✓ «${editor.doc.name}» (${faNum(patchCount(editor.doc))} وصله)`
        : "خطا در ذخیره محلی");
    });
    const exp = $("edExportBtn");
    if (exp) exp.addEventListener("click", () => {
      if (!editor) return;
      edReadName();
      const ta = $("edIOArea");
      if (ta) {
        ta.value = exportMapDoc(editor.doc);
        ta.select();
        try { document.execCommand("copy"); } catch (e) { /* مهم نیست */ }
      }
      edStatus(`خروجی گرفته شد (${faNum(patchCount(editor.doc))} وصله) — در حافظه هم هست`);
    });
    const imp = $("edImportBtn");
    if (imp) imp.addEventListener("click", () => {
      if (!editor) return;
      const ta = $("edIOArea");
      const r = importMapDoc(ta ? ta.value : "");
      if (!r.ok) { edStatus(`ورودی نامعتبر: ${r.reason}`); return; }
      editor.doc = r.doc;
      editor.base = baseTerrain(r.doc.seed);
      edRefreshTerrain();
      syncEditorPanel();
      edCounts();
    });
    const play = $("edPlayBtn");
    if (play) play.addEventListener("click", () => {
      if (!editor) return;
      edReadName();
      if (!edCheckPlayable()) return; // فقط قابل‌بازی آزمایش می‌شود
      const custom = { name: editor.doc.name, patches: patchesList(editor.doc) };
      newGame(editor.doc.seed, soloDiff, custom); // خروج خاموش از ویرایشگر داخلش است
      state.paused = false;
    });
    const ex = $("edExitBtn");
    if (ex) ex.addEventListener("click", () => closeEditor(false));
    const mb = $("editorBtn");
    if (mb) mb.addEventListener("click", () => {
      if (mpSession) { menuMsg("اول از اتاق چندنفره خارج شو"); return; }
      openEditor();
    });
  })();

  // ---- دکمه‌های لابی رقابتی ----
  const mpCodeInput = $("mpCodeInput"), mpMaxSel = $("mpMaxSel");
  const mpCreateBtn = $("mpCreateBtn"), mpJoinBtn = $("mpJoinBtn"), mpLeaveBtn = $("mpLeaveBtn");
  const mpReadyBtn = $("mpReadyBtn"), mpStartBtn = $("mpStartBtn"), mpListBtn = $("mpListBtn");
  const MP_ERR_FA = { bad: "درخواست بد", name: "نام جنگی نامعتبر", logo: "لوگوی نامعتبر", password: "رمز اشتباه یا نامعتبر (۱ تا ۱۶ نویسه)", max: "۲ تا ۴ نفر", nocode: "کد پیدا نشد", full: "اتاق پر است", started: "بازی شروع شده", inroom: "اول از اتاق فعلی خارج شو", noroom: "در اتاق نیستی", nohost: "فقط میزبان", few: "دست‌کم ۲ نفر", notready: "همه باید آماده باشند", slow: "کمی صبر کن", nostart: "هنوز شروع نشده", kind: "نوع ورودی بد", tick: "تیک بد", args: "آرگومان بد", big: "پیام بزرگ", seed: "سید نامعتبر" };
  function mpCode() {
    return (mpCodeInput && mpCodeInput.value ? mpCodeInput.value : "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  }
  if (mpCreateBtn) mpCreateBtn.addEventListener("click", async () => {
    try {
      mpStatus("در حال ساخت…");
      const max = mpMaxSel ? parseInt(mpMaxSel.value, 10) : 2;
      const seedIn = $("mpSeedInput");
      const seedRaw = seedIn && seedIn.value ? seedIn.value.trim() : "";
      let seed = null;
      if (seedRaw) {
        seed = parseSeed(seedRaw);
        if (seed == null) { mpStatus("خطا: سید نامعتبر"); return; }
      }
      const pwIn = $("mpPasswordInput");
      const pw = validRoomPassword(pwIn && pwIn.value);
      if (pw === false) { mpStatus("خطا: " + MP_ERR_FA.password); return; }
      await lobby.create(max >= 2 && max <= 4 ? max : 2, { password: pw, seed });
      if (mpCodeInput && lobby.room) mpCodeInput.value = lobby.room.code;
      mpStatus(`اتاق ${lobby.room.code} ساخته شد${lobby.room.priv ? " 🔒خصوصی" : " 🔓عمومی"} (سید ${lobby.room.seed >>> 0}) — کد${lobby.room.priv ? " و رمز" : ""} را به حریف بده.`);
    } catch (e) { mpStatus("خطا: " + (MP_ERR_FA[e.message] || e.message || "؟")); }
  });
  if (mpJoinBtn) mpJoinBtn.addEventListener("click", async () => {
    try {
      const code = mpCode();
      if (code.length !== 4) { mpStatus("کد ۴ حرفی را بزن."); return; }
      const pwIn = $("mpJoinPasswordInput");
      const pw = validRoomPassword(pwIn && pwIn.value);
      if (pw === false) { mpStatus("خطا: " + MP_ERR_FA.password); return; }
      mpStatus("در حال پیوستن…");
      await lobby.join(code, { password: pw });
      mpStatus(`وارد ${code} شدی — «آماده» را بزن.`);
    } catch (e) { mpStatus("خطا: " + (MP_ERR_FA[e.message] || e.message || "؟")); }
  });
  if (mpLeaveBtn) mpLeaveBtn.addEventListener("click", async () => {
    try { await lobby.leave(); mpStatus("خارج شدی."); refreshRoomList(true); } catch (e) {}
  });
  if (mpReadyBtn) mpReadyBtn.addEventListener("click", async () => { try { await lobby.toggleReady(); } catch (e) {} });
  if (mpStartBtn) mpStartBtn.addEventListener("click", async () => {
    try {
      mpStatus("در حال شروع…");
      await lobby.start(); // سید همان سیدِ زمان ساخت است
    }
    catch (e) { mpStatus("خطا: " + (MP_ERR_FA[e.message] || e.message || "؟")); }
  });
  // فهرست اتاق‌های باز (0.28.0): کد + خصوصی/عمومی + ظرفیت + سید + بازیکنان حاضر.
  function paintRoomList(rooms, ownCode) {
    const box = $("mpListEl");
    if (!box) return;
    const others = (rooms || []).filter((rm) => rm.code !== ownCode);
    box.innerHTML = others.length
      ? others.map(roomRowHTML).join("")
      : `<div class="lbl">اتاق بازی نیست — بساز.</div>`;
    box.querySelectorAll("[data-joincode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const code = btn.dataset.joincode;
        const roomEl = btn.closest(".room");
        const pwIn = roomEl ? roomEl.querySelector("[data-pwfor]") : null;
        const pw = validRoomPassword(pwIn && pwIn.value);
        if (pw === false) { mpStatus("خطا: " + MP_ERR_FA.password); return; }
        if (mpCodeInput) mpCodeInput.value = code;
        try { await lobby.join(code, { password: pw }); mpStatus("وارد شدی — «آماده» را بزن."); }
        catch (e) { mpStatus("خطا: " + (MP_ERR_FA[e.message] || e.message || "؟")); }
      });
    });
  }
  async function refreshRoomList(silent) {
    const box = $("mpListEl");
    if (!box) return;
    if (!silent) box.innerHTML = `<div class="lbl">…</div>`;
    const rooms = await lobby.list();
    paintRoomList(rooms, lobby.room && lobby.room.code);
  }
  // تازه‌سازی خودکار فهرست وقتی منو باز است (نه حین تایپ رمز).
  setInterval(() => {
    const ms = $("menuScreen");
    const box = $("mpListEl");
    if (!ms || ms.hidden || !lobby.connected) return;
    if (box && box.contains(document.activeElement)) return;
    refreshRoomList(true);
  }, 10000);
  if (mpListBtn) mpListBtn.addEventListener("click", async () => {
    await refreshRoomList(false);
  });

  // ریسایز بدون ResizeObserver (جلوگیری از حلقه RO): رویداد + چک دوره‌ای کم‌هزینه
  window.addEventListener("resize", () => renderer.resize());
  setInterval(() => renderer.resize(), 600);
  document.querySelector("[data-fit]").addEventListener("click", () => renderer.fit());
  // نمای تخت (0.25.0): حذف ارتفاع ساختمان‌ها تا پشت‌شان دیده شود؛ در حافظه می‌ماند.
  const flatBtn = document.querySelector("[data-flat]");
  function applyFlat(f) {
    renderer.setFlat(f);
    if (flatBtn) flatBtn.textContent = f ? "نمای سه‌بعدی" : "نمای تخت";
    try { localStorage.setItem("scw.flat", f ? "1" : "0"); } catch {}
  }
  if (flatBtn) {
    let flatInit = false;
    try { flatInit = localStorage.getItem("scw.flat") === "1"; } catch {}
    applyFlat(flatInit);
    flatBtn.addEventListener("click", () => applyFlat(!renderer.isFlat()));
  }

  // مینی‌مپ (0.43.0 — #۱۲ از FEATURES): بازرسم هر ۱۵ فریم (۴fps) +
  // کلیک/درگ = پرش دوربین به همان ناحیه. فقط view را می‌خواند/می‌نویسد.
  const minimapCv = $("minimap");
  let minimapTick = 0;
  function paintMinimap() {
    if (!minimapCv) return;
    const size = renderer.canvasSize();
    const tl = renderer.screenToCell(0, 0);
    const br = renderer.screenToCell(size.W, size.H);
    drawMinimap(minimapCv, editor ? blankView() : state, terrain, CONFIG.GRID_W, CONFIG.GRID_H,
      { c0: tl.c, r0: tl.r, c1: br.c, r1: br.r });
  }
  function minimapJump(e) {
    if (!minimapCv) return;
    const rect = minimapCv.getBoundingClientRect();
    const cell = minimapCell((e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height, CONFIG.GRID_W, CONFIG.GRID_H);
    const size = renderer.canvasSize();
    const pan = panForCell(cell.c, cell.r, size.W, size.H,
      renderer.view.zoom, CONFIG.GRID_W, CONFIG.GRID_H);
    renderer.view.panX = pan.panX;
    renderer.view.panY = pan.panY;
    renderer.markDirty();
    paintMinimap();
  }
  if (minimapCv) {
    minimapCv.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try { minimapCv.setPointerCapture(e.pointerId); } catch (_) { /* مهم نیست */ }
      minimapJump(e);
      const move = (ev) => minimapJump(ev);
      const up = () => {
        minimapCv.removeEventListener("pointermove", move);
        minimapCv.removeEventListener("pointerup", up);
        minimapCv.removeEventListener("pointercancel", up);
      };
      minimapCv.addEventListener("pointermove", move);
      minimapCv.addEventListener("pointerup", up);
      minimapCv.addEventListener("pointercancel", up);
    });
  }

  let lastFpsT = performance.now(), frames = 0, fps = 0;
  function frame(now) {
    clock.frame(now);
    // ویرایشگر (0.51.0): فقط زمین موقت، بدون ساختمان/یگان/گوست/هاور.
    renderer.draw(editor ? blankView() : state, terrain,
      editor ? null : hover, editor ? null : ghostDef(),
      editor ? [] : selIds, editor ? null : wallLine);
    if (++minimapTick % 15 === 0) paintMinimap();
    // تغذیه صدا (0.48.0): هر ۵ تیکِ بازیِ در حال اجرا یک اسنپ‌شات سبک؛
    // پرچم‌ها (مرگ/ویرانی/اتمام/پایان) latch هستند پس با این آهنگ جا نمی‌مانند.
    if (!state.paused && $("menuScreen").hidden && state.tick % 5 === 0 && state.tick > 0) {
      const snap = soundSnapshot(state);
      if (lastSoundSnap && state.tick !== lastSoundSnap.tick) sound.update(lastSoundSnap, snap);
      lastSoundSnap = { tick: state.tick, ...snap };
    } else if (state.paused || !$("menuScreen").hidden) {
      lastSoundSnap = null; // مکث/منو: baseline تازه تا برگشت، سیل رویداد ندهد
    }
    frames++;
    if (now - lastFpsT >= 500) {
      fps = Math.round((frames * 1000) / (now - lastFpsT));
      frames = 0; lastFpsT = now;
      fpsEl.textContent = fps + " فریم/ثانیه" + (fidelityAuto ? ` (کیفیت خودکار: ${fidelity})` : "");
      // افت خودکار کیفیت (0.58.0 — #۲۷): زیر ۲۰fps پله‌ای کم می‌کند (فقط پایین،
      // هرگز بالا)؛ انتخاب دستی کاربر لغوش می‌کند. sim دست‌نخورده می‌ماند.
      if (fps < 20 && $("menuScreen").hidden) {
        const next = fidelity === "full" ? "balanced" : fidelity === "balanced" ? "lite" : null;
        if (next) {
          fidelityAuto = true;
          applyFidelity(next, true);
          statusEl.textContent = `fps پایین (${fps}) — کیفیت رسم خودکار کم شد (${next})`;
        }
      }
    }
    requestAnimationFrame(frame);
  }

  refreshPanel();
  tickEl.textContent = "تیک 0";
  assignStaff(state);
  // شروع پشت منوی انتخاب حالت (0.27.0): بازی متوقف تا تک‌نفره/چندنفره انتخاب شود.
  state.paused = true;
  showMenu();
  // نسخه انتشار از تنها منبع (فرایند انتشار را ببین)
  fetch("VERSION").then((r) => r.text()).then((t) => {
    const v = t.trim();
    if (/^\d+\.\d+\.\d+$/.test(v)) $("verEl").textContent = v;
  }).catch(() => { /* پیش‌نمایش بدون service worker: نسخه نمایشی می‌ماند */ });
  // ماتریس سازگاری (0.58.0 — #۲۷): رندر در کارت راهنما + هشدار اگر required کم است.
  {
    const probed = probeCompat(liveEnv());
    const el = $("compatEl");
    if (el) {
      el.innerHTML = "سازگاری دستگاه: " +
        probed.map((r) => `${r.ok ? "✓" : "✗"} ${r.name}`).join("، ") +
        (compatBootable(probed) ? "" : " — ⚠ برخی نیازهای پایه نیست!") +
        " " + SUPPORT_LINE;
    }
  }
  // مهاجرت یک‌بار localStorage → IDB (0.55.0 — #۱۶) و پیام وضعیت اسلات‌ها.
  // ناهمگام است پس پیام «در حال بررسی…» اول می‌آید و نتیجه بعداً می‌نشیند.
  saveStatus.textContent = "در حال بررسی ذخیره‌ها…";
  migrateToIdb().catch(() => ({ ok: false })).then(async () => {
    const info = await infoSlot(SLOTS.auto);
    const m = await infoSlot(SLOTS.manual);
    if (m.exists) saveStatus.textContent = `ذخیره دستی تیک ${m.tick} موجود است (${m.bytes} بایت)`;
    else if (info.exists) saveStatus.textContent = `ذخیره خودکار تیک ${info.tick} موجود است — «بارگذاری» بزن`;
    else saveStatus.textContent = "ذخیره‌ای نیست — خودکار هر ۳۰ ثانیه";
  });
  requestAnimationFrame(frame);

  // آزمون خودکار: ?test در URL یا فراخوانی دستی
  function showTests() {
    const results = runAllTests();
    paintTestResults(results);
    console.log("[tests]", results);
    // فاز IDB ناهمگام است (0.55.0) — جدا می‌آید و بج را کامل می‌کند.
    runIdbTests().then((extra) => {
      paintTestResults(results.concat(extra));
      console.log("[tests-idb]", extra);
    }).catch((e) => console.error("[tests-idb]", e));
    return results;
  }
  function paintTestResults(results) {
    const passed = results.filter((r) => r.pass).length;
    testBadge.hidden = false;
    testBadge.className = passed === results.length ? "pass" : "fail";
    testBadge.textContent = `تست: ${passed}/${results.length} — ` +
      results.map((r) => `${r.pass ? "✓" : "✗"} ${r.name}`).join("، ");
  }
  if (/[?&]test\b/.test(location.search)) {
    setTimeout(showTests, 400);
  }

  // قلاب تست خودکار (page_eval): window.__slice01
  window.__slice01 = {
    config: CONFIG,
    online,
    lobby,
    mp: {
      active: () => !!mpSession,
      slot: () => (mpSession ? mpSession.slot : -1),
      hash: () => stateHash(state),
      startLocal: (num) => {
        // شروع محلی بدون سرور (تست determinism دو نمونه هم‌سان)
        const s = state.mapSeed >>> 0;
        terrain = makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, s);
        mpClearSpawns(terrain, CONFIG.GRID_W, CONFIG.GRID_H);
        state = createState();
        state.mapSeed = s;
        const names = [];
        for (let i = 0; i < num; i++) names.push("P" + (i + 1));
        enableMp(state, num, names);
        for (let s = 0; s < num; s++) {
          const an = MP_SPAWN_ANCHOR[s];
          placeKeepFor(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, s, an[0], an[1]);
        }
        for (let s = 0; s < num; s++) spawnLord(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, s);
        mpSession = { code: "TEST", slot: 0, num, names, logos: names.map((_, i) => i % PROFILE_LOGOS.length) };
        mpPending.clear();
        mpNextSeq = 1;
        clock.reset();
        paintSeed();
        refreshPanel();
        return { keeps: state.buildings.filter((b) => b.type === "keep").length };
      },
      apply: (m) => { try { applyMpInput(m); refreshPanel(); return true; } catch (e) { return false; } },
      endLocal: () => { mpSession = null; mpPending.clear(); newGame(); },
    },
    get state() { return state; },
    get terrain() { return terrain; },
    ed: () => editor, // ویرایشگر نقشه (0.51.0) — قلاب تست: null یا {doc, tile, brush}
    validate: (c, r, key) => {
      const def = CONFIG.BUILDINGS[key || selectedKey];
      if (!def) return { ok: false, reason: "NO_SELECTION" };
      return validate(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, c, r, def);
    },
    place: (c, r, key) => {
      const def = CONFIG.BUILDINGS[key || selectedKey];
      if (!def) return { ok: false, reason: "NO_SELECTION" };
      const res = tryPlace(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, c, r, def);
      if (res.ok) assignStaff(state);
      refreshPanel();
      return res;
    },
    selectedBuilding: () => selectedKey, // حالت ساخت/خنثی — قلاب تست (0.23.4)
    toScreen: (c, r) => renderer.cellToScreen(c, r), // مختصات صفحه خانه — قلاب تست (0.33.0)
    disarm: () => { // خلع کامل به حالت خنثی — قلاب تست (0.23.4)
      selectedKey = null; selectedUnit = null; pendingKind = null;
      refreshPanel();
      return null;
    },
    ff: (n) => { // جلو بردن هم‌زمان (تست) — آینه حلقه اصلی
      stepSim(state, terrain, n, cmdQueue);
      tickEl.textContent = "تیک " + state.tick;
      refreshPanel();
      return state.tick;
    },
    hire: (c, r, key) => {
      const res = hireUnit(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, c, r, key || "soldier");
      refreshPanel();
      return { ok: res.ok, reason: res.reason };
    },
    wave: () => {
      const n = spawnWave(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H);
      refreshPanel();
      return n;
    },
    order: (id, c, r) => {
      const u = state.units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      return orderMove(state, u, c, r);
    },
    attackmove: (id, c, r) => {
      const u = state.units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      return orderAttackMove(state, u, c, r);
    },
    retreat: (id) => {
      const u = state.units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      return orderRetreat(state, u);
    },
    stance: (id, s) => {
      const u = state.units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      const res = setStance(u, s);
      refreshPanel();
      return res;
    },
    guard: (id, c, r) => { // نگهبانی از ساختمانِ خانه (c,r) — قلاب تست
      const u = state.units.find((u) => u.id === id);
      const b = state.buildings.find((b) => c >= b.c && c < b.c + b.w && r >= b.r && r < b.r + b.h) || null;
      if (!u || !b) return { ok: false, reason: "INVALID" };
      const res = setGuard(state, u, b);
      refreshPanel();
      return res;
    },
    garrison: (id, c, r) => { // استقرار در برجِ خانه (c,r) — قلاب تست (0.45.0)
      const u = state.units.find((u) => u.id === id);
      const b = state.buildings.find((b) => c >= b.c && c < b.c + b.w && r >= b.r && r < b.r + b.h) || null;
      if (!u || !b) return { ok: false, reason: "INVALID" };
      const res = garrisonUnit(state, u, b);
      refreshPanel();
      return res;
    },
    deploy: (id) => { // استقرار/جمع منجنیق — قلاب تست (0.46.0)
      const u = state.units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      const res = deployUnit(state, u);
      refreshPanel();
      return res;
    },
    select: (id) => {
      selIds = [id];
      pendingKind = null;
      refreshPanel();
      return selIds[0] || null;
    },
    selected: () => selIds[0] || null,
    selectedIds: () => selIds.slice(), // مجموعه انتخاب (0.16.0)
    alarm: (c, r) => { // زنگ خطر — قلاب تست (0.17.0)
      const rs = alarmAll(state, c, r);
      if (rs.some((r) => r.ok)) state.events.push(`زنگ خطر! تجمع در (${c}، ${r})`);
      refreshPanel();
      return rs;
    },
    toggleSelect: (id) => { // ضامن شیفت+کلیک — قلاب تست
      selIds = toggleInSet(selIds, id);
      pendingKind = null;
      refreshPanel();
      return selIds.slice();
    },
    cancel: (id) => {
      const u = state.units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      return cancelOrder(u);
    },
    cmd: (c) => playerCmd( c, state.tick), // صف فرمان — قلاب تست (0.37.0)
    queueLen: () => cmdQueue.items.length,
    soundStart: () => sound.ensureStarted(), // شروع صدا — قلاب تست (0.48.0)
    soundLog: () => sound.log.slice(-10), // تازه‌ترین رویدادهای صوتی — قلاب تست (0.48.0)
    soundMuted: () => sound.volumes.muted,
    runTests: showTests,
    runIdbTests,
    bench: runBench,
    firstTen: (seed, ticks) => runFirstTen(seed, ticks), // سناریوی ۱۰ دقیقه اول (0.61.0)
    regression: runRegression,
    regressionOne: (key) => runScenario(REGRESSIONS.find((s) => s.key === key)),
    regressionList: () => REGRESSIONS.map((s) => s.key),
    fuzzSaves,
    fuzzCmds,
    compat: () => probeCompat(liveEnv()),
    remains: () => renderer.debugRemains(),
    profile: () => ({ name: profile.name, logo: profile.logo }), // قلاب تست پروفایل (0.27.0)
    setProfile: (name, logo) => {
      const saved = saveProfile({ name, logo });
      if (saved) {
        profile = saved;
        syncProfileInput();
        refreshPanel();
      }
      return saved;
    },
    menu: { // قلاب تست منو (0.27.0)
      show: () => showMenu(),
      hide: () => hideMenu(),
      visible: () => { const ms = $("menuScreen"); return !!(ms && !ms.hidden); },
    },
    screenToCell: (sx, sy) => {
      const rect = canvas.getBoundingClientRect();
      return renderer.screenToCell(sx - rect.left, sy - rect.top);
    },
    cellToScreen: (c, r) => {
      const rect = canvas.getBoundingClientRect();
      const p = renderer.cellToScreen(c, r);
      return { x: p.x + rect.left, y: p.y + rect.top };
    },
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
