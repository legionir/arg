// سخت‌سازی نمایشی (0.239.0 — C-CLN-14): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { BENCH_BUDGET, withinBudget, benchSim } from "../bench.js";
import { REGRESSIONS, EXPECTED_HASHES, runRegression, fuzzSaves, fuzzCmds } from "../regression.js";
import { COMPAT_ROWS, SUPPORT_LINE, probeCompat, compatBootable } from "../compat.js";
import { createRenderer } from "../render.js";
import { hireUnit } from "../combat.js";
import { tryPlace } from "../construction.js";
import { must, fresh, needBarracks, sim } from "./fixtures.js";

export function hardeningCases() {
  return [t_fidelity_levels, t_bench_budget, t_bench_determinism, t_regression_hashes,
    t_fuzz_saves, t_fuzz_cmds, t_compat_matrix];
}

// هر سه کیفیت باید بدون خطا یک قاب کامل بکشند + نامعتبر = full.
function t_fidelity_levels() {
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  tryPlace(state, terrain, W, H, 5, 5, CONFIG.BUILDINGS.tower);
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 8, "soldier");
  const cv = document.createElement("canvas");
  document.body.appendChild(cv);
  try {
    const R = createRenderer(cv);
    R.resize();
    R.fit();
    for (const f of ["full", "balanced", "lite"]) {
      R.setFidelity(f);
      must(R.getFidelity() === f, `کیفیت باید ${f} شود`);
      R.draw(state, terrain, null, null, []);
    }
    R.setFidelity("bogus");
    must(R.getFidelity() === "full", "نامعتبر = full");
  } finally {
    cv.remove();
  }
  return { name: "کیفیت سه‌وضعیتی", pass: true, detail: "رسم قاب در هر ۳ سطح" };
}

// داور بودجه خالص + دود بنچ واقعی (بودجه گشاد تا گوشی ضعیف قرمز نشود).
function t_bench_budget() {
  must(withinBudget({ ticks: 600, ms: 60 }), "۶۰۰ تیک در ۶۰ms باید در بودجه باشد");
  must(!withinBudget({ ticks: 600, ms: 60000 }), "۶۰۰ تیک در ۶۰ ثانیه باید خارج بودجه باشد");
  must(!withinBudget({ ticks: 0, ms: 0 }), "نمونه تهی نامعتبر است");
  must(BENCH_BUDGET.tickMs === 3 && BENCH_BUDGET.ticksPerSec === 300, "بودجه: ۳ms/تیک و ۳۰۰ تیک/ثانیه");
  const s = benchSim(CONFIG.MAP_SEED, 60);
  must(s.ticks === 60 && s.ms >= 0 && typeof s.hash === "string", "بنچ باید عدد + هش بدهد");
  must(withinBudget(s), `بنچ واقعی باید در بودجه باشد (${s.tickMs.toFixed(3)}ms/تیک)`);
  return { name: "بنچمارک و بودجه", pass: true, detail: `${s.tickMs.toFixed(3)}ms/تیک` };
}

function t_bench_determinism() {
  const a = benchSim(CONFIG.MAP_SEED, 60);
  const b = benchSim(CONFIG.MAP_SEED, 60);
  must(a.hash === b.hash, "بنچ هم‌سید باید هش یکسان بدهد");
  const c = benchSim(987654, 60);
  must(c.hash !== a.hash, "سید متفاوت باید دنیای متفاوت بسازد");
  return { name: "قطعیت بنچمارک", pass: true, detail: a.hash.slice(0, 8) };
}
// ۸ سناریو: هش پین‌شده + قطعیت دوباره‌اجرا.
function t_regression_hashes() {
  must(REGRESSIONS.length === 8, `باید ۸ سناریو باشد، هست ${REGRESSIONS.length}`);
  const first = runRegression();
  must(first.length === 8, "هر ۸ باید اجرا شوند");
  for (const r of first) {
    must(EXPECTED_HASHES[r.key] !== undefined, `هش پین‌شده ${r.key} باید ثبت باشد`);
    must(r.hash === EXPECTED_HASHES[r.key], `هش ${r.key} عوض شده: ${r.hash} ≠ ${EXPECTED_HASHES[r.key]}`);
  }
  const second = runRegression();
  for (let i = 0; i < first.length; i++) {
    must(second[i].hash === first[i].hash, `دوباره‌اجرای ${first[i].key} باید یکسان باشد`);
  }
  return { name: "رگرسیون ۸ هش", pass: true, detail: "پین + قطعیت هر ۸" };
}

// ۲۰۰ سند جهش‌یافته سیددار: فقط SaveError، هرگز throw خام.
function t_fuzz_saves() {
  const r = fuzzSaves(200, 1234);
  must(r.ran === 200, "باید ۲۰۰ اجرا شود");
  must(r.unexpected.length === 0, `throw خام نباید باشد: ${r.unexpected.join("; ")}`);
  return { name: "فاز ذخیره", pass: true, detail: `${r.saveErrors} رد تمیز + ${r.passed} تحمل` };
}

// ۳۰۰ فرمان خصمانه: sim نباید throw بدهد (رد/نادیده = درست).
function t_fuzz_cmds() {
  const r = fuzzCmds(300, 5678);
  must(r.ran === 300, "باید ۳۰۰ اجرا شود");
  must(r.simThrow === null, `sim نباید throw بدهد: ${r.simThrow}`);
  return { name: "فاز فرمان", pass: true, detail: `${r.enqueued} صف + ${r.rejected} رد` };
}

// ماتریس سازگاری روی envهای قلابی: کامل/تهی/جزئی + قانون بوت.
function t_compat_matrix() {
  must(COMPAT_ROWS.length === 8, `باید ۸ سطر باشد، هست ${COMPAT_ROWS.length}`);
  const full = {};
  for (const row of COMPAT_ROWS) full[row.key] = true;
  const pf = probeCompat(full);
  must(pf.every((r) => r.ok) && compatBootable(pf), "env کامل = بوت");
  const pe = probeCompat({});
  must(pe.every((r) => !r.ok) && !compatBootable(pe), "env تهی = نبوت");
  const partial = { canvas: true, localStorage: true, audio: true };
  const pp = probeCompat(partial);
  must(compatBootable(pp), "requiredها کافی‌اند = بوت");
  must(!probeCompat({ indexedDB: true }).find((r) => r.key === "canvas").ok, "کلید غایب = false");
  const noOpt = { canvas: true, localStorage: true };
  must(compatBootable(probeCompat(noOpt)), "اختیاری‌ها لازم نیستند");
  must(SUPPORT_LINE.indexOf("Chrome") >= 0 && SUPPORT_LINE.indexOf("Firefox") >= 0, "خط پشتیبانی: Chrome و Firefox");
  must(SUPPORT_LINE.indexOf("Safari") >= 0, "خط پشتیبانی: وضعیت Safari/iOS روشن است");
  return { name: "ماتریس سازگاری", pass: true, detail: "کامل/تهی/جزئی + بوت" };
}