// نقطه ورود برش اول: سیم‌کشی ساعت، ساخت، رندر و پنل‌ها.
import { CONFIG, canonPersonality } from "./config.js";
import { makeTerrain } from "./terrain.js";
import { createState } from "./state.js";
import { validate, tryPlace, placeKeep, placeKeepFor, REASON_FA, underConstruction, hasLiveKeep, keepLocked } from "./construction.js";
import { stepEconomy, assignStaff, netPerMinute, popTarget, campGauge, taxIndex, taxAt, CAPS, capFor, RATES, HUT_HOUSING, INN, RELIGION, RELIGION_TYPES, econOf, TAX, RATIONS, FOOD_TYPES, millSupport, activeEvents, hasOxTether, herdCows } from "./economy.js";
import { TAX_IDS, BUILDING_CATEGORIES } from "./data.js";
import { FINAL_WAVE, PEACE_TICKS, peaceActive, HIRE_FA, hasBarracks, hasCathedral, validateHire, hireUnit, spawnWave, waveTimeline, spawnLord, validIdentity, spawnStartingForce, ORDER_FA, STANCE_FA, ORDER_KIND_FA, setStance, guardPost, setGuard, isGarrisonPost, garrisonCapFor, GARRISON_FA, canGarrisonType, garrisonUnit, fortifyPick, ATTACK_FA, attackPick, deployUnit, FIRECOW_FA, fireCow, isCowSiege, AMMO_RESUPPLY_STONE, AMMO_RESUPPLY_ROCKS, RESUPPLY_FA, resupplyAmmo, signEdge, orderMove, orderAttackMove, orderPatrol, mercpostOf, guildOf, hasStable, stableWithHorse, setRally, isSoloLord, lordKeepGate, orderAttackPos, orderPatrolAppend, PATROL_MAX, disbandUnit, queueOrder, orderRetreat, cancelOrder, pushEvent, toggleGate, KILLPIT_CHARGES, DOGS_PER_CAGE, HORSES_PER_STABLE, RELEASE_FA, cageDogs, validateRelease, releaseDogs, stepKennels, stepStables, DEMOLISH_FA, demolishBuilding, REPAIR_FA, validateRepair, repairBuilding, undoLastBuild, stepCombat, buildingInfo, hireGoodsFor, soldierValue, UNITS } from "./combat.js";
import { queueHire, cancelTrain, stepTraining, barracksOf, trainTimeOf, TRAIN_FA } from "./train.js";
import { toggleInSet, pruneSet, resolveSet, boxSelectIds, sameTypeIds, groupCentroid, bookmarkSet, bookmarkGet, bookmarkCycle, lordFocusIds, lordFocusNext, alarmAll, orderHoverMark, armyBreakdown } from "./selection.js";
import { freshGroups, saveGroup, recallGroup } from "./groups.js";
import { enableMp, mpClearSpawns, MP_SPAWN_ANCHOR, INPUT_DELAY, PLAYER_COLORS, stateHash, updateMpAlive } from "./mp.js";
import { initMpLobby, validRoomPassword, roomRowHTML, liveRowHTML, myGameRowHTML, roomHostSlot, isRoomHost, hostStar, validMpSession, normalizeMyGames, upsertMyGameList, markMyGameDoneList, removeMyGameList } from "./lobby.js";
import { ensureWakeLock, releaseWakeLock } from "./wakelock.js";
import { hudShouldCollapse, setHudOpen, toggleHud } from "./mobilehud.js"; // نوار جمع‌شونده موبایل (0.224.0 — C-MOB-4)
import { sheetShouldOverlay, setSheetOpen, toggleSheet } from "./mobilesheet.js"; // پنل کشویی موبایل (0.224.0 — C-MOB-5) // قفل بیداری موبایل (0.223.0 — C-MOB-3)
import { runAllTests, runIdbTests } from "./tests.js";
import { showTests, paintTestResults, paintCompat } from "./testui.js";
import { createModals } from "./modal.js";
import { createFlatView } from "./flatview.js";
import { createPaletteUI } from "./paletteui.js";
import { createMinimapUI } from "./minimapui.js";
import { createMapPreviewUI } from "./mappreview.js";
import { createLobbyListUI } from "./lobbyui.js";
import { createReplayBarUI } from "./replaybar.js";
import { createScribeUI } from "./scribeui.js";
import { createMpViewUI } from "./mpview.js";
import { createPanelUI } from "./panelui.js";
import { createEditorUI } from "./editorui.js";
import { createMissionUI } from "./missionui.js";
import { createWatchUI } from "./watchui.js";
import { createTickHooks } from "./tickhooks.js";
import { createMenuUI, wireMenuUI } from "./menuui.js";
import { startNewGame } from "./newgame.js";
import { createWarnLines } from "./warn.js";
import { relabelPalette, createPolicyPainters } from "./policy.js";
import { createSoundUI } from "./soundui.js";
import { createKeyButtons } from "./keybtns.js";
import { createNamedSavePainter } from "./namedsave.js";
import {
  serializeJSON, deserializeJSON, SaveError, SAVE_FA, SLOTS, validAutosave, autosaveTicks, autosaveDue,
  saveSlot, loadSlot, deleteSlot, infoSlot, migrateToIdb,
  validSaveName, saveNamed, loadNamed, deleteNamed, listNamedSaves,
} from "./persist.js";
import { createClock } from "./clock.js";
import { stepSim, createQueue, enqueueCmd, snapPrev, fixNewPrev } from "./sim.js";
import { startAI } from "./ai.js";
import { drawMinimap, minimapCell, panForCell, paintMapThumb } from "./minimap.js";
import { createRenderer } from "./render.js";
import { WALL_LINE_MAX, isLineDragType, wallLineTiles, blockLineIfAnyInvalid } from "./wallline.js";
import { pinchDist, pinchZoom, zoomStep, LONG_PRESS_MS, LONG_PRESS_SLOP, longPressMoved, dragMovedFar, panForDrag, arrowPanDelta, edgePanDir, EDGE_PAN_STEP } from "./gestures.js";
import { createSoundManager, soundSnapshot } from "./sound.js";
import { bindMenuNav } from "./menunav.js";
import { clockReady, clockText, MISSIONS, createRun, updateRun, missionSnap } from "./missions.js";
import { campaignLoad, campaignSave, campaignRecord, campaignUnlocked, missionByKey, missionIndex, missionName, missionBrief } from "./campaign.js"; // پیشرفت کمپین (0.225.0 — فاز ۲)
import { MASTERS_SORTS, masterEntry, mastersAdd, mastersDelete, mastersSort, mastersLoad, mastersSave } from "./masters.js";
import { nextHint, hintBuilding } from "./hints.js";
import { taxInfo, rationInfo, policySummary, advisorWarnings, warnAlarmKeys, approxRes, foodReport, eatMeter, stockpileInterior, scribeMood, scribeReports, meritRows, sortMerit, powerTier } from "./advisor.js";
import { hasMarket, tradeQuote, applyTrade, TRADE_FA, marketSelected, tradeLocked } from "./market.js";
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
import { initI18n, t, onLangChange, getLang, hasKey } from "./i18n.js";
import { faNum, escName, okB, badB, resName, costHTML, buildingMeta, srcTag, unitMeta, buildingInfoHTML, unitInfoHTML } from "./format.js";
import { parseSeed, randomSeed, paintSeed } from "./seed.js";
import { warName, warLogo, paintBadge, syncProfileInput, wireProfileUI } from "./profileui.js";
import { validateConfig } from "./schema.js";
import {
  A11Y_PALETTES, A11Y_SCALES, KEY_ACTIONS, KEY_ACTION_FA, DEFAULT_KEYS, cycleSpeed,
  validPalette, clampScale, validKeyCode, normalizeKeys,
} from "./a11y.js";
import { probeCompat, compatBootable, liveEnv, SUPPORT_LINE } from "./compat.js";
import { runBench } from "./bench.js";
import { runFirstTen } from "./firstten.js";
import { runRegression, runScenario, REGRESSIONS, fuzzSaves, fuzzCmds } from "./regression.js";
import { initOnline } from "./online.js";
import {
  PROFILE_LORDS, validProfileName, validLogo, lordPortraitSrc, lordPortraitHTML,
  lordName, randomDefaultName, loadProfile, saveProfile, profileBadgeHTML, firstRunAsk,
} from "./profile.js";
import { createPointerInput } from "./pointerui.js";
import { createPaletteKeysUI } from "./palettekeys.js";
import { createOrdersUI } from "./ordersui.js";
import { createSaveMenuUI } from "./savemenu.js";
import { createCloudReplayUI } from "./cloudreplay.js";
import { createLobbyWiringUI } from "./lobbywiring.js";
import { createViewFrameUI } from "./viewframe.js";
import { createBootTail } from "./boottail.js";
import { createTestHookUI } from "./testhook.js";

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
  const waveBtn = $("waveBtn"), waveTimelineEl = $("waveTimelineEl"), mclockEl = $("mclockEl"), battleEl = $("battleEl"), alarmBtn = $("alarmBtn"), demolishBtn = $("demolishBtn"), repairBtn = $("repairBtn"), undoBtn = $("undoBtn");
  const defeatBanner = $("defeatBanner"), defeatRestartBtn = $("defeatRestartBtn");
  const victoryBanner = $("victoryBanner"), victoryRestartBtn = $("victoryRestartBtn");
  const taxBtns = Array.from(document.querySelectorAll("[data-tax]"));
  const ratBtns = Array.from(document.querySelectorAll("[data-rat]"));
  const policy = createPolicyPainters({ taxBtns, ratBtns, getState: () => state });
  const taxSlider = $("taxSlider"); // اسلایدر مالیات (فاز ۱ بند ۲۲)
  // لایه آنلاین (0.23.0): افزودنی — قطعی‌اش تک‌نفره را لمس نمی‌کند.
  // نام از پروفایل منو می‌آید (0.27.0).
  function setTick(n) { tickEl.textContent = t("main.tick", { n }); }
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
      testBadge.textContent = t("main.schema.errors", { n: faNum(schemaErrors.length) });
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
  const replayBarUI = createReplayBarUI({ getReplayWatch: () => replayWatch, setReplayWatch: (v) => { replayWatch = v; }, getTick: () => state.tick, getMpSession: () => mpSession, getRecLog: () => recLog });
  const paintReplayBar = replayBarUI.paintReplayBar;
  const hideReplayBar = replayBarUI.hideReplayBar;
  const paintReplayStatus = replayBarUI.paintReplayStatus;
  const scribeUI = createScribeUI({ getState: () => state, getMpSession: () => mpSession, viewSlotOf: (...a) => viewSlotOf(...a) });
  const hideReports = scribeUI.hideReports;
  const showReports = scribeUI.showReports;
  const paintScribe = scribeUI.paintScribe;
  const mpViewUI = createMpViewUI({ getMpSession: () => mpSession, getState: () => state });
  const mpStatus = mpViewUI.mpStatus;
  const paintSync = mpViewUI.paintSync;
  const paintMp = mpViewUI.paintMp;
  const mpRosterHTML = mpViewUI.mpRosterHTML;
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
  const mapPreviewUI = createMapPreviewUI({ getSoloMapKey: () => soloMapKey });
  const paintMapPreview = mapPreviewUI.paintMapPreview;
  const paintMpMapPreview = mapPreviewUI.paintMpMapPreview;
  // شخصیت حریف سولو (0.56.0 — #۱۸ از FEATURES): کلید پروفایل، در localStorage
  // می‌ماند و با هر بازی تازه به startAI و ضبط ری‌پلی می‌رسد.
  let soloPersonality = CONFIG.AI.defaultPersonality;
  try {
    const p = canonPersonality(localStorage.getItem("scw.personality"));
    if (p && CONFIG.AI.personalities[p]) soloPersonality = p;
  } catch (e) {}
  // هویت آغازین سولو (0.153.0 — بند 104): none/crusader/arab در localStorage
  // می‌ماند و با هر بازی تازه به نیروهای اولیه و ضبط ری‌پلی می‌رسد.
  let soloIdentity = "none";
  try {
    const idv = localStorage.getItem("scw.identity");
    if (idv && validIdentity(idv)) soloIdentity = idv;
  } catch (e) {}
  // فاصله ذخیره خودکار (0.153.0 — بند 117): خاموش/۳۰ثانیه/۲دقیقه/۵دقیقه؛
  // پیش‌فرض رفتار امروز (هر ۳۰۰ تیک).
  let soloAutosave = "s30";
  try {
    const av = localStorage.getItem("scw.autosave");
    if (av && validAutosave(av)) soloAutosave = av;
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
  // شب/روز (0.229.0 — C-GFX-2): day/night/cycle با ماندگاری؛ پیش‌فرض day.
  // فقط نمای renderer است (sim/هش/ذخیره بی‌خبر).
  let dayNight = "day";
  try {
    const dd = localStorage.getItem("scw.daynight");
    if (dd === "night" || dd === "cycle") dayNight = dd;
  } catch (e) {}
  function applyDayNight(m) {
    dayNight = (m === "night" || m === "cycle") ? m : "day";
    renderer.setDayNight(dayNight);
    try { localStorage.setItem("scw.daynight", dayNight); } catch (e) {}
    const sel = $("daySel");
    if (sel) sel.value = dayNight;
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
  const mpHashLog = []; // [[tick, hash]] هش‌های خودم هر ۱۰۰ تیک
  let mpDesync = null;
  let mpDesyncSent = false; // گزارش desync یک‌بار هر بازی (0.232.0 — C-SRV-6)
  let mpCatching = null; // {target} — جلو‌بردن سریع عقب‌ماندگی پس از اتصال‌مجدد/تماشا (0.141.0)
  let mpFinishSent = false; // گزارش پایان به سرور فقط یک‌بار
  const MP_CATCHUP_BATCH = 300; // تیک اضافی هر فریم حین همگام‌سازی (پس از بنچمارک)
  const mpActive = () => !!mpSession;
  const mySlot = () => (mpSession ? mpSession.slot : 0);
  const myEcon = () => (mpSession ? state.mpres[mpSession.slot] : state);
  // اسلات نمایشی پنل‌ها (0.141.0): تماشاگر (slot=‎-۱) اقتصاد بازیکن اول را می‌بیند.
  const viewSlotOf = (sess) => (sess && sess.slot >= 0 ? sess.slot : 0);
  // در MP ورودی فقط ارسال می‌شود (اجرای هم‌زمان پس از echo با seq).
  // صف خروجی: سرور هر اتصال را به ۳۰ ورودی در ۱۰ ثانیه محدود می‌کند (0.231.0: + سقف ۴۰ هر اسلات
  // که قطع/وصل مجدد دورش نمی‌زند + رد پسرفت تیک/شکل بد با خطای صادقانه) و مازاد را دور می‌ریزد
  // (مثلاً خط دیوار ۳۲ تایلی). پس ورودی‌ها حداقل MP_SEND_GAP ms فاصله می‌گیرند (≤ ۲۵ در ۱۰ ثانیه؛
  // ۵ باقی برای هش) و ترتیب حفظ می‌شود؛ ارسال ناموفق صادقانه اعلام می‌شود.
  const MP_SEND_GAP = 400, MP_OUTBOX_MAX = 80;
  const mpOutbox = [];
  let mpLastSend = 0, mpPumpTimer = 0;
  function mpPump() {
    mpPumpTimer = 0;
    if (!mpSession) { mpOutbox.length = 0; return; }
    const wait = MP_SEND_GAP - (performance.now() - mpLastSend);
    if (wait > 0) { mpPumpTimer = setTimeout(mpPump, wait); return; }
    const m = mpOutbox.shift();
    if (m) {
      mpLastSend = performance.now();
      Promise.resolve(lobby.send(m.kind, m.args)).then((seq) => {
        if (seq == null && mpSession) { statusEl.textContent = t("main.mp.sendDropped"); }
      }).catch(() => {});
    }
    if (mpOutbox.length) mpPumpTimer = setTimeout(mpPump, MP_SEND_GAP);
  }
  function mpSend(kind, args) {
    if (!mpSession || mpSession.watching) return false; // تماشاگر ورودی ندارد (0.141.0)
    if (mpOutbox.length >= MP_OUTBOX_MAX) { statusEl.textContent = t("main.mp.sendDropped"); return false; }
    mpOutbox.push({ kind, args });
    if (!mpPumpTimer) mpPump();
    refreshPanel();
    return true;
  }

  const renderer = createRenderer(canvas);
  renderer.resize();
  renderer.fit();
  // فیت مجدد پس از نشستن لایه‌بندی (بوت ممکن است پیش از اندازه نهایی اجرا شود)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    renderer.resize();
    renderer.fit();
  }));

  const PALETTE = ["hut", "tower", "lookout", "perimeter", "defence", "squaretower", "roundtower", "barracks", "mercpost", "engineerguild", "tunnelerguild", "stable", "market", "stockpile", "granary", "woodcutter", "quarry", "ironmine", "farm", "wheatfarm",
    "mill", "bakery", "armoury", "fletcher", "hopsfarm", "brewery", "inn", "chapel", "church", "cathedral", "apothecary", "garden", "statue", "gallows", "dungeon", "hunterpost", "dairy", "tannery", "orchard", "oxtether", "wall", "lowwall", "crenwall", "gate", "killpit", "dogcage", "stonekeep", "signpost", "well", "waterpot"];
  // حالت مأموریت/استادان/ساعت (boot-local؛ از بلوک پالت جدا ماند — C-CLN-42):
  let mclockStart = null; // تیک شروع ساعت مأموریت (0.182.0 — بند 130): view-side، خارج هش/ذخیره
  let mastersLogged = false; // ثبت پایان بازی جاری در استادان انجام شده؟ (0.182.0 — بند 102)
  const paletteUI = createPaletteUI({ renderer, PALETTE });
  policy.paintPolicyTips(); // tooltipهای داده‌محور مالیات/جیره (0.79.0 — بند ۹)
  const panelUI = createPanelUI({ getState: () => state, getMpSession: () => mpSession, getReplayWatch: () => replayWatch, getSound: () => sound, playerCmd, mpSend, viewSlotOf, getExactRes: () => exactRes, getLastHintKey: () => lastHintKey, setLastHintKey: (v) => { lastHintKey = v; }, getMclockStart: () => mclockStart, getMpDesync: () => mpDesync, getPendingKind: () => pendingKind, setPendingKind: (v) => { pendingKind = v; }, getSelBldId: () => selBldId, setSelBldId: (v) => { selBldId = v; }, getSelIds: () => selIds, setSelIds: (v) => { selIds = v; }, getSelectedKey: () => selectedKey, getSelectedUnit: () => selectedUnit, getSelFoe: () => selFoe, setSelFoe: (v) => { selFoe = v; }, later: () => ({ armyRowsEl, attackMoveBtn, attackposBtn, bldCard, bldHpEl, bldNameEl, bldStateEl, deployBtn, disbandBtn, firecowBtn, garrisonBtn, getEditor, getLastMissionKey, getMissionLost, getMissionWon, guardBtn, missionLabel, palBtns, patrolBtn, resupplyBtn, stanceDefendBtn, stanceEngageBtn, stanceHoldBtn, unitBtns, unitCard, unitHpEl, unitNameEl, unitOrderEl, warn }), alarmBtn, battleEl, defeatBanner, defeatRestartBtn, demolishBtn, loadBtn, mclockEl, mpRosterHTML, online, orderSels, paintScribe, pauseBtn, placedEl, policy, popEl, ratBtns, rejectedEl, repairBtn, resEl, saveBtn, speedBtn, taxBtns, taxSlider, victoryBanner, victoryRestartBtn, waveBtn, waveTimelineEl, workersEl });
  const paintGranary = panelUI.paintGranary;
  const paintMarket = panelUI.paintMarket;
  const paintTrain = panelUI.paintTrain;
  const hideMercs = panelUI.hideMercs;
  const toggleMercs = panelUI.toggleMercs;
  const pruneMercs = panelUI.pruneMercs;
  const hideGranary = panelUI.hideGranary;
  const toggleGranary = panelUI.toggleGranary;
  const hideMarket = panelUI.hideMarket;
  const toggleMarket = panelUI.toggleMarket;
  const pruneMarket = panelUI.pruneMarket;
  const unitBtns = Array.from(document.querySelectorAll("[data-u]"));
  const palBtns = Array.from(document.querySelectorAll("[data-b]"));

  let state = createState();
  let terrain = makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, state.mapSeed);
  placeKeep(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H); // ستاد آغازین (0.19.0)
  spawnLord(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H); // ارباب آغازین (0.22.0)
  let selectedKey = null; // حالت خنثی (0.23.4): هیچ ساختمانی مسلح نیست تا کلیکِ سرباز با ساخت قاطی نشود
  let selectedUnit = null; // حالت استخدام: null یا کلید واحد
  let selIds = []; // یگان‌های منتخب به ترتیب انتخاب (دستور/موضع جمعی) — مستقل از حالت استخدام
  let ctrlGroups = freshGroups();
  let lastGroupRecall = null;
  let selBldId = null;
  let selFoe = null; // بازرسی دشمن (0.274.0): {kind:"unit"|"bld", id} گذرا، UI-side  const armyRowsEl = $("armyRows"); // ردیف‌های نوع پنل ارتش (0.175.0/بند 553) // بنای منتخب کارت اطلاعات (0.174.0/بند 150): گذرا و UI-side // شکاف/کلید آخرین فراخوانی گروه (0.173.0): تکرار همان شکاف = رفتن به محل گروه
  let bookmarks = {};
  let lastBookmark = 0; // گروه‌های کنترلی ۱..۳ (0.59.0): گذرا و UI-side — با بازی/بارگذاری تازه صفر می‌شود
  let lastLordId = 0; // آخرین Lord فوکس‌شده با L (0.163.0 — §10.5/بند 249): گذرا و UI-side
  let pendingKind = null; // "attackmove" یعنی کلیک بعدی حمله‌در‌حرکت است (تک‌بار)
  let hover = null; // {c, r, valid, reason, ghost}
  let lastAutoTick = 0;
  let exactRes = false; // نوار منابع: تقریبی (~) یا دقیق با کلیک (فاز ۱ بند ۲۷، UI-side)
  let signCycle = 0; // چرخه لبه‌ها با کلید S (0.146.0 — §۳.۴) — UI-side

  // صدا (0.48.0 — #۲۵ از FEATURES): مدیر سنتزشده WebAudio؛ sim هیچ‌چیز از
  // صدا نمی‌داند — حلقه فریم اسنپ‌شات سبک می‌دهد. شروع فقط با ژست کاربر.
  const sound = createSoundManager();
  const warn = createWarnLines({ getState: () => state, sound });
  let lastSoundSnap = null;
  document.addEventListener("pointerdown", () => sound.ensureStarted(), { capture: true });
  document.addEventListener("keydown", () => sound.ensureStarted(), { capture: true });
  // صداهای رابط (0.70.0): کلیک دکمه‌ها/انتخاب‌ها، هاور منو و کارت‌ها — کاملاً نمایشی.
  document.addEventListener("click", (e) => {
    const el = e.target && e.target.closest ? e.target.closest("button, select, [data-go], .bcard") : null;
    if (!el || el.disabled || el.id === "volMusic" || el.id === "volSfx") return;
    if (el.matches(".page-back, .modalClose, [data-close]")) sound.ui("back");
    else if (el.matches("#soloBtn, #mpStartBtn, #defeatRestartBtn, #victoryRestartBtn")) sound.ui("start");
    else if (el.matches(".nav-btn, #menuBtn, #saveIconBtn, #helpIconBtn, #onlineIconBtn, #taxIconBtn")) sound.ui("open");
    else sound.ui("click");
  }, { capture: true });
  document.addEventListener("pointerover", (e) => {
    const el = e.target && e.target.closest ? e.target.closest(".nav-btn, .bcard") : null;
    if (el && !el.disabled && e.pointerType !== "touch") sound.ui("hover");
  });
  // تب پنهان = صدا متوقف (باتری/پس‌زمینه)؛ بازگشت = ادامه
  document.addEventListener("visibilitychange", () => { sound.setSuspended(document.hidden); if (!document.hidden) { try { const ms = $("menuScreen"); if (ms && ms.hidden) ensureWakeLock(); } catch (e) {} } }); // بازگشت به تب: صدا ادامه + قفل بیداری نبرد (0.223.0 — C-MOB-3)
  const tickHooks = createTickHooks({ getMpSession: () => mpSession, getReplayWatch: () => replayWatch, getState: () => state, getEditor: (...a) => getEditor(...a), getMclockStart: () => mclockStart, setMclockStart: (v) => { mclockStart = v; }, getMastersLogged: () => mastersLogged, setMastersLogged: (v) => { mastersLogged = v; }, getMissionActive: (...a) => getMissionActive(...a), checkMission: (...a) => checkMission(...a), recordMasters: (...a) => recordMasters(...a) });
  const tickViewHooks = tickHooks.tickViewHooks;
  const clock = createClock({
    hz: CONFIG.TICK_HZ,
    maxPerFrame: CONFIG.MAX_TICKS_PER_FRAME,
    onTick: (n) => {
      if (mpSession) {
        // آینه stepSim در sim.js (فاز ۰ بند ۲: همان ترتیب ثابت؛ stepAI در MP
        // بی‌اثر است پس صدا زده نمی‌شود — ورودی‌ها با mpDrain با seq مرتب‌اند).
        // حین همگام‌سازی عقب‌ماندگی (0.141.0) هر فریم دسته‌تایی جلو می‌رویم.
        let steps = n;
        if (mpCatching) steps = Math.min(n + MP_CATCHUP_BATCH, Math.max(n, mpCatching.target - state.tick));
        for (let i = 0; i < steps; i++) { snapPrev(state); state.tick++; mpDrain(); stepEconomy(state); stepTraining(state, terrain); stepKennels(state); stepStables(state); stepCombat(state, terrain); updateMpAlive(state); fixNewPrev(state); }
        setTick(state.tick);
        if (mpCatching) {
          if (state.tick >= mpCatching.target) {
            mpCatching = null;
            mpStatus(t("main.mp.synced"));
          } else {
            statusEl.textContent = t("main.mp.syncTick", { n: faNum(state.tick), total: faNum(mpCatching.target) });
          }
        }
        if (state.tick % 100 === 0 && state.tick > 0) {
          const hNow = stateHash(state);
          mpHashLog.push([state.tick, hNow]); // سابقه هش‌ها: مقایسه با هش هم‌تیک همتاها + قلاب تست
          if (mpHashLog.length > 400) mpHashLog.shift();
          mpCheckHash(state.tick); // همتا ممکن است زودتر رسیده باشد
          for (const k of mpHashes.keys()) { if ((k.split(":")[1] | 0) < state.tick - 2000) mpHashes.delete(k); }
          if (!mpSession.watching) { try { lobby.send("hash", { h: hNow, tick: state.tick }); } catch (e) {} }
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
      setTick(state.tick);
      tickViewHooks();
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
      // ذخیره خودکار با فاصله تنظیم‌پذیر (0.153.0 — بند 117؛ پیش‌فرض هر ۳۰۰ تیک) — بک‌اند IDB ناهمگام است (0.55.0)،
      // پس fire-and-forget: رشته همان لحظه منجمد شده و نتیجه بعداً می‌آید.
      if (autosaveDue(state.tick, lastAutoTick, soloAutosave)) {
        lastAutoTick = state.tick;
        const tickNow = state.tick;
        saveSlot(SLOTS.auto, serializeJSON(state)).then((r) => {
          saveStatus.textContent = r.ok
            ? t("main.save.auto", { tick: tickNow, bytes: r.bytes })
            : t("main.save.autoErr", { err: SAVE_FA[r.error] || r.error });
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

  // تشخیص desync: هش همتا برای تیک T با هش خودم در همان تیک مقایسه می‌شود (هر دو ترتیب رسیدن).
  function mpCheckHash(tick) {
    const mine = mpHashLog.find((e) => e[0] === tick);
    if (!mine) return;
    const mineStr = String(mine[1]);
    for (let sl = 0; mpSession && sl < mpSession.num; sl++) {
      if (sl === mpSession.slot) continue;
      const th = mpHashes.get(sl + ":" + tick);
      if (th !== undefined && String(th) !== mineStr && !mpDesync) {
        mpDesync = tick + "/P" + (sl + 1);
        state.events.push(t("main.battle.desync", { d: mpDesync }));
        // گزارش خودکار به سرور (0.232.0 — C-SRV-6): یک‌بار هر بازی، بی‌صدا.
        if (!mpDesyncSent && mpSession && !mpSession.watching) {
          mpDesyncSent = true;
          try { lobby.desync(mpSession.code, tick, mineStr); } catch (e) {}
        }
      }
    }
  }

  function applyMpInput(m) {
    const slot = m.slot | 0, kind = m.kind, a = m.args || {};
    if (kind === "hash") {
      if (slot === (mpSession ? mpSession.slot : -1)) return;
      mpHashes.set(slot + ":" + (a.tick | 0), String(a.h || ""));
      mpCheckHash(a.tick | 0); // هش هم‌تیک خودم (اگر رسیده‌ام) با هش همتا
      return;
    }
    if (!mpSession || slot < 0 || slot >= mpSession.num) return;
    const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
    if (kind === "place") {
      const def = typeof a.type === "string" ? CONFIG.BUILDINGS[a.type] : null;
      if (!def || def.key === "keep") return;
      if (!hasLiveKeep(state, slot)) return; // ستاد الزامی (فاز ۱ بند ۱۲) — آینه applyCmd
      if (!Number.isInteger(a.c) || !Number.isInteger(a.r)) return;
      const r = tryPlace(state, terrain, W, H, a.c, a.r, def, slot);
      if (r.ok) {
        assignStaff(state, slot);
        // Undo تک‌سطحی (0.146.0): آینه applyCmd — ساخت موفق pending می‌نشیند.
        state.undo = { bld: r.building.id, owner: slot };
      }
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
        // گشت + صف (0.162.0): آینه applyCmd در sim.js.
        const k = a.kind === "attackmove" ? "attackmove" : a.kind === "attackpos" ? "attackpos" : a.kind === "patrol" ? "patrol" : "move";
        if (a.queue) { queueOrder(state, u, k, a.c, a.r); continue; }
        if (k === "attackmove") orderAttackMove(state, u, a.c, a.r);
        else if (k === "attackpos") orderAttackPos(state, u, a.c, a.r);
        else if (k === "patrol") orderPatrol(state, u, a.c, a.r);
        else orderMove(state, u, a.c, a.r);
      }
    } else if (kind === "retreat") {
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      for (const id of a.ids) {
        const u = mpUnitOwned(id, slot);
        if (u) orderRetreat(state, u);
      }
    } else if (kind === "disband") {
      // انحلال (0.164.0 — بند 246): آینه فرمان disband در sim.js.
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      const ids = [];
      for (const id of a.ids) {
        const u = mpUnitOwned(id, slot);
        if (u) ids.push(id);
      }
      if (ids.length) disbandUnit(state, ids, slot);
    } else if (kind === "rally") {
      // پرچم تجمع (0.166.0 — §9.1/بند 170): آینه فرمان rally در sim.js.
      if (typeof a.type !== "string" || !Number.isInteger(a.c) || !Number.isInteger(a.r)) return;
      setRally(state, a.type, a.c, a.r, slot);
    } else if (kind === "stance") {
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      if (a.stance !== "engage" && a.stance !== "hold" && a.stance !== "defend") return;
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
      if (!b || !isGarrisonPost(b.type) || (b.owner == null ? 0 : b.owner) !== slot) return;
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
    } else if (kind === "firecow") {
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      if (!Number.isInteger(a.c) || !Number.isInteger(a.r)) return;
      const ids = [];
      for (const id of a.ids) {
        const u = mpUnitOwned(id, slot);
        if (u) ids.push(id);
      }
      if (ids.length) fireCow(state, ids, a.c, a.r, slot);
    } else if (kind === "resupply") {
      // تأمین مهمات منجنیق (0.149.0 — §۱۲.۲/بند ۵۷۸): آینه فرمان resupply در sim.js.
      if (!Array.isArray(a.ids) || a.ids.length > 32) return;
      const ids = [];
      for (const id of a.ids) {
        const u = mpUnitOwned(id, slot);
        if (u) ids.push(id);
      }
      if (ids.length) resupplyAmmo(state, ids, slot);
    } else if (kind === "demolish") {
      // تخریب دستی (0.39.0؛ 0.62.0 — ب-۱: با غرامت یک‌سوم): آینه applyCmd در sim.js — مال خودی، غیر ستاد.
      if (!Number.isInteger(a.bld)) return;
      const b = state.buildings.find((x) => x.id === a.bld && !x.destroyed);
      if (!b || (b.owner == null ? 0 : b.owner) !== slot) return;
      if (b.type === "keep") return;
      demolishBuilding(state, b, slot);
    } else if (kind === "repair") {
      if (!Number.isInteger(a.bld)) return;
      const b = state.buildings.find((x) => x.id === a.bld && !x.destroyed);
      if (!b || (b.owner == null ? 0 : b.owner) !== slot) return;
      repairBuilding(state, b, slot);
    } else if (kind === "release") {
      // release dogs (0.156.0): mirror of sim.js release command.
      if (!Number.isInteger(a.bld)) return;
      const b = state.buildings.find((x) => x.id === a.bld && !x.destroyed);
      if (!b || b.type !== "dogcage" || (b.owner == null ? 0 : b.owner) !== slot) return;
      releaseDogs(state, terrain, W, H, b, slot);
    } else if (kind === "undo") {
      // برگرداندن آخرین ساخت (0.146.0): آینه فرمان undo در sim.js.
      const r = undoLastBuild(state, slot);
      if (r.ok) assignStaff(state, slot);
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
    } else if (kind === "food") { // توقف/شروع مصرف غذا (بند ۸۵): آینه فرمان food در sim.js
      if (typeof a.v !== "string" || !FOOD_TYPES.includes(a.v)) return;
      const off = state.mpres[slot].offFood || (state.mpres[slot].offFood = []);
      const i = off.indexOf(a.v);
      if (i >= 0) off.splice(i, 1);
      else off.push(a.v);
    } else if (kind === "alarm") {
      if (!Number.isInteger(a.c) || !Number.isInteger(a.r)) return;
      const rs = alarmAll(state, a.c, a.r, slot);
      if (rs.some((r) => r.ok)) state.events.push(t("main.mp.raid", { n: slot + 1 }));
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
    if (!mpSession.watching && !mpFinishSent) {
      // پایان را دیده‌ام — یک‌بار به سرور گزارش بده (0.141.0) + بازی من تمام‌شده.
      mpFinishSent = true;
      lobby.finish(mpSession.code, state.mp.winner | 0);
      saveMyGames(markMyGameDoneList(loadMyGames(), mpSession.code));
      paintMyGames();
    }
    refreshPanel();
  }

  // هسته مشترک شروع نبرد چندنفره (0.141.0): ساخت زمین/وضعیت از سید + بازیکنان
  // roster (مرتب اسلات). slot خودم (تماشاگر: ‎-۱). نشست را می‌سازد و برمی‌گرداند.
  function initMpBattle(players, seed, slot, code, rules) {
    // زمین مشترک از سید اتاق (میزبان) — همه کلاینت‌ها یک نقشه می‌سازند.
    const s = (seed == null ? 0 : seed) >>> 0 || CONFIG.MAP_SEED;
    terrain = makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, s);
    mpClearSpawns(terrain, CONFIG.GRID_W, CONFIG.GRID_H);
    state = createState();
    state.mapSeed = s;
    // قوانین اتاق (0.147.0 — §۱۲.۴؛ 0.148.0 — §۱۴.۲؛ 0.149.0 — §۱۴.۲/بند ۷۳۰):
    // از میزبان برای همه یکسان (هش/ری‌پلی قطعی). غایب = پیش‌فرض مجاز/خاموش.
    // صلح No Rush از تیک صفر تا PEACE_TICKS (بازسازی قطعی در اتصال‌مجدد چون
    // از تیک صفر جلو می‌رویم).
    if (rules && (rules.noCow === true || rules.strongWalls === true || rules.noRush === true || rules.noDogs === true)) {
      state.rules = { noCow: rules.noCow === true, strongWalls: rules.strongWalls === true, noRush: rules.noRush === true, noDogs: rules.noDogs === true };
      state.peaceUntil = rules.noRush === true ? PEACE_TICKS : 0;
    }
    const sorted = players.slice().sort((a, b) => a.slot - b.slot);
    const names = [], logos = [];
    for (const p of sorted) { names[p.slot] = p.name; logos[p.slot] = (p.logo | 0) || 0; }
    enableMp(state, sorted.length >= 2 ? sorted.length : 2, names);
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
    pushEvent(state, t("game.ev.caravan")); // کاروان کالاهای اولیه هر قلعه (فاز ۱ بند ۱۳)
    mpSession = { code, slot, num: sorted.length, names, logos, watching: slot < 0 };
    mpPending.clear();
    mpNextSeq = 1;
    mpHashes.clear();
    mpHashLog.length = 0;
    mpDesync = null;
    mpDesyncSent = false;
    mpCatching = null;
    mpFinishSent = false;
    cmdQueue = createQueue(); // در MP ورودی فقط از شبکه می‌آید
    clock.reset();
    lastAutoTick = state.tick;
    hover = null;
    selIds = []; ctrlGroups = freshGroups(); lastGroupRecall = null; selBldId = null; bookmarks = {}; // بوکمارک هم گذراست (0.162.0)
    pendingKind = null;
    selectedKey = null;
    selectedUnit = null;
    setTick(0);
    state.events.push(t("main.mp.battleStart", { n: sorted.length, seed: s }));
    paintSeed(state);
    refreshPanel();
    return mpSession;
  }

  function startMpGame(room, seed) {
    // نکته: room.slot میزبانِ اتاق است یا اسلات خودم؟ lobby.mySlot اسلات خودم است.
    const slot = lobby.mySlot >= 0 ? lobby.mySlot : room.slot;
    initMpBattle(room.players, seed, slot, room.code, mpRulesOf(room));
  }

  // قوانین اتاق از آبجکت اتاق/تماشا (0.148.0 — §۱۴.۲؛ 0.149.0 — §۱۴.۲/بند ۷۳۰):
  // هر سه پرچم در یک جا خوانده می‌شوند تا هر ۳ مسیر شروع
  // (شروع/اتصال‌مجدد/تماشا) یکسان بمانند.
  function mpRulesOf(room) {
    if (!room) return null;
    const noCow = room.noCow === true, strongWalls = room.strongWalls === true, noRush = room.noRush === true, noDogs = room.noDogs === true;
    return (noCow || strongWalls || noRush || noDogs) ? { noCow, strongWalls, noRush, noDogs } : null;
  }

  // عقب‌ماندگی را صفحه‌به‌صفحه از سرور بگیر و در mpPending بگذار (0.141.0)؛
  // جلو‌بردن تیک‌ها با حلقه زنده (mpCatching) انجام می‌شود. serverSeq = seq بعدی سرور.
  async function mpCatchUp(code, serverSeq) {
    const total = Math.max(0, (serverSeq | 0) - 1);
    let from = 1, maxTick = -1, got = 0, guard = 0;
    paintSync(0, total);
    for (;;) {
      if (++guard > 200) break; // احتیاط در برابر حلقه بی‌پایان
      const d = await lobby.sync(code, from);
      const list = d.entries || [];
      for (const e of list) {
        if (typeof e.seq !== "number" || e.seq < mpNextSeq || mpPending.has(e.seq)) continue;
        mpPending.set(e.seq, e);
        got++;
        if (typeof e.tick === "number" && e.tick > maxTick) maxTick = e.tick;
      }
      paintSync(got, total);
      if (list.length) from = list[list.length - 1].seq + 1;
      if (from >= (d.next | 0)) break;
      if (!list.length) break;
    }
    paintSync(null);
    mpCatching = { target: Math.max(0, maxTick) + INPUT_DELAY + 1 };
    if (state.tick >= mpCatching.target) mpCatching = null;
    else mpDrain();
  }

  // نشست مرده (اتاق روی سرور نیست / توکن بد / لاگ جلو رفته): پاک‌سازی + پیام.
  function mpSessionDead(code, msgKey) {
    clearMpSession();
    if (code) { saveMyGames(markMyGameDoneList(loadMyGames(), code)); paintMyGames(); }
    mpStatus(msgKey ? t(msgKey, { code }) : t("main.mp.sessionDead", { code }));
    paintContinue();
  }

  // ورود به بازی جاری/تمام‌شده: بازیکن (با توکن) یا تماشاگر (0.141.0).
  // entry: {code, slot?, token?, password?}
  async function continueGame(entry, watching) {
    const code = entry.code;
    try {
      mpStatus(t("main.mp.rejoining", { code }));
      paintSync(0, 1);
      let info, serverSeq;
      if (watching) {
        const res = await lobby.watch(code, { password: entry.password });
        info = res.watch; serverSeq = res.seq;
      } else {
        const res = await lobby.rejoin(code, entry.slot, entry.token);
        info = res.room; serverSeq = res.seq;
      }
      const slot = watching ? -1 : info.slot;
      initMpBattle(info.players, info.seed, slot, code, mpRulesOf(info));
      hideMenu();
      if (!watching) {
        saveMpSession({ code, slot: info.slot, token: entry.token, seed: info.seed });
        saveMyGames(upsertMyGameList(loadMyGames(), { code, slot: info.slot, seed: info.seed }));
        paintMyGames();
        paintContinue();
        mpStatus(t("main.mp.started", { n: info.slot + 1, seed: (info.seed >>> 0) || CONFIG.MAP_SEED }));
      } else {
        mpStatus(t("main.mp.watching", { code }));
      }
      paintMp(lobby);
      await mpCatchUp(code, serverSeq);
    } catch (e) {
      paintSync(null);
      const err = (e && e.message) || "bad";
      if (err === "tooOld") mpSessionDead(code, "main.mp.tooOld");
      else if (err === "nocode" || err === "noroom" || err === "token") mpSessionDead(code);
      else mpStatus(t("main.err.prefix", { msg: MP_ERR_FA[err] || err }));
      paintContinue();
    }
  }

  // ---- لابی ----
  const lobby = initMpLobby(
    {},
    {
      warName: () => warName(profile),
      warLogo: () => warLogo(profile),
      getTick: () => state.tick,
      gameActive: () => !!mpSession,
      onLeave: () => {
        mpSession = null;
        mpCatching = null;
        mpPending.clear();
        newGame();
        showMenu();
        paintContinue();
        paintMyGames();
      },
      onError: (msg) => { mpStatus(msg || t("main.err.generic")); },
      paint: () => paintMp(lobby),
      onStart: (room, seed) => {
        const myRoom = { code: room.code, slot: lobby.mySlot, players: room.players, max: room.max, noCow: room.noCow === true, strongWalls: room.strongWalls === true, noRush: room.noRush === true, noDogs: room.noDogs === true };
        startMpGame(myRoom, seed);
        hideMenu();
        if (lobby.token) {
          saveMpSession({ code: room.code, slot: lobby.mySlot, token: lobby.token, seed });
          saveMyGames(upsertMyGameList(loadMyGames(), { code: room.code, slot: lobby.mySlot, seed }));
          paintMyGames();
          paintContinue();
        }
        mpStatus(t("main.mp.started", { n: lobby.mySlot + 1, seed: (seed >>> 0) || CONFIG.MAP_SEED }));
      },
      onInput: (m) => {
        if (!mpSession) return;
        if (typeof m.seq !== "number" || m.seq < 1) return;
        if (mpPending.has(m.seq) || m.seq < mpNextSeq) return;
        mpPending.set(m.seq, m);
        // ورودی زنده حین همگام‌سازی: هدف جلو‌بردن را به‌روز کن (0.141.0).
        if (mpCatching && typeof m.tick === "number") {
          const need = m.tick + INPUT_DELAY + 1;
          if (need > mpCatching.target) mpCatching.target = need;
        }
        mpDrain();
        refreshPanel();
      },
      onPeerLeft: (slot) => {
        if (!mpSession) return;
        state.events.push(t("main.mp.peerLeft", { n: slot + 1 }));
        eliminateSlot(slot);
      },
      onPeerGone: (slot) => {
        if (!mpSession) return;
        state.events.push(t("main.mp.peerGone", { n: slot + 1 }));
        refreshPanel();
      },
      onPeerBack: (slot) => {
        if (!mpSession) return;
        state.events.push(t("main.mp.peerBack", { n: slot + 1 }));
        refreshPanel();
      },
      onGameEnd: (winner) => {
        if (mpSession) { saveMyGames(markMyGameDoneList(loadMyGames(), mpSession.code)); paintMyGames(); }
        mpStatus(t("main.mp.ended", { n: (winner | 0) + 1 }));
      },
      onRejoined: (seq) => {
        // اتصال‌مجدد خودکار پس از قطعی گذرا (0.141.0): عقب‌ماندگی را همگام کن.
        if (!mpSession || !lobby.room) return;
        mpCatchUp(lobby.room.code, seq).catch((e) => {
          mpStatus(t("main.err.prefix", { msg: MP_ERR_FA[e.message] || e.message }));
        });
      },
    }
  );




  function selectedDef() { return selectedKey ? CONFIG.BUILDINGS[selectedKey] : null; }

  function ghostDef() {
    if (pendingKind === "alarm") return null;
    if (selectedUnit) return { w: 1, h: 1 };
    // گوست ساختمان فقط وقتی هیچ یگانی منتخب نیست — وگرنه حس «ساختمان‌سازی» روی دستور سایه می‌انداخت
    if (selectedKey && selIds.length === 0) return selectedDef();
    return null;
  }


  let lastHintKey = null;
  const refreshPanel = panelUI.refreshPanel;

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

  function orderSels() {
    const own = mpSession ? mpSession.slot : 0;
    return resolveSet(selIds, state.units).filter((u) => !u.dead && u.side === "player" && (u.owner == null ? 0 : u.owner) === own);
  }
  function foeBuilding(b) {
    if (!b || b.destroyed) return false;
    const own = mpSession ? mpSession.slot : 0;
    const bow = b.owner == null ? 0 : b.owner;
    if (bow === own) return false;
    if (state.mp && state.mp.enabled) return true;
    return bow === CONFIG.AI.owner && b.type !== "gate";
  }
  function foeUnit(u) {
    if (!u || u.dead) return false;
    const own = mpSession ? mpSession.slot : 0;
    return !(u.side === "player" && (u.owner == null ? 0 : u.owner) === own);
  }
  const CURSOR_ATTACK = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'21\' height=\'21\'%3E%3Cpath d=\'M10 2v17M2 10h17\' stroke=\'%23e33\' stroke-width=\'2.5\'/%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'6.5\' fill=\'none\' stroke=\'%23e33\' stroke-width=\'1.5\'/%3E%3C/svg%3E") 10 10, crosshair';
  function paintOrderCursor(sx, sy) {
    let foe = false;
    if (orderSels().length) {
      const rect = canvas.getBoundingClientRect();
      const cell = renderer.screenToCell(sx - rect.left, sy - rect.top);
      foe = foeUnit(unitAt(cell.c, cell.r)) || foeBuilding(buildingAt(cell.c, cell.r));
    }
    canvas.style.cursor = foe ? CURSOR_ATTACK : "";
  }

  function updateHover(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const cell = renderer.screenToCell(sx - rect.left, sy - rect.top);
    const hit = buildingAt(cell.c, cell.r);
    if (hit) {
      const def = CONFIG.BUILDINGS[hit.type];
      // نشان آتش (0.148.0 — §۱۸.۴): بنای در حال سوختن در همه شاخه‌های
      // هاور همین برچسب را می‌گیرد (به hpTxt چسبیده تا هیچ شاخه‌ای جا نماند).
      const hpTxt = ` — ${hit.hp}/${hit.maxHp}` + ((hit.fire > 0 && !hit.destroyed) ? ` — ${badB(t("main.hover.burning"))}` : "");
      if (hit.type === "gate" && !hit.destroyed) {
        statusEl.innerHTML = `${def.name}${hpTxt} — ${hit.open === false ? badB(t("main.hover.closed")) : okB(t("main.hover.open"))} ${t("main.hover.gateTip")}`;
      } else if (hit.type === "keep" && !hit.destroyed) {
        statusEl.innerHTML = `${lordPortraitHTML(profile.logo)}${def.name}${hpTxt} — ${okB(t("main.hover.keep"))} — ${t("main.hover.ident", { name: t("ui.menu.ident." + (state.ident || "none")) })}`;
      } else if (isGarrisonPost(hit.type) && !hit.destroyed) {
        // گاریسون برج (0.45.0): شمار مدافعان روی هاور.
        const g = hit.garrison && hit.garrison.length ? hit.garrison.length : 0;
        const buildTxt = (hit.buildLeft || 0) > 0
          ? ` — ${badB(t("main.hover.building", { n: faNum(Math.ceil(hit.buildLeft / 10)) }))}`
          : "";
        statusEl.innerHTML = `${def.name}${hpTxt} — ${t("main.hover.garrison", { g: faNum(g), cap: faNum(garrisonCapFor(hit.type)) })}${buildTxt}`;
        // اشاره fortify (0.161.0 — §10.2/بند 559): با یگان منتخب، هاور برج = استحکامات مستقیم.
        const fOwn = mpSession ? mpSession.slot : 0;
        const fSel = resolveSet(selIds, state.units).filter((u) => !u.dead && u.side === "player" && (u.owner == null ? 0 : u.owner) === fOwn);
        if (fSel.length) {
          statusEl.innerHTML += ((hit.owner == null ? 0 : hit.owner) === fOwn)
            ? ` — ${okB(t("main.hover.fortify"))}`
            : ` — ${badB(t("main.hover.fortifyFoe"))}`;
        }
      } else if (hit.type === "inn" && !hit.destroyed) {
        statusEl.innerHTML = `${def.name}${hpTxt} — ${hit.served ? okB(t("main.hover.innServing")) : badB(t("main.hover.innDry"))}`;
      } else if (hit.type === "granary" && !hit.destroyed && !(hit.buildLeft > 0)) {
        // هاور انبارغذا (فاز ۱ بند ۸۷): گزارش دقیق داخل (سقف برداشته شد).
        const rep = foodReport(state, hit.owner);
        const repLasts = rep.lastsMin == null ? "—" : faNum(Math.round(rep.lastsMin * 10) / 10);
        statusEl.innerHTML = `${def.name}${hpTxt} — ${t("main.hover.granary", { total: faNum(rep.total), lasts: repLasts, types: faNum(rep.types) })}`;
      } else if (hit.type === "stockpile" && !hit.destroyed && !(hit.buildLeft > 0)) {
        // هاور انبار (فاز ۱ بند ۸۳): موجودی هر ۴ نوع (سقف برداشته شد).
        const rows = stockpileInterior(state, hit.owner);
        const amt = (k) => faNum(((rows.find((x) => x.type === k)) || { amount: 0 }).amount);
        statusEl.innerHTML = `${def.name}${hpTxt} — ${t("main.hover.stockpile", { w: amt("wood"), s: amt("stone"), g: amt("gold"), l: amt("leather") })}`;
      } else if (hit.type === "killpit" && !hit.destroyed) {
        const ch = Number.isInteger(hit.charges) ? hit.charges : KILLPIT_CHARGES;
        const buildTxt = (hit.buildLeft || 0) > 0
          ? ` — ${badB(t("main.hover.building", { n: faNum(Math.ceil(hit.buildLeft / 10)) }))}`
          : "";
        statusEl.innerHTML = `${def.name}${hpTxt} — ${t("main.hover.pit", { n: faNum(ch) })}${buildTxt}`;
      } else if (hit.type === "dogcage" && !hit.destroyed) {
        const dn = cageDogs(hit);
        const buildTxt = (hit.buildLeft || 0) > 0
          ? ` — ${badB(t("main.hover.building", { n: faNum(Math.ceil(hit.buildLeft / 10)) }))}`
          : "";
        statusEl.innerHTML = `${def.name}${hpTxt} — ${t("main.hover.dogs", { n: faNum(dn), cap: faNum(DOGS_PER_CAGE) })}${buildTxt}`;
      } else if (def.prod) {
        if ((hit.buildLeft || 0) > 0) {
          statusEl.innerHTML = `${def.name}${hpTxt} — ${badB(t("main.hover.building", { n: faNum(Math.ceil(hit.buildLeft / 10)) }))}`;
        } else statusEl.innerHTML = hit.staffed === false
          ? `${def.name}${hpTxt} — ${badB(t("main.hover.unstaffed"))}`
          : (hit.starved
            ? (hit.type === "quarry" && !hasOxTether(state, hit.owner)
              ? `${def.name}${hpTxt} — ${badB(t("main.hover.quarryNoOx"))}`
              : (hit.type === "tannery"
                ? `${def.name}${hpTxt} — ${badB(t("main.hover.noCow"))}`
                : `${def.name}${hpTxt} — ${badB(t("main.hover.starved", { res: escName(resName(Object.keys((RATES[hit.type] || {}).consumes || { "?": 0 })[0])) }))}`))
            : `${def.name}${hpTxt} — ${okB(t("main.hover.producing"))}`);
      } else {
        statusEl.innerHTML = (hit.buildLeft || 0) > 0
          ? `${def.name}${hpTxt} — ${badB(t("main.hover.building", { n: faNum(Math.ceil(hit.buildLeft / 10)) }))}`
          : `${def.name}${hpTxt}`;
      }
      if (orderSels().length && foeBuilding(hit)) statusEl.innerHTML += " - " + badB(t("main.hover.attack")); // 0.162.0
      hover = { c: cell.c, r: cell.r, valid: true, reason: "OK", ghost: false };
      hover.order = orderSels().length > 0 && foeBuilding(hit);
      return;
    }
    const hu = unitAt(cell.c, cell.r);
    if (hu) {
      const def = UNITS[hu.type];
      const lordTag = hu.type === "lord" ? ` — ${badB(t("main.hover.lordDeath"))}` : "";
      statusEl.innerHTML = `${def.name} — <b class="${hu.side === "player" ? "ok" : "bad"}">${hu.hp}/${hu.maxHp}</b> • ${t("main.meta.armor", { n: faNum(def.armor || 0) })} • ${srcTag(def)}${lordTag}`;
      if (orderSels().length && foeUnit(hu)) statusEl.innerHTML += " - " + badB(t("main.hover.attack")); // 0.162.0
      hover = { c: cell.c, r: cell.r, valid: true, reason: "OK", ghost: false };
      hover.order = orderSels().length > 0 && foeUnit(hu);
      return;
    }
    const inMap = cell.c >= 0 && cell.r >= 0 && cell.c < CONFIG.GRID_W && cell.r < CONFIG.GRID_H;
    if (pendingKind === "alarm") {
      hover = { c: cell.c, r: cell.r, valid: true, reason: "OK", ghost: false };
      statusEl.innerHTML = inMap ? t("main.hover.alarm", { c: cell.c, r: cell.r }) : t("main.hover.outOfMap");
      return;
    }
    if (selectedUnit) {
      const v = validateHire(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, cell.c, cell.r, selectedUnit, mpSession ? mpSession.slot : 0);
      hover = { c: cell.c, r: cell.r, valid: v.ok, reason: v.reason, ghost: true };
      const fa = HIRE_FA[v.reason] || v.reason;
      statusEl.innerHTML = inMap
        ? `${t("main.hover.cell", { c: cell.c, r: cell.r })} — <b class="${v.ok ? "ok" : "bad"}">${fa}</b>`
        : `${t("main.hover.outOfMap")} — <b class="bad">${HIRE_FA.OUT_OF_BOUNDS}</b>`;
      return;
    }
    const def = selIds.length === 0 ? selectedDef() : null;
    if (def) {
      // پیش‌نمایش گوست هم قفل Keep را نشان می‌دهد (فاز ۱ بند ۱۲).
      if (!hasLiveKeep(state, mpSession ? mpSession.slot : 0)) {
        hover = { c: cell.c, r: cell.r, valid: false, reason: "NO_KEEP", ghost: true };
        const nk = REASON_FA.NO_KEEP || "NO_KEEP";
        statusEl.innerHTML = inMap
          ? `${t("main.hover.cell", { c: cell.c, r: cell.r })} — <b class="bad">${nk}</b>`
          : `${t("main.hover.outOfMap")} — <b class="bad">${HIRE_FA.OUT_OF_BOUNDS}</b>`;
        return;
      }
      const v = validate(state, terrain, CONFIG.GRID_W, CONFIG.GRID_H, cell.c, cell.r, def, mpSession ? mpSession.slot : 0);
      hover = { c: cell.c, r: cell.r, valid: v.ok, reason: v.reason, ghost: true };
      const fa = REASON_FA[v.reason] || v.reason;
      statusEl.innerHTML = inMap
        ? `${t("main.hover.cell", { c: cell.c, r: cell.r })} — <b class="${v.ok ? "ok" : "bad"}">${fa}</b>`
        : `${t("main.hover.outOfMap")} — <b class="bad">${HIRE_FA.OUT_OF_BOUNDS}</b>`;
      return;
    }
    // حالت فرمان/خنثی: گوست ساخت خاموش تا کلیکِ سرباز حس ساختمان ندهد
    hover = { c: cell.c, r: cell.r, valid: true, reason: "OK", ghost: false };
    if (!inMap) {
      statusEl.innerHTML = t("main.hover.outOfMap");
      return;
    }
    const sels = resolveSet(selIds, state.units);
    if (pendingKind === "attackmove" && sels.length) {
      statusEl.innerHTML = t("main.hover.attackMove", { c: cell.c, r: cell.r });
    } else if (pendingKind === "patrol" && sels.length) { // گشت (0.162.0)
      const pl = sels.find((u) => u.order && u.order.status === "active" && u.order.kind === "patrol" && Array.isArray(u.order.pts));
      statusEl.innerHTML = pl
        ? t("main.hover.patrolAdd", { c: cell.c, r: cell.r, n: faNum(pl.order.pts.length) })
        : t("main.hover.patrol", { c: cell.c, r: cell.r });
      if (sels.some((u) => isSoloLord(state, u)) && !lordKeepGate(state, cell.c, cell.r)) statusEl.innerHTML += " — " + badB(ORDER_FA.LORD_KEEP);
    } else if (pendingKind === "guard" && sels.length) {
      statusEl.innerHTML = t("main.hover.guard");
    } else if (pendingKind === "garrison" && sels.length) {
      statusEl.innerHTML = t("main.hover.garrisonPick");
    } else if (sels.length > 1) {
      statusEl.innerHTML = t("main.hover.group", { num: faNum(sels.length), c: cell.c, r: cell.r });
    } else if (sels.length === 1) {
      statusEl.innerHTML = t("main.hover.move", { c: cell.c, r: cell.r });
      if (isSoloLord(state, sels[0]) && !lordKeepGate(state, cell.c, cell.r)) statusEl.innerHTML += " — " + badB(ORDER_FA.LORD_KEEP);
    } else {
      statusEl.innerHTML = t("main.hover.idle");
    }
    if (hover) hover.order = orderHoverMark(pendingKind, sels.length);
  }

  // تعامل: درگ برای جابه‌جایی، کلیک برای ساخت/استخدام/دستور، چرخ برای زوم. (0.265.0 — C-CLN-85): استخراج مکانیکی به game/pointerui.js — بدون تغییر منطق.
  const pointerUI = createPointerInput({ getState: () => state, getTerrain: () => terrain, getMpSession: () => mpSession, getReplayWatch: () => replayWatch, getBookmarks: () => bookmarks, getLastBookmark: () => lastBookmark, setLastBookmark: (v) => { lastBookmark = v; }, getSelIds: () => selIds, setSelIds: (v) => { selIds = v; }, setSelBldId: (v) => { selBldId = v; }, getSelectedKey: () => selectedKey, setSelectedKey: (v) => { selectedKey = v; }, getSelectedUnit: () => selectedUnit, setSelectedUnit: (v) => { selectedUnit = v; }, getPendingKind: () => pendingKind, setPendingKind: (v) => { pendingKind = v; }, setHover: (v) => { hover = v; }, getSelFoe: () => selFoe, setSelFoe: (v) => { selFoe = v; }, later: () => ({ getEditor, edPaintAt, edCellFromEvent }), canvas, renderer, statusEl, sound, refreshPanel, playerCmd, mpSend, updateHover, paintOrderCursor, buildingAt, unitAt, selectedDef, toggleMercs, toggleMarket, toggleGranary });
  const clearWallLine = pointerUI.clearWallLine, hideBox = pointerUI.hideBox, getDownPos = pointerUI.getDownPos, getLastEdgePos = pointerUI.getLastEdgePos, getWallLine = pointerUI.getWallLine;

  // هایلایت/پالت/ارتش/یگان/کلیدها (0.266.0 — C-CLN-86): استخراج مکانیکی به game/palettekeys.js — بدون تغییر منطق.
  const paletteKeysUI = createPaletteKeysUI({ getState: () => state, getMpSession: () => mpSession, getReplayWatch: () => replayWatch, getBookmarks: () => bookmarks, getHover: () => hover, getSelIds: () => selIds, setSelIds: (v) => { selIds = v; }, setSelectedKey: (v) => { selectedKey = v; }, getSelectedKey: () => selectedKey, setSelectedUnit: (v) => { selectedUnit = v; }, getSelectedUnit: () => selectedUnit, setPendingKind: (v) => { pendingKind = v; }, setLastBookmark: (v) => { lastBookmark = v; }, getLastGroupRecall: () => lastGroupRecall, setLastGroupRecall: (v) => { lastGroupRecall = v; }, getLastLordId: () => lastLordId, setLastLordId: (v) => { lastLordId = v; }, getSignCycle: () => signCycle, setSignCycle: (v) => { signCycle = v; }, getCtrlGroups: () => ctrlGroups, setCtrlGroups: (v) => { ctrlGroups = v; }, later: () => ({ getEditor, closeEditor, exitWatch, selUnits, orderStance, modalOverlay, modal, soundIconBtn }), $, armyRowsEl, clearWallLine, hideGranary, hideMarket, hideMercs, hideReports, keyMap, mpSend, palBtns, pauseBtn, playerCmd, refreshPanel, renderer, statusEl, taxSlider, unitBtns });
  const keyUI = paletteKeysUI.keyUI, getKeyRecAction = paletteKeysUI.getKeyRecAction, setKeyRecAction = paletteKeysUI.setKeyRecAction;
  // دکمه‌های سفارش/مودال/صدا/مالیات (0.267.0 — C-CLN-87): استخراج مکانیکی به game/ordersui.js — بدون تغییر منطق.
  const ordersUI = createOrdersUI({ getState: () => state, getTerrain: () => terrain, getMpSession: () => mpSession, getReplayWatch: () => replayWatch, getSelIds: () => selIds, getPendingKind: () => pendingKind, setPendingKind: (v) => { pendingKind = v; }, setSelectedKey: (v) => { selectedKey = v; }, setSelectedUnit: (v) => { selectedUnit = v; }, getExactRes: () => exactRes, setExactRes: (v) => { exactRes = v; }, later: () => ({ getEditor, newGame, startMission, getLastMissionKey }), $, alarmBtn, defeatRestartBtn, demolishBtn, lobby, mpSend, orderSels, pauseBtn, playerCmd, ratBtns, refreshPanel, repairBtn, resEl, resetBtn, scribeUI, sound, speedBtn, statusEl, taxBtns, taxSlider, undoBtn, victoryRestartBtn, waveBtn });
  const selUnits = ordersUI.selUnits, orderStance = ordersUI.orderStance, modalOverlay = ordersUI.modalOverlay, modal = ordersUI.modal, soundIconBtn = ordersUI.soundIconBtn, soundUI = ordersUI.soundUI, unitCard = ordersUI.unitCard, unitNameEl = ordersUI.unitNameEl, unitHpEl = ordersUI.unitHpEl, bldCard = ordersUI.bldCard, bldNameEl = ordersUI.bldNameEl, bldHpEl = ordersUI.bldHpEl, bldStateEl = ordersUI.bldStateEl, stanceEngageBtn = ordersUI.stanceEngageBtn, stanceDefendBtn = ordersUI.stanceDefendBtn, stanceHoldBtn = ordersUI.stanceHoldBtn, attackMoveBtn = ordersUI.attackMoveBtn, guardBtn = ordersUI.guardBtn, garrisonBtn = ordersUI.garrisonBtn, deployBtn = ordersUI.deployBtn, firecowBtn = ordersUI.firecowBtn, resupplyBtn = ordersUI.resupplyBtn, unitOrderEl = ordersUI.unitOrderEl, patrolBtn = ordersUI.patrolBtn, attackposBtn = ordersUI.attackposBtn, disbandBtn = ordersUI.disbandBtn;

  // راه‌اندازی بازی/منو/ذخیره (0.268.0 — C-CLN-88): استخراج مکانیکی به game/savemenu.js — بدون تغییر منطق.
  const saveMenuUI = createSaveMenuUI({ getMpSession: () => mpSession, getState: () => state, getRecLog: () => recLog, getSoloDiff: () => soloDiff, setSoloDiff: (v) => { soloDiff = v; }, getSoloIdentity: () => soloIdentity, setSoloIdentity: (v) => { soloIdentity = v; }, getSoloMapKey: () => soloMapKey, setSoloMapKey: (v) => { soloMapKey = v; }, getSoloPersonality: () => soloPersonality, setSoloPersonality: (v) => { soloPersonality = v; }, getA11yPalette: () => a11yPalette, setA11yPalette: (v) => { a11yPalette = v; }, getProfile: () => profile, setProfile: (v) => { profile = v; }, getSoloAutosave: () => soloAutosave, setSoloAutosave: (v) => { soloAutosave = v; }, getUiScale: () => uiScale, setUiScale: (v) => { uiScale = v; }, getDayNight: () => dayNight, getFidelity: () => fidelity, getTerrain: () => terrain, getReplayWatch: () => replayWatch, setBookmarks: (v) => { bookmarks = v; }, setCmdQueue: (v) => { cmdQueue = v; }, setCtrlGroups: (v) => { ctrlGroups = v; }, setHover: (v) => { hover = v; }, setLastAutoTick: (v) => { lastAutoTick = v; }, setLastGroupRecall: (v) => { lastGroupRecall = v; }, setLastSoundSnap: (v) => { lastSoundSnap = v; }, setMastersLogged: (v) => { mastersLogged = v; }, setMclockStart: (v) => { mclockStart = v; }, setMpDesync: (v) => { mpDesync = v; }, setMpDesyncSent: (v) => { mpDesyncSent = v; }, setMpNextSeq: (v) => { mpNextSeq = v; }, setMpSession: (v) => { mpSession = v; }, setPendingKind: (v) => { pendingKind = v; }, setRecLog: (v) => { recLog = v; }, setReplayWatch: (v) => { replayWatch = v; }, setSelBldId: (v) => { selBldId = v; }, setSelIds: (v) => { selIds = v; }, setState: (v) => { state = v; }, setTerrain: (v) => { terrain = v; }, later: () => ({ applyLoaded, closeEditor, getEditor, startWatch }), $, applyA11y, applyDayNight, applyFidelity, clock, delBtn, hideReplayBar, keyUI, getKeyRecAction, setKeyRecAction, loadBtn, lobby, mpHashes, mpPending, online, paintMapPreview, paintReplayStatus, refreshPanel, renderer, saveBtn, saveStatus, setTick, sound });
  const newGame = saveMenuUI.newGame, startMission = saveMenuUI.startMission, getLastMissionKey = saveMenuUI.getLastMissionKey, missionLabel = saveMenuUI.missionLabel, checkMission = saveMenuUI.checkMission, recordMasters = saveMenuUI.recordMasters, paintCampaign = saveMenuUI.paintCampaign, paintMasters = saveMenuUI.paintMasters, getMissionActive = saveMenuUI.getMissionActive, getMissionWon = saveMenuUI.getMissionWon, getMissionLost = saveMenuUI.getMissionLost, setMissionActive = saveMenuUI.setMissionActive, setMissionWon = saveMenuUI.setMissionWon, setMissionLost = saveMenuUI.setMissionLost, setLastMissionKey = saveMenuUI.setLastMissionKey, setMastersFilter = saveMenuUI.setMastersFilter, menuMsg = saveMenuUI.menuMsg, showMenu = saveMenuUI.showMenu, hideMenu = saveMenuUI.hideMenu, getMenuNavApi = saveMenuUI.getMenuNavApi, getMenuRelabelFns = saveMenuUI.getMenuRelabelFns;
  // ابر/ری‌پلی (0.269.0 — C-CLN-89): استخراج مکانیکی به game/cloudreplay.js — بدون تغییر منطق.
  createCloudReplayUI({ getMpSession: () => mpSession, getState: () => state, getRecLog: () => recLog, getReplayWatch: () => replayWatch, later: () => ({ applyLoaded, replayLogOf, startWatch, exitWatch, paintReplayStatus }), $ });
  const watchUI = createWatchUI({ getState: () => state, setState: (v) => { state = v; }, setTerrain: (v) => { terrain = v; }, getMpPending: () => mpPending, getMpHashes: () => mpHashes, getSoloDiff: () => soloDiff, getSoloPersonality: () => soloPersonality, setMpSession: (v) => { mpSession = v; }, setMpNextSeq: (v) => { mpNextSeq = v; }, setMpDesync: (v) => { mpDesync = v; }, setMpDesyncSent: (v) => { mpDesyncSent = v; }, setCmdQueue: (v) => { cmdQueue = v; }, setRecLog: (v) => { recLog = v; }, setReplayWatch: (v) => { replayWatch = v; }, setLastAutoTick: (v) => { lastAutoTick = v; }, setLastSoundSnap: (v) => { lastSoundSnap = v; }, setHover: (v) => { hover = v; }, setSelIds: (v) => { selIds = v; }, setCtrlGroups: (v) => { ctrlGroups = v; }, setLastGroupRecall: (v) => { lastGroupRecall = v; }, setSelBldId: (v) => { selBldId = v; }, setBookmarks: (v) => { bookmarks = v; }, setSelectedKey: (v) => { selectedKey = v; }, setSelectedUnit: (v) => { selectedUnit = v; }, setPendingKind: (v) => { pendingKind = v; }, setMclockStart: (v) => { mclockStart = v; }, setMastersLogged: (v) => { mastersLogged = v; }, setMissionActive, setMissionWon, setMissionLost, setLastMissionKey, getEditor: () => getEditor(), closeEditor: (...a) => closeEditor(...a), online, clock, saveStatus, paintSeed, setTick, hideReplayBar, paintReplayBar, paintReplayStatus, hideMenu, showMenu, newGame, hideMercs, hideMarket, clearWallLine, refreshPanel });
  const replayLogOf = watchUI.replayLogOf;
  const startWatch = watchUI.startWatch;
  const exitWatch = watchUI.exitWatch;
  const applyLoaded = watchUI.applyLoaded;
  const editorUI = createEditorUI({ getState: () => state, setTerrain: (v) => { terrain = v; }, getMpSession: () => mpSession, getReplayWatch: () => replayWatch, getSoloDiff: () => soloDiff, getMinimapUI: () => minimapUI, setSelectedKey: (v) => { selectedKey = v; }, setSelectedUnit: (v) => { selectedUnit = v; }, setPendingKind: (v) => { pendingKind = v; }, setSelIds: (v) => { selIds = v; }, setHover: (v) => { hover = v; }, exitWatch, newGame, hideMercs, hideMarket, clearWallLine, hideBox, hideMenu, showMenu, refreshPanel, menuMsg, renderer, canvas, menuRelabelFns: getMenuRelabelFns() });
  const openEditor = editorUI.openEditor;
  const closeEditor = editorUI.closeEditor;
  const blankView = editorUI.blankView;
  const lazyTable = editorUI.lazyTable;
  const edCounts = editorUI.edCounts;
  const syncEditorPanel = editorUI.syncEditorPanel;
  const edCellFromEvent = editorUI.edCellFromEvent;
  const edPaintAt = editorUI.edPaintAt;
  const getEditor = editorUI.getEditor;


  // لابی رقابتی (0.270.0 — C-CLN-90): استخراج مکانیکی به game/lobbywiring.js — بدون تغییر منطق.
  const lobbyWiringUI = createLobbyWiringUI({ getMpSession: () => mpSession, lobby, mpStatus, paintMpMapPreview, getMenuRelabelFns, lazyTable, continueGame, mpSessionDead, $ });
  const saveMpSession = lobbyWiringUI.saveMpSession, clearMpSession = lobbyWiringUI.clearMpSession, loadMyGames = lobbyWiringUI.loadMyGames, saveMyGames = lobbyWiringUI.saveMyGames, paintContinue = lobbyWiringUI.paintContinue, paintMyGames = lobbyWiringUI.paintMyGames, MP_ERR_FA = lobbyWiringUI.MP_ERR_FA;

  // نما/قاب (0.271.0 — C-CLN-91): استخراج مکانیکی به game/viewframe.js — بدون تغییر منطق.
  const viewFrameUI = createViewFrameUI({ getState: () => state, getTerrain: () => terrain, getHover: () => hover, getSelIds: () => selIds, getLastSoundSnap: () => lastSoundSnap, setLastSoundSnap: (v) => { lastSoundSnap = v; }, getFidelity: () => fidelity, getFidelityAuto: () => fidelityAuto, setFidelityAuto: (v) => { fidelityAuto = v; }, $, clock, sound, renderer, getEditor, editorUI, blankView, ghostDef, getWallLine, getDownPos, getLastEdgePos, modalOverlay, fpsEl, statusEl, t, faNum, CONFIG, applyFidelity, keyMap, createFlatView, createMinimapUI, edgePanDir, EDGE_PAN_STEP, soundSnapshot });
  const flat = viewFrameUI.flat, frame = viewFrameUI.frame, minimapUI = viewFrameUI.minimapUI;

  // دم بوت (0.272.0 — C-CLN-92): استخراج مکانیکی به game/boottail.js — بدون تغییر منطق.
  createBootTail({ getState: () => state, getProfile: () => profile, getMenuRelabelFns, refreshPanel, setTick, assignStaff, showMenu, getMenuNavApi, $, paintCompat, saveStatus, policy, keyUI, soundUI, flat, renderer, paintSeed, paintReplayStatus, paintReplayBar, paintMp, lobby, paintMarket, paintTrain, getEditor, syncEditorPanel, edCounts, online, frame });

  // آزمون خودکار: ?test در URL یا فراخوانی دستی
  if (/[?&]test\b/.test(location.search)) {
    setTimeout(() => showTests(testBadge), 400);
  }

  // قلاب تست (0.273.0 — C-CLN-93): استخراج مکانیکی به game/testhook.js — بدون تغییر منطق.
  window.__slice01 = createTestHookUI({ getState: () => state, getTerrain: () => terrain, getMpSession: () => mpSession, getMpDesync: () => mpDesync, getSelBldId: () => selBldId, getSelIds: () => selIds, getSelectedKey: () => selectedKey, getCmdQueue: () => cmdQueue, getProfile: () => profile, setState: (v) => { state = v; }, setTerrain: (v) => { terrain = v; }, setMpSession: (v) => { mpSession = v; }, setMpNextSeq: (v) => { mpNextSeq = v; }, setSelIds: (v) => { selIds = v; }, setSelectedKey: (v) => { selectedKey = v; }, setSelectedUnit: (v) => { selectedUnit = v; }, setPendingKind: (v) => { pendingKind = v; }, setProfile: (v) => { profile = v; }, $, canvas, clock, exitWatch, getEditor, getMissionActive, getMissionLost, getMissionWon, hideMenu, lobby, mpHashes, mpHashLog, mpPending, newGame, online, paintCampaign, paintMasters, paintMp, refreshPanel, setMastersFilter, setTick, showMenu, sound, startMission, startWatch, tickViewHooks, renderer, applyMpInput, testBadge });
}

function bootGuarded() {
  try {
    boot();
  } catch (e) {
    // گزارش خطای بوت به قاب والد (پیش‌نمایش ریشه): عیب‌یابی cross-origin.
    try { window.parent.postMessage({ type: "arg-boot-error", message: String((e && e.stack) || e) }, "*"); } catch (e2) {}
    throw e;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootGuarded);
} else {
  bootGuarded();
}
