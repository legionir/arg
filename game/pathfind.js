// مسیریابی A* چهارجهته و قطعی روی گرید (CORE-001، برش ششم).
// قرارداد: همه اعداد placeholder نیستند — این الگوریتم ژنریک است (source: n/a).
// - همسایه‌ها با ترتیب ثابت [شرق، غرب، جنوب، شمال] پیمایش می‌شوند.
// - تساوی f با h کمتر، بعد ایندکس کمتر شکسته می‌شود → خروجی قطعی.
// - شروع همیشه قابل عبور فرض می‌شود (واحد روی چمن می‌ایستد)؛
//   هدف باید walkable باشد — اگر نیست، صداکننده باید اول nearestWalkable بزند.
import { T_GRASS } from "./terrain.js";

export function isCellWalkable(terrain, occ, W, H, c, r) {
  if (c < 0 || r < 0 || c >= W || r >= H) return false;
  if (terrain[r * W + c] !== T_GRASS) return false;
  if (occ[r * W + c] === 1) return false;
  return true;
}

// نزدیک‌ترین خانه walkable به (gc,gr) — جست‌وجوی حلقه‌ای قطعی تا شعاع maxR.
// ترتیب: شعاع صعودی، بعد سطر از بالا به پایین، ستون چپ به راست.
export function nearestWalkable(terrain, occ, W, H, gc, gr, maxR = 8) {
  if (isCellWalkable(terrain, occ, W, H, gc, gr)) return [gc, gr];
  for (let rad = 1; rad <= maxR; rad++) {
    for (let r = gr - rad; r <= gr + rad; r++) {
      for (let c = gc - rad; c <= gc + rad; c++) {
        if (Math.abs(c - gc) + Math.abs(r - gr) !== rad) continue;
        if (isCellWalkable(terrain, occ, W, H, c, r)) return [c, r];
      }
    }
  }
  return null;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]; // E, W, S, N — ثابت
const hOf = (c, r, gc, gr) => Math.abs(c - gc) + Math.abs(r - gr);

// مسیر از [sc,sr] تا [gc,gr] (شامل هر دو سر) یا null اگر ناممکن.
// ورودی‌ها باید ایندکس صحیح داخل نقشه باشند.
export function findPath(terrain, occ, W, H, sc, sr, gc, gr) {
  if (sc === gc && sr === gr) return [[sc, sr]];
  if (!isCellWalkable(terrain, occ, W, H, gc, gr)) return null;
  const N = W * H;
  const g = new Float64Array(N).fill(Infinity);
  const parent = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const sIdx = sr * W + sc, gIdx = gr * W + gc;
  // اگر شروع خارج نقشه است، ناممکن
  if (sc < 0 || sr < 0 || sc >= W || sr >= H) return null;
  g[sIdx] = 0;
  const open = [sIdx];
  const fOf = (idx) => {
    const c = idx % W, r = (idx / W) | 0;
    return g[idx] + hOf(c, r, gc, gr);
  };
  let guard = N * 4;
  while (open.length && guard-- > 0) {
    // بهترین گره: کمترین f، بعد کمترین h، بعد کمترین ایندکس (قطعی)
    let bi = 0;
    let bf = fOf(open[0]);
    let bh = hOf(open[0] % W, (open[0] / W) | 0, gc, gr);
    for (let i = 1; i < open.length; i++) {
      const idx = open[i];
      const f = fOf(idx);
      if (f < bf || (f === bf)) {
        const hh = hOf(idx % W, (idx / W) | 0, gc, gr);
        const bhh = hOf(open[bi] % W, (open[bi] / W) | 0, gc, gr);
        if (f < bf || hh < bhh || (hh === bhh && idx < open[bi])) {
          bi = i; bf = f; bh = hh;
        }
      }
    }
    const cur = open.splice(bi, 1)[0];
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === gIdx) {
      const cells = [];
      let at = cur;
      while (at !== -1) {
        cells.push([at % W, (at / W) | 0]);
        at = parent[at];
      }
      cells.reverse();
      return cells;
    }
    const cc = cur % W, cr = (cur / W) | 0;
    for (const [dc, dr] of DIRS) {
      const nc = cc + dc, nr = cr + dr;
      if (nc < 0 || nr < 0 || nc >= W || nr >= H) continue;
      const ni = nr * W + nc;
      if (closed[ni]) continue;
      // هدف همیشه walkable است (بالا بررسی شد)؛ بقیه باید walkable باشند
      if (ni !== gIdx && !isCellWalkable(terrain, occ, W, H, nc, nr)) continue;
      if (g[cur] + 1 < g[ni]) {
        g[ni] = g[cur] + 1;
        parent[ni] = cur;
        if (!open.includes(ni)) open.push(ni);
      }
    }
  }
  return null;
}
