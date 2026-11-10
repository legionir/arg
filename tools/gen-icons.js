// سازنده آیکون‌های 24×24 منابع (0.230.0 — C-GFX-6) — سبک تخت یکدست + خط تیره.
// اجرا: متن همین فایل را در execute_js بخوان و با new Function اجرا کن:
//   const src = await fs.readTextFile("src/tools/gen-icons.js");
//   const { renderAllIcons } = new Function(src + ";return { drawIcon, renderAllIcons };")();
//   const out = await renderAllIcons(24); // {key: dataURL}
// پیش‌نمایش: بایت‌ها را با fs.writeFile در scratch/icons/<key>.png ذخیره و read_image کن.
// خروجی نهایی: game/icons.gen.js (کلیدها/فرمت ۲۴×۲۴ بی‌تغییر — فقط پیکسل‌ها نو).
function iconCtx(S) {
  const cv = new OffscreenCanvas(S, S);
  return [cv, cv.getContext("2d")];
}
function circle(g, x, y, r, fill, stroke) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = 1.5; g.strokeStyle = stroke; g.stroke(); }
}
function rr(g, x, y, w, h, r, fill, stroke) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = 1.5; g.strokeStyle = stroke; g.stroke(); }
}
function poly(g, pts, fill, stroke) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = 1.5; g.strokeStyle = stroke; g.stroke(); }
}
function line(g, x0, y0, x1, y1, color, w) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.strokeStyle = color;
  g.lineWidth = w || 2;
  g.lineCap = "round";
  g.stroke();
}
const INK = "#2b2118";
function drawIcon(g, key, S) {
  const u = S / 24;
  g.clearRect(0, 0, S, S);
  g.lineJoin = "round";
  if (key === "wood") {
    rr(g, 3 * u, 6 * u, 18 * u, 5.5 * u, 2.5 * u, "#8d6a42", INK);
    rr(g, 3 * u, 12.5 * u, 18 * u, 5.5 * u, 2.5 * u, "#7a5c38", INK);
    circle(g, 5.5 * u, 8.75 * u, 2 * u, "#d9b77c", INK);
    circle(g, 5.5 * u, 15.25 * u, 2 * u, "#d9b77c", INK);
    line(g, 9 * u, 8.75 * u, 17 * u, 8.75 * u, "#5e4630", 1);
    line(g, 9 * u, 15.25 * u, 17 * u, 15.25 * u, "#5e4630", 1);
  } else if (key === "food") {
    circle(g, 12 * u, 13 * u, 8 * u, "#d9a55c", INK);
    circle(g, 12 * u, 13 * u, 5.5 * u, "#e8c07f", null);
    line(g, 7 * u, 11 * u, 10 * u, 14 * u, "#a5763a", 1.5);
    line(g, 11 * u, 9.5 * u, 14 * u, 12.5 * u, "#a5763a", 1.5);
    line(g, 14.5 * u, 10.5 * u, 17 * u, 13.5 * u, "#a5763a", 1.5);
  } else if (key === "gold") {
    circle(g, 12 * u, 16 * u, 6.5 * u, "#c9971f", INK);
    circle(g, 12 * u, 12.5 * u, 6.5 * u, "#e8b62a", INK);
    circle(g, 12 * u, 9 * u, 6.5 * u, "#f6cf4d", INK);
    circle(g, 10 * u, 7.5 * u, 1.5 * u, "#fff2b0", null);
  } else if (key === "stone") {
    poly(g, [[5 * u, 18 * u], [4 * u, 12 * u], [9 * u, 6 * u], [16 * u, 7 * u], [20 * u, 13 * u], [17 * u, 18.5 * u]], "#8d9299", INK);
    line(g, 9 * u, 6 * u, 12 * u, 17 * u, "#6e7278", 1.5);
    line(g, 4 * u, 12 * u, 14 * u, 11 * u, "#a8adb4", 1.5);
  } else if (key === "wheat") {
    line(g, 12 * u, 21 * u, 12 * u, 7 * u, "#7a8c2f", 2);
    for (let i = 0; i < 4; i++) {
      const y = (8 + i * 3) * u;
      poly(g, [[12 * u, y], [8.5 * u, y - 2.5 * u], [12 * u, y - 4 * u]], "#e3b93a", INK);
      poly(g, [[12 * u, y], [15.5 * u, y - 2.5 * u], [12 * u, y - 4 * u]], "#e3b93a", INK);
    }
    poly(g, [[12 * u, 4.5 * u], [10 * u, 1.5 * u], [14 * u, 1.5 * u]], "#f0d060", INK);
  } else if (key === "flour") {
    rr(g, 7 * u, 9 * u, 10 * u, 11 * u, 3 * u, "#efe8d8", INK);
    rr(g, 10 * u, 5 * u, 4 * u, 5 * u, 1.5 * u, "#d8cdb4", INK);
    line(g, 7 * u, 5 * u, 10 * u, 9 * u, "#b8ab8d", 1.5);
    line(g, 17 * u, 5 * u, 14 * u, 9 * u, "#b8ab8d", 1.5);
    circle(g, 12 * u, 15 * u, 2.5 * u, "#ffffff", null);
  } else if (key === "hops") {
    circle(g, 12 * u, 8 * u, 4.5 * u, "#5d8a3c", INK);
    circle(g, 9.5 * u, 12.5 * u, 4.5 * u, "#6d9c46", INK);
    circle(g, 14.5 * u, 12.5 * u, 4.5 * u, "#527a32", INK);
    circle(g, 12 * u, 16.5 * u, 4.5 * u, "#5d8a3c", INK);
    line(g, 12 * u, 3 * u, 12 * u, 6 * u, "#3f6125", 2);
  } else if (key === "beer") {
    rr(g, 7 * u, 9 * u, 9 * u, 11 * u, 1.5 * u, "#c98a2e", INK);
    rr(g, 6 * u, 6 * u, 11 * u, 5 * u, 2 * u, "#f4ecd8", INK);
    g.beginPath();
    g.arc(16 * u, 14 * u, 3.5 * u, -Math.PI / 2, Math.PI / 2);
    g.lineWidth = 2.5;
    g.strokeStyle = "#8d5f1f";
    g.stroke();
    line(g, 10 * u, 12 * u, 10 * u, 18 * u, "#8d5f1f", 1.5);
    line(g, 13 * u, 12 * u, 13 * u, 18 * u, "#8d5f1f", 1.5);
  } else if (key === "iron") {
    poly(g, [[6 * u, 16 * u], [8 * u, 10 * u], [16 * u, 10 * u], [18 * u, 16 * u]], "#5a5e66", INK);
    poly(g, [[8 * u, 10 * u], [10 * u, 7 * u], [14 * u, 7 * u], [16 * u, 10 * u]], "#7d828c", INK);
    line(g, 9 * u, 13 * u, 15 * u, 13 * u, "#9aa0aa", 1.5);
  } else if (key === "swords") {
    line(g, 6 * u, 18 * u, 17 * u, 7 * u, "#c9ccd4", 3);
    line(g, 18 * u, 18 * u, 7 * u, 7 * u, "#b9bcc4", 3);
    line(g, 5 * u, 15.5 * u, 8.5 * u, 19 * u, "#8d6a42", 3);
    line(g, 19 * u, 15.5 * u, 15.5 * u, 19 * u, "#8d6a42", 3);
    circle(g, 17 * u, 7 * u, 1.5 * u, "#f0f2f6", INK);
    circle(g, 7 * u, 7 * u, 1.5 * u, "#e2e4ea", INK);
  } else if (key === "bows") {
    g.beginPath();
    g.arc(9 * u, 12 * u, 8 * u, -Math.PI / 2.6, Math.PI / 2.6);
    g.lineWidth = 2.5;
    g.strokeStyle = "#7a5230";
    g.stroke();
    line(g, 13.5 * u, 5.5 * u, 13.5 * u, 18.5 * u, "#e8e2d2", 1.2);
    line(g, 13.5 * u, 12 * u, 18 * u, 12 * u, "#b9bcc4", 2.5);
    poly(g, [[18 * u, 10.5 * u], [20.5 * u, 12 * u], [18 * u, 13.5 * u]], "#8d9299", INK);
  } else if (key === "leather") {
    poly(g, [[12 * u, 4 * u], [18 * u, 8 * u], [17 * u, 17 * u], [12 * u, 20.5 * u], [7 * u, 17 * u], [6 * u, 8 * u]], "#c99a5e", INK);
    circle(g, 10 * u, 11 * u, 1.2 * u, "#8d6238", null);
    circle(g, 14 * u, 13 * u, 1.2 * u, "#8d6238", null);
    circle(g, 11 * u, 15.5 * u, 1.2 * u, "#8d6238", null);
    line(g, 8 * u, 9 * u, 16 * u, 9 * u, "#a87e48", 1);
  } else if (key === "meat") {
    circle(g, 9 * u, 10 * u, 6 * u, "#a5442f", INK);
    circle(g, 9 * u, 10 * u, 3.5 * u, "#c96a4a", null);
    line(g, 13 * u, 14 * u, 19 * u, 20 * u, INK, 5);
    line(g, 13 * u, 14 * u, 19 * u, 20 * u, "#e8e2d2", 3);
    circle(g, 17.5 * u, 18 * u, 2 * u, "#e8e2d2", INK);
    circle(g, 20 * u, 20.5 * u, 2 * u, "#e8e2d2", INK);
  } else if (key === "cheese") {
    poly(g, [[4 * u, 17 * u], [20 * u, 17 * u], [20 * u, 8 * u]], "#e8bd3a", INK);
    poly(g, [[20 * u, 8 * u], [20 * u, 17 * u], [13 * u, 17 * u]], "#d9a92c", null);
    circle(g, 16 * u, 14.5 * u, 1.5 * u, "#a87e1f", null);
    circle(g, 13 * u, 15.5 * u, 1 * u, "#a87e1f", null);
    circle(g, 18 * u, 11.5 * u, 1 * u, "#a87e1f", null);
  } else if (key === "apples") {
    circle(g, 12 * u, 14 * u, 7 * u, "#c23b2e", INK);
    circle(g, 9.5 * u, 12 * u, 2 * u, "#e06a55", null);
    line(g, 12 * u, 7.5 * u, 12 * u, 4.5 * u, "#5e4630", 2);
    poly(g, [[12 * u, 5 * u], [17 * u, 3.5 * u], [16 * u, 7 * u]], "#4c9440", INK);
  }
}
const ICON_KEYS = ["meat", "cheese", "apples", "wood", "food", "gold", "stone", "wheat", "flour", "hops", "beer", "iron", "swords", "bows", "leather"];
function u8ToB64(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return btoa(s);
}
async function renderAllIcons(S) {
  const out = {};
  for (const key of ICON_KEYS) {
    const [cv, g] = iconCtx(S || 24);
    drawIcon(g, key, S || 24);
    const blob = await cv.convertToBlob({ type: "image/png" });
    const buf = new Uint8Array(await blob.arrayBuffer());
    out[key] = { dataUrl: "data:image/png;base64," + u8ToB64(buf), bytes: buf };
  }
  return out;
}
