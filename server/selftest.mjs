// خودآزمون سرور (بدون وابستگی تازه): node selftest.mjs — بوت روی پورت تصادفی، چک امنیت/کش/فشرده‌سازی/سقف سوکت.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "node:http";
import { WebSocket } from "ws";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = 20000 + Math.floor(Math.random() * 20000);
const srv = spawn("node", ["server.mjs"], { cwd: here, env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
const get = (p, headers = {}, method = "GET") => new Promise((res, rej) => {
  const r = http.request({ port, path: p, method, headers }, (x) => { const c = []; x.on("data", (d) => c.push(d)); x.on("end", () => res({ s: x.statusCode, h: x.headers, b: Buffer.concat(c) })); });
  r.on("error", rej); r.end();
});
let fail = 0;
const ok = (name, cond) => { console.log((cond ? "✓ " : "✗ ") + name); if (!cond) fail++; };
try {
  for (let i = 0; i < 50; i++) { try { await get("/"); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  ok("index served", (await get("/")).s === 200);
  ok("game module served", (await get("/game/main.js")).s === 200);
  for (const p of ["/server/data/state.bin", "/server/server.mjs", "/.git/config", "/README.md", "/CHANGELOG.md"]) ok("blocked " + p, (await get(p)).s === 404);
  ok("malformed % escape → 400 (no crash)", (await get("/%E0%A4%A")).s === 400);
  ok("server still alive after malformed URL", (await get("/")).s === 200);
  ok("traversal blocked", [403, 404].includes((await get("/..%2f..%2fetc/passwd")).s));
  ok("POST rejected", (await get("/", {}, "POST")).s === 405);
  const gz = await get("/game/main.js", { "Accept-Encoding": "gzip" });
  ok("gzip applied", gz.h["content-encoding"] === "gzip" && gz.b.length < 100000);
  const etag = gz.h.etag;
  ok("ETag → 304", (await get("/game/main.js", { "If-None-Match": etag })).s === 304);
  const code = await new Promise((res) => {
    const ws = new WebSocket(`ws://localhost:${port}/sock`);
    ws.on("open", () => ws.send("x".repeat(600 * 1024)));
    ws.on("close", (c) => res(c));
    ws.on("error", () => {});
  });
  ok("oversized ws frame closed (1009)", code === 1009);
} finally { srv.kill(); }
console.log(fail ? `FAIL ${fail}` : "all server checks passed");
process.exit(fail ? 1 : 0);
