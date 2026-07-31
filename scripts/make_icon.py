"""Generate Vela's icon, splash, adaptive icon and favicon.

A gold sail (vela) under a star on the night sky — pure geometry, no external
assets. Rerun any time; deterministic output.
"""

from PIL import Image, ImageDraw

NIGHT = (11, 10, 24, 255)        # colors.bg
NIGHT_HI = (28, 26, 58, 255)     # colors.card
GOLD = (233, 180, 76, 255)       # colors.accent
GOLD_DIM = (233, 180, 76, 90)
STAR = (244, 241, 255, 255)


def radial_night(size: int) -> Image.Image:
    """Night background with a soft violet glow rising from the bottom."""
    img = Image.new("RGBA", (size, size), NIGHT)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    cx, cy, r = size * 0.5, size * 1.05, size * 0.85
    steps = 48
    for i in range(steps, 0, -1):
        t = i / steps
        alpha = int(46 * (1 - t))
        d.ellipse(
            [cx - r * t, cy - r * t, cx + r * t, cy + r * t],
            fill=(157, 140, 255, alpha),
        )
    return Image.alpha_composite(img, glow)


def draw_sail(d: ImageDraw.ImageDraw, size: int, scale: float = 1.0) -> None:
    s = size * scale
    ox = (size - s) / 2
    oy = (size - s) / 2

    def p(x: float, y: float):
        return (ox + x * s, oy + y * s)

    # Main sail — tall triangle with a gentle luff curve suggested by a notch.
    d.polygon([p(0.52, 0.20), p(0.52, 0.66), p(0.24, 0.66)], fill=GOLD)
    # Foresail, dimmer.
    d.polygon([p(0.56, 0.30), p(0.56, 0.66), p(0.74, 0.66)], fill=GOLD_DIM)
    # Hull — shallow arc.
    d.pieslice([p(0.18, 0.56)[0], p(0.18, 0.56)[1], p(0.82, 0.92)[0], p(0.82, 0.92)[1]],
               start=15, end=165, fill=NIGHT_HI)
    d.pieslice([p(0.20, 0.545)[0], p(0.20, 0.545)[1], p(0.80, 0.86)[0], p(0.80, 0.86)[1]],
               start=15, end=165, fill=GOLD)
    # The star being sailed toward.
    cx, cy = p(0.52, 0.115)
    r = 0.028 * s
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=STAR)
    rr = 0.075 * s
    d.line([cx - rr, cy, cx + rr, cy], fill=(244, 241, 255, 120), width=max(2, int(s * 0.008)))
    d.line([cx, cy - rr, cx, cy + rr], fill=(244, 241, 255, 120), width=max(2, int(s * 0.008)))


def make(path: str, size: int, content_scale: float, bg: bool = True) -> None:
    img = radial_night(size) if bg else Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_sail(d, size, content_scale)
    img.save(path)
    print(f"wrote {path} ({size}x{size})")


if __name__ == "__main__":
    import os

    os.makedirs("assets", exist_ok=True)
    make("assets/icon.png", 1024, 0.92)
    make("assets/adaptive-icon.png", 1024, 0.62)          # android safe zone
    make("assets/splash-icon.png", 512, 0.98, bg=False)   # transparent, on bg color
    make("assets/favicon.png", 96, 0.98)
