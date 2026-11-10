// نشست و فهرست‌های لابی (0.251.0 — C-CLN-51): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { t } from "./i18n.js";
import { faNum } from "./format.js";
import { validMpSession, normalizeMyGames, validRoomPassword, roomRowHTML, liveRowHTML, myGameRowHTML, removeMyGameList } from "./lobby.js";

function $(id) { return document.getElementById(id); }
export function createLobbyListUI({ lobby, getMpSession, mpStatus, mpCodeInput, MP_ERR_FA, continueGame, continueStored }) {
  // نشست چندنفره در localStorage (0.141.0 — بازگشت پس از رفرش): scw.mpsess.v1
  // {code, slot, token, seed} + فهرست «بازی‌های من» scw.mygames.v1.
  const MP_SESS_KEY = "scw.mpsess.v1", MP_GAMES_KEY = "scw.mygames.v1";
  function saveMpSession(s) {
    try { localStorage.setItem(MP_SESS_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function loadMpSession() {
    try { return validMpSession(JSON.parse(localStorage.getItem(MP_SESS_KEY))); }
    catch (e) { return null; }
  }
  function clearMpSession() {
    try { localStorage.removeItem(MP_SESS_KEY); } catch (e) {}
  }
  function loadMyGames() {
    try { return normalizeMyGames(JSON.parse(localStorage.getItem(MP_GAMES_KEY))); }
    catch (e) { return []; }
  }
  function saveMyGames(list) {
    try { localStorage.setItem(MP_GAMES_KEY, JSON.stringify(normalizeMyGames(list))); } catch (e) {}
  }
  // فهرست اتاق‌های باز (0.28.0): کد + خصوصی/عمومی + ظرفیت + سید + بازیکنان حاضر.
  function paintRoomList(rooms, ownCode) {
    const box = $("mpListEl");
    if (!box) return;
    const others = (rooms || []).filter((rm) => rm.code !== ownCode);
    box.innerHTML = others.length
      ? others.map(roomRowHTML).join("")
      : `<div class="lbl">${t("main.mp.noRooms")}</div>`;
    box.querySelectorAll("[data-joincode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const code = btn.dataset.joincode;
        const roomEl = btn.closest(".room");
        const pwIn = roomEl ? roomEl.querySelector("[data-pwfor]") : null;
        const pw = validRoomPassword(pwIn && pwIn.value);
        if (pw === false) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA.password })); return; }
        if (mpCodeInput) mpCodeInput.value = code;
        try { await lobby.join(code, { password: pw }); mpStatus(t("main.mp.joinedShort")); }
        catch (e) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA[e.message] || e.message || t("main.unknown") })); }
      });
    });
  }
  async function refreshRoomList(silent) {
    const box = $("mpListEl");
    if (!box) return;
    if (!silent) box.innerHTML = `<div class="lbl">…</div>`;
    const rooms = await lobby.list();
    paintRoomList(rooms, lobby.room && lobby.room.code);
    // بازی‌های فعال + بازی‌های من (0.141.0).
    const liveBox = $("mpLiveEl");
    if (liveBox) {
      if (!silent) liveBox.innerHTML = `<div class="lbl">…</div>`;
      paintLive(await lobby.live());
    }
    paintMyGames();
  }
  // جعبه «ادامه بازی» پس از رفرش (0.141.0): نشست ذخیره‌شده ولی بازی فعالی نیست.
  function paintContinue() {
    const box = $("mpContinueEl");
    if (!box) return;
    const sess = !getMpSession() && !lobby.room && !lobby.watchInfo ? loadMpSession() : null;
    if (!sess) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = `<div class="lbl">${t("main.mp.contGame", { code: sess.code, n: faNum(sess.slot + 1) })}</div>` +
      `<div class="opts"><button data-mpcontinue="${sess.code}">${t("main.mp.continue")}</button>` +
      `<button data-copycode="${sess.code}">${t("main.mp.copyCode")}</button>` +
      `<button data-mpdiscard="${sess.code}">${t("main.mp.discard")}</button></div>`;
  }
  // فهرست بازی‌های فعال سرور (0.141.0).
  function paintLive(rooms) {
    const box = $("mpLiveEl");
    if (!box) return;
    const sess = loadMpSession();
    const list = rooms || [];
    box.innerHTML = `<div class="lbl">🎯 ${t("system.lobby.liveGames")}</div>` + (list.length
      ? list.map((rm) => liveRowHTML(rm, !!sess && sess.code === rm.code)).join("")
      : `<div class="lbl">${t("system.lobby.noLive")}</div>`);
    wireLiveButtons(box);
  }
  // فهرست «بازی‌های من» (0.141.0) — محلی، بدون نیاز به اتصال.
  function paintMyGames() {
    const box = $("mpMyGamesEl");
    if (!box) return;
    const list = loadMyGames();
    box.innerHTML = `<div class="lbl">💾 ${t("system.lobby.myGames")}</div>` + (list.length
      ? list.map(myGameRowHTML).join("")
      : `<div class="lbl">${t("system.lobby.noMy")}</div>`);
    wireLiveButtons(box); // همان تفویض دکمه‌های ادامه/حذف
  }
  function rowPassword(roomEl) {
    const pwIn = roomEl ? roomEl.querySelector("[data-pwfor]") : null;
    const pw = validRoomPassword(pwIn && pwIn.value);
    if (pw === false) { mpStatus(t("main.err.prefix", { msg: MP_ERR_FA.password })); return undefined; }
    return pw;
  }
  // دکمه‌های ردیف‌های زنده/من (تفویض — ردیف‌ها بازرسم می‌شوند).
  function wireLiveButtons(scope) {
    if (!scope || scope.dataset.wired) return;
    scope.dataset.wired = "1";
    scope.addEventListener("click", async (e) => {
      const wbtn = e.target && e.target.closest ? e.target.closest("[data-watchcode]") : null;
      if (wbtn) {
        const code = wbtn.dataset.watchcode;
        const roomEl = wbtn.closest(".room");
        const pw = rowPassword(roomEl);
        if (pw === undefined) return;
        await continueGame({ code, password: pw }, true);
        return;
      }
      const cbtn = e.target && e.target.closest ? e.target.closest("[data-contcode]") : null;
      if (cbtn) {
        await continueStored(cbtn.dataset.contcode);
        return;
      }
      const mbtn = e.target && e.target.closest ? e.target.closest("[data-mycont]") : null;
      if (mbtn) {
        await continueStored(mbtn.dataset.mycont);
        return;
      }
      const dbtn = e.target && e.target.closest ? e.target.closest("[data-mydel]") : null;
      if (dbtn) {
        saveMyGames(removeMyGameList(loadMyGames(), dbtn.dataset.mydel));
        paintMyGames();
        return;
      }
    });
  }
  return { saveMpSession, loadMpSession, clearMpSession, loadMyGames, saveMyGames, paintRoomList, refreshRoomList, paintContinue, paintLive, paintMyGames, rowPassword, wireLiveButtons };
}
