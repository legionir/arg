// پنل دشمن 0.274.0: نگاشت پادشاه + داده پنل + فیلتر کاروان — خالص، هم‌زمان.
import { CONFIG } from "../config.js";
import { t, withLang } from "../i18n.js";
import { must, fresh, mpFresh, aiFreshPers } from "./fixtures.js";
import { foeKingFor, foePanelData, isCaravanMsg, PERSONALITY_LORD } from "../foeinfo.js";
import { UNITS } from "../combat.js";

function foeCases() {
  return [t_foe_ai_king, t_foe_ai_fallback, t_foe_mp_king, t_foe_none, t_foe_panel_unit, t_foe_panel_bld, t_caravan_filter];
}

function t_foe_ai_king() {
  const { state } = aiFreshPers("rat");
  const k = foeKingFor(state, null, 9);
  must(k && k.kind === "ai", "مالک ۹ سولو = پادشاه AI");
  must(k.name === CONFIG.AI.personalities.rat.name, "نام موش");
  must(k.logo === PERSONALITY_LORD.rat, "پرتره موش از نگاشت");
  must(typeof k.desc === "string" && k.desc.length > 0, "شرح شخصیت");
  return { name: "پادشاه AI موش", pass: true, detail: "ow=9 rat" };
}

function t_foe_ai_fallback() {
  const { state } = aiFreshPers("wolf");
  state.ai.personality = "nope";
  const k = foeKingFor(state, null, 9);
  must(k && k.name === CONFIG.AI.personalities.wolf.name, "شخصیت نامعتبر = گرگ خنثی");
  must(k.logo === PERSONALITY_LORD.wolf, "پرتره گرگ");
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
  must((() => { const k = foeKingFor(state, null, 9); return k && k.name === CONFIG.AI.personalities.wolf.name; })(), "مالک ۹ سولو = گرگ پیش‌فرض");
  must(foePanelData(state, null, null) === null, "foe خالی = null");
  must(foePanelData(state, null, { kind: "unit", id: 424242 }) === null, "آیتم رفته = null");
  return { name: "بی‌پادشاه", pass: true, detail: "موج/خالی" };
}

function t_foe_panel_unit() {
  const { state } = aiFreshPers("saladin");
  const u = { id: 501, type: "swordsman", side: "enemy", owner: 9, dead: false, hp: 40, maxHp: 50, stance: "engage", x: 5, r: 5 };
  state.units.push(u);
  const d = foePanelData(state, null, { kind: "unit", id: 501 });
  must(d && d.title === CONFIG.AI.personalities.saladin.name, "عنوان = نام صلاح‌الدین");
  must(d.logoSrc.indexOf("Saladin.png") >= 0, "پرتره صلاح‌الدین");
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
