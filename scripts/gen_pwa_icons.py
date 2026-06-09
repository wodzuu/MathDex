#!/usr/bin/env python3
"""Generate MathDex PWA icons (pwa-192x192.png, pwa-512x512.png).

Renders the same motif as public/favicon.svg — a navy field with a yellow
band, a dark equator line, and a centered Poke Ball button — as a full-bleed,
opaque square so it also works as an "any maskable" icon. No third-party deps:
PNGs are encoded directly with zlib from the standard library.
"""
import struct
import zlib
import math
import os

# Colours (RGB)
NAVY   = (10, 18, 32)     # #0a1220
YELLOW = (255, 203, 5)    # #FFCB05
DARK   = (17, 24, 39)     # #111827
WHITE  = (240, 244, 255)  # #f0f4ff

SS = 4  # supersampling factor for smooth circle edges


def color_at(fx: float, fy: float):
    """Colour for a point in the unit square (matches favicon.svg proportions)."""
    # Centered Poke Ball button takes precedence.
    dr = math.hypot(fx - 0.5, fy - 0.5)
    if dr <= 0.078:
        return WHITE
    if dr <= 0.125:
        return DARK
    # Equator line (y 14.5..16.5 of 32).
    if 14.5 / 32 <= fy < 16.5 / 32:
        return DARK
    # Yellow band (y 8..24 of 32).
    if 0.25 <= fy < 0.75:
        return YELLOW
    return NAVY


def render(size: int) -> bytes:
    """Return raw RGB pixel bytes for a size x size icon (supersampled)."""
    row_bytes = bytearray()
    raw = bytearray()
    inv = 1.0 / (size * SS)
    for y in range(size):
        raw.append(0)  # PNG filter type 0 (None) for this scanline
        for x in range(size):
            r = g = b = 0
            for sy in range(SS):
                fy = ((y * SS) + sy + 0.5) * inv
                for sx in range(SS):
                    fx = ((x * SS) + sx + 0.5) * inv
                    cr, cg, cb = color_at(fx, fy)
                    r += cr; g += cg; b += cb
            n = SS * SS
            raw.append(r // n); raw.append(g // n); raw.append(b // n)
    return bytes(raw)


def write_png(path: str, size: int):
    raw = render(size)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"wrote {path} ({size}x{size}, {len(png)} bytes)")


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "public")
    write_png(os.path.join(out, "pwa-192x192.png"), 192)
    write_png(os.path.join(out, "pwa-512x512.png"), 512)
