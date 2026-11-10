// سوئیت ستاد و قفل ساخت (0.240.0 — C-CLN-17): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { placeKeep, validate, tryPlace, keepLocked, hasLiveKeep } from "../construction.js";
import { T_GRASS } from "../terrain.js";
import { housingCap, KEEP_HOUSING } from "../economy.js";
import { spawnUnit } from "../combat.js";
import { applyCmd } from "../sim.js";
import { deserializeJSON, serializeJSON, deserialize, SaveError } from "../persist.js";
import { newSoloFromSeed } from "../replay.js";
import { t } from "../i18n.js";
import { must, fresh, simC } from "./fixtures.js";
export function keepCases() {
  return [t_keep_start, t_keep_unique, t_keep_defeat, t_keep_save, t_keep_gates, t_keep_owner_isolation, t_keep_first];
}

function t_keep_gates() {
  const { W, H, terrain, state } = fresh();
  must(keepLocked(state, 0) === true, "بی‌ستاد: پرچم خالص هم قفل است");
  let r = applyCmd(state, terrain, { kind: "place", type: "hut", c: 1, r: 1 });
  must(!r.ok && r.reason === "NO_KEEP", `بی‌ستاد باید NO_KEEP بدهد، شد ${r.reason}`);
  must(placeKeep(state, terrain, W, H).ok, "ستاد باید قرار گیرد");
  must(keepLocked(state, 0) === false, "با ستاد زنده: پرچم خالص باز است");
  r = applyCmd(state, terrain, { kind: "place", type: "hut", c: 1, r: 1 });
  must(r.ok, `با ستاد باید بسازد، شد ${r.reason}`);
  r = applyCmd(state, terrain, { kind: "place", type: "keep", c: 10, r: 10 });
  must(!r.ok && r.reason === "INVALID", "ستاد از صف فرمان INVALID است");
  const keep = state.buildings.find((b) => b.type === "keep");
  keep.destroyed = true; keep.hp = 0; // سقوط جنگی
  r = applyCmd(state, terrain, { kind: "place", type: "hut", c: 5, r: 5 });
  must(!r.ok && r.reason === "NO_KEEP", "پس از سقوط ستاد دوباره قفل است");
  must(keepLocked(state, 0) === true, "پس از سقوط: پرچم خالص هم قفل است");
  // ایزولاسیون مالک در پرچم خالص: ستاد مالک ۱ فقط خودش را باز می‌کند.
  const f2 = fresh();
  f2.state.buildings.push({ id: 7, type: "keep", c: 1, r: 1, w: 4, h: 4, hp: 500, maxHp: 500, owner: 1 });
  must(keepLocked(f2.state, 1) === false && keepLocked(f2.state, 0) === true, "پرچم باید برش مالک باشد");
  return { name: "ستاد الزامی لایه فرمان", pass: true, detail: "NO_KEEP + بازگشایی + قفل‌مجدد + پرچم خالص" };
}

function t_keep_owner_isolation() {
  const { state } = fresh();
  must(!hasLiveKeep(state, 0) && !hasLiveKeep(state, 9), "بی‌ستاد = false");
  state.buildings.push({ id: 7, type: "keep", c: 1, r: 1, w: 4, h: 4, hp: 500, maxHp: 500, owner: 1 });
  must(hasLiveKeep(state, 1) && !hasLiveKeep(state, 0), "ستاد مالک ۱ فقط خودش را باز می‌کند");
  state.buildings[0].destroyed = true;
  must(!hasLiveKeep(state, 1), "ویرانه ستاد حساب نیست");
  return { name: "ایزولاسیون ستاد مالک", pass: true, detail: "خالص بدون زمین" };
}

function t_keep_first() {
  const { state } = newSoloFromSeed(CONFIG.MAP_SEED);
  must(state.buildings.length > 0 && state.buildings[0].type === "keep", "نخستین بنا ستاد است");
  must(!state.buildings[0].destroyed && (state.buildings[0].owner == null ? 0 : state.buildings[0].owner) === 0, "ستاد بازیکن زنده است");
  must(hasLiveKeep(state, 0), "ستاد زنده = در دسترس");
  return { name: "ستاد نخستین بنا", pass: true, detail: "ترتیب آغازین" };
}

function t_keep_start() {
  const { W, H, terrain, state } = fresh();
  const before = { ...state.resources };
  const res = placeKeep(state, terrain, W, H);
  must(res.ok && res.building, "ستاد باید ساخته شود");
  const keeps = state.buildings.filter((b) => b.type === "keep");
  must(keeps.length === 1, "دقیقاً یک ستاد باید باشد");
  const k = keeps[0];
  must(k.w === 4 && k.h === 4, "ستاد باید ۴×۴ باشد");
  must(k.hp === CONFIG.BUILDINGS.keep.hp, "جان ستاد باید کامل باشد");
  must(state.resources.wood === before.wood && state.resources.food === before.food &&
    state.resources.gold === before.gold && state.resources.stone === before.stone,
    "ستاد آغازین باید رایگان باشد");
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      must(terrain[(k.r + j) * W + (k.c + i)] === T_GRASS,
        `زیر ستاد (${k.c + i},${k.r + j}) باید چمن باشد`);
      must(state.occ[(k.r + j) * W + (k.c + i)] === 1, "ردپای ستاد باید اشغال باشد");
    }
  }
  must(housingCap(state) === 4 + KEEP_HOUSING, `سقف مسکن باید ${4 + KEEP_HOUSING} باشد`);
  must(state.defeated === false, "بازی تازه نباید شکست داشته باشد");
  return { name: "ستاد آغازین", pass: true, detail: `(${k.c},${k.r}) رایگان + سقف ${4 + KEEP_HOUSING}` };
}

function t_keep_unique() {
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد اول باید ساخته شود");
  const again = placeKeep(state, terrain, W, H);
  must(!again.ok && again.reason === "UNIQUE", `ستاد دوم باید UNIQUE باشد، شد ${again.reason}`);
  let spot = null;
  outer:
  for (let r = 0; r <= H - 4; r++) {
    for (let c = 0; c <= W - 4; c++) {
      let free = true;
      for (let j = 0; j < 4 && free; j++) {
        for (let i = 0; i < 4 && free; i++) {
          if (terrain[(r + j) * W + (c + i)] !== T_GRASS || state.occ[(r + j) * W + (c + i)] === 1) free = false;
        }
      }
      if (free) { spot = [c, r]; break outer; }
    }
  }
  must(spot, "باید جای ۴×۴ آزاد دیگری روی نقشه باشد");
  const v = validate(state, terrain, W, H, spot[0], spot[1], CONFIG.BUILDINGS.keep);
  must(!v.ok && v.reason === "UNIQUE", `زمین آزاد هم باید UNIQUE بدهد، داد ${v.reason}`);
  return { name: "یکتایی ستاد", pass: true, detail: "تکرار + زمین آزاد = UNIQUE" };
}

function t_keep_defeat() {
  const { W, H, terrain, state } = fresh();
  const h = tryPlace(state, terrain, W, H, 1, 1, CONFIG.BUILDINGS.hut);
  must(h.ok, "کلبه شاهد باید ساخته شود");
  spawnUnit(state, "swordsman", 1.5, 3.5); // جنوب کلبه، محوطه شروع (چمن)
  let t = 0;
  while (state.buildings.some((b) => b.type === "hut") && t < 600) { simC(state, terrain, 1); t++; }
  must(!state.buildings.some((b) => b.type === "hut"), "کلبه باید ویران شود");
  must(state.defeated === false, "ویرانی کلبه نباید شکست باشد");
  const k = placeKeep(state, terrain, W, H);
  must(k.ok, "ستاد باید ساخته شود");
  const keep = k.building;
  const cx = keep.c + keep.w / 2, cr = keep.r + keep.h / 2;
  const ring = [];
  for (let dr = -1; dr <= keep.h; dr++) {
    for (let dc = -1; dc <= keep.w; dc++) {
      if (dr !== -1 && dr !== keep.h && dc !== -1 && dc !== keep.w) continue;
      const c = keep.c + dc, r = keep.r + dr;
      if (c < 0 || r < 0 || c >= W || r >= H) continue;
      if (state.occ[r * W + c] === 1) continue;
      if (terrain[r * W + c] !== T_GRASS) continue;
      ring.push([c, r, Math.hypot(c + 0.5 - cx, r + 0.5 - cr)]);
    }
  }
  ring.sort((a, b) => a[2] - b[2]); // نزدیک‌ترین همسایه‌ها اول (متعامد = در برد)
  must(ring.length >= 3, "ستاد باید دست‌کم ۳ همسایه چمن آزاد داشته باشد");
  for (const [c, r] of ring.slice(0, 3)) spawnUnit(state, "swordsman", c + 0.5, r + 0.5);
  t = 0;
  while (state.buildings.some((b) => b.type === "keep") && t < 1500) { simC(state, terrain, 1); t++; }
  must(!state.buildings.some((b) => b.type === "keep"), "ستاد باید ویران شود");
  must(state.defeated === true, "سقوط ستاد باید شکست باشد");
  must(state.paused === true, "شکست باید بازی را متوقف کند");
  must(state.events.some((e) => e.includes("ارگ سقوط کرد")), "رویداد سقوط باید ثبت شود");
  return { name: "سقوط ستاد = شکست", pass: true, detail: `ویرانی در ${t} تیک + توقف` };
}

function t_keep_save() {
  const { W, H, terrain, state } = fresh();
  const k = placeKeep(state, terrain, W, H);
  must(k.ok, "ستاد باید ساخته شود");
  k.building.hp -= 10; // آسیب‌دیده
  state.defeated = true;
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.defeated === true, "پرچم شکست باید حفظ شود");
  const lk = loaded.buildings.find((b) => b.type === "keep");
  must(!!lk && lk.hp === k.building.hp && lk.c === k.building.c && lk.r === k.building.r,
    "ستاد باید با جان و جای یکسان بماند");
  // تحمل ذخیره قدیمی: بدون defeated و بدون ستاد
  const legacy = JSON.parse(serializeJSON(state));
  delete legacy.defeated;
  legacy.buildings = legacy.buildings.filter((b) => b.type !== "keep");
  const old = deserialize(legacy);
  must(old.defeated === false, "defeated غایب باید false شود");
  must(!old.buildings.some((b) => b.type === "keep"), "ذخیره بدون ستاد باید بارگذاری شود");
  // رد دست‌کاری
  const bad = JSON.parse(serializeJSON(state));
  bad.defeated = "yes";
  let threw = false;
  try { deserialize(bad); } catch (e) { threw = e instanceof SaveError; }
  must(threw, "defeated غیربولی باید رد شود");
  return { name: "ذخیره ستاد و شکست", pass: true, detail: "حفظ + تحمل قدیمی + رد خراب" };
}
