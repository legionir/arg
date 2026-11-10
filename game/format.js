// قالب‌بندی پالت/کارت‌ها (0.237.0 — C-CLN-9): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// خالص نمایشی: همه وابستگی‌ها import سطح‌بالا یا ثابت‌های منتقل‌شونده‌اند؛ renderer/PALETTE در boot ماندند.
import { CONFIG } from "./config.js";
import { RATES, HUT_HOUSING, INN, RELIGION, RELIGION_TYPES, millSupport } from "./economy.js";
import { isGarrisonPost, garrisonCapFor, DOGS_PER_CAGE, HORSES_PER_STABLE, soldierValue } from "./combat.js";
import { iconSrc } from "./sprites.js";
import { t, getLang } from "./i18n.js";

  // پالت ساختمان/مزدور (0.23.2): کارت‌واره — تصویر + آیکون هزینه از داده‌ها.
export const FA_D = "۰۱۲۳۴۵۶۷۸۹";
export function faNum(n) {
    if (getLang() !== "fa") return String(n);
    return String(n).replace(/\./g, "٫").replace(/\d/g, (d) => FA_D[d]);
  }
export function escName(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
export const okB = (s) => `<b class="ok">${s}</b>`;
export const badB = (s) => `<b class="bad">${s}</b>`;
export function resName(key) {
    const r = CONFIG.RESOURCES.find((x) => x.key === key);
    return r ? r.name : key;
  }
export function costHTML(cost) {
    const ks = Object.keys(cost || {});
    if (!ks.length) return `<span class="free">${t("main.cost.free")}</span>`;
    return ks.map((k) =>
      `<span><img src="${iconSrc(k)}" alt="${resName(k)}">${faNum(cost[k])}</span>`).join("");
  }
export function buildingMeta(key, def) {
    const parts = [];
    const rate = RATES[key];
    if (rate && rate.workers) parts.push(t("main.meta.workers", { n: rate.workers, num: faNum(rate.workers) }));
    if (def.buildTime > 0) parts.push(t("main.meta.build", { n: faNum(Math.ceil(def.buildTime / 10)) }));
    if (rate && rate.produces && !rate.consumes) {
      parts.push(t("main.meta.perMin", { res: resName(rate.produces), n: faNum(Math.round((rate.amount * 600) / rate.everyTicks)) }));
    }
    if (rate && rate.consumes) {
      const ck = Object.keys(rate.consumes)[0];
      parts.push(t("main.meta.convert", { a: faNum(rate.consumes[ck]), r1: resName(ck), b: faNum(rate.amount), r2: resName(rate.produces) }));
    }
    if (key === "hut") parts.push(t("main.meta.housing", { n: faNum(HUT_HOUSING) }));
    if (key === "mill") { const ms = millSupport(); parts.push(t("main.meta.millSupport", { b: faNum(ms.bakers), f: faNum(ms.farms) })); }
    if (def.weapon) parts.push(t("main.meta.range", { n: faNum(def.weapon.range) }));
    if (isGarrisonPost(key)) parts.push(t("main.meta.towerGarrison", { n: faNum(garrisonCapFor(key)) }));
    if (def.rules && def.rules.spacingFromSame) parts.push(t("main.meta.spacing"));
    if (def.rules && def.rules.anchorToAny) parts.push(t("main.meta.anchor"));
    if (def.rules && def.rules.anchorToSame) parts.push(t("main.meta.anchorSame"));
    if (key === "gate") parts.push(t("main.meta.gate"));
    if (key === "inn") parts.push(t("main.meta.inn", { one: faNum(1), ticks: faNum(INN.beerEveryTicks), pop: faNum(INN.fullBonus), keepers: faNum(INN.keepers) }));
    if (RELIGION_TYPES.includes(key)) parts.push(t("main.meta.religion", { n: faNum(RELIGION[key]), keepers: faNum(RELIGION.priests) }));
    if (def.fearGood) parts.push(t("main.meta.fearGood", { n: faNum(def.fearGood) }));
    if (def.fearBad) parts.push(t("main.meta.fearBad", { n: faNum(def.fearBad) }));
    if (key === "barracks") { parts.push(t("main.meta.barracksReq")); parts.push(t("main.meta.onlyOne")); }
    if (key === "mercpost") { parts.push(t("main.meta.mercpost")); parts.push(t("main.meta.onlyOne")); }
    if (key === "engineerguild" || key === "tunnelerguild") { parts.push(t("main.meta.guild")); parts.push(t("main.meta.onlyOne")); }
    if (key === "stable") { parts.push(t("main.meta.stable", { n: faNum(HORSES_PER_STABLE) })); parts.push(t("main.meta.onlyOne")); }
    if (key === "market") { parts.push(t("main.meta.marketTrade")); parts.push(t("main.meta.marketClick")); }
    if (key === "oxtether") parts.push(t("main.meta.oxtether"));
    if (key === "apothecary") parts.push(t("main.meta.apothecary"));
    if (key === "signpost") parts.push(t("main.meta.signpost"));
    if (key === "well") parts.push(t("main.meta.well", { n: faNum(def.extinguish || 10) }));
    if (key === "waterpot") parts.push(t("main.meta.waterpot", { n: faNum(def.extinguish || 14) }));
    if (key === "quarry") parts.push(t("main.meta.quarryNeedsOx"));
    if (key === "stockpile") parts.push(t("main.meta.stockpile"));
    if (key === "granary") parts.push(t("main.meta.granary"));
    if (key === "tannery") parts.push(t("main.meta.tannery"));
    if (key === "dogcage") parts.push(t("main.meta.dogcage", { n: faNum(DOGS_PER_CAGE) }));
    return parts.join(" • ");
  }
  // برچسب منبع اعداد (0.41.0 — #۵ از FEATURES): مرجع استخراج‌شده یا حدس وب.
export function srcTag(def) {
    const s = (def && def.source) || "guess";
    return s.startsWith("reference:") ? t("main.src.ref") : t("main.src.guess");
  }
export function unitMeta(def) {
    const parts = [t("main.meta.hp", { n: faNum(def.hp) })];
    parts.push(def.range > 2 ? t("main.meta.range", { n: faNum(def.range) }) : t("main.meta.damage", { n: faNum(def.dmg) }));
    parts.push(t("main.meta.armor", { n: faNum(def.armor || 0) }));
    parts.push(srcTag(def));
    if (def.requiresWeapon === "swords") parts.push(t("main.meta.sword"));
    else if (def.requiresWeapon === "bows") parts.push(t("main.meta.bow"));
    if (def.trainTicks) parts.push(t("main.meta.train", { n: faNum(Math.ceil(def.trainTicks / 10)) })); // (0.65.0 — صف آموزش)
    if (def.siege) parts.push(t("main.meta.siege", { n: faNum(def.bonusVsBld || 1) }));
    if (def.needsDeploy) parts.push(t("main.meta.needsDeploy"));
    if (def.minRange) parts.push(t("main.meta.minRange", { n: faNum(def.minRange) }));
    if (def.requires === "barracks") parts.push(t("main.meta.needsBarracks"));
    if (def.merc === true) parts.push(t("main.meta.merc", { n: faNum(def.mercGold) }));
    if (def.requires === "engineerguild" || def.requires === "tunnelerguild") parts.push(t("main.meta.guildunit", { n: faNum((def.cost && def.cost.gold) || 0) }));
    if (def.requiresHorse) parts.push(t("main.meta.horse"));
    const sv = def.id ? soldierValue(def.id) : null; // ارزش سرباز (0.178.0 — بند 869)
    if (sv != null) parts.push(t("main.meta.value", { n: faNum(sv) }));
    return parts.join(" • ");
  }
export function buildingInfoHTML(key, def) {
    return `<span class="bname">${def.name} <i>${faNum(def.w)}×${faNum(def.h)}</i></span>` +
      `<span class="bcost">${costHTML(def.cost)}</span>` +
      `<span class="bmeta">${buildingMeta(key, def)}</span>`;
  }
export function unitInfoHTML(def) {
    return `<span class="bname">${def.name}</span>` +
      `<span class="bcost">${costHTML(def.cost)}</span>` +
      `<span class="bmeta">${unitMeta(def)}</span>`;
  }