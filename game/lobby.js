// لابی رقابتی (0.24.0): سوکت جدا از online.js، فقط لابی + رله ورودی.
// قطع‌بودن سوکت، تک‌نفره را لمس نمی‌کند.
import { lordPortraitHTML } from "./profile.js";
import { t as tr, getLang } from "./i18n.js";
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

// نشست فعال چندنفره (0.141.0): {code, slot, token, seed} — خالص و تست‌پذیر.
export function validMpSession(v) {
  if (!v || typeof v !== "object") return null;
  if (typeof v.code !== "string" || v.code.length !== 4) return null;
  if (typeof v.slot !== "number" || v.slot !== Math.floor(v.slot) || v.slot < 0 || v.slot > 3) return null;
  if (typeof v.token !== "string" || !/^[0-9a-f]{16}$/.test(v.token)) return null;
  return { code: v.code, slot: v.slot, token: v.token, seed: (v.seed | 0) || 0 };
}

// فهرست «بازی‌های من» (0.141.0): [{code, slot, seed, at, done}] — خالص، سقف ۲۰.
// بدنه گزارش ناهمگامی (0.232.0 — C-SRV-6): خالص و تست‌پذیر؛ نامعتبر = null.
export function desyncReportOf(code, tick, hash) {
  if (typeof code !== "string" || code.length !== 4) return null;
  if (typeof tick !== "number" || tick !== Math.floor(tick) || tick < 0 || tick > 20000000) return null;
  if (typeof hash !== "string" || hash.length < 1 || hash.length > 64) return null;
  return { code, tick, hash };
}

export const MYGAMES_CAP = 20;
export function normalizeMyGames(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const g of raw) {
    if (!g || typeof g !== "object" || typeof g.code !== "string" || g.code.length !== 4) continue;
    out.push({
      code: g.code,
      slot: (typeof g.slot === "number" && g.slot >= -1 && g.slot <= 3) ? g.slot : -1,
      seed: (g.seed | 0) || 0,
      at: (typeof g.at === "number" && g.at > 0) ? g.at : 0,
      done: !!g.done,
    });
    if (out.length >= MYGAMES_CAP) break;
  }
  return out;
}
export function upsertMyGameList(list, entry) {
  const base = normalizeMyGames(list).filter((g) => g.code !== entry.code);
  base.unshift({
    code: entry.code, slot: entry.slot | 0, seed: (entry.seed | 0) || 0,
    at: Date.now(), done: !!entry.done,
  });
  return base.slice(0, MYGAMES_CAP);
}
export function markMyGameDoneList(list, code) {
  return normalizeMyGames(list).map((g) => (g.code === code ? { code: g.code, slot: g.slot, seed: g.seed, at: g.at, done: true } : g));
}
export function removeMyGameList(list, code) {
  return normalizeMyGames(list).filter((g) => g.code !== code);
}

function faNum(n) {
  const FA_D = "۰۱۲۳۴۵۶۷۸۹";
  return getLang() === "fa" ? String(n).replace(/\d/g, (d) => FA_D[d]) : String(n);
}

// میزبان اتاق (0.221.0 — بند 718): سرور در هر roster میدان host (اسلات
// میزبان) می‌فرستد و استارت را فقط از میزبان می‌پذیرد (nohost). این کمک‌ها
// خالص‌اند: host صریح مقدم است، وگرنه اولین بازیکن (آینه mpMigrateHost
// سرور)، وگرنه ۰. hostStar عمداً سخت‌گیر است: بی‌host صریح ستاره‌ای نیست
// (فهرست اتاق‌های باز host حمل نمی‌کنند — ستاره فقط در رستر درون‌اتاق).
export function roomHostSlot(room) {
  if (room && typeof room.host === "number" && room.host >= 0 && room.host <= 3) return room.host;
  const ps = room && room.players;
  if (Array.isArray(ps) && ps.length && typeof ps[0].slot === "number") return ps[0].slot;
  return 0;
}
export function isRoomHost(room, slot) {
  return roomHostSlot(room) === slot;
}
export function hostStar(room, slot) {
  return !!(room && typeof room.host === "number" && room.host === slot);
}

// ردیف بازی فعال سرور (0.141.0): کد + قفل + ظرفیت + سید + وضعیت + بازیکنان
// (نقطه سبز/خاکستری اتصال) + رمز خصوصی + دکمه تماشا (+ ادامه اگر مال من است).
export function liveRowHTML(room, isMine) {
  const code = escHtml(room.code || "????");
  const lock = room.priv ? tr("system.lobby.private") : tr("system.lobby.public");
  const count = `${faNum(room.num || 0)}/${faNum(room.max || 0)}`;
  const seed = faNum(room.seed >>> 0);
  const over = room.over
    ? `<span>🏁 ${tr("system.lobby.finished")}${room.winner >= 0 ? ` — ${tr("system.lobby.winner", { n: faNum(room.winner + 1) })}` : ""}</span>`
    : `<span>● ${tr("system.lobby.live")}</span>`;
  const pls = (room.players || []).map((p) =>
    `<span class="pl${p.on === false ? " off" : ""}" title="${p.on === false ? tr("system.lobby.offline") : tr("system.lobby.online")}"><span class="rosterLogo">${lordPortraitHTML(p.logo ?? 0)}</span>${escHtml(p.name || "?")}</span>`
  ).join(" ");
  const pwField = room.priv
    ? `<input data-pwfor="${code}" maxlength="16" placeholder="${tr("system.lobby.passwordPlaceholder")}" autocomplete="off" type="password">`
    : "";
  const watchBtn = `<button data-watchcode="${code}">${tr("system.lobby.watch")}</button>`;
  const contBtn = isMine ? `<button data-contcode="${code}">${tr("system.lobby.resume")}</button>` : "";
  return `<div class="room live" data-room="${code}"><div class="rhead"><b>${code}</b><span>${lock}</span><span>${count}</span><span>${tr("system.lobby.seed", { seed })}</span>${over}</div>` +
    `<div class="rplayers">${pls || '<span class="lbl">—</span>'}</div>` +
    `<div class="opts">${pwField}${watchBtn}${contBtn}</div></div>`;
}

// ردیف «بازی من» (0.141.0): کد + اسلات + زمان + وضعیت + ادامه/حذف. خالص و تست‌پذیر.
export function myGameRowHTML(g) {
  const code = escHtml(g.code || "????");
  const when = g.at ? new Date(g.at).toLocaleString(getLang() === "fa" ? "fa-IR" : "en-US") : "—";
  const st = g.done ? tr("system.lobby.finished") : tr("system.lobby.live");
  const go = g.done ? "" : `<button data-mycont="${code}">${tr("system.lobby.resume")}</button>`;
  return `<div class="room mine" data-room="${code}"><div class="rhead"><b>${code}</b><span>${tr("main.mp.player", { n: faNum((g.slot | 0) + 1) })}</span><span>${st}</span></div>` +
    `<div class="rplayers"><span class="lbl">${escHtml(when)}</span></div>` +
    `<div class="opts">${go}<button data-mydel="${code}">${tr("system.lobby.remove")}</button></div></div>`;
}
// ردیف فهرست اتاق‌ها: کد + قفل + ظرفیت + سید + بازیکنان حاضر + دکمه پیوستن
// (برای خصوصی، فیلد رمز درون ردیف). خالص و تست‌پذیر.
export function roomRowHTML(room) {
  const code = escHtml(room.code || "????");
  const lock = room.priv ? tr("system.lobby.private") : tr("system.lobby.public");
  const FA_D = "۰۱۲۳۴۵۶۷۸۹";
  const fa = (n) => (getLang() === "fa" ? String(n).replace(/\d/g, (d) => FA_D[d]) : String(n));
  const count = `${fa(room.num || 0)}/${fa(room.max || 0)}`;
  const seed = fa(room.seed >>> 0);
  const pls = (room.players || []).map((p) =>
    `<span class="pl"><span class="rosterLogo">${lordPortraitHTML(p.logo ?? 0)}</span>${escHtml(p.name || "?")}</span>`
  ).join(" ");
  const pwField = room.priv
    ? `<input data-pwfor="${code}" maxlength="16" placeholder="${tr("system.lobby.passwordPlaceholder")}" autocomplete="off" type="password">`
    : "";
  return `<div class="room" data-room="${code}"><div class="rhead"><b>${code}</b><span>${lock}</span><span>${tr("system.lobby.players", { n: room.max || 0, count })}</span><span>${tr("system.lobby.seed", { seed })}</span></div>` +
    `<div class="rplayers">${pls || '<span class="lbl">—</span>'}</div>` +
    `<div class="opts">${pwField}<button data-joincode="${code}">${tr("system.lobby.join")}</button></div></div>`;
}

export function initMpLobby(ui, hooks) {
  const api = {
    connected: false,
    room: null, // {code, slot, max, players, started, seed}
    watchInfo: null, // {code, seed, max, players, priv, over, winner} — تماشای میهمان (0.141.0)
    mySlot: -1,
    token: null, // توکن اتصال‌مجدد اسلات (0.141.0)
    _sock() { return sock; },
    isInRoom() { return !!api.room; },
    isStarted() { return !!(api.room && api.room.started); },
    isWatching() { return !!api.watchInfo && !api.room; },
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
        noCow: o.noCow === true, // گزینه اتاق «No Cow Throwing» (0.147.0 — §۱۲.۴)
        strongWalls: o.strongWalls === true, // گزینه اتاق «Strong Walls» (0.148.0 — §۱۴.۲)
        noRush: o.noRush === true, // گزینه اتاق «No Rush» (0.149.0 — §۱۴.۲/بند ۷۳۰)
        noDogs: o.noDogs === true,
      }));
      const r = JSON.parse(raw);
      if (!r.ok) throw new Error(r.err || "bad");
      api.room = {
        code: r.data.code, slot: r.data.slot, max,
        players: [], started: false, seed: r.data.seed | 0, priv: !!r.data.priv,
        noCow: r.data.noCow === true,
        strongWalls: r.data.strongWalls === true,
        noRush: r.data.noRush === true, // گزینه اتاق (0.149.0 — §۱۴.۲/بند ۷۳۰)
        noDogs: r.data.noDogs === true,
        host: r.data.slot, // سازنده = میزبان (بند 718)
      };
      api.mySlot = r.data.slot;
      api.token = r.data.token || null;
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
        noCow: r.data.r.noCow === true, // گزینه اتاق (0.147.0 — §۱۲.۴)
        strongWalls: r.data.r.strongWalls === true, // گزینه اتاق (0.148.0 — §۱۴.۲)
        noRush: r.data.r.noRush === true, // گزینه اتاق (0.149.0)
        noDogs: r.data.r.noDogs === true,
        host: r.data.r.host, // میزبان از roster سرور (بند 718)
      };
      api.mySlot = r.data.slot;
      api.token = r.data.token || null;
      return api.room;
    },
    // اتصال‌مجدد به بازی جاری با توکن (0.141.0) — اسلات حفظ‌شده برمی‌گردد.
    // خروجی {room, seq}: seq = seq بعدی سرور (مبنای همگام‌سازی عقب‌ماندگی).
    async rejoin(code, slot, token) {
      const s = await needSock();
      if (!s) throw new Error("offline");
      const raw = await s.rpc.mpRejoin(JSON.stringify({ code, slot, token }));
      const r = JSON.parse(raw);
      if (!r.ok) throw new Error(r.err || "bad");
      api.room = {
        code, slot: r.data.slot, max: r.data.r.max,
        players: r.data.r.players, started: true,
        over: !!r.data.r.over, winner: r.data.r.winner,
        seed: r.data.seed | 0, priv: !!r.data.priv,
        noCow: r.data.r.noCow === true, // گزینه اتاق (0.147.0 — §۱۲.۴)
        strongWalls: r.data.r.strongWalls === true, // گزینه اتاق (0.148.0 — §۱۴.۲)
        noRush: r.data.r.noRush === true, // گزینه اتاق (0.149.0)
        noDogs: r.data.r.noDogs === true,
        host: r.data.r.host, // میزبان از roster سرور (بند 718)
      };
      api.mySlot = r.data.slot;
      api.token = token;
      api.watchInfo = null;
      paint();
      return { room: api.room, seq: r.data.seq | 0 };
    },
    // تماشای میهمان (0.141.0) — بدون اسلات؛ خروجی {watch, seq}.
    async watch(code, opts) {
      const s = await needSock();
      if (!s) throw new Error("offline");
      const o = opts || {};
      const raw = await s.rpc.mpWatch(JSON.stringify({
        code, password: o.password === undefined ? null : o.password,
      }));
      const r = JSON.parse(raw);
      if (!r.ok) throw new Error(r.err || "bad");
      api.room = null;
      api.mySlot = -1;
      api.token = null;
      api.watchInfo = {
        code, seed: r.data.seed | 0, max: r.data.r.max,
        players: r.data.r.players, priv: !!r.data.priv,
        over: !!r.data.r.over, winner: r.data.r.winner,
        noCow: r.data.r.noCow === true, // گزینه اتاق (0.147.0 — §۱۲.۴)
        strongWalls: r.data.r.strongWalls === true, // گزینه اتاق (0.148.0 — §۱۴.۲)
        noRush: r.data.r.noRush === true, // گزینه اتاق (0.149.0)
        noDogs: r.data.r.noDogs === true,
        host: r.data.r.host, // میزبان از roster سرور (بند 718)
      };
      paint();
      return { watch: api.watchInfo, seq: r.data.seq | 0 };
    },
    // فهرست بازی‌های فعال سرور (0.141.0).
    async live() {
      const s = await needSock();
      if (!s) return [];
      try {
        const raw = await s.rpc.mpLive("");
        const r = JSON.parse(raw);
        return r.ok ? r.data.rooms : [];
      } catch (e) { return []; }
    },
    // ورودی‌های جاافتاده [from, ...) تا سقف ۳۰۰ (0.141.0) — خطا throw می‌شود.
    async sync(code, from) {
      const s = await needSock();
      if (!s) throw new Error("offline");
      const raw = await s.rpc.mpSync(JSON.stringify({ code, from }));
      const r = JSON.parse(raw);
      if (!r.ok) throw new Error(r.err || "bad");
      return r.data;
    },
    // اعلام پایان بازی (0.141.0) — fire-and-forget؛ خطا نادیده.
    async finish(code, winner) {
      const s = sock;
      if (!s || !api.connected) return;
      try { await s.rpc.mpFinish(JSON.stringify({ code, winner })); } catch (e) {}
    },
    // گزارش ناهمگامی (0.232.0 — C-SRV-6) — fire-and-forget؛ خطا/آفلاین = false.
    async desync(code, tick, hash) {
      const s = sock;
      if (!s || !api.connected) return false;
      const body = desyncReportOf(code, tick, hash);
      if (!body) return false;
      try { await s.rpc.mpDesync(JSON.stringify(body)); return true; } catch (e) { return false; }
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
      const code = (api.room && api.room.code) || (api.watchInfo && api.watchInfo.code);
      api.room = null; api.mySlot = -1; api.token = null; api.watchInfo = null;
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
    if (!m || typeof m !== "object") return;
    const ctx = api.room || api.watchInfo; // بازیکن یا تماشاگر (0.141.0)
    if (!ctx) return;
    if (m.t === "roster") {
      if (!m.r || m.r.code !== ctx.code) return;
      ctx.players = m.r.players;
      ctx.max = m.r.max;
      if (api.room) {
        api.room.started = m.r.started;
        if (m.r.seed !== undefined) api.room.seed = m.r.seed | 0;
        if (m.r.priv !== undefined) api.room.priv = !!m.r.priv;
        if (m.r.noCow !== undefined) api.room.noCow = m.r.noCow === true; // گزینه اتاق (0.147.0)
        if (m.r.strongWalls !== undefined) api.room.strongWalls = m.r.strongWalls === true; // گزینه اتاق (0.148.0)
        if (m.r.noRush !== undefined) api.room.noRush = m.r.noRush === true; // گزینه اتاق (0.149.0)
        if (m.r.noDogs !== undefined) api.room.noDogs = m.r.noDogs === true; // room option (0.156.0)
        if (m.r.over !== undefined) api.room.over = !!m.r.over;
        if (m.r.host !== undefined) api.room.host = m.r.host; // میزبان (بند 718)
      } else {
        if (m.r.over !== undefined) api.watchInfo.over = !!m.r.over;
        if (m.r.noCow !== undefined) api.watchInfo.noCow = m.r.noCow === true; // گزینه اتاق (0.147.0)
        if (m.r.strongWalls !== undefined) api.watchInfo.strongWalls = m.r.strongWalls === true; // گزینه اتاق (0.148.0)
        if (m.r.noRush !== undefined) api.watchInfo.noRush = m.r.noRush === true; // گزینه اتاق (0.149.0)
        if (m.r.noDogs !== undefined) api.watchInfo.noDogs = m.r.noDogs === true; // room option (0.156.0)
        if (m.r.host !== undefined) api.watchInfo.host = m.r.host; // میزبان (بند 718)
      }
      paint();
    } else if (m.t === "start") {
      if (!api.room || !m.r || m.r.code !== api.room.code) return;
      api.room.players = m.r.players;
      api.room.max = m.r.max;
      api.room.started = true;
      api.room.seed = m.seed;
      if (m.r.noCow !== undefined) api.room.noCow = m.r.noCow === true; // گزینه اتاق (0.147.0)
      if (m.r.strongWalls !== undefined) api.room.strongWalls = m.r.strongWalls === true; // گزینه اتاق (0.148.0)
      if (m.r.noRush !== undefined) api.room.noRush = m.r.noRush === true; // گزینه اتاق (0.149.0)
      if (m.r.noDogs !== undefined) api.room.noDogs = m.r.noDogs === true; // room option (0.156.0)
      if (m.r.host !== undefined) api.room.host = m.r.host; // میزبان (بند 718)
      paint();
      hooks.onStart(api.room, m.seed);
    } else if (m.t === "inp") {
      if (!hooks.gameActive()) return;
      if (typeof m.seq !== "number" || typeof m.slot !== "number") return;
      hooks.onInput(m);
    } else if (m.t === "left") {
      hooks.onPeerLeft(m.slot);
    } else if (m.t === "gone") {
      if (hooks.onPeerGone) hooks.onPeerGone(m.slot);
    } else if (m.t === "back") {
      if (hooks.onPeerBack) hooks.onPeerBack(m.slot);
    } else if (m.t === "end") {
      if (hooks.onGameEnd) hooks.onGameEnd(m.winner);
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
        if (r.data.noCow !== undefined) api.room.noCow = r.data.noCow === true; // گزینه اتاق (0.147.0)
        if (r.data.strongWalls !== undefined) api.room.strongWalls = r.data.strongWalls === true; // گزینه اتاق (0.148.0)
        if (r.data.noRush !== undefined) api.room.noRush = r.data.noRush === true; // گزینه اتاق (0.149.0)
        if (r.data.noDogs !== undefined) api.room.noDogs = r.data.noDogs === true; // room option (0.156.0)
        if (r.data.host !== undefined) api.room.host = r.data.host; // میزبان (بند 718)
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
      // اتصال‌مجدد خودکار به بازی جاری (0.141.0): قطعی گذرای سوکت (نه رفرش
      // کامل صفحه) با توکن ذخیره‌شده بی‌صدا ترمیم می‌شود؛ عقب‌ماندگی را
      // onRejoined همگام می‌کند. خطا فقط نمایش داده می‌شود.
      if (api.room && api.room.started && api.token && hooks.gameActive()) {
        api.rejoin(api.room.code, api.mySlot, api.token).then((res) => {
          if (hooks.onRejoined) hooks.onRejoined(res.seq);
        }).catch((e) => { hooks.onError(e && e.message); });
      }
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