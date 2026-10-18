#!/usr/bin/env python3
"""Pick the simulator for a device kind on the newest iOS runtime.

    python3 pick-device.py promax|small
    -> <runtime id>\t<device type id>\t<device type name>\t<W>x<H> (points)

promax: iPhone 16 Pro Max (440x956), else the newest Pro Max.
small:  the iPhone with the smallest screen (in points) that the runtime
        supports (an SE-class 375x667 when there is one, else 16e-class).
Screen sizes come from each device type's profile.plist.
"""
import json
import os
import plistlib
import subprocess
import sys

kind = sys.argv[1] if len(sys.argv) > 1 else "promax"


def sim(*args):
    return json.loads(subprocess.check_output(["xcrun", "simctl", "list", *args, "-j"]))


runtimes = [r for r in sim("runtimes", "available")["runtimes"] if r.get("platform") == "iOS" or r.get("name", "").startswith("iOS")]
runtimes.sort(key=lambda r: [int(p) for p in r["version"].split(".")])
runtime = runtimes[-1]
types = [t for t in runtime.get("supportedDeviceTypes", []) if t.get("productFamily") == "iPhone" or t.get("name", "").startswith("iPhone")]
if not types:
    types = [t for t in sim("devicetypes")["devicetypes"] if t.get("name", "").startswith("iPhone")]
all_types = {t["name"]: t for t in sim("devicetypes")["devicetypes"]}


def points(t):
    bundle = t.get("bundlePath") or all_types.get(t["name"], {}).get("bundlePath", "")
    try:
        with open(os.path.join(bundle, "Contents", "Resources", "profile.plist"), "rb") as f:
            p = plistlib.load(f)
        s = float(p.get("mainScreenScale", 3))
        return (p["mainScreenWidth"] / s, p["mainScreenHeight"] / s)
    except Exception:
        return None


names = {t["name"]: t for t in types}
if kind == "promax":
    pick = next((names[n] for n in ["iPhone 16 Pro Max", "iPhone 17 Pro Max", "iPhone 15 Pro Max", "iPhone 16 Plus"] if n in names), types[-1])
else:
    sized = [(points(t), t) for t in types]
    sized = [(p, t) for p, t in sized if p]
    if sized:
        sized.sort(key=lambda x: (x[0][0] * x[0][1], x[0][1], x[1]["name"]))
        pick = sized[0][1]
    else:
        pick = next((names[n] for n in ["iPhone SE (3rd generation)", "iPhone 16e", "iPhone 13 mini", "iPhone 12 mini"] if n in names), types[0])

for t in types:
    print(f"supported: {t['name']} {points(t)}", file=sys.stderr)
p = points(pick)
size = f"{p[0]:.0f}x{p[1]:.0f}" if p else "unknown"
print("\t".join([runtime["identifier"], pick["identifier"], pick["name"], size]))
