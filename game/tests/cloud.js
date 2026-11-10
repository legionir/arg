// ذخیره ابری (0.241.0 — C-CLN-20): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import {
  CLOUD_KEY_MIN, CLOUD_KEY_MAX, CLOUD_DATA_MAX, CLOUD_FA, cloudKeyHash, validCloudKey,
} from "../cloud.js";
import { must } from "./fixtures.js";

export function cloudCases() {
  return [t_cloud_key, t_cloud_guards];
}
function t_cloud_key() {
  must(cloudKeyHash("") === "811c9dc5", "بردار تهی FNV-1a باید 811c9dc5 باشد");
  const a = cloudKeyHash("قلعه من ۱۲۳");
  must(/^[0-9a-f]{8}$/.test(a), `هش باید ۸ هگز باشد، شد ${a}`);
  must(cloudKeyHash("قلعه من ۱۲۳") === a, "هش باید قطعی باشد");
  must(cloudKeyHash("قلعه من ۱۲۴") !== a, "عبارت متفاوت باید هش متفاوت بدهد");
  must(validCloudKey("abcd") && validCloudKey("  abcde  "), "مرز ۴ با حاشیه");
  must(validCloudKey("x".repeat(32)) && !validCloudKey("x".repeat(33)), "سقف ۳۲");
  must(!validCloudKey("abc") && !validCloudKey("") && !validCloudKey(null), "کوتاه/تهی رد");
  return { name: "کلید ابری", pass: true, detail: `هش ${a} + مرزهای ۴/۳۲` };
}

function t_cloud_guards() {
  must(CLOUD_KEY_MIN === 4 && CLOUD_KEY_MAX === 32, "ثابت‌های مرز عبارت");
  must(CLOUD_DATA_MAX === 32768, "سقف داده آینه سرور");
  for (const k of ["BAD_KEY", "TOO_BIG", "EMPTY", "FULL", "OFFLINE", "SLOW"]) {
    must(typeof CLOUD_FA[k] === "string" && CLOUD_FA[k].length > 0, `پیام ${k}`);
  }
  for (const k of ["slow", "bad", "key", "big", "full", "empty"]) {
    must(typeof CLOUD_FA[k] === "string" && CLOUD_FA[k].length > 0, `کد سرور ${k}`);
  }
  return { name: "نگهبان‌های ابری", pass: true, detail: "مرزها + پیام‌های فارسی" };
}
