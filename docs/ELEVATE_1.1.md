# Vela 1.1 "Night Atlas": build spec

This document is the single source of truth for the 1.1 build. Section 0 is the
final scope decision and **overrides anything below it**. Sections 1+ are the
research-backed plan and adversarial critique it was derived from (2026-10-15).

## 0. FINAL SCOPE (overrides everything below)

### Ships in 1.1
1. **Trust pass + data layer v2.**
   - Fix the visible bugs: '1 moments', the first proof lighting 2 stars, '..' in proof text, UTC dateKey, router.back on deep-linked screens, truncated onboarding cards, Alert.alert calls that do nothing on web, and contrast.
   - Replace StoryContext with an `ArcContext` reducer that has atomic actions.
   - Keep every chapter: an index key plus one immutable key per chapter.
   - `rerenderChapter` (same number, same bridge) is separate from `weaveNext` (requires an unwoven proof).
   - Migrate v1 data. Stage = min(completedProofs + 1, 7). Keep only the newest open action as the live bridge, mark older open actions as lapsed, and keep ritual history as lifetime counters.
   - Define the Plus-lapse rule: every dream stays readable, the user picks one active dream, and the rest rest.
   - A one-ask-per-session arbiter (`lib/asks.ts`) for notifications, the Plus nudge and the review prompt.
   - Private backup: export and import a JSON file (expo-file-system, expo-sharing, expo-document-picker).
2. **Night Atlas visual system.**
   - Newsreader (serif) and Instrument Sans (UI), loaded with useFonts and rendering gated on load. Do not embed them through the expo-font plugin.
   - The token set below.
   - `<T variant>` is the only way to set text, and it maps each variant to an explicit font family. No fontWeight/fontStyle with custom fonts.
   - `<Screen>` owns a PER-SCREEN sky backdrop: a memoized static starfield seeded per user, with at most 10 twinkles, only while the screen is focused. No global transparent backdrop and no scroll parallax. Reduce Motion means a fully static sky.
   - Glyph set (VelaMark, StarProof×3, BridgeGlyph, AreaSign×6, numerals, tab icons, vignettes).
   - UI primitives (Screen, T, buttons, VellumCard, GildedPlate, Chip, TextField, Sheet, ConfirmSheet, Toast, Segmented, Dock with gradient scrim).
   - Still mode: web only, honoured only when `__DEV__` or `?still=1`; fixes the clock and freezes motion.
   - A lint script that bans hex and fontSize literals in `app/`.
3. **Story Engine v2.**
   - Desire shaper ({desire.quote}/{desire.np}/{desire.done}).
   - 7-stage seasons: First Glimpse, Night Before, Hard Day, Someone Notices, Threshold, Ordinary Day, Becoming.
   - 6-beat skeleton per stage.
   - Motif lexicon (24 archetypes).
   - Proof weaving: each proof is woven exactly once, highlighted gold and tagged 'Woven from your proof', plus recall and cumulative lines.
   - Daypart (morning/evening) picked at READ time, not stored.
   - Bridge library with tiers (2-minute / 15-minute / brave / write my own) and an optional single if-then line.
   - Chapter I hand-tuned for each focus area (the emotional peak).
   - Target length about 300–380 words per chapter. Size the pools from that.
   - Content style lint (LLM tells: em-dash density, 'not X but Y', whisper/tapestry/testament/symphony, etc.) and golden tests.
4. **First Light onboarding**, 6 steps or fewer:
   - welcome with the free promise
   - focus
   - desire in your own words, with suggestion chips and feeling chips
   - name, plus an optional pronunciation
   - ritual time
   - **optional 'One thing you've already done toward this'**, saved as a dated 'did' proof so Chapter I already weaves it in gold
   Then the Weave interstitial lands on Chapter I. Drop the unused mood step. Back navigation on every step.
5. **Today redesign.**
   - SkyHero with the active dream's constellation. Height is a clamp of about 30% of the window, 200px minimum.
   - The chip '12 nights · 9 stars'.
   - ArcSwitcher, shown only when there is more than one dream.
   - The loop-card state machine (A chapter waiting / B bridge open / C next chapter woven / D sealed for today), with exactly one filled CTA.
   - A 2-up rituals row.
   - The Sunday Proof Ledger card.
6. **Living constellation.**
   - Star Birth ceremony on proof save.
   - ConstellationView full-screen route (`/sky/[intentId]`), opened from the Today hero and the Arc header. It is NOT a tab.
   - StarDetailSheet (date, kind, sentence, photo, 'changed Chapter N').
   - Named Sky at the 7th proof, then 'Begin Season 2'.
   - Proof-star share card: pure SVG, captured with react-native-view-shot and shared with expo-sharing.
   - Accessible list alternative to the stars.
7. **Reader v2.**
   - Newsreader at 17/28, the user's words in gold italic, and the woven proof highlighted.
   - Narration as ONE queue of per-sentence expo-speech utterances. Highlight driven by each utterance's onStart/onDone, never by JS timers or onBoundary.
   - Voice ranking by identifier (premium > enhanced > compact), with the real name shown and plain-text download instructions (no App-Prefs URL).
   - Rate 0.8/0.9/1.0, text size S/M/L, sleep timer.
   - Scrimmed dock with a horizon progress line.
   - The bridge appears after the last paragraph.
   - '…' menu: Rewrite this chapter (rerender), text size.
   - No Plus nudge in Chapter I.
8. **Soundscapes.**
   - 4 ORIGINAL procedural loops generated by `scripts/gen_soundscapes.py` (numpy + ffmpeg, AAC .m4a, about 90–120s, sample-exact loops): Night (free), Rain on Glass, Hearth, Dawn (Plus).
   - Played with expo-audio inside the reader only. No sleep-sounds tab.
   - The audio session is set in tested `lib/audio/session.ts`, interruptionMode 'doNotMix' while a chapter session plays.
   - The bed ducks under speech and fades out with the sleep timer.
   - No lock-screen Now Playing in 1.1.
9. **Memory Book (Arc tab).**
   - Dream header with constellation thumbnail, 'Season 1 · Stage III of VII', and chapters · proofs · nights.
   - Timeline (FlatList) alternating ChapterPlate (generative SVG cover, numeral, title, date), Bridge node and Proof node.
   - Tap to reread any chapter, with prev/next in the reader.
   - '…' menu: rename / rest / release, each through ConfirmSheet.
   - Ghost plate for a new dream (paywall once the free dream is taken).
10. **Forgiving progress + personal reminders.**
    - `lib/progress.ts`: nights shown up (never resets), stars, weekly rhythm with rest nights, pause up to 30 days.
    - Notifications rewritten as a rolling queue: one-off, 10 days ahead, 40 or fewer pending, rebuilt on foreground and after state changes by a debounced root `useLoopEffects`.
    - Templates quote the user's own words, with no guilt framing.
    - Permission is asked at bridge commitment ('Remind me at 9am to do this?').
    - Cold-start notification taps are handled with useLastNotificationResponse. Routing happens only after every store is ready.
11. **Rituals tab.** Replaces Journal and absorbs the Board.
    - 3 practice doors: Script with arc-linked prompts, 3·6·9 with shaper-generated suggestions, Gratitude with 48 stems.
    - Past pages open at `/journal/entry/[id]`, with a 'Sealed' save moment.
    - 'Your lines': proof-born identity lines (kind × focus), with the existing library behind it.
    - Scenes (former board) at `/scenes`, with captions, an 'attach to a dream' option, and proof photos added automatically.
    - Exactly 3 practices. Do not grow the generic affirmation library.
12. **Honest Plus + Settings v2.**
    - The paywall shows the user's own sky and stats and lists what is free forever.
    - Plus = more than one dream at a time, the 3 extra soundscapes, every affirmation area, and unlimited Scenes.
    - The per-month equivalent is computed with Intl from the StoreKit numeric price and shown smaller than the billed price. Neutral state when prices are null.
    - Contextual entry points only: second dream, a locked bed, after the 2nd proof via the asks arbiter.
    - Settings groups:
      - You: name, pronunciation
      - Ritual: time, reminders, weekly rhythm, pause
      - Listening: voice, speed, text size, default bed
      - Your data: export, import
      - Vela Plus: restore
      - About
13. **Listing 1.1.** New screenshots from the storyboard, minus the widget and Letter Back frames: use Star Birth and Named Sky instead. Metadata with keywords of 100 characters or fewer, What's New, and updated review notes and REVIEW_RESPONSE.

### Tabs
Today | Arc | Rituals. Settings opens from the gear on Today. `/story/new` (additional dream), `/story/[id]`, `/evidence/[intentId]`, `/sky/[intentId]`, `/journal/*`, `/affirmation(s)`, `/scenes`, `/paywall`, `/settings` are stack routes.

### Deferred (NOT in 1.1; do not build)
- Home and Lock Screen widgets (1.1.1 track)
- pannable 'Your Sky' tab
- Deep chapters
- Letter Back and time capsule
- Monthly Sky
- Book of Proof PDF
- Ink/Aurora/Dawn themes
- threshold breath and rehearse screens
- play season, loop, and Now Playing
- weaving Scenes captions into chapters
- share-a-line cards
- own-voice recording
- moon/astrology content of any kind
- the phrase 'future self'

### Non-negotiables
- Zero cost: no servers, no accounts, no LLM, no analytics. All content original.
- Every screen must render and work on react-native-web (port 8094); screenshots are captured there.
- Keep EVERY existing testID (e.g. future-memory-card, onboarding-next/done, intake-*, story-*, evidence-*, paywall-*, settings-*), and give every new control one.
- Every icon-only control has an accessibilityLabel. No Alert.alert; use ConfirmSheet/Toast.
- Expo stays on 57.0.9. expo-store-review stays pinned at 57.0.1. No Skia, Lottie, expo-blur or expo-image.
- `bun test` and `npx tsc --noEmit` must pass. Pure logic lives in `lib/` with bun tests.
- Follow the mobile-app-ui-design skill: 8pt grid, 4 sizes / 2 weights, 60/30/10, one filled CTA per viewport, thumb-zone CTAs, designed empty/loading/success states, peak-end moments.
- The App Review path must stay obvious, and the Future Memory loop is the product (Guideline 4.3).


## 1. Vision

Vela 1.1, "Night Atlas", turns Vela from a text-only story app into the one manifestation app that visibly remembers what you did. Each dream gets its own night sky, generated on the phone. Each chapter is a narrated scene in a seven-chapter season that runs from a first glimpse to becoming. Each step you take toward the dream becomes a star, and its position, light and sentence come from you. The next chapter is built from that proof, and the proof is highlighted in gold inside the story. The sky also lives outside the app: today's bridge on the Lock Screen, your constellation on the Home Screen, and a reminder at your ritual time that quotes the sentence you wrote. Nothing is ever taken away. Progress never resets, every chapter is kept in a Memory Book, and the full loop stays free with no account and no servers: unlimited listening, the sky, widgets and a private backup. Vela Plus adds room for more than one dream, Deep chapters, original soundscapes and keepsakes.

People will want it because it is the opposite of the category's pattern. Competitors ask a 20-question interrogation, put a weekly paywall in front, and serve interchangeable pastel stories built on stock photos. Vela is beautiful in a way only the user's own data can make it, gives them something real to do today, and shows them, star by star, that they did it. That same distinctiveness is the Guideline 4.3 defence. Every new surface shows the imagine → act → prove → adapt loop, not generic manifestation content.

## 2. Visual system (Night Atlas)

Section 0 overrides: per-screen backdrop, no parallax, no expo-font plugin embedding, no themes in 1.1.

NIGHT ATLAS: VISUAL SYSTEM v2
The language is celestial navigation and the star atlas. It is built on Vela, the constellation of the Sails, and on the existing sail-and-star app icon. It is not a "galaxy" app. Decoration is limited to engraved chart line-work and the user's own data drawn as stars. That keeps it clear of Stella's pastel look, Soul's glowing figures, and Magnetic's black-and-gold.

1) BACKGROUND
components/sky/SkyBackdrop.tsx is mounted once in app/_layout.tsx behind the Stack and Tabs. Scenes are transparent (Stack contentStyle and Tabs sceneStyle backgroundColor 'transparent'; verify this on day 1 under the native-stack fade). Everything is react-native-svg 15.15.4, which is already installed, so it renders the same on react-native-web.
- L0: a vertical gradient from sky800 #110F2A to sky950 #05040D, plus a horizon RadialGradient covering the bottom 30% at 15–30% alpha. The horizon is tinted by the active dream's focus: Love #3A2147, Abundance #3A2A22, Career #1C2B4A, Health #123A3A, Confidence #2A2160, Peace #1A2E4F. Morning-ritual users get a dawn hint, #F2A27C at 8%.
- L1: a seeded starfield of 140 circles. Radii are 0.6, 1.0 and 1.6; opacities are .35, .6 and .9. It uses mulberry32 (reuse lib/story/rng) seeded from hash(profile.createdAt + name), so every user's sky is unique and stable. It is one memoized Svg.
- L2: chart line-work at 5–7% alpha: 3 declination arcs, 4 meridians and a tick scale on one edge.
- L3: two nebula RadialGradients, violet #A897FF and teal #6FD3C1 at 8–10%, drifting ±16px over 24s.
- Only 10 stars twinkle: an Animated.View opacity loop between 0.35 and 1 over 2.4–5.6s. Scroll parallax runs at 0.15, 0.3 and 0.5 of the scroll offset through a SkyScroll context.
- Variants: calm (default); reveal (line-work at 12%, used for the Weave and Star Birth); reader (nebula off, stars at 50% for legibility); still (all motion frozen, for screenshots).
- Chapter plates are generated per dream and season by the same generator, seeded by intentId + season. Each shows the horizon tint, the focus-area sign, the chapter numeral and that season's proof stars. There are no stock photos and no AI images of people anywhere.

2) COLOUR TOKENS
These replace the colors in constants/theme.ts. bg stays #0B0A18, and the old token names are kept as aliases so untouched screens still compile.
- SKY (60%): sky950 #05040D, sky900 #0B0A18, sky800 #110F2A, sky700 #19163A (card base, used at 72% alpha), sky600 #241F52 (pressed).
- STARLIGHT TEXT (30%), one hue in four tiers: ink100 rgba(246,242,255,1), ink80 .80, ink64 .64, ink48 .48. ink48 is the floor on the sky (about 4.6:1). Cards need ink56 or higher (about 5.7:1). The .38 tier is deleted.
- LOOP GRAMMAR (≤10%), used identically everywhere:
  - GOLD = the future: gold500 #E9B44C is the ONE filled CTA per viewport. gold300 #F5D58E is for numerals, the user's own words and selected borders. goldEngrave rgba(233,180,76,.24) is for hairlines and plate corners. onGold is #1E1503.
  - VIOLET = the bridge: violet400 #A897FF, with violetWash rgba(168,151,255,.10) for bridge cards. The bridge CTA is filled violet with sky950 text, so the loop's action is never a text link.
  - STARLIGHT = proof: did #FFF3D6 (warm), moved #EEF0FF (cool), learned #C9D8FF (pale blue). Kind is shown by tint and by glyph shape, never by gold. starGlow is rgba(255,236,190,.35).
- Lines: hairline rgba(214,206,255,.10), chartLine rgba(214,206,255,.06). Danger #E8938F is used for destructive actions only.
- Rules:
  - Delete the success green and the gold-wash accentSoft fills, which turn brown on indigo.
  - Selected state = sky700 surface + 1.5px gold300 border + gold icon + 18px check badge.
  - Shadows are tinted sky950 at 60%, never grey. The gold glow (r16, .35) belongs to the primary button only.

3) TYPE
- SERIF, the voice of the future: @expo-google-fonts/newsreader@0.4.1 (Newsreader_400Regular, Newsreader_400Regular_Italic).
- SANS, the UI voice: @expo-google-fonts/instrument-sans@0.4.2 (InstrumentSans_400Regular, InstrumentSans_600SemiBold).
- Loading: expo-font@57.0.1 useFonts in the root layout (web and native), with first render gated on load. On iOS the fonts are also embedded through the expo-font config plugin so there is no flash of unstyled text. Web screenshots then match iOS; today web renders Times.
- Scale, following the skill's limit of 4 sizes and 2 weights (400 and 600):
  - Display 32/38, Newsreader 400, tracking -0.3: chapter titles, greetings, ceremonies.
  - Title 22/28, Newsreader 400: screen and card titles.
  - Body 17/26 in Instrument Sans 400 for UI; story reading in Newsreader 400 at 17/28. The reader's S/M/L setting (17/19/21) is an accessibility option, not part of the design scale.
  - Caption 13/18 in Instrument Sans 400. Eyebrows use 600, uppercase, +1.2 tracking.
- The user's own words are Newsreader Italic in gold300 inside curly quotes. Writing inputs use italic placeholders at weight 400, never 600.
- Counts use fontVariant ['tabular-nums']. Verify Instrument Sans has tnum; if not, fall back to Newsreader numerals.
- Georgia and the generic 'serif' fallback are banned. A <T variant='display|title|body|reading|caption|eyebrow'> component is the only way to set text. A CI grep fails any fontSize or hex literal in app/.
- Store captions only: Newsreader SemiBold 600, used by the compositor and never shipped in the app.

4) MATERIALS
There are three, and only three.
- (a) OPEN SKY: no container. Used for story text, affirmations and the constellation.
- (b) VELLUM card: sky700 at 72%, 1px hairline, 1px top highlight rgba(255,255,255,.06), radius 20, padding 24.
- (c) GILDED PLATE: used only for the hero chapter card, chapter plates and the finale. sky800 → sky700 gradient, a 1px gradient stroke in goldEngrave (bright top-left, fading out), four L-shaped corner ticks in gold300, and an inset mini constellation.

Buttons:
- Primary: gold500 pill, 56pt, 1px inner top highlight rgba(255,255,255,.35), gold glow.
- Bridge: violet400, filled.
- Secondary: 1px gold300 outline.
- Tertiary: ink80 text.

Other:
- Tab bar: sky950 at 92% with a top hairline. No blur, because blur breaks headless capture.
- Inputs: on focus, a gold300 1.5px border and soft glow. outlineStyle 'none' on web.
- Spacing follows the 8-point grid (4/8/12/16/24/32/48/64). Screen gutter is 24, or 16 below a 380pt width. Tap targets are at least 44pt. Every icon-only control needs an accessibilityLabel.

5) ICONOGRAPHY
- lucide stays only for system chrome (back, close, more, settings), at stroke 1.75.
- Custom SVG set in components/glyphs:
  - VelaMark: the icon's sail and 4-point star as line-art.
  - StarProof: three shapes, one per proof kind.
  - BridgeGlyph: a heading arrow over a horizon line. It replaces the fitness "footprints".
  - ChapterNumeral: Roman numerals.
  - Six original AreaSigns: Love, a binary pair; Abundance, a cluster; Career, an ascending line; Health, a pulse arc; Confidence, a spire; Peace, a gentle arc.
  - Engraved vignettes for empty states: sail, horizon, window, open door.
- Custom tab icons: Today = horizon with star, Arc = open book, Sky = constellation, Rituals = quill.
- The master pattern is the real Vela sail figure. About 8 hand-placed points from γ, δ, κ, λ, μ, φ, ψ Velorum, approximated. Star positions are facts, so they are free to use.

6) MOTION
Reanimated 4.5.1. Under useReducedMotion, everything becomes plain crossfades.
- Durations: tap 120, state change 220, enter 420, reveal 900, ceremony 1800–2600ms.
- Easing: "drift" = Easing.bezier(0.22,1,0.36,1). Press = spring (damping 18, stiffness 160), scale .97. Overshoot is allowed only on Star Birth.
- Story text inks in by sentence: opacity plus a 6px rise, 120ms stagger.
- Line drawing: strokeDashoffset via useAnimatedProps on native, with a segment-opacity fallback on web.
- Haptics (expo-haptics): selection on picks, light on step, soft on chapter reveal, success on proof.
- Still mode (EXPO_PUBLIC_STILL or ?still=1) renders every animation at its end state and uses a fixed clock.

7) SIGNATURE MOMENTS
- FIRST LIGHT: on welcome, the sky fades in and the VelaMark draws itself over 1.6s. Onboarding progress is 6 stars that connect into the sail.
- THE WEAVE: a 2.4s interstitial before every new chapter. The user's words rise, scatter into stars, lines connect, and the chapter numeral resolves. It is honest anticipation, not fake loading, and can be skipped after the first time.
- ENTER: an optional 30s breath ring that expands with the anchor star.
- READING BY STARLIGHT: text sits directly on the sky. While listening, the current sentence is at 100% and the rest at 55%. A horizon progress line runs above the dock. The user's words, and the woven proof tagged "Woven from your proof", glow gold.
- STAR BIRTH: the proof card condenses into a starlight point, arcs over 900ms to its place in the figure, a line draws from the previous star, a success haptic fires, and the caption reads "Proof 4 · charted". A soft original chime plays only if audio is already active.
- NAMED SKY: the 7th proof closes the figure. The user names it (the default comes from the desire, e.g. "The Studio") and it is set into Your Sky.
- LOG SEALED: Today shows a closure plate: date · Chapter III · 1 proof · next ritual 21:00.

8) THEMES (Plus)
Ink (default), Aurora and Dawn. They swap the horizon and nebula tokens only; the gold, violet and starlight grammar never changes.

DELIBERATE DEVIATION FROM THE SKILL: the skill says to use Skia for custom drawing. Vela uses react-native-svg instead, because every screen must render on react-native-web for preview and capture, and Skia on web needs a multi-MB CanvasKit wasm. expo-blur and the Liquid Glass tabs are skipped for headless-capture fidelity.

## 3. Information architecture (Section 0 overrides: 3 tabs Today | Arc | Rituals; constellation is /sky/[intentId])

TABS (4)
Each tab has one role in the loop. Today | Arc | Sky | Rituals replaces Today | Stories | Journal | Board.

1) TODAY (app/(tabs)/index.tsx)
Layout, top to bottom:
- SkyHero, 320px: the active dream's figure, the greeting in Display, the chip '12 nights · 9 stars', and a weekly rhythm of 7 small stars with rest nights hollow.
- ArcSwitcher pills, only when there is more than one dream.
- The LOOP CARD, a state machine with exactly one filled gold or violet CTA per viewport:
  - [A] chapter waiting: Gilded plate 'Tonight's chapter · IV Someone Notices', with Enter chapter (gold). testID future-memory-card is kept.
  - [B] chapter heard, bridge open: violet Bridge card with the chosen bridge, the if-then line, 'I crossed it' (violet) and a 'Not today' text link that opens a learned-proof sheet.
  - [C] proof logged, next chapter woven: plate 'Chapter V is ready · it begins with what you did', with Read now and Save for 21:00.
  - [D] done for the day: LOG SEALED closure plate.
- A compact 2-up Rituals row: 'Carry a line', which leads with Your lines, and 'Reflect', an arc-linked prompt.
- On Sundays, the Proof Ledger card.
- Once only, an Add-widget nudge after the 2nd proof.
- Settings gear at top right.

2) ARC (app/(tabs)/arc.tsx, the Memory Book; replaces Stories)
- Dream switcher, then the season header: constellation thumbnail, 'Season 1 · Stage III of VII', chapters · proofs · nights.
- The timeline alternates ChapterPlate → Bridge node → Proof node.
- A ghost plate for a new dream; it opens the paywall when the free dream is already taken.
- The '…' menu holds rename, rest and release.
- Tapping a chapter opens /story/[id].

3) SKY (app/(tabs)/sky.tsx)
- Your Sky: a pannable canvas of every constellation, in progress and named.
- Tap a star to open StarDetailSheet, which links to its chapter.
- This week's Proof Ledger, and the Monthly Sky on the 1st.
- Share a star or a constellation.
- Theme picker (Plus).

4) RITUALS (app/(tabs)/rituals.tsx; replaces Journal and absorbs the Board)
- Three practice doors: Script, 3·6·9, Gratitude.
- 'Your lines', the affirmation of the day plus the library.
- Scenes, the former board.
- Past pages; each opens to its detail.

STACK AND MODAL ROUTES
- /onboarding: the 6 First Light steps.
- /story/new: an additional dream; the path is kept for testIDs and the review path.
- /story/[id]: the reader. The threshold session is a mode of this route, not a separate one.
- /evidence/[intentId]: the proof form, then Star Birth, then the Weave. The path is kept.
- /arc/[intentId]/finale: Named Sky, Letter Back and the capsule.
- /capsule/seal (modal).
- /scenes.
- /affirmation and /affirmations.
- /journal/script, /journal/method369, /journal/gratitude, /journal/entry/[id].
- /paywall (modal).
- /settings and /settings/data.
- /dev/kitchen-sink (__DEV__ only).

SHEETS (in-screen, not routes)
StarDetail, BridgeChooser, IfThenBuilder, SoundscapePicker, SleepTimer, Voice, ConfirmSheet, AddWidget, NotTodayLearned.

DEEP LINKS (the 'vela' scheme already exists in app.json)
- vela://story/<chapterId>, from notifications and the small widget
- vela://evidence/<intentId>, from the bridge widget, the Lock Screen widget and the bridge notification
- vela://sky, from the large widget
- vela://arc/<intentId>/finale, from the capsule notification
Every deep-linked screen uses safeBack, so a cold start with no history falls back to /(tabs).

CORE LOOP FLOW
1. Today[A] → /story/[id]: optional breath, the chapter with sentence highlighting, Rehearse the bridge, then BridgeChooser (2-min, 15-min, brave or your own) and IfThenBuilder.
2. Today[B] → /evidence/[intentId]: choose did, moved or learned, write one sentence, add an optional photo.
3. Star Birth. The first time, it asks for notification permission. On the second proof, it shows the AddWidget sheet. On the 7th, it hands over to the finale.
4. The Weave → /story/[next], via Read now or Save for ritual time.
5. Today[C] or [D].
'Not today' always leads to a learned proof, so the loop never dead-ends. The 7th proof → /arc/[id]/finale → Season 2.

APP REVIEW PATH (for the notes)
Onboarding → Chapter I → choose a bridge → 'I crossed it' → proof → Star Birth → Read Chapter II, where the proof is highlighted with 'Woven from your proof' → the Sky tab shows the star.

PLUS ENTRY POINTS (contextual only)
- second dream (Arc ghost plate)
- tap on a locked soundscape or on Deep
- theme picker
- Book of Proof export
- after Named Sky
- the soft nudge after the 2nd proof, never in Chapter I

SETTINGS GROUPS
You (name, pronunciation) · Ritual (time, reminders switch, weekly rhythm, pause) · Listening (voice, speed, text size, default bed) · Your data (export, import, Book of Proof) · Vela Plus (restore) · About ('Charted on this device').

## 4. Feature specs (see Section 0 for what is in/out)

### P1. Trust pass: visible-bug fixes + safe data layer v2 (kept chapters, atomic proof+weave, private backup)  [M, high, both]

**Value:** Nothing looks broken and nothing gets lost. Counts are right, proof sentences render cleanly, a chapter only advances when you act, every chapter is kept, and you can export or import a backup file you control. Everything you made stays readable if Plus ends.

**Loop fit:** It protects the loop's core asset, the proof. The current stale-snapshot contexts would silently drop a saved proof once 'save proof' and 'weave next chapter' become one flow. It also makes chapter numbers mean 'something real happened', which is the 4.3 argument.

**Scope:** (a) Bugs to fix:
- '1 moments' pluralisation (app/(tabs)/index.tsx:129)
- first proof lights 2 stars (app/evidence/[intentId].tsx:126)
- evidenceBridge renders '..' and a raw capital (normalise via the F3 shaper)
- the reader's refresh icon calls regenerate() and bumps the chapter. Split it into rerender(chapterId), which keeps the same number, proof and bridge, and weaveNext(intentId), which requires an unwoven proof
- UTC dateKey; switch to local
- the evidence screen uses router.back(); switch to safeBack
- the Listen dock has no scrim
- onboarding focus cards are truncated by numberOfLines
- serif inputs at weight 600
- textFaint .38; raise to .48
- 10 Alert.alert calls are no-ops on web; replace with ConfirmSheet
- remove the unbacked 'All journal templates' benefit from the paywall and the store description
- success copy should read 'Your next chapter will remember it'
(b) Data layer:
- All contexts move to useReducer with functional updates and a serialized persist queue (lib/store/persistQueue.ts).
- New schema vela.arcs.v2: {intents, chapters[] (never deleted), bridges[], proofs[], capsules[]}.
- A pure migrate v1→v2 maps the current story to chapter N of season 1 and splits actions into bridges and proofs. Its bun tests use real v1 fixtures and are release-blocking. v1 keys stay untouched for one release as a rollback.
- One atomic SAVE_PROOF_AND_WEAVE action.
(c) Settings > Your data:
- Export a backup as .json via expo-file-system + expo-sharing 57.0.8; on web, a download.
- Import via expo-document-picker 57.0.1, with schema validation.

**Risk:** Migration runs on live 1.0.1 users. Test it with a TestFlight update over an App Store install that has real data. Earlier chapters of v1 users are already gone, so the Memory Book starts with an honest 'Your book starts here'.

### P2. Night Atlas visual system (sky, type, colour grammar, primitives, glyphs)  [L, high, both]

**Value:** Every screen becomes a place, your own night sky, instead of a dark form. It feels premium, calm and legible, with type chosen on purpose and identical on iPhone and web.

**Loop fit:** The colour code is the loop (gold = future, violet = bridge, starlight = proof). The sky is seeded from the user's data. It owns Vela's real constellation identity, which is distinct from Stella's pastel and Soul's glow and strengthens the 4.3 'own visual system' claim.

**Scope:** - Tokens: constants/theme.ts v2 (old names kept as aliases).
- components/sky: SkyBackdrop, Starfield, ChartGrid, Nebula, Horizon, ChapterPlate.
- components/glyphs: VelaMark, StarProof, BridgeGlyph, AreaSign×6, Numeral, Vignettes.
- components/ui: Screen, T, PrimaryButton, BridgeButton, SecondaryButton, GhostButton, IconButton (requires accessibilityLabel), Header (safeBack), Dock (gradient scrim via expo-linear-gradient 57.0.1), VellumCard, GildedPlate, Chip/ChipGroup, TextField, Sheet, ConfirmSheet, Toast, Switch, Segmented, ProgressStars.
- lib/sky: starfield.ts, figures.ts (the Vela sail plus 12 original figures), layout.ts. All have bun tests.
- Fonts load in the root layout. lib/still.ts and lib/clock.ts. A dev-only app/dev/kitchen-sink.tsx.
- 4-tab layout with custom glyph icons.
- CI grep that bans fontSize and hex literals in app/.
- Web parity: pure SVG and RN.

**Risk:** SVG performance on older iPhones and on web (memoise the static sky; at most about 10 animated nodes). Transparent scenes under the native-stack fade must be verified on day 1. FOUT on web is handled by gating first render on fonts.

### P3. Story Engine v2: seasons, real proof weaving, desire shaper, bridges you choose  [XL, high, both]

**Value:** Chapters read as written for you. They progress from a first glimpse to the hard day to becoming, instead of repeating the same 'perfect day'. Your proof appears inside the story in your own words. The daily step fits your day: pick 2-minute, 15-minute or brave, or write your own.

**Loop fit:** This is the heart of the 4.3 case: proof produces a visible change in the narrative. 'Not today' becomes a 'learned' proof instead of a silent miss. Progress through the season is gated by real-world action.

**Scope:** - lib/story/shaper.ts: detects desire shape (noun phrase, 'to'-verb, bare imperative, 'I…' clause, 'I want…'); strips deadline tails; changes my/I to your/you; exposes {desire.quote}, {desire.np} and {desire.done}.
- lib/story/seasons.ts: 7 stages, I The First Glimpse, II The Night Before, III The Hard Day, IV Someone Notices, V The Threshold, VI An Ordinary Day, VII Becoming, then the Finale (F7).
- engine.ts v2:
  - stage skeletons of 6 beats
  - a proof beat placed by kind (arrival, witness or pre-closing)
  - a 'Previously' opener citing up to 3 past proofs by date, plus a cumulative line
  - an optional Scenes-caption line
  - daypart open and close based on ritual time and the current hour
  - a recency-window avoid set instead of a permanent one
  - desire→motif matching (24 archetypes)
  - output paragraphs carry spans {desire|proof|name} for gold highlighting
- lib/futureMemory.ts v2:
  - 25 bridges per focus, tagged with tier, stage and motif
  - 3 sized choices offered at each chapter end
  - 'Write my own', wiring the existing unused reshapeAction
  - the next offer follows the last proof kind (learned leads to a smaller retry, did steps up)
  - never repeats a bridge back to back
- Standard chapters are 380–460 words, about 3 minutes.
- Content lives in lib/story/content/* (see content_expansion).
- Golden tests:
  - 30 desires × every frame
  - regex bans: 'to to', 'into to', '\.\.', '!\.', first-person leakage
  - a 30-chapter run with no back-to-back paragraph or bridge
  - length bounds

**Risk:** Content volume and quality (about 33k original words) and tone sameness. Mitigate with golden tests and an owner skim of 20 random renders per focus before content freeze. Existing mid-arc users map to stage min(chapter, 7).

### P4. Living Constellation & Your Sky (Star Birth, Named Sky, star detail, Proof Ledger, share cards)  [L, high, both]

**Value:** A beautiful picture that grows only from what you actually did. Tap any star to reread that day and the chapter it changed. It never dims or resets. A Sunday ledger and a monthly sky look back for you, and you can share a proof star as an image without exposing your dream.

**Loop fit:** It replaces the 7-dot strip with the signature proof visual. Unlike competitors' passive 'walls', every star links to the chapter it rewrote. Endowed progress stays honest: the gold anchor star is the dream you named, ghost points show the figure, and only proofs become starlight stars.

**Scope:** - Today SkyHero (320px): the active dream's figure with 8 points, the anchor plus 7 proofs.
- New tab app/(tabs)/sky.tsx: a pannable Your Sky (2×3 screen canvas, seeded placement) showing every constellation across dreams and seasons.
- StarDetailSheet: date, kind, sentence, optional photo, and 'Changed Chapter IV', which opens the reader at the highlight.
- Star Birth ceremony on proof save. Named Sky ceremony at the 7th proof.
- The first-ever season uses the real Vela sail figure; later seasons use 12 original seeded figures.
- Gentle lifetime milestones (3, 12, 30 stars), copy only.
- Weekly Proof Ledger card (Sundays, only when the week has ≥2 proofs): the did/moved/learned mix, the sentence of the week, next week's first bridge. Monthly Sky on the 1st. Both computed locally and free.
- Share cards drawn in pure SVG: a proof-star card and a constellation card at 1080×1920, desire hidden by default. Built with react-native-view-shot 5.1.0 + expo-sharing; web falls back to a PNG download.
- Add NSPhotoLibraryAddUsageDescription.
- Remove the 'Seven days' caption.

**Risk:** Skies get dense after many seasons (use 2 zoom levels and labels only on tap). html2canvas fidelity for view-shot on web, which is why the cards are pure SVG. Line-draw animation is flaky on web, which is why the opacity fallback exists.

### P5. Enter the chapter: narrated reader + threshold session (breathe → listen → rehearse → if-then)  [L, high, both]

**Value:** A listening experience worth repeating: your words glow, the current sentence follows the voice, you choose voice and speed, your name is said correctly, and there is a sleep timer, loop and 'play my season'. Two optional minutes turn the story into a rehearsal of today's step.

**Loop fit:** Built on evidence (mental contrasting with implementation intentions g≈0.34; implementation intentions d≈0.65): rehearsing the process and an if-then plan, not outcome fantasy. The if-then time drives the bridge reminder and the widget, so imagination is converted into action. This is Vela's answer to 'manifestation is wishful thinking' for both App Review and listing copy.

**Scope:** - app/story/[id].tsx rebuilt on the Open-sky material:
  - numeral + stage title in the header
  - the user's words in gold italic
  - woven proof highlighted and tagged
  - scrimmed Dock with a horizon progress line
  - '…' menu: Rewrite chapter, Text size, Share a line
  - the bridge appears only after the last paragraph
  - no Plus nudge in Chapter I
- lib/audio/narration.ts (pure, tested): sentence segmentation, queue state, onBoundary charIndex → sentence/word, resume position.
- useNarration:
  - expo-speech per-sentence queue with 350ms paragraph pauses
  - prefers Enhanced English voices, with a hint to download them
  - rate 0.8, 0.9 or 1.0
  - the name-pronunciation field substitutes into TTS text only
  - sleep timer 10/20/30 minutes or end of chapter
  - loop chapter; Play season
- lib/audio/session.ts: setAudioModeAsync({playsInSilentMode:true, shouldPlayInBackground:true, interruptionMode:'duckOthers'}) via expo-audio 57.0.3 plus UIBackgroundModes audio. This fixes narration that is likely silent on muted phones.
- ThresholdSession:
  - optional 30s breath ring
  - after the chapter, a 45s 'Rehearse the bridge' (where, when, first move)
  - BridgeChooser (3 tiers + write your own)
  - IfThenBuilder chips: 'If it's [9am / lunch / after work / custom] and I hesitate, then I [first move]', stored on the bridge
- Web: the Web Speech API path stays.

**Risk:** Background speech, the silent switch and onBoundary on iOS 26 are unverified, so device-test in week 1. If background speech fails, it degrades to foreground plus a lock-screen bed. Device TTS can be perceived as 'robotic'; mitigate with Enhanced voices plus the F10 bed.

### P6. First Light onboarding (≤6 steps to Chapter I, promise up front)  [M, high, free]

**Value:** From install to a chapter that uses your own words in about a minute. No account, no interrogation, and a plain promise of what is free.

**Loop fit:** The first chapter is the emotional peak and delivers the first bridge, so the loop starts on day one. It is the opposite of the category's 20-question-then-paywall pattern, which drives 35–46% 1–2★ reviews for Stella and Aya.

**Scope:** app/onboarding.tsx steps:
1) First Light: the sail draws itself, with the line 'Your story is written on this phone. Unlimited listens. No account.'
2) Focus: area signs; one primary area, extras optional.
3) In your words: a desire field ('Say it however it comes out') with 4 suggestion chips per focus and feeling chips merged in.
4) Name, plus an optional 'how to say it'.
5) Ritual: morning, evening or both, plus a time. Explains reminders; does NOT ask for permission.
6) The Weave, which lands on Chapter I.
Also:
- Drop the unused mood step.
- Progress is 6 stars connecting into the sail.
- Back navigation on every step.
- The first dream skips story/new; app/story/new.tsx is reused for later dreams with the same components.
- Keep the existing testIDs.

**Risk:** The App Review path changes, so update REVIEW_RESPONSE and the review notes. Existing profiles are unaffected because onboarding never re-runs.

### P7. Memory Book (Arc tab) + Season Finale (Letter Back, sealed line, Season 2)  [L, high, both]

**Value:** Every chapter you heard and every step you took is kept as a book of this future, and you can reread anything. When a season ends, a letter quotes your own dated proofs, and the line you sealed on day one opens beside them.

**Loop fit:** It makes the imagination ↔ behaviour history visible. The finale is assembled entirely from real proof, which no server-story competitor offers. Season 2 asks the user to re-sharpen the desire from what they learned. Paying users can finally reach every dream, which fixes the intents[0]-only Today.

**Scope:** - app/(tabs)/arc.tsx replaces stories.tsx:
  - ArcSwitcher pills, also on Today
  - dream header: constellation thumbnail, 'Season 1 · Stage III of VII', chapters · proofs · nights
  - vertical ArcTimeline alternating ChapterPlate (generative cover, numeral, title, date) with Bridge and Proof nodes (kind glyph, sentence, photo), as a FlatList
  - tap to read any chapter, with prev/next in the reader
  - a 'Previously in your arc' card at the top of each new chapter
  - a visible '…' menu: rename, rest this dream, release, each through ConfirmSheet
  - a ghost plate 'A second dream needs its own sky' (Plus)
- Season start: app/capsule/seal.tsx, one sentence for the day it's real. It opens at the finale or after 90 days, with a one-off local notification.
- app/arc/[intentId]/finale.tsx: Named Sky + The Letter Back (a template letter quoting all 7 dated proofs) + the capsule, then vs now + 'Begin Season 2'.
- No 'future self' wording anywhere.

**Risk:** Long timelines need FlatList virtualisation. Migrated arcs have a short history. The tone of the Letter Back must not promise outcomes.

### P8. The sky remembers: forgiving progress + personal, rolling reminders  [M, high, free]

**Value:** No streak shame. Progress only adds up, with rest nights and a pause for travel or illness. Reminders speak in your own words at your time, and one switch turns them off.

**Loop fit:** Notifications carry today's bridge and quote yesterday's proof, so they deliver the loop rather than generic quotes. Counting a logged proof as 'showing up' rewards the action, not the opening of the app.

**Scope:** lib/progress.ts replaces streak.ts:
- nightsShownUp: distinct local days with any loop act (≥60% of a chapter heard, a proof, a carried line, a saved ritual). It never resets.
- Total stars.
- Weekly rhythm 'n of target', default 4, settable 3–7, with automatic rest nights.
- 'Pause my sky' for up to 30 days.
- The Today chip reads '12 nights · 9 stars'.
lib/notifications/* rewrite:
- A rolling queue of one-off notifications for the next 10 days, at most 40 pending (iOS caps at 64). Rebuilt on foreground and after state changes by a debounced useLoopEffects.
- Slots: ritual-time chapter or bridge cue, if-then cue, Sunday ledger, 1st-of-month sky, capsule unlock.
- 20 templates per slot, rotated without replacement and filled from the user's own data.
- setNotificationHandler plus a response listener deep-linking to vela://story/… and vela://evidence/….
- Permission is asked after the first Star Birth ('Want your next chapter to find you at 21:00?') or from Settings, never in onboarding.
- Delete 'the streak stays lit'.
- Web: in-app equivalents only.

**Risk:** Timezone and DST edge cases (cover with tests). Permission denial. Copy must be reviewed for guilt or loss framing. Phantom-notification complaints (I am) make exact cancellation on rebuild mandatory.

### P9. Bridge widgets for Home and Lock Screen  [L, high, free]

**Value:** Today's step and your sky sit where you look all day, and one tap logs the proof. A widget changes through the day without opening the app.

**Loop fit:** It is the first action-and-proof widget in the category. It shows only the user's own bridge, chapter line and sky, never a rotating generic quote (the I am / Motivation pattern), so it deepens the 4.3-distinct loop.

**Scope:** - @bacons/apple-targets 5.0.0, copying the proven Scripture Mate pattern (rork-scripture-mate/expo/targets/verse-widget, lib/widgetBridge.ts).
- targets/vela-widget, in SwiftUI:
  - systemSmall 'Tonight's line'
  - systemMedium 'Today's bridge', with 'I crossed it' as widgetURL vela://evidence/<intentId>
  - systemLarge 'Your sky', drawn with SwiftUI Path from snapshot coordinates
  - accessoryRectangular (the bridge)
  - accessoryCircular (stars n/7 gauge)
  - accessoryInline ('Chapter IV is waiting')
- The TimelineProvider builds morning, afternoon and evening entries from one snapshot. The Newsreader TTF is bundled in the extension.
- lib/widgets/snapshot.ts: pure, versioned, bun-tested. Written through ExtensionStorage('group.app.vela.manifest') behind requireOptionalNativeModule, then reloadWidget.
- app.json: ios.appleTeamId 6RMFGXBQ82 and the App Group entitlement.
- AddWidgetSheet with an RN WidgetPreview replica and a 3-step guide. Shown only after the 2nd Star Birth and at the finale.
- Web: the replica only, which is also the source for screenshot frame 5.

**Risk:** Signing a new extension in non-interactive local EAS may need one interactive run by the owner, plus App Group provisioning. Hard rule: if the widget CI build isn't green by the code freeze, ship 1.1 without it, release it in 1.1.1, and swap screenshot frame 5.

### P10. Soundscapes & Deep chapters (inside the player, never a sleep-sounds tab)  [M, medium, plus]

**Value:** Narration over an original sound bed. A longer, slower 'Deep' chapter for evenings and sleep that fades out with the timer.

**Loop fit:** The beds and Deep mode exist only inside the chapter player and lengthen the scene and the bridge rehearsal. They make the loop's listening richer without becoming a generic sleep-sounds product, which would be a 4.3 drift.

**Scope:** - scripts/gen_soundscapes.py, using the verified numpy/scipy + ffmpeg 8.1.2 pipeline: whole-cycle partials and FFT-circular noise for sample-exact loops.
- Output: assets/audio/{night, rain-on-glass, hearth, dawn}.m4a, 120s each at 96k AAC (about 1.5MB each), plus a 1s Star Birth chime.
- lib/audio/soundscapes.ts: catalogue with focus×daypart defaults.
- useSoundscape: expo-audio loop; ducks to 0.35 under speech and 0.6 in gaps; 30s fade at the sleep timer.
- SoundscapePicker sheet.
- Deep mode: the engine adds extended stage beats (+about 500 words), a longer breath and a 90s rehearsal, about 6–8 minutes.
- Lock-screen Now Playing via the expo-audio player metadata API (verify the API exists in 57.0.3).
- Free: the Night bed and Standard length. Plus: all beds and Deep.

**Risk:** A gap at the AAC loop point (fallback: crossfade two players). App size grows by about 6.5MB. The background-audio entitlement is fine because real audio plays.

### P11. Rituals that feed the story (Rituals tab: arc-aware journal, 'Your lines', Scenes)  [M, medium, both]

**Value:** Journal, affirmations and the vision board stop being separate tools. They talk about your current chapter and give back into it. Past pages open, and your board fills itself with proof photos.

**Loop fit:** The supporting rituals stay secondary and are wired into imagine → act → prove. 'Your lines' are identity affirmations derived from your own proof, which no generic library can produce. Pinned Scenes can be woven into the next chapter.

**Scope:** - app/(tabs)/rituals.tsx replaces journal.tsx:
  - Script prompts tied to the arc ('Script the scene just after Chapter III ends'), 12 per focus plus arc-linked prompts
  - 3·6·9 with phrase suggestions generated through the shaper ('I {desire.done}')
  - 48 gratitude stems
  - past pages open in app/journal/entry/[id].tsx
  - a 'Sealed. Vela will remember this page.' save moment
- 'Your lines' (kind × focus identity lines) lead the daily line; the existing 120-line library stays unchanged.
- Scenes: the board moves from a tab to app/scenes.tsx.
  - Captions, and 'attach to a dream'.
  - Proof photos are added automatically from evidence; proof capture gains an optional photo.
  - Captions can be woven into chapters.
  - No card cap for the active dream.
- Share a line as an SVG image card.

**Risk:** Scope creep into generic journaling. Keep exactly 3 practices and do not grow the generic affirmation library (4.3).

### P12. Honest Plus: paywall + Settings v2 + Book of Proof keepsake  [M, medium, both]

**Value:** It is clear what is free forever. Plus adds room for more dreams and richer listening, and a printable keepsake of your season. Settings finally lets you edit your name, ritual time and voice.

**Loop fit:** Plus sells loop depth (concurrent dreams, Deep chapters, beds, themes, Book of Proof) while the complete free loop stays intact. That fits Vela's edge, given that pricing is the category's top complaint.

**Scope:** app/paywall.tsx:
- the user's sky with ghost constellations for future dreams
- the user's stats ('Career · Season 1 · 5 proofs')
- benefits: more than one dream at a time; Deep chapters + all soundscapes; Sky themes Ink/Aurora/Dawn; Book of Proof PDF; every affirmation area
- plan plates with a per-month equivalent ($29.99/yr ≈ $2.50/mo), plus lifetime
- an engraved 'Free forever' banner listing your story, the loop, the sky, widgets, unlimited listens and backup
- no weekly plans, credits or trial
- the nudge moves to after the 2nd proof, with contextual entry points: second dream, bed tap, theme tap, export tap, after Named Sky
app/settings.tsx:
- name + pronunciation
- ritual time picker
- reminders Switch with the scheduled times shown
- weekly rhythm target; pause
- voice, speed, text size; default bed
- Your data: export and import
- Plus and restore
- a 'Charted on this device' badge
lib/bookOfProof.ts: expo-print 57.0.1 renders HTML to PDF (chapters, proofs, constellation SVG), then share. On web it opens the print dialog.

**Risk:** StoreKit prices are null off iOS, so show a neutral state. The store description must match the actual gates (2.3.1).

### P13. Listing 1.1: new screenshots, renamed metadata, updated review notes  [M, high, both]

**Value:** Shoppers understand Vela from three thumbnails and see something only Vela does, instead of three blurry, cropped text tiles.

**Loop fit:** Frames 1–3 tell the loop (story → step → proof writes the next chapter), frame 4 is the sky, and the review notes lead with the loop and the new review path, which is the 4.3 defence.

**Scope:** - Commit store/shots/{cdp.mjs, audit.mjs} under scripts/shots/.
- Still mode: EXPO_PUBLIC_STILL or ?still=1; fixed clock 21:04; motion frozen; seeded persona 'Maya' (career dream, Season 1 at Chapter V, 5 proofs, plus a completed sky and a second dream) injected into localStorage from scripts/shots/seed/maya.json.
- Capture at 440×956@3 (1320×2868) and 402×874@3 (1206×2622).
- scripts/shots/compose.mjs with @resvg/resvg-js as a devDependency (dropping the ../../formline import), bundled fonts, the Apple Design Resources iPhone 17 Pro bezel, and a 9:41 status bar.
- 10 frames per the storyboard.
- Metadata:
  - name 'Vela: Manifestation Stories'
  - subtitle 'Visualize. Act. Log the proof.' (30 chars; drops 'Future Self')
  - add 'journal' to keywords
  - promo text and description state 'free story, unlimited listens, no account, no weekly plans'
  - a specific What's New
- REVIEW_RESPONSE_4_3.md and the review notes give the new path.
- Fix e2e/walkthrough.mjs ('~ritual-story' → '~future-memory-card', plus the evidence → weave steps).
- Post-launch: Custom Product Pages for 369, vision board and scripting. Featuring nomination.

**Risk:** The widget frame must show a shipped widget (2.3.1), so keep the swap-in fallback. Renaming loses the 'Journal' title keyword; the ASO baseline is tiny, so the risk is low.

## 5. Content expansion (Section 0 overrides: no Deep mode, no Letter Back/capsule in 1.1; chapter target ~300-380 words)

GOAL
Go from about 2.8k words today to about 33k original words in 1.1. All of it is on-device data under 1 MB of text. Every addition hangs off chapter → bridge → proof; the generic affirmation library is deliberately not expanded.

SCHEMA FIRST
A2 commits lib/story/content/types.ts on day 1. Content agents A3 and A4 write only data files that match it. Each file opens with a style header.

1) DESIRE SHAPER (code; A2)
- Detects the shape: noun phrase; 'to'-verb; bare or imperative verb ('Find my soulmate'); 'I am/I have…' clause; 'I want…'.
- Strips want-verbs and deadline tails ('by next summer', 'this year', 'before my wedding').
- Swaps my→your, I am→you are, me→you.
- Uses a table of about 150 verbs with past and gerund forms.
- Exposes three slots:
  - {desire.quote}: the exact words in curly quotes; always safe.
  - {desire.np}: 'finding your soulmate', 'your own design studio'.
  - {desire.done}: 'you found your soulmate', 'you are debt free'.
- The 9 arrival frames that break today (ar-ca3, ar-ca6, ar-co2, ar-co4, ar-co6, ar-pe1, ar-pe2, ar-he2, ar-love6) are rewritten.
- The intake microcopy becomes 'Say it however it comes out.'

2) SEASONS (A3 writes shared + love/abundance/career; A4 writes health/confidence/peace)
Seven stages:
- I The First Glimpse: the first morning inside it.
- II The Night Before: rehearsal.
- III The Hard Day: something goes wrong and you handle it. This is realistic, and different from every competitor.
- IV Someone Notices.
- V The Threshold: the first 60 seconds after the news.
- VI An Ordinary Day: integration.
- VII Becoming.
Each stage has 6 beats.
- Shared beats (opening-morning, opening-evening, sensory, reflection, closing-morning, closing-evening): 7 stages × 6 beats × 5 variants = 210 fragments.
- Focus beats (stage-arrival, stage-living): 7 × 2 × 6 focus areas × 4 = 336 fragments.
- That is about 546 fragments at about 30 words, roughly 16k words.
- Titles: 7 stages × 6 focus × 3 = 126 titles, shown as 'Chapter III · The Hard Day'.
- Standard chapters are 380–460 words (about 2.5–3 minutes at rate 0.88).
- A morning ritual ends with heading into the day carrying the bridge. An evening ritual ends in rest. The se9 'Evening light' fragment is removed from the morning sequence.

3) MOTIF LEXICON (A4)
24 archetypes, matched on the device by keyword:
- own business/studio; bakery/café/food; creative work (art, music, writing a book); promotion/leadership; new job/career change; freelancing/clients; exam/degree
- debt-free; savings/house deposit; home/apartment; relocation/new country/visa; travel
- partner (romance); wedding; family/baby; family repair; friendship/community
- running/race; strength/fitness; healing/recovery; sleep/rest
- public speaking/visibility; confidence at work; calm mind
Each archetype has 6 sensory details, 3 living moments and 2 witness lines: 264 lines, about 4k words. Love content splits into romance, family and friendship by motif, so no partner is assumed unless the motif is romance.

4) PROOF WEAVE LIBRARY (A3)
- 3 kinds × 3 positions (arrival, witness, pre-closing) × 6 variants = 54 lines. Example (did): 'You remember the afternoon you {proof.done} — this morning began there.'
- 12 recall-by-date lines ('Twelve days ago you wrote {proof.quote}.')
- 8 cumulative lines ('Reality has answered you four times now.')
- 6 'not today → learned' lines
- 6 Scenes-caption lines ('On the wall, the picture you pinned — {scene.quote} —')
About 2k words in total. Each proof is woven once (wovenInChapterId); older proofs return only through recall lines.

5) BRIDGE LIBRARY (A4)
- 25 per focus (150 in total). Each is tagged with a tier (2-minute, 15-minute, brave), a stage, and optionally a motif ('Sketch the sign above your studio door').
- 3 reshape alternates per focus.
- 6 learned-retry prompts.
- About 3k words.

6) THE LETTER BACK + CAPSULE (A3)
- 6 focus areas × 2 letter skeletons, each with 3 openings, 7 proof-quote frames per kind and 3 closings. Assembled with the user's dated proofs.
- 12 capsule prompts.
- About 2.5k words. Never 'future self' and never outcome guarantees.

7) DEEP MODE, Plus (A3 and A4 split by focus)
- 7 stages × 6 focus extended scene passages of about 120 words each: about 5k words.
- 6 breath and rehearsal scripts of about 150 words each: about 1k words.

8) NOTIFICATION COPY (A4)
- 6 slots × 20 templates = 120, filled from the user's data. No guilt or loss framing.
- About 1.5k words.

9) YOUR LINES (A4)
- 3 kinds × 6 focus × 6 = 108 identity lines (did + career → 'I am someone who ships before I'm ready').
- About 1k words.

10) RITUAL PROMPTS (A4)
- Script prompts: from 12 to 84 (12 per focus plus 12 arc-linked: 'Write the scene just after this chapter ends').
- Gratitude stems: from 9 to 48.
- 3·6·9: 10 phrase suggestions per focus, generated through the shaper.
- Onboarding: 4 desire suggestion chips per focus.
- About 1.5k words.

WRITING RULES (in every file header; enforced by tests where possible)
- Original prose only. Second person, present tense.
- {name} appears at least once and {feeling} at least once per chapter. The desire appears in two forms.
- 'now' at most once per chapter. No hard-coded weekdays. No 'future self'. No health, medical or money guarantees. No gendered pronouns for other people.
- Sentences of 28 words or fewer, TTS-friendly (no parentheses or abbreviations).
- Inclusive: no assumed body, gender or relationship.

TESTS (A2)
- Golden matrix: 30 realistic desires × every slot frame.
- Regex bans: 'to to', 'into to', '\.\.', '!\.', 'my/I' leaking into the narration.
- A 30-chapter run with no back-to-back paragraph or bridge.
- Word-count and reading-time bounds per length.
- Each proof is woven exactly once.

OWNER GATE
Skim 20 random renders per focus before content freeze (about day 9).

DELIBERATELY NOT ADDED
The 120 generic affirmations are not expanded. No 'hard day' or 'sleep' affirmation packs, no moon or astrology copy, no 369-as-hero content, and no specific-person or ex scripts.

## 6. Engineering plan (Section 0 overrides: no widgets, no expo-print; agents work in ONE shared tree on disjoint files)

BRANCH AND CADENCE
- All 1.1 work happens on elevate-1.1, which today equals review-rebuild at 15c43a7. Each agent works on a feature branch off it.
- Merge to review-rebuild only at release, because every push there starts a 90-minute macOS build.
- Native smoke builds use workflow_dispatch with submit=false.
- Version: app.json version 1.1.0 and ios.buildNumber '5'. Set both by hand: appVersionSource is local and autoIncrement is false.

TARGET DATES
- Phase 0: 2026-10-16.
- Phase 1: 10-16 to 10-22.
- Phase 2: 10-22 to 11-01.
- Phase 3 + device QA: 11-02 to 11-07.
- Submit: about 11-09.
- Featuring Nomination in App Store Connect by 10-24, at least 2 weeks ahead.
- 1.2 ('Year of Proof') submitted by about 12-08, ahead of the New Year fresh-start peak.

NEW DEPENDENCIES
All are exact pins with no ~ or ^. Each was verified on npm on 2026-10-15 and appears in expo 57.0.9 bundledNativeModules.
- expo-linear-gradient 57.0.1
- expo-font 57.0.1 (today transitive; make it direct)
- @expo-google-fonts/newsreader 0.4.1
- @expo-google-fonts/instrument-sans 0.4.2
- expo-audio 57.0.3
- react-native-view-shot 5.1.0
- expo-sharing 57.0.8
- expo-print 57.0.1
- expo-document-picker 57.0.1
- widget phase only: @bacons/apple-targets 5.0.0
- devDependency: @resvg/resvg-js, pinned to the current version at install. It replaces the ../../formline/node_modules import.

DO NOT
- Upgrade expo. Stay on 57.0.9 with expo-modules-core 57.0.8, and keep expo-store-review pinned at 57.0.1 (the SceneGeometry skew trap).
- Add Skia, Lottie, expo-blur, expo-image, react-native-audio-api, expo-widgets, or unstable-native-tabs.

APP.JSON
- infoPlist: UIBackgroundModes ['audio'] and NSPhotoLibraryAddUsageDescription.
- plugins: expo-audio, and expo-font embedding 4 TTFs (Newsreader 400 and 400 Italic, Instrument Sans 400 and 600).
- Widget phase: ios.appleTeamId 6RMFGXBQ82, entitlement com.apple.security.application-groups ['group.app.vela.manifest'], and the @bacons/apple-targets plugin.
- The scheme 'vela' already exists.

ARCHITECTURE
- lib/ (pure, bun-tested; the existing rule continues):
  - story/{shaper, seasons, engine, weave, motifs}.ts and story/content/*
  - futureMemory.ts (the bridge library and offers)
  - progress.ts (replaces streak.ts)
  - sky/{starfield, figures, layout}.ts
  - audio/{narration, session, soundscapes}.ts
  - notifications/{schedule, templates}.ts
  - widgets/snapshot.ts
  - share/cardModel.ts
  - backup.ts, migrate.ts, bookOfProof.ts, clock.ts, still.ts
  - store/persistQueue.ts
- contexts/:
  - ArcContext replaces StoryContext. It is a reducer with atomic actions (CREATE_DREAM, CHOOSE_BRIDGE, SAVE_PROOF_AND_WEAVE, RERENDER_CHAPTER, SEAL_CAPSULE, NAME_CONSTELLATION, REST/RELEASE) and a serialized persist queue on the key vela.arcs.v2.
  - UserContext v2 adds ritualTime HH:mm, pronunciation, rhythmTarget, pausedUntil, voiceId, rate, textSize, theme and bed.
  - RitualContext uses progress.
  - JournalContext.
  - BoardContext becomes ScenesContext, with an intentId link.
  - PlusContext gains canAddDream, canUseBed and canUseDeep gates.
- Side effects live in one debounced useLoopEffects() mounted in the root. It rebuilds the notification queue and writes the widget snapshot, so screens never schedule anything themselves.
- components/:
  - ui/, sky/ and glyphs/ are owned by A1. Phase 2 screens import only from these barrels.
  - feature/ components are owned by the screen agent that uses them.
- app/ routes follow the information architecture.
- scripts/: gen_soundscapes.py and shots/{cdp, audit, capture, compose}.mjs plus seed/*.json.
- targets/vela-widget/.

AGENT SPLIT (disjoint file ownership; shared files have exactly one owner)

PHASE 0 (serial, A0, half a day)
- Owns package.json, package-lock.json and app.json (except the widget section, added later by A6 after A0 merges).
- Adds the pins and plist keys, then runs npm ci --include=dev, bun test (67 should pass), tsc --noEmit and the vela-web launch on port 8094.
- Runs ONE workflow_dispatch release build with submit=false to catch native compile skew before any screen work starts.

PHASE 1 (parallel, days 1-5). Day-1 contracts are committed first: A1's components/ui/index.ts typed prop stubs, and A2's contexts/arc.types.ts plus lib/story/content/types.ts.
- A1, design system: constants/theme.ts, components/ui/**, components/sky/**, components/glyphs/**, lib/sky/**, lib/still.ts, lib/clock.ts, app/_layout.tsx (fonts, backdrop, audio session, useLoopEffects mount, notification routing), app/(tabs)/_layout.tsx with stub files app/(tabs)/{arc,sky,rituals}.tsx, app/dev/kitchen-sink.tsx, and the CI lint-grep script.
- A2, data and engine: contexts/** and lib/story/{shaper,seasons,engine,weave,motifs}.ts, lib/futureMemory.ts, lib/progress.ts, lib/migrate.ts, lib/backup.ts, lib/store/persistQueue.ts, all of their tests including the golden matrix, and the lib-side P0 fixes.
- A3, content writer: lib/story/content/{stages.shared.ts, love.ts, abundance.ts, career.ts, weave.ts, letters.ts, deep.shared.ts}.
- A4, content writer: lib/story/content/{health.ts, confidence.ts, peace.ts, bridges.ts, motifs.ts}, and lib/content/{notifications.ts, lines.ts, prompts.ts, chips.ts}.
- A5, audio: scripts/gen_soundscapes.py, assets/audio/**, and lib/audio/** (narration, session, soundscapes, useNarration, useSoundscape) with tests.
- A6, native surfaces:
  - lib/notifications/** (rewrite plus tests), lib/widgets/**, targets/vela-widget/**, lib/loopEffects.ts, and the widget section of app.json.
  - Dispatches the widget CI build by day 4. If signing fails, the owner does one interactive EAS signing run. If it is still blocked by 11-03, widgets move to 1.1.1 without blocking the release.

PHASE 2 (parallel, days 5-12; starts once the A1 primitives and A2 hooks are frozen)
- S1, onboarding: app/onboarding.tsx, app/story/new.tsx, components/feature/{WeaveInterstitial, DesireComposer}.
- S2, Today and Sky: app/(tabs)/index.tsx, app/(tabs)/sky.tsx, components/feature/{SkyHero, ConstellationView, StarDetailSheet, ArcSwitcher, LedgerCard, MonthSky, LogSealed}.
- S3, reader: app/story/[id].tsx, components/feature/{NarrationDock, ThresholdBreath, RehearseBridge, BridgeChooser, IfThenBuilder, SoundscapePicker, SleepTimerSheet, VoiceSheet}.
- S4, proof: app/evidence/[intentId].tsx, components/feature/{ProofForm, StarBirth, NamedSkyCeremony, NotTodaySheet, ShareCard*}, lib/share/**.
- S5, arc: app/(tabs)/arc.tsx (delete stories.tsx), app/arc/[intentId]/finale.tsx, app/capsule/seal.tsx, components/feature/{ArcTimeline, ChapterPlate, LetterBack, CapsuleCard}.
- S6, rituals: app/(tabs)/rituals.tsx (delete journal.tsx), app/journal/**, app/affirmation.tsx, app/affirmations.tsx, app/scenes.tsx (delete (tabs)/board.tsx), components/feature/{ScenesGrid, LineCard}.
- S7, Plus and settings: app/paywall.tsx, app/settings.tsx, app/settings/data.tsx, components/feature/{AddWidgetSheet, WidgetPreview, PlanPlate}, lib/bookOfProof.ts.
- Every existing testID is kept (future-memory-card and the rest), and each new control gets one.

PHASE 3 (days 12-16)
- R1, release:
  - Moves scripts/shots/**, adds still mode and the seed persona, and writes compose.mjs.
  - Produces 10 frames at 1320×2868 and 1206×2622.
  - Updates store/localizations/en-US.strings (name, subtitle, keywords, promo, description, What's New) and store/REVIEW_RESPONSE_4_3.md.
  - Fixes e2e/walkthrough.mjs.
- Q1, QA: a full web walkthrough of every route at 430×932@3, in still mode and with motion on.
- Owner device checklist on TestFlight:
  - update over an App Store 1.0.1 install that has data (migration)
  - narration with the mute switch on and the screen locked
  - loop-point gap
  - widgets on Home and Lock Screen, and their deep links
  - notification queue and its deep links
  - Star Birth on an iPhone 12-class device for performance

GATES ON EVERY PR
- bun test and tsc --noEmit.
- The lint-grep: no fontSize or hex literals in app/.
- A web capture of the owner's screens at SCALE=3, posted in the PR.
- No Alert.alert. Icon buttons have accessibilityLabel.
- Native: a dispatch build after Phase 0, after the widget merge, and at the release candidate.
- Test count goes from 67 to about 220.

BUDGET
- iOS JS bundle: from 5.85 MB to about 7 MB.
- Assets: about 6.5 MB audio plus about 0.9 MB fonts.

MEASUREMENT (no analytics SDK)
- App Store Connect App Analytics retention cohorts, comparing 1.0.1 with 1.1.
- The review prompt moves to after the 2nd proof plus Named Sky, still once, with a 4-hour gap.

## 7. Screenshot storyboard (Section 0 overrides: frames 5 and 8 replaced with Star Birth and Named Sky)

1. **Your future, written as a *story*.**: A narrated chapter built from your own words, right on your iPhone.
   - State: Reader in narrating state. 'Chapter I · The First Glimpse' for persona Maya (Career). The current sentence is lifted to 100% and the rest dimmed. The user's words appear in gold italic: “my own design studio, with clients who trust my eye”. The scrimmed dock shows 'Listening · 2:41' with the horizon progress line, over a career-tinted dream sky.
   - Treatment: Search triptych, part 1 of 3. Master canvas is 1320×2868, also exported at 1206×2622. Background is the Vela night gradient (#0E0C22 → #1E1840 → #3A2A4F) with a gold horizon bloom at about 18% and faint chart line-work. Headline: Newsreader SemiBold at 140px in ivory #F6EFE3, with the keyword in gold #E9B44C, top-left, at most 2 lines. Subline: Instrument Sans at 52px, 70% ivory. iPhone 17 Pro bezel, centered, bleeding about 8% off the bottom. The gold quote chip pops out at top-left, scaled 1.25x, with a gold-tinted glow; a thin gold constellation thread runs from it to the highlighted sentence and exits the right edge.

2. **Then take one *real* step.**: Every chapter ends with one small, observable action for today, sized to your day.
   - State: End of Chapter I, showing the violet BridgeChooser. Three sized options are listed and '15-minute: Send one piece of work to someone whose eye you trust' is selected. The IfThen line reads 'If it's 9am and I hesitate, then I open the portfolio file.' The violet 'Make it observable' CTA is visible.
   - Treatment: Triptych, part 2. The device is offset right. The violet bridge card pops out to the left at 1.25x with BridgeGlyph. The gold thread from frame 1 passes through a star node and exits to frame 3. The background is slightly warmer than frame 1.

3. **What you did writes *chapter two*.**: Log one honest sentence. Vela weaves it into your next chapter.
   - State: Chapter II · The Night Before. The paragraph containing the woven proof is highlighted gold and tagged 'Woven from your proof': 'You remember the afternoon you sent your portfolio to two studios you admire — this began there.'
   - Treatment: Triptych, part 3, the payoff and the mechanic App Review accepted. The device is centered. A popped-out starlight proof card ('I did it · Sent my portfolio to two studios I admire.') has a gold line flowing into the highlighted paragraph, and the thread ends in a lit star. Frames 1-3 must read as one sentence at about 125pt width, and each must still work on its own.

4. **Every step becomes a *star*.**: Your sky only grows. No scores, no streak shame.
   - State: The Sky tab, full screen. Maya's named constellation 'The Studio' shows the Vela sail figure with all 7 stars and the gold anchor. A second figure is in progress with 3 stars. One star is tapped and its detail sheet is peeking: 'Day 9 · I moved · Booked a call with a studio lead · changed Chapter IV'.
   - Treatment: Peak frame, full-bleed with no device: the frameless capture fills the canvas under the headline. It is the visual signature of the set and the first Product Page Optimization test against frame 1. Keep it clear of Soul's glowing figures; there is no orb and only line-work.

5. **Your step, on your *Lock Screen*.**: Widgets show your own bridge, chapter line and sky. One tap logs the proof.
   - State: Composite. A Lock Screen with the accessoryRectangular bridge widget ('Today's bridge · Send one piece of work…') and the circular 5/7 stars gauge. Below, a Home Screen with the medium 'Today's bridge' widget and the large 'Your sky' widget.
   - Treatment: Two overlapping devices, the Lock Screen in front and tilted 4°. The widgets are rendered from the shipped SwiftUI target (a simulator capture if possible; otherwise the pixel-matched RN WidgetPreview). FALLBACK if the widget slips to 1.1.1: show the Star Birth moment mid-flight, with the headline 'Leave proof. Watch it become a star.'

6. **Listen as often as you *like*.**: No daily limit. Original soundscapes and a sleep timer. Works offline.
   - State: Listening sheet in Deep mode. The soundscape 'Rain on glass' is selected, the sleep timer is set to 20 minutes, the voice reads 'Enhanced · Ava', speed is 0.9, and 'Play season' is visible above the dimmed chapter text.
   - Treatment: The device is tilted 6°. The play control pops out with a soft gold glow. Lock-screen Now Playing is shown only if the expo-audio metadata API actually ships it.

7. **Every chapter, *kept*.**: Reread your arc: chapters, steps and proof, in the order they happened.
   - State: The Arc (Memory Book) timeline for Maya's career dream. The header reads 'Season 1 · Stage V of VII · 5 chapters · 5 proofs · 14 nights'. Below it, ChapterPlates with generative covers alternate with bridge and proof nodes carrying real sentences.
   - Treatment: The device is offset left. One ChapterPlate pops out at 1.2x on the right, with a gilded corner-tick plate and a numeral.

8. **Look back at what became *real*.**: At the end of a season, a letter quotes your own proof, dated.
   - State: Season finale. The Letter Back is open, quoting three dated proofs ('On 14 October you wrote…'). Beside it, the sealed day-one line is shown in a 'then and now' layout.
   - Treatment: The device is centered. The gilded letter plate pops out, and the date numerals are in gold. Never use the phrase 'future self'.

9. **Rituals that serve your *story*.**: Scripting, 3·6·9, gratitude and lines born from your own proof.
   - State: Two overlapping devices. In front: 'Your line' on the sky, 'I am someone who ships before I'm ready.', drawn from proofs. Behind: the 3·6·9 page with filled lines and the 18 stars partly lit.
   - Treatment: The supporting rituals sit deliberately after the loop, keeping the 4.3 positioning. Use the warmest dusk background of the set.

10. **Private by *design*.**: No account. No servers. What you write stays on your iPhone.
   - State: Today in LOG SEALED state: 'Good evening, Maya.', the sky hero with the 'The Studio' constellation, and the plate 'Chapter V · 1 proof · next ritual 21:00'.
   - Treatment: Trust close (peak-end). Three engraved badges sit under the device, each with at least 44px text: 'No account', 'Works offline', 'Data Not Collected' (matches the published App Privacy label). The background is the dawn end of the gradient. GLOBAL BANS across all 10 frames: no prices, no 'free', no '#1', no ratings or user counts, no competitor names, no photos of people, no 'future self', no pink, and no black-and-gold slide. Pricing promises go in the description and promo text instead. Use en-US spelling. Capture from the web build in still mode at native 3x, with no upscaling, and do one iOS-harness parity spot-check on frames 1, 3 and 4.

## 8. Adversarial critique: required fixes (binding)

The direction is right, but the release is too big and some of its native assumptions are wrong. The plan's diagnosis holds up against the code. I checked these directly: Today renders only `intents[0]` (`app/(tabs)/index.tsx`); the contexts read a stale snapshot (`contexts/StoryContext.tsx`); `futureMemory.dateKey` uses UTC; the evidence screen has the `points.length + 1` bug (`app/evidence/[intentId].tsx:126`); the '1 moments' bug is at index.tsx:129; there are 10 `Alert.alert` calls, 0 `accessibilityLabel`s and 15 distinct font sizes; `reshapeAction` is never called and `mood` is never read; and `bun test` passes 67 tests. Night Atlas, proof highlighted in gold inside the next chapter, and the sky as the record of proof is the correct, 4.3-safe way to elevate Vela.

The plan then tries to ship all of the following in about 3.5 weeks: 13 features, about 33k words of agent-written prose, a new widget extension, background audio, a live data migration, and a full 4-tab rework. Every on-device check is squeezed into the owner's last 5 days.

Several native claims are contradicted by the installed or published package source:
- **Lock-screen controls:** expo-audio 57.0.3 needs `interruptionMode` 'doNotMix' for them; the plan uses 'duckOthers'.
- **Microphone string:** the expo-audio config plugin adds a generic microphone permission text by default.
- **Premium voices:** expo-speech reports them as 'Default', so "prefer Enhanced" skips the best voices.
- **Book of Proof on web:** expo-print on web ignores the HTML and just calls `window.print()`.
- **Background narration:** a JS-timer sentence queue is likely to stall when the phone locks.

The migration also takes each user's stage from a chapter counter that the refresh-icon bug inflated. Adding 'journal' pushes the keywords over Apple's 100-character limit.

Recommendation: ship 1.1 as the trust pass, the visual system, the content engine, the living constellation on Today, the upgraded reader, the new onboarding, the Memory Book, forgiving progress with personal reminders, and the new listing. Run widgets as a parallel 1.1.1 track whose signing spike starts on day 1. Move soundscape breadth, Deep chapters, the Letter Back and capsule, the Book of Proof, themes and the pannable Sky tab to 1.2.

The biggest thing missing for "people want it" is not visual. The signature payoff (your real action woven into the story) only appears after a user leaves, acts and comes back. It should land in session 1, and in App Review's first minute.

- **The migration takes each user's stage from the inflated v1 chapter counter. The plan maps existing users to 'stage min(chapter, 7)' and the 'current story to chapter N'. But in v1, `regenerate()` (`C:\Users\Gain John\Downloads\solve_problem\vela\contexts\StoryContext.tsx`) raises `intent.chapter` every time the reader's refresh icon is tapped (`app/story/[id].tsx` `again()`), with no proof. Each tap also adds a new 'open' action without closing the previous one.**
  - Why: A v1 user who rerolled 8 times with 1 proof would land at stage VII and the finale holding a one-star figure. Named Sky and the Letter Back assume 7 proofs. Orphaned open actions would show in the Memory Book as a stack of unfinished bridges. This is the one data path where a bug destroys the proof the app is built on.
  - Fix: Set stage = min(completedProofs + 1, 7) and keep the displayed chapter number separate. Keep only the newest non-completed action per intent as the live bridge, and mark older open ones as lapsed (hidden). Add a reroll-heavy v1 fixture and a fixture with several open actions to the release-blocking migrate tests.

- **The audio-session settings contradict each other. In expo-audio 57.0.3 (`build/AudioModule.types.d.ts` line 167), lock-screen controls (`setActiveForLockScreen`) require interruptionMode 'doNotMix'. The plan sets 'duckOthers' and also promises lock-screen Now Playing (soundscapes feature and screenshot frame 6).**
  - Why: As specified, either Now Playing silently fails or the mode change is discovered during device QA in the final week.
  - Fix: Choose 'doNotMix' while a chapter session plays; it is a focused listen, so pausing podcasts is acceptable. That enables lock-screen controls. Alternatively keep 'duckOthers' and drop Now Playing from the scope and the screenshots. Record the decision in a tested `lib/audio/session.ts`.

- **Background narration is likely to stall. expo-speech already queues utterances natively (`node_modules/expo-speech/ios/SpeechModule.swift` calls `synthesizer.speak(utterance)`; the JS docs say speak() 'adds an utterance to queue'), but it has no pre/post-utterance delay option. The plan's 350ms paragraph pauses and its JS-driven per-sentence queue therefore depend on timers that may not fire once the screen locks and no bed is playing.**
  - Why: Narration could stop after one sentence when the phone is locked. Also, declaring UIBackgroundModes 'audio' when a reviewer cannot hear persistent audio is a known Guideline 2.5.4 rejection. The plan treats background audio as fine 'because real audio plays', but that is only true when a soundscape bed is on.
  - Fix: Queue the whole chapter as per-sentence utterances in one go, with no JS timers between them. Drive highlighting from each utterance's onStart and onDone, which removes the dependence on onBoundary/iOS 26. Let punctuation provide the pauses. Test locked-screen and silent-switch playback in a TestFlight build within the first 3 days. If it fails, remove UIBackgroundModes instead of shipping it unused. Add 'Tap Listen, then lock the phone' to the review notes.

- **The expo-audio config plugin injects a generic microphone permission. `expo-audio@57.0.3 plugin/build/withAudio.js` defaults to NSMicrophoneUsageDescription 'Allow $(PRODUCT_NAME) to access your microphone', recordAudioAndroid=true and enableBackgroundPlayback=true. The plan lists 'expo-audio' as a plugin with no options.**
  - Why: Vela would ship a vague microphone permission text it never uses. It also undercuts the privacy story, and background mode gets enabled by default whether or not it was verified.
  - Fix: Configure the plugin explicitly (microphonePermission, recordAudioAndroid: false, and enableBackgroundPlayback tied to the result of the audio spike). Unzip the release-candidate IPA and check the built Info.plist in CI.

- **Premium voices are invisible. expo-speech maps only `.enhanced` to 'Enhanced' (`SpeechModule.swift`, getVoices), so iOS Premium voices, the best ones, come back as 'Default'. The plan's 'prefers Enhanced English voices' and frame 6's 'Enhanced · Ava' are built on that field.**
  - Why: The voice is the biggest gap in perceived quality against server-TTS competitors, and the picker would steer users away from the voices that sound best.
  - Fix: Rank voices by identifier substring (premium > enhanced > compact) and show each voice's real name. Make the 'download a better voice' hint plain text instructions (Settings > Accessibility > Spoken Content > Voices). Never use an App-Prefs: URL, which is private API and a 2.5.1 rejection risk.

- **One global SkyBackdrop behind transparent native-stack screens is unproven, and it breaks for modals. The root Stack in `app/_layout.tsx` uses animation 'fade'. With transparent screens, a crossfade shows both screens' text overlapping. iOS modal and pageSheet presentations (the IA's paywall and capsule/seal modals) live in a separate presentation container and will not see a backdrop mounted behind the Stack. The web preview uses a JS stack, so it will not reveal either problem. The single SkyScroll parallax context also jumps when switching tabs.**
  - Why: The whole visual system rests on this layer. If it fails on device after Phase 2 screens are built, every screen has to be reworked.
  - Fix: Make the `<Screen>` primitive own the backdrop from day 1. Default to a per-screen opaque backdrop: a module-level memoized static starfield, with twinkle only while the screen is focused (useIsFocused). Try the global transparent approach only after an on-device check in the first TestFlight build. Drop the scroll parallax.

- **Sentence-by-sentence ink-in and in-paragraph effects cannot be built as specified. In React Native, nested `<Text>` spans cannot take transforms or Reanimated entering animations, so 'opacity plus a 6px rise per sentence, 120ms stagger' would force each sentence into its own block Text and break inline text flow. Nested spans also do not report their position, which auto-scrolling to the current sentence needs.**
  - Why: The reader is the product's peak screen. Discovering this in Phase 2 forces a redesign under deadline.
  - Fix: In the T/Reading contract: animate the rise per paragraph; do sentence highlighting and gold user-word spans through nested Text color/opacity state only; auto-scroll by paragraph using onLayout.

- **Custom-font weight and italic handling is missing from the type system. With custom font families, fontWeight '600' and fontStyle 'italic' do not select the 600 or Italic files: iOS and Android fall back or synthesize, and web fakes the italic. `theme.ts` `type.display` and `type.title` carry fontWeight '600' and are spread across 15 screens, and the plan keeps old tokens as aliases 'so untouched screens still compile'.**
  - Why: Expect wrong weights, fake italics on the user's own words (the gold-italic signature), and differences between web screenshots and iOS. That defeats the stated goal of making web match iOS.
  - Fix: `<T>` maps each variant to an explicit family (Newsreader_400Regular_Italic, InstrumentSans_600SemiBold) and strips fontWeight and fontStyle. Extend the lint grep to ban fontWeight and fontStyle in app/. Gating render on useFonts is enough; the expo-font plugin embedding is redundant. Also, the 4 TTFs total about 0.4 MB, not 0.9 MB (the 400 files are 68 KB and 116 KB), which I measured from the tarballs.

- **Kept chapters will grow into one large AsyncStorage value. `vela.arcs.v2` stores every chapter's full text and highlight spans in one JSON that the persist queue rewrites on every bridge choice, proof, rename and rest.**
  - Why: At about 3 KB per chapter, that is roughly 1 MB a year. It would be serialized on the JS thread at the exact moment Star Birth animates, which is jank on low-end iPhones. On web, localStorage is capped at about 5 MB.
  - Fix: Use an index key plus one immutable key per chapter, and write after the ceremony finishes (InteractionManager). Add a size and perf test to A2's suite.

- **Daypart is baked in at weave time. Chapters are woven when the proof is saved, at any hour, and stored. But they are read later ('Save for 21:00'), and the engine picks 'daypart open and close based on ritual time and the current hour'.**
  - Why: A morning opening and an 'into the day' closing read in bed at 21:00 breaks the immersion the whole release is selling.
  - Fix: Store both opening/closing variants and pick one when the chapter is opened, or choose from the ritual setting only. Exclude daypart from the persisted text.

- **The chapter-length numbers do not add up, and the content quality gate is unrealistic. 546 fragments at about 16k words is about 30 words per fragment. A 6-beat skeleton plus the proof beat, the 'Previously' opener and motif lines comes to about 250–300 words, not 380–460. Deep's 42 passages of about 120 words add roughly 120 words per chapter, not +500, so '6–8 minutes' will not hold. The owner skim (20 renders × 6 focus areas × about 420 words) means reading roughly 50k words.**
  - Why: Either chapters ship at about 2 minutes while the listing promises more, or the content agents discover mid-sprint that they need about twice the words. Agent-written prose is also exactly the 'AI slop' that low-star reviews punish Moonly for.
  - Fix: Fix the target length first and size the pools from it. Replace the skim with this: the owner reads one full season for 2 focus areas (14 chapters). Add an automated style lint for LLM tells (em-dash density, 'not X but Y', stock words such as whisper or tapestry), a read-aloud TTS pass, and the golden matrix.

- **Prompts collide at proofs 1 and 2. The plan asks for notification permission after the first Star Birth, shows the AddWidget sheet after the second, shows the soft Plus nudge 'after the 2nd proof', and leaves the review prompt ambiguous. `lib/reviewPrompt.ts` currently fires the rating prompt after the second proof from the evidence screen. Asking for notifications only after a proof also means users who never act are never asked.**
  - Why: Three or four asks stacked on the same peak moment turns the Star Birth into a pop-up gauntlet. It also hides reminders from the users who most need them.
  - Fix: Add `lib/asks.ts`, pure and tested, which allows at most one ask per session in a fixed priority order. Move the notification ask to the moment the user commits a bridge or sets an if-then time ('Remind me at 9am to do this?').

- **Deep links and notification taps on cold start are not covered. The plan specifies 'a response listener', which misses the notification tap that launched the app. `RootNavigator` (`app/_layout.tsx`) waits only for UserContext, not story data, so a cold-start `vela://story/<id>` renders 'This story has drifted off.' (`app/story/[id].tsx`) until StoryContext loads. Navigating before the Stack mounts also throws.**
  - Why: Notifications and widgets are the plan's retention engine, and they all enter the app through cold-start deep links.
  - Fix: Use useLastNotificationResponse and route only after every store is ready. Make RootNavigator wait for ArcContext as well. Add cold-start deep-link checks to the simulator harness.

- **Personal text on the Lock Screen. The accessoryRectangular widget shows the bridge, and notifications quote the user's proof and desire. Desires can be very private (debt, health, a relationship).**
  - Why: Exposing private desires to anyone glancing at a locked phone contradicts the 'Private by design' frame and creates 1-star risk.
  - Fix: Apply `.privacySensitive()` to desire and proof text in widgets. Add a 'Keep my words off the Lock Screen' setting, on by default for Lock Screen surfaces, which switches to neutral copy.

- **The widget build is missing a privacy manifest and a silent-failure guard. The plan's app.json section has no `ios.privacyManifests` entry. Scripture Mate needed UserDefaults reason 1C8F.1 for its App Group, and the extension reading UserDefaults(suiteName:) needs its own PrivacyInfo. The plan also copies Scripture Mate's `requireOptionalNativeModule('ExtensionStorage')` pattern, which, per memory, hid a skipped pod across two shipped releases.**
  - Why: Risk of an ITMS-91053 upload rejection, and of widgets shipping with no live data while every test stays green.
  - Fix: Add both privacy manifests. Add a CI release gate that fails unless the IPA contains 'ExtensionStorage' and the log shows 'Installing ExtensionStorage'. Show widget-write failures in a dev diagnostics screen instead of no-op'ing them.

- **The keywords overflow. The current field in `store/localizations/en-US.strings` is 99 characters; adding ',journal' makes it 107, over Apple's 100. `scripts/check_metadata.py` runs in `ios-release.yml`.**
  - Why: The release build fails at the metadata step, or the field gets truncated by hand under pressure.
  - Fix: Drop 'goal' or 'assumption'. Also drop 'manifest' once 'Manifestation' is in the name, since Apple indexes name words.

- **Still mode could leak into production. EXPO_PUBLIC_STILL is inlined at build time, and still mode freezes motion and fixes the clock at 21:04.**
  - Why: A release built with it set ships wrong greetings, wrong date keys and wrong notification scheduling, and nothing fails visibly.
  - Fix: Honour still mode only when Platform.OS === 'web' and either __DEV__ or ?still=1. Add a guard in `ios-release.yml` that fails the build if EXPO_PUBLIC_STILL is set. Make `lib/clock.ts` injectable only in tests and on web.

- **Accessibility and small screens are under-specified. QA runs only at 430×932. The SkyHero is a fixed 320px, so on an iPhone SE (375×667, still supported at the iOS 16.4 minimum) the loop card's one CTA falls below the fold. There is no Dynamic Type plan. SVG stars are not individually accessible, so 'tap a star' and the pannable sky do not work with VoiceOver. Under Reduce Motion, ambient twinkle, drift and parallax should be off, not crossfaded. The ink48 ≈ 4.6:1 contrast figure is correct only on flat sky900 (I recomputed it); over the horizon tint, nebula and stars it falls below 4.5:1.**
  - Why: The skill's 375px baseline and its thumb-zone and contrast rules are broken on exactly the screens being redesigned, and an inaccessible sky is the new core visual.
  - Fix: Add 375×667 and accessibility-size Dynamic Type captures to the PR gates. Size the hero as a clamp of about 30% of window height, with 200px as the floor. Put invisible Pressables with accessibilityLabels over the stars and offer a list alternative. Measure contrast against the lightest sampled backdrop pixel. Under Reduce Motion, render a static sky.

- **What happens when Plus lapses is undefined. The plan promises 'everything you made stays readable if Plus ends', but it does not say what happens to a lapsed user with 3 active dreams: which ones keep weaving, and which feed notifications and widgets. PlusContext re-checks the entitlement on every foreground (`onlyIncludeActiveItemsIOS`), so a lapse will happen silently.**
  - Why: Without a rule, the code will either lock dreams, breaking the promise, or leave Plus features free.
  - Fix: Define the rule. On lapse every dream stays readable, the user picks one active dream, and the others rest until re-subscription. Unit-test it in PlusContext and ArcContext.

- **Paywall price math and prominence (Guideline 3.1.2). A hard-coded '$29.99/yr ≈ $2.50/mo' is wrong in non-USD storefronts, and the per-month equivalent must be less prominent than the price actually billed.**
  - Why: It is a common paywall rejection, and it would show wrong figures to most non-US users.
  - Fix: Compute the monthly equivalent from StoreKit's numeric price and currency using Intl. Render it smaller than the billed price, and hide it while prices are null.

- **Widget screenshots are not producible as planned. Frame 5 needs the real SwiftUI widgets on the Home Screen and Lock Screen. From Windows-only development that means automating the widget gallery on the macOS runner, and the plan does not include that. The RN WidgetPreview replica is not the shipped widget (Guideline 2.3.1).**
  - Why: Either an inaccurate frame ships, or capture becomes a late, flaky task on the critical path.
  - Fix: Make the Star Birth fallback the default frame 5 for 1.1. Swap in widgets only in 1.1.1, once a real simulator capture exists.

- **Several web 'fallbacks' do not work. In expo-print@57.0.1, `build/ExponentPrint.web.js` implements both `print()` and `printToFileAsync()` as a bare `window.print()` that ignores the HTML. So 'on web it opens the print dialog' would print the current app screen. On Chrome's network voices, Web Speech onBoundary is unreliable.**
  - Why: The web build is the preview and screenshot surface, and 'degrade gracefully, never crash' is a stated requirement.
  - Fix: On web, either open the Book of Proof HTML in its own window or iframe and print that, or hide the export. Base highlighting on utterance start and end events, not boundaries.

- **Verification comes too late. The Phase 0 build is compile-only (submit=false). Every native unknown is first checked on a device in the owner's 11-02 to 11-07 window: background TTS, the silent switch, the transparent backdrop, fonts, expo-audio and expo-speech sharing one session, and widget signing. Each fix cycle costs a 90-minute macOS build plus TestFlight processing. The plan starts the widget build only on day 4.**
  - Why: With 5 days of owner QA and 3-hour fix loops, any one native failure pushes the submission date, and widgets are the item most likely to fail.
  - Fix: Push a native-risk TestFlight build by day 3 with a hidden, __DEV__-gated diagnostics screen that exercises each API. Make the owner's App Group creation and widget signing day-1 actions. Try EAS's non-interactive App Store Connect API key credentials (the key is already referenced in eas.json) before asking for an interactive run.

- **Research claims are planned for the store listing. The plan positions 'MCII g≈0.34; implementation intentions d≈0.65' as Vela's answer 'for both App Review and listing copy'. The same research (Oettingen) finds that positive fantasy, which is what the chapters are, lowers effort.**
  - Why: Effect sizes next to 'manifestation' invite questions about substantiation and accuracy (2.3.1), and a critic can turn the citation against the core feature.
  - Fix: Use the research to shape the product (if-then plans, the Hard Day stage). Keep numbers and study names out of the store copy and review notes; describe the mechanic instead.


### Must add
- Show the signature payoff in session 1. Add an optional onboarding step, 'One thing you've already done toward this', saved as a dated 'did' proof. Chapter I then already weaves it in gold, and the first star is a real action (honest endowed progress). This puts the woven-proof mechanic in the user's first minute and the reviewer's, instead of the next day.
- Hand-tune Chapter I for each focus area and its top motifs. It is the emotional peak competitors win on ('the first story made me cry'), so it should not be just another fragment roll.
- A native-risk TestFlight spike by day 3 with a __DEV__-gated diagnostics screen. It should check: background and locked narration with the silent switch on, expo-audio and expo-speech sharing one session, the transparent-backdrop vs per-screen-backdrop decision, font rendering, and ExtensionStorage writes. The owner creates group.app.vela.manifest on day 1.
- Release-gate checks on the IPA in `ios-release.yml`: the 'ExtensionStorage' symbol (when widgets are in), the Info.plist (UIBackgroundModes only if verified, no generic microphone text, NSPhotoLibraryAddUsageDescription present), privacy-manifest reasons 1C8F.1/CA92.1 for both the app and the extension, and EXPO_PUBLIC_STILL unset.
- A migration that sets stage from proof count. It must handle orphaned open actions from rerolls and seed real v1 fixtures, including a reroll-heavy one. Also migrate `vela.ritual.v1` days into nightsShownUp; `pruneDays` keeps only 400 days, so lifetime totals need a counter.
- Chapter storage as an index plus one key per chapter, written outside ceremony animations.
- A one-ask-per-session arbiter covering notifications, AddWidget, the Plus nudge and the review prompt. Ask for notifications at bridge commitment, not after the first Star Birth.
- Cold-start routing: useLastNotificationResponse, with RootNavigator waiting for every store, plus cold-start deep-link checks in the simulator harness.
- A rule for when Plus lapses (all dreams readable; the user picks one active dream) and a localized, subordinate per-month price on the paywall.
- An accessibility pass in the PR gates: 375×667 iPhone SE captures, a responsive hero height, accessibility-size Dynamic Type, VoiceOver labels per star plus a list view of proofs, a fully static sky under Reduce Motion, and contrast measured on the lightest backdrop region.
- Voice ranking by identifier (premium > enhanced), the real voice name in the UI, and plain-text download instructions with no App-Prefs URL.
- A Lock Screen privacy setting (on by default) and `.privacySensitive()` on desire and proof text in widgets.
- Keywords trimmed to 100 characters or fewer for the new name, run through `scripts/check_metadata.py` before rendering captions.
- For the 4.3 defence, attach a 30–60s screen recording of the loop in App Store Connect's App Review attachment field: proof, then Star Birth, then the proof highlighted in Chapter II. Record it in the simulator harness with `xcrun simctl io recordVideo`. Add a background-audio note to the review notes.
- A content style lint for LLM tells, plus a read-aloud pass, as release-blocking content tests in addition to the golden matrix.
- After launch, App Store In-App Events for fresh-start dates (Sunday ledgers, the 1st of the month, New Year 'Begin a season'). They are free, appear in search, and need no binary change.


### Excluded ideas (do not build)
- Skia (@shopify/react-native-skia) for the sky: on web it needs a multi-MB CanvasKit wasm and LoadSkiaWeb, and we would maintain two renderers. react-native-svg + Reanimated cover the same visuals. This deliberately departs from the skill's 'Skia for custom drawing' advice because of the web-capture requirement.
- Lottie: third-party animation files would break the original-content rule, and the web build needs the extra dotlottie peer.
- expo-blur / Liquid Glass unstable-native-tabs: blur breaks headless web captures (as seen on Qilin), and the native-tabs API is unstable. Use a solid 92% tab bar instead.
- react-native-audio-api for generating sound on the device: it is a new native module with weaker web parity. Pre-rendered original loops played through expo-audio have already been tested (733 KB per minute).
- expo-widgets (JSX widgets): unproven in this portfolio. @bacons/apple-targets + SwiftUI is already proven by Scripture Mate, so keep expo-widgets only as a fallback if apple-targets breaks on SDK 57.
- Interactive App Intent widget buttons and lock-screen notification text-input proof: both skip the Star Birth peak and are more native work. Deep links into /evidence keep the ceremony and the honest sentence.
- Live Activity for the bridge window: deferred to 1.2. The evidence is weaker and vendor-sourced, and it adds native risk on top of widgets.
- Apple Foundation Models or any LLM, even on-device: it breaks the no-LLM rule, only works on iPhone 15 Pro and later, and the third-party RN bindings are early. Leave it as an owner decision for 1.3 at the earliest.
- Own-voice recording: deferred to 1.2. It needs the microphone permission, web recording parity is uncertain, and it overlaps Future You's 'say it in your own voice' positioning.
- Personal Voice API / AI voice cloning: Apple frames Personal Voice as being for assistive-communication apps, it is a crowded 4.3 zone, and cloning conflicts with the no-server rule.
- Lunar cadence, moon rituals, tarot, astrology, lucky numbers: Guideline 4.3(b) names fortune telling as saturated. The retention track's optional moon arc is overruled. Use calendar fresh starts (Sunday, the 1st, New Year) instead.
- Subliminals, binaural beats, Solfeggio frequencies, and a standalone sleep-sounds tab: crowded categories that drift away from the loop. The sound beds live only inside the chapter player.
- Specific-person / ex-recovery goals and an AI chat coach: crowded zones (Vix, Magnetic, Daya, Transcend), with ethical and 4.3 risk.
- Expanding the generic affirmation library (120→480, as proposed by the content track) and a swipe deck or 369 as the hero: these grow the supporting ritual and drift toward I am / Myla. Only proof-born 'Your lines' are added.
- Rotating generic quote or affirmation widgets: this is the I am / Motivation pattern and would invite another 4.3 rejection.
- Photos or AI-generated images of people, a 'meet your future self' photo swipe, and the phrase 'future self' anywhere in the UI or store copy (including the current subtitle): they draw diversity and 'AI slop' backlash and sit in a crowded framing.
- Rating laurels, '#1', user counts and testimonial screenshots: Vela has 0 ratings, so these would be fabricated and break guidelines 2.3.1 and 2.3.7. Revisit only once Vela genuinely has 4.7+ from 100+ ratings.
- Prices, 'free' or 'no weekly plans' in screenshots: guideline 2.3.7 and ASO advice. The free-and-unlimited promise goes in onboarding, the paywall, the description and the promo text.
- Weekly plans, credits, add-ons and free trials: they are the category's top 1-star trigger. Pricing stays at $4.99/mo, $29.99/yr and $69.99 lifetime.
- A hard 'overnight' lock on the next chapter: it would break the App Review path and frustrate users. A soft 'Read now / Save for my ritual time' gives anticipation without a wall.
- An on-device notification bandit: over-engineering for 1.1. Rotating 20 templates per slot without replacement gets most of the novelty benefit.
- The onboarding mood step: it is collected but never used, and dropping it keeps onboarding to 6 steps or fewer.
- A people-and-pronouns list and tap-to-edit story lines: they add substantial engine complexity. Candidates for 1.2 once the season engine is stable.
- Year of Proof (Wrapped-style) recap: planned for 1.2 in December, so 1.1 can ship by early November. The weekly ledger and monthly sky ship in 1.1.
- iCloud sync / CloudKit: needs native entitlements and sync conflict handling. A private file backup (export/import) meets the trust need with zero risk.
- Upgrading expo to 57.0.16: the native-skew risk is already proven (expo-store-review SceneGeometry). Stay on 57.0.9 and pin new modules to its bundled versions.
- App Preview video and Custom Product Pages before launch: both come after launch. Run Product Page Optimization tests (frame 1 vs the full-bleed sky) once impressions are meaningful.
- Alternate app icons as Plus themes: needs native config. The sky themes are token swaps only for now.
- Naming anything a 'proof wall/board', 'signs' or 'synchronicities', or calling the board a 'Wall': these terms belong to Stella and Magnetic. Use 'Your Sky', 'Proof Ledger' and 'Scenes'.


## 9. Research summaries

### competitors

Since January 2026 the AI-story manifestation niche has filled up quickly. Stella (4.72 stars, 5,346 ratings, released 2026-01-28, #100 in Health & Fitness) has prompted near-copies within months: Aya (4.80, 3,217 ratings, April 2026), Future You, Daya, Magnetic, Calyn, Already Done, Demi and Plasti. Almost all of them make you answer a long, personal questionnaire and then put the app behind a weekly paywall ($4.99–$9.99 a week), and several also sell credits or individual audios. In the most recent US reviews (pulled through Apple's review feed), 35% of Stella's reviews are 1–2 stars (156 of 441). By rough keyword count, 132 of those mention paying or price and 60 mention the invasive questions. Aya's rate is 46%. Vela's best defence is therefore what it already has: generous free use, everything kept on the phone, no account and no weekly plan. But the current screenshots and screens don't show any of this, and the app looks text-only and thin next to competitors.

What reviewers love is emotional realism built from personal details ("the first story made me cry"), stories that work as background listening (driving, gym, sleep), soft narration with music, home/lock-screen widgets, streaks, and recording affirmations in your own voice. What they keep asking for is loop/replay/playlist, longer stories, background playback, stories they can edit, correct pronunciation of names, and more inclusive imagery. Stella reviewers complain the images are "all rich white girls", and Moonly is losing ratings over "AI slop" (77 of 317 recent low-star reviews mention AI). Visually the category splits in two: pastel pink/lilac with stock photos of women in headphones (Stella, Aya, Future You, Daya, Calyn), and dark cosmic indigo or black-and-gold (Soul, Vix, Magnetic, Innertune). Vela's indigo and gold already sits in the second group, so it has to stand out through what it does, not its colours.

Most competitors now have a "proof wall" or "manifestation board", but these are passive logs of signs and outcomes. None of them links one daily action to proof that changes the next story. That gap is real and is exactly Vela's Future Memory loop, so new features should deepen it. Vela should not add anything from the crowded zones: "meet/hear your future self" with photo swipes, winning back a specific person or ex, subliminals and frequencies, tarot/moon/astrology (Apple's guideline 4.3(b) names fortune telling as saturated), AI coach chat, voice cloning, or "#1 app" laurels and testimonial screenshots. Shine is no longer a competitor: it was pulled from both stores by April 2023 after Headspace bought it.

Recommendations:
- 1. Rebuild the App Store screenshots around the loop and the free/private promise, roughly in this order: (1) a chapter page over its own generative night sky, headline like 'A story about your future, written on your phone'; (2) 'One small bridge to reality' (the bridge card); (3) 'Log what actually happened' (proof check-in); (4) 'Tomorrow's chapter remembers' (chapter 2 quoting the proof, highlighted); (5) 'Watch your constellation grow' (a rich star map); (6) widgets; (7) 'Unlimited listens. No account. No weekly plans.' Leave out laurels, '#1', testimonials, photos of people, the phrase 'future self', pink, and black-and-gold slides that resemble Magnetic.
- 2. Build an on-device generative art system (react-native-svg or Skia, seeded by dream ID): a distinct sky or chapter plate per dream, where the stars are the user's logged proofs. This adds visual richness without AI images or photos of people, avoiding the diversity and 'AI slop' backlash Stella and Moonly get.
- 3. Upgrade the chapter player: background audio with lock-screen controls, sleep timer, loop, 'play my arc', a Short (about 3 minutes) or Deep (6–8 minutes) length choice, original ambient beds, a voice picker that prefers enhanced/premium system voices, a 'how to say my name' field, optional people and pronouns, no auto-advance, and tap-to-edit a line with the engine remembering the edit.
- 4. Ship iOS widgets that serve the loop: 'Today's bridge' (tap to log proof), 'Constellation', and a lock-screen line widget. Widgets drove the 1M-rating incumbents, and no competitor has an action-and-proof widget.
- 5. Deepen the proof constellation as the hero: a per-dream star map with tappable stars (the proof sentence plus the chapter line it changed), a press-and-hold 'Seal the proof' ceremony with haptics, a weekly or monthly 'Arc replay' put together on the device, 'On this day' resurfacing, and designed share images of the constellation. Avoid 'proof wall/board' and 'signs/synchronicity' wording.
- 6. Link the Board to chapters: pinned photos become scene anchors in the next chapter and can be attached as proof photos; add a presentation mode with ambient sound. Reconsider the 3-card free cap (one or two free boards is a frequent 1-star complaint for vision-board apps), for example by making the board part of the one free dream.
- 7. Add on-device own-voice recording (expo-audio) for the bridge sentence or a favourite chapter line, played as a morning cue. Don't use voice cloning or Apple's Personal Voice API (Apple frames Personal Voice as mainly for assistive-communication apps).
- 8. Make the streak forgiving: show 'nights in your arc' with grace days, and never shame a reset to zero. Losing a streak is a proven 1-star trigger (I am, Gratitude).
- 9. Protect trust: keep onboarding at 6 steps or fewer with an explicit 'nothing leaves this phone' line; promise that everything a user made stays readable if Plus lapses; add a private export/backup (file or the user's own iCloud) and a 'Future Memory book' export; keep reminders precise and easy to switch off.
- 10. Keep pricing simple ($4.99/month, $29.99/year, $69.99 lifetime; no weekly plans, credits or add-ons) and say so on the paywall and in screenshots. Pricing is the category's top complaint and Vela's clearest edge over Stella ($6.99/week), Aya ($9.99/week plus per-audio fees) and Daya ($7.99/week).
- 11. Stay out of the crowded zones for 4.3 safety: no specific-person or ex-recovery goals, no subliminals or frequencies, no tarot, moon or astrology, no AI chat coach, no swipe affirmation deck or 369 as the hero, no 'meet your future self' photo swipes. Keep affirmations, 369, script and gratitude as supporting rituals that feed the action-and-proof loop.

### retention

Across the apps I looked at, the evidence for daily opens is strongest for surfaces that sit outside the app and show the user's own living state. The best example is home-screen and lock-screen widgets: Gratitude reported 25% higher retention among widget users. After iOS 14 widgets, DAU of the I am and Motivation apps rose 100% while Calm and Headspace stalled. Duolingo found that widget users stay active longer even after allowing for the fact that they were already more engaged. Finch's widget pet comes with D1/D7 retention of 54%/37%. Next come forgiving progress mechanics (Duolingo's Weekend Amulet test: +4% returned a week later; Apple's pause rings; Finch pets that cannot die). Then personal, well-timed reminders (Calm's reminder prompt: 40% opted in, and retention rose by the same amount seen in users who had found the setting themselves; Duolingo's rotating notification templates: +2% new-user retention). After those: a collectible growth metaphor (Opal has had 2M+ gem reveals; the endowed-progress study saw 34% vs 19% completion), recaps timed to "fresh start" dates, and Wrapped-style identity cards, which work more for acquisition than retention. Vela has almost none of this today. It has no widget and no Live Activity. Notifications are one or two fixed daily repeats with the same copy forever (lib/notifications.ts), including "the streak stays lit". Progress is a classic consecutive-day streak that resets to 0 (lib/streak.ts). The "constellation" is a row of 7 dots. There are no recaps, no share cards except on affirmations, and "Listen" is plain text-to-speech with no sound bed. Every mechanic below can be built with zero servers. expo-widgets has been stable since SDK 56, and Vela is on SDK 57, so widgets, interactive buttons on iOS 17+, timelines and locally started Live Activities need no backend. Local notifications can be rebuilt as a rolling queue under iOS's 64-pending cap. Ambient sound can be generated on the device, so it is original and has no licensing cost. Recaps and cards can be computed and rendered locally. The research also gives Vela a defensible core: pure positive fantasy lowers effort (Oettingen), while rehearsing the steps plus if-then plans improves goal attainment (MCII g=0.34, implementation intentions d=0.65). That is exactly Vela's bridge-and-proof loop. So expansion should make that loop visible everywhere (sky, widget, lock screen, recap, card) rather than add generic quote or affirmation surfaces, which would revive the 4.3 'too similar' risk. Most evidence is correlational or self-reported by companies or vendors; I mark this where it applies.

Recommendations:
- Ship a 'Living Sky' release next, before the 1 January 2027 fresh-start peak. It has four parts: (1) forgiving, cumulative progress that never resets, with weekly rhythm, automatic rest nights and a pause; (2) the constellation rebuilt as a collectible sky with a reveal ceremony and endowed progress (start at 2 of 9 stars); (3) expo-widgets: small chapter line, medium bridge with an 'I crossed it' button, large sky, plus lock-screen rectangular and circular; (4) a rolling 7-14 day queue of local notifications written from the user's own chapter, bridge and proof sentences. Everything is on-device and needs no new backend.
- Delete loss-aversion copy now: remove 'the streak stays lit' in C:\Users\Gain John\Downloads\solve_problem\vela\lib\notifications.ts and rework computeStreak in C:\Users\Gain John\Downloads\solve_problem\vela\lib\streak.ts into a never-resetting stars count plus a weekly rhythm. Move the notification permission ask from onboarding to right after the first chapter or proof (the Calm pattern: 40% opt-in).
- Prompt users to add the widget on the proof-success screen with an animated how-to (Duolingo's installs rose 'drastically' with one). Repeat the prompt only at arc completion. Pre-write a week of dated widget timeline entries whenever the app opens so it changes through the day without the app running.
- Second release, 'Night Ritual':
- A guided threshold session: breath, chapter, 45 seconds rehearsing the bridge, then an if-then plan (MCII g=0.34; implementation intentions d=0.65; process simulation beats outcome simulation).
- Ambient beds generated on the device with react-native-audio-api: brown noise, rain, drone. Original, no licensing.
- A 'sleep chapter' mode with timer and fade.
- Recording your own lines with expo-audio.
- An opt-in Live Activity for the committed bridge window.
Avoid the Personal Voice API.
- Third release, 'Proof Ledger', live by early December 2026:
- Sunday weekly ledger, gated at 2+ proofs.
- A monthly Night Sky on the 1st.
- A December 'Year of Proof' story with a locally computed manifester archetype.
- Identity share cards rendered on the device, desire hidden by default.
- Time capsule (seal a Future Memory for 30/90/365 days, then show then vs now).
Keep core recaps free; Strava's paywalled recap drew a backlash.
- Add an optional lunar cadence (new moon: name or renew a desire; full moon: proof review) and seasonal sky palettes, computed locally. Explicitly exclude horoscopes and astrology copy to stay clear of 4.3.
- Product guardrail for every new surface: it must show the user's own desire, chapter, bridge, proof or sky. No rotating generic quote or affirmation widgets, which is the I am / Motivation pattern. That keeps the expansion deepening the Future Memory loop and protects the 4.3 approval.
- Monetization split: keep the retention drivers free (one widget set, the sky, core recaps, one ambient bed, forgiving progress). Put extras behind Plus: more arcs and skies, extra beds and sleep-chapter lengths, more widget styles and sky themes, deeper pattern insights, and extra time-capsule slots.
- Measure without an SDK: stage the releases as separate versions and compare App Store Connect retention cohorts (opt-in users; confirm the exact metrics in the console). Submit a Featuring Nomination 2 weeks to 3 months before the widget / Live Activity release. Rebuild the App Store screenshots around the lock screen with bridge and stars, home-screen widgets, the sky reveal, the sleep player and a recap card.
- Optional, owner decision: try Apple's on-device Foundation Models (iOS 26, iPhone 15 Pro+) to weave proof sentences into chapters and notification copy more naturally, with the template engine as fallback. It keeps zero servers and zero cost but bends the 'no LLM' rule.

### screenshots

Vela's live listing is the weakest part of its funnel. The iTunes lookup API for id 6797328581 (fetched 2026-10-15) returns only 3 screenshots, 0 ratings, the name "Vela: Manifestation Journal" (not "Manifestation Stories"), subtitle "Future Self Visualization" and category Lifestyle. Among the 12 category leaders I pulled, sets run 5 to 10 frames (median about 8.5). Stella uses 5. The 3 live frames also have production defects. The phone UI is cropped on the right, so sentences run off the screen. It was captured at 381x825 and upscaled about 2.6x, so it looks soft. Frame 3 shows a gold CTA button with no label and the line "1 moments have shaped your arc". The eyebrow, subline and pill text (22-34px on a 1290 canvas) shrink to about 2-3pt in the 3-up search row, so they can't be read. Apple's own pages confirm the first 1-3 portrait frames are what search shows when there is no app preview. Older but consistent data from SplitMetrics (about 1,800 tests) and AppAgent/Phiture says only 9-15% of visitors swipe deep into a set. So frames 1-3 have to explain Vela's loop on their own. Competitor teardown: incumbents lead with social proof (Calm, Stella, Rise, Day One, Stoic), short 2-4-word benefit headlines, real device frames with UI pieces popping out of the frame, and a "peak" state (Finch's streak, Rise's numbers). Journal apps use a privacy frame. Vela has no ratings, so its proof has to come from the product's unique mechanic instead. The recommended 1.1 set has 9 frames plus an optional 10th. Frames 1-3 form a search-visible triptych: story, then one real step, then your proof writes chapter two. These are joined by a gold "constellation thread" and followed by a full-bleed proof-constellation peak frame. The supporting rituals sit at the back, which also keeps the 4.3 "distinctive loop" positioning App Review accepted. Several frames depend on 1.1 visuals that don't exist yet (a real constellation sky, a narration player with line highlighting). Under guidelines 2.3.1 and 2.3.3 they can only ship once those features are in the binary, so a fallback screen is given for each.

Recommendations:
- GLOBAL SYSTEM. Master canvas 1320x2868, also exported to 1206x2622 (Apple's listed required medium size), both uploaded. Background: a 'Vela night' gradient, #0E0C22 at the top through #1E1840 to #3A2A4F, with a warm gold horizon bloom (#E9B44C at about 18%, radial, lower third) and a sparse star field, so thumbnails read as dusk rather than black tiles. Shift each frame slightly warmer from 1 to 9 (night becoming dawn: the future becoming real). Headlines: one OFL serif at weight 600 (e.g., Newsreader or Fraunces, echoing the in-app Georgia story type), 136-150px, ivory #F6EFE3, one keyword in gold #E9B44C, at most 2 lines and 5 words per line, top-left anchored. Sublines: sans 52-56px at 70% ivory, at most 2 lines. No eyebrows, no pills under 40px. Real iPhone 17 Pro bezel from Apple Design Resources, 9:41 status bar, device bleeding off the bottom about 8% so the UI is bigger. In every frame, lift one hero UI component 1.2-1.3x out of the device with a gold-tinted soft glow (never a gray or black shadow). Copy bans: prices, 'free', '#1', ratings or user counts, competitor names, health or outcome guarantees. Use en-US spelling.
- FRAME 1 (search triptych, part 1 of 3: the story). Screen/state: story reader in a new 1.1 'narrating' state. Chapter title 'The Day the Dream Went Ordinary', the current sentence highlighted in gold, a mini player 'Listening · Chapter 1', and the user's own words visible in the text. Headline: 'Your future, written as a *story*.' Subline: 'A personal manifestation chapter from your own words, read aloud on your iPhone.' Treatment: centered device. Pop-out chip at top-left in quotes: "my own design studio, with clients who trust my eye", joined by a thin gold constellation thread to the highlighted sentence. The thread exits the right edge into frame 2. Fallback if line highlighting doesn't ship: current reader (screen 10) captured at 3x with the gold quote chip as overlay.
- FRAME 2 (triptych, part 2: the bridge). Screen/state: end of chapter showing the 'Bridge to reality' card ('Create one visible piece of work, however small, before consuming advice.') with 'Make it observable'. Headline: 'Then take one *real* step.' Subline: 'Every chapter ends with one small, observable action for today.' Treatment: device offset right. The bridge card is popped out 1.25x toward the left with the footsteps icon and a star node on the gold thread that came in from frame 1 and exits to frame 3.
- FRAME 3 (triptych, part 3: the unique mechanic, which is also the one App Review verified for 4.3). Screen/state: chapter 2 in the reader with the proof sentence woven into the story and highlighted ('There is proof behind this memory now: I sent my portfolio to two studios I admire.'), tagged 'Woven from your proof'. Headline: 'What you did writes *chapter two*.' Subline: 'Log one honest sentence. Vela weaves it into tomorrow's story.' Treatment: device centered. A popped-out proof card ('I did it · Sent my portfolio to two studios I admire.') with a gold line flowing into the highlighted sentence, so the triptych ends on the payoff.
- FRAME 4 (the peak, full-bleed with no device; the set's visual signature). Screen/state: a new 1.1 full-screen proof constellation sky with 6-9 gold stars joined by lines. One star is tapped and shows 'Day 3 · I moved · Sent my portfolio…'. Headline: 'Every step becomes a *star*.' Subline: 'Your proof constellation grows with each arc. No scores, no streak shame.' Treatment: the frameless screenshot fills the canvas under the headline, like Finch and I am do. This is also the best variant to test against frame 1 in Product Page Optimization. Fallback until it ships: the evidence-success screen 'A point of proof' (screen 16) in a device.
- FRAME 5 (the main objection to the incumbent, without naming it). Screen/state: the full narration player (1.1: chapter sky art, scrubber, voice and speed controls) or the current reader with the Listen pill. Headline: 'Listen as often as you *like*.' Subline: 'No daily listening limit on your story. Read or play it anytime, even offline.' Treatment: device tilted 6°. The play control is popped out with a soft gold glow. Don't show lock-screen Now Playing unless 1.1 actually implements it.
- FRAME 6 (personalization, a category convention used by Stella and Soul). Screen/state: intake filled. 'Career' selected, words 'my own design studio, with clients who trust my eye', feeling 'proud' selected. Headline: 'Start with what you're *calling in*.' Subline: 'Pick a focus, say it in your words, name the feeling.' Treatment: device offset left. The six focus chips (Love, Abundance, Career, Health, Confidence, Peace) float out of the frame on the right.
- FRAME 7 (supporting rituals, deliberately after the loop to keep the 4.3 positioning). Screen/state: two overlapping devices. Front: affirmation card 'The imposter voice retired; the craftsman stayed.' Back: the 3·6·9 journal with a filled line and progress. Headline: 'Rituals that serve your *story*.' Subline: 'Affirmations, 3·6·9, scripting and gratitude, tuned to your focus.'
- FRAME 8 (vision board). Screen/state: the board filled with 6 cards (mixed photos and written goals). Use only original or properly licensed images in the seed data. Headline: 'Pin the life you're *building*.' Subline: 'A private vision board that lives beside your proof.' Treatment: centered device, one photo card popped out. Optional swap if 1.1 adds a 'Today's bridge' home-screen widget: a widget/lock-screen frame here, as I am, Soul, Mantra, Stoic and Rise all have. Only show it if it ships (2.3.1).
- FRAME 9 (trust close, the peak-end rule; Day One and Stoic both use a privacy frame). Screen/state: Today home in a rich state ('Good evening, Maya.', Career · chapter 3, constellation snippet with 5 stars, 'Weave chapter 4'). Headline: 'Private by *design*.' Subline: 'No account. No servers. What you write stays on your iPhone.' Treatment: three badges under the device, at least 44px text: 'No account', 'Works offline', 'Data Not Collected'. The last one matches the published App Privacy label, so it's verifiable.
- OPTIONAL FRAME 10 (Plus value, no prices). Screen/state: Stories list with 3 arcs (Career, Love, Health), each with a chapter count and a mini constellation. Headline: 'Hold more than one *dream*.' Subline: 'Run separate arcs side by side with Vela Plus.'
- PRODUCTION. Don't upscale. Run store/shots/audit.mjs with W=440 H=956 SCALE=3 (1320x2868 native) for drafts. For the final set, capture from the real iOS build through the existing GitHub Actions macOS/Appium harness so the iOS typography and status bar are correct. Seed one consistent demo persona (Maya, career arc, chapter 3, 5-7 proofs). Fix in-app before capture: the '1 moments' pluralization, the unlabeled 'Weave chapter 2' button at capture time, and right-edge overflow. Check every frame at about 125pt width on a real phone before upload.
- SEARCH TRIPTYCH CHECK. Frames 1-3 must read as one sentence at thumbnail size: 'Your future, written as a story.', then 'Then take one real step.', then 'What you did writes chapter two.' Each must still work alone. The gold thread is decoration, not a dependency (panorama evidence is weak).
- APP PREVIEW (phase 2). A 15-20 second, screen-capture-only preview (2.3.4) that opens on the strongest 3 seconds: a star lighting up while chapter 2's proof sentence highlights. Then: words typed, chapter appears, bridge, proof sentence, star, woven chapter. Use text overlays because previews autoplay muted. Note that with a preview, search shows the preview plus the first two screenshots, so frames 1-2 must still carry the story.
- CUSTOM PRODUCT PAGES (zero cost). Keep the default page loop-first. Create keyword-assigned CPPs for the existing keywords: '369' leading with the 3·6·9 frame, 'vision board' leading with the board, 'affirmations' leading with rituals, 'scripting' leading with the script journal. Each CPP still includes frames 2-3 (the loop) by the third slot. Check the keyword-assignment UI in App Store Connect first; it's reported by ASO vendors and I haven't confirmed it on Apple's own pages.
- TESTING. Once impressions are meaningful, use Product Page Optimization (up to 3 treatments, up to 90 days, screenshot-only tests don't need a new binary). Test 1: frame 1 as the story reader vs the full-bleed constellation. Test 2: gold thread on vs off. Test 3, only after real ratings exist: add a rating laurel to frame 1. Don't apply a treatment before 90% confidence.
- METADATA ALIGNMENT. Settle the 1.1 name and subtitle (live: 'Vela: Manifestation Journal' / 'Future Self Visualization'; planned: 'Manifestation Stories') before rendering captions, so the title, subtitle, keywords and frame 1-3 headlines share the words manifest, story and future. Rewrite 'What's New' for 1.1 to list the new features specifically (2.3.12).

### code

Vela is a small, clean codebase: about 8.7k lines, 18 route files and 6 React contexts, with no shared component layer at all. Everything lives on the device in AsyncStorage. Today I ran bun test (67 tests pass, 943 expect() calls, 9 files) and `tsc --noEmit` (exit 0). The Future Memory loop is real in code but thin. The engine has 118 original fragments (2,786 words). The arrival and living pools have only 6 fragments per focus area, and there are 10 titles. Each focus area has just 3 bridge actions, picked by hash with no repeat guard: in a 300-step sample, 52 chapter changes repeated the previous action exactly. Proof is added as one paragraph after the story's closing beat, and only the newest proof is used. Each new chapter replaces the old one (no chapter history), and the onboarding "mood" answer is stored but never used. Two things must be fixed before any visual work: (a) the contexts read state from a stale snapshot, so two writes in one handler (for example save proof, then weave the next chapter) will silently lose data; (b) there are no UI primitives, so 15 screens each have their own StyleSheet and the cta/dock/close/header styles are copied up to 10 times. Screens also use 13 font sizes outside the 4-size scale and have 0 accessibilityLabels. The screenshot problem is mostly in the pipeline. The live store shots upscale 381x825 web captures about 2.6x into 1290x2796 frames, and the web build draws text in Times and Segoe UI while iOS uses Georgia and SF. The existing CDP harness can already capture at 430x932 @3x (exactly 1290x2796), and bundled fonts would make web and iOS look the same. On SDK 57 (expo 57.0.9 / expo-modules-core 57.0.8), the safe, high-impact additions are expo-linear-gradient 57.0.1, expo-font plus @expo-google-fonts, expo-audio 57.0.3, react-native-view-shot 5.1.0 and expo-sharing 57.0.8. I tested the audio path: numpy/scipy plus ffmpeg 8.1.2 on PATH produced an original 60-second loop as a 733 KB AAC file. Home-screen widgets are feasible using the Scripture Mate pattern found locally, but they carry the most signing and native-build risk. Skia and Lottie are not worth it for v2. Releases are local EAS builds on free macos-26 GitHub runners (the repo is public). Every push to review-rebuild starts a build, and the build number must be raised by hand from 4.

Recommendations:
- STEP 0, one agent, serial, blocking. Owns package.json, package-lock.json and app.json only. (a) Add exact pins (no ~): expo-linear-gradient 57.0.1, expo-font 57.0.1 (made direct), one or two @expo-google-fonts families (e.g. fraunces or newsreader 0.4.1 for serif display/story, inter 0.4.2 for UI so web screenshots match iOS), expo-audio 57.0.3, react-native-view-shot 5.1.0, expo-sharing 57.0.8; optionally expo-blur 57.0.2. Consider moving expo to Formline's proven 57.0.16 in the same commit. (b) app.json: NSPhotoLibraryAddUsageDescription, UIBackgroundModes audio, and later ios.appleTeamId 6RMFGXBQ82 plus the App Group for widgets. (c) Run npm ci, bun test, tsc, web start, then ONE workflow_dispatch release build (submit=false) on elevate-1.1 to catch native compile skew (the expo-store-review SceneGeometry trap) before any screen work.
- STEP 1a, one agent (design-system owner). Extend constants/theme.ts without renaming existing tokens, so untouched screens still compile:
- `fonts` (display, serif, sans families)
- a `serifType` scale that replaces the 13 ad-hoc sizes
- `gradients` (night, aurora, gold sheen stop arrays)
- `motion` (durations/easing; twinkle/drift periods)
- `glow` levels and z-layers
Then build components/ui/ with a barrel index.ts:
- Screen: safe area + NightSky background + scroll/keyboard handling + header and dock slots + `still` flag
- NightSky: seeded Starfield (mulberry32 from lib/story/rng) of SVG/Animated dots with Reanimated 4 CSS-keyframe twinkle, plus Aurora as LinearGradient/SVG RadialGradient layers; variants calm/reveal/dawn
- GlowCard: pressable, scale feedback, tinted border, optional gold/aurora glow and sheen
- PrimaryButton / SecondaryButton / GhostButton: 52-56pt, disabled state, haptics
- IconButton: 44pt, required accessibilityLabel
- Header: back/close/title/right, using safeBack
- Dock: bottom CTA with gradient scrim
- SectionHeader and Eyebrow
- Chip / ChipGroup
- TextField: serif or sans variant
- Text: T variant='display|title|body|caption|serifDisplay|serifBody'
- Halo: glowing icon disc
- ProgressDots
- ConfirmSheet: replaces Alert.alert and works on web
- Toast
Add a __DEV__-only /dev/kitchen-sink route for visual QA. Freeze the API after review.
- STEP 1b, in parallel, data/engine agent. Owns contexts/StoryContext.tsx, lib/story/*, lib/futureMemory.ts and their tests.
- Reducer/functional updates plus a serialized persist queue (fixes the stale-snapshot write loss).
- Schema `vela.stories.v2` with a per-intent chapters[] archive, migrated from v1 by keeping the current story as chapter N.
- Selectors: chaptersForIntent, proofsForIntent, activeIntentId (user-selectable, replacing intents[0]).
- Engine v2: a dedicated 'proof' beat after arrival with did/moved/learned templates that can reference the last 1-3 proofs; mood-aware opening/closing; at least double the arrival/living/title pools with original writing.
- Bridge actions: 8-10 per focus with an avoid-set, plus follow-ups keyed to the last proof kind.
- Split 'Weave next chapter' (requires a new proof) from 'Re-render this chapter' (no chapter++).
- Fix UTC vs local dateKey and the constellation window semantics. All covered by bun tests.
- STEP 1c, in parallel, audio agent. Owns scripts/gen_soundscapes.py, assets/audio/, lib/audio/* and tests.
- Generate 4 original 90-120 s loops with numpy/scipy: whole-cycle partials plus FFT-circular noise; night, rain-on-glass, dawn birds-free shimmer, hearth crackle via filtered impulses.
- Encode with ffmpeg `-c:a aac -b:a 96k -movflags +faststart` (about 0.73 MB/min measured).
- lib/audio/narration.ts: pure paragraph segmentation and queue state, with onBoundary {charIndex, charLength} mapped to paragraph/word indices.
- useNarration/useSoundscape hooks: expo-speech per-paragraph queue, Enhanced-voice preference, rate options; expo-audio looping bed with ducking.
- Call `setAudioModeAsync({ playsInSilentMode: true })` at startup; verify on a device that narration is no longer silent on muted phones and that the loop has no AAC gap.
- STEP 1d, in parallel, optional, widget agent. Owns targets/vela-widget/ and lib/widgets/.
- Copy the Scripture Mate pattern (rork-scripture-mate/expo/targets/verse-widget, lib/widgetBridge.ts, services/studyWidgets.ts): versioned JSON snapshot {chapterTitle, bridgeText, constellation[7], streak, intentId} written via ExtensionStorage('group.app.vela.manifest') behind requireOptionalNativeModule, then reloadWidget.
- SwiftUI systemSmall/Medium plus accessoryRectangular, with widgetURL vela://evidence/<intentId>.
- The 15.1 podspec patch is probably unnecessary on SDK 57 (Expo floor 16.4); confirm after prebuild.
- Plan for one interactive EAS signing run by the owner for the new extension bundle id. Ship v2 without widgets if this blocks.
- STEP 2, parallel screen agents. Start only after the Step 1a primitives and Step 1b data API are frozen. Each agent owns disjoint files and imports components/ui only:
- A: app/onboarding.tsx (NightSky reveal, back navigation, mood used downstream, schedule reminders on the ritual step)
- B: app/(tabs)/index.tsx + components/feature/{ProofConstellation (SVG stars joined by lines, tap for the proof sentence), BridgeCard, ArcSwitcher}
- C: app/story/[id].tsx + app/story/new.tsx + components/feature/{NarrationPlayer, SoundscapePicker} (karaoke highlight, scrimmed dock, starfield reveal peak)
- D: app/evidence/[intentId].tsx + components/feature/ShareCard + lib/share/ (safeBack, fix the double-lit star, a celebratory peak)
- E: app/(tabs)/stories.tsx + new app/arc/[intentId].tsx (Memory Book: chapter timeline with woven proofs)
- F: app/(tabs)/journal.tsx + app/journal/* (prompts seeded from the active desire; past-page detail)
- G: app/(tabs)/board.tsx + app/affirmation.tsx + app/affirmations.tsx (captions, link cards to an arc, ConfirmSheet)
- H: app/paywall.tsx + app/settings.tsx (real Plus value, e.g. multiple arcs, all soundscapes, Memory Book export/share themes; drop the unbacked 'journal templates' claim; name/ritual/reminder-time editing)
- I: app/(tabs)/_layout.tsx (blurred or Liquid Glass tab bar).
Keep every existing testID and add one for each new control.
- Keep the 4.3-safe framing in every addition. Each new feature should visibly feed, show or replay the Future Memory loop: chapter archive, proof beat, bridge reminders and widget, proof share cards, narrated chapter with a soundscape bed. Avoid standalone generic surfaces (a sleep-sounds tab, a quote feed, a horoscope-style daily card) that would make Vela look like other manifestation apps again. Update store/REVIEW_RESPONSE_4_3.md and the review path to match.
- STEP 3, screenshots and release.
- Commit store/shots/{audit.mjs, cdp.mjs} under scripts/shots/.
- Add a web `still` mode (URL flag or EXPO_PUBLIC_SHOTS): freeze NightSky, no blur, fixed clock/greeting, seed localStorage with a curated multi-chapter arc and proofs, real configured prices on the paywall only in this mode.
- Capture with W=430 H=932 SCALE=3 to get native 1290x2796.
- Make @resvg/resvg-js a devDependency (drop the ../../formline import) and render 6-8 frames using the bundled display font, plus composited widget and share-card frames.
- Fix e2e/walkthrough.mjs (`~ritual-story` to `~future-memory-card`, add the evidence-to-weave steps).
- Bump app.json to 1.1.0 / buildNumber '5' (manual: appVersionSource local, autoIncrement false), merge elevate-1.1 into review-rebuild to trigger the macos-26 build, then dispatch with submit=true.

### visual-audit

I viewed all 30 audit captures, the 5 contact sheets, the 3 live App Store screenshots and the app icon, and read every file in app/ plus constants/theme.ts. In this report, [audit] means C:\Users\GAINJO~1\AppData\Local\Temp\claude\C--Users-Gain-John-Downloads-solve-problem\f6853cbe-5ed2-4f58-8cba-218452638bb6\scratchpad\vela-audit.

Vela looks limited mainly because it has no visual layer at all. Every screen is a flat #0B0A18 background with the same rounded indigo cards. react-native-svg is a dependency but no file imports it. The app has no gradients, images or custom fonts. The serif is whatever the platform supplies: Times New Roman on the web build that the store shots are taken from, Georgia on iOS. The best brand asset, the sail-and-star app icon (Vela is the constellation of the Sails), never appears inside the app. The welcome screen uses lucide's generic Sparkles glyph instead.

The feature that sets Vela apart, the proof constellation, is drawn as a row of 7 dots with a "1 moments" grammar bug. The peak moment (saving a proof) is a stock check-circle card. At the story's end the upsell outranks the loop's own next step: "See Plus" is a filled gold button while "Make it observable" is a text link.

The 60/30/10 color rule is broken in practice. Gold appears in about 7 places on one Today viewport, and every selected state turns a muddy brown. The theme promises 4 font sizes but the app uses 15. The live App Store screenshots are blurry, crop the UI mid-word, show an unlabeled gold bar, and repeat the "1 moments" bug.

The proposed Visual System v2 rebrands Vela as a "star atlas / celestial navigation" product. It has five parts:
- a procedural night sky seeded from the user's data
- faint star-chart line work
- a loop color code: gold = the future chapter, violet = the bridge, warm starlight = proof
- the type pairing Newsreader + Instrument Sans (both OFL)
- a set of named signature moments (First Light, Charting, The Weave, Star Birth, Named Sky)

All of it is built from SVG and Reanimated and renders on react-native-web. It is also distinct from Stella, whose look is a light pink/lavender gradient with an iridescent orb. That matters for Guideline 4.3. This was a research-only pass and I modified no repo files.

Recommendations:
- VISUAL SYSTEM v2: BACKGROUND (build first, it touches every screen). Add components/SkyBackdrop.tsx, mounted once in app/_layout.tsx behind the Stack and Tabs (set contentStyle/sceneStyle background to 'transparent'). It has 4 layers, all react-native-svg (works on react-native-web):
- L0: a vertical LinearGradient from sky800 #110F2A at the top to sky950 #05040D at the bottom, plus a horizon RadialGradient at 15–30% alpha (night: violet #2A2160; morning-ritual variant: dawn #3A2147 to a hint of #F2A27C). The variant is picked from the user's ritual and daypart(), which already exists in index.tsx.
- L1: a seeded starfield of about 120–160 Circles in 3 radii (0.6/1.0/1.6) and 3 opacities. Generate it with a mulberry32 PRNG seeded from profile name + createdAt so every user's sky is unique and stable. Memoize it as one static Svg.
- L2: star-chart line-work at 5–7% alpha: 3 declination arcs, 4 meridian lines and tick marks along one edge. This is what separates Vela from 'generic galaxy'.
- L3: two soft nebula RadialGradients (violet #A897FF and teal #6FD3C1 at 8–10%, stopOpacity fading to 0) that drift ±16px over 24s.
- Twinkle only about 10 stars, each wrapped in an Animated.View whose opacity loops (more reliable on web than animating SVG props).
- Parallax: L1/L2/L3 shift at 0.15/0.3/0.5 of scroll offset via useAnimatedScrollHandler.
- Do not use expo-blur or Skia: Skia on web needs a large CanvasKit wasm download.
- VISUAL SYSTEM v2: COLOR TOKENS (replace constants/theme.ts colors; keep bg #0B0A18 for continuity).
- Sky (60%): sky950 #05040D, sky900 #0B0A18, sky800 #110F2A, sky700 #19163A (card base; use at 72% alpha over the sky), sky600 #241F52 (raised/pressed).
- Starlight text (30%), one hue, 4 tiers: ink100 rgba(246,242,255,1), ink80 0.80, ink64 0.64, ink48 0.48. ink48 is the floor on the sky (about 4.6:1); use ink56 or above on cards (about 5.7:1). Delete the 0.38 tier.
- Loop semantics (10%): FUTURE gold500 #E9B44C (the one filled CTA per viewport), gold300 #F5D58E (numerals, user's words, selected borders), goldEngrave rgba(233,180,76,0.24) (hairlines and plate corners), onGold #1E1503. BRIDGE violet400 #A897FF, violetWash rgba(168,151,255,0.10). PROOF star #FFF3D6, starGlow rgba(255,236,190,0.35).
- Lines: hairline rgba(214,206,255,0.10), chartLine rgba(214,206,255,0.06). Danger: #E8938F, destructive actions only.
- Rules: never put a gold wash on indigo (it turns brown); a selected state = sky700 surface + 1.5px gold300 border + gold icon + an 18px check badge; shadows tinted sky950 at 60%, never grey.
- VISUAL SYSTEM v2: TYPE PAIRING (2 families, both SIL OFL on Google Fonts). Load them via expo-font (already in node_modules at 57.0.1) with @expo-google-fonts packages, or bundle the TTFs in assets/fonts.

SERIF: Newsreader (Production Type; built for long-form on-screen reading; true italics) is the voice of the future:
- Display 34/40 Light 300, tracking -0.3: wordmark, chapter titles, affirmation, success.
- Title 22/28 Regular 400: screen and card titles.
- Reading 19/30 Regular 400: story body.
- Italic 400 in gold300 for the user's own words and for writing-input placeholders.

SANS: Instrument Sans is the UI voice:
- UI 16/24 Medium 500.
- Eyebrow 12/16 SemiBold 600, uppercase, +1.4 tracking.
- tabular-nums for streak, proof and chapter counts.

That is 5 sizes total (34/22/19/16/12) and 2 weights per family, enforced by <Display>/<Title>/<Reading>/<UI>/<Eyebrow> components so screens can't add sizes. Alternative with more personality: Fraunces (72pt Soft cut) for all serif roles + Instrument Sans. Don't use Georgia or the generic 'serif' fallback anywhere; it renders as Times New Roman on the screenshot build.
- VISUAL SYSTEM v2: CARD MATERIALS (3 tiers only).
- (1) OPEN SKY: no container. Story text, affirmations and the constellation sit directly on the sky.
- (2) VELLUM: sky700 at 72% alpha, a 1px hairline border, a 1px top-edge highlight rgba(255,255,255,0.06), radius 20, padding 24 (fixes today's 16-vs-24 inconsistency). Use for all standard cards.
- (3) GILDED PLATE: for the hero 'Tonight's chapter' card and story covers only. Base sky800 → sky700 gradient, a 1px goldEngrave border drawn as an SVG Rect with a gradient stroke (bright at top-left, fading out), 4 small L-shaped plate-corner ticks in gold300, and an embedded mini constellation thumbnail.

Buttons: primary = gold500 pill, 56px, with a 1px inner top highlight rgba(255,255,255,0.35) and a gold glow (radius 16, 0.35). Secondary = transparent with a 1px gold300 border. Tertiary = ink80 text. Bridge CTAs are filled violet400 with sky950 text, so the loop's action is never a mere text link.
- VISUAL SYSTEM v2: ICONOGRAPHY AND ILLUSTRATION (no paid assets).
- Keep lucide only for system chrome (back, close, settings, tabs) at a consistent 1.75 stroke.
- Replace brand-moment icons with custom SVGs in components/glyphs: VelaMark (the app icon's sail + 4-point star, redrawn as line-art), StarProof (4-point star with halo), Bridge (a heading arrow over a horizon line, instead of the 'footprints' fitness glyph), ChapterNumeral (Roman numeral set in Newsreader).
- Give the 6 focus areas 'signs': original 3–5-star mini constellations drawn as SVG polyline + circles. Love = a binary pair, Abundance = a cluster, Career = an ascending line, Health = a pulse arc, Confidence = an upright spire, Peace = a gentle arc. They replace heart/gem/briefcase in onboarding, intake, story tags and covers.
- Story covers are generative plates: seeded starfield + the area sign + chapter numeral + the user's proof stars.
- Use single-stroke engraved vignettes (sail, horizon, window, open door), hand-authored as SVG paths in gold300 at 60%, for empty states and the journal.
- Draw the real Vela constellation shape (γ, δ, λ, κ, μ, φ, ψ: about 8 hand-placed points) as the brand's master pattern.
- VISUAL SYSTEM v2: MOTION LANGUAGE (Reanimated 4; check useReducedMotion() and fall back to plain crossfades).
- Durations: tap 120ms, state change 220ms, enter 420ms, reveal 900ms, ceremony 1800–2600ms.
- Easing: 'drift' = Easing.bezier(0.22,1,0.36,1) for all entrances; presses use spring {damping:18, stiffness:160} with scale 0.97 and a brighter highlight. Overshoot is allowed only on Star Birth.
- Ambient: twinkle opacity 0.35↔1 over 2.4–5.6s random loops; nebula drift 24s; parallax on scroll.
- Story reveal: lines 'ink in' with opacity plus a 6px rise, staggered 120ms per line rather than 650ms per paragraph.
- Line-drawing: animate strokeDashoffset on SVG Paths with useAnimatedProps on native. On web, verify it; if it's flaky, fall back to an opacity-reveal of segments.
- Pair every peak with expo-haptics: selection on picks, light on step, success on proof.
- SIGNATURE MOMENTS to design and build, in priority order:
- (1) STAR BIRTH: on proof save, the note card condenses into a starlight point that arcs to its place in the Today constellation, a line draws from the previous star, a success haptic fires, and the caption reads 'Proof 3 · charted'. This replaces the check-circle card in evidence/[intentId].tsx.
- (2) LIVING CONSTELLATION HERO: Today's top 320px is the user's sky with their proof stars (position seeded by proof id, brightness by kind) behind the greeting. This replaces the 7-dot row and fixes the '1 moments' copy.
- (3) THE WEAVE: a 2–3s interstitial before every new chapter, including the first after intake: the user's words rise, scatter into stars, lines connect and the chapter numeral resolves. On-device, honest anticipation, not fake loading.
- (4) READING BY STARLIGHT: the reader puts text on the sky, sets the user's words in gold italic, adds a bottom scrim and a horizon progress line, and during Listen highlights the current sentence using expo-speech onBoundary.
- (5) FIRST LIGHT + CHARTING ONBOARDING: the sky fades in and the Vela sail draws itself on welcome. The 6 progress dots become 6 stars that connect into the sail by the last step, and each chosen focus area places its sign in the header sky.
- (6) NAMED SKY: after 7 proofs the constellation closes and is named from the desire ('The Studio, charted by Maya'), with a shareable plate (Spotify's 'vanity mirror' idea: celebrate who the user is). Exporting the plate needs react-native-view-shot, which is free; check its web support first.
- (7) LOG SEALED: a closure plate on Today after the day's loop (date · Chapter II · 3 proofs · next ritual 21:00).
- SCREEN-BY-SCREEN v2 priorities, beyond the moments above:
- Today: sky hero → gilded 'Tonight's chapter' plate → violet bridge card → compact 2-up rituals → log-sealed state.
- Stories: a star atlas of gilded plates with generative covers, chapter and proof counts, plus dashed ghost plates ('a second dream needs its own sky').
- Journal: three ritual cards with vignettes. Script becomes a ruled logbook page with a date and chapter header. 3·6·9 becomes 18 stars in 3/6/9 rows that light per repetition. Gratitude becomes 3 stars that brighten as each line is written.
- Board: photos mounted as plates with gold corner mounts; the empty state shows 3 ghost frames with a sail vignette instead of a green icon circle.
- Affirmation: full-bleed sky, Display serif, the VelaMark above it; 'carry' sends the line up as a faint star.
- Paywall: the user's sky with ghost constellations for future dreams; plan plates with price and per-month equivalent; the free-forever promise as an engraved starlight banner.
- Settings: real switches, the ritual time shown as a value, a 'Charted on this device' privacy badge.
- Story end: the soft-Plus nudge becomes a quiet text row or moves to after the first proof, so it never outranks 'Make it observable'.
- QUICK FIXES to ship even before v2:
- '1 moments' pluralization in app/(tabs)/index.tsx.
- Remove numberOfLines={2} truncation on the onboarding focus cards, or shorten the invitations.
- Raise textFaint from 0.38 to at least 0.48.
- Drop fontWeight 600 from the serif inputs in story/new.tsx and journal/method369.tsx; use italic placeholders.
- Add a bottom gradient scrim behind the story Listen dock.
- Make 'Make it observable' a filled primary CTA and demote 'See Plus'.
- Stop using accentSoft fills for selected states.
- Set outlineStyle:'none' plus a branded focus border on web TextInputs.
- Check the tab-bar label clipping on web.
- APP STORE SCREENSHOTS v2 (after the sky, constellation and reader land). Capture with store/shots/audit.mjs using SCALE=3 at 430x932 → 1290x2796, full-bleed with no cropping bezel, captions in Newsreader/Instrument Sans on the same procedural sky. 6 frames that tell the loop:
- (1) 'Your future, written as a memory': reader with the gold-italic user words.
- (2) 'One small bridge to today': bridge card.
- (3) 'Leave proof. Watch it become a star.': Star Birth mid-flight.
- (4) 'Your constellation grows with every proof': Today sky hero.
- (5) 'Every chapter remembers what really happened': chapter II referencing the proof.
- (6) 'Private. On-device. Unlimited listens.': VelaMark + sky.

Use realistic seeded demo data with 4–7 proofs so the constellation looks alive. Never show a single-proof state or the old dot row.
- IMPLEMENTATION AND GUARDRAILS:
- Create components/ with SkyBackdrop, ChartGrid, Constellation, GildedPlate, VellumCard, VelaMark, AreaSign, PrimaryButton, BridgeButton and the Text components. Move all screens onto them; today every screen restyles its own cards.
- New dependencies: the font packages only. expo-font is already present, and react-native-svg is installed but unused. expo-linear-gradient is optional because SVG gradients suffice. Avoid Skia and expo-blur for web weight and cross-platform parity.
- Performance: the static sky is one memoized Svg; animate at most about 10 twinkling Views plus whichever moment is active.
- Keep everything original: no stock nebula photos, no copied fonts, no AI images needed.
- 4.3 rule for every new visual: it must either show the user's own loop data (chapters, bridges, proofs) or belong to the Vela/sail/star-atlas world. No orbs, no pink or lavender gradients (Stella), no generic quote-card feeds, no zodiac/tarot imagery.

### ux-audit

Vela's Future Memory loop (chapter → bridge → proof → next chapter) is a strong, distinctive idea, but the build is thin in exactly the places that make it distinctive. That is the main reason it feels "limited". The arc keeps no memory of itself: each new chapter overwrites the last, so past chapters can't be re-read and past proofs have no screen of their own. The "proof woven into the next chapter" mechanic is one fixed sentence with a visible double-period glitch. It only ever uses the latest proof, re-weaves it into later chapters, and the unlabeled refresh icon in the reader moves the chapter number forward with no proof at all. Nothing brings a user back tomorrow. Onboarding asks "When do we meet?" but never schedules a reminder (reminders exist only behind a Settings row, at fixed 8:00/21:00 with generic copy). Chapter 2 can also be opened right away, which contradicts the success screen's "Tomorrow's chapter will remember it". The main reading moment is plain serif text fading in on a flat background, read by the system voice. The Listen pill sits over the text, and the bridge card and a Plus upsell appear before the story has finished revealing. The app is named after a constellation and promises a "proof constellation", yet it has no sky: react-native-svg is installed but no screen uses it, and the constellation is 7 grey dots. The counts are also wrong: "1 moments", 2 stars lit on the success card against 1 on Today, and a "Seven days" caption that isn't about days. Supporting features don't connect to the loop: the Board is empty with blank photo captions, journal entries can't be opened, affirmations are a generic library, and the Stories tab is a whole tab for one card. A paying user hits a regression: Today only shows intents[0], so adding a second dream hides the first arc and its proofs. The submitted App Store screenshots are clipped mid-sentence and show the "1 moments" bug. The expansions below deepen the loop rather than add generic manifestation features: an Arc timeline, real proof weaving, an overnight-weave return loop, a sky-based visual system with a living Vela constellation, choosable bridges, and richer proof capture feeding the Board and Journal. They are paired with a P0 bundle of small fixes.

Recommendations:
- P0 ship-now fix bundle (about 1 day, mostly visible bugs at the core moment). Problem: glitches undercut trust at the peak and appear in store screenshots. Solution: normalize evidence text in lib/futureMemory.ts evidenceBridge (fixes the '..' and capitalization); pluralize '1 moments' (app/(tabs)/index.tsx:129); fix the success-card over-count `points.length + 1` (app/evidence/[intentId].tsx:126); use local date keys in futureMemory.dateKey; change the reader refresh icon to re-render the same chapter instead of calling regenerate() (app/story/[id].tsx:105-138); show 'Chapter N' in the reader header; add a gradient scrim behind the Listen pill; delay the bridge card until after the last paragraph; remove 'All journal templates, forever' from the paywall. Screens: story reader, evidence, Today, paywall. Expected impact: removes the visible defects in the core loop and stops chapter numbers moving forward without proof.
- 1. The Arc: keep every chapter and give the loop a home (replaces the Stories tab). Problem: chapters are overwritten and proofs can't be revisited, so the app feels like one story. Solution: stop filtering old stories in StoryContext persist; new Arc tab with a vertical timeline per dream (cover art, chapter cards, bridge and proof nodes with kind icon, sentence and optional photo); tap to re-read any chapter; prev/next in the reader; arc header stats (chapters · proofs · days); a 'Previously in your arc' recap card opens each chapter; visible '…' menu for release, rename and archive. Screens: Stories → Arc, story reader, Today. Expected impact: the biggest jump in perceived depth; content builds up and creates switching cost; makes multi-arc Plus meaningful; strongest 4.3 defense.
- 2. Real proof weaving and arc stages. Problem: proof appears as one repeated template sentence; chapters don't progress. Solution: an original weave-fragment library keyed by evidence kind (did/moved/learned) × beat, which can place the proof in arrival, witness or closing; mark proofs as woven so they are never repeated; a cumulative line ('Reality has answered you four times now') and a 'Previously' opener citing up to 3 past proofs; gold underline or glow on the user's own words and proof in the reader; arc stages (Arrival ch1-3, Living it ch4-7, Becoming ch8+) with stage-specific fragment pools, and milestone chapters at proof milestones; write more fragments for the 6-per-focus arrival/living pools. Screens: lib/story/engine.ts + fragments.ts, StoryContext regenerate, story reader. Expected impact: the 'holy dang' peak (seeing your real action inside your future), a clear difference from Stella's server stories, at no running cost.
- 3. Overnight weave and a personal return loop. Problem: no default reminders, chapter 2 can be opened instantly against the copy, nothing new tomorrow. Solution: after proof, an end card 'Vela is weaving Chapter 2 from this, ready at {ritual time}' with a sealing animation; the chapter unlocks at the ritual time with an 'open now' link so it is never a hard wall; ask for notification permission with a short explainer at the onboarding ritual step, then schedule personal local notifications ('Chapter 2 is ready, Maya. It begins with what you did.'); an evening bridge check-in notification with category actions (I did it / I moved / I learned + text input) that logs proof from the lock screen; count proof toward the streak, with shame-free 'rest day' wording; a ritual time picker in Settings. Later: an iOS widget showing today's bridge and the constellation (the owner has shipped widget extension work for Scripture Mate). Screens: onboarding step 4, evidence success, Today, Settings, lib/notifications.ts. Expected impact: the main D1/D7 retention lever, using Finch/Duolingo-style anticipation, all on the device.
- 4. A sky-based visual system and an immersive reader. Problem: flat screens, no imagery, and a reveal that doesn't feel like it materializes. Solution: a shared ambient starfield backdrop (react-native-svg + Reanimated, both already installed) behind Today, onboarding welcome and the reader; cover art per arc generated from the intent id (horizon, stars, focus-colored aurora); a reveal sequence (stars gather into the title, paragraphs appear with soft haptic ticks, the user's words glow); immersive mode that hides the chrome; font-size control; auto-scroll and current-paragraph highlight while listening; a sleep timer; optional original or CC0 ambient soundscapes mixed under the narration. Screens: story reader, Today hero card, onboarding, Arc. Expected impact: addresses the owner's 'elevate visuals' ask, makes the peak memorable, and produces screenshots worth showing.
- 5. A living Vela constellation for progress. Problem: 7 grey dots, wrong counts, not tappable. Solution: a full-screen Sky view where each proof is a star placed on the real Vela ('sails') pattern and lines connect as proofs build up; tap a star to open the proof card (date, kind, sentence, photo, the chapter it changed); milestones at 3/7/12/30 proofs complete a figure with a proportional celebration and a milestone chapter, then a new constellation starts; the Today card becomes a live mini-sky. Screens: Today constellation card, evidence success, new Sky tab (absorbs Board). Expected impact: visible momentum without scores or shame, milestone peaks, and a brand-native shareable image.
- 6. Fix multi-arc for Plus users. Problem: Today renders only intents[0], so a second dream hides the first arc. Solution: an arc switcher on Today (pills or a carousel), stacked open bridges ('2 bridges open today'), one combined constellation with a color per arc, and the user's arc stats shown in the paywall's 'add another dream' context. Screens: Today, Arc, paywall. Expected impact: prevents paying-user regret and refunds, and makes Plus value visible every day.
- 7. Onboarding with a shorter time-to-wow where every answer matters. Problem: ~8 screens, ~13 taps, mood and ritual answers unused, focus asked twice, desire asked last in a form. Solution: ask for the desire as onboarding beat 2 with focus-specific suggestion chips plus free text; skip the separate intake for the first story; use mood to choose opening and tone fragments (or drop the step); have the ritual step schedule reminders; replace the 'Your practice' list with the weaving animation that leads straight into chapter 1. Target ≤6 screens. Screens: app/onboarding.tsx, app/story/new.tsx. Expected impact: higher onboarding completion and first-story reach, and users see their answers reflected, which builds trust.
- 8. Bridges the user can choose and own. Problem: 18 fixed actions picked by hash and no way to change one (reshapeAction is unused). Solution: ≥15 original actions per focus; 3 sized options per chapter (2-minute / 15-minute / brave); 'Write my own bridge' wired to the existing reshapeAction; use the desire text where the grammar allows; a 'Not today' path that becomes a 'learned' proof. Screens: reader bridge card, Today bridge card, evidence. Expected impact: more completed bridges, more proofs and richer chapters; the user feels in control.
- 9. Richer proof capture that fills the Board (now the 'Wall'). Problem: proof is one line of text; the Board is empty and disconnected, with blank captions. Solution: optional photo on proof (reuse the BoardContext file storage); a 'how close does it feel now?' 5-option selection that sets the next chapter's tone; reframe Board as a Wall with two layers, Future scenes (captioned vision photos, pinnable as an arc's cover art) and Proof photos added automatically from evidence; the empty state starts with the user's desire as the first card. Screens: evidence, Board/Wall, Arc. Expected impact: the Board fills itself instead of being a dead end, and proof feels tangible.
- 10. The Journal becomes the arc's notebook. Problem: 3 generic doors, entries that can't be opened, abrupt saves, 369 history discarded. Solution: prompts that use the arc ('Yesterday you sent your portfolio. Script the reply.'); entries that open in full view; filters by type including proofs; a memory calendar of story, proof and journal days; keep 369 history with a completion celebration; a closing moment on save ('Sealed. Vela will remember this page.'), with an option to fold one scripted line into the next chapter. Screens: Journal tab, script, 369, gratitude. Expected impact: the journal feeds the loop instead of standing beside it, with a better end moment.
- 11. Identity affirmations and shareable cards. Problem: a generic affirmation library and plain-text sharing. Solution: 'Your lines' built from proofs (did + career → 'I am someone who ships before I'm ready'), with the daily affirmation preferring user-derived lines; share as a rendered starfield image card that includes no personal data unless the user chooses; a Sunday 'Arc recap' end card (chapters, proofs, bravest proof, identity line) that can also be shared. Screens: affirmation, affirmations, Today (weekly recap). Expected impact: free organic acquisition through the vanity-mirror principle, and identity reinforcement as an end moment.
- 12. Re-frame the paywall around loop depth, with no dark patterns. Problem: quantity-based benefits, one hollow, and a nudge during the first story. Solution: open with the user's own arc stats; benefits that deepen the loop (concurrent arcs, soundscapes and sleep timer, a 'Book of Proof' PDF keepsake via expo-print on the device, cover-art themes, all affirmation areas) while the free single-arc loop stays complete; move the soft nudge to after the first proof or chapter 2; contextual entry points (second dream, soundscape tap, export tap, after a milestone celebration); per-month equivalent on yearly; any trial clearly labelled; no countdowns. Screens: paywall, reader nudge, Arc, Sky. Expected impact: higher conversion with honest framing that fits the 'generous free tier' brand.
- 13. Reshoot the App Store screenshots once items 1-5 land. Problem: the current 4.3-rebuild set is clipped mid-sentence, has an unlabeled CTA and shows the '1 moments' bug, and none shows the emotional payoff. Solution: a set of 6-8: the materializing chapter with the user's words in gold; proof → the same sentence woven into chapter 2 (side by side); the living constellation; the Arc timeline; the overnight-ready lock-screen notification; Wall/journal; and the private/offline/unlimited-listens promise. Fix the capture viewport. Screens: store assets. Expected impact: product-page conversion, and the screenshots double as the story for any future 4.3 review.

### content

I read the whole content layer (engine, fragments, rng, futureMemory, affirmations, journal, focus, their tests, StoryContext and the screens that render them) and ran throwaway bun scripts from the scratchpad (content_probe/*.ts) to generate and measure stories. The writing in each fragment is good, but the system around it is thin and has visible defects. In total there are 118 story fragments (about 2,800 words), 10 titles shared by every focus, 18 bridge actions (3 per focus), 1 evidence template, 120 affirmations, 12 scripting prompts, 9 gratitude stems and 2 notification texts. A story is about 160 words, roughly a minute of TTS. The desire slot breaks in two ways. First, 9 of the 36 arrival frames break the sentence for verb-shaped desires like "to open my bakery", which the engine's own tests and header comment list as a supported shape. Second, every frame leaves first-person "my/I" inside second-person narration. The repo's own audit screenshot shows this live: "you built it, brick by honest brick, into my own design studio, with clients who trust my eye." Personalization is shallow. The desire appears once per story, the name appears in only 29–42% of stories, the chosen feeling in 22%, and about half of stories contain neither. Onboarding collects mood and ritual time, but mood is never read and ritual time only sets reminder hours. A "chapter" is just a reroll: tapping refresh moves the counter up, every chapter uses the same wake-to-sleep day with the desire already fully achieved, and earlier chapters are deleted. Evidence is not woven into the story. It is appended after the "sleep now" closing with doubled punctuation ("agencies.. It is"). The same proof repeats in every later chapter until a new one is logged, and the proof type (did/moved/learned) is ignored. Repetition is guaranteed from chapter 7, and from chapter 12 on about 0.9 of 7 paragraphs on average match the previous chapter. The previous chapter's bridge action repeats 20% of the time. The supporting rituals repeat quickly too, and the Plus benefit "All journal templates" refers to nothing that is gated. The fix is a person-aware desire shaper (prototyped: about 60 lines handles 12 of 15 realistic desires), plus a staged 7-chapter season, desire-motif lexicons, daypart variants, real proof weaving, letters from your future self and guided eyes-closed sessions. That is roughly 30–45k words of original text, all on-device. It deepens the Future Memory loop rather than drifting toward a generic affirmation app.

Recommendations:
- P0 – Desire shaper (about 150 lines plus a 150-verb table, with tests): detect the desire's shape (noun phrase / 'to'-verb / bare or imperative verb / 'I…' clause / 'I want…'). Remove want-verbs and deadline tails ('by next summer', 'this year', 'before my wedding'). Swap my→your, I am→you are, me→you. Expose three slot forms: {desire.quote} (the user's exact words in quotation marks, always safe: 'the line you wrote — "…"'), {desire.np} ('finding your soulmate', 'your own design studio') and {desire.done} ('you found your soulmate', 'you are debt free'). Rewrite the 9 frames that break the rule. Change the intake microcopy to 'Say it however it comes out' so 369 and board users' 'I am…' habit stops causing problems. Prototype: scratchpad content_probe/shaper.ts.
- P0 – Proof weaving v2: (a) trim the evidence's trailing .!? and render it as a quote or in second person; (b) write 3 kinds × 3 positions (inside arrival, as the 'witness', just before the closing) × 6 variants = about 54 original lines, e.g. did: 'You remember the afternoon you {evidence} — it's where this morning began.' learned: 'Reality taught you something: "{evidence}." Future-you kept it.'; (c) use each proof once (track proofUsedInChapter); (d) from chapter 4 on, recall older proofs by date ('Twelve days ago you wrote…'), about 12 recall lines; (e) fix the 2-star first-proof bug and '1 moments' pluralization.
- P0 – Repetition and chapter semantics: replace the permanent avoid-set with a recency window (avoid ids from the last ⌊pool/2⌋ chapters plus never the immediately previous chapter). Split 'reroll this chapter' (refresh icon, no chapter++) from 'weave next chapter' (offered after a proof or 24h). Keep every chapter: the Stories tab becomes the book of this future, with chapter cards and their proofs. Show every proof in the constellation, not just the last 7 days. Add a 30-chapter no-back-to-back test.
- P1 – Seasons (staged arcs): each intent runs a 7-chapter season, and each chapter is a different scene, not the same day again. 1 The First Glimpse (first morning inside it), 2 The Night Before (rehearsal), 3 The Hard Day (something goes wrong and future-you handles it; realistic and unlike competitors), 4 Someone Notices, 5 The Threshold (the first 60 seconds after the news), 6 The Ordinary Tuesday (integration), 7 The Letter Back (future self writes, quoting every proof). After the season, the user rewrites the desire for Season 2 using what they learned. Size: 7 scene skeletons with 5–7 beats each; focus-specific pools of about 8 per beat × 2 focus beats × 7 scenes × 6 focus ≈ 670 fragments, plus about 170 shared scene fragments. Titles: 60+ stage titles ('Chapter 3 · The Hard Day'). About 20–25k words.
- P1 – Desire motif lexicon (the biggest single gain in vividness): about 40 archetypes matched on-device by keyword (studio/business, bakery/café, home/apartment, partner, wedding, family/baby, friendship, family repair, promotion, new job, freelancing, debt-free, savings/house deposit, travel, relocation, marathon/running, strength/gym, healing/recovery, sleep, public speaking, writing a book, music, art, exam/degree, visa or new country, etc.). Each archetype has 8 sensory details, 4 living moments, 3 witness lines and 5 bridge actions. That is about 800 short lines, about 12k words. Maya's story then contains fabric swatches, the studio door and a client email instead of generic sunlight.
- P1 – Daypart and mood variants: read profile.ritual and the current hour. A morning chapter ends with the user heading into the day carrying the bridge action; an evening chapter ends in sleep; a midday 90-second reset is optional. Sizes: 3 dayparts × (12 openings + 12 closings) = 72, sensory split by daypart = 3 × 12 = 36, and 4 onboarding moods × 8 opening lines = 32 (a 'stuck' user gets 'the morning after the long stillness'). Remove se9 from the shared morning sequence.
- P1 – Bridge action library: 3 → 25 per focus (150 total), each tagged with a tier (2-min / 10-min / brave 30-min), a season stage and optionally a motif ('Sketch the sign above your studio door'). Choose the next action based on the last proof type (learned → smaller retry, did → step up). Never repeat back-to-back. Add 3 preset 'reshape' alternatives per action.
- P1 – Letters from your future self (fits the loop, and makes strong screenshots and shares): unlocked by the 1st, 3rd and 7th proof and by season end. Assembled from templates plus the user's proofs quoted with dates ('On 14 October you wrote "Sent my portfolio to two studios I admire." I still have that day.'). Size: 6 focus × 6 letters + 10 shared milestone letters ≈ 46 letters × about 200 words ≈ 9k words. Render as a shareable card that does not identify the user.
- P1 (Plus) – Guided 'Step Inside' sessions, 5–10 min with eyes closed: settle (60 s of breath) → descend (a starfield countdown, fitting the Vela star theme) → enter this chapter's scene, slowed down and using motif lines → anchor (a thumb-to-finger 'proof anchor') → return with the bridge action spoken aloud. Built from expo-speech utterances chained with timed pauses. Size: 10 shared induction and return modules (about 150 words each), plus 6 focus × 3 scene scripts (about 900 words each) ≈ 18k words. Session length finally matches the reminder's 'three quiet minutes' promise and goes beyond it.
- P2 (Plus) – Soundscape pairing with no licensing risk: generate on-device (brown/pink noise, a rain texture, a low 'night sky' drone tuned per focus) or bundle 6–8 self-recorded 2-minute AAC loops (about 1 MB each). Map them to focus × daypart (e.g. peace/evening = rain on glass, career/morning = soft café murmur). Mix under TTS with ducking. Needs an audio dependency such as expo-audio; there are no ongoing costs.
- P2 – Ritual content depth: affirmations 120 → about 480 (60 core per focus with no shared phrasing with story fragments, plus 4 mood packs × 15, a 'hard day' pack of 30 and a 'sleep' pack of 30), plus proof-born lines derived from the user's own evidence ('I am someone who follows through'). Scripting prompts 12 → 120 (20 per focus), plus prompts tied to the current chapter ('Write the scene just after this chapter ends') and the open bridge, plus a Sunday Proof Review. Gratitude stems 9 → 60. Ten 369 phrase suggestions per focus, auto-generated through the shaper ('I {desire.done}'). Notification copy 2 → 50, including lines that echo the open bridge action. Draw daily picks without replacement so nothing repeats until the pool is exhausted.
- P2 – Writing hygiene during the expansion: limit 'now' to 1 per story and phrase-family repeats to 1, retire the hard-coded 'Tuesday' (use the actual weekday, or none), split the love pools into romantic, family and friendship variants chosen by keywords, give the domain word per-focus phrasings (no 'work's quietest gifts'), and use {name} and {feeling} in at least 2 beats per story so every story contains both. Target totals: about 30–45k original words (currently about 2.8k), still well under 1 MB of text, all on-device. Every addition hangs off chapter → bridge → proof, so the 4.3 'distinct loop' gets stronger rather than weaker.
- Screenshot follow-on: the new content provides new hero frames for the store listing that only Vela can show: a season map ('Chapter 3 of 7 · The Hard Day'), a chapter with a proof woven into the text and highlighted, a future-self letter quoting real dated proofs, and a guided session screen with its soundscape. Make sure screenshot inputs cover verb-shaped and 'I…' desires once the shaper ships.
