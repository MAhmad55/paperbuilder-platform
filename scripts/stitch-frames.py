#!/usr/bin/env python3
"""Stitch a vertical strip of viewport screenshots into one composite PNG.
Usage: python3 scripts/stitch-frames.py frame1.png frame2.png ... out.png
"""
import sys
from PIL import Image

frames = sys.argv[1:-1]
out = sys.argv[-1]
imgs = [Image.open(f) for f in frames]
W = max(i.width for i in imgs)
H = sum(i.height for i in imgs) + (len(imgs) - 1) * 6
canvas = Image.new('RGB', (W, H), '#e6e8ee')
y = 0
for i in imgs:
    canvas.paste(i, (0, y))
    y += i.height + 6
canvas.save(out)
print('stitched', canvas.size)
