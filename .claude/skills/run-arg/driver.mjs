#!/usr/bin/env node
// Headless driver for Arg (browser game). Starts server/server.mjs, drives Chromium via Playwright.
//   node .claude/skills/run-arg/driver.mjs shot  [--lang fa|en] [--solo] [--page solo|mp|profile|settings] [--wait 3000] [--w 1280] [--h 800] [--out file.png]
//   node .claude/skills/run-arg/driver.mjs tests [--lang fa|en]      # in-browser test suite (?test), prints badge text
// Always prints console/page errors and exits non-zero on page errors.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const argv = process.argv.slice(2);
const cmd = argv.shift() || "shot";
const opt = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true); };
const lang = opt("lang", "fa"), port = +opt("port", 8099), w = +opt("w", 1280), h = +opt("h", 800);
const out = path.resolve(opt("out", path.join(process.env.TMPDIR || "/tmp", `arg-${cmd}-${lang}.png`)));

const require = createRequire(import.meta.url);
let pw;
for (const p of ["playwright", "/opt/node22/lib/node_modules/playwright"]) { try { pw = require(p); break; } catch {} }
if (!pw) throw new Error("playwright not found (npm i -g playwright)");

if (!fs.existsSync(path.join(root, "server/node_modules/ws"))) {
  await new Promise((r, j) => spawn("npm", ["install", "--silent"], { cwd: path.join(root, "server"), stdio: "inherit" }).on("exit", c => c ? j(new Error("npm install failed")) : r()));
}
const srv = spawn("node", ["server.mjs"], { cwd: path.join(root, "server"), env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${port}/`)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = [];
page.on("pageerror", e => errs.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
let code = 0;
try {
  await page.goto(`http://localhost:${port}/?lang=${lang}${cmd === "tests" ? "&test" : ""}`);
  await page.waitForSelector("#menuScreen");
  if (cmd === "tests") {
    await page.waitForSelector("#testBadge:not([hidden])", { timeout: 60000 });
    await page.waitForFunction(() => document.body.dataset.testsDone === "1", null, { timeout: 60000 });
    const badge = await page.textContent("#testBadge");
    console.log(badge.split("،")[0].slice(0, 160) + " …");
    const m = badge.match(/(\d+)\/(\d+)/);
    if (m && m[1] !== m[2]) code = 1;
  } else {
    if (opt("page", false)) { await page.click(`#menuBox .nav-btn[data-go="${opt("page")}"]`); await page.waitForTimeout(500); }
    if (opt("solo", false)) { await page.click("#navSolo"); await page.click("#soloBtn"); await page.waitForSelector("#menuScreen", { state: "hidden" }); }
    await page.waitForTimeout(+opt("wait", 1500));
  }
  await page.screenshot({ path: out });
  console.log("screenshot:", out);
} catch (e) { console.log("driver error:", e.message); code = 2; }
console.log(errs.length ? "errors:\n" + [...new Set(errs)].join("\n") : "no console/page errors");
if (errs.some(e => e.startsWith("pageerror"))) code = code || 1;
await browser.close(); stop(); process.exit(code);
