// لایه آنلاین (0.23.0): شمار حاضران + تالار پیروزی مشترک + جشن پیروزی دیگران.
// کاملاً افزودنی است: قطع‌بودن یا خطای سوکت هیچ اثری روی بازی تک‌نفره ندارد.
import { t as tr } from "./i18n.js";
import { getSocketMaker } from "./selfhost.js"; // بک‌اند: اول پلتفرم، وگرنه سرور شخصی (0.69.0)
const LOBBY_POLL_MS = 20000;
const MAX_BACKOFF_MS = 30000;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function initOnline(ui) {
  const els = ui;
  const api = {
    ready: false,
    reported: false, // هر بازی فقط یک‌بار پیروزی را ثبت می‌کند
    _sock() { return sock; },
    onNewGame(alreadyReported) { api.reported = alreadyReported === true; },
    maybeReport(state) {
      if (state.victorious && !api.reported) {
        api.reported = true;
        api.report(state.tick);
      }
    },
    async report(ticks) {
      if (!api.ready || !sock) return;
      const name = (els.nameInput && els.nameInput.value) || "بی‌نام";
      try {
        await sock.rpc.submit(JSON.stringify({ name, ticks }));
      } catch (e) { /* ثبت ناکام = فقط همین بازی؛ تک‌نفره ادامه دارد */ }
      api.refresh();
    },
    async refresh() {
      if (!api.ready || !sock) return;
      try {
        const hallRaw = await sock.rpc.hall("");
        const hall = JSON.parse(hallRaw);
        const box = els.hall;
        if (box) {
          const list = (hall.data && hall.data.entries) || [];
          box.innerHTML = list.length
            ? list.map((e, i) => `<div class="stat"><span>${esc(e.name)}</span><span>${tr("system.online.hallRow", { rank: i + 1, n: Number(e.ticks) || 0 })}</span></div>`).join("")
            : `<div class="lbl">${tr("system.online.hallEmpty")}</div>`;
        }
        const onRaw = await sock.rpc.online("");
        const on = JSON.parse(onRaw);
        if (els.count) els.count.textContent = tr("system.online.count", { n: (on.data && on.data.n) || 0 });
      } catch (e) { /* دفعه بعد */ }
    },
  };

  // نام جنگی از پروفایل منو می‌آید (0.27.0) — این ورودی همان اینپوت پروفایل است؛
  // فقط اگر خالی است از کلید قدیمی پرش کن (profile.js مهاجرت را انجام داده).
  try {
    const saved = localStorage.getItem("stronghold_warname");
    if (saved && els.nameInput && !els.nameInput.value) els.nameInput.value = saved;
  } catch (e) { /* حافظه در دسترس نیست */ }
  if (els.nameInput) {
    els.nameInput.addEventListener("change", () => {
      try { localStorage.setItem("stronghold_warname", els.nameInput.value); } catch (e) { /* نادیده */ }
    });
  }

  let sock = null, backoff = 1000, seq = 0, toastTimer = 0;
  function toast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 4000);
  }
  function schedule(ms) {
    const wait = (ms || 1000) + Math.random() * 1000;
    backoff = Math.min(MAX_BACKOFF_MS, (ms || 1000) * 2);
    setTimeout(() => { if (!api.ready) connect(); }, wait);
  }
  function connect() {
    const make = getSocketMaker(); // اول پلتفرم، وگرنه سرور شخصی (0.69.0)
    if (typeof make !== "function") return; // هیچ بک‌اندی نیست — آفلاینِ کامل
    const mySeq = ++seq;
    let s = null;
    try { s = make(); } catch (e) { schedule(backoff); return; }
    sock = s;
    s.addEventListener("open", () => {
      if (mySeq !== seq) { try { s.close(); } catch (e) {} return; }
      backoff = 1000;
      api.ready = true;
      if (els.card) els.card.hidden = false;
      api.refresh();
    });
    s.addEventListener("message", (ev) => {
      if (typeof ev.data === "string" && ev.data.indexOf("V:") === 0) {
        toast(tr("system.online.joinedHall", { name: ev.data.slice(2) }));
        api.refresh();
      }
    });
    s.addEventListener("close", (ev) => {
      if (mySeq !== seq) return;
      api.ready = false;
      sock = null;
      if (els.card) els.card.hidden = true;
      const code = ev && ev.code;
      if (code === 4403) return; // محدودیت پلتفرم — تلاش دوباره بی‌فایده
      schedule(code === 4429 ? 10000 : backoff);
    });
  }
  connect();
  setInterval(() => api.refresh(), LOBBY_POLL_MS);
  return api;
}
