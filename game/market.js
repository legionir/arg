// بازار خرید/فروش منابع (0.64.0 — ب-۳ بک‌لاگ).
// قرارداد:
// - ارز واسط طلاست؛ طلا خودش قابل‌معامله نیست. نرخ‌ها در CONFIG.MARKET
//   (buy = بهای خرید ۱ واحد، sell = دریافتی فروش ۱ واحد، همیشه sell ≤ buy).
// - معامله فقط با بازار سالم خودی (نیمه‌کاره نه — مثل سربازخانه/گاریسون).
// - بسته ثابت lot در هر فرمان؛ سمت هزینه باید کامل پوشش دهد، سمت دریافتی
//   با سقف جاری تراشیده می‌شود ولی هزینه متناسب کم می‌شود (اتلاف نیست):
//   ‏n = min(lot, استطاعت, جا)؛ n ≤ ۰ = رد تمیز (نه throw).
// - قطعی و صحیح: فقط ریاضی صحیح روی منابع؛ هش جدا نمی‌خواهد (منابع از قبل
//   در stateHash‌اند)؛ ذخیره جدا نمی‌خواهد (فیلد تازه‌ای نیست)؛ AI معامله
//   نمی‌کند (فقط بازیکن — تصمیم ثبت‌شده).
import { t } from "./i18n.js";
import { lazyTable } from "./lazytext.js";
import { CONFIG } from "./config.js";
import { capFor } from "./economy.js";
import { underConstruction } from "./construction.js";

export const TRADE_FA = lazyTable("game.trade", ["INVALID", "NOT_OWNED", "NO_MARKET", "UNDER_CONSTRUCTION", "NO_GOLD", "NO_STOCK", "NO_SPACE", "UNKNOWN"]);

function tradeRes(state, owner) {
  const mp = state.mp && state.mp.enabled;
  const ow = owner == null ? 0 : owner;
  if (mp) return state.mpres && state.mpres[ow] ? state.mpres[ow].resources : null;
  if (ow === CONFIG.AI.owner && state.ai) return state.ai.resources;
  return state.resources;
}

// بازار سالمِ مالک (نیمه‌کاره حساب نیست) — دروازه معامله.
export function marketOf(state, owner) {
  const ow = owner == null ? 0 : owner;
  return state.buildings.find((b) =>
    b.type === "market" && !b.destroyed && !underConstruction(b) &&
    (b.owner == null ? 0 : b.owner) === ow) || null;
}

export function hasMarket(state, owner) {
  return !!marketOf(state, owner);
}

// پیش‌فاکتور خالص و تست‌پذیر: {n, pay, gain} یا {ok:false, reason}.
export function tradeQuote(state, res, dir, owner) {
  const ow = owner == null ? 0 : owner;
  const M = CONFIG.MARKET;
  const lot = (M && M.lot) || 10;
  if ((dir !== "buy" && dir !== "sell") || typeof res !== "string") {
    return { ok: false, reason: "INVALID" };
  }
  const rate = M && M.rates && M.rates[res];
  if (!rate) return { ok: false, reason: "UNKNOWN" };
  const b = state.buildings.find((x) =>
    x.type === "market" && !x.destroyed && (x.owner == null ? 0 : x.owner) === ow);
  if (!b) return { ok: false, reason: "NO_MARKET" };
  if (underConstruction(b)) return { ok: false, reason: "UNDER_CONSTRUCTION" };
  const bag = tradeRes(state, ow);
  if (!bag) return { ok: false, reason: "INVALID" };
  if (dir === "buy") {
    const afford = Math.floor((bag.gold || 0) / rate.buy);
    const space = capFor(state, res, ow) - (bag[res] || 0);
    const n = Math.min(lot, afford, space);
    if (n <= 0) return { ok: false, reason: afford <= 0 ? "NO_GOLD" : "NO_SPACE" };
    return { ok: true, reason: "OK", n, pay: { gold: n * rate.buy }, gain: { [res]: n } };
  }
  const have = bag[res] || 0;
  const room = Math.floor((capFor(state, "gold", ow) - (bag.gold || 0)) / rate.sell);
  const n = Math.min(lot, have, room);
  if (n <= 0) return { ok: false, reason: have <= 0 ? "NO_STOCK" : "NO_SPACE" };
  return { ok: true, reason: "OK", n, pay: { [res]: n }, gain: { gold: n * rate.sell } };
}

export function validateTrade(state, res, dir, owner) {
  const q = tradeQuote(state, res, dir, owner);
  return q.ok ? { ok: true, reason: "OK" } : q;
}

// اجرای معامله (از صف سولو یا ورودی MP — هر دو همین را صدا می‌زنند).
export function applyTrade(state, res, dir, owner) {
  const q = tradeQuote(state, res, dir, owner);
  if (!q.ok) return q;
  const bag = tradeRes(state, owner == null ? 0 : owner);
  for (const k of Object.keys(q.pay)) bag[k] = (bag[k] || 0) - q.pay[k];
  for (const k of Object.keys(q.gain)) {
    bag[k] = Math.min(capFor(state, k, owner == null ? 0 : owner), (bag[k] || 0) + q.gain[k]);
  }
  return { ok: true, reason: "OK", n: q.n };
}
