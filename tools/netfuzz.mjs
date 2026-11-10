#!/usr/bin/env node
// CLI فازینگ شبکه (0.234.0 — C-TST-6): اجرای نمایشی زمان‌بندی تحویل روی
// seqهای ۱..N و چاپ آمار (تحویل/گم/تکرار/شکاف). بدون وابستگی اجرایی.
//   node tools/netfuzz.mjs [N] [seed] [dropP] [dupP] [reorderWindow] [delayMax]
import { fuzzSchedule, findGaps, countDups } from "./netfuzz-lib.mjs";
const A = process.argv.slice(2);
const N = +(A[0] || 40);
const opt = {
  seed: +(A[1] || 77031),
  dropP: +(A[2] || 0.1),
  dupP: +(A[3] || 0.2),
  reorderWindow: +(A[4] || 4),
  delayMax: +(A[5] || 3),
};
const msgs = [];
for (let s = 1; s <= N; s++) msgs.push({ seq: s });
const evs = fuzzSchedule(msgs, opt);
const got = evs.map((e) => e.msg.seq);
console.log("sent=" + N + " delivered=" + got.length + " dups=" + countDups(got) + " gaps=" + JSON.stringify(findGaps(got)));
