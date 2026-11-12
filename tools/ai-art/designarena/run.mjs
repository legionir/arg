#!/usr/bin/env node
// Generate art through DesignArena ("Image" type) in the user's browser: submit a prompt, vote the 5 rounds with an
// automatic score, download every distinct ranked result, store it in the repo as WebP, commit/push in batches, and stop
// cleanly (exit 3) on a usage limit. Resumable: an item with <out>/meta/<key>.json is skipped.
//   DA_TUNNEL=https://<worker>.workers.dev DA_OTP=<token> node tools/ai-art/designarena/run.mjs
//        [--set buildings|units|portraits|extras]  (default: all, in order)   [--keys a,b] [--max N]
//        [--ref <image>]  style reference attached to every prompt             [--out <dir>] experiment output
//        [--collect key=<chat url>,...]  harvest a finished project without generating
//        [--commit-every 3]  git add/commit/push every N saved items (0 = never)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SETS, SET_ORDER } from "../sets.mjs";
import { connect, withRetry, checkLimit, dismissModals, resultUrls, download } from "./lib.mjs";
import { scoreImage, toWebp, toJpegSmall, closeScorer } from "./score.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../../..");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i < 0 ? null : process.argv[i + 1]; };
const only = arg("keys") ? new Set(arg("keys").split(",")) : null, MAX = +arg("max") || 1e9, COMMIT_EVERY = arg("commit-every") != null ? +arg("commit-every") : 3;
const CLI_REF = arg("ref") ? path.resolve(root, arg("ref")) : null, NO_REF = process.argv.includes("--no-ref");
let REF = null;      // style reference of the item being generated (set per item by refFor)
const REF_SENTENCE = " The attached image is a STYLE reference only: copy its rendering style, color palette, camera angle, lighting, outline weight and background treatment exactly, but do NOT copy its subject, shape, person or objects; draw only the subject described above.";
const WORK = path.join(os.tmpdir(), "da-work"); fs.mkdirSync(WORK, { recursive: true });
// single instance: two runners on one browser close each other's tabs
const LOCK = path.join(WORK, "run.lock");
try { const pid = +fs.readFileSync(LOCK, "utf8"); if (pid && pid !== process.pid) { try { process.kill(pid, 0); console.error("another runner is active (pid " + pid + ") — exiting"); process.exit(5); } catch { /* stale lock */ } } } catch { /* no lock */ }
fs.writeFileSync(LOCK, String(process.pid));
process.on("exit", () => { try { if (+fs.readFileSync(LOCK, "utf8") === process.pid) fs.unlinkSync(LOCK); } catch {} });
// A submitted-but-unfinished project is remembered so a dropped connection RESUMES it instead of generating again.
const INFLIGHT = path.join(WORK, "inflight.json");
const inflight = () => { try { return JSON.parse(fs.readFileSync(INFLIGHT, "utf8")); } catch { return {}; } };
const setInflight = (k, v) => { const o = inflight(); if (v) o[k] = v; else delete o[k]; fs.writeFileSync(INFLIGHT, JSON.stringify(o)); };
const inflightKey = (ctx) => `${ctx.SRC}::${ctx.it.key}`;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripTok = (u) => u.split("?")[0];
const promptWith = (it) => it.prompt + (REF ? REF_SENTENCE : "");
const RESULTS_PRED = () => /(fresh designs|All set|unique takes|Here you go|Add to Drive)/i.test(document.body.innerText) && !/Round \d of \d/.test(document.body.innerText);
// "Round n of N" (normal flow) or a single A/B vote step without a counter (seen in reference mode: "Here are 2 design takes…") → [n, N]; null = no vote pending
const roundOf = (page) => page.evaluate(() => {
  const t = document.body.innerText, m = t.match(/Round (\d) of (\d)/);
  if (m) return [+m[1], +m[2]];
  return /I prefer [A-F]/.test(t) ? [0, 1] : null;
});

async function waitFor(page, pred, ms, label, shot) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await pred(); if (r) return r;
    await checkLimit(page, shot); await dismissModals(page); await sleep(2000);
  }
  throw new Error("timeout waiting for " + label);
}

// Results page → every distinct image (ranked) → WebP in the repo + meta (shared by generate() and --collect)
async function harvest(page, ctx, dir, votes) {
  const { set, it, SRC, META } = ctx;
  const all = await resultUrls(page, 0), seen = new Map();
  for (const u of all) if (!seen.has(stripTok(u))) seen.set(stripTok(u), u);
  const files = []; let rank = 0;
  for (const [, u] of seen) {
    const tmp = path.join(dir, `res_${rank + 1}.img`); download(u, tmp);
    const sc = await scoreImage(tmp, it.expected).catch(() => null);
    if (!sc || sc.w < 900) continue;                       // skip thumbnails / icons
    rank++;
    const out = path.join(SRC, `${it.key}_${rank}.webp`);
    const bytes = await toWebp(tmp, out);
    files.push({ file: `${it.key}_${rank}.webp`, rank, bytes, ...sc, source: stripTok(u).split("/").pop() });
  }
  if (!files.length) throw new Error("no result images found");
  const meta = { key: it.key, set: set.dir, prompt: promptWith(it), reference: REF ? path.relative(root, REF) : null, aspect: it.aspect || set.aspect, footprint: it.b ? [it.b.w, it.b.h] : null, project: page.url(), at: new Date().toISOString(), votes, files };
  fs.writeFileSync(path.join(META, it.key + ".json"), JSON.stringify(meta, null, 1) + "\n");
  log(it.key, "saved", files.length, "images,", Math.round(files.reduce((n, f) => n + f.bytes, 0) / 1024) + " KB");
  return meta;
}

// The CDP tunnel can drop during long waits: reconnect when the browser object is dead.
async function liveBrowser() {
  if (!browser || !browser.isConnected() || !browser.contexts().length) { log("reconnecting to browser…"); await browser?.close().catch(() => {}); browser = await withRetry(() => connect(), 4, "connect"); }
  // leftover bare home-page tabs (from interrupted attempts) pile up and make the next CDP handshake hang: close them
  for (const pg of browser.contexts()[0].pages()) if (/^https:\/\/www\.designarena\.ai\/?$/.test(pg.url())) await pg.close().catch(() => {});
  return browser;
}

async function generate(_unused, ctx) {
  const { set, it } = ctx;
  REF = refFor(set, it);
  const browser = await liveBrowser();
  const dir = path.join(WORK, it.key); fs.mkdirSync(dir, { recursive: true });
  const shot = path.join(dir, "limit.jpg");
  const page = await browser.contexts()[0].newPage();
  try {
    await page.setViewportSize({ width: 1200, height: 850 });
    const resumeUrl = inflight()[inflightKey(ctx)];
    if (resumeUrl) {                                         // continue the project that was already submitted
      log(it.key, "resuming", resumeUrl);
      await page.goto(resumeUrl, { waitUntil: "domcontentloaded", timeout: 60000 }); await page.waitForTimeout(4000); await dismissModals(page);
    } else {
    await page.goto("https://www.designarena.ai/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3500); await dismissModals(page);
    await page.getByRole("button", { name: "Image", exact: true }).first().click();
    await page.waitForTimeout(800);
    const ratio = it.aspect || set.aspect;                   // "Auto" is the aspect-ratio menu: 1:1 avoids letterboxed outputs
    if (ratio) { await page.getByRole("button", { name: /^Auto/ }).click(); await page.waitForTimeout(500); await page.getByText(ratio, { exact: true }).first().click(); await page.waitForTimeout(500); }
    if (REF) {                                               // small JPEG so the tunnel is not overloaded
      const buf = await toJpegSmall(REF, 768);
      await page.locator("input[type=file]").first().setInputFiles({ name: "reference.jpg", mimeType: "image/jpeg", buffer: buf });
      await page.waitForTimeout(5000);
    }
    const box = page.getByRole("textbox").first();
    await box.click(); await box.fill(promptWith(it));
    await page.getByRole("button", { name: "Submit prompt" }).click();
    log(it.key, "submitted");
    for (let i = 0; i < 30 && !/\/chat\//.test(page.url()); i++) await page.waitForTimeout(1000);
    if (/\/chat\//.test(page.url())) setInflight(inflightKey(ctx), page.url());
    }
    await waitFor(page, async () => (await roundOf(page)) || (await page.evaluate(RESULTS_PRED)) || null, 12 * 60000, "round 1", shot);
    const votes = [];
    for (let guard = 0; guard < 8; guard++) {
      const r = await roundOf(page); if (!r) break;
      const urls = await waitFor(page, async () => { const u = await resultUrls(page, 600); return u.length >= 2 ? u.slice(-2) : null; }, 180000, "round images", shot);
      await sleep(1500);
      const letters = await page.evaluate(() => [...document.body.innerText.matchAll(/^Option ([A-F])$/gm)].map((m) => m[1]).slice(0, 2));
      const sc = [];
      for (let i = 0; i < 2; i++) {
        const f = path.join(dir, `r${r[0]}_${letters[i]}.png`); download(urls[i], f);
        const s = await scoreImage(f, it.expected);
        if (set.kind === "art") s.score = +(fs.statSync(f).size / 1e6 - Math.abs(Math.log(s.w / s.h / it.expected)) * 2).toFixed(3); // detail, not letterboxed
        sc.push({ letter: letters[i], file: f, ...s });
      }
      const pick = sc[0].score >= sc[1].score ? sc[0] : sc[1];
      votes.push({ round: r[0], options: sc.map(({ letter, score, flat, asp, margin, areaFrac, w, h }) => ({ letter, score, flat, asp, margin, areaFrac, w, h })), chosen: pick.letter });
      log(it.key, `round ${r[0]}: ${sc.map((s) => s.letter + "=" + s.score).join(" ")} → ${pick.letter}`);
      const before = JSON.stringify(urls);
      await page.getByRole("button", { name: `I prefer ${pick.letter}` }).click();
      await waitFor(page, async () => {
        const rr = await roundOf(page), u = await resultUrls(page, 600);
        return (await page.evaluate(RESULTS_PRED)) || !rr || rr[0] !== r[0] || JSON.stringify(u.slice(-2)) !== before;
      }, 120000, "next round", shot);
      await page.waitForTimeout(2500); await dismissModals(page);
    }
    await waitFor(page, async () => page.evaluate(RESULTS_PRED), 120000, "results", shot);
    await dismissModals(page); await page.waitForTimeout(2500);
    const res = await harvest(page, ctx, dir, votes);
    setInflight(inflightKey(ctx), null);
    return res;
  } finally { await page.close().catch(() => {}); }
}

async function collect(_unused, ctx, url) {
  const browser = await liveBrowser();
  const dir = path.join(WORK, ctx.it.key); fs.mkdirSync(dir, { recursive: true });
  const page = await browser.contexts()[0].newPage();
  try {
    await page.setViewportSize({ width: 1200, height: 850 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }); await page.waitForTimeout(4000);
    await waitFor(page, async () => page.evaluate(RESULTS_PRED), 60000, "results", path.join(dir, "limit.jpg"));
    await dismissModals(page); await page.waitForTimeout(2500);
    return await harvest(page, ctx, dir, []);
  } finally { await page.close().catch(() => {}); }
}

function gitCommit(msg) {
  try {
    const g = (...a) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString();
    g("add", "-A", "assets/ai-src");
    if (!g("status", "--porcelain", "assets/ai-src").trim()) return;
    g("commit", "-q", "-m", `${msg}\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01TD8oH8D4dJEQ8TdDDWHkcv`);
    for (let i = 0; i < 4; i++) { try { g("push", "-q", "-u", "origin", "HEAD"); log("pushed:", msg); return; } catch (e) { execFileSync("sleep", [String(2 ** (i + 1))]); } }
  } catch (e) { log("git skipped:", String(e.message).split("\n")[0]); }
}

// Which reference image (if any) goes with this item. set.ref "first" = the first saved item of the set (made without one).
function refFor(set, it) {
  if (NO_REF) return null;
  if (CLI_REF) return CLI_REF;
  if (!set.ref) return null;
  if (set.ref === "first") { const f = set.items[0]; if (f.key === it.key) return null; const p = path.join(ctxFor(set, f).SRC, `${f.key}_1.webp`); return fs.existsSync(p) ? p : null; }
  const p = path.resolve(root, set.ref); return fs.existsSync(p) ? p : null;
}
const ctxFor = (set, it) => {
  const base = arg("out") ? path.resolve(root, arg("out")) : path.join(root, "assets/ai-src", set.dir);
  const META = path.join(base, "meta"); fs.mkdirSync(META, { recursive: true });
  return { set, it, SRC: base, META };
};
const isDone = (set, it) => fs.existsSync(path.join(ctxFor(set, it).META, it.key + ".json"));

let browser = await withRetry(() => connect(), 3);
setInterval(() => { browser?.version?.(); }, 15000).unref();   // CDP traffic keeps the tunnel websocket from idling out
if (arg("collect")) {                                         // --collect hut=<chat url>[,key=url]
  for (const kv of arg("collect").split(",")) {
    const [k, ...u] = kv.split("="); const sn = arg("set") || "buildings", set = SETS[sn], it = set.items.find((x) => x.key === k);
    await collect(browser, ctxFor(set, it), u.join("="));
  }
  await closeScorer(); await browser.close().catch(() => {}); process.exit(0);
}
let done = 0, sinceCommit = 0, fails = 0, pauses = 0, exitCode = 0;
outer: for (const sn of (arg("set") ? [arg("set")] : SET_ORDER)) {
  const set = SETS[sn]; if (!set) throw new Error("unknown set " + sn);
  for (const it of set.items) {
    if (only && !only.has(it.key)) continue;
    if (isDone(set, it)) continue;
    if (done >= MAX) break outer;
    try {
      await withRetry(() => generate(null, ctxFor(set, it)), 3, it.key);
      done++; sinceCommit++; fails = 0;
      if (COMMIT_EVERY && sinceCommit >= COMMIT_EVERY) { gitCommit(`AI art: ${sn} source images (${done} this run)`); sinceCommit = 0; }
    } catch (e) {
      if (e.name === "LimitError") { log("LIMIT:", e.message, e.shot || ""); exitCode = 3; break outer; }
      log(it.key, "FAILED:", String(e.message).split("\n")[0]);
      if (++fails >= 3) {                                     // tunnel/browser/network trouble: wait and reconnect instead of giving up
        if (++pauses > 36) { log("too many failures — stopping"); exitCode = 4; break outer; }
        log(`3 failures in a row — pausing 5 min (pause ${pauses}/36)`); await browser.close().catch(() => {}); await sleep(300000);
        try { browser = await withRetry(() => connect(), 3); fails = 0; } catch (e2) { log("reconnect failed:", e2.message.split("\n")[0]); }
      }
    }
  }
}
if (COMMIT_EVERY && sinceCommit) gitCommit(`AI art: source images (${done} this run)`);
await closeScorer(); await browser.close().catch(() => {});
const left = Object.entries(SETS).map(([n, s]) => `${n}:${s.items.filter((it) => !isDone(s, it)).length}`).join(" ");
log("done this run:", done, "| remaining", left);
process.exit(exitCode);
