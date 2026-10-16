// منطق سرور بازی (ارگ) — کپی عینی اسکریپت <script type="text/x-server-plugin">
// داخل index.html (بدون هیچ تغییری).
//
// ⚠️ دستی ویرایش نکن: اول index.html را عوض کن، بعد همین بازه خط‌ها را دوباره
// کپی کن (ابزار copy_lines). عینی‌بودن = رفتار سرور شخصی و پرچنس یکسان است.
//
// بارگذاری: این فایل مستقیم import نمی‌شود؛ server.mjs آن را به‌صورت متن
// می‌خواند و با (new Function("state","pubsub","self", code) اجرا می‌کند —
// دقیقاً همان سه متغیری که پلاگین سرور پرچنس در اختیار اسکریپت می‌گذارد:
//   state  : بایت‌آرایه دائمی (بافر باینری تالار + اتاق‌ها + ابری)
//   pubsub : { publish(topic,msg), numSubscribers(topic) }
//   self   : { onopen/onclose/onmessage, rpc } (این فایل پرش می‌کند)
//
// اندازه بافر موردنیاز: 1053784 بایت
//   = 664 (تالار) + 32*136 (اتاق‌ها) + 16*(12+65536) (ابری)
//
// ---- آغاز کپی عینی (index.html، از خط ۷ تا ۶۳۱) ----

// تالار پیروزی + لابی رقابتی (0.24.0) — سرور مرجع سبک، بدون شبیه‌سازی.
// کل این اسکریپت عمومی است: هیچ رازی در آن نیست. همه ورودی‌ها اعتبارسنجی
// می‌شوند. سرور بازی را اجرا نمی‌کند؛ فقط ورودی‌ها را شماره‌دار (seq) و پخش
// می‌کند (lockstep سبک: اجرا سر execTick روی کلاینت).
// چیدمان state (LE) نسخه ۴:
// [0]=نسخه(۴) [1]=شمار تالار(۰..۲۰) + ۲۰ رکورد ۳۳ بایتی از آفست ۲ (مثل قبل).
// اتاق‌ها از آفست ۶۶۴: ۳۲ اتاق ۱۳۶ بایتی (نسخه ۴: رمز + سیدِ زمان ساخت).
// هر اتاق: ۰..۳ کد ASCII چهارحرفی (۰=خالی) +۴ حداکثر(۲..۴) +۵ تعداد +۶ شروع‌شده
// +۷ میزبان +۸..۱۱ seq بعدی +۱۲..۱۵ seed (زمان ساخت؛ خالی=تصادفی سرور)
// +۱۶ پرچم (بیت۰=خصوصی) +۱۷..۲۰ هش رمز +۲۱..۲۳ رزرو +۲۴..۱۳۵ چهار اسلات ۲۸ بایتی:
// هر اسلات: +۰ هست +۱ آماده +۲ طول‌نام +۳..۲۶ نام ۱۲ واحد UTF-16 +۲۷ لوگو (۰..۱۱).
// رمز هرگز plaintext نگه داشته نمی‌شود — فقط هش FNV-1a (رمز + "|" + کد).
var HALL_VERSION = 1;
var STATE_VERSION = 4;
var OFF_ROOMS = 664;
var ROOMS_MAX = 32;
var ROOM_SIZE = 136;
var MP_MAX = 4;
var MP_CODE_ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var HALL_MAX = 20;
var NAME_MAX = 12;
var PWD_MAX = 16; // سقف طول رمز اتاق (نویسه JS)
var LOGOS_MAX = 12; // تعداد لوگوی پروفایل (آینه PROFILE_LOGOS در profile.js)
var ENTRY_SIZE = 33;
var OFF_COUNT = 1;
var OFF_ENTRIES = 2;

function hRdU32(o) { return (state[o] | (state[o + 1] << 8) | (state[o + 2] << 16) | (state[o + 3] << 24)) >>> 0; }
function hWrU32(o, v) { state[o] = v & 255; state[o + 1] = (v >>> 8) & 255; state[o + 2] = (v >>> 16) & 255; state[o + 3] = (v >>> 24) & 255; }
function hRdU16(o) { return state[o] | (state[o + 1] << 8); }
function hWrU16(o, v) { state[o] = v & 255; state[o + 1] = (v >>> 8) & 255; }
function hEntryOff(i) { return OFF_ENTRIES + i * ENTRY_SIZE; }
function hGetCount() { var c = state[OFF_COUNT]; return c <= HALL_MAX ? c : HALL_MAX; }
function hReadName(o, n) { var s = ""; for (var k = 0; k < n; k++) s += String.fromCharCode(hRdU16(o + 9 + k * 2)); return s; }
function hCopyEntry(dst, src) {
  var a = hEntryOff(dst), b = hEntryOff(src);
  for (var k = 0; k < ENTRY_SIZE; k++) state[a + k] = state[b + k];
}
function hWriteEntry(i, ticks, at, name) {
  var o = hEntryOff(i);
  hWrU32(o, ticks); hWrU32(o + 4, at);
  var n = name.length < NAME_MAX ? name.length : NAME_MAX;
  state[o + 8] = n;
  for (var k = 0; k < NAME_MAX; k++) hWrU16(o + 9 + k * 2, k < n ? name.charCodeAt(k) & 65535 : 0);
}
function hHallData() {
  var c = hGetCount(), out = [];
  for (var i = 0; i < c; i++) {
    var o = hEntryOff(i), n = state[o + 8];
    if (n > NAME_MAX) n = NAME_MAX;
    out.push({ name: hReadName(o, n), ticks: hRdU32(o), at: hRdU32(o + 4) });
  }
  return { entries: out };
}
function hOk(data) { return JSON.stringify({ ok: true, data: data }); }
function hErr(code) { return JSON.stringify({ ok: false, err: code }); }
// نام جنگی: ۱..۱۲ نویسه — حروف فارسی/عربی، لاتین، رقم، فاصله، خط تیره/زیرین، نیم‌فاصله.
function hValidName(s) {
  if (typeof s !== "string") return null;
  var t = s.trim();
  if (t.length < 1 || t.length > NAME_MAX) return null;
  for (var i = 0; i < t.length; i++) {
    var c = t.charCodeAt(i);
    var ok = c === 32 || c === 45 || c === 95 || c === 0x200C || c === 0x200D ||
      (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) ||
      (c >= 0x0600 && c <= 0x06FF);
    if (!ok) return null;
  }
  return t;
}

// محدودکننده‌های زودگذر (با hibernation پاک می‌شوند — سقف‌های state پابرجاست).
var hLastSubmit = new Map(); // conn.id -> ms
var hNetSubs = new Map();    // net[3] -> [ms,...] (ساعت اخیر)
function hNetAllow(g, now) {
  var arr = hNetSubs.get(g) || [], fresh = [];
  for (var i = 0; i < arr.length; i++) if (now - arr[i] < 3600000) fresh.push(arr[i]);
  if (fresh.length >= 10) return false;
  fresh.push(now);
  hNetSubs.set(g, fresh);
  if (hNetSubs.size > 5000) hNetSubs.clear();
  return true;
}

// ---- مهاجرت به نسخه ۴: تالار حفظ می‌شود، اتاق‌ها صفر می‌شوند ----
if (state[0] !== STATE_VERSION) {
  if (state[0] === HALL_VERSION || state[0] === 2 || state[0] === 3) {
    var _i;
    for (_i = OFF_ROOMS; _i < OFF_ROOMS + ROOMS_MAX * ROOM_SIZE; _i++) state[_i] = 0;
    state[0] = STATE_VERSION;
  } else {
    state[0] = STATE_VERSION; state[OFF_COUNT] = 0;
    var _j;
    for (_j = OFF_ROOMS; _j < OFF_ROOMS + ROOMS_MAX * ROOM_SIZE; _j++) state[_j] = 0;
  }
}

// ---- اتاق‌های رقابتی (فقط لابی + ترتیب ورودی، بدون شبیه‌سازی) ----
var mpConn = new Map(); // conn.id -> {room, slot}
var mpCreateAt = new Map(); // conn.id -> ms (سقف ساخت)
var mpJoinAt = new Map(); // conn.id -> ms (سقف پیوستن — ضد حدس رمز)
var mpInputAt = new Map(); // conn.id -> [ms,...] (سقف ورودی)

function mpROff(i) { return OFF_ROOMS + i * ROOM_SIZE; }
function mpSOff(i, s) { return OFF_ROOMS + i * ROOM_SIZE + 24 + s * 28; }
function mpRdU32(o) { return (state[o] | (state[o + 1] << 8) | (state[o + 2] << 16) | (state[o + 3] << 24)) >>> 0; }
function mpWrU32(o, v) { state[o] = v & 255; state[o + 1] = (v >>> 8) & 255; state[o + 2] = (v >>> 16) & 255; state[o + 3] = (v >>> 24) & 255; }
function mpRdU16(o) { return state[o] | (state[o + 1] << 8); }
function mpWrU16(o, v) { state[o] = v & 255; state[o + 1] = (v >>> 8) & 255; }
function mpRoomEmpty(i) {
  var o = mpROff(i);
  return state[o] === 0 && state[o + 1] === 0 && state[o + 2] === 0 && state[o + 3] === 0;
}
function mpRoomCode(i) {
  var o = mpROff(i);
  return String.fromCharCode(state[o], state[o + 1], state[o + 2], state[o + 3]);
}
function mpValidCode(s) {
  if (typeof s !== "string" || s.length !== 4) return false;
  for (var k = 0; k < 4; k++) if (MP_CODE_ALPHA.indexOf(s.charAt(k)) < 0) return false;
  return true;
}
function mpFindRoom(code) {
  for (var i = 0; i < ROOMS_MAX; i++) {
    if (mpRoomEmpty(i)) continue;
    if (mpRoomCode(i) === code) return i;
  }
  return -1;
}
function mpFreeRoom() {
  for (var i = 0; i < ROOMS_MAX; i++) if (mpRoomEmpty(i)) return i;
  return -1;
}
function mpReadName(i, s) {
  var o = mpSOff(i, s), n = state[o + 2];
  if (n > NAME_MAX) n = NAME_MAX;
  var out = "";
  for (var k = 0; k < n; k++) out += String.fromCharCode(mpRdU16(o + 3 + k * 2));
  return out;
}
function mpWriteName(i, s, name) {
  var o = mpSOff(i, s);
  var n = name.length < NAME_MAX ? name.length : NAME_MAX;
  state[o + 2] = n;
  for (var k = 0; k < NAME_MAX; k++) mpWrU16(o + 3 + k * 2, k < n ? name.charCodeAt(k) & 65535 : 0);
}
function mpValidLogo(v) {
  return typeof v === "number" && v === Math.floor(v) && v >= 0 && v < LOGOS_MAX ? v : null;
}
function mpReadLogo(i, s) {
  var v = state[mpSOff(i, s) + 27];
  return v < LOGOS_MAX ? v : 0;
}
function mpWriteLogo(i, s, logo) {
  state[mpSOff(i, s) + 27] = logo;
}
// رمز اتاق (0.28.0): خالی/فقط‌فاصله = عمومی (null)؛ وگرنه ۱..۱۶ نویسه بدون
// کنترلی؛ خروجی false یعنی نامعتبر. هش FNV-1a روی (رمز + "|" + کد) با نمک کد.
function mpValidPassword(pw) {
  if (pw === undefined || pw === null) return null;
  if (typeof pw !== "string") return false;
  var t = pw.trim();
  if (t.length === 0) return null;
  if (t.length > PWD_MAX) return false;
  for (var i = 0; i < t.length; i++) {
    var c = t.charCodeAt(i);
    if (c < 32 || c === 127) return false;
  }
  return t;
}
function mpPwdHash(pw, code) {
  var h = 2166136261 >>> 0;
  var s = pw + "|" + code;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 65535;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function mpIsPrivate(i) {
  return (state[mpROff(i) + 16] & 1) === 1;
}
function mpCheckPassword(i, pw) {
  var o = mpROff(i);
  var want = (state[o + 16] & 1) === 1;
  if (!want) return true;
  if (typeof pw !== "string") return false;
  var t = pw.trim();
  if (!t) return false;
  return mpPwdHash(t, mpRoomCode(i)) === mpRdU32(o + 17);
}
function mpCount(i) {
  var n = 0;
  for (var s = 0; s < MP_MAX; s++) if (state[mpSOff(i, s)] === 1) n++;
  return n;
}
function mpFreeSlot(i) {
  for (var s = 0; s < MP_MAX; s++) if (state[mpSOff(i, s)] !== 1) return s;
  return -1;
}
function mpRoster(i) {
  var o = mpROff(i), out = [];
  for (var s = 0; s < MP_MAX; s++) {
    var so = mpSOff(i, s);
    if (state[so] !== 1) continue;
    out.push({ slot: s, name: mpReadName(i, s), logo: mpReadLogo(i, s), ready: state[so + 1] === 1 });
  }
  return { code: mpRoomCode(i), max: state[o + 4], num: state[o + 5], started: state[o + 6] === 1, host: state[o + 7], seq: mpRdU32(o + 8), seed: mpRdU32(o + 12), priv: (state[o + 16] & 1) === 1, players: out };
}
function mpTopic(i) { return "mp-" + mpRoomCode(i); }
function mpPublishRoster(i) {
  try { pubsub.publish(mpTopic(i), JSON.stringify({ t: "roster", r: mpRoster(i) })); } catch (e) {}
}
function mpClearSlot(i, s) {
  var so = mpSOff(i, s), k;
  state[so] = 0; state[so + 1] = 0; state[so + 2] = 0; state[so + 27] = 0;
  for (k = 0; k < NAME_MAX; k++) mpWrU16(so + 3 + k * 2, 0);
}
function mpFreeIfEmpty(i) {
  var o = mpROff(i);
  if (state[o + 6] === 1) return; // شروع‌شده را نگه دار (نتیجه بازی)
  if (mpCount(i) > 0) return;
  state[o] = 0; state[o + 1] = 0; state[o + 2] = 0; state[o + 3] = 0;
}
function mpGenCode() {
  for (var t = 0; t < 30; t++) {
    var c = "";
    for (var k = 0; k < 4; k++) c += MP_CODE_ALPHA.charAt((Math.random() * MP_CODE_ALPHA.length) | 0);
    if (mpFindRoom(c) < 0) return c;
  }
  return null;
}
function mpGenSeed() {
  var s = (Date.now() ^ ((Math.random() * 4294967296) >>> 0)) >>> 0;
  return s === 0 ? 1337 : s;
}
function mpInputAllow(id, now) {
  var arr = mpInputAt.get(id) || [], fresh = [], k;
  for (k = 0; k < arr.length; k++) if (now - arr[k] < 10000) fresh.push(arr[k]);
  if (fresh.length >= 30) return false;
  fresh.push(now);
  mpInputAt.set(id, fresh);
  if (mpInputAt.size > 20000) mpInputAt.clear();
  return true;
}
var MP_KINDS = { place: 1, hire: 1, order: 1, retreat: 1, stance: 1, guard: 1, garrison: 1, deploy: 1, gate: 1, tax: 1, rations: 1, alarm: 1, trade: 1, trainCancel: 1, hash: 1 };
function mpRemoveConn(conn) {
  var m = mpConn.get(conn.id);
  hLastSubmit.delete(conn.id);
  mpInputAt.delete(conn.id);
  mpCreateAt.delete(conn.id);
  mpJoinAt.delete(conn.id);
  if (!m) return;
  mpConn.delete(conn.id);
  var i = mpFindRoom(m.code);
  if (i < 0) return;
  var so = mpSOff(i, m.slot);
  if (state[so] === 1) {
    mpClearSlot(i, m.slot);
    var o = mpROff(i);
    state[o + 5] = mpCount(i);
    if (state[o + 7] === m.slot) {
      var ns = -1, s;
      for (s = 0; s < MP_MAX; s++) if (state[mpSOff(i, s)] === 1) { ns = s; break; }
      state[o + 7] = ns < 0 ? 255 : ns;
    }
    try { conn.unsubscribe(mpTopic(i)); } catch (e) {}
    if (state[o + 6] === 1) {
      try { pubsub.publish(mpTopic(i), JSON.stringify({ t: "left", slot: m.slot })); } catch (e) {}
      if (mpCount(i) === 0) { var oo = mpROff(i); state[oo] = 0; state[oo + 1] = 0; state[oo + 2] = 0; state[oo + 3] = 0; }
    } else {
      mpFreeIfEmpty(i);
      mpPublishRoster(i);
    }
  }
}

// ---- ذخیره ابری (0.67.0 — انتخاب ۳-الف کاربر): ۱۶ ورودی ۶۴KB پس از اتاق‌ها ----
// هر ورودی ۶۵۵۴۸ بایت: [0..3]=هش کلید u32 (۰=خالی) + [4..7]=طول (واحد UTF-16) +
// [8..11]=زمان unix + [12..65547]=داده (هر نویسه ۲ بایت LE). کلید = هش FNV-1a
// عبارت کاربر که کلاینت هگز ۸نویسه‌ای می‌فرستد — سرور عبارت را هرگز نمی‌بیند.
// هر کس عبارت را بداند می‌خواند/می‌نویسد (امنیت در حد «رمز اتاق»).
var OFF_CLOUD = OFF_ROOMS + ROOMS_MAX * ROOM_SIZE;
var CLOUD_MAX = 16;
var CLOUD_DATA = 65536; // بایت داده هر ورودی
var CLOUD_SIZE = 12 + CLOUD_DATA;
var CLOUD_CHARS = 32768; // سقف نویسه داده (آینه کلاینت)
var mpCloudAt = new Map(); // conn.id -> [ms,...] (سقف ذخیره: ۶ در ۱۰ ثانیه)
function clOff(i) { return OFF_CLOUD + i * CLOUD_SIZE; }
function clGetU32(o) { return (state[o] | (state[o + 1] << 8) | (state[o + 2] << 16) | (state[o + 3] << 24)) >>> 0; }
function clSetU32(o, v) { state[o] = v & 255; state[o + 1] = (v >>> 8) & 255; state[o + 2] = (v >>> 16) & 255; state[o + 3] = (v >>> 24) & 255; }
function clHash(i) { return clGetU32(clOff(i)); }
function clLen(i) { return clGetU32(clOff(i) + 4); }
function clAt(i) { return clGetU32(clOff(i) + 8); }
function clRead(i) {
  var n = clLen(i), o = clOff(i) + 12, s = "";
  if (n < 1 || n > CLOUD_CHARS) return null;
  for (var k = 0; k < n; k++) s += String.fromCharCode(state[o + k * 2] | (state[o + k * 2 + 1] << 8));
  return s;
}
function clWrite(i, data) {
  var o = clOff(i) + 12;
  for (var k = 0; k < data.length; k++) {
    var c = data.charCodeAt(k);
    state[o + k * 2] = c & 255; state[o + k * 2 + 1] = (c >>> 8) & 255;
  }
}
function clValidKey(k) { return typeof k === "string" && /^[0-9a-f]{8}$/.test(k); }
function clKeyH(k) { var h = parseInt(k, 16) >>> 0; return h === 0 ? 1 : h; } // ۰ یعنی خالی
function clFind(h) { for (var i = 0; i < CLOUD_MAX; i++) if (clHash(i) === h) return i; return -1; }
function clFree() { for (var i = 0; i < CLOUD_MAX; i++) if (clHash(i) === 0) return i; return -1; }
function clAllow(id, now) {
  var arr = mpCloudAt.get(id) || [], fresh = [], k;
  for (k = 0; k < arr.length; k++) if (now - arr[k] < 10000) fresh.push(arr[k]);
  if (fresh.length >= 6) return false;
  fresh.push(now);
  mpCloudAt.set(id, fresh);
  if (mpCloudAt.size > 20000) mpCloudAt.clear();
  return true;
}

self.onopen = function (ev) { ev.conn.subscribe("lobby"); };
self.onclose = function (ev) { mpRemoveConn(ev.conn); mpCloudAt.delete(ev.conn.id); };
self.onmessage = function (ev) { /* پیام خام نداریم — فقط RPC */ };
self.rpc = {
  // تابلوی رکوردها (مرتب صعودی بر پایه تیک).
  hall: function () { return hOk(hHallData()); },
  // شمار حاضران (مشترکان lobby).
  online: function () { return hOk({ n: pubsub.numSubscribers("lobby") }); },
  // ثبت پیروزی: {name, ticks} — اعتبارسنجی کامل + محدودیت نرخ.
  submit: function (ev, data) {
    var now = Date.now(), conn = ev.conn;
    var last = hLastSubmit.get(conn.id) || 0;
    if (now - last < 10000) return hErr("slow");
    var msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var name = hValidName(msg.name);
    if (name === null) return hErr("name");
    var ticks = msg.ticks;
    if (typeof ticks !== "number" || ticks !== Math.floor(ticks) || ticks < 200 || ticks > 20000000) return hErr("ticks");
    if (!hNetAllow(conn.net[3], now)) return hErr("slow");
    hLastSubmit.set(conn.id, now);
    if (hLastSubmit.size > 20000) hLastSubmit.clear();
    var c = hGetCount(), pos = c, i;
    for (i = 0; i < c; i++) { if (ticks < hRdU32(hEntryOff(i))) { pos = i; break; } }
    if (pos < HALL_MAX) {
      var top = c < HALL_MAX ? c : HALL_MAX - 1;
      for (i = top; i > pos; i--) hCopyEntry(i, i - 1);
      hWriteEntry(pos, ticks, Math.floor(now / 1000), name);
      if (c < HALL_MAX) state[OFF_COUNT] = c + 1;
    }
    pubsub.publish("lobby", "V:" + name);
    return hOk("ok");
  },
  // ساخت اتاق رقابتی: {name, max, logo?, password?, seed?} -> {code, slot, seed, priv}
  // password خالی = عمومی؛ seed خالی = تصادفی سرور (همان لحظه ساخته و ذخیره می‌شود).
  mpCreate: function (ev, data) {
    var now = Date.now(), conn = ev.conn;
    var last = mpCreateAt.get(conn.id) || 0;
    if (now - last < 3000) return hErr("slow");
    var msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var name = hValidName(msg.name);
    if (name === null) return hErr("name");
    var logo = msg.logo === undefined ? 0 : mpValidLogo(msg.logo);
    if (logo === null) return hErr("logo");
    var max = msg.max;
    if (typeof max !== "number" || max !== Math.floor(max) || max < 2 || max > MP_MAX) return hErr("max");
    var pw = mpValidPassword(msg.password);
    if (pw === false) return hErr("password");
    var seed = mpGenSeed();
    if (msg.seed !== undefined && msg.seed !== null && msg.seed !== "") {
      var req = typeof msg.seed === "number" ? msg.seed : parseInt(msg.seed, 10);
      if (req !== Math.floor(req) || req < 1 || req > 4294967295) return hErr("seed");
      seed = req >>> 0;
      if (seed === 0) seed = 1337;
    }
    if (mpConn.has(conn.id)) return hErr("inroom");
    var i = mpFreeRoom();
    if (i < 0) return hErr("full");
    var code = mpGenCode();
    if (!code) return hErr("full");
    mpCreateAt.set(conn.id, now);
    var o = mpROff(i), k;
    state[o] = code.charCodeAt(0); state[o + 1] = code.charCodeAt(1);
    state[o + 2] = code.charCodeAt(2); state[o + 3] = code.charCodeAt(3);
    state[o + 4] = max; state[o + 5] = 1; state[o + 6] = 0; state[o + 7] = 0;
    mpWrU32(o + 8, 1); mpWrU32(o + 12, seed);
    state[o + 16] = pw === null ? 0 : 1;
    if (pw === null) { mpWrU32(o + 17, 0); } else { mpWrU32(o + 17, mpPwdHash(pw, code)); }
    state[o + 21] = 0; state[o + 22] = 0; state[o + 23] = 0;
    for (k = 0; k < MP_MAX; k++) mpClearSlot(i, k);
    var so = mpSOff(i, 0);
    state[so] = 1; state[so + 1] = 0;
    mpWriteName(i, 0, name);
    mpWriteLogo(i, 0, logo);
    conn.subscribe(mpTopic(i));
    mpConn.set(conn.id, { code: code, room: i, slot: 0 });
    mpPublishRoster(i);
    return hOk({ code: code, slot: 0, seed: seed, priv: pw !== null });
  },
  // پیوستن: {code, name, logo?, password?} -> {slot}
  mpJoin: function (ev, data) {
    var now = Date.now(), conn = ev.conn, msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var lastJ = mpJoinAt.get(conn.id) || 0;
    if (now - lastJ < 1500) return hErr("slow");
    if (!mpValidCode(msg.code)) return hErr("nocode");
    var name = hValidName(msg.name);
    if (name === null) return hErr("name");
    var logo = msg.logo === undefined ? 0 : mpValidLogo(msg.logo);
    if (logo === null) return hErr("logo");
    if (mpConn.has(conn.id)) return hErr("inroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    if (state[o + 6] === 1) return hErr("started");
    if (!mpCheckPassword(i, msg.password)) { mpJoinAt.set(conn.id, now); return hErr("password"); }
    var s = mpFreeSlot(i);
    if (s < 0 || mpCount(i) >= state[o + 4]) return hErr("full");
    mpJoinAt.set(conn.id, now);
    var so = mpSOff(i, s);
    state[so] = 1; state[so + 1] = 0;
    mpWriteName(i, s, name);
    mpWriteLogo(i, s, logo);
    state[o + 5] = mpCount(i);
    conn.subscribe(mpTopic(i));
    mpConn.set(conn.id, { code: msg.code, room: i, slot: s });
    mpPublishRoster(i);
    return hOk({ slot: s, r: mpRoster(i) });
  },
  // آماده: {code, ready}
  mpReady: function (ev, data) {
    var conn = ev.conn, msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var m = mpConn.get(conn.id);
    if (!m || m.code !== msg.code) return hErr("noroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    if (state[o + 6] === 1) return hErr("started");
    var so = mpSOff(i, m.slot);
    if (state[so] !== 1) return hErr("noroom");
    state[so + 1] = msg.ready ? 1 : 0;
    mpPublishRoster(i);
    return hOk("ok");
  },
  // ویرایش پروفایل در لابی: {code, name?, logo?} — همه حاضرین roster تازه می‌گیرند.
  mpProfile: function (ev, data) {
    var conn = ev.conn, msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var m = mpConn.get(conn.id);
    if (!m || m.code !== msg.code) return hErr("noroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var so = mpSOff(i, m.slot);
    if (state[so] !== 1) return hErr("noroom");
    var changed = false;
    if (msg.name !== undefined) {
      var name = hValidName(msg.name);
      if (name === null) return hErr("name");
      mpWriteName(i, m.slot, name);
      changed = true;
    }
    if (msg.logo !== undefined) {
      var logo = mpValidLogo(msg.logo);
      if (logo === null) return hErr("logo");
      mpWriteLogo(i, m.slot, logo);
      changed = true;
    }
    if (!changed) return hErr("bad");
    mpPublishRoster(i);
    return hOk("ok");
  },
  // شروع (فقط میزبان): {code} — همه حاضر آماده + دست‌کم ۲ نفر.
  // سید همان سیدِ زمان ساخت است (در فهرست اتاق‌ها دیده می‌شود).
  mpStart: function (ev, data) {
    var conn = ev.conn, msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var m = mpConn.get(conn.id);
    if (!m || m.code !== msg.code) return hErr("noroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    if (state[o + 6] === 1) return hErr("started");
    if (state[o + 7] !== m.slot) return hErr("nohost");
    var n = mpCount(i), s;
    if (n < 2) return hErr("few");
    for (s = 0; s < MP_MAX; s++) {
      var so = mpSOff(i, s);
      if (state[so] === 1 && state[so + 1] !== 1) return hErr("notready");
    }
    var seed = mpRdU32(o + 12);
    if (seed === 0) { seed = mpGenSeed(); mpWrU32(o + 12, seed); }
    state[o + 6] = 1;
    mpWrU32(o + 8, 1);
    var r = mpRoster(i);
    try { pubsub.publish(mpTopic(i), JSON.stringify({ t: "start", seed: seed, r: r })); } catch (e) {}
    return hOk({ seed: seed });
  },
  // ورودی نوبتی: {code, kind, args, tick} -> {seq}
  mpInput: function (ev, data) {
    var now = Date.now(), conn = ev.conn;
    if (typeof data !== "string" || data.length > 2000) return hErr("bad");
    var msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var m = mpConn.get(conn.id);
    if (!m || m.code !== msg.code) return hErr("noroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    if (state[o + 6] !== 1) return hErr("nostart");
    var so = mpSOff(i, m.slot);
    if (state[so] !== 1) return hErr("noroom");
    if (!MP_KINDS[msg.kind]) return hErr("kind");
    if (typeof msg.tick !== "number" || msg.tick !== Math.floor(msg.tick) || msg.tick < 0 || msg.tick > 20000000) return hErr("tick");
    if (msg.args !== undefined && (typeof msg.args !== "object" || msg.args === null)) return hErr("args");
    if (!mpInputAllow(conn.id, now)) return hErr("slow");
    var seq = mpRdU32(o + 8);
    if (seq >= 2000000000) return hErr("full");
    mpWrU32(o + 8, seq + 1);
    try { pubsub.publish(mpTopic(i), JSON.stringify({ t: "inp", seq: seq, slot: m.slot, kind: msg.kind, args: msg.args || {}, tick: msg.tick })); } catch (e) { return hErr("big"); }
    return hOk({ seq: seq });
  },
  // وضعیت اتاق: {code}
  mpRoom: function (ev, data) {
    var msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object" || !mpValidCode(msg.code)) return hErr("nocode");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    return hOk(mpRoster(i));
  },
  // فهرست اتاق‌های باز (حداکثر ۲۰): کد، ظرفیت، سید، عمومی/خصوصی + بازیکنان حاضر.
  mpList: function () {
    var out = [], i;
    for (i = 0; i < ROOMS_MAX && out.length < 20; i++) {
      if (mpRoomEmpty(i)) continue;
      var o = mpROff(i);
      if (state[o + 6] === 1) continue;
      var n = mpCount(i);
      if (n >= state[o + 4]) continue;
      var r = mpRoster(i);
      out.push({ code: r.code, num: r.num, max: r.max, seed: r.seed, priv: r.priv, players: r.players });
    }
    return hOk({ rooms: out });
  },
  // ذخیره ابری (0.67.0): {k: هش‌هگز ۸نویسه‌ای, data: رشته JSON} -> {at}
  // سقف: ۶ ذخیره در ۱۰ ثانیه هر اتصال؛ داده ۲..۳۲۷۶۸ نویسه؛ ۱۶ ورودی مشترک.
  // خوانش مجدد پس از نوشتن (بافر کوچک‌تر از انتظار = خطای صادقانه big).
  cloudSave: function (ev, data) {
    var now = Date.now(), conn = ev.conn;
    if (!clAllow(conn.id, now)) return hErr("slow");
    var msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    if (!clValidKey(msg.k)) return hErr("key");
    if (typeof msg.data !== "string" || msg.data.length < 2 || msg.data.length > CLOUD_CHARS) return hErr("big");
    var h = clKeyH(msg.k), i = clFind(h);
    if (i < 0) { i = clFree(); if (i < 0) return hErr("full"); }
    clSetU32(clOff(i), h); clSetU32(clOff(i) + 4, msg.data.length);
    clSetU32(clOff(i) + 8, Math.floor(now / 1000));
    clWrite(i, msg.data);
    if (clRead(i) !== msg.data) { clSetU32(clOff(i), 0); clSetU32(clOff(i) + 4, 0); return hErr("big"); }
    return hOk({ at: clAt(i) });
  },
  // بارخوانی ابری: {k} -> {data, at} یا empty.
  cloudLoad: function (ev, data) {
    var msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object" || !clValidKey(msg.k)) return hErr("key");
    var i = clFind(clKeyH(msg.k));
    if (i < 0) return hErr("empty");
    var s = clRead(i);
    if (s === null) return hErr("bad");
    return hOk({ data: s, at: clAt(i) });
  },
  // حذف ابری: {k} -> ok (نبودن هم ok است).
  cloudDelete: function (ev, data) {
    var msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object" || !clValidKey(msg.k)) return hErr("key");
    var i = clFind(clKeyH(msg.k));
    if (i >= 0) { clSetU32(clOff(i), 0); clSetU32(clOff(i) + 4, 0); }
    return hOk("ok");
  },
  // خروج
  mpLeave: function (ev, data) {
    var conn = ev.conn, msg = null;
    try { msg = JSON.parse(data || "{}"); } catch (e) { msg = {}; }
    var m = mpConn.get(conn.id);
    if (!m) return hOk("ok");
    var i = mpFindRoom(m.code);
    mpConn.delete(conn.id);
    if (i >= 0) {
      var so = mpSOff(i, m.slot);
      if (state[so] === 1) {
        mpClearSlot(i, m.slot);
        var o = mpROff(i);
        state[o + 5] = mpCount(i);
        if (state[o + 7] === m.slot) {
          var ns = -1, s;
          for (s = 0; s < MP_MAX; s++) if (state[mpSOff(i, s)] === 1) { ns = s; break; }
          state[o + 7] = ns < 0 ? 255 : ns;
        }
        if (state[o + 6] === 1) {
          try { pubsub.publish(mpTopic(i), JSON.stringify({ t: "left", slot: m.slot })); } catch (e) {}
          if (mpCount(i) === 0) { state[o] = 0; state[o + 1] = 0; state[o + 2] = 0; state[o + 3] = 0; }
        } else {
          mpFreeIfEmpty(i);
          mpPublishRoster(i);
        }
      }
      try { conn.unsubscribe(mpTopic(i)); } catch (e) {}
    }
    return hOk("ok");
  }
};