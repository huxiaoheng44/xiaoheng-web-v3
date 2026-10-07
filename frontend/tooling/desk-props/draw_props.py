"""Pixel-art desk props matching the scene's monitor/keyboard/mouse/mug.

Same rules as frontend/scripts/prepare-assets.mjs: only the nine scene greys,
binary alpha, nearest-neighbour friendly. Light comes from the top left;
objects are seen front-on from slightly above, like the keyboard.

    python frontend/tooling/desk-props/draw_props.py [out_dir]
"""
import math
import os
from pathlib import Path
import sys

from PIL import Image

# The scene's nine grey values, darkest → lightest.
G = [12, 35, 58, 84, 112, 145, 183, 219, 246]
K, K1, K2, K3, M4, M5, L6, L7, W = range(9)
OUTLINE = K


class Sprite:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def set(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def get(self, x, y):
        return self.px[y][x] if 0 <= x < self.w and 0 <= y < self.h else None

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def hline(self, x0, x1, y, c):
        self.rect(x0, y, x1, y, c)

    def vline(self, x, y0, y1, c):
        self.rect(x, y0, x, y1, c)

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
        ys = [p[1] for p in pts]
        for y in range(max(0, int(min(ys))), min(self.h, int(max(ys)) + 1)):
            for x in range(self.w):
                px, py = x + 0.5, y + 0.5
                inside, j = False, len(pts) - 1
                for i in range(len(pts)):
                    xi, yi = pts[i]
                    xj, yj = pts[j]
                    if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                        inside = not inside
                    j = i
                if inside:
                    self.set(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(self.h):
            for x in range(self.w):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    self.set(x, y, c)

    def outline(self, c=OUTLINE):
        add = [
            (x, y)
            for y in range(self.h)
            for x in range(self.w)
            if self.px[y][x] is None
            and any(self.get(x + dx, y + dy) not in (None, c) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        ]
        for x, y in add:
            self.set(x, y, c)

    def image(self):
        im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                c = self.px[y][x]
                if c is not None:
                    v = G[c]
                    im.putpixel((x, y), (v, v, v, 255))
        return im


def dither(s, x0, y0, x1, y1, a, b, step=2):
    """Checker two tones inside a box (only where already painted)."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if s.get(x, y) is not None:
                s.set(x, y, a if (x + y) % step else b)


# --- props -----------------------------------------------------------------

def binders():
    """Two upright lever-arch binders, spines facing out, slight 3/4 view."""
    s = Sprite(48, 64)

    def binder(x, top, w, h, body, side, label_y):
        # side face (receding to the right)
        s.poly([(x + w, top + 2), (x + w + 5, top), (x + w + 5, top + h - 2), (x + w, top + h)], side)
        # top edge
        s.poly([(x, top + 2), (x + 5, top), (x + w + 5, top), (x + w, top + 2)], L6)
        # spine
        s.rect(x, top + 2, x + w - 1, top + h, body)
        s.vline(x, top + 2, top + h, body + 1)  # lit left edge
        s.vline(x + w - 1, top + 3, top + h, body - 1)
        # spine label
        s.rect(x + 3, top + label_y, x + w - 4, top + label_y + 12, L7)
        s.hline(x + 3, x + w - 4, top + label_y, W)
        for i, ly in enumerate((4, 7, 10)):
            s.hline(x + 5, x + w - 6 - (i % 2) * 3, top + label_y + ly, M5)
        # finger hole
        cy = top + h - 9
        s.ellipse(x + w / 2, cy, 3.6, 3.6, K1)
        s.ellipse(x + w / 2, cy, 2.4, 2.4, K)
        s.set(int(x + w / 2) - 2, cy - 3, body + 1)

    binder(4, 6, 16, 54, K2, K3, 6)
    binder(25, 2, 16, 58, K3, M4, 8)
    s.outline()
    return s


def document_envelope():
    """Kraft document envelope (文件袋) lying flat, string-and-button closure."""
    s = Sprite(72, 40)
    top = [(6, 4), (68, 4), (64, 33), (2, 33)]
    s.poly(top, L6)
    # thickness / front edge
    s.rect(2, 34, 64, 36, M5)
    s.hline(2, 64, 36, M4)
    s.poly([(64, 33), (68, 4), (68, 7), (65, 36)], M4)
    # flap
    s.poly([(6, 4), (68, 4), (67, 12), (5, 12)], L7)
    s.line(5, 12, 67, 12, M5)
    s.hline(7, 67, 5, W)
    # buttons + string figure-eight
    for cx, cy in ((34, 12), (34, 21)):
        s.ellipse(cx, cy, 2.6, 2.2, M4)
        s.ellipse(cx, cy, 1.4, 1.1, L7)
    s.line(32, 13, 32, 20, K2)
    s.line(36, 13, 36, 20, K2)
    s.line(34, 23, 30, 28, K2)
    s.line(30, 28, 25, 29, K2)
    # address label
    s.rect(44, 18, 60, 28, W)
    for i, y in enumerate((20, 23, 26)):
        s.hline(46, 58 - (i % 2) * 4, y, M5)
    # subtle crease
    s.line(8, 30, 20, 30, L7)
    s.outline()
    return s


def file_folder():
    """Manila folder lying flat, papers peeking out of the right edge."""
    s = Sprite(76, 40)
    # back cover with tab
    s.poly([(10, 6), (70, 6), (66, 34), (4, 34)], M5)
    s.poly([(14, 2), (32, 2), (34, 6), (12, 6)], M5)
    s.hline(15, 31, 3, L6)
    # papers sticking out right
    s.poly([(30, 5), (74, 7), (70, 33), (26, 31)], W)
    s.poly([(30, 9), (72, 11), (69, 31), (27, 29)], L7)
    s.line(72, 11, 69, 31, L6)
    # front cover (slightly shorter, lighter)
    s.poly([(8, 9), (62, 9), (58, 34), (4, 34)], L6)
    s.hline(9, 61, 9, L7)
    s.line(62, 9, 58, 34, M5)
    # thickness
    s.rect(4, 35, 66, 36, M4)
    s.poly([(66, 34), (70, 6), (70, 8), (67, 36)], M4)
    # sticker on cover
    s.rect(16, 15, 34, 22, W)
    s.hline(18, 31, 17, M5)
    s.hline(18, 27, 20, M5)
    s.outline()
    return s


def paper_tray():
    """Two-tier stacked letter tray with a pile of paper on top."""
    s = Sprite(76, 66)

    def tier(y, inset, depth):
        x0, x1 = 3 + inset, 72 - inset
        # inner floor (seen from above)
        s.poly([(x0 + 4, y - depth), (x1 - 2, y - depth), (x1, y), (x0, y)], K2)
        s.poly([(x0 + 4, y - depth), (x1 - 2, y - depth), (x1 - 3, y - depth + 2), (x0 + 5, y - depth + 2)], K1)
        # back wall rim
        s.hline(x0 + 4, x1 - 2, y - depth - 1, L6)
        # side walls
        s.poly([(x0, y), (x0 + 4, y - depth - 1), (x0 + 6, y - depth - 1), (x0 + 3, y)], M5)
        s.poly([(x1, y), (x1 - 2, y - depth - 1), (x1 - 1, y - depth - 1), (x1 + 2, y)], M4)
        # front panel with scoop notch
        s.rect(x0, y, x1 + 2, y + 10, L6)
        s.hline(x0, x1 + 2, y, L7)
        s.vline(x1 + 2, y, y + 10, M5)
        s.hline(x0, x1 + 2, y + 10, M5)
        cx = (x0 + x1) // 2
        s.poly([(cx - 12, y), (cx + 12, y), (cx + 8, y + 5), (cx - 8, y + 5)], K2)
        s.hline(cx - 8, cx + 8, y + 5, M4)

    tier(52, 0, 9)
    tier(34, 2, 8)
    # paper pile in top tier
    s.poly([(12, 12), (66, 12), (68, 24), (10, 24)], W)
    s.rect(10, 24, 68, 31, L7)
    for y in (25, 27, 29):
        s.hline(10, 68, y, L6)
    s.hline(13, 65, 13, L7)
    s.line(68, 24, 68, 31, M5)
    # a sheet in the lower tier
    s.poly([(14, 44), (60, 44), (61, 52), (12, 52)], L7)
    s.hline(15, 59, 45, W)
    s.outline()
    return s


def paper_stack():
    """Neat stack of printer paper."""
    s = Sprite(56, 40)
    s.poly([(7, 4), (52, 4), (54, 16), (2, 16)], W)
    s.hline(8, 51, 5, L7)
    s.rect(2, 16, 54, 35, L7)
    for y in range(17, 35, 2):
        s.hline(2, 54, y, L6 if y % 4 == 1 else L7)
    s.vline(54, 16, 35, M5)
    s.hline(2, 54, 35, M5)
    # a slightly offset sheet in the middle of the pile
    s.rect(4, 24, 56, 25, W)
    s.outline()
    return s


def paper_sheet():
    """Single printed page lying at an angle on the desk."""
    s = Sprite(52, 32)
    s.poly([(10, 2), (50, 6), (42, 30), (2, 26)], W)
    s.line(2, 26, 42, 30, L6)
    s.line(42, 30, 50, 6, L7)
    # text lines follow the page angle
    for i in range(6):
        y0 = 8 + i * 3
        x0 = 10 - i
        length = (26, 30, 22, 28, 18, 24)[i]
        for t in range(length):
            if (t + i) % 7 != 6:
                s.set(x0 + t, y0 + t * 0.1, M5 if i else K3)
    s.outline()
    return s


def desk():
    """Wide dark desk: top surface, front edge, drawer unit on the left and legs."""
    w, h = 420, 100
    s = Sprite(w, h)
    top_y, edge_y = 0, 56
    # top surface in horizontal bands, lighter towards the back wall
    s.rect(0, top_y, w - 1, edge_y - 1, K1)
    # sparse, long grain streaks
    import random
    rnd = random.Random(7)
    for _ in range(70):
        y = rnd.randrange(top_y + 4, edge_y - 1)
        x = rnd.randrange(-20, w)
        s.hline(max(0, x), min(w - 1, x + rnd.randrange(12, 60)), y, K2)
    # back edge where the desk meets the wall
    s.hline(0, w - 1, top_y, K2)
    dither(s, 0, top_y + 1, w - 1, top_y + 2, K2, K1)
    # front edge
    s.rect(0, edge_y, w - 1, edge_y + 9, K2)
    s.hline(0, w - 1, edge_y, K3)
    s.hline(0, w - 1, edge_y + 1, M4)
    s.hline(0, w - 1, edge_y + 9, K1)
    # drawer unit, left
    s.rect(18, edge_y + 10, 118, h - 1, K1)
    s.rect(22, edge_y + 14, 114, edge_y + 28, K2)
    s.hline(22, 114, edge_y + 14, K3)
    s.rect(58, edge_y + 19, 78, edge_y + 21, M4)
    s.hline(58, 78, edge_y + 19, M5)
    s.rect(22, edge_y + 32, 114, h - 1, K2)
    s.hline(22, 114, edge_y + 32, K3)
    s.vline(18, edge_y + 10, h - 1, K2)
    # leg, right
    s.rect(w - 30, edge_y + 10, w - 18, h - 1, K1)
    s.vline(w - 30, edge_y + 10, h - 1, K2)
    return s


def desk_lamp(k=1.4):
    """Adjustable arm lamp: base on the right, shade hanging on the left facing down.

    Drawn on a 60x76 design grid scaled by k, so the pixel density matches the
    other props when the lamp is shown larger.
    """
    s = Sprite(round(60 * k), round(76 * k))
    q = lambda v: round(v * k)
    P = lambda pts: [(x * k, y * k) for x, y in pts]
    # base
    s.poly(P([(36, 66), (58, 66), (57, 70), (37, 70)]), L6)
    s.rect(q(37), q(70), q(57), q(73), M4)
    s.hline(q(37), q(57), q(73), K3)
    s.hline(q(37), q(56), q(66), L7)
    # post + lower joint
    s.rect(q(45), q(58), q(48), q(66), M5)
    s.vline(q(45), q(58), q(66), L6)
    s.ellipse(46.5 * k, 58 * k, 3.2 * k, 3.2 * k, M4)
    s.ellipse(46.5 * k, 58 * k, 1.4 * k, 1.4 * k, L7)
    # lower arm
    s.poly(P([(45, 56), (48, 56), (39.5, 9), (36.5, 9)]), M4)
    s.line(q(45), q(56), q(36), q(9), L6)
    # elbow joint
    s.ellipse(37.5 * k, 8 * k, 3.4 * k, 3.4 * k, M4)
    s.ellipse(37.5 * k, 8 * k, 1.5 * k, 1.5 * k, L7)
    # upper arm to the shade
    s.poly(P([(35, 6.5), (36.5, 10), (22, 15.5), (20.5, 12.5)]), M4)
    s.line(q(35), q(7), q(21), q(13), M5)
    # shade (cone opening downwards)
    s.poly(P([(10, 11), (22, 11), (28, 33), (3, 33)]), M5)
    s.poly(P([(10, 11), (14, 11), (8, 33), (3, 33)]), L6)
    s.poly(P([(20, 11), (22, 11), (28, 33), (24, 33)]), M4)
    s.rect(q(11), q(8), q(21), q(11), M4)
    s.hline(q(12), q(20), q(8), M5)
    # rim and glowing bulb
    s.hline(q(3), q(28), q(33), L6)
    s.rect(q(4), q(34), q(27), q(34) + 1, K3)
    s.ellipse(15.5 * k, 33 * k, 5 * k, 2.2 * k, W)
    s.outline()
    return s


PROPS = {
    "binders": binders,
    "document-envelope": document_envelope,
    "file-folder": file_folder,
    "paper-tray": paper_tray,
    "paper-stack": paper_stack,
    "paper-sheet": paper_sheet,
    "desk": desk,
    "desk-lamp": desk_lamp,
}

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).resolve().parents[2] / "public/assets/desk")
    os.makedirs(out, exist_ok=True)
    for name, fn in PROPS.items():
        im = fn().image()
        im.save(os.path.join(out, f"{name}.png"))
        print(f"{name}: {im.width}x{im.height}")
