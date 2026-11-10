// صف آموزش (0.242.0 — C-CLN-22): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { queueHire, cancelTrain, stepTraining } from "../train.js";
import { createQueue, enqueueCmd, stepSim } from "../sim.js";
import { stateHash } from "../mp.js";
import { serializeJSON, deserialize } from "../persist.js";
import { UNITS, validateHire, hasCathedral } from "../combat.js";
import { tryPlace } from "../construction.js";
import { withLang } from "../i18n.js";
import { must, fresh, completeAll, grassNear, needBarracks } from "./fixtures.js";
export function trainCases() {
  return [t_train_queue, t_train_cancel, t_train_full, t_train_save, t_blackmonk_hire];
}

function t_train_queue() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const spot = grassNear(terrain, state.occ, W, H, 20, 20);
  must(spot, "جای تحویل باید باشد");
  const f0 = state.resources.food, g0 = state.resources.gold, s0 = state.resources.swords;
  const h0 = stateHash(state);
  const q = createQueue();
  must(enqueueCmd(q, { kind: "hire", type: "soldier", c: spot[0], r: spot[1] }, state.tick).ok, "صف hire");
  stepSim(state, terrain, 1, q);
  const rax = state.buildings.find((b) => b.type === "barracks");
  must(rax && rax.train && rax.train.length === 1, "سفارش باید ته صف باشد");
  must(state.units.length === 0, "تحویل فوری نباید باشد");
  must(state.resources.food === f0 - 40 && state.resources.gold === g0 - 25, "کسر اتمی غذا/طلا همان لحظه");
  must(state.resources.swords === s0 - 1, "کسر اتمی شمشیر همان لحظه");
  must(stateHash(state) !== h0, "هش باید صف غیرخالی را ببیند");
  stepSim(state, terrain, 49, q); // مجموع ۵۰ = trainTicks سرباز
  const me = state.units.find((u) => u.type === "soldier");
  must(me, "پس از ۵۰ تیک سرباز باید تحویل شود");
  must(rax.train.length === 0, "صف باید خالی شود");
  return { name: "صف آموزش و تحویل", pass: true, detail: "کسر اتمی + تحویل در ۵۰ تیک + هش" };
}

function t_train_cancel() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const spot = grassNear(terrain, state.occ, W, H, 20, 20);
  must(spot, "جای تحویل باید باشد");
  const f0 = state.resources.food, g0 = state.resources.gold, b0 = state.resources.bows;
  const r = queueHire(state, terrain, W, H, spot[0], spot[1], "bowman", 0);
  must(r.ok, "سفارش مستقیم باید موفق باشد");
  const q = createQueue();
  must(enqueueCmd(q, { kind: "trainCancel", bld: r.bld, idx: 0 }, state.tick).ok, "صف لغو");
  stepSim(state, terrain, 1, q);
  const rax = state.buildings.find((b) => b.type === "barracks");
  must(rax.train.length === 0, "صف باید خالی شود");
  must(state.units.length === 0, "یگانی نباید تحویل شده باشد");
  must(state.resources.food === f0 && state.resources.gold === g0 && state.resources.bows === b0,
    `بازپرداخت کامل: غذا ${state.resources.food}/${f0}، طلا ${state.resources.gold}/${g0}، کمان ${state.resources.bows}/${b0}`);
  const bad = cancelTrain(state, r.bld, 0, 0);
  must(!bad.ok, "لغو اندیس ناموجود باید رد شود");
  return { name: "لغو آموزش با بازپرداخت", pass: true, detail: "بازپرداخت کامل + رد لغو بد" };
}

function t_train_full() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  state.resources.food = 500; state.resources.gold = 500;
  const spot = grassNear(terrain, state.occ, W, H, 20, 20);
  must(spot, "جای تحویل باید باشد");
  for (let i = 0; i < CONFIG.TRAIN.queueCap; i++) {
    const r = queueHire(state, terrain, W, H, spot[0], spot[1], "spearman", 0);
    must(r.ok, `سفارش ${i + 1} باید موفق باشد`);
  }
  const full = queueHire(state, terrain, W, H, spot[0], spot[1], "spearman", 0);
  must(!full.ok && full.reason === "QUEUE_FULL", `ششمی باید QUEUE_FULL بدهد، داد ${full.reason}`);
  return { name: "سقف صف آموزش", pass: true, detail: `${CONFIG.TRAIN.queueCap} سفارش + رد ششمی` };
}

function t_train_save() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  const spot = grassNear(terrain, state.occ, W, H, 20, 20);
  must(spot, "جای تحویل باید باشد");
  must(queueHire(state, terrain, W, H, spot[0], spot[1], "bowman", 0).ok, "سفارش کماندار");
  const q = createQueue();
  stepSim(state, terrain, 10, q); // left باید ۳۰ شود
  const doc = JSON.parse(serializeJSON(state));
  const raxDoc = doc.buildings.find((b) => b.type === "barracks");
  must(raxDoc.train && raxDoc.train.length === 1 && raxDoc.train[0].left === 30, `صف باید با left=۳۰ بماند، شد ${raxDoc.train && raxDoc.train[0].left}`);
  const loaded = deserialize(doc);
  const rax = loaded.buildings.find((b) => b.type === "barracks");
  must(rax.train.length === 1 && rax.train[0].type === "bowman", "صف پس از load باید بماند");
  const q2 = createQueue();
  stepSim(loaded, terrain, 30, q2);
  must(loaded.units.some((u) => u.type === "bowman"), "پس از load تحویل باید ادامه یابد");
  delete raxDoc.train;
  const old = deserialize(doc);
  must(old.buildings.find((b) => b.type === "barracks").train.length === 0, "قدیمی بدون train = صف خالی");
  return { name: "ذخیره صف آموزش", pass: true, detail: "left=۳۰ + ادامه پس از load + سازگاری" };
}

function t_blackmonk_hire() {
  const def = UNITS.blackmonk;
  must(def && def.side === "player", "راهب باید یگان خودی باشد");
  must(def.building === "cathedral" && def.requires === "cathedral", "پیش‌نیاز باید کلیسای جامع باشد");
  must(def.goldCost === 60 && def.cost.gold === 60 && def.cost.food === 40, "هزینه باید ۴۰/۶۰ باشد");
  must(def.hp === 70 && def.trainTicks === 80, "جان/آموزش باید ۷۰/۸۰ باشد");
  must(def.nameKey === "game.unit.blackmonk.name", "کلید نام باید الگو را بگیرد");
  const { W, H, terrain, state } = fresh();
  state.resources.gold = 2000; // کلیسای جامع ۱۰۰۰ طلا (هزینه مرجع 0.147.0)
  const spot = grassNear(terrain, state.occ, W, H, 20, 20);
  must(spot, "جای تحویل باید باشد");
  const v0 = validateHire(state, terrain, W, H, spot[0], spot[1], "blackmonk", 0);
  must(!v0.ok && v0.reason === "NO_CATHEDRAL", "بدون جامع باید NO_CATHEDRAL بدهد");
  must(hasCathedral(state, 0) === false, "جامعی نباید باشد");
  const ca = tryPlace(state, terrain, W, H, 5, 1, CONFIG.BUILDINGS.cathedral);
  must(ca.ok, "کلیسای جامع باید ساخته شود");
  completeAll(state);
  must(hasCathedral(state, 0) === true, "جامع سالم خودی باید شمرده شود");
  const f0 = state.resources.food, g0 = state.resources.gold;
  const q = queueHire(state, terrain, W, H, spot[0], spot[1], "blackmonk", 0);
  must(q.ok, "سفارش راهب باید موفق باشد");
  must(q.bld === ca.building.id, "میزبان صف باید همان جامع باشد");
  must(state.units.length === 0, "تحویل فوری نباید باشد");
  must(state.resources.food === f0 - 40 && state.resources.gold === g0 - 60, "کسر اتمی همان لحظه");
  for (let i = 0; i < 80; i++) stepTraining(state, terrain);
  const me = state.units.find((u) => u.type === "blackmonk");
  must(me && me.hp === 70, "پس از ۸۰ تیک راهب باید با جان ۷۰ تحویل شود");
  must(ca.building.train.length === 0, "صف جامع باید خالی شود");
  // جامع حریف برای من کار نمی‌کند.
  state.resources.stone = 100; // سنگ اولیه صرف جامع خودی شده است
  state.resources.gold = 2000; // جامع حریف هم ۱۰۰۰ طلا می‌خواهد (هزینه مرجع 0.147.0)
  const e = tryPlace(state, terrain, W, H, 8, 1, CONFIG.BUILDINGS.cathedral, 1);
  must(e.ok, "جامع حریف ساخته می‌شود");
  state.resources.gold = 100; // طلای اولیه صرف صف راهب شده است
  const v1 = validateHire(state, terrain, W, H, spot[0], spot[1], "blackmonk", 0);
  must(v1.ok, "جامع خودی هنوز هست");
  state.buildings.find((b) => b.id === ca.building.id).destroyed = true;
  must(hasCathedral(state, 0) === false, "ویرانه جامع نباید شمرده شود");
  const v2 = validateHire(state, terrain, W, H, spot[0], spot[1], "blackmonk", 0);
  must(!v2.ok && v2.reason === "NO_CATHEDRAL", "با ویرانی جامع خودی باید رد شود");
  withLang("en", () => {
    must(UNITS.blackmonk.name === "Warrior Dervish", "نام en راهب");
  });
  return { name: "راهب جنگجو", pass: true, detail: "قفل جامع + صف ۸۰تیک + حریف/ویرانه" };
}
