// سرور مستقل بازی «ارگ» (0.69.0) — اجرای شخصی.
// همان منطق سرور پرچنس (src/server/game-logic.js = کپی عینی اسکریپت داخل
// index.html) روی Node اجرا می‌شود؛ پس رفتار اتاق‌ها/تالار/ابری یکسان است.
//
// اجرا:
//   npm install          # فقط وابستگی ws
//   node server.mjs      # پورت پیش‌فرض 8080 (PORT=... برای تغییر)
// بازی: http://<host>:8080/  (فایل استاتیک + سوکت روی همین پورت، بدون CORS)
//
// چیدمان موردانتظار:
//   bundle/              <- ریشه (GAME_ROOT، پیش‌فرض: پوشه والد server/)
//     index.html  src/   <- فایل‌های بازی
//     server/            <- همین پوشه (server.mjs، game-logic.js، ...)
//     server/data/state.bin <- ساخته می‌شود (تالار/اتاق‌ها/ابری — بکاپ بگیر)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.GAME_ROOT
  ? path.resolve(process.env.GAME_ROOT)
  : path.resolve(HERE, "..");
const PORT = parseInt(process.env.PORT || "8080", 10) || 8080;
const SOCK_PATH = "/sock";

// بافر دائمی سرور — باید دقیقاً اندازه موردنیاز منطق بازی باشد
// (در سربرگ game-logic.js محاسبه شده: 664 + 32*136 + 16*65548).
const STATE_SIZE = 1053784;
const DATA_DIR = path.resolve(HERE, "data");
const STATE_FILE = path.join(DATA_DIR, "state.bin");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};

// ---- بافر دائمی (خواندن در بوت، نوشتن دوره‌ای + هنگام خاموشی) ----
let state;
try {
  const saved = fs.readFileSync(STATE_FILE);
  state = new Uint8Array(STATE_SIZE);
  state.set(saved.subarray(0, Math.min(saved.length, STATE_SIZE)));
  console.log(`[state] loaded ${saved.length} bytes`);
} catch (e) {
  state = new Uint8Array(STATE_SIZE);
  console.log("[state] fresh buffer");
}
let stateDirty = false;
const stateSnap = () => Buffer.from(state);
let lastSnap = stateSnap();
setInterval(() => {
  const now = stateSnap();
  if (!Buffer.compare(lastSnap, now)) return;
  lastSnap = now;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE + ".tmp", now);
    fs.renameSync(STATE_FILE + ".tmp", STATE_FILE);
  } catch (e) { console.error("[state] save failed:", e.message); }
}, 10000).unref();
function flushState() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, stateSnap());
    console.log("[state] flushed");
  } catch (e) { console.error("[state] flush failed:", e.message); }
}
process.on("SIGINT", () => { flushState(); process.exit(0); });
process.on("SIGTERM", () => { flushState(); process.exit(0); });

// ---- pubsub (آینه API پلاگین سرور پرچنس) ----
const topics = new Map(); // topic -> Set<conn>
const pubsub = {
  publish(topic, msg) {
    const subs = topics.get(String(topic));
    if (!subs || subs.size === 0) return;
    const frame = JSON.stringify({ t: "push", data: String(msg) });
    for (const c of subs) {
      try { if (c.ws.readyState === 1) c.ws.send(frame); } catch (e) {}
    }
  },
  numSubscribers(topic) {
    const subs = topics.get(String(topic));
    return subs ? subs.size : 0;
  },
};

// ---- بارگذاری منطق بازی (همان سه متغیر محیط پلاگین) ----
const logicCode = fs.readFileSync(path.join(HERE, "game-logic.js"), "utf8");
const self = {};
new Function("state", "pubsub", "self", logicCode)(state, pubsub, self);
if (!self.rpc || typeof self.onopen !== "function") {
  console.error("[fatal] game-logic.js did not register rpc handlers");
  process.exit(1);
}

// ---- اتصال‌ها ----
let nextId = 1;
const conns = new Map(); // id -> conn
// X-Forwarded-For فقط پشت پراکسی مورد اعتماد (TRUST_PROXY=1) خوانده می‌شود؛ وگرنه کلاینت
// می‌تواند با هدر جعلی محدودیت نرخ را دور بزند.
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
function clientIp(req) {
  const fwd = TRUST_PROXY ? req.headers["x-forwarded-for"] : null;
  if (typeof fwd === "string" && fwd.trim()) return fwd.split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "0.0.0.0";
}
function detach(conn) {
  conns.delete(conn.id);
  for (const t of conn.subs) {
    const s = topics.get(t);
    if (s) { s.delete(conn); if (s.size === 0) topics.delete(t); }
  }
}
function handleRpc(conn, raw) {
  let m = null;
  try { m = JSON.parse(String(raw)); } catch (e) { return; }
  if (!m || m.t !== "rpc" || typeof m.id !== "number" || typeof m.name !== "string") return;
  const fn = self.rpc[m.name];
  let body;
  try {
    body = fn
      ? fn({ conn }, typeof m.args === "string" ? m.args : "")
      : JSON.stringify({ ok: false, err: "bad" });
  } catch (e) {
    body = JSON.stringify({ ok: false, err: "bad" });
  }
  try {
    if (conn.ws.readyState === 1) {
      conn.ws.send(JSON.stringify({ t: "res", id: m.id, body: String(body) }));
    }
  } catch (e) {}
}

// ---- فایل استاتیک ----
// فهرست مجاز: فقط ریشه‌های خود بازی سرو می‌شوند. server/ (کد و state.bin با هش رمز اتاق‌ها)،
// .git، مستندات و هر چیز دیگر هرگز از HTTP خارج نمی‌شوند.
const PUBLIC_DIRS = new Set(["game", "styles", "assets"]);
const PUBLIC_FILES = new Set(["index.html", "VERSION", "favicon.ico", "robots.txt"]);
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg"]);
const gzCache = new Map(); // file -> { key, buf }

function isPublic(rel) {
  const parts = rel.split(path.sep).filter(Boolean);
  if (parts.some((x) => x.startsWith("."))) return false;
  if (parts.length === 1) return PUBLIC_FILES.has(parts[0]);
  return PUBLIC_DIRS.has(parts[0]);
}

function send(res, code, body, extra) {
  res.writeHead(code, { "Content-Type": "text/plain; charset=utf-8", ...extra });
  res.end(body);
}

function serveStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") { send(res, 405, "method not allowed", { Allow: "GET, HEAD" }); return; }
  let p;
  try { p = decodeURIComponent((req.url || "/").split("?")[0]); } catch (e) { send(res, 400, "bad request"); return; }
  if (p.includes("\0")) { send(res, 400, "bad request"); return; }
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + path.sep)) { send(res, 403, "forbidden"); return; }
  if (!isPublic(path.relative(ROOT, file))) { send(res, 404, "not found"); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { send(res, 404, "not found"); return; }
    const ext = path.extname(file).toLowerCase();
    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    // کد/استایل همیشه revalidate (ETag) تا نسخه قدیمی نماند؛ دارایی‌های باینری کش بلند
    const immutable = ext === ".woff2" || ext === ".png" || ext === ".jpg" || ext === ".mp3";
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": immutable ? "public, max-age=86400" : "no-cache",
      ETag: etag,
      "Last-Modified": st.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff",
      Vary: "Accept-Encoding",
    };
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); res.end(); return; }
    const wantGz = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"] || "")) && st.size > 1024;
    if (wantGz) {
      const hit = gzCache.get(file);
      if (hit && hit.key === etag) {
        res.writeHead(200, { ...headers, "Content-Encoding": "gzip", "Content-Length": hit.buf.length });
        res.end(req.method === "HEAD" ? undefined : hit.buf);
        return;
      }
      fs.readFile(file, (e2, raw) => {
        if (e2) { send(res, 500, "read error"); return; }
        zlib.gzip(raw, { level: 6 }, (e3, buf) => {
          if (e3) { send(res, 500, "compress error"); return; }
          gzCache.set(file, { key: etag, buf });
          res.writeHead(200, { ...headers, "Content-Encoding": "gzip", "Content-Length": buf.length });
          res.end(req.method === "HEAD" ? undefined : buf);
        });
      });
      return;
    }
    res.writeHead(200, { ...headers, "Content-Length": st.size });
    if (req.method === "HEAD") { res.end(); return; }
    const rs = fs.createReadStream(file);
    rs.on("error", () => res.destroy());
    rs.pipe(res);
  });
}

const server = http.createServer(serveStatic);
// سقف بار سوکت: ذخیره ابری/اتاق‌ها کوچک‌اند؛ پیش‌فرض ws (۱۰۰MB) یک وکتور حافظه بود.
const WS_MAX_PAYLOAD = 512 * 1024;
const WS_MAX_PER_IP = parseInt(process.env.WS_MAX_PER_IP || "20", 10) || 20;
const wss = new WebSocketServer({ noServer: true, maxPayload: WS_MAX_PAYLOAD });
const perIp = new Map();
server.on("upgrade", (req, socket, head) => {
  const p = (req.url || "").split("?")[0];
  if (p !== SOCK_PATH) { socket.destroy(); return; }
  const ipKey = clientIp(req);
  if ((perIp.get(ipKey) || 0) >= WS_MAX_PER_IP) { socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n"); socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => {
    const conn = {
      id: nextId++,
      net: clientIp(req), // آینه conn.net پرچنس (برای محدودیت نرخ، رشته IP کافی است)
      ws,
      subs: new Set(),
      subscribe(t) {
        t = String(t);
        conn.subs.add(t);
        let s = topics.get(t);
        if (!s) { s = new Set(); topics.set(t, s); }
        s.add(conn);
      },
      unsubscribe(t) {
        t = String(t);
        conn.subs.delete(t);
        const s = topics.get(t);
        if (s) { s.delete(conn); if (s.size === 0) topics.delete(t); }
      },
    };
    conns.set(conn.id, conn);
    perIp.set(ipKey, (perIp.get(ipKey) || 0) + 1);
    conn.alive = true;
    ws.on("pong", () => { conn.alive = true; });
    ws.on("error", () => {});
    ws.on("message", (buf) => handleRpc(conn, buf));
    ws.on("close", () => {
      const n = (perIp.get(ipKey) || 1) - 1;
      if (n > 0) perIp.set(ipKey, n); else perIp.delete(ipKey);
      detach(conn);
      try { self.onclose({ conn }); } catch (e) {}
    });
    try { self.onopen({ conn }); } catch (e) {} // اشتراک lobby مثل پرچنس
  });
});

// ضربان: اتصال مرده (بدون pong) پاک می‌شود تا اشتراک/اسلات اتاق معلق نماند.
setInterval(() => {
  for (const c of conns.values()) {
    if (!c.alive) { try { c.ws.terminate(); } catch (e) {} continue; }
    c.alive = false;
    try { c.ws.ping(); } catch (e) {}
  }
}, 30000).unref();

server.listen(PORT, () => {
  console.log(`[arg-server] http://localhost:${PORT}/  (sock: ${SOCK_PATH})`);
  console.log(`[arg-server] serving: ${ROOT}`);
});
