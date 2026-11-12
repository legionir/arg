// DesignArena automation over a user-provided Chrome DevTools tunnel (Playwright connectOverCDP).
// SECRETS: nothing is stored in the repo. The tunnel is given at run time:
//   DA_TUNNEL = https://<worker>.workers.dev        (base of the tunnel)
//   DA_OTP    = <one-time token>                     (exchanged for a session cookie, kept in DA_COOKIE_FILE under the OS temp dir)
// or DA_COOKIE_FILE pointing to a curl cookie jar from an earlier exchange (valid ~8 h).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

export const pw = createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
export class LimitError extends Error { constructor(msg, shot) { super(msg); this.name = "LimitError"; this.shot = shot; } }

const curl = (args) => execFileSync("curl", ["-sS", "-m", "40", ...args], { maxBuffer: 64 * 1024 * 1024 }).toString();

export function cookieHeader() {
  const base = process.env.DA_TUNNEL; if (!base) throw new Error("set DA_TUNNEL=https://<worker>.workers.dev");
  const jar = process.env.DA_COOKIE_FILE || path.join(os.tmpdir(), "da-cookie.txt");
  if (process.env.DA_OTP) { curl(["-o", "/dev/null", "-c", jar, `${base}/?otp=${process.env.DA_OTP}`]); }
  if (!fs.existsSync(jar)) throw new Error("no cookie jar: provide DA_OTP (first time) or DA_COOKIE_FILE");
  const rows = fs.readFileSync(jar, "utf8").split("\n").filter((l) => l && !l.startsWith("# ")).map((l) => l.replace(/^#HttpOnly_/, "").split("\t"));
  return { cookie: rows.map((c) => `${c[5]}=${c[6]}`).join("; "), jar };
}

// Close leftover bare home-page tabs through RAW CDP (works even while Playwright's own handshake is blocked by a hung tab).
export async function rawCloseStrays() {
  const WebSocket = createRequire(import.meta.url)("/home/user/arg/server/node_modules/ws");
  const base = process.env.DA_TUNNEL, { cookie, jar } = cookieHeader();
  const id = JSON.parse(curl(["-b", jar, `${base}/json/version`])).webSocketDebuggerUrl.split("/").pop();
  return new Promise((resolve) => {
    const ws = new WebSocket(`${base.replace(/^http/, "ws")}/devtools/browser/${id}`, { headers: { Cookie: cookie } });
    let n = 0, seq = 0; const pend = new Map();
    const call = (method, params) => new Promise((res) => { const i = ++seq; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    ws.on("message", (m) => { const o = JSON.parse(m); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
    ws.on("open", async () => {
      const t = (await call("Target.getTargets")).result.targetInfos.filter((x) => x.type === "page");
      for (const x of t) if (/^https:\/\/www\.designarena\.ai\/?$/.test(x.url)) { await call("Target.closeTarget", { targetId: x.targetId }); n++; }
      ws.close(); resolve(n);
    });
    ws.on("error", () => resolve(-1));
    setTimeout(() => { try { ws.terminate(); } catch {} resolve(-2); }, 20000);
  });
}

// Browser ids change on every Chrome restart, so ask /json/version each time.
export async function connect() {
  await rawCloseStrays().catch(() => {});
  const base = process.env.DA_TUNNEL, { cookie, jar } = cookieHeader();
  const v = JSON.parse(curl(["-b", jar, `${base}/json/version`]));
  const id = v.webSocketDebuggerUrl.split("/").pop();
  return pw.chromium.connectOverCDP(`${base.replace(/^http/, "ws")}/devtools/browser/${id}`, { timeout: 30000, headers: { Cookie: cookie } });
}

export async function withRetry(fn, tries = 3, label = "") {
  let last;
  for (let i = 0; i < tries; i++) { try { return await fn(); } catch (e) { if (e.name === "LimitError") throw e; last = e; console.log(`  [retry ${i + 1}/${tries}${label ? " " + label : ""}] ${String(e.message).split("\n")[0].slice(0, 160)}`); await new Promise((r) => setTimeout(r, 4000 * (i + 1))); } }
  throw last;
}

const LIMIT_RE = /(rate limit|too many (requests|generations)|daily limit|limit reached|out of (credits|generations)|insufficient credits|upgrade (to|your)|come back (later|tomorrow)|usage limit|quota)/i;
export async function checkLimit(page, shotPath) {
  const t = await page.evaluate(() => document.body.innerText).catch(() => "");
  const m = t.match(LIMIT_RE);
  if (m) { if (shotPath) await page.screenshot({ path: shotPath, type: "jpeg", quality: 60 }).catch(() => {}); throw new LimitError("limit/quota text on page: “" + m[0] + "”", shotPath); }
}

export async function dismissModals(page) {
  for (const label of ["Skip", "Dismiss", "Not now", "Maybe later", "Close"]) {
    const el = page.getByRole("button", { name: label, exact: true }).first();
    if (await el.isVisible().catch(() => false)) { await el.click().catch(() => {}); await page.waitForTimeout(400); }
  }
}

// Large supabase result images currently on the page → decoded original URLs (signed, short-lived)
export const resultUrls = (page, minWidth = 0) => page.evaluate((mw) => [...document.images]
  .filter((i) => i.currentSrc.includes("supabase") && i.naturalWidth >= mw)
  .map((i) => new URL(i.currentSrc).searchParams.get("url") || i.currentSrc), minWidth);

export function download(url, out) { execFileSync("curl", ["-sS", "-m", "120", "-o", out, url]); return fs.statSync(out).size; }
