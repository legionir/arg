#!/usr/bin/env node
// Runs the in-browser suite headless and fails on any failed test or page error.
//   node tools/ci-tests.mjs            (needs `playwright` resolvable and a Chromium for it)
// CHROMIUM_PATH overrides the browser binary (e.g. /opt/pw-browsers/chromium).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
let pw;
for (const p of ["playwright", path.join(root, "node_modules/playwright"), "/opt/node22/lib/node_modules/playwright"]) { try { pw = require(p); break; } catch {} }
if (!pw) { console.error("playwright not found"); process.exit(2); }

const port = Number(process.env.PORT || 8098);
const srv = spawn("node", ["server.mjs"], { cwd: path.join(root, "server"), env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://localhost:${port}/`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }

const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const page = await browser.newPage();
const problems = [], failed = [];
let total = 0;
page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
page.on("response", (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
page.on("console", async (m) => {
  if (!m.text().startsWith("[tests")) return;
  try { const rows = await m.args()[1].jsonValue(); total += rows.length; for (const r of rows) if (!r.pass) failed.push(`${r.name}: ${r.detail || ""}`); } catch {}
});
let code = 0;
try {
  await page.goto(`http://localhost:${port}/?lang=fa&test`);
  await page.waitForFunction(() => document.body.dataset.testsDone === "1", null, { timeout: 240000 });
  await page.waitForTimeout(500);
} catch (e) { problems.push("timeout: " + e.message.split("\n")[0]); }
console.log(`tests: ${total - failed.length}/${total}`);
for (const f of failed) console.log("FAIL " + f);
for (const p of problems) console.log("PROBLEM " + p);
if (failed.length || problems.length || total === 0) code = 1;
await browser.close(); stop(); process.exit(code);
