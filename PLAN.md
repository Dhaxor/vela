# Vela — Manifest Your Life

A better alternative to Stella (Manifest Anything, 4.7★ / 4.1k ratings, #150
Health & Fitness). Every pillar below is aimed at a verified complaint about
the incumbent or a market-wide failure.

## Why we win

| Incumbent failure (verified in reviews) | Vela's answer |
|---|---|
| Paying $7/wk yet capped at 3 story listens/day | **Unlimited listens, forever, including free tier** |
| Server-side generation: delays + repeated stories | **On-device story engine: instant, offline, repetition-tracked** |
| Paywall slam with no meaningful free tier (market-wide) | Genuinely usable free tier: 1 living story, core affirmations, widget, journal, streaks |
| Story edits silently fail | Deterministic local engine — edits always apply |
| UI lag, interface switching bugs | Native perf bar: 60fps, Reanimated micro-interactions |

Zero-cost architecture is the moat: no LLM API, no servers, 100% margin.

## Product

- **Manifest Stories** — guided intake (area → specific desire → feeling) composes
  a second-person "a day in your achieved life" narrative from a large original
  fragment library. Variability tracking prevents repetition. Read-along mode with
  serif typography; voice via on-device TTS; ambient soundscape later.
- **Affirmations** — original library across love / money / career / health /
  confidence / peace. Daily affirmation, schedulable notifications, home-screen
  widget (P5, Scripture Mate widget stack).
- **Scripting journal** — future-self scripting, 369 method (3 morning / 6 midday /
  9 evening, structure enforced), gratitude.
- **Vision board** — photo + goal cards, local only.
- **Rituals & streaks** — morning/evening ritual chains story + affirmation +
  one-line script; gentle streak.

**Peak moment** (peak-end rule): the story "materializes" line by line under a
starfield shimmer after intake. **End moment**: "You showed up today." card after
each ritual.

## Monetization (undercut the $60–90/yr market)

- Free: 1 story slot (regenerate & edit freely, unlimited listens), core
  affirmation packs, widget, basic journal, streaks.
- **Vela Plus**: unlimited story slots, all packs, all journal templates, vision
  board unlimited, themes. $4.99/mo · $29.99/yr · $69.99 lifetime.
- Store product ids: `app.vela.manifest.plus.monthly` / `.yearly` / `.lifetime`.

## Design direction (mobile-app-ui-design skill)

Sleep/meditation conventions: deep indigo night sky, minimal ambient UI, soft
transitions. 60/30/10 = indigo base / starlight text / **gold** accent
(abundance). Serif display for story & affirmation text; SF for UI. 8pt grid.
Dark-only v1. Every interactive element carries a `testID`.

## Stack

Expo SDK 57 / RN 0.86 / React 19.2 mirroring anker exactly (proven on Xcode 26
CI). expo-router, AsyncStorage, expo-speech, expo-notifications, Reanimated 4 +
worklets 0.10.0, lucide. bun test + tsc. Release + E2E workflows copied from
anker (macos-26). Bundle id `app.vela.manifest`.

## Constraints

- Zero-cost services only. No accounts, no backend, no analytics SDK.
- All content original (written for this app) — no copyright exposure.
- No permissions beyond what features use (5.1.1 discipline): notifications
  (runtime ask), photo library only when vision board ships.
