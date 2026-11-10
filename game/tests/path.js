// صف مسیریابی (0.243.0 — C-CLN-25): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { T_GRASS, makeTerrain, terrainPins } from "../terrain.js";
import { findPath, nearestWalkable, isCellWalkable } from "../pathfind.js";
import { spawnUnit, hireUnit, stepCombat } from "../combat.js";
import { stepEconomy } from "../economy.js";
import { serializeJSON, deserializeJSON } from "../persist.js";
import { mpClearSpawns } from "../mp.js";
import { must, fresh, grassNear, needBarracks, simC, blankMap } from "./fixtures.js";

// --- CORE-001: مسیریابی A* ---


function t_path_open() {
  const W = 8, H = 8;
  const { terrain, occ } = blankMap(W, H);
  const p = findPath(terrain, occ, W, H, 0, 0, 4, 0);
  must(p && p.length === 5, `مسیر باز باید ۵ خانه باشد، هست ${p && p.length}`);
  must(p[0][0] === 0 && p[4][0] === 4, "سر و ته مسیر باید درست باشد");
  for (let i = 1; i < p.length; i++) {
    const d = Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]);
    must(d === 1, "گام‌ها باید چهارجهته باشند");
  }
  const q = findPath(terrain, occ, W, H, 0, 0, 4, 0);
  must(JSON.stringify(p) === JSON.stringify(q), "مسیر باید قطعی باشد");
  return { name: "مسیر باز", pass: true, detail: "طول ۵، قطعی" };
}

function t_path_detour() {
  const W = 7, H = 7;
  const { terrain, occ } = blankMap(W, H);
  // دیوار در ستون ۲ به‌جز شکاف (۲،۲)
  for (let r = 0; r < H; r++) {
    if (r !== 2) occ[r * W + 2] = 1;
  }
  const p = findPath(terrain, occ, W, H, 0, 0, 4, 0);
  must(p, "مسیر از شکاف باید پیدا شود");
  must(p.some(([c, r]) => c === 2 && r === 2), "مسیر باید از شکاف (۲،۲) بگذرد");
  must(p.length > 5, `مسیر انحرافی باید بلندتر از منهتن باشد، هست ${p.length}`);
  return { name: "انحراف از شکاف", pass: true, detail: `طول ${p.length} از شکاف` };
}

function t_path_unreachable() {
  const W = 5, H = 5;
  const { terrain, occ } = blankMap(W, H);
  occ[2 * W + 2] = 1; // هدف اشغال
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    occ[(2 + dr) * W + (2 + dc)] = 1; // حلقه محاصره
  }
  const p = findPath(terrain, occ, W, H, 0, 0, 2, 2);
  must(p === null, "هدف محاصره‌شده باید null بدهد");
  const g = nearestWalkable(terrain, occ, W, H, 2, 2, 4);
  must(g, "باید نزدیک‌ترین همسایه باز پیدا شود");
  must(isCellWalkable(terrain, occ, W, H, g[0], g[1]), "همسایه پیشنهادی باید باز باشد");
  return { name: "هدف ناممکن", pass: true, detail: `null + همسایه (${g})` };
}

function t_path_around_rocks() {
  // سناریوی واقعی در پارتیشن غربی: خط مستقیم از توده سنگ می‌گذرد —
  // لغزش خطی قدیمی اینجا گیر می‌کند، A* دور می‌زند (نقاط نسبی به توده سنگ).
  const run = () => {
    const { W, H, terrain, state } = fresh();
    const pins = terrainPins(W, H);
    const R0 = pins.rocks[0];
    // هر دو چمن‌اند (نزدیک‌ترین چمن به دو سوی توده سنگ شمال‌غربی)
    const A = grassNear(terrain, null, W, H, R0[0] - 6, R0[1] - 5);
    const B = grassNear(terrain, null, W, H, R0[0] + 6, R0[1] + 4);
    must(A && B, "نقاط دو سوی سنگ باید چمن باشند");
    must(terrain[A[1] * W + A[0]] === T_GRASS, "نقطه غرب باید چمن باشد");
    must(terrain[B[1] * W + B[0]] === T_GRASS, "نقطه شرق باید چمن باشد");
    spawnUnit(state, "soldier", A[0] + 0.5, A[1] + 0.5);
    spawnUnit(state, "swordsman", B[0] + 0.5, B[1] + 0.5);
    let dmgTick = -1;
    for (let i = 0; i < 800; i++) {
      simC(state, terrain, 1);
      const foe = state.units.find((u) => u.type === "swordsman");
      const me = state.units.find((u) => u.type === "soldier");
      if ((foe && foe.hp < 60) || (me && me.hp < 60)) { dmgTick = i + 1; break; }
      if (!foe || !me) { dmgTick = i + 1; break; } // یکی کشته شد = رسیدند
    }
    return dmgTick;
  };
  const a = run(), b = run();
  must(a > 0, "واحدها باید در ۸۰۰ تیک دور سنگ به هم برسند و بجنگند");
  must(a === b, "زمان رسیدن باید قطعی باشد");
  return { name: "دور زدن سنگ", pass: true, detail: `نخستین ضربه تیک ${a}` };
}

function t_path_after_load() {
  const { W, H, terrain, state } = fresh();
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  spawnUnit(state, "swordsman", 12.5, 8.5);
  simC(state, terrain, 5); // مسیر محاسبه شده ولی هنوز در راه‌اند (فاصله ~۷)
  const loaded = deserializeJSON(serializeJSON(state));
  must(loaded.units[0].path == null, "مسیر نباید ذخیره شود (بازمحاسبه پس از load)");
  const snap = loaded.units.map((u) => [u.x, u.r, u.hp]);
  for (let i = 0; i < 60; i++) { loaded.tick++; stepEconomy(loaded); stepCombat(loaded, terrain); }
  const progressed = loaded.units.some((u, i) =>
    Math.abs(u.x - snap[i][0]) > 1e-9 || Math.abs(u.r - snap[i][1]) > 1e-9 || u.hp < snap[i][2]);
  must(progressed, "واحد باید پس از load حرکت یا نبرد را ادامه دهد");
  return { name: "مسیر پس از بارگذاری", pass: true, detail: "بازمحاسبه موفق" };
}

function t_map_connected4() {
  // نقشه متقارن ۴گوشه: هر پایگاه باید به هر پایگاه دیگر راه داشته باشد
  // (دریاچه مرکزی نباید هیچ ربعی را جدا کند).
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const terrain = makeTerrain(W, H, CONFIG.MAP_SEED);
  mpClearSpawns(terrain, W, H);
  const occ = new Uint8Array(W * H); // خالی — ساختمان نداریم
  const pts = [];
  for (const [qc, qr] of [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]]) {
    const g = grassNear(terrain, null, W, H, qc, qr);
    must(g, `ربع (${qc},${qr}) باید چمن داشته باشد`);
    pts.push(g);
  }
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const p = findPath(terrain, occ, W, H, pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
      must(p, `ربع ${i} باید به ربع ${j} وصل باشد`);
      must(p.length < 500, `مسیر ربع ${i}→${j} باید معقول باشد، هست ${p.length}`);
      for (let k = 1; k < p.length; k++) {
        const d = Math.abs(p[k][0] - p[k - 1][0]) + Math.abs(p[k][1] - p[k - 1][1]);
        must(d === 1, "گام‌ها باید چهارجهته باشند");
        must(isCellWalkable(terrain, occ, W, H, p[k][0], p[k][1]), "همه گام‌ها باید باز باشند");
      }
      total += p.length;
    }
  }
  const q = findPath(terrain, occ, W, H, pts[0][0], pts[0][1], pts[3][0], pts[3][1]);
  const q2 = findPath(terrain, occ, W, H, pts[0][0], pts[0][1], pts[3][0], pts[3][1]);
  must(JSON.stringify(q) === JSON.stringify(q2), "مسیر باید قطعی باشد");
  return { name: "اتصال ۴ گوشه", pass: true, detail: `۶ مسیر، جمع طول ${total}` };
}

export function pathCases() {
  return [t_path_open, t_path_detour, t_path_unreachable,
    t_path_around_rocks, t_path_after_load, t_map_connected4];
}
