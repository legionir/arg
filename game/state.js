// وضعیت منطقی بازی v0: تیک، منابع، ساختمان‌ها، اشغال.
import { CONFIG } from "./config.js";

export function createState() {
  return {
    tick: 0,
    mapSeed: CONFIG.MAP_SEED, // سید نقشه (0.26.0) — زمین از همین ساخته می‌شود و در ذخیره می‌ماند
    paused: false,
    speed: 1,
    nextId: 1,
    resources: { wood: 120, food: 120, gold: 60, stone: 40, wheat: 20, flour: 0, hops: 0, beer: 0, iron: 0, swords: 0, bows: 0, meat: 0, cheese: 0, apples: 0, leather: 0 },
    buildings: [],
    occ: new Uint8Array(CONFIG.GRID_W * CONFIG.GRID_H),
    units: [],
    nextUnitId: 1,
    fx: [], // جلوه‌های نمایشی گذرا (0.46.0: قوس پرتاب منجنیق) — خارج sim/هش/ذخیره
    clouds: [], // ابرهای بیماری پرتاب گاو (0.142.0 — بند ۹۲/۲۱۴): [{c,r,left}] در sim/هش/ذخیره
    wave: 0,
    events: [],
    placed: 0,
    rejected: 0,
    workers: 4,
    workerCap: 4,
    freeWorkers: 4,
    popularity: 50,
    popTarget: 50,
    popDir: 0,
    tax: "none",
    rations: "normal",
    offFood: [], // غذاهای متوقف‌شده (فاز ۱ بند ۸۵): مصرف/تنوع نادیده‌شان می‌گیرد
    // پرچم‌های تجمع (0.166.0 — §9.1/بند 170): "owner:type" ← {c,r}؛ خالی = بی‌پرچم
    rally: {},
    eatAcc: 0,
    producedTotal: 0,
    consumedTotal: 0,
    shortageTotal: 0,
    defeated: false, // شکست با سقوط ستاد (0.19.0) — بازی را متوقف می‌کند
    victorious: false, // پیروزی با نابودی آخرین موج (0.22.0) — بازی را متوقف می‌کند
    // حریف AI سولو (0.42.0 — #۱۱): کانتینر جدا؛ غیرفعال = بازی بدون حریف.
    // serializable (بدون تابع) تا ذخیره/هش قطعی بمانند؛ تصادف از aiRand(seed,tick).
    ai: {
      active: false, seed: 0,
      resources: { wood: 0, food: 0, gold: 0, stone: 0, wheat: 0, flour: 0, hops: 0, beer: 0, iron: 0, swords: 0, bows: 0, meat: 0, cheese: 0, apples: 0, leather: 0 },
      workers: 0, workerCap: 0, freeWorkers: 0,
      phase: "build", buildIdx: 0, raidsSent: 0, nextThink: 0,
      keepId: null, baseC: 0, baseR: 0, dormant: false,
      difficulty: "normal", // درجه سختی حریف (0.50.0؛ غایب در قدیمی = معمولی)
    },
    // نقشه سفارشی (0.51.0 — #۲۲): نام نمایشی + وصله‌های زمین روی سید پایه؛
    // null یعنی زمین خالص سیدی. فقط سولو (MP همیشه سید میزبان است) و خارج هش.
    mapName: "",
    mapPatches: null,
    ident: "none", // هویت آغازین (0.153.0 — بند 104): none/crusader/arab؛ خارج هش
    // جریان RNG سریال‌شدنی sim (فاز ۰ بند ۲): عدد صحیح بدون‌علامت ۳۲بیتی که
    // rngNext در rng.js جلو می‌برد؛ null = هنوز مصرف نشده (نخستین draw از
    // mapSeed مشتق می‌شود). در ذخیره می‌ماند و در هش mix می‌شود.
    // Undo تک‌سطحی آخرین ساخت (0.146.0 — §۳.۱): {bld,owner} یا null؛
    // فقط place موفق در applyCmd می‌نشیند؛ قدیمی ندارد → null.
    undo: null,
    rng: null,
    // قوانین اتاق (0.147.0 — §۱۲.۴): فقط MP؛ سولو همیشه پیش‌فرض.
    // noCow = گزینه «No Cow Throwing» میزبان (پرتاب گاو بسته).
    // strongWalls = گزینه «Strong Walls» میزبان (0.148.0 — §۱۴.۲: فقط
    // ماشین محاصره به دیوار/برج/دروازه آسیب می‌زند).
    // noRush = گزینه «No Rush» میزبان (0.149.0 — §۱۴.۲/بند ۷۳۰: صلح
    // تایمردار آغاز بازی؛ حمله و ساخت نیرو ممنوع تا peaceUntil).
    rules: { noCow: false, strongWalls: false, noRush: false },
    // پایان صلح No Rush (تیک؛ 0.149.0): ۰ = بی‌صلح. در شروع MP با گزینه
    // روشن PEACE_TICKS می‌نشیند؛ قدیمی ندارد → ۰.
    peaceUntil: 0,
  };
}

export function cellIndex(w, c, r) {
  return r * w + c;
}

export function occupyFootprint(state, w, c, r, bw, bh) {
  for (let j = 0; j < bh; j++)
    for (let i = 0; i < bw; i++) state.occ[(r + j) * w + (c + i)] = 1;
}

export function isOccupied(state, w, c, r) {
  return state.occ[r * w + c] === 1;
}
