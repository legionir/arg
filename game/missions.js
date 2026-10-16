// زیرساخت اسکریپت مأموریت (0.66.0 — انتخاب ۲-ج کاربر: فقط زیرساخت).
//
// قرارداد:
// - خالص و بدون import: sim هیچ‌چیز از مأموریت نمی‌داند و مأموریت هیچ‌چیز
//   از sim نمی‌داند. ورودی اجراکننده «اسنپ‌شات» ساده است
//   ({buildings, units, resources, tick, wave}) تا هر مصرف‌کننده‌ای (تست،
//   ابزار، محتوای آینده) بدون وابستگی به حلقه بازی از آن استفاده کند.
// - محتوا پارک است (تصمیم 0.61.0: TEMP می‌ماند، کمپین پارک): کاتالوگ
//   `MISSIONS` خالی است و هیچ سیم‌کشی در main.js/sim.js نیست. این ماژول فقط
//   الفبای نوشتن مأموریت (اسکیما + اعتبارسنجی + اجراکننده وضعیت) را می‌دهد.
// - هدف‌ها (objective): هر کدام {id یکتا، kind، پارامتر} با وضعیت
//   pending/done؛ run وقتی done است که همه هدف‌ها done باشند (وضعیت failed
//   نداریم — شکست مأموریت در محتوا تعریف می‌شود، نه زیرساخت).

export const MISSION_KINDS = ["haveBuilding", "haveUnit", "resource", "tick", "wave"];

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
    }
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

// کاتالوگ مأموریت‌های shipped — عمداً خالی (محتوا پارک، تصمیم 0.61.0).
// مأموریت آینده همین‌جا با سند معتبر (validateMission) اضافه می‌شود.
export const MISSIONS = [];
