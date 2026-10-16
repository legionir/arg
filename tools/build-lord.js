// سازنده شیت ارباب (lord) — ۱۲۸×۱۶۰، فریم ۳۲، سطرها E/S/W/N + سطر مرگ، لنگر (16,30).
// همان قراردادrisis units.gen.js و استایل شیت‌های scratch/build-units.js
// (زره طلایی + شنل سرخ + تاج با لعل + شمشیر).
//
// اجرا: کل متن این فایل را به‌عنوان بدنه (js) به ابزار execute_js بده
// (به fs/writeFile/readFile و OffscreenCanvas نیاز دارد).
// خروجی‌ها (خود اسکریپت می‌نویسد):
//   - src/assets/units/lord.png (سورس durable)
//   - الحاق "lord" به UNIT_DATA در src/game/units.gen.js
// پیش‌نمایش: scratch/sheets/lord-big.png (با read_image ببین)

const C = {
  gold:"#d9a441", goldD:"#8a6420", goldL:"#f0c75e",
  red:"#b03a2e", redD:"#7c231b",
  skin:"#e8b88a", skinD:"#8a5a34",
  steel:"#c9d1d9", steelD:"#6e7480",
  brown:"#4e3a26", dark:"#20242a"
};
const cv = new OffscreenCanvas(128, 160);
const g = cv.getContext("2d");
g.clearRect(0,0,128,160);
function R(ox, oy, rects) {
  for (const [x,y,w,h,c] of rects) { g.fillStyle = c; g.fillRect(ox+x, oy+y, w, h); }
}
function PL(ox, oy, x0,y0,x1,y1,w,c) { // خط پیکسلی ضخیم، بدون آنتی‌الیاس
  g.fillStyle = c;
  const n = Math.max(Math.abs(x1-x0), Math.abs(y1-y0));
  for (let i=0;i<=n;i++) {
    const x = Math.round(x0+(x1-x0)*i/n), y = Math.round(y0+(y1-y0)*i/n);
    g.fillRect(ox+x-(w>>1), oy+y-(w>>1), w, w);
  }
}
function south(bob, lL, lR) {
  const B = (r) => r.map(([x,y,w,h,c]) => [x,y-bob,w,h,c]);
  return [
    ...B([[11,2,2,2,C.goldL],[15,2,2,2,C.goldL],[19,2,2,2,C.goldL],[11,4,10,2,C.goldL],[15,4,2,1,C.red],[11,5,10,1,C.goldD]]),
    ...B([[12,6,8,6,C.skin],[13,8,2,1,C.dark],[17,8,2,1,C.dark],[18,6,2,6,C.skinD]]),
    ...B([[9,12,3,3,C.goldL],[20,12,3,3,C.goldL],[9,14,3,1,C.goldD],[20,14,3,1,C.goldD]]),
    ...B([[11,13,10,7,C.gold],[15,13,2,7,C.goldD],[11,19,10,2,C.redD],[15,19,2,2,C.goldL]]),
    ...B([[8,12,2,13,C.red],[22,12,2,13,C.red],[8,12,1,13,C.redD],[23,12,1,13,C.redD]]),
    ...B([[9,19,2,3,C.skin],[21,19,2,3,C.skin]]),
    ...B([[23,6,2,14,C.steel],[24,6,1,14,C.steelD],[23,5,2,1,C.steel],[22,20,4,1,C.gold],[23,21,2,3,C.brown],[23,24,2,1,C.goldL]]),
    [12,22+lL,3,7,C.steelD],[17,22+lR,3,7,C.steelD],
    [12,28+lL,3,2,C.brown],[17,28+lR,3,2,C.brown],
  ];
}
function east(bob, lL, lR) {
  const B = (r) => r.map(([x,y,w,h,c]) => [x,y-bob,w,h,c]);
  return [
    ...B([[13,2,2,2,C.goldL],[17,2,2,2,C.goldL],[21,2,2,2,C.goldL],[13,4,10,2,C.goldL],[17,4,2,1,C.red],[13,5,10,1,C.goldD]]),
    ...B([[15,6,8,6,C.skin],[19,8,2,1,C.dark],[23,8,1,2,C.skin],[15,6,1,6,C.skinD]]),
    ...B([[12,13,9,7,C.gold],[12,19,9,2,C.redD],[16,19,2,2,C.goldL]]),
    ...B([[6,12,5,13,C.red],[6,12,1,13,C.redD],[9,13,1,11,C.redD]]),
    ...B([[24,4,2,16,C.steel],[24,4,1,16,C.steel],[25,4,1,16,C.steelD],[24,3,2,1,C.steel],[23,20,4,1,C.gold],[24,21,2,3,C.brown],[24,24,2,1,C.goldL],[22,19,2,3,C.skin]]),
    [13,22+lL,3,7,C.steelD],[17,22+lR,3,7,C.steelD],
    [13,28+lL,3,2,C.brown],[17,28+lR,3,2,C.brown],
  ];
}
function north(bob, lL, lR) {
  const B = (r) => r.map(([x,y,w,h,c]) => [x,y-bob,w,h,c]);
  return [
    ...B([[11,2,2,2,C.goldL],[15,2,2,2,C.goldL],[19,2,2,2,C.goldL],[11,4,10,2,C.goldL],[15,4,2,1,C.red],[11,5,10,1,C.goldD]]),
    ...B([[12,6,8,5,C.skinD]]),
    ...B([[9,11,14,14,C.red],[12,12,1,12,C.redD],[19,12,1,12,C.redD],[14,11,4,2,C.gold]]),
    ...B([[24,2,2,8,C.steel],[24,1,2,1,C.steel],[24,10,2,3,C.brown],[24,13,2,1,C.goldL],[22,12,2,3,C.skin]]),
    [12,25+lL,3,4,C.steelD],[17,25+lR,3,4,C.steelD],
    [12,28+lL,3,2,C.brown],[17,28+lR,3,2,C.brown],
  ];
}
function southAtk() {
  const b = south(0,0,0).filter(([x,y]) => !(x>=22 && y<25));
  return [...b, [19,15,3,4,C.gold],[20,17,2,2,C.skin],[18,16,4,2,C.gold]];
}
function eastAtk() {
  return [
    ...[[13,2,2,2,C.goldL],[17,2,2,2,C.goldL],[21,2,2,2,C.goldL],[13,4,10,2,C.goldL],[17,4,2,1,C.red],[13,5,10,1,C.goldD]],
    ...[[15,6,8,6,C.skin],[19,8,2,1,C.dark],[23,8,1,2,C.skin],[15,6,1,6,C.skinD]],
    ...[[12,13,9,7,C.gold],[12,19,9,2,C.redD],[16,19,2,2,C.goldL]],
    ...[[6,12,5,13,C.red],[6,12,1,13,C.redD],[9,13,1,11,C.redD]],
    ...[[13,13,4,3,C.gold],[16,13,3,3,C.skin],[15,11,2,5,C.gold]],
    [18,22,3,7,C.steelD],[12,23,3,7,C.steelD],
    [18,28,3,2,C.brown],[12,29,3,1,C.brown],
  ];
}
function northAtk() {
  return [
    ...[[11,2,2,2,C.goldL],[15,2,2,2,C.goldL],[19,2,2,2,C.goldL],[11,4,10,2,C.goldL],[15,4,2,1,C.red],[11,5,10,1,C.goldD]],
    ...[[12,6,8,5,C.skinD]],
    ...[[9,11,14,14,C.red],[12,12,1,12,C.redD],[19,12,1,12,C.redD],[14,11,4,2,C.gold]],
    ...[[12,10,3,4,C.gold],[17,10,3,4,C.gold],[12,8,3,2,C.skin],[17,8,3,2,C.skin],[14,10,4,1,C.gold]],
    [12,25,3,4,C.steelD],[17,25,3,4,C.steelD],
    [12,28,3,2,C.brown],[17,28,3,2,C.brown],
  ];
}
function death() {
  return [
    [5,13,5,2,C.goldL],[7,14,2,1,C.red],
    [10,17,5,5,C.skin],[11,19,2,1,C.dark],
    [15,17,8,6,C.gold],[15,21,8,2,C.redD],[14,22,9,2,C.redD],
    [23,17,6,5,C.steelD],[28,17,2,6,C.brown],
    [12,25,14,2,C.steel],[11,24,2,4,C.gold],[9,25,2,2,C.brown],
  ];
}
const E = [east(0,0,0), east(1,-1,1), east(1,1,-1), eastAtk()];
const S = [south(0,0,0), south(1,-1,1), south(1,1,-1), southAtk()];
const N = [north(0,0,0), north(1,-1,1), north(1,1,-1), northAtk()];
E.forEach((f,i) => R(i*32, 0, f));
S.forEach((f,i) => R(i*32, 32, f));
const tmp = new OffscreenCanvas(128, 32); // سطر W = آینه E
tmp.getContext("2d").drawImage(cv, 0, 0, 128, 32, 0, 0, 128, 32);
for (let i=0;i<4;i++) {
  g.save(); g.translate(i*32+32, 64); g.scale(-1,1);
  g.drawImage(tmp, i*32, 0, 32, 32, 0, 0, 32, 32);
  g.restore();
}
N.forEach((f,i) => R(i*32, 96, f));
R(0, 128, death());
PL(3*32, 32, 21,17, 28,3, 3, C.steel);   // تیغه قطری حمله S
PL(3*32, 32, 22,17, 29,3, 1, C.steelD);
PL(3*32, 0, 19,12, 30,11, 3, C.steel);   // تیغه افقی حمله E (آینه‌اش خودکار)
PL(3*32, 0, 19,14, 30,13, 1, C.steelD);
R(3*32, 96, [[15,0,2,10,C.steel],[15,0,1,10,C.steel],[16,0,1,10,C.steelD]]); // تیغه حمله N
const png = new Uint8Array(await (await cv.convertToBlob({type:"image/png"})).arrayBuffer());
await fs.writeFile("src/assets/units/lord.png", png);
let gen = await fs.readTextFile("src/game/units.gen.js");
const tail = gen.lastIndexOf("\n};");
if (tail < 0) throw new Error("tail not found");
if (!gen.includes('"lord"')) {
  const b64 = btoa(String.fromCharCode(...png));
  gen = gen.slice(0, tail) + `,\n  "lord": "data:image/png;base64,${b64}"` + gen.slice(tail);
  await fs.writeTextFile("src/game/units.gen.js", gen);
}
return { pngBytes: png.length, done: true };
