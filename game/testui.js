// رابط کاربری آزمون خودکار (0.240.0 — C-CLN-18): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { runAllTests, runIdbTests } from "./tests.js";
import { probeCompat, compatBootable, liveEnv, SUPPORT_LINE } from "./compat.js";
import { t } from "./i18n.js";

function $(id) { return document.getElementById(id); }
export function paintCompat() {
    const probed = probeCompat(liveEnv());
    const el = $("compatEl");
    if (el) {
      el.innerHTML = t("main.compat.label") + " " +
        probed.map((r) => `${r.ok ? "✓" : "✗"} ${r.name}`).join(t("main.listSep")) +
        (compatBootable(probed) ? "" : ` — ${t("main.compat.missing")}`) +
        "<br>" + String(SUPPORT_LINE);
    }
  }

export function showTests(testBadge) {
    const results = runAllTests();
    paintTestResults(testBadge, results);
    console.log("[tests]", results);
    // فاز IDB ناهمگام است (0.55.0) — جدا می‌آید و بج را کامل می‌کند.
    runIdbTests().then((extra) => {
      paintTestResults(testBadge, results.concat(extra));
      console.log("[tests-idb]", extra);
    }).catch((e) => console.error("[tests-idb]", e)).finally(() => {
      document.body.dataset.testsDone = "1"; // سیگنال پایان فاز ناهمگام برای درایور/CI
    });
    return results;
  }

export function paintTestResults(testBadge, results) {
    const passed = results.filter((r) => r.pass).length;
    testBadge.hidden = false;
    testBadge.className = passed === results.length ? "pass" : "fail";
    testBadge.textContent = t("main.tests.badge", { passed, total: results.length }) + " — " +
      results.map((r) => `${r.pass ? "✓" : "✗"} ${r.name}`).join(t("main.listSep"));
  }
