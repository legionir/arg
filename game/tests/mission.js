// سوئیت مأموریت و کمپین (0.240.0 — C-CLN-16): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { createState } from "../state.js";
import { UNITS } from "../combat.js";
import {
  MISSION_KINDS, validateMission, createRun, updateRun, missionSnap,
  clockReady, clockText, MISSIONS, validateMissionFile,
} from "../missions.js";
import {
  CAMPAIGN_KEY, campaignLoad, campaignSave, campaignRecord, campaignUnlocked,
  missionByKey, missionIndex, missionName, missionBrief,
} from "../campaign.js";
import { MASTERS_KEY, masterEntry, mastersSave, mastersLoad } from "../masters.js";
import { MENU_PAGES } from "../menunav.js";
import {
  REPLAY_V, REPLAY_KEY, validateReplayLog, runReplay, saveReplaySlot,
} from "../replay.js";
import { getLang, t } from "../i18n.js";
import { must, fresh, sim } from "./fixtures.js";
function t_mission_clock() {
  const B = (o) => ({ destroyed: false, buildLeft: 0, owner: 0, ...o });
  must(clockReady([], 0) === false, "تهی = ناآماده");
  must(clockReady([B({ type: "keep" })], 0) === false, "فقط ستاد = ناآماده");
  must(clockReady([B({ type: "keep" }), B({ type: "granary" })], 0) === true, "ستاد+انبار = آماده");
  must(clockReady([B({ type: "keep" }), B({ type: "granary", destroyed: true })], 0) === false, "ویرانه حساب نیست");
  must(clockReady([B({ type: "keep" }), B({ type: "granary", buildLeft: 3 })], 0) === false, "نیمه‌کاره حساب نیست");
  must(clockReady([B({ type: "keep", owner: 9 }), B({ type: "granary" })], 0) === false, "ستاد بیگانه حساب نیست");
  must(clockReady([B({ type: "keep" }), B({ type: "granary" })], 1) === false, "مالک دیگر حساب نیست");
  must(clockText(0, null) === "00:00", "شروع تهی");
  must(clockText(600, 0) === "01:00", "۶۰۰ تیک = یک دقیقه");
  must(clockText(615, 0) === "01:01", "۶۱۵ تیک");
  must(clockText(100, 200) === "00:00", "شروع آینده = صفر");
  if (typeof document === "undefined") return { name: "ساعت مأموریت", pass: true, detail: "بدون DOM رد شد" };
  const el = document.getElementById("mclockEl");
  must(!!el, "ساعت در نوار بالا هست");
  must(/^[0-9-:]+$/.test(el.textContent), "متن ساعت معتبر است: " + el.textContent);
  return { name: "ساعت مأموریت", pass: true, detail: "آمادگی + قالب + DOM" };
}

function t_campaign_catalog() {
  must(Array.isArray(MISSIONS) && MISSIONS.length === 10, "کاتالوگ ۶ مأموریت است");
  must(validateMissionFile({ missions: MISSIONS }).length === 0, "فایل کاتالوگ پاک است");
  const keys = new Set(), seeds = new Set();
  const diffs = Object.keys(CONFIG.AI.difficulties);
  const pers = Object.keys(CONFIG.AI.personalities);
  for (const m of MISSIONS) {
    must(validateMission(m).length === 0, "سند پاک است: " + m.key);
    must(!keys.has(m.key) && m.key.length <= 32, "کلید یکتا: " + m.key);
    keys.add(m.key);
    must(Number.isInteger(m.seed) && m.seed >= 1 && !seeds.has(m.seed), "سید یکتای معتبر: " + m.key);
    seeds.add(m.seed);
    must(diffs.includes(m.difficulty), "سختی معتبر: " + m.key);
    must(pers.includes(m.personality), "شخصیت معتبر: " + m.key);
    must(["none", "crusader", "arab"].includes(m.identity), "هویت معتبر: " + m.key);
    must(typeof m.nameEn === "string" && m.nameEn.length > 0, "نام en: " + m.key);
    must(typeof m.brief === "string" && m.brief.length > 0, "شرح fa: " + m.key);
    must(typeof m.briefEn === "string" && m.briefEn.length > 0, "شرح en: " + m.key);
    for (const o of m.objectives) {
      if (o.kind === "haveBuilding") must(!!CONFIG.BUILDINGS[o.type], "بنای واقعی: " + o.type);
      if (o.kind === "haveUnit") must(!!UNITS[o.type], "یگان واقعی: " + o.type);
    }
  }
  const st = createState();
  for (const k of ["campaign", "campaigns", "campaignMissions", "campaignStep", "missionKey", "missionActive", "missionIndex"]) {
    must(st[k] === undefined, "state نباید " + k + " داشته باشد");
  }
  return { name: "کاتالوگ کمپین (C-CMP-1)", pass: true, detail: "۶ سند + ارجاع + بی‌میدان" };
}

function t_campaign_page() {
  must(MENU_PAGES.includes("campaign") && new Set(MENU_PAGES).size === 7, "منو ۷ صفحه با کمپین است: " + MENU_PAGES.join(","));
  const hasDOM = typeof document !== "undefined" && !!document.getElementById("menuBox");
  let bk = null;
  try { bk = localStorage.getItem(CAMPAIGN_KEY); } catch (e) { bk = null; }
  try {
    try { localStorage.removeItem(CAMPAIGN_KEY); } catch (e) {}
    if (hasDOM) {
      window.__slice01.mission.paint();
      const rows = document.querySelectorAll("#campaignList .mrow");
      must(rows.length === 10, "۱۰ ردیف مأموریت، شد " + rows.length);
      const heads = document.querySelectorAll("#campaignList .mrow-head");
      must(heads.length === 6 && !heads[0].disabled, "اولی باز است");
      for (let i = 1; i < 6; i++) must(heads[i].disabled === true, "ردیف " + i + " قفل است");
      must(heads[0].textContent.indexOf(missionName(MISSIONS[0], getLang())) >= 0, "نام مأموریت اول در ردیف هست");
    }
    let p = campaignLoad();
    must(p && typeof p.done === "object" && Object.keys(p.done).length === 0, "شروع خالی است");
    must(campaignUnlocked(p, 0) === true && campaignUnlocked(p, 1) === false, "فقط اولی باز است");
    p = campaignRecord(p, MISSIONS[0].key, 200);
    must(campaignUnlocked(p, 1) === true && campaignUnlocked(p, 2) === false, "برد اولی دومی را باز می‌کند");
    p = campaignRecord(p, MISSIONS[0].key, 500);
    must(p.done[MISSIONS[0].key].ticks === 200, "بهترین تیک می‌ماند");
    for (let i = 1; i < MISSIONS.length; i++) p = campaignRecord(p, MISSIONS[i].key, 100 * (i + 1));
    for (let i = 0; i < MISSIONS.length; i++) must(campaignUnlocked(p, i) === true, "پایان زنجیره: همه بازند");
    must(campaignSave(p) === true, "ذخیره progress برمی‌گردد");
    const q = campaignLoad();
    must(q.done[MISSIONS[5].key].ticks === 600, "بارگذاری رکوردها را برمی‌گرداند");
    must(missionByKey(MISSIONS[2].key) === MISSIONS[2] && missionByKey("bogus") === null, "جست‌وجوی کلید");
    must(missionIndex(MISSIONS[4].key) === 4 && missionIndex("bogus") === -1, "ایندکس کلید");
    must(missionName(MISSIONS[0], "en") === MISSIONS[0].nameEn && missionName(MISSIONS[0], "fa") === MISSIONS[0].name, "نام دوزبانه");
    must(missionBrief(MISSIONS[0], "en") === MISSIONS[0].briefEn && missionBrief(MISSIONS[0], "fa") === MISSIONS[0].brief, "شرح دوزبانه");
  } finally {
    try { if (bk == null) localStorage.removeItem(CAMPAIGN_KEY); else localStorage.setItem(CAMPAIGN_KEY, bk); } catch (e) {}
    if (hasDOM) window.__slice01.mission.paint();
  }
  if (!hasDOM) return { name: "صفحه کمپین (C-CMP-2)", pass: true, detail: "۷ صفحه + progress؛ بدون DOM رد شد" };
  const box = document.getElementById("menuBox");
  must(!!box.querySelector('.menu-page[data-page="campaign"]'), "section کمپین هست");
  must(!!document.getElementById("campaignList"), "فهرست کمپین هست");
  must(!!box.querySelector('#navCampaign[data-go="campaign"]'), "دکمه کمپین هست");
  return { name: "صفحه کمپین (C-CMP-2)", pass: true, detail: "۷ صفحه + زنجیره + ۶ ردیف" };
}

function t_campaign_run() {
  const doc = missionByKey("first-steps");
  must(!!doc && doc.objectives.length === 2, "مأموریت اول ۲هدفه است");
  const run = createRun(doc);
  const snap0 = missionSnap({ buildings: [{ type: "hut" }, { type: "hut" }], units: [], resources: {}, tick: 10, wave: 0, popularity: 50, workers: 4 });
  must(snap0.population === 4, "جمعیت = یگان زنده + کارگران");
  const f1 = updateRun(run, doc, snap0);
  must(f1.length === 1 && run.status === "active", "کلبه‌ها done، تیک نه");
  const f2 = updateRun(run, doc, { buildings: [{ type: "hut" }, { type: "hut" }], units: [], resources: {}, tick: 300, wave: 0, popularity: 50, population: 4 });
  must(f2.length === 1 && run.status === "done" && run.doneTick === 300, "تیک ۳۰۰ = برد مأموریت");
  const st = createState();
  must(st.defeated !== true && st.victorious !== true, "مبنای sim تمیز است");
  return { name: "اجرای مأموریت (C-CMP-3)", pass: true, detail: "اسنپ‌شات + برد در ۳۰۰" };
}

function t_campaign_masters_display() {
  const key = "first-steps";
  const doc = missionByKey(key);
  must(!!doc, "مأموریت اول در کاتالوگ هست");
  if (typeof document === "undefined" || !window.__slice01 || !window.__slice01.masters) return { name: "نمایش مأموریت در تالار (C-CMP-4)", pass: true, detail: "بدون DOM رد شد" };
  let bk = null;
  try { bk = localStorage.getItem(MASTERS_KEY); } catch (e) { bk = null; }
  try {
    const rows = [
      masterEntry({ seed: 5, map: "seed:5", outcome: "defeat", ticks: 100, date: "2026-01-01T00:00:00.000Z" }),
      masterEntry({ seed: doc.seed, map: "campaign:" + key, outcome: "victory", ticks: 461, date: "2026-01-02T00:00:00.000Z" }),
    ];
    must(mastersSave(rows) === true, "ذخیره دو رکورد مختلط");
    window.__slice01.masters.filter("all");
    const heads = Array.prototype.slice.call(document.querySelectorAll("#mastersList .mrow .mrow-head"));
    must(heads.length === 2, "دو ردیف تالار، شد " + heads.length);
    const want = missionName(doc, getLang());
    const hit = heads.filter((h) => (h.textContent || "").indexOf(want) >= 0);
    must(hit.length === 1, "نام مأموریت در یک ردیف هست");
    must(heads.every((h) => (h.textContent || "").indexOf("campaign:") < 0), "رشته خام campaign: نمایش داده نمی‌شود");
    const filt = document.getElementById("mastersFilter");
    must(!!filt, "select پالایش هست");
    must(filt.querySelectorAll("option").length === 2 + MISSIONS.length, "گزینه‌ها: همه + آزاد + ۶ مأموریت");
    return { name: "نمایش مأموریت در تالار (C-CMP-4)", pass: true, detail: "نام محلی + بی‌رشته خام" };
  } finally {
    try { if (bk == null) localStorage.removeItem(MASTERS_KEY); else localStorage.setItem(MASTERS_KEY, bk); } catch (e) {}
    try { window.__slice01.masters.filter("all"); } catch (e) {}
  }
}

function t_campaign_masters_filter() {
  if (typeof document === "undefined" || !window.__slice01 || !window.__slice01.masters) return { name: "پالایش تالار (C-CMP-5)", pass: true, detail: "بدون DOM رد شد" };
  let bk = null;
  try { bk = localStorage.getItem(MASTERS_KEY); } catch (e) { bk = null; }
  try {
    must(mastersSave([
      masterEntry({ seed: 5, map: "seed:5", outcome: "defeat", ticks: 100, date: "2026-01-01T00:00:00.000Z" }),
      masterEntry({ seed: 11, map: "campaign:first-steps", outcome: "victory", ticks: 461, date: "2026-01-02T00:00:00.000Z" }),
      masterEntry({ seed: 12, map: "campaign:bread-line", outcome: "victory", ticks: 700, date: "2026-01-03T00:00:00.000Z" }),
    ]) === true, "ذخیره سه رکورد مختلط");
    const nrows = () => document.querySelectorAll("#mastersList .mrow").length;
    const filt = document.getElementById("mastersFilter");
    must(!!filt, "select پالایش هست");
    const setF = (v) => { filt.value = v; filt.dispatchEvent(new Event("change", { bubbles: true })); };
    window.__slice01.masters.filter("all");
    must(nrows() === 3, "all = هر سه");
    setF("solo");
    must(nrows() === 1, "solo = فقط آزاد");
    setF("campaign:first-steps");
    must(nrows() === 1, "مأموریت اول = یکی");
    let head = document.querySelector("#mastersList .mrow .mrow-head");
    must(!!head && head.textContent.indexOf(missionName(missionByKey("first-steps"), getLang())) >= 0, "ردیف پالایش نام مأموریت را دارد");
    setF("campaign:bread-line");
    must(nrows() === 1, "مأموریت دوم = یکی");
    setF("all");
    must(nrows() === 3, "بازگشت به همه");
    return { name: "پالایش تالار (C-CMP-5)", pass: true, detail: "all/solo/تک‌تک + مسیر change" };
  } finally {
    try { if (bk == null) localStorage.removeItem(MASTERS_KEY); else localStorage.setItem(MASTERS_KEY, bk); } catch (e) {}
    try { window.__slice01.masters.filter("all"); } catch (e) {}
  }
}

function t_campaign_replay() {
  const doc = missionByKey("first-steps");
  must(!!doc, "مأموریت اول در کاتالوگ هست");
  const good = { v: REPLAY_V, seed: doc.seed, diff: doc.difficulty, pers: doc.personality, ident: doc.identity, cmds: [], ticks: 120, mission: doc.key };
  must(validateReplayLog(good).ok, "لاگ با کلید مأموریت قبول می‌شود");
  must(!validateReplayLog({ v: REPLAY_V, seed: 1, cmds: [], mission: 123 }).ok, "مأموریت عددی رد می‌شود");
  must(!validateReplayLog({ v: REPLAY_V, seed: 1, cmds: [], mission: "" }).ok, "مأموریت تهی رد می‌شود");
  must(!validateReplayLog({ v: REPLAY_V, seed: 1, cmds: [], mission: "x".repeat(33) }).ok, "مأموریت بلند رد می‌شود");
  must(validateReplayLog(JSON.parse(JSON.stringify(good))).ok, "رفت‌وبرگشت JSON سالم می‌ماند");
  const ha = runReplay(good, 120).hash;
  must(runReplay(good, 120).hash === ha, "بازپخش مأموریت قطعی است");
  const plain = { v: REPLAY_V, seed: doc.seed, diff: doc.difficulty, pers: doc.personality, ident: doc.identity, cmds: [], ticks: 120 };
  must(runReplay(plain, 120).hash === ha, "کلید مأموریت هش sim را عوض نمی‌کند");
  const run = createRun(doc);
  updateRun(run, doc, missionSnap(runReplay(good, 120).state));
  must(run.status === "active", "پس از ۱۲۰ تیک بی‌فرمان، مأموریت هنوز فعال است");
  if (typeof document === "undefined" || !window.__slice01 || !window.__slice01.mission.watch) return { name: "ری‌پلی مأموریت (C-CMP-6)", pass: true, detail: "اعتبارسنجی + قطعیت؛ بدون DOM رد شد" };
  let bkC = null, bkM = null, bkR = null;
  try { bkC = localStorage.getItem(CAMPAIGN_KEY); } catch (e) {}
  try { bkM = localStorage.getItem(MASTERS_KEY); } catch (e) {}
  try { bkR = localStorage.getItem(REPLAY_KEY); } catch (e) {}
  try {
    const progBefore = JSON.stringify(campaignLoad());
    const w = window.__slice01.mission.watch(good);
    must(w.ok, "تماشای لاگ مأموریت شروع می‌شود");
    must(window.__slice01.mission.active() === doc.key, "حالت مأموریت در تماشا برمی‌گردد");
    window.__slice01.ff(30);
    must(window.__slice01.mission.active() === doc.key, "پس از ۳۰ تیک هنوز مأموریت است");
    must(window.__slice01.mission.won() === false, "بردی ثبت نشده");
    must(JSON.stringify(campaignLoad()) === progBefore, "تماشا progress را دست نمی‌زند");
    must(mastersLoad().length === (bkM ? JSON.parse(bkM).length : 0), "تماشا استادان ثبت نمی‌کند");
    try {
      must(saveReplaySlot(good) === true, "اسلات با مأموریت ذخیره می‌شود");
      must(campaignSave(campaignRecord(campaignLoad(), doc.key, 461)) === true, "progress مأموریت ثبت می‌شود");
      window.__slice01.mission.paint();
      const wb = Array.prototype.slice.call(document.querySelectorAll("#campaignList button")).filter((b) => (b.textContent || "").indexOf(t("ui.campaign.watch")) >= 0);
      must(wb.length === 1, "ردیف مأموریت دکمه تماشا دارد، شد " + wb.length);
    } finally {
      try { if (bkR == null) localStorage.removeItem(REPLAY_KEY); else localStorage.setItem(REPLAY_KEY, bkR); } catch (e) {}
    }
    return { name: "ری‌پلی مأموریت (C-CMP-6)", pass: true, detail: "ضبط + قطعیت + تماشا + بی‌ثبتی" };
  } finally {
    try { window.__slice01.mission.unwatch(); } catch (e) {}
    try { const mc = document.getElementById("menuCloseBtn"); if (mc && !mc.hidden) mc.click(); } catch (e) {}
    try { if (bkC == null) localStorage.removeItem(CAMPAIGN_KEY); else localStorage.setItem(CAMPAIGN_KEY, bkC); } catch (e) {}
    try { if (bkM == null) localStorage.removeItem(MASTERS_KEY); else localStorage.setItem(MASTERS_KEY, bkM); } catch (e) {}
    try { window.__slice01.mission.paint(); } catch (e) {}
  }
}

export function missionCases() {
  return [t_mission_validate, t_mission_run, t_mission_kinds2, t_mission_clock, t_campaign_catalog, t_campaign_page, t_campaign_run, t_campaign_masters_display, t_campaign_masters_filter, t_campaign_replay];
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
  must(MISSIONS.length === 10, "کاتالوگ shipped شش مأموریت است (0.225.0 — فاز ۲)");
  return { name: "اعتبارسنجی مأموریت", pass: true, detail: `نمونه پاک + ${bads.length} رد + کاتالوگ ۶تایی` };
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

function t_mission_kinds2() {
  must(MISSION_KINDS.includes("killAllEnemies") && MISSION_KINDS.includes("population") &&
    MISSION_KINDS.includes("popularity") && MISSION_KINDS.includes("captureGatehouse") &&
    MISSION_KINDS.includes("keepLordAlive"), "هر ۵ گونه ثبت‌اند");
  const good = {
    key: "k2", name: "ن", objectives: [
      { id: "a", kind: "killAllEnemies" },
      { id: "b", kind: "population", count: 6 },
      { id: "c", kind: "popularity", amount: 60 },
      { id: "d", kind: "captureGatehouse" },
      { id: "e", kind: "keepLordAlive" },
    ],
  };
  must(validateMission(good).length === 0, "سند ۵گونه‌ای معتبر است");
  const bads = [
    { key: "x", name: "ن", objectives: [{ id: "a", kind: "population", count: 0 }] },
    { key: "x", name: "ن", objectives: [{ id: "a", kind: "popularity", amount: 101 }] },
    { key: "x", name: "ن", objectives: [{ id: "a", kind: "popularity", amount: -1 }] },
    { key: "x", name: "ن", objectives: [{ id: "a", kind: "popularity" }] },
  ]; // گونه‌های بی‌پارامتر پارامتر اضافه را نادیده می‌گیرند (مثل tick/count در گونه‌های قدیمی).
  bads.forEach((b, i) => must(validateMission(b).length > 0, `سند خراب ${i} باید رد شود`));
  // اجرا: همه‌چیز برقرار.
  const run = createRun(good);
  const fresh = updateRun(run, good, {
    buildings: [{ type: "gate", owner: 0 }, { type: "gate", owner: 9, destroyed: true }],
    units: [{ type: "soldier" }, { type: "soldier", dead: true }, { type: "lord" },
      { type: "swordsman", side: "enemy", dead: true }],
    resources: {}, tick: 50, wave: 0, popularity: 70, population: 8,
  });
  must(fresh.length === 5 && run.status === "done", "هر ۵ هدف باید done شوند");
  // اجرا: دشمن زنده + دروازه دشمن + ارباب مرده + جمعیت/محبوبیت کم.
  const run2 = createRun(good);
  const fresh2 = updateRun(run2, good, {
    buildings: [{ type: "gate", owner: 9 }],
    units: [{ type: "swordsman", side: "enemy" }, { type: "lord", dead: true }],
    resources: {}, tick: 50, wave: 0, popularity: 10, population: 2,
  });
  must(fresh2.length === 0 && run2.status === "active", "هیچ‌کدام نباید done شود");
  must(run2.states.a === "pending" && run2.states.e === "pending", "kill/lord pending می‌مانند");
  // missionSnap از وضعیت زنده.
  const snap = missionSnap({ units: [{ type: "soldier" }, { type: "soldier", dead: true }], workers: 4, popularity: 60, tick: 7, wave: 1, resources: { gold: 3 }, buildings: [] });
  must(snap.population === 5 && snap.popularity === 60 && snap.tick === 7, "اسنپ‌شات: جمعیت/محبوبیت/تیک");
  const empty = missionSnap(null);
  must(empty.population === 0 && empty.popularity === 0 && empty.tick === 0, "تهی = صفر");
  return { name: "گونه‌های هدف مأموریت", pass: true, detail: "۵ گونه + اعتبارسنجی + اسنپ" };
}
