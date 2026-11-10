// سوئیت سرور (0.236.0 — C-CLN-4): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { must, srvMake, srvRoom, srvInp, srvCode } from "./fixtures.js";
import { zipStore, zipParse, crc32 } from "../../tools/zip-store-lib.mjs";
import { desyncReportOf } from "../lobby.js";

function t_srv_mirror() {
  const blocks = document.querySelectorAll('script[type="text/x-server-plugin"]');
  must(blocks.length === 1, "دقیقاً یک بلوک سرور");
  const code = srvCode();
  for (const k of ["mpDesync", "mpArgsOk", "MP_TICK_SLACK", "mpDesyncRing", "rally: 1, disband: 1"]) must(code.includes(k), "نشانه " + k);
  const num = (n) => { const m = code.match(new RegExp("var " + n + " = (\\d+);")); must(!!m, "ثابت " + n); return parseInt(m[1], 10); };
  must(num("OFF_LOG") + num("ROOMS_MAX") * num("LOG_CAP") === 17833432, "ریاضی بافر = STATE_SIZE");
  new Function("state", "pubsub", "self", code);
  return { name: "آینه سرور (C-SRV-3)", pass: true, detail: "تک‌بلوک + کامپایل + بافر" };
}
function t_srv_input_kinds() {
  const s = srvMake(), r = srvRoom(s);
  const good = { place: { type: "wall", c: 1, r: 2 }, hire: { type: "bowman", c: 1, r: 2 },
    rally: { type: "bowman", c: 1, r: 2 }, order: { ids: [1, 2], kind: "attackmove", c: 3, r: 4, queue: true },
    retreat: { ids: [1] }, deploy: { ids: [1] }, resupply: { ids: [1] }, disband: { ids: [1] },
    firecow: { ids: [1], c: 1, r: 1 }, stance: { ids: [1], stance: "hold" },
    guard: { ids: [1], bld: 5 }, garrison: { ids: [1], bld: 5 }, gate: { bld: 5 },
    demolish: { bld: 5 }, repair: { bld: 5 }, release: { bld: 5 }, trainCancel: { bld: 5, idx: 0 },
    trade: { res: "wood", dir: "buy" }, tax: { v: "x" }, rations: { v: "x" }, food: { v: "x" },
    alarm: { c: 1, r: 1 }, hash: { h: "ab12cd34" }, undo: {} };
  const kinds = Object.keys(good);
  must(kinds.length === 24, "هر ۲۴ kind پوشش");
  let tick = 100;
  for (const k of kinds) {
    const res = srvInp(s, r.a, r.code, k, good[k], tick++);
    must(res.ok, "قبول " + k);
  }
  const bad = srvInp(s, r.a, r.code, "nuke", {}, tick);
  must(!bad.ok && bad.err === "kind", "ناشناخته رد");
  return { name: "kindهای ورودی (C-SRV-1)", pass: true, detail: "۲۴ قبول + rally/disband + ۱ رد" };
}
function t_srv_input_args() {
  const s = srvMake(), r = srvRoom(s);
  const bads = [
    ["place", { type: "wall", c: "1", r: 2 }], ["order", { ids: [], c: 1, r: 1 }],
    ["order", { ids: [1.5], c: 1, r: 1 }], ["stance", { ids: [1], stance: "attack" }],
    ["trade", { res: "wood", dir: "swap" }], ["tax", { v: 3 }], ["gate", { bld: "5" }],
    ["hash", { h: 123 }], ["order", { ids: [1], c: 1, r: 1, queue: "yes" }],
    ["rally", { c: 1, r: 1 }], ["disband", { ids: "1" }], ["alarm", { c: 1 }]];
  let tick = 200;
  for (const [k, a] of bads) {
    const res = srvInp(s, r.a, r.code, k, a, tick++);
    must(!res.ok && res.err === "args", "رد شکل " + k);
  }
  return { name: "اسکیمای ورودی (C-SRV-1)", pass: true, detail: bads.length + " شکل بد رد" };
}
function t_srv_input_tick() {
  const s = srvMake(), r = srvRoom(s);
  const h = (tick) => srvInp(s, r.a, r.code, "hash", { h: "x" }, tick);
  must(h(500).ok, "۵۰۰ قبول");
  must(h(500).ok, "مساوی قبول");
  must(h(450).ok, "تلورانس ۱۰۰ قبول");
  const old = h(399);
  must(!old.ok && old.err === "old", "پسرفت فراتر رد");
  must(h(600).ok, "پس از رد، جلوتر قبول");
  return { name: "پنجره تیک (C-SRV-1)", pass: true, detail: "مساوی/تلورانس + old + تداوم" };
}
function t_srv_input_rate() {
  const s = srvMake(), r = srvRoom(s);
  let tick = 1000, ok = 0;
  for (let i = 0; i < 25; i++) { must(srvInp(s, r.a, r.code, "hash", { h: "x" }, tick++).ok, "سهم A"); ok++; }
  s.self.onclose({ conn: r.a });
  const b2 = s.mkConn();
  const rj = s.call(b2, "mpRejoin", { code: r.code, slot: 0, token: r.tokenA });
  must(rj.ok, "اتصال‌مجدد همان اسلات");
  for (let i = 0; i < 15; i++) { must(srvInp(s, b2, r.code, "hash", { h: "x" }, tick++).ok, "سهم B"); ok++; }
  must(ok === 40, "۴۰ ورودی نشست");
  const over = srvInp(s, b2, r.code, "hash", { h: "x" }, tick);
  must(!over.ok && over.err === "slow", "۴۱می slow اسلات (نه اتصال: B فقط ۱۶ فرستاد)");
  return { name: "سقف اسلات (C-SRV-1)", pass: true, detail: "۴۰ نشست + ۴۱می رد پس از rejoin" };
}
function t_srv_desync_report() {
  const s = srvMake(), r = srvRoom(s);
  srvInp(s, r.a, r.code, "place", { type: "wall", c: 1, r: 2 }, 100);
  srvInp(s, r.a, r.code, "hash", { h: "aa" }, 101);
  const rep = s.call(r.a, "mpDesync", { code: r.code, tick: 600, hash: "deadbeef" });
  must(rep.ok, "گزارش نشست");
  must(rep.data.slot === 0 && rep.data.tick === 600 && rep.data.hash === "deadbeef", "میدان‌ها");
  must(rep.data.base === 1 && rep.data.next === 3 && rep.data.entries.length === 2, "پنجره لاگ");
  must(rep.data.entries[0].kind === "place" && rep.data.entries[1].kind === "hash", "ترتیب seq");
  const badT = s.call(r.b, "mpDesync", { code: r.code, tick: -5, hash: "x" });
  must(!badT.ok && badT.err === "tick", "تیک بد رد");
  return { name: "گزارش desync (C-SRV-2)", pass: true, detail: "پذیرش + پنجره ۲تایی + رد تیک" };
}
function t_srv_desync_rate() {
  const s = srvMake(), r = srvRoom(s);
  must(s.call(r.a, "mpDesync", { code: r.code, tick: 10, hash: "h1" }).ok, "اول نشست");
  const fast = s.call(r.a, "mpDesync", { code: r.code, tick: 11, hash: "h2" });
  must(!fast.ok && fast.err === "slow", "دومِ همان اتصال slow");
  const w = s.mkConn();
  must(s.call(w, "mpWatch", { code: r.code }).ok, "تماشا");
  must(s.call(w, "mpDesync", { code: r.code, tick: 12, hash: "h3" }).ok, "تماشاگر هم گزارش می‌دهد");
  const c2 = s.mkConn(), d2 = s.mkConn();
  const cr = s.call(c2, "mpCreate", { name: "پ", max: 2 });
  must(cr.ok, "اتاق دوم");
  must(s.call(d2, "mpJoin", { code: cr.data.code, name: "ت" }).ok, "پیوستن دوم");
  const pre = s.call(c2, "mpDesync", { code: cr.data.code, tick: 1, hash: "h" });
  must(!pre.ok && pre.err === "nostart", "پیش‌شروع رد");
  return { name: "سقف desync (C-SRV-2)", pass: true, detail: "slow + تماشاگر + nostart" };
}
// سقف بازی جاری (0.232.0 — C-SRV-5): ۲۴ جاری + ۲۵می full + آزادی پس از finish.
function t_srv_livecap() {
  const s = srvMake(), rooms = [];
  for (let i = 0; i < 24; i++) {
    const a = s.mkConn(), b = s.mkConn();
    const r1 = s.call(a, "mpCreate", { name: "P" + i, max: 2 });
    must(r1.ok, "ساخت " + i);
    const code = r1.data.code;
    must(s.call(b, "mpJoin", { code, name: "Q" + i }).ok, "پیوستن " + i);
    must(s.call(a, "mpReady", { code, ready: true }).ok, "آماده A" + i);
    must(s.call(b, "mpReady", { code, ready: true }).ok, "آماده B" + i);
    must(s.call(a, "mpStart", { code }).ok, "شروع " + i);
    rooms.push({ a, code });
  }
  const c = s.mkConn(), d = s.mkConn();
  const r25 = s.call(c, "mpCreate", { name: "R", max: 2 });
  must(r25.ok, "ساخت ۲۵می (لابی)");
  const code25 = r25.data.code;
  must(s.call(d, "mpJoin", { code: code25, name: "S" }).ok, "پیوستن ۲۵");
  must(s.call(c, "mpReady", { code: code25, ready: true }).ok, "آماده ۲۵");
  must(s.call(d, "mpReady", { code: code25, ready: true }).ok, "آماده ۲۵");
  must(!s.call(c, "mpStart", { code: code25 }).ok, "۲۵می رد");
  must(s.call(c, "mpStart", { code: code25 }).err === "full", "خطا full است");
  must(s.call(rooms[0].a, "mpFinish", { code: rooms[0].code, winner: 0 }).ok, "پایان اتاق اول");
  must(s.call(c, "mpStart", { code: code25 }).ok, "پس از finish جا هست");
  return { name: "سقف بازی جاری (C-SRV-5)", pass: true, detail: "۲۴ جاری + ۲۵می full + آزادی" };
}
// گزارش کلاینت (0.232.0 — C-SRV-6): اعتبارسنجی خالص بدنه گزارش.
function t_srv_client_report() {
  const good = desyncReportOf("AB12", 600, "deadbeef");
  must(!!good && good.code === "AB12" && good.tick === 600 && good.hash === "deadbeef", "سالم می‌گذرد");
  const bads = [desyncReportOf("ABC", 1, "h"), desyncReportOf("AB12", -1, "h"), desyncReportOf("AB12", 1.5, "h"), desyncReportOf("AB12", 1, ""), desyncReportOf("AB12", 1, "x".repeat(65)), desyncReportOf(null, 1, "h")];
  for (const x of bads) must(x === null, "نامعتبر null است");
  return { name: "گزارش کلاینت (C-SRV-6)", pass: true, detail: "۱ سالم + ۶ نامعتبر" };
}
// باندل ZIP (0.232.0 — C-SRV-4): round-trip + CRC + رد نام بد + بردار استاندارد.
function t_srv_bundle() {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const files = [
    { name: "index.html", data: enc.encode("<html>سلام</html>") },
    { name: "game/main.js", data: enc.encode("export {};") },
    { name: "d/bin.bin", data: new Uint8Array([0, 1, 2, 250, 255]) },
  ];
  const z = zipStore(files);
  must(z instanceof Uint8Array && z.length > 0, "بایت خروجی");
  const back = zipParse(z);
  must(back.length === 3, "هر ۳ فایل");
  must(back[0].name === "index.html" && dec.decode(back[0].data) === "<html>سلام</html>", "متن UTF-8");
  must(back[2].data[4] === 255, "باینری سالم");
  const corrupt = z.slice(); corrupt[41] ^= 1;
  let threw = "";
  try { zipParse(corrupt); } catch (e) { threw = String((e && e.message) || e); }
  must(/crc/.test(threw), "CRC می‌گیرد");
  for (const n of ["../x", "/abs", ""]) {
    let t2 = "";
    try { zipStore([{ name: n, data: enc.encode("x") }]); } catch (e) { t2 = "throw"; }
    must(t2 === "throw", "نام بد رد: " + n);
  }
  must(crc32(enc.encode("123456789")) === 0xCBF43926, "بردار CRC32");
  return { name: "باندل ZIP (C-SRV-4)", pass: true, detail: "round-trip + CRC + نام + بردار" };
}
export function serverCases() {
  return [t_srv_mirror, t_srv_input_kinds, t_srv_input_args, t_srv_input_tick, t_srv_input_rate, t_srv_desync_report, t_srv_desync_rate, t_srv_livecap, t_srv_client_report, t_srv_bundle];
}