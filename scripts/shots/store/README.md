# App Store screenshots (1.1 "Night Atlas")

Rebuild the whole set in two commands, from the repo root, with the web build
running at http://localhost:8094 (`npx expo start --web --port 8094`, a dev build):

```bash
node scripts/shots/store/capture.mjs          # 1. raw screens  -> <tmp>/vela-store-raw (or $VELA_STORE_RAW)
python scripts/shots/store/compose.py         # 2. framed frames -> store/screenshots/
```

Both take the raw folder as an optional first argument, so the two commands can
point at any folder outside the repo:

```bash
node scripts/shots/store/capture.mjs  /path/to/raw --port 9381
python scripts/shots/store/compose.py /path/to/raw
```

Output:

| Path | Size | Use |
|---|---|---|
| `store/screenshots/iphone-69/NN-*.png` | 1320 x 2868 | iPhone 6.9" set (10 frames) |
| `store/screenshots/iphone-65/NN-*.png` | 1284 x 2778 | iPhone 6.5" set (10 frames) |
| `store/screenshots/review-paywall.png` | 1320 x 2868 | the subscription's App Review screenshot |

Requirements: Google Chrome (`CHROME` overrides its path), Node 18+, Python 3
with Pillow and numpy, `node_modules` installed (the fonts are read from
`@expo-google-fonts/newsreader` and `@expo-google-fonts/instrument-sans`), and
seeds that match the app (`bun scripts/shots/seed.ts --check`; see
`docs/SHOTS.md`).

## 1. capture.mjs: the raw screens

- Every shot starts from a seeded persona (`scripts/shots/inject.mjs`), in
  still mode (`?still=1`: the clock reads Wed 21 Oct 2026, 21:04, motion is
  frozen), at the iPhone 6.9" point size: 440 x 956 CSS px at 3x = 1320 x 2868.
- The iPhone's safe area is emulated (`Emulation.setSafeAreaInsetsOverride`,
  62 pt top, 34 pt bottom), so each screen lays out exactly as under a real
  status bar and home indicator. compose.py draws those on top.
- The page runs as en-US (`Emulation.setLocaleOverride` and an en-US
  `navigator.language`), so dates, times and prices read as on a US iPhone:
  'Oct 20' and '≈ $2.50 a month', never the host's '20 Oct' or 'US$2.50'.
- Then it drives the real UI: it starts narration, picks a bridge, charts a
  proof through the real form (Star Birth), names the sky (Named Sky), taps
  through the Weave, opens the soundscape sheet. No route is faked.
- Before the app loads, `Date.now()` is pinned and `Math.random()` is seeded,
  so ids and the chapters woven during a capture are identical on every run.
  Headless Chrome has no speech engine, so a stand-in `speechSynthesis` reports
  a few iPhone voices and holds narration on a chosen sentence; the reader then
  shows its real narrating state.
- Tab screens are nudged a few px when the tab bar would slice a line of text.
  Reader screens are nudged so the fewest lines sit in the dock's fade and no
  paragraph is cut by the header (`settleUnderDock`); the paragraph a shot is
  about always stays whole above the dock.
- Per shot it writes `<id>.png` and `<id>.json` (persona, url, locale, the
  CSS-px rects of the elements compose.py lifts out of the device, notes, app
  errors). A shot can also save a screen it passes on the way (`snap`):
  `03-proof-card` is the Star Birth card that frame 3 lifts. The run exits 1
  when a step fails or the app logs an error (a `FAILED-<id>.png` shows where
  it stopped).

Flags: `--only 05,08,review` (id prefixes), `--port 9381` (Chrome's DevTools
port; give every parallel agent its own, default `CDP_PORT` or 9381),
`--app http://localhost:8094`.

The shot list is `SHOTS` in `capture.mjs`:

| Raw id | Persona | What the steps do |
|---|---|---|
| `01-reader-narrating` | maya-ch1 | Chapter I, Listen; narration held on the sentence with her words in gold |
| `02-bridge-chooser` | maya-ch1 | end of Chapter I, the 15-minute bridge picked, 'Make it observable' above the dock ('Today’s bridge' under the header when the whole chooser fits; it does not at 440 x 956) |
| `03-proof-card`, `03-chapter-two-woven` | maya-bridge | proof form ('Sketched three versions of the sign. The serif one won.') → Star Birth (its card saved as `03-proof-card`) → Carry it forward → the Weave → Chapter II, woven paragraph |
| `04-sky`, `04-sky-star` | maya-named | the named sky 'The Studio' (Season 1, 7 of 7), and star 4's sheet in it (its pop-out) |
| `05-star-birth` | maya-mid | choose a bridge → I crossed it → proof → Star Birth ('Proof 6 · charted') |
| `06-listen`, `06-listen-soundscape` | maya-mid | a free listener narrating Chapter V's woven paragraph over Night with Sleep 30; the soundscape sheet with Rain on Glass, Hearth and Dawn locked to Plus (its pop-out) |
| `07-arc` | maya-mid | the Memory Book |
| `08-named-sky` | maya-eve | the seventh proof → Star Birth closes the figure → Name this sky ('The Studio') |
| `09-rituals` | maya-mid | Rituals and Your line |
| `10-today-sealed` | maya-sealed | Today, sealed for the day |
| `review-paywall` | maya-mid | `/paywall?demoPrices=1`, the plan plates priced (dev web build only), 'More than one dream at a time' first, down to Restore / Terms / Privacy |

## 2. compose.py: the frames

- Everything is drawn at each size's native resolution (the layout is written
  in 1320-wide units and scaled by width), never by resizing a finished frame.
- Night Atlas background: deep sky gradient warming from frame 1 to frame 10,
  a faint star chart (declination arcs, meridians, a tick scale, the real stars
  of Vela), violet and teal washes, a gold horizon bloom.
- Headline: Newsreader SemiBold, 132 px at 1320 wide (it only shrinks to fit,
  never below 112), one italic gold keyword; subline: Instrument Sans 50 px,
  one or two lines, broken after a sentence or a comma when it can be.
- The phone is drawn from rounded rectangles: titanium rim, thin black bezel,
  side buttons, Dynamic Island, 9:41 status bar, home indicator. No Apple
  artwork. Frame 4 is full bleed.
- Pop-outs are cut from the raw screens by the rects in `<id>.json` (`over=True`
  lifts a piece from where it sits on the phone's own screen) with a gold
  hairline and a gold-tinted glow; the chip on frame 1 and the badges on frame
  10 are drawn here (the badges wrap into rows aligned with the headline).
- A `Thread` joins two pop-outs with a thin gold line that ends in a lit star:
  on frame 3 it runs from the proof card into the woven paragraph's gold rule
  (found in the raw pixels).

The copy, layout and pop-outs of each frame live in `FRAMES` at the top of
`compose.py`. Flags: `--only 01,04,review`, `--sizes 69,65`.

### Copy rules (Guideline 2.3, ELEVATE §7)

No prices, 'free', ratings, laurels or user counts in a frame; only features
that ship in 1.1 (no widgets, Letter Back, themes, Deep chapters or PDF); no
astrology; no outcome, money or health promises; 'future self' never appears
in a frame (it lives only in the subtitle). Headlines stay under 7 words.

## Checking a run

Open every PNG in `store/screenshots/` and check it at full size and at search
thumbnail size (about 230 px wide): nothing clipped, no debug state, frames 1-3
read as one sentence. Dimensions are asserted by compose.py when it saves.
