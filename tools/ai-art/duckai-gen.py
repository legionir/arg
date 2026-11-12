#!/usr/bin/env python3
"""One DuckAi image: duckai-gen.py <duck_cli dir> <prompt-file> <out dir> [reference image]
With a reference, the image is attached to the chat request (style only)."""
import sys, os, base64
sys.path.insert(0, sys.argv[1])
import duck_cli as d
prompt = open(sys.argv[2], encoding="utf8").read().strip()
out = sys.argv[3]; ref = sys.argv[4] if len(sys.argv) > 4 else None
mode = sys.argv[5] if len(sys.argv) > 5 else "style"
imgs = None
if ref:
    imgs = d.images_to_parts([ref])
    if mode == "same":
        prompt += " The attached image is the FINISHED building: keep exactly the same building, footprint, size, proportions, camera angle, scale, position in the frame, art style, colors and flat magenta background; only change the construction state as described."
    else:
      prompt += " The attached image is a STYLE reference only: copy its rendering style, color palette, camera angle, lighting, outline weight and background treatment exactly, but do NOT copy its subject or shape; draw only the subject described above."
os.makedirs(out, exist_ok=True)
for kind, val in d.DuckAI().stream_events(prompt, draw=True, images=imgs):
    if kind == "image":
        p = os.path.join(out, "duckai.jpg"); open(p, "wb").write(base64.b64decode(val["b64"])); print("saved", p); sys.exit(0)
print("[error] no image"); sys.exit(2)
