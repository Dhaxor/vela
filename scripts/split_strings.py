"""Split store/localizations/en-US.strings for the two ASC upload contexts.

Version-level keys go to OUTDIR/version/en-US.strings, app-info keys
(subtitle; name is set at app creation) to OUTDIR/appinfo/en-US.strings.
whatsNew is excluded — first releases have no What's New section.

Usage: python scripts/split_strings.py OUTDIR
"""

import os
import re
import sys

VERSION_KEYS = {"description", "keywords", "promotionalText", "supportUrl", "marketingUrl"}
APPINFO_KEYS = {"subtitle"}

PAIR = re.compile(r'^"([A-Za-z]+)"\s*=\s*"(?:[^"\\]|\\.)*"\s*;', re.M)


def main() -> int:
    outdir = sys.argv[1]
    text = open("store/localizations/en-US.strings", encoding="utf-8").read()
    buckets = {"version": [], "appinfo": []}
    for m in PAIR.finditer(text):
        if m.group(1) in VERSION_KEYS:
            buckets["version"].append(m.group(0))
        elif m.group(1) in APPINFO_KEYS:
            buckets["appinfo"].append(m.group(0))
    for name, lines in buckets.items():
        d = os.path.join(outdir, name)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "en-US.strings"), "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        print(f"{name}: {len(lines)} entries")
    return 0


if __name__ == "__main__":
    sys.exit(main())
