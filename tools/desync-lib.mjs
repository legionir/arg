// تحلیل آفلاین دامپ‌های ناهمگامی (0.231.0 — C-SRV-2). خالص، بدون ایمپورت:
// هم در Node (desync-diff.mjs) و هم در هارنس مرورگری (execute_js) یکسان اجرا می‌شود.
// ورودی‌ها همان بدنه {ok:true,data:rep} پاسخ mpDesync یا سطرهای data/desync/*.jsonl هستند.

// سلامت پنجره لاگ: ترتیب seq + پسرفت تیک هر اسلات (آستانه MP_TICK_SLACK=100).
export function checkLogWindow(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const anomalies = [];
  const perSlot = {};
  let prevSeq = -1;
  for (const e of list) {
    if (typeof e.seq !== "number" || e.seq <= prevSeq) anomalies.push({ type: "seq", seq: e.seq });
    if (typeof e.seq === "number" && e.seq > prevSeq) prevSeq = e.seq;
    const k = String(e.slot);
    const st = perSlot[k] || (perSlot[k] = { n: 0, tickMin: e.tick, tickMax: e.tick, tickBack: 0, kinds: {} });
    st.n++;
    if (typeof e.tick === "number") {
      if (e.tick < st.tickMax - 100) {
        st.tickBack++;
        anomalies.push({ type: "tickBack", seq: e.seq, slot: e.slot, tick: e.tick });
      }
      if (e.tick < st.tickMin) st.tickMin = e.tick;
      if (e.tick > st.tickMax) st.tickMax = e.tick;
    }
    st.kinds[e.kind] = (st.kinds[e.kind] || 0) + 1;
  }
  return { n: list.length, perSlot, anomalies };
}

export function summarizeDump(rep) {
  const r = rep && typeof rep === "object" ? rep : {};
  const w = checkLogWindow(r.entries);
  return {
    code: r.code, slot: r.slot, tick: r.tick, hash: r.hash, at: r.at,
    base: r.base, next: r.next, n: w.n, perSlot: w.perSlot, anomalies: w.anomalies,
  };
}

// خط‌زمانی هش گزارش‌ها: نخستین تیکِ با هش ناهمسان میان گزارشگران.
export function timelineHash(reports) {
  const byTick = {};
  for (const r of Array.isArray(reports) ? reports : []) {
    const k = String(r.tick);
    (byTick[k] || (byTick[k] = [])).push({ slot: r.slot, hash: r.hash });
  }
  const ticks = Object.keys(byTick).map(Number).sort((a, b) => a - b);
  let firstDivergent = -1;
  for (const t of ticks) {
    if (new Set(byTick[String(t)].map((x) => x.hash)).size > 1) { firstDivergent = t; break; }
  }
  return { ticks, byTick, firstDivergent };
}

// مقایسه دو دامپ بر پایه seq: نخستین واگرایی + شمارش یک‌طرفه‌ها.
export function diffDumps(a, b) {
  const ea = (a && Array.isArray(a.entries) ? a.entries : []);
  const eb = (b && Array.isArray(b.entries) ? b.entries : []);
  const mb = new Map(eb.map((e) => [e.seq, e]));
  let firstDiff = null, onlyA = 0, n = 0;
  for (const e of ea) {
    const o = mb.get(e.seq);
    if (!o) {
      onlyA++;
      if (!firstDiff) firstDiff = { seq: e.seq, why: "missing-in-b" };
      continue;
    }
    n++;
    const sa = JSON.stringify([e.slot, e.kind, e.tick, e.args]);
    const sb = JSON.stringify([o.slot, o.kind, o.tick, o.args]);
    if (sa !== sb && !firstDiff) firstDiff = { seq: e.seq, why: "fields", a: e, b: o };
  }
  const ma = new Set(ea.map((e) => e.seq));
  let onlyB = 0;
  for (const e of eb) if (!ma.has(e.seq)) onlyB++;
  return { nA: ea.length, nB: eb.length, compared: n, onlyA, onlyB, firstDiff };
}
