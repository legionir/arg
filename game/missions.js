// زیرساخت اسکریپت مأموریت (0.66.0 — انتخاب ۲-ج کاربر: فقط زیرساخت).
//
// قرارداد:
// - خالص و بدون import: sim هیچ‌چیز از مأموریت نمی‌داند و مأموریت هیچ‌چیز
//   از sim نمی‌داند. ورودی اجراکننده «اسنپ‌شات» ساده است
//   ({buildings, units, resources, tick, wave}) تا هر مصرف‌کننده‌ای (تست،
//   ابزار، محتوای آینده) بدون وابستگی به حلقه بازی از آن استفاده کند.
// - محتوا shipped است (0.225.0 — فاز ۲ کمپین، پایان پارک 0.61.0): کاتالوگ
//   `MISSIONS` از `data/missions.json` لود می‌شود؛ sim/state بی‌خبرند
//   (پیشرفت در campaign.js + localStorage؛ اجرا view-side در main.js). این ماژول فقط
//   الفبای نوشتن مأموریت (اسکیما + اعتبارسنجی + اجراکننده وضعیت) را می‌دهد.
// - هدف‌ها (objective): هر کدام {id یکتا، kind، پارامتر} با وضعیت
//   pending/done؛ run وقتی done است که همه هدف‌ها done باشند (وضعیت failed
//   نداریم — شکست مأموریت در محتوا تعریف می‌شود، نه زیرساخت).

export const MISSION_KINDS = ["haveBuilding", "haveUnit", "resource", "tick", "wave",
  "killAllEnemies", "population", "popularity", "captureGatehouse", "keepLordAlive"];

export const MISSION_FA = {
  OK: "معتبر",
  NOT_OBJECT: "سند مأموریت باید آبجکت باشد",
  BAD_KEY: "کلید مأموریت نامعتبر است",
  BAD_NAME: "نام فارسی لازم است",
  NO_OBJECTIVES: "دست‌کم یک هدف لازم است",
  BAD_ID: "شناسه هدف باید رشته یکتای ناتهی باشد",
  DUP_ID: "شناسه هدف تکراری است",
  BAD_KIND: "نوع هدف ناشناخته است",
  BAD_TYPE: "نوع ساختمان/یگان باید رشته ناتهی باشد",
  BAD_COUNT: "شمار باید صحیح مثبت باشد",
  BAD_RES: "منبع باید رشته ناتهی باشد",
  BAD_AMOUNT: "مقدار باید عدد نامنفی متناهی باشد",
  BAD_POP: "محبوبیت باید ۰ تا ۱۰۰ باشد",
  BAD_AT: "تیک هدف باید صحیح نامنفی باشد",
  BAD_WAVE: "شمار موج باید صحیح مثبت باشد",
};

// اعتبارسنجی سند مأموریت — آرایه خطا (خالی = معتبر)، الگوی schema.js.
export function validateMission(doc) {
  const errs = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return [MISSION_FA.NOT_OBJECT];
  }
  if (typeof doc.key !== "string" || !doc.key.length || doc.key.length > 32) {
    errs.push(`key: ${MISSION_FA.BAD_KEY}`);
  }
  if (typeof doc.name !== "string" || !doc.name.trim().length) {
    errs.push(`name: ${MISSION_FA.BAD_NAME}`);
  }
  if (!Array.isArray(doc.objectives) || !doc.objectives.length) {
    errs.push(MISSION_FA.NO_OBJECTIVES);
    return errs;
  }
  const seen = new Set();
  doc.objectives.forEach((o, i) => {
    const p = `objectives[${i}]`;
    if (!o || typeof o !== "object" || Array.isArray(o)) {
      errs.push(`${p}: باید آبجکت باشد`);
      return;
    }
    if (typeof o.id !== "string" || !o.id.length || o.id.length > 32) {
      errs.push(`${p}.id: ${MISSION_FA.BAD_ID}`);
    } else if (seen.has(o.id)) {
      errs.push(`${p}.id: ${MISSION_FA.DUP_ID} («${o.id}»)`);
    } else {
      seen.add(o.id);
    }
    if (!MISSION_KINDS.includes(o.kind)) {
      errs.push(`${p}.kind: ${MISSION_FA.BAD_KIND}`);
      return;
    }
    const isInt = Number.isInteger;
    if (o.kind === "haveBuilding" || o.kind === "haveUnit") {
      if (typeof o.type !== "string" || !o.type.length) errs.push(`${p}.type: ${MISSION_FA.BAD_TYPE}`);
      if (!isInt(o.count) || o.count < 1) errs.push(`${p}.count: ${MISSION_FA.BAD_COUNT}`);
    } else if (o.kind === "resource") {
      if (typeof o.res !== "string" || !o.res.length) errs.push(`${p}.res: ${MISSION_FA.BAD_RES}`);
      if (typeof o.amount !== "number" || !Number.isFinite(o.amount) || o.amount < 0) {
        errs.push(`${p}.amount: ${MISSION_FA.BAD_AMOUNT}`);
      }
    } else if (o.kind === "tick") {
      if (!isInt(o.at) || o.at < 0) errs.push(`${p}.at: ${MISSION_FA.BAD_AT}`);
    } else if (o.kind === "wave") {
      if (!isInt(o.n) || o.n < 1) errs.push(`${p}.n: ${MISSION_FA.BAD_WAVE}`);
    } else if (o.kind === "population") {
      if (!isInt(o.count) || o.count < 1) errs.push(`${p}.count: ${MISSION_FA.BAD_COUNT}`);
    } else if (o.kind === "popularity") {
      if (typeof o.amount !== "number" || !Number.isFinite(o.amount) || o.amount < 0 || o.amount > 100) {
        errs.push(`${p}.amount: ${MISSION_FA.BAD_POP}`);
      }
    } // killAllEnemies/captureGatehouse/keepLordAlive: بی‌پارامتر — kind کافی است.
  });
  return errs;
}

// اجرای تازه از روی سند معتبر (سند خراب = throw — caller اول validate کند).
export function createRun(doc) {
  const errs = validateMission(doc);
  if (errs.length) throw new Error("mission:" + errs[0]);
  const states = {};
  for (const o of doc.objectives) states[o.id] = "pending";
  return { key: doc.key, states, status: "active", doneTick: null };
}

function countAlive(list, type) {
  let n = 0;
  if (Array.isArray(list)) {
    for (const e of list) {
      if (!e || typeof e !== "object") continue;
      if (e.type !== type) continue;
      if (e.destroyed === true || e.dead === true) continue;
      n++;
    }
  }
  return n;
}

function objectiveDone(o, snap) {
  const s = snap || {};
  if (o.kind === "haveBuilding") return countAlive(s.buildings, o.type) >= o.count;
  if (o.kind === "haveUnit") return countAlive(s.units, o.type) >= o.count;
  if (o.kind === "resource") {
    const v = s.resources ? s.resources[o.res] : undefined;
    return typeof v === "number" && v >= o.amount;
  }
  if (o.kind === "tick") return (s.tick | 0) >= o.at;
  if (o.kind === "wave") return (s.wave | 0) >= o.n;
  if (o.kind === "killAllEnemies") {
    return !(Array.isArray(s.units) && s.units.some((u) => u && !u.dead && u.side === "enemy"));
  }
  if (o.kind === "population") return (s.population | 0) >= o.count;
  if (o.kind === "popularity") {
    return typeof s.popularity === "number" && s.popularity >= o.amount;
  }
  if (o.kind === "captureGatehouse") {
    // دروازه‌های ما مالکیت عوض می‌کنند (stepGateCapture)؛ دروازه ایستاده خودی = تصرف‌شده/در کنترل.
    return Array.isArray(s.buildings) && s.buildings.some((b) => b && !b.destroyed &&
      b.type === "gate" && (b.owner == null || b.owner === 0));
  }
  if (o.kind === "keepLordAlive") {
    return Array.isArray(s.units) && s.units.some((u) => u && !u.dead && u.type === "lord" &&
      (u.side == null || u.side !== "enemy"));
  }
  return false;
}

// پیشبرد run با یک اسنپ‌شات — شناسه‌های تازه-done را برمی‌گرداند (برای
// پیام آینده). run.done شد = status "done" + doneTick همان اسنپ‌شات.
export function updateRun(run, doc, snap) {
  const fresh = [];
  if (!run || run.status === "done") return fresh;
  for (const o of doc.objectives) {
    if (run.states[o.id] === "done") continue;
    if (objectiveDone(o, snap)) {
      run.states[o.id] = "done";
      fresh.push(o.id);
    }
  }
  if (Object.values(run.states).every((s) => s === "done")) {
    run.status = "done";
    run.doneTick = snap && Number.isInteger(snap.tick) ? snap.tick : 0;
  }
  return fresh;
}

// اسنپ‌شات از وضعیت زنده برای اجراکننده — پل گونه‌های جمعیتی به sim واقعی
// (0.180.0 — بند 1177): population = یگان‌های زنده + استخر کارگران (guess مستند)؛
// popularity مستقیم؛ بقیه همان فیلدهای وضعیت. خالص و فقط‌خواندنی (بدون سیم‌کشی در sim).
export function missionSnap(state) {
  const s = state || {};
  const units = Array.isArray(s.units) ? s.units : [];
  let live = 0;
  for (const u of units) if (u && !u.dead) live++;
  return {
    buildings: s.buildings || [],
    units,
    resources: s.resources || {},
    tick: s.tick | 0,
    wave: s.wave | 0,
    popularity: typeof s.popularity === "number" ? s.popularity : 0,
    population: live + (Number.isInteger(s.workers) && s.workers > 0 ? s.workers : 0),
  };
}

// ساعت مأموریت (0.182.0 — §2/بند 130): در تک‌نفره invasion تا هم‌حضوری
// Keep و Granary سالمِ خودی شروع نمی‌شود (در MP چنین قیدی نیست — از آغاز).
// خالص و view-side: بدون میدان state (بی‌اثر بر هش/ذخیره/ری‌پلی)؛ ۱۰ تیک = ۱ ثانیه.
export function clockReady(buildings, owner) {
  let keep = false, gran = false;
  for (const b of buildings || []) {
    if (!b || b.destroyed || (b.buildLeft || 0) > 0) continue;
    if ((b.owner == null ? 0 : b.owner) !== owner) continue;
    if (b.type === "keep") keep = true;
    else if (b.type === "granary") gran = true;
    if (keep && gran) return true;
  }
  return false;
}

// متن ساعت (mm:ss) از تیک جاری و تیک شروع. خالص.
export function clockText(tick, start) {
  const s = Math.max(0, Math.floor(((tick || 0) - (start || 0)) / 10));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return mm + ":" + ss;
}

// اعتبارسنجی فایل مأموریت‌ها — ریشه {missions:[...]} + هر سند (validateMission) +
// فراپارامترهای اجرا (seed/difficulty/personality/identity) + یکتایی کلید.
// خالص و بدون import: عضویت difficulty/personality/identity و ارجاع typeها در
// تست پین می‌شود (CONFIG/UNITS)، نه این‌جا — تا چرخه import پیش نیاید.
export function validateMissionFile(doc) {
  const errs = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return ["ریشه: آبجکت {missions} لازم است"];
  if (!Array.isArray(doc.missions) || doc.missions.length === 0) {
    return ["missions: آرایه ناتهی لازم است"];
  }
  const seen = new Set();
  doc.missions.forEach((m, i) => {
    const p = "missions[" + i + "]";
    for (const e of validateMission(m)) errs.push(p + ": " + e);
    if (m && typeof m === "object" && !Array.isArray(m)) {
      if (typeof m.key === "string" && m.key.length) {
        if (seen.has(m.key)) errs.push(p + ": کلید تکراری «" + m.key + "»");
        seen.add(m.key);
      }
      if (!Number.isInteger(m.seed) || m.seed < 1 || m.seed > 4294967295) errs.push(p + ": seed باید uint معتبر باشد");
      for (const k of ["difficulty", "personality", "identity"]) {
        if (typeof m[k] !== "string" || !m[k].length || m[k].length > 32) errs.push(p + "." + k + ": رشته ناتهی لازم است");
      }
      for (const k of ["nameEn", "brief", "briefEn"]) {
        if (typeof m[k] !== "string" || !m[k].trim().length || m[k].length > 500) errs.push(p + "." + k + ": متن نمایشی لازم است");
      }
    }
  });
  return errs;
}

// کاتالوگ shipped (0.225.0 — فاز ۲): تنها منبع حقیقت `data/missions.json`;
// بارگذاری هم‌زمان با import (همان مکانیزم data.js) + اعتبارسنجی fail-fast.
const missionFileUrl = new URL("../data/missions.json", import.meta.url);
let missionDoc;
try {
  const res = await fetch(missionFileUrl);
  if (!res.ok) throw new Error("HTTP " + res.status);
  missionDoc = await res.json();
} catch (e) {
  throw new Error("data/missions.json بارگذاری نشد (" + missionFileUrl + "): " + String((e && e.message) || e));
}
const missionFileErrs = validateMissionFile(missionDoc);
if (missionFileErrs.length) {
  throw new Error("data/missions.json نامعتبر: " + missionFileErrs.slice(0, 3).join(" | "));
}
export const MISSIONS = missionDoc.missions;
