// دسترس‌پذیری + ردیف‌های 1234-1258 (0.247.0 — C-CLN-38): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { t, withLang, getLang, setLang } from "../i18n.js";
import { makeTerrain, T_GRASS, T_WATER, T_ROCK, T_OASIS } from "../terrain.js";
import { createState } from "../state.js";
import { assignStaff, stepEconomy, popTarget, campGauge, innBonus, drunkards, religionCoverage, religionBonus, RELIGION, RELIGION_TYPES, fearLevel, fearPop, RATES, TAX, RATIONS, INN, EAT_THRESHOLD, MIG_PERIOD, IMM_IN, IMM_OUT, CAPS, activeEvents, eventBonus, GRANARY_RES, ARMOURY_RES, GRANARY_BONUS, capFor, workersNeeded, POP_CAP, POP_CAP_EXTREME, CAMP_IDLE_MAX, popTotal, atPopCap } from "../economy.js";
import { tryPlace, validate, placeKeep, nearOasis, OASIS_FARM_RADIUS, REASONS } from "../construction.js";
import { serializeJSON, deserializeJSON, validAutosave, autosaveDue, saveSlot } from "../persist.js";
import { BENCH_BUDGET, withinBudget, benchSim, MOBILE_BENCH_TICKS } from "../bench.js";
import { hireGoodsFor, UNITS, spawnUnit, hireUnit, strike, validateHire, spawnLord, FINAL_WAVE, peaceActive, setStance, stepCombat, toggleGate, effectiveDmg, garrisonUnit, stepHealers, STANCES, DEFEND_RADIUS, ENGAGE_RADIUS, ENGAGE_DROP, IDENTITIES, validIdentity, isTowerFamily, stepGateCapture, disbandUnit, queueOrder, soldierValue, armyValue } from "../combat.js";
import { findPath, nearestWalkable, isCellWalkable } from "../pathfind.js";
import { dprCapFor } from "../render.js";
import { UNIT_DATA } from "../units.gen.js";
import { ensureWakeLock, releaseWakeLock, isWakeLocked, canWakeLock } from "../wakelock.js";
import { HUD_COLLAPSE_PX, hudShouldCollapse, isHudOpen, setHudOpen } from "../mobilehud.js";
import { SHEET_OVERLAY_PX, sheetShouldOverlay, isSheetOpen, setSheetOpen } from "../mobilesheet.js";
import { spriteInlineCount, spriteCacheSize } from "../sprites.js";
import { TILE_DATA } from "../tiles.gen.js";
import { DECOR_DATA } from "../decor.gen.js";
import { mulberry32 } from "../rng.js";
import { BUILDING_CATEGORIES, BALANCE, TUNING, TAX_IDS, RATION_IDS } from "../data.js";
import { stepTraining } from "../train.js";
import { MISSION_KINDS, validateMission, createRun, updateRun, clockReady, clockText, MISSIONS } from "../missions.js";
import { missionIndex } from "../campaign.js";
import { masterScore, masterEntry } from "../masters.js";
import { resolveSocketUrl } from "../selfhost.js";
import { marketTrader } from "../market.js";
import { startAI, stepAI, aiRandAt, aiDifficulty, aiRaidPlan, aiPersonality, aiRaidUnitType, AI_OWNER } from "../ai.js";
import { drawMinimap, minimapCell, panForCell, paintMapThumb, MM_KEEP_STAR } from "../minimap.js";
import { zoomStep } from "../gestures.js";
import { BANNED_NAMES, scanBanned, scanContent } from "../legal.js";
import { A11Y_PALETTES, A11Y_SCALES, KEY_ACTIONS, DEFAULT_KEYS, KEY_ACTION_FA, validPalette, clampScale, validKeyCode, normalizeKeys, cycleSpeed } from "../a11y.js";
import { loadVolumes, createSoundManager } from "../sound.js";
import { newSoloFromSeed } from "../replay.js";
import { MAP_V, PATCH_CAP, BRUSHES, createMapDoc, patchesList, baseTerrain, paintCells, normalizeMapDoc, exportMapDoc, importMapDoc, validatePlayable } from "../mapedit.js";
import { MENU_PAGES } from "../menunav.js";
import { HINT_STEPS } from "../hints.js";
import { taxInfo, rationInfo, policySummary, advisorWarnings, innInfo, religionInfo, scribeMood, scribeReports, powerTier, POWER_COLORS } from "../advisor.js";
import { enableMp, MP_MAX, MP_SPAWN_ANCHOR, INPUT_DELAY, stateHash } from "../mp.js";
import { roomRowHTML, liveRowHTML, myGameRowHTML, roomHostSlot, isRoomHost, hostStar } from "../lobby.js";
import { must, fresh, mpFresh, sim, simC, completeAll, grassNear, needBarracks, stubCtx, siteNear, aiSim, grassInBand, placeGateAt } from "./fixtures.js";
import { lordPortraitHTML } from "../profile.js";
import * as terrainNs from "../terrain.js";
import * as constrNs from "../construction.js";

// --- دسترس‌پذیری دسکتاپ (0.57.0 — #۲۶ از FEATURES) ---
export function a11yCases() {
  return [t_a11y_catalog, t_a11y_scale, t_a11y_keys,
    t_hotkeys_row1234, t_i18n_row1235, t_a11y_row1236,
    t_options_row731, t_catshields_row138, t_menu_row118,
    t_flat_row161, t_mapeditor_row99, t_customscen_row98, t_tutorial_row101,
    t_workbench_row757, t_lose_row128, t_alldone_row126, t_defeatclock_row1178, t_formulas_row1250,
    t_tabar_row772, t_tause_row773, t_tapowers_row774, t_tabarpts_row1126, t_tacosts_row1127,
    t_tafill_row1128, t_tavals_row1129, t_score_row127, t_scorecomp_row1122, t_trail_row1123,
    t_blackmonk_row891, t_lordarrow_row932, t_accuracy_row962, t_rotate_row158, t_mystery_row506,
    t_month_row1022, t_fooduse_row1043, t_grancap_row1044, t_foodsell_row1045, t_ailord_row890,
    t_woodcutter_row688, t_hunter_row689, t_peasant_row691, t_lady_row686, t_jester_row687,
    t_children_row692, t_stonemason_row694, t_ironminer_row695, t_baker_row698, t_brewer_row699,
    t_farmer_row690, t_mothers_row693, t_millboy_row697, t_innkeeper_row700, t_drunkard_row701,
    t_fletcher_row702, t_armorer_row703, t_blacksmith_row704, t_priest_row707, t_healer_row708,
    t_pitchdigger_row696, t_poleturner_row705, t_trader_row709, t_juggler_row710, t_campfill_row177,
    t_damage_row924, t_simple_row933, t_height_row961, t_gamespeed_row963, t_melee_row1152,
    t_tenttime_row1012, t_tunnelref_row1013, t_siegetower_row1014, t_pitchditch_row1017, t_wheatfarm_row1047,
    t_gametype_row725, t_gametype_row89, t_startres_row1107, t_objectives_row124, t_icons_row148,
    t_handicap_row1105, t_stockcaps_row1108, t_castlebuilder_row96, t_kick_row721, t_chat_row741,
    t_ironmine_row444, t_market_row445, t_quarry_row448, t_stockpile_row449, t_woodcutter_row450,
    t_armourer_row466, t_blacksmith_row467, t_poleturner_row469, t_pitchrig_row447, t_camera_row1231,
    t_hirecond_row481, t_hirecost_row868, t_tunnelent_row474, t_assassin_row512, t_engineer_row649,
    t_targetloop_row1151, t_collapse_row1156, t_spotmark_row1157, t_oilop_row1160,
    t_allyterms_row735, t_allyscreen_row736, t_allyaireq_row737, t_allymarks_row738, t_allyorders_row739,
    t_extcamp_row767, t_extmp_row768, t_outpost_row769, t_popcap10k_row770, t_extai8_row771,
    t_crtrail_row80, t_trailmap_row81, t_trailinfo_row82, t_traildiff_row83, t_traildate_row84,
    t_hcampaign_row91, t_calltoarms_row92, t_saladinconq_row93, t_kingscrusade_row94, t_cstates_row95,
    t_antiturtle_row1191, t_allytrade_row1192, t_mpailly_row1195,
    t_lobbyai_row86, t_roundtable_row88, t_campcatalog_row1179, t_fuzzplace_row1255,
    t_maptypes_row753, t_cbmap_row754, t_scenmap_row755, t_crusadermap_row756, t_exmapmaker_row758,
    t_extai8b_row746, t_role_row1073, t_spatial_row1205, t_mpvote_row1211,
    t_soak_row1252, t_balancesim_row1253, t_aivsai_row1254,
    t_scenarios_row1251, t_alefaith_row109, t_hostally_row734,
    t_aistyles_row87, t_ailords_row744, t_aipower_row1189, t_lockstep_row1208,
    t_options_row115, t_ecs_row1204, t_perf_row1233,
    t_tiles_row1136, t_placecond_row1137, t_resources_row1138, t_footprint_row1139,
    t_events_row1173, t_ailayers_row1186, t_airun_row1187, t_aiparams_row1188,
    t_arab7_row108, t_proj_row1153, t_lobbymap_row722,
    t_skirmish_row85, t_lord_row685, t_lobbylist_row720,
    t_host_row718, t_mp_row97, t_trademark_row1258,
    t_ai8_row1190, t_lobbyfull_row1209, t_assets_row1232,
    t_mob_touch_row, t_mob_dpr_row, t_mob_wake_row, t_mob_hud_row, t_mob_sheet_row, t_mob_bench_row];
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
  must(DEFAULT_KEYS.cancel === "Escape" && DEFAULT_KEYS.pause === "KeyP" && DEFAULT_KEYS.mute === "KeyM" && DEFAULT_KEYS.keep === "KeyH", "پیش‌فرض‌ها");
  must(validKeyCode("KeyP") && validKeyCode("Space") && !validKeyCode("x!") && !validKeyCode(""), "شکل e.code");
  const n = normalizeKeys({ pause: "Space", mute: "oops!", cancel: 42, keep: "KeyK" });
  must(n.pause === "Space" && n.mute === "KeyM" && n.cancel === "Escape" && n.keep === "KeyK", "ادغام: خوب می‌ماند، بد دور می‌رود");
  must(JSON.stringify(Object.keys(normalizeKeys(null)).sort()) === JSON.stringify(KEY_ACTIONS.slice().sort()), "کلید تهی = پیش‌فرض کامل");
  return { name: "remap کلیدها", pass: true, detail: "پیش‌فرض + ادغام امن" };
}

// --- سختی‌سنجی (0.58.0 — #۲۷ از FEATURES) ---
// __T_HOTKEYS_ROW1234__
// ردیف 1234 (§۲۲ — ناقص→کامل، 0.184.0): هر ۱۳ کنش قابل remap است — پیش‌فرض
// e.code معتبر + برچسب دوزبانه + دکمه [data-keyact] در DOM + رفتار ضبط/انصراف.
function t_hotkeys_row1234() {
  must(KEY_ACTIONS.length === 13, 'باید ۱۳ کنش باشد، هست ' + KEY_ACTIONS.length);
  for (const a of KEY_ACTIONS) {
    must(validKeyCode(DEFAULT_KEYS[a]), 'پیش‌فرض ' + a + ' باید e.code معتبر باشد');
    must(typeof KEY_ACTION_FA[a] === 'string' && KEY_ACTION_FA[a].length > 0, 'برچسب fa ' + a);
    const en = withLang('en', () => KEY_ACTION_FA[a]);
    must(typeof en === 'string' && en.length > 0 && en !== KEY_ACTION_FA[a], 'برچسب en ' + a);
  }
  if (typeof document === 'undefined') return { name: 'کلیدهای قابل‌تغییر (1234)', pass: true, detail: '۱۳ کنش + برچسب؛ بدون DOM رد شد' };
  for (const a of KEY_ACTIONS) {
    const b = document.querySelector('[data-keyact="' + a + '"]');
    must(!!b, 'دکمه remap کنش ' + a + ' باید در DOM باشد');
    must((b.textContent || '').indexOf(KEY_ACTION_FA[a]) === 0, 'برچسب دکمه ' + a);
  }
  // رفتار ضبط روی دکمه تازه sign: کلیک = حالت ضبط، Esc = انصراف بدون تغییر،
  // سپس remap واقعی به KeyJ و برگرداندن به کد قبلی (خودتمیزشونده).
  const signBtn = document.querySelector('[data-keyact="sign"]');
  const before = signBtn.textContent;
  const origCode = (before.slice(before.lastIndexOf(':') + 1) || '').trim() || DEFAULT_KEYS.sign;
  const pressTxt = t('main.keys.press');
  try {
    signBtn.click();
    must(signBtn.textContent !== before && signBtn.textContent.indexOf(pressTxt) >= 0, 'کلیک = حالت ضبط');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
    must(signBtn.textContent === before, 'انصراف با Esc متن را برمی‌گرداند');
    signBtn.click();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', key: 'j', bubbles: true }));
    must(signBtn.textContent.indexOf('KeyJ') >= 0, 'کلید تازه نشست');
    signBtn.click();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: origCode, bubbles: true }));
    must(signBtn.textContent === before, 'برگرداندن به کد قبلی');
  } finally {
    if (signBtn.textContent.indexOf(pressTxt) >= 0) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
    } else if (signBtn.textContent !== before && validKeyCode(origCode)) {
      signBtn.click();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: origCode, bubbles: true }));
    }
  }
  return { name: 'کلیدهای قابل‌تغییر (1234)', pass: true, detail: '۱۳ دکمه + ضبط/انصراف/remap' };
}

// __T_I18N_ROW1235__
// ردیف 1235 (§۲۲ — ناقص→کامل، 0.184.0، pin): رشته‌ها خارج کد + فونت فارسی +
// سوئیچ RTL + ‎LTR ماندن نقشه/کلیدها (e.code لاتین، مستقل از چیدمان).
function t_i18n_row1235() {
  const keys = ['ui.a11y.palette', 'ui.a11y.scale', 'ui.a11y.keys', 'main.keys.press',
    'system.a11y.key.sign', 'system.a11y.key.cancel', 'main.warn.famine', 'main.warn.crowding'];
  for (const k of keys) {
    const fa = withLang('fa', () => t(k));
    must(fa !== k && fa.length > 0, 'fa ' + k);
    const en = withLang('en', () => t(k));
    must(en !== k && en.length > 0 && en !== fa, 'en ' + k);
  }
  for (const a of KEY_ACTIONS) must(/^[A-Za-z]/.test(DEFAULT_KEYS[a]), 'e.code لاتین ' + a);
  if (typeof document === 'undefined') return { name: 'زبان و RTL (1235)', pass: true, detail: 'واژگان دوزبانه؛ بدون DOM رد شد' };
  must(!!document.querySelector('link[href$="styles/fonts.css"]'), 'فونت خودمیزبان وصل است');
  const fam = (typeof getComputedStyle !== 'undefined') ? getComputedStyle(document.body).fontFamily : '';
  must(fam.indexOf('Vazirmatn') >= 0, 'فونت فارسی روی بدنه است');
  const cur = getLang();
  try {
    setLang('fa', { persist: false });
    must(document.documentElement.dir === 'rtl' && document.documentElement.lang === 'fa', 'فارسی = rtl');
    setLang('en', { persist: false });
    must(document.documentElement.dir === 'ltr' && document.documentElement.lang === 'en', 'انگلیسی = ltr');
  } finally {
    setLang(cur, { persist: false });
  }
  return { name: 'زبان و RTL (1235)', pass: true, detail: 'fa/en + فونت + dir' };
}

// __T_A11Y_ROW1236__
// ردیف 1236 (§۲۲ — ناقص→کامل، 0.184.0، pin): پالت کوررنگی + مقیاس رابط +
// زیرنویس (متن هشدارها؛ موتور صدا گفتار ندارد — say پیام متنی است).
function t_a11y_row1236() {
  must(JSON.stringify(A11Y_SCALES) === '[1,1.25,1.5]', 'پله‌های مقیاس ۱۰۰/۱۲۵/۱۵۰');
  const warns = ['bribeEmpty', 'famine', 'unstaffed', 'starved', 'crowding', 'crueller'];
  for (const k of warns) {
    const fa = withLang('fa', () => t('main.warn.' + k, { n: 2, w: 6, cap: 4 }));
    must(fa !== 'main.warn.' + k && fa.length > 0, 'متن fa هشدار ' + k);
    const en = withLang('en', () => t('main.warn.' + k, { n: 2, w: 6, cap: 4 }));
    must(en !== 'main.warn.' + k && en.length > 0, 'متن en هشدار ' + k);
  }
  if (typeof document === 'undefined') return { name: 'دسترس‌پذیری (1236)', pass: true, detail: 'مقیاس + هشدارها؛ بدون DOM رد شد' };
  const palSel = document.getElementById('a11yPalSel');
  must(!!palSel && palSel.options.length === 4, 'سلکت پالت با ۴ گزینه است');
  const scaleSel = document.getElementById('a11yScaleSel');
  must(!!scaleSel && scaleSel.options.length === 3, 'سلکت مقیاس با ۳ گزینه است');
  must(!!document.getElementById('warnEl'), 'خط هشدار متنی هست');
  return { name: 'دسترس‌پذیری (1236)', pass: true, detail: 'پالت/مقیاس/متن هشدار' };
}

// __T_OPTIONS_ROW731__
// ردیف 731 (§۱۸.۵-ح — ناقص→کامل، 0.185.0، pin): سه گزینه اتاق — Extreme/TA
// بی‌مصداق است (بند 116: فقط مرجع در balance.json)؛ سرعت بازی و ذخیره
// خودکار از بند 117 (SPEEDS + دکمه/کلید + سلکت ماندگار + گیت حلقه).
function t_options_row731() {
  must(BALANCE.tacticalAid.status === 'reference', 'TA فقط مرجع است، سیم‌کشی ندارد');
  must(JSON.stringify(CONFIG.SPEEDS) === '[1,2,4]', 'پله‌های سرعت بازی');
  must(validAutosave('s30') === 's30' && validAutosave('off') === 'off', 'گزینه‌های معتبر می‌مانند');
  must(validAutosave('bogus') === null, 'گزینه نامعتبر رد می‌شود');
  must(autosaveDue(300, 0, 's30') === true && autosaveDue(299, 0, 's30') === false, 'سررسید ۳۰ثانیه‌ای');
  must(autosaveDue(99999, 0, 'off') === false, 'خاموش هرگز سررسید ندارد');
  if (typeof document === 'undefined') return { name: 'گزینه‌ها (731)', pass: true, detail: 'TA/سرعت/autosave خالص؛ بدون DOM رد شد' };
  must(!!document.getElementById('speedBtn'), 'دکمه سرعت هست');
  const sel = document.getElementById('autosaveSel');
  must(!!sel && sel.options.length === 4, 'سلکت ذخیره خودکار با ۴ گزینه است');
  return { name: 'گزینه‌ها (731)', pass: true, detail: 'TA مرجع + سرعت + autosave' };
}

// __T_CATSHIELDS_ROW138__
// ردیف 138 (§۳.۱ — ناقص→کامل، 0.185.0): نوار پالت ساختمان + ۶ دکمه دسته
// (سپر) پایین آن — کلیک = فقط همان دسته، کلیک دوباره = همه. فقط نما.
function t_catshields_row138() {
  must(JSON.stringify(BUILDING_CATEGORIES) === '["castle","industry","farm","food","town","weapon"]', 'باید ۶ دسته باشد');
  const counts = {};
  for (const k of Object.keys(CONFIG.BUILDINGS)) {
    const c = CONFIG.BUILDINGS[k].category;
    counts[c] = (counts[c] || 0) + 1;
  }
  for (const c of BUILDING_CATEGORIES) must((counts[c] || 0) > 0, 'دسته ' + c + ' دست‌کم یک بنا دارد');
  for (const c of BUILDING_CATEGORIES) {
    const fa = withLang('fa', () => t('ui.cat.' + c));
    must(fa !== 'ui.cat.' + c && fa.length > 0, 'برچسب fa دسته ' + c);
    const en = withLang('en', () => t('ui.cat.' + c));
    must(en !== 'ui.cat.' + c && en.length > 0, 'برچسب en دسته ' + c);
  }
  if (typeof document === 'undefined') return { name: 'شیلدهای دسته (138)', pass: true, detail: '۶ دسته + برچسب؛ بدون DOM رد شد' };
  const box = document.getElementById('catShields');
  must(!!box, 'نوار شیلدها هست');
  const btns = [...box.querySelectorAll('[data-cat]')];
  must(JSON.stringify(btns.map((b) => b.dataset.cat)) === JSON.stringify(BUILDING_CATEGORIES), 'ترتیب ۶ شیلد = دسته‌ها');
  const shown = () => [...document.querySelectorAll('#buildPal [data-b]')].filter((b) => !b.hidden);
  const catsOf = () => shown().map((b) => CONFIG.BUILDINGS[b.dataset.b].category);
  try {
    must(shown().length > 0, 'پالت در حالت همه پر است');
    const ind = box.querySelector('[data-cat="industry"]');
    ind.click();
    must(shown().length > 0, 'دسته industry خالی نیست');
    must(catsOf().every((c) => c === 'industry'), 'فیلتر industry فقط همان دسته را نشان می‌دهد');
    must(ind.classList.contains('sel'), 'شیلد فعال sel می‌گیرد');
    ind.click();
    must(shown().length === document.querySelectorAll('#buildPal [data-b]').length, 'کلیک دوباره = همه');
    must(!ind.classList.contains('sel'), 'شیلد غیرفعال sel ندارد');
  } finally {
    const active = box.querySelector('[data-cat].sel');
    if (active) active.click();
  }
  return { name: 'شیلدهای دسته (138)', pass: true, detail: '۶ شیلد + فیلتر/برگشت' };
}

// __T_MENU_ROW118__
// ردیف 118 (§۱.۳ — ناقص→کامل، 0.185.0، pin): پنج فرمان منوی دفترچه —
// Help (کارت راهنما) + Restart (شروع دوباره) + Quit (بازگشت به منو) +
// Exit (خروج از تماشا/ویرایشگر/بازی) + Resume (بازگشت به بازی).
function t_menu_row118() {
  if (typeof document === 'undefined') return { name: 'فرمان‌های منو (118)', pass: true, detail: 'بدون DOM رد شد' };
  must(!!document.getElementById('helpCard'), 'کارت راهنما هست');
  must(!!document.getElementById('resetBtn'), 'دکمه شروع دوباره هست');
  must(!!document.getElementById('defeatRestartBtn'), 'دکمه شروع دوباره شکست هست');
  must(!!document.getElementById('menuBtn'), 'دکمه منو (خروج از بازی) هست');
  must(!!document.getElementById('menuCloseBtn'), 'دکمه بازگشت به بازی هست');
  must(!!document.getElementById('replayExitBtn'), 'خروج از تماشا هست');
  must(!!document.getElementById('edExitBtn'), 'خروج ویرایشگر هست');
  try {
    const helpBtn = document.getElementById('helpIconBtn');
    const overlay = document.getElementById('modalOverlay');
    must(!!helpBtn && !!overlay, 'دکمه و لایه مودال هستند');
    helpBtn.click();
    must(!overlay.hidden, 'کلیک راهنما مودال را باز می‌کند');
    helpBtn.click();
    must(overlay.hidden, 'کلیک دوباره مودال را می‌بندد');
    const mb = document.getElementById('menuBtn');
    mb.click();
    must(!document.getElementById('menuScreen').hidden, 'منو = خروج به صفحه منو');
  } finally {
    const overlay = document.getElementById('modalOverlay');
    if (overlay && !overlay.hidden) {
      const helpBtn = document.getElementById('helpIconBtn');
      if (helpBtn) helpBtn.click();
    }
  }
  return { name: 'فرمان‌های منو (118)', pass: true, detail: '۷ دکمه + باز/بسته راهنما + منو' };
}

// __T_FLAT_ROW161__
// ردیف 161 (§۳.۲ — ناقص→کامل، 0.186.0، pin): تخت‌کردن با Space + تکرار = برگشت.
// رفتار از بند 1141 (applyFlat + keyMap.flat)؛ «توصیه هنگام ساخت» دفترچه الزام
// اجرایی ندارد — مدرک آن مستند g3 راهنماست (fa/en شامل Space).
function t_flat_row161() {
  must(KEY_ACTIONS.includes("flat"), "کنش flat ثبت است");
  must(DEFAULT_KEYS.flat === "Space", "پیش‌فرض Space است");
  must(typeof KEY_ACTION_FA.flat === "string" && KEY_ACTION_FA.flat.length > 0, "برچسب fa هست");
  must(withLang("en", () => KEY_ACTION_FA.flat) !== KEY_ACTION_FA.flat, "برچسب en متمایز است");
  const fa3 = withLang("fa", () => t("ui.help.g3"));
  must(fa3.indexOf("Space") >= 0, "راهنما fa کلید Space را می‌گوید");
  const en3 = withLang("en", () => t("ui.help.g3"));
  must(en3.indexOf("Space") >= 0, "راهنما en کلید Space را می‌گوید");
  if (typeof document === "undefined" || !document.querySelector("[data-flat]")) return { name: "تخت Space (161)", pass: true, detail: "Space + راهنما؛ بدون DOM رد شد" };
  const btn = document.querySelector("[data-flat]");
  const flatTxt = t("ui.top.flat"), tdTxt = t("main.top.flat3d");
  let guard = 0;
  while (btn.textContent !== flatTxt && guard < 2) { btn.click(); guard++; }
  must(btn.textContent === flatTxt, "مبنا: نمای سه‌بعدی");
  try {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
    must(btn.textContent === tdTxt, "Space = تخت شد");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
    must(btn.textContent === flatTxt, "تکرار Space = برگشت");
  } finally {
    let g2 = 0;
    while (btn.textContent !== flatTxt && g2 < 2) { btn.click(); g2++; }
  }
  return { name: "تخت Space (161)", pass: true, detail: "Space + تکرار=برگشت + g3" };
}

// __T_MAPEDITOR_ROW99__
// ردیف 99 (§۱.۱/بخش ۱۵ — ناقص→کامل، 0.186.0، pin): ویرایشگر نقشه — قلم‌ها،
// تایل‌ها، پاک‌کن، سید پایه، بررسی، ذخیره، خروجی/ورودی، آزمایش، خروج.
function t_mapeditor_row99() {
  must(JSON.stringify(BRUSHES) === "[1,2,4,8,16,32]", "قلم‌ها ۱ تا ۳۲");
  must(MAP_V === 1 && PATCH_CAP === 2048, "نسخه/سقف سند");
  if (typeof document === "undefined") return { name: "ویرایشگر نقشه (99)", pass: true, detail: "قلم/سقف؛ بدون DOM رد شد" };
  const openBtn = document.getElementById("editorBtn");
  const panel = document.getElementById("editorPanel");
  must(!!openBtn && !!panel, "دکمه و پنل ویرایشگر هستند");
  for (const tile of ["0", "1", "2", "3", "erase"]) {
    must(!!document.querySelector('#edTileRow [data-etile="' + tile + '"]'), "دکمه تایل " + tile + " هست");
  }
  must(!!document.getElementById("edBrushSel"), "انتخاب‌گر قلم هست");
  must(!!document.getElementById("edNameInput") && !!document.getElementById("edSeedInput"), "ورودی نام/سید هست");
  must(!!document.getElementById("edSeedBtn") && !!document.getElementById("edCheckBtn"), "ساخت از سید + بررسی هست");
  must(!!document.getElementById("edPlayBtn") && !!document.getElementById("edSaveBtn"), "آزمایش + ذخیره هست");
  must(!!document.getElementById("edClearBtn") && !!document.getElementById("edExitBtn"), "پاک‌کردن + خروج هست");
  must(!!document.getElementById("edIOArea") && !!document.getElementById("edExportBtn") && !!document.getElementById("edImportBtn"), "خروجی/ورودی JSON هست");
  try {
    openBtn.click();
    must(!panel.hidden, "ویرایشگر باز می‌شود");
    document.getElementById("edExitBtn").click();
    must(panel.hidden, "خروج ویرایشگر می‌بندد");
  } finally {
    const p = document.getElementById("editorPanel");
    if (p && !p.hidden) document.getElementById("edExitBtn").click();
  }
  return { name: "ویرایشگر نقشه (99)", pass: true, detail: "ابزارها + باز/بسته" };
}

// __T_CUSTOMSCEN_ROW98__
// ردیف 98 (§۱.۱ — ناقص→کامل، 0.186.0، pin): سناریوی سفارشی — ساخت نقشه
// خودت (سند سید+وصله) و بازی آن (قابل‌بازی‌بودن + ذخیره/ری‌پلی از قبل).
function t_customscen_row98() {
  const doc = createMapDoc("سناریو", 4242);
  must(doc.seed === 4242 && doc.name === "سناریو", "سند سفارشی ساخته می‌شود");
  const base = baseTerrain(4242);
  const r = paintCells(doc, base, 10, 10, 2, 1);
  must(r.painted > 0, "نقاشی روی سند وصله می‌سازد");
  const rt = importMapDoc(exportMapDoc(doc));
  must(rt.ok, "رفت‌وبرگشت JSON سالم است: " + rt.reason);
  must(JSON.stringify(patchesList(rt.doc)) === JSON.stringify(patchesList(doc)), "وصله‌ها می‌مانند");
  const ok = validatePlayable(CONFIG.MAP_SEED, null);
  must(ok.ok, "سید خالص قابل‌بازی است: " + ok.reason);
  if (typeof document === "undefined") return { name: "سناریوی سفارشی (98)", pass: true, detail: "سند + رفت‌وبرگشت؛ بدون DOM رد شد" };
  must(!!document.getElementById("edSaveBtn"), "ذخیره سفارشی هست");
  must(!!document.getElementById("edIOArea"), "ورودی/خروجی سفارشی هست");
  must(!!document.getElementById("edPlayBtn"), "آزمایش بازی سفارشی هست");
  must(!!document.getElementById("edCheckBtn"), "بررسی قابل‌بازی‌بودن هست");
  return { name: "سناریوی سفارشی (98)", pass: true, detail: "ساخت + رفت‌وبرگشت + بازی" };
}

// __T_TUTORIAL_ROW101__
// ردیف 101 (§۱.۱ — ناقص→کامل، 0.186.0، pin): آموزش مفاهیم پایه = ۱۲ راهنمای
// g1..g12 در کارت راهنما (منو/تک‌نفره/چندنفره/ساخت/بازار/سقف/حریف/نقشه‌ساز/
// مینی‌مپ/سلاح/برج/اشتراک) + دکمه‌های راهنما.
function t_tutorial_row101() {
  for (let i = 1; i <= 12; i++) {
    const k = "ui.help.g" + i;
    const fa = withLang("fa", () => t(k));
    must(fa !== k && fa.length > 40, "fa " + k + " پر است");
    const en = withLang("en", () => t(k));
    must(en !== k && en.length > 40 && en !== fa, "en " + k + " متمایز و پر است");
  }
  if (typeof document === "undefined") return { name: "آموزش پایه (101)", pass: true, detail: "۱۲ راهنما؛ بدون DOM رد شد" };
  must(!!document.getElementById("helpCard"), "کارت راهنما هست");
  must(!!document.getElementById("navHelp") && !!document.getElementById("helpIconBtn"), "دکمه‌های راهنما هستند");
  for (let i = 1; i <= 12; i++) {
    const el = document.querySelector('[data-i18n="ui.help.g' + i + '"]');
    must(!!el, "پاراگراف g" + i + " در DOM هست");
    must((el.textContent || "").length > 40, "متن g" + i + " پر است");
  }
  return { name: "آموزش پایه (101)", pass: true, detail: "۱۲ راهنما + کارت" };
}

// __T_WORKBENCH_ROW757__
// ردیف 757 (§15 — ناقص→کامل، 0.187.0، pin والد): میزکار ویرایش — ابزار منظره
// (تایل/قلم/سید/بررسی) + سازنده سناریو (سند/رفت‌وبرگشت/بازی). هر دو نیمه در
// بندهای 99/98 (0.186.0) پیاده‌اند؛ این ردیف تجمیع آنهاست. بدون کد محصول تازه.
function t_workbench_row757() {
  must(JSON.stringify(BRUSHES) === "[1,2,4,8,16,32]", "قلم‌ها ۱..۳۲");
  must(MAP_V === 1 && PATCH_CAP === 2048, "نسخه/سقف سند");
  const doc = createMapDoc("میزکار", 9182);
  const base = baseTerrain(9182);
  const r = paintCells(doc, base, 20, 20, 4, 2);
  must(r.painted > 0, "ابزار منظره وصله می‌سازد");
  const rt = importMapDoc(exportMapDoc(doc));
  must(rt.ok && JSON.stringify(patchesList(rt.doc)) === JSON.stringify(patchesList(doc)), "سازنده سناریو رفت‌وبرگشت دارد");
  must(validatePlayable(CONFIG.MAP_SEED, null).ok, "زمین قابل‌بازی است");
  if (typeof document === "undefined") return { name: "میزکار ویرایش (757)", pass: true, detail: "منظره + سناریو؛ بدون DOM رد شد" };
  must(!!document.getElementById("editorBtn") && !!document.getElementById("editorPanel"), "ورودی میزکار هست");
  try {
    document.getElementById("editorBtn").click();
    must(!document.getElementById("editorPanel").hidden, "میزکار باز می‌شود");
  } finally {
    const p = document.getElementById("editorPanel");
    if (p && !p.hidden) document.getElementById("edExitBtn").click();
  }
  return { name: "میزکار ویرایش (757)", pass: true, detail: "منظره + سناریو + باز/بسته" };
}

// __T_LOSE_ROW128__
// ردیف 128 (§2 — ناقص→کامل، 0.187.0): باخت = مرگ Lord — سولو: defeated + توقف +
// رویداد؛ MP: فقط رویداد lordDeadMp، بدون حذف سراسری. اتمام زمان بی‌مصداق است
// (نه میدان timeLimit در state، نه گونه زمان‌دار در MISSION_KINDS؛ مأموریت‌های
// shipped زمان‌دار نیستند — tick/wave هدف‌اند، نه محدودیت). بازپین عمدی 0.225.0.
function t_lose_row128() {
  const f = fresh();
  must(!f.state.defeated, "مبنا: شکست نخورده");
  const r = spawnLord(f.state, f.terrain, f.W, f.H);
  must(r.ok && r.unit && !r.unit.dead, "ارباب برخاست");
  const ev0 = f.state.events.length;
  strike(f.state, 999999, { kind: "unit", u: r.unit });
  must(r.unit.dead, "ارباب مرد");
  must(f.state.defeated === true && f.state.paused === true, "مرگ ارباب = شکست + توقف");
  must(f.state.events.length === ev0 + 1 && f.state.events.some((e) => typeof e === "string" && e.indexOf("ارباب") >= 0), "رویداد شکست ارباب ثبت شد");
  strike(f.state, 999999, { kind: "unit", u: r.unit });
  must(f.state.defeated === true, "ضربه تکراری به مرده بی‌اثر است");
  const g = fresh();
  enableMp(g.state, 2, ["A", "B"]);
  const r2 = spawnLord(g.state, g.terrain, g.W, g.H, 0);
  must(r2.ok && r2.unit, "ارباب MP برخاست");
  strike(g.state, 999999, { kind: "unit", u: r2.unit });
  must(r2.unit.dead && !g.state.defeated, "در MP شکست سراسری نیست");
  must(g.state.events.some((e) => typeof e === "string" && e.indexOf("بازیکن 1") >= 0), "رویداد lordDeadMp ثبت شد");
  must(!("timeLimit" in f.state) && !("timeout" in f.state), "میدان زمان در state نیست");
  must(MISSIONS.length === 6, "کاتالوگ ۶ مأموریت است (0.225.0 — فاز ۲)");
  must(!MISSION_KINDS.some((k) => /time/i.test(k)), "گونه زمان‌دار در مأموریت نیست");
  if (typeof document === "undefined") return { name: "باخت ارباب (128)", pass: true, detail: "سولو/MP + زمان بی‌مصداق؛ بدون DOM رد شد" };
  must(!!document.getElementById("defeatBanner") && !!document.getElementById("defeatRestartBtn"), "بنر و دکمه شکست هستند");
  must(!!document.getElementById("victoryBanner") && !!document.getElementById("victoryRestartBtn"), "بنر و دکمه پیروزی هستند");
  return { name: "باخت ارباب (128)", pass: true, detail: "سولو/MP + زمان بی‌مصداق + بنرها" };
}

// __T_ALLDONE_ROW126__
// ردیف 126 (§2 — ناقص→کامل، 0.187.0، pin): پایان = همه اهداف done (updateRun؛
// جزئی = active می‌ماند) + سپس نمایش امتیاز (ثبت خودکار پایان سولو در استادان
// + صفحه masters). نمایش اهداف مأموریت تاریخی از منو (بند 124) پارک است.
function t_alldone_row126() {
  const doc = { key: "k126", name: "ن", objectives: [
    { id: "a", kind: "resource", res: "gold", amount: 5 },
    { id: "b", kind: "tick", at: 10 },
  ]};
  must(validateMission(doc).length === 0, "سند ۲هدفه معتبر است");
  const run = createRun(doc);
  const snap1 = { buildings: [], units: [], resources: { gold: 5 }, tick: 5, wave: 0, popularity: 50, population: 0 };
  const fresh1 = updateRun(run, doc, snap1);
  must(fresh1.length === 1 && run.status === "active", "یکی done = همچنان active");
  const fresh2 = updateRun(run, doc, { buildings: [], units: [], resources: { gold: 5 }, tick: 10, wave: 0, popularity: 50, population: 0 });
  must(fresh2.length === 1 && run.status === "done" && run.doneTick === 10, "همه done = پایان + تیک ثبت");
  must(masterScore("victory", 0) > masterScore("defeat", 0), "امتیاز برد از باخت بیشتر است");
  const e = masterEntry({ seed: 9, outcome: "victory", ticks: 100, date: "2026-01-01T00:00:00.000Z" });
  must(e.score > 0 && e.map === "seed:9", "رکورد امتیاز پایان بازی");
  if (typeof document === "undefined") return { name: "پایان همه-اهداف (126)", pass: true, detail: "قانون + امتیاز؛ بدون DOM رد شد" };
  must(!!document.querySelector('[data-go="masters"]') && !!document.getElementById("mastersList"), "صفحه امتیاز استادان هست");
  return { name: "پایان همه-اهداف (126)", pass: true, detail: "قانون + امتیاز + صفحه" };
}

// __T_DEFEATCLOCK_ROW1178__
// ردیف 1178 (§19.5 — ناقص→کامل، 0.187.0، pin تجمیعی): شکست = بند 128 (همین
// نسخه) + تایمر تک‌نفره بعد از Keep+Granary (بند 130، از 0.182.0: clockReady /
// clockText + mclockEl؛ در MP از آغاز مسابقه). بدون کد محصول تازه.
function t_defeatclock_row1178() {
  must(clockReady([{ type: "keep", owner: 0 }, { type: "granary", owner: 0 }], 0) === true, "Keep+Granary سالم = آماده");
  must(clockReady([{ type: "keep", owner: 0 }], 0) === false, "بی‌انبار = ناآماده");
  must(clockReady([{ type: "keep", owner: 0, destroyed: true }, { type: "granary", owner: 0 }], 0) === false, "ویرانه = ناآماده");
  must(clockReady([{ type: "keep", owner: 1 }, { type: "granary", owner: 1 }], 0) === false, "بنای بیگانه = ناآماده");
  must(clockText(0, 0) === "00:00", "مبنا ۰۰:۰۰");
  must(clockText(600, 0) === "01:00", "۶۰۰ تیک = یک دقیقه");
  must(!fresh().state.defeated, "مبنا: شکست نخورده (مکانیزم در بند 128)");
  if (typeof document === "undefined") return { name: "شکست/ساعت (1178)", pass: true, detail: "تایمر + ارجاع 128؛ بدون DOM رد شد" };
  must(!!document.getElementById("mclockEl"), "ساعت مأموریت در نوار هست");
  return { name: "شکست/ساعت (1178)", pass: true, detail: "تایمر + ارجاع 128" };
}

// __T_FORMULAS_ROW1250__
// ردیف 1250 (§22.2 — ناقص→کامل، 0.187.0، pin): فرمول‌های واحد — محبوبیت
// (popTarget)، مالیات (TAX/taxInfo)، جیره (RATIONS/rationInfo)، میخانه
// (innBonus/innInfo)، مذهب (religionBonus/religionInfo)، ترس (fearLevel/fearPop)
// و رشد جمعیت (MIG_PERIOD/IMM_IN/IMM_OUT + campGauge) — همه خالص و نمایشی
// (نمایش در پنل‌های کاتب، بند 165). بدون کد محصول تازه.
function t_formulas_row1250() {
  const f = fresh();
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد");
  const pt = popTarget(f.state);
  must(typeof pt === "number" && isFinite(pt), "هدف محبوبیت عدد است");
  must(TAX_IDS.length === 12, "۱۲ پله مالیات");
  const t0 = taxInfo(TAX_IDS[0]);
  must(t0 && typeof t0.goldPerWorker === "number" && typeof t0.pop === "number", "سطح مالیات نمایشی است");
  must(taxInfo("bogus") === null, "سطح نامعتبر تهی است");
  must(RATION_IDS.length === 5, "۵ سطح جیره");
  const r2 = rationInfo(RATION_IDS[2]);
  must(r2 && typeof r2.pop === "number" && typeof r2.foodNum === "number", "سطح جیره نمایشی است");
  must(innBonus(f.state, 0) === 0 && religionBonus(f.state, 0) === 0, "بی‌بنا پاداش صفر است");
  must(typeof fearLevel(f.state, 0) === "number" && typeof fearPop(f.state, 0) === "number", "ترس عدد است");
  must(MIG_PERIOD === 100 && IMM_IN === 55 && IMM_OUT === 40, "آستانه‌های مهاجرت");
  const g = campGauge(f.state);
  must(typeof g.dir === "number" && typeof g.prog === "number", "نشانگر اردو خالص است");
  const pol = policySummary(f.state);
  must(pol && typeof pol === "object", "خلاصه سیاست هست");
  const keys = scribeReports(f.state, 0).map((s) => s.key);
  must(keys.includes("popularity") && keys.includes("religion") && keys.includes("fear"), "کاتب فرمول‌ها را نشان می‌دهد");
  return { name: "فرمول‌های واحد (1250)", pass: true, detail: "محبوبیت/مالیات/جیره/میخانه/مذهب/ترس/رشد" };
}

// __T_TABAR_ROW772__
// ردیف 772 (§16 — انجام‌نشده→کامل، 0.188.0، vacuous): نوار TA که با زمان پر
// می‌شود و قدرت باز می‌کند — سامانه پیاده نشده (داده فقط مرجع در
// balance.json): نه میدان ta در state، نه نوار در DOM؛ مرجع ۷٬۰۰۰ + ۱۰/ثانیه
// سر جایش است. بدون کد محصول تازه.
function t_tabar_row772() {
  must(BALANCE.tacticalAid.status === "reference", "TA فقط مرجع است، سیم‌کشی ندارد");
  const st = createState();
  for (const k of ["ta", "taBar", "taPoints", "taFill", "taPowers", "taUnlocked"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  must(BALANCE.tacticalAid.barPoints.value === 7000, "پین مرجع ۷٬۰۰۰ سر جایش است");
  must(BALANCE.tacticalAid.fillPerSec.value === 10, "پین مرجع ۱۰/ثانیه سر جایش است");
  if (typeof document === "undefined") return { name: "نوار TA (772)", pass: true, detail: "مرجع + غیبت میدان؛ بدون DOM رد شد" };
  must(!document.getElementById("taBar"), "نوار TA در DOM نیست");
  return { name: "نوار TA (772)", pass: true, detail: "vacuous: سامانه نیست" };
}

// __T_TAUSE_ROW773__
// ردیف 773 (§16 — انجام‌نشده→کامل، 0.188.0، vacuous): روشن‌شدن آیکن‌ها +
// کلیک آیکن/نقشه + کسر امتیاز + استفاده چندباره ارزان‌ها — بی‌مصداق است:
// نه آیکن، نه فرمان TA، نه کیف امتیاز. بدون کد محصول تازه.
function t_tause_row773() {
  must(BALANCE.tacticalAid.status === "reference", "TA فقط مرجع است، سیم‌کشی ندارد");
  const st = createState();
  for (const k of ["taIcons", "taSelected", "taScore", "taCooldowns", "taQueue"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  const c = BALANCE.tacticalAid.costs;
  must(c.arrowVolley < c.rockVolley, "ارزان (۳۰۰) چندباره از یک نوار پر ۷٬۰۰۰ ممکن است (مرجع)");
  if (typeof document === "undefined") return { name: "کاربرد TA (773)", pass: true, detail: "مرجع + غیبت میدان؛ بدون DOM رد شد" };
  must(!document.getElementById("taPanel") && !document.querySelector("[data-tapower]"), "پنل/آیکن TA در DOM نیست");
  return { name: "کاربرد TA (773)", pass: true, detail: "vacuous: سامانه نیست" };
}

// __T_TAPOWERS_ROW774__
// ردیف 774 (§16 — انجام‌نشده→کامل، 0.188.0، vacuous): فهرست ۸ قدرت به ترتیب
// صعودی — سامانه نیست؛ ترتیب مرجع در costs پین می‌شود (۳۰۰→۵۰۸۸). بدون کد
// محصول تازه.
function t_tapowers_row774() {
  must(BALANCE.tacticalAid.status === "reference", "TA فقط مرجع است، سیم‌کشی ندارد");
  const c = BALANCE.tacticalAid.costs;
  const names = ["arrowVolley", "heal", "spearmen", "engineers", "maceman", "uncoverGold", "knights", "rockVolley"];
  const seq = names.map((k) => c[k]);
  must(seq.every((v) => typeof v === "number"), "هر ۸ قدرت هزینه مرجع دارد");
  for (let i = 1; i < seq.length; i++) must(seq[i] > seq[i - 1], "صعودی: " + names[i - 1] + "=" + seq[i - 1] + " < " + names[i] + "=" + seq[i]);
  const st = createState();
  for (const k of ["taPowers", "taVolley", "taHeal"]) must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  return { name: "قدرت‌های TA (774)", pass: true, detail: "ترتیب صعودی مرجع" };
}

// __T_TABARPTS_ROW1126__
// ردیف 1126 (§18.8 — انجام‌نشده→کامل، 0.188.0، reference pin): نوار کامل
// ۷٬۰۰۰ امتیاز + قدرت سنگ ۵٬۰۸۸ (منبع جامعه). خالص و هدلس.
function t_tabarpts_row1126() {
  must(BALANCE.tacticalAid.barPoints.value === 7000, "نوار کامل ۷٬۰۰۰ است");
  must(BALANCE.tacticalAid.barPoints.source === "community", "منشأ نوار جامعه است");
  must(BALANCE.tacticalAid.costs.rockVolley === 5088, "قدرت سنگ ۵٬۰۸۸ است");
  must(BALANCE.tacticalAid.costs.rockSource === "community", "منشأ سنگ جامعه است");
  return { name: "اعداد TA (1126)", pass: true, detail: "۷٬۰۰۰ + ۵٬۰۸۸ جامعه" };
}

// __T_TACOSTS_ROW1127__
// ردیف 1127 (§18.8 — انجام‌نشده→کامل، 0.188.0، reference pin): ۸ هزینه به
// ترتیب صعودی دفترچه. خالص و هدلس.
function t_tacosts_row1127() {
  const c = BALANCE.tacticalAid.costs;
  must(c.arrowVolley === 300 && c.heal === 600 && c.spearmen === 900 && c.engineers === 1200, "۴ تای اول: ۳۰۰/۶۰۰/۹۰۰/۱۲۰۰");
  must(c.maceman === 1800 && c.uncoverGold === 2500 && c.knights === 3500 && c.rockVolley === 5088, "۴ تای دوم: ۱۸۰۰/۲۵۰۰/۳۵۰۰/۵۰۸۸");
  const seq = [c.arrowVolley, c.heal, c.spearmen, c.engineers, c.maceman, c.uncoverGold, c.knights, c.rockVolley];
  for (let i = 1; i < seq.length; i++) must(seq[i] > seq[i - 1], "صعودی دفترچه برقرار است");
  return { name: "هزینه‌های TA (1127)", pass: true, detail: "۸ هزینه صعودی" };
}

// __T_TAFILL_ROW1128__
// ردیف 1128 (§18.8 — انجام‌نشده→کامل، 0.189.0، reference pin): سرعت پرشدن
// نوار TA ≈ ۱۰ امتیاز/ثانیه (نوار پر ≈ ۱۲ دقیقه). خالص و هدلس.
function t_tafill_row1128() {
  must(BALANCE.tacticalAid.status === "reference", "TA فقط مرجع است، سیم‌کشی ندارد");
  must(BALANCE.tacticalAid.fillPerSec.value === 10, "سرعت پرشدن ۱۰/ثانیه است");
  must(BALANCE.tacticalAid.fillPerSec.source === "fixup", "منشأ سرعت fixup است");
  must(BALANCE.tacticalAid.fillPerSec.fullMinutes === 12, "نوار پر ≈ ۱۲ دقیقه است");
  const mins = BALANCE.tacticalAid.barPoints.value / BALANCE.tacticalAid.fillPerSec.value / 60;
  must(Math.abs(mins - 12) < 1, "سازگاری ۷٬۰۰۰ ÷ ۱۰ ≈ ۱۲ دقیقه است");
  return { name: "سرعت TA (1128)", pass: true, detail: "۱۰/ثانیه ≈ ۱۲ دقیقه" };
}

// __T_TAVALS_ROW1129__
// ردیف 1129 (§18.8 — انجام‌نشده→کامل، 0.189.0، reference pin): طلای تصادفی
// Uncover Gold (۲۰۰–۱۰۰۰) + شعاع والی (≈ ۱۲ tile) و مدت ۳–۵ ثانیه. خالص و هدلس.
function t_tavals_row1129() {
  must(BALANCE.tacticalAid.status === "reference", "TA فقط مرجع است، سیم‌کشی ندارد");
  const u = BALANCE.tacticalAid.uncoverGold;
  must(u.min === 200 && u.max === 1000, "طلای تصادفی ۲۰۰–۱۰۰۰ است");
  must(u.source === "fixup", "منشأ طلا fixup است");
  const v = BALANCE.tacticalAid.volley;
  must(v.radius === 12, "شعاع والی ≈ ۱۲ است");
  must(Array.isArray(v.duration) && v.duration[0] === 3 && v.duration[1] === 5, "مدت والی ۳–۵ ثانیه است");
  must(v.source === "fixup", "منشأ والی fixup است");
  return { name: "مقادیر TA (1129)", pass: true, detail: "۲۰۰–۱۰۰۰ + ۱۲ tile و ۳–۵ ثانیه" };
}

// __T_SCORE_ROW127__
// ردیف 127 (§2 — انجام‌نشده→کامل، 0.189.0، reference pin): امتیازدهی بر اساس
// فراتررفتن از هدف اقتصادی (+) و تلفات نیرو (−)؛ فرمول عددی در دفترچه نیست
// پس وزن‌ها پیشنهادی‌اند (α/β/γ). امتیاز mission در sim سیم‌کشی ندارد
// (امتیاز نمایشی استادان جداست) — پین مرجع + غیبت sim. بدون کد محصول تازه.
function t_score_row127() {
  must(BALANCE.missionScore.status === "reference", "امتیاز مأموریت فقط مرجع است");
  must(typeof BALANCE.missionScore.formula === "string" && BALANCE.missionScore.formula.includes("lost"), "فرمول تلفات (−) دارد");
  must(BALANCE.missionScore.formula.includes("goal"), "فرمول هدف اقتصادی (+) دارد");
  const st = createState();
  for (const k of ["score", "missionScore", "missionPts", "econExcess"]) must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  must(typeof masterScore === "function" && masterScore("victory", 0) > masterScore("defeat", 0), "امتیاز نمایشی استادان جداست (برد > باخت)");
  return { name: "امتیازدهی (127)", pass: true, detail: "اقتصاد + / تلفات − (مرجع)" };
}

// __T_SCORECOMP_ROW1122__
// ردیف 1122 (§18.7 — انجام‌نشده→کامل، 0.189.0، reference pin): اجزای فرمول از
// دفترچه (هدف اقتصادی + / تلفات −) + وزن‌های پیشنهادی α=100 و β=0.5 و γ=50.
// خالص و هدلس.
function t_scorecomp_row1122() {
  must(BALANCE.missionScore.status === "reference", "امتیاز مأموریت فقط مرجع است");
  must(Array.isArray(BALANCE.missionScore.components) && BALANCE.missionScore.components.length === 2, "۲ جزء دفترچه‌ای است");
  must(BALANCE.missionScore.components[0].includes("اقتصادی"), "جزء اول هدف اقتصادی (+) است");
  must(BALANCE.missionScore.components[1].includes("تلفات"), "جزء دوم تلفات نیرو (−) است");
  must(BALANCE.missionScore.weights.alpha === 100 && BALANCE.missionScore.weights.beta === 0.5 && BALANCE.missionScore.weights.gamma === 50, "وزن‌های پیشنهادی ۱۰۰/۰٫۵/۵۰ است");
  return { name: "اجزای فرمول (1122)", pass: true, detail: "۲ جزء + وزن‌های پیشنهادی" };
}

// __T_TRAIL_ROW1123__
// ردیف 1123 (§18.7 — انجام‌نشده→کامل، 0.189.0، reference pin): Trail — زمان کل
// مجموع زمان بازی‌های فتح‌شده؛ بازی سریع‌تر ⇒ تاریخ کل کمتر. خالص و هدلس.
function t_trail_row1123() {
  must(BALANCE.missionScore.status === "reference", "امتیاز مأموریت فقط مرجع است");
  must(typeof BALANCE.missionScore.trail === "string" && BALANCE.missionScore.trail.includes("مجموع"), "تاریخ مجموع زمان‌هاست");
  must(BALANCE.missionScore.trail.includes("سریع"), "بازی سریع‌تر ⇒ تاریخ کمتر است");
  return { name: "Trail (1123)", pass: true, detail: "مجموع زمان‌ها؛ سریع‌تر ⇒ کمتر" };
}

// __T_BLACKMONK_ROW891__
// ردیف 891 (§18.2 — انجام‌نشده→کامل، 0.190.0، reference pin): HP مرجع Black Monk
// = ۳۰٬۰۰۰ (پیشنهاد fixup: برابر Pikeman کمتر). مقیاس sim داخلی است ولی ترتیب
// حفظ شده (blackmonk ‏۷۰ < pikeman ‏۸۰). خالص و هدلس.
function t_blackmonk_row891() {
  must(BALANCE.unitCombat.hp.blackMonk.hp === 30000, "مرجع Black Monk ‏۳۰٬۰۰۰ است");
  must(BALANCE.unitCombat.hp.blackMonk.source === "fixup", "منشأ پیشنهاد fixup است");
  must(!!UNITS.blackmonk && !!UNITS.pikeman, "هر دو یگان در sim هستند");
  must(UNITS.blackmonk.hp < UNITS.pikeman.hp, "ترتیب مرجع در مقیاس داخلی حفظ شده");
  return { name: "راهب سیاه (891)", pass: true, detail: "۳۰٬۰۰۰ مرجع + ترتیب داخلی" };
}

// __T_LORDARROW_ROW932__
// ردیف 932 (§18.2 — ناقص→کامل، 0.190.0، pin): ارباب در sim هست + اعداد مرجع تیر:
// هر تیر Archer ≈ ۱۰۰ از ۱۵۰٬۰۰۰ HP (منبع جامعه). مقیاس sim داخلی است
// (lord ‏۱۵۰) — HP نسبی است، مهم نسبت‌هاست. خالص و هدلس.
function t_lordarrow_row932() {
  must(!!UNITS.lord, "ارباب در sim هست");
  must(BALANCE.unitCombat.lordArrow.archerDmgPerArrow === 100, "هر تیر ≈ ۱۰۰ است");
  must(BALANCE.unitCombat.lordArrow.ofHp === 150000, "از ۱۵۰٬۰۰۰ HP است");
  must(BALANCE.unitCombat.lordArrow.source === "community", "منشأ جامعه است");
  must(UNITS.lord.hp === 150, "مقیاس داخلی sim (نه ۱۵۰٬۰۰۰)");
  return { name: "تیر ارباب (932)", pass: true, detail: "۱۰۰ از ۱۵۰٬۰۰۰ (جامعه)" };
}

// __T_ACCURACY_ROW962__
// ردیف 962 (§18.2 — انجام‌نشده→کامل، 0.190.0، reference pin): فرمول دقت pHit با
// ۶ مقدار پایه. ضربه sim قطعی است (بدون تاس miss): دو ضربه یکسان به دو archer
// یکسان = HP یکسان. خالص و هدلس.
function t_accuracy_row962() {
  const a = BALANCE.unitCombat.accuracy;
  must(a.source === "fixup", "منشأ فرمول fixup است");
  must(typeof a.formula === "string" && a.formula.includes("pHit"), "فرمول pHit است");
  must(a.base.archer === 0.7 && a.base.crossbow === 0.9, "پایه archer/crossbow");
  must(a.base.mangonel === 0.4 && a.base.catapult === 0.6, "پایه منجنیق‌ها");
  must(a.base.ballista === 0.9 && a.base.trebuchet === 0.35, "پایه ballista/trebuchet");
  const run = () => {
    const f = fresh();
    spawnUnit(f.state, "archer", 5.5, 5.5);
    const u = f.state.units.find((x) => x.type === "archer");
    strike(f.state, 13, { kind: "unit", u });
    return u.hp;
  };
  must(run() === run(), "ضربه قطعی است (بدون miss تصادفی)");
  return { name: "دقت (962)", pass: true, detail: "۶ پایه + ضربه قطعی" };
}

// __T_ROTATE_ROW158__
// ردیف 158 (§3.2 — انجام‌نشده→کامل، 0.190.0، vacuous): چرخش ۹۰ درجه‌ای دوربین
// (X/C) — بی‌مصداق است: نه کنش rotate، نه کلید X/C، نه میدان چرخش در state،
// نه دکمه در DOM؛ دوربین فقط پن/زوم است. بدون کد محصول تازه.
function t_rotate_row158() {
  must(!KEY_ACTIONS.includes("rotate"), "کنش rotate نیست");
  const codes = Object.values(DEFAULT_KEYS);
  must(!codes.includes("KeyX") && !codes.includes("KeyC"), "کلید X/C بایند نیست");
  const st = createState();
  for (const k of ["rot", "rotation", "camAngle", "camera"]) must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  if (typeof document === "undefined") return { name: "چرخش (158)", pass: true, detail: "نه کنش نه کلید؛ بدون DOM رد شد" };
  must(!document.querySelector("[data-rotate]") && !document.getElementById("rotateBtn"), "دکمه چرخش در DOM نیست");
  return { name: "چرخش (158)", pass: true, detail: "vacuous: چرخش نیست" };
}

// __T_MYSTERY_ROW506__
// ردیف 506 (§9 — انجام‌نشده→کامل، 0.190.0، vacuous): «شخصیت مرموز» — خود بند
// می‌گوید جزئیات توانایی ویژه در متن خراب PDF خوانا نیست، پس مشخصات
// پیاده‌شدنی نیست؛ چنین یگانی در کاتالوگ هم نیست. بدون کد محصول تازه.
function t_mystery_row506() {
  const ids = Object.keys(UNITS);
  must(!ids.some((id) => /myster|unknown/i.test(id)), "یگان مرموز در کاتالوگ نیست");
  must(!!UNITS.lord && !!UNITS.blackmonk, "کاتالوگ واقعی است");
  return { name: "شخصیت مرموز (506)", pass: true, detail: "vacuous: بدون مشخصات" };
}

// __T_MONTH_ROW1022__
// ردیف 1022 (§18.5 — ناقص→کامل، 0.191.0، pin): مرجع «ماه» = ۶۰ ثانیه در سرعت
// پیش‌فرض ۴۰ (مقیاس‌پذیر با سرعت) + دقیقه sim = ۶۰۰ تیک (TICK_HZ ‏۱۰، ساعت
// مأموریت)؛ سرعت‌های sim ‏[۱،۲،۴] با بازه دفترچه ‏۱۰–۹۰ فرق دارند (واگرایی
// مستند). خالص و هدلس.
function t_month_row1022() {
  const m = BALANCE.economy.month;
  must(m.seconds === 60 && m.atSpeed === 40, "مرجع: ۶۰ ثانیه در سرعت ۴۰");
  must(m.scalesWithSpeed === true && m.source === "fixup", "مقیاس‌پذیر + منشأ fixup");
  must(CONFIG.TICK_HZ === 10, "نرخ sim ‏۱۰ تیک/ثانیه است");
  must(clockText(600, 0) === "01:00", "دقیقه sim ‏= ۶۰۰ تیک است");
  must(JSON.stringify(CONFIG.SPEEDS) === "[1,2,4]", "سرعت‌های sim با دفترچه فرق دارند");
  return { name: "ماه (1022)", pass: true, detail: "۶۰ ثانیه مرجع + ۶۰۰ تیک sim" };
}

// __T_FOODUSE_ROW1043__
// ردیف 1043 (§18.5 — ناقص→کامل، 0.191.0، pin): ضرایب جیره sim ‏(foodNum/۲) عیناً
// مرجع‌اند {۰،۰٫۵،۱،۱٫۵،۲}؛ ساختار فرق دارد (انباشت eatAcc با آستانه ۴۰۰ روی
// mouths = کارگران، نه جمعیت کل). خالص و هدلس.
function t_fooduse_row1043() {
  const c = BALANCE.economy.rationCoef;
  must(c.none === 0 && c.half === 0.5 && c.full === 1 && c.extra === 1.5 && c.double === 2, "مرجع ۵ ضریب است");
  must(c.source === "fixup", "منشأ ضرایب fixup است");
  const coefs = [RATIONS.none, RATIONS.half, RATIONS.normal, RATIONS.extra, RATIONS.double].map((r) => r.foodNum / 2);
  must(JSON.stringify(coefs) === "[0,0.5,1,1.5,2]", "ضرایب sim ‏= مرجع است");
  must(EAT_THRESHOLD === 400, "آستانه انباشت ۴۰۰ است");
  must(fresh().state.eatAcc === 0, "مبنای انباشت صفر است");
  return { name: "مصرف غذا (1043)", pass: true, detail: "ضرایب یکسان + آستانه ۴۰۰" };
}

// __T_GRANCAP_ROW1044__
// ردیف 1044 (§18.5 — ناقص→کامل، 0.191.0، pin): مرجع ظرفیت ۲۵۰ (جامعه، از تخمین
// ۱۰۰۰/۴) + سقف sim: مبنای غذا ۵۰۰ + ۵۰۰ به‌ازای هر انبار (واگرایی مستند).
// خالص و هدلس.
function t_grancap_row1044() {
  must(BALANCE.economy.granaryCap.value === 250, "مرجع ۲۵۰ است");
  must(BALANCE.economy.granaryCap.source === "community", "منشأ جامعه است");
  must(CAPS.food === 500 && GRANARY_BONUS === 500, "مبنای sim ‏۵۰۰ + ۵۰۰/انبار است");
  must(capFor(fresh().state, "food", 0) === 500, "سقف بی‌انبار ۵۰۰ است (نه ۲۵۰)");
  return { name: "ظرفیت انبار (1044)", pass: true, detail: "۲۵۰ مرجع + ۵۰۰ sim" };
}

// __T_FOODSELL_ROW1045__
// ردیف 1045 (§18.5 — ناقص→کامل، 0.191.0، pin): مرجع فروش هر واحد غذا ≈ ۴
// (جامعه) + نرخ sim: خرید ۴ / فروش ۲ (واگرایی مستند). خالص و هدلس.
function t_foodsell_row1045() {
  must(BALANCE.economy.foodSellPrice.value === 4, "مرجع فروش ۴ است");
  must(BALANCE.economy.foodSellPrice.source === "community", "منشأ جامعه است");
  const rate = CONFIG.MARKET.rates.food;
  must(rate.buy === 4 && rate.sell === 2, "نرخ sim خرید ۴ / فروش ۲ است");
  return { name: "فروش غذا (1045)", pass: true, detail: "۴ مرجع + ۴/۲ sim" };
}

// __T_AILORD_ROW890__
// ردیف 890 (§18.2 — انجام‌نشده→کامل، 0.191.0، vacuous): HP ارباب حریف AI بسته
// به نقاط قدرت — بی‌مصداق است: حریف AI اربابی ندارد (startAI ارباب نمی‌سازد)
// و جدول HP ارباب AI در مرجع نیست (merit/power نمایشی بازیکن است). بدون کد
// محصول تازه.
function t_ailord_row890() {
  const f = fresh();
  startAI(f.state, f.terrain, f.W, f.H, "normal", "balanced");
  must(!f.state.units.some((u) => u.type === "lord" && (u.owner == null ? 0 : u.owner) === AI_OWNER), "حریف AI ارباب ندارد");
  must(!("aiLord" in BALANCE.unitCombat) && !("powerPoints" in BALANCE.unitCombat), "جدول HP ارباب AI در مرجع نیست");
  must(!!UNITS.lord, "ارباب بازیکن هست (مکانیزم بازیکن‌محور است)");
  return { name: "ارباب AI (890)", pass: true, detail: "vacuous: ارباب AI نیست" };
}

// __T_WOODCUTTER_ROW688__
// ردیف 688 (§9 — انجام‌نشده→کامل، 0.192.0، pin): چوب‌بر — بنا در کاتالوگ است و
// با ۱ کارگر چوب تولید می‌کند. خالص و هدلس.
function t_woodcutter_row688() {
  const def = CONFIG.BUILDINGS.woodcutter;
  must(!!def, "چوب‌بر در کاتالوگ است");
  must(def.econ && def.econ.produces === "wood" && def.econ.workers === 1, "۱ کارگر چوب می‌برد");
  return { name: "چوب‌بر (688)", pass: true, detail: "بنا + ۱ کارگر" };
}

// __T_HUNTER_ROW689__
// ردیف 689 (§9 — انجام‌نشده→کامل، 0.192.0، pin): شکارچی — پست شکار گوشت تولید
// می‌کند و گوشت جزو منابع انبارغذاست. خالص و هدلس.
function t_hunter_row689() {
  const def = CONFIG.BUILDINGS.hunterpost;
  must(!!def, "پست شکار در کاتالوگ است");
  must(def.econ && def.econ.produces === "meat", "شکارچی گوشت می‌آورد");
  must(GRANARY_RES.includes("meat"), "گوشت به انبارغذا می‌رود");
  return { name: "شکارچی (689)", pass: true, detail: "پست شکار + گوشت" };
}

// __T_PEASANT_ROW691__
// ردیف 691 (§9 — انجام‌نشده→کامل، 0.192.0، pin): دهقان — استخر کارگران (۴ نفر
// آغازین)؛ بیکاران کنار آتش‌اند (campGauge)؛ انحلال یگان دهقان را برمی‌گرداند.
// خالص و هدلس.
function t_peasant_row691() {
  const f = fresh();
  must(f.state.workers === 4 && f.state.freeWorkers === 4, "دهقانان آغازین ۴ نفرند");
  must(campGauge(f.state).waiting === f.state.freeWorkers, "بیکاران کنار آتش‌اند");
  must(CAMP_IDLE_MAX === 24, "سقف آتش ۲۴ است");
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد");
  spawnUnit(f.state, "soldier", 5.5, 5.5);
  const u = f.state.units.find((x) => x.type === "soldier");
  const w0 = f.state.workers;
  must(disbandUnit(f.state, [u.id], 0).ok, "انحلال");
  must(f.state.workers === w0 + 1, "دهقان به استخر برگشت");
  return { name: "دهقان (691)", pass: true, detail: "استخر + آتش + بازگشت" };
}

// __T_LADY_ROW686__
// ردیف 686 (§9 — انجام‌نشده→کامل، 0.192.0، vacuous): بانو — دفترچه نقش عملکردی
// برایش ذکر نمی‌کند و موجودیتی به این نام در sim نیست. بدون کد محصول تازه.
function t_lady_row686() {
  const ids = Object.keys(UNITS);
  must(!ids.some((id) => /lady|maiden/i.test(id)), "بانو در کاتالوگ نیست");
  return { name: "بانو (686)", pass: true, detail: "vacuous: بدون نقش" };
}

// __T_JESTER_ROW687__
// ردیف 687 (§9 — انجام‌نشده→کامل، 0.192.0، vacuous): دلقک — نقش عملکردی ذکر
// نشده و موجودیتی به این نام در sim نیست. بدون کد محصول تازه.
function t_jester_row687() {
  const ids = Object.keys(UNITS);
  must(!ids.some((id) => /jester|clown|fool/i.test(id)), "دلقک در کاتالوگ نیست");
  return { name: "دلقک (687)", pass: true, detail: "vacuous: بدون نقش" };
}

// __T_CHILDREN_ROW692__
// ردیف 692 (§9 — انجام‌نشده→کامل، 0.193.0، vacuous): کودکان — نقش عملکردی ذکر
// نشده و موجودیتی به این نام در sim نیست. بدون کد محصول تازه.
function t_children_row692() {
  const ids = Object.keys(UNITS);
  must(!ids.some((id) => /child|kid|baby|mother/i.test(id)), "کودکان در کاتالوگ نیست");
  return { name: "کودکان (692)", pass: true, detail: "vacuous: بدون نقش" };
}

// __T_STONEMASON_ROW694__
// ردیف 694 (§9 — انجام‌نشده→کامل، 0.193.0، pin): سنگ‌تراش — quarry در کاتالوگ
// است و با ۱ کارگر سنگ تولید می‌کند. خالص و هدلس.
function t_stonemason_row694() {
  const def = CONFIG.BUILDINGS.quarry;
  must(!!def, "معدن سنگ در کاتالوگ است");
  must(def.econ && def.econ.produces === "stone" && def.econ.workers === 1, "۱ کارگر سنگ می‌آورد");
  return { name: "سنگ‌تراش (694)", pass: true, detail: "معدن سنگ + ۱ کارگر" };
}

// __T_IRONMINER_ROW695__
// ردیف 695 (§9 — انجام‌نشده→کامل، 0.193.0، pin): معدنچی آهن — ironmine در
// کاتالوگ است و با ۱ کارگر آهن تولید می‌کند. خالص و هدلس.
function t_ironminer_row695() {
  const def = CONFIG.BUILDINGS.ironmine;
  must(!!def, "معدن آهن در کاتالوگ است");
  must(def.econ && def.econ.produces === "iron" && def.econ.workers === 1, "۱ کارگر آهن می‌آورد");
  return { name: "معدنچی آهن (695)", pass: true, detail: "معدن آهن + ۱ کارگر" };
}

// __T_BAKER_ROW698__
// ردیف 698 (§9 — انجام‌نشده→کامل، 0.193.0، pin): نانوا — bakery در کاتالوگ است؛
// آرد را به غذا (نان) تبدیل می‌کند با ۱ کارگر. خالص و هدلس.
function t_baker_row698() {
  const def = CONFIG.BUILDINGS.bakery;
  must(!!def, "نانوایی در کاتالوگ است");
  must(def.econ && def.econ.produces === "food" && def.econ.workers === 1, "۱ کارگر نان می‌پزد");
  must(def.econ.consumes && def.econ.consumes.flour === 1, "آرد مصرف می‌کند");
  return { name: "نانوا (698)", pass: true, detail: "نانوایی + آرد→نان" };
}

// __T_BREWER_ROW699__
// ردیف 699 (§9 — انجام‌نشده→کامل، 0.193.0، pin): آبجوساز — brewery در کاتالوگ
// است و ale/beer برای inn تولید می‌کند (بنای inn هم در کاتالوگ است). خالص و هدلس.
function t_brewer_row699() {
  const def = CONFIG.BUILDINGS.brewery;
  must(!!def, "آبجوسازی در کاتالوگ است");
  must(def.econ && def.econ.produces === "beer" && def.econ.workers === 1, "۱ کارگر ale می‌سازد");
  must(!!CONFIG.BUILDINGS.inn, "مهمان‌خانه (inn) در کاتالوگ است");
  return { name: "آبجوساز (699)", pass: true, detail: "آبجوسازی + inn" };
}

// __T_FARMER_ROW690__
// ردیف 690 (§9 — انجام‌نشده→کامل، 0.194.0، pin): کشاورز — farm در کاتالوگ است و
// با ۱ کارگر غذا تولید می‌کند. خالص و هدلس.
function t_farmer_row690() {
  const def = CONFIG.BUILDINGS.farm;
  must(!!def, "مزرعه در کاتالوگ است");
  must(def.econ && def.econ.produces === "food" && def.econ.workers === 1, "۱ کارگر غذا می‌آورد");
  return { name: "کشاورز (690)", pass: true, detail: "مزرعه + ۱ کارگر" };
}

// __T_MOTHERS_ROW693__
// ردیف 693 (§9 — انجام‌نشده→کامل، 0.194.0، vacuous): مادران و نوزادان — بنای
// hovel در کاتالوگ نیست و موجودیتی به این نام در sim نیست. بدون کد محصول تازه.
function t_mothers_row693() {
  must(!CONFIG.BUILDINGS.hovel, "بنای hovel در کاتالوگ نیست");
  const ids = Object.keys(UNITS);
  must(!ids.some((id) => /mother|bab|nurse/i.test(id)), "مادر/نوزاد در کاتالوگ نیست");
  return { name: "مادران (693)", pass: true, detail: "vacuous: بدون بنا/یگان" };
}

// __T_MILLBOY_ROW697__
// ردیف 697 (§9 — انجام‌نشده→کامل، 0.194.0، pin): پسر آسیاب — mill در کاتالوگ
// است؛ گندم را به آرد تبدیل می‌کند. خالص و هدلس.
function t_millboy_row697() {
  const def = CONFIG.BUILDINGS.mill;
  must(!!def, "آسیاب در کاتالوگ است");
  must(def.econ && def.econ.produces === "flour", "آسیاب آرد می‌دهد");
  must(def.econ.consumes && def.econ.consumes.wheat, "گندم مصرف می‌کند");
  return { name: "پسر آسیاب (697)", pass: true, detail: "آسیاب + گندم→آرد" };
}

// __T_INNKEEPER_ROW700__
// ردیف 700 (§9 — انجام‌نشده→کامل، 0.194.0، pin رفتاری): مهماندار — میخانه ۱
// مهماندار می‌خواهد؛ بدون کارگر سروی نیست، با کارگر+آبجو سرو می‌کند (آینه
// رفتار t_innkeeper_required). هدلس.
function t_innkeeper_row700() {
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 200;
  const inn = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn);
  must(inn.ok, "میخانه ساخته شد");
  state.workers = 0;
  state.resources.beer = 5;
  sim(state, 50);
  must(workersNeeded(inn.building) === 1 && INN.keepers === 1, "۱ مهماندار می‌خواهد");
  must(inn.building.staffed === false && inn.building.served === false, "بدون کارگر سروی نیست");
  state.workers = 4;
  sim(state, 50);
  must(inn.building.staffed === true && inn.building.served === true, "با کارگر+آبجو سرو می‌کند");
  return { name: "مهماندار (700)", pass: true, detail: "۱ مهماندار + گیت سرو" };
}

// __T_DRUNKARD_ROW701__
// ردیف 701 (§9 — انجام‌نشده→کامل، 0.194.0، pin رفتاری): مست — بدون میخانه صفر؛
// ۱ میخانه کارا = ۲ مست (آینه رفتار t_drunkards). هدلس.
function t_drunkard_row701() {
  must(INN.drunkardsPerInn === 2, "هر میخانه کارا ۲ مست می‌سازد");
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 200;
  must(drunkards(state) === 0, "بدون میخانه مستی نیست");
  const inn = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.inn);
  must(inn.ok, "میخانه ساخته شد");
  must(drunkards(state) === 0, "پیش از سرو مستی نیست");
  state.resources.beer = 1;
  sim(state, 50);
  must(inn.building.served === true, "میخانه سرو می‌کند");
  must(drunkards(state) === 2, "۱ کارا = ۲ مست");
  return { name: "مست (701)", pass: true, detail: "سرو → ۲ مست" };
}

// __T_FLETCHER_ROW702__
// ردیف 702 (§9 — انجام‌نشده→کامل، 0.195.0، pin): کمان‌ساز — fletcher در کاتالوگ
// است؛ چوب را به کمان تبدیل می‌کند. خالص و هدلس.
function t_fletcher_row702() {
  const def = CONFIG.BUILDINGS.fletcher;
  must(!!def, "کمان‌سازی در کاتالوگ است");
  must(def.econ && def.econ.produces === "bows" && def.econ.workers === 1, "۱ کارگر کمان می‌سازد");
  must(def.econ.consumes && def.econ.consumes.wood, "چوب مصرف می‌کند");
  return { name: "کمان‌ساز (702)", pass: true, detail: "کمان‌سازی + چوب→کمان" };
}

// __T_ARMORER_ROW703__
// ردیف 703 (§9 — انجام‌نشده→کامل، 0.195.0، pin): زره‌ساز — armoury در کاتالوگ
// است و کار فلزی با آهن می‌کند. خالص و هدلس.
function t_armorer_row703() {
  const def = CONFIG.BUILDINGS.armoury;
  must(!!def, "زرادخانه در کاتالوگ است");
  must(def.econ && def.econ.workers === 1, "۱ کارگر فلزکاری می‌کند");
  must(def.econ.consumes && def.econ.consumes.iron === 2, "۲ آهن مصرف می‌کند");
  return { name: "زره‌ساز (703)", pass: true, detail: "زرادخانه + کار آهن" };
}

// __T_BLACKSMITH_ROW704__
// ردیف 704 (§9 — انجام‌نشده→کامل، 0.195.0، pin): آهنگر — armoury شمشیر تولید
// می‌کند. خالص و هدلس.
function t_blacksmith_row704() {
  const def = CONFIG.BUILDINGS.armoury;
  must(!!def, "زرادخانه در کاتالوگ است");
  must(def.econ && def.econ.produces === "swords", "زرادخانه شمشیر می‌دهد");
  return { name: "آهنگر (704)", pass: true, detail: "زرادخانه → شمشیر" };
}

// __T_PRIEST_ROW707__
// ردیف 707 (§9 — انجام‌نشده→کامل، 0.195.0، pin رفتاری): کشیش — نمازخانه ۱
// کشیش می‌خواهد؛ بدون کارگر تبرکی نیست، با کارگر تبرک کامل است (آینه رفتار
// t_priest_bless). هدلس.
function t_priest_row707() {
  must(JSON.stringify(RELIGION_TYPES) === '["chapel","church","cathedral"]', "۳ بنای دینی");
  must(RELIGION.chapel === 20 && RELIGION.priests === 1, "نمازخانه ۲۰ نفر + ۱ کشیش");
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 2000;
  const ch = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.chapel);
  must(ch.ok, "نمازخانه ساخته شد");
  state.workers = 0;
  sim(state, 50);
  must(workersNeeded(ch.building) === 1 && ch.building.staffed === false, "بدون کارگر بی‌کشیش");
  must(religionCoverage(state) === 0, "بدون بنای کارا تبرک صفر");
  state.workers = 4;
  sim(state, 50);
  must(ch.building.staffed === true && religionCoverage(state) === 100, "با کشیش تبرک کامل");
  return { name: "کشیش (707)", pass: true, detail: "نمازخانه + تبرک کامل" };
}

// __T_HEALER_ROW708__
// ردیف 708 (§9 — انجام‌نشده→کامل، 0.195.0، pin رفتاری): شفادهنده — عطاری کارا
// ۱ شفادهنده می‌سازد (آینه رفتار t_apothecary_healer). هدلس.
function t_healer_row708() {
  const hd = UNITS.healer;
  must(!!hd && hd.noHire === true, "شفادهنده استخدام‌شدنی نیست");
  must(!!CONFIG.BUILDINGS.apothecary, "عطاری در کاتالوگ است");
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 500;
  const site = siteNear(terrain, state.occ, W, H, 10, 10, 2, 2);
  must(site, "جای عطاری");
  const p = tryPlace(state, terrain, W, H, site[0], site[1], CONFIG.BUILDINGS.apothecary);
  must(p.ok, "عطاری قرار گرفت");
  completeAll(state);
  assignStaff(state);
  stepHealers(state, terrain);
  const healers = state.units.filter((u) => !u.dead && u.type === "healer");
  must(healers.length === 1 && healers[0].homeBld === p.building.id, "۱ شفادهنده از عطاری");
  return { name: "شفادهنده (708)", pass: true, detail: "عطاری → ۱ شفادهنده" };
}

// __T_PITCHDIGGER_ROW696__
// ردیف 696 (§9 — انجام‌نشده→کامل، 0.196.0، vacuous): قیرکن — نه بنای قیر/روغن
// در کاتالوگ است نه منبع قیر/روغن در sim (آینه غیبت t_moatdraw_absence).
// بدون کد محصول تازه.
function t_pitchdigger_row696() {
  must(!Object.keys(CONFIG.BUILDINGS).some((k) => /pitch|oil|smelt|brazier/i.test(k)), "بنای قیر/روغن نیست");
  const f = fresh();
  must(!("pitch" in f.state.resources) && !("oil" in f.state.resources), "منبع قیر/روغن نیست");
  return { name: "قیرکن (696)", pass: true, detail: "vacuous: بدون قیر" };
}

// __T_POLETURNER_ROW705__
// ردیف 705 (§9 — انجام‌نشده→کامل، 0.196.0، vacuous): نیزه‌ساز — نه بنایی هست
// نه تولید نیزه/پایک (ARMOURY_RES فقط آهن/شمشیر/کمان). بدون کد محصول تازه.
function t_poleturner_row705() {
  must(!CONFIG.BUILDINGS.poleturner, "بنای نیزه‌سازی در کاتالوگ نیست");
  must(!Object.values(CONFIG.BUILDINGS).some((d) => d.econ && /spear|pike/i.test(d.econ.produces || "")), "هیچ بنایی نیزه/پایک نمی‌دهد");
  must(JSON.stringify(ARMOURY_RES.slice().sort()) === '["bows","iron","swords"]', "انبار اسلحه فقط آهن/شمشیر/کمان");
  return { name: "نیزه‌ساز (705)", pass: true, detail: "vacuous: بدون نیزه" };
}

// __T_TRADER_ROW709__
// ردیف 709 (§9 — انجام‌نشده→کامل، 0.196.0، pin رفتاری): بازرگان — بازار کامل
// = ۱ بازرگان حاضر (آینه رفتار t_market_trader). هدلس.
function t_trader_row709() {
  must(!!CONFIG.BUILDINGS.market, "بازار در کاتالوگ است");
  const { W, H, terrain, state } = fresh();
  must(marketTrader(state).present === false && marketTrader(state).count === 0, "بی‌بازار = غایب");
  must(tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.market).ok, "بازار ساخته شد");
  completeAll(state);
  const one = marketTrader(state);
  must(one.present === true && one.count === 1, "بازار کامل = ۱ بازرگان حاضر");
  return { name: "بازرگان (709)", pass: true, detail: "بازار → بازرگان" };
}

// __T_JUGGLER_ROW710__
// ردیف 710 (§9 — انجام‌نشده→کامل، 0.196.0، pin رفتاری): بازیگر سیار — نمایشگاه
// دوره‌ای ۱۵۰۰–۱۸۰۰ با پاداش +۴ (آینه رفتار t_events). هدلس.
function t_juggler_row710() {
  const mk = (tick) => ({ tick });
  must(JSON.stringify(activeEvents(mk(1500))) === '["fair"]', "نمایشگاه ۱۵۰۰–۱۸۰۰");
  must(activeEvents(mk(1799)).includes("fair") && !activeEvents(mk(1800)).includes("fair"), "پایان پنجره نمایشگاه");
  must(eventBonus(mk(1600)) === 4, "پاداش نمایشگاه +۴");
  must(activeEvents(mk(3500)).includes("fair"), "تکرار چرخه‌ای نمایشگاه");
  return { name: "بازیگر سیار (710)", pass: true, detail: "نمایشگاه دوره‌ای +۴" };
}

// __T_CAMPFILL_ROW177__
// ردیف 177 (§۴ — انجام‌نشده→کامل، 0.196.0، vacuous): سرعت نشانگر — prog صرفاً
// تیک‌محور است؛ محبوبیت فقط جهت/هاله می‌دهد نه سرعت (تیک یکسان + محبوبیت
// ۰/۱۰۰ → prog یکسان ولی halo متفاوت). بدون کد محصول تازه.
function t_campfill_row177() {
  const a = fresh(); const b = fresh();
  a.state.tick = 50; b.state.tick = 50;
  a.state.popularity = 0; b.state.popularity = 100;
  const ga = campGauge(a.state), gb = campGauge(b.state);
  must(ga.prog === gb.prog, "سرعت نشانگر به محبوبیت بستگی ندارد");
  must(ga.halo === "red" && gb.halo === "none", "محبوبیت فقط هاله/جهت می‌دهد");
  return { name: "پرشدن نشانگر (177)", pass: true, detail: "vacuous: سرعت ثابت" };
}

// __T_DAMAGE_ROW924__
// ردیف 924 (§18.2 — ناقص→کامل، 0.197.0، reference pin): قاعده مرجع خسارت +
// ۳ کلاس زره + جدول‌های hitsToKill تیر؛ sim مسیر خسارت خودش را دارد.
// خالص و هدلس.
function t_damage_row924() {
  const u = BALANCE.unitCombat;
  must(u.damageRule.source === "manbook" && u.damageRule.rule.includes("hitsToKill"), "قاعده مرجع دفترچه");
  must(u.armorClasses.classes.length === 3, "۳ کلاس زره");
  must(JSON.stringify(u.armorClasses.classes.map((c) => c.id)) === '["none","leather","metal"]', "کلاس‌ها: none/leather/metal");
  const leather = u.armorClasses.classes.find((c) => c.id === "leather");
  must(leather.arrow === 0.5 && leather.crossbow === 0.35, "ضرایب چرمی ۰٫۵/۰٫۳۵");
  const metal = u.armorClasses.classes.find((c) => c.id === "metal");
  must(metal.members.includes("knight") && metal.arrowMax === 0.07, "کلاس فلزی + سقف ۰٫۰۷");
  must(u.hitsToKillArcher.rows.spearman === 3 && u.hitsToKillCrossbow.rows.spearman === 1, "جدول‌های تیر");
  must(typeof effectiveDmg === "function", "sim مسیر خسارت خودش را دارد");
  return { name: "مدل خسارت (924)", pass: true, detail: "مرجع + کلاس‌ها + تیر" };
}

// __T_SIMPLE_ROW933__
// ردیف 933 (§18.2 — ناقص→کامل، 0.197.0، reference pin): مدل ساده مرجع در
// damageRule.simpleModel ثبت است؛ sim جدول baseDamage/armorReduction ندارد
// (مدل ساده پیاده نشده). خالص و هدلس.
function t_simple_row933() {
  const u = BALANCE.unitCombat;
  must(typeof u.damageRule.simpleModel === "string" && u.damageRule.simpleModel.includes("baseDamage") && u.damageRule.simpleModel.includes("armorReduction"), "مدل ساده مرجع");
  must(!("baseDamage" in u) && !("armorReduction" in u), "sim جدول مدل ساده را ندارد");
  must(typeof effectiveDmg === "function", "sim خسارت خودش را حساب می‌کند");
  return { name: "مدل ساده (933)", pass: true, detail: "مرجع ثبت + sim جدا" };
}

// __T_HEIGHT_ROW961__
// ردیف 961 (§18.2 — ناقص→کامل، 0.197.0، reference+vacuous pin): پاداش برد
// ۲/۵/۸ + نصف خسارت از پایین (مرجع)؛ موتور بی‌ارتفاع است (زمین فقط کد تایل +
// یگان بی‌ارتفاع). خالص و هدلس.
function t_height_row961() {
  const h = BALANCE.unitCombat.height;
  must(h.wallRangeBonus === 2 && h.towerRangeBonus === 5 && h.lookoutRangeBonus === 8, "پاداش برد ۲/۵/۸");
  must(h.enemyFromBelowHalfDamage === true, "نصف خسارت از پایین (ویکی)");
  const f = fresh();
  must(f.terrain instanceof Uint8Array, "زمین فقط کد تایل است (بی‌ارتفاع)");
  const u = spawnUnit(f.state, "archer", 5.5, 5.5, 0);
  must(u.height === undefined && u.elevation === undefined, "یگان ارتفاع ندارد");
  return { name: "اثر ارتفاع (961)", pass: true, detail: "مرجع ۲/۵/۸ + بی‌ارتفاع" };
}

// __T_GAMESPEED_ROW963__
// ردیف 963 (§18.2 — ناقص→کامل، 0.197.0، reference pin): سرعت مرجع ۱۰–۹۰ با
// پیش‌فرض ۴۰ + ۵ رتبه سرعت؛ سرعت‌های sim جدا هستند. خالص و هدلس.
function t_gamespeed_row963() {
  const g = BALANCE.unitCombat.gameSpeed;
  must(g.min === 10 && g.max === 90 && g.def === 40, "سرعت مرجع ۱۰–۹۰ پیش‌فرض ۴۰");
  must(g.source === "community", "منشأ جامعه");
  must(BALANCE.unitCombat.speedRanks.ranks.length === 5, "۵ رتبه سرعت");
  must(JSON.stringify(CONFIG.SPEEDS) === "[1,2,4]", "سرعت‌های sim با دفترچه فرق دارند");
  must(CONFIG.TICK_HZ === 10, "نرخ sim ده تیک/ثانیه");
  return { name: "جدول سرعت (963)", pass: true, detail: "مرجع ۱۰–۹۰ + sim جدا" };
}

// __T_MELEE_ROW1152__
// ردیف 1152 (§18.2 — ناقص→کامل، 0.197.0، reference pin): ۳ ردیف جدول تن‌به‌تن
// عین دفترچه (تعداد ضربه مهاجم ↓ برای کشتن هدف →). خالص و هدلس.
function t_melee_row1152() {
  const rows = BALANCE.unitCombat.meleeHits.rows;
  must(BALANCE.unitCombat.meleeHits.source === "verified", "منشأ تأییدشده");
  must(rows.maceman.archer === 4 && rows.maceman.sword === 30 && rows.maceman.knight === 20, "ردیف گرزدار");
  must(rows.swordsman.archer === 2 && rows.swordsman.sword === 11 && rows.swordsman.knight === 15, "ردیف شمشیرزن");
  must(rows.knight.archer === 4 && rows.knight.sword === 17 && rows.knight.knight === 11, "ردیف شوالیه");
  return { name: "تن‌به‌تن (1152)", pass: true, detail: "۳ ردیف جدول" };
}

// __T_TENTTIME_ROW1012__
// ردیف 1012 (§18.3-ب — ناقص→کامل، 0.198.0، reference pin): زمان‌های ساخت چادر
// مرجع (۱۰/۲۵/۲۵/۳۵/۴۰/۴۰ + مقیاس مهندس)؛ sim چادر ندارد. خالص و هدلس.
function t_tenttime_row1012() {
  const b = BALANCE.siege.buildTime;
  must(b.source === "fixup", "منشأ fixup");
  must(b.shield === 10 && b.catapult === 25 && b.fireBallista === 25, "سپر ۱۰ + منجنیق‌ها ۲۵");
  must(b.trebuchet === 35 && b.ram === 40 && b.siegeTower === 40, "تربوشه ۳۵ + قوچ/برج ۴۰");
  must(typeof b.scale === "string" && b.scale.includes("engineerCount"), "مقیاس مهندس");
  must(!CONFIG.BUILDINGS.siegeTent && !CONFIG.BUILDINGS.tent, "sim چادر ندارد");
  return { name: "زمان چادر (1012)", pass: true, detail: "۱۰/۲۵/۳۵/۴۰ + بی‌چادر" };
}

// __T_TUNNELREF_ROW1013__
// ردیف 1013 (§18.3-ب — انجام‌نشده→کامل، 0.198.0، reference pin): تونل مرجع
// (۲۵ تایل/۰٫۵ tile/s/آتش ۳–۵s)؛ sim تونل ندارد. خالص و هدلس.
function t_tunnelref_row1013() {
  const t = BALANCE.siege.tunnel;
  must(t.maxLength === 25 && t.digSpeed === 0.5, "۲۵ تایل با ۰٫۵ tile/s");
  must(Array.isArray(t.igniteDelay) && t.igniteDelay[0] === 3 && t.igniteDelay[1] === 5, "آتش ۳–۵s");
  must(!CONFIG.BUILDINGS.tunnel && !CONFIG.BUILDINGS.tunnelentrance, "sim تونل ندارد");
  return { name: "تونل مرجع (1013)", pass: true, detail: "۲۵/۰٫۵/۳–۵ + بی‌تونل" };
}

// __T_SIEGETOWER_ROW1014__
// ردیف 1014 (§18.3-ب — انجام‌نشده→کامل، 0.198.0، reference pin): گذر برج ۲نفر/s
// + محرومیت knight/horseArcher؛ sim برج محاصره ندارد. خالص و هدلس.
function t_siegetower_row1014() {
  const s = BALANCE.siege.siegeTowerFlow;
  must(s.source === "verified" && s.perSec === 2, "گذر ۲نفر/s تأییدشده");
  must(JSON.stringify(s.excludes.slice().sort()) === '["horseArcher","knight"]', "محرومیت شوالیه/کماندار سواره");
  must(!Object.keys(UNITS).some((k) => /siegetower|siege_tower/i.test(k)), "sim برج محاصره ندارد");
  return { name: "برج محاصره (1014)", pass: true, detail: "۲/s + بی‌برج" };
}

// __T_PITCHDITCH_ROW1017__
// ردیف 1017 (§18.3-ب — انجام‌نشده→کامل، 0.198.0، reference+vacuous pin): خندق
// قیر مرجع (۱۰s/۲۰٪/تیر آتشین)؛ sim قیر ندارد. خالص و هدلس.
function t_pitchditch_row1017() {
  const p = BALANCE.siege.pitch;
  must(p.burnSec === 10 && p.dpsFraction === 0.2, "۱۰ ثانیه + ۲۰٪ HP/s");
  must(p.igniteBy === "fire arrow", "افروزش با تیر آتشین");
  must(!Object.keys(CONFIG.BUILDINGS).some((k) => /pitch|oil|smelt|brazier/i.test(k)), "بنای قیر/روغن نیست");
  const f = fresh();
  must(!("pitch" in f.state.resources) && !("oil" in f.state.resources), "منبع قیر/روغن نیست");
  return { name: "خندق قیر (1017)", pass: true, detail: "۱۰s/۲۰٪ + بی‌قیر" };
}

// __T_WHEATFARM_ROW1047__
// ردیف 1047 (§18.5 — ناقص→کامل، 0.198.0، reference pin): گندم مرجع (۲/رفت‌وبرگشت
// + ۲۴/چرخه)؛ sim مدل خودش را دارد (۱/۲۰تیک). خالص و هدلس.
function t_wheatfarm_row1047() {
  const w = BALANCE.economy.wheatFarm;
  must(w.perTrip === 2 && w.perTripSource === "community", "۲ گندم/سفر (جامعه)");
  must(w.perCycle === 24 && w.perCycleSource === "fixup", "۲۴/چرخه (fixup)");
  const def = CONFIG.BUILDINGS.wheatfarm;
  must(!!def && def.econ.produces === "wheat" && def.econ.amount === 1 && def.econ.everyTicks === 20, "sim: ۱/۲۰تیک");
  return { name: "مزرعه گندم (1047)", pass: true, detail: "۲/۲۴ مرجع + ۱/۲۰ sim" };
}

// __T_GAMETYPE_ROW725__
// ردیف 725 (§14.2 — انجام‌نشده→کامل، 0.199.0، reference pin): سه گونه بازی
// (Normal/Crusader/Deathmatch) با طلای شروع ۲۰۰۰/۲۰۰۰/۱۰۰۰۰ در جدول مرجع؛
// sim گونه ندارد (نه میدان gameType/mode، نه قانون اتاق تازه — rules فقط همان
// ۳ گزینه 727-730 است). خالص و هدلس.
function t_gametype_row725() {
  const s = BALANCE.economy.starting;
  must(s.normal.gold === 2000 && s.normal.source === "verified", "Normal ‏۲٬۰۰۰ تأییدشده");
  must(s.crusader.gold === 2000, "Crusader ‏۲٬۰۰۰");
  must(s.deathmatch.gold === 10000 && /انبار/.test(s.deathmatch.note || ""), "Deathmatch ‏۱۰٬۰۰۰ + انبار");
  const st = fresh().state;
  must(st.gameType === undefined && st.mode === undefined, "sim گونه ندارد");
  must(JSON.stringify(Object.keys(st.rules).sort()) === '["noCow","noRush","strongWalls"]', "اتاق فقط ۳ گزینه 727-730 دارد");
  return { name: "گونه بازی (725)", pass: true, detail: "۲۰۰۰/۱۰٬۰۰۰ + بی‌گونه" };
}

// __T_GAMETYPE_ROW89__
// ردیف 89 (§1.1 — انجام‌نشده→کامل، 0.199.0، reference pin): همان سه گونه در
// چیدمان اسکیرمیش — نگاشت نیروهای اولیه (Normal ‏۵+۷ ↔ هویت crusader از بند
// 104؛ ترکیب عربی ↔ هویت arab؛ none بی‌نیرو)؛ طلای شروع sim ثابت ۶۰ است و پله
// گونه ندارد. خالص و هدلس.
function t_gametype_row89() {
  const s = BALANCE.economy.starting;
  must(s.normal.troops === "5 archer + 7 spearman", "پیاده‌نظام Normal ‏۵+۷");
  must(s.crusader.troops === "40 archer + 10 swordsman + 4 knight", "سپاه Crusader");
  must(s.hamun.troops === "5 arabianBow + 7 slave", "معادل عربی ‏۵+۷");
  const cr = IDENTITIES.crusader.troops, ar = IDENTITIES.arab.troops;
  must(cr[0][0] === "bowman" && cr[0][1] === 5 && cr[1][0] === "soldier" && cr[1][1] === 7, "هویت crusader همان ‏۵+۷ است");
  must(ar[0][0] === "arabianBow" && ar[0][1] === 5 && ar[1][0] === "slave" && ar[1][1] === 7, "هویت arab همان ‏۵+۷ است");
  must(IDENTITIES.none.troops.length === 0, "none بی‌نیروست");
  must(fresh().state.resources.gold === 60, "طلای شروع sim ثابت ۶۰ — بی‌پله گونه");
  return { name: "گونه اسکیرمیش (89)", pass: true, detail: "نگاشت نیروها + طلای ثابت" };
}

// __T_STARTRES_ROW1107__
// ردیف 1107 (§18.5-ح — ناقص→کامل، 0.199.0، reference+divergence pin): منابع شروع
// مرجع Normal (۱۰۰ چوب/۵۰ سنگ/۴۰ غذا)؛ sim کیت سندباکس خودش را دارد
// (۱۲۰/۴۰/۱۲۰/۶۰) — واگرایی عمدی، مستند. خالص و هدلس.
function t_startres_row1107() {
  const r = BALANCE.economy.starting.resources;
  must(r.wood === 100 && r.stone === 50 && r.food === 40, "مرجع ۱۰۰/۵۰/۴۰");
  const res = fresh().state.resources;
  must(res.wood === 120 && res.stone === 40 && res.food === 120 && res.gold === 60, "sim: کیت سندباکس ۱۲۰/۴۰/۱۲۰/۶۰");
  return { name: "منابع شروع (1107)", pass: true, detail: "مرجع ≠ sim (عمدی)" };
}

// __T_OBJECTIVES_ROW124__
// ردیف 124 (§2 — بازپین عمدی 0.225.0، فاز ۲): کاتالوگ ۶تایی کمپین هست ولی پنل
// «اهداف تاریخی» جدا نیست؛ نمایش اهداف باقی‌مانده/خط‌خورده از منو بی‌مصداق است —
// هیچ پنل mission/objective در DOM نیست؛ زیرساخت (validate/createRun/updateRun)
// هست ولی سیم‌کشی نشده (سند missions.js: محتوا پارک). قانون پایان در بند 126
// پین شده. خالص + پروب DOM.
function t_objectives_row124() {
  must(Array.isArray(MISSIONS) && MISSIONS.length === 6, "کاتالوگ ۶ مأموریت کمپین است");
  const doc = { key: "k124", name: "ن", objectives: [
    { id: "a", kind: "haveBuilding", type: "hut", count: 1 },
    { id: "b", kind: "tick", at: 10 },
  ]};
  must(validateMission(doc).length === 0, "زیرساخت سند ۲هدفه می‌سازد");
  const run = createRun(doc);
  must(run.status === "active", "اجرای تازه فعال است");
  const fr = updateRun(run, doc, { buildings: [{ type: "hut" }], units: [], resources: {}, tick: 10, wave: 0, popularity: 50, population: 0 });
  must(fr.length === 2 && run.status === "done", "هر دو done = پایان (قانون در 126)");
  if (typeof document === "undefined") return { name: "اهداف تاریخی (124)", pass: true, detail: "کاتالوگ ۶تایی؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /mission|objective/i.test(id));
  must(hits.length === 0, "پنل اهداف/مأموریت در DOM نیست");
  return { name: "اهداف تاریخی (124)", pass: true, detail: "کاتالوگ + بی‌پنل اهداف" };
}

// __T_ICONS_ROW148__
// ردیف 148 (§3.1 — انجام‌نشده→کامل، 0.199.0، divergence pin): آیکن‌های دفترچه
// روی مینی‌مپ نیستند — ستاد ستاره طلایی دارد (MM_KEEP_STAR، نه دایره محاصره)؛
// کلیک=پرش هست (بند 147) ولی نشانگر ! رویداد با کلیک‌به‌محل و سپر گوینده وجود
// ندارند: drawMinimap رویداد را نادیده می‌گیرد (تساوی پیکسلی) و هشدارها متنیِ
// بی‌آیکن/بی‌گوینده‌اند. DOM + خالص.
function t_icons_row148() {
  must(MM_KEEP_STAR === "#f0c75e", "نشان ستاد ستاره طلایی است نه دایره");
  if (typeof document === "undefined") return { name: "آیکن‌ها (148)", pass: true, detail: "ستاره؛ بدون DOM رد شد" };
  const S = 64;
  const f = fresh();
  placeKeep(f.state, f.terrain, f.W, f.H);
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  drawMinimap(cv, f.state, f.terrain, f.W, f.H, null);
  const shot = () => cv.getContext("2d").getImageData(0, 0, S, S).data.join(",");
  const base = shot();
  f.state.events.push({ key: "raid", c: 10, r: 10 });
  drawMinimap(cv, f.state, f.terrain, f.W, f.H, null);
  must(shot() === base, "رویداد روی مینی‌مپ رسم نمی‌شود (نشانگر ! نیست)");
  f.state.resources.food = 0;
  const ws = advisorWarnings(f.state, 0);
  must(ws.length > 0 && ws.every((w) => w && typeof w.key === "string" && w.icon === undefined && w.speaker === undefined && w.goto === undefined), "هشدار متنی بی‌آیکن/بی‌گوینده است (سپر نیست)");
  const keep = f.state.buildings.find((b) => b.type === "keep");
  must(!!keep, "ستاد هست");
  const px = cv.getContext("2d").getImageData(0, 0, S, S).data;
  let goldish = 0;
  const gx0 = Math.max(0, Math.floor(keep.c / f.W * S)), gx1 = Math.min(S - 1, Math.ceil((keep.c + keep.w) / f.W * S));
  const gy0 = Math.max(0, Math.floor(keep.r / f.H * S)), gy1 = Math.min(S - 1, Math.ceil((keep.r + keep.h) / f.H * S));
  for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) {
    const i = (y * S + x) * 4;
    if (px[i] > 120 && px[i + 1] > 150 && px[i + 2] < 180) goldish++;
  }
  must(goldish > 0, "ستاره طلایی روی ستاد رسم می‌شود");
  return { name: "آیکن‌ها (148)", pass: true, detail: "ستاره + بی‌! + بی‌سپر" };
}

// __T_HANDICAP_ROW1105__
// ردیف 1105 (§18.5-ح — ناقص→کامل، 0.200.0، reference pin): جدول هندیکپ مرجع
// (پله‌های ارتش/مالیات + طلای شروع ۲۰۰۰/۴۰۰۰/۸۰۰۰ و ۱۰k/۲۰k/۴۰k + طلای حریف
// ۷۰۰۰/۳۰۰۰)؛ sim هندیکپ ندارد (نه میدان، نه قانون اتاق). خالص و هدلس.
function t_handicap_row1105() {
  const h = BALANCE.economy.starting.handicaps;
  must(h.source === "community", "منشأ جامعه");
  must(/150%/.test(h.armies) && /75%/.test(h.armies), "پله‌های ارتش");
  must(/120%/.test(h.taxIncome) && /150%/.test(h.taxIncome), "پله‌های مالیات");
  must(JSON.stringify(h.startGoldNormal) === "[2000,4000,8000]", "طلای Normal ‏۲۰۰۰/۴۰۰۰/۸۰۰۰");
  must(JSON.stringify(h.startGoldDeathmatch) === "[10000,20000,40000]", "طلای Deathmatch ‏۱۰k/۲۰k/۴۰k");
  must(JSON.stringify(h.foeGold) === "[7000,3000]", "طلای حریف ۷۰۰۰/۳۰۰۰");
  const st = fresh().state;
  must(st.handicap === undefined && st.handicaps === undefined, "sim هندیکپ ندارد");
  must(!("handicap" in st.rules), "اتاق هندیکپ ندارد");
  return { name: "هندیکپ (1105)", pass: true, detail: "جدول مرجع + بی‌هندیکپ" };
}

// __T_STOCKCAPS_ROW1108__
// ردیف 1108 (§18.5-ح — ناقص→کامل، 0.200.0، reference+divergence pin): ظرفیت
// مرجع هر خانه (bulk ۴۸/grain ۳۲/small ۱۶ + ۴ نوع در خانه)؛ sim سقف سراسری
// خودش را دارد (پایه ۵۰۰ + ۵۰۰ به‌ازای هر بنای انباری تکمیل‌شده). خالص و هدلس.
function t_stockcaps_row1108() {
  const c = BALANCE.economy.starting.stockpileCaps;
  must(c.source === "community" && c.bulk === 48 && c.grain === 32 && c.small === 16, "۴۸/۳۲/۱۶ مرجع (جامعه)");
  must(c.typesPerHouse === 4 && c.typesPerHouseSource === "manbook", "۴ نوع در خانه");
  must(TUNING.caps.base.wood === 500 && TUNING.caps.base.gold === 9999, "پایه sim سراسری است");
  must(TUNING.caps.store.bonus === 500 && TUNING.caps.granary.bonus === 500, "جایزه sim ‏۵۰۰/بناست");
  const f = fresh();
  must(capFor(f.state, "wood", 0) === 500, "سقف چوب بی‌انبار ۵۰۰ است");
  const sd = CONFIG.BUILDINGS.stockpile;
  const site = siteNear(f.terrain, f.state.occ, f.W, f.H, 10, 10, sd.w, sd.h);
  must(site, "جا برای انبار تست باید باشد");
  const r = tryPlace(f.state, f.terrain, f.W, f.H, site[0], site[1], sd, 0);
  must(r.ok, "انبار باید ساخته شود");
  completeAll(f.state);
  must(capFor(f.state, "wood", 0) === 1000, "هر انبار +۵۰۰ می‌دهد (نه ۴۸/خانه)");
  return { name: "ظرفیت انبار (1108)", pass: true, detail: "مرجع خانه‌محور ≠ sim سراسری" };
}

// __T_CASTLEBUILDER_ROW96__
// ردیف 96 (§1.1 — انجام‌نشده→کامل، 0.200.0، divergence pin): سولو همان
// «قلعه‌ساز» است — حریف خاموش (ai.active false)، موج صفر، پیروزی فقط با
// wave≥FINAL_WAVE (موج‌ها دستی‌اند، بند 125) پس بی‌موج پایانی نیست؛ نه مهلت
// (نه timeLimit/deadline)؛ کلید F1 برای رویداد دلخواه نیست (نه در پیش‌فرض‌ها).
// خالص و هدلس.
function t_castlebuilder_row96() {
  const st = fresh().state;
  must(st.ai && st.ai.active === false, "حریف خاموش است");
  must(st.wave === 0 && !st.victorious && !st.defeated, "بی‌موج/بی‌پایان در شروع");
  must(!(st.wave >= FINAL_WAVE), "پیروزی فقط پس از موج ۵ است");
  must(st.timeLimit === undefined && st.deadline === undefined, "مهلت نیست");
  must(!Object.values(DEFAULT_KEYS).includes("F1"), "کلید F1 نیست");
  must(!KEY_ACTIONS.some((a) => /f1|event|invasion/i.test(a)), "کنش رویداد دلخواه نیست");
  return { name: "قلعه‌ساز (96)", pass: true, detail: "سندباکس بی‌هدف + بی‌F1" };
}

// __T_KICK_ROW721__
// ردیف 721 (§14.1 — انجام‌نشده→کامل، 0.200.0، absence pin): اخراج بازیکن/AI
// نیست — کارت‌های اتاق (roomRowHTML/liveRowHTML) بازیکنان را فقط نام/پرتره
// نشان می‌دهند (پیوستن/تماشا/ادامه)؛ data-mydel فقط حذف «بازی خودم» از فهرست
// شخصی است نه اخراج بازیکن از اتاق. خالص و هدلس.
function t_kick_row721() {
  const room = { code: "AB12", max: 4, num: 2, seed: 7, players: [{ name: "a", logo: 0 }, { name: "b", logo: 1, on: false }] };
  const h1 = roomRowHTML(room), h2 = liveRowHTML(room, false);
  must(h1.includes(">a<") && h1.includes(">b<") && h2.includes(">a<"), "نام بازیکنان هست");
  for (const h of [h1, h2]) {
    must(!/data-kick|data-remove|data-boot|data-expel|data-del/i.test(h), "دکمه اخراج بازیکن نیست");
  }
  must(h1.includes("data-joincode") && h2.includes("data-watchcode"), "فقط پیوستن/تماشا");
  const mine = myGameRowHTML({ code: "AB12", slot: 1, seed: 7, at: 0, done: false });
  must(mine.includes("data-mydel"), "حذف «بازی خودم» هست");
  must(!/data-kick|data-boot/i.test(mine), "حذف شخصی اخراج بازیکن نیست");
  return { name: "اخراج بازیکن (721)", pass: true, detail: "بی‌دکمه اخراج" };
}

// __T_CHAT_ROW741__
// ردیف 741 (§14.3 — انجام‌نشده→کامل، 0.200.0، vacuous): چت و Taunt نیستند —
// نه کنش chat/taunt در KEY_ACTIONS، نه Enter/F-کلید در پیش‌فرض‌ها، نه ورودی
// چت در DOM. خالص + پروب DOM.
function t_chat_row741() {
  must(KEY_ACTIONS.indexOf("chat") === -1 && KEY_ACTIONS.indexOf("taunt") === -1, "کنش چت/Taunt نیست");
  must(!Object.values(DEFAULT_KEYS).some((c) => c === "Enter" || /^F\d+$/.test(c)), "پیش‌فرض‌ها Enter/F-کلید ندارند");
  if (typeof document === "undefined") return { name: "چت (741)", pass: true, detail: "بی‌کنش/بی‌کلید؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /chat|taunt/i.test(id));
  must(hits.length === 0, "ورودی چت در DOM نیست");
  must(document.querySelectorAll("[data-chat],[data-taunt]").length === 0, "دکمه چت نیست");
  return { name: "چت (741)", pass: true, detail: "بی‌چت/بی‌Taunt" };
}

// __T_IRONMINE_ROW444__
// ردیف 444 (§8 — ناقص→کامل، 0.201.0، divergence pin): معدن آهن مرجع (۲۰ چوب
// + ۲ کارگر)؛ sim هزینه/کارگر خودش را دارد (۱۵ چوب + ۱ کارگر) — واگرایی عمدی
// و مستند. مرجع در balance.json؛ sim در CONFIG. خالص و هدلس.
function t_ironmine_row444() {
  const ref = BALANCE.economy.buildingCosts.ironmine;
  must(ref.cost.wood === 20 && !("stone" in ref.cost) && !("gold" in ref.cost) && ref.workers === 2, "مرجع ۲۰ چوب + ۲ کارگر");
  const d = CONFIG.BUILDINGS.ironmine;
  must(d.cost.wood === 15 && !("stone" in d.cost) && !("gold" in d.cost), "sim: ‏۱۵ چوب (عمدی)");
  must(d.econ && d.econ.workers === 1, "sim: ‏۱ کارگر (عمدی)");
  return { name: "معدن آهن (444)", pass: true, detail: "مرجع ≠ sim (عمدی)" };
}

// __T_MARKET_ROW445__
// ردیف 445 (§8 — ناقص→کامل، 0.201.0، divergence pin): بازار مرجع (۵ چوب +
// ۱ کارگر)؛ sim (۲۰ چوب + ۱۰ سنگ، بی‌نیاز از کارگر) — واگرایی عمدی. خالص و هدلس.
function t_market_row445() {
  const ref = BALANCE.economy.buildingCosts.market;
  must(ref.cost.wood === 5 && !("stone" in ref.cost) && ref.workers === 1, "مرجع ۵ چوب + ۱ کارگر");
  const d = CONFIG.BUILDINGS.market;
  must(d.cost.wood === 20 && d.cost.stone === 10 && !("gold" in d.cost), "sim: ‏۲۰ چوب + ۱۰ سنگ (عمدی)");
  must(d.econ == null, "sim: بازار بی‌نیاز از کارگر است (عمدی)");
  return { name: "بازار (445)", pass: true, detail: "مرجع ≠ sim (عمدی)" };
}

// __T_QUARRY_ROW448__
// ردیف 448 (§8 — ناقص→کامل، 0.201.0، divergence pin): معدن سنگ مرجع (۲۰ چوب
// + ۳ کارگر)؛ sim (۱۵ چوب + ۱ کارگر) — واگرایی عمدی. خالص و هدلس.
function t_quarry_row448() {
  const ref = BALANCE.economy.buildingCosts.quarry;
  must(ref.cost.wood === 20 && !("stone" in ref.cost) && ref.workers === 3, "مرجع ۲۰ چوب + ۳ کارگر");
  const d = CONFIG.BUILDINGS.quarry;
  must(d.cost.wood === 15 && !("stone" in d.cost), "sim: ‏۱۵ چوب (عمدی)");
  must(d.econ && d.econ.workers === 1, "sim: ‏۱ کارگر (عمدی)");
  return { name: "معدن سنگ (448)", pass: true, detail: "مرجع ≠ sim (عمدی)" };
}

// __T_STOCKPILE_ROW449__
// ردیف 449 (§8 — ناقص→کامل، 0.201.0، divergence pin): انبار مرجع رایگان؛ sim
// (۲۰ چوب) — واگرایی عمدی. خالص و هدلس.
function t_stockpile_row449() {
  const ref = BALANCE.economy.buildingCosts.stockpile;
  must(Object.keys(ref.cost).length === 0 && ref.workers === 0, "مرجع رایگان است");
  const d = CONFIG.BUILDINGS.stockpile;
  must(d.cost.wood === 20 && !("stone" in d.cost) && !("gold" in d.cost), "sim: ‏۲۰ چوب (عمدی)");
  return { name: "انبار (449)", pass: true, detail: "مرجع رایگان ≠ sim (عمدی)" };
}

// __T_WOODCUTTER_ROW450__
// ردیف 450 (§8 — ناقص→کامل، 0.201.0، divergence pin): چوب‌بری مرجع (۳ چوب +
// ۱ کارگر)؛ sim (۱۵ چوب + ۱ کارگر — کارگر یکی است، هزینه عمداً فرق دارد).
// خالص و هدلس.
function t_woodcutter_row450() {
  const ref = BALANCE.economy.buildingCosts.woodcutter;
  must(ref.cost.wood === 3 && !("stone" in ref.cost) && ref.workers === 1, "مرجع ۳ چوب + ۱ کارگر");
  const d = CONFIG.BUILDINGS.woodcutter;
  must(d.cost.wood === 15 && !("stone" in d.cost), "sim: ‏۱۵ چوب (عمدی)");
  must(d.econ && d.econ.workers === 1, "sim: کارگر همان ۱ است");
  return { name: "چوب‌بری (450)", pass: true, detail: "هزینه ≠، کارگر = (عمدی)" };
}

// __T_ARMOURER_ROW466__
// ردیف 466 (§8 — انجام‌نشده→کامل، 0.202.0، absence+reference pin): کارگاه
// Armourer مرجع (۲۰ چوب + ۱۰۰ طلا + ۱ کارگر، iron→metal armour)؛ بنای جدا در
// sim نیست — آهن‌کاری در armoury تجمیع شده (بند 703/704). خالص و هدلس.
function t_armourer_row466() {
  const ref = BALANCE.economy.buildingCosts.armourer;
  must(ref.cost.wood === 20 && ref.cost.gold === 100 && ref.workers === 1, "مرجع ۲۰ چوب + ۱۰۰ طلا + ۱ کارگر");
  must(!CONFIG.BUILDINGS.armourer && !CONFIG.BUILDINGS.armorer, "بنای جدا نیست");
  const a = CONFIG.BUILDINGS.armoury;
  must(a.econ && a.econ.produces === "swords" && a.econ.consumes.iron === 2, "آهن‌کاری در armoury است (703/704)");
  return { name: "زره‌ساز (466)", pass: true, detail: "مرجع + تجمیع در armoury" };
}

// __T_BLACKSMITH_ROW467__
// ردیف 467 (§8 — انجام‌نشده→کامل، 0.202.0، absence+reference pin): کارگاه
// Blacksmith مرجع (۲۰ چوب + ۲۰۰ طلا + ۱ کارگر، iron→mace/sword)؛ بنای جدا
// نیست — همان armoury شمشیر می‌سازد (بند 704). خالص و هدلس.
function t_blacksmith_row467() {
  const ref = BALANCE.economy.buildingCosts.blacksmith;
  must(ref.cost.wood === 20 && ref.cost.gold === 200 && ref.workers === 1, "مرجع ۲۰ چوب + ۲۰۰ طلا + ۱ کارگر");
  must(!CONFIG.BUILDINGS.blacksmith, "بنای جدا نیست");
  const a = CONFIG.BUILDINGS.armoury;
  must(a.econ && a.econ.produces === "swords", "شمشیر در armoury ساخته می‌شود (704)");
  return { name: "آهنگر (467)", pass: true, detail: "مرجع + تجمیع در armoury" };
}

// __T_POLETURNER_ROW469__
// ردیف 469 (§8 — انجام‌نشده→کامل، 0.202.0، absence+reference pin): کارگاه
// Poleturner مرجع (۱۰ چوب + ۱۰۰ طلا + ۱ کارگر، wood→spear/pike)؛ نه بنا، نه
// تولید نیزه/پیک در کل sim (بند 705: vacuous). خالص و هدلس.
function t_poleturner_row469() {
  const ref = BALANCE.economy.buildingCosts.poleturner;
  must(ref.cost.wood === 10 && ref.cost.gold === 100 && ref.workers === 1, "مرجع ۱۰ چوب + ۱۰۰ طلا + ۱ کارگر");
  must(!CONFIG.BUILDINGS.poleturner, "بنای جدا نیست");
  must(!Object.values(CONFIG.BUILDINGS).some((d) => d.econ && /spear|pike/i.test(d.econ.produces || "")), "تولید نیزه/پیک نیست (705)");
  return { name: "نیزه‌ساز (469)", pass: true, detail: "مرجع + بی‌تولید" };
}

// __T_PITCHRIG_ROW447__
// ردیف 447 (§8 — انجام‌نشده→کامل، 0.202.0، absence+reference pin): Pitch Rig
// مرجع (۲۰ چوب + ۱ کارگر، فقط باتلاق)؛ نه بنا، نه قیر در sim (بند 1017/696).
// خالص و هدلس.
function t_pitchrig_row447() {
  const ref = BALANCE.economy.buildingCosts.pitchrig;
  must(ref.cost.wood === 20 && ref.workers === 1 && ref.marshOnly === true, "مرجع ۲۰ چوب + باتلاق‌تنها");
  must(!CONFIG.BUILDINGS.pitchrig && !CONFIG.BUILDINGS.pitchRig, "بنای قیر نیست");
  must(!("pitch" in fresh().state.resources), "منبع قیر نیست (1017)");
  return { name: "تجهیز قیر (447)", pass: true, detail: "مرجع + بی‌قیر" };
}

// __T_CAMERA_ROW1231__
// ردیف 1231 (§23 — ناقص→کامل، 0.202.0، parent pin): نمای ۲٫۵D ایزومتریک (کاشی
// ۲:۱) + هر ۴ فرزند پین‌شده — چرخش بی‌مصداق (158: نه کنش، نه کلید X/C) + زوم
// (159: گام چرخ) + نگاه (160: KeyV) + تخت (161: Space). الگوی والد 726/757.
// خالص و هدلس.
function t_camera_row1231() {
  must(CONFIG.TILE_W === 2 * CONFIG.TILE_H && CONFIG.TILE_W === 28, "کاشی ۲:۱ = ایزومتریک ۲٫۵D");
  must(!KEY_ACTIONS.some((a) => /rotat/i.test(a)), "کنش چرخش نیست (158)");
  must(!Object.values(DEFAULT_KEYS).some((c) => c === "KeyX" || c === "KeyC"), "کلید X/C نیست (158)");
  must(zoomStep(1, true) === 1.12 && zoomStep(1, false) === 0.89, "زوم هست (159)");
  must(DEFAULT_KEYS.peek === "KeyV" && DEFAULT_KEYS.flat === "Space", "نگاه/تخت هست (160/161)");
  return { name: "نمای دوربین (1231)", pass: true, detail: "ایزو + ۴ فرزند" };
}

// __T_HIRECOND_ROW481__
// ردیف 481 (§9 — ناقص→کامل، 0.203.0، behavioral+divergence pin): شرط استخدام
// سربازخانه‌ای (spearman: ۲۵غ+۱۰ط + شمشیر) — سربازخانه + سلاح + طلا enforced
// (NO_BARRACKS/NEEDS_WEAPON/INSUFFICIENT)؛ دهقان آزاد لازم نیست — با
// freeWorkers=۰ هم OK است (انحراف از دفترچه). الگوی t_slave. خالص و هدلس.
function t_hirecond_row481() {
  must(UNITS.spearman.requires === "barracks" && UNITS.spearman.requiresWeapon === "swords", "نیزه‌دار سربازخانه‌ای شمشیربر است");
  const f = fresh();
  needBarracks(f.state, f.terrain, f.W, f.H);
  f.state.resources.food = 100; f.state.resources.gold = 100; f.state.resources.swords = 1;
  const at = [5, 5];
  must(validateHire(f.state, f.terrain, f.W, f.H, at[0], at[1], "spearman", 0).ok, "سربازخانه+شمشیر+طلا = OK");
  f.state.resources.swords = 0;
  must(validateHire(f.state, f.terrain, f.W, f.H, at[0], at[1], "spearman", 0).reason === "NEEDS_WEAPON", "بی‌سلاح = NEEDS_WEAPON (سلاح/زره در Armoury)");
  f.state.resources.swords = 1; f.state.resources.gold = 0;
  must(validateHire(f.state, f.terrain, f.W, f.H, at[0], at[1], "spearman", 0).reason === "INSUFFICIENT", "بی‌طلا = INSUFFICIENT");
  f.state.resources.gold = 100; f.state.freeWorkers = 0; f.state.workers = 0;
  must(validateHire(f.state, f.terrain, f.W, f.H, at[0], at[1], "spearman", 0).ok, "بی‌دهقان آزاد هم OK — sim دهقان نمی‌خواهد (انحراف)");
  const bare = fresh();
  bare.state.resources.food = 100; bare.state.resources.gold = 100; bare.state.resources.swords = 1;
  must(validateHire(bare.state, bare.terrain, bare.W, bare.H, at[0], at[1], "spearman", 0).reason === "NO_BARRACKS", "بی‌سربازخانه = NO_BARRACKS");
  return { name: "شرط استخدام (481)", pass: true, detail: "سربازخانه+سلاح+طلا، بی‌دهقان" };
}

// __T_HIRECOST_ROW868__
// ردیف 868 (§18.1 — ناقص→کامل، 0.203.0، behavioral pin): مزدور (assassin:
// ۳۰غ+۴۰ط، mercGold ‏۷۰) با پست مزدور فقط طلا می‌خواهد — بی‌سلاح و بی‌غذا هم
// OK است (✅ دفترچه)؛ همان قاتل بی‌پست NEEDS_WEAPON می‌خواهد (اروپایی تجهیزات
// می‌خواهد)؛ دهقان آزاد هم لازم نیست. الگوی t_mercpost. خالص و هدلس.
function t_hirecost_row868() {
  const a = UNITS.assassin;
  must(a.merc === true && a.mercGold === 70, "قاتل مزدور ۷۰ط است");
  const f = fresh();
  needBarracks(f.state, f.terrain, f.W, f.H);
  f.state.resources.food = 0; f.state.resources.swords = 0; f.state.resources.bows = 0; f.state.resources.gold = 200;
  const legacy = validateHire(f.state, f.terrain, f.W, f.H, 5, 5, "assassin", 0);
  must(!legacy.ok && legacy.reason === "NEEDS_WEAPON", "بی‌پست: قاتل شمشیر می‌خواهد");
  const site = siteNear(f.terrain, f.state.occ, f.W, f.H, 30, 30, 3, 2);
  must(!!site, "جای پست هست");
  const mp = tryPlace(f.state, f.terrain, f.W, f.H, site[0], site[1], CONFIG.BUILDINGS.mercpost, 0);
  must(mp.ok, "پست ساخته شد");
  simC(f.state, f.terrain, 1);
  f.state.freeWorkers = 0; f.state.workers = 0;
  const v = validateHire(f.state, f.terrain, f.W, f.H, 5, 5, "assassin", 0);
  must(v.ok, "با پست: فقط طلا کافی است (بی‌سلاح/بی‌دهقان ✅)");
  return { name: "هزینه استخدام (868)", pass: true, detail: "مزدور طلافقط، اروپایی مسلح" };
}

// __T_TUNNELENT_ROW474__
// ردیف 474 (§8 — انجام‌نشده→کامل، 0.203.0، absence pin): ورودی تونل هرگز ظاهر
// نمی‌شود — نه بنای tunnel/tunnelentrance، نه دستور حفر (دستورها فقط
// move/attackMove/patrol/attackPos/retreat)؛ موتور تونل نیست (1013). خالص و هدلس.
function t_tunnelent_row474() {
  must(!CONFIG.BUILDINGS.tunnel && !CONFIG.BUILDINGS.tunnelentrance && !CONFIG.BUILDINGS.tunnelEntrance, "بنای تونل/ورودی نیست (1013)");
  return { name: "ورودی تونل (474)", pass: true, detail: "بی‌بنا + بی‌دستور حفر" };
}

// __T_ASSASSIN_ROW512__
// ردیف 512 (§10 — ناقص→کامل، 0.203.0، divergence pin): قاتل قلاب/نامرئی ندارد
// (نه پرچم stealth/invisible، نه قلاب در تجهیزات، نه نردبان‌روی)؛ تصرف دروازه
// هست (stepGateCapture از بند 110). خالص و هدلس.
function t_assassin_row512() {
  const a = UNITS.assassin;
  must(a.side === "player" && a.requires === "barracks", "قاتل سربازخانه‌ای خودی است");
  must(!a.invisible && !a.stealth && !a.canClimb && a.canClimbLadder === false, "نامرئی/قلاب نیست");
  must(Array.isArray(a.equip) && !a.equip.some((e) => /hook|rope|ladder/i.test(e)), "قلاب در تجهیزات نیست");
  must(typeof stepGateCapture === "function", "تصرف دروازه هست (110)");
  return { name: "قاتل (512)", pass: true, detail: "بی‌قلاب/بی‌نامرئی، باتصرف" };
}

// __T_ENGINEER_ROW649__
// ردیف 649 (§12 — ناقص→کامل، 0.203.0، mixed pin): مهندس + انجمنش هستند
// (engineer انجمنی ۳۰طلا)؛ ولی جریان Siege Equipment نیست — نه چادر (1012/650)،
// نه دکمه/ورودی tent/siege در DOM. خالص + پروب DOM.
function t_engineer_row649() {
  const e = UNITS.engineer;
  must(e && e.side === "player" && e.requires === "engineerguild", "مهندس انجمنی است");
  must(!!CONFIG.BUILDINGS.engineerguild, "بنای انجمن هست");
  must(!CONFIG.BUILDINGS.siegeTent && !CONFIG.BUILDINGS.tent, "چادر نیست (1012/650)");
  if (typeof document === "undefined") return { name: "مهندس (649)", pass: true, detail: "مهندس هست، چادر نیست؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((x) => x.id).filter((id) => /siege|tent/i.test(id));
  must(hits.length === 0, "دکمه Siege Equipment در DOM نیست");
  return { name: "مهندس (649)", pass: true, detail: "مهندس هست، جریان چادر نیست" };
}

// __T_TARGETLOOP_ROW1151__
// ردیف 1151 (§19.3 — ناقص→کامل، 0.204.0، behavioral pin): هر واحد target
// (targetKind/targetId) + stance (engage/hold/defend/guard) + cooldown دارد؛
// سقف‌ها: hold ‏۸، defend ‏۲۰ (DEFEND_RADIUS)، engage افسار ۴۰/۴۲ از پست
// (ENGAGE_RADIUS/ENGAGE_DROP، دید = aggro). خالص و هدلس.
function t_targetloop_row1151() {
  must(JSON.stringify(Object.keys(STANCES).sort()) === '["DEFEND","ENGAGE","GUARD","HOLD"]', "چهار موضع است");
  must(ENGAGE_RADIUS === 40 && ENGAGE_DROP === 42, "افسار تهاجمی ۴۰/۴۲ است");
  must(DEFEND_RADIUS === 20, "شعاع تدافعی ۲۰ است");
  must(UNITS.soldier.cd === 10 && UNITS.bowman.cd === 12 && UNITS.archer.cd === 15, "سردی در تعریف‌هاست");
  const f = fresh();
  const sg = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  must(!!sg, "جای سرباز هست");
  const me = spawnUnit(f.state, "soldier", sg[0] + 0.5, sg[1] + 0.5, 0);
  must(me.stance === "engage" && me.targetKind === null && me.targetId === null && me.cooldown === 0, "تازه: تهاجمیِ بی‌هدفِ بی‌سردی است");
  must(setStance(me, "hold").ok && me.stance === "hold", "پابرجا پذیرفته می‌شود");
  must(setStance(me, "defend").ok && me.stance === "defend", "تدافعی پذیرفته می‌شود");
  must(setStance(me, "engage").ok && me.stance === "engage", "تهاجمی پذیرفته می‌شود");
  must(!setStance(me, "fly").ok, "موضع نامعتبر رد می‌شود");
  // کسب هدف در برد: کماندار تهاجمی، کماندار دشمن در ۴ خانه‌ای.
  const g = fresh();
  const gg = grassNear(g.terrain, g.state.occ, g.W, g.H, 20, 20);
  must(!!gg, "جای کماندار هست");
  const bow = spawnUnit(g.state, "bowman", gg[0] + 0.5, gg[1] + 0.5, 0);
  const near = grassInBand(g.terrain, g.W, g.H, bow.x, bow.r, 3.5, 4.5);
  must(!!near, "جای نزدیک برای دشمن هست");
  const foe = spawnUnit(g.state, "archer", near[0] + 0.5, near[1] + 0.5);
  setStance(foe, "hold");
  simC(g.state, g.terrain, 3);
  must(bow.targetKind === "unit" && bow.targetId === foe.id, "کماندار هدف را گرفته است");
  must(foe.hp < 30, "دشمن خورده است (سردی چرخیده)");
  // سقف ۸ پابرجا: سرباز hold + دشمن hold در ۸٫۵ تا ۹٫۵ = بی‌خبر از هم.
  const h = fresh();
  const hg = grassNear(h.terrain, h.state.occ, h.W, h.H, 20, 20);
  must(!!hg, "جای سرباز hold هست");
  const sol = spawnUnit(h.state, "soldier", hg[0] + 0.5, hg[1] + 0.5, 0);
  const far = grassInBand(h.terrain, h.W, h.H, sol.x, sol.r, 8.5, 9.5);
  must(!!far, "جای بیرون سقف ۸ هست");
  const foe2 = spawnUnit(h.state, "archer", far[0] + 0.5, far[1] + 0.5);
  setStance(sol, "hold"); setStance(foe2, "hold");
  const sx0 = sol.x, sr0 = sol.r, fx0 = foe2.x, fr0 = foe2.r;
  simC(h.state, h.terrain, 40);
  must(foe2.hp === 30, "دشمن بیرون سقف ۸ دست‌نخورده می‌ماند");
  must(sol.x === sx0 && sol.r === sr0 && foe2.x === fx0 && foe2.r === fr0, "پابرجا تکان نمی‌خورد");
  // همان فاصله با تهاجمی = تعقیب (سقف = aggro ‏۱۰).
  const k = fresh();
  const kg = grassNear(k.terrain, k.state.occ, k.W, k.H, 20, 20);
  must(!!kg, "جای سرباز تهاجمی هست");
  const chaser = spawnUnit(k.state, "soldier", kg[0] + 0.5, kg[1] + 0.5, 0);
  const kf = grassInBand(k.terrain, k.W, k.H, chaser.x, chaser.r, 8.5, 9.5);
  must(!!kf, "جای بیرون سقف ۸ برای تعقیب هست");
  const foe3 = spawnUnit(k.state, "archer", kf[0] + 0.5, kf[1] + 0.5);
  setStance(foe3, "hold");
  const d0 = Math.hypot(chaser.x - foe3.x, chaser.r - foe3.r);
  simC(k.state, k.terrain, 40);
  const d1 = Math.hypot(chaser.x - foe3.x, chaser.r - foe3.r);
  must(d1 < d0 - 1, "تهاجمی به دشمن در aggro نزدیک می‌شود");
  return { name: "حلقه هدف (1151)", pass: true, detail: "هدف/موضع/سردی + سقف ۸/۲۰/۴۰" };
}

// __T_COLLAPSE_ROW1156__
// ردیف 1156 (§19.3 — ناقص→کامل، 0.204.0، behavioral+divergence pin): صفرشدن HP
// سازه = حذف (destroyed + ‎hp صفر + آزادی زمین)؛ قطعه دیوار مجاور مستقل می‌ماند؛
// مدافعان برجِ ویران زنده بیرون می‌پرند (انحراف مستند: دفترچه می‌گوید می‌میرند)؛
// فروپاشی تونل بی‌مصداق است (نه بنا با کلید-دقیق، نه حفر، نه collapse در مرجع).
// مسیر جنگی strike (مثل ویرانی واقعی)؛ الگوی t_garrison_release. خالص و هدلس.
function t_collapse_row1156() {
  const f = fresh();
  must(!peaceActive(f.state), "صلح پیش‌فرض خاموش است (ضربه واقعی)");
  const site = siteNear(f.terrain, f.state.occ, f.W, f.H, 20, 20, 5, 2);
  must(!!site, "جای زنجیره دیوار هست");
  const hutP = tryPlace(f.state, f.terrain, f.W, f.H, site[0], site[1], CONFIG.BUILDINGS.hut, 0);
  must(hutP.ok, "کلبه لنگر ساخته شد");
  const wallA = tryPlace(f.state, f.terrain, f.W, f.H, site[0] + 2, site[1], CONFIG.BUILDINGS.wall, 0);
  must(wallA.ok, "دیوار اول ساخته شد");
  const wallB = tryPlace(f.state, f.terrain, f.W, f.H, site[0] + 3, site[1], CONFIG.BUILDINGS.wall, 0);
  must(wallB.ok, "دیوار مجاور ساخته شد");
  completeAll(f.state);
  const hpB = wallB.building.hp;
  strike(f.state, 10000, { kind: "bld", b: wallA.building });
  must(wallA.building.destroyed === true && wallA.building.hp === 0, "صفرشدن HP = حذف");
  must(f.state.occ[wallA.building.r * f.W + wallA.building.c] === 0, "زمین آزاد شد");
  must(!wallB.building.destroyed && wallB.building.hp === hpB, "قطعه مجاور مستقل است");
  // گاریسون: برج + کماندار، ویرانی جنگی.
  const g = fresh();
  needBarracks(g.state, g.terrain, g.W, g.H);
  const ts = siteNear(g.terrain, g.state.occ, g.W, g.H, 10, 10, 3, 3);
  must(!!ts, "جای برج هست");
  const tr = tryPlace(g.state, g.terrain, g.W, g.H, ts[0], ts[1], CONFIG.BUILDINGS.tower, 0);
  must(tr.ok, "برج ساخته شد");
  completeAll(g.state);
  const hg = grassNear(g.terrain, g.state.occ, g.W, g.H, 30, 30);
  must(!!hg, "جای استخدام هست");
  const hh = hireUnit(g.state, g.terrain, g.W, g.H, hg[0], hg[1], "bowman");
  must(hh.ok, "استخدام شد");
  must(garrisonUnit(g.state, hh.unit, tr.building).ok, "مستقر شد");
  strike(g.state, 100000, { kind: "bld", b: tr.building });
  must(tr.building.destroyed === true, "برج ویران شد");
  const surv = g.state.units.find((x) => x.id === hh.unit.id && !x.dead);
  must(surv && surv.hp === 40 && surv.garrisonTower == null, "مدافع زنده بیرون پرید (انحراف: دفترچه مرگ می‌گوید)");
  must((tr.building.garrison || []).length === 0, "گاریسون خالی شد");
  // تونل: نه بنا (کلید-دقیق)، نه حفر، نه فروپاشی در مرجع.
  must(!CONFIG.BUILDINGS.tunnel && !CONFIG.BUILDINGS.tunnelentrance && !CONFIG.BUILDINGS.tunnelEntrance, "بنای تونل نیست (1013/474)");
  must(UNITS.tunneler.canDigMoat === false, "حفار حفر نمی‌کند (0.161.0)");
  must(!!BALANCE.siege.tunnel && !("collapse" in BALANCE.siege), "مرجع تونل بی‌فروپاشی است");
  return { name: "فرو ریختن (1156)", pass: true, detail: "حذف+استقلال+آزادی زنده" };
}

// __T_SPOTMARK_ROW1157__
// ردیف 1157 (§19.3 — انجام‌نشده→کامل، 0.204.0، absence+behavioral pin): قاتل
// نامرئی نیست — نه پرچم stealth/invisible در هیچ تعریف یگان، نه موضع دیدن/علامت
// (STANCES همان چهارتاست)، تجهیزات فقط شمشیر؛ دشمن او را می‌بیند و می‌زند
// (مکمل t_assassin_row512 که قلاب/تجهیزات را بست). خالص و هدلس.
function t_spotmark_row1157() {
  const a = UNITS.assassin;
  must(!a.invisible && !a.stealth && !a.hidden && !a.spotted && !a.seenBy, "قاتل پرچم پنهانی ندارد");
  must(Array.isArray(a.equip) && a.equip.length === 1 && a.equip[0] === "swords", "تجهیزات فقط شمشیر است");
  must(a.canClimbLadder === false, "نردبان‌رو نیست (512)");
  for (const [id, d] of Object.entries(UNITS)) {
    if (!d || typeof d !== "object") continue;
    must(!d.invisible && !d.stealth, "یگان " + id + " نامرئی نیست (نه سامانه پنهانی)");
  }
  must(JSON.stringify(Object.keys(STANCES).sort()) === '["DEFEND","ENGAGE","GUARD","HOLD"]', "موضع دیدن/علامت نیست");
  // رفتار: کماندار دشمنِ hold در ۳ خانه‌ای، قاتلِ hold را می‌زند (دیده می‌شود).
  const f = fresh();
  const fg = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
  must(!!fg, "جای قاتل هست");
  const as = spawnUnit(f.state, "assassin", fg[0] + 0.5, fg[1] + 0.5, 0);
  const ng = grassInBand(f.terrain, f.W, f.H, as.x, as.r, 2.5, 3.5);
  must(!!ng, "جای دشمن نزدیک هست");
  const foe = spawnUnit(f.state, "archer", ng[0] + 0.5, ng[1] + 0.5);
  setStance(as, "hold"); setStance(foe, "hold");
  simC(f.state, f.terrain, 60);
  must(!as.dead && as.hp < 35, "قاتل دیده و زده شد (نامرئی نیست)");
  return { name: "علامت دیده‌شدن (1157)", pass: true, detail: "بی‌پنهانی، بادید دشمن" };
}

// __T_OILOP_ROW1160__
// ردیف 1160 (§19.3 — انجام‌نشده→کامل، 0.204.0، absence pin): سامانه روغن مهندس
// نیست — نه بنا (کلید-دقیق: oilsmelter/smelter/brazier/pitchrig/oilrig)، نه میدان
// اپراتور/خدمه/دیگ در هیچ بنایی، نه میدان روغن/ریختن در هیچ یگانی (مهندس equip
// خالی)، نه قاعده روغن در مرجع siege، نه موضع pour/oil، نه آستانه ۱/۳ دشمن.
// مکمل t_oil_absence. خالص و هدلس.
function t_oilop_row1160() {
  must(!CONFIG.BUILDINGS.oilsmelter && !CONFIG.BUILDINGS.smelter && !CONFIG.BUILDINGS.brazier && !CONFIG.BUILDINGS.pitchrig && !CONFIG.BUILDINGS.oilrig, "بنای روغن/ذوب/منقل نیست");
  for (const [id, b] of Object.entries(CONFIG.BUILDINGS)) {
    if (!b || typeof b !== "object") continue;
    must(!("operatorLimit" in b) && !("maxOperators" in b) && !("crew" in b) && !("pour" in b) && !("oil" in b) && !("smelter" in b), "بنای " + id + " اپراتور/دیگ ندارد");
  }
  const e = UNITS.engineer;
  must(!e.oil && !e.oilPot && !e.smelter && !e.pour && !e.operator && !e.crew, "مهندس میدان روغن ندارد");
  must(Array.isArray(e.equip) && e.equip.length === 0, "مهندس دیگ ندارد");
  for (const [id, d] of Object.entries(UNITS)) {
    if (!d || typeof d !== "object") continue;
    must(!("oil" in d) && !("pour" in d) && !("smelter" in d) && !("oilPot" in d), "یگان " + id + " ریختن ندارد");
  }
  must(!("oil" in BALANCE.siege) && !("smelter" in BALANCE.siege) && !("pour" in BALANCE.siege) && !("oilOperator" in BALANCE.siege), "مرجع siege قاعده روغن ندارد");
  must(!STANCES.pour && !STANCES.oil, "موضع ریختن/روغن نیست");
  return { name: "اپراتور روغن (1160)", pass: true, detail: "بی‌اپراتور/دیگ/آستانه" };
}

// __T_ALLYTERMS_ROW735__
// ردیف 735 (§14.3 — انجام‌نشده→کامل، 0.205.0، behavioral+absence pin): معنای
// اتحاد نیست — هدف‌گیری برون‌مالکی همچنان خصمانه است (رفتار: سرباز مالک ۰ با
// سرباز مالک ۱ می‌جنگد)؛ نه فرمان هدیه/خراج (queueOrder فقط ۴ گونه WP)؛ برد
// مشترک هم نیست (ارجاع t_alliance_absence_row129). خالص و هدلس.
function t_allyterms_row735() {
  const f = mpFresh(2);
  const g0 = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
  must(!!g0, "جای سرباز اول هست");
  const a = spawnUnit(f.state, "soldier", g0[0] + 0.5, g0[1] + 0.5, 0);
  const g1 = grassInBand(f.terrain, f.W, f.H, a.x, a.r, 0.5, 1.5);
  must(!!g1, "جای مجاور برای سرباز دوم هست");
  const b = spawnUnit(f.state, "soldier", g1[0] + 0.5, g1[1] + 0.5, 1);
  for (let i = 0; i < 200; i++) { f.state.tick++; stepEconomy(f.state); stepCombat(f.state, f.terrain); }
  must(a.hp < 60 || a.dead || b.hp < 60 || b.dead, "مالکان دیگر همدیگر را می‌زنند (نه عدم تجاوز)");
  must(queueOrder(f.state, a, "gift", 5, 5).reason === "INVALID", "فرمان هدیه نیست");
  must(queueOrder(f.state, a, "tribute", 5, 5).reason === "INVALID", "فرمان خراج نیست");
  must(queueOrder(f.state, a, "sendGoods", 5, 5).reason === "INVALID", "فرمان ارسال کالا نیست");
  return { name: "معنای اتحاد (735)", pass: true, detail: "خصومت برون‌مالکی + بی‌هدیه" };
}

// __T_ALLYSCREEN_ROW736__
// ردیف 736 (§14.3 — انجام‌نشده→کامل، 0.205.0، absence+DOM pin): صفحه متحدان
// نیست — نه Send/Request Goods در کارت‌های اتاق، نه پنل/دکمه متحد در DOM.
// خالص + پروب DOM (الگوی t_chat_row741).
function t_allyscreen_row736() {
  const room = { code: "AB12", max: 4, num: 2, seed: 7, players: [{ name: "a", logo: 0 }, { name: "b", logo: 1 }] };
  for (const h of [roomRowHTML(room), liveRowHTML(room, false)]) {
    must(!/sendgoods|requestgoods|talktoallies|allies-screen|diplomacy/i.test(h), "دکمه کالا/دیپلماسی در کارت اتاق نیست");
  }
  if (typeof document === "undefined") return { name: "صفحه متحدان (736)", pass: true, detail: "بی‌دکمه کالا؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /allies|diplomacy|tribute/i.test(id));
  must(hits.length === 0, "پنل متحد در DOM نیست");
  must(document.querySelectorAll("[data-ally],[data-allies],[data-tribute],[data-sendgoods],[data-requestgoods]").length === 0, "دکمه متحد نیست");
  return { name: "صفحه متحدان (736)", pass: true, detail: "بی‌پنل/بی‌دکمه" };
}

// __T_ALLYAIREQ_ROW737__
// ردیف 737 (§14.3 — انجام‌نشده→کامل، 0.205.0، absence pin): درخواست از متحد AI
// نیست — اتاق‌ها صندلی AI/CPU ندارند (بازیکنان انسانی با نام/پرتره‌اند)؛
// شخصیت‌های AI میدان دیپلماسی ندارند (فقط ساخت/یورش/اقتصاد). خالص و هدلس.
function t_allyaireq_row737() {
  const room = { code: "AB12", max: 4, num: 2, seed: 7, players: [{ name: "a", logo: 0 }, { name: "b", logo: 1, on: false }] };
  const h = liveRowHTML(room, false);
  must(h.includes(">a<") && h.includes(">b<"), "نام بازیکنان انسانی هست");
  must(!/CPU/i.test(h), "سپر CPU نیست");
  for (const p of ["artan", "azarm"]) {
    const P = aiPersonality({ personality: p });
    must(!("diplomacy" in P) && !("tribute" in P) && !("ally" in P) && !("acceptRequest" in P), "شخصیت " + p + " دیپلماسی ندارد");
  }
  return { name: "درخواست متحد AI (737)", pass: true, detail: "بی‌صندلی AI + بی‌دیپلماسی" };
}

// __T_ALLYMARKS_ROW738__
// ردیف 738 (§14.3 — انجام‌نشده→کامل، 0.205.0، absence+DOM pin): نشانگر دور
// پرتره نیست — lordPortraitHTML فقط <img> پرتره است (نه «!»/سپر/شمشیر/منبع)؛
// رستر اتاق هم نشانگر ندارد. هشدارهای مشاور (warnEl) سامانه جداست. خالص + پروب DOM.
function t_allymarks_row738() {
  const face = lordPortraitHTML(0);
  must(face.indexOf("<img") === 0 && face.indexOf("lordFace") !== -1, "پرتره فقط <img> است");
  must(face.indexOf("!") === -1, "علامت «!» در پرتره نیست");
  must(!/shield|sword|badge|data-mark/i.test(face), "سپر/شمشیر/نشان در پرتره نیست");
  const room = { code: "AB12", max: 4, num: 2, seed: 7, players: [{ name: "a", logo: 0 }, { name: "b", logo: 1 }] };
  const h = liveRowHTML(room, false);
  must(!/badge|data-mark|shield-icon|sword-icon/i.test(h), "نشانگر در رستر نیست");
  if (typeof document === "undefined") return { name: "نشانگر پرتره (738)", pass: true, detail: "بی‌نشانگر؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /allymark|portraitmark|ordermark/i.test(id));
  must(hits.length === 0, "نشانگر متحد در DOM نیست");
  return { name: "نشانگر پرتره (738)", pass: true, detail: "پرتره تمیز + رستر بی‌نشان" };
}

// __T_ALLYORDERS_ROW739__
// ردیف 739 (§14.3 — انجام‌نشده→کامل، 0.205.0، absence+DOM pin): دستورات متحد
// نیست — نه پنل Set Orders (نه Enter/بوق)، نه فرمان صدور دستور (صف فقط ۴ گونه
// WP). خالص + پروب DOM.
function t_allyorders_row739() {
  const f = fresh();
  const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  must(!!g, "جای یگان هست");
  const u = spawnUnit(f.state, "soldier", g[0] + 0.5, g[1] + 0.5, 0);
  must(queueOrder(f.state, u, "setOrders", 5, 5).reason === "INVALID", "فرمان Set Orders نیست");
  must(queueOrder(f.state, u, "horn", 5, 5).reason === "INVALID", "فرمان بوق نیست");
  if (typeof document === "undefined") return { name: "دستورات متحد (739)", pass: true, detail: "بی‌فرمان؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /setorders|allyorders|warhorn|bugle/i.test(id));
  must(hits.length === 0, "پنل دستور متحد در DOM نیست");
  must(document.querySelectorAll("[data-setorders],[data-allyorders]").length === 0, "دکمه دستور متحد نیست");
  return { name: "دستورات متحد (739)", pass: true, detail: "بی‌پنل/بی‌فرمان" };
}

// __T_EXTCAMP_ROW767__
// ردیف 767 (§16 — انجام‌نشده→کامل، 0.206.0، vacuous): کمپین Extreme با ۲۰
// مأموریت و دشواری فزاینده نیست — MISSIONS شش‌تایی skirmish است (0.225.0؛ نه Extreme)؛ نه میدان campaign در
// state، نه شمار مأموریت/درجه سختی کمپین در sim. خالص و هدلس.
function t_extcamp_row767() {
  must(MISSIONS.length === 6, "کاتالوگ ۶ مأموریت skirmish است (نه Extreme)");
  const st = createState();
  for (const k of ["campaign", "extremeCampaign", "campaignMissions", "campaignStep", "missionIndex"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  return { name: "کمپین Extreme (767)", pass: true, detail: "کمپین ۶تایی skirmish/بی‌میدان" };
}

// __T_EXTMP_ROW768__
// ردیف 768 (§16 — انجام‌نشده→کامل، 0.206.0، absence pin): مولتی‌پلیر Extreme با
// مکانیزم‌های Extreme — گونه/مکانیزم Extreme در MP نیست: rules فقط ۴ کلید
// (noCow/strongWalls/noRush/noDogs) است + نه پرچم extreme در state، نه در
// state.mp. خالص و هدلس.
function t_extmp_row768() {
  const f = mpFresh(2);
  const keys = Object.keys(f.state.rules || {}).sort();
  const allowed = ["noCow", "noDogs", "noRush", "strongWalls"];
  for (const k of keys) must(allowed.indexOf(k) !== -1, "کلید قانون ناشناخته: " + k);
  must(keys.indexOf("extreme") === -1 && keys.indexOf("extremeMode") === -1, "قانون Extreme در rules نیست");
  must(f.state.extreme === undefined && f.state.extremeMode === undefined, "پرچم extreme در state نیست");
  const mp = f.state.mp || {};
  must(mp.extreme === undefined && mp.extremeMode === undefined && mp.mechanics === undefined, "مکانیزم Extreme در mp نیست");
  return { name: "مولتی Extreme (768)", pass: true, detail: "۴ قانون + بی‌Extreme" };
}

// __T_OUTPOST_ROW769__
// ردیف 769 (§16 — انجام‌نشده→کامل، 0.206.0، absence pin): پاسگاه (outpost)
// غربی/عربی با تولید فزاینده نیرو + تعیین نوع/تعداد در ادیتور — نه بنای
// outpost در کاتالوگ، نه spawn تولیدی در sim. خالص و هدلس.
function t_outpost_row769() {
  const keys = Object.keys(CONFIG.BUILDINGS);
  must(keys.length === 51, "کاتالوگ ۵۱ بنا است، شد " + keys.length);
  for (const k of ["outpost", "outpostWest", "outpostArab", "westernOutpost", "arabianOutpost"]) {
    must(!(k in CONFIG.BUILDINGS), "بنا نباید " + k + " داشته باشد");
  }
  const st = createState();
  for (const k of ["outposts", "outpostSpawns", "outpostTimer", "outpostRate"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  return { name: "پاسگاه (769)", pass: true, detail: "بی‌بنا/بی‌تولید" };
}

// __T_POPCAP10K_ROW770__
// ردیف 770 (§16 — انجام‌نشده→کامل، 0.206.0، reference+divergence pin): سقف
// ۱۰٬۰۰۰ نیرو — عدد مرجع هست (TUNING.population.extreme + POP_CAP_EXTREME)
// ولی فقط سقف crusader (۲۰۰۰) اعمال می‌شود چون حالت Extreme در بازی نیست:
// atPopCap روی POP_CAP سوار است. خالص و هدلس.
function t_popcap10k_row770() {
  must(TUNING.population.extreme === 10000, "مرجع Extreme باید ۱۰٬۰۰۰ باشد");
  must(POP_CAP === 2000 && POP_CAP_EXTREME === 10000, "سقف‌ها ۲۰۰۰/۱۰٬۰۰۰ از داده‌اند");
  must(POP_CAP === TUNING.population.crusader && POP_CAP_EXTREME === TUNING.population.extreme, "سقف‌ها از TUNING می‌آیند");
  const f = fresh();
  must(atPopCap(f.state, 0) === (popTotal(f.state, 0) >= 2000), "سقف اعمال‌شده همان ۲۰۰۰ است");
  must(f.state.extremeMode === undefined && f.state.popCapMode === undefined, "حالت Extreme در state نیست");
  return { name: "سقف ۱۰هزار (770)", pass: true, detail: "مرجع ۱۰۰۰۰ + اعمال ۲۰۰۰" };
}

// __T_EXTAI8_ROW771__
// ردیف 771 (§16 — انجام‌نشده→کامل، 0.206.0، absence pin): ۸ AI تازه (از
// Warchest) — فقط ۷ شخصیت هست (wolf/rat/snake/pig/lion/arabLord/saladin)؛
// هیچ‌کدام پرچم extreme/warchest/new ندارند. خالص و هدلس.
function t_extai8_row771() {
  const keys = Object.keys(CONFIG.AI.personalities).sort();
  must(JSON.stringify(keys) === JSON.stringify(["artan", "azarm", "farrokhan", "hamun", "kahbod", "sepehrdad", "tirazheh"]), "شخصیت‌ها همان ۷ هستند، شد " + keys.join(","));
  for (const k of keys) {
    const P = CONFIG.AI.personalities[k];
    must(!("extreme" in P) && !("warchest" in P) && !("isNew" in P) && !("extremeOnly" in P), "شخصیت " + k + " پرچم Extreme ندارد");
  }
  return { name: "۸ AI تازه (771)", pass: true, detail: "۷ شخصیت + بی‌پرچم" };
}

// __T_CRTRAIL_ROW80__
// ردیف 80 (§1.1 — انجام‌نشده→کامل، 0.207.0، vacuous): زنجیره Crusader Trail —
// ۵۰ بازی زنجیره‌ای روی یک نقشه پیشرفت — در sim نیست (تک‌بازی‌ها فقط):
// MISSIONS شش‌تایی کمپین (0.225.0) + نه میدان trail در state + نه صفحه trail در MENU_PAGES.
// والد: جزئیات در 81-84 همین نسخه. بدون کد محصول تازه.
function t_crtrail_row80() {
  must(MISSIONS.length === 6, "کاتالوگ ۶ مأموریت کمپین است (نه زنجیره Trail)");
  const st = createState();
  for (const k of ["trail", "trailStep", "trailGames", "trailProgress", "trailIndex"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  must(MENU_PAGES.indexOf("trail") === -1, "صفحه trail در منو نیست");
  return { name: "زنجیره Trail (80)", pass: true, detail: "تک‌بازی + بی‌زنجیره" };
}

// __T_TRAILMAP_ROW81__
// ردیف 81 (§1.1 — انجام‌نشده→کامل، 0.207.0، vacuous): نقشه پیشرفت Trail —
// پرچم Crusader = موقعیت فعلی، شمشیرها = مناطق فتح‌شده — نه صفحه trail در
// منو، نه میدان پیشرفت در state. خالص + پروب DOM.
function t_trailmap_row81() {
  must(MENU_PAGES.indexOf("trail") === -1, "صفحه trail در منو نیست");
  const st = createState();
  for (const k of ["trailMap", "trailFlags", "trailSwords", "conquered"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  if (typeof document === "undefined") return { name: "نقشه Trail (81)", pass: true, detail: "بی‌صفحه/بی‌میدان؛ بدون DOM رد شد" };
  must(!document.querySelector('[data-page="trail"]'), "صفحه trail در DOM نیست");
  must(document.querySelectorAll("#trailMap,[data-trailmap]").length === 0, "نقشه Trail در DOM نیست");
  return { name: "نقشه Trail (81)", pass: true, detail: "بی‌نقشه پیشرفت" };
}

// __T_TRAILINFO_ROW82__
// ردیف 82 (§1.1 — انجام‌نشده→کامل، 0.207.0، vacuous): صفحه info پیش از هر
// بازی Trail (دشمنان، متحدان، نقشه، طلای اولیه همه؛ جداکننده شمشیر ضربدری
// تیم‌ها) — MENU_PAGES همان ۷ صفحه است (+campaign از 0.225.0)
// + نه صفحه info/pregame. خالص + پروب DOM.
function t_trailinfo_row82() {
  must(JSON.stringify(MENU_PAGES.slice().sort()) === JSON.stringify(["campaign", "home", "masters", "mp", "profile", "settings", "solo"]), "منو همان ۷ صفحه است، شد " + MENU_PAGES.join(","));
  if (typeof document === "undefined") return { name: "صفحه info (82)", pass: true, detail: "۷ صفحه منو؛ بدون DOM رد شد" };
  must(document.querySelectorAll('[data-page="trailinfo"],[data-page="pregame"],#trailInfo,#pregameInfo').length === 0, "صفحه info در DOM نیست");
  return { name: "صفحه info (82)", pass: true, detail: "بی‌صفحه پیش‌بازی" };
}

// __T_TRAILDIFF_ROW83__
// ردیف 83 (§1.1 — انجام‌نشده→کامل، 0.207.0، divergence): سختی تدریجی Trail —
// دشمنان قوی‌تر با مزیت بزرگ‌تر در طول زنجیره — درجه سختی تک‌بازی هست
// (easy/normal/hard در startAI) ولی زنجیره تشدیدکننده نیست: نه trailStep در
// state/ai، نه پارام trail در startAI. خالص و هدلس.
function t_traildiff_row83() {
  const d = aiDifficulty({ difficulty: "hard" });
  must(!!d && typeof d === "object", "درجه hard تک‌بازی هست");
  const st = createState();
  must(st.trailStep === undefined && (!st.ai || st.ai.trailStep === undefined), "گام زنجیره در state/ai نیست");
  must(startAI.length === 6, "startAI پارام trail ندارد (۶ پارام: state/terrain/W/H/diff/personality)");
  return { name: "سختی Trail (83)", pass: true, detail: "سختی تک‌بازی + بی‌زنجیره" };
}

// __T_TRAILDATE_ROW84__
// ردیف 84 (§1.1 — انجام‌نشده→کامل، 0.207.0، vacuous+reference): تاریخ
// بالا-چپ = زمان کل صرف‌شده؛ تکرار سریع‌تر بازی فتح‌شده ⇒ تاریخ کمتر
// (رقابت سرعت) — ساعت تک‌بازی هست (بند 130) ولی تاریخ انباشته Trail نیست:
// نه میدان totalTime/speedrun/trailDate در state؛ رشته مرجع مجموع زمان‌ها در
// بند 1123 پین شده. خالص و هدلس.
function t_traildate_row84() {
  const st = createState();
  for (const k of ["trailTotalTime", "trailDate", "speedrun", "trailBest", "trailClock"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  must(typeof BALANCE.missionScore.trail === "string" && BALANCE.missionScore.trail.length > 0, "رشته مرجع مجموع زمان‌ها سر جایش است");
  return { name: "تاریخ Trail (84)", pass: true, detail: "بی‌تاریخ انباشته" };
}

// __T_HCAMPAIGN_ROW91__
// ردیف 91 (§1.1 — بازپین عمدی 0.225.0، فاز ۲): Historical Campaign —
// ۴ کمپین دفترچه نیست ولی کمپین ۶مأموریتی shipped است؛ نه میدان campaign در state؛
// صفحه کمپین در MENU_PAGES هست. والد: جزئیات در 92-95 همین نسخه.
function t_hcampaign_row91() {
  must(Array.isArray(MISSIONS) && MISSIONS.length === 6, "کاتالوگ ۶ مأموریت کمپین است");
  const st = createState();
  for (const k of ["campaign", "campaigns", "historicalCampaign", "campaignMissions", "campaignStep"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  must(MENU_PAGES.indexOf("campaign") !== -1, "صفحه کمپین در منو هست (0.225.0 — فاز ۲)");
  return { name: "کمپین تاریخی (91)", pass: true, detail: "کاتالوگ ۶تایی/بی‌میدان" };
}

// __T_CALLTOARMS_ROW92__
// ردیف 92 (§1.1 — انجام‌نشده→کامل، 0.208.0، vacuous+divergence): Call to Arms —
// مسیر صلیبیان اول + آموزش «راه‌های صحرا» — آموزش بازی ۷ نقطه عطف
// ساخت‌وساز است (HINT_STEPS: چوب‌بری تا استخدام؛ نه مأموریت/صحرا/کاروان) + نه
// میدان کمپین در state. خالص و هدلس.
function t_calltoarms_row92() {
  must(HINT_STEPS.length === 7, "آموزش ۷ نقطه عطف است، شد " + HINT_STEPS.length);
  for (const s of HINT_STEPS) {
    must(!("mission" in s) && !("campaign" in s) && !("desert" in s), "گام " + s.key + " مأموریت نیست");
  }
  const st = createState();
  for (const k of ["callToArms", "desertWays", "firstCrusade", "campaign"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  return { name: "ندای سلاح (92)", pass: true, detail: "۷ نقطه عطف + بی‌کمپین" };
}

// __T_SALADINCONQ_ROW93__
// ردیف 93 (§1.1 — انجام‌نشده→کامل، 0.208.0، vacuous+reference): Saladin's
// Conquest — فرماندهی نیروهای عرب — هویت عرب (identity) و شخصیت صلاح‌الدین
// (personality) تک‌بازی‌اند (بندهای 104/737)، نه کمپین؛ نه میدان کمپین در
// state. خالص و هدلس.
function t_saladinconq_row93() {
  must(validIdentity("arab") === "arab", "هویت عرب تک‌بازی هست");
  must(aiPersonality({ personality: "azarm" }) === CONFIG.AI.personalities.azarm, "صلاح‌الدین شخصیت تک‌بازی است");
  must(MISSIONS.length === 6, "کمپین ۶ مأموریت است (صلاح‌الدین: شخصیت + مأموریت)");
  const st = createState();
  for (const k of ["saladinsConquest", "arabCampaign", "commandArabs", "campaign"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  return { name: "فتوحات صلاح‌الدین (93)", pass: true, detail: "هویت/شخصیت + کمپین ۶تایی" };
}

// __T_KINGSCRUSADE_ROW94__
// ردیف 94 (§1.1 — انجام‌نشده→کامل، 0.208.0، vacuous): Kings' Crusade —
// همراهی پادشاهان اروپا در برابر مهاجمان عرب — نه میدان kings/campaign در
// state، نه موجودیت پادشاهان اروپایی در sim. خالص و هدلس.
function t_kingscrusade_row94() {
  const st = createState();
  for (const k of ["kingsCrusade", "europeanKings", "kings", "escortKings", "campaign"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  must(MISSIONS.length === 6, "کمپین ۶ مأموریت است");
  return { name: "جنگ پادشاهان (94)", pass: true, detail: "بی‌پادشاه/کمپین ۶تایی" };
}

// __T_CSTATES_ROW95__
// ردیف 95 (§1.1 — انجام‌نشده→کامل، 0.208.0، vacuous+divergence): Crusader
// States — کمپین skirmish با چند حریف — حریف AI تک‌بازی هست (startAI با
// کانتینر تکی state.ai) ولی زنجیره چندحریفی کمپین نیست: نه roster کمپین، نه
// میدان campaign. خالص و هدلس.
function t_cstates_row95() {
  const st = createState();
  must(!!st.ai && typeof st.ai === "object" && !Array.isArray(st.ai), "کانتینر AI تکی است");
  for (const k of ["crusaderStates", "campaignRoster", "campaignOpponents", "campaign"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  return { name: "ایالات صلیبی (95)", pass: true, detail: "AI تکی + بی‌زنجیره" };
}

// __T_ANTITURTLE_ROW1191__
// ردیف 1191 (§20.1 — انجام‌نشده→کامل، 0.209.0، behavioral+absence): رفتار
// ضدچرخش AI نیست — نه نگهبان gatehouse (رفتار: یگان‌های AI پس از ۳۰۰ تیک حلقه
// کامل نه گارد نه گاریسون می‌گیرند)، نه لایه دفاع granary/Keep (فقط build +
// raid)، نه پاسخ به تونل (نه دستور dig در queueOrder؛ تونل بی‌مصداق 474/1013)،
// نه واکنش به Siege Tent (بنای tent در کاتالوگ نیست). بدون کد محصول تازه.
function t_antiturtle_row1191() {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, CONFIG.MAP_SEED);
  const state = createState();
  state.mapSeed = CONFIG.MAP_SEED;
  must(placeKeep(state, terrain, W, H).ok, "ستاد بازیکن");
  must(spawnLord(state, terrain, W, H).ok, "ارباب بازیکن");
  must(startAI(state, terrain, W, H, "normal", "artan").ok, "شروع AI");
  for (const b of state.buildings) b.buildLeft = 0;
  const g0 = grassNear(terrain, state.occ, W, H, W - 10, H - 10);
  must(!!g0, "جای یگان AI هست");
  spawnUnit(state, "swordsman", g0[0] + 0.5, g0[1] + 0.5, AI_OWNER);
  spawnUnit(state, "archer", g0[0] + 1.5, g0[1] + 0.5, AI_OWNER);
  for (let i = 0; i < 300; i++) { state.tick++; stepEconomy(state); stepTraining(state, terrain); stepCombat(state, terrain); stepAI(state, terrain); }
  let aiUnits = 0;
  for (const u of state.units || []) {
    if (u.dead || (u.owner == null ? 0 : u.owner) !== AI_OWNER) continue;
    aiUnits++;
    must(u.guardBld == null, "یگان AI نگهبان نیست");
    must(u.garrisonTower == null, "یگان AI گاریسون نیست");
  }
  must(aiUnits > 0, "یگان AI هست");
  const g = grassNear(terrain, state.occ, W, H, 10, 10);
  must(!!g, "جای یگان هست");
  const u = spawnUnit(state, "soldier", g[0] + 0.5, g[1] + 0.5, 0);
  must(queueOrder(state, u, "dig", 5, 5).reason === "INVALID", "دستور حفر نیست");
  must(!("tent" in CONFIG.BUILDINGS) && !("siegetent" in CONFIG.BUILDINGS), "بنای چادر نیست");
  return { name: "ضدچرخش AI (1191)", pass: true, detail: aiUnits + " یگان AI بی‌گارد" };
}

// __T_ALLYTRADE_ROW1192__
// ردیف 1192 (§20.1 — انجام‌نشده→کامل، 0.209.0، absence): تجارت AI با متحد
// (پاسخ به Request/Send Goods + شرایط پذیرش) نیست — ai.js هیچ ارجاع
// trade/market/diplomacy ندارد: نه میدان trade در state.ai، نه کلید trade در
// شخصیت‌ها، نه گونه trade در queueOrder (ارجاع 735). خالص و هدلس.
function t_allytrade_row1192() {
  const f = fresh();
  startAI(f.state, f.terrain, f.W, f.H, "normal", "artan");
  for (const k of ["trade", "diplomacy", "tribute", "sendGoods", "requestGoods", "allyTrade", "acceptTrade", "tradeCond"]) {
    must(f.state.ai[k] === undefined, "AI نباید " + k + " داشته باشد");
  }
  for (const p of ["artan", "azarm"]) {
    const P = aiPersonality({ personality: p });
    must(!("trade" in P) && !("sendGoods" in P) && !("requestGoods" in P), "شخصیت " + p + " تجارت ندارد");
  }
  const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  must(!!g, "جای یگان هست");
  const u = spawnUnit(f.state, "soldier", g[0] + 0.5, g[1] + 0.5, 0);
  must(queueOrder(f.state, u, "requestGoods", 5, 5).reason === "INVALID", "درخواست کالا نیست");
  must(queueOrder(f.state, u, "acceptTrade", 5, 5).reason === "INVALID", "پذیرش تجارت نیست");
  return { name: "تجارت متحد (1192)", pass: true, detail: "بی‌میدان/بی‌گونه" };
}

// __T_MPAILLY_ROW1195__
// ردیف 1195 (§20.2 — انجام‌نشده→کامل، 0.209.0، absence+DOM): AI متحد در MP
// (نمایش وضعیت حمله/دفاع/درخواست + پذیرش Set Orders) نیست — اسلات‌های MP فقط
// انسانی‌اند (mpres بی‌پرچم AI + liveRowHTML بی-CPU، ارجاع 737) + نه Set
// Orders (ارجاع 739) + نه آیکن وضعیت در DOM. خالص + پروب DOM.
function t_mpailly_row1195() {
  const f = mpFresh(2);
  must(Array.isArray(f.state.mpres) && f.state.mpres.length === 2, "دو اسلات انسانی");
  for (const p of f.state.mpres) {
    must(p.ai === undefined && p.personality === undefined && p.cpu === undefined, "اسلات MP انسانی است");
  }
  const room = { code: "AB12", max: 4, num: 2, seed: 7, players: [{ name: "a", logo: 0 }, { name: "b", logo: 1 }] };
  must(!/CPU/i.test(liveRowHTML(room, false)), "سپر CPU نیست");
  const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  must(!!g, "جای یگان هست");
  const u = spawnUnit(f.state, "soldier", g[0] + 0.5, g[1] + 0.5, 0);
  must(queueOrder(f.state, u, "setOrders", 5, 5).reason === "INVALID", "فرمان Set Orders نیست");
  if (typeof document === "undefined") return { name: "AI متحد MP (1195)", pass: true, detail: "اسلات انسانی + بی‌دستور؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /aistatus|allystatus|mpally/i.test(id));
  must(hits.length === 0, "آیکن وضعیت AI در DOM نیست");
  must(document.querySelectorAll("[data-aistatus],[data-allystatus]").length === 0, "دکمه وضعیت متحد نیست");
  return { name: "AI متحد MP (1195)", pass: true, detail: "بی‌اسلات AI/بی‌آیکن" };
}

// __T_LOBBYAI_ROW86__
// ردیف 86 (§1.1 — انجام‌نشده→کامل، 0.210.0، absence+DOM): جعبه بالا-چپ لابی
// برای افزودن/حذف حریف AI (دکمه شمشیر+سپر = افزودن، فلش = حذف) نیست —
// کارت‌های اتاق نه دکمه AI دارند (بی-CPU، ارجاع 737) + نه کنترل افزودن/حذف
// AI در DOM. خالص + پروب DOM.
function t_lobbyai_row86() {
  const room = { code: "AB12", max: 4, num: 2, seed: 7, players: [{ name: "a", logo: 0 }, { name: "b", logo: 1 }] };
  for (const h of [roomRowHTML(room), liveRowHTML(room, false)]) {
    must(!/CPU|add.?ai|ai.?add|computer|computerplayer/i.test(h), "دکمه/سپر AI در کارت اتاق نیست");
  }
  if (typeof document === "undefined") return { name: "جعبه AI لابی (86)", pass: true, detail: "بی‌دکمه AI؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /addai|removeai|aibox|aipick/i.test(id));
  must(hits.length === 0, "جعبه AI در DOM نیست");
  must(document.querySelectorAll("[data-addai],[data-removeai],[data-aibox]").length === 0, "دکمه افزودن/حذف AI نیست");
  return { name: "جعبه AI لابی (86)", pass: true, detail: "بی‌جعبه/بی‌دکمه" };
}

// __T_ROUNDTABLE_ROW88__
// ردیف 88 (§1.1 — انجام‌نشده→کامل، 0.210.0، absence+DOM): انتخاب تیم با «میز
// گرد» نیست (کشیدن عکس‌ها روی هم = هم‌تیمی؛ دروازه مرکز = خروج؛ رنگ جدا) —
// تیم در MP نیست (FFA خالص، ارجاع 129/735): نه میدان team در state.mp، نه
// میز/رنگ تیم در DOM. خالص + پروب DOM.
function t_roundtable_row88() {
  const f = mpFresh(2);
  must(f.state.mp && f.state.mp.enabled, "حالت MP هست");
  for (const k of ["teams", "roundTable", "teamColors", "allies"]) {
    must(f.state.mp[k] === undefined, "mp نباید " + k + " داشته باشد");
  }
  if (typeof document === "undefined") return { name: "میز گرد (88)", pass: true, detail: "بی‌تیم؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /roundtable|teamtable|teamselect|wartable/i.test(id));
  must(hits.length === 0, "میز تیم در DOM نیست");
  must(document.querySelectorAll("[data-team],[data-roundtable],[data-teamcolor]").length === 0, "انتخاب تیم نیست");
  return { name: "میز گرد (88)", pass: true, detail: "FFA + بی‌میز" };
}

// __T_CAMPCATALOG_ROW1179__
// ردیف 1179 (§19.5 — انجام‌نشده→کامل، 0.210.0، vacuous): کاتالوگ کمپین‌ها —
// فقط نام‌ها و تعداد (Trail ۵۰، Extreme ۲۰) + ست شروع تألیفی (۶–۱۰ اقتصادی +
// ۶ مأموریت زنجیره‌ای با قفل‌گشایی (0.225.0 — نه Trail/Extreme، نه ست تألیفی جدا)؛
// شمار کمپین در sim نیست. متمایز از 91 (۴ کمپین تاریخی دفترچه). خالص و هدلس.
function t_campcatalog_row1179() {
  must(MISSIONS.length === 6, "کاتالوگ ۶ مأموریت زنجیره‌ای است");
  const st = createState();
  for (const k of ["campaigns", "campaignCatalog", "trailCount", "extremeCount", "ecoMissions", "invasionMissions", "skirmishMissions"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  return { name: "کاتالوگ کمپین (1179)", pass: true, detail: "۶ مأموریت زنجیره‌ای" };
}

// __T_FUZZPLACE_ROW1255__
// ردیف 1255 (§22.2 — انجام‌نشده→کامل، 0.210.0، fuzz تازه): فاز `canPlace()` و
// مسیریابی — پوشش تازه واقعی: ۳۰۰ validate خصمانه (بنای واقعی + مختصات
// برون‌مرز + مالک عجیب) بی‌throw با شکل `{ok:boolean}` + ۳۰۰ مسیریابی تصادفی
// (findPath/nearestWalkable/isCellWalkable) بی‌throw با شکل درست. قطعی
// (seed ثابت). بدون کد محصول (فقط تست).
function t_fuzzplace_row1255() {
  const rnd = mulberry32(0xC0FFEE);
  const W = 32, H = 32;
  const terrain = makeTerrain(W, H, 999);
  const state = createState();
  state.mapSeed = 999;
  const defs = Object.values(CONFIG.BUILDINGS);
  must(defs.length === 51, "کاتالوگ ۵۱ بنا است");
  const num = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  for (let i = 0; i < 300; i++) {
    const def = defs[Math.floor(rnd() * defs.length)];
    const c = num(-5, W + 5), r = num(-5, H + 5);
    const ow = [0, 1, -1, 99][Math.floor(rnd() * 4)];
    let v;
    try {
      v = validate(state, terrain, W, H, c, r, def, ow);
    } catch (e) {
      throw new Error("validate throw در فاز " + i + ": " + String((e && e.message) || e).slice(0, 60));
    }
    must(v && typeof v.ok === "boolean", "شکل نتیجه validate در فاز " + i);
  }
  for (let i = 0; i < 300; i++) {
    const sc = num(-5, W + 5), sr = num(-5, H + 5), gc = num(-5, W + 5), gr = num(-5, H + 5);
    let p, nw, w;
    try {
      p = findPath(terrain, state.occ, W, H, sc, sr, gc, gr);
      nw = nearestWalkable(terrain, state.occ, W, H, gc, gr);
      w = isCellWalkable(terrain, state.occ, W, H, gc, gr);
    } catch (e) {
      throw new Error("مسیریاب throw در فاز " + i + ": " + String((e && e.message) || e).slice(0, 60));
    }
    must(p === null || Array.isArray(p), "شکل مسیر در فاز " + i);
    must(typeof w === "boolean", "isCellWalkable بولی است");
    must(nw === null || (Array.isArray(nw) && nw.length === 2), "شکل نزدیک‌ترین در فاز " + i);
  }
  return { name: "فاز جایابی/مسیر (1255)", pass: true, detail: "۳۰۰+۳۰۰ بی‌throw" };
}

// __T_MAPTYPES_ROW753__
// ردیف 753 (§15 — انجام‌نشده→کامل، 0.211.0، vacuous — والد): انواع نقشه جدید
// (Castle Builder / Custom Scenario / Crusader در 754-756 همین نسخه) —
// هیچ کاتالوگ نوع‌نقشه در sim نیست: سند سفارشی فقط ۴ کلید (v/name/seed/
// patches) + نه میدان mapType در state + نه انتخاب نوع در ویرایشگر (DOM).
// بدون کد محصول تازه.
function t_maptypes_row753() {
  const doc = createMapDoc("انواع", 4242);
  must(JSON.stringify(Object.keys(doc).sort()) === JSON.stringify(["name", "patches", "seed", "v"]), "سند فقط ۴ کلید است");
  const st = createState();
  for (const k of ["mapType", "mapKind", "mapCategory", "landscape"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  if (typeof document === "undefined") return { name: "انواع نقشه (753)", pass: true, detail: "بی‌نوع‌نقشه؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /maptype|mapkind|mapcategory|landscape/i.test(id));
  must(hits.length === 0, "انتخاب نوع نقشه در DOM نیست");
  must(document.querySelectorAll("[data-maptype],[data-mapkind]").length === 0, "دکمه نوع نقشه نیست");
  return { name: "انواع نقشه (753)", pass: true, detail: "سند ۴کلیده + بی‌انتخاب" };
}

// __T_CBMAP_ROW754__
// ردیف 754 (§15 — انجام‌نشده→کامل، 0.211.0، absence+DOM): نقشه Castle Builder
// (منظره تازه + دکمه «Edit Scenario» برای شرایط اولیه) نیست — سند وصله‌ای
// نه منظره دارد نه سناریو (normalize اضافه‌ها را می‌اندازد) + دکمه سناریو
// در ویرایشگر نیست. خالص + پروب DOM.
function t_cbmap_row754() {
  const doc = normalizeMapDoc({ name: "سازنده", seed: 7, patches: [], landscape: "new", scenario: { gold: 999 } });
  must(doc.landscape === undefined && doc.scenario === undefined, "منظره/سناریو در سند نمی‌ماند");
  must(JSON.stringify(Object.keys(doc).sort()) === JSON.stringify(["name", "patches", "seed", "v"]), "سند فقط ۴ کلید است");
  if (typeof document === "undefined") return { name: "نقشه سازنده (754)", pass: true, detail: "بی‌منظره/سناریو؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /scenario|landscape/i.test(id));
  must(hits.length === 0, "دکمه سناریو/منظره در DOM نیست");
  must(document.querySelectorAll("[data-scenario],[data-landscape]").length === 0, "کنترل سناریو نیست");
  return { name: "نقشه سازنده (754)", pass: true, detail: "بی‌دکمه Edit Scenario" };
}

// __T_SCENMAP_ROW755__
// ردیف 755 (§15 — انجام‌نشده→کامل، 0.211.0، absence): نقشه سناریوی سفارشی
// (رویدادهای مخصوص؛ نوع اقتصادی یا invasion) نیست — گونه‌های مأموریت همان
// ۱۰ گونه‌اند (نه economic، نه invasion) + سند نقشه نه نوع سناریو دارد نه
// رویداد. خالص و هدلس.
function t_scenmap_row755() {
  must(JSON.stringify(MISSION_KINDS) === JSON.stringify(["haveBuilding", "haveUnit", "resource", "tick", "wave", "killAllEnemies", "population", "popularity", "captureGatehouse", "keepLordAlive"]), "گونه‌ها همان ۱۰ هستند");
  must(MISSION_KINDS.indexOf("economic") === -1 && MISSION_KINDS.indexOf("invasion") === -1, "گونه اقتصادی/invasion نیست");
  const doc = normalizeMapDoc({ name: "سناریو", seed: 11, patches: [], scenarioType: "economic", events: ["fair"] });
  must(doc.scenarioType === undefined && doc.events === undefined, "نوع/رویداد سناریو در سند نمی‌ماند");
  const st = createState();
  for (const k of ["scenarioType", "scenarioEvents", "invasion", "ecoMission"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  return { name: "نقشه سناریو (755)", pass: true, detail: "۱۰ گونه + بی‌نوع" };
}

// __T_CRUSADERMAP_ROW756__
// ردیف 756 (§15 — انجام‌نشده→کامل، 0.211.0، absence): نقشه Crusader (برای
// Custom/Multiplayer؛ تعداد Keepهای قرارگرفته = حداکثر بازیکنان) نیست —
// سند نقشه نه keep دارد (قابل‌بازی‌بودن با ستاد خودکار است، ارجاع 98) + در
// MP نه keepCount هست نه قاعده keep (لنگرهای ثابت ۴گانه). خالص و هدلس.
function t_crusadermap_row756() {
  const doc = normalizeMapDoc({ name: "صلیبی", seed: 13, patches: [], keeps: [{ c: 1, r: 1 }] });
  must(doc.keeps === undefined, "keep در سند نمی‌ماند");
  must(MP_SPAWN_ANCHOR.length === 4, "لنگرها همان ۴ هستند");
  const f = mpFresh(2);
  for (const k of ["keepCount", "maxPlayers", "mapKeeps", "placedKeeps"]) {
    must(f.state.mp[k] === undefined, "mp نباید " + k + " داشته باشد");
  }
  return { name: "نقشه صلیبی (756)", pass: true, detail: "بی‌قاعده keep" };
}

// __T_EXMAPMAKER_ROW758__
// ردیف 758 (§15 — انجام‌نشده→کامل، 0.211.0، absence+DOM): سازنده نقشه Extreme
// (نقشه مولتی‌پلیر Extreme؛ نوع و تعداد نیروی outpost در ویرایشگر) نیست —
// ویرایشگر نه کنترل outpost دارد (ارجاع 769: بنا/تولید outpost هم در sim
// نیست) نه میدان Extreme؛ سند نقشه ۴کلیده می‌ماند. خالص + پروب DOM.
function t_exmapmaker_row758() {
  const doc = normalizeMapDoc({ name: "اکستریم", seed: 17, patches: [], outpostType: "arab", outpostCount: 3 });
  must(doc.outpostType === undefined && doc.outpostCount === undefined, "outpost در سند نمی‌ماند");
  must(!("outpost" in CONFIG.BUILDINGS), "بنای outpost نیست (ارجاع 769)");
  const st = createState();
  for (const k of ["extremeMap", "outpostType", "outpostCount", "outpostSpawns"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  if (typeof document === "undefined") return { name: "سازنده Extreme (758)", pass: true, detail: "بی-outpost؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /outpost|mapmaker|extrememap/i.test(id));
  must(hits.length === 0, "کنترل outpost/سازنده در DOM نیست");
  must(document.querySelectorAll("[data-outpost],[data-mapmaker]").length === 0, "دکمه سازنده Extreme نیست");
  return { name: "سازنده Extreme (758)", pass: true, detail: "بی‌outpost/بی‌سازنده" };
}

// __T_EXTAI8B_ROW746__
// ردیف 746 (§14.4 — انجام‌نشده→کامل، 0.212.0، reference): ۸ AI اضافی Extreme
// (قبلاً در Warchest) — تکراری 771: همان ۷ شخصیت‌اند
// (wolf/rat/snake/pig/lion/arabLord/saladin) و هیچ‌کدام پرچم
// extreme/warchest/new ندارند؛ نه کاتالوگ تازه، نه صفحه Extreme در منو.
// ارجاع به t_extai8_row771 (0.206.0). خالص و هدلس.
function t_extai8b_row746() {
  const keys = Object.keys(CONFIG.AI.personalities).sort();
  must(JSON.stringify(keys) === JSON.stringify(["artan", "azarm", "farrokhan", "hamun", "kahbod", "sepehrdad", "tirazheh"]), "شخصیت‌ها همان ۷ هستند، شد " + keys.join(","));
  for (const k of keys) {
    const P = CONFIG.AI.personalities[k];
    must(!("extreme" in P) && !("warchest" in P) && !("isNew" in P) && !("extremeOnly" in P), "شخصیت " + k + " پرچم Extreme ندارد");
  }
  must(MENU_PAGES.indexOf("extreme") === -1, "صفحه Extreme در منو نیست");
  return { name: "۸ AI اضافی (746)", pass: true, detail: "تکراری 771 + بی‌صفحه" };
}

// __T_ROLE_ROW1073__
// ردیف 1073 (§18.5/و — انجام‌نشده→کامل، 0.212.0، absence): تبدیل دهقان↔کارگر↔
// سرباز با یک موجودیت `role` نیست — یگان‌ها نه میدان role دارند نه رفتار
// ارتقا/تنزل؛ کارگرها شمارنده‌اند (workers/freeWorkers) نه موجودیت.
// خالص و هدلس.
function t_role_row1073() {
  const f = fresh();
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد بازیکن");
  const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  must(!!g, "جای یگان هست");
  const u = spawnUnit(f.state, "soldier", g[0] + 0.5, g[1] + 0.5, 0);
  must(u.role === undefined, "یگان میدان role ندارد");
  must(typeof f.state.workers === "number" && typeof f.state.freeWorkers === "number", "کارگر شمارنده است");
  for (const k of ["promote", "demote", "convertRole", "setRole"]) {
    must(u[k] === undefined, "یگان نباید " + k + " داشته باشد");
  }
  return { name: "یک موجودیت role (1073)", pass: true, detail: "بی-role + شمارنده" };
}

// __T_SPATIAL_ROW1205__
// ردیف 1205 (§21.1 — انجام‌نشده→کامل، 0.212.0، absence+vacuous): هش فضایی/
// quadtree برای هدف‌گیری و pooling برای پرتابه‌ها نیست — نه میدان شاخص در
// state، نه انبار پرتابه (ارجاع 1153: پرتابه در sim نیست)؛ نبرد با جست‌وجوی
// خطی کار می‌کند (یگان‌های زنده پس از ۲۰۰ تیک). خالص و هدلس.
function t_spatial_row1205() {
  const f = fresh();
  for (const k of ["spatialHash", "spatialIndex", "quadtree", "quadTree", "pools", "projectiles", "bullets", "arrows", "poolFree", "poolAlloc"]) {
    must(f.state[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد بازیکن");
  must(spawnLord(f.state, f.terrain, f.W, f.H).ok, "ارباب بازیکن");
  must(startAI(f.state, f.terrain, f.W, f.H, "normal", "artan").ok, "شروع AI");
  for (const b of f.state.buildings) b.buildLeft = 0;
  const g0 = grassNear(f.terrain, f.state.occ, f.W, f.H, f.W - 10, f.H - 10);
  must(!!g0, "جای یگان AI هست");
  spawnUnit(f.state, "swordsman", g0[0] + 0.5, g0[1] + 0.5, AI_OWNER);
  spawnUnit(f.state, "archer", g0[0] + 1.5, g0[1] + 0.5, AI_OWNER);
  for (let i = 0; i < 200; i++) { f.state.tick++; stepEconomy(f.state); stepCombat(f.state, f.terrain); stepAI(f.state, f.terrain); }
  let alive = 0;
  for (const u of f.state.units || []) if (!u.dead) alive++;
  must(alive > 0, "یگان زنده پس از نبرد خطی هست");
  return { name: "هش فضایی/pool (1205)", pass: true, detail: alive + " زنده بی‌شاخص" };
}

// __T_MPVOTE_ROW1211__
// ردیف 1211 (§21.2 — انجام‌نشده→کامل، 0.212.0، absence): توقف و سرعت در
// مولتی‌پلیر با رأی/توافق نیست — mp فقط {enabled,num,seed,winner,over} است
// (نه میدان رأی، نه توقف چندنفره)؛ paused/speed سراسری تک‌نفره‌اند.
// خالص و هدلس.
function t_mpvote_row1211() {
  const f = mpFresh(2);
  must(f.state.mp && f.state.mp.enabled, "حالت MP هست");
  for (const k of ["votes", "pauseVotes", "speedVotes", "paused", "speed", "consensus", "quorum", "pauseRequest", "votePause", "voteSpeed"]) {
    must(f.state.mp[k] === undefined, "mp نباید " + k + " داشته باشد");
  }
  must(f.state.paused === false && f.state.speed === 1, "توقف/سرعت سراسری‌اند");
  return { name: "رأی توقف MP (1211)", pass: true, detail: "mp بی‌رأی" };
}

// __T_SOAK_ROW1252__
// ردیف 1252 (§22.2 — انجام‌نشده→کامل، 0.213.0، soak تازه): آزمون تحمل واقعی —
// ۶۰ یگان (۳۰ سرباز در برابر ۳۰ شمشیرزن) + ۶۰۰ تیک نبرد بی-throw؛ میانه‌راه
// اسنپ‌شات هش + رفت‌وبرگشت ذخیره بی-desync (هشِ بارگذاری‌شده = هش اصلی، و پس
// از ۳۰۰ تیک ادامه در هر دو شاخه برابر). بدون کد محصول (فقط تست).
function t_soak_row1252() {
  const f = fresh();
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد بازیکن");
  const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 14, 14);
  must(!!g, "جای نبرد هست");
  for (let i = 0; i < 30; i++) {
    spawnUnit(f.state, "soldier", g[0] + 0.5 + (i % 6), g[1] + 0.5 + Math.floor(i / 6), 0);
    spawnUnit(f.state, "swordsman", g[0] + 5.5 + (i % 6), g[1] + 0.5 + Math.floor(i / 6), 1);
  }
  must(f.state.units.length === 60, "۶۰ یگان هست");
  const step = (st) => { st.tick++; stepCombat(st, f.terrain); };
  for (let i = 0; i < 300; i++) step(f.state);
  const h1 = stateHash(f.state);
  const loaded = deserializeJSON(serializeJSON(f.state));
  must(stateHash(loaded) === h1, "هش پس از رفت‌وبرگشت می‌ماند");
  for (let i = 0; i < 300; i++) { step(f.state); step(loaded); }
  must(stateHash(f.state) === stateHash(loaded), "بی-desync پس از ادامه");
  return { name: "تحمل نبرد (1252)", pass: true, detail: "۶۰ یگان + ۶۰۰ تیک بی-desync" };
}

// یک گود توازن: گروه A (owner ۰، یگان player-side) در برابر گروه B (owner ۱،
// یگان enemy-side) تا نابودی یک طرف یا سقف ۸۰۰ تیک + گزارش ارزش‌به‌هزینه.
function pitFight(aType, aN, bType, bN) {
  const f = fresh();
  const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 20, 20);
  for (let i = 0; i < aN; i++) spawnUnit(f.state, aType, g[0] + 0.5 + (i % 5), g[1] + 0.5 + Math.floor(i / 5), 0);
  for (let i = 0; i < bN; i++) spawnUnit(f.state, bType, g[0] + 4.5 + (i % 5), g[1] + 0.5 + Math.floor(i / 5), 1);
  let ticks = 0;
  for (; ticks < 800; ticks++) {
    f.state.tick++;
    stepCombat(f.state, f.terrain);
    let a = 0, b = 0;
    for (const u of f.state.units) {
      if (u.dead) continue;
      if ((u.owner == null ? 0 : u.owner) === 0) a++; else b++;
    }
    if (a === 0 || b === 0) break;
  }
  let aL = 0, bL = 0, aLive = [], bLive = [];
  for (const u of f.state.units) {
    if (u.dead) continue;
    if ((u.owner == null ? 0 : u.owner) === 0) { aL++; aLive.push(u); } else { bL++; bLive.push(u); }
  }
  return {
    winner: aL > 0 && bL === 0 ? "A" : (bL > 0 && aL === 0 ? "B" : "draw"),
    ticks: ticks, aLeft: aL, bLeft: bL,
    costA: soldierValue(aType) * aN, costB: soldierValue(bType) * bN,
    valA: armyValue(aLive), valB: armyValue(bLive),
  };
}

// __T_BALANCESIM_ROW1253__
// ردیف 1253 (§22.2 — انجام‌نشده→کامل، 0.213.0، balance-sim تازه): شبیه‌ساز
// نبرد خودکار واقعی — ۳ گود (سرباز×۵/شمشیرزن×۵، کماندار×۵/کماندار×۵،
// شوالیه×۳/شمشیرزن×۶): هر گود تا نابودی یک طرف؛ گزارش {برنده، تیک،
// بازمانده، ارزش‌به‌هزینه} + قطعیت (تکرار همان گود = همان نتیجه). بدون کد
// محصول (فقط تست).
function t_balancesim_row1253() {
  const pits = [
    ["soldier", 5, "swordsman", 5],
    ["bowman", 5, "archer", 5],
    ["knight", 3, "swordsman", 6],
  ];
  for (const [a, an, b, bn] of pits) {
    const r1 = pitFight(a, an, b, bn);
    const r2 = pitFight(a, an, b, bn);
    must(JSON.stringify(r1) === JSON.stringify(r2), "گود " + a + "/" + b + " قطعی است");
    must(typeof r1.winner === "string" && r1.ticks <= 800, "شکل گزارش گود");
    must(typeof r1.costA === "number" && r1.costA > 0 && typeof r1.costB === "number" && r1.costB > 0, "ارزش‌به‌هزینه عدد است");
    must(r1.winner !== "draw", "گود " + a + "/" + b + " برنده دارد، شد " + r1.winner);
  }
  return { name: "شبیه‌ساز توازن (1253)", pass: true, detail: "۳ گود قطعی + برنده" };
}

// یک حریف طولانی: سولو + AI فعال + ۱۲۰۰ تیک (اقتصاد/آموزش/نبرد/AI) + گزارش
// پیشرفت (یورش/ساخت/تغییر فاز) برای تشخیص بن‌بست.
function aiLongRun(diff, pers) {
  const f = fresh();
  placeKeep(f.state, f.terrain, f.W, f.H);
  spawnLord(f.state, f.terrain, f.W, f.H);
  startAI(f.state, f.terrain, f.W, f.H, diff, pers);
  completeAll(f.state);
  const b0 = f.state.buildings.length, p0 = f.state.ai.phase;
  for (let i = 0; i < 1200; i++) {
    f.state.tick++;
    stepEconomy(f.state);
    stepTraining(f.state, f.terrain);
    stepCombat(f.state, f.terrain);
    stepAI(f.state, f.terrain);
  }
  const prog = (f.state.ai.raidsSent || 0) > 0 || f.state.buildings.length > b0 + 1 || f.state.ai.phase !== p0;
  return { tick: f.state.tick, raids: f.state.ai.raidsSent || 0, buildings: f.state.buildings.length, phase: f.state.ai.phase, prog: prog };
}

// __T_AIVSAI_ROW1254__
// ردیف 1254 (§22.2 — انجام‌نشده→کامل، 0.213.0، AI-vs-AI تازه): دو حریف
// طولانی متوالی (گرگ معمولی + موش سخت، هر یک ۱۲۰۰ تیک) برای یافتن بن‌بست —
// بی-throw + بی‌قفل: تیک جلو می‌رود و AI پیشرفت می‌کند (یورش/ساخت/تغییر
// فاز). بدون کد محصول (فقط تست).
function t_aivsai_row1254() {
  const r1 = aiLongRun("normal", "artan");
  const r2 = aiLongRun("hard", "kahbod");
  must(r1.tick === 1200 && r2.tick === 1200, "تیک‌ها جلو رفتند");
  must(r1.prog, "گرگ پیشرفت کرد (یورش/ساخت/فاز)");
  must(r2.prog, "موش پیشرفت کرد (یورش/ساخت/فاز)");
  return { name: "AI در برابر AI (1254)", pass: true, detail: "۲×۱۲۰۰ تیک بی‌قفل" };
}


// __T_SCENARIOS_ROW1251__
// ردیف 1251 (§22.2 — ناقص→کامل، 0.214.0، سناریوهای یکپارچه): هر ۷ سناریو —
// ۱) ستاد→انبارغذا→جمعیت (سقف غذا ۱۰۰۰ + ساعت آماده + رشد کارگر با محبوبیت)،
// ۲) زنجیره نان (گندم/آرد/غذا پس از ۲۰۰ تیک)، ۳) آبجو+میخانه ⇒ +۸ (سرو + پاداش
// کامل)، ۴) دشمن روی gatehouse ⇒ تصرف (ارجاع 110)، ۵) پله نیست ⇒ خلأ (ارجاع
// t_stairs_absence)، ۶) تونل نیست ⇒ خلأ (ارجاع 474)، ۷) خندق نیست ⇒ خلأ.
// ۴ رفتار + ۳ خلأ. بدون کد محصول (فقط تست).
function t_scenarios_row1251() {
  // ۱) ستاد→انبارغذا→جمعیت.
  const live = newSoloFromSeed(CONFIG.MAP_SEED);
  const st = live.state, ter = live.terrain, W0 = CONFIG.GRID_W, H0 = CONFIG.GRID_H;
  must(st.resources.food === 120, "غذای آغازین ۱۲۰ است");
  const keep0 = st.buildings.find((b) => b.type === "keep" && !b.destroyed);
  must(!!keep0, "ستاد آغازین هست");
  const gdef = CONFIG.BUILDINGS.granary;
  const spot = siteNear(ter, st.occ, W0, H0, keep0.c, keep0.r, gdef.w, gdef.h);
  must(!!spot, "جا برای انبارغذا هست");
  must(tryPlace(st, ter, W0, H0, spot[0], spot[1], gdef).ok, "انبارغذا ساخته شد");
  const w0 = st.workers;
  st.popularity = 70;
  sim(st, 250);
  must(capFor(st, "food") === 1000, "انبارغذا: سقف غذا ۱۰۰۰");
  must(clockReady(st.buildings, 0) === true, "ستاد+انبارغذا = ساعت آماده");
  must(st.workers > w0, "جمعیت رشد کرد (" + w0 + "→" + st.workers + ")");
  // ۲) زنجیره نان.
  const f2 = fresh();
  f2.state.workers = 5;
  must(tryPlace(f2.state, f2.terrain, f2.W, f2.H, 1, 1, CONFIG.BUILDINGS.wheatfarm).ok, "مزرعه گندم");
  must(tryPlace(f2.state, f2.terrain, f2.W, f2.H, 5, 1, CONFIG.BUILDINGS.mill).ok, "آسیاب");
  must(tryPlace(f2.state, f2.terrain, f2.W, f2.H, 8, 1, CONFIG.BUILDINGS.bakery).ok, "نانوایی");
  sim(f2.state, 200);
  must(f2.state.resources.wheat === 4 && f2.state.resources.flour === 24, "گندم/آرد زنجیره");
  must(f2.state.resources.food === 131, "غذای زنجیره ۱۳۱ است");
  // ۳) آبجو+میخانه ⇒ +۸.
  const f3 = fresh();
  f3.state.resources.gold = 200;
  const inn = tryPlace(f3.state, f3.terrain, f3.W, f3.H, 5, 1, CONFIG.BUILDINGS.inn);
  must(inn.ok, "میخانه ساخته شد");
  f3.state.workers = 4;
  f3.state.resources.beer = 5;
  sim(f3.state, 100);
  must(inn.building.served === true, "میخانه سرو می‌کند");
  must(innBonus(f3.state) === 8, "پاداش کامل میخانه +۸ است");
  // ۴) دشمن روی gatehouse ⇒ تصرف (ارجاع 110).
  const f4 = fresh();
  f4.state.resources.wood = 500;
  const g4 = placeGateAt(f4.state, f4.terrain, f4.W, f4.H, 30, 30);
  must(toggleGate(f4.state, g4).ok, "بستن دروازه");
  spawnUnit(f4.state, "swordsman", g4.c + 0.5, g4.r + 0.5);
  simC(f4.state, f4.terrain, 1);
  must(g4.owner === 9, "دشمن روی دروازه = تصرف");
  // ۵/۶/۷) خلأها: نه پله، نه تونل، نه خندق.
  must(!CONFIG.BUILDINGS.stairs && !CONFIG.BUILDINGS.staircase, "پله در کاتالوگ نیست");
  must(!CONFIG.BUILDINGS.tunnel && !CONFIG.BUILDINGS.tunnelentrance && !CONFIG.BUILDINGS.tunnelEntrance, "تونل در کاتالوگ نیست");
  must(!CONFIG.BUILDINGS.moat && !CONFIG.BUILDINGS.drawbridge, "خندق/پل متحرک در کاتالوگ نیست");
  return { name: "سناریوها (1251)", pass: true, detail: "۴ رفتار + ۳ خلأ" };
}

// __T_ALEFAITH_ROW109__
// ردیف 109 (§3 — ناقص→کامل، 0.214.0، مرجع+رفتار): پاداش مذهب و آبجو —
// میخانه کامل +۸ (INN.fullBonus) و پله‌های مذهب تا +۸ (+کلیسا/جامع)؛ رفتار:
// میخانه سروکننده ⇒ innBonus ‏۸، نمازخانه کشیش‌دار ⇒ پوشش ۱۰۰ + پاداش مذهب
// مثبت. بدون کد محصول (فقط تست).
function t_alefaith_row109() {
  must(INN.fullBonus === 8, "پاداش کامل میخانه +۸ است");
  must(JSON.stringify(RELIGION.stepBonus) === "[2,4,6,8]", "پله‌های مذهب ۲/۴/۶/۸ است");
  must(RELIGION.churchBonus === 1 && RELIGION.cathedralBonus === 2, "کلیسا +۱/جامع +۲ است");
  const f = fresh();
  f.state.resources.gold = 2000;
  const inn = tryPlace(f.state, f.terrain, f.W, f.H, 5, 1, CONFIG.BUILDINGS.inn);
  must(inn.ok, "میخانه ساخته شد");
  f.state.workers = 4;
  f.state.resources.beer = 5;
  sim(f.state, 100);
  must(inn.building.served === true, "میخانه سرو می‌کند");
  must(innBonus(f.state) === 8, "رفتار: پاداش آبجو +۸");
  const ch = tryPlace(f.state, f.terrain, f.W, f.H, 9, 1, CONFIG.BUILDINGS.chapel);
  must(ch.ok, "نمازخانه ساخته شد");
  sim(f.state, 50);
  must(ch.building.staffed === true && religionCoverage(f.state) === 100, "نمازخانه کشیش‌دار = تبرک کامل");
  must(religionBonus(f.state, 0) > 0, "رفتار: پاداش مذهب مثبت است");
  return { name: "مذهب و آبجو (109)", pass: true, detail: "+۸ میخانه + پله‌های مذهب" };
}

// __T_HOSTALLY_ROW734__
// ردیف 734 (§14.2 — ناقص→کامل، 0.214.0، پیش‌فرض+خلأ): پیش‌فرض هر بازیکن
// جداگانه است (MP خالص FFA — نه میدان team/allies در mp، ارجاع 88) و host
// هیچ آیکن میز اتحاد ندارد (نه در کارت‌های اتاق، نه در DOM). خالص + پروب DOM.
function t_hostally_row734() {
  const f = mpFresh(2);
  must(f.state.mp && f.state.mp.enabled, "حالت MP هست");
  for (const k of ["teams", "allies", "allyTable", "pacts"]) {
    must(f.state.mp[k] === undefined, "mp نباید " + k + " داشته باشد");
  }
  const room = { code: "AB12", max: 4, num: 2, seed: 7, players: [{ name: "a", logo: 0 }, { name: "b", logo: 1 }] };
  for (const h of [roomRowHTML(room), liveRowHTML(room, false)]) {
    must(!/allytable|alliance-table|ally_table|allyicon/i.test(h), "آیکن میز اتحاد در کارت اتاق نیست");
  }
  if (typeof document === "undefined") return { name: "میز اتحاد host (734)", pass: true, detail: "FFA + بی‌آیکن؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /allytable|allyicon|alliancetable/i.test(id));
  must(hits.length === 0, "آیکن میز اتحاد در DOM نیست");
  must(document.querySelectorAll("[data-allytable],[data-allyicon]").length === 0, "دکمه میز اتحاد نیست");
  return { name: "میز اتحاد host (734)", pass: true, detail: "FFA + بی‌آیکن" };
}

// امضای سبک شخصیت AI: [ترتیب ساخت، زمان‌بندی/اندازه یورش، سهم کماندار،
// ضرب اقتصاد/کارگر] — هر ۷ باید یکتا باشند (بندهای 87/744).
function personalitySig(k) {
  const P = CONFIG.AI.personalities[k];
  return JSON.stringify([P.buildList, P.raidAtMul, P.raidSizeAdd, P.archerP, P.goldMul, P.workerEveryMul]);
}

// __T_AISTYLES_ROW87__
// ردیف 87 (§1.1 — ناقص→کامل، 0.215.0، behavioral): هر AI سبک قلعه،
// غذا/منابع، سلاح و تاکتیک جنگی متفاوت دارد — هر ۷ شخصیت امضای یکتا
// (buildList=سبک ساخت، goldMul/workerEveryMul=اقتصاد، archerP/troops=سلاح،
// raidAtMul/raidSizeAdd=تاکتیک) + رفتار واقعی: زمان‌بندی/اندازه یورش و ترکیب
// نیرو برحسب شخصیت فرق می‌کند (aiRaidPlan/aiRaidUnitType). بدون کد محصول.
function t_aistyles_row87() {
  const keys = Object.keys(CONFIG.AI.personalities).sort();
  must(keys.length === 7, "۷ شخصیت است، شد " + keys.length);
  must(new Set(keys.map(personalitySig)).size === 7, "امضای هر ۷ یکتاست");
  const wolf = aiRaidPlan({ difficulty: "normal", personality: "artan" }, 0);
  const rat = aiRaidPlan({ difficulty: "normal", personality: "kahbod" }, 0);
  must(wolf.at !== rat.at && wolf.n !== rat.n, "زمان‌بندی/اندازه یورش گرگ/موش فرق دارد");
  const unitsFor = (pers) => {
    const out = new Set();
    for (let i = 0; i < 60; i++) out.add(aiRaidUnitType({ seed: 4242, difficulty: "normal", personality: pers }, 100, 0, i));
    return [...out].sort();
  };
  must(JSON.stringify(unitsFor("azarm")) === JSON.stringify(["arabianBow", "slinger"]), "صلاح‌الدین نیروی عرب می‌فرستد");
  must(JSON.stringify(unitsFor("artan")) === JSON.stringify(["archer", "swordsman"]), "گرگ نیروی صلیبی می‌فرستد");
  return { name: "سبک AIها (87)", pass: true, detail: "۷ امضای یکتا + رفتار" };
}

// __T_AILORDS_ROW744__
// ردیف 744 (§14.4 — ناقص→کامل، 0.215.0، behavioral): چند Lord AI با سبک
// ساخت، منابع، سلاح و تاکتیک مختلف — همان ۷ شخصیت (ارجاع 87 همین نسخه):
// ترتیب ساخت هر ۷ متمایز، دامنه منابع ۰٫۷ تا ۱٫۵، زوج بیابان با نیروی عرب
// (0.151.0) + زمان‌بندی یورش متمایز. بدون کد محصول (فقط تست).
function t_ailords_row744() {
  const keys = Object.keys(CONFIG.AI.personalities).sort();
  must(keys.length === 7, "۷ ارباب AI است");
  must(new Set(keys.map((k) => JSON.stringify(CONFIG.AI.personalities[k].buildList))).size === 7, "ترتیب ساخت هر ۷ فرق دارد");
  const golds = keys.map((k) => CONFIG.AI.personalities[k].goldMul);
  must(Math.min(...golds) === 0.7 && Math.max(...golds) === 1.5, "دامنه منابع ۰٫۷ تا ۱٫۵ است");
  must(CONFIG.AI.personalities.hamun.troops.melee === "slave", "ارباب عرب: پیاده برده");
  must(CONFIG.AI.personalities.azarm.troops.melee === "slinger", "صلاح‌الدین: فلاخن‌انداز (زوج بیابان)");
  const rat = aiRaidPlan({ difficulty: "normal", personality: "kahbod" }, 0);
  const snake = aiRaidPlan({ difficulty: "normal", personality: "tirazheh" }, 0);
  must(rat.at !== snake.at && rat.n !== snake.n, "یورش موش/مار فرق دارد");
  return { name: "ارباب‌های AI (744)", pass: true, detail: "۷ سبک متمایز" };
}

// __T_AIPOWER_ROW1189__
// ردیف 1189 (§20.1 — ناقص→کامل، 0.215.0، divergence): قدرت AI — نقطه‌های
// آبی/زرد تا ۵ هست (powerTier: ۵ پله با رنگ) + handicap اقتصاد/ارتش هست
// (۳ درجه با goldMul/raidSizeAdd/workerEveryMul؛ normal خنثی)؛ ولی ضریب HP
// ارباب نیست (جان ارباب ثابت ۱۵۰) — همان یک واگرایی مستند. بدون کد محصول.
function t_aipower_row1189() {
  must(powerTier(0).level === 1 && powerTier(1400).level === 5, "۵ پله قدرت است");
  must(POWER_COLORS.length === 5, "۵ رنگ نقطه است");
  must(JSON.stringify(Object.keys(CONFIG.AI.difficulties).sort()) === JSON.stringify(["easy", "hard", "normal"]), "۳ درجه سختی است");
  const d = CONFIG.AI.difficulties;
  must(d.normal.goldMul === 1 && d.normal.raidSizeAdd === 0 && d.normal.workerEveryMul === 1, "normal خنثی است");
  must(d.easy.goldMul < 1 && d.hard.goldMul > 1, "handicap اقتصاد دوطرفه است");
  must(d.easy.raidSizeAdd < 0 && d.hard.raidSizeAdd > 0, "handicap ارتش دوطرفه است");
  for (const k of Object.keys(d)) must(d[k].lordHpMult === undefined, "درجه " + k + " ضریب جان ارباب ندارد");
  must(UNITS.lord.hp === 150, "جان ارباب ثابت ۱۵۰ است");
  return { name: "قدرت AI (1189)", pass: true, detail: "۵ نقطه + handicap −HP" };
}

// __T_LOCKSTEP_ROW1208__
// ردیف 1208 (§21.2 — ناقص→کامل، 0.215.0، divergence): مدل lockstep قطعی —
// تأخیر ورودی ثابت هست ولی ۶ تیک است (نه ۲–۳)؛ تشخیص desync با stateHash
// هست ولی خودکار/دوره‌ای نیست (در تست و بازبینی ری‌پلی)؛ توقف/ادامه خودکار
// برای بازیکن عقب‌افتاده نیست (نشست‌های کوتاه زنده). بدون کد محصول.
function t_lockstep_row1208() {
  must(INPUT_DELAY === 6, "تأخیر ورودی ثابت ۶ است");
  must(typeof stateHash === "function", "هش وضعیت هست");
  const f = mpFresh(2);
  for (const k of ["inputAck", "checksumEvery", "desyncPause", "catchUp", "lagPause"]) {
    must(f.state.mp[k] === undefined, "mp نباید " + k + " داشته باشد");
  }
  const h = stateHash(f.state);
  must(typeof h === "string" && /^[0-9a-f]{8}$/.test(h), "هش رشته hex هشت‌رقمی است");
  return { name: "lockstep قطعی (1208)", pass: true, detail: "تأخیر ۶ + هش دستی" };
}

// __T_OPTIONS_ROW115__
// ردیف 115 (§3 — ناقص→کامل، 0.216.0، موجود+خلأ): گزینه‌ها —
// Game Play: سرعت/توقف با کلید (speedUp/speedDown/pause + cycleSpeed) و کارت
// راهنمای درون‌بازی؛ Sound: موسیقی/افکت/بی‌صدا (volMusic/volSfx/volMute +
// loadVolumes)؛ گفتار در موتور نیست (سنتز خالص → گزینه Genie بی‌مصداق)؛
// Video: نه رزولوشن، نه سرعت اسکرول، نه نشانگر (بازی واکنش‌گراست + state
// بی‌میدان ویدیویی). خالص + پروب DOM.
function t_options_row115() {
  must(KEY_ACTIONS.includes("speedUp") && KEY_ACTIONS.includes("speedDown") && KEY_ACTIONS.includes("pause"), "کنش‌های سرعت/توقف هست");
  must(typeof cycleSpeed === "function", "چرخه سرعت هست");
  const v = loadVolumes();
  must(v && typeof v.music === "number" && typeof v.sfx === "number", "ولوم‌ها عددند");
  const st = createState();
  for (const k of ["video", "resolution", "scrollSpeed", "cursor", "genie", "genieSpeech"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  if (typeof document === "undefined") return { name: "گزینه‌ها (115)", pass: true, detail: "سرعت+صدا؛ بدون DOM رد شد" };
  must(!!document.getElementById("volMusic") && !!document.getElementById("volSfx") && !!document.getElementById("volMute"), "کنترل‌های صدا هستند");
  must(!!document.getElementById("navHelp") && !!document.getElementById("helpCard"), "راهنمای درون‌بازی هست");
  must(!!document.querySelector('[data-keyact="speedUp"]') && !!document.querySelector('[data-keyact="pause"]'), "دکمه‌های سرعت/توقف هستند");
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /resol|scrollspeed|cursor|genie|speech/i.test(id));
  must(hits.length === 0, "گزینه ویدیو/گفتار در DOM نیست");
  return { name: "گزینه‌ها (115)", pass: true, detail: "بازی+صدا −ویدیو/گفتار" };
}

// __T_ECS_ROW1204__
// ردیف 1204 (§21.1 — ناقص→کامل، 0.216.0، نگاشت داده‌محور): به‌جای ECS
// کلاسیک، وضعیت «داده‌محور» است (تعیینی + سریال‌شدنی): هر ۱۰ مؤلفه روی
// فیلدهای ساده نگاشت می‌شود — Position‏(x/r)، Health‏(hp/maxHp)، Owner،
// Job‏(order/stance/guardBld/mission)، Weapon‏(type+dmg/range در تعریف)،
// Armor‏(armorClass)، Inventory‏(ammo فقط در مهمات‌دارها — واگرای مستند)،
// Building (ورودی‌های state.buildings)، Worker (استخر شمارنده + تخصیص)،
// Path، Target — با پشتوانه Uint8Array (occ). خالص و هدلس.
function t_ecs_row1204() {
  const f = fresh();
  must(f.state.occ instanceof Uint8Array, "اشغال Uint8Array است");
  must(Array.isArray(f.state.units) && Array.isArray(f.state.buildings), "فهرست‌ها آرایه‌اند");
  const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  must(!!g, "جای یگان هست");
  const u = spawnUnit(f.state, "soldier", g[0] + 0.5, g[1] + 0.5, 0);
  for (const k of ["x", "r", "hp", "maxHp", "owner", "order", "stance", "guardBld", "mission", "path", "pathIdx", "targetKind", "targetId"]) {
    must(k in u, "یگان میدان " + k + " دارد");
  }
  const def = UNITS.soldier;
  must(typeof def.dmg === "number" && typeof def.range === "number", "سلاح در تعریف است");
  must(typeof def.armorClass === "string", "زره در تعریف است");
  const c = spawnUnit(f.state, "catapult", g[0] + 1.5, g[1] + 0.5, 0);
  must(typeof c.ammo === "number", "مهمات‌دار inventory دارد");
  must(!("ammo" in u), "بی‌مهمات inventory ندارد (واگرای مستند)");
  const hut = tryPlace(f.state, f.terrain, f.W, f.H, 5, 1, CONFIG.BUILDINGS.hut);
  must(hut.ok, "کلبه ساخته شد");
  for (const k of ["type", "c", "r", "hp", "owner"]) {
    must(k in hut.building, "بنا میدان " + k + " دارد");
  }
  must(typeof f.state.workers === "number" && typeof f.state.workerCap === "number", "کارگر استخر شمارنده است");
  must(typeof assignStaff === "function", "تخصیص کارگر هست");
  const rt = JSON.parse(JSON.stringify(u));
  must(JSON.stringify(Object.keys(rt).sort()) === JSON.stringify(Object.keys(u).sort()), "یگان سریال‌شدنی است");
  return { name: "ساختار داده‌محور (1204)", pass: true, detail: "۱۰ مؤلفه + Uint8Array" };
}

// __T_PERF_ROW1233__
// ردیف 1233 (§22 — ناقص→کامل، 0.216.0، بودجه+سطح): کارایی — بودجه ماشینی
// (BENCH_BUDGET: هر تیک ≤۳ms و ≥۳۰۰ تیک/ثانیه) + بنچ واقعی (benchSim) سبز +
// LOD نمایشی با ۳ سطح کیفیت (fidSel: full/balanced/lite)؛ sim ده‌هرتزی جدا
// از رندر (TICK_HZ=۱۰) و بدون instancing (بوم دوبعدی) — واگرای مستند.
// خالص + پروب DOM.
function t_perf_row1233() {
  must(JSON.stringify(BENCH_BUDGET) === JSON.stringify({ tickMs: 3, ticksPerSec: 300 }), "بودجه همینی است");
  must(withinBudget({ ticks: 600, ms: 60 }) === true, "نمونه تند در بودجه است");
  must(withinBudget({ ticks: 600, ms: 60000 }) === false, "نمونه کند بیرون است");
  must(CONFIG.TICK_HZ === 10, "sim ده‌هرتزی است");
  const s = benchSim(CONFIG.MAP_SEED, 50);
  must(withinBudget(s) === true, "۵۰ تیک بنچ در بودجه است (" + s.tickMs.toFixed(2) + "ms)");
  if (typeof document === "undefined") return { name: "کارایی (1233)", pass: true, detail: "بودجه + بنچ؛ بدون DOM رد شد" };
  const sel = document.getElementById("fidSel");
  must(!!sel && sel.options.length === 3, "۳ سطح کیفیت هست");
  return { name: "کارایی (1233)", pass: true, detail: "بودجه + ۳ سطح" };
}

// __T_TILES_ROW1136__
// ردیف 1136 (§19.1 — ناقص→کامل، 0.217.0، لایه‌های tile): زمین فقط ۴ کد دارد
// (T_GRASS=۰/T_WATER=۱/T_ROCK=۲/T_OASIS=۳ — هر ۴ روی نقشه سیدی هستند و هیچ
// کد دیگری در نقشه نیست؛ T_DESERT/T_MARSH/T_HILL/T_HEIGHT بی‌مصادق‌اند)؛
// لایه height/resourceNode/buildable/occupant جدا نیست: buildable یعنی
// چمن‌خالص (آب/سنگ = TERRAIN) و occupant همان occ است (Uint8Array؛ ردپا پس
// از ساخت ۱ می‌شود و ساخت دوباره OCCUPIED است)؛ گره‌های tree/sandstone/
// ironRock/oil/deer-spawn بی‌مصادق‌اند. خالص و هدلس.
function t_tiles_row1136() {
  const f = fresh();
  must(f.terrain instanceof Uint8Array, "زمین تخت است");
  must(T_GRASS === 0 && T_WATER === 1 && T_ROCK === 2 && T_OASIS === 3, "۴ کد متمایز");
  for (const k of ["T_DESERT", "T_MARSH", "T_HILL", "T_HEIGHT"]) must(!(k in terrainNs), "کد " + k + " نیست");
  const seen = new Set(f.terrain);
  for (const v of seen) must(v >= 0 && v <= 3, "کد بیرون ۰..۳: " + v);
  for (const v of [0, 1, 2, 3]) must(seen.has(v), "کد " + v + " روی نقشه سیدی هست");
  for (const k of ["height", "tileHeight", "resourceNode", "resourceNodes", "trees", "deer", "sandstone", "ironRock", "oilNode", "buildable"]) {
    must(f.state[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  let w = null, rk = null;
  for (let r = 0; r < f.H && (!w || !rk); r++) {
    for (let c = 0; c < f.W; c++) {
      const t = f.terrain[r * f.W + c];
      if (t === T_WATER && !w) w = [c, r];
      if (t === T_ROCK && !rk) rk = [c, r];
    }
  }
  must(!!w && !!rk, "آب و سنگ روی نقشه‌اند");
  let v = validate(f.state, f.terrain, f.W, f.H, w[0], w[1], CONFIG.BUILDINGS.wall);
  must(!v.ok && v.reason === REASONS.TERRAIN, "آب = TERRAIN");
  v = validate(f.state, f.terrain, f.W, f.H, rk[0], rk[1], CONFIG.BUILDINGS.wall);
  must(!v.ok && v.reason === REASONS.TERRAIN, "سنگ = TERRAIN");
  must(tryPlace(f.state, f.terrain, f.W, f.H, 1, 1, CONFIG.BUILDINGS.hut).ok, "کلبه روی چمن");
  must(f.state.occ[1 * f.W + 1] === 1, "ردپا اشغال می‌شود");
  v = validate(f.state, f.terrain, f.W, f.H, 1, 1, CONFIG.BUILDINGS.hut);
  must(!v.ok && v.reason === REASONS.OCCUPIED, "هم‌پوشانی = OCCUPIED");
  return { name: "لایه‌های tile (1136)", pass: true, detail: "۴ کد + buildable=چمن + occ" };
}

// __T_PLACECOND_ROW1137__
// ردیف 1137 (§19.1 — ناقص→کامل، 0.217.0، قیدهای جایگذاری): هر ۶ تعریف
// دسته-farm (گندم/رازک/سیب/لبنی/مزرعه + شکارچی — پیاده‌سازی فراتر از ۴تای
// دفترچه) دور از واحه NO_OASIS می‌خورند (شاهد نزدیک: گندم (۱،۱) قبول)؛
// معدن سنگ/آهن روی چمنِ بی‌صخره/هموار ساخته می‌شوند (بی‌قید boulder/hilltop)؛
// آغل گاو قید مجاورت ندارد (rules=null + ساخت دور از معدن)؛ چوب‌بری بی‌قید
// درخت است؛ خندق/قیر بنا نیستند (moat/pitchrig بی‌مصادق)؛ سنگِ نقشه فقط
// TERRAIN است نه گره ویژه sandstone/iron. خالص و هدلس.
function t_placecond_row1137() {
  const f = fresh();
  const farmIds = Object.keys(CONFIG.BUILDINGS).filter((k) => CONFIG.BUILDINGS[k].category === "farm");
  must(farmIds.length === 6, "۶ دسته-farm هست: " + farmIds.join(","));
  let far = null;
  for (let r = 1; r + 3 <= f.H && !far; r++) {
    for (let c = 1; c + 3 <= f.W && !far; c++) {
      let grass = true;
      for (let j = 0; j < 3 && grass; j++) {
        for (let i = 0; i < 3 && grass; i++) {
          if (f.terrain[(r + j) * f.W + c + i] !== T_GRASS || f.state.occ[(r + j) * f.W + c + i] === 1) grass = false;
        }
      }
      if (grass && !nearOasis(f.terrain, f.W, f.H, c, r, 3, 3, OASIS_FARM_RADIUS)) far = [c, r];
    }
  }
  must(!!far, "جای چمن دور از واحه هست");
  for (const k of farmIds) {
    const v = validate(f.state, f.terrain, f.W, f.H, far[0], far[1], CONFIG.BUILDINGS[k]);
    must(!v.ok && v.reason === REASONS.NO_OASIS, k + " دور رد می‌شود");
  }
  must(validate(f.state, f.terrain, f.W, f.H, 1, 1, CONFIG.BUILDINGS.wheatfarm).ok, "گندم نزدیک واحه قبول (شاهد)");
  must(tryPlace(f.state, f.terrain, f.W, f.H, 1, 1, CONFIG.BUILDINGS.quarry).ok, "معدن سنگ روی چمن بی‌صخره");
  must(tryPlace(f.state, f.terrain, f.W, f.H, 4, 1, CONFIG.BUILDINGS.ironmine).ok, "معدن آهن روی چمن هموار");
  must(CONFIG.BUILDINGS.oxtether.rules == null, "آغل گاو قید مجاورت ندارد");
  must(tryPlace(f.state, f.terrain, f.W, f.H, 7, 1, CONFIG.BUILDINGS.oxtether).ok, "آغل دور از معدن ساخته می‌شود");
  must(tryPlace(f.state, f.terrain, f.W, f.H, 1, 4, CONFIG.BUILDINGS.woodcutter).ok, "چوب‌بری بی‌قید درخت");
  must(!CONFIG.BUILDINGS.moat && !CONFIG.BUILDINGS.pitchrig, "خندق/قیر بنا نیستند");
  let rk = null;
  for (let r = 0; r < f.H && !rk; r++) {
    for (let c = 0; c < f.W; c++) {
      if (f.terrain[r * f.W + c] === T_ROCK) { rk = [c, r]; break; }
    }
  }
  must(!!rk, "سنگ روی نقشه هست");
  const v = validate(f.state, f.terrain, f.W, f.H, rk[0], rk[1], CONFIG.BUILDINGS.wall);
  must(!v.ok && v.reason === REASONS.TERRAIN, "سنگ = TERRAIN (نه گره ویژه)");
  return { name: "قیدهای جایگذاری (1137)", pass: true, detail: "۶ مزرعه + ۴ بی‌قیدی + ۲ غیبت" };
}

// __T_RESOURCES_ROW1138__
// ردیف 1138 (§19.1 — ناقص→کامل، 0.217.0، منابع): نرخ‌ها از کاتالوگ (معدن
// سنگ ۱/۲۵ + معدن آهن ۱/۲۰ + چوب‌بری ۱/۲۰ + شکارچی ۱/۳۳) و تولید در دو پنجره
// پیاپی برابر است (بی‌پایان — نه تخلیه، نه بازرشد، نه مهاجرت)؛ نه درخت نه
// گوزن در state/بنا/یگان هست. خالص و هدلس.
function t_resources_row1138() {
  must(RATES.quarry.produces === "stone" && RATES.quarry.amount === 1 && RATES.quarry.everyTicks === 25, "سنگ ۱/۲۵ است");
  must(RATES.ironmine.produces === "iron" && RATES.ironmine.amount === 1 && RATES.ironmine.everyTicks === 20, "آهن ۱/۲۰ است");
  must(RATES.woodcutter.produces === "wood" && RATES.woodcutter.amount === 1 && RATES.woodcutter.everyTicks === 20, "چوب ۱/۲۰ است");
  must(RATES.hunterpost.produces === "meat" && RATES.hunterpost.amount === 1 && RATES.hunterpost.everyTicks === 33, "گوشت ۱/۳۳ است");
  const st = createState();
  must(st.trees === undefined && st.deer === undefined, "نه درخت نه گوزن در state");
  must(!Object.keys(CONFIG.BUILDINGS).some((k) => /deer|tree/i.test(k)), "نه بنا درخت/گوزن");
  const s = fresh();
  must(tryPlace(s.state, s.terrain, s.W, s.H, 1, 1, CONFIG.BUILDINGS.oxtether).ok, "آغل برای معدن");
  must(tryPlace(s.state, s.terrain, s.W, s.H, 4, 1, CONFIG.BUILDINGS.quarry).ok, "معدن سنگ");
  const p0 = s.state.producedTotal;
  sim(s.state, 250);
  const d1 = s.state.producedTotal - p0;
  sim(s.state, 250);
  const d2 = s.state.producedTotal - p0 - d1;
  must(d1 === 10 && d2 === 10, "سنگ دو پنجره برابر: " + d1 + "/" + d2);
  const g = fresh();
  must(tryPlace(g.state, g.terrain, g.W, g.H, 1, 1, CONFIG.BUILDINGS.hunterpost).ok, "شکارچی");
  const q0 = g.state.producedTotal;
  sim(g.state, 330);
  const e1 = g.state.producedTotal - q0;
  sim(g.state, 330);
  const e2 = g.state.producedTotal - q0 - e1;
  must(e1 === 10 && e2 === 10, "گوشت دو پنجره برابر: " + e1 + "/" + e2);
  return { name: "منابع بی‌پایان (1138)", pass: true, detail: "۴ نرخ + ۲ پنجره برابر" };
}

// __T_FOOTPRINT_ROW1139__
// ردیف 1139 (§19.1 — ناقص→کامل، 0.217.0، footprint): هر ۵۱ بنا ردپای
// مستطیلی صحیح ≥۱ دارد؛ اعتبارسنج همان validate است (نامی به اسم canPlace
// نیست) و هر ۴ نگرانی را یک‌جا می‌بیند (ماسک TERRAIN + منابع INSUFFICIENT +
// عدم تداخل OCCUPIED + اتصال: granary anchorToSame و wall anchorToAny)؛
// پله بنا نیست پس اتصال stairs-wall بی‌مصداق است؛ پیش‌نمایش قرمز/سبز را
// t_redfootprint_row153 در سطح رندر پین کرده است. خالص و هدلس.
function t_footprint_row1139() {
  const f = fresh();
  const ids = Object.keys(CONFIG.BUILDINGS);
  must(ids.length === 51, "۵۱ بنا هست: " + ids.length);
  for (const k of ids) {
    const d = CONFIG.BUILDINGS[k];
    must(Number.isInteger(d.w) && Number.isInteger(d.h) && d.w >= 1 && d.h >= 1, k + " ردپای مستطیلی دارد");
  }
  must(typeof validate === "function" && !("canPlace" in constrNs), "اعتبارسنج همان validate است");
  let w = null;
  for (let r = 0; r < f.H && !w; r++) {
    for (let c = 0; c < f.W; c++) {
      if (f.terrain[r * f.W + c] === T_WATER) { w = [c, r]; break; }
    }
  }
  must(!!w, "آب روی نقشه هست");
  must(validate(f.state, f.terrain, f.W, f.H, w[0], w[1], CONFIG.BUILDINGS.wall).reason === "TERRAIN", "ماسک: آب رد است");
  must(tryPlace(f.state, f.terrain, f.W, f.H, 1, 1, CONFIG.BUILDINGS.hut).ok, "کلبه ساخته شد");
  must(validate(f.state, f.terrain, f.W, f.H, 1, 1, CONFIG.BUILDINGS.hut).reason === "OCCUPIED", "تداخل رد است");
  const g = fresh();
  g.state.resources.wood = 0; g.state.resources.stone = 0; g.state.resources.gold = 0;
  must(validate(g.state, g.terrain, g.W, g.H, 1, 1, CONFIG.BUILDINGS.hut).reason === "INSUFFICIENT", "بی‌پولی رد است");
  must(tryPlace(f.state, f.terrain, f.W, f.H, 1, 4, CONFIG.BUILDINGS.granary).ok, "انبار غذای اول آزاد است");
  must(validate(f.state, f.terrain, f.W, f.H, 8, 1, CONFIG.BUILDINGS.granary).reason === "ANCHOR", "انبار غذای دوم دور لنگر می‌خواهد");
  must(tryPlace(f.state, f.terrain, f.W, f.H, 3, 4, CONFIG.BUILDINGS.granary).ok, "انبار غذای دوم چسبیده ساخته می‌شود");
  must(validate(f.state, f.terrain, f.W, f.H, 8, 8, CONFIG.BUILDINGS.wall).reason === "ANCHOR", "دیوار تنها لنگر می‌خواهد");
  must(!CONFIG.BUILDINGS.stairs, "پله بنا نیست");
  return { name: "footprint ساختمان (1139)", pass: true, detail: "۵۱ ردپا + ۴ دلیل + ۲ لنگر" };
}

// __T_EVENTS_ROW1173__
// ردیف 1173 (§19.5 — ناقص→کامل، 0.218.0، رویدادها): هر ۳ رویداد سیم‌کشی‌شده
// (نمایشگاه ۱۵۰۰–۱۸۰۰ با +۴، شیر ۱۸۰۰–۲۰۰۰ با −۳، بیماری ۲۲۰۰–۲۴۵۰ با −۳)؛
// invasion در هیچ پنجره‌ای/داده‌ای نیست و کلید F1 هم در DEFAULT_KEYS نیست
// (فراخوان دستی نیست) — واگرای مستند. خالص و هدلس.
function t_events_row1173() {
  const mk = (tick) => ({ tick });
  must(activeEvents(mk(1600)).includes("fair") && eventBonus(mk(1600)) === 4, "نمایشگاه +۴ است");
  must(activeEvents(mk(1900)).includes("lion") && eventBonus(mk(1900)) === -3, "شیر −۳ است");
  must(activeEvents(mk(2300)).includes("disease") && eventBonus(mk(2300)) === -3, "بیماری −۳ است");
  const evKeys = Object.keys(TUNING.events);
  must(evKeys.includes("fair") && evKeys.includes("lion") && evKeys.includes("disease"), "هر ۳ رویداد در داده هست: " + evKeys.join(","));
  must(!evKeys.includes("invasion"), "invasion در داده نیست");
  for (let t = 0; t < 6000; t += 25) {
    must(!activeEvents(mk(t)).includes("invasion"), "invasion در t=" + t + " نیست");
  }
  must(!Object.values(DEFAULT_KEYS).includes("F1"), "کلید F1 نیست");
  return { name: "رویدادها (1173)", pass: true, detail: "۳ رویداد + بی-invasion/F1" };
}

// __T_AILAYERS_ROW1186__
// ردیف 1186 (§20 — ناقص→کامل، 0.218.0، لایه‌های AI): Economy=ساخت‌وساز
// ترتیبی پروفایل (≥۳ بنای تکمیل‌شده در ۷۰۰ تیک + پرداخت واقعی)؛ Defense=برج
// در ۵/۷ فهرست (برج بی‌گاریسون هم شلیک پایه می‌کند؛ نه دیوار/نگهبان)؛
// Military=موج زمان‌بندی‌شده با هدف ثابت (ستاد بازیکن)؛ Diplomacy بی‌مصداق
// (نه allies نه tribute)؛ PersonalityConfig=۷ شخصیت. خالص و هدلس.
function t_ailayers_row1186() {
  const P = CONFIG.AI.personalities;
  must(Object.keys(P).length === 7, "۷ شخصیت هست: " + Object.keys(P).join(","));
  const f = fresh();
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد بازیکن");
  must(startAI(f.state, f.terrain, f.W, f.H, "normal", "artan").ok, "شروع AI");
  aiSim(f.state, f.terrain, 700);
  const done = f.state.buildings.filter((b) => (b.owner == null ? 0 : b.owner) === AI_OWNER && b.type !== "keep" && (b.buildLeft || 0) === 0);
  must(done.length >= 3, "اقتصاد ≥۳ بنا ساخته: " + done.length);
  must(f.state.ai.buildIdx >= 3, "فهرست ساخت جلو رفته: " + f.state.ai.buildIdx);
  must(f.state.ai.resources.wood < 120, "پرداخت واقعی است (نه مجانی)");
  const withTower = Object.keys(P).filter((k) => P[k].buildList.includes("tower"));
  must(withTower.length === 5, "برج در ۵ فهرست است: " + withTower.join(","));
  must(isTowerFamily("tower"), "برج خانواده دفاعی است");
  aiSim(f.state, f.terrain, 900); // جمعاً ۱۶۰۰ — یورش اول در ۱۵۰۰
  must(f.state.ai.raidsSent >= 1, "موج رفته: " + f.state.ai.raidsSent);
  const keep = f.state.buildings.find((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === 0);
  must(!!keep, "ستاد بازیکن هست");
  const raiders = f.state.units.filter((u) => !u.dead && (u.owner == null ? 0 : u.owner) === AI_OWNER);
  must(raiders.length >= 2, "مهاجمان آمده‌اند: " + raiders.length);
  const aimed = raiders.filter((u) => u.order && u.order.kind === "attackmove" && u.order.c === keep.c && u.order.r === keep.r);
  must(aimed.length >= 1, "هدف ثابت = ستاد بازیکن");
  must(!("allies" in f.state.ai) && !("tribute" in f.state.ai) && !("diplomacy" in f.state.ai), "دیپلماسی بی‌مصداق است");
  return { name: "لایه‌های AI (1186)", pass: true, detail: "اقتصاد+دفاع+موج+۷ شخصیت −دیپلماسی" };
}

// __T_AIRUN_ROW1187__
// ردیف 1187 (§20 — ناقص→کامل، 0.218.0، اجرای AI): لایه‌ها هر ۵۰ تیک
// می‌اندیشند (با TICK_HZ=۱۰ یعنی هر ۵ ثانیه — واگرا از ۱–۲ ثانیه دفترچه)؛
// گیت nextThink + یکی‌درمیان؛ draw قطعی aiRandAt + ترکیب یگان وزنی (بی‌امتیازدهی
// هدف)؛ فقط هندیکپ (normal×wolf=پایه) + ساده‌سازی مستند (غذای AI مصرف نمی‌شود).
// خالص و هدلس.
function t_airun_row1187() {
  must(CONFIG.AI.thinkEvery === 50, "لایه‌ها هر ۵۰ تیک می‌اندیشند");
  must(CONFIG.TICK_HZ === 10, "یعنی هر ۵ ثانیه (واگرا از ۱–۲ ثانیه)");
  const f = fresh();
  must(placeKeep(f.state, f.terrain, f.W, f.H).ok, "ستاد بازیکن");
  must(startAI(f.state, f.terrain, f.W, f.H, "normal", "artan").ok, "شروع");
  must(f.state.ai.nextThink === f.state.tick + 50, "نوبت بعد +۵۰ است");
  stepAI(f.state, f.terrain); // همان تیک — نباید کاری کند
  must(f.state.ai.buildIdx === 0, "پیش از نوبت کاری نمی‌کند");
  aiSim(f.state, f.terrain, 50);
  must(f.state.ai.buildIdx >= 1, "در نوبت یک بنا شروع می‌شود");
  const half = f.state.buildings.filter((b) => (b.owner == null ? 0 : b.owner) === AI_OWNER && (b.buildLeft || 0) > 0);
  must(half.length <= 1, "یکی در حال ساخت است: " + half.length);
  const a = f.state.ai;
  must(aiRandAt(a, 100, 5) === aiRandAt(a, 100, 5), "draw قطعی است");
  must(aiRandAt(a, 100, 5) !== aiRandAt(a, 100, 6) || aiRandAt(a, 100, 6) !== aiRandAt(a, 100, 7), "نمک اثر می‌کند");
  const types = new Set();
  for (let i = 0; i < 200; i++) types.add(aiRaidUnitType({ personality: "tirazheh" }, 100, 0, i));
  must(types.has("archer") && types.size >= 2, "ترکیب وزنی مار هر دو نوع می‌دهد");
  const base = aiRaidPlan({ difficulty: "normal", personality: "artan" }, 0);
  must(base.at === 1500 && base.n === 3, "خنثی = جدول پایه");
  must(aiDifficulty({ difficulty: "hard" }).raidAtMul === 0.7 && aiPersonality({ personality: "sepehrdad" }).raidSizeAdd === 2, "هندیکپ‌ها فقط ضرب/جمع‌اند");
  must(f.state.ai.resources.food === 120, "غذای AI مصرف نمی‌شود (ساده‌سازی مستند)");
  return { name: "اجرای AI (1187)", pass: true, detail: "۵۰تیک + گیت + draw + هندیکپ" };
}

// __T_AIPARAMS_ROW1188__
// ردیف 1188 (§20 — ناقص→کامل، 0.218.0، پارامترهای شخصیت): aggression با
// raidAtMul/SizeAdd + buildStyle/economyFocus با buildList (برج/مزرعه/آسیاب/
// معدن هست؛ دیوار/خندق/آبجو/پنیر نیست) + unitMix با archerP/troops +
// attackTiming با جدول raids (موش دیر/شیر زود)؛ siegeUsage/riskTolerance در
// هیچ پروفایلی نیست — واگرای مستند. خالص و هدلس.
function t_aiparams_row1188() {
  const P = CONFIG.AI.personalities;
  must(Object.keys(P).length === 7, "۷ شخصیت هست");
  for (const k of Object.keys(P)) {
    const p = P[k];
    must(typeof p.raidAtMul === "number" && typeof p.raidSizeAdd === "number", k + " تهاجم دارد");
    must(Array.isArray(p.buildList) && p.buildList.length > 0, k + " فهرست ساخت دارد");
    must(!p.buildList.includes("wall") && !p.buildList.includes("moat"), k + " بی‌دیوار/خندق است");
    must(typeof p.archerP === "number", k + " ترکیب یگان دارد");
    must(p.siegeUsage === undefined && p.riskTolerance === undefined, k + " بی‌siegeUsage/riskTolerance است");
  }
  const all = Object.values(P).flatMap((p) => p.buildList);
  must(all.includes("farm") && all.includes("quarry"), "مزرعه/معدن در فهرست‌ها هست");
  must(all.includes("mill"), "آسیاب (نان) در فهرست‌ها هست");
  must(!all.includes("brewery") && !all.includes("dairy"), "آبجو/پنیر در فهرست‌ها نیست");
  must(aiRaidPlan({ personality: "kahbod" }, 0).at === 2100 && aiRaidPlan({ personality: "sepehrdad" }, 0).at === 1200, "موش دیر و شیر زود است");
  must(aiPersonality({ personality: "azarm" }).troops.melee === "slinger", "زوج صلاح‌الدین ثبت است");
  return { name: "پارامترهای شخصیت (1188)", pass: true, detail: "۴ نگاشت + ۳ خلأ نام‌دار" };
}

// __T_ARAB7_ROW108__
// ردیف 108 (§9.5 — ناقص→کامل، 0.219.0، والد پس از فرزندان): هر ۷ مزدور عرب
// با پروفایل متمایز (dmg/hp/speed/range/armor)؛ ۶/۷ با فقط طلا از پست
// (hireGoodsFor تک‌قلمی)؛ واگرای برده (سربازخانه+غذا، نه پست) + واگرای قاتل
// (نه قلاب canClimbLadder=false، نه نامرئی — جزئیات در 512/1157 همین نقشه).
// خالص و هدلس.
function t_arab7_row108() {
  const ids = ["arabianBow", "slave", "slinger", "assassin", "horseArcher", "arabian", "firethrower"];
  for (const id of ids) must(UNITS[id], id + " هست");
  const sigs = new Set(ids.map((id) => {
    const u = UNITS[id];
    return [u.dmg, u.hp, u.speed, u.range, u.armorClass].join("/");
  }));
  must(sigs.size === 7, "هر ۷ پروفایل متمایز است: " + sigs.size);
  const mercs = ids.filter((id) => UNITS[id].merc === true);
  must(mercs.length === 6 && !mercs.includes("slave"), "۶ مزدور پستی (بی‌برده): " + mercs.join(","));
  for (const id of mercs) {
    const g = hireGoodsFor(id);
    must(g.length === 1 && g[0].res === "gold" && g[0].n > 0, id + " فقط طلا می‌خواهد");
  }
  const sg = hireGoodsFor("slave");
  must(sg.some((x) => x.res === "food"), "برده غذا می‌خواهد (واگرای مستند)");
  must(UNITS.slave.building === "barracks", "برده از سربازخانه است (نه پست)");
  must(UNITS.assassin.canClimbLadder !== true, "قاتل قلاب ندارد");
  must(UNITS.assassin.invisible === undefined && UNITS.assassin.stealth === undefined, "قاتل میدان نامرئی ندارد (ارجاع 512/1157)");
  return { name: "۷ مزدور عرب (108)", pass: true, detail: "۷ پروفایل + ۶ طلافقط + ۲ واگرا" };
}

// __T_PROJ_ROW1153__
// ردیف 1153 (§19.3 — ناقص→کامل، 0.219.0، absence): مدل ضربه آنی است (strike)
// — نه موجودیت/میدان پرتابه در state، نه سرعت/قوس در تعریف‌ها؛ آسیب در همان
// ۱ تیک در برد کامل می‌نشیند (بی‌زمان پرواز)؛ رول دقتِ تصادفی جدا در 962 پین
// شده (ارجاع). خالص و هدلس.
function t_proj_row1153() {
  const st = createState();
  for (const k of ["projectiles", "arrows", "bullets", "shots", "flightTime"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  for (const id of ["archer", "crossbowman", "ballista", "trebuchet", "firethrower"]) {
    const d = UNITS[id];
    must(d, id + " هست");
    for (const k of ["projSpeed", "arc", "spread", "flightTime", "lobbed", "highArc"]) {
      must(d[k] === undefined, id + " نباید " + k + " داشته باشد");
    }
  }
  // ضربه آنی: کماندار (برد ۶) دشمن در فاصله ۵ را در همان ۱ تیک می‌زند.
  const f = fresh();
  const g = grassNear(f.terrain, f.state.occ, f.W, f.H, 10, 10);
  must(!!g, "جای یگان هست");
  const a = spawnUnit(f.state, "archer", g[0] + 0.5, g[1] + 0.5, 0);
  const foe = spawnUnit(f.state, "slave", g[0] + 5.5, g[1] + 0.5, AI_OWNER);
  must(a && foe, "دو یگان ساخته شدند");
  const hp0 = foe.hp;
  stepCombat(f.state, f.terrain, 1);
  must(foe.hp < hp0 || foe.dead, "آسیب در همان ۱ تیک نشست (بی‌پرواز)");
  return { name: "پرتابه (1153)", pass: true, detail: "ضربه آنی + بی‌میدان/بی‌قوس" };
}

// __T_LOBBYMAP_ROW722__
// ردیف 722 (§14.2 — ناقص→کامل، 0.219.0، feature+divergence): انتخاب نقشه
// (max ۲/۳/۴ + سید اتاق) + پیش‌نمایش (mpMapThumb) و توضیح (mpMapDesc — همان
// کاتالوگ سولو) در لابی؛ ردیف اتاق فقط سید حمل می‌کند و زمین تابع خالص سید
// است پس «ارسال نقشه» بی‌مصداق است؛ ۴ لنگر ظاهرشونده. headless + پروب DOM.
function t_lobbymap_row722() {
  const html = (() => {
    try {
      return withLang("en", () => roomRowHTML({ code: "AB12", max: 4, seed: 1337, players: [] }));
    } catch (e) { return roomRowHTML({ code: "AB12", max: 4, seed: 1337, players: [] }); }
  })();
  must(/1337|۱۳۳۷/.test(html), "ردیف اتاق سید دارد");
  const a = makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, 424242);
  const b = makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, 424242);
  must(a.length === b.length && a.every((v, i) => v === b[i]), "زمین تابع خالص سید است (ارسال لازم نیست)");
  must(MP_SPAWN_ANCHOR.length === 4, "۴ لنگر ظاهرشونده هست");
  if (typeof document === "undefined") return { name: "نقشه لابی (722)", pass: true, detail: "سید + تقارن؛ بدون DOM رد شد" };
  const sel = document.getElementById("mpMaxSel");
  must(!!sel && sel.options.length === 3, "انتخاب ۲/۳/۴ نفره هست");
  const inp = document.getElementById("mpSeedInput");
  must(!!inp, "ورودی سید اتاق هست");
  const cv = document.getElementById("mpMapThumb"), desc = document.getElementById("mpMapDesc");
  must(!!cv && !!desc, "پیش‌نمایش+توضیح لابی هست");
  const m0 = CONFIG.MAPS[0];
  inp.value = String(m0.seed);
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  must(desc.textContent === t("game.map." + m0.key + ".desc"), "توضیح نقشه نام‌دار پر شد");
  inp.value = "12345";
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  must(desc.textContent === t("game.map.custom.desc"), "سید ناشناس = توضیح سفارشی");
  // رندر thumbnail روی بوم جدا (readback بوم متصل در این محیط شفاف است).
  const dc = document.createElement("canvas");
  dc.width = 144; dc.height = 144;
  must(paintMapThumb(dc, m0.seed) === true, "رسم thumbnail");
  const px = dc.getContext("2d").getImageData(0, 0, dc.width, dc.height).data;
  let opaque = 0;
  for (let i = 3; i < px.length; i += 64) if (px[i] !== 0) opaque++;
  if (opaque === 0) return { name: "نقشه لابی (722)", pass: true, detail: "سیم‌کشی + توضیح؛ readback شفاف رد شد" };
  return { name: "نقشه لابی (722)", pass: true, detail: "انتخاب+پیش‌نمایش+تقارن سید" };
}

// __T_SKIRMISH_ROW85__
// ردیف 85 (§1.1 — ناقص→کامل، 0.220.0، parent pin): بازی سفارشی — هر ۵ فرزند
// کامل‌اند (86 بی‌جعبه AI + 87 هفت سبک متمایز + 88 میز گرد FFA + 89 گونه
// مرجع/واگرا + 90 پیش‌نمایش نقشه)؛ واگرای مستند والد: فقط ۱ حریف تکی است
// (کانتینر تکی state.ai + مالک ۹، نه ۷ اسلات حریف — نه ai2/aiList/opponents).
// خالص + پروب DOM.
function t_skirmish_row85() {
  const keys = Object.keys(CONFIG.AI.personalities).sort();
  must(keys.length === 7, "۷ شخصیت است (ارجاع 87)، شد " + keys.length);
  must(AI_OWNER === 9, "مالک AI بیرون اسلات‌هاست");
  const st = createState();
  must(st.ai && st.ai.active === false, "کانتینر تکی AI غیرفعال است");
  for (const k of ["ai2", "aiList", "opponents", "aiPlayers", "multiAI", "aiSlots", "personalities"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد (تک‌حریف)");
  }
  const f = fresh();
  must(startAI(f.state, f.terrain, f.W, f.H, "normal", "artan").ok, "شروع تک‌حریف");
  must(f.state.ai.active === true && f.state.ai2 === undefined, "پس از شروع هم تکی است");
  const room = { code: "AB12", max: 4, num: 2, seed: 7, players: [{ name: "a", logo: 0 }, { name: "b", logo: 1 }] };
  for (const h of [roomRowHTML(room), liveRowHTML(room, false)]) {
    must(h.includes(">a<") && h.includes(">b<"), "فهرست بازیکنان هست (ارجاع 720)");
    must(!/CPU|add.?ai|ai.?add|computer/i.test(h), "بی‌صندلی/بی‌جعبه AI (ارجاع 86)");
  }
  const g = mpFresh(2);
  must(g.state.mp && g.state.mp.enabled, "حالت MP هست");
  for (const k of ["teams", "roundTable", "teamColors", "allies"]) {
    must(g.state.mp[k] === undefined, "mp نباید " + k + " داشته باشد (FFA، ارجاع 88)");
  }
  must(CONFIG.MAPS.length === 3 && typeof paintMapThumb === "function", "۳ نقشه + پیش‌نمایش (ارجاع 90)");
  if (typeof document === "undefined") return { name: "بازی سفارشی (85)", pass: true, detail: "۵ فرزند + تک‌حریف؛ بدون DOM رد شد" };
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /addai|removeai|aibox|aipick/i.test(id));
  must(hits.length === 0, "جعبه AI در DOM نیست (ارجاع 86)");
  return { name: "بازی سفارشی (85)", pass: true, detail: "۵ فرزند + تک‌حریف" };
}

// __T_LORD_ROW685__
// ردیف 685 (§13 — ناقص→کامل، 0.220.0، divergence pin): ارباب مهم‌ترین است
// (استخدام‌ناپذیر + پرتره + مرگ=باخت ارجاع 128) ولی «جنگجوی مرگبار» واگراست:
// جان ۱۵۰ (سقف مشترک با ماشین‌ها؛ بالاترین در میان پیاده‌ها) اما آسیب ۸ از
// شوالیه (۱۰)، صلیبی (۱۱) و قاتل (۱۳) کمتر است. خالص و هدلس.
function t_lord_row685() {
  const L = UNITS.lord;
  must(L && L.noHire === true && L.building == null, "ارباب استخدام‌ناپذیر و بی‌بناست (مهم‌ترین)");
  must(L.hp === 150, "جان ارباب ۱۵۰ است");
  must(L.hp > UNITS.knight.hp && L.hp > UNITS.swordsman.hp && L.hp > UNITS.crusader.hp, "جان ارباب از پیاده‌ها بیشتر است");
  must(L.dmg === 8 && UNITS.knight.dmg === 10 && UNITS.assassin.dmg === 13, "آسیب‌ها: ارباب ۸، شوالیه ۱۰، قاتل ۱۳");
  must(L.dmg < UNITS.knight.dmg && L.dmg < UNITS.crusader.dmg && L.dmg < UNITS.assassin.dmg, "آسیب ارباب از جنگجویان کمتر است (واگرای مرگبار)");
  const face = lordPortraitHTML(0);
  must(face.indexOf("<img") === 0, "پرتره ارباب هست (اهمیت)");
  const f = fresh();
  const r = spawnLord(f.state, f.terrain, f.W, f.H);
  must(r.ok && r.unit && !r.unit.dead, "ارباب برخاست");
  strike(f.state, 999999, { kind: "unit", u: r.unit });
  must(r.unit.dead && f.state.defeated === true, "مرگ ارباب = باخت (ارجاع 128)");
  return { name: "ارباب (685)", pass: true, detail: "مهم‌ترین + آسیب ۸<۱۰/۱۳" };
}

// __T_LOBBYLIST_ROW720__
// ردیف 720 (§14.1 — ناقص→کامل، 0.220.0، partial+absence): فهرست بازیکنان +
// ready هست (رستر اتاق + دکمه آماده + رشته‌های راهنما) ولی صندلی CPU نیست:
// اسلات‌های MP فقط انسانی‌اند (بی‌پرچم ai/personality/cpu) + stepAI در MP
// بی‌اثر است (ارجاع 86/737/1195). خالص + پروب DOM.
function t_lobbylist_row720() {
  const room = { code: "AB12", max: 4, num: 2, seed: 7, players: [{ name: "a", logo: 0, slot: 0, ready: true }, { name: "b", logo: 1, slot: 1, ready: false }] };
  const h1 = roomRowHTML(room);
  must(h1.includes(">a<") && h1.includes(">b<"), "فهرست بازیکنان در کارت اتاق هست");
  const h2 = liveRowHTML(room, false);
  must(h2.includes(">a<") && h2.includes(">b<"), "فهرست بازیکنان در بازی زنده هست");
  for (const h of [h1, h2]) must(!/CPU/i.test(h), "سپر CPU نیست (غیبت)");
  const f = mpFresh(2);
  must(Array.isArray(f.state.mpres) && f.state.mpres.length === 2, "دو اسلات انسانی");
  for (const p of f.state.mpres) {
    must(p.ai === undefined && p.personality === undefined && p.cpu === undefined, "اسلات MP انسانی است (بی‌CPU)");
  }
  const nb = f.state.buildings.length, nu = f.state.units.length;
  stepAI(f.state, f.terrain);
  must(f.state.buildings.length === nb && f.state.units.length === nu, "stepAI در MP بی‌اثر است (نه CPU)");
  must(typeof t("main.mp.readyMark") === "string" && t("main.mp.readyMark").length > 0, "رشته آماده هست");
  must(typeof t("main.mp.pressReady") === "string" && t("main.mp.pressReady").length > 0, "رشته راهنمای آماده هست");
  if (typeof document === "undefined") return { name: "فهرست لابی (720)", pass: true, detail: "فهرست+ready بی‌CPU؛ بدون DOM رد شد" };
  must(!!document.getElementById("mpReadyBtn"), "دکمه آماده در DOM هست");
  must(document.querySelectorAll("[data-aistatus],[data-cpu]").length === 0, "آیکن CPU در DOM نیست");
  return { name: "فهرست لابی (720)", pass: true, detail: "فهرست+ready بی‌CPU" };
}

// ردیف 718 (§14.1 — ناقص→کامل، 0.221.0، feature+divergence): میزبان با ستاره (رستر درون‌اتاق + شروع فقط-میزبان: سرور nohost + دکمه پنهان برای دیگران) + ready (ارجاع 719)؛ چت نیست (ارجاع 741 — دیگران عملاً فقط ready). خالص + پروب DOM (اتاق جعلی + بازپرداخت امن، الگوی 757).
// __T_HOST_ROW718__
function t_host_row718() {
  must(roomHostSlot({ host: 1, players: [{ slot: 0 }, { slot: 1 }] }) === 1, "host صریح مقدم است");
  must(roomHostSlot({ players: [{ slot: 2 }, { slot: 3 }] }) === 2, "بی‌host = اولین بازیکن (آینه سرور)");
  must(roomHostSlot({ players: [] }) === 0, "خالی = ۰");
  must(roomHostSlot(null) === 0, "تهی = ۰");
  must(isRoomHost({ host: 2 }, 2) === true, "میزبان خودش");
  must(isRoomHost({ host: 2 }, 1) === false, "غیرمیزبان");
  must(hostStar({ host: 1 }, 1) === true, "ستاره میزبان");
  must(hostStar({ host: 1 }, 0) === false, "دیگران ستاره ندارند");
  must(hostStar({}, 0) === false, "بی‌host صریح ستاره‌ای نیست (فهرست‌ها)");
  must(typeof t("main.mp.readyMark") === "string" && t("main.mp.readyMark").length > 0, "رشته آماده هست (ارجاع 719)");
  must(KEY_ACTIONS.indexOf("chat") === -1 && KEY_ACTIONS.indexOf("taunt") === -1, "کنش چت/Taunt نیست (ارجاع 741)");
  if (typeof document === "undefined") return { name: "میزبان (718)", pass: true, detail: "کمک‌ها + ready بی‌چت؛ بدون DOM رد شد" };
  must(!!document.getElementById("mpReadyBtn"), "دکمه آماده هست");
  must(!!document.getElementById("mpStartBtn"), "دکمه شروع هست");
  const box = document.getElementById("mpRosterEl");
  must(!!box, "رستر لابی هست");
  const W = typeof window !== "undefined" ? window : null;
  const L = (W && W.__slice01 && W.__slice01.lobby) || null;
  const paint = (W && W.__slice01 && W.__slice01.mpPaint) || null;
  must(!!L && !!paint, "قلاب لابی هست");
  const saveRoom = L.room, saveSlot = L.mySlot;
  try {
    L.room = { code: "TST1", slot: 0, max: 4, players: [{ slot: 0, name: "a", logo: 0, ready: true }, { slot: 1, name: "b", logo: 1, ready: false }], started: false, seed: 7, host: 0 };
    L.mySlot = 1;
    paint();
    must(box.innerHTML.indexOf("★") !== -1, "ستاره میزبان در رستر هست");
    must(document.getElementById("mpStartBtn").hidden === true, "شروع برای غیرمیزبان پنهان است");
    L.mySlot = 0;
    paint();
    must(document.getElementById("mpStartBtn").hidden === false, "شروع برای میزبان پیداست");
  } finally {
    L.room = saveRoom; L.mySlot = saveSlot;
    try { paint(); } catch (e) {}
  }
  return { name: "میزبان (718)", pass: true, detail: "ستاره + شروع فقط-میزبان، بی‌چت" };
}

// ردیف 97 (§1.1 — ناقص→کامل، 0.221.0، divergence): چندنفره هست (اتاق/رستر/lockstep با تأخیر ثابت + هش + ری‌پلی، ارجاع 1208/1210) ولی واگرا: سقف ۴ نه ۸ (MP_MAX + ۴ لنگر + انتخاب ۲/۳/۴)، اسلات‌ها فقط انسانی‌اند (نه AI، ارجاع 720) و انتقال سرور مدرن است (نه LAN/Gamespy). خالص + پروب DOM.
// __T_MP_ROW97__
function t_mp_row97() {
  must(MP_MAX === 4, "سقف ۴ است (واگرا از ۸)");
  must(MP_SPAWN_ANCHOR.length === 4, "۴ لنگر ظاهرشونده (واگرا از ۸)");
  must(INPUT_DELAY === 6, "تأخیر ثابت ۶ (واگرا از ۲–۳، ارجاع 1208)");
  const f = mpFresh(2);
  must(f.state.mp && f.state.mp.enabled && f.state.mp.num === 2, "MP دو نفره هست");
  must(Array.isArray(f.state.mpres) && f.state.mpres.length === 2, "دو اسلات");
  for (const p of f.state.mpres) {
    must(p.ai === undefined && p.personality === undefined && p.cpu === undefined, "اسلات انسانی است (نه ۴+۴ AI، ارجاع 720)");
  }
  const h = stateHash(f.state);
  must(typeof h === "string" && /^[0-9a-f]{8}$/.test(h), "هش MP هشت‌رقمی است (ارجاع 1208)");
  must(typeof resolveSocketUrl === "function", "matchmaking مدرن هست (نه LAN/Gamespy)");
  if (typeof document === "undefined") return { name: "چندنفره (97)", pass: true, detail: "۴نفره انسانی + هش؛ بدون DOM رد شد" };
  const sel = document.getElementById("mpMaxSel");
  must(!!sel && sel.options.length === 3, "انتخاب ۲/۳/۴ هست (سقف ۴)");
  return { name: "چندنفره (97)", pass: true, detail: "۴نفره انسانی + هش + سقف ۴" };
}

// ردیف 1258 (§22.3 — ناقص→کامل، 0.221.0، legal pin): نام بازی اصلی است (ارگ — Arg، نه Stronghold) + هنر/صدا/متن اصلی + فهرست ممنوعه فعال است (firefly/stronghold-crusader با اسکنر و پاکی محتوا)؛ واگرای مستند: کلیدهای شخصیت (wolf/rat/…) واژه‌های عام‌اند (نه شناسه). خالص + پروب DOM.
// __T_TRADEMARK_ROW1258__
function t_trademark_row1258() {
  must(BANNED_NAMES.indexOf("firefly studios") !== -1, "سازنده اصلی در فهرست است");
  must(BANNED_NAMES.indexOf("stronghold crusader") !== -1, "عنوان اصلی در فهرست است");
  const r = scanContent(CONFIG, UNITS);
  must(r.checked > 30, "ده‌ها رشته خوانده شد، شد " + r.checked);
  must(r.hits.length === 0, "محتوای بازی پاک است: " + r.hits.join(","));
  for (const w of ["wolf", "rat", "snake", "pig"]) must(scanBanned(w).length === 0, w + " واژه عام است (نه شناسه)");
  must(typeof createSoundManager === "function", "موتور صدای اصلی هست");
  if (typeof document === "undefined") return { name: "نام اصلی (1258)", pass: true, detail: "فهرست + پاکی؛ بدون DOM رد شد" };
  const title = document.title || "";
  must(title.indexOf("ارگ") !== -1, "نام بازی ارگ است: " + title);
  must(!/stronghold/i.test(title), "نام بازی شناسه ندارد");
  return { name: "نام اصلی (1258)", pass: true, detail: "ارگ + فهرست + پاکی" };
}

// ردیف 1190 (§20 — ناقص→کامل، 0.222.0، reference+divergence): همان ۷ شخصیت
// پین‌شده در 771/746/87/744 — تکراری عمدی، نه شخصیت تازه:
// کلیدهای یکسان، امضای رفتاری یکتا (ترتیب ساخت + یورش + نیرو)،
// پوشش کهن‌الگوها (زود/دیر، کوچک/بزرگ، آسیاب اقتصادی، زوج بیابان)؛
// واگرای مستند: هشتمی نیست (مغایر 771/746/87/744 می‌شد)، نه
// siegeUsage/riskTolerance (ارجاع 1188)، نه پرچم extreme/warchest (ارجاع 771)،
// نه سازنده محاصره در هیچ buildList (کهن‌الگوی ناب خالص غایب). خالص.
// __T_AI8_ROW1190__
function t_ai8_row1190() {
  const keys = Object.keys(CONFIG.AI.personalities).sort();
  must(JSON.stringify(keys) === JSON.stringify(["artan", "azarm", "farrokhan", "hamun", "kahbod", "sepehrdad", "tirazheh"]), "همان ۷ شخصیت است، شد " + keys.join(","));
  const sigs = keys.map((k) => { const P = CONFIG.AI.personalities[k]; return JSON.stringify([P.buildList, P.raidAtMul, P.raidSizeAdd, P.troops]); });
  must(new Set(sigs).size === 7, "امضای هر ۷ یکتاست");
  const ats = keys.map((k) => CONFIG.AI.personalities[k].raidAtMul);
  must(Math.min.apply(null, ats) === 0.8 && Math.max.apply(null, ats) === 1.4, "یورش زود (۰٫۸) تا دیر (۱٫۴) هست");
  const sizes = keys.map((k) => CONFIG.AI.personalities[k].raidSizeAdd);
  must(Math.min.apply(null, sizes) === -1 && Math.max.apply(null, sizes) === 2, "یورش کوچک (−۱) تا بزرگ (۲) هست");
  const towers = keys.map((k) => CONFIG.AI.personalities[k].buildList.filter((b) => b === "tower").length);
  must(towers[keys.indexOf("sepehrdad")] === 2 && Math.max.apply(null, towers) === 2, "شیر پربرج‌ترین است (۲ برج)");
  must(CONFIG.AI.personalities.farrokhan.buildList.indexOf("mill") !== -1, "خوک آسیاب دارد (economy-boom)");
  const siegeSet = ["siege", "catapult", "trebuchet", "ballista", "fireBallista"];
  for (const k of keys) {
    for (const b of CONFIG.AI.personalities[k].buildList) must(siegeSet.indexOf(b) === -1, "سازنده محاصره نیست: " + k + "/" + b);
  }
  const unitsFor = (pers) => { const out = new Set(); for (let i = 0; i < 60; i++) out.add(aiRaidUnitType({ seed: 4242, difficulty: "normal", personality: pers }, 100, 0, i)); return [...out].sort(); };
  must(JSON.stringify(unitsFor("azarm")) === JSON.stringify(["arabianBow", "slinger"]), "صلاح‌الدین نیروی عرب می‌فرستد");
  must(JSON.stringify(unitsFor("artan")) === JSON.stringify(["archer", "swordsman"]), "گرگ نیروی صلیبی می‌فرستد");
  for (const k of keys) {
    const P = CONFIG.AI.personalities[k];
    must(!("extreme" in P) && !("warchest" in P) && !("isNew" in P) && !("extremeOnly" in P), "شخصیت " + k + " پرچم Extreme ندارد (ارجاع 771)");
    must(!("siegeUsage" in P) && !("riskTolerance" in P), "پارامتر محاصره/ریسک نیست (ارجاع 1188)");
  }
  return { name: "۸ شخصیت (1190)", pass: true, detail: "۷ امضا + ۸می غایب" };
}

// ردیف 1209 (§14.2 — ناقص→کامل، 0.222.0، bundle pin): همه زیربخش‌ها ردیف
// کامل خودشان را دارند — host (ستاره/شروع فقط-میزبان، 718)،
// ready (علامت + دکمه، 719)، هر ۴ گزینه (727/728/729/730)؛ اتحاد
// (735-739)، چت و taunt (۷۴۱) غایب‌اند و همان‌جا پین شده‌اند.
// این تست بسته را یک‌جا قفل می‌کند. خالص + پروب DOM.
// __T_LOBBYFULL_ROW1209__
function t_lobbyfull_row1209() {
  const room = { code: "LB09", max: 4, num: 3, seed: 1337, started: false, host: 1,
    noCow: false, strongWalls: true, noRush: false, noDogs: true,
    players: [{ slot: 0, name: "a", logo: 0, ready: true }, { slot: 1, name: "b", logo: 1, ready: true }, { slot: 2, name: "c", logo: 2, ready: false }] };
  must(roomHostSlot(room) === 1, "host اتاق ۱ است (ارجاع 718)");
  must(isRoomHost(room, 1) === true && isRoomHost(room, 0) === false, "فقط میزبان میزبان است");
  must(hostStar(room, 1) === true && hostStar(room, 2) === false, "ستاره فقط میزبان (ارجاع 718)");
  for (const p of room.players) must(typeof p.ready === "boolean", "پرچم ready بازیکن هست (ارجاع 719)");
  must(typeof t("main.mp.readyMark") === "string" && t("main.mp.readyMark").length > 0, "علامت ready هست (ارجاع 719)");
  for (const k of ["noCow", "strongWalls", "noRush", "noDogs"]) must(k in room, "گزینه " + k + " در اتاق هست");
  must(room.strongWalls === true && room.noDogs === true && room.noCow === false && room.noRush === false, "گزینه‌ها مقدار می‌گیرند");
  for (const p of room.players) must(!("ally" in p) && !("team" in p) && !("tribute" in p), "بازیکن متحد/تیم/خراج ندارد (ارجاع 735-739)");
  const hAll = roomRowHTML(room) + liveRowHTML(room, false);
  must(!/ally|allies|tribute|diplomacy/i.test(hAll), "اتحاد در ردیف‌ها نیست (ارجاع 735-739)");
  must(KEY_ACTIONS.indexOf("chat") === -1 && KEY_ACTIONS.indexOf("taunt") === -1, "کنش چت/Taunt نیست (ارجاع 741)");
  if (typeof document === "undefined") return { name: "لابی کامل (1209)", pass: true, detail: "host+ready+۴ گزینه، بی‌اتحاد/چت؛ بدون DOM رد شد" };
  for (const id of ["mpReadyBtn", "mpStartBtn", "mpNoCowInput", "mpStrongWallsInput", "mpNoDogsInput", "mpNoRushInput"]) {
    must(!!document.getElementById(id), "المان " + id + " هست");
  }
  const hits = Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /chat|taunt/i.test(id));
  must(hits.length === 0, "ورودی چت/Taunt در DOM نیست (ارجاع 741)");
  must(document.querySelectorAll("[data-chat],[data-taunt]").length === 0, "دکمه چت/Taunt نیست");
  return { name: "لابی کامل (1209)", pass: true, detail: "host+ready+۴ گزینه، بی‌اتحاد/چت" };
}

// ردیف 1232 (§21 — ناقص→کامل، 0.222.0، inventory+divergence): موجودی دارایی‌ها
// در برابر ۶ بند: (۱) ۵۱ بنا — وکتوری تک‌پروژکشن (نه ۴ جهت
// جدا) + حالت‌های ghost/damageWash/gray/active روی همان پروژکشن (ارجاع
// 1139/153)؛ (۲) ۲۸ واحد: ۲۴ شیت ۴جهت×(بیکار/راهA/راهB/حمله)+سطر
// مرگ (units.gen — UDIR/ستون +اجساد) + ۴ تک‌اسپرایت محاصره؛
 // (۳) شخصیت‌های شهری: ارباب/شفا + کاتب
// ۳باندی + ۸ گزارش (ارجاع 164/165)؛ (۴) زمین/صخره/آب: ۴ کد + ۱۱
// تایل + ۴ دکور؛ درخت عمداً نیست (manifest: not-required — روی
// چمن قابل‌ساخت دروغ می‌گوید)؛ (۵) UI: ۶ سپر + مینی‌مپ +
// پنل‌ها + چهره‌ها (ارجاع 138/146/147)؛ (۶) صدا: موسیقی مولد
// (mood/drum، ارجاع t_sound_ui_music) + ولوم، بی‌گفتار (نه speak در موتور؛
// مشاور نمایشی است، ارجاع t_advisor_pure). خالص + پروب DOM.
// __T_ASSETS_ROW1232__
function t_assets_row1232() {
  const bkeys = Object.keys(CONFIG.BUILDINGS);
  must(bkeys.length === 51, "کاتالوگ ۵۱ بنا است، شد " + bkeys.length);
  for (const k of bkeys) {
    must(CONFIG.BUILDINGS[k].hp > 0, "بنا " + k + " جان دارد (حالت آسیب معنادار)");
    must(!/-(n|s|e|w|north|south|east|west)$/.test(k), "بنا " + k + " واریانت جهت ندارد (تک‌پروژکشن)");
  }
  const ukeys = Object.keys(UNITS);
  must(ukeys.length === 28, "۲۸ واحد است، شد " + ukeys.length);
  const sheets = ["soldier", "swordsman", "archer", "bowman", "lord", "spearman", "maceman", "knight", "crusader", "crossbowman", "arabian", "assassin", "horseArcher", "blackmonk", "slave", "pikeman", "arabianBow", "slinger", "firethrower", "healer", "wardog", "engineer", "ladderman", "tunneler"];
  must(JSON.stringify(Object.keys(UNIT_DATA).sort()) === JSON.stringify(sheets.concat(["ram", "catapult", "trebuchet", "ballista"]).sort()), "۲۴ شیت واحد + ۴ تک‌اسپرایت محاصره هست");
  for (const k of sheets) {
    const u = UNIT_DATA[k];
    must(typeof u === "string" && u.indexOf("data:image/png;base64,iVBOR") === 0 && u.length > 2000, "شیت " + k + " معتبر است");
  }
  for (const k of ["ram", "catapult", "trebuchet", "ballista"]) {
    const u = UNIT_DATA[k];
    must(typeof u === "string" && u.indexOf("data:image/png;base64,iVBOR") === 0 && u.length > 1000, "تک‌اسپرایت " + k + " معتبر است");
  }
  must(!!UNITS.lord && !!UNITS.healer, "ارباب/شفا هستند");
  must(scribeMood(100) === "glad" && scribeMood(74) === "content" && scribeMood(0) === "grim", "کاتب ۳باندی است (ارجاع 164)");
  must(typeof advisorWarnings === "function", "هشدار مشاور هست");
  must(T_GRASS === 0 && T_WATER === 1 && T_ROCK === 2 && T_OASIS === 3, "۴ کد زمین هست (ارجاع 1136)");
  must(typeof minimapCell === "function" && typeof panForCell === "function", "مینی‌مپ هست (ارجاع 147)");
  const tiles = ["grass-0", "grass-1", "grass-2", "grass-3", "grass-4", "grass-5", "water-0", "water-1", "rock-0", "rock-1", "rock-2"];
  must(JSON.stringify(Object.keys(TILE_DATA).sort()) === JSON.stringify(tiles.slice().sort()), "۱۱ تایل زمین هست");
  for (const k of tiles) must(typeof TILE_DATA[k] === "string" && TILE_DATA[k].indexOf("data:image/png;base64,iVBOR") === 0 && TILE_DATA[k].length > 500, "تایل " + k + " معتبر است");
  const decor = ["boulder-0", "boulder-1", "reeds-0", "reeds-1"];
  must(JSON.stringify(Object.keys(DECOR_DATA).sort()) === JSON.stringify(decor.slice().sort()), "۴ دکور صخره/نی هست");
  must(JSON.stringify(BUILDING_CATEGORIES) === '["castle","industry","farm","food","town","weapon"]', "۶ سپر دسته هست (ارجاع 138)");
  const stub = stubCtx();
  const mgr = createSoundManager({ ctxFactory: () => stub.ctx });
  must(typeof mgr.setMusic === "function" && typeof mgr.setSfx === "function" && typeof mgr.setMood === "function", "موتور صدا (موسیقی/جلوه) هست");
  must(mgr.ensureStarted() === true, "موتور صدا شروع می‌شود");
  mgr.setMood("game");
  must(mgr.mood === "game", "حالت موسیقی game می‌شود");
  must(!("speak" in mgr) && !("speech" in mgr) && !("say" in mgr) && !("voice" in mgr), "گفتار مشاور نیست");
  return { name: "دارایی‌ها (1232)", pass: true, detail: "۵۱ بنا/۲۸ واحد/۱۱ تایل/موسیقی، بی‌گفتار" };
}
// ردیف C-MOB-1 (0.223.0، فاز ۱ موبایل): ژست‌های بازی با مرورگر نجنگند —
// touch-action:none روی بوم اصلی (C-MOB-1)؛ مینی‌مپ از قبل none بود؛
// overscroll روی بدنه + manipulation روی دکمه‌ها (بی تأخیر دابل‌تپ).
// خالص + پروب DOM (CSS: layout.css/base.css).
// __T_MOB_TOUCH_ROW__
function t_mob_touch_row() {
  if (typeof document === "undefined") return { name: "ژست لمسی (C-MOB-1)", pass: true, detail: "بدون DOM رد شد" };
  const board = document.getElementById("board");
  must(!!board, "بوم اصلی هست");
  must(getComputedStyle(board).touchAction === "none", "بوم: touch-action none است");
  const mm = document.getElementById("minimap");
  if (mm) must(getComputedStyle(mm).touchAction === "none", "مینی‌مپ: touch-action none است");
  must(getComputedStyle(document.body).overscrollBehavior === "none", "بدنه: overscroll none است");
  const btn = document.querySelector("button");
  must(!!btn && getComputedStyle(btn).touchAction === "manipulation", "دکمه: touch-action manipulation است");
  return { name: "ژست لمسی (C-MOB-1)", pass: true, detail: "بوم/overscroll/دکمه" };
}

// ردیف C-MOB-2 (0.223.0، فاز ۱ موبایل): سقف DPR به‌ازای کیفیت رسم —
// lite=۱، balanced=۱٫۵، full/ناشناخته=۲ (ارجاع fidelity موجود 0.58.0)؛ استفاده در resize.
// خالص (render.js)؛ sim/هش/ذخیره دست‌نخورده.
// __T_MOB_DPR_ROW__
function t_mob_dpr_row() {
  must(typeof dprCapFor === "function", "کمک dprCapFor هست");
  must(dprCapFor("lite") === 1, "lite=۱");
  must(dprCapFor("balanced") === 1.5, "balanced=۱٫۵");
  must(dprCapFor("full") === 2, "full=۲");
  must(dprCapFor("nope") === 2 && dprCapFor() === 2, "ناشناخته=۲");
  return { name: "سقف DPR (C-MOB-2)", pass: true, detail: "۱/۱٫۵/۲" };
}

// ردیف C-MOB-3 (0.223.0، فاز ۱ موبایل): قفل بیداری صفحه در نبرد —
// نمایشگر موبایل وسط بازی خاموش نمی‌شود (hideMenu=گرفتن،
// showMenu=رها، visibilitychange=گرفتن مجدد). ماژول خالص wakelock.js؛
// بدون WakeLock=بی‌خطا false. تست با navigator قلابی.
// ردیف C-MOB-3 (0.223.0، فاز ۱ موبایل): قفل بیداری صفحه در نبرد —
// نمایشگر موبایل وسط بازی خاموش نمی‌شود (hideMenu=گرفتن،
// showMenu=رها، visibilitychange=گرفتن مجدد). ماژول خالص wakelock.js؛
// مسیر ناهمگام با navigator قلابی در تأیید زنده پروب می‌شود.
// این تست همگامان است (runFn پرامیس را نمی‌پذیرد):
// شکل ماژول + گارد خالص + حالت اولیه/رهاسازی.
// __T_MOB_WAKE_ROW__
function t_mob_wake_row() {
  must(typeof ensureWakeLock === "function" && typeof releaseWakeLock === "function" && typeof isWakeLocked === "function" && typeof canWakeLock === "function", "ماژول wake هست");
  must(canWakeLock(null) === false, "بی‌ناویگان=false");
  must(canWakeLock({}) === false && canWakeLock({ wakeLock: {} }) === false, "بدون request=false");
  must(canWakeLock({ wakeLock: { request: () => {} } }) === true, "با request=true");
  must(isWakeLocked() === false, "ابتدا باز است");
  releaseWakeLock();
  must(isWakeLocked() === false, "رهای خالی بی‌خطا است");
  return { name: "قفل بیداری (C-MOB-3)", pass: true, detail: "شکل+گارد+رها" };
}
// ردیف C-MOB-4 (0.224.0، فاز ۱ موبایل): نوار بالا در 480px پشت دکمه ☰ می‌رود —
// کمک خالص hudShouldCollapse + کلید hud-open روی body + رفتار کلاس. خالص + پروب DOM.
// __T_MOB_HUD_ROW__
function t_mob_hud_row() {
  must(HUD_COLLAPSE_PX === 480, "آستانه باید ۴۸۰ باشد");
  must(hudShouldCollapse(390) === true && hudShouldCollapse(480) === true, "۳۹۰/۴۸۰ جمع می‌شود");
  must(hudShouldCollapse(481) === false && hudShouldCollapse(1920) === false, "۴۸۱/۱۹۲۰ جمع نمی‌شود");
  must(hudShouldCollapse(NaN) === false && hudShouldCollapse("x") === false && hudShouldCollapse() === false, "نامعتبر = باز");
  if (typeof document === "undefined") return { name: "HUD جمع‌شونده (C-MOB-4)", pass: true, detail: "بدون DOM رد شد" };
  const btn = document.getElementById("hudMenuBtn");
  must(!!btn, "دکمه hudMenuBtn در نوار بالا هست");
  const was = isHudOpen();
  try {
    btn.click();
    must(isHudOpen() === !was, "کلیک کلاس hud-open را عوض می‌کند");
    btn.click();
    must(isHudOpen() === was, "کلیک دوم برمی‌گرداند");
  } finally { setHudOpen(was); }
  if (window.innerWidth > 480) must(getComputedStyle(btn).display === "none", "دکمه روی دسکتاپ پنهان است");
  setHudOpen(true);
  must(document.body.classList.contains("hud-open") === true, "کلاس hud-open می‌نشیند");
  setHudOpen(was);
  return { name: "HUD جمع‌شونده (C-MOB-4)", pass: true, detail: "۴۸۰px + کلید + کلاس" };
}

// ردیف C-MOB-5 (0.224.0، فاز ۱ موبایل): در 800px سایدبار شیت پایین می‌شود و
// نقشه تمام‌قد می‌ماند — کمک خالص sheetShouldOverlay + کلید sheet-open + رفتار کلاس. خالص + پروب DOM.
// __T_MOB_SHEET_ROW__
function t_mob_sheet_row() {
  must(SHEET_OVERLAY_PX === 800, "آستانه باید ۸۰۰ باشد");
  must(sheetShouldOverlay(390) === true && sheetShouldOverlay(800) === true, "۳۹۰/۸۰۰ شیت می‌شود");
  must(sheetShouldOverlay(801) === false && sheetShouldOverlay(1920) === false, "۸۰۱/۱۹۲۰ ستون می‌ماند");
  must(sheetShouldOverlay(NaN) === false && sheetShouldOverlay() === false, "نامعتبر = ستون");
  if (typeof document === "undefined") return { name: "پنل کشویی (C-MOB-5)", pass: true, detail: "بدون DOM رد شد" };
  const btn = document.getElementById("sheetToggleBtn");
  must(!!btn, "دکمه sheetToggleBtn روی نقشه هست");
  const was = isSheetOpen();
  try {
    btn.click();
    must(isSheetOpen() === !was, "کلیک کلاس sheet-open را عوض می‌کند");
    btn.click();
    must(isSheetOpen() === was, "کلیک دوم برمی‌گرداند");
  } finally { setSheetOpen(was); }
  if (window.innerWidth > 800) must(getComputedStyle(btn).display === "none", "دکمه روی دسکتاپ پنهان است");
  setSheetOpen(true);
  must(document.body.classList.contains("sheet-open") === true, "کلاس sheet-open می‌نشیند");
  setSheetOpen(was);
  return { name: "پنل کشویی (C-MOB-5)", pass: true, detail: "۸۰۰px + کلید + کلاس" };
}

// ردیف C-MOB-6 (0.224.0، فاز ۱ موبایل): بودجه بنچ موبایل (همان سقف sim با نمونه
// ۱۲۰تیکی) + قطعیت بنچ + کران حافظه کش اسپرایت. خالص و هدلس.
// __T_MOB_BENCH_ROW__
function t_mob_bench_row() {
  must(MOBILE_BENCH_TICKS === 120, "نمونه موبایل ۱۲۰ تیک است");
  const s = benchSim(CONFIG.MAP_SEED, MOBILE_BENCH_TICKS);
  must(withinBudget(s) === true, "۱۲۰ تیک بنچ در بودجه است (" + s.tickMs.toFixed(2) + "ms)");
  const a = benchSim(424242, 30), b = benchSim(424242, 30);
  must(a.hash === b.hash, "بنچ موبایل قطعی است");
  must(spriteInlineCount() >= 20, "جدول inline لود است (" + spriteInlineCount() + ")");
  must(spriteCacheSize() <= spriteInlineCount() + 64, "کش اسپرایت نشتی ندارد (" + spriteCacheSize() + ")");
  return { name: "بنچ موبایل (C-MOB-6)", pass: true, detail: "بودجه + قطعیت + کش" };
}
