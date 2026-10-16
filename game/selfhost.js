// اجرای شخصی روی سرور خودت (0.69.0) — آداپتور سوکت.
// روی پرچنس `root.createServerSocket` هست و همین استفاده می‌شود (بدون هیچ
// تغییری در رفتار). بیرون پرچنس (صفحه‌ای که خودت سرو می‌کنی) آن تابع نیست؛
// در این صورت همین API (`rpc.*` + رویدادهای open/message/close + `close()`)
// روی WebSocket سرور خودت (`server.mjs`) پیاده می‌شود.
//
// انتخاب آدرس سوکت (اولینِ موجود):
//   ۱) ?server=wss://example.com/sock (یا مسیر نسبی مثل ?server=/sock)
//   ۲) localStorage["scw.server"] (همان قالب)
//   ۳) پیش‌فرض: همین هاست با مسیر /sock (الگوی server.mjs: استاتیک + سوکت
//      روی یک پورت) — یعنی روی سرور خودت هیچ تنظیمی لازم نیست.
export const SELFHOST_STORE_KEY = "scw.server";
export const SELFHOST_SOCK_PATH = "/sock";
export const SELFHOST_RPC_TIMEOUT_MS = 15000;

// خالص و تست‌پذیر: تقدم query بر stored بر پیش‌فرض همین‌هاست.
export function resolveSocketUrl({ query, stored, host, proto }) {
  const norm = (v) => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    if (!t) return null;
    if (/^wss?:\/\//i.test(t)) return t;
    if (t[0] === "/" && host) {
      return (proto === "https" ? "wss" : "ws") + "://" + host + t;
    }
    return null;
  };
  const picked = norm(query) || norm(stored);
  if (picked) return picked;
  if (host) {
    return (proto === "https" ? "wss" : "ws") + "://" + host + SELFHOST_SOCK_PATH;
  }
  return null; // مثل file:// بدون تنظیم — آفلاینِ کامل
}

export function selfhostWsUrl() {
  try {
    const q = new URLSearchParams(window.location.search).get("server");
    let s = null;
    try { s = window.localStorage.getItem(SELFHOST_STORE_KEY); } catch (e) {}
    return resolveSocketUrl({
      query: q,
      stored: s,
      host: window.location.host || "",
      proto: String(window.location.protocol || "").replace(":", ""),
    });
  } catch (e) {
    return null;
  }
}

// سازنده سوکتِ مورداستفاده هر سه لایه (online/lobby/cloud): اول پلتفرم، وگرنه
// سرور شخصی، وگرنه null (= آفلاینِ کامل؛ هر سه لایه تک‌نفره را لمس نمی‌کنند).
export function getSocketMaker() {
  try {
    if (typeof root !== "undefined" && typeof root.createServerSocket === "function") {
      return () => root.createServerSocket();
    }
  } catch (e) {}
  const url = selfhostWsUrl();
  if (!url) return null;
  return () => createSelfhostSocket(url);
}

// قاب پیام‌ها (باید با server.mjs جور باشد):
//   کلاینت → سرور: {t:"rpc", id, name, args}   (args همیشه رشته)
//   سرور → کلاینت: {t:"res", id, body}         (body همان رشته hOk/hErr)
//   سرور → کلاینت: {t:"push", data}            (data همان ev.data خام)
export function createSelfhostSocket(url) {
  const listeners = { open: [], message: [], close: [] };
  const pending = new Map(); // id -> {resolve, reject, timer}
  let seq = 0;
  const ws = new WebSocket(url);
  const emit = (type, ev) => {
    for (const fn of listeners[type].slice()) {
      try { fn(ev); } catch (e) {}
    }
  };
  ws.addEventListener("open", () => emit("open", {}));
  ws.addEventListener("message", (ev) => {
    let m = null;
    try { m = JSON.parse(typeof ev.data === "string" ? ev.data : ""); } catch (e) { return; }
    if (m && m.t === "res" && typeof m.id === "number" && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      clearTimeout(p.timer);
      p.resolve(String(m.body != null ? m.body : ""));
    } else if (m && m.t === "push" && typeof m.data === "string") {
      emit("message", { data: m.data });
    }
  });
  ws.addEventListener("close", (ev) => {
    for (const [, p] of pending) { clearTimeout(p.timer); p.reject(new Error("closed")); }
    pending.clear();
    emit("close", { code: (ev && ev.code) || 1000 });
  });
  function callRpc(name, args) {
    return new Promise((resolve, reject) => {
      if (ws.readyState !== 1) { reject(new Error("offline")); return; }
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error("timeout"));
      }, SELFHOST_RPC_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      try {
        ws.send(JSON.stringify({
          t: "rpc", id, name: String(name),
          args: typeof args === "string" ? args : "",
        }));
      } catch (e) {
        pending.delete(id);
        clearTimeout(timer);
        reject(e);
      }
    });
  }
  return {
    _url: url,
    rpc: new Proxy({}, {
      get: (_t, name) => {
        if (name === "then") return undefined; // await تصادفی روی rpc قفل نکند
        return (args) => callRpc(name, args);
      },
    }),
    addEventListener(type, fn) {
      if (listeners[type] && typeof fn === "function") listeners[type].push(fn);
    },
    close() {
      for (const [, p] of pending) { clearTimeout(p.timer); p.reject(new Error("closed")); }
      pending.clear();
      try { ws.close(); } catch (e) {}
    },
  };
}
