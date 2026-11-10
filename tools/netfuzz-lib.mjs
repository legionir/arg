// فازینگ شبکه lockstep (0.234.0 — C-TST-6) — خالص، بدون import، بدون DOM.
// مدل تحویل پیام‌های seqدار (همان معنای onInput/mpDrain در main.js):
// پیام‌ها {seq,...}‌اند؛ تحویل = فهرست رویداد {msg, at} (at = گام تحویل).
// پروفایل‌ها: dropP (گم‌شدن)، dupP (تکرار همان seq)، reorderWindow (جابه‌جایی
// در پنجره)، delayMax (تأخیر گام). قطعی با seed (mulberry32 محلی).
// findGaps: seqهای گمشده ۱..max را از روی تحویل‌شده‌ها گزارش می‌دهد
// (آینه تشخیص stall کلاینت: mpNextSeq گیرکرده).
export function netfuzzPRNG(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const NETFUZZ_DEFAULTS = {
  seed: 77031,
  dropP: 0,
  dupP: 0,
  reorderWindow: 0,
  delayMax: 0,
};

// msgs: آرایه {seq,...} با seqهای ۱..N (ترتیب سرور). خروجی: [{msg, at}] که at
// شماره گام تحویل است (۰..). تحویلِ یک msg ممکن است چند at داشته باشد (dup)
// یا هیچ (drop). ترتیب atها صعودی است مگر reorderWindow>۰ که جابه‌جایی
// در همان پنجره اعمال می‌کند.
export function fuzzSchedule(msgs, opt) {
  const o = Object.assign({}, NETFUZZ_DEFAULTS, opt || {});
  const rnd = netfuzzPRNG(o.seed >>> 0);
  const evs = [];
  for (const m of msgs) {
    if (rnd() < o.dropP) continue;
    const at = o.delayMax > 0 ? (rnd() * (o.delayMax + 1)) | 0 : 0;
    evs.push({ msg: m, at });
    if (rnd() < o.dupP) {
      evs.push({ msg: m, at: at + (o.delayMax > 0 ? (rnd() * (o.delayMax + 1)) | 0 : 0) });
    }
  }
  evs.sort((a, b) => a.at - b.at);
  if (o.reorderWindow > 1) {
    const w = o.reorderWindow | 0;
    for (let i = 0; i < evs.length; i += w) {
      const chunk = evs.slice(i, i + w);
      for (let j = chunk.length - 1; j > 0; j--) {
        const k = (rnd() * (j + 1)) | 0;
        const t = chunk[j]; chunk[j] = chunk[k]; chunk[k] = t;
      }
      for (let j = 0; j < chunk.length; j++) evs[i + j] = chunk[j];
    }
  }
  return evs;
}

// seqهای تحویل‌شده (به هر ترتیب، با تکرار) → seqهای گمشده ۱..max.
export function findGaps(deliveredSeqs) {
  const seen = new Set(deliveredSeqs);
  let max = 0;
  for (const s of seen) if (s > max) max = s;
  const gaps = [];
  for (let s = 1; s <= max; s++) if (!seen.has(s)) gaps.push(s);
  return gaps;
}

// شمارش تکرارهای همان seq در تحویل (dup باید >۰ باشد تا این معنادار شود).
export function countDups(deliveredSeqs) {
  const seen = new Set();
  let dups = 0;
  for (const s of deliveredSeqs) {
    if (seen.has(s)) dups++;
    else seen.add(s);
  }
  return dups;
}
