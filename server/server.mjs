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
function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
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
function serveStatic(req, res) {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
    res.writeHead(403); res.end("forbidden"); return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end("not found"); return; }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": p === "/index.html" ? "no-store" : "public, max-age=3600",
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(serveStatic);
const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  const p = (req.url || "").split("?")[0];
  if (p !== SOCK_PATH) { socket.destroy(); return; }
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
    ws.on("message", (buf) => handleRpc(conn, buf));
    ws.on("close", () => {
      detach(conn);
      try { self.onclose({ conn }); } catch (e) {}
    });
    try { self.onopen({ conn }); } catch (e) {} // اشتراک lobby مثل پرچنس
  });
});

server.listen(PORT, () => {
  console.log(`[arg-server] http://localhost:${PORT}/  (sock: ${SOCK_PATH})`);
  console.log(`[arg-server] serving: ${ROOT}`);
});
