// دکمه‌های سفارش/مودال/صدا/مالیات (0.267.0 — C-CLN-87): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { CONFIG } from "./config.js";
import { taxAt } from "./economy.js";
import { spawnWave, canGarrisonType, isCowSiege, AMMO_RESUPPLY_STONE, AMMO_RESUPPLY_ROCKS, RESUPPLY_FA, UNITS } from "./combat.js";
import { resolveSet } from "./selection.js";
import { createModals } from "./modal.js";
import { createSoundUI } from "./soundui.js";
import { missionByKey } from "./campaign.js";
import { t } from "./i18n.js";
import { badB } from "./format.js";

export function createOrdersUI({ getState, getTerrain, getMpSession, getReplayWatch, getSelIds, getPendingKind, setPendingKind, setSelectedKey, setSelectedUnit, getExactRes, setExactRes, later, $, alarmBtn, defeatRestartBtn, demolishBtn, lobby, mpSend, orderSels, pauseBtn, playerCmd, ratBtns, refreshPanel, repairBtn, resEl, resetBtn, scribeUI, sound, speedBtn, statusEl, taxBtns, taxSlider, undoBtn, victoryRestartBtn, waveBtn }) {
  // مودال‌های نوار پایین (0.31.0): کارت‌های ذخیره/راهنما/آنلاین از پنل کناری
  // به جعبه‌های مودال می‌روند و با آیکون‌های انتهای چپ استاتوس‌بار باز می‌شوند.
  // همان گره‌ها جابه‌جا می‌شوند، پس همه سیم‌کشی‌ها (ذخیره/تالار/…) سر جایشان‌اند.
  const modalOverlay = $("modalOverlay");
  const modals = { tax: $("taxModal"), save: $("saveModal"), help: $("helpModal"), online: $("onlineModal") };
  const modal = createModals(modalOverlay, modals);
  $("taxModal").appendChild($("taxCard"));
  $("saveModal").appendChild($("saveCard"));
  $("helpModal").appendChild($("helpCard"));
  $("onlineModal").appendChild($("onlineCard"));
  // تله فوکوس: Tab داخل مودال باز می‌چرخد (Esc از شنونده سراسری بالا می‌بندد)
  modalOverlay.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || modalOverlay.hidden) return;
    const box = Object.values(modals).find((m) => !m.hidden);
    if (!box) return;
    const f = [...box.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      .filter((x) => !x.disabled && !x.hidden && x.offsetParent !== null);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  $("saveIconBtn").addEventListener("click", () => modal.toggle("save"));
  $("helpIconBtn").addEventListener("click", () => modal.toggle("help"));
  $("taxIconBtn").addEventListener("click", () => modal.toggle("tax"));
  // صدا (0.48.0): دکمه بی‌صدا/باصدا با ماندگاری localStorage؛ شروع واقعی
  // AudioContext با اولین ژست (pointerdown سراسری) است، این دکمه فقط mute است.
  const soundIconBtn = $("soundIconBtn");
  const volMusic = $("volMusic"), volSfx = $("volSfx"), volMute = $("volMute");
  const soundUI = createSoundUI({ sound, soundIconBtn, volMusic, volSfx, volMute });
  const onlineIconBtn = $("onlineIconBtn");
  onlineIconBtn.addEventListener("click", () => modal.toggle("online"));
  // آیکون آنلاین فقط وقتی که اتصال هست (آینه hidden کارت تالار)
  onlineIconBtn.hidden = $("onlineCard").hidden;
  new MutationObserver(() => { onlineIconBtn.hidden = $("onlineCard").hidden; })
    .observe($("onlineCard"), { attributes: true, attributeFilter: ["hidden"] });
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay || e.target.closest("[data-close]")) modal.close();
  });
  // کارت یگان: موضع + دستورهای فوری
  const unitCard = $("unitCard"), unitNameEl = $("unitNameEl"), unitHpEl = $("unitHpEl");

  const bldCard = $("bldCard"), bldNameEl = $("bldNameEl"), bldHpEl = $("bldHpEl"), bldStateEl = $("bldStateEl");
  const stanceEngageBtn = $("stanceEngageBtn"), stanceDefendBtn = $("stanceDefendBtn"), stanceHoldBtn = $("stanceHoldBtn");
  const attackMoveBtn = $("attackMoveBtn"), retreatBtn = $("retreatBtn"), guardBtn = $("guardBtn"), garrisonBtn = $("garrisonBtn"), deployBtn = $("deployBtn"), firecowBtn = $("firecowBtn"), resupplyBtn = $("resupplyBtn"), unitOrderEl = $("unitOrderEl"), patrolBtn = $("patrolBtn"), attackposBtn = $("attackposBtn");
  const disbandBtn = $("disbandBtn");
  function selUnit() {
    const s = resolveSet(getSelIds(), getState().units);
    return s[0] || null;
  }
  function selUnits() {
    const all = resolveSet(getSelIds(), getState().units);
    if (!getMpSession()) return all;
    return all.filter((u) => (u.owner == null ? 0 : u.owner) === getMpSession().slot);
  }
  // موضع منتخب‌ها (0.12.0؛ دکمه‌ها + کلیدهای Q/W/E از 0.153.0): سولو = فرمان
  // بازیکن، چندنفره = ورودی نوبتی. نگهبانی موضع جدا (guardBtn) می‌ماند.
  function orderStance(stance) {
    if (getMpSession()) { const ids = selUnits().map((u) => u.id); if (ids.length) mpSend("stance", { ids, stance }); return; }
    const ids = selUnits().map((u) => u.id);
    if (ids.length) playerCmd({ kind: "stance", ids, stance }, getState().tick);
    refreshPanel();
  }
  stanceEngageBtn.addEventListener("click", () => orderStance("engage"));
  stanceDefendBtn.addEventListener("click", () => orderStance("defend"));
  stanceHoldBtn.addEventListener("click", () => orderStance("hold"));
  attackMoveBtn.addEventListener("click", () => {
    setPendingKind(getPendingKind() === "attackmove" ? null : "attackmove");
    refreshPanel();
  });
  // گشت رفت‌وبرگشتی (0.162.0): تک‌بار — کلیک بعدی روی زمین، سرِ دوم گشت است.
  if (patrolBtn) patrolBtn.addEventListener("click", () => {
    if (!selUnit()) return;
    setPendingKind(getPendingKind() === "patrol" ? null : "patrol");
    refreshPanel();
  });
  // حمله به موضع (0.163.0): تک‌بار — کلیک بعدی روی زمین، نقطه بمباران است.
  if (attackposBtn) attackposBtn.addEventListener("click", () => {
    if (!selUnit()) return;
    setPendingKind(getPendingKind() === "attackpos" ? null : "attackpos");
    refreshPanel();
  });
  // نگهبانی (0.15.0): تک‌بار — کلیک بعدی روی ساختمان، پاسگاه می‌شود.
  guardBtn.addEventListener("click", () => {
    if (!selUnit()) return;
    setPendingKind(getPendingKind() === "guard" ? null : "guard");
    refreshPanel();
  });
  // گاریسون برج (0.45.0): تک‌بار — کلیک بعدی روی برج خودی، استقرار جمعی است.
  if (garrisonBtn) garrisonBtn.addEventListener("click", () => {
    const sels = selUnits();
    if (!sels.some((u) => u.garrisonTower == null && canGarrisonType(u.type))) {
      statusEl.textContent = t("main.garrison.pick");
      return;
    }
    setPendingKind(getPendingKind() === "garrison" ? null : "garrison");
    refreshPanel();
  });
  // استقرار منجنیق (0.46.0): آنی (تک‌بار نیست) — جمع/باز کردن منتخب‌ها.
  if (deployBtn) deployBtn.addEventListener("click", () => {
    const sels = selUnits().filter((u) => UNITS[u.type].needsDeploy);
    if (!sels.length) return;
    if (getMpSession()) {
      mpSend("deploy", { ids: sels.map((u) => u.id) });
      setPendingKind(null);
      refreshPanel();
      return;
    }
    playerCmd( { kind: "deploy", ids: sels.map((u) => u.id) }, getState().tick);
    setPendingKind(null);
    refreshPanel();
  });
  // پرتاب گاو (0.142.0): تک‌بار — کلیک بعدی روی نقشه هدف است.
  if (firecowBtn) firecowBtn.addEventListener("click", () => {
    const sels = selUnits().filter((u) => isCowSiege(u) && u.deployed);
    if (!sels.length) { statusEl.textContent = t("main.firecow.needReady"); return; }
    setPendingKind(getPendingKind() === "firecow" ? null : "firecow");
    refreshPanel();
  });
  // تأمین سنگ (0.149.0 — §۱۲.۲/بند ۵۷۸): اقدام فوری روی منجنیق‌های منتخب؛
  // پیش‌بررسی همگام (پر بودن/سنگ) با پیام، بعد از صف فرمان (ضبط ری‌پلی).
  if (resupplyBtn) resupplyBtn.addEventListener("click", () => {
    const sels = selUnits().filter((u) => u.type === "catapult");
    if (!sels.length) return;
    const cap = UNITS.catapult.ammoCap || AMMO_RESUPPLY_ROCKS;
    const needy = sels.filter((u) => (u.ammo === undefined ? cap : u.ammo) < cap);
    if (!needy.length) { statusEl.textContent = RESUPPLY_FA.FULL; return; }
    const mp = getState().mp && getState().mp.enabled;
    const slot = getMpSession() ? getMpSession().slot : 0;
    const res = mp ? getState().mpres[slot].resources : getState().resources;
    if (!res || (res.stone || 0) < AMMO_RESUPPLY_STONE) { statusEl.textContent = RESUPPLY_FA.NO_STONE; return; }
    const ids = needy.map((u) => u.id);
    if (getMpSession()) { mpSend("resupply", { ids }); }
    else playerCmd({ kind: "resupply", ids }, getState().tick);
    sound.ack("order");
    refreshPanel();
  });
  retreatBtn.addEventListener("click", () => {
    if (getMpSession()) { const ids = selUnits().map((u) => u.id); if (ids.length) mpSend("retreat", { ids }); setPendingKind(null); refreshPanel(); return; }
    const ids = selUnits().map((u) => u.id);
    if (ids.length) playerCmd( { kind: "retreat", ids }, getState().tick);
    setPendingKind(null);
    refreshPanel();
  });
  if (disbandBtn) disbandBtn.addEventListener("click", () => {
    const ours = orderSels().filter((u) => !u.dead);
    if (!ours.length) return;
    if (ours.every((u) => u.type === "lord")) { statusEl.textContent = badB(t("game.disband.LORD")); sound.ack("deny"); return; }
    const ids = ours.map((u) => u.id);
    if (getMpSession()) { mpSend("disband", { ids }); }
    else playerCmd({ kind: "disband", ids }, getState().tick);
    sound.ack("order");
    setPendingKind(null);
    refreshPanel();
  });
  waveBtn.addEventListener("click", () => {
    if (getMpSession()) return; // در نبرد رقابتی موج خنثی نداریم
    const n = spawnWave(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H);
    if (n === 0) getState().events.push(t("main.wave.noRoom"));
    refreshPanel();
  });
  // زنگ خطر (0.17.0): تک‌بار و سراسری — کلیک بعدی روی نقشه = تجمع ارتش.
  alarmBtn.addEventListener("click", () => {
    if (getReplayWatch()) return; // تماشا (0.49.0)
    setSelectedUnit(null); // حالت استخدام با زنگ جمع نمی‌شود
    setPendingKind(getPendingKind() === "alarm" ? null : "alarm");
    refreshPanel();
  });
  // تخریب دستی (0.39.0): تک‌بار و سراسری — کلیک بعدی روی ساختمان خودی (غیر ستاد).
  demolishBtn.addEventListener("click", () => {
    if (getReplayWatch()) return; // تماشا (0.49.0)
    setSelectedUnit(null);
    setSelectedKey(null);
    setPendingKind(getPendingKind() === "demolish" ? null : "demolish");
    refreshPanel();
  });
  // تعمیر (0.155.0 — بند 210): تک‌بار و سراسری — کلیک بعدی روی ساختمان آسیب‌دیده خودی.
  if (repairBtn) repairBtn.addEventListener("click", () => {
    if (getReplayWatch()) return;
    setSelectedUnit(null);
    setSelectedKey(null);
    setPendingKind(getPendingKind() === "repair" ? null : "repair");
    refreshPanel();
  });
  // برگرداندن آخرین ساخت (0.146.0 — §۳.۱): اقدام فوری (نه مسلح‌شونده) —
  // بازپرداخت کامل؛ نتیجه در وقایع‌نگار (ev.undone) دیده می‌شود.
  if (undoBtn) undoBtn.addEventListener("click", () => {
    const { getEditor, newGame, startMission, getLastMissionKey } = later();
    if (getReplayWatch()) return;
    if (getEditor()) return;
    if (getMpSession()) { mpSend("undo", {}); }
    else playerCmd({ kind: "undo" }, getState().tick);
    refreshPanel();
  });
  scribeUI.wireScribe({ refreshPanel });
  for (const b of taxBtns) {
    b.addEventListener("click", () => {
      if (getReplayWatch()) return; // تماشا (0.49.0)
      if (getMpSession()) { mpSend("tax", { v: b.dataset.tax }); return; }
      playerCmd( { kind: "tax", v: b.dataset.tax }, getState().tick);
      refreshPanel();
    });
  }
  // اسلایدر مالیات (فاز ۱ بند ۲۲): همان فرمان دکمه‌ها، با نگاشت جایگاه↔سطح.
  if (taxSlider) {
    taxSlider.addEventListener("input", () => {
      if (getReplayWatch()) return;
      const v = taxAt(Number(taxSlider.value));
      if (getMpSession()) { mpSend("tax", { v }); return; }
      playerCmd( { kind: "tax", v }, getState().tick);
      refreshPanel();
    });
  }
  for (const b of ratBtns) {
    b.addEventListener("click", () => {
      if (getReplayWatch()) return; // تماشا (0.49.0)
      if (getMpSession()) { mpSend("rations", { v: b.dataset.rat }); return; }
      playerCmd( { kind: "rations", v: b.dataset.rat }, getState().tick);
      refreshPanel();
    });
  }
  pauseBtn.addEventListener("click", () => { if (getMpSession()) return; getState().paused = !getState().paused; refreshPanel(); });
  speedBtn.addEventListener("click", () => {
    if (getMpSession()) return;
    const i = CONFIG.SPEEDS.indexOf(getState().speed);
    getState().speed = CONFIG.SPEEDS[(i + 1) % CONFIG.SPEEDS.length];
    refreshPanel();
  });
  resetBtn.addEventListener("click", () => {
    const { getEditor, newGame, startMission, getLastMissionKey } = later();
    if (getMpSession()) { try { lobby.leave(); } catch (e) {} return; }
    newGame();
  });
  resEl.addEventListener("click", () => { setExactRes(!getExactRes()); refreshPanel(); }); // تقریبی/دقیق (بند ۲۷)
  defeatRestartBtn.addEventListener("click", () => {
    const { getEditor, newGame, startMission, getLastMissionKey } = later();
    if (getMpSession()) { try { lobby.leave(); } catch (e) {} return; }
    if (getLastMissionKey() && missionByKey(getLastMissionKey())) startMission(getLastMissionKey());
    else newGame();
  });
  victoryRestartBtn.addEventListener("click", () => {
    const { getEditor, newGame, startMission, getLastMissionKey } = later();
    if (getMpSession()) { try { lobby.leave(); } catch (e) {} return; }
    if (getLastMissionKey() && missionByKey(getLastMissionKey())) startMission(getLastMissionKey());
    else newGame();
  });
  return { selUnits, orderStance, modalOverlay, modal, soundIconBtn, soundUI, unitCard, unitNameEl, unitHpEl, bldCard, bldNameEl, bldHpEl, bldStateEl, stanceEngageBtn, stanceDefendBtn, stanceHoldBtn, attackMoveBtn, guardBtn, garrisonBtn, deployBtn, firecowBtn, resupplyBtn, unitOrderEl, patrolBtn, attackposBtn, disbandBtn };
}
