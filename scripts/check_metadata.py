"""Validate the App Store listing against Apple's field limits before pushing.

Ported from the Anker/Scripture Mate release kits — a too-long field is a
round-trip to App Store Connect we don't need to take.
"""

import re
import sys

PATH = "store/localizations/en-US.strings"

LIMITS = {
    "name": 30,
    "subtitle": 30,
    "keywords": 100,
    "description": 4000,
    "promotionalText": 170,
    "whatsNew": 4000,
}
# whatsNew is legitimately empty pre-1.0 (first releases have no section).
REQUIRED = ("name", "subtitle", "description", "keywords")

PAIR = re.compile(r'^"([A-Za-z]+)"\s*=\s*"((?:[^"\\]|\\.)*)"\s*;', re.M)


def load(path: str) -> dict[str, str]:
    text = open(path, encoding="utf-8").read()
    out: dict[str, str] = {}
    for m in PAIR.finditer(text):
        out[m.group(1)] = m.group(2).replace("\\n", "\n").replace('\\"', '"')
    return out


def main() -> int:
    vals = load(PATH)
    problems: list[str] = []

    for key in REQUIRED:
        if not vals.get(key):
            problems.append(f"{key}: missing or empty")

    for key, limit in LIMITS.items():
        if key in vals:
            n = len(vals[key])
            flag = "OK  " if n <= limit else "OVER"
            print(f"  {flag} {key}: {n}/{limit}")
            if n > limit:
                problems.append(f"{key}: {n} > {limit}")

    kw = {k.strip().lower() for k in vals.get("keywords", "").split(",") if k.strip()}
    titled = f"{vals.get('name', '')} {vals.get('subtitle', '')}".lower()
    wasted = sorted(k for k in kw if k and k in titled)
    if wasted:
        problems.append("keywords duplicate the name/subtitle: " + ", ".join(wasted))

    if problems:
        print("\nPROBLEMS:")
        for p in problems:
            print("  -", p)
        return 1

    print("\nlisting is within every limit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
