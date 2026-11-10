// دیوار خطی (0.242.0 — C-CLN-23): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { placeKeep, tryPlace } from "../construction.js";
import { wallLineTiles, isLineDragType, WALL_LINE_MAX } from "../wallline.js";
import { createQueue, enqueueCmd, stepSim, queueLen } from "../sim.js";
import { createRenderer } from "../render.js";
import { t } from "../i18n.js";
import { must, fresh } from "./fixtures.js";
function t_wallline_horiz() {
  const line = wallLineTiles(2, 3, 6, 3);
  const key = line.map((t) => t.x + "," + t.y).join(" ");
  must(key === "2,3 3,3 4,3 5,3 6,3", `خط افقی باید ۵ تایل پیوسته باشد، شد ${key}`);
  const rev = wallLineTiles(6, 3, 2, 3).map((t) => t.x + "," + t.y).join(" ");
  must(rev === "6,3 5,3 4,3 3,3 2,3", `ترتیب باید جهت درگ باشد، شد ${rev}`);
  return { name: "خط افقی دیوار", pass: true, detail: key };
}

function t_wallline_diag() {
  const line = wallLineTiles(0, 0, 4, 4);
  must(line.length === 5, `قطر باید ۵ تایل باشد، شد ${line.length}`);
  must(line[0].x === 0 && line[0].y === 0, "شروع باید سر درگ باشد");
  must(line[4].x === 4 && line[4].y === 4, "پایان باید ته درگ باشد");
  for (let i = 1; i < line.length; i++) {
    const dx = Math.abs(line[i].x - line[i - 1].x), dy = Math.abs(line[i].y - line[i - 1].y);
    must(dx <= 1 && dy <= 1 && (dx + dy) > 0, `گام ${i} باید ۸-پیوسته باشد`);
  }
  const one = wallLineTiles(7, 7, 7, 7);
  must(one.length === 1 && one[0].x === 7 && one[0].y === 7, "تک‌نقطه = همان یک تایل");
  return { name: "قطر پیوسته دیوار", pass: true, detail: "۵ تایل ۸-پیوسته + تک‌نقطه" };
}

function t_wallline_cap_gate() {
  must(isLineDragType("wall") === true, "دیوار باید مال خط باشد");
  must(!isLineDragType("tower") && !isLineDragType("gate") && !isLineDragType(null), "برج/دروازه/خالی مال خط نیستند");
  must(WALL_LINE_MAX === 32, "سقف ۳۲ است");
  const long = wallLineTiles(0, 5, 200, 5);
  must(long.length === 32, `خط بلند باید در ۳۲ ببرد، شد ${long.length}`);
  must(long[0].x === 0 && long[31].x === 31, "برش باید از سر درگ باشد");
  return { name: "سقف و دروازه خط", pass: true, detail: "۳۲ + فقط wall" };
}

function t_wallline_queue() {
  // خط ۶تایی چسبیده به کلبه: هر تایل یک place جدا از صف → ۶ دیوار زنجیره‌ای
  // (هر تایل روی قبلی لنگر می‌گیرد؛ همان معنای ۶ تک‌کلیک).
  const { W, H, terrain, state } = fresh();
  must(placeKeep(state, terrain, W, H).ok, "ستاد پیش‌شرط فرمان است (بند ۱۲)");
  const hut = tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.hut);
  must(hut.ok, `کلبه لنگر باید ساخته شود، شد ${hut.reason}`);
  const tiles = wallLineTiles(3, 1, 3, 6);
  must(tiles.length === 6, `خط باید ۶ تایل باشد، شد ${tiles.length}`);
  const q = createQueue();
  const p0 = state.placed;
  for (const t of tiles) {
    must(enqueueCmd(q, { kind: "place", type: "wall", c: t.x, r: t.y }, state.tick).ok, "صف تایل خط");
  }
  stepSim(state, terrain, 8, q);
  must(queueLen(q) === 0, "صف خط باید خالی شود");
  const walls = state.buildings.filter((b) => b.type === "wall" && !b.destroyed);
  must(walls.length === 6, `باید ۶ دیوار ساخته شود، شد ${walls.length}`);
  must(state.placed === p0 + 6, `صف خط باید ۶+ به شمارنده بدهد (کلبه مستقیم شمرده نمی‌شود)، شد ${state.placed - p0}`);
  return { name: "صف خط دیوار", pass: true, detail: "۶ دیوار زنجیره‌ای از صف" };
}

function t_wallline_preview() {
  // رسم قاب با خط نباید خطا بدهد (گوست تکی خاموش، خط رنگی روشن).
  const { W, H, terrain, state } = fresh();
  tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.hut);
  const cv = document.createElement("canvas");
  document.body.appendChild(cv);
  try {
    const R = createRenderer(cv);
    R.resize();
    R.fit();
    const line = wallLineTiles(3, 1, 3, 6).map((t) => ({ c: t.x, r: t.y, ok: true }));
    R.draw(state, terrain, null, CONFIG.BUILDINGS.wall, [], line);
    const bad = wallLineTiles(3, 1, 3, 6).map((t) => ({ c: t.x, r: t.y, ok: false }));
    R.draw(state, terrain, null, CONFIG.BUILDINGS.wall, [], bad);
  } finally {
    cv.remove();
  }
  return { name: "پیش‌نمایش خط", pass: true, detail: "رسم قاب سبز/قرمز" };
}

export function wallCases() {
  return [t_wallline_horiz, t_wallline_diag, t_wallline_cap_gate, t_wallline_queue, t_wallline_preview];
}
