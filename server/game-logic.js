// منطق سرور بازی (ارگ) — ساخته tools/sync-server.mjs؛ دستی ویرایش نکن.
// منبع حقیقت: index.html، <script type="text/x-server-plugin"> (خطوط 28 تا 1058).
// عینی‌بودن = رفتار سرور شخصی و پرچنس یکسان است.
//
// بارگذاری: این فایل مستقیم import نمی‌شود؛ server.mjs آن را به‌صورت متن
// می‌خواند و با (new Function("state","pubsub","self", code) اجرا می‌کند —
// دقیقاً همان سه متغیری که پلاگین سرور پرچنس در اختیار اسکریپت می‌گذارد:
//   state  : بایت‌آرایه دائمی (بافر باینری تالار + اتاق‌ها + ابری)
//   pubsub : { publish(topic,msg), numSubscribers(topic) }
//   self   : { onopen/onclose/onmessage, rpc } (این فایل پرش می‌کند)
//
// اندازه بافر موردنیاز: 17833432 بایت
//   = 1056216 (تالار+اتاق‌ها+ابری+توکن‌ها+فرااتاق) + 32*524288 (لاگ ورودی)
// تالار پیروزی + لابی رقابتی (0.24.0) — سرور مرجع سبک، بدون شبیه‌سازی.
// کل این اسکریپت عمومی است: هیچ رازی در آن نیست. همه ورودی‌ها اعتبارسنجی
// می‌شوند. سرور بازی را اجرا نمی‌کند؛ فقط ورودی‌ها را شماره‌دار (seq) و پخش
// می‌کند (lockstep سبک: اجرا سر execTick روی کلاینت).
// چیدمان state (LE) نسخه ۵ (تالار/اتاق/ابری مثل نسخه ۴ + سه ناحیه تازه در انتها):
// [0]=نسخه(۴) [1]=شمار تالار(۰..۲۰) + ۲۰ رکورد ۳۳ بایتی از آفست ۲ (مثل قبل).
// اتاق‌ها از آفست ۶۶۴: ۳۲ اتاق ۱۳۶ بایتی (نسخه ۴: رمز + سیدِ زمان ساخت).
// هر اتاق: ۰..۳ کد ASCII چهارحرفی (۰=خالی) +۴ حداکثر(۲..۴) +۵ تعداد
// +۶ وضعیت (۰=لابی، ۱=جاری، ۲=تمام‌شده) +۷ میزبان +۸..۱۱ seq بعدی
// +۱۲..۱۵ seed (زمان ساخت؛ خالی=تصادفی سرور)
// +۱۶ پرچم (بیت۰=خصوصی) +۱۷..۲۰ هش رمز +۲۱ پرچم noCow +۲۲ پرچم strongWalls +۲۳ پرچم noRush +24 noDogs +25..135 چهار اسلات ۲۸ بایتی:
// هر اسلات: +۰ هست +۱ آماده (در بازی جاری/تمام‌شده = پرچم اتصال) +۲ طول‌نام
// +۳..۲۶ نام ۱۲ واحد UTF-16 +۲۷ لوگو (۰..۲۸).
// رمز هرگز plaintext نگه داشته نمی‌شود — فقط هش FNV-1a (رمز + "|" + کد).
// توکن اتصال‌مجدد از آفست ۱۰۵۳۷۸۴: ۳۲ اتاق × ۴ اسلات × ۱۶ بایت هگز ASCII (۰=خالی).
// فرااتاق از آفست ۱۰۵۵۸۳۲: ۳۲ × ۲۰ بایت = baseSeq/logStart/logEnd/lastActiveMin/winner+1.
// لاگ ورودی از آفست ۱۰۵۶۲۱۶: ۳۲ حلقه ۵۱۲KB؛ هر ورودی [seq u32][slot][kind][tick u32][len u16][args UTF-16].
// اندازه کل state نسخه ۵: ۱۷۸۳۳۴۳۲ بایت.
var HALL_VERSION = 1;
var STATE_VERSION = 5;
var OFF_ROOMS = 664;
var ROOMS_MAX = 32;
var ROOM_SIZE = 136;
var MP_MAX = 4;
var MP_CODE_ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var HALL_MAX = 20;
var NAME_MAX = 12;
var PWD_MAX = 16; // سقف طول رمز اتاق (نویسه JS)
var LOGOS_MAX = 29; // تعداد پرتره پروفایل (آینه PROFILE_LORDS در profile.js)
var ENTRY_SIZE = 33;
var OFF_COUNT = 1;
var OFF_ENTRIES = 2;
var OFF_TOKENS = 1053784; // ۳۲ اتاق × ۴ اسلات × ۱۶ بایت (توکن هگز اتصال‌مجدد)
var TOK_SIZE = 16;
var OFF_ROOMMETA = 1055832; // ۳۲ × ۲۰ بایت فرااتاق
var META_SIZE = 20;
var OFF_LOG = 1056216; // ۳۲ حلقه ۵۱۲KB لاگ ورودی
var LOG_CAP = 524288;

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

// ---- مهاجرت به نسخه ۵: تالار + ابری حفظ می‌شوند؛ اتاق‌ها/توکن‌ها/فرااتاق صفر ----
if (state[0] !== STATE_VERSION) {
  if (state[0] === HALL_VERSION || state[0] === 2 || state[0] === 3 || state[0] === 4) {
    var _i;
    for (_i = OFF_ROOMS; _i < OFF_ROOMS + ROOMS_MAX * ROOM_SIZE; _i++) state[_i] = 0;
    for (_i = OFF_TOKENS; _i < OFF_LOG; _i++) state[_i] = 0;
    state[0] = STATE_VERSION;
  } else {
    state[0] = STATE_VERSION; state[OFF_COUNT] = 0;
    var _j;
    for (_j = OFF_ROOMS; _j < OFF_ROOMS + ROOMS_MAX * ROOM_SIZE; _j++) state[_j] = 0;
    for (_j = OFF_TOKENS; _j < OFF_LOG; _j++) state[_j] = 0;
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
  var live = state[o + 6] !== 0; // جاری/تمام‌شده: ready یعنی وصل
  for (var s = 0; s < MP_MAX; s++) {
    var so = mpSOff(i, s);
    if (state[so] !== 1) continue;
    out.push({ slot: s, name: mpReadName(i, s), logo: mpReadLogo(i, s), ready: state[so + 1] === 1, on: live ? state[so + 1] === 1 : true });
  }
  var win = state[mpMOff(i) + 16];
  return { code: mpRoomCode(i), max: state[o + 4], num: state[o + 5], started: state[o + 6] !== 0, over: state[o + 6] === 2, winner: win === 0 ? -1 : win - 1, host: state[o + 7], seq: mpRdU32(o + 8), seed: mpRdU32(o + 12), priv: (state[o + 16] & 1) === 1, noCow: (state[o + 21] & 1) === 1, strongWalls: (state[o + 22] & 1) === 1, noRush: (state[o + 23] & 1) === 1, noDogs: (state[o + 24] & 1) === 1, players: out };
}
function mpTopic(i) { return "mp-" + mpRoomCode(i); }
function mpPublishRoster(i) {
  try { pubsub.publish(mpTopic(i), JSON.stringify({ t: "roster", r: mpRoster(i) })); } catch (e) {}
}
function mpClearSlot(i, s) {
  var so = mpSOff(i, s), k;
  state[so] = 0; state[so + 1] = 0; state[so + 2] = 0; state[so + 27] = 0;
  for (k = 0; k < NAME_MAX; k++) mpWrU16(so + 3 + k * 2, 0);
  mpTokenClear(i, s); // توکن هم باطل می‌شود (0.141.0)
}
function mpFreeIfEmpty(i) {
  var o = mpROff(i);
  if (state[o + 6] === 1) return; // شروع‌شده را نگه دار (نتیجه بازی)
  if (mpCount(i) > 0) return;
  mpZapRoom(i);
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
// سخت‌سازی ورودی نوبتی (0.231.0 — C-SRV-1): سقف هر اسلات (قطع/وصل مجدد سقف
// اتصال را دور نمی‌زند) + پسرفت تیک + اسکیمای آرگومان هر kind. همه در حافظه‌اند
// (با راه‌اندازی مجدد سرور پاک می‌شوند — فقط ضدسوءاستفاده‌اند، نه اجماع).
// sim/هش/ری‌پلی بی‌خبر.
var MP_SLOT_INPUT_MAX = 40;
var MP_TICK_SLACK = 100;
var mpSlotInputAt = new Map();
var mpSlotLastTick = new Map();
function mpSlotKey(code, slot) { return code + ":" + slot; }
function mpSlotInputAllow(code, slot, now) {
  var k = mpSlotKey(code, slot), arr = mpSlotInputAt.get(k) || [], fresh = [], j;
  for (j = 0; j < arr.length; j++) if (now - arr[j] < 10000) fresh.push(arr[j]);
  if (fresh.length >= MP_SLOT_INPUT_MAX) return false;
  fresh.push(now);
  mpSlotInputAt.set(k, fresh);
  if (mpSlotInputAt.size > 20000) mpSlotInputAt.clear();
  return true;
}
function mpTickOk(code, slot, tick) {
  var k = mpSlotKey(code, slot), last = mpSlotLastTick.get(k);
  if (last !== undefined && tick < last - MP_TICK_SLACK) return false;
  if (last === undefined || tick > last) mpSlotLastTick.set(k, tick);
  if (mpSlotLastTick.size > 20000) mpSlotLastTick.clear();
  return true;
}
function mpIsIdList(v) {
  if (!Array.isArray(v) || v.length < 1 || v.length > 32) return false;
  for (var j = 0; j < v.length; j++) {
    if (typeof v[j] !== "number" || v[j] !== Math.floor(v[j]) || v[j] < 0 || v[j] > 2147483647) return false;
  }
  return true;
}
function mpIsCoord(v) { return typeof v === "number" && v === Math.floor(v) && v >= -100000 && v <= 100000; }
function mpIsKey(v) { return typeof v === "string" && v.length >= 1 && v.length <= 32; }
function mpIsBld(v) { return typeof v === "number" && v === Math.floor(v) && v >= 0 && v <= 2147483647; }
var MP_ORDER_KINDS = { move: 1, attackmove: 1, attackpos: 1, patrol: 1 };
var MP_STANCES = { engage: 1, hold: 1, defend: 1 };
function mpArgsOk(kind, a) {
  switch (kind) {
    case "place": case "hire": case "rally":
      return mpIsKey(a.type) && mpIsCoord(a.c) && mpIsCoord(a.r);
    case "order":
      if (!mpIsIdList(a.ids) || !mpIsCoord(a.c) || !mpIsCoord(a.r)) return false;
      if (a.kind !== undefined && MP_ORDER_KINDS[a.kind] !== 1) return false;
      if (a.queue !== undefined && a.queue !== true) return false;
      return true;
    case "retreat": case "deploy": case "resupply": case "disband":
      return mpIsIdList(a.ids);
    case "firecow":
      return mpIsIdList(a.ids) && mpIsCoord(a.c) && mpIsCoord(a.r);
    case "stance":
      return mpIsIdList(a.ids) && MP_STANCES[a.stance] === 1;
    case "guard": case "garrison":
      return mpIsIdList(a.ids) && mpIsBld(a.bld);
    case "gate": case "demolish": case "repair": case "release":
      return mpIsBld(a.bld);
    case "trainCancel":
      return mpIsBld(a.bld) && mpIsBld(a.idx);
    case "trade":
      return mpIsKey(a.res) && (a.dir === "buy" || a.dir === "sell");
    case "tax": case "rations":
      return typeof a.v === "string" && a.v.length >= 1 && a.v.length <= 16;
    case "food":
      return typeof a.v === "string" && a.v.length >= 1 && a.v.length <= 32;
    case "alarm":
      return mpIsCoord(a.c) && mpIsCoord(a.r);
    case "hash":
      if (typeof a.h !== "string" || a.h.length < 1 || a.h.length > 64) return false;
      if (a.tick !== undefined && (typeof a.tick !== "number" || a.tick !== Math.floor(a.tick) || a.tick < 0)) return false;
      return true;
    case "undo":
      return true;
    default:
      return false;
  }
}
var mpDesyncAt = new Map(); // conn.id -> ms (سقف گزارش ناهمگامی)
var mpDesyncRing = []; // آخرین ۲۰ گزارش ناهمگامی (حافظه — با راه‌اندازی مجدد پاک می‌شود)
function mpDesyncTouch(connId, now) {
  var last = mpDesyncAt.get(connId) || 0;
  if (now - last < 30000) return false;
  mpDesyncAt.set(connId, now);
  if (mpDesyncAt.size > 20000) mpDesyncAt.clear();
  return true;
}
// ---- اتصال‌مجدد + تماشا (0.141.0): توکن اسلات، فرااتاق، لاگ حلقه‌ای ورودی ----
// توکن: ۱۶ نویسه هگز تصادفی در ساخت/پیوستن؛ مدرک مالکیت اسلات پس از قطع اتصال.
function mpTOff(i, s) { return OFF_TOKENS + (i * MP_MAX + s) * TOK_SIZE; }
function mpTokenSet(i, s, tok) { var o = mpTOff(i, s), k; for (k = 0; k < TOK_SIZE; k++) state[o + k] = tok.charCodeAt(k) & 255; }
function mpTokenClear(i, s) { var o = mpTOff(i, s), k; for (k = 0; k < TOK_SIZE; k++) state[o + k] = 0; }
function mpTokenEq(i, s, tok) {
  if (typeof tok !== "string" || tok.length !== TOK_SIZE) return false;
  var o = mpTOff(i, s), d = 0, k;
  for (k = 0; k < TOK_SIZE; k++) {
    var c = tok.charCodeAt(k);
    if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102))) return false;
    d |= state[o + k] ^ (c & 255);
  }
  return d === 0;
}
function mpGenToken(i) {
  var t, k, q, dup, s;
  for (t = 0; t < 20; t++) {
    s = "";
    for (k = 0; k < TOK_SIZE; k++) s += "0123456789abcdef".charAt((Math.random() * 16) | 0);
    dup = false;
    for (q = 0; q < MP_MAX; q++) {
      var o = mpTOff(i, q), same = true, k2;
      for (k2 = 0; k2 < TOK_SIZE; k2++) { if (state[o + k2] !== (s.charCodeAt(k2) & 255)) { same = false; break; } }
      if (same) { dup = true; break; }
    }
    if (!dup) return s;
  }
  return s;
}
// فرااتاق (۲۰ بایت): baseSeq/logStart/logEnd/lastActiveMin/winner+1 (۰=نامشخص).
function mpMOff(i) { return OFF_ROOMMETA + i * META_SIZE; }
function mpMetaGet(i) {
  var o = mpMOff(i);
  return { base: mpRdU32(o), start: mpRdU32(o + 4), end: mpRdU32(o + 8), active: mpRdU32(o + 12), win: state[o + 16] };
}
function mpMetaSet(i, m) {
  var o = mpMOff(i);
  mpWrU32(o, m.base >>> 0); mpWrU32(o + 4, m.start >>> 0); mpWrU32(o + 8, m.end >>> 0);
  mpWrU32(o + 12, m.active >>> 0); state[o + 16] = m.win & 255;
}
function mpZeroMeta(i) { mpMetaSet(i, { base: 0, start: 0, end: 0, active: 0, win: 0 }); }
function mpNowMin() { return (Math.floor(Date.now() / 60000)) >>> 0; }
function mpTouch(i) { var m = mpMetaGet(i); m.active = mpNowMin(); mpMetaSet(i, m); }
function mpRoomLive(i) { return state[mpROff(i) + 6] !== 0; } // جاری یا تمام‌شده
function mpRoomOver(i) { return state[mpROff(i) + 6] === 2; }
// پرچم اتصال اسلات: لابی همیشه وصل (اسلاتِ بی‌اتصال همان‌جا پاک می‌شود)؛
// در بازی جاری/تمام‌شده، بایت آماده همین نقش پرچم اتصال را دارد.
function mpSlotOn(i, s) {
  if (state[mpSOff(i, s)] !== 1) return false;
  if (state[mpROff(i) + 6] === 0) return true;
  return state[mpSOff(i, s) + 1] === 1;
}
// میزبان: در بازی جاری وصل‌ها مقدم‌اند، وگرنه اولین اشغال‌شده (آینه رفتار لابی).
function mpMigrateHost(i) {
  var o = mpROff(i), s, ns = -1;
  for (s = 0; s < MP_MAX; s++) {
    if (state[mpSOff(i, s)] !== 1) continue;
    if (state[o + 6] !== 0 && state[mpSOff(i, s) + 1] !== 1) continue;
    ns = s; break;
  }
  if (ns < 0) for (s = 0; s < MP_MAX; s++) if (state[mpSOff(i, s)] === 1) { ns = s; break; }
  state[o + 7] = ns < 0 ? 255 : ns;
}
// آزادسازی کامل اتاق خالی (کد + فرا؛ توکن‌ها با اسلات‌ها پاک شده‌اند).
function mpZapRoom(i) {
  var o = mpROff(i);
  state[o] = 0; state[o + 1] = 0; state[o + 2] = 0; state[o + 3] = 0;
  mpZeroMeta(i);
}
// جاروی تنبل: بازیِ بی‌اتصالِ بیش از ۲۴ ساعت بی‌فعالیت آزاد می‌شود (سقف ۳۲ اتاق).
function mpSweep(nowMin) {
  var i, s;
  for (i = 0; i < ROOMS_MAX; i++) {
    if (mpRoomEmpty(i)) continue;
    var o = mpROff(i);
    if (state[o + 6] === 0) continue;
    var anyOn = false;
    for (s = 0; s < MP_MAX; s++) if (mpSlotOn(i, s)) { anyOn = true; break; }
    if (anyOn) continue;
    var idle = (nowMin - mpRdU32(mpMOff(i) + 12)) >>> 0;
    if (idle > 1440) mpZapRoom(i);
  }
}
// نگاشت نوع ورودی به شناسه لاگ (ترتیب ثابت — هرگز جابه‌جا نشود).
var MP_KIND_LIST = ["place", "hire", "order", "retreat", "stance", "guard", "garrison", "deploy", "gate", "tax", "rations", "alarm", "trade", "trainCancel", "hash", "food", "demolish", "firecow", "undo", "resupply", "repair", "release"];
function mpKindId(kind) { for (var k = 0; k < MP_KIND_LIST.length; k++) if (MP_KIND_LIST[k] === kind) return k + 1; return 0; }
function mpKindName(id) { return (id >= 1 && id <= MP_KIND_LIST.length) ? MP_KIND_LIST[id - 1] : null; }
function mpLogBase(i) { return OFF_LOG + i * LOG_CAP; }
// افزودن ورودی به لاگ حلقه‌ای (فشرده‌سازی + اخراج کهنه‌ها؛ false یعنی جا نشد).
function mpLogAppend(i, seq, slot, kindId, tick, argsStr) {
  var m = mpMetaGet(i), base = mpLogBase(i), k;
  var elen = 12 + argsStr.length * 2;
  if (elen > LOG_CAP) return false;
  var st = m.start >>> 0, en = m.end >>> 0;
  if (st > LOG_CAP) st = 0;
  if (en > LOG_CAP || en < st) { st = 0; en = 0; m.base = seq; }
  if (en + elen > LOG_CAP && st > 0) {
    for (k = 0; k < en - st; k++) state[base + k] = state[base + st + k];
    en -= st; st = 0;
  }
  while (en + elen > LOG_CAP) {
    if (st + 12 > en) { st = 0; en = 0; m.base = seq + 1; break; }
    var oldSeq = (state[base + st] | (state[base + st + 1] << 8) | (state[base + st + 2] << 16) | (state[base + st + 3] << 24)) >>> 0;
    var oldLen = state[base + st + 10] | (state[base + st + 11] << 8);
    var oldElen = 12 + oldLen * 2;
    if (oldElen <= 0 || st + oldElen > en) { st = 0; en = 0; m.base = seq + 1; break; }
    st += oldElen;
    m.base = oldSeq + 1;
  }
  var o = base + en;
  state[o] = seq & 255; state[o + 1] = (seq >>> 8) & 255; state[o + 2] = (seq >>> 16) & 255; state[o + 3] = (seq >>> 24) & 255;
  state[o + 4] = slot & 255; state[o + 5] = kindId & 255;
  state[o + 6] = tick & 255; state[o + 7] = (tick >>> 8) & 255; state[o + 8] = (tick >>> 16) & 255; state[o + 9] = (tick >>> 24) & 255;
  state[o + 10] = argsStr.length & 255; state[o + 11] = (argsStr.length >>> 8) & 255;
  for (k = 0; k < argsStr.length; k++) {
    var c = argsStr.charCodeAt(k);
    state[o + 12 + k * 2] = c & 255; state[o + 12 + k * 2 + 1] = (c >>> 8) & 255;
  }
  m.start = st; m.end = en + elen;
  mpMetaSet(i, m);
  return true;
}
// خوانش ورودی‌های [from, nextSeq) تا سقف n ورودی.
function mpLogRead(i, from, n, nextSeq) {
  var m = mpMetaGet(i), base = mpLogBase(i), k;
  if (from < (m.base >>> 0)) return { tooOld: true, base: m.base >>> 0 };
  var out = [], pos = m.start >>> 0, en = m.end >>> 0;
  if (pos > LOG_CAP || en > LOG_CAP || en < pos) return { list: out, next: nextSeq, base: m.base >>> 0 };
  while (pos + 12 <= en && out.length < n) {
    var seq = (state[base + pos] | (state[base + pos + 1] << 8) | (state[base + pos + 2] << 16) | (state[base + pos + 3] << 24)) >>> 0;
    var slot = state[base + pos + 4], kid = state[base + pos + 5];
    var tick = (state[base + pos + 6] | (state[base + pos + 7] << 8) | (state[base + pos + 8] << 16) | (state[base + pos + 9] << 24)) >>> 0;
    var len = state[base + pos + 10] | (state[base + pos + 11] << 8);
    var elen = 12 + len * 2;
    if (elen <= 0 || pos + elen > en) break;
    if (seq >= from) {
      var kn = mpKindName(kid);
      if (kn === null) break;
      var s = "";
      for (k = 0; k < len; k++) s += String.fromCharCode(state[base + pos + 12 + k * 2] | (state[base + pos + 12 + k * 2 + 1] << 8));
      var args = {};
      try { args = JSON.parse(s); } catch (e) { break; }
      if (args === null || typeof args !== "object") args = {};
      out.push({ seq: seq, slot: slot, kind: kn, args: args, tick: tick });
    }
    pos += elen;
  }
  return { list: out, next: nextSeq, base: m.base >>> 0 };
}
var MP_KINDS = { place: 1, hire: 1, order: 1, retreat: 1, stance: 1, guard: 1, garrison: 1, deploy: 1, gate: 1, tax: 1, rations: 1, alarm: 1, trade: 1, trainCancel: 1, hash: 1, food: 1, demolish: 1, firecow: 1, undo: 1, resupply: 1, repair: 1, release: 1, rally: 1, disband: 1 };
var MP_LIVE_MAX = 24; // سقف بازی جاری (0.232.0 — C-SRV-5): اتاق‌های state=1؛ تمام‌شده‌ها (۲) سهم ندارند.
function mpLiveCount() {
  var n = 0;
  for (var i = 0; i < ROOMS_MAX; i++) {
    if (mpRoomEmpty(i)) continue;
    if (state[mpROff(i) + 6] === 1) n++;
  }
  return n;
}
function mpRemoveConn(conn) {
  var m = mpConn.get(conn.id);
  hLastSubmit.delete(conn.id);
  mpInputAt.delete(conn.id);
  mpCreateAt.delete(conn.id);
  mpJoinAt.delete(conn.id);
  mpDesyncAt.delete(conn.id);
  if (!m) return;
  mpConn.delete(conn.id);
  var i = mpFindRoom(m.code);
  if (i < 0) return;
  try { conn.unsubscribe(mpTopic(i)); } catch (e) {}
  if (m.slot < 0) return; // تماشاگر: اسلاتی ندارد
  var so = mpSOff(i, m.slot);
  if (state[so] !== 1) return;
  var o = mpROff(i);
  if (state[o + 6] === 0) {
    // لابی: رفتار قبلی — اسلات پاک + roster تازه.
    mpClearSlot(i, m.slot);
    state[o + 5] = mpCount(i);
    mpMigrateHost(i);
    mpFreeIfEmpty(i);
    mpPublishRoster(i);
  } else {
    // بازی جاری/تمام‌شده (0.141.0): اسلات می‌ماند تا با توکن برگردد؛ فقط پرچم اتصال می‌افتد.
    state[so + 1] = 0;
    mpMigrateHost(i);
    try { pubsub.publish(mpTopic(i), JSON.stringify({ t: "gone", slot: m.slot })); } catch (e) {}
    mpPublishRoster(i);
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
    var noCow = msg.noCow === true; // گزینه اتاق «No Cow Throwing» (0.147.0 — §۱۲.۴)
    var strongWalls = msg.strongWalls === true; // گزینه اتاق «Strong Walls» (0.148.0 — §۱۴.۲)
    var noRush = msg.noRush === true;
    var noDogs = msg.noDogs === true; // گزینه اتاق «No Rush» (0.149.0 — §۱۴.۲/بند ۷۳۰)
    var seed = mpGenSeed();
    if (msg.seed !== undefined && msg.seed !== null && msg.seed !== "") {
      var req = typeof msg.seed === "number" ? msg.seed : parseInt(msg.seed, 10);
      if (req !== Math.floor(req) || req < 1 || req > 4294967295) return hErr("seed");
      seed = req >>> 0;
      if (seed === 0) seed = 1337;
    }
    if (mpConn.has(conn.id)) return hErr("inroom");
    mpSweep(mpNowMin()); // جاروی تنبل اتاق‌های مرده (0.141.0)
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
    state[o + 21] = noCow ? 1 : 0; state[o + 22] = strongWalls ? 1 : 0; state[o + 23] = noRush ? 1 : 0; state[o + 24] = noDogs ? 1 : 0;
    for (k = 0; k < MP_MAX; k++) mpClearSlot(i, k);
    var so = mpSOff(i, 0);
    state[so] = 1; state[so + 1] = 0;
    mpWriteName(i, 0, name);
    mpWriteLogo(i, 0, logo);
    var tok = mpGenToken(i); // مدرک مالکیت اسلات برای اتصال‌مجدد (0.141.0)
    mpTokenSet(i, 0, tok);
    mpMetaSet(i, { base: 1, start: 0, end: 0, active: mpNowMin(), win: 0 });
    conn.subscribe(mpTopic(i));
    mpConn.set(conn.id, { code: code, room: i, slot: 0 });
    mpPublishRoster(i);
    return hOk({ code: code, slot: 0, seed: seed, priv: pw !== null, noCow: noCow, strongWalls: strongWalls, noRush: noRush, noDogs: noDogs, token: tok });
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
    if (state[o + 6] !== 0) return hErr("started");
    if (!mpCheckPassword(i, msg.password)) { mpJoinAt.set(conn.id, now); return hErr("password"); }
    var s = mpFreeSlot(i);
    if (s < 0 || mpCount(i) >= state[o + 4]) return hErr("full");
    mpJoinAt.set(conn.id, now);
    var so = mpSOff(i, s);
    state[so] = 1; state[so + 1] = 0;
    mpWriteName(i, s, name);
    mpWriteLogo(i, s, logo);
    var jtok = mpGenToken(i); // (0.141.0)
    mpTokenSet(i, s, jtok);
    state[o + 5] = mpCount(i);
    conn.subscribe(mpTopic(i));
    mpConn.set(conn.id, { code: msg.code, room: i, slot: s });
    mpPublishRoster(i);
    return hOk({ slot: s, token: jtok, r: mpRoster(i) });
  },
  // آماده: {code, ready}
  mpReady: function (ev, data) {
    var conn = ev.conn, msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var m = mpConn.get(conn.id);
    if (!m || m.code !== msg.code || m.slot < 0) return hErr("noroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    if (state[o + 6] !== 0) return hErr("started");
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
    if (!m || m.code !== msg.code || m.slot < 0) return hErr("noroom");
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
    if (!m || m.code !== msg.code || m.slot < 0) return hErr("noroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    if (state[o + 6] !== 0) return hErr("started");
    if (mpLiveCount() >= MP_LIVE_MAX) return hErr("full"); // سقف بازی جاری (0.232.0 — C-SRV-5)
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
    mpTouch(i); // آغاز فعالیت (0.141.0)
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
    if (!m || m.code !== msg.code || m.slot < 0) return hErr("noroom");
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
    if (!mpSlotInputAllow(m.code, m.slot, now)) return hErr("slow");
    if (!mpTickOk(m.code, m.slot, msg.tick)) return hErr("old");
    if (!mpArgsOk(msg.kind, msg.args || {})) return hErr("args");
    var seq = mpRdU32(o + 8);
    if (seq >= 2000000000) return hErr("full");
    mpWrU32(o + 8, seq + 1);
    // لاگ حلقه‌ای برای اتصال‌مجدد/تماشا (0.141.0) + لمس فعالیت.
    mpLogAppend(i, seq, m.slot, mpKindId(msg.kind), msg.tick, JSON.stringify(msg.args || {}));
    mpTouch(i);
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
    mpSweep(mpNowMin());
    var out = [], i;
    for (i = 0; i < ROOMS_MAX && out.length < 20; i++) {
      if (mpRoomEmpty(i)) continue;
      var o = mpROff(i);
      if (state[o + 6] !== 0) continue;
      var n = mpCount(i);
      if (n >= state[o + 4]) continue;
      var r = mpRoster(i);
      out.push({ code: r.code, num: r.num, max: r.max, seed: r.seed, priv: r.priv, players: r.players });
    }
    return hOk({ rooms: out });
  },
  // اتصال‌مجدد بازیکن (0.141.0): {code, slot, token} — اسلاتِ حفظ‌شده پس از قطع
  // اتصال به اتصال تازه گره می‌خورد. فقط بازی جاری/تمام‌شده (پیش از شروع،
  // اسلات با قطع اتصال پاک می‌شود و باید دوباره join زد).
  mpRejoin: function (ev, data) {
    var conn = ev.conn, msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    if (!mpValidCode(msg.code)) return hErr("nocode");
    if (typeof msg.slot !== "number" || msg.slot !== Math.floor(msg.slot) || msg.slot < 0 || msg.slot >= MP_MAX) return hErr("noroom");
    if (mpConn.has(conn.id)) return hErr("inroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    if (state[o + 6] === 0) return hErr("lobby");
    var so = mpSOff(i, msg.slot);
    if (state[so] !== 1) return hErr("noroom");
    if (!mpTokenEq(i, msg.slot, msg.token)) return hErr("token");
    conn.subscribe(mpTopic(i));
    mpConn.set(conn.id, { code: msg.code, room: i, slot: msg.slot });
    state[so + 1] = 1;
    mpTouch(i);
    mpPublishRoster(i);
    try { pubsub.publish(mpTopic(i), JSON.stringify({ t: "back", slot: msg.slot })); } catch (e) {}
    var r = mpRoster(i);
    return hOk({ slot: msg.slot, seed: mpRdU32(o + 12), seq: mpRdU32(o + 8), priv: (state[o + 16] & 1) === 1, r: r });
  },
  // تماشا به‌عنوان میهمان (0.141.0): {code, password?} — بدون اسلات، فقط اشتراک
  // پیام‌ها (roster/inp/gone/back/left/end). اتاق خصوصی رمز می‌خواهد.
  mpWatch: function (ev, data) {
    var now = Date.now(), conn = ev.conn, msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var lastW = mpJoinAt.get(conn.id) || 0;
    if (now - lastW < 1500) return hErr("slow");
    if (!mpValidCode(msg.code)) return hErr("nocode");
    if (mpConn.has(conn.id)) return hErr("inroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    if (state[o + 6] === 0) return hErr("lobby");
    if (!mpCheckPassword(i, msg.password)) { mpJoinAt.set(conn.id, now); return hErr("password"); }
    conn.subscribe(mpTopic(i));
    mpConn.set(conn.id, { code: msg.code, room: i, slot: -1 });
    var r = mpRoster(i);
    return hOk({ seed: mpRdU32(o + 12), seq: mpRdU32(o + 8), priv: (state[o + 16] & 1) === 1, r: r });
  },
  // فهرست بازی‌های فعال سرور (0.141.0): جاری + تمام‌شده (تازه‌ترها؟ ترتیب اتاق)،
  // حداکثر ۲۰ — کد، ظرفیت، سید، خصوصی/عمومی، seq، پایان/برنده + بازیکنان با پرچم اتصال.
  mpLive: function () {
    mpSweep(mpNowMin());
    var out = [], i;
    for (i = 0; i < ROOMS_MAX && out.length < 20; i++) {
      if (mpRoomEmpty(i)) continue;
      var o = mpROff(i);
      if (state[o + 6] === 0) continue;
      var r = mpRoster(i);
      out.push({ code: r.code, num: r.num, max: r.max, seed: r.seed, priv: r.priv, seq: r.seq, over: r.over, winner: r.winner, players: r.players });
    }
    return hOk({ rooms: out });
  },
  // همگام‌سازی عقب‌ماندگی (0.141.0): {code, from} — ورودی‌های [from, next) تا سقف
  // ۳۰۰ ورودی. فراخوان باید بازیکن/تماشاگر همان اتاق باشد؛ tooOld یعنی لاگ جلو رفته.
  mpSync: function (ev, data) {
    var conn = ev.conn, msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var m = mpConn.get(conn.id);
    if (!m || m.code !== msg.code) return hErr("noroom");
    var from = msg.from;
    if (typeof from !== "number" || from !== Math.floor(from) || from < 1 || from > 2000000000) return hErr("bad");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    var res = mpLogRead(i, from, 300, mpRdU32(o + 8));
    if (res.tooOld) return hErr("tooOld");
    return hOk({ base: res.base, entries: res.list, next: res.next });
  },
  // گزارش ناهمگامی (0.231.0 — C-SRV-2): {code, tick, hash} — بازیکن وصلِ همان
  // اتاق، جاری. گزارش در حلقه حافظه (۲۰تای آخر) می‌ماند + پنجره لاگ برمی‌گردد
  // (سرور شخصی همان را در data/desync/ می‌نویسد؛ پرچنس حافظه‌محض است). سقف:
  // ۱ گزارش در ۳۰ ثانیه هر اتصال.
  mpDesync: function (ev, data) {
    var now = Date.now(), conn = ev.conn, msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    if (!mpDesyncTouch(conn.id, now)) return hErr("slow");
    var m = mpConn.get(conn.id);
    if (!m || m.code !== msg.code) return hErr("noroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    if (state[o + 6] !== 1) return hErr("nostart");
    var tick = msg.tick;
    if (typeof tick !== "number" || tick !== Math.floor(tick) || tick < 0 || tick > 20000000) return hErr("tick");
    if (typeof msg.hash !== "string" || msg.hash.length < 1 || msg.hash.length > 64) return hErr("hash");
    var next = mpRdU32(o + 8);
    var win = mpLogRead(i, 1, 300, next);
    var rep = { at: now, code: m.code, slot: m.slot, tick: tick, hash: msg.hash,
      base: win.base, next: win.next, entries: win.list.slice(-150) };
    mpDesyncRing.push(rep);
    if (mpDesyncRing.length > 20) mpDesyncRing.splice(0, mpDesyncRing.length - 20);
    return hOk(rep);
  },
  // اعلام پایان بازی (0.141.0): {code, winner} — هر بازیکنِ وصلِ همان اتاق که
  // پایان را دیده می‌تواند گزارش دهد (اولین گزارش ثبت می‌شود)؛ پیام end به همه.
  mpFinish: function (ev, data) {
    var conn = ev.conn, msg = null;
    try { msg = JSON.parse(data); } catch (e) { return hErr("bad"); }
    if (!msg || typeof msg !== "object") return hErr("bad");
    var m = mpConn.get(conn.id);
    if (!m || m.code !== msg.code || m.slot < 0) return hErr("noroom");
    var i = mpFindRoom(msg.code);
    if (i < 0) return hErr("nocode");
    var o = mpROff(i);
    if (state[o + 6] !== 1) return hErr("nostart");
    if (state[mpSOff(i, m.slot)] !== 1) return hErr("noroom");
    var w = msg.winner;
    if (typeof w !== "number" || w !== Math.floor(w) || w < -1 || w >= MP_MAX) return hErr("bad");
    if (w >= 0 && state[mpSOff(i, w)] !== 1) return hErr("bad");
    state[o + 6] = 2;
    state[mpMOff(i) + 16] = (w + 1) & 255;
    mpTouch(i);
    try { pubsub.publish(mpTopic(i), JSON.stringify({ t: "end", winner: w })); } catch (e) {}
    mpPublishRoster(i);
    return hOk("ok");
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
  // خروج (0.141.0: خروجِ عمدی وسط بازی = واگذاری — اسلات پاک می‌شود؛ با قطع
  // اتصال فرق دارد که اسلات را نگه می‌دارد. تماشاگر فقط لغو اشتراک می‌کند).
  mpLeave: function (ev, data) {
    var conn = ev.conn, msg = null;
    try { msg = JSON.parse(data || "{}"); } catch (e) { msg = {}; }
    var m = mpConn.get(conn.id);
    if (!m) return hOk("ok");
    var i = mpFindRoom(m.code);
    mpConn.delete(conn.id);
    if (i >= 0) {
      try { conn.unsubscribe(mpTopic(i)); } catch (e) {}
      if (m.slot < 0) return hOk("ok");
      var so = mpSOff(i, m.slot);
      if (state[so] === 1) {
        mpClearSlot(i, m.slot);
        var o = mpROff(i);
        state[o + 5] = mpCount(i);
        mpMigrateHost(i);
        if (state[o + 6] !== 0) {
          try { pubsub.publish(mpTopic(i), JSON.stringify({ t: "left", slot: m.slot })); } catch (e) {}
          mpPublishRoster(i);
          if (mpCount(i) === 0) mpZapRoom(i); // همه رفتند = اتاق مرده
        } else {
          mpFreeIfEmpty(i);
          mpPublishRoster(i);
        }
      }
    }
    return hOk("ok");
  }
};
