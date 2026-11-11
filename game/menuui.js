// منو و بازگشت به بازی (0.260.0 — C-CLN-78): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { ensureWakeLock, releaseWakeLock } from "./wakelock.js";
import { CONFIG } from "./config.js";
import { t } from "./i18n.js";
import { A11Y_PALETTES, validPalette, clampScale } from "./a11y.js";
import { parseSeed, randomSeed } from "./seed.js";
import { namedMapByKey } from "./mapedit.js";
import { loadReplaySlot } from "./replay.js";
import { hudShouldCollapse, setHudOpen, toggleHud } from "./mobilehud.js";
import { sheetShouldOverlay, setSheetOpen, toggleSheet } from "./mobilesheet.js";
import { validIdentity } from "./combat.js";
import { validAutosave } from "./persist.js";

function $(id) { return document.getElementById(id); }

export function createMenuUI({ getMpSession, getState, sound, renderer, refreshPanel }) {
  function menuMsg(m) {
    const el = $("menuMsgEl");
    if (el) el.textContent = m || "";
  }
  const menuRelabelFns = []; // پر کردن‌های سلکت‌های منو که با تغییر زبان دوباره اجرا می‌شوند
  let menuStarted = false; // پس از نخستین شروع، «بازگشت به بازی» فعال می‌شود
  let menuNavApi = null; // ناوبری چندصفحه‌ای منو (menunav.js) — پس از boot ساخته می‌شود
  function showMenu() {
    if (menuNavApi) menuNavApi.reset(); // صفحه اول همیشه فقط فهرست دکمه‌هاست
    sound.setMood("menu");
    try { releaseWakeLock(); } catch (e) {} // بازگشت به منو: قفل بیداری رها شود (0.223.0 — C-MOB-3)
    if (!getMpSession()) getState().paused = true; // بازی پشت منو متوقف می‌ماند
    const ms = $("menuScreen");
    if (ms) ms.hidden = false;
    const mc = $("menuCloseBtn");
    if (mc) mc.hidden = !menuStarted && !getMpSession();
    menuMsg("");
    refreshPanel();
  }
  function hideMenu() {
    sound.setMood("game");
    try { ensureWakeLock(); } catch (e) {} // موبایل: نمایشگر وسط نبرد خاموش نشود (0.223.0 — C-MOB-3)
    const ms = $("menuScreen");
    if (ms) ms.hidden = true;
    menuStarted = true;
    const mc = $("menuCloseBtn");
    if (mc) mc.hidden = false;
    if (!getMpSession() && !getState().defeated && !getState().victorious) getState().paused = false;
    renderer.resize();
    renderer.fit();
    // شروع تازه تک‌نفره: دوربین روی قلعه خودت (ساختمان‌ها خوانا)؛ «نمایش کل نقشه» همان fit قبلی است.
    if (!getMpSession() && getState().tick < 5) {
      const keep = getState().buildings.find((b) => b.type === "keep" && (b.owner == null || b.owner === 0));
      if (keep) renderer.focus(keep.c + keep.w / 2, keep.r + keep.h / 2, 1.8);
    }
    menuMsg("");
    refreshPanel();
  }
  function getMenuNavApi() { return menuNavApi; }
  function setMenuNavApi(v) { menuNavApi = v; }
  function getMenuRelabelFns() { return menuRelabelFns; }
  return { menuMsg, showMenu, hideMenu, getMenuNavApi, setMenuNavApi, getMenuRelabelFns };
}

// سیم‌کشی منوی شروع (0.262.0 — C-CLN-82): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
export function wireMenuUI({ getSoloDiff, setSoloDiff, getSoloMapKey, setSoloMapKey, getSoloPersonality, setSoloPersonality, getSoloIdentity, setSoloIdentity, getA11yPalette, setA11yPalette, getUiScale, setUiScale, getKeyRecAction, setKeyRecAction, getSoloAutosave, setSoloAutosave, getDayNight, getFidelity, getMpSession, getState, getStartWatch, menuMsg, showMenu, hideMenu, getMenuRelabelFns, wireMasters, paintMasters, paintCampaign, setLastMissionKey, keyUI, paintMapPreview, applyA11y, applyDayNight, applyFidelity, newGame }) {
    const solo = $("soloBtn"), close = $("menuCloseBtn"), mb = $("menuBtn"), badge = $("profileBadgeEl");
    const diffSel = $("diffSel");
    // درجه سختی (0.50.0): انتخاب در localStorage می‌ماند و با شروع تک‌نفره اعمال می‌شود.
    if (diffSel) {
      diffSel.value = getSoloDiff();
      diffSel.addEventListener("change", () => {
        if (CONFIG.AI.difficulties[diffSel.value]) {
          setSoloDiff(diffSel.value);
          try { localStorage.setItem("scw.difficulty", getSoloDiff()); } catch (e) {}
        } else {
          diffSel.value = getSoloDiff();
        }
      });
    }
    // نقشه نام‌دار (0.52.0): سلکت گزینه‌ها را می‌سازد؛ انتخاب = پرکردن ورودی
    // سید + ماندگاری؛ شروع از ورودی خوانده می‌شود (نام در newGame از کاتالوگ).
    const mapSel = $("mapSel");
    if (mapSel) {
      const fillMapSel = () => {
        const cur = mapSel.value || getSoloMapKey();
        mapSel.innerHTML = "";
        const oc = document.createElement("option");
        oc.value = "custom";
        oc.textContent = t("main.map.custom");
        mapSel.appendChild(oc);
        for (const m of CONFIG.MAPS) {
          const o = document.createElement("option");
          o.value = m.key;
          o.textContent = t("main.map.option", { name: m.name, seed: m.seed });
          mapSel.appendChild(o);
        }
        mapSel.value = cur;
        paintMapPreview();
      };
      fillMapSel();
      getMenuRelabelFns().push(fillMapSel);
      wireMasters(); // استادان نبرد (0.182.0 — بند 102): دکمه‌های سورت + حذف
      paintMasters(); // پرکردن اولیه (دکمه‌های سورت بی‌متن نمانند — t_tooltips_all)
      getMenuRelabelFns().push(paintMasters);
      paintCampaign(); // پرکردن اولیه فهرست مأموریت‌ها (0.225.0 — فاز ۲)
      getMenuRelabelFns().push(paintCampaign);
      const nm0 = namedMapByKey(getSoloMapKey());
      const inp0 = $("seedInput");
      if (nm0 && inp0 && !inp0.value) inp0.value = String(nm0.seed);
      mapSel.addEventListener("change", () => {
        const nm = namedMapByKey(mapSel.value);
        setSoloMapKey(nm ? nm.key : "custom");
        try { localStorage.setItem("scw.map", getSoloMapKey()); } catch (e) {}
        const inp = $("seedInput");
        if (inp && nm) inp.value = String(nm.seed);
        paintMapPreview();
      });
    }
    // شخصیت حریف (0.56.0): گزینه‌ها از CONFIG ساخته می‌شوند؛ انتخاب = ماندگاری.
    const persSel = $("persSel");
    if (persSel) {
      const fillPersSel = () => {
        const cur = persSel.value || getSoloPersonality();
        persSel.innerHTML = "";
        for (const [key, p] of Object.entries(CONFIG.AI.personalities)) {
          const o = document.createElement("option");
          o.value = key;
          o.textContent = `${p.name} — ${p.desc}`;
          persSel.appendChild(o);
        }
        persSel.value = cur;
      };
      fillPersSel();
      getMenuRelabelFns().push(fillPersSel);
      persSel.addEventListener("change", () => {
        if (CONFIG.AI.personalities[persSel.value]) {
          setSoloPersonality(persSel.value);
          try { localStorage.setItem("scw.personality", getSoloPersonality()); } catch (e) {}
        } else {
          persSel.value = getSoloPersonality();
        }
      });
    }
    // هویت آغازین (0.153.0 — بند 104): گزینه‌ها استاتیک‌اند (واگردان خودکار
    // با data-i18n)؛ انتخاب = ماندگاری.
    const identSel = $("identSel");
    if (identSel) {
      identSel.value = validIdentity(getSoloIdentity()) || "none";
      identSel.addEventListener("change", () => {
        if (validIdentity(identSel.value)) {
          setSoloIdentity(identSel.value);
          try { localStorage.setItem("scw.identity", getSoloIdentity()); } catch (e) {}
        } else {
          identSel.value = getSoloIdentity();
        }
      });
    }
    // دسترس‌پذیری (0.57.0 — #۲۶): پالت/مقیاس/کلیدها — انتخاب = اعمال + ماندگاری.
    const palSel = $("a11yPalSel");
    if (palSel) {
      const fillPalSel = () => {
        const cur = palSel.value || getA11yPalette();
        palSel.innerHTML = "";
        for (const [key, p] of Object.entries(A11Y_PALETTES)) {
          const o = document.createElement("option");
          o.value = key;
          o.textContent = p.name;
          palSel.appendChild(o);
        }
        palSel.value = cur;
      };
      fillPalSel();
      getMenuRelabelFns().push(fillPalSel);
      palSel.addEventListener("change", () => {
        setA11yPalette(validPalette(palSel.value));
        palSel.value = getA11yPalette();
        try { localStorage.setItem("scw.a11y", getA11yPalette()); } catch (e) {}
        applyA11y();
      });
    }
    const scaleSel = $("a11yScaleSel");
    if (scaleSel) {
      scaleSel.value = String(getUiScale());
      scaleSel.addEventListener("change", () => {
        setUiScale(clampScale(scaleSel.value));
        scaleSel.value = String(getUiScale());
        try { localStorage.setItem("scw.uiscale", String(getUiScale())); } catch (e) {}
        applyA11y();
      });
    }
    for (const b of document.querySelectorAll("[data-keyact]")) {
      b.addEventListener("click", () => {
        const a = b.dataset.keyact;
        setKeyRecAction(getKeyRecAction() === a ? null : a); // کلیک دوباره = انصراف
        keyUI.paint();
      });
    }
    keyUI.paint();
    applyA11y(); // نشست اولیه روی بوت (ماندگاری‌های قبلی)
    // کیفیت رسم (0.58.0 — #۲۷): سلکت + نشست اولیه روی renderer.
    const fidSel = $("fidSel");
    if (fidSel) {
      fidSel.value = getFidelity();
      fidSel.addEventListener("change", () => applyFidelity(fidSel.value, false));
    // فاصله ذخیره خودکار (0.153.0 — بند 117): انتخاب = ماندگاری.
    const autosaveSel = $("autosaveSel");
    if (autosaveSel) {
      autosaveSel.value = validAutosave(getSoloAutosave()) || "s30";
      autosaveSel.addEventListener("change", () => {
        if (validAutosave(autosaveSel.value)) {
          setSoloAutosave(autosaveSel.value);
          try { localStorage.setItem("scw.autosave", getSoloAutosave()); } catch (e) {}
        } else {
          autosaveSel.value = getSoloAutosave();
        }
      });
    }
    }
    const daySel = $("daySel");
    if (daySel) {
      daySel.value = getDayNight();
      daySel.addEventListener("change", () => applyDayNight(daySel.value));
    }
    applyDayNight(getDayNight());
    applyFidelity(getFidelity(), true);
    if (solo) solo.addEventListener("click", () => {
      if (getMpSession()) { menuMsg(t("main.menu.leaveRoomFirst")); return; }
      setLastMissionKey(null); // شروع دستی سولو = خروج از حالت مأموریت (0.225.0)
      const inp = $("seedInput");
      const typed = inp && inp.value ? inp.value.trim() : "";
      const diff = diffSel && CONFIG.AI.difficulties[diffSel.value] ? diffSel.value : getSoloDiff();
      const pers = persSel && CONFIG.AI.personalities[persSel.value] ? persSel.value : getSoloPersonality();
      const ident = identSel && validIdentity(identSel.value) ? identSel.value : getSoloIdentity();
      const ms = $("mapSel");
      const named = ms ? namedMapByKey(ms.value) : null;
      if (typed) {
        const s = parseSeed(typed);
        if (s == null) { menuMsg(t("main.seed.invalid")); return; }
        newGame(s, diff, undefined, pers, ident, true); // نام (کاتالوگ/خالی) در newGame حل می‌شود؛ دریاچه از سید و ستاد انتخابی (0.292.0)
      } else if (named) {
        newGame(named.seed, diff, undefined, pers, ident);
      } else {
        newGame(randomSeed(), diff, undefined, pers, ident, true); // نقشه‌ی تازه‌ی تصادفی (0.292.0)
      }
      getState().paused = false;
      hideMenu();
    });
    if (close) close.addEventListener("click", hideMenu);
    if (mb) mb.addEventListener("click", showMenu);
    if (badge) badge.addEventListener("click", showMenu);
    const hudBtn = $("hudMenuBtn"); // موبایل 480px: نوار بالا پشت ☰ (0.224.0 — C-MOB-4)
    if (hudBtn) { hudBtn.addEventListener("click", () => toggleHud()); if (hudShouldCollapse(window.innerWidth)) setHudOpen(false); }
    const sheetBtn = $("sheetToggleBtn"); // موبایل 800px: شیت پایین به‌جای ستون (0.224.0 — C-MOB-5)
    if (sheetBtn) { sheetBtn.addEventListener("click", () => toggleSheet()); if (!sheetShouldOverlay(window.innerWidth)) setSheetOpen(false); }
    // تماشای ری‌پلی ذخیره‌شده از منو (0.49.0)
    const mrp = $("menuReplayBtn");
    if (mrp) mrp.addEventListener("click", () => {
      if (getMpSession()) { menuMsg(t("main.menu.leaveRoomFirst")); return; }
      const saved = loadReplaySlot();
      if (!saved) { menuMsg(t("main.replay.noSaved")); return; }
      const r = getStartWatch()(saved, t("main.replay.savedLabel"));
      if (!r.ok) menuMsg(t("main.err.prefix", { msg: r.reason }));
    });
}
