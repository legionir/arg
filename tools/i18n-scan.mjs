// اسکن ایستای واژگان (0.233.0 — C-TST-1): هر ۴ فایل game/lang/*.js —
// کلید گمشده en، تکراری، ناهمخوانی placeholder. خروج غیرصفر در خطا (CI).
// اجرا: node src/arg/tools/i18n-scan.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanLangPair, I18N_ALLOW_EXTRA_EN } from "./i18n-scan-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const files = ["ui.js", "main.js", "game.js", "system.js"].map((f) => join(here, "..", "game", "lang", f));

// هر فایل هر دو زبان را دارد (ساختار {fa, en}) — یک فایل را به خودش می‌دهیم
// و scanLangPair بلوک‌های fa/en را جدا می‌کند.
let failed = false;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const r = scanLangPair(src, src, I18N_ALLOW_EXTRA_EN);
  const problems = [
    ...r.missEn.map((k) => "missEn " + k),
    ...r.extraEn.map((k) => "extraEn " + k),
    ...r.dups.map((k) => "dup " + k),
    ...r.phMiss.map((k) => "placeholders " + k),
  ];
  console.log(`${f.split("/").slice(-2).join("/")}: fa=${r.faCount} en=${r.enCount} ${problems.length ? "FAIL" : "ok"}`);
  for (const p of problems) { console.log("  - " + p); failed = true; }
}
process.exit(failed ? 1 : 0);
