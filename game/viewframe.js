// نما/قاب (0.271.0 — C-CLN-91): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { createFlatView } from "./flatview.js";
import { createMinimapUI } from "./minimapui.js";
import { edgePanDir, EDGE_PAN_STEP } from "./gestures.js";
import { soundSnapshot } from "./sound.js";
import { t } from "./i18n.js";
import { faNum } from "./format.js";

export function createViewFrameUI({ getState, getTerrain, getHover, getSelIds, getLastSoundSnap, setLastSoundSnap, getFidelity, getFidelityAuto, setFidelityAuto, $, clock, sound, renderer, getEditor, editorUI, blankView, ghostDef, getWallLine, getDownPos, getLastEdgePos, modalOverlay, fpsEl, statusEl, t, faNum, CONFIG, applyFidelity, keyMap, createFlatView, createMinimapUI, edgePanDir, EDGE_PAN_STEP, soundSnapshot }) {
  // ریسایز بدون ResizeObserver (جلوگیری از حلقه RO): رویداد + چک دوره‌ای کم‌هزینه
  window.addEventListener("resize", () => renderer.resize());
  setInterval(() => renderer.resize(), 600);
  document.querySelector("[data-fit]").addEventListener("click", () => renderer.fit());
  // نمای تخت (0.25.0): حذف ارتفاع ساختمان‌ها تا پشت‌شان دیده شود؛ در حافظه می‌ماند.
  // Space = تاگل (0.179.0 — بند 1141)؛ نگه‌داشتن V = نگاه لحظه‌ای Peek (0.179.0 — بند 160).
  // هر دو UI-side خالص‌اند (فقط view)؛ sim/هش/ذخیره بی‌خبر.
  const flatBtn = document.querySelector("[data-flat]");
  const flat = createFlatView(flatBtn, renderer);
  if (flatBtn) {
    let flatInit = false;
    try { flatInit = localStorage.getItem("scw.flat") === "1"; } catch {}
    flat.apply(flatInit);
    flatBtn.addEventListener("click", () => flat.apply(!renderer.isFlat()));
  }
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const tag = (e.target && e.target.tagName) || "";
    // دکمه فوکوس‌شده فعال‌سازی بومی خودش را دارد (Space/Enter) — میان‌بر نزن تا دو بار عمل نکند.
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) return;
    if (e.code === keyMap.flat) {
      e.preventDefault();
      flat.apply(!renderer.isFlat());
    } else if (e.code === keyMap.peek) {
      e.preventDefault();
      flat.apply(true, true); // لحظه‌ای: ذخیره دست نخورده می‌ماند
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code !== keyMap.peek) return;
    const tag = (e.target && e.target.tagName) || "";
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) return;
    flat.apply(flat.stored()); // برگشت به انتخاب ماندگار کاربر
  });

  const minimapUI = createMinimapUI({ renderer, getState: () => getState(), getTerrain: () => getTerrain(), getEditor: () => editorUI.getEditor(), blankView });
  let lastFpsT = performance.now(), frames = 0, fps = 0, lowFpsStreak = 0;
  function frame(now) {
    clock.frame(now);
    sound.tick(); // موسیقی مولد/طبل نبرد روی ساعت صوتی (ارزان؛ بدون ctx = هیچ)
    // درون‌یابی نمایشی بین دو تیک (فاز ۰ بند ۱): alpha از ساعت؛ sim جدا از
    // رندر با گام ثابت CONFIG.TICK_HZ می‌تازد و رندر ۶۰fps با lerp نرم می‌کند.
    // لبه‌اسکرول (0.176.0 — بند 154): ماوس ساکن در حاشیه بوم = پن پیوسته
    // هر فریم؛ فقط حین بازی (منو/مودال بسته، بدون درگ فعال). فقط نماست.
    if (getLastEdgePos() && !getDownPos() && $("menuScreen").hidden && modalOverlay && modalOverlay.hidden) {
      const ed = edgePanDir(getLastEdgePos().x, getLastEdgePos().y, getLastEdgePos().w, getLastEdgePos().h);
      if (ed.dx || ed.dy) {
        renderer.view.panX += ed.dx * EDGE_PAN_STEP;
        renderer.view.panY += ed.dy * EDGE_PAN_STEP;
        renderer.markDirty();
      }
    }
    const alpha = (typeof clock.alpha === "function" ? clock.alpha() : 1);
    // ویرایشگر (0.51.0): فقط زمین موقت، بدون ساختمان/یگان/گوست/هاور.
    renderer.draw(getEditor() ? blankView() : getState(), getTerrain(),
      getEditor() ? null : getHover(), getEditor() ? null : ghostDef(),
      getEditor() ? [] : getSelIds(), getEditor() ? null : getWallLine(), getEditor() ? 1 : alpha);
    // دست‌تکان یک‌بار به قاب والد (پیش‌نمایش ریشه ژنراتور): اولین فریم کشیده
    // شد = بوت کامل و حلقه رندر زنده است. cross-origin بی‌خطر (پیام یک‌طرفه).
    if (!window.__argHelloSent) {
      window.__argHelloSent = true;
      try { window.parent.postMessage({ type: "arg-alive", tick: getState().tick }, "*"); } catch (e) {}
    }
    minimapUI.tickMinimap();
    // تغذیه صدا (0.48.0): هر ۵ تیکِ بازیِ در حال اجرا یک اسنپ‌شات سبک؛
    // پرچم‌ها (مرگ/ویرانی/اتمام/پایان) latch هستند پس با این آهنگ جا نمی‌مانند.
    if (!getState().paused && $("menuScreen").hidden && getState().tick % 5 === 0 && getState().tick > 0) {
      const snap = soundSnapshot(getState());
      if (getLastSoundSnap() && getState().tick !== getLastSoundSnap().tick) sound.update(getLastSoundSnap(), snap);
      setLastSoundSnap({ tick: getState().tick, ...snap });
    } else if (getState().paused || !$("menuScreen").hidden) {
      setLastSoundSnap(null); // مکث/منو: baseline تازه تا برگشت، سیل رویداد ندهد
    }
    frames++;
    if (now - lastFpsT >= 500) {
      fps = Math.round((frames * 1000) / (now - lastFpsT));
      frames = 0; lastFpsT = now;
      fpsEl.textContent = t("main.fps", { fps }) + (getFidelityAuto() ? ` ${t("main.fps.auto", { f: getFidelity() })}` : "");
      // افت خودکار کیفیت (0.58.0 — #۲۷): زیر ۲۰fps پله‌ای کم می‌کند (فقط پایین،
      // هرگز بالا)؛ انتخاب دستی کاربر لغوش می‌کند. sim دست‌نخورده می‌ماند.
      // نمونه‌های پیاپی (۴×۵۰۰ms) لازم است: افت لحظه‌ای (تب/مودال/بارگذاری) کیفیت را برای همیشه نمی‌کاهد.
      lowFpsStreak = (fps < 20 && $("menuScreen").hidden && !document.hidden) ? lowFpsStreak + 1 : 0;
      if (lowFpsStreak >= 4) {
        lowFpsStreak = 0;
        const next = getFidelity() === "full" ? "balanced" : getFidelity() === "balanced" ? "lite" : null;
        if (next) {
          setFidelityAuto(true);
          applyFidelity(next, true);
          statusEl.textContent = t("main.fps.low", { fps, next });
        }
      }
    }
    requestAnimationFrame(frame);
  }
  return { flat, frame, minimapUI };
}
