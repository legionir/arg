// ژنراتور شیت اسپرایت یگان‌ها (spearman/maceman/knight در 0.35.0؛
// crusader/crossbowman/arabian/assassin/horseArcher در 0.36.0).
// خروجی هر واحد: شیت 128×160 (سطرها E,S,W,N + سطر مرگ؛ ستون‌ها idle,walkA,walkB,attack؛
// فریم 32×32، لنگر کف (16,30)) در src/assets/units/<key>.png + ورودی dataURL در
// src/game/units.gen.js + پیش‌نمایش scratch/new-units.png.
// اجرا با ابزار execute_js (ورکر مرورگر: OffscreenCanvas + fs فضای کاری).
const KITS = {
  spearman: { tunic: "blue", head: "kettle", weapon: "spear" },
  maceman: { tunic: "blue", head: "hair", weapon: "mace" },
  knight: { tunic: "steel", head: "helm", weapon: "sword", surcoat: true },
  // موج دوم (0.36.0) — از tier کاربر: A(صلیبی/قاتل) B(زوبین‌دار/عرب) S(سواره).
  crusader: { tunic: "steel", head: "helm", weapon: "sword", surcoat: "crusade", crest: false },
  crossbowman: { tunic: "blue", head: "hair", weapon: "crossbow" },
  arabian: { tunic: "sand", head: "turban", weapon: "scimitar" },
  assassin: { tunic: "dark", head: "hood", weapon: "dagger" },
  horseArcher: { tunic: "blue", head: "cap", weapon: "bow", mount: true },
};
const C = {
  outline: "#3d3227", skin: "#e8b98a", skinD: "#c99a6b",
  blue: "#4d9de0", blueD: "#3578b8", leather: "#6b4f30", leatherD: "#3d3227",
  steel: "#c9d1d9", steelD: "#8d99a6", shaft: "#7a5c3e",
  hair: "#5a4028", gold: "#e3c188", dark: "#241c14", crest: "#a03a3a",
  sand: "#d9c08a", sandD: "#a8925e", clothDark: "#3a3f4a", turban: "#e8e2d2",
  horse: "#8a6844", horseD: "#5e4630", mane: "#3a2c1e",
  surWhite: "#e8e4da", crossRed: "#b03030",
};
function box(g, x, y, w, h, c, ol) {
  x |= 0; y |= 0;
  if (ol === undefined) ol = C.outline;
  if (ol) { g.fillStyle = ol; g.fillRect(x - 1, y - 1, w + 2, h + 2); }
  g.fillStyle = c; g.fillRect(x, y, w, h);
}
function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); }
function thickLine(g, x0, y0, x1, y1, w, c) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + dx * i / n), y = Math.round(y0 + dy * i / n);
    g.fillStyle = C.outline;
    g.fillRect(x - ((w + 1) >> 1), y - ((w + 1) >> 1), w + 2, w + 2);
  }
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + dx * i / n), y = Math.round(y0 + dy * i / n);
    g.fillStyle = c;
    g.fillRect(x - (w >> 1), y - (w >> 1), w, w);
  }
}
function tunicOf(kit) {
  if (kit.tunic === "steel") return { main: C.steel, dark: C.steelD };
  if (kit.tunic === "sand") return { main: C.sand, dark: C.sandD };
  if (kit.tunic === "dark") return { main: C.clothDark, dark: C.dark };
  return { main: C.blue, dark: C.blueD };
}
function sleeveOf(kit) { // آستین دست مسلح — هم‌رنگ تن‌پوش
  if (kit.tunic === "steel") return C.steel;
  if (kit.tunic === "sand") return C.sand;
  if (kit.tunic === "dark") return C.clothDark;
  return C.blue;
}
function surcoatPanel(g, ox, oy, x, y, w, h, kind) {
  if (kind === "crusade") { // ردای سفید با صلیب سرخ (صلیبی)
    box(g, ox + x, oy + y, w, h, C.surWhite, null);
    box(g, ox + x + 1, oy + y + 1, 2, 7, C.crossRed, null);
    box(g, ox + x, oy + y + 3, w, 2, C.crossRed, null);
  } else if (kind) {
    box(g, ox + x, oy + y, w, h, C.blue, null);
  }
}
function legs(g, ox, oy, dir, pose) {
  const hose = C.leather, boot = C.leatherD;
  if (dir === "S" || dir === "N") {
    let lh = 6, rh = 6, ly = 22, ry = 22;
    if (pose === "walkA") { lh = 5; ly = 21; }
    if (pose === "walkB") { rh = 5; ry = 21; }
    box(g, ox + 12, oy + ly, 3, lh, hose); box(g, ox + 17, oy + ry, 3, rh, hose);
    box(g, ox + 12, oy + ly + lh - 2, 3, 2, boot, null); box(g, ox + 17, oy + ry + rh - 2, 3, 2, boot, null);
  } else {
    const f = dir === "E" ? 1 : -1;
    let bx = 11, fx = 15;
    if (pose === "walkA") { fx += 2; bx -= 1; }
    if (pose === "walkB") { fx -= 1; bx += 1; }
    if (f < 0) { const t = 26 - bx; bx = 26 - fx - 3; fx = t - 3; }
    box(g, ox + bx, oy + 22, 3, 6, hose); box(g, ox + fx, oy + 22, 3, 6, hose);
    box(g, ox + bx, oy + 26, 3, 2, boot, null); box(g, ox + fx, oy + 26, 3, 2, boot, null);
  }
}
function torso(g, ox, oy, dir, kit, bob) {
  bob = bob || 0;
  const t = tunicOf(kit);
  if (dir === "S" || dir === "N") {
    box(g, ox + 11, oy + 14 + bob, 10, 9, t.main);
    box(g, ox + 19, oy + 14 + bob, 2, 9, t.dark, null);
    surcoatPanel(g, ox, oy, 14, 14 + bob, 4, 9, kit.surcoat);
    box(g, ox + 11, oy + 19 + bob, 10, 2, C.leather, null);
    px(g, ox + 15, oy + 20 + bob, C.gold); px(g, ox + 16, oy + 20 + bob, C.gold);
    box(g, ox + 8, oy + 15 + bob, 3, 6, t.main);
    box(g, ox + 8, oy + 21 + bob, 3, 2, C.skin, null);
    if (kit.head === "helm") {
      box(g, ox + 6, oy + 14 + bob, 5, 8, C.blue);
      box(g, ox + 6, oy + 14 + bob, 5, 2, C.blueD, null);
      px(g, ox + 8, oy + 17 + bob, C.gold); px(g, ox + 8, oy + 18 + bob, C.gold);
      px(g, ox + 7, oy + 17 + bob, C.gold); px(g, ox + 9, oy + 17 + bob, C.gold);
    }
  } else {
    const f = dir === "E" ? 1 : -1;
    const tx = 12;
    box(g, ox + tx, oy + 14 + bob, 8, 9, t.main);
    box(g, ox + (f > 0 ? tx : tx + 6), oy + 14 + bob, 2, 9, t.dark, null);
    surcoatPanel(g, ox, oy, tx + 2, 14 + bob, 4, 9, kit.surcoat);
    box(g, ox + tx, oy + 19 + bob, 8, 2, C.leather, null);
  }
}
function head(g, ox, oy, dir, kit, bob) {
  bob = bob || 0;
  if (dir === "S") {
    box(g, ox + 12, oy + 6 + bob, 8, 8, C.skin);
    box(g, ox + 19, oy + 6 + bob, 1, 8, C.skinD, null);
    px(g, ox + 14, oy + 10 + bob, C.dark); px(g, ox + 17, oy + 10 + bob, C.dark);
    if (kit.head === "hair") {
      box(g, ox + 12, oy + 6 + bob, 8, 3, C.hair, null);
      box(g, ox + 12, oy + 9 + bob, 1, 3, C.hair, null); box(g, ox + 19, oy + 9 + bob, 1, 3, C.hair, null);
    } else if (kit.head === "kettle") {
      box(g, ox + 12, oy + 4 + bob, 8, 3, C.steel, null);
      box(g, ox + 10, oy + 7 + bob, 12, 2, C.steelD, null);
    } else if (kit.head === "helm") {
      box(g, ox + 12, oy + 5 + bob, 8, 9, C.steel, null);
      box(g, ox + 13, oy + 10 + bob, 6, 2, C.dark, null);
      if (kit.crest !== false) box(g, ox + 15, oy + 3 + bob, 2, 2, C.crest, null);
    } else if (kit.head === "turban") { // عمامه عرب با ریش
      box(g, ox + 12, oy + 8 + bob, 8, 6, C.skin);
      box(g, ox + 19, oy + 8 + bob, 1, 6, C.skinD, null);
      box(g, ox + 12, oy + 12 + bob, 8, 2, C.hair, null);
      box(g, ox + 12, oy + 4 + bob, 8, 4, C.turban, null);
      box(g, ox + 11, oy + 7 + bob, 10, 2, C.turban, null);
      px(g, ox + 15, oy + 5 + bob, C.gold); px(g, ox + 16, oy + 5 + bob, C.gold);
      px(g, ox + 14, oy + 10 + bob, C.dark); px(g, ox + 17, oy + 10 + bob, C.dark);
    } else if (kit.head === "hood") { // مقنعه قاتل — فقط رخساره پیداست
      box(g, ox + 11, oy + 5 + bob, 10, 9, C.clothDark);
      box(g, ox + 14, oy + 8 + bob, 4, 4, C.skin, null);
      px(g, ox + 14, oy + 9 + bob, C.dark); px(g, ox + 17, oy + 9 + bob, C.dark);
    } else if (kit.head === "cap") { // کلاه چرمی سواره
      box(g, ox + 12, oy + 6 + bob, 8, 8, C.skin);
      box(g, ox + 19, oy + 6 + bob, 1, 8, C.skinD, null);
      box(g, ox + 12, oy + 5 + bob, 8, 3, C.leather, null);
      px(g, ox + 14, oy + 10 + bob, C.dark); px(g, ox + 17, oy + 10 + bob, C.dark);
    }
  } else if (dir === "N") {
    if (kit.head === "helm") {
      box(g, ox + 12, oy + 5 + bob, 8, 9, C.steelD);
      if (kit.crest !== false) box(g, ox + 15, oy + 3 + bob, 2, 2, C.crest, null);
    } else if (kit.head === "kettle") {
      box(g, ox + 12, oy + 6 + bob, 8, 8, C.hair);
      box(g, ox + 12, oy + 4 + bob, 8, 3, C.steel, null);
      box(g, ox + 10, oy + 7 + bob, 12, 2, C.steelD, null);
    } else if (kit.head === "turban") {
      box(g, ox + 12, oy + 6 + bob, 8, 8, C.turban);
      box(g, ox + 12, oy + 4 + bob, 8, 3, C.turban, null);
      box(g, ox + 10, oy + 7 + bob, 12, 2, C.skinD, null);
    } else if (kit.head === "hood") {
      box(g, ox + 11, oy + 5 + bob, 10, 9, C.clothDark);
    } else if (kit.head === "cap") {
      box(g, ox + 12, oy + 6 + bob, 8, 8, C.leather);
    } else {
      box(g, ox + 12, oy + 6 + bob, 8, 8, C.hair);
    }
  } else {
    const f = dir === "E" ? 1 : -1;
    const hx = f > 0 ? 13 : 12;
    box(g, ox + hx, oy + 6 + bob, 7, 8, C.skin);
    if (kit.head === "hair") {
      box(g, ox + hx, oy + 6 + bob, 3, 8, C.hair, null);
      box(g, ox + hx, oy + 6 + bob, 7, 2, C.hair, null);
    } else if (kit.head === "kettle") {
      box(g, ox + hx, oy + 4 + bob, 7, 3, C.steel, null);
      const bx = f > 0 ? hx - 2 : hx - 3;
      box(g, ox + bx, oy + 7 + bob, 12, 2, C.steelD, null);
    } else if (kit.head === "helm") {
      box(g, ox + hx, oy + 5 + bob, 7, 9, C.steel, null);
      if (kit.crest !== false) box(g, ox + 15, oy + 3 + bob, 2, 2, C.crest, null);
    } else if (kit.head === "turban") {
      box(g, ox + hx, oy + 8 + bob, 7, 6, C.skin);
      box(g, ox + hx, oy + 12 + bob, 7, 2, C.hair, null);
      box(g, ox + hx, oy + 4 + bob, 7, 4, C.turban, null);
      const bx = f > 0 ? hx - 2 : hx - 3;
      box(g, ox + bx, oy + 7 + bob, 12, 2, C.turban, null);
    } else if (kit.head === "hood") {
      box(g, ox + hx - 1, oy + 5 + bob, 9, 9, C.clothDark);
      box(g, ox + (f > 0 ? hx + 3 : hx), oy + 8 + bob, 4, 4, C.skin, null);
    } else if (kit.head === "cap") {
      box(g, ox + hx, oy + 6 + bob, 7, 8, C.skin);
      box(g, ox + hx, oy + 5 + bob, 7, 3, C.leather, null);
    }
    px(g, ox + (f > 0 ? hx + 5 : hx + 1), oy + 10 + bob, C.dark);
  }
}
function weapon(g, ox, oy, dir, pose, type, kit) {
  const atk = pose === "attack";
  const armBlue = kit ? sleeveOf(kit) : C.blue;
  if (type === "sword") {
    if (dir === "S" || dir === "N") {
      if (!atk) {
        box(g, ox + 23, oy + 10, 2, 10, C.steel); px(g, ox + 23, oy + 9, C.steel); px(g, ox + 24, oy + 9, C.steel);
        box(g, ox + 22, oy + 20, 4, 1, C.gold, null);
        box(g, ox + 23, oy + 21, 2, 3, C.shaft, null);
        box(g, ox + 21, oy + 15, 3, 6, armBlue); box(g, ox + 21, oy + 21, 3, 2, C.skin, null);
      } else {
        box(g, ox + 22, oy + 8, 3, 5, armBlue); box(g, ox + 22, oy + 12, 3, 2, C.skin, null);
        thickLine(g, ox + 23, oy + 10, ox + 29, oy + 1, 2, C.steel);
        box(g, ox + 22, oy + 10, 4, 1, C.gold, null);
      }
    } else {
      const f = dir === "E" ? 1 : -1, hx = f > 0 ? 20 : 9;
      if (!atk) thickLine(g, ox + hx, oy + 18, ox + hx + f * 7, oy + 24, 2, C.steel);
      else thickLine(g, ox + hx, oy + 16, ox + hx + f * 4, oy + 5, 2, C.steel);
    }
  } else if (type === "spear") {
    if (dir === "S" || dir === "N") {
      if (!atk) {
        box(g, ox + 24, oy + 2, 2, 24, C.shaft);
        box(g, ox + 23, oy + 0, 4, 3, C.steel, null);
        box(g, ox + 21, oy + 15, 3, 6, armBlue); box(g, ox + 21, oy + 21, 3, 2, C.skin, null);
      } else {
        box(g, ox + 12, oy + 14, 17, 2, C.shaft);
        box(g, ox + 28, oy + 13, 4, 4, C.steel, null);
        box(g, ox + 21, oy + 14, 3, 5, armBlue);
      }
    } else {
      const f = dir === "E" ? 1 : -1;
      const y = atk ? 13 : 15, x0 = f > 0 ? 14 : 18, len = atk ? 17 : 13;
      box(g, ox + (f > 0 ? x0 : x0 - len), oy + y, len, 2, C.shaft);
      const tx = f > 0 ? x0 + len : x0 - len - 3;
      box(g, ox + tx, oy + y - 1, 3, 4, C.steel, null);
    }
  } else if (type === "mace") {
    if (dir === "S" || dir === "N") {
      if (!atk) {
        box(g, ox + 23, oy + 12, 2, 9, C.shaft);
        box(g, ox + 21, oy + 6, 6, 6, C.steelD);
        px(g, ox + 20, oy + 8, C.steelD); px(g, ox + 27, oy + 8, C.steelD);
        px(g, ox + 23, oy + 5, C.steelD); px(g, ox + 24, oy + 5, C.steelD);
        box(g, ox + 21, oy + 15, 3, 6, armBlue); box(g, ox + 21, oy + 21, 3, 2, C.skin, null);
      } else {
        box(g, ox + 22, oy + 8, 3, 5, armBlue); box(g, ox + 22, oy + 12, 3, 2, C.skin, null);
        thickLine(g, ox + 23, oy + 10, ox + 28, oy + 2, 2, C.shaft);
        box(g, ox + 26, oy + 0, 6, 5, C.steelD);
      }
    } else {
      const f = dir === "E" ? 1 : -1, hx = f > 0 ? 20 : 9;
      if (!atk) {
        thickLine(g, ox + hx, oy + 20, ox + hx + f * 2, oy + 12, 2, C.shaft);
        box(g, ox + hx + f * 2 - 2, oy + 7, 5, 5, C.steelD);
      } else {
        thickLine(g, ox + hx, oy + 16, ox + hx + f * 5, oy + 7, 2, C.shaft);
        box(g, ox + hx + f * 5 - 2, oy + 3, 5, 5, C.steelD);
      }
    }
  } else if (type === "crossbow") { // زوبین — قنداق چوبی + کمان افقی + تیر
    if (dir === "S" || dir === "N") {
      if (!atk) {
        box(g, ox + 23, oy + 12, 2, 10, C.shaft);
        box(g, ox + 19, oy + 11, 9, 2, C.steel, null);
        box(g, ox + 23, oy + 7, 2, 5, C.surWhite, null);
        box(g, ox + 21, oy + 15, 3, 6, armBlue); box(g, ox + 21, oy + 21, 3, 2, C.skin, null);
      } else {
        box(g, ox + 14, oy + 12, 12, 2, C.shaft);
        box(g, ox + 25, oy + 8, 2, 9, C.steel, null);
        box(g, ox + 14, oy + 11, 13, 1, C.surWhite, null);
        box(g, ox + 21, oy + 11, 4, 3, armBlue);
      }
    } else {
      const f = dir === "E" ? 1 : -1, hx = f > 0 ? 20 : 9;
      if (!atk) {
        thickLine(g, ox + hx, oy + 20, ox + hx + f * 4, oy + 12, 2, C.shaft);
        const bx = f > 0 ? hx + 1 : hx - 8;
        box(g, ox + bx, oy + 11, 7, 2, C.steel, null);
      } else {
        const sx = f > 0 ? hx : hx - 11;
        box(g, ox + sx, oy + 14, 11, 2, C.shaft);
        const tx = f > 0 ? hx + 11 : hx - 13;
        box(g, ox + tx, oy + 10, 2, 9, C.steel, null);
        box(g, ox + sx + 1, oy + 13, 9, 1, C.surWhite, null);
      }
    }
  } else if (type === "dagger") { // خنجر قاتل — تیغه کوتاه
    if (dir === "S" || dir === "N") {
      if (!atk) {
        box(g, ox + 23, oy + 15, 2, 6, C.steel);
        box(g, ox + 22, oy + 14, 4, 1, C.gold, null);
        box(g, ox + 23, oy + 11, 2, 3, C.shaft, null);
        box(g, ox + 21, oy + 15, 3, 6, armBlue); box(g, ox + 21, oy + 21, 3, 2, C.skin, null);
      } else {
        box(g, ox + 21, oy + 12, 9, 2, C.steel);
        box(g, ox + 20, oy + 11, 2, 4, C.gold, null);
        box(g, ox + 18, oy + 11, 3, 4, armBlue);
      }
    } else {
      const f = dir === "E" ? 1 : -1, hx = f > 0 ? 20 : 9;
      if (!atk) thickLine(g, ox + hx, oy + 18, ox + hx + f * 3, oy + 24, 2, C.steel);
      else thickLine(g, ox + hx, oy + 14, ox + hx + f * 9, oy + 12, 2, C.steel);
    }
  } else if (type === "scimitar") { // شمشیر خمیده عرب
    if (dir === "S" || dir === "N") {
      if (!atk) {
        thickLine(g, ox + 23, oy + 21, ox + 26, oy + 11, 2, C.steel);
        px(g, ox + 26, oy + 10, C.steel); px(g, ox + 27, oy + 10, C.steel);
        box(g, ox + 22, oy + 21, 4, 1, C.gold, null);
        box(g, ox + 21, oy + 15, 3, 6, armBlue); box(g, ox + 21, oy + 21, 3, 2, C.skin, null);
      } else {
        box(g, ox + 22, oy + 8, 3, 5, armBlue); box(g, ox + 22, oy + 12, 3, 2, C.skin, null);
        thickLine(g, ox + 23, oy + 10, ox + 29, oy + 2, 2, C.steel);
        box(g, ox + 22, oy + 10, 4, 1, C.gold, null);
      }
    } else {
      const f = dir === "E" ? 1 : -1, hx = f > 0 ? 20 : 9;
      if (!atk) thickLine(g, ox + hx, oy + 16, ox + hx + f * 7, oy + 23, 2, C.steel);
      else thickLine(g, ox + hx, oy + 15, ox + hx + f * 6, oy + 4, 2, C.steel);
    }
  }
}
function deathPose(g, ox, oy, kit, wtype) {
  box(g, ox + 3, oy + 20, 7, 7, C.skin);
  if (kit.head === "helm") box(g, ox + 3, oy + 19, 7, 4, C.steelD, null);
  else if (kit.head === "kettle") box(g, ox + 3, oy + 18, 7, 3, C.steelD, null);
  else box(g, ox + 3, oy + 20, 7, 3, C.hair, null);
  const t = kit.tunic === "steel" ? C.steel : C.blue;
  box(g, ox + 10, oy + 21, 12, 6, t);
  box(g, ox + 22, oy + 22, 7, 4, C.leather);
  if (wtype === "spear") {
    box(g, ox + 8, oy + 12, 16, 2, C.shaft); box(g, ox + 23, oy + 11, 4, 4, C.steel, null);
  } else if (wtype === "mace") {
    box(g, ox + 8, oy + 12, 10, 2, C.shaft); box(g, ox + 17, oy + 10, 5, 5, C.steelD);
  } else if (wtype === "crossbow") {
    box(g, ox + 10, oy + 13, 12, 2, C.shaft); box(g, ox + 15, oy + 10, 2, 8, C.steel, null);
  } else if (wtype === "dagger") {
    box(g, ox + 12, oy + 13, 7, 2, C.steel);
  } else if (wtype === "scimitar") {
    thickLine(g, ox + 10, oy + 14, ox + 19, oy + 10, 2, C.steel);
  } else if (wtype === "bow") {
    thickLine(g, ox + 12, oy + 9, ox + 12, oy + 17, 2, C.shaft);
    box(g, ox + 12, oy + 9, 1, 8, C.skinD, null);
  } else {
    thickLine(g, ox + 9, oy + 13, ox + 18, oy + 13, 2, C.steel);
  }
}
// اسب کماندار سواره (0.36.0) — بدن قهوه‌ای + یال تیره + زین سرخ؛ W با آینه E ساخته می‌شود.
function horse(g, ox, oy, dir, pose) {
  const H = C.horse, HD = C.horseD;
  if (dir === "E") {
    let fl = 0, bl = 0;
    if (pose === "walkA") fl = -2;
    if (pose === "walkB") bl = -2;
    if (pose === "attack") fl = -3;
    box(g, ox + 9, oy + 24, 2, 6, HD); box(g, ox + 19, oy + 24, 2, 6, HD); // پاهای دور
    box(g, ox + 7, oy + 24 + bl, 3, 5, H); box(g, ox + 17, oy + 24 + fl, 3, 5, H); // پاهای نزدیک
    box(g, ox + 7, oy + 27 + bl, 3, 2, HD, null); box(g, ox + 17, oy + 27 + fl, 3, 2, HD, null);
    box(g, ox + 4, oy + 19, 20, 6, H); // بدن
    box(g, ox + 4, oy + 23, 20, 2, HD, null);
    thickLine(g, ox + 4, oy + 20, ox + 1, oy + 26, 2, C.mane); // دم
    thickLine(g, ox + 22, oy + 21, ox + 27, oy + 12, 4, H); // گردن
    thickLine(g, ox + 21, oy + 20, ox + 26, oy + 11, 1, C.mane, null); // یال
    box(g, ox + 25, oy + 8, 6, 4, H); // سر
    px(g, ox + 26, oy + 7, H); px(g, ox + 29, oy + 9, C.dark);
    box(g, ox + 29, oy + 10, 2, 2, HD, null);
    box(g, ox + 11, oy + 17, 9, 4, C.crest, null); // جل زین
  } else if (dir === "S") { // سینه و صورت از روبه‌رو
    box(g, ox + 12, oy + 24, 3, 6, H); box(g, ox + 17, oy + 24, 3, 6, H);
    box(g, ox + 12, oy + 28, 3, 2, HD, null); box(g, ox + 17, oy + 28, 3, 2, HD, null);
    box(g, ox + 11, oy + 19, 10, 7, H);
    box(g, ox + 11, oy + 24, 10, 2, HD, null);
    box(g, ox + 13, oy + 13, 6, 7, H); // سر
    px(g, ox + 13, oy + 12, H); px(g, ox + 18, oy + 12, H); // گوش‌ها
    px(g, ox + 14, oy + 15, C.dark); px(g, ox + 17, oy + 15, C.dark);
    box(g, ox + 14, oy + 18, 4, 2, HD, null); // پوزه
  } else { // N: کپل و دم آویزان
    box(g, ox + 12, oy + 24, 3, 6, HD); box(g, ox + 17, oy + 24, 3, 6, HD);
    box(g, ox + 12, oy + 28, 3, 2, C.mane, null); box(g, ox + 17, oy + 28, 3, 2, C.mane, null);
    box(g, ox + 11, oy + 19, 10, 7, HD);
    box(g, ox + 15, oy + 22, 2, 7, C.mane, null); // دم
  }
}
// سوارکار روی اسب — تن‌پوش آبی تیم + کمان چوبی (idle عمودی، attack کشیده).
function rider(g, ox, oy, dir, pose, kit, bob) {
  bob = bob || 0;
  const atk = pose === "attack";
  const t = tunicOf(kit);
  if (dir === "E") {
    box(g, ox + 11, oy + 8 + bob, 8, 9, t.main);
    box(g, ox + 17, oy + 8 + bob, 2, 9, t.dark, null);
    head(g, ox, oy, dir, kit, -4 + bob);
    if (!atk) {
      box(g, ox + 8, oy + 9 + bob, 3, 5, t.main);
      thickLine(g, ox + 21, oy + 8 + bob, ox + 23, oy + 13 + bob, 2, C.shaft);
      thickLine(g, ox + 23, oy + 13 + bob, ox + 21, oy + 18 + bob, 2, C.shaft);
      box(g, ox + 21, oy + 8 + bob, 1, 10, C.skinD, null); // زه
      box(g, ox + 18, oy + 11 + bob, 3, 3, t.main);
    } else {
      box(g, ox + 24, oy + 7 + bob, 2, 10, C.shaft, null); // کمان افراشته
      box(g, ox + 24, oy + 7 + bob, 1, 10, C.skinD, null);
      box(g, ox + 14, oy + 11 + bob, 12, 1, C.surWhite, null); // تیر
      box(g, ox + 16, oy + 10 + bob, 5, 3, t.main); // دست کشیده
    }
  } else { // S/N: سوار از روبه‌رو/پشت
    box(g, ox + 11, oy + 8 + bob, 10, 9, t.main);
    box(g, ox + 19, oy + 8 + bob, 2, 9, t.dark, null);
    head(g, ox, oy, dir, kit, -4 + bob);
    box(g, ox + 8, oy + 9 + bob, 3, 5, t.main);
    if (!atk) {
      thickLine(g, ox + 23, oy + 9 + bob, ox + 24, oy + 14 + bob, 2, C.shaft);
      thickLine(g, ox + 24, oy + 14 + bob, ox + 23, oy + 19 + bob, 2, C.shaft);
      box(g, ox + 20, oy + 11 + bob, 3, 3, t.main);
    } else {
      box(g, ox + 8, oy + 10 + bob, 16, 2, C.shaft, null); // کمان افقی
      box(g, ox + 15, oy + 10 + bob, 2, 9, C.surWhite, null); // تیر به‌سوی بیننده
      box(g, ox + 19, oy + 9 + bob, 4, 3, t.main);
    }
  }
}
function deathMounted(g, ox, oy) { // اسب افتاده + سوار بر زمین + کمان
  box(g, ox + 4, oy + 24, 20, 5, C.horse);
  box(g, ox + 6, oy + 18, 3, 6, C.horse); box(g, ox + 12, oy + 18, 3, 6, C.horse);
  box(g, ox + 24, oy + 23, 6, 5, C.horse);
  px(g, ox + 25, oy + 22, C.horse); px(g, ox + 28, oy + 25, C.dark);
  box(g, ox + 2, oy + 26, 6, 3, C.skin);
  box(g, ox + 2, oy + 25, 6, 2, C.leather, null);
  box(g, ox + 8, oy + 26, 9, 3, C.blue);
  box(g, ox + 16, oy + 28, 12, 1, C.shaft, null);
}
const DIRS = ["E", "S", "W", "N"], POSES = ["idle", "walkA", "walkB", "attack"];
async function buildOne(key) {
  const kit = KITS[key];
  const cv = new OffscreenCanvas(128, 160);
  const g = cv.getContext("2d");
  g.clearRect(0, 0, 128, 160);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const ox = c * 32, oy = r * 32, dir = DIRS[r], pose = POSES[c];
      const bob = pose === "walkA" ? -1 : 0;
      if (dir === "W") {
        const t = new OffscreenCanvas(32, 32);
        const tg = t.getContext("2d");
        if (kit.mount) { horse(tg, 0, 0, "E", pose); rider(tg, 0, 0, "E", pose, kit, bob); }
        else {
          legs(tg, 0, 0, "E", pose); torso(tg, 0, 0, "E", kit, bob);
          head(tg, 0, 0, "E", kit, bob); weapon(tg, 0, 0, "E", pose, kit.weapon, kit);
        }
        g.save(); g.translate(ox + 32, oy); g.scale(-1, 1); g.drawImage(t, 0, 0); g.restore();
      } else if (kit.mount) {
        horse(g, ox, oy, dir, pose); rider(g, ox, oy, dir, pose, kit, bob);
      } else {
        legs(g, ox, oy, dir, pose); torso(g, ox, oy, dir, kit, bob);
        head(g, ox, oy, dir, kit, bob); weapon(g, ox, oy, dir, pose, kit.weapon, kit);
      }
    }
  }
  for (let c = 0; c < 4; c++) {
    if (kit.mount) deathMounted(g, c * 32, 128);
    else deathPose(g, c * 32, 128, kit, kit.weapon);
  }
  // لنگر کف: سطرهای جهت‌دار ۲px پایین‌تر (پاها روی y≈30 مثل سرباز)
  const fin = new OffscreenCanvas(128, 160);
  const fg = fin.getContext("2d");
  fg.clearRect(0, 0, 128, 160);
  fg.drawImage(cv, 0, 0, 128, 128, 0, 2, 128, 128);
  fg.drawImage(cv, 0, 128, 128, 32, 0, 128, 128, 32);
  const blob = await fin.convertToBlob({ type: "image/png" });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile("src/assets/units/" + key + ".png", bytes);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "data:image/png;base64," + btoa(bin);
}
// NOTE: این فایل با execute_js اجرا می‌شود (fs/toplevel-await ورکر). برای بازسازی:
// کل همین فایل را به‌عنوان بدنه execute_js اجرا کن، بعد خروجی urls را با اسکریپت
// الحاق units.gen.js ترکیب کن.
