// لابی رقابتی (0.24.0): سوکت جدا از online.js، فقط لابی + رله ورودی.
// قطع‌بودن سوکت، تک‌نفره را لمس نمی‌کند.
import { PROFILE_LOGOS } from "./profile.js";
import { getSocketMaker } from "./selfhost.js"; // بک‌اند: اول پلتفرم، وگرنه سرور شخصی (0.69.0)

const RECONNECT_MAX = 30000;

// رمز اتاق (0.28.0): آینه قانون سرور — خالی=عمومی (null)، معتبر=رشته، نامعتبر=false.
export function validRoomPassword(pw) {
  if (pw === undefined || pw === null) return null;
  if (typeof pw !== "string") return false;
  const t = pw.trim();
  if (t.length === 0) return null;
  if (t.length > 16) return false;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c < 32 || c === 127) return false;
  }
  return t;
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ردیف فهرست اتاق‌ها: کد + قفل + ظرفیت + سید + بازیکنان حاضر + دکمه پیوستن
// (برای خصوصی، فیلد رمز درون ردیف). خالص و تست‌پذیر.
export function roomRowHTML(room) {
  const code = escHtml(room.code || "????");
  const lock = room.priv ? "🔒 خصوصی" : "🔓 عمومی";
  const FA_D = "۰۱۲۳۴۵۶۷۸۹";
  const fa = (n) => String(n).replace(/\d/g, (d) => FA_D[d]);
  const count = `${fa(room.num || 0)}/${fa(room.max || 0)}`;
  const seed = fa(room.seed >>> 0);
  const pls = (room.players || []).map((p) =>
    `<span class="pl"><span class="rosterLogo">${PROFILE_LOGOS[(p.logo | 0)] || ""}</span>${escHtml(p.name || "?")}</span>`
  ).join(" ");
  const pwField = room.priv
    ? `<input data-pwfor="${code}" maxlength="16" placeholder="رمز" autocomplete="off" type="password">`
    : "";
  return `<div class="room" data-room="${code}"><div class="rhead"><b>${code}</b><span>${lock}</span><span>${count} نفر</span><span>سید ${seed}</span></div>` +
    `<div class="rplayers">${pls || '<span class="lbl">—</span>'}</div>` +
    `<div class="opts">${pwField}<button data-joincode="${code}">پیوستن</button></div></div>`;
}

export function initMpLobby(ui, hooks) {
  const api = {
    connected: false,
    room: null, // {code, slot, max, players, started, seed}
    mySlot: -1,
    _sock() { return sock; },
    isInRoom() { return !!api.room; },
    isStarted() { return !!(api.room && api.room.started); },
    async create(max, opts) {
      const s = await needSock();
      if (!s) throw new Error("offline");
      const name = hooks.warName();
      const logo = hooks.warLogo ? hooks.warLogo() : 0;
      const o = opts || {};
      const raw = await s.rpc.mpCreate(JSON.stringify({
        name, max, logo,
        password: o.password === undefined ? null : o.password,
        seed: o.seed === undefined ? null : o.seed,
      }));
      const r = JSON.parse(raw);
      if (!r.ok) throw new Error(r.err || "bad");
      api.room = {
        code: r.data.code, slot: r.data.slot, max,
        players: [], started: false, seed: r.data.seed | 0, priv: !!r.data.priv,
      };
      api.mySlot = r.data.slot;
      await refreshRoom();
      return api.room;
    },
    async join(code, opts) {
      const s = await needSock();
      if (!s) throw new Error("offline");
      const name = hooks.warName();
      const logo = hooks.warLogo ? hooks.warLogo() : 0;
      const o = opts || {};
      const raw = await s.rpc.mpJoin(JSON.stringify({
        code, name, logo,
        password: o.password === undefined ? null : o.password,
      }));
      const r = JSON.parse(raw);
      if (!r.ok) throw new Error(r.err || "bad");
      api.room = {
        code, slot: r.data.slot, max: r.data.r.max,
        players: r.data.r.players, started: r.data.r.started,
        seed: r.data.r.seed | 0, priv: !!r.data.r.priv,
      };
      api.mySlot = r.data.slot;
      return api.room;
    },
    // ویرایش زنده نام/لوگو در لابی — سرور roster تازه به همه می‌دهد.
    async updateProfile() {
      const s = sock;
      if (!s || !api.connected || !api.room || api.room.started) return;
      try {
        const raw = await s.rpc.mpProfile(JSON.stringify({
          code: api.room.code, name: hooks.warName(),
          logo: hooks.warLogo ? hooks.warLogo() : 0,
        }));
        const r = JSON.parse(raw);
        if (!r.ok) throw new Error(r.err);
      } catch (e) { hooks.onError(e && e.message); }
    },
    async leave() {
      const s = sock;
      const code = api.room && api.room.code;
      api.room = null; api.mySlot = -1;
      hooks.onLeave();
      paint();
      if (!s || !api.connected || !code) return;
      try { await s.rpc.mpLeave(JSON.stringify({ code })); } catch (e) {}
    },
    async toggleReady() {
      const s = sock;
      if (!s || !api.room || api.room.started) return;
      const me = api.room.players.find((p) => p.slot === api.mySlot);
      const ready = !(me && me.ready);
      try {
        const raw = await s.rpc.mpReady(JSON.stringify({ code: api.room.code, ready }));
        const r = JSON.parse(raw);
        if (!r.ok) throw new Error(r.err);
      } catch (e) { hooks.onError(e && e.message); }
    },
    async start() {
      const s = sock;
      if (!s || !api.room) return;
      try {
        // سید همان سیدِ زمان ساخت است (0.28.0).
        const raw = await s.rpc.mpStart(JSON.stringify({ code: api.room.code }));
        const r = JSON.parse(raw);
        if (!r.ok) throw new Error(r.err);
      } catch (e) { hooks.onError(e && e.message); }
    },
    async list() {
      const s = await needSock();
      if (!s) return [];
      try {
        const raw = await s.rpc.mpList("");
        const r = JSON.parse(raw);
        return r.ok ? r.data.rooms : [];
      } catch (e) { return []; }
    },
    // ورودی نوبتی (فقط پس از start). tick از حلقه بازی می‌آید.
    async send(kind, args) {
      const s = sock;
      if (!s || !api.connected || !api.room || !api.room.started) return null;
      try {
        const raw = await s.rpc.mpInput(JSON.stringify({
          code: api.room.code, kind, args: args || {}, tick: hooks.getTick(),
        }));
        const r = JSON.parse(raw);
        return r.ok ? r.data.seq : null;
      } catch (e) { return null; }
    },
  };

  let sock = null, backoff = 1000, seq = 0;
  function war() { return hooks.warName(); }

  function needSock() {
    if (sock && api.connected) return Promise.resolve(sock);
    return new Promise((resolve) => {
      let n = 0;
      const t = setInterval(() => {
        if (sock && api.connected) { clearInterval(t); resolve(sock); }
        else if (++n > 30) { clearInterval(t); resolve(null); }
      }, 200);
      if (!sock) connect();
    });
  }

  function paint() {
    if (hooks.paint) hooks.paint(api);
  }

  function onMsg(ev) {
    if (typeof ev.data !== "string") return;
    let m = null;
    try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (!m || typeof m !== "object" || !api.room) return;
    if (m.t === "roster") {
      if (!m.r || m.r.code !== api.room.code) return;
      api.room.players = m.r.players;
      api.room.max = m.r.max;
      api.room.started = m.r.started;
      if (m.r.seed !== undefined) api.room.seed = m.r.seed | 0;
      if (m.r.priv !== undefined) api.room.priv = !!m.r.priv;
      paint();
    } else if (m.t === "start") {
      if (!m.r || m.r.code !== api.room.code) return;
      api.room.players = m.r.players;
      api.room.max = m.r.max;
      api.room.started = true;
      api.room.seed = m.seed;
      paint();
      hooks.onStart(api.room, m.seed);
    } else if (m.t === "inp") {
      if (typeof m.seq !== "number" || typeof m.slot !== "number") return;
      hooks.onInput(m);
    } else if (m.t === "left") {
      hooks.onPeerLeft(m.slot);
    }
  }

  async function refreshRoom() {
    if (!sock || !api.room) return;
    try {
      const raw = await sock.rpc.mpRoom(JSON.stringify({ code: api.room.code }));
      const r = JSON.parse(raw);
      if (r.ok) {
        api.room.players = r.data.players;
        api.room.max = r.data.max;
        api.room.started = r.data.started;
        if (r.data.seed !== undefined) api.room.seed = r.data.seed | 0;
        if (r.data.priv !== undefined) api.room.priv = !!r.data.priv;
        paint();
        if (r.data.started && !hooks.gameActive()) {
          // شروع را از دست دادیم (وصل مجدد) — بدون جوین وسط، فقط اطلاع
          hooks.onError("started");
        }
      }
    } catch (e) {}
  }

  function connect() {
    const make = getSocketMaker(); // اول پلتفرم، وگرنه سرور شخصی (0.69.0)
    if (typeof make !== "function") return;
    const mySeq = ++seq;
    let s = null;
    try { s = make(); } catch (e) { schedule(); return; }
    sock = s;
    s.addEventListener("open", () => {
      if (mySeq !== seq) { try { s.close(); } catch (e) {} return; }
      backoff = 1000;
      api.connected = true;
      paint();
    });
    s.addEventListener("message", onMsg);
    s.addEventListener("close", (ev) => {
      if (mySeq !== seq) return;
      api.connected = false;
      sock = null;
      paint();
      const code = ev && ev.code;
      if (code === 4403 || code === 4429) return;
      schedule();
    });
  }

  function schedule() {
    const wait = backoff + Math.random() * 1000;
    backoff = Math.min(RECONNECT_MAX, backoff * 2);
    setTimeout(() => { if (!api.connected) connect(); }, wait);
  }

  connect();
  return api;
}
