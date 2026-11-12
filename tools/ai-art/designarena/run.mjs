#!/usr/bin/env node
// Generate building art through DesignArena ("Image" type) in the user's browser, vote each of the 5 rounds with an
// automatic fit score, download every distinct result (ranked), store them in the repo as WebP, and stop cleanly on a limit.
//   DA_TUNNEL=https://<worker>.workers.dev DA_OTP=<token> node tools/ai-art/designarena/run.mjs [--keys hut,tower] [--max 5]
// Resumable: a building with assets/ai-src/buildings/meta/<key>.json is skipped.  Exit code 3 = limit reached (continue later).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILDINGS, promptFor, expectedAspect } from "../buildings.mjs";
import { connect, withRetry, checkLimit, dismissModals, resultUrls, download, LimitError } from "./lib.mjs";
import { scoreImage, toWebp, toJpegSmall, closeScorer } from "./score.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../../..");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i < 0 ? null : process.argv[i + 1]; };
// --out <dir> keeps experiments apart from the production set; --ref <image> attaches a style reference to every prompt
const SRC = arg("out") ? path.resolve(root, arg("out")) : path.join(root, "assets/ai-src/buildings"), META = path.join(SRC, "meta");
fs.mkdirSync(META, { recursive: true });
const REF = arg("ref") ? path.resolve(root, arg("ref")) : null;
const REF_SENTENCE = " Match the art style, palette, camera angle, lighting and level of detail of the attached reference image exactly; same hand-painted look, same outline weight.";
const promptWith = (b) => promptFor(b) + (REF ? REF_SENTENCE : "");
const only = arg("keys") ? new Set(arg("keys").split(",")) : null, MAX = +arg("max") || 1e9;
const WORK = path.join(os.tmpdir(), "da-work"); fs.mkdirSync(WORK, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripTok = (u) => u.split("?")[0];

async function waitFor(page, pred, ms, label, shot) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await pred(); if (r) return r;
    await checkLimit(page, shot); await dismissModals(page); await sleep(2000);
  }
  throw new Error("timeout waiting for " + label);
}
const roundOf = (page) => page.evaluate(() => { const m = document.body.innerText.match(/Round (\d) of (\d)/); return m ? [+m[1], +m[2]] : null; });

async function generate(browser, b) {
  const dir = path.join(WORK, b.key); fs.mkdirSync(dir, { recursive: true });
  const shot = path.join(dir, "limit.jpg");
  const page = await browser.contexts()[0].newPage();
  try {
    await page.setViewportSize({ width: 1200, height: 850 });
    await page.goto("https://www.designarena.ai/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3500); await dismissModals(page);
    await page.getByRole("button", { name: "Image", exact: true }).first().click();
    if (REF) {   // reference image: small JPEG so the tunnel is not overloaded
      const buf = await toJpegSmall(REF, 768);
      const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 20000 }), page.getByRole("button", { name: /Add photos and files/ }).click()]);
      await chooser.setFiles({ name: "reference.jpg", mimeType: "image/jpeg", buffer: buf });
      await page.waitForTimeout(5000);
    }
    const box = page.getByRole("textbox").first();
    await box.click(); await box.fill(promptWith(b));
    await page.getByRole("button", { name: "Submit prompt" }).click();
    log(b.key, "submitted");
    // generation can take minutes; Round UI appears when candidates are ready
    await waitFor(page, async () => (await roundOf(page)) || null, 12 * 60000, "round 1", shot);
    const votes = [], expected = expectedAspect(b);
    for (let guard = 0; guard < 8; guard++) {
      const r = await roundOf(page); if (!r) break;
      // two candidate images + the letters of the options, in left-to-right order
      const urls = await waitFor(page, async () => { const u = await resultUrls(page, 600); return u.length >= 2 ? u.slice(-2) : null; }, 180000, "round images", shot);
      await sleep(1500);
      const letters = await page.evaluate(() => [...document.body.innerText.matchAll(/^Option ([A-F])$/gm)].map((m) => m[1]).slice(0, 2));
      const sc = [];
      for (let i = 0; i < 2; i++) { const f = path.join(dir, `r${r[0]}_${letters[i]}.png`); download(urls[i], f); sc.push({ letter: letters[i], file: f, ...(await scoreImage(f, expected)) }); }
      const pick = sc[0].score >= sc[1].score ? sc[0] : sc[1];
      votes.push({ round: r[0], options: sc.map(({ letter, score, flat, asp, margin, areaFrac, w, h }) => ({ letter, score, flat, asp, margin, areaFrac, w, h })), chosen: pick.letter });
      log(b.key, `round ${r[0]}: ${sc.map((s) => s.letter + "=" + s.score).join(" ")} → ${pick.letter}`);
      const before = JSON.stringify(urls);
      await page.getByRole("button", { name: `I prefer ${pick.letter}` }).click();
      await waitFor(page, async () => {
        const rr = await roundOf(page), u = await resultUrls(page, 600);
        const done = await page.evaluate(() => /fresh designs|All set/i.test(document.body.innerText));
        return done || !rr || rr[0] !== r[0] || JSON.stringify(u.slice(-2)) !== before;
      }, 120000, "next round", shot);
      await page.waitForTimeout(2500); await dismissModals(page);
    }
    await waitFor(page, async () => page.evaluate(() => /fresh designs|All set/i.test(document.body.innerText)), 90000, "results", shot);
    await dismissModals(page); await page.waitForTimeout(2500);
    // every distinct result image on the results page, in display order (1st = best ranked)
    const all = await resultUrls(page, 0), seen = new Map();
    for (const u of all) if (!seen.has(stripTok(u))) seen.set(stripTok(u), u);
    fs.mkdirSync(SRC, { recursive: true });
    const files = []; let rank = 0;
    for (const [, u] of seen) {
      const tmp = path.join(dir, `res_${rank + 1}.img`); download(u, tmp);
      const sc = await scoreImage(tmp, expected).catch(() => null);
      if (!sc || sc.w < 900) continue;                       // skip thumbnails / icons
      rank++;
      const out = path.join(SRC, `${b.key}_${rank}.webp`);
      const bytes = await toWebp(tmp, out);
      files.push({ file: `${b.key}_${rank}.webp`, rank, bytes, ...sc, source: stripTok(u).split("/").pop() });
    }
    if (!files.length) throw new Error("no result images found");
    const meta = { key: b.key, prompt: promptWith(b), reference: REF ? path.relative(root, REF) : null, footprint: [b.w, b.h], height: b.height, project: page.url(), at: new Date().toISOString(), votes, files };
    fs.writeFileSync(path.join(META, b.key + ".json"), JSON.stringify(meta, null, 1) + "\n");
    log(b.key, "saved", files.length, "images,", Math.round(files.reduce((n, f) => n + f.bytes, 0) / 1024) + " KB");
    return meta;
  } finally { await page.close().catch(() => {}); }
}

let done = 0, fails = 0;
const browser = await withRetry(() => connect(), 3);
try {
  for (const b of BUILDINGS) {
    if (only && !only.has(b.key)) continue;
    if (fs.existsSync(path.join(META, b.key + ".json"))) continue;
    if (done >= MAX) break;
    try { await withRetry(() => generate(browser, b), 2); done++; fails = 0; }
    catch (e) {
      if (e.name === "LimitError") { log("LIMIT:", e.message, e.shot || ""); await closeScorer(); await browser.close().catch(() => {}); process.exit(3); }
      log(b.key, "FAILED:", String(e.message).split("\n")[0]); if (++fails >= 3) { log("3 failures in a row — stopping"); break; }
    }
  }
} finally { await closeScorer(); await browser.close().catch(() => {}); }
log("done this run:", done, "| remaining:", BUILDINGS.filter((b) => !fs.existsSync(path.join(META, b.key + ".json"))).length);
