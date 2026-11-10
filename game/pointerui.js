// تعامل اشاره‌گر (0.265.0 — C-CLN-85): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { CONFIG } from "./config.js";
import { validate, REASON_FA, hasLiveKeep } from "./construction.js";
import { herdCows } from "./economy.js";
import { ORDER_FA, isGarrisonPost, GARRISON_FA, fortifyPick, ATTACK_FA, attackPick, FIRECOW_FA, isCowSiege, isSoloLord, lordKeepGate, RELEASE_FA, validateRelease, DEMOLISH_FA, REPAIR_FA, validateRepair, UNITS } from "./combat.js";
import { toggleInSet, resolveSet, boxSelectIds, sameTypeIds, bookmarkGet, bookmarkCycle } from "./selection.js";
import { WALL_LINE_MAX, isLineDragType, wallLineTiles, blockLineIfAnyInvalid } from "./wallline.js";
import { pinchDist, pinchZoom, zoomStep, LONG_PRESS_MS, longPressMoved, dragMovedFar, panForDrag } from "./gestures.js";
import { t } from "./i18n.js";
import { faNum } from "./format.js";

export function createPointerInput({ getState, getTerrain, getMpSession, getReplayWatch, getBookmarks, getLastBookmark, setLastBookmark, getSelIds, setSelIds, setSelBldId, getSelectedKey, setSelectedKey, getSelectedUnit, setSelectedUnit, getPendingKind, setPendingKind, setHover, getSelFoe, setSelFoe, later, canvas, renderer, statusEl, sound, refreshPanel, playerCmd, mpSend, updateHover, paintOrderCursor, buildingAt, unitAt, selectedDef, toggleMercs, toggleMarket, toggleGranary }) {
  // تعامل: درگ برای جابه‌جایی، کلیک برای ساخت/استخدام/دستور، چرخ برای زوم.
  // اولویت کلیک: حالت استخدام > انتخاب یگان خودی > دستور به منتخب > ساخت.
  // رفع گیرکردن درگ: اگر pointerup گم می‌شد (pointercancel، رها بیرون،
  // Alt-Tab، لمس دوم) نقشه به موس می‌چسبید و «خودبه‌خود» حرکت می‌کرد.
  let downPos = null, panning = false, movedFar = false, activePointerId = null, midPan = false;
  let lastEdgePos = null; // آخرین موقعیت ماوس روی بوم برای لبه‌اسکرول (0.176.0 — بند 154).
  canvas.style.touchAction = "none";
  // دکمه وسط (0.68.0): جلوگیری از autoscroll مرورگر تا درگِ فقط-پن کار کند.
  canvas.addEventListener("mousedown", (e) => { if (e.button === 1) e.preventDefault(); });
  // ژست‌های لمسی (0.53.0 — #۲۳ از FEATURES): دو انگشت = پینچ-زوم، نگه‌داشتن
  // یک انگشت (≥۵۰۰ms بی‌حرکت) = خلع مثل راست‌کلیک. touchPts فقط انگشت‌های
  // لمسی را نگه می‌دارد؛ موس همان مسیر قبلی را می‌رود.
  let touchPts = new Map(), pinchState = null; // pinchState = {d0, z0}
  let longPressArmed = null, longPressDoneId = -1; // armed = {id, x, y, t0, timer}
  function cancelLongPress() {
    if (longPressArmed) { clearTimeout(longPressArmed.timer); longPressArmed = null; }
  }
  function fireLongPress() {
    // همان خلعِ راست‌کلیک (انتخاب یگان می‌ماند) + پیام؛ رها = بدون کلیک.
    longPressArmed = null;
    setSelectedUnit(null); setSelectedKey(null); setPendingKind(null); clearWallLine();
    movedFar = true;
    statusEl.textContent = t("main.touch.longPress");
    sound.ack("deny");
    refreshPanel();
  }
  function armLongPress(e) {
    cancelLongPress();
    const sx = e.clientX, sy = e.clientY, id = e.pointerId, t0 = Date.now();
    longPressArmed = {
      id, x: sx, y: sy, t0,
      timer: setTimeout(() => {
        if (longPressArmed && longPressArmed.id === id) {
          longPressDoneId = id;
          fireLongPress();
        }
      }, LONG_PRESS_MS),
    };
  }
  // انتخاب باکسی (0.40.0 — #۴ از FEATURES): شیفت+درگ مستطیل می‌کشد (به‌جای
  // جابه‌جایی نقشه) و یگان‌های خودیِ داخلش را به انتخاب اضافه می‌کند.
  let boxSel = null; // {x0,y0,x1,y1,active} با مختصات client
  let boxEl = null;
  function boxOverlay() {
    if (!boxEl) {
      boxEl = document.createElement("div");
      boxEl.id = "boxSel";
      boxEl.hidden = true;
      boxEl.style.cssText = "position:fixed;z-index:50;pointer-events:none;border:1px solid #ffd75e;background:rgba(255,215,94,.12);";
      document.body.appendChild(boxEl);
    }
    return boxEl;
  }
  function hideBox() { if (boxEl) boxEl.hidden = true; boxSel = null; }
  // خط دیوار (0.47.0 — #۲۰ از FEATURES): با دیوار مسلح، درگ (نه کلیک) یک خط
  // دیوار می‌سازد. wallLine = [{c,r,ok}] پیش‌نمایشِ همان تایل‌هایی است که رها
  // صف می‌کند؛ downCell خانه شروع فشار است. شیفت همچنان مال باکس است.
  let wallLine = null, downCell = null;
  function wallArmed() {
    return getSelectedKey() && isLineDragType(getSelectedKey())
      && !getSelectedUnit() && !getPendingKind() && getSelIds().length === 0;
  }
  function clearWallLine() { wallLine = null; downCell = null; }
  function buildWallLine(toC, toR) {
    const own = getMpSession() ? getMpSession().slot : 0;
    const def = CONFIG.BUILDINGS.wall;
    wallLine = wallLineTiles(downCell.c, downCell.r, toC, toR).map((t) => ({
      c: t.x, r: t.y,
      // پیش‌نمایش خط هم قفل Keep را نشان می‌دهد (فاز ۱ بند ۱۲).
      ok: hasLiveKeep(getState(), own) && validate(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H, t.x, t.y, def, own).ok,
    }));
    wallLine = blockLineIfAnyInvalid(wallLine);
  }
  function paintBox() {
    const el = boxOverlay();
    el.hidden = false;
    el.style.left = Math.min(boxSel.x0, boxSel.x1) + "px";
    el.style.top = Math.min(boxSel.y0, boxSel.y1) + "px";
    el.style.width = Math.abs(boxSel.x1 - boxSel.x0) + "px";
    el.style.height = Math.abs(boxSel.y1 - boxSel.y0) + "px";
  }
  function endDrag(e) {
    if (e && e.pointerId !== undefined && activePointerId !== null && e.pointerId !== activePointerId) return false;
    const wasPan = movedFar;
    downPos = null; panning = false; activePointerId = null;
    try { if (e && e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); } catch (_) { /* مهم نیست */ }
    return wasPan;
  }
  canvas.addEventListener("pointerdown", (e) => {
    const { getEditor, edPaintAt, edCellFromEvent } = later();
    if (getEditor()) { // نقاشی نقشه‌ساز (0.51.0): درگ = قلم، نه فرمان/پن
      if (e.isPrimary === false) return;
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== undefined) return;
      activePointerId = e.pointerId;
      getEditor().painting = true;
      edPaintAt(edCellFromEvent(e));
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* رویداد مصنوعی */ }
      return;
    }
    if (e.isPrimary === false && e.pointerType !== "touch") return; // لمس دوم/چندلمسی: نادیده تا نقشه نپرد
    if (e.pointerType === "mouse" && e.button === 1) { // درگ وسط (0.68.0) = فقط پن: بدون باکس/دیوار/کلیک/لانگ‌پرس
      if (activePointerId !== null) return;
      activePointerId = e.pointerId; midPan = true;
      downPos = { x: e.clientX, y: e.clientY, panX: renderer.view.panX, panY: renderer.view.panY };
      panning = false; movedFar = false;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* رویداد مصنوعی */ }
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== undefined) return; // فقط کلیک چپ
    if (e.pointerType === "touch") {
      // انگشت دوم = شروع پینچ: حالت تک‌انگشتی را بی‌صدا ببند تا رها شدن
      // انگشت‌ها کلیک/باکس/خط صادر نکند؛ زوم از نسبت فاصله‌هاست.
      touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touchPts.size >= 2 && !pinchState) {
        cancelLongPress();
        hideBox(); clearWallLine();
        const pts = [...touchPts.values()];
        pinchState = {
          d0: Math.max(1, pinchDist(pts[0].x, pts[0].y, pts[1].x, pts[1].y)),
          z0: renderer.view.zoom,
        };
        downPos = null; panning = false; movedFar = true; activePointerId = null;
        try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* رویداد مصنوعی */ }
        return;
      }
      if (pinchState) return; // انگشت سوم حین پینچ: نادیده
    }
    if (activePointerId !== null) return; // یک درگ فعال است
    activePointerId = e.pointerId;
    downPos = { x: e.clientX, y: e.clientY, panX: renderer.view.panX, panY: renderer.view.panY };
    if (e.shiftKey) boxSel = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, active: false };
    else if (wallArmed()) {
      const rect = canvas.getBoundingClientRect();
      downCell = renderer.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
    }
    panning = false;
    movedFar = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* رویداد مصنوعی/لمسی بدون pointer معتبر */ }
    // لمس طولانی (0.53.0): فقط انگشت تکی لمسی بیرون ویرایشگر/تماشا مسلح می‌شود.
    if (e.pointerType === "touch" && !getReplayWatch()) armLongPress(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    const { getEditor, edPaintAt, edCellFromEvent } = later();
    if (getEditor()) { // نقاشی نقشه‌ساز (0.51.0): حرکت با قلم پایین = رنگ
      if (getEditor().painting && e.pointerId === activePointerId) edPaintAt(edCellFromEvent(e));
      return;
    }
    if (e.pointerType === "touch" && touchPts.has(e.pointerId)) {
      touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // پینچ (0.53.0): زوم از نسبت فاصله دو انگشت؛ پن/کلیک تک‌انگشتی مرده است.
      if (pinchState && touchPts.size >= 2) {
        const pts = [...touchPts.values()];
        renderer.view.zoom = pinchZoom(pinchState.z0, pinchState.d0,
          pinchDist(pts[0].x, pts[0].y, pts[1].x, pts[1].y));
        renderer.markDirty();
        return;
      }
      // لغزش بیش از تحمل = لغو تایمر لمس طولانی.
      if (longPressArmed && e.pointerId === longPressArmed.id
        && longPressMoved(longPressArmed.x, longPressArmed.y, e.clientX, e.clientY)) {
        cancelLongPress();
      }
    }
    if (downPos && e.pointerId === activePointerId) {
      if (midPan) { // درگ وسط (0.68.0): فقط پن با همان ریاضی درگ-پن چپ
        const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y;
        if (dragMovedFar(downPos.x, downPos.y, e.clientX, e.clientY)) { panning = true; movedFar = true; }
        if (panning) {
          const p = panForDrag(downPos.panX, downPos.panY, downPos.x, downPos.y, e.clientX, e.clientY);
          renderer.view.panX = p.panX; renderer.view.panY = p.panY;
          renderer.markDirty();
          return;
        }
        updateHover(e.clientX, e.clientY);
        paintOrderCursor(e.clientX, e.clientY);
        return;
      }
      if (boxSel) {
        boxSel.x1 = e.clientX; boxSel.y1 = e.clientY;
        if (Math.abs(boxSel.x1 - boxSel.x0) + Math.abs(boxSel.y1 - boxSel.y0) > 6) {
          boxSel.active = true; movedFar = true; paintBox();
        }
        updateHover(e.clientX, e.clientY);
        paintOrderCursor(e.clientX, e.clientY);
        return;
      }
      // دکمه رها شده ولی pointerup نرسیده: درگ را ببند، نقشه را نکش
      if (e.pointerType === "mouse" && e.buttons === 0) {
        endDrag(e);
        updateHover(e.clientX, e.clientY);
        paintOrderCursor(e.clientX, e.clientY);
        return;
      }
      const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y;
      if (dragMovedFar(downPos.x, downPos.y, e.clientX, e.clientY)) { panning = true; movedFar = true; }
      // خط دیوار مال درگ است، نه جابه‌جایی: از آستانه به بعد پیش‌نمایش خط
      if (downCell && !boxSel && wallArmed() && movedFar) {
        const rect = canvas.getBoundingClientRect();
        const cell = renderer.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
        buildWallLine(cell.c, cell.r);
        panning = false;
        renderer.markDirty();
        const okN = wallLine.filter((t) => t.ok).length;
        statusEl.innerHTML = t("main.wall.line", { len: faNum(wallLine.length), ok: faNum(okN), max: faNum(WALL_LINE_MAX) });
        return;
      }
      if (panning) {
        const p = panForDrag(downPos.panX, downPos.panY, downPos.x, downPos.y, e.clientX, e.clientY);
        renderer.view.panX = p.panX;
        renderer.view.panY = p.panY;
        renderer.markDirty();
        return;
      }
    }
    updateHover(e.clientX, e.clientY);
    paintOrderCursor(e.clientX, e.clientY);
  });
  canvas.addEventListener("pointerup", (e) => {
    const { getEditor, edPaintAt, edCellFromEvent } = later();
    if (getEditor()) { // نقاشی نقشه‌ساز (0.51.0): رها = پایان ضربه قلم
      if (e.pointerId === activePointerId) {
        getEditor().painting = false;
        activePointerId = null;
        try { if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      return;
    }
    if (e.pointerType === "touch") {
      // پایان ژست لمسی (0.53.0): انگشت را از ردیابی بردار؛ اگر پینچ بود یا
      // لمس طولانی رخ داده بود، بقیه حالت را کامل ریست کن تا کلیک کاذب نیاید.
      const wasPinch = !!pinchState;
      touchPts.delete(e.pointerId);
      if (touchPts.size < 2) pinchState = null;
      cancelLongPress();
      if (wasPinch || e.pointerId === longPressDoneId) {
        if (e.pointerId === longPressDoneId) longPressDoneId = -1;
        downPos = null; panning = false; activePointerId = null;
        try { if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); } catch (_) { /* مهم نیست */ }
        return;
      }
      if (e.pointerId !== activePointerId) return;
    } else if (e.pointerId !== activePointerId) return;
    const wasPan = endDrag(e);
    if (midPan) { midPan = false; return; } // درگ وسط (0.68.0): فقط پن بود، کلیک نه
    // تماشای ری‌پلی (0.49.0): ورودی بسته است — فقط پن/زوم؛ فرمان نه.
    if (getReplayWatch()) {
      hideBox();
      clearWallLine();
      if (!wasPan) statusEl.textContent = t("main.replay.watchHint");
      return;
    }
    // پایان باکس (0.40.0): مستطیل فعال = انتخاب افزایشی خودی‌های داخل؛
    // بدون درگ = کلیک معمولی شیفت‌دار (مسیر پایین).
    if (boxSel) {
      const box = boxSel;
      hideBox();
      if (box.active) {
        const rect = canvas.getBoundingClientRect();
        const a = renderer.screenToCell(box.x0 - rect.left, box.y0 - rect.top);
        const b = renderer.screenToCell(box.x1 - rect.left, box.y1 - rect.top);
        setSelIds(boxSelectIds(getState().units, { c0: a.c, r0: a.r, c1: b.c, r1: b.r },
          { owner: getMpSession() ? getMpSession().slot : 0, additive: true, prev: getSelIds() }));
        setPendingKind(null);
        refreshPanel();
        return;
      }
    }
    if (wasPan && !wallLine) return;
    // پایان خط دیوار (0.47.0): هر تایل یک place جدا — همان معنای تک‌کلیک
    // (اعتبار/رد/هزینه در اجرا)؛ دیوار مسلح می‌ماند تا زنجیره بعدی.
    if (wallLine && wallLine.length) {
      const line = wallLine;
      clearWallLine();
      if (line.length && line.every((x) => !x.ok)) {
        sound.ack("deny");
        statusEl.textContent = t("main.wall.lineBlocked");
        refreshPanel();
        return;
      }
      if (getMpSession()) {
        for (const t of line) mpSend("place", { type: "wall", c: t.c, r: t.r });
      } else {
        for (const t of line) playerCmd( { kind: "place", type: "wall", c: t.c, r: t.r }, getState().tick);
      }
      sound.ack("place");
      refreshPanel();
      return;
    }
    if (wasPan) return;
    const rect = canvas.getBoundingClientRect();
    const cell = renderer.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
    const bHit = buildingAt(cell.c, cell.r), uHit = unitAt(cell.c, cell.r);
    const ownUnit = (u) => u && u.side === "player" && (!getMpSession() || (u.owner == null ? 0 : u.owner) === getMpSession().slot);
    // خودی در سولو یعنی مالک ۰ (0.42.0: بنای حریف AI خودی نیست — دروازه/سربازخانه/پاسگاهش لمس نمی‌شود).
    const ownBld = (b) => b && !b.destroyed && (b.owner == null ? 0 : b.owner) === (getMpSession() ? getMpSession().slot : 0);
    if (getSelectedUnit()) {
      // سربازخانه خودی حین استخدام مسلح (0.33.0): فقط نوار مزدورها toggle می‌شود؛ استخدام مسلح می‌ماند.
      if (bHit && bHit.type === "barracks" && ownBld(bHit)) { toggleMercs(bHit.id); refreshPanel(); return; }
      if (bHit && bHit.type === "mercpost" && ownBld(bHit)) { toggleMercs(bHit.id); refreshPanel(); return; }
      if (bHit && (bHit.type === "engineerguild" || bHit.type === "tunnelerguild") && ownBld(bHit)) { toggleMercs(bHit.id); refreshPanel(); return; }
      // بازار خودی حین استخدام مسلح (0.64.0 — ب-۳): فقط پنل معامله toggle می‌شود.
      // انبار غذای خودی حین استخدام مسلح (فاز ۱ بند ۲۹): فقط پنل جیره toggle می‌شود.
      if (bHit && bHit.type === "market" && ownBld(bHit)) { toggleMarket(bHit.id); refreshPanel(); return; }
      if (bHit && bHit.type === "granary" && ownBld(bHit)) { toggleGranary(bHit.id); refreshPanel(); return; }
      if (bHit || uHit) return; // روی موجود: کاری نکن
      if (getMpSession()) { mpSend("hire", { type: getSelectedUnit(), c: cell.c, r: cell.r }); sound.ack("hire"); return; }
      playerCmd( { kind: "hire", type: getSelectedUnit(), c: cell.c, r: cell.r }, getState().tick);
      sound.ack("hire");
      refreshPanel();
      return;
    }
    // زنگ خطر (0.17.0): مسلح و سراسری — هر کلیک نقشه = تجمع ارتش در آن نقطه
    // (حتی روی ساختمان؛ مقصد ناممکن به همسایه باز حل می‌شود).
    if (getPendingKind() === "alarm") {
      if (getMpSession()) { mpSend("alarm", { c: cell.c, r: cell.r }); setPendingKind(null); sound.ack("alarm"); refreshPanel(); return; }
      playerCmd( { kind: "alarm", c: cell.c, r: cell.r }, getState().tick);
      setPendingKind(null);
      sound.ack("alarm");
      refreshPanel();
      return;
    }
    // تخریب دستی (0.39.0): مسلح و سراسری — کلیک روی ساختمان خودی (غیر ستاد).
    // نامعتبر = پیام دلیل و مسلح می‌ماند؛ کلیک خالی = خلع.
    if (getPendingKind() === "demolish") {
      const own = getMpSession() ? getMpSession().slot : 0;
      const v = bHit && !bHit.destroyed
        ? (((bHit.owner == null ? 0 : bHit.owner) !== own) ? { ok: false, reason: "NOT_OWNED" }
          : bHit.type === "keep" ? { ok: false, reason: "KEEP" } : { ok: true, reason: "OK" })
        : null;
      if (v && v.ok) {
        if (getMpSession()) { mpSend("demolish", { bld: bHit.id }); }
        else playerCmd( { kind: "demolish", bld: bHit.id }, getState().tick);
        setPendingKind(null);
        sound.ack("place");
      } else if (v) {
        statusEl.textContent = DEMOLISH_FA[v.reason] || v.reason;
        sound.ack("deny");
      } else {
        setPendingKind(null);
      }
      refreshPanel();
      return;
    }
    // انتخاب یگان خودی (0.16.0): کلیک = تک‌انتخاب (تکرار = لغو)؛
    // شیفت+کلیک = افزودن/حذف ضامن به مجموعه انتخاب. در MP فقط یگان خودی.
    if (getPendingKind() === "repair") {
      const own = getMpSession() ? getMpSession().slot : 0;
      const v = bHit && !bHit.destroyed ? validateRepair(getState(), bHit.id, own) : null;
      if (v && v.ok) {
        if (getMpSession()) { mpSend("repair", { bld: bHit.id }); }
        else playerCmd( { kind: "repair", bld: bHit.id }, getState().tick);
        setPendingKind(null);
        sound.ack("place");
      } else if (v) {
        statusEl.textContent = REPAIR_FA[v.reason] || v.reason;
        sound.ack("deny");
      } else {
        setPendingKind(null);
      }
      refreshPanel();
      return;
    }
    if (uHit && ownUnit(uHit)) {
      if (e.shiftKey) {
        setSelIds(toggleInSet(getSelIds(), uHit.id));
      } else {
        setSelIds((getSelIds().length === 1 && getSelIds()[0] === uHit.id) ? [] : [uHit.id]);
      setSelBldId(null); setSelFoe(null);
      }
      // در MP انتخابِ واحد чужی قاطی نشود
      if (getMpSession()) setSelIds(getSelIds().filter((id) => {
        const u = getState().units.find((x) => x.id === id && !x.dead);
        return u && (u.owner == null ? 0 : u.owner) === getMpSession().slot;
      }));
      setPendingKind(null);
      refreshPanel();
      return;
    }
    // دستور جمعی به یگان‌های منتخب زنده (فقط خودی)
    const sels = resolveSet(getSelIds(), getState().units).filter((u) => !getMpSession() || (u.owner == null ? 0 : u.owner) === getMpSession().slot);
    if (sels.length) setSelFoe(null); // دستور با یگان منتخب = پایان بازرسی دشمن (0.274.0)
    if (sels.length) {
      const ids = sels.map((u) => u.id);
      if (uHit && !ownUnit(uHit)) {
        const q = e.shiftKey ? { queue: true } : {}; // صف وی‌پوینت (0.162.0)
        if (getMpSession()) { mpSend("order", { ids, kind: "attackmove", c: cell.c, r: cell.r, ...q }); setPendingKind(e.shiftKey ? getPendingKind() : null); sound.ack("order"); refreshPanel(); return; }
        playerCmd( { kind: "order", orderKind: "attackmove", ids, c: cell.c, r: cell.r, ...q }, getState().tick); // حمله به دشمن
        setPendingKind(e.shiftKey ? getPendingKind() : null);
        sound.ack("order");
        refreshPanel();
        return;
      }
      // حمله کلیکی به ساختمان دشمن (0.162.0): با یگان منتخب، کلیک روی بنای
      // دشمن = attackmove (درگیری با acquire موجود)؛ مسلح attackmove هم همین‌جا
      // مصرف می‌شود؛ نامعتبر = پیام دلیل + deny و انتخاب می‌ماند؛ بی‌تغییر sim.
      // بنای خودی دست‌نخورده می‌ماند (شاخه‌های خودی پایین‌تر).
      if ((!getPendingKind() || getPendingKind() === "attackmove") && bHit && !ownBld(bHit)) {
        const slot = getMpSession() ? getMpSession().slot : 0;
        const ap = attackPick(getState(), ids, bHit.id, slot);
        if (ap.ok) {
          const q = e.shiftKey ? { queue: true } : {};
          if (getMpSession()) { mpSend("order", { ids: ap.ids, kind: "attackmove", c: ap.c, r: ap.r, ...q }); }
          else { playerCmd( { kind: "order", orderKind: "attackmove", ids: ap.ids, c: ap.c, r: ap.r, ...q }, getState().tick); }
          setPendingKind(e.shiftKey ? "attackmove" : null);
          sound.ack("order");
        } else {
          statusEl.textContent = ATTACK_FA[ap.reason] || ap.reason;
          sound.ack("deny");
        }
        refreshPanel();
        return;
      }
      // دروازه سالم (0.13.0): کلیک = باز/بسته (مثل ساختمان، مقصد دستور نیست).
      if (bHit && bHit.type === "gate" && !bHit.destroyed && ownBld(bHit)) {
        if (getMpSession()) { mpSend("gate", { bld: bHit.id }); setPendingKind(null); sound.ack("place"); refreshPanel(); return; }
        playerCmd( { kind: "gate", bld: bHit.id }, getState().tick);
        setPendingKind(null);
        sound.ack("place");
        refreshPanel();
        return;
      }
      // استحکامات مستقیم (0.161.0 — §10.2/بند 559): کلیک مستقیم روی برج
      // خودی با یگان منتخب = fortify (بی‌نیاز از مسلح‌کردن گاریسون)؛
      // نامعتبر = دلیل قرمز + deny (همان ضربدر قرمز دفترچه). اجرا با فرمان
      // garrison موجود است — بی‌تغییر sim/MP/هش.
      if (!getPendingKind() && bHit && isGarrisonPost(bHit.type) && !bHit.destroyed && ownBld(bHit)) {
        const own = getMpSession() ? getMpSession().slot : 0;
        const pick = fortifyPick(getState(), ids, bHit.id, own);
        if (pick.ok) {
          if (getMpSession()) { mpSend("garrison", { ids: pick.ids, bld: pick.bld }); setPendingKind(null); sound.ack("order"); refreshPanel(); return; }
          playerCmd({ kind: "garrison", ids: pick.ids, bld: pick.bld }, getState().tick);
          setPendingKind(null);
          sound.ack("order");
        } else {
          statusEl.textContent = GARRISON_FA[pick.reason] || pick.reason;
          sound.ack("deny");
        }
        refreshPanel();
        return;
      }
      // نگهبانی (0.15.0): در حالت pending، کلیک روی ساختمان = پاسگاه جمعی.
      if (getPendingKind() === "guard") {
        if (bHit && !bHit.destroyed && ownBld(bHit)) {
          if (getMpSession()) { mpSend("guard", { ids, bld: bHit.id }); setPendingKind(null); sound.ack("order"); refreshPanel(); return; }
          playerCmd( { kind: "guard", ids, bld: bHit.id }, getState().tick);
          sound.ack("order");
        }
        setPendingKind(null);
        refreshPanel();
        return;
      }
      // گاریسون (0.45.0): در حالت pending، کلیک روی برج خودی = استقرار جمعی.
      if (getPendingKind() === "garrison") {
        if (bHit && isGarrisonPost(bHit.type) && !bHit.destroyed && ownBld(bHit)) {
          if (getMpSession()) { mpSend("garrison", { ids, bld: bHit.id }); setPendingKind(null); sound.ack("order"); refreshPanel(); return; }
          playerCmd( { kind: "garrison", ids, bld: bHit.id }, getState().tick);
          sound.ack("order");
        }
        setPendingKind(null);
        refreshPanel();
        return;
      }
      // پرتاب گاو (0.142.0): کلیک روی زمین = خانه هدف (روی دشمن هم همان خانه)؛
      // پیش‌بررسی همگام (گله/برد/سردی) + اجرا از صف فرمان (ضبط ری‌پلی).
      if (getPendingKind() === "firecow") {
        const cats = sels.filter((u) => isCowSiege(u) && u.deployed && (u.cowCd || 0) <= 0);
        if (cats.length) {
          const ids = cats.map((u) => u.id);
          if (getMpSession()) {
            mpSend("firecow", { ids, c: cell.c, r: cell.r });
          } else if (herdCows(getState(), 0) <= 0) {
            statusEl.textContent = FIRECOW_FA.NO_COW;
          } else {
            const def = UNITS[cats[0].type];
            const d = Math.hypot(cell.c + 0.5 - cats[0].x, cell.r + 0.5 - cats[0].r);
            if (d > (def.range || 10) || d < (def.minRange || 0)) {
              statusEl.textContent = FIRECOW_FA.OUT_OF_RANGE;
            } else {
              playerCmd({ kind: "firecow", ids, c: cell.c, r: cell.r }, getState().tick);
              sound.ack("order");
            }
          }
        }
        setPendingKind(null);
        refreshPanel();
        return;
      }
      if (!bHit && !uHit) {
        const kind = getPendingKind() === "attackmove" ? "attackmove" : getPendingKind() === "patrol" ? "patrol" : getPendingKind() === "attackpos" ? "attackpos" : "move";
        let oids = ids; // دروازه Lord (0.163.0): حرکت اربابِ بیرون Keep جدا می‌شود
        if (!getMpSession() && (kind === "move" || kind === "patrol")) {
          const gated = sels.filter((u) => isSoloLord(getState(), u) && !lordKeepGate(getState(), cell.c, cell.r));
          if (gated.length === sels.length) {
            statusEl.textContent = ORDER_FA.LORD_KEEP;
            sound.ack("deny");
            refreshPanel();
            return;
          }
          if (gated.length) {
            const gset = new Set(gated.map((u) => u.id));
            oids = ids.filter((id) => !gset.has(id));
            statusEl.textContent = ORDER_FA.LORD_KEEP;
          }
        }
        const q = e.shiftKey ? { queue: true } : {}; // صف وی‌پوینت (0.162.0)
        if (getMpSession()) { mpSend("order", { ids: oids, kind, c: cell.c, r: cell.r, ...q }); setPendingKind(e.shiftKey ? getPendingKind() : null); sound.ack("order"); refreshPanel(); return; }
        playerCmd( { kind: "order", orderKind: kind, ids: oids, c: cell.c, r: cell.r, ...q }, getState().tick);
        setPendingKind(e.shiftKey ? getPendingKind() : null);
        sound.ack("order");
        refreshPanel();
        return;
      }
      updateHover(e.clientX, e.clientY); // روی ساختمان: فقط نمایش، انتخاب می‌ماند
      return;
    }
    setSelIds([]); setSelBldId(null); setSelFoe(null);
    // بازرسی دشمن (0.274.0): کلیک خنثی روی نیرو/بنای دشمن = پنل پادشاه در buildBar.
    if (uHit && !uHit.dead && !ownUnit(uHit)) { setSelFoe({ kind: "unit", id: uHit.id }); setPendingKind(null); refreshPanel(); return; }
    if (bHit && !bHit.destroyed && !ownBld(bHit)) { setSelFoe({ kind: "bld", id: bHit.id }); setPendingKind(null); refreshPanel(); return; }
    // دروازه سالم بدون یگان منتخب هم با کلیک باز/بسته می‌شود (فقط خودی).
    if (bHit && bHit.type === "gate" && !bHit.destroyed && ownBld(bHit)) {
      if (getMpSession()) { mpSend("gate", { bld: bHit.id }); setPendingKind(null); sound.ack("place"); refreshPanel(); return; }
      playerCmd( { kind: "gate", bld: bHit.id }, getState().tick);
      setPendingKind(null);
      sound.ack("place");
      refreshPanel();
      return;
    }
    // سربازخانه خودی (0.33.0): کلیک خنثی = نوار افقی مزدورها روی نوار ساختمان (تکرار = بستن).
    if (bHit && bHit.type === "barracks" && ownBld(bHit)) {
      toggleMercs(bHit.id);
      setPendingKind(null);
      refreshPanel();
      return;
    }
    // بازار خودی (0.64.0 — ب-۳): کلیک خنثی = پنل معامله روی نوار ساختمان (تکرار = بستن).
    // انبار غذای خودی (فاز ۱ بند ۲۹): کلیک خنثی = پنل جیره روی نوار ساختمان (تکرار = بستن).
    if (bHit && bHit.type === "market" && ownBld(bHit)) {
      toggleMarket(bHit.id);
      setPendingKind(null);
      refreshPanel();
      return;
    }
    if (bHit && bHit.type === "granary" && ownBld(bHit)) {
      toggleGranary(bHit.id);
      setPendingKind(null);
      refreshPanel();
      return;
    }
    // dogcage (0.156.0): neutral click = immediate release (like gate toggle).
    if (bHit && bHit.type === "dogcage" && ownBld(bHit)) {
      const slot = getMpSession() ? getMpSession().slot : 0;
      const vr = validateRelease(getState(), bHit, slot);
      if (!vr.ok) { statusEl.textContent = RELEASE_FA[vr.reason] || vr.reason; sound.ack("deny"); }
      else if (getMpSession()) { mpSend("release", { bld: bHit.id }); sound.ack("order"); }
      else { playerCmd({ kind: "release", bld: bHit.id }, getState().tick); sound.ack("order"); }
      setPendingKind(null);
      refreshPanel();
      return;
    }
    // پنل اطلاعات ساختمان (0.174.0 — §3.3/بند 150): کلیک خنثی روی بنای خودی =
    // نمایش کارت (انتخاب یگان پاک می‌شود تا کارت یگان قاطی نشود).
    if (bHit && !bHit.destroyed && ownBld(bHit)) {
      setSelBldId(bHit.id); setSelIds([]); setSelFoe(null); setPendingKind(null); refreshPanel(); return;
    }
    const def = selectedDef();
    if (!def) { updateHover(e.clientX, e.clientY); refreshPanel(); return; } // حالت خنثی: کلیک خالی کاری نمی‌کند
    if (getMpSession()) {
      // پیش‌اعتبارسنجی محلی (همان validate با مالک=اسلات من): رد = پیام + صدا و ورودی هدر نمی‌رود.
      const pv = validate(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H, cell.c, cell.r, def, getMpSession().slot);
      if (!pv.ok) { statusEl.textContent = REASON_FA[pv.reason] || pv.reason; sound.ack("deny"); return; }
      mpSend("place", { type: def.key, c: cell.c, r: cell.r }); sound.ack("place"); return;
    }
    playerCmd( { kind: "place", type: def.key, c: cell.c, r: cell.r }, getState().tick);
    sound.ack("place");
    refreshPanel();
  });
  canvas.addEventListener("pointercancel", (e) => {
    const { getEditor, edPaintAt, edCellFromEvent } = later();
    if (getEditor()) getEditor().painting = false;
    hideBox(); clearWallLine(); touchPts.delete(e.pointerId); if (touchPts.size < 2) pinchState = null;
    cancelLongPress(); endDrag(e); midPan = false; setHover(null);
  });
  canvas.addEventListener("lostpointercapture", (e) => {
    const { getEditor, edPaintAt, edCellFromEvent } = later();
    if (getEditor()) getEditor().painting = false;
    touchPts.delete(e.pointerId); if (touchPts.size < 2) pinchState = null; cancelLongPress();
    if (e.pointerId === activePointerId && downPos) { hideBox(); clearWallLine(); endDrag(e); midPan = false; }
  });
  window.addEventListener("blur", () => { hideBox(); clearWallLine(); touchPts.clear(); pinchState = null; cancelLongPress(); downPos = null; panning = false; midPan = false; movedFar = false; activePointerId = null; });
  // راست‌کلیک: خلع ساختمان/استخدام (انتخاب یگان می‌ماند) — راه سریع برگشت به فرمان
  canvas.addEventListener("contextmenu", (e) => {
    const { getEditor, edPaintAt, edCellFromEvent } = later();
    e.preventDefault();
    if (getEditor()) return; // ویرایشگر: راست‌کلیک خلع ندارد
    setSelectedUnit(null); setSelectedKey(null); setPendingKind(null); clearWallLine();
    refreshPanel();
  });
  canvas.addEventListener("dblclick", (e) => {
    const { getEditor, edPaintAt, edCellFromEvent } = later();
    // دابل‌کلیک هم‌نوع (0.173.0 — §3.3/بند 167 + §10.1/بند 552 تکراری):
    // انتخاب همه هم‌نوع‌های خودیِ زندهٔ روی صفحه. دو کلیک تکی اول می‌نشینند (بی‌ضرر).
    if (getEditor() || getReplayWatch()) return;
    const rect = canvas.getBoundingClientRect();
    const cell = renderer.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
    const uHit = unitAt(cell.c, cell.r);
    const own = getMpSession() ? getMpSession().slot : 0;
    if (!uHit || uHit.side !== "player" || (uHit.owner == null ? 0 : uHit.owner) !== own) return;
    setSelIds(sameTypeIds(getState().units, uHit, {
      owner: own,
      onScreen: (u) => {
        const p = renderer.cellToScreen(u.x, u.r);
        return p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom;
      },
    }));
    setPendingKind(null);
    refreshPanel();
  });
  canvas.addEventListener("pointerleave", (e) => {
    if (downPos && e.pointerId === activePointerId) return; // حین درگ (با کپچر، leave کاذب می‌آید)
    setHover(null);
  });
  // ردیابی ماوس برای لبه‌اسکرول (0.176.0 — بند 154): فقط ماوس و فقط حین
  // بازی (نه ویرایشگر)؛ لمس/قلم نادیده. اعمال در frame() انجام می‌شود.
  canvas.addEventListener("pointermove", (e) => {
    const { getEditor, edPaintAt, edCellFromEvent } = later();
    if (getEditor()) { lastEdgePos = null; return; }
    if (e.pointerType !== "mouse") { lastEdgePos = null; return; }
    const r = canvas.getBoundingClientRect();
    lastEdgePos = { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  });
  canvas.addEventListener("pointerleave", () => { lastEdgePos = null; });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    // گردش بوکمارک (0.162.0): Alt+چرخ = بوکمارک بعدی؛ وگرنه زوم معمول.
    if (e.altKey) {
      const nx = bookmarkCycle(getBookmarks(), getLastBookmark());
      if (nx != null) {
        const b = bookmarkGet(getBookmarks(), nx);
        setLastBookmark(nx);
        renderer.view.panX = b.x; renderer.view.panY = b.y; renderer.view.zoom = b.z;
        renderer.markDirty();
        statusEl.textContent = t("main.bookmark.recall", { slot: nx });
        refreshPanel();
        return;
      }
    }
    const z0 = renderer.view.zoom;
    const z1 = zoomStep(z0, e.deltaY < 0); // گام مشترک با کلید Z (0.173.0)
    renderer.view.zoom = z1;
    renderer.markDirty();
  }, { passive: false });
  return { clearWallLine, hideBox, getDownPos: () => downPos, getLastEdgePos: () => lastEdgePos, getWallLine: () => wallLine };
}
