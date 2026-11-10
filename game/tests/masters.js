// تالار استادان (0.241.0 — C-CLN-19): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import {
  MASTERS_KEY, MASTERS_CAP, MASTERS_SORTS, masterScore, masterEntry,
  mastersAdd, mastersDelete, mastersSort, mastersLoad, mastersSave,
} from "../masters.js";
import { must } from "./fixtures.js";
function t_masters() {
  must(masterScore("victory", 0) === 1600, "برد آنی = ۱۰۰۰+۶۰۰");
  must(masterScore("victory", 600) === 1000, "برد ۶۰۰ثانیه‌ای = کف ۱۰۰۰");
  must(masterScore("victory", 100000) === 1000, "برد خیلی دیر هم ۱۰۰۰ می‌ماند");
  must(masterScore("defeat", 0) === 400, "باخت آنی = ۴۰۰");
  must(masterScore("defeat", 400) === 0, "باخت ۴۰۰ثانیه‌ای = صفر");
  must(masterScore("defeat", -5) === 400, "منفی امن است");
  must(masterScore("bogus", 10) === 390, "نامعتبر = باخت");
  const e = masterEntry({ seed: 7, map: "آزمون", outcome: "victory", ticks: 600, date: "2026-01-01T00:00:00.000Z" });
  must(e.secs === 60 && e.score === 1540 && e.map === "آزمون" && e.id.length > 3, "رکورد: ثانیه/امتیاز/نام/شناسه");
  const e2 = masterEntry({ seed: 0, ticks: 0, outcome: "x" });
  must(e2.map === "seed:0" && e2.outcome === "defeat" && e2.score === 400, "پیش‌فرض‌ها: نام سیدی + باخت");
  // سقف ۲۵۰: تازه اول، قدیمی‌ترِ مازاد می‌افتد.
  let list = [];
  for (let i = 0; i < 251; i++) list = mastersAdd(list, masterEntry({ seed: i, ticks: i, outcome: "defeat" }));
  must(list.length === 250, "سقف ۲۵۰ می‌ماند");
  must(list[0].seed === 250 && list[249].seed === 1, "تازه اول، قدیمی‌تر افتاده");
  must(mastersAdd(list, null).length === 250, "تهی اضافه نمی‌شود");
  // حذف.
  const gone = mastersDelete(list, list[5].id);
  must(gone.length === 249 && list.length === 250, "حذف یکی + بی‌جهشی ورودی");
  must(mastersDelete(list, "nope").length === 250, "ناشناس = بی‌اثر");
  // سورت ۴ کلید دفترچه.
  const rows = [
    masterEntry({ seed: 1, map: "ب", outcome: "defeat", ticks: 100, date: "2026-01-02T00:00:00.000Z" }),
    masterEntry({ seed: 2, map: "الف", outcome: "victory", ticks: 100, date: "2026-01-01T00:00:00.000Z" }),
  ];
  let s = mastersSort(rows, "score", -1);
  must(s[0].outcome === "victory", "امتیاز نزولی: برد اول");
  s = mastersSort(rows, "name", 1);
  must(s[0].map === "الف", "نام صعودی");
  s = mastersSort(rows, "secs", -1);
  must(s.length === 2 && s[0].id <= s[1].id, "زمان نزولی پایدار است");
  s = mastersSort(rows, "date", 1);
  must(s[0].seed === 2, "تاریخ صعودی");
  s = mastersSort(rows, "bogus", -1);
  must(s[0].outcome === "victory", "کلید نامعتبر = امتیاز");
  must(mastersSort(null, "score", -1).length === 0, "تهی امن است");
  return { name: "استادان نبرد", pass: true, detail: "امتیاز + سقف + سورت + حذف" };
}

function t_masters_store() {
  if (typeof localStorage === "undefined") return { name: "ماندگاری استادان", pass: true, detail: "بی‌ذخیره رد شد" };
  const KEY = MASTERS_KEY;
  let backup = null;
  try { backup = localStorage.getItem(KEY); } catch (e) { backup = null; }
  try {
    const rows = [masterEntry({ seed: 11, map: "م", outcome: "victory", ticks: 50, date: "2026-03-01T00:00:00.000Z" })];
    must(mastersSave(rows) === true, "ذخیره موفق");
    const back = mastersLoad();
    must(back.length === 1 && back[0].seed === 11 && back[0].score === rows[0].score, "بارگذاری همان است");
    localStorage.setItem(KEY, "خراب{");
    must(mastersLoad().length === 0, "خراب = تهی");
    localStorage.setItem(KEY, JSON.stringify([{ nope: 1 }, null, "x", 5]));
    must(mastersLoad().length === 0, "ناسازگار = تهی");
    localStorage.setItem(KEY, JSON.stringify([...rows, { outcome: "victory", ticks: 1, secs: 0, score: 1, map: "x", date: "d", id: "i" }]));
    must(mastersLoad().length === 2, "مخلوط سالم/ناسالم: فقط سالم");
    return { name: "ماندگاری استادان", pass: true, detail: "رفت‌وبرگشت + خراب + پالایش" };
  } finally {
    try {
      if (backup == null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, backup);
    } catch (e) {}
  }
}

function t_masters_ui() {
  must(MASTERS_SORTS.join(",") === "score,name,secs,date", "۴ سورت دفترچه");
  must(MASTERS_CAP === 250, "سقف ۲۵۰ دفترچه");
  if (typeof document === "undefined") return { name: "ساختار استادان", pass: true, detail: "بدون DOM رد شد" };
  must(!!document.querySelector('.menu-page[data-page="masters"]'), "صفحه استادان در منو هست");
  must(!!document.querySelector('[data-go="masters"]'), "دکمه ناوبری استادان هست");
  const btns = [...document.querySelectorAll("#mastersSort [data-msort]")];
  must(btns.length === 4, "۴ دکمه سورت هست");
  for (const k of MASTERS_SORTS) must(btns.some((b) => b.dataset.msort === k), "سورت " + k + " هست");
  must(!!document.getElementById("mastersList"), "فهرست استادان هست");
  return { name: "ساختار استادان", pass: true, detail: "صفحه + ناوبری + سورت‌ها" };
}

export function mastersCases() {
  return [t_masters, t_masters_store, t_masters_ui];
}
