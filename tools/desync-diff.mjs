// مقایسه آفلاین دامپ‌های ناهمگامی (0.231.0 — C-SRV-2).
//   node tools/desync-diff.mjs <dump1.jsonl> [dump2.jsonl] [--json]
// هر سطر ورودی یک گزارش mpDesync است (data/desync/<CODE>.jsonl یا بدنه پاسخ RPC).
import fs from "node:fs";
import { summarizeDump, timelineHash, diffDumps } from "./desync-lib.mjs";

function loadReps(p) {
  const reps = [];
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const o = JSON.parse(t);
    reps.push(o && o.data && typeof o.data === "object" ? o.data : o);
  }
  return reps;
}

const args = process.argv.slice(2).filter((a) => a !== "--json");
const asJson = process.argv.includes("--json");
if (args.length < 1 || args.length > 2) {
  console.error("usage: node tools/desync-diff.mjs <dump1.jsonl> [dump2.jsonl] [--json]");
  process.exit(2);
}
const repsA = loadReps(args[0]);
if (repsA.length === 0) { console.error("[desync-diff] empty dump: " + args[0]); process.exit(1); }
const byCode = (rs) => {
  const m = new Map();
  for (const r of rs) {
    const k = String(r.code);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};
const out = { files: args, codes: {} };
for (const [code, rs] of byCode(repsA)) {
  out.codes[code] = { reports: rs.length, timeline: timelineHash(rs), last: summarizeDump(rs[rs.length - 1]) };
}
if (args[1]) {
  const repsB = loadReps(args[1]);
  if (repsB.length === 0) { console.error("[desync-diff] empty dump: " + args[1]); process.exit(1); }
  const lastA = repsA[repsA.length - 1], lastB = repsB[repsB.length - 1];
  out.compare = { a: args[0], b: args[1], diff: diffDumps(lastA, lastB) };
}
if (asJson) {
  console.log(JSON.stringify(out));
  process.exit(0);
}
for (const code of Object.keys(out.codes)) {
  const c = out.codes[code];
  console.log(`[${code}] reports=${c.reports} firstDivergentTick=${c.timeline.firstDivergent}`);
  console.log(`  last: slot=${c.last.slot} tick=${c.last.tick} hash=${c.last.hash} entries=${c.last.n} base=${c.last.base} next=${c.last.next}`);
  for (const s of Object.keys(c.last.perSlot)) {
    const p = c.last.perSlot[s];
    console.log(`  slot ${s}: n=${p.n} tick=[${p.tickMin},${p.tickMax}] back=${p.tickBack} kinds=${Object.keys(p.kinds).join(",")}`);
  }
  if (c.last.anomalies.length) console.log(`  anomalies: ${c.last.anomalies.length} (first: ${JSON.stringify(c.last.anomalies[0])})`);
  else console.log("  anomalies: none");
}
if (out.compare) {
  const d = out.compare.diff;
  console.log(`[compare] A=${d.nA} B=${d.nB} common=${d.compared} onlyA=${d.onlyA} onlyB=${d.onlyB}`);
  console.log("[compare] firstDiff=" + (d.firstDiff ? JSON.stringify(d.firstDiff).slice(0, 300) : "none"));
}
