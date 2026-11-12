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
    sel = np.where(tcol <= Wb / 4 * 1.15)[0]; Wb = float(sel.max() - sel.min() + 1)
    s = float(np.clip(W * (1 + tol) / Wb, 0.6, 1.15)); best = (0, s)
    s = round(float(best[1]), 3); out[k] = s
    rep.append((k, s, round(a.shape[1] * s / W, 3)))
for k, s, bb in rep: print(f"{k:14} s={s:<6} (bbox/diamond after fit={bb})")
fit = os.path.join(root, "tools/ai-art/footprint-fit.json")
old = json.load(open(fit)) if os.path.exists(fit) else {}
old.update(out); json.dump(old, open(fit, "w"), indent=1)
if "--apply" in sys.argv:
    p = os.path.join(root, "game/buildingart.js"); t = open(p, encoding="utf8").read()
    for k, s in old.items():
        t = re.sub(r"(  %s: \{ dy: [-\d.]+)(?:, s: [\d.]+)? \}" % k, lambda m: m.group(1) + (f", s: {s}" if abs(s - 1) > 0.004 else "") + " }", t)
    open(p, "w", encoding="utf8").write(t)
