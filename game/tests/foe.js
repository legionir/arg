// پنل دشمن 0.274.0: نگاشت پادشاه + داده پنل + فیلتر کاروان — خالص، هم‌زمان.
import { CONFIG } from "../config.js";
import { t, withLang } from "../i18n.js";
import { must, fresh, mpFresh, aiFreshPers } from "./fixtures.js";
import { foeKingFor, foePanelData, isCaravanMsg, PERSONALITY_LORD } from "../foeinfo.js";
import { UNITS } from "../combat.js";
import { rivalCardData, rivalLine } from "../rivalcard.js";
import { endSummary, endSummaryHTML } from "../endsummary.js";
import { shouldWelcome, WELCOME_KEY } from "../welcome.js";

function foeCases() {
  return [t_foe_ai_king, t_foe_ai_fallback, t_foe_mp_king, t_foe_none, t_foe_panel_unit, t_foe_panel_bld, t_caravan_filter, t_rival_card, t_end_summary, t_welcome, t_mid_goals, t_rival_lines];
}

// کارت حریف صفحه راه‌اندازی (0.281.0): هر هفت فرمانروا پرتره یکتا + جمله دوزبانه دارند.
function t_rival_card() {
  const faces = new Set();
  for (const k of Object.keys(CONFIG.AI.personalities)) {
    const c = rivalCardData(k);
    must(c.key === k && c.name.length > 0 && c.desc.length > 0, "نام/منش " + k);
    must(c.quote.length > 8 && c.quote.indexOf("game.personality") < 0, "جمله فارسی " + k);
    const en = withLang("en", () => rivalCardData(k));
    must(en.quote.length > 8 && en.quote !== c.quote && en.quote.indexOf("game.personality") < 0, "جمله انگلیسی " + k);
    must(c.face.indexOf("assets/portraits/" + k + ".svg") === 0, "پرتره " + k);
    faces.add(c.face);
  }
  must(faces.size === 7, "هفت پرتره یکتا");
  must(rivalCardData("nope").key === CONFIG.AI.defaultPersonality, "شناسه نامعتبر = پیش‌فرض");
  return { name: "t_rival_card", pass: true, detail: "۷ فرمانروا × (نام/منش/جمله fa+en/پرتره)" };
}

// خلاصه پایان بازی (0.283.0): شمارش خودی‌ها (نه بنای حریف) + ساعت + HTML پنج‌ردیفه.
function t_end_summary() {
  const { state } = aiFreshPers("artan");
  state.tick = 1250;
  const s = endSummary(state, 0);
  must(s.time === "02:05", "ساعت ۱۲۵ ثانیه = 02:05، شد " + s.time);
  const all = state.buildings.filter((b) => !b.destroyed).length;
  must(all >= 1 && s.buildings < all, "بنای حریف شمرده نمی‌شود: " + s.buildings + "/" + all);
  must(s.units >= 0 && s.popularity >= 0, "اعداد نامنفی");
  must((endSummaryHTML(state, 0).match(/<li>/g) || []).length === 5, "پنج ردیف");
  return { name: "t_end_summary", pass: true, detail: "ساعت + شمارش خودی + ۵ ردیف" };
}

// خوش‌آمد نخستین نبرد (0.284.0): فقط بار اول، هرگز در ?test، خطای حافظه = نمایش نده.
function t_welcome() {
  must(shouldWelcome(() => null, "") === true, "بار اول نشان بده");
  must(shouldWelcome((k) => (k === WELCOME_KEY ? "1" : null), "") === false, "دیده‌شده = نه");
  must(shouldWelcome(() => null, "?lang=fa&test") === false, "در آزمون نه");
  must(shouldWelcome(() => { throw new Error("x"); }, "") === false, "حافظه خراب = نه");
  for (const k of ["title", "story", "s1", "s2", "s3", "controls", "ok"]) {
    must(t("ui.welcome." + k).indexOf("ui.welcome") < 0 && withLang("en", () => t("ui.welcome." + k)) !== t("ui.welcome." + k), "متن دوزبانه " + k);
  }
  return { name: "t_welcome", pass: true, detail: "گیت نمایش + ۷ متن دوزبانه" };
}

function t_foe_ai_king() {
  const { state } = aiFreshPers("kahbod");
  const k = foeKingFor(state, null, 9);
  must(k && k.kind === "ai", "مالک ۹ سولو = پادشاه AI");
  must(k.name === CONFIG.AI.personalities.kahbod.name, "نام موش");
  must(k.logo === PERSONALITY_LORD.kahbod, "پرتره موش از نگاشت");
  must(typeof k.desc === "string" && k.desc.length > 0, "شرح شخصیت");
  return { name: "پادشاه AI موش", pass: true, detail: "ow=9 rat" };
}

function t_foe_ai_fallback() {
  const { state } = aiFreshPers("artan");
  state.ai.personality = "nope";
  const k = foeKingFor(state, null, 9);
  must(k && k.name === CONFIG.AI.personalities.artan.name, "شخصیت نامعتبر = گرگ خنثی");
  must(k.logo === PERSONALITY_LORD.artan, "پرتره گرگ");
  return { name: "پادشاه AI پیش‌فرض", pass: true, detail: "گرگ خنثی" };
}

function t_foe_mp_king() {
  const { state } = mpFresh(2);
  const sess = { slot: 0, names: ["A", "B"], logos: [3, 7] };
  const k = foeKingFor(state, sess, 1);
  must(k && k.kind === "mp" && k.name === "B" && k.logo === 7, "اسلات حریف = نام/لوگوی نشست");
  must(foeKingFor(state, sess, 0) === null, "اسلات خودی پادشاه نیست");
  must(foeKingFor(state, sess, 9) === null, "مالک ۹ در MP پادشاه نیست");
  return { name: "پادشاه MP", pass: true, detail: "نام/لوگوی نشست" };
}

function t_foe_none() {
  const { state } = fresh();
  must(foeKingFor(state, null, 0) === null, "مالک ۰ سولو پادشاه نیست (موج)");
  must((() => { const k = foeKingFor(state, null, 9); return k && k.name === CONFIG.AI.personalities.artan.name; })(), "مالک ۹ سولو = گرگ پیش‌فرض");
  must(foePanelData(state, null, null) === null, "foe خالی = null");
  must(foePanelData(state, null, { kind: "unit", id: 424242 }) === null, "آیتم رفته = null");
  return { name: "بی‌پادشاه", pass: true, detail: "موج/خالی" };
}

function t_foe_panel_unit() {
  const { state } = aiFreshPers("azarm");
  const u = { id: 501, type: "swordsman", side: "enemy", owner: 9, dead: false, hp: 40, maxHp: 50, stance: "engage", x: 5, r: 5 };
  state.units.push(u);
  const d = foePanelData(state, null, { kind: "unit", id: 501 });
  must(d && d.title === CONFIG.AI.personalities.azarm.name, "عنوان = نام صلاح‌الدین");
  must(d.logoSrc.indexOf("azarm.svg") >= 0, "پرتره صلاح‌الدین");
  must(d.itemName.indexOf(UNITS.swordsman.name) >= 0, "نام یگان در آیتم");
  must(d.hpText.indexOf("۴۰") >= 0 || d.hpText.indexOf("40") >= 0, "جان ۴۰/۵۰");
  u.dead = true;
  must(foePanelData(state, null, { kind: "unit", id: 501 }) === null, "یگان مرده = null");
  return { name: "پنل یگان دشمن", pass: true, detail: "صلاح‌الدین" };
}

function t_foe_panel_bld() {
  const { state } = fresh();
  const b = { id: 601, type: "hut", owner: 0, destroyed: false, hp: 30, maxHp: 60, buildLeft: 0 };
  state.buildings.push(b);
  const d = foePanelData(state, null, { kind: "bld", id: 601 });
  must(d && d.title === CONFIG.BUILDINGS.hut.name, "بی‌پادشاه: عنوان = نام بنا");
  must(d.logoSrc === "", "موج: بی‌پرتره");
  must(d.tag === t("ui.foe.wave"), "برچسب موج دشمن");
  b.destroyed = true;
  must(foePanelData(state, null, { kind: "bld", id: 601 }) === null, "بنای ویران = null");
  return { name: "پنل بنای دشمن", pass: true, detail: "موج" };
}

function t_caravan_filter() {
  must(isCaravanMsg(withLang("fa", () => t("game.ev.caravan"))), "کاروان فارسی شناخته می‌شود");
  must(isCaravanMsg(withLang("en", () => t("game.ev.caravan"))), "کاروان انگلیسی شناخته می‌شود");
  must(!isCaravanMsg("آرامش…"), "پیام عادی کاروان نیست");
  must(!isCaravanMsg(""), "رشته خالی کاروان نیست");

  return { name: "فیلتر کاروان", pass: true, detail: "fa/en" };
}
export { foeCases };

// T14 (0.289.0): هدف‌های میان‌مدت، هشدار یورش نزدیک و شرط برد — خالص.
import { MID_GOALS, nextGoal, raidEta, hintBuilding as hb14 } from "../hints.js";
import { aiRaidPlan as plan14 } from "../ai.js";
function t_mid_goals() {
  const st = { buildings: [], units: [], tick: 0 };
  must(nextGoal(st) === "ui.goal.granary", "هدف اول انبار غذاست");
  must(hb14("ui.goal.bread") === "bakery" && hb14("ui.goal.army") === null, "نگاشت هدف به کارت");
  const add = (type, n = 1) => { for (let i = 0; i < n; i++) st.buildings.push({ type, hp: 1, maxHp: 1 }); };
  add("granary"); add("wheatfarm"); add("mill");
  must(nextGoal(st) === "ui.goal.bread", "زنجیره نان بدون نانوایی کامل نیست");
  add("bakery"); add("market"); add("wall", 8);
  must(nextGoal(st) === "ui.goal.walls", "دیوار بدون دروازه بسته نیست");
  add("gate"); add("armoury"); add("chapel");
  must(nextGoal(st) === "ui.goal.army", "لشکر هشت‌نفره");
  for (let i = 0; i < 8; i++) st.units.push({ type: "spearman", side: "player" });
  must(nextGoal(st) === null, "همه هدف‌ها برآورده");
  for (const lang of ["fa", "en"]) for (const g of MID_GOALS) must(withLang(lang, () => t("ui.goal." + g.key)).indexOf("ui.goal") < 0, "متن " + lang + " " + g.key);
  const ai = { active: true, dormant: false, raidsSent: 0, difficulty: "normal" };
  const at = plan14(ai, 0).at;
  must(raidEta({ ai, tick: at - 2000 }) === null, "دور: بدون هشدار");
  must(raidEta({ ai, tick: at - 450 }) === 50, "۴۵ ثانیه → گرد به ۵۰");
  must(raidEta({ ai, tick: at + 5 }) === null, "گذشته: بدون هشدار");
  must(raidEta({ ai: { ...ai, dormant: true }, tick: at - 100 }) === null, "حریف خاموش");
  must(raidEta({ ai, tick: at - 100, mp: { enabled: true } }) === null, "چندنفره");
  must(raidEta({ ai: { ...ai, raidsSent: 99 }, tick: 0 }) === null, "یورشی نمانده");
  must(!!document.getElementById("raidEl") && !!document.getElementById("winEl"), "عنصرهای هشدار و شرط برد");
  return { name: "t_mid_goals", pass: true, detail: "۷ هدف + هشدار یورش" };
}

// T14 (0.291.0): جمله‌ی فرمانروا هنگام یورش/شکست/پیروزی برای هر هفت نفر و هر دو زبان.
function t_rival_lines() {
  for (const k of Object.keys(CONFIG.AI.personalities)) {
    for (const kind of ["raid", "lose", "win"]) {
      for (const lang of ["fa", "en"]) {
        const line = withLang(lang, () => rivalLine({ ai: { active: true, personality: k } }, kind));
        must(line && line.indexOf("game.personality") < 0, k + "." + kind + " " + lang);
      }
    }
  }
  must(rivalLine({ ai: { active: false } }, "raid") === "", "حریف خاموش = بی‌جمله");
  must(rivalLine({ ai: { active: true }, mp: { enabled: true } }, "win") === "", "چندنفره = بی‌جمله");
  must(!!document.getElementById("defeatLord") && !!document.getElementById("victoryLord"), "جای جمله روی بنرها");
  return { name: "t_rival_lines", pass: true, detail: "۷ فرمانروا × ۳ جمله × ۲ زبان" };
}
