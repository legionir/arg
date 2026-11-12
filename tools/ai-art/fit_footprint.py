#!/usr/bin/env python3
"""Per-building uniform scale so the sprite's BASE matches its footprint diamond (aspect locked, anchored at the diamond's bottom vertex).
  python3 tools/ai-art/fit_footprint.py [--apply] [--keys a,b] [--tol 0.0]
Footprint diamond at stored scale (x3): width W=(w+h)*14*3, height H=W/2. The sprite bottom sits on the bottom vertex, so the left/right vertices of
the diamond are H/2 above it. We find s so that  s * (sprite width at t0 = H/(2s) above its bottom)  ==  W.
Writes tools/ai-art/footprint-fit.json ({key: s}); select.mjs copies s into game/buildingart.js and render.js multiplies the draw size by it.
--apply also rewrites game/buildingart.js right now (keeps dy)."""
import sys, os, re, json, subprocess
import numpy as np
from PIL import Image
root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
arg = lambda k, d=None: sys.argv[sys.argv.index("--" + k) + 1] if "--" + k in sys.argv else d
only = [x for x in (arg("keys", "") or "").split(",") if x]; tol = float(arg("tol", 0.0))
B = json.loads(subprocess.check_output(["node", "-e", "import('./tools/ai-art/buildings.mjs').then(m=>console.log(JSON.stringify(m.BUILDINGS)))"], cwd=root))
SS, TW = 3, 28
out, rep = {}, []
for b in B:
    k = b["key"]
    if only and k not in only: continue
    f = os.path.join(root, "assets/buildings", k + ".png")
    if not os.path.exists(f): continue
    a = np.array(Image.open(f).convert("RGBA"))[:, :, 3] > 128
    rows = np.where(a.any(1))[0]; yb = rows.max()
    W = (b["w"] + b["h"]) * TW / 2 * SS; H = W / 2
    # bottom profile: for each column, how far its lowest opaque pixel is above the sprite bottom (t). Base columns have small t; overhangs/roofs have large t.
    cols = np.where(a.any(0))[0]; tcol = np.full(a.shape[1], 1e9)
    for x in cols: tcol[x] = yb - np.where(a[:, x])[0].max()
    Wb = float(cols.max() - cols.min() + 1)
    # base width = span of columns whose bottom lies within the diamond's lower half (1.15 * bbox/4 above the bottom vertex); single pass, so flat projections cannot run away
    sel = np.where(tcol <= Wb / 4 * 1.15)[0]; xl, xr = int(sel.min()), int(sel.max()); Wb = float(xr - xl + 1)
    d = max(2, int(0.02 * Wb)); tl = float(np.median(tcol[xl:xl + d + 1])); tr = float(np.median(tcol[xr - d:xr + 1]))
    wh = b["w"] + b["h"]; el, er = b["w"] / (2 * wh), b["h"] / (2 * wh)          # expected corner heights / base width (left, right)
    flip = b["w"] != b["h"] and (tl - tr) * (b["w"] - b["h"]) < 0 and abs(tl - tr) / Wb > 0.04   # long side runs against the grid
    if flip: tl, tr, xl, xr = tr, tl, a.shape[1] - 1 - xr, a.shape[1] - 1 - xl
    sx = float(np.clip(W * (1 + tol) / Wb, 0.6, 1.15))
    r = ((tl + tr) / 2 / Wb) / ((el + er) / 2)                                   # >1: sprite base steeper than the game's 2:1
    sy = float(np.clip(1 / r, 0.85, 1.15)) if "--uniform" not in sys.argv else 1.0
    dx = (a.shape[1] / 2 - (xl + xr) / 2) * sx / SS                              # zoom-1 px to move the base centre onto the footprint centre
    ent = {"s": round(sx, 3), "sy": round(sy, 3), "dx": round(dx, 1)}
    if flip: ent["f"] = 1
    out[k] = ent; rep.append((k, ent, round(a.shape[1] * sx / W, 3)))
for k, e, bb in rep: print(f"{k:14} {e}")
fit = os.path.join(root, "tools/ai-art/footprint-fit.json")
old = {}
old.update(out); json.dump(old, open(fit, "w"), indent=1)
if "--apply" in sys.argv:
    p = os.path.join(root, "game/buildingart.js"); t = open(p, encoding="utf8").read()
    for k, e in old.items():
        e = e if isinstance(e, dict) else {"s": e}
        extra = "".join(f", {n}: {e[n]}" for n in ("s", "sy", "dx", "f") if n in e and (e[n] not in (1, 1.0, 0, 0.0) or n == "f"))
        t = re.sub(r"(  %s: \{ dy: [-\d.]+)[^}]*\}" % k, lambda m: m.group(1) + extra + " }", t)
    open(p, "w", encoding="utf8").write(t)
