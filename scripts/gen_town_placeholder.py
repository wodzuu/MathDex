#!/usr/bin/env python3
"""
Dependency-free placeholder for the Town hub map (public/town-map.png).

Generates a 576x1024 (9:16 portrait) PNG with four coloured zones positioned to
match the clickable hotspots in src/screens/Town/index.tsx, so hotspot alignment
can be verified before the real Pallet Town artwork is dropped in at the same
path. REPLACE public/town-map.png with the final illustration (same aspect).
"""
import zlib, struct, os

W, H = 576, 1024
BG = (226, 216, 184)  # parchment

# (x0%, y0%, x1%, y1%, colour) — keep in sync with the hotspot rects.
ZONES = [
    (0.30, 0.03, 0.72, 0.30, (96, 160, 96)),    # forest  → dungeon
    (0.45, 0.33, 0.85, 0.52, (224, 120, 80)),   # center  → pc + heal
    (0.14, 0.52, 0.54, 0.67, (96, 130, 200)),   # mart    → /mart
    (0.17, 0.67, 0.83, 0.90, (176, 150, 120)),  # lab     → /identify
]

rects = [(int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H), c) for x0, y0, x1, y1, c in ZONES]

raw = bytearray()
for y in range(H):
    raw.append(0)  # filter type 0 (None)
    for x in range(W):
        col = BG
        for rx0, ry0, rx1, ry1, c in rects:
            if rx0 <= x < rx1 and ry0 <= y < ry1:
                col = c
                break
        raw += bytes(col)


def chunk(typ, data):
    return struct.pack('>I', len(data)) + typ + data + struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff)


png = b'\x89PNG\r\n\x1a\n'
png += chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
png += chunk(b'IEND', b'')

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'town-map.png')
with open(out, 'wb') as f:
    f.write(png)
print('wrote', os.path.normpath(out), len(png), 'bytes')
