#!/usr/bin/env python3
"""Compose the Vela 1.1 "Night Atlas" App Store frames from the raw captures.

    python scripts/shots/store/compose.py [rawDir] [--only 01,04] [--sizes 69,65]

rawDir is what capture.mjs wrote (default: $VELA_STORE_RAW, else
<tmp>/vela-store-raw). Output, in the repo:

    store/screenshots/iphone-69/NN-<name>.png   1320 x 2868 (iPhone 6.9")
    store/screenshots/iphone-65/NN-<name>.png   1284 x 2778 (iPhone 6.5")
    store/screenshots/review-paywall.png        1320 x 2868, the subscription review screenshot

Every frame is drawn at its native size (no resampling of a finished frame):
a Night Atlas background (deep sky gradient, a faint star chart with the real
stars of Vela, a gold horizon bloom), a two-line Newsreader headline with one
italic gold keyword, an Instrument Sans subline, and the raw screen inside an
iPhone drawn here from rounded rectangles (titanium edge, thin black bezel,
Dynamic Island, 9:41 status bar, home indicator; no Apple artwork), or full
bleed. Fonts come from node_modules/@expo-google-fonts (OFL).

Layout is written in 1320-wide units and scaled by width, so the 6.5" frame is
the same design, not a resized copy.
"""

from __future__ import annotations

import json
import math
import os
import random
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[3]
FONTS = ROOT / "node_modules" / "@expo-google-fonts"
OUT = ROOT / "store" / "screenshots"

SIZES = {"69": (1320, 2868), "65": (1284, 2778)}
U = 1320  # design width
RAW_W, RAW_H, RAW_SCALE = 1320, 2868, 3  # 440 x 956 pt @3x (capture.mjs emulates a 62 pt / 34 pt safe area)

# Night Atlas palette (docs/ELEVATE_1.1.md §2, §7)
IVORY = (246, 239, 227)
GOLD = (233, 180, 76)
GOLD_LIGHT = (245, 213, 142)
SKY_TOP = (14, 12, 34)
SKY_MID = (30, 24, 64)
VIOLET = (168, 151, 255)
TEAL = (111, 211, 193)
SKY950 = (5, 4, 13)


def font(family: str, weight: str, size: float) -> ImageFont.FreeTypeFont:
    names = {
        ("newsreader", "600"): "newsreader/600SemiBold/Newsreader_600SemiBold.ttf",
        ("newsreader", "600i"): "newsreader/600SemiBold_Italic/Newsreader_600SemiBold_Italic.ttf",
        ("newsreader", "400i"): "newsreader/400Regular_Italic/Newsreader_400Regular_Italic.ttf",
        ("sans", "400"): "instrument-sans/400Regular/InstrumentSans_400Regular.ttf",
        ("sans", "600"): "instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf",
    }
    path = FONTS / names[(family, weight)]
    if not path.exists():
        sys.exit(f"font missing: {path} (run npm install / bun install first)")
    return ImageFont.truetype(str(path), max(1, round(size)))


# --------------------------------------------------------------------------- frames


@dataclass
class Pop:
    """A piece of a raw screen lifted out of the device (CSS px rect in that raw).

    over=True lifts the piece from where it sits on the device's own screen:
    centred on it, `scale` times its on-device size, nudged by (dx, dy) units
    and turned with the device. Otherwise it floats at (x, y) with `width`.
    """

    raw: str
    rect: str | tuple[float, float, float, float]  # a rect name from <raw>.json, or (x, y, w, h) in CSS px
    x: float = 0  # canvas units: left edge of the lifted piece
    y: float = 0  # canvas units: top edge
    width: float = 800  # canvas units
    radius: float = 20  # CSS px corner radius of the cut
    pad: tuple[float, float, float, float] = (0, 0, 0, 0)  # CSS px: left, top, right, bottom
    clip_bottom: float | None = None  # CSS px: cut the piece here (y in the raw)
    angle: float = 0.0
    over: bool = False
    scale: float = 1.12
    dx: float = 0
    dy: float = 0


@dataclass
class Thread:
    """A thin gold line from one pop-out into another, ending in a lit star.

    `a` and `b` index Frame.pops. The line leaves pop `a` at `a_at` (fractions
    of its box: 0,0 is the top-left corner, 1,1 the bottom-right) and ends at
    the top of pop `b`'s gold rule (the woven paragraph's left rule in the
    reader), found in the raw pixels.
    """

    a: int
    b: int
    a_at: tuple[float, float] = (0.08, 1.0)


@dataclass
class Frame:
    id: str
    raw: str
    head: str  # 'line one|line *two*.' ; *word* is the italic gold keyword
    sub: str
    device_x: float = 0.0  # canvas units: device centre offset from the canvas centre
    device_top: float = 700.0
    screen_w: float = 960.0  # canvas units: width of the screen inside the device
    angle: float = 0.0  # degrees, counter-clockwise
    full_bleed: bool = False
    bleed_crop_top: float = 0  # raw px trimmed from the top of a full-bleed screen
    bleed_top: float = 560  # canvas units where a full-bleed screen starts
    bleed_fade: float = 90  # canvas units over which it fades in
    bleed_tail: float = 220  # canvas units over which it fades out above bleed_crop_bottom
    bleed_crop_bottom: float = RAW_H  # raw px: where a full-bleed screen ends (it fades out above this)
    pops: list[Pop] = field(default_factory=list)
    threads: list[Thread] = field(default_factory=list)
    chip: dict | None = None
    badges: list[str] | None = None
    warmth: float = 0.0  # 0 = deep night (frame 1) … 1 = dawn edge (frame 10)
    seed: int = 1


FRAMES: list[Frame] = [
    Frame(
        id="01-story",
        raw="01-reader-narrating",
        head="Your future, written|as a *story*.",
        sub="A narrated chapter built from your own words.",
        device_top=800,
        screen_w=880,
        chip={"label": "In your words", "text": "“my own design studio, with clients who trust my eye”", "x": 70, "y": 640, "w": 780},
        warmth=0.0,
        seed=11,
    ),
    Frame(
        id="02-bridge",
        raw="02-bridge-chooser",
        head="Then take one|*real* step.",
        sub="Every chapter ends with one small action, sized to your day.",
        device_x=120,
        device_top=700,
        screen_w=900,
        angle=-2.0,
        pops=[Pop(raw="02-bridge-chooser", rect="picked", over=True, scale=1.16, dx=-40, radius=20)],
        warmth=0.08,
        seed=12,
    ),
    Frame(
        id="03-chapter-two",
        raw="03-chapter-two-woven",
        head="What you did writes|*chapter two*.",
        sub="Log one honest sentence. Vela weaves it into what comes next.",
        device_top=860,
        screen_w=880,
        pops=[
            # The woven paragraph, lifted where it sits in Chapter II.
            Pop(raw="03-chapter-two-woven", rect="woven", over=True, scale=1.2, radius=18, pad=(14, 6, 14, 6)),
            # The proof card from the Star Birth screen the flow passed through
            # ('I did it · Today'), about 1.25x the device's scale, top-left over
            # the phone's status bar (its 'II · The Night Before' header stays in view).
            Pop(raw="03-proof-card", rect="receipt", x=40, y=650, width=990, radius=20),
        ],
        # Proof card -> the woven paragraph's gold rule: what you did writes the chapter.
        threads=[Thread(a=1, b=0, a_at=(0.075, 1.0))],
        warmth=0.16,
        seed=13,
    ),
    Frame(
        id="04-sky",
        raw="04-sky",
        head="Every step|becomes a *star*.",
        sub="Your sky only grows. No scores, no streak shame.",
        full_bleed=True,
        # The named sky 'The Studio' (capture.mjs, maya-named Season 1). The crop
        # starts under the in-app eyebrow, title and stats (the headline says it;
        # 380 CSS px = 1140 raw), so the figure sits right under the subline,
        # and it ends (800 CSS px = 2400 raw) under the star's sheet.
        bleed_crop_top=1140,
        bleed_crop_bottom=2400,
        bleed_tail=180,
        bleed_top=560,
        # Star 4's sheet, its Share button included, lifted just under the figure.
        pops=[Pop(raw="04-sky-star", rect="sheet", x=70, y=1700, width=1180, radius=30, clip_bottom=910)],
        warmth=0.25,
        seed=14,
    ),
    Frame(
        id="05-star-birth",
        raw="05-star-birth",
        head="Mark the day|you *did it*.",
        sub="Each proof is born as a new star in your own constellation.",
        device_x=-70,
        device_top=690,
        screen_w=920,
        angle=2.0,
        warmth=0.33,
        seed=15,
    ),
    Frame(
        id="06-listen",
        raw="06-listen",
        head="Listen as often|as you *like*.",
        sub="Original soundscapes, a sleep timer, the voices already on your iPhone.",
        device_x=-130,
        device_top=700,
        screen_w=880,
        # A free listener's soundscape sheet: Night chosen, and Rain on Glass,
        # Hearth and Dawn each with the app's lock and 'Plus' pill (2.3.2).
        # Cut under Dawn (Silence is left out), it sits between the reader's
        # header and the narrated woven paragraph, so the dock (Night, Speed,
        # pause, Sleep 30:00, the voice) stays in view.
        pops=[Pop(raw="06-listen-soundscape", rect="sheet", x=560, y=982, width=700, radius=26, clip_bottom=824)],
        warmth=0.42,
        seed=16,
    ),
    Frame(
        id="07-memory-book",
        raw="07-arc",
        head="Every chapter,|*kept*.",
        sub="Reread your story: chapters, steps and proof, in order.",
        device_x=-110,
        device_top=690,
        screen_w=900,
        pops=[Pop(raw="07-arc", rect="plate", over=True, scale=1.16, dx=40, radius=24)],
        warmth=0.5,
        seed=17,
    ),
    Frame(
        id="08-named-sky",
        raw="08-named-sky",
        head="Name the sky|you *built*.",
        sub="Seven proofs close a season, and a new one begins.",
        device_top=690,
        screen_w=920,
        angle=-1.5,
        pops=[Pop(raw="08-named-sky", rect="plate", over=True, scale=1.1, radius=20)],
        warmth=0.6,
        seed=18,
    ),
    Frame(
        id="09-rituals",
        raw="09-rituals",
        head="Rituals that serve|your *story*.",
        sub="Scripting, 3 · 6 · 9 and gratitude, linked to your chapter.",
        device_x=100,
        device_top=700,
        screen_w=900,
        angle=1.8,
        # The pad keeps the section header ('YOUR LINE ... Library') on the phone
        # and stops above 'Your proof of …'.
        pops=[Pop(raw="09-rituals", rect="line", over=True, scale=1.18, dx=-40, radius=20, pad=(12, 14, 12, 10))],
        warmth=0.75,
        seed=19,
    ),
    Frame(
        id="10-private",
        raw="10-today-sealed",
        head="Private|by *design*.",
        sub="No account. No servers. Your words stay on your iPhone.",
        device_top=900,
        screen_w=840,
        # Two rows (2 + 1), left-aligned with the headline margin.
        badges=["No account", "Works offline", "Data Not Collected"],
        warmth=1.0,
        seed=20,
    ),
]

# --------------------------------------------------------------------------- helpers


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(round(lerp(a, b, t)) for a, b in zip(c1, c2))


def rounded_mask(size: tuple[int, int], radius: float, ss: int = 4) -> Image.Image:
    """An antialiased rounded-rect mask (drawn at ss x, then reduced)."""
    w, h = size
    big = Image.new("L", (w * ss, h * ss), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), radius=radius * ss, fill=255)
    return big.resize((w, h), Image.LANCZOS)


def glow(mask: Image.Image, color, alpha: float, blur: float, spread: float = 0) -> Image.Image:
    """A soft coloured glow from a mask (RGBA, same size as the mask)."""
    m = mask
    if spread > 0:
        m = m.filter(ImageFilter.MaxFilter(int(spread) // 2 * 2 + 1))
    m = m.filter(ImageFilter.GaussianBlur(blur))
    a = m.point(lambda v: round(v * alpha))
    layer = Image.new("RGBA", mask.size, color + (0,))
    layer.putalpha(a)
    return layer


def parse_rich(line: str) -> list[tuple[str, bool]]:
    runs, italic, buf = [], False, ""
    for ch in line:
        if ch == "*":
            if buf:
                runs.append((buf, italic))
            buf, italic = "", not italic
        else:
            buf += ch
    if buf:
        runs.append((buf, italic))
    return runs


def balanced(text: str, f: ImageFont.FreeTypeFont, max_w: float) -> list[str]:
    """One line if it fits; else the two-line split with the most even widths (no lonely last word)."""
    if f.getlength(text) <= max_w:
        return [text]
    words = text.split()
    best = None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        wa, wb = f.getlength(a), f.getlength(b)
        if max(wa, wb) <= max_w:
            # Prefer breaking after a sentence, then after a comma or colon, then the most even split.
            score = abs(wa - wb) - (1000 if a.endswith(".") else 300 if a.endswith((",", ":")) else 0)
            if best is None or score < best[0]:
                best = (score, [a, b])
    return best[1] if best else wrap(text, f, max_w)


def wrap(text: str, f: ImageFont.FreeTypeFont, max_w: float) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if f.getlength(trial) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# --------------------------------------------------------------------------- background

VELA = [  # (ra deg, dec deg): γ δ κ φ μ q ψ λ Velorum (as in lib/sky/figures.ts)
    (122.383, -47.337), (131.176, -54.708), (140.528, -55.011), (149.215, -54.568),
    (161.692, -49.42), (153.684, -42.122), (142.675, -40.467), (136.999, -43.433),
]


def vela_points() -> list[tuple[float, float]]:
    ra0 = sum(p[0] for p in VELA) / len(VELA)
    dec0 = sum(p[1] for p in VELA) / len(VELA)
    k = math.cos(math.radians(dec0))
    raw = [(-(ra - ra0) * k, -(dec - dec0)) for ra, dec in VELA]
    xs, ys = [p[0] for p in raw], [p[1] for p in raw]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    return [((x - min(xs)) / w, (y - min(ys)) / h * (h / w)) for x, y in raw]


def background(W: int, H: int, fr: Frame) -> Image.Image:
    s = W / U
    t = fr.warmth
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    v = yy / H

    # L0: deep sky, warming a little from frame 1 (night) to frame 10 (the dawn edge).
    bottom = np.array(mix((42, 31, 70), (62, 44, 70), t), np.float32)  # dusk, never pink
    top = np.array(SKY_TOP, np.float32)
    mid = np.array(mix(SKY_MID, (36, 27, 66), t), np.float32)
    a = np.clip(v / 0.55, 0, 1)[..., None]
    b = np.clip((v - 0.55) / 0.45, 0, 1)[..., None]
    img = top * (1 - a) + mid * a
    img = img * (1 - b) + bottom * b

    def bloom(cx, cy, rx, ry, color, peak):
        d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
        return np.exp(-d * 2.2)[..., None] * np.array(color, np.float32) * peak

    # L3: nebula washes (violet high left, teal low right), then the gold horizon bloom.
    img += bloom(W * 0.12, H * 0.16, W * 0.75, H * 0.16, VIOLET, 0.07)
    img += bloom(W * 0.95, H * 0.52, W * 0.6, H * 0.2, TEAL, 0.035)
    img += bloom(W * 0.5, H * 0.96, W * 1.05, H * 0.26, GOLD, lerp(0.17, 0.27, t))
    img += bloom(W * 0.5, H * 1.02, W * 0.55, H * 0.1, (255, 214, 150), lerp(0.08, 0.14, t))
    base = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    # L2: chart line-work at 5-7% (declination arcs, converging meridians, a tick scale).
    chart = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(chart)
    line = (214, 206, 255, 17)
    cx, cy = W * 0.5, H * 1.9
    for r in (H * 1.05, H * 1.32, H * 1.62):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=line, width=max(1, round(2 * s)))
    px, py = W * 0.5, -H * 0.9
    for xb in (-0.35, 0.12, 0.6, 1.08):
        d.line((px, py, W * xb, H * 1.05), fill=line, width=max(1, round(2 * s)))
    edge_x = W - 22 * s
    for i in range(0, 120):
        y = 120 * s + i * 24 * s
        if y > H:
            break
        ln = 26 * s if i % 5 == 0 else 13 * s
        d.line((edge_x - ln, y, edge_x, y), fill=(214, 206, 255, 26), width=max(1, round(2 * s)))

    # The real stars of Vela, as engraved chart line-work, high on the right.
    pts = vela_points()
    fw = 380 * s
    ox, oy = W - fw - 70 * s, 40 * s
    if fr.full_bleed:
        ox, oy = W - fw - 60 * s, 30 * s
    q = [(ox + x * fw, oy + y * fw) for x, y in pts]
    for i in range(len(q)):
        d.line((*q[i], *q[(i + 1) % len(q)]), fill=(245, 213, 142, 30), width=max(1, round(2 * s)))
    for x, y in q:
        r = 5 * s
        d.ellipse((x - r, y - r, x + r, y + r), outline=(245, 213, 142, 60), width=max(1, round(2 * s)))
    base.alpha_composite(chart)

    # L1: a seeded starfield (three radii, three opacities), a few with a soft halo.
    rng = random.Random(fr.seed)
    stars = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ds, dh = ImageDraw.Draw(stars), ImageDraw.Draw(halo)
    for _ in range(int(230 * (W * H) / (1320 * 2868))):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        r = rng.choice((1.3, 2.0, 3.0)) * s
        o = rng.choice((0.35, 0.6, 0.9))
        if y < 660 * s:  # behind the headline and subline: faint specks only
            r, o = min(r, 2.0 * s), o * 0.3
        tint = rng.choice(((255, 255, 255), (255, 243, 214), (201, 216, 255)))
        ds.ellipse((x - r, y - r, x + r, y + r), fill=tint + (round(255 * o),))
        if r > 2.5 * s and y > 660 * s and rng.random() < 0.35:
            hr = r * 5
            dh.ellipse((x - hr, y - hr, x + hr, y + hr), fill=tint + (60,))
    base.alpha_composite(halo.filter(ImageFilter.GaussianBlur(6 * s)))
    base.alpha_composite(stars)
    return base


# --------------------------------------------------------------------------- the phone


def status_bar(screen: Image.Image) -> Image.Image:
    """9:41, signal, Wi-Fi and a full battery, drawn at the raw 3x scale; plus the home indicator."""
    im = screen.convert("RGBA")
    k = RAW_SCALE
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    white = (255, 255, 255, 255)
    cy = 30 * k  # vertical centre of the Dynamic Island row
    f = font("sans", "600", 17.5 * k)
    tw = f.getlength("9:41")
    d.text((80 * k - tw / 2, cy), "9:41", font=f, fill=white, anchor="lm")

    x = 322 * k
    # cellular: four bars
    bw, gap = 3.1 * k, 1.6 * k
    for i, hgt in enumerate((4.4, 6.6, 8.8, 11.2)):
        x0 = x + i * (bw + gap)
        d.rounded_rectangle((x0, cy + 5.6 * k - hgt * k, x0 + bw, cy + 5.6 * k), radius=0.9 * k, fill=white)
    x += 4 * bw + 3 * gap + 6 * k
    # Wi-Fi: three arcs over a dot
    wx, wy = x + 8 * k, cy + 5.4 * k
    for r, wd in ((11.5, 2.3), (7.6, 2.3), (3.6, 0)):
        if wd:
            d.arc((wx - r * k, wy - r * k, wx + r * k, wy + r * k), start=225, end=315, fill=white, width=round(wd * k))
        else:
            d.pieslice((wx - r * k, wy - r * k, wx + r * k, wy + r * k), start=225, end=315, fill=white)
    x += 16 * k + 6 * k
    # battery: outline at 40%, full level, the nub
    bw2, bh = 25 * k, 12 * k
    d.rounded_rectangle((x, cy - bh / 2, x + bw2, cy + bh / 2), radius=3.6 * k, outline=(255, 255, 255, 105), width=round(1 * k))
    d.rounded_rectangle((x + 2 * k, cy - bh / 2 + 2 * k, x + bw2 - 2 * k, cy + bh / 2 - 2 * k), radius=2.2 * k, fill=white)
    d.rounded_rectangle((x + bw2 + 1.2 * k, cy - 2.2 * k, x + bw2 + 2.8 * k, cy + 2.2 * k), radius=1 * k, fill=(255, 255, 255, 105))

    # home indicator
    hw, hh = 144 * k, 5 * k
    hx, hy = (im.width - hw) / 2, im.height - 8 * k - hh
    d.rounded_rectangle((hx, hy, hx + hw, hy + hh), radius=hh / 2, fill=(255, 255, 255, 215))
    im.alpha_composite(ov)
    return im


def phone(screen: Image.Image) -> tuple[Image.Image, Image.Image, tuple[int, int]]:
    """The iPhone around a raw screen, at the raw scale. Returns (device RGBA, silhouette mask, display origin)."""
    SW, SH = screen.size
    bezel = round(SW * 0.021)
    rim = round(SW * 0.0105)
    side = round(SW * 0.006)  # button protrusion
    rs = SW * 0.138  # display corner radius
    W = SW + 2 * (bezel + rim) + 2 * side
    H = SH + 2 * (bezel + rim)
    ss = 2
    big = Image.new("RGBA", (W * ss, H * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    ox = side * ss
    body = (ox, 0, W * ss - ox - 1, H * ss - 1)
    ro = (rs + bezel + rim) * ss

    # side buttons (behind the rim)
    btn = (52, 50, 62, 255)
    def button(xl, y0, y1):
        d.rounded_rectangle((xl, y0 * ss, xl + (side + rim) * ss, y1 * ss), radius=side * ss, fill=btn)
    button(0, H * 0.175, H * 0.205)  # action
    button(0, H * 0.235, H * 0.29)  # volume up
    button(0, H * 0.305, H * 0.36)  # volume down
    button(W * ss - (side + rim) * ss, H * 0.25, H * 0.335)  # side button

    # titanium rim: a soft diagonal gradient with a lighter outer edge
    rim_img = Image.new("RGBA", big.size, (0, 0, 0, 0))
    g = np.linspace(0, 1, W * ss, dtype=np.float32)[None, :] * 0.6 + np.linspace(0, 1, H * ss, dtype=np.float32)[:, None] * 0.4
    c0, c1 = np.array((84, 80, 98), np.float32), np.array((34, 33, 44), np.float32)
    grad = c0 * (1 - g[..., None]) + c1 * g[..., None]
    rim_img = Image.fromarray(grad.astype(np.uint8), "RGB").convert("RGBA")
    rim_mask = Image.new("L", big.size, 0)
    ImageDraw.Draw(rim_mask).rounded_rectangle(body, radius=ro, fill=255)
    big.paste(rim_img, (0, 0), rim_mask)
    d.rounded_rectangle(body, radius=ro, outline=(170, 166, 190, 150), width=max(2, round(ss * SW * 0.0016)))
    inner = (ox + rim * ss, rim * ss, W * ss - ox - rim * ss - 1, H * ss - rim * ss - 1)
    d.rounded_rectangle(inner, radius=(rs + bezel) * ss, fill=(4, 4, 7, 255), outline=(16, 15, 22, 255), width=ss * 2)
    dev = big.resize((W, H), Image.LANCZOS)

    # the display
    sx, sy = side + rim + bezel, rim + bezel
    dev.paste(screen.convert("RGB"), (sx, sy), rounded_mask((SW, SH), rs))
    # Dynamic Island
    d2 = ImageDraw.Draw(dev)
    iw, ih = SW * 126 / 440, SW * 37 / 440
    ix, iy = sx + (SW - iw) / 2, sy + SW * 11 / 440
    d2.rounded_rectangle((ix, iy, ix + iw, iy + ih), radius=ih / 2, fill=(0, 0, 0, 255))
    lens = ih * 0.2
    lx, ly = ix + iw - ih * 0.6, iy + ih / 2
    d2.ellipse((lx - lens, ly - lens, lx + lens, ly + lens), fill=(9, 10, 17, 255))

    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((side, 0, W - side - 1, H - 1), radius=(rs + bezel + rim), fill=255)
    return dev, mask, (sx, sy)


# --------------------------------------------------------------------------- composition


class Raws:
    def __init__(self, root: Path):
        self.root = root
        self.cache: dict[str, tuple[Image.Image, dict]] = {}

    def get(self, name: str) -> tuple[Image.Image, dict]:
        if name not in self.cache:
            png, meta = self.root / f"{name}.png", self.root / f"{name}.json"
            if not png.exists():
                sys.exit(f"missing raw {png}; run: node scripts/shots/store/capture.mjs {self.root}")
            im = Image.open(png).convert("RGB")
            if im.size != (RAW_W, RAW_H):
                sys.exit(f"{png} is {im.size}, expected {(RAW_W, RAW_H)}")
            self.cache[name] = (im, json.loads(meta.read_text(encoding="utf-8")) if meta.exists() else {"rects": {}})
        return self.cache[name]


def text_layer(W: int, H: int, fr: Frame, s: float) -> tuple[Image.Image, float]:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0 = 100 * s
    max_w = (U - 200) * s
    lines = [parse_rich(l) for l in fr.head.split("|")]
    size = 132 * s
    while True:
        reg, ita = font("newsreader", "600", size), font("newsreader", "600i", size)
        widths = [sum((ita if it else reg).getlength(t) for t, it in runs) for runs in lines]
        if max(widths) <= max_w or size <= 112 * s:
            break
        size -= 2 * s
    lead = size * 1.08
    y = 150 * s + size * 0.8  # first baseline
    for runs in lines:
        x = x0
        for text, it in runs:
            f = ita if it else reg
            d.text((x, y), text, font=f, fill=(GOLD if it else IVORY) + (255,), anchor="ls")
            x += f.getlength(text)
        y += lead
    y += -lead + size * 0.3 + 44 * s
    sf = font("sans", "400", 50 * s)
    for ln in balanced(fr.sub, sf, max_w)[:2]:
        y += 50 * s
        d.text((x0, y), ln, font=sf, fill=IVORY + (186,), anchor="ls")
        y += 50 * s * 0.36
    # a soft dark halo behind the text so it reads on any sky
    a = layer.getchannel("A").filter(ImageFilter.GaussianBlur(14 * s)).point(lambda v: round(v * 0.45))
    shade = Image.new("RGBA", (W, H), SKY950 + (0,))
    shade.putalpha(a)
    shade.alpha_composite(layer)
    return shade, y


def place_device(canvas: Image.Image, fr: Frame, raw: Image.Image, s: float):
    """Draw the phone; return map(css_x, css_y) -> canvas (x, y) for points on its display."""
    W, H = canvas.size
    screen = status_bar(raw)
    dev, mask, (sx, sy) = phone(screen)
    w0, h0 = dev.size
    k = (fr.screen_w * s) / RAW_W  # raw px -> canvas px
    if fr.angle:
        dev = dev.rotate(fr.angle, resample=Image.BICUBIC, expand=True)
        mask = mask.rotate(fr.angle, resample=Image.BICUBIC, expand=True)
    w1, h1 = dev.size
    tw, th = round(w1 * k), round(h1 * k)
    dev = dev.resize((tw, th), Image.LANCZOS)
    mask = mask.resize((tw, th), Image.LANCZOS)
    x = round(W / 2 + fr.device_x * s - tw / 2)
    y = round(fr.device_top * s - (h1 - h0) * k / 2)  # device_top is the top of the upright phone
    a = math.radians(fr.angle)

    def to_canvas(cx: float, cy: float) -> tuple[float, float]:
        px, py = sx + cx * RAW_SCALE - w0 / 2, sy + cy * RAW_SCALE - h0 / 2
        rx, ry = px * math.cos(a) + py * math.sin(a), -px * math.sin(a) + py * math.cos(a)
        return x + (w1 / 2 + rx) * k, y + (h1 / 2 + ry) * k

    # gold-tinted glow and a sky-tinted shadow under the device (never grey)
    pad = round(160 * s)
    big = Image.new("L", (tw + 2 * pad, th + 2 * pad), 0)
    big.paste(mask, (pad, pad))
    sh = glow(big, SKY950, 0.75, 46 * s)
    gl = glow(big, GOLD, 0.30, 70 * s, spread=10 * s)
    for layer, dy in ((sh, round(30 * s)), (gl, 0)):
        _composite_clipped(canvas, layer, x - pad, y - pad + dy)
    _composite_clipped(canvas, dev, x, y)
    to_canvas.k = k  # type: ignore[attr-defined]
    return to_canvas


def _composite_clipped(canvas: Image.Image, layer: Image.Image, x: int, y: int):
    """alpha_composite that tolerates a layer hanging off any edge."""
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(canvas.width, x + layer.width), min(canvas.height, y + layer.height)
    if x1 <= x0 or y1 <= y0:
        return
    piece = layer.crop((x0 - x, y0 - y, x1 - x, y1 - y))
    canvas.alpha_composite(piece, (x0, y0))


def place_pop(canvas: Image.Image, pop: Pop, raws: Raws, s: float, fr: Frame, to_canvas=None):
    raw, meta = raws.get(pop.raw)
    r = meta["rects"].get(pop.rect) if isinstance(pop.rect, str) else dict(zip("xywh", pop.rect))
    if not r:
        sys.exit(f"{pop.raw}.json has no rect '{pop.rect}'; recapture with capture.mjs")
    pl, pt, pr, pb = pop.pad
    x0, y0 = r["x"] - pl, r["y"] - pt
    x1, y1 = r["x"] + r["w"] + pr, r["y"] + r["h"] + pb
    if pop.clip_bottom is not None:
        y1 = min(y1, pop.clip_bottom)
    piece = raw.crop(tuple(round(v * RAW_SCALE) for v in (x0, y0, x1, y1)))
    crop_raw = piece
    if pop.over:
        if to_canvas is None:
            sys.exit(f"{fr.id}: an over-mode pop-out needs a device")
        k = to_canvas.k * pop.scale
        cx, cy = to_canvas((x0 + x1) / 2, (y0 + y1) / 2)
        angle = fr.angle
    else:
        k = (pop.width * s) / piece.width
        angle = pop.angle
    tw, th = round(piece.width * k), round(piece.height * k)
    piece = piece.resize((tw, th), Image.LANCZOS).convert("RGBA")
    rad = pop.radius * RAW_SCALE * k
    m = rounded_mask((tw, th), rad)
    piece.putalpha(m)
    # hairline gold edge
    edge = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle((1, 1, tw - 2, th - 2), radius=rad, outline=GOLD_LIGHT + (120,), width=max(2, round(2.5 * s)))
    piece.alpha_composite(edge)
    if angle:
        piece = piece.rotate(angle, resample=Image.BICUBIC, expand=True)
    if pop.over:
        x, y = round(cx + pop.dx * s - piece.width / 2), round(cy + pop.dy * s - piece.height / 2)
    else:
        x, y = round(pop.x * s), round(pop.y * s)
    pad = round(140 * s)
    big = Image.new("L", (piece.width + 2 * pad, piece.height + 2 * pad), 0)
    big.paste(piece.getchannel("A"), (pad, pad))
    _composite_clipped(canvas, glow(big, SKY950, 0.85, 40 * s), x - pad, y - pad + round(26 * s))
    _composite_clipped(canvas, glow(big, GOLD, 0.34, 46 * s, spread=6 * s), x - pad, y - pad)
    _composite_clipped(canvas, piece, x, y)
    # Where it landed: the canvas box, and the raw crop with its raw px -> canvas scale (unrotated pieces).
    return {"x": x, "y": y, "w": piece.width, "h": piece.height, "k": k, "crop": crop_raw, "angle": angle}


def find_rule(crop: Image.Image) -> tuple[int, int] | None:
    """(x, top) of the longest vertical GOLD_LIGHT rule in the left third of a raw crop (raw px), or None."""
    a = np.asarray(crop.convert("RGB")).astype(np.int16)
    near = np.abs(a - np.array(GOLD_LIGHT, np.int16)).sum(axis=2) < 60
    best = (0, 0, 0)  # run length, x, top
    for x in range(near.shape[1] // 3):
        run = start = 0
        for yy, v in enumerate(near[:, x]):
            if v:
                if run == 0:
                    start = yy
                run += 1
                if run > best[0]:
                    best = (run, x, start)
            else:
                run = 0
    if best[0] < crop.height * 0.3:
        return None
    return best[1], best[2]


def place_thread(canvas: Image.Image, th: Thread, placed: list[dict], s: float, fr: Frame):
    """A thin gold line from pop `a` (at a_at) into the top of pop `b`'s gold rule, ending in a lit star."""
    pa, pb = placed[th.a], placed[th.b]
    if pa["angle"] or pb["angle"]:
        sys.exit(f"{fr.id}: threads join unrotated pop-outs only")
    x0 = pa["x"] + pa["w"] * th.a_at[0]
    y0 = pa["y"] + pa["h"] * th.a_at[1]
    rule = find_rule(pb["crop"])
    if rule is None:
        sys.exit(f"{fr.id}: no gold rule found in pop-out {th.b} for the thread")
    x1 = pb["x"] + (rule[0] + 2) * pb["k"]
    y1 = pb["y"] + rule[1] * pb["k"]
    # A gentle S: straight down out of the card, then into the rule from above.
    dy = y1 - y0
    p0, p1, p2, p3 = (x0, y0 + 10 * s), (x0, y0 + dy * 0.55), (x1, y1 - dy * 0.45), (x1, y1)
    pts = []
    for i in range(121):
        t = i / 120
        mt = 1 - t
        pts.append((
            mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0],
            mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1],
        ))
    line = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(line).line(pts, fill=GOLD_LIGHT + (190,), width=max(2, round(3.5 * s)), joint="curve")
    halo = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.line(pts, fill=GOLD + (120,), width=max(4, round(12 * s)), joint="curve")
    r = 34 * s
    hd.ellipse((x1 - r, y1 - r, x1 + r, y1 + r), fill=GOLD_LIGHT + (170,))
    canvas.alpha_composite(halo.filter(ImageFilter.GaussianBlur(10 * s)))
    canvas.alpha_composite(line)
    d = ImageDraw.Draw(canvas)
    d.ellipse((x0 - 6 * s, y0 + 4 * s, x0 + 6 * s, y0 + 16 * s), fill=GOLD_LIGHT + (230,))
    _star(d, x1, y1, 20 * s, (255, 236, 190, 255))


def place_chip(canvas: Image.Image, chip: dict, s: float):
    """The user's own words as a gold chip (Newsreader italic in gold, on vellum)."""
    lab = font("sans", "600", 34 * s)
    words = font("newsreader", "400i", 52 * s)
    max_w = chip["w"] * s - 2 * 48 * s
    lines = wrap(chip["text"], words, max_w)
    w = chip["w"] * s
    h = (48 + 34 + 22) * s + len(lines) * 66 * s + 40 * s
    x, y = chip["x"] * s, chip["y"] * s
    card = Image.new("RGBA", (round(w), round(h)), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    rad = 34 * s
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=rad, fill=(25, 22, 58, 255), outline=GOLD_LIGHT + (150,), width=max(2, round(2.5 * s)))
    # gold corner ticks, as on the app's gilded plates
    t = 30 * s
    for cx, cy, sx, sy in ((22 * s, 22 * s, 1, 1), (w - 22 * s, 22 * s, -1, 1), (22 * s, h - 22 * s, 1, -1), (w - 22 * s, h - 22 * s, -1, -1)):
        d.line((cx, cy, cx + sx * t, cy), fill=GOLD_LIGHT + (200,), width=max(2, round(2.5 * s)))
        d.line((cx, cy, cx, cy + sy * t), fill=GOLD_LIGHT + (200,), width=max(2, round(2.5 * s)))
    star_x, ty = 48 * s, 48 * s + 30 * s
    _star(d, star_x + 12 * s, ty - 12 * s, 13 * s, GOLD_LIGHT + (255,))
    d.text((star_x + 36 * s, ty), chip["label"].upper(), font=lab, fill=GOLD_LIGHT + (255,), anchor="ls")
    yy = ty + 22 * s
    for ln in lines:
        yy += 66 * s
        d.text((48 * s, yy - 14 * s), ln, font=words, fill=GOLD_LIGHT + (255,), anchor="ls")
    pad = round(140 * s)
    big = Image.new("L", (card.width + 2 * pad, card.height + 2 * pad), 0)
    big.paste(card.getchannel("A"), (pad, pad))
    _composite_clipped(canvas, glow(big, SKY950, 0.85, 40 * s), round(x) - pad, round(y) - pad + round(26 * s))
    _composite_clipped(canvas, glow(big, GOLD, 0.38, 50 * s, spread=6 * s), round(x) - pad, round(y) - pad)
    _composite_clipped(canvas, card, round(x), round(y))


def _star(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float, fill):
    """The app's four-point proof star."""
    pts = []
    for i in range(8):
        ang = math.pi / 2 * (i // 2) + (math.pi / 4 if i % 2 else 0) - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.3
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=fill)


def badge_rows(labels: list[str], s: float) -> list[list[tuple[str, float]]]:
    """The badges as rows that fit between the headline margins (100 units each side)."""
    f = font("sans", "600", 44 * s)
    gap, hpad = BADGE_GAP * s, 26 * s
    max_w = (U - 200) * s
    rows: list[list[tuple[str, float]]] = [[]]
    used = 0.0
    for l in labels:
        w = f.getlength(l) + 2 * hpad + 40 * s
        if rows[-1] and used + gap + w > max_w:
            rows.append([])
            used = 0.0
        used += (gap if rows[-1] else 0) + w
        rows[-1].append((l, w))
    return rows


BADGE_H, BADGE_GAP = 92, 18  # units


def place_badges(canvas: Image.Image, labels: list[str], s: float, y: float) -> float:
    """Engraved badges, left-aligned with the headline (x = 100 units) and wrapped into rows. Returns their bottom."""
    f = font("sans", "600", 44 * s)
    gap, hpad, h = BADGE_GAP * s, 26 * s, BADGE_H * s
    for row in badge_rows(labels, s):
        x = 100 * s
        for l, w in row:
            layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            ld = ImageDraw.Draw(layer)
            ld.rounded_rectangle((x, y, x + w, y + h), radius=h / 2, fill=(25, 22, 58, 200), outline=GOLD_LIGHT + (130,), width=max(2, round(2.5 * s)))
            _star(ld, x + hpad + 12 * s, y + h / 2, 13 * s, GOLD_LIGHT + (255,))
            ld.text((x + hpad + 38 * s, y + h / 2), l, font=f, fill=IVORY + (255,), anchor="lm")
            canvas.alpha_composite(layer)
            x += w + gap
        y += h + gap
    return y - gap


def place_full_bleed(canvas: Image.Image, fr: Frame, raw: Image.Image, s: float, text_bottom: float):
    W, H = canvas.size
    k = W / RAW_W
    crop = raw.crop((0, round(fr.bleed_crop_top), RAW_W, round(fr.bleed_crop_bottom)))
    crop = crop.resize((W, round(crop.height * k)), Image.LANCZOS).convert("RGBA")
    top = round(max(fr.bleed_top * s, text_bottom + 30 * s))  # never under a two-line subline
    fade = round(fr.bleed_fade * s)
    a = np.full((crop.height,), 255, np.float32)
    ramp = np.clip(np.arange(fade, dtype=np.float32) / fade, 0, 1)
    a[:fade] = 255 * (ramp ** 1.6)
    if fr.bleed_crop_bottom < RAW_H:
        tail = round(fr.bleed_tail * s)
        a[-tail:] = np.minimum(a[-tail:], 255 * (np.linspace(1, 0, tail, dtype=np.float32) ** 1.4))
    alpha = Image.fromarray(np.repeat(a[:, None], W, axis=1).astype(np.uint8), "L")
    crop.putalpha(alpha)
    _composite_clipped(canvas, crop, 0, top)
    # the same gold horizon over the bottom of the sky, so the set stays one family
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dd = ((xx - W * 0.5) / (W * 1.0)) ** 2 + ((yy - H * 1.0) / (H * 0.2)) ** 2
    bl = (np.exp(-dd * 2.2) * 255 * (0.16 + 0.1 * fr.warmth)).astype(np.uint8)
    layer = Image.new("RGBA", (W, H), GOLD + (0,))
    layer.putalpha(Image.fromarray(bl, "L"))
    canvas.alpha_composite(layer)


def compose(fr: Frame, size: tuple[int, int], raws: Raws) -> Image.Image:
    W, H = size
    s = W / U
    canvas = background(W, H, fr)
    raw, _ = raws.get(fr.raw)
    text, bottom = text_layer(W, H, fr, s)
    to_canvas = None
    if fr.full_bleed:
        place_full_bleed(canvas, fr, raw, s, bottom)
    else:
        to_canvas = place_device(canvas, fr, raw, s)
    placed = [place_pop(canvas, pop, raws, s, fr, to_canvas) for pop in fr.pops]
    for th in fr.threads:
        place_thread(canvas, th, placed, s, fr)
    if fr.chip:
        place_chip(canvas, fr.chip, s)
    canvas.alpha_composite(text)
    if fr.badges:
        end = place_badges(canvas, fr.badges, s, bottom + 44 * s)
        if not fr.full_bleed and end > (fr.device_top - 12) * s:
            sys.exit(f"{fr.id}: the badges end at {end / s:.0f} units, under the device (device_top {fr.device_top})")
    return canvas.convert("RGB")


def review_paywall(raws: Raws) -> Image.Image:
    raw, _ = raws.get("review-paywall")
    return status_bar(raw).convert("RGB")


def main(argv: list[str]) -> int:
    args = list(argv)
    only = sizes = None
    if "--only" in args:
        i = args.index("--only")
        only = [o.strip() for o in args[i + 1].split(",") if o.strip()]
        del args[i : i + 2]
    if "--sizes" in args:
        i = args.index("--sizes")
        sizes = [o.strip() for o in args[i + 1].split(",") if o.strip()]
        del args[i : i + 2]
    raw_dir = Path(args[0] if args else os.environ.get("VELA_STORE_RAW") or Path(tempfile.gettempdir()) / "vela-store-raw")
    raws = Raws(raw_dir)
    frames = [f for f in FRAMES if not only or any(f.id.startswith(o) for o in only)]
    for key in sizes or list(SIZES):
        W, H = SIZES[key]
        out_dir = OUT / f"iphone-{key}"
        out_dir.mkdir(parents=True, exist_ok=True)
        for fr in frames:
            im = compose(fr, (W, H), raws)
            assert im.size == (W, H), (fr.id, im.size)
            path = out_dir / f"{fr.id}.png"
            im.save(path, optimize=True)
            print(f"frame {path.relative_to(ROOT)}  {W}x{H}")
    if not only or "review" in only:
        im = review_paywall(raws)
        path = OUT / "review-paywall.png"
        im.save(path, optimize=True)
        print(f"review {path.relative_to(ROOT)}  {im.width}x{im.height}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
