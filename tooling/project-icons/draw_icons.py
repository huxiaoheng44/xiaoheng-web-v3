"""Pixel-art project icons in the CRT.AGENT palette.

Each icon is drawn on a 32x32 grid with primitive shapes, then auto-outlined
with the agent's near-black outline colour. Output: native 32px PNGs plus
nearest-neighbour upscales.

    python tooling/project-icons/draw_icons.py
"""
import math
import os

from PIL import Image

PAL = {
    "O": (0x10, 0x12, 0x0E),  # outline
    "D": (0x20, 0x2B, 0x1D),  # screen dark green
    "d": (0x19, 0x20, 0x16),  # screen darker
    "G": (0xCC, 0xF7, 0x81),  # phosphor green
    "g": (0x7F, 0xA0, 0x4F),  # dim phosphor
    "W": (0xFD, 0xF8, 0xEE),  # cream highlight
    "C": (0xEE, 0xE4, 0xD4),  # cream base
    "S": (0xB4, 0xAD, 0x9D),  # cream shade
    "s": (0x9D, 0x97, 0x87),  # cream dark shade
    "k": (0x5A, 0x58, 0x50),  # warm dark grey
    "Y": (0xFD, 0xEA, 0x38),  # yellow
    "A": (0xFD, 0xAD, 0x00),  # amber
    "R": (0xF6, 0x87, 0x06),  # orange
    "r": (0xEE, 0x5E, 0x00),  # red-orange
}
N = 32


class Canvas:
    def __init__(self, n=N):
        self.n = n
        self.px = [[None] * n for _ in range(n)]

    def set(self, x, y, c):
        if 0 <= x < self.n and 0 <= y < self.n:
            self.px[y][x] = c

    def get(self, x, y):
        return self.px[y][x] if 0 <= x < self.n and 0 <= y < self.n else None

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(self.n):
            for x in range(self.n):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    self.set(x, y, c)

    def ring(self, cx, cy, r0, r1, c, a0=0, a1=360):
        for y in range(self.n):
            for x in range(self.n):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                d = math.hypot(dx, dy)
                ang = math.degrees(math.atan2(dy, dx)) % 360
                inside = a0 <= ang <= a1 if a0 <= a1 else (ang >= a0 or ang <= a1)
                if r0 <= d <= r1 and inside:
                    self.set(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.set(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def poly(self, pts, c):
        for y in range(self.n):
            for x in range(self.n):
                px, py = x + 0.5, y + 0.5
                inside = False
                j = len(pts) - 1
                for i in range(len(pts)):
                    xi, yi = pts[i]
                    xj, yj = pts[j]
                    if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                        inside = not inside
                    j = i
                if inside:
                    self.set(x, y, c)

    def pixels(self, x0, y0, rows):
        """Stamp an ASCII sprite; '.' is skipped."""
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != ".":
                    self.set(x0 + i, y0 + j, ch)

    def outline(self):
        add = []
        for y in range(self.n):
            for x in range(self.n):
                if self.px[y][x] is None and any(
                    self.get(x + dx, y + dy) not in (None, "O")
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                ):
                    add.append((x, y))
        for x, y in add:
            self.set(x, y, "O")

    def image(self):
        im = Image.new("RGBA", (self.n, self.n), (0, 0, 0, 0))
        for y in range(self.n):
            for x in range(self.n):
                c = self.px[y][x]
                if c:
                    im.putpixel((x, y), PAL[c] + (255,))
        return im


def screen_box(cv, x0, y0, x1, y1):
    """Cream CRT-style bezel with a dark green screen, like the agent's head."""
    cv.rect(x0, y0, x1, y1, "C")
    cv.rect(x0, y0, x1, y0, "W")
    cv.rect(x0, y0, x0, y1, "W")
    cv.rect(x0 + 1, y1, x1, y1, "S")
    cv.rect(x1, y0 + 1, x1, y1, "S")
    cv.rect(x0 + 2, y0 + 2, x1 - 2, y1 - 2, "O")
    cv.rect(x0 + 3, y0 + 3, x1 - 3, y1 - 3, "D")


# --- icons -----------------------------------------------------------------

def pingpong_vision():
    """Camera watching an HMI screen: cream camera with a phosphor lens and amber scan corners."""
    cv = Canvas()
    # mount + stand
    cv.rect(14, 24, 17, 26, "S")
    cv.rect(10, 27, 21, 28, "C")
    cv.rect(10, 28, 21, 28, "S")
    # camera body
    cv.rect(5, 9, 26, 23, "C")
    cv.rect(5, 9, 26, 9, "W")
    cv.rect(5, 9, 5, 23, "W")
    cv.rect(6, 23, 26, 23, "S")
    cv.rect(26, 10, 26, 23, "S")
    cv.rect(8, 6, 13, 8, "S")  # top hump
    cv.rect(8, 6, 13, 6, "C")
    # lens
    cv.ellipse(16, 16.5, 6.5, 6.5, "O")
    cv.ellipse(16, 16.5, 5.5, 5.5, "s")
    cv.ellipse(16, 16.5, 4.5, 4.5, "D")
    cv.ellipse(16, 16.5, 2.6, 2.6, "g")
    cv.ellipse(16, 16.5, 1.6, 1.6, "G")
    cv.set(14, 14, "W")
    cv.set(15, 14, "W")
    cv.set(14, 15, "W")
    # recording light
    cv.rect(22, 11, 23, 12, "R")
    cv.set(22, 11, "Y")
    cv.outline()
    # amber OCR scan brackets around the whole thing (unoutlined, drawn after)
    for (x, y, dx, dy) in ((1, 1, 1, 1), (30, 1, -1, 1), (1, 30, 1, -1), (30, 30, -1, -1)):
        for i in range(4):
            cv.set(x + dx * i, y, "A")
            cv.set(x, y + dy * i, "A")
    return cv


def web_harvest_rag():
    """Phosphor globe on a dark disc with a cream magnifier – scrape + retrieve."""
    cv = Canvas()
    cv.ellipse(13, 13, 10.5, 10.5, "D")
    # meridians / parallels
    cv.ring(13, 13, 9.2, 10.4, "g")
    for y in range(3, 24):
        for x in range(3, 24):
            dx, dy = x + 0.5 - 13, y + 0.5 - 13
            if dx * dx + dy * dy <= 10.2 ** 2:
                cv.set(x, y, "D")
                if abs(dx) < 0.6 or abs(dy) < 0.6:
                    cv.set(x, y, "G")
                elif abs((dx / 5.0) ** 2 + (dy / 10.0) ** 2 - 1) < 0.17:
                    cv.set(x, y, "g")
                elif abs(abs(dy) - 6) < 0.5:
                    cv.set(x, y, "g")
    cv.ring(13, 13, 9.4, 10.4, "g")
    cv.ring(13, 13, 9.4, 10.4, "G", 190, 260)
    cv.outline()
    # magnifier
    cv.ring(21, 21, 4.2, 6.2, "C")
    cv.ring(21, 21, 4.2, 6.2, "W", 180, 270)
    cv.ring(21, 21, 5.4, 6.2, "S", 0, 90)
    cv.ellipse(21, 21, 4.2, 4.2, "d")
    cv.ellipse(21, 21, 2.2, 2.2, "g")
    cv.set(19, 19, "G")
    cv.set(20, 19, "G")
    cv.set(19, 20, "G")
    for i in range(5):
        cv.rect(25 + i, 25 + i, 26 + i, 26 + i, "A")
        cv.set(26 + i, 25 + i, "R")
    cv.outline()
    return cv


def you_dont_need_rag():
    """One plain text file: cream page, folded corner, phosphor text lines and an amber 'TXT' tag."""
    cv = Canvas()
    cv.poly([(6, 2), (21, 2), (27, 8), (27, 30), (6, 30)], "C")
    cv.rect(6, 2, 6, 29, "W")
    cv.rect(6, 2, 20, 2, "W")
    cv.rect(7, 29, 26, 29, "S")
    cv.rect(26, 9, 26, 29, "S")
    # folded corner
    cv.poly([(21, 2), (21, 8), (27, 8)], "S")
    cv.line(21, 2, 21, 8, "s")
    cv.line(21, 8, 27, 8, "s")
    # text area
    cv.rect(9, 10, 24, 20, "D")
    for i, (y, w) in enumerate(((11, 13), (13, 10), (15, 12), (17, 8), (19, 5))):
        cv.rect(10, y, 10 + w, y, "G" if i % 2 == 0 else "g")
    cv.rect(16, 18, 16, 19, "G")  # cursor
    # amber TXT label
    cv.rect(9, 22, 21, 28, "A")
    cv.rect(9, 22, 21, 22, "Y")
    cv.rect(9, 28, 21, 28, "R")
    cv.outline()
    cv.pixels(10, 23, [
        "OOO.O.O.OOO",
        ".O..O.O..O.",
        ".O...O...O.",
        ".O..O.O..O.",
        ".O..O.O..O.",
    ])
    return cv


def fast_ai_movie():
    """Clapperboard with a phosphor play button."""
    cv = Canvas()
    # board
    cv.rect(4, 13, 27, 28, "D")
    cv.rect(4, 13, 27, 13, "k")
    # clapper top (tilted stripes)
    cv.poly([(3, 7), (25, 3), (26, 8), (4, 12)], "C")
    for i, x in enumerate(range(5, 26, 5)):
        cv.poly([(x, 6.6 - i * 0.9), (x + 2.5, 6.1 - i * 0.9), (x + 3.5, 11.3 - i * 0.9), (x + 1, 11.8 - i * 0.9)], "k")
    # lower bar stripes
    cv.rect(4, 13, 27, 15, "C")
    for x in range(5, 27, 5):
        cv.rect(x, 13, x + 2, 15, "k")
    cv.rect(4, 13, 27, 13, "W")
    # play triangle
    cv.poly([(13, 18), (13, 27), (21, 22.5)], "G")
    cv.line(13, 18, 13, 26, "W")
    # hinge
    cv.rect(3, 11, 5, 13, "A")
    cv.outline()
    # sparkle (AI)
    cv.pixels(23, 17, [
        "..Y..",
        ".YAY.",
        "YAWAY",
        ".YAY.",
        "..Y..",
    ])
    return cv


def vehicle_identification():
    """Side-view truck with amber sound waves – acoustic vehicle classification."""
    cv = Canvas()
    # trailer
    cv.rect(2, 9, 17, 22, "C")
    cv.rect(2, 9, 17, 9, "W")
    cv.rect(2, 9, 2, 22, "W")
    cv.rect(3, 22, 17, 22, "S")
    cv.rect(4, 12, 15, 12, "S")
    cv.rect(4, 15, 15, 15, "S")
    # cab
    cv.poly([(18, 12), (24, 12), (28, 17), (28, 23), (18, 23)], "C")
    cv.rect(18, 22, 28, 23, "S")
    cv.poly([(20, 13.5), (23.5, 13.5), (26.5, 17.5), (20, 17.5)], "D")
    cv.set(21, 14, "G")
    cv.set(21, 15, "G")
    cv.rect(26, 19, 27, 20, "Y")
    cv.rect(17, 12, 17, 22, "O")
    # chassis + wheels
    cv.rect(2, 23, 28, 24, "k")
    for wx in (7, 13, 24):
        cv.ellipse(wx, 25.5, 2.7, 2.7, "d")
        cv.ellipse(wx, 25.5, 1.1, 1.1, "s")
    cv.outline()
    # sound waves top-right
    cv.ring(29, 8, 2, 3, "A", 160, 250)
    cv.ring(29, 8, 4.6, 5.6, "R", 160, 250)
    cv.ring(29, 8, 7.2, 8.2, "r", 165, 245)
    return cv


def stereo_reconstruction():
    """Isometric cube built from a phosphor point cloud, seen by two tiny cameras."""
    cv = Canvas()
    top = [(16, 6), (26, 11), (16, 16), (6, 11)]
    left = [(6, 11), (16, 16), (16, 28), (6, 23)]
    right = [(16, 16), (26, 11), (26, 23), (16, 28)]
    cv.poly(top, "W")
    cv.poly(left, "C")
    cv.poly(right, "S")
    cv.outline()
    # inner edges
    cv.line(16, 16, 16, 27, "s")
    cv.line(7, 11, 15, 15, "S")
    cv.line(17, 15, 25, 11, "S")
    # mesh lines on faces
    cv.line(11, 9, 21, 14, "g")
    cv.line(21, 9, 11, 14, "g")
    cv.line(11, 14, 11, 25, "g")
    cv.line(7, 17, 15, 21, "g")
    cv.line(21, 14, 21, 25, "g")
    cv.line(17, 21, 25, 17, "g")
    for x, y in ((16, 11), (11, 19), (21, 19), (11, 9), (21, 9), (11, 14), (21, 14), (16, 6), (6, 11), (26, 11), (16, 16)):
        cv.set(x, y, "G")
    # point cloud dots
    for x, y, c in ((3, 6, "G"), (5, 4, "g"), (28, 5, "G"), (27, 3, "g"), (2, 16, "g"),
                    (29, 17, "G"), (3, 27, "G"), (29, 27, "g"), (9, 2, "G"), (23, 2, "G"), (16, 1, "g")):
        cv.set(x, y, c)
    return cv


def drone():
    """Front-view quadcopter with a CRT-style face, phosphor eyes and amber thruster lights."""
    cv = Canvas()
    # arms
    cv.rect(3, 12, 28, 13, "s")
    # rotors (blurred discs)
    for rx in (6, 25):
        cv.rect(rx - 5, 8, rx + 5, 9, "S")
        cv.rect(rx - 5, 8, rx + 5, 8, "C")
        cv.rect(rx - 1, 9, rx, 12, "k")
    # body: little CRT head like the agent
    screen_box(cv, 9, 10, 22, 21)
    cv.rect(12, 14, 13, 16, "G")
    cv.rect(18, 14, 19, 16, "G")
    # antenna
    cv.rect(15, 6, 15, 9, "k")
    cv.rect(15, 4, 16, 5, "Y")
    cv.set(16, 5, "A")
    # landing legs
    cv.line(11, 22, 8, 26, "S")
    cv.line(20, 22, 23, 26, "S")
    cv.rect(6, 26, 10, 26, "C")
    cv.rect(21, 26, 25, 26, "C")
    cv.outline()
    # thrusters
    cv.pixels(14, 23, [
        "YAAY",
        ".RR.",
        ".r.r",
    ])
    # GPS target marker
    cv.pixels(27, 26, [
        ".A.",
        "AYA",
        ".A.",
    ])
    return cv


ICONS = {
    "pingpong-vision": pingpong_vision,
    "web-harvest-rag": web_harvest_rag,
    "you-dont-need-rag": you_dont_need_rag,
    "fast-ai-movie": fast_ai_movie,
    "vehicle-identification": vehicle_identification,
    "3d-reconstruction": stereo_reconstruction,
    "drone": drone,
}

if __name__ == "__main__":
    import sys

    out = sys.argv[1] if len(sys.argv) > 1 else "content/html/assets/icons"
    os.makedirs(out, exist_ok=True)
    for name, fn in ICONS.items():
        im = fn().image()
        im.save(os.path.join(out, f"{name}.png"))
        for s in (4, 8):
            im.resize((N * s, N * s), Image.NEAREST).save(os.path.join(out, f"{name}@{s}x.png"))
        print(name)
