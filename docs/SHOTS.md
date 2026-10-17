# Seeded personas, the audit walk and the gallery

These tools put the web build (`http://localhost:8094`) into a known, realistic
state so a screen can be judged and captured the same way every time:

- **`scripts/shots/seed.ts`** builds each persona by driving the app's real pure
  code and writes what the app itself would have persisted: a localStorage
  snapshot (`{ storageKey: rawString }`) per persona in `scripts/shots/seeds/`.
- **`scripts/shots/inject.mjs`** loads a persona into headless Chrome (through
  `scripts/shots/cdp.mjs`) and captures routes. It works as a CLI and as a library.
- **`scripts/shots/audit.mjs`** walks the whole 1.1 loop on a fresh install and
  fails when a step breaks or the app logs an error (see "The audit walk").
- **`scripts/shots/gallery.mjs`** captures every persona's key screens at both
  phone sizes, for reading the app as contact sheets (see "The gallery").

Everything is dated relative to the still-mode clock, **Wednesday 21 October
2026, 21:04** (`lib/clock` `STILL_DATE`), so still-mode screenshots read
coherently: "last night", "yesterday's proof", "today's 3·6·9".

## Quick start

```bash
# list personas, their Today state and their route names
node scripts/shots/inject.mjs --list

# one persona, two routes, both phone sizes, still mode, on YOUR CDP port
node scripts/shots/inject.mjs maya-mid @today out/today.png @reader out/reader.png \
  --sizes 430x932,375x667 --still --port 9360

# the same on a live clock (dates are shifted so the seed's "today" is today)
node scripts/shots/inject.mjs maya-mid @today out/today-live.png --port 9360
```

Each line printed is `shot <file> <size> <url> [notes]`. The notes report a
live-clock rebase (`rebased -5d`), any key the app rewrote on load, and any
uncaught error or `console.error` (each printed below with `!`). A clean run has
no notes in still mode.

**Give every parallel agent its own `--port`** (Chrome's DevTools port). The
default is `CDP_PORT` or 9360.

## Personas

`bun scripts/shots/seed.ts --list` prints these too. Today states follow
CONTRACTS §5.1: [A] chapter waiting, [B] bridge open, [C] next chapter woven,
[D] sealed.

| Persona | Today at the still clock | Chip | What is in it | Good for |
|---|---|---|---|---|
| `fresh` | onboarding | none | Empty storage | First Light |
| `maya-ch1` | [A] unheard, 'Enter chapter' | 0 nights · 1 star | Onboarded last night at 21:02: Maya, career, “my own design studio, with clients who trust my eye”, proud, evening ritual 21:00, seed proof 'Bought the domain name.'. Chapter I has the seed woven in gold and is not heard yet. | Today [A], the reader at Chapter I (storyboard frame 1), the bridge chooser at its end (frame 2) |
| `maya-bridge` | [B] 'I crossed it' / 'Not today' | 1 night · 1 star | Chapter I heard last night; the 15-minute bridge 'Sketch the sign that will hang above the studio.' with the if-then 'If it's 9am and I hesitate, then I open the sketchbook to a clean page.' | Today [B], the proof form, Not today, Star Birth of star 2 |
| `maya-mid` | [A] heard, 'Choose today's bridge' | 13 nights · 5 stars | Season 1 at Chapter V (Threshold), heard last night. 5 proofs over 14 days: did (seed), did 'Sent my portfolio to two studios I admire.', learned via Not today, moved 'Booked a call with a studio lead.' (Day 9, changed Chapter IV), did 'Quoted my first real client…' (yesterday, woven gold into Chapter V). One rest night. A script page, a gratitude page, today's 3·6·9 at 11/18, 2 captioned Scenes. Free. | Arc/Memory Book (frame 7), the sky with 5 stars, star detail, the reader's gold paragraph (frame 3), Rituals (frame 9), Scenes |
| `maya-woven` | [C] 'Read now' / 'Save for 21:00' | 13 nights · 5 stars | `maya-mid`, but the 5th proof was logged today at 12:40, so Chapter V is freshly woven and unheard. | Today [C], the Weave |
| `maya-sealed` | [D] sealed for today | 13 nights · 5 stars | `maya-woven`, then 'Save for 21:00' (savedForAt today 21:00) and heard at 21:01. On a live clock before 21:00 it reads [D] 'sealed until 21:00'. | Today [D] (frame 10) |
| `maya-eve` | [B] | 12 nights · 6 stars | Chapter VI (The Ordinary Day) heard last night, a 15-minute bridge open with an if-then. The next proof is star 7: Star Birth, then Chapter VII, then Named Sky. | The 7th-star ceremony, Named Sky, then 'Read Chapter VII' |
| `maya-unseeded-eve` | [B] | 7 nights · 6 stars | Maya without the onboarding seed: six proofs carried her to Chapter VII (Becoming), heard last night, and a 15-minute bridge is open. The 7th proof is the last star and no chapter follows it. | Star Birth → Named Sky → 'Begin Season 2' directly (the unseeded season end) |
| `maya-complete` | season complete, unnamed | 12 nights · 7 stars | 7 stars, Chapter VII (Becoming) heard last night, constellation not named yet. | Today's season-complete card, Named Sky, 'Begin Season 2' |
| `maya-named` | [A] unheard (Season 2 Chapter I) | 30 nights · 9 stars | A month in. Season 1 named 'The Studio' last night, Season 2 Chapter I waiting. Plus active. A second dream: love, “a calm home where friends drop by”, 2 proofs, Chapter III heard, bridge open. A proof photo, 5 Scenes cards (one is the proof photo), 4 journal pages, today's 3·6·9 at 9/18. | ArcSwitcher, the named sky (frame 4), a rich Arc, Plus states, the paywall's "your sky" |
| `maya-lapsed` | [A] for career; love is plan-locked | 30 nights · 9 stars | `maya-named` after Plus lapsed (`vela.plus.v1` = `'0'`). Nothing is mutated; the love dream is readable but not weaving. | 'Choose the dream that keeps weaving', the Plus-lapse rule |

Same-story personas share a prefix: `maya-mid`, `-woven`, `-sealed`, `-eve` and
`-complete` have identical ids and chapter text up to Chapter IV, and
`maya-lapsed` is `maya-named` byte for byte except the Plus flag.

Proof photos and Scenes are generated SVG "photos" (data URIs, as the web image
picker returns), so they render offline: studio lights through a window, pencil
logo sketches, printed portfolio pages, a kitchen window at dusk.

## Route names

A route argument is a path (`/arc`, or `arc`) or a **route name** from the
persona's manifest entry, written `@name`. Ids are generated, so prefer names:

| Name | Route |
|---|---|
| `@today` | `/` (onboarding for `fresh`) |
| `@reader` | `/story/<latest chapter of the active dream>` |
| `@chapterOne` | `/story/<its Chapter I>` |
| `@woven` | `/story/<its latest chapter with a woven proof>` (the gold paragraph) |
| `@sky` / `@evidence` | `/sky/<dreamId>` / `/evidence/<dreamId>` |
| `@secondReader` / `@secondSky` | the other dream (`maya-named`, `maya-lapsed`) |
| `@journalEntry` | `/journal/entry/<newest page>` |
| `@born` | `/evidence/<dreamId>?born=<newest proof>`: that proof's finished Star Birth (a proof older than 2 minutes never replays the flight) |
| `@arc` `@rituals` `@scenes` `@settings` `@paywall` `@newDream` | the fixed routes |
| `@script` `@m369` `@gratitude` `@affirmation` `@affirmations` | the practice pages and Your lines |

Tabs are Today | Arc | Rituals; the 1.0 `/stories`, `/journal` and `/board`
routes no longer exist.

`node scripts/shots/inject.mjs --list <persona>` prints them with their ids.
The full detail per persona (each dream's chapters, proofs with dates and kinds,
the open bridge, journal ids, the week's rhythm) is in
`scripts/shots/seeds/_manifest.json`.

## Still mode and the live clock

- **`--still`** loads every route with `?still=1`. The app pins its clock to
  21:04 on 21 Oct 2026 and freezes motion (ELEVATE §0.2). Still mode is decided
  once per page load, so every full navigation needs the flag again;
  `inject.mjs` adds it for you.
- **Without `--still`** the app runs on the real clock. `inject.mjs` then shifts
  every date in the seed by whole days (keeping local wall times across DST) so
  that the seed's "today" is the real today: the loop states, the weekly
  rhythm and "yesterday" read the same as in still mode. Time of day is real,
  so the daypart and greeting follow the actual hour. Dates already written
  into chapter text ('On October 10 you wrote…') are not rewritten.
  `--no-rebase` keeps the raw dates.
- **Timezone.** The seeds are generated in `Europe/London` (pinned in
  `seed.ts`), and `inject.mjs` sets the same timezone on the page with
  `Emulation.setTimezoneOverride`. Local day keys therefore match on any
  machine.

## CLI reference

```
node scripts/shots/inject.mjs <persona> <route> <out.png> [<route> <out.png> …] [flags]
node scripts/shots/inject.mjs --list [persona]
```

| Flag | Default | Meaning |
|---|---|---|
| `--still` | off | still mode (pinned clock, frozen motion) |
| `--w` `--h` | 430 × 932 | viewport in CSS px |
| `--sizes 430x932,375x667` | | several viewports in one run; files get a `-430x932` suffix |
| `--scale` | 1 | device pixel ratio (store frames use 3) |
| `--port` | `CDP_PORT` or 9360 | Chrome DevTools port; one per agent |
| `--app` | `APP_URL` or `http://localhost:8094` | the web build |
| `--wait <testID>` | | also wait for a visible `[data-testid=…]` (or any CSS selector starting with `[`, `#` or `.`) |
| `--scroll <px\|end>` | | scroll every scrollable container before the shot |
| `--settle <ms>` | 700 still, 1500 live | pause after the app is ready |
| `--no-rebase` | | live clock without shifting dates |

The persona is injected once per size; later routes in the same run are full
page loads over that storage. A screen that writes on open can therefore change
what a later route in the same run shows: the reader marks a chapter heard when
it is scrolled to the end, so `@reader --scroll end` turns `maya-ch1`'s Today
from [A] unheard into [A] heard. Inject again (a separate run) when that matters.

Git Bash rewrites a bare `/arc` argument into `C:/Program Files/Git/arc` (MSYS
path conversion). `inject.mjs` undoes that, and `@today` / `arc` avoid it.

## Library API

```js
import { launch } from './scripts/shots/cdp.mjs';
import { injectPersona, gotoRoute, scrollAll } from './scripts/shots/inject.mjs';

const page = await launch({ port: 9360 });
await page.viewport(375, 667, 1);
const info = await injectPersona(page, 'http://localhost:8094', 'maya-eve', { route: '@today', still: true });
// info: { persona, url, still, rebasedDays, keys, changedByApp: [], errors: [] }
await page.click('[data-testid="future-memory-card"]');   // drive the UI as usual
await page.screenshot('out/eve-today.png');
await gotoRoute(page, 'http://localhost:8094', '@sky', { persona: 'maya-eve', still: true });
await scrollAll(page, 'end');
await page.screenshot('out/eve-sky-end.png');
await page.close();
```

| Export | Does |
|---|---|
| `injectPersona(page, appUrl, persona, opts?)` | Sets the timezone, opens `/favicon.ico` on the app origin (a page with no app instance, so nothing can write over the seed), clears localStorage and sessionStorage, writes the persona, loads `opts.route` (default `/`) and waits for the app. `opts`: `route`, `still` (default: `?still=1` in `appUrl`), `rebase` (default true, ignored when still), `waitFor`, `settleMs`. |
| `gotoRoute(page, appUrl, route, opts?)` | A full page load of a route over the current storage, then waits. Pass `persona` to use `@names`, and `still`. |
| `waitForApp(page, { waitFor?, timeoutMs?, settleMs? })` | Waits for loaded fonts, a visible `[data-testid]` (RootNavigator renders nothing until every store is ready) and decoded images. |
| `scrollAll(page, y \| 'end')` | Scrolls every scrollable container. |
| `collectErrors(page)` | Uncaught errors and `console.error` calls since the last full load. |
| `resolveRoute(route, persona)`, `routeUrl(appUrl, route, still)` | Route names and URLs. |
| `loadSeed(persona)`, `loadManifest()`, `listPersonas()` | The seed files. |
| `rebaseStorage(storage, days, timeZone)`, `rebaseDays(now?)` | The live-clock date shift. |

## The audit walk

```bash
node scripts/shots/audit.mjs out/audit --sizes 430x932,375x667 --port 9360   # still mode (default)
node scripts/shots/audit.mjs out/audit-live --live --port 9360               # real clock, real animations
```

A fresh install (the `fresh` persona: empty storage) driven through the whole
loop, one numbered PNG per screen in `<outDir>/<size>/`:

1. First Light: welcome, focus (Career), own words + feeling, name, ritual
   (evening), the seed proof 'Bought the domain name.'.
2. The Weave (still mode shows its end state and waits for a tap on
   `weave-stage`; live mode opens Chapter I on its own), then Chapter I: the
   name, the gold paragraph tagged 'Woven from your proof' with the seed.
3. The bridge chooser (15-minute bridge, 'Make it observable'), the open bridge,
   the reader's 'Not today' sheet.
4. 'I crossed it' → the proof form → 'Chart this proof' → Star Birth → the share
   card → 'Carry it forward' → the Weave → Chapter II with the proof woven.
5. Today, the sky and a star's sheet (and its share card, and the list view),
   Arc, the ghost plate → `/paywall?from=second-dream`.
6. Rituals: Script (write and seal), 3·6·9 (a suggested phrase and a line),
   Gratitude (write and seal), a past page, carrying Your line, a written Scene,
   `/affirmation` and the line library.
7. The paywall from every entry point (`general`, `second-dream`, `bed`,
   `area`, `scenes`, `nudge`, `lapsed`), Settings (top, middle, end, the time
   sheet), and Today's 'Save for' → the sealed card.

Each step asserts what it expects (a visible testID, the right words), and at
every size it checks the first view: the proof's sentence field starts above
the dock, Today's filled CTA clears the tab bar, and the reader's player
controls stay on screen (run `--sizes 320x568` for Display Zoom). A step
that fails is captured as `NN-FAILED-<step>.png` and the run exits 1; so does
any uncaught error or `console.error` from the app. A green run prints
`0 failed step(s), 0 app error(s)` per size.

## The gallery

```bash
node scripts/shots/gallery.mjs out/gallery --port 9360                 # every persona, both sizes
node scripts/shots/gallery.mjs out/gallery maya-mid maya-named --sizes 375x667
```

For each persona, its key screens in still mode (Today, the reader, the sky,
the proof form, Arc, Rituals, the practices, Scenes, the paywall, Settings,
the second dream …), each also captured at its scrolled end where the screen is
long: `<outDir>/<persona>/<size>/NN-<screen>[-end].png`. The plan lives in
`PLAN` at the top of the script. It exits 1 when the app logs an error or
rewrites a seeded key on load.

## The seeder

```bash
bun scripts/shots/seed.ts              # write every persona and _manifest.json
bun scripts/shots/seed.ts maya-mid     # write one persona (the manifest is always rewritten)
bun scripts/shots/seed.ts --check      # exit 1 when a committed seed is stale
bun scripts/shots/seed.ts --list       # personas, Today state, chip
```

**Regenerate whenever the data model or the story content changes**, and commit
the seeds with that change. `--check` says whether you need to.

How it works:

- A simulated device holds every store and advances them only through the code
  the providers run: `applyArcAction` from `lib/store/arc` (with
  `checkArcInvariants` after every step), `recordAct` from `lib/progress`,
  `addJournalEntry` / `emptySheet` / `addRepetition` from `lib/journal`,
  `syncProofPhotos` from `lib/store/scenes`, and `normalizeProfile` from
  `lib/store/profile`. It mirrors what the providers add around those calls:
  `markHeard` records 'chapter-heard' the first time, a proof records 'proof',
  a journal page or a 3·6·9 line records 'ritual-saved', and a carried line
  records 'line-carried'.
- Bridges are picked from the real `offersFor` offers by tier, so the stored
  bridge is one the chooser actually shows.
- Ids keep the app's shape (`mvh4d5s4-bj2gzn`) and come, like the engine seeds,
  from a PRNG seeded per story. Time comes from a clock that moves through each
  persona's evenings. The output is byte-identical on every run and in every
  host timezone.
- Keys are written only for stores that differ from their empty value, with
  proof photos already synced into Scenes, so the app writes nothing back on
  first load. `inject.mjs` reports any key it does write.
- Each persona states what it expects: the Today loop state, the stars, season
  and stage, nights shown up, dream count and plan-locked count. A data-model
  change that moves a persona fails the run with
  `persona 'maya-mid' drifted: …` instead of silently producing a different
  screenshot.

To add a persona, add an entry to `PERSONAS` in `seed.ts` with a `build()`
that drives a `Device` (`onboard`, `hear`, `choose`, `prove` / `weave`,
`saveFor`, `run({ type: … })`, `carry`, `script`, `gratitude`, `phrase369` /
`reps`, `scene`, `plus`) through `when(dayOffset, 'HH:mm')`, plus its
`expect`. The clock never moves backwards.

### Known behaviour worth knowing

- **Onboarding the same evening reads as [C], not [A].** Chapter I weaves the
  onboarding seed, a proof dated today, and `loopStateOf` returns
  `next-woven` for an unheard chapter woven from a proof saved today. That is
  why `maya-ch1` onboarded last night.
- `maya-lapsed`'s Today shows the career dream because it stays focused
  (`activeDreamId`); the love dream is the plan-locked one.
- **v1 migration.** The real 1.0.1 fixtures live in `lib/fixtures/v1/*.json`
  (`raw.stories`, `.ritual`, `.profile`, `.journal`, `.board` are the raw
  `vela.*.v1` strings). To check a 1.0 user in the 1.1 screens, open
  `/favicon.ico` on the app origin, clear localStorage, write those strings
  under `vela.stories.v1` … `vela.board.v1` (plus `vela.plus.v1 = '1'` for a
  Plus user), then load `/?still=1`: the app migrates on load and leaves the
  v1 keys byte-identical.
