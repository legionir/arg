// سیاست و برچسب پالت (0.244.0 — C-CLN-30): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// taxBtns/ratBtns/getState از بوت می‌آیند (همان الگوی warn.js)؛ sgn داخلی ماژول است.
import { t } from "./i18n.js";
import { faNum, buildingInfoHTML, unitInfoHTML } from "./format.js";
import { taxInfo, rationInfo, policySummary, eatMeter } from "./advisor.js";
import { CONFIG } from "./config.js";
import { UNITS } from "./combat.js";

function $(id) { return document.getElementById(id); }

const sgn = (n) => ((n >= 0 ? "+" : "") + faNum(n));

export function relabelPalette() {
  for (const btn of document.querySelectorAll("#buildPal [data-b]")) {
    const def = CONFIG.BUILDINGS[btn.dataset.b];
    const info = btn.querySelector(".binfo");
    if (def && info) info.innerHTML = buildingInfoHTML(btn.dataset.b, def);
  }
  for (const btn of document.querySelectorAll("#unitPal [data-u]")) {
    const def = UNITS[btn.dataset.u];
    const info = btn.querySelector(".binfo");
    if (def && info) info.innerHTML = unitInfoHTML(def);
  }
}

export function createPolicyPainters({ taxBtns, ratBtns, getState }) {
  function paintPolicyTips() {
    for (const b of taxBtns) {
      const i = taxInfo(b.dataset.tax);
      b.title = i ? t("main.policy.taxTip", { name: i.name, gold: sgn(i.goldPerWorker), pop: sgn(i.pop) }) : "";
    }
    for (const b of ratBtns) {
      const i = rationInfo(b.dataset.rat);
      b.title = i ? t("main.policy.ratTip", { name: i.name, mult: faNum(i.foodNum / 2), pop: sgn(i.pop) }) : "";
    }
  }
  function paintPolicyLine(slot) {
    const el = $("policyEl");
    if (!el) return;
    const s = policySummary(getState(), slot);
    el.textContent = t("main.policy.summary", {
      tax: s.tax.name, gold: sgn(s.tax.goldPerWorker), tpop: sgn(s.tax.pop),
      rat: s.rations.name, mult: faNum(s.rations.foodNum / 2), rpop: sgn(s.rations.pop),
      types: faNum(s.food.types), fpop: sgn(s.food.bonus),
      winn: faNum(s.inn.working), tinn: faNum(s.inn.total), bar: faNum(s.inn.barrels), cov: faNum(s.inn.coverage),
      ibonus: sgn(s.inn.bonus), drunk: faNum(s.inn.drunkards),
      blw: faNum(s.religion.working), blt: faNum(s.religion.total), blcov: faNum(s.religion.coverage), blbonus: sgn(s.religion.bonus),
      flv: sgn(s.fear.level),
      fup: s.fear.next.up == null ? "—" : faNum(s.fear.next.up),
      fdn: s.fear.next.down == null ? "—" : faNum(s.fear.next.down),
      meter: eatMeter(s.eat.prog),
      stock: faNum(s.stores.stock),
      lasts: s.stores.lastsMin == null ? "—" : faNum(Math.round(s.stores.lastsMin * 10) / 10),
      trGold: faNum(s.treasury.balance),
      trRate: sgn(s.treasury.perMin),
    });
  }
  return { relabelPalette, paintPolicyTips, paintPolicyLine };
}
