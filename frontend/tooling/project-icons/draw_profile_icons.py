"""Profile icons in the Monty palette.

    python frontend/tooling/project-icons/draw_profile_icons.py

Writes the four Profile sub-folder icons (32x32 art, @4x) to
public/assets/profile-icons/ and the 24x24 desktop "Profile" ID card
to public/assets/desktop-icons/profile.png (the desktop item keeps
its internal id `profile`).
"""
import os
from pathlib import Path

from PIL import Image

from draw_icons import Canvas


def experience_briefcase():
    cv = Canvas(32)
    # handle
    cv.rect(11, 5, 20, 6, "k")
    cv.rect(11, 5, 12, 10, "k")
    cv.rect(19, 5, 20, 10, "k")
    # body
    cv.rect(3, 10, 28, 26, "C")
    cv.rect(3, 10, 28, 10, "W")
    cv.rect(3, 10, 3, 26, "W")
    cv.rect(4, 26, 28, 26, "S")
    cv.rect(28, 11, 28, 26, "S")
    # strap + clasp
    cv.rect(3, 16, 28, 17, "S")
    cv.rect(14, 15, 17, 19, "A")
    cv.rect(15, 16, 16, 17, "Y")
    # phosphor label
    cv.rect(6, 20, 11, 23, "D")
    cv.rect(7, 21, 10, 21, "G")
    cv.rect(7, 22, 9, 22, "g")
    cv.outline()
    return cv


def education_cap():
    cv = Canvas(32)
    # book stack
    cv.rect(5, 21, 26, 24, "C")
    cv.rect(5, 21, 26, 21, "W")
    cv.rect(26, 21, 26, 24, "S")
    cv.rect(6, 25, 27, 28, "D")
    cv.rect(6, 25, 27, 25, "g")
    cv.rect(24, 25, 25, 28, "G")
    # cap base
    cv.rect(10, 13, 21, 18, "k")
    cv.rect(10, 18, 21, 18, "O")
    # mortarboard
    cv.poly([(16, 4), (30, 10), (16, 15), (2, 10)], "s")
    cv.poly([(16, 5), (27, 10), (16, 13), (5, 10)], "k")
    cv.set(16, 9, "W")
    # tassel
    cv.line(16, 9, 24, 12, "A")
    cv.rect(24, 12, 24, 17, "A")
    cv.rect(23, 17, 25, 19, "Y")
    cv.outline()
    return cv


def toolkit_box():
    cv = Canvas(32)
    # handle
    cv.rect(11, 6, 20, 7, "s")
    cv.rect(11, 6, 12, 11, "s")
    cv.rect(19, 6, 20, 11, "s")
    # box
    cv.rect(3, 11, 28, 26, "A")
    cv.rect(3, 11, 28, 11, "Y")
    cv.rect(3, 11, 3, 26, "Y")
    cv.rect(4, 26, 28, 26, "r")
    cv.rect(28, 12, 28, 26, "r")
    cv.rect(3, 16, 28, 16, "R")
    cv.rect(14, 15, 17, 18, "C")
    # tools sticking out: wrench + screwdriver
    cv.rect(6, 4, 7, 11, "C")
    cv.rect(5, 3, 8, 4, "C")
    cv.set(6, 3, None)
    cv.rect(23, 2, 24, 7, "S")
    cv.rect(22, 7, 25, 11, "G")
    cv.rect(22, 7, 22, 11, "g")
    cv.outline()
    return cv


def research_flask():
    cv = Canvas(32)
    # neck
    cv.rect(13, 3, 18, 4, "C")
    cv.rect(14, 5, 17, 12, "W")
    # body
    cv.poly([(14, 12), (17, 12), (27, 26), (27, 28), (4, 28), (4, 26)], "W")
    # liquid
    cv.poly([(10, 19), (21, 19), (27, 26), (27, 28), (4, 28), (4, 26)], "G")
    cv.rect(5, 26, 26, 28, "g")
    cv.rect(10, 19, 21, 19, "W")
    # bubbles
    cv.set(12, 23, "W")
    cv.set(17, 22, "W")
    cv.set(20, 25, "W")
    cv.set(15, 16, "C")
    cv.set(16, 14, "C")
    # shading on the glass
    cv.line(15, 13, 6, 26, "C")
    cv.outline()
    # sparkle: an idea
    cv.pixels(23, 4, [
        "..Y..",
        ".YAY.",
        "YAWAY",
        ".YAY.",
        "..Y..",
    ])
    return cv


def profile_id_card():
    cv = Canvas(24)
    # lanyard clip
    cv.rect(10, 1, 13, 3, "s")
    # card
    cv.rect(1, 4, 22, 20, "C")
    cv.rect(1, 4, 22, 4, "W")
    cv.rect(1, 4, 1, 20, "W")
    cv.rect(2, 20, 22, 20, "S")
    cv.rect(22, 5, 22, 20, "S")
    cv.rect(9, 5, 14, 6, "S")
    # photo: little pixel portrait on a phosphor screen
    cv.rect(3, 8, 10, 17, "D")
    cv.rect(5, 9, 8, 12, "C")
    cv.rect(4, 14, 9, 17, "C")
    cv.rect(6, 13, 7, 13, "S")
    # text lines
    cv.rect(12, 9, 20, 9, "k")
    cv.rect(12, 12, 19, 12, "s")
    cv.rect(12, 14, 17, 14, "s")
    cv.rect(12, 16, 20, 17, "A")
    cv.outline()
    return cv


if __name__ == "__main__":
    public = Path(__file__).resolve().parents[2] / "public/assets"
    out = str(public / "profile-icons")
    os.makedirs(out, exist_ok=True)
    for name, fn in {"experience": experience_briefcase, "education": education_cap,
                     "skills": toolkit_box, "research": research_flask}.items():
        im = fn().image()
        im.save(os.path.join(out, f"{name}.png"))
        im.resize((128, 128), Image.NEAREST).save(os.path.join(out, f"{name}@4x.png"))
    profile_id_card().image().save(str(public / "desktop-icons/profile.png"))
    print("profile icons ->", out, "| desktop Profile icon updated")
