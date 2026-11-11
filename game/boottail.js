// دم بوت (0.272.0 — C-CLN-92): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { migrateToIdb, infoSlot, SLOTS } from "./persist.js";
import { t, onLangChange } from "./i18n.js";
import { paintBadge } from "./profileui.js";
import { firstRunAsk } from "./profile.js";

export function createBootTail({ getState, getProfile, getMenuRelabelFns, refreshPanel, setTick, assignStaff, showMenu, getMenuNavApi, $, paintCompat, saveStatus, policy, keyUI, soundUI, flat, renderer, paintSeed, paintReplayStatus, paintReplayBar, paintMp, lobby, paintMarket, paintTrain, getEditor, syncEditorPanel, edCounts, online, frame }) {
  refreshPanel();
  setTick(0);
  assignStaff(getState());
  // شروع پشت منوی انتخاب حالت (0.27.0): بازی متوقف تا تک‌نفره/چندنفره انتخاب شود.
  getState().paused = true;
  showMenu();
  // اولین اجرا (0.152.0 — §۱.۱/بند ۱۰۳): بی‌پروفایل ذخیره‌شده = منو روی
  // صفحه شناسه باز می‌شود تا بازیکن از همان اول نام جنگی خودش را بدهد.
  if (getMenuNavApi() && firstRunAsk()) {
    getMenuNavApi().go("getProfile()");
    const pni = $("profileNameInput");
    if (pni) pni.focus({ preventScroll: true });
  }
  window.__argBooted = true; // نگهبان بوت index.html: صفحه «بارگذاری نشد» دیگر لازم نیست
  // ابزارهای توسعه (شمارنده تیک، موج دستی، fps، شمار ساخته/ردشده) فقط با ?dev یا ?test دیده می‌شوند.
  if (/[?&](dev|test)(=|&|$)/.test(window.location.search)) document.body.classList.add("dev");
  // نسخه انتشار از تنها منبع (فرایند انتشار را ببین)
  fetch("VERSION").then((r) => r.text()).then((txt) => {
    const v = txt.trim().replace(/^"|"$/g, "");
    if (/^\d+\.\d+\.\d+$/.test(v)) { $("verEl").textContent = v; const mv = $("menuVerEl"); if (mv) mv.textContent = v; }
  }).catch(() => { /* پیش‌نمایش بدون service worker: نسخه نمایشی می‌ماند */ });
  // ماتریس سازگاری (0.58.0 — #۲۷): رندر در کارت راهنما + هشدار اگر required کم است.
  paintCompat();
  // مهاجرت یک‌بار localStorage → IDB (0.55.0 — #۱۶) و پیام وضعیت اسلات‌ها.
  // ناهمگام است پس پیام «در حال بررسی…» اول می‌آید و نتیجه بعداً می‌نشیند.
  saveStatus.textContent = t("main.save.checking");
  migrateToIdb().catch(() => ({ ok: false })).then(async () => {
    const info = await infoSlot(SLOTS.auto);
    const m = await infoSlot(SLOTS.manual);
    if (m.exists) saveStatus.textContent = t("main.save.haveManual", { tick: m.tick, bytes: m.bytes });
    else if (info.exists) saveStatus.textContent = t("main.save.haveAuto", { tick: info.tick });
    else saveStatus.textContent = t("main.save.none");
  });
  // تغییر زبان: هرچه یک‌بار در بوت ساخته شده (پالت، سلکت‌ها، لوگوها…) دوباره برچسب می‌خورد
  // و پنل‌های دوره‌ای تازه می‌شوند. فقط نمایش؛ getState()/sim دست‌نخورده.
  onLangChange(() => {
    policy.relabelPalette();
    for (const fn of getMenuRelabelFns()) fn();
    for (const btn of document.querySelectorAll("#profileLogoGrid [data-logo]")) {
      btn.title = t("main.profile.logoTitle", { n: (btn.dataset.logo | 0) + 1 });
    }
    keyUI.paint();
    paintBadge(getProfile());
    soundUI.paintSoundBtn();
    flat.paint(renderer.isFlat());
    paintCompat();
    setTick(getState().tick);
    paintSeed(getState());
    paintReplayStatus();
    paintReplayBar();
    paintMp(lobby);
    paintMarket();
    paintTrain();
    policy.paintPolicyTips();
    if (getEditor()) { syncEditorPanel(); edCounts(); }
    if (online && typeof online.relabel === "function") online.relabel();
    refreshPanel();
  });
  requestAnimationFrame(frame);
}
