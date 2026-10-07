"""xiaohengOS desktop icons (24x24) in the Monty palette.

    python frontend/tooling/project-icons/draw_desktop_icons.py [out_dir]

Projects → folder, About → README.txt, Experience → terminal .exe,
Contact → envelope with antenna signal.
"""
import os
from pathlib import Path
import sys

from PIL import Image

from draw_icons import Canvas

S = 24


def projects_folder():
    cv = Canvas(S)
    # back panel with tab on the top-left
    cv.rect(1, 4, 9, 6, "S")
    cv.rect(1, 4, 8, 4, "C")
    cv.rect(1, 6, 22, 20, "S")
    # papers peeking out on the right
    cv.rect(11, 3, 20, 9, "W")
    cv.rect(13, 5, 18, 5, "g")
    cv.rect(13, 7, 17, 7, "g")
    # front flap
    cv.poly([(1, 9), (23, 9), (22, 21), (2, 21)], "C")
    cv.rect(1, 9, 22, 9, "W")
    cv.rect(2, 20, 21, 20, "S")
    # phosphor label on the flap
    cv.rect(4, 12, 11, 14, "D")
    cv.rect(5, 13, 10, 13, "G")
    cv.outline()
    return cv


def readme_txt():
    cv = Canvas(S)
    cv.poly([(4, 1), (15, 1), (20, 6), (20, 23), (4, 23)], "W")
    cv.rect(4, 1, 4, 22, "W")
    cv.rect(5, 22, 19, 22, "S")
    cv.rect(19, 7, 19, 22, "S")
    # folded corner
    cv.poly([(15, 1), (15, 6), (20, 6)], "S")
    cv.line(15, 1, 15, 6, "s")
    cv.line(15, 6, 20, 6, "s")
    # "i" badge and text lines
    cv.pixels(6, 3, [
        "DDD",
        "DGD",
        "DDD",
        "DGD",
        "DGD",
        "DDD",
    ])
    for y, w in ((11, 11), (13, 8), (15, 10), (17, 6), (19, 9)):
        cv.rect(6, y, 6 + w, y, "s" if y != 11 else "k")
    cv.outline()
    return cv


def experience_exe():
    cv = Canvas(S)
    # window frame with title bar
    cv.rect(1, 3, 22, 19, "C")
    cv.rect(1, 3, 22, 3, "W")
    cv.rect(1, 3, 1, 19, "W")
    cv.rect(2, 19, 22, 19, "S")
    cv.rect(22, 4, 22, 19, "S")
    cv.rect(2, 4, 21, 5, "S")
    cv.rect(18, 4, 19, 5, "A")
    cv.rect(15, 4, 16, 5, "s")
    # screen
    cv.rect(3, 7, 20, 17, "O")
    cv.rect(4, 8, 19, 16, "D")
    # > prompt and cursor
    cv.set(6, 10, "G")
    cv.set(7, 11, "G")
    cv.set(6, 12, "G")
    cv.rect(9, 12, 11, 12, "G")
    cv.rect(6, 14, 14, 14, "g")
    # stand
    cv.rect(9, 20, 14, 21, "S")
    cv.rect(7, 22, 16, 22, "C")
    cv.outline()
    return cv


def contact_mail():
    cv = Canvas(S)
    # envelope body
    cv.rect(1, 9, 19, 22, "C")
    cv.rect(1, 9, 19, 9, "W")
    cv.rect(2, 22, 19, 22, "S")
    cv.rect(19, 10, 19, 22, "S")
    # flap V
    cv.line(1, 9, 10, 16, "s")
    cv.line(19, 9, 10, 16, "s")
    cv.line(2, 22, 8, 17, "S")
    cv.line(18, 22, 12, 17, "S")
    # stamp
    cv.rect(14, 11, 17, 14, "A")
    cv.rect(15, 12, 16, 13, "Y")
    cv.outline()
    # antenna + signal (unoutlined, like the agent's glow)
    cv.pixels(14, 0, [
        "....gg....",
        "......g...",
        "..GG...g..",
        "....G..g..",
        "OO..G..g..",
        "AO.......",
        "OO.......",
    ])
    return cv


def doom_exe():
    """Pixel skull over a flame – DOOM.exe."""
    cv = Canvas(S)
    # flames on both sides
    flame = [
        ".R..",
        "RrR.",
        "RAr.",
        "AYAR",
        "RYAR",
        ".RA.",
    ]
    cv.pixels(0, 9, flame)
    cv.pixels(20, 9, [row[::-1] for row in flame])
    # skull
    cv.ellipse(12, 10, 7.0, 7.5, "C")
    cv.rect(7, 14, 17, 19, "C")
    cv.rect(8, 19, 16, 21, "S")
    cv.ellipse(12, 8, 5.5, 4.5, "W")
    # eye sockets with red glow
    cv.rect(7, 10, 10, 13, "O")
    cv.rect(14, 10, 17, 13, "O")
    cv.rect(8, 11, 9, 12, "r")
    cv.rect(15, 11, 16, 12, "r")
    cv.set(8, 11, "A")
    cv.set(15, 11, "A")
    # nose + teeth
    cv.rect(11, 14, 12, 15, "O")
    for x in (9, 11, 13, 15):
        cv.rect(x, 18, x, 20, "s")
    cv.rect(7, 16, 17, 16, "S")
    cv.outline()
    return cv


ICONS = {
    "projects": projects_folder,
    "about": readme_txt,
    "experience": experience_exe,
    "contact": contact_mail,
    "doom": doom_exe,
}

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).resolve().parents[2] / "public/assets/desktop-icons")
    os.makedirs(out, exist_ok=True)
    for name, fn in ICONS.items():
        fn().image().save(os.path.join(out, f"{name}.png"))
        print(name)
