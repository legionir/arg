// پنل‌های نوار ساختمان (0.255.0 — C-CLN-63): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { CONFIG } from "./config.js";
import { UNITS, FINAL_WAVE, HIRE_FA, ORDER_KIND_FA, STANCE_FA, buildingInfo, guardPost, guildOf, hasBarracks, hasCathedral, hasStable, isCowSiege, mercpostOf, peaceActive, stableWithHorse, waveTimeline } from "./combat.js";
import { FOOD_TYPES, herdCows, netPerMinute, popTarget, taxIndex, capFor } from "./economy.js";
import { foodReport, approxRes } from "./advisor.js";
import { tradeQuote, TRADE_FA, marketSelected, tradeLocked } from "./market.js";
import { t } from "./i18n.js";
import { foePanelData, isCaravanMsg } from "./foeinfo.js";
import { faNum, escName, resName } from "./format.js";
import { iconSrc } from "./sprites.js";
import { REASON_FA, keepLocked } from "./construction.js";
import { TAX_IDS } from "./data.js";
import { armyBreakdown, pruneSet, resolveSet } from "./selection.js";
import { clockText } from "./missions.js";
import { hintBuilding, nextHint, nextGoal, raidEta } from "./hints.js";
import { missionByKey, missionOutro } from "./campaign.js";
import { getLang } from "./i18n.js";
import { endSummaryHTML } from "./endsummary.js";

function $(id) { return document.getElementById(id); }

export function createPanelUI({ getState, getMpSession, getReplayWatch, getSound, playerCmd, mpSend, viewSlotOf, getExactRes, getLastHintKey, setLastHintKey, getMclockStart, getMpDesync, getPendingKind, setPendingKind, getSelBldId, setSelBldId, getSelIds, setSelIds, getSelectedKey, getSelectedUnit, getSelFoe, setSelFoe, later, alarmBtn, battleEl, defeatBanner, defeatRestartBtn, demolishBtn, loadBtn, mclockEl, mpRosterHTML, online, orderSels, paintScribe, pauseBtn, placedEl, policy, popEl, ratBtns, rejectedEl, repairBtn, resEl, saveBtn, speedBtn, taxBtns, taxSlider, victoryBanner, victoryRestartBtn, waveBtn, waveTimelineEl, workersEl }) {
  // پنل بازار (0.64.0 — ب-۳): ردیف زنده هر منبع قابل‌معامله — موجودی + نرخ
  // ردیف‌های توقف/شروع مصرف غذا (فاز ۱ بند ۸۵): هر نوع غذا با موجودی و وضعیت
  // روشن/خاموش؛ کلیک همان فرمان food را می‌فرستد (MP هم). فقط view.
  function paintGranary() {
    const o = $("granaryOverlay"), box = $("foodRows");
    if (!o || !box || o.hidden || granaryFor == null) return;
    const slot = viewSlotOf(getMpSession());
    const ec = getMpSession() ? getState().mpres[slot] : getState();
    const off = (ec && ec.offFood) || [];
    const rep = foodReport(getState(), slot);
    const repLasts = rep.lastsMin == null ? "—" : faNum(Math.round(rep.lastsMin * 10) / 10);
    let html = `<div class="lbl">${t("ui.granary.report", { total: faNum(rep.total), lasts: repLasts, types: faNum(rep.types) })}</div>`;
    html += `<div class="lbl">${t("ui.granary.foods")}</div>`;
    for (const k of FOOD_TYPES) {
      const on = !off.includes(k);
      html += `<div class="mrow${on ? "" : " sel"}" data-food="${k}"><span class="mname" title="${t("main.food.tip", { name: resName(k) })}">${resName(k)} <b>${faNum((ec.resources[k] || 0))}</b></span>` +
        `<span>${on ? t("main.food.on") : t("main.food.off")}</span></div>`;
    }
    box.innerHTML = html;
  }
  // + دکمه خرید/فروش بسته‌ای (وضعیت دکمه از پیش‌فاکتور همان تیک).
  function paintMarket() {    const o = $("marketOverlay"), rows = $("marketRows");
    if (!o || !rows || o.hidden || marketFor == null) return;
    const slot = viewSlotOf(getMpSession());
    const ec = getMpSession() ? getState().mpres[slot] : getState();
    const M = CONFIG.MARKET;
    for (const b of o.querySelectorAll("[data-mtab]")) b.classList.toggle("sel", b.dataset.mtab === marketTab);
    const list = (M.tabs && M.tabs[marketTab]) || Object.keys(M.rates);
    const sel = marketSelected(list, marketSel);
    const sc = $("marketScale");
    if (sc) sc.textContent = t("main.market.scale", { n: faNum(M.lot) });
    let html = "";
    for (const k of list) {
      const rate = M.rates[k];
      const have = (ec.resources[k] || 0);
      const on = k === sel;
      const lock = tradeLocked(getState(), k, slot); // قفل مرحله‌ای (فاز ۱ بند ۸۹)
      html += `<div class="mrow${on ? " sel" : ""}" data-msel="${k}"><span class="mname" title="${t("main.market.pick")}">${resName(k)} <b>${faNum(have)}</b></span>` +
        (lock ? `<span class="mlock" title="${t("main.market.locked", { stage: t("game.stage." + lock) })}">🔒</span>` : "") +
        `<span class="mrate">${t("main.market.rate", { buy: faNum(rate.buy), sell: faNum(rate.sell) })}</span>`;
      if (on) {
        const qb = tradeQuote(getState(), k, "buy", slot), qs = tradeQuote(getState(), k, "sell", slot);
        html += `<button data-trade="buy:${k}"${qb.ok ? "" : ` disabled title="${TRADE_FA[qb.reason] || qb.reason}"`}>${qb.ok ? t("main.market.buyN", { n: faNum(qb.n) }) : t("main.market.buy")}</button>` +
          `<button data-trade="sell:${k}"${qs.ok ? "" : ` disabled title="${TRADE_FA[qs.reason] || qs.reason}"`}>${qs.ok ? t("main.market.sellN", { n: faNum(qs.n) }) : t("main.market.sell")}</button>`;
      }
      html += `</div>`;
    }
    rows.innerHTML = html;
  }
  // صف آموزش (0.65.0 — انتخاب ۱-الف): ردیف زنده سفارش‌های سربازخانه میزبان —
  // نام + درصد پیشرفت + دکمه لغو با بازپرداخت. فقط view (sim بی‌خبر).
  function paintTrain() {
    const o = $("mercsOverlay"), box = $("trainQueueEl"), hint = $("mercsHint");
    if (!o || !box || o.hidden || mercsFor == null) return;
    const bb = getState().buildings.find((x) => x.id === mercsFor);
    const q = bb && !bb.destroyed && Array.isArray(bb.train) ? bb.train : [];
    const cap = CONFIG.TRAIN.queueCap;
    if (hint) hint.textContent = q.length
      ? t("main.train.queue", { n: faNum(q.length), cap: faNum(cap) })
      : t("main.train.empty");
    let html = "";
    q.forEach((e, i) => {
      const def = UNITS[e.type];
      const pct = Math.max(0, Math.min(100, Math.round(((e.total - e.left) / e.total) * 100)));
      html += `<div class="trow"><span>${def ? escName(def.name) : e.type} <b>${t("main.pct", { n: faNum(pct) })}</b></span>` +
        `<button data-tcancel="${i}" title="${t("main.train.cancelTip")}">✕</button></div>`;
    });
    box.innerHTML = html;
    box.hidden = !q.length;
  }
  let lastEvArr = null; // شناسه آرایه رویدادها (سند تازه = اسکن از نو)
  let lastEvLen = 0; // طول رویدادها در آخرین refresh (ماشه toast کاروان)
  let toastTimer = 0;
  function showGameToast(msg) { // toast بالا-راست روی نقشه (0.274.0)
    const el = $("gameToast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }
  function paintFoe() { // پنل پادشاه دشمن جای کارت ساختمان‌ها و آمار (0.274.0)
    const card = $("foeCard"), scroll = $("buildScroll"), stats = $("buildStats");
    const d = foePanelData(getState(), getMpSession(), getSelFoe());
    if (!d) {
      if (getSelFoe()) setSelFoe(null);
      if (card) card.hidden = true;
      if (scroll) scroll.hidden = false;
      if (stats) stats.hidden = false;
      return;
    }
    if (scroll) scroll.hidden = true;
    if (stats) stats.hidden = true;
    if (!card) return;
    card.hidden = false;
    $("foeTitle").textContent = d.title;
    const tag = $("foeTag");
    if (tag) { tag.textContent = d.tag; tag.hidden = !d.tag; }
    const desc = $("foeDesc");
    if (desc) { desc.textContent = d.desc; desc.hidden = !d.desc; }
    $("foeItem").textContent = d.itemName;
    $("foeHp").textContent = d.hpText;
    $("foeState").textContent = d.stateText;
    const face = $("foeFace");
    if (face) {
      if (d.logoSrc) { face.src = d.logoSrc; face.style.visibility = "visible"; face.alt = d.title; }
      else { face.removeAttribute("src"); face.style.visibility = "hidden"; }
    }
  }
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
    const b = getState().buildings.find((x) => x.id === mercsFor);
    const mine = !!b && !b.destroyed && (!getMpSession() || (b.owner == null ? 0 : b.owner) === getMpSession().slot);
    if (!mine) hideMercs();
  }
  // پنل بازار (0.64.0 — ب-۳): کلیک خنثی روی بازار خودی، روی نوار ساختمان باز می‌شود (الگوی نوار مزدورها).
  let marketFor = null; // شناسه بازار میزبان، یا null = بسته
  let marketTab = "food"; // تب فعال پنل trade (فاز ۱ بند ۳۶: غذا/منابع/نظامی) — UI-side
  let marketSel = "food"; // کالای برگزیده تب (فاز ۱ بند ۳۸: کلیک→Buy/Sell) — UI-side
  let granaryFor = null; // شناسه انبارغذای میزبان، یا null = بسته (فاز ۱ بند ۲۹)
  function hideGranary() { granaryFor = null; const o = $("granaryOverlay"); if (o) o.hidden = true; }
  function showGranary(id) { granaryFor = id; const o = $("granaryOverlay"); if (o) o.hidden = false; }
  function toggleGranary(id) {
    const o = $("granaryOverlay");
    if (granaryFor === id && o && !o.hidden) hideGranary();
    else showGranary(id);
  }
  function hideMarket() { marketFor = null; const o = $("marketOverlay"); if (o) o.hidden = true; }
  function showMarket(id) { marketFor = id; const o = $("marketOverlay"); if (o) o.hidden = false; }
  function toggleMarket(id) {
    const o = $("marketOverlay");
    if (marketFor === id && o && !o.hidden) hideMarket();
    else showMarket(id);
  }
  function pruneMarket() { // بازار میزبان از دست رفته/دشمن شده → بستن خودکار
    if (marketFor == null) return;
    const b = getState().buildings.find((x) => x.id === marketFor);
    const mine = !!b && !b.destroyed && (!getMpSession() || (b.owner == null ? 0 : b.owner) === getMpSession().slot);
    if (!mine) hideMarket();
  }
  $("mercsClose").addEventListener("click", () => { hideMercs(); refreshPanel(); });
  $("foeClose").addEventListener("click", () => { setSelFoe(null); refreshPanel(); });
  // لغو سفارش آموزش (0.65.0): دکمه ✕ هر ردیف صف — بازپرداخت کامل با سقف.
  $("mercsOverlay").addEventListener("click", (e) => {
    const t = e.target && e.target.closest ? e.target.closest("[data-tcancel]") : null;
    if (!t) return;
    if (getReplayWatch()) return; // تماشا: لغو نیست (0.49.0)
    const idx = Number(t.dataset.tcancel);
    if (mercsFor == null || !Number.isInteger(idx)) return;
    if (getMpSession()) { mpSend("trainCancel", { bld: mercsFor, idx }); getSound().ack("place"); return; }
    playerCmd({ kind: "trainCancel", bld: mercsFor, idx }, getState().tick);
    getSound().ack("place");
    refreshPanel();
  });
  $("marketClose").addEventListener("click", () => { hideMarket(); refreshPanel(); });
  $("granaryClose").addEventListener("click", () => { hideGranary(); refreshPanel(); }); // پنل جیره (بند ۲۹)
  $("marketOverlay").addEventListener("click", (e) => {
    const mt = e.target && e.target.closest ? e.target.closest("[data-mtab]") : null; // (تب بالا آمد؛ شاخه‌اش همان‌جاست)
    if (mt) {
      marketTab = mt.dataset.mtab;
      const nl = (CONFIG.MARKET.tabs && CONFIG.MARKET.tabs[marketTab]) || Object.keys(CONFIG.MARKET.rates);
      marketSel = marketSelected(nl, null);
      refreshPanel(); return;
    } // تب trade (بند ۳۶)
    const t = e.target && e.target.closest ? e.target.closest("[data-trade]") : null;
    if (t) {
      if (t.disabled) return;
      if (getReplayWatch()) return; // تماشا: معامله نیست (0.49.0)
      const parts = String(t.dataset.trade).split(":");
      const dir = parts[0], res = parts[1];
      if (getMpSession()) { mpSend("trade", { res, dir }); getSound().ack("coin"); return; }
      playerCmd({ kind: "trade", res, dir }, getState().tick);
      getSound().ack("coin");
      refreshPanel();
      return;
    }
    const ms = e.target && e.target.closest ? e.target.closest("[data-msel]") : null;
    if (ms) { marketSel = ms.dataset.msel; refreshPanel(); } // انتخاب کالا (بند ۳۸)
    const fd = e.target && e.target.closest ? e.target.closest("[data-food]") : null;
    if (fd) { // توقف/شروع مصرف غذا (فاز ۱ بند ۸۵)
      if (getReplayWatch()) return;
      const v = fd.dataset.food;
      if (getMpSession()) { mpSend("food", { v }); return; }
      playerCmd({ kind: "food", v }, getState().tick);
      refreshPanel();
      return;
    }
  });

  // بازپینت پنل‌ها (0.264.0 — C-CLN-84): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
  function refreshPanel() {
  const { armyRowsEl, attackMoveBtn, attackposBtn, bldCard, bldHpEl, bldNameEl, bldStateEl, deployBtn, disbandBtn, firecowBtn, garrisonBtn, getEditor, getLastMissionKey, getMissionLost, getMissionWon, guardBtn, missionLabel, palBtns, patrolBtn, resupplyBtn, stanceDefendBtn, stanceEngageBtn, stanceHoldBtn, unitBtns, unitCard, unitHpEl, unitNameEl, unitOrderEl, warn } = later();
    // بنرهای solo + بنر MP (برنده/بازیکن حذف‌شده).
    if (getMpSession() && getState().mp && getState().mp.enabled) {
      const me = getMpSession().slot;
      const alive = getState().mpres[me] && getState().mpres[me].alive;
      const over = getState().mp.over;
      const winner = getState().mp.winner;
      defeatBanner.hidden = !(over && alive === false);
      victoryBanner.hidden = !(over && alive === true && winner === me);
      if (over && winner !== me && alive !== false) {
        // بازی تمام شده ولی من نه برنده‌ام نه بازنده (نباید رخ دهد در FFA) — هر دو پنهان
        defeatBanner.hidden = true;
        victoryBanner.hidden = true;
      }
      const vb = victoryBanner.querySelector("p");
      const db = defeatBanner.querySelector("p");
      if (over && winner === me && vb) vb.textContent = t("main.mp.win", { n: me + 1 });
      if (over && alive === false && db) db.textContent = t("main.mp.lose", { n: winner + 1 });
    } else {
      defeatBanner.hidden = !(getState().defeated || getMissionLost()); // بنر شکست (0.19.0) + باخت مأموریت view-side (0.225.0)
      victoryBanner.hidden = !(getState().victorious || getMissionWon()); // بنر پیروزی (0.22.0) + برد مأموریت view-side (0.225.0)
      if (getMissionWon()) { const vbp = victoryBanner.querySelector("p"); if (vbp) { const mdoc = missionByKey(getLastMissionKey()); const outro = missionOutro(mdoc, getLang()); vbp.textContent = t("ui.campaign.won", { name: missionLabel(mdoc) }) + (outro ? " " + outro : ""); } }
    }
    // خلاصه پایان بازی (0.283.0): یک‌بار هنگام نمایان‌شدن بنر پر می‌شود.
    for (const [ban, id] of [[defeatBanner, "defeatStats"], [victoryBanner, "victoryStats"]]) {
      const ul = $(id);
      if (!ul) continue;
      if (!ban.hidden && !ban.dataset.stats) { ban.dataset.stats = "1"; ul.innerHTML = endSummaryHTML(getState(), viewSlotOf(getMpSession())); }
      else if (ban.hidden && ban.dataset.stats) { delete ban.dataset.stats; ul.innerHTML = ""; }
    }
    // بنر تازه‌نمایان: فوکوس روی دکمه‌اش (یک‌بار؛ نه در هر refresh) تا صفحه‌کلید/صفحه‌خوان در بنر بیفتد
    for (const [ban, btn] of [[defeatBanner, defeatRestartBtn], [victoryBanner, victoryRestartBtn]]) {
      if (!ban.hidden && !ban.dataset.focused) { ban.dataset.focused = "1"; btn.focus({ preventScroll: true }); }
      else if (ban.hidden && ban.dataset.focused) delete ban.dataset.focused;
    }
    // هدف بعدی (onboarding): فقط سولوی زنده؛ با رسیدن به همه نقاط عطف پنهان می‌شود.
    const hintEl = $("hintEl");
    if (hintEl) {
      const hk = (getMpSession() || getReplayWatch() || getEditor() || getState().defeated || getState().victorious) ? null : (nextHint(getState()) || nextGoal(getState()));
      if (hk) { const txt = t(hk.startsWith("ui.goal.") ? "ui.goal.prefix" : "ui.hint.prefix") + " " + t(hk); if (hintEl.textContent !== txt) { hintEl.textContent = txt; hintEl.title = txt; } }
      hintEl.hidden = !hk;
      // کارت ساختمانِ مورد اشاره هایلایت می‌شود و (یک‌بار به‌ازای هر راهنما) به دید می‌آید.
      const hb = hintBuilding(hk);
      for (const b of palBtns) b.classList.toggle("hinted", !!hb && b.dataset.b === hb);
      if (hk !== getLastHintKey()) {
        setLastHintKey(hk);
        const hc = hb && palBtns.find((b) => b.dataset.b === hb);
        const pal = $("buildPal");
        if (hc && pal) { // فقط خود پالت افقی اسکرول می‌شود (scrollIntoView کل صفحه را در موبایل می‌پراند)
          const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
          const cr = hc.getBoundingClientRect(), pr = pal.getBoundingClientRect();
          pal.scrollBy({ left: (cr.left + cr.width / 2) - (pr.left + pr.width / 2), behavior: calm ? "auto" : "smooth" });
        }
      }
    }
    // هشدار یورش نزدیک + شرط برد نبرد آزاد (0.289.0 — T14): فقط سولوی زنده.
    const raidEl = $("raidEl"), winEl = $("winEl");
    const soloLive = !(getMpSession() || getReplayWatch() || getEditor());
    if (raidEl) {
      const eta = soloLive ? raidEta(getState()) : null;
      if (eta != null) { const txt = t("ui.raid.soon", { n: faNum(eta) }); if (raidEl.textContent !== txt) raidEl.textContent = txt; }
      raidEl.hidden = eta == null;
    }
    if (winEl) winEl.hidden = !soloLive || !!getLastMissionKey() || getState().defeated || getState().victorious;
    if (!getMpSession()) online.maybeReport(getState()); // ثبت پیروزی در تالار مشترک (0.23.0؛ فقط یک‌بار)
    pruneMercs(); // سربازخانه میزبان نوار مزدورها ویران شده؟ بستن خودکار
    pruneMarket(); // بازار میزبان پنل معامله ویران شده؟ بستن خودکار
    paintMarket(); // ردیف‌های زنده پنل بازار (موجودی/قیمت/وضعیت دکمه‌ها)
    paintTrain(); // ردیف‌های زنده صف آموزش (0.65.0)
    paintFoe(); // پنل پادشاه دشمن (0.274.0)
    paintGranary(); // ردیف‌های توقف/شروع غذا (فاز ۱ بند ۸۵)
    const ec = getMpSession() ? getState().mpres[viewSlotOf(getMpSession())] : getState();
    for (const b of palBtns) b.classList.toggle("sel", !getSelectedUnit() && b.dataset.b === getSelectedKey());
    for (const b of unitBtns) b.classList.toggle("sel", b.dataset.u === getSelectedUnit());
    // قفل مزدورها (0.29.0 سرباز، 0.30.0 سرباز و کماندار، 0.35.0 همه requiresدارها):
    // بدون سربازخانه سالم خودی، کارت‌ها کم‌رنگ‌اند.
    // تماشاگر (0.141.0): پنل‌ها اقتصاد بازیکن اول را نشان می‌دهند (فقط نما).
    const slot = viewSlotOf(getMpSession());
    const barracksOk = hasBarracks(getState(), slot);
    const cathedralOk = hasCathedral(getState(), slot);
    const mercOk = !!mercpostOf(getState(), slot); // پست مزدور زنده همان مالک (0.166.0 — بند 169)
    const engOk = !!guildOf(getState(), slot, "engineerguild"); // انجمن مهندسین زنده همان مالک (0.167.0 — §9.3/بند 172)
    const tunOk = !!guildOf(getState(), slot, "tunnelerguild"); // انجمن حفاران زنده همان مالک (0.167.0 — §9.3/بند 174)
    for (const b of unitBtns) {
      if (UNITS[b.dataset.u] && UNITS[b.dataset.u].requires === "barracks") {
        const free = barracksOk || (UNITS[b.dataset.u].merc === true && mercOk);
        b.classList.toggle("locked", !free);
        b.title = free ? "" : HIRE_FA.NO_BARRACKS;
      }
      // قفل کلیسای جامع (فاز ۱ بند ۷۶): راهب جنگجو بدون جامع سالم خودی قفل است.
      if (UNITS[b.dataset.u] && UNITS[b.dataset.u].requires === "cathedral") {
        b.classList.toggle("locked", !cathedralOk);
        b.title = cathedralOk ? "" : HIRE_FA.NO_CATHEDRAL;
      }
      // قفل انجمن (0.167.0 — §9.3): یگان انجمن بدون بنای انجمن سالم خودی قفل است (راه‌برگشت legacy نیست).
      if (UNITS[b.dataset.u] && (UNITS[b.dataset.u].requires === "engineerguild" || UNITS[b.dataset.u].requires === "tunnelerguild")) {
        const gOk = UNITS[b.dataset.u].requires === "engineerguild" ? engOk : tunOk;
        const gMsg = UNITS[b.dataset.u].requires === "engineerguild" ? HIRE_FA.NO_ENG_GUILD : HIRE_FA.NO_TUN_GUILD;
        b.classList.toggle("locked", !gOk);
        b.title = gOk ? "" : gMsg;
      }
      // قفل اسب (0.168.0): شوالیه بی‌اصطبل/بی‌اسب قفل است.
      if (UNITS[b.dataset.u] && UNITS[b.dataset.u].requiresHorse) {
        const anySt = hasStable(getState(), slot);
        const hOk = !!stableWithHorse(getState(), slot);
        b.classList.toggle("locked", !hOk);
        b.title = hOk ? "" : (anySt ? HIRE_FA.NO_HORSE : HIRE_FA.NO_STABLE);
      }
      // قفل سلاح (0.44.0 — #۹): بدون شمشیر/کمانِ همان نوع، کارت کم‌رنگ است.
      const wpn = UNITS[b.dataset.u] && UNITS[b.dataset.u].requiresWeapon;
      const mercFree = UNITS[b.dataset.u] && UNITS[b.dataset.u].merc === true && mercOk; // مسیر طلایی بی‌سلاح است
      if (wpn && barracksOk && !mercFree) {
        const has = ((getMpSession() ? getState().mpres[viewSlotOf(getMpSession())].resources : getState().resources)[wpn] || 0) >= 1;
        const preLocked = b.classList.contains("locked");
        b.classList.toggle("locked", !has || preLocked);
        if (!has) b.title = HIRE_FA.NEEDS_WEAPON;
        else if (!preLocked) b.title = "";
      }
    }
    // No Dogs room option (0.156.0): dogcage card locked + reason.
    {
      const nd = !!(getState().rules && getState().rules.noDogs);
      const ndMsg = (typeof REASON_FA !== "undefined" && REASON_FA.NODOGS) || "NODOGS";
      for (const b of palBtns) { if (b.dataset.b === "dogcage" && nd && !b.classList.contains("locked")) { b.classList.add("locked"); b.title = ndMsg; } }
    }
    // قفل Keep (فاز ۱ بند ۱۰۲): بی‌ستادِ زنده هیچ کارت ساختمانی در دسترس نیست.
    {
      const locked = keepLocked(getState(), slot);
      const keepMsg = REASON_FA.NO_KEEP || "NO_KEEP";
      for (const b of palBtns) { b.classList.toggle("locked", locked); b.title = locked ? keepMsg : ""; }
    }
    for (const b of taxBtns) b.classList.toggle("sel", b.dataset.tax === ec.tax);
    if (taxSlider) { taxSlider.max = String(TAX_IDS.length - 1); taxSlider.value = String(taxIndex(ec.tax)); }
    for (const b of ratBtns) b.classList.toggle("sel", b.dataset.rat === ec.rations);
    pauseBtn.textContent = getMpSession() ? t("main.top.multi") : getState().paused ? t("main.top.resume") : t("ui.top.pause");
    speedBtn.textContent = getMpSession() ? t("main.top.speedLocked") : t("main.top.speed", { n: getState().speed });
    pauseBtn.disabled = !!getMpSession();
    speedBtn.disabled = !!getMpSession();
    waveBtn.disabled = !!getMpSession();
    // خط زمانی موج‌ها (0.149.0 — §۱۹.۴/بند ۱۱۷۴): فقط سولو (در MP موج خنثی
    // نداریم)؛ فقط‌خواندنی از waveTimeline خالص.
    if (waveTimelineEl) {
      if (getMpSession()) {
        waveTimelineEl.hidden = true;
      } else {
        const tl = waveTimeline(getState());
        const glyph = (s) => (s === "done" ? "●" : (s === "current" ? "◉" : "○"));
        const endGlyph = tl.end === "victory" ? "🏆" : (tl.end === "defeat" ? "✖" : (tl.end === "final" ? "⚑" : "…"));
        waveTimelineEl.hidden = false;
        waveTimelineEl.textContent = tl.rows.map((r) => glyph(r.status)).join("") + " " + endGlyph;
        waveTimelineEl.title = t("main.wave.timeline", {
          done: tl.rows.filter((r) => r.status === "done").length,
          total: FINAL_WAVE, cur: tl.wave > 0 ? tl.wave : "—",
        });
      }
    }
    // ساعت مأموریت (0.182.0 — §2/بند 130): mm:ss از شروع Keep+Granary؛ پیش از شروع --:--.
    if (mclockEl) {
      mclockEl.textContent = getMclockStart() == null ? "--:--" : clockText(getState().tick, getMclockStart());
      mclockEl.title = t("main.clock.title");
    }
    saveBtn.disabled = !!getMpSession();
    loadBtn.disabled = !!getMpSession();
    for (const id of ["cloudSaveBtn", "cloudLoadBtn", "cloudDelBtn"]) { // ابری فقط سولو (0.67.0)
      const el = $(id);
      if (el) el.disabled = !!getMpSession();
    }
    placedEl.textContent = getState().placed;
    rejectedEl.textContent = getState().rejected;
    workersEl.textContent = t("main.workers", { free: ec.freeWorkers != null ? ec.freeWorkers : getState().freeWorkers, workers: ec.workers, cap: ec.workerCap != null ? ec.workerCap : getState().workerCap });
    const p = ec.popularity;
    popEl.textContent = t("main.pop", { p, dir: ec.popDir > 0 ? "▲" : ec.popDir < 0 ? "▼" : "●", target: popTarget(getState(), viewSlotOf(getMpSession())) });
    popEl.className = p >= 55 ? "hi" : p < 40 ? "lo" : "me";
    resEl.innerHTML = CONFIG.RESOURCES.map((r) => {
      const net = Math.round(netPerMinute(getState(), r.key, viewSlotOf(getMpSession())) * 10) / 10;
      const sign = net > 0 ? "+" : "";
      const have = getMpSession() ? getState().mpres[viewSlotOf(getMpSession())].resources[r.key] : getState().resources[r.key];
      const show = getExactRes() ? String(have) : approxRes(have).text;
      return `<div class="res"><span><img src="${iconSrc(r.key)}" alt="" width="18" height="18" style="vertical-align:-4px"> ${r.name}</span><b>${show} / ${capFor(getState(), r.key, slot)} <i>(${t("main.res.perMin", { v: sign + net })})</i></b></div>`;
    }).join("") + (getMpSession() ? mpRosterHTML() : "");
    resEl.style.cursor = "pointer";
    resEl.title = t(getExactRes() ? "main.res.showApprox" : "main.res.showExact");
    // خلاصه سیاست + هشدار مشاور (0.79.0 — بند ۹): فقط نمایش، getState() دست‌نخورده.
    policy.paintPolicyLine(viewSlotOf(getMpSession()));
    warn.paintWarnLine(viewSlotOf(getMpSession()));
    warn.paintCampLine(viewSlotOf(getMpSession()));
    paintScribe(viewSlotOf(getMpSession())); // چهره کاتب + گزارش‌ها (0.146.0)
    if (getMpSession() && getState().mp && getState().mp.over) {
      battleEl.textContent = getState().mp.winner === getMpSession().slot && getMpSession().slot >= 0 ? t("main.battle.mpWon") : t("main.battle.mpOver");
    }
    { // کاروان: از آمار حذف، به‌صورت toast بالا-راست روی نقشه (0.274.0)
      const evs = getState().events;
      if (evs !== lastEvArr) { lastEvArr = evs; lastEvLen = 0; } // سند تازه/لود/تماشا
      if (evs.length > lastEvLen) {
        for (let i = lastEvLen; i < evs.length; i++) {
          if (isCaravanMsg(evs[i])) { showGameToast(t("game.ev.caravan")); break; }
        }
      }
      lastEvLen = evs.length;
    }
    if (false) { } else battleEl.textContent = getState().defeated
      ? t("main.battle.defeat")
      : getState().victorious
      ? t("main.battle.victory")
      : (getPendingKind() === "alarm"
        ? t("main.battle.alarm")
        : (getPendingKind() === "demolish"
          ? t("main.battle.demolish")
          : (getPendingKind() === "repair"
          ? t("main.battle.repair")
          : (getMpDesync() ? t("main.battle.desync", { d: getMpDesync() }) : ((() => {
          const evs2 = getState().events;
          for (let i = evs2.length - 1; i >= 0; i--) if (!isCaravanMsg(evs2[i])) return evs2[i];
          return t("ui.stats.calm");
        })())))));
    alarmBtn.classList.toggle("sel", getPendingKind() === "alarm");
    demolishBtn.classList.toggle("sel", getPendingKind() === "demolish");
    if (typeof repairBtn !== "undefined" && repairBtn) repairBtn.classList.toggle("sel", getPendingKind() === "repair");
    // شمارش صلح No Rush (0.149.0 — §۱۴.۲/بند ۷۳۰): پیشوند خط نبرد تا پایان
    // peaceUntil؛ فقط خواندنی (۱۰ تیک = ۱ ثانیه).
    if (peaceActive(getState())) {
      const left = Math.max(0, (getState().peaceUntil || 0) - (getState().tick || 0));
      battleEl.textContent = t("main.battle.peace", { s: Math.ceil(left / 10) }) + " — " + battleEl.textContent;
    }
    // کارت یگان‌های منتخب (مرده/رفته → هرس خودکار با حفظ ترتیب)
    setSelIds(pruneSet(getSelIds(), getState().units));
    // زنگ خطر و تخریب سراسری‌اند و به انتخاب نیاز ندارند — پاک نشوند.
    if (!getSelIds().length && getPendingKind() !== "alarm" && getPendingKind() !== "demolish" && getPendingKind() !== "firecow" && getPendingKind() !== "repair") setPendingKind(null);
    const sels = resolveSet(getSelIds(), getState().units);
    const sel = sels[0] || null;
    if (sel) setSelBldId(null); // کارت یگان اولویت دارد (0.174.0)
    unitCard.hidden = !sel;
    // کارت اطلاعات ساختمان (0.174.0 — §3.3/بند 150): نام/جان/وضعیت بنای خودی.
    const bb = getSelBldId() == null ? null : getState().buildings.find((x) => x.id === getSelBldId());
    const ownBb = (bb && (bb.owner == null ? 0 : bb.owner) === (getMpSession() ? getMpSession().slot : 0)) ? bb : null;
    if (!ownBb) setSelBldId(null);
    bldCard.hidden = !ownBb;
    if (ownBb) {
      const bi = buildingInfo(ownBb, CONFIG.BUILDINGS[ownBb.type]);
      bldNameEl.textContent = t("main.bld.name", { name: bi.name, id: ownBb.id });
      bldHpEl.textContent = bi.hp == null ? t("main.unknown") : t("main.bld.hp", { hp: faNum(bi.hp), max: faNum(bi.maxHp == null ? bi.hp : bi.maxHp) });
      bldStateEl.textContent = bi.destroyed ? t("main.bld.ruin") : (bi.buildPct != null ? t("main.bld.building", { p: faNum(bi.buildPct) }) : t("main.bld.done"));
    }
    if (sel) {
      const udef = UNITS[sel.type];
      if (sels.length === 1) {
        unitNameEl.textContent = t("main.unit.name", { name: udef.name, id: sel.id, stance: STANCE_FA[sel.stance] || sel.stance });
        unitHpEl.textContent = `${sel.hp}/${sel.maxHp}`;
        armyRowsEl.innerHTML = "";
      } else {
        const hpSum = sels.reduce((a, u) => a + u.hp, 0);
        unitNameEl.textContent = t("main.unit.selected", { n: sels.length });
        unitHpEl.textContent = `Σ${hpSum}`;
        // ردیف‌های نوع (0.175.0 — بند 553): نام/تعداد/Σجان هر نوع منتخب.
        armyRowsEl.innerHTML = armyBreakdown(sels).map((e) => {
          const nm = (UNITS[e.type] && UNITS[e.type].name) || e.type;
          return `<div class="arow" data-atype="${e.type}"><span>${nm} ×${faNum(e.n)}</span><b>Σ${faNum(e.hp)}</b></div>`;
        }).join("");
      }
      stanceEngageBtn.classList.toggle("sel", sel.stance === "engage");
      stanceDefendBtn.classList.toggle("sel", sel.stance === "defend");
      stanceHoldBtn.classList.toggle("sel", sel.stance === "hold");
      attackMoveBtn.classList.toggle("sel", getPendingKind() === "attackmove");
      if (patrolBtn) patrolBtn.classList.toggle("sel", getPendingKind() === "patrol"); // گشت (0.162.0)
      if (attackposBtn) attackposBtn.classList.toggle("sel", getPendingKind() === "attackpos"); // حمله به موضع (0.163.0)
      guardBtn.classList.toggle("sel", getPendingKind() === "guard" || sel.stance === "guard");
      if (garrisonBtn) garrisonBtn.classList.toggle("sel", getPendingKind() === "garrison");
      // دکمه استقرار منجنیق (0.46.0): روشن وقتی منتخبِ منجنیق مستقر است.
      if (deployBtn) {
        deployBtn.hidden = !sels.some((u) => UNITS[u.type].needsDeploy);
        deployBtn.classList.toggle("sel", !!sel.deployed);
      }
      // دکمه پرتاب گاو (0.142.0): دیده وقتی منجنیقِ مستقرِ منتخب هست؛ تک‌بار هدف‌گیری.
      // گزینه اتاق No-Cow (0.147.0 — §۱۲.۴): همیشه پنهان.
      if (firecowBtn) {
        const noCow = !!(getState().rules && getState().rules.noCow);
        firecowBtn.hidden = noCow || !sels.some((u) => isCowSiege(u) && u.deployed);
        if (!firecowBtn.hidden) firecowBtn.textContent = t("ui.unit.firecow", { n: faNum(herdCows(getState(), getMpSession() ? getMpSession().slot : 0)) });
        firecowBtn.classList.toggle("sel", getPendingKind() === "firecow");
      }
      // دکمه تأمین سنگ (0.149.0 — §۱۲.۲/بند ۵۷۸): دیده وقتی منجنیقِ ناپرِ
      // منتخب هست؛ برچسب کمترین مهمات/سقف منتخب‌ها (۱۰ سنگ = +۲۰ تا سقف).
      if (disbandBtn) disbandBtn.hidden = !orderSels().some((u) => u.type !== "lord");
      if (resupplyBtn) {
        const cats = sels.filter((u) => u.type === "catapult" && UNITS.catapult.ammoCap !== undefined && (u.ammo === undefined ? UNITS.catapult.ammoCap : u.ammo) < UNITS.catapult.ammoCap);
        resupplyBtn.hidden = !cats.length;
        if (cats.length) {
          const a = Math.min(...cats.map((u) => (u.ammo === undefined ? UNITS.catapult.ammoCap : u.ammo)));
          resupplyBtn.textContent = t("ui.unit.resupply", { a, cap: UNITS.catapult.ammoCap });
        }
      }
      const post = guardPost(getState(), sel);
      const activeOrders = sels.filter((u) => u.order && u.order.status === "active").length;
      unitOrderEl.textContent = activeOrders > 0
        ? (sels.length === 1
          ? t("main.order.mission", { kind: ORDER_KIND_FA[sel.order.kind] || sel.order.kind, mission: sel.mission })
          : t("main.order.activeOf", { a: activeOrders, n: sels.length }))
        : (getPendingKind() === "attackmove" ? t("main.order.nextAttackMove")
        : (getPendingKind() === "patrol" ? t("main.order.nextPatrol")
        : (getPendingKind() === "attackpos" ? t("main.order.nextAttackpos")
        : (getPendingKind() === "guard" ? t("main.order.nextGuard")
        : (getPendingKind() === "garrison" ? t("main.order.nextGarrison")
        : (getPendingKind() === "firecow" ? t("main.order.nextFirecow")
        : (sels.length > 1 ? t("main.order.group", { n: sels.length })
        : (udef.needsDeploy
          ? (sel.deployed ? t("main.order.deployed") : t("main.order.mobile"))
        : (sel.garrisonTower != null ? t("main.order.inTower")
        : (sel.stance === "guard"
          ? (post ? t("main.order.guarding", { name: CONFIG.BUILDINGS[post.type].name }) : t("main.order.postLost"))
          : t("main.order.status", { mission: sel.mission })))))))))));
    }
  }
  return { paintGranary, paintMarket, paintTrain, hideMercs, showMercs, toggleMercs, pruneMercs, hideGranary, showGranary, toggleGranary, hideMarket, showMarket, toggleMarket, pruneMarket, refreshPanel };
}
