// پالت/ارتش/یگان/کلیدها (0.266.0 — C-CLN-86): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { CONFIG } from "./config.js";
import { signEdge, UNITS } from "./combat.js";
import { resolveSet, groupCentroid, bookmarkSet, bookmarkGet, lordFocusIds, lordFocusNext } from "./selection.js";
import { saveGroup, recallGroup } from "./groups.js";
import { createKeyButtons } from "./keybtns.js";
import { zoomStep, arrowPanDelta } from "./gestures.js";
import { t } from "./i18n.js";
import { faNum } from "./format.js";
import { cycleSpeed, validKeyCode } from "./a11y.js";

export function createPaletteKeysUI({ getState, getMpSession, getReplayWatch, getBookmarks, getHover, getSelIds, setSelIds, setSelectedKey, getSelectedKey, setSelectedUnit, getSelectedUnit, setPendingKind, setLastBookmark, getLastGroupRecall, setLastGroupRecall, getLastLordId, setLastLordId, getSignCycle, setSignCycle, getCtrlGroups, setCtrlGroups, later, $, armyRowsEl, clearWallLine, hideGranary, hideMarket, hideMercs, hideReports, keyMap, mpSend, palBtns, pauseBtn, playerCmd, refreshPanel, renderer, statusEl, taxSlider, unitBtns }) {
  // هایلایت کالاهای لازم استخدام (0.175.0 — §9.3/بند 482): هاور روی کارت نیرو =
  // روشن‌شدن ردیف هزینه همان کارت (unitPal همان پنل استخدام/آموزش است).
  const up = $("unitPal");
  if (up) {
    up.addEventListener("mouseover", (e) => {
      const card = e.target && e.target.closest ? e.target.closest("#unitPal [data-u]") : null;
      for (const c of up.querySelectorAll(".bcard.costhi")) if (c !== card) c.classList.remove("costhi");
      if (card) card.classList.add("costhi");
    });
    up.addEventListener("mouseleave", () => {
      for (const c of up.querySelectorAll(".bcard.costhi")) c.classList.remove("costhi");
    });
  }
  for (const b of palBtns) {
    b.addEventListener("click", () => {
      if (getReplayWatch()) return; // تماشا: مسلح‌شدن نیست (0.49.0)
      // کلیک دوباره روی کارت فعال = خلع (برگشت به حالت انتخاب/فرمان)
      if (!getSelectedUnit() && getSelectedKey() === b.dataset.b) { setSelectedKey(null); }
      else { setSelectedKey(b.dataset.b); setSelectedUnit(null); setPendingKind(null); setSelIds([]); }
      clearWallLine();
      refreshPanel();
    });
  }
  // پنل ارتش (0.175.0 — §10.3/بند 553): کلیک ردیف نوع = فقط آن نوع؛ راست‌کلیک = حذف آن نوع.
  if (armyRowsEl) {
    armyRowsEl.addEventListener("click", (e) => {
      const row = e.target && e.target.closest ? e.target.closest("[data-atype]") : null;
      if (!row || getReplayWatch()) return;
      const ty = row.dataset.atype;
      const ids = resolveSet(getSelIds(), getState().units).filter((u) => u.type === ty).map((u) => u.id);
      if (ids.length) { setSelIds(ids); setPendingKind(null); refreshPanel(); }
    });
    armyRowsEl.addEventListener("contextmenu", (e) => {
      const row = e.target && e.target.closest ? e.target.closest("[data-atype]") : null;
      if (!row || getReplayWatch()) return;
      e.preventDefault();
      const ty = row.dataset.atype;
      const drop = new Set(resolveSet(getSelIds(), getState().units).filter((u) => u.type === ty).map((u) => u.id));
      if (drop.size) { setSelIds(getSelIds().filter((id) => !drop.has(id))); setPendingKind(null); refreshPanel(); }
    });
  }
  for (const b of unitBtns) {
    b.addEventListener("click", () => {
      if (getReplayWatch()) return; // تماشا: استخدام نیست (0.49.0)
      if (getSelectedUnit() === b.dataset.u) { setSelectedUnit(null); }
      else { setSelectedUnit(b.dataset.u); setPendingKind(null); setSelIds([]); }
      refreshPanel();
    });
  }
  const keyUI = createKeyButtons({ getKeyMap: () => keyMap, getRecAction: () => keyRecAction });
  // Esc: لغو همه‌چیز — نوار مزدورها، مودال، انتخاب، حالت‌ها و ساختمان/استخدام مسلح.
  // کلیدها قابل remapاند (0.57.0 — #۲۶): cancel اضافه بر Escape همیشه کار می‌کند؛
  // pause/mute حین تایپ در ورودی‌ها شلیک نمی‌شوند.
  let keyRecAction = null; // کنش در حال ضبط کلید تازه (null = عادی)
  window.addEventListener("keydown", (e) => {
    const { getEditor, closeEditor, exitWatch, selUnits, orderStance, modalOverlay, modal, soundIconBtn } = later();
    if (e.code === keyMap.cancel || e.key === "Escape") {
      if (getEditor()) { closeEditor(false); return; } // ویرایشگر: خروج به منو (0.51.0)
      if (getReplayWatch()) { exitWatch(true); return; } // تماشا: خروج به منو (0.49.0)
      if (!$("mercsOverlay").hidden) hideMercs();
      if ($("marketOverlay") && !$("marketOverlay").hidden) hideMarket();
      if ($("granaryOverlay") && !$("granaryOverlay").hidden) hideGranary();
      if ($("reportsOverlay") && !$("reportsOverlay").hidden) hideReports();
      if (modalOverlay && !modalOverlay.hidden) modal.close();
      setSelIds([]); setPendingKind(null); setSelectedUnit(null); setSelectedKey(null); clearWallLine(); refreshPanel();
      return;
    }
    const tag = (e.target && e.target.tagName) || "";
    // دکمه فوکوس‌شده فعال‌سازی بومی خودش را دارد (Space/Enter) — میان‌بر نزن تا دو بار عمل نکند.
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) return;
    if (e.code === keyMap.pause) {
      e.preventDefault();
      if (!getMpSession()) pauseBtn.click();
    } else if (e.code === keyMap.speedUp || e.code === keyMap.speedDown) {
      // سرعت بازی (0.154.0 — §17/بند 818: +/− نامپد، قابل‌تغییر): پله بالا/پایین
      // با توقف در مرز؛ در MP (سرعت قفل) و تماشا بی‌اثر.
      e.preventDefault();
      if (getEditor() || getReplayWatch() || getMpSession()) return;
      getState().speed = cycleSpeed(CONFIG.SPEEDS, getState().speed, e.code === keyMap.speedUp ? 1 : -1);
      refreshPanel();
    } else if (e.code === keyMap.mute) {
      e.preventDefault();
      soundIconBtn.click();
    } else if (e.key === "Tab") {
      // مخفی/نمایش پنل مدیریت (0.176.0 — بند 155): Tab = حالت تمام‌صفحه.
      // فقط حین بازی (منو/مودال بسته)؛ Tab داخل مودال را تله فوکوس همان مودال می‌خورد.
      if (!$("menuScreen").hidden) return;
      if (modalOverlay && !modalOverlay.hidden) return;
      e.preventDefault();
      const sideEl = $("side");
      if (sideEl) sideEl.hidden = !sideEl.hidden;
    } else if (arrowPanDelta(e.code)) {
      // اسکرول جهت‌دار (0.176.0 — بند 154): هر فشردن = یک گام 56px؛
      // نگه‌داشتن = تکرار خودکار صفحه‌کلید. فقط نماست (sim بی‌خبر)؛
      // دوربین محلی است پس در سولو/ویرایشگر/تماشا/چندنفره یکسان کار می‌کند.
      e.preventDefault();
      const ad = arrowPanDelta(e.code);
      renderer.view.panX += ad.dx; renderer.view.panY += ad.dy;
      renderer.markDirty();
    } else if (e.code === keyMap.keep) {
      // پنل ستاد/مالیات (فاز ۱ بند ۲۲ — کلید H): اسکرول به کارت + فوکوس اسلایدر.
      e.preventDefault();
      if (getEditor() || getReplayWatch()) return;
      const card = $("taxCard");
      if (card && card.scrollIntoView) card.scrollIntoView({ block: "nearest" });
      if (taxSlider && taxSlider.focus) taxSlider.focus({ preventScroll: true });
    } else if (e.code === keyMap.sign) {
      // چرخه لبه‌های نقشه (0.146.0 — §۳.۴، کلید S): دوربین به نقطه میانی
      // بعدی لبه‌ها می‌رود (محل‌های ظهور دشمن) — UI-side، sim بی‌خبر.
      e.preventDefault();
      if (getEditor() || getReplayWatch()) return;
      const pts = signEdge(CONFIG.GRID_W, CONFIG.GRID_H);
      const p = pts[getSignCycle() % pts.length];
      setSignCycle(getSignCycle() + 1);
      renderer.focus(p.c, p.r, 1.5);
    } else if (e.code === keyMap.stanceHold || e.code === keyMap.stanceDefend || e.code === keyMap.stanceEngage) {
      // مواضع (0.153.0 — بندهای 566-568؛ پیش‌فرض Q/W/E، قابل‌تغییر): همان
      // orderStance دکمه‌ها (سولو/چندنفره)؛ در ویرایشگر/تماشا بی‌اثر.
      e.preventDefault();
      if (getEditor() || getReplayWatch()) return;
      if (e.code === keyMap.stanceHold) orderStance("hold");
      else if (e.code === keyMap.stanceDefend) orderStance("defend");
      else orderStance("engage");
    } else if (e.code === keyMap.lord) {
      // رفتن به Lord (0.163.0 — §10.5/بند 249): L = Lord خودی، Shift+L = بعدی.
      e.preventDefault();
      if (getEditor() || getReplayWatch()) return;
      const own = getMpSession() ? getMpSession().slot : 0;
      const lids = lordFocusIds(getState().units, own);
      if (!lids.length) { statusEl.textContent = t("main.lord.none"); return; }
      const lid = e.shiftKey ? (lordFocusNext(lids, getLastLordId()) ?? lids[0])
        : (getSelIds().length === 1 && lids.includes(getSelIds()[0]) ? getSelIds()[0] : lids[0]);
      setLastLordId(lid);
      const lu = getState().units.find((u) => u.id === lid);
      if (lu) { setSelIds([lid]); setPendingKind(null); renderer.focus(lu.x, lu.r, 1.5); }
      statusEl.textContent = t("main.lord.goto");
      refreshPanel();
    } else if (/^Digit[1-9]$/.test(e.code) && (e.ctrlKey || e.metaKey) && e.altKey) {
      // ذخیره بوکمارک (0.162.0): Ctrl+Alt+عدد.
      if (getEditor() || getReplayWatch()) return;
      e.preventDefault();
      const slot = Number(e.code.slice(5));
      if (bookmarkSet(getBookmarks(), slot, renderer.view) == null) return;
      setLastBookmark(slot);
      statusEl.textContent = t("main.bookmark.saved", { slot });
      refreshPanel();
    } else if (/^Digit[1-9]$/.test(e.code) && e.altKey && !e.ctrlKey && !e.metaKey) {
      // فراخوانی بوکمارک (0.162.0): Alt+عدد.
      if (getEditor() || getReplayWatch()) return;
      e.preventDefault();
      const slot = Number(e.code.slice(5));
      const b = bookmarkGet(getBookmarks(), slot);
      if (!b) { statusEl.textContent = t("main.bookmark.empty", { slot }); return; }
      setLastBookmark(slot);
      renderer.view.panX = b.x; renderer.view.panY = b.y; renderer.view.zoom = b.z;
      renderer.markDirty();
      statusEl.textContent = t("main.bookmark.recall", { slot });
      refreshPanel();
    } else if (/^Digit[1-7]$/.test(e.code) && e.shiftKey && getSelectedUnit()) {
      // پرچم تجمع (0.166.0 — §9.1/بند 170): Shift+۱ تا ۷ با استخدام مسلح =
      // پرچم نوع مسلح در خانه هاور. هر ۷ کلید یک کار می‌کنند (تا با گروه ۱-۳
      // و بوکمارک Alt قاطی نشود)؛ سولو/MP (آینه rally).
      e.preventDefault();
      if (getEditor() || getReplayWatch()) return;
      const rdef = UNITS[getSelectedUnit()];
      const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
      if (!rdef || !getHover() || !Number.isInteger(getHover().c) || !Number.isInteger(getHover().r) || getHover().c < 0 || getHover().r < 0 || getHover().c >= W || getHover().r >= H) {
        statusEl.textContent = t("main.rally.noHover");
        return;
      }
      if (getMpSession()) mpSend("rally", { type: getSelectedUnit(), c: getHover().c, r: getHover().r });
      else playerCmd({ kind: "rally", type: getSelectedUnit(), c: getHover().c, r: getHover().r }, getState().tick);
      statusEl.textContent = t("main.rally.set", { name: rdef.name, c: faNum(getHover().c), r: faNum(getHover().r) });
      refreshPanel();
    } else if (/^Digit[0-9]$/.test(e.code)) {
      // گروه‌های کنترلی (0.59.0 — رتبه ۱ SOURCE-REVIEW؛ 0.173.0: ده شکاف ۱..۱۰، کلید ۰ = ۱۰): Ctrl+شماره = ذخیره
      // منتخب‌های فعلی، شماره خالی = فراخوانی؛ فشردن دوباره همان شکاف = رفتن به محل گروه. گذرا و UI-side (sim بی‌خبر).
      if (getEditor() || getReplayWatch()) return;
      const slot = e.code === "Digit0" ? 10 : Number(e.code.slice(5));
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const ids = selUnits().map((u) => u.id);
        if (!ids.length) { statusEl.textContent = t("main.group.notSaved"); return; }
        setCtrlGroups(saveGroup(getCtrlGroups(), slot, ids));
        setLastGroupRecall(null);
        statusEl.textContent = t("main.group.saved", { slot, n: ids.length });
      } else {
        const ids = recallGroup(getCtrlGroups(), slot, getState().units);
        if (!ids.length) { statusEl.textContent = t("main.group.empty", { slot }); return; }
        const byId = new Map(getState().units.map((u) => [u.id, u]));
        setSelIds(ids.filter((id) => {
          const u = byId.get(id);
          if (!u || u.dead) return false;
          if (getMpSession() && (u.owner == null ? 0 : u.owner) !== getMpSession().slot) return false;
          return true;
        }));
        setPendingKind(null);
        const gkey = getSelIds().join(",");
        if (getLastGroupRecall() && getLastGroupRecall().slot === slot && getLastGroupRecall().key === gkey && getSelIds().length) {
          const gc = groupCentroid(getState().units, getSelIds());
          if (gc) renderer.focus(gc.x, gc.r, 1.5);
        }
        setLastGroupRecall({ slot, key: gkey });
        statusEl.textContent = t("main.group.recall", { slot, n: getSelIds().length });
        refreshPanel();
      }
    } else if (e.code === "KeyZ") {
      // زوم صفحه‌کلید (0.173.0 — §3.2/بند 159): Z نزدیک، Shift+Z دور؛ همان گام چرخ موس.
      e.preventDefault();
      if (getEditor() || getReplayWatch()) return;
      renderer.view.zoom = zoomStep(renderer.view.zoom, !e.shiftKey);
      renderer.markDirty();
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
    keyUI.paint();
  }, { capture: true });
  return { keyUI, getKeyRecAction: () => keyRecAction, setKeyRecAction: (v) => { keyRecAction = v; } };
}
