#!/usr/bin/env node
// Offline smoke test: load once online, wait for the service worker, go offline, reload,
// start a single-player game. Exit 1 if anything fails.
//   CHROMIUM_PATH=/path/to/chromium node tools/offline-check.mjs
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
let pw;
for (const p of ["playwright", path.join(root, "node_modules/playwright"), "/opt/node22/lib/node_modules/playwright"]) { try { pw = require(p); break; } catch {} }
if (!pw) { console.error("playwright not found"); process.exit(2); }
const port = Number(process.env.PORT || 8093);
const srv = spawn("node", ["server.mjs"], { cwd: path.join(root, "server"), env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${port}/`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
let code = 0;
try {
  await page.goto(`http://localhost:${port}/`);
  await page.waitForSelector("#menuScreen");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 });
  stop(); // server gone: everything must now come from the cache
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector("#menuScreen");
  await page.waitForFunction(() => window.__argBooted === true, null, { timeout: 20000 });
  await page.click("#navSolo"); await page.click("#soloBtn");
  await page.waitForSelector("#menuScreen", { state: "hidden", timeout: 20000 });
  const n = await page.evaluate(() => document.querySelectorAll("#buildPal .bcard").length);
  if (!(n > 0)) throw new Error("build palette is empty offline");
  console.log(`offline: menu + single-player start OK (${n} build cards)`);
} catch (e) { console.log("offline check FAILED: " + e.message.split("\n")[0]); code = 1; }
for (const e of errs) { console.log(e); code = 1; }
await browser.close(); process.exit(code);
