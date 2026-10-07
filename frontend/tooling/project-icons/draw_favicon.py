"""Site favicon: a 2D pixel CRT monitor with a phosphor prompt (Monty palette).

    python frontend/tooling/project-icons/draw_favicon.py [public_dir]

Writes favicon-32.png, favicon-16.png (hand-drawn, not downscaled) and
apple-touch-icon.png (180px, art at 5x on the page's dark background).
"""
import os
from pathlib import Path
import sys

from PIL import Image

from draw_icons import Canvas


def monitor_32():
    cv = Canvas(32)
    # bezel
    cv.rect(2, 3, 29, 23, "C")
    cv.rect(2, 3, 29, 3, "W")
    cv.rect(2, 3, 2, 23, "W")
    cv.rect(3, 23, 29, 23, "S")
    cv.rect(29, 4, 29, 23, "S")
    # screen
    cv.rect(5, 6, 26, 19, "O")
    cv.rect(6, 7, 25, 18, "D")
    # ">_" prompt
    cv.rect(9, 10, 10, 11, "G")
    cv.rect(11, 12, 12, 13, "G")
    cv.rect(9, 14, 10, 15, "G")
    cv.rect(14, 15, 18, 16, "G")
    cv.rect(20, 15, 21, 16, "g")
    # power light
    cv.rect(25, 21, 26, 21, "A")
    # neck + foot
    cv.rect(13, 24, 18, 25, "S")
    cv.rect(8, 26, 23, 27, "C")
    cv.rect(8, 27, 23, 27, "S")
    cv.outline()
    return cv


def monitor_16():
    cv = Canvas(16)
    cv.rect(1, 2, 14, 11, "C")
    cv.rect(1, 2, 14, 2, "W")
    cv.rect(14, 3, 14, 11, "S")
    cv.rect(3, 4, 12, 9, "D")
    # ">_"
    cv.set(5, 5, "G")
    cv.set(6, 6, "G")
    cv.set(5, 7, "G")
    cv.rect(8, 7, 10, 7, "G")
    cv.set(12, 10, "A")
    cv.rect(6, 12, 9, 12, "S")
    cv.rect(4, 13, 11, 13, "C")
    cv.outline()
    return cv


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).resolve().parents[2] / "public")
    os.makedirs(out, exist_ok=True)
    big = monitor_32().image()
    big.save(os.path.join(out, "favicon-32.png"))
    monitor_16().image().save(os.path.join(out, "favicon-16.png"))
    touch = Image.new("RGBA", (180, 180), (8, 9, 9, 255))
    touch.alpha_composite(big.resize((160, 160), Image.NEAREST), (10, 10))
    touch.save(os.path.join(out, "apple-touch-icon.png"))
    print("favicon-32.png, favicon-16.png, apple-touch-icon.png ->", out)
