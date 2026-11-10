// لابی رقابتی (0.270.0 — C-CLN-90): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { validRoomPassword, upsertMyGameList, markMyGameDoneList, removeMyGameList } from "./lobby.js";
import { createLobbyListUI } from "./lobbyui.js";
import { parseSeed } from "./seed.js";
import { t } from "./i18n.js";

export function createLobbyWiringUI({ getMpSession, lobby, mpStatus, paintMpMapPreview, getMenuRelabelFns, lazyTable, continueGame, mpSessionDead, $ }) {
  // ---- دکمه‌های لابی رقابتی ----
  const mpSeedIn0 = $("mpSeedInput");
  if (mpSeedIn0) {
    mpSeedIn0.addEventListener("input", paintMpMapPreview);
    paintMpMapPreview();
  }
  getMenuRelabelFns().push(paintMpMapPreview);
  const mpCodeInput = $("mpCodeInput"), mpMaxSel = $("mpMaxSel");
  const mpCreateBtn = $("mpCreateBtn"), mpJoinBtn = $("mpJoinBtn"), mpLeaveBtn = $("mpLeaveBtn");
  const mpReadyBtn = $("mpReadyBtn"), mpStartBtn = $("mpStartBtn"), mpListBtn = $("mpListBtn");
  const mpWatchBtn = $("mpWatchBtn");
  const MP_ERR_FA = lazyTable("main.mperr.");
  const lobbyListUI = createLobbyListUI({ lobby, getMpSession: () => getMpSession(), mpStatus, mpCodeInput, MP_ERR_FA, continueGame, continueStored });
  const saveMpSession = lobbyListUI.saveMpSession;
  const loadMpSession = lobbyListUI.loadMpSession;
  const clearMpSession = lobbyListUI.clearMpSession;
  const loadMyGames = lobbyListUI.loadMyGames;
  const saveMyGames = lobbyListUI.saveMyGames;
  const paintRoomList = lobbyListUI.paintRoomList;
  const refreshRoomList = lobbyListUI.refreshRoomList;
  const paintContinue = lobbyListUI.paintContinue;
  const paintLive = lobbyListUI.paintLive;
  const paintMyGames = lobbyListUI.paintMyGames;
  const rowPassword = lobbyListUI.rowPassword;
  const wireLiveButtons = lobbyListUI.wireLiveButtons;
  function mpCode() {
    return (mpCodeInput && mpCodeInput.value ? mpCodeInput.value : "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  }
  if (mpCreateBtn) mpCreateBtn.addEventListener("click", async () => {
    try {
      mpStatus(t("main.mp.creating"));
      const max = mpMaxSel ? parseInt(mpMaxSel.value, 10) : 2;
      const seedIn = $("mpSeedInput");
      const seedRaw = seedIn && seedIn.value ? seedIn.value.trim() : "";
      let seed = null;
      if (seedRaw) {
        seed = parseSeed(seedRaw);
        if (seed == null) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA.seed })); return; }
      }
      const pwIn = $("mpPasswordInput");
      const pw = validRoomPassword(pwIn && pwIn.value);
      if (pw === false) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA.password })); return; }
      const noCowIn = $("mpNoCowInput");
      const noCow = !!(noCowIn && noCowIn.checked); // گزینه اتاق «No Cow Throwing» (0.147.0 — §۱۲.۴)
      const strongWallsIn = $("mpStrongWallsInput");
      const strongWalls = !!(strongWallsIn && strongWallsIn.checked); // گزینه اتاق «Strong Walls» (0.148.0 — §۱۴.۲)
      const noRushIn = $("mpNoRushInput");
      const noRush = !!(noRushIn && noRushIn.checked);
      const noDogsIn = $("mpNoDogsInput");
      const noDogs = !!(noDogsIn && noDogsIn.checked); // گزینه اتاق «No Rush» (0.149.0 — §۱۴.۲/بند ۷۳۰)
      await lobby.create(max >= 2 && max <= 4 ? max : 2, { password: pw, seed, noCow, strongWalls, noRush, noDogs });
      if (mpCodeInput && lobby.room) mpCodeInput.value = lobby.room.code;
      if (lobby.room && lobby.token) {
        // نشست برای بازگشت پس از رفرش (0.141.0).
        saveMpSession({ code: lobby.room.code, slot: lobby.mySlot, token: lobby.token, seed: lobby.room.seed });
        saveMyGames(upsertMyGameList(loadMyGames(), { code: lobby.room.code, slot: lobby.mySlot, seed: lobby.room.seed }));
        paintMyGames();
        paintContinue();
      }
      mpStatus(t("main.mp.created", { code: lobby.room.code, lock: lobby.room.priv ? ` 🔒${t("main.mp.private")}` : ` 🔓${t("main.mp.public")}`, seed: lobby.room.seed >>> 0, pw: lobby.room.priv ? ` ${t("main.mp.andPassword")}` : "" }));
    } catch (e) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA[e.message] || e.message || t("main.unknown") })); }
  });
  if (mpJoinBtn) mpJoinBtn.addEventListener("click", async () => {
    try {
      const code = mpCode();
      if (code.length !== 4) { mpStatus(t("main.mp.enterCode")); return; }
      const pwIn = $("mpJoinPasswordInput");
      const pw = validRoomPassword(pwIn && pwIn.value);
      if (pw === false) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA.password })); return; }
      mpStatus(t("main.mp.joining"));
      await lobby.join(code, { password: pw });
      if (lobby.room && lobby.token) {
        saveMpSession({ code: lobby.room.code, slot: lobby.mySlot, token: lobby.token, seed: lobby.room.seed });
        saveMyGames(upsertMyGameList(loadMyGames(), { code: lobby.room.code, slot: lobby.mySlot, seed: lobby.room.seed }));
        paintMyGames();
        paintContinue();
      }
      mpStatus(t("main.mp.joined", { code }));
    } catch (e) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA[e.message] || e.message || t("main.unknown") })); }
  });
  if (mpWatchBtn) mpWatchBtn.addEventListener("click", async () => {
    try {
      const code = mpCode();
      if (code.length !== 4) { mpStatus(t("main.mp.watchJoin")); return; }
      const pwIn = $("mpJoinPasswordInput");
      const pw = validRoomPassword(pwIn && pwIn.value);
      if (pw === false) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA.password })); return; }
      await continueGame({ code, password: pw }, true);
    } catch (e) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA[e.message] || e.message || t("main.unknown") })); }
  });
  if (mpLeaveBtn) mpLeaveBtn.addEventListener("click", async () => {
    try {
      const code = (lobby.room && lobby.room.code) || (lobby.watchInfo && lobby.watchInfo.code);
      await lobby.leave();
      // خروج عمدی = انصراف از نشست (0.141.0).
      clearMpSession();
      if (code) saveMyGames(removeMyGameList(loadMyGames(), code));
      paintMyGames();
      paintContinue();
      mpStatus(t("main.mp.left")); refreshRoomList(true);
    } catch (e) {}
  });
  if (mpReadyBtn) mpReadyBtn.addEventListener("click", async () => { try { await lobby.toggleReady(); } catch (e) {} });
  if (mpStartBtn) mpStartBtn.addEventListener("click", async () => {
    try {
      mpStatus(t("main.mp.starting"));
      await lobby.start(); // سید همان سیدِ زمان ساخت است
    }
    catch (e) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA[e.message] || e.message || t("main.unknown") })); }
  });
  // ادامه با توکن نشست ذخیره‌شده (0.141.0)؛ نبود توکن = نشست مرده.
  async function continueStored(code) {
    const sess = loadMpSession();
    if (!sess || sess.code !== code) { mpSessionDead(code); return; }
    if (mpCodeInput) mpCodeInput.value = code;
    await continueGame({ code, slot: sess.slot, token: sess.token });
  }
  // تازه‌سازی خودکار فهرست وقتی منو باز است (نه حین تایپ رمز).
  setInterval(() => {
    const ms = $("menuScreen");
    const card = $("mpCard");
    if (!ms || ms.hidden || !lobby.connected) return;
    if (card && card.contains(document.activeElement)) return;
    paintContinue();
    refreshRoomList(true);
  }, 10000);
  if (mpListBtn) mpListBtn.addEventListener("click", async () => {
    await refreshRoomList(false);
  });
  // دکمه‌های جعبه ادامه (تفویض یک‌بار — محتوا بازرسم می‌شود) + بوت فهرست‌ها (0.141.0).
  (function wireMpContinue() {
    const card = $("mpCard");
    if (card && !card.dataset.contWired) {
      card.dataset.contWired = "1";
      card.addEventListener("click", async (e) => {
        const cb = e.target && e.target.closest ? e.target.closest("[data-mpcontinue]") : null;
        if (cb) { await continueStored(cb.dataset.mpcontinue); return; }
        const db = e.target && e.target.closest ? e.target.closest("[data-mpdiscard]") : null;
        if (db) {
          clearMpSession();
          saveMyGames(markMyGameDoneList(loadMyGames(), db.dataset.mpdiscard));
          paintMyGames();
          paintContinue();
          return;
        }
        const cp = e.target && e.target.closest ? e.target.closest("[data-copycode]") : null;
        if (cp) {
          try {
            await navigator.clipboard.writeText(cp.dataset.copycode);
            mpStatus(t("main.mp.copied", { code: cp.dataset.copycode }));
          } catch (err) {
            if (mpCodeInput) mpCodeInput.value = cp.dataset.copycode;
            mpStatus(t("main.mp.code") + " " + cp.dataset.copycode);
          }
        }
      });
    }
    // نشانی عمیق بازی (#/room/CODE یا #/watch/CODE — بیرون پرچنس؛ درون iframe
    // والد خوانده نمی‌شود پس localStorage مسیر اصلی بازگشت است).
    try {
      const h = window.location.hash || "";
      const m = h.match(/^#\/(room|watch)\/([A-Za-z0-9]{4})/);
      if (m && mpCodeInput) mpCodeInput.value = m[2].toUpperCase();
    } catch (e) {}
    paintContinue();
    paintMyGames();
  })();
  return { saveMpSession, clearMpSession, loadMyGames, saveMyGames, paintContinue, paintMyGames, MP_ERR_FA };
}
