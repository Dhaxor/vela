# Vela 1.1 "Night Atlas": shared contracts (Phase 1)

Six agents build against this document **in parallel, in one working tree**.
`docs/ELEVATE_1.1.md` §0 is the binding *scope*. This document is the binding
*interface*: types, signatures, file layout, ownership and invariants. If the
two disagree about scope, ELEVATE §0 wins. If they disagree about an
interface, this document and the contract files win.

The contract files are code. Where this document paraphrases them, the code is
the source of truth:

| Contract file | What it defines | Steward |
|---|---|---|
| `contexts/arc.types.ts` | v2 data model, invariants I1–I15, `ArcValue` (what `useArc()` returns), migration contract, rule helpers | A2 |
| `contexts/user.types.ts` | `ProfileV2` (UserContext v2) | A2 |
| `lib/storageKeys.ts` | every storage key, v1 and v2 | A2 |
| `lib/story/content/types.ts` | content schema, stage ids, tokens, writing rules, pool targets | A2 |
| `lib/story/content/index.ts` | typed content registries + `contentEntries()` walker | A2 |
| `lib/audio/types.ts` | narration, voices, soundscape and audio-session API | A5 |
| `lib/progress.ts` | forgiving progress API (stubs) | A6 |
| `lib/notifications/index.ts` | rolling notification queue API (stubs) | A6 |
| `lib/loopEffects.ts` | `useLoopEffects()` (stub) | A6 |
| `lib/asks.ts` | one-ask-per-session arbiter (stubs) | A6 |
| `lib/clock.ts` | `now()` (minimal) | A1 |
| `contexts/ArcContext.tsx` | `ArcProvider` / `useArc()` inert stub | A2 replaces |

Contract tests that already run: `contexts/arc.types.test.ts` (rule helpers)
and `lib/story/content/contract.test.ts` (content schema and style lint).
`bun test` is at 100 passing tests (the 67 from 1.0 plus 33 contract tests).

---

## 0. Rules of engagement

1. **Stay in your files.** §2 lists every file's single owner. If you need a
   change in a file you don't own, write it in your final report as a request.
   Don't make the edit.
2. **Contracts are frozen; changes are additive only.** A steward may add an
   optional field, a new export or a new selector. Nobody may rename, remove
   or retype an export, or change the meaning of a field. Every additive change
   gets one line in §19 Changelog (append-only; this is the one shared edit
   everyone is allowed to make in this file). If you think a breaking change is
   needed, stop and escalate it in your report.
3. **One working tree: no git state changes.** Never run `git checkout`,
   `stash`, `reset`, `clean`, `commit`, `merge`, `rebase` or `rm --cached`.
   They would clobber the other five agents. Read-only git (`status`, `diff`,
   `log`) is fine. The owner commits.
4. **Gates before you report done:** `npx tsc --noEmit` exits 0 and `bun test`
   is fully green, including tests you didn't write. Never delete or skip
   another agent's test. If one breaks because of your change, fix your change.
5. **Stub flags.** Each stub module exports `*_IS_STUB = true`
   (`ARC_IS_STUB`, `AUDIO_IS_STUB`, `PROGRESS_IS_STUB`, `NOTIFICATIONS_IS_STUB`,
   `ASKS_IS_STUB`). The implementer flips it to `false` when the real code
   lands. Consumers that depend on real behaviour can check the flag. For
   example, A2 moves RitualContext onto `lib/progress` only once
   `PROGRESS_IS_STUB` is false.
6. **The 1.0 screens must keep working** for the whole of Phase 1. Nobody
   edits `app/**` screens in Phase 1 (A1's layouts and `app/dev/**` are the
   exceptions). A2 keeps the old hooks alive as adapters (§15).
7. **Pure logic lives in `lib/`** with bun tests, takes `now: Date` as a
   parameter, and never imports React Native at module top level. Native seams
   use a lazy `require()` inside the function, as `lib/reviewPrompt.ts` does.

## 1. Layering and imports

```
app/** (screens)  →  components/{ui,sky,glyphs} barrels, components/feature/**, contexts hooks
components/**     →  lib/**, constants/theme.ts (feature components may use contexts)
contexts/**       →  lib/**
lib/**            →  lib/** and the LEAF contract modules contexts/arc.types.ts, contexts/user.types.ts
```

- `contexts/arc.types.ts` and `contexts/user.types.ts` are leaves: no React, no
  AsyncStorage, no providers. `lib/**` may import them, including the small
  pure helpers in `arc.types.ts`. `lib/**` must never import a provider file
  (`*Context.tsx`).
- Canonical import paths: `@/contexts/ArcContext` (`useArc`, `ArcProvider`),
  `@/contexts/arc.types`, `@/contexts/user.types`, `@/lib/story/content` (all
  content plus its types), `@/lib/audio` (all audio), `@/lib/notifications`,
  `@/lib/progress`, `@/lib/asks`, `@/lib/loopEffects`, `@/lib/storageKeys`,
  `@/lib/clock`.
- Time: contexts, effects and screens call `now()` from `@/lib/clock`, so still
  mode can pin the clock. Pure functions take `now: Date`. Day keys are always
  `localDateKey()` from `@/lib/progress` (LOCAL date; never `toISOString().slice`).
- Storage: only contexts and the A6 runtime seams touch AsyncStorage, and only
  with keys from `@/lib/storageKeys`. Screens never touch storage.

## 2. File ownership map

| Agent | Owns (create/edit freely) | Must not touch |
|---|---|---|
| **A1** design system | `constants/theme.ts`; `components/ui/**` (barrel `components/ui/index.ts` defines the UI API), `components/sky/**`, `components/glyphs/**`; `lib/sky/**` (+tests); `lib/still.ts`, `lib/clock.ts`, `lib/nav.ts`; `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, new hidden stub routes `app/(tabs)/arc.tsx` and `app/(tabs)/rituals.tsx`; `app/dev/**`; `scripts/lint-ui.mjs` | contexts/**, lib/story/**, lib/content/**, lib/audio/**, lib/notifications/**, lib/progress.ts, lib/asks.ts, lib/loopEffects.ts, any existing screen in app/** |
| **A2** data, engine, contexts | `contexts/**` (incl. stewardship of `arc.types.ts`, `user.types.ts`; replaces the `ArcContext.tsx` stub; turns `StoryContext.tsx` into an adapter); `lib/story/**` except the content data files below (owns `content/types.ts`, `content/index.ts`, `content/*.test.ts`, `shaper.ts`, `seasons.ts`, `engine.ts`, `weave.ts`, `motifs.ts` matcher, `fragments.ts`, `rng.ts`); `lib/futureMemory.ts`, `lib/migrate.ts`, `lib/backup.ts`, `lib/store/**`, `lib/photos.ts`, `lib/storageKeys.ts`, `lib/focus.ts`, `lib/journal.ts`, `lib/affirmations.ts`, `lib/purchase.ts` (+ all their tests, the golden matrix and the style lint) | the content data files, lib/content/**, lib/audio/**, lib/notifications/**, lib/progress.ts, lib/asks.ts, lib/loopEffects.ts, components/**, app/** |
| **A3** content writer 1 | `lib/story/content/stages.shared.ts`, `love.ts`, `abundance.ts`, `career.ts`, `weave.ts` | everything else, especially `content/types.ts` and `content/index.ts` |
| **A4** content writer 2 | `lib/story/content/health.ts`, `confidence.ts`, `peace.ts`, `bridges.ts`, `motifs.ts`; `lib/content/notifications.ts`, `lines.ts`, `prompts.ts`, `chips.ts` | everything else |
| **A5** audio | `lib/audio/**` (types.ts is the frozen contract it stewards; replaces the `index.ts` stubs; adds `narration.ts`, `voices.ts`, `session.ts`, `soundscapes.ts`, `useNarration.ts` + tests); `scripts/gen_soundscapes.py`; `assets/audio/**` | app.json, package.json, everything else |
| **A6** progress, notifications, effects | `lib/progress.ts` (+test); `lib/notifications/**` (+tests; may move `lib/notifications.test.ts` into the folder); `lib/loopEffects.ts`; `lib/asks.ts` (+test); `lib/reviewPrompt.ts` (+test); `lib/streak.ts` (deprecated, leave it working) | contexts/**, app/**, components/**, lib/content/** (copy is A4's) |
| **Nobody in Phase 1** (owner/lead only) | `package.json`, `package-lock.json`, `app.json`, `eas.json`, `tsconfig.json`, `docs/ELEVATE_1.1.md`, `store/**`, `e2e/**`, `scripts/**` except the two owned scripts above, every existing screen in `app/**`, `components/feature/**` (Phase 2) | n/a |

Dependency requests (a new npm package, an app.json key, a plist string) go
in your report. No dependency in §6 of ELEVATE is missing today: expo-audio,
expo-font, both font families, expo-linear-gradient, expo-sharing,
expo-document-picker and react-native-view-shot are already pinned, and the
expo-audio plugin is already configured (`microphonePermission: false`,
`recordAudioAndroid: false`). `enableBackgroundPlayback: true` IS set, so the built
Info.plist carries `UIBackgroundModes: ['audio']`. If the on-device
locked-narration check fails, the lead turns it off before release.

## 3. Storage keys and migration

All keys live in `lib/storageKeys.ts`. Inline key strings are not allowed anywhere else.

| Key | Holds | Persisted by | In backup |
|---|---|---|---|
| `vela.arcs.v2` | `ArcIndex`: dreams, chapter metas, bridges, proofs, activeDreamId, schemaVersion | ArcContext (A2) | yes |
| `vela.chapter.v2.<chapterId>` | one `Chapter` text per key, immutable per revision | ArcContext (A2) | yes |
| `vela.arcs.v2.unreadable` | the raw arc index as found when it could not be read at launch (first copy wins); while it exists, no chapter key is garbage-collected | ArcContext | no (device-local) |
| `vela.profile.v2` | `ProfileV2` | UserContext (A2) | yes |
| `vela.progress.v2` | `ProgressState` (shape: A6) | RitualContext (A2) | yes |
| `vela.journal.v2` | journal entries + 369 sheet | JournalContext (A2) | yes |
| `vela.scenes.v2` | Scenes cards (former board) with optional `dreamId` | Board/ScenesContext (A2) | yes (photo URIs only: the photos stay on the phone that took them; `BackupSummary.devicePhotos` counts them) |
| `vela.asks.v1` | `AskLedger` | lib/asks (A6) | no (device-local) |
| `vela.notifications.v2` | `TemplateHistory` | lib/notifications (A6) | no |
| `vela.plus.v1`, `vela-review-requested-v1` | unchanged 1.0 keys | PlusContext (A2), reviewPrompt (A6) | no |

**v1 keys are read-only in 1.1.** These are `vela.stories.v1`,
`vela.ritual.v1`, `vela.profile.v1`, `vela.journal.v1` and `vela.board.v1`.
Migration reads them. Nothing writes or deletes them in 1.1, so a rollback to
1.0.1 still finds its data.

**Write order (I15).** A transaction that creates or rewrites chapters writes
every chapter key first, then the index. A crash between the two leaves at
worst an orphan chapter key, which is harmless and is garbage-collected on
load. The index never points at a missing chapter. Loading tolerates
`chapter.revision >= meta.revision`.

**A failed read is not 'absent'.** Launch reads throw `StorageReadError`
when storage answers with an error (`contexts/persist` `readKeys`/`readKey`,
three quick tries). Every provider loads through `loadUntilRead`
(`lib/store/storageRead`): it stays not ready, writes nothing and sets
`storageError` until a read succeeds, retrying with backoff. Only a read that
succeeded and found nothing may migrate a v1 key or start empty. The arc's
launch load is `lib/store/arcLoad` `loadArcState` (storage injected, tested).
A stored index whose rows fail the field-type checks (`lib/store/shape`) is
'unreadable' and quarantined like a corrupt one.

**Photo URIs follow the app container.** iOS moves the app's data container
on every update, so a stored `file://…/Documents/<name>` URI goes stale while
the file survives. Proof photos (arc index) and Scenes photos are rebased into
the current `Paths.document` by file name on every load and on backup import,
when the file exists there (`lib/photos` `rebasePhotoUri`). Screens keep
reading plain URIs.

**Persist queue.** Every write goes through one serialized queue
(`lib/store/persistQueue.ts`, A2). It coalesces repeated index writes and runs
after `InteractionManager.runAfterInteractions`, so a 3 KB chapter is never
serialized during Star Birth. S4 (Phase 2) holds an interaction handle for the
duration of the ceremony.

**Migration** (`lib/migrate.ts`, pure, type `MigrateV1` in arc.types):

- It runs once, on ArcProvider mount, when `vela.arcs.v2` is absent. If
  `vela.stories.v1` is absent too, the result is an empty index (a new user).
- Ids are preserved. dreamId = v1 intentId and the current chapterId = v1
  story id, so `/evidence/[intentId]` and old links keep working.
- Stage comes from proofs, never from `intent.chapter`, which the 1.0
  refresh-icon bug inflated: stage = `stageForCompletedProofs(proofs in the
  current season)`.
- Proofs are chunked into seasons of 7 stars (oldest first). A user with 9
  proofs lands in Season 2 · Stage III, with Season 1 complete and unnamed (the
  Named Sky can still be done).
- Only the newest non-completed action becomes the live open bridge. Every
  older open action becomes `lapsed`. A reshaped action becomes tier `own`;
  otherwise the tier is `15min`.
- If the newest action is completed (proof saved, next chapter never woven),
  migration weaves that next chapter with the v2 engine, unless the season is
  complete, so invariants I5 and I6 hold.
- `vela.ritual.v1` becomes `ProgressState` via `progressFromRitualV1` (A6).
  The profile, journal and board are migrated by their contexts (A2).
- The output must pass `checkArcInvariants`. The release-blocking fixtures
  include a reroll-heavy v1 user (chapter 9, 1 proof) and one with several open
  actions.

## 4. The arc data model

Source: `contexts/arc.types.ts`. In short:

- **Dream** (the v1 "intent"): `focus`, `desire` (the user's raw words), `feeling`,
  `label` (rename), `status` (active | resting | released), `season`,
  `seasonStartedAt`, `constellations` (one name per named season), `usedIds`
  (repetition guard, newest last, capped at 400), `motifIds`.
- **ChapterMeta** sits in the index and carries the *mutable* loop fields:
  `bridgeId`, `heardAt`, `savedForAt`, `revision`. **Chapter** is the full
  text under its own key and is *immutable* per revision. It stores both
  daypart variants of the opening and closing. The reader picks one at READ
  time:

  ```ts
  const paragraphs = paragraphsForDaypart(chapter, daypartAt(now())); // 04:00–14:59 → morning
  ```

- **Paragraph**: `{ key, fragmentId, beat, text, spans, wovenProofId? }`.
  `spans` are `{ kind: 'desire' | 'proof' | 'name', start, end, proofId? }`, as
  UTF-16 offsets into `text`, sorted and non-overlapping. The engine emits them
  automatically around substituted tokens, so writers never write spans. The
  one paragraph carrying `wovenProofId` shows the 'Woven from your proof' tag.
  Rendering is nested `<Text>` colour/opacity only. The paragraph rises in, the
  sentence highlight comes from narration offsets, and auto-scroll works per
  paragraph via onLayout (ELEVATE §8).
- **Bridge**: `tier` ('2min' | '15min' | 'brave' | 'own'), `libraryId`, `text`,
  optional `ifThen {when, then}` + `remindAt` (an absolute ISO instant), and
  `status` (open → crossed | learned, or lapsed).
- **Proof**: `kind` (did | moved | learned), `text`, `photoUri`, `createdAt` +
  LOCAL `dateKey`, `wovenInChapterId`, `starIndex` (1..7 within its season),
  `season`, `origin` ('onboarding' | 'bridge' | 'not-today').

### 4.1 How a season runs (the rule that makes stars, stages and weaving agree)

A season has **7 stars** and **7 chapters, one per stage**. Stage of a new
chapter = `min(completedProofs + 1, 7)`, where *completedProofs* counts the
season's proofs that resolved a bridge (origin 'bridge' or 'not-today'). The
onboarding seed is a real star but never advances the stage.

Unseeded user (most later dreams):

| Event | Stars | Writes | Note |
|---|---|---|---|
| createDream | 0 | Chapter I (stage 1) | |
| proof 1 … proof 6 | 1 … 6 | Chapters II … VII, each weaving its proof | |
| proof 7 (resolves Chapter VII's bridge) | 7 | nothing | `seasonComplete: true`, no `nextChapter` → Named Sky |
| beginNextSeason | S2: 0 | S2 Chapter I, weaving S1's proof 7 | "Season 2 begins with what you did" |

Seeded user (First Light with 'One thing you've already done'):

| Event | Stars | Writes | Note |
|---|---|---|---|
| createDream + seed | 1 (seed) | Chapter I, hand-tuned, weaving the seed in gold | the payoff lands in minute one |
| proof 1 … proof 5 | 2 … 6 | Chapters II … VI | |
| proof 6 | 7 | Chapter VII (Becoming), weaving it | `seasonComplete: true` AND `nextChapter` → Named Sky after reading |
| beginNextSeason | S2: 0 | S2 Chapter I | nothing left to carry |

In a complete season, Chapter VII offers no bridge. Its end CTA is the Named
Sky, then 'Begin Season 2'. A complete season rejects `chooseBridge` and
`saveProofAndWeave` with `season-complete` (I9).

### 4.2 Invariants

I1–I15 are written out at the top of `contexts/arc.types.ts`. The ones every
agent must design around:

- Each proof is woven exactly once (I4, I5). Older proofs come back only as
  recall and cumulative lines.
- Stage = min(completedProofs + 1, 7) (I3). The chapter number equals the stage.
- Chapters are immutable, except that `rerenderChapter` keeps the number,
  stage, woven proof and bridge and bumps `revision` (I10).
- At most one open bridge per dream, always on its latest chapter (I6).
- Day keys are LOCAL (I11).
- Plus lapse never locks reading (I12).

A tiny index, for orientation:

```json
{
  "schemaVersion": 2,
  "activeDreamId": "d1",
  "dreams": [{ "id": "d1", "focus": "career", "desire": "my own design studio", "feeling": "proud",
    "label": null, "status": "active", "season": 1, "constellations": [], "motifIds": ["own-business"], "...": "..." }],
  "chapters": [
    { "id": "c1", "dreamId": "d1", "season": 1, "number": 1, "stage": 1, "wovenProofId": "p0", "bridgeId": "b1", "heardAt": "2026-10-15T20:05:00.000Z", "...": "..." },
    { "id": "c2", "dreamId": "d1", "season": 1, "number": 2, "stage": 2, "wovenProofId": "p1", "bridgeId": null, "heardAt": null, "...": "..." }
  ],
  "bridges": [{ "id": "b1", "chapterId": "c1", "tier": "15min", "status": "crossed", "proofId": "p1", "...": "..." }],
  "proofs": [
    { "id": "p0", "kind": "did", "origin": "onboarding", "starIndex": 1, "dateKey": "2026-10-15", "wovenInChapterId": "c1", "...": "..." },
    { "id": "p1", "kind": "did", "origin": "bridge", "starIndex": 2, "dateKey": "2026-10-16", "wovenInChapterId": "c2", "...": "..." }
  ]
}
```

## 5. ArcContext API (`useArc()`)

All actions are atomic: one action is one reducer transition and one persisted
transaction, built with functional updates (the 1.0 stale-snapshot bug is gone
by construction). An action resolves after the in-memory commit and rejects
with `ArcError` (typed `code`), leaving state untouched. Use `flush()` before
export and in tests.

| Action | Preconditions | Effect | Errors |
|---|---|---|---|
| `createDream({focus, desire, feeling, seedProof?})` → `Chapter` | `canCreateDream` | new dream (active, season 1), optional seed proof (did, onboarding, star 1), hand-tuned Chapter I weaving the seed; becomes `activeDreamId` | plan-limit, invalid-input |
| `chooseBridge({chapterId, choice, ifThen?, remindAt?})` → `Bridge` | latest chapter of a weaving dream; season not complete; chapter's bridge not resolved | sets or replaces (same id) the chapter's open bridge | not-latest-chapter, bridge-resolved, season-complete, dream-not-weaving |
| `saveProofAndWeave({dreamId, kind, text, photoUri?, origin?})` → `{proof, starIndex, nextChapter?, seasonComplete}` | weaving dream; season not complete; 'not-today' needs an open bridge | proof saved + bridge resolved (crossed / learned) + next chapter woven (§4.1) + progress act 'proof' | season-complete, no-open-bridge, dream-not-weaving, invalid-input |
| `rerenderChapter(chapterId)` → `Chapter` | latest chapter of a weaving dream | new fragment roll; same id, number, stage, woven proof and bridge; revision + 1 | not-latest-chapter, dream-not-weaving |
| `markHeard(chapterId)` | none | first call sets `heardAt` and records progress act 'chapter-heard'; later calls are no-ops | not-found |
| `saveForRitual(chapterId, at)` | none | sets `savedForAt` (Today [D], 'next-woven' notification) | not-found |
| `nameConstellation(dreamId, season, name)` | that season is complete | sets or renames its constellation | season-incomplete, invalid-input |
| `beginNextSeason(dreamId, {desire?, feeling?})` → `Chapter` | current season complete | auto-names it if unnamed; season + 1; re-matches motifs if the desire changed; writes Chapter I (weaving the carried 7th proof if unwoven) | season-incomplete |
| `renameDream(dreamId, label \| null)` | not released | display label only | invalid-input |
| `restDream(dreamId)` | not released | status resting; its open bridge stays open but silent; focus moves (I14) | invalid-input |
| `releaseDream(dreamId)` | none | status released (terminal); open bridge → lapsed; chapters stay readable | not-found |
| `setActiveDream(dreamId)` | not released | active → focus only; resting → active, and without Plus every other active dream rests (the free-tier swap) | plan-limit, invalid-input |
| `flush()` / `exportSnapshot()` / `importSnapshot(s)` | none | persistence and backup; import validates with `checkArcInvariants` | invalid-input |

Selectors (sync, pure, cheap): `dream`, `chapters` (ascending by season and
number; reader prev/next uses this), `chapterMeta`, `latestChapter`,
`bridges`, `bridge`, `openBridge`, `proofs(dreamId, season?)`, `proof`,
`seasonProgress`, `bridgeOffers(chapterId)` (exactly 3: 2min, 15min, brave;
one `suggested`), `loopState(dreamId, now?)`, `suggestConstellationName`. State:
`ready`, `dreams`, `activeDreamId`, `activeDream`, `weavingDreamIds`,
`planLockedDreamIds`, `canCreateDream`, `totalStars`. Chapter text:
`peekChapter` (sync cache) and `loadChapter` (async). Latest chapters are
always cached once `ready` is true, so Today and cold-start deep links to the
current chapter never flash an empty state.

### 5.1 Today's loop card: `loopState(dreamId)`

The precedence (first match wins) is written in `arc.types.ts` next to
`LoopState`:

1. `empty`
2. `resting` (with reason: resting, released or plan-locked)
3. `next-woven` [C]: the chapter was woven from a proof saved today, is
   unheard, and is not saved for later. CTAs: 'Read now' / 'Save for 21:00'.
4. `sealed` [D]: `savedForAt` is in the future and the latest chapter is unheard (reading it spends the save).
5. `season-complete`: 7 stars and the latest chapter heard. CTA: Named Sky or
   Begin Season 2.
6. `sealed` [D]: a proof was saved today and the latest chapter is heard.
7. `bridge-open` [B]: CTAs 'I crossed it' (violet) and 'Not today', which opens
   the learned-proof sheet.
8. `chapter-waiting` [A]: `heard: false` → 'Enter chapter'; `heard: true` (no
   bridge yet) → 'Choose today's bridge'.

Each state has exactly one filled CTA. `future-memory-card` stays the testID of the card.

### 5.2 Plus-lapse rule

- Free means one dream with status `active` at a time (`FREE_ACTIVE_DREAMS = 1`).
  Plus means any number of them.
- **Nothing is mutated on lapse.** `weavingDreamIds(dreams, activeDreamId,
  isPlus)` computes which dreams weave. With Plus, that is every active dream.
  Without Plus, it is the focused active dream, or the newest active one. Any
  other active dream appears in `planLockedDreamIds`, stays fully readable,
  and rejects loop actions with `dream-not-weaving`. Notifications only cover
  weaving dreams. When the user re-subscribes, everything resumes.
- A lapsed user picks the dream that keeps weaving with `setActiveDream`
  (focus only). S2 shows 'Choose the dream that keeps weaving' while
  `planLockedDreamIds` is non-empty.
- `canCreateDream` is false for a free user who already has an active dream.
  The Arc ghost plate then opens the paywall. Resting or releasing that dream
  frees the slot.

### 5.3 Examples

```tsx
// Reader (S3): pick daypart at read time, mark heard at 60%, offer bridges after the last paragraph.
const arc = useArc();
const meta = arc.chapterMeta(id);
const chapter = arc.peekChapter(id) ?? (await arc.loadChapter(id));
const paragraphs = paragraphsForDaypart(chapter, daypartAt(now()));
const offers = arc.bridgeOffers(id); // [] unless this is the latest chapter of a weaving dream
await arc.chooseBridge({ chapterId: id, choice: { tier: offers[1].tier, libraryId: offers[1].libraryId },
  ifThen: { when: "9am", then: "open the portfolio file" }, remindAt: nextNineAm.toISOString() });

// Proof (S4): one call does proof + bridge + weave.
const { proof, starIndex, nextChapter, seasonComplete } =
  await arc.saveProofAndWeave({ dreamId, kind: "did", text: note, photoUri });
// Star Birth → star `starIndex`; then Named Sky if seasonComplete; then The Weave → nextChapter (if any).

// Not today (S2/S4): always a learned proof, so the loop never dead-ends.
await arc.saveProofAndWeave({ dreamId, kind: "learned", text: lesson, origin: "not-today" });
```

## 6. Engine ↔ content: what writers can rely on

The engine (A2) fills these rules. Writers write to them.

- **Skeleton:** `opening(daypart) → [recall] → arrival → [weave@arrival] →
  sensory → living → [motif] → [weave@witness] → reflection → [cumulative] →
  [weave@preClosing] → closing(daypart)`. Bracketed inserts appear only when
  their data exists. A chapter weaves at most one proof, and its position
  follows the proof's kind (the engine decides; each weave line must stand
  alone as its own paragraph).
- **Both dayparts** of the opening and closing are picked and stored for every
  chapter. Write morning variants to hand the listener *into the day, carrying
  the bridge*, and evening variants to hand them *into rest*. The scene itself
  may be any time of day.
- **Recall** lines appear from stage II when older, already-woven proofs
  exist. The recall paragraph is capped at `MAX_RECALL_WORDS` (30, in
  `lib/story/engine.ts`); when not every proof fits, it cites the newest ones
  and still prints them oldest first. **Cumulative** lines appear only when
  the dream has 3 or more proofs.
- **Motif gating:** a fragment containing any `{motif.*}` token is eligible
  only when a motif matched. Every pool therefore needs motif-free fragments.
  `requires` / `excludes` flags filter fragments against the matched motifs'
  flags. A love fragment that assumes a partner must carry
  `requires: ['romance']`.
- **Repetition guard:** ids used in recent chapters (`dream.usedIds`) are
  avoided, and the previous chapter's ids are never repeated. When a pool runs
  dry the guard degrades gracefully and never errors, so bigger pools mean
  fewer repeats.
- **Chapter I** is the first script in `chapterOne` whose `motifs` contains a
  matched motif, else the default one. Its `{kind:'weave'}` slot takes a
  `WEAVE.seed` line when a seed exists and is skipped otherwise. Its
  `{kind:'motif'}` slot takes a living moment or witness line when a motif
  matched. A rerendered Chapter I uses the stage-1 pools.
- **Bridge offers** (`bridgeOffers`): one per tier from the focus's entries.
  Motif-tagged entries are offered only when that motif matched; entries
  tagged with the current stage are preferred; never the previous bridge
  back-to-back. Seeded by chapter id, so reopening shows the same three. The
  `suggested` tier follows the last proof (learned → 2min, moved → 15min,
  did → brave, none → 15min). After a learned proof the chooser shows a
  `learnedRetry` header.
- **Length:** a rendered chapter is 300–380 words in either daypart variant
  (golden tests). Beats run 30–60 template words and weave lines 12–35
  (`WORD_TARGETS`).

## 7. Content writer guide (A3, A4)

### 7.1 Files, owners, targets

| File | Owner | Export | Target (POOL_TARGETS) |
|---|---|---|---|
| `lib/story/content/stages.shared.ts` | A3 | `SHARED_STAGES` | 7 stages × {opening ×2 dayparts, sensory, reflection, closing ×2 dayparts} × 5 = 210 |
| `love.ts`, `abundance.ts`, `career.ts` | A3 | `LOVE`, `ABUNDANCE`, `CAREER` | per focus: 7 × (4 arrival + 4 living + 3 titles) + Chapter I scripts (1 default + motif variants) |
| `health.ts`, `confidence.ts`, `peace.ts` | A4 | `HEALTH`, `CONFIDENCE`, `PEACE` | same as above |
| `weave.ts` | A3 | `WEAVE` | 3 kinds × 3 positions × 6, seed 6, notToday 6, recall 12, cumulative 8 |
| `bridges.ts` | A4 | `BRIDGES` | 25 per focus (≥ 6 per tier), reshape 3 per focus, learnedRetry 6 |
| `motifs.ts` | A4 | `MOTIFS` | all 24 `MotifId`s × (keywords, flags, place, 6 details, 3 living, 2 witness) |
| `lib/content/notifications.ts` | A4 | `NOTIFICATIONS` | 6 slots × 20, ≥ 8 neutral per slot |
| `lib/content/lines.ts` | A4 | `IDENTITY_LINES` | 3 kinds × 6 focus × 6 |
| `lib/content/prompts.ts` | A4 | `RITUAL_PROMPTS` | script 12 per focus, scriptArc 12, gratitude 48, frames369 10 per focus |
| `lib/content/chips.ts` | A4 | `ONBOARDING_CHIPS` | 4 desire chips per focus; feelings keep the six 1.0 ids |

Each file exports `STATUS: ContentStatus`. While it is `'placeholder'` or
`'draft'`, only the always-on checks run. Set it to `'final'` when you are
done. That switches on the pool-target check and the no-placeholder check for
your file. Keep each file's exported const name and type. Don't add exports
the index doesn't import. Don't import between content files.

### 7.2 Id prefixes (ids are permanent: never rename or reuse)

| Content | Pattern | Example |
|---|---|---|
| shared beats | `sh{stage}-{op-m\|op-e\|se\|re\|cl-m\|cl-e}{n}` | `sh3-op-e2` |
| focus beats | `{fx}{stage}-{ar\|li}{n}`, titles `{fx}{stage}-t{n}` | `ca4-ar3`, `pe7-t2` |
| Chapter I scripts | script `{fx}-one-{name}`; parts `{script}-{t\|op-m\|op-e\|p1…\|cl-m\|cl-e}` | `lo-one-partner-p2` |
| weave | `wv-{d\|m\|l}-{ar\|wi\|pc}{n}`, `wv-sd{n}`, `wv-nt{n}`, `wv-rc{n}`, `wv-cu{n}` | `wv-l-pc4` |
| bridges | `br-{fx}{nn}`, reshape `rs-{fx}{n}`, learned retry `lr{n}` | `br-he17` |
| motif lines | `mo-{motifId}-{li\|wi}{n}` | `mo-debt-free-wi2` |
| notifications | `nt-{rc\|rb\|if\|nw\|lg\|qr}{n}` | `nt-qr12` |
| your lines | `yl-{d\|m\|l}-{fx}{n}` | `yl-m-co4` |
| prompts | `sp-{fx}{n}`, `sp-arc{n}`, `gs{n}`, `f369-{fx}{n}` | `gs31` |

`fx` stands for lo, ab, ca, he, co, pe (love … peace).

### 7.3 Writing rules (all in `types.ts`; the mechanical ones are tested)

- Original prose. Second person, present tense. Never 'I' in narration.
  First person appears only in Your lines and 3·6·9 frames.
- Template sentences are ≤ 24 words, counting each token as one word. The
  rendered limit is 28. No parentheses, abbreviations or '&'. Curly quotes
  only. At most one em dash per fragment. No 'not X but Y' and no 'it's not
  X, it's Y'.
- Banned (`BANNED_PHRASES`): 'future self/you', 'manifest', stock LLM words
  (whisper, tapestry, testament, symphony, journey, realm, vibrant, unlock …),
  moon and astrology, weekday names, health/medical/money guarantees, and
  gendered pronouns or roles for other people. Notification copy also bans
  guilt and streak words (`BANNED_IN_NOTIFICATIONS`).
- 'now' at most once per rendered chapter. Prefer zero.
- Inclusive: no assumed body, gender or relationship. Use `requires` flags
  rather than assuming.
- Stage III (The Hard Day) is a realistic setback handled steadily, never a
  catastrophe. No outcome guarantees anywhere.
- **Cadences** (`CADENCES` in `types.ts`, 43 stock opening and closing moves
  such as 'Good morning, {name}', 'Let the day close', 'give it a time'): each
  family lives in ONE stage only, and inside that stage in its openings or its
  closings, never both. Chapter I scripts count as stage I. A season reads one
  chapter per stage, so no season repeats a cadence.
  `lib/story/content/cadence.test.ts` enforces the static rule and renders 42
  seasons to check it.
- Self-check before reporting: `bun test lib/story/content`.

Good fragments, one per kind:

```ts
fr("ca3-ar2", "The client email arrives at nine: the deadline moved up two days. You read it once, breathe, and open the file. {name}, you have done harder things than this.")
fr("wv-d-ar3", "You remember the afternoon {proof.done}. Nobody saw it, and it still counted. This morning began right there.")
fr("wv-rc4", "On {proof.date} you wrote {proof.quote}. You were already on your way.")
fr("wv-cu2", "Reality has answered you {proofs.count} times now, {name}. You notice the pattern.")
{ id: "br-ca11", focus: "career", tier: "brave", stage: 4, text: "Show one finished piece to someone whose eye you trust." }
nt("nt-nw3", "Chapter {chapter.numeral} is ready", "It begins with what you did. Whenever you are ready, {name}.")
```

## 8. Template tokens: the canonical reference

`TOKEN_REFERENCE` in `types.ts` is the source of truth. `ALLOWED_TOKENS`
lists which kinds may use which tokens, and the contract test enforces it.
Values never end with punctuation. "Lower" means the value starts lowercase,
so the token may not open a sentence.

| Token | Value | Example | Case | Span | Personal | Allowed in |
|---|---|---|---|---|---|---|
| `{name}` | name as typed; 'friend' if empty; TTS speaks the pronunciation | Maya | as typed | name | | beat, weave, seed, notToday, recall, cumulative, motifLine, learnedRetry, notification, arcPrompt |
| `{feeling}` | feeling chip, adjective ('you feel {feeling}') | proud | lower | | | beat, weave, seed, notToday, frame369 (not motifLine: the shared reflection already names it) |
| `{desire.quote}` | exact words in curly quotes, trailing .!? removed | “my own design studio” | quote | desire | yes | beat, weave, seed, notToday, motifLine, notification, scriptPrompt |
| `{desire.np}` | noun phrase, 2nd person | your own design studio / finding your soulmate | lower | desire | yes | beat, weave, seed, notToday, cumulative, motifLine, notification, scriptPrompt, arcPrompt (never bridge or reshape: a long desire reads clunky inside a step) |
| `{desire.done}` | completed clause, 2nd person; right after a colon or 'the life where', a bare noun phrase takes the short form '<np> is yours' (`ShapedDesire.doneShort`) | you opened your bakery / you are debt free / financial freedom is yours | lower | desire | yes | beat, weave, seed, notToday, motifLine |
| `{desire.np.my}` | 1st-person noun phrase | my own design studio | lower | | yes | frame369 |
| `{desire.done.i}` | 1st-person clause | I opened my bakery | 'I' | | yes | frame369 |
| `{proof.quote}` | proof in curly quotes | “Sent my portfolio to two studios” | quote | proof | yes | weave, seed, notToday, recall, learnedRetry, notification, arcPrompt |
| `{proof.done}` | 2nd-person past clause; trailing time words dropped ('this week', 'tonight'); fallback `you wrote {proof.quote}`, or `you noted {proof.quote}` for a proof that opens with 'Wrote…'; a habit ('every day', 'daily') always stays quoted | you sent your portfolio to two studios | lower | proof | yes | weave, seed, notToday, recall |
| `{proof.ago}` | relative day in words | yesterday / twelve days ago | lower | | | weave, seed, notToday, recall, notification |
| `{proof.date}` | month and day in words | October 14 | Capital | | | weave, seed, notToday, recall |
| `{proofs.count}` | number word, guaranteed ≥ 3 in cumulative and ≥ 2 in notifications | four | lower | | | cumulative, notification |
| `{proofs.phrase}` | plural noun phrase | four proofs | lower | | | cumulative, notification |
| `{nights.count}` / `{nights.phrase}` | number word ≥ 2 / plural phrase | twelve / twelve nights | lower | | | notification |
| `{motif.place}` | archetype place, with its article; a motif-tagged bridge names ITS motif's place (`lib/futureMemory` bridgeText) | the studio | lower | | | beat, weave, seed, notToday, motifLine, bridge |
| `{motif.detail}` | sensory noun phrase | fabric swatches pinned above the desk | lower | | | beat, weave, seed, notToday, motifLine |
| `{bridge.quote}` | bridge in curly quotes, final period removed | “Send one piece of work …” | quote | | yes | learnedRetry, notification, arcPrompt |
| `{ifthen.when}` | cue label | 9am / lunch / after work | lower | | yes | notification |
| `{ifthen.then}` | first move, no subject | open the portfolio file | lower | | yes | notification |
| `{chapter.numeral}` | Roman numeral | IV | Capital | | | notification, arcPrompt |
| `{chapter.title}` | chapter title | The Studio Door | Capital | | | notification, arcPrompt |
| `{stage.name}` | stage name | Someone Notices | Capital | | | notification, arcPrompt |
| `{ritual.time}` | locale-formatted ritual time | 9:00 PM | as formatted | | | notification |

Grammar the shaper guarantees: `{desire.np}` fits wherever a noun phrase fits
('toward {desire.np}'), and `{desire.done}` fits after a conjunction ('since
{desire.done}, mornings feel different'). Quote tokens are always safe after
'you wrote', a colon, or as an object. When the shaper can't shape a desire,
it still returns safe values: `{desire.np}` falls back to 'the life you
described', and `{desire.done}` falls back to 'you found your way to
{desire.quote}'. A2 pins both fallbacks in the golden tests.

## 9. Audio contract (A5)

Source: `lib/audio/types.ts`. Stubs: `lib/audio/index.ts`.

- `useNarration(chapter, opts)` returns `NarrationController`: `status`,
  `sentences`, `current` (sentence offsets for the highlight), `progress` 0..1,
  `estimatedTotalMs` / `estimatedElapsedMs`, `sleepRemainingMs`, `rate`,
  `voice`, `voices`, and `play / pause / resume / stop / seekToParagraph /
  setRate / setVoice / setSleepTimer`. `opts` carries `daypart`, `name`,
  `pronunciation`, `rate`, `voiceId`, `sleepTimer`, `onHeard` (fires once at
  `HEARD_THRESHOLD` = 60%; the reader calls `arc.markHeard`), `onFinished` and
  `onSleepTimerEnd`.
- **R1 ONE native queue.** `play()` passes every remaining sentence to
  `Speech.speak` in one go, with no JS timers between sentences. **R2** The
  highlight comes only from each utterance's `onStart`/`onDone`, never from
  `onBoundary` or timers. **R4** The pronunciation replaces `name` spans in
  `ttsText` only.
- **R3 Voices** are ranked by identifier substring (premium > enhanced >
  compact) through the pure `rankVoices`. The UI shows the real name and gives
  plain-text download help (`VOICE_DOWNLOAD_HINT`), never an App-Prefs URL.
  Rates are 0.8, 0.9 (default) and 1.0. Sleep timer: off, 10/20/30 minutes or
  end of chapter.
- `useSoundscape(bedId, {locked?})` returns `start / stop / duck(bool) /
  fadeOut(ms)`. Beds: `night` (free), `rain`, `hearth` and `dawn` (Plus).
  Catalogue: `BEDS`, `FREE_BEDS`. Levels: 1.0 full, 0.6 in gaps, 0.35 under
  speech. Fades: 1.5 s start, 30 s with the sleep timer. The asset `require`
  map lands in `soundscapes.ts` only once the files exist, so a missing asset
  can't break Metro.
- **Session:** `setAudioSession('idle' | 'chapter')` is the only place the
  audio mode is set. In `chapter` mode it uses
  `interruptionMode: 'doNotMix'` with background playback; in `idle` it uses
  `mixWithOthers`. A1 calls `setAudioSession('idle')` at startup; the reader
  switches modes. No lock-screen Now Playing in 1.1.
- Web: Web Speech with the same queue semantics. Every stub is safe to call.

## 10. Progress contract (A6, persisted by A2)

Source: `lib/progress.ts`. Already implemented: `localDateKey`,
`formatNightsStars` ('1 night · 1 star', which fixes the '1 moments' bug
class) and `emptyProgress`. Stubs for A6: `recordAct`, `setRhythmTarget`,
`pauseUntil`, `resumeProgress`, `isPaused`, `weeklyRhythm`, `summarize`,
`parseProgress`, `progressFromRitualV1`, `weeklyLedger` and `shouldShowLedger`.

- **Loop acts:** 'chapter-heard', 'proof', 'line-carried', 'ritual-saved'.
  Each distinct LOCAL day with any act adds one night. `nightsShownUp` never
  decreases and survives pruning `days` to 400.
- **Weekly rhythm:** 'n of target', target 3–7 (default 4), weeks run Monday
  to Sunday. A past day without an act is a **rest** night (hollow), never a
  missed one.
- **Pause my sky:** up to 30 days. No reminders while paused.
- **Ledger:** `weeklyLedger(proofs, now)` + `shouldShowLedger` (it's Sunday and
  the week has ≥ 2 proofs).
- **Wiring (A2):** RitualContext persists `ProgressState` under
  `vela.progress.v2` and exposes `useProgress(): { ready, state, summary,
  recordAct, setRhythmTarget, pauseUntil, resume }`. It records 'line-carried'
  and 'ritual-saved' for the screens. ArcContext records 'chapter-heard' (in
  markHeard) and 'proof' (in saveProofAndWeave) itself, so ArcProvider sits
  inside RitualProvider. The Today chip is `summary.chipLabel` with
  `arc.totalStars` as `stars`.
- The weekly rhythm target and pause live here, not in the profile.

## 11. Notifications and loop effects (A6)

Source: `lib/notifications/index.ts`, `lib/loopEffects.ts`.

- `planQueue(snapshot, now, history)` is pure and tested. It plans one-off
  notifications for the next 10 days, at most 40 pending, in six slots:
  'ritual-chapter', 'ritual-bridge', 'ifthen' (at `bridge.remindAt`),
  'next-woven' (at `savedForAt`), 'ledger' (Sunday) and 'quiet-return' (after
  3 or more quiet days, at most once per quiet spell). Copy rotates without
  replacement per slot (`TemplateHistory`). With `lockScreenPrivate` (the
  default), only neutral templates are used. Nothing is planned when reminders
  are off, while paused, or for non-weaving dreams.
- `rebuild(snapshot)` cancels exactly our identifiers (`ID_PREFIX
  'vela-q-'`) and schedules the plan. It never throws. It is the only
  scheduler in the app (N2).
- `useLoopEffects()` is mounted once by A1 in RootNavigator. It builds the
  `NotificationSnapshot` from `useUser` (ProfileV2), `useArc` and
  `useProgress`, and rebuilds with a 750 ms debounce on change and on
  foreground. It also forwards AppState changes to
  `asks.onAppStateChange`.
- **Permission is asked at bridge commitment.** S3 calls
  `claimAsk(['notifications'])`. If granted, S3 shows 'Remind me at 9am to do
  this?', then calls `requestPermissionAtCommitment()`, then
  `settle('notifications')` once the OS answers. Never in onboarding.
- **Deep links and cold start:** every notification has `data.url`
  (`urlForChapter` / `urlForEvidence`). A1's root layout calls
  `configureNotificationHandler()` once and handles taps with
  `useLastNotificationResponse()` + `hrefForNotificationData()`. It routes only
  after every store is ready (§15).
- **Legacy:** `remindersFor`, `applyReminders` and `clearReminders` are
  re-exported unchanged from `lib/notifications/legacy.ts` (the 1.0 file was
  moved there so the folder owns the `@/lib/notifications` path). `applyReminders`
  cancels *all* scheduled notifications, so A6 makes the v2 rebuild win after
  any legacy call. The legacy file is deleted once Settings v2 (S7) stops using it.

## 12. Asks arbiter (A6)

Source: `lib/asks.ts`.

- One ask per session. A session starts at cold start or after 30 minutes in
  the background. When several asks are eligible at the same moment, priority
  decides: **notifications > plus-nudge > review**. Settled asks never come
  back.
- The caller decides business eligibility and passes candidates. The arbiter
  applies session, cooldown and settled rules: `const ask = await
  claimAsk(['plus-nudge', 'review'])`, then show `ask` (or nothing).
- Call sites (Phase 2): notifications at bridge commitment (S3); plus-nudge
  after the 2nd proof's Star Birth, never in Chapter I (S4); review after the
  2nd proof and after Named Sky, through `lib/reviewPrompt` (once ever, with a
  4-hour return gap) (S4).

## 13. Profile v2 (A2)

Source: `contexts/user.types.ts`. Fields: `name`, `pronunciation`,
`focusAreas`, `ritual` (morning | evening | both), `ritualTimes {morning,
evening}` ('HH:mm', defaults 08:00 / 21:00), `remindersEnabled`,
`lockScreenPrivate` (default true), `voiceId`, `rate` (default 0.9),
`textSize` (S | M | L; S is the 17/28 design default), `bed` (default
'night'), `createdAt`, and legacy `mood` (never read). `useUser()` keeps
`ready`, `profile`, `saveProfile` and `updateProfile`. `profile` becomes
`ProfileV2`, and every 1.0 field keeps its name and meaning, so 1.0 screens
still compile.

## 14. UI layer convention (A1)

- A1 defines the UI API in `components/ui/index.ts` (with `components/sky` and
  `components/glyphs` barrels). Phase 2 screens import UI **only** from those
  barrels.
- `<T variant>` is the only way to set text. It maps each variant to an
  explicit font family (Newsreader 400 / 400 Italic, Instrument Sans 400 /
  600) and strips `fontWeight` and `fontStyle`.
- `<Screen>` owns a per-screen sky backdrop: memoized, at most 10 twinkles,
  only while focused, and fully static under Reduce Motion.
- No `Alert.alert`; use ConfirmSheet or Toast. Every icon-only control needs
  an `accessibilityLabel`. Every new control gets a `testID`, and every
  existing testID is kept.
- `scripts/lint-ui.mjs` fails on hex literals, `fontSize`, `fontWeight` and
  `fontStyle` in `app/**`.
- Still mode applies on web only, and only in `__DEV__` or with `?still=1`. It
  pins `lib/clock` and freezes motion.
- Fonts load with `useFonts` in `app/_layout.tsx`, and first render is gated on
  them. No expo-font plugin embedding.
- Phase 1 kept the visible tabs as they were (Today, Stories, Journal, Board).
  Phase 2 (S5, S6) swapped in the 3-tab layout **Today | Arc | Rituals**
  (`tab-today`, `tab-arc`, `tab-rituals`); `stories.tsx`, `journal.tsx` and
  `board.tsx` are deleted.

## 15. Provider tree and legacy adapters

Target tree in `app/_layout.tsx`. A1 can set it up today, because the
`ArcProvider` stub is inert:

```tsx
<UserProvider>
  <PlusProvider>
    <RitualProvider>              {/* progress; useRitual() + useProgress() */}
      <ArcProvider>               {/* needs useUser, usePlus, useRitual */}
        <StoryProvider>           {/* 1.0 provider; A2 turns it into a pass-through */}
          <JournalProvider>
            <BoardProvider>       {/* A2 may add ScenesProvider/useScenes beside useBoard */}
              <RootNavigator />   {/* waits for user, arc, ritual, journal, board ready;
                                     calls useLoopEffects(); routes notification taps */}
```

PlusProvider and RitualProvider have no dependencies, so moving them up is
safe. Until A2 lands, StoryProvider keeps serving the 1.0 screens from
`vela.stories.v1` exactly as today.

**Phase 3 (integration, 2026-10-16):** every adapter below is deleted. The
tree is now `UserProvider > PlusProvider > RitualProvider > ArcProvider >
JournalProvider > ScenesProvider > UIProvider > RootNavigator` (§20.1). The
table is kept as a record of what the adapters did.

**Adapters A2 kept until the Phase 2 screens stopped importing them:**

| 1.0 hook | Adapter over v2 |
|---|---|
| `useStories()` | `intents` = non-released dreams mapped to `Intent` (`chapter` = latest chapter number); `stories` = latest chapter per dream as `StoredStory` (paragraphs for `daypartAt(now())` mapped to `{fragmentId, text}`); `actions` = bridges + proofs mapped to `FutureAction`; `storyForIntent` / `actionForIntent` from the latest chapter and open bridge; `createIntent` → `createDream`; `saveEvidence` → `saveProofAndWeave`; `reshapeAction` → `chooseBridge({tier:'own'})`; `removeIntent` → `releaseDream`; `regenerate(intentId)` returns the latest chapter unchanged if it was woven after the newest proof and is unheard (the 1.0 'Weave chapter N+1' button), otherwise `rerenderChapter(latest)`. **The chapter counter never moves without a proof.** |
| `useRitual()` | `streak` = `computeStreak` over `progress.days` (the 1.0 chip only); `doneToday` from today's acts; `markDone('story' \| 'affirmation' \| 'script')` → `recordAct('chapter-heard' \| 'line-carried' \| 'ritual-saved')` |
| `useJournal()`, `useBoard()`, `usePlus()`, `useUser()` | same signatures; additive fields only (`PlusValue` gains `canUseBed(bedId)`; `canCreateDream` lives on ArcValue) |

`lib/reviewPrompt.maybeRequestStoreReview(actions)` keeps its 1.0 signature
for the evidence screen until S4 moves it onto proofs and the asks arbiter.

An adapter is deleted only after a grep shows no importer under `app/**`
(Phase 2 gate).

## 16. Routes, params and deep links

| Route | Param | Notes |
|---|---|---|
| `/story/[id]` | ChapterId | reader; prev/next from `arc.chapters(dreamId)`; `vela://story/<chapterId>` |
| `/evidence/[intentId]` | DreamId | proof form → Star Birth → Weave; `vela://evidence/<dreamId>` |
| `/sky/[intentId]` | DreamId | ConstellationView (stack route, not a tab) |
| `/story/new` | none | additional dream (createDream); free without room → `/paywall?from=second-dream` once, then a locked state |
| `/weave/[chapterId]` | ChapterId (or `first-light`) | the Weave interstitial; ends with `router.replace('/story/<id>')`; still mode waits for a tap on `weave-stage` |
| `/story/[id]?at=bridge` | | opens the reader at the bridge chooser |
| `/evidence/[intentId]?born=<proofId>` | | reopens a saved proof's Star Birth (replays only within 2 minutes, once per session) |
| `/sky/[intentId]?season=&star=` | | opens that season and that star's sheet |
| `/paywall?from=` | `second-dream` `bed` `area` `scenes` `nudge` `lapsed` (`reader` reads as `nudge`) | copy and featured benefit per entry point |

Every deep-linked screen uses `safeBack` (`lib/nav.ts`). Cold-start routing
waits for every store to be `ready`.

## 17. Decisions the parallel agents must know

1. **Season rule:** 7 stars and 7 chapters (one per stage). The onboarding
   seed is star 1 but doesn't advance the stage. The 7th star completes the
   season. It weaves Chapter VII if VII isn't written yet (seeded users);
   otherwise it opens the next season's Chapter I (§4.1).
2. **Daypart** is chosen at read time from the local hour (04:00–14:59 is
   morning), not from the ritual setting, so a morning-ritual user reading in
   bed at 22:00 gets the evening close.
3. **Plus lapse mutates nothing.** Weaving is computed (`weavingDreamIds`).
   Free means one *active* dream at a time. Resting or releasing frees the slot.
4. **The rerender/weave split:** `rerenderChapter` never changes the number,
   and the 1.0 `regenerate()` path can no longer inflate chapters.
5. **v2 keys for every user store** (profile, progress, journal, scenes); the
   five v1 keys are read-only for one release.
6. **Rhythm target and pause** live in `ProgressState`, not ProfileV2. This
   deviates from ELEVATE §6, which listed them under UserContext.
7. **`lib/notifications.ts` moved** to `lib/notifications/legacy.ts` and is
   re-exported from `lib/notifications/index.ts`. The import path
   `@/lib/notifications` is unchanged, and a file and a folder with the same
   name no longer shadow each other.
8. **The asks arbiter and the review prompt belong to A6.** A1 mounts
   `useLoopEffects()` and the notification routing but owns none of that logic.
9. **`app.json` and `package.json` are frozen in Phase 1.**
   `UIBackgroundModes: audio` waits for the device check.
10. **Content fallback while writing:** the stubs have one placeholder per
    pool and three bridges per focus. A2 develops the engine against them, and
    the golden length bounds switch on when the files are `final`.
11. **Out of 1.1 (don't build):** widgets, Deep chapters, Letter Back/capsule,
    Book of Proof, themes, the pannable Sky tab, Now Playing, Scenes-caption
    weaving, share-a-line, own-voice recording. No `letters.ts` or
    `deep.shared.ts`.

## 18. Done checklist (per agent, Phase 1)

- **A1:** fonts gate; tokens in `constants/theme.ts`, keeping the old names as
  aliases; UI, sky and glyph barrels exported with typed props; `lib/sky`
  tests; `lib/clock` still-mode seam; provider tree as in §15;
  `useLoopEffects()` + notification routing mounted; `setAudioSession('idle')`
  at startup; `app/dev/kitchen-sink.tsx`; `scripts/lint-ui.mjs`; 1.0 screens
  unchanged and working.
- **A2:** the real ArcContext (reducer, persist queue, migration,
  `checkArcInvariants`) with `ARC_IS_STUB = false`; engine v2 + shaper + motif
  matcher + bridge offers; adapters (§15); UserContext v2; RitualContext with
  `useProgress` once A6 lands; golden matrix (30 desires × every frame),
  regex bans, a 30-chapter run with no back-to-back repeat, length bounds,
  and migration fixtures.
- **A3 / A4:** every owned file at `STATUS = 'final'`, with
  `bun test lib/story/content` green.
- **A5:** pure narration, voices and session modules with tests; real hooks;
  four generated loops in `assets/audio/` plus the asset map;
  `AUDIO_IS_STUB = false`.
- **A6:** progress, notifications (planQueue tests covering DST and timezone
  edges, exact cancellation), asks and loopEffects implemented, each with its
  stub flag set to false.

## 19. Changelog (append-only, one line per additive contract change)

- 2026-10-15 lead: initial contracts.
- 2026-10-15 A6: lib/progress real (PROGRESS_IS_STUB=false). Added optional ProgressState.pausedFrom (first paused day, so earlier rest nights never render 'paused'); new exports isDateKey, addDays, daysBetween, weekdayIndex, weekStartKey, maxPauseUntil, lastActDateKey, LEDGER_MIN_PROOFS. summary.pausedUntil is null unless a pause is running.
- 2026-10-15 A6: lib/notifications real (NOTIFICATIONS_IS_STUB=false). Types moved to lib/notifications/types.ts and re-exported unchanged. Optional fields: NotificationDreamState.proofCount/desireNp, NotificationSnapshot.proofDateKeys (Sunday ledger gate), TemplateHistory.pending/quietSpell, RebuildResult.kept; NOTIFICATION_LIMITS gains collisionWindowMs/maxTitleChars/maxBodyChars. Optional params: planQueue(…, library), rebuild(snapshot, deps), getPermission(scheduler), requestPermissionAtCommitment(scheduler). New exports: useNotificationRouting(ready) (A1 mounts it), hrefForResponse, APP_HOME_URL ('vela://' = Today), buildNotificationSnapshot, snapshotKey, requestRebuild/onRebuildRequest, notificationId, settleHistory, parseTemplateHistory, emptyTemplateHistory. lib/notifications.test.ts moved to lib/notifications/legacy.test.ts.
- 2026-10-15 A6: lib/asks real (ASKS_IS_STUB=false). New exports newAskSession, sessionAfterReturn, parseAskLedger, createAskRuntime (+ AskStore, AskRuntime types).
- 2026-10-15 A6: lib/reviewPrompt adds the 1.1 path (reviewIsDue, requestReviewNow, requestReviewIfDue, proofTimesFromProofs; optional ReviewDeps.claimAsk). maybeRequestStoreReview(actions) unchanged for the 1.0 evidence screen.
- 2026-10-15 A6: lib/notifications adds legacyReminderChoice(): the 1.0 reminder state (true on, false turned off, null none) for A2's v1 → v2 profile migration of remindersEnabled; must run before the first rebuild supersedes the 1.0 dailies.
- 2026-10-15 A1: lib/clock adds STILL_DATE (21 Oct 2026, 21:04 local), stillInstant() and setClock(Date | () => Date | null) (honoured in tests and on web only); new lib/still (isStill, resolveStill, urlRequestsStill). UI API published in components/ui/index.ts, components/sky/index.ts, components/glyphs/index.ts; constants/theme adds palette, fonts, typeScale, readerSizes (S/M/L), horizonTint, gutter, hitSize, motion and keeps every 1.0 name as an alias (cardShadow/accentGlow are now boxShadow). Root layout provides SkyProvider (seed, focus, dawn) and UIProvider (useToast, useConfirm).
- 2026-10-15 A5: lib/audio real (AUDIO_IS_STUB=false). Optional NarrationOptions.onSpeakingChange(speaking) (true on each utterance's onStart, false on onDone/pause/stop; pass bed.duck). New exports from @/lib/audio: claimChapterSession() (ref-counted: the session stays 'chapter' while useNarration speaks or useSoundscape plays, so the reader need not call setAudioSession('chapter') itself), SOUNDSCAPES (catalogue + blurb), SUGGESTED_BEDS, suggestedBed(focus, daypart, isPlus), resolveBed(preferred, isPlus), isBedLocked, playStarBirthChime(volume?) (assets/audio/star-birth.m4a, for S4), splitSentences, segmentChapter, firstSentenceOfParagraph, estimateRangeMs, formatDuration, pickVoice, voiceDisplayName, voiceSubtitle, suggestsVoiceDownload. rankVoices drops iOS novelty voices and ranks English > tier > exact locale > name.
- 2026-10-15 A2: ArcContext real (ARC_IS_STUB=false); StoryContext/useStories, useRitual, useBoard are adapters over v2. Chapter gains optional usedIds (ids the revision consumed; the next chapter never repeats them). ArcContext also exports holdForCeremony(maxMs?) → release: RN 0.86's InteractionManager is a stub (handles do nothing), so S4 holds this during Star Birth / Named Sky / the Weave instead; every persist queue waits for it (lib/store/ceremony).
- 2026-10-15 A2: RitualContext adds useProgress() (CONTRACTS §10) and internal useRitualStore(); UserContext adds replaceProfile(p) and the NewProfile/ProfilePatch types (saveProfile fills v2 defaults; v1 migration keeps a 1.0 'reminders off' via legacyReminderChoice); JournalContext adds entry(id), addEntry(kind, prompt, text, {promptId?, dreamId?}) → JournalEntry | null, exportJournal/replaceJournal; new contexts/ScenesContext (useScenes: cards with caption, dreamId, proofId; canAddScene, addPhoto/addGoal(…, {dreamId}), setCaption, attach, removeCard; proof photos join automatically) — BoardProvider is ScenesProvider; PlusContext adds canAddDream(activeCount), canUseBed(bedId), canUseArea(focus), sceneLimit; new contexts/useBackup (snapshot, exportToFile, readFromFile, plan, apply(merge|replace)).
- 2026-10-15 A2: content engine notes for writers: fillTemplate collapses a doubled subject ('the afternoon you {proof.done}' renders 'the afternoon you sent…', not 'you you'); {desire.done} for a bare noun phrase is '<np> is/are part of your life' ('you have <np>' when it starts with a determiner); bridge text is filled and sentence-cased by lib/futureMemory bridgeText. Golden matrix + rendered-chapter style lint live in lib/story/content/golden.test.ts, so `bun test lib/story/content` runs them.
- 2026-10-15 integrator: STORAGE_KEYS.arcsUnreadable ('vela.arcs.v2.unreadable', device-local, not backed up). ArcProvider copies an arc index it cannot read there before anything can overwrite it, and collects orphan chapter keys only from an index it read and never while a quarantine exists (new pure lib/store/indexLoad: classifyIndexRead, orphanChapterKeys; contexts/persist adds writeRaw). Before this, an unreadable index deleted every chapter key and was overwritten with an empty index on launch.
- 2026-10-15 integrator: lib/loopEffects imports useProgress directly. The 1.0 Settings reminder buttons now set profile.remindersEnabled, which the v2 queue reads. Neutral 'ritual-bridge' copy (nt-rb2/3/6/7/9) now reads right when the heard chapter has no bridge chosen yet. ios-release.yml refuses a build with EXPO_PUBLIC_STILL set. The §7.3 example is 'the afternoon {proof.done}'.
- 2026-10-16 S8: content contract. Bridges and reshape starters no longer allow {desire.np}; motif lines no longer allow {feeling} (ALLOWED_TOKENS, contract-tested). {desire.done} gains a short form after a colon or 'the life where' ('<np> is yours'; ShapedDesire.doneShort, TokenValue.short). {proof.done} drops trailing time words, keeps habit proofs quoted and falls back to 'you noted …' for a 'Wrote…' proof (new export doublesWriteVerb in lib/story/weave). The recall paragraph is capped at MAX_RECALL_WORDS = 30 (newest proofs cited). CADENCES in content/types.ts puts each stock opening/closing move in one stage only (cadence.test.ts).
- 2026-10-16 integrator (Phase 3): the 1.0 adapters are gone. Deleted contexts/StoryContext.tsx (useStories, StoryProvider), contexts/BoardContext.tsx (useBoard, BoardProvider), useRitual() and the Practice type from RitualContext, lib/store/legacy.ts (+test), lib/notifications/legacy.ts (+test; applyReminders/clearReminders/remindersFor and their re-export from @/lib/notifications), lib/streak.ts (+test), and the 1.0 colour, `type` and `serif` aliases in constants/theme.ts. Root tree mounts ScenesProvider directly and gates on useProgress().ready and useScenes().ready.
- 2026-10-16 integrator: new pure modules lib/dreams.ts (dreamGivenName, dreamName), lib/rituals.ts (moved from components/feature/rituals/ritualContent.ts, same exports, re-exports the names), lib/ritualTime.ts (nextRitualMoment, saveForLabel, whenLabel, parseRitualHHmm, RITUAL_GRACE_MS), each with tests. Today's ArcSwitcher, the sky header and Arc share the dream-name rule; Today's rituals row, Rituals and /affirmation share the picks; Today, the Star Birth dock and the sealed card share 'Save for …' / 'Opens …'.
- 2026-10-16 integrator: additive fields. PlusValue.priceAmounts (Record<PlanId, {amount, currency} | null>, from StoreKit's numeric price; lib/purchase numericPrice). ProfileV2.bedOn?: false (the reader's 'Silence'; stored only when chosen, so other profiles keep their exact shape). lib/audio isAudioActive() (AudioSession.active()). Dock `dense` (the reader's denser scrim). ScreenProps.scrollProps accepts `ref`.
- 2026-10-16 integrator: behaviour. SkyBackdrop keys chart circles by index and Screen ignores 0×0 layouts (the 'two children with the same key' error on every push over a tab). Disabled filled buttons are opaque (sky700). lib/futureMemory bridgeText names a motif-tagged entry's own place. Notification picking skips 'You wrote {proof.quote}' frames for a 'Wrote…' proof (doublesWriteVerb). The Plus nudge after a Star Birth counts logged proofs, not the onboarding seed. The reader's open bridge offers 'Not today' (NotTodaySheet); its season-complete card goes straight to the Named Sky when the sky is unnamed. Paywall entry points pass from=area|scenes|nudge|lapsed. /story/new's screen testID is new-story-screen (new-story stays on Arc's ghost plate and empty state).
- 2026-10-16 integrator: tooling. scripts/shots/audit.mjs is the 1.1 fresh-install walk (exit 1 on a failed step or app error); new scripts/shots/gallery.mjs; persona maya-unseeded-eve; seed routes @script @m369 @gratitude @affirmation @affirmations @born replace @stories @journal @board. e2e/walkthrough.mjs follows the 1.1 review path.
- 2026-10-17 data-engine (review fixes): a failed storage read is never 'absent'. contexts/persist: readKeys/readKey throw StorageReadError (readRaw/readMany/allKeys are gone; listKeys returns null on failure). New lib/store/storageRead (readWithRetry, loadUntilRead, retryDelayMs) and lib/store/arcLoad (loadArcState, parseStoredIndex, parseStoredChapter, repairChapter). Every provider exposes storageError (ArcValue.storageError optional; UserValue, ProgressValue, JournalValue, ScenesValue) and stays not ready until a read succeeds.
- 2026-10-17 data-engine: photo URIs are rebased into the current container on load and import (lib/photos rebasePhotoUri, ownPhotoFileName, photoUriResolver, rebaseIndexPhotos, rebaseScenePhotos). New v1 fixtures board-photo and two-proofs-one-story (constructed with the 1.0.1 rules).
- 2026-10-17 data-engine: new lib/store/shape (indexShapeProblems, chapterShapeProblems, snapshotShapeProblems). parseBackup checks field types first and never throws; the launch index load quarantines malformed rows. rerenderChapter keeps a migrated chapter's meta.source 'migrated-v1', and I3 also skips any chapter older than index.migratedFromV1At.
- 2026-10-17 data-engine: backup merge works per dream. ImportPlan gains differs, dreamsUpdated, dreamsDiverged; nothingNew also counts chapters, bridges, proofs and newer rewrites. New resolveImportDetailed (dreamsAdded/Updated/Kept, problems: a merge is never silently replaced by 'keep mine'). useBackup().apply resolves to ImportOutcome { mode, dreamsAdded, dreamsUpdated, dreamsKept, devicePhotos } and rejects on problems. BackupSummary.devicePhotos (optional).
- 2026-10-17 data-engine: nothing evicts user content. lib/journal MAX_ENTRIES is gone (pages are never dropped); Scenes never drop a card on load, sync or merge, and MAX_SCENES only limits cards added by hand.
- 2026-10-17 data-engine: lib/store/ceremony releaseAllCeremonies(); contexts/persist runs it on AppState 'inactive'/'background', so writes held for a ceremony reach storage before iOS suspends the app.
- 2026-10-17 data-engine: Plus. PurchaseResult gains 'error' (the App Store could not be reached; entitlement untouched). restore() runs restorePurchases (AppStore.sync) before reading. PlusValue.reloadPrices(); prices are refetched while still unknown (foreground, short retries). ownsPlus honours expo-iap's revocationDateIOS.
- 2026-10-17 data-engine: lib/notifications planWindow(pausedUntil, now): while a pause runs, the 10-day horizon starts the day after it, so 14/30-night pauses resume. e2e/walkthrough.mjs backs out to Today through Chapter I, types each 3·6·9 rep, and exits 1 on a failed check (ios-e2e.yml gates on it).
- 2026-10-17 ui-native (review fixes): one root Sheet at a time. components/ui/presentation (presenter, holdForSystemSheet, also in the ui barrel) queues every root-level Sheet until the previous Modal has left (iOS onDismiss + settle); sheets inside a sheet are nested and skip it; useDataActions holds for the document picker. The toast draws inside the top open sheet (components/ui/ToastHost), and UIProvider unmounts an answered ConfirmSheet. Screen keeps the Dock in the box the keyboard padding shrinks (it rides above the iOS keyboard) and drops its home-indicator inset while the keyboard is up (useKeyboardUp).
- 2026-10-17 ui-native: lib/audio SoundscapeOptions.onInterrupted (optional): a playing bed the system pauses (route lost, a call) stops itself and calls it; the reader pauses narration. Pure soundscapes watchBed / BED_WATCH_*.
- 2026-10-17 ui-native: free affirmation areas are capped where focusAreas are written (components/feature/plus/areas: FREE_AREA_LIMIT 3, areaAllowance, tapArea): First Light's focus grid takes `max`, Settings > Your areas offers Plus past the allowance; a profile already holding more keeps it. Today reads its clock through useNow (AppState 'active', tab focus, each hour, savedForAt). The review ask is claimed only when asked (proof/starBirthAsks). Season-end copy follows proof/seasonEnd seasonCarries. Past seasons that are whole and unnamed are named from the sky (nameSeasonHref → /evidence/[id]?nameSeason=N). Icons come from components/glyphs/icons (per-icon files); lint-ui rule iconBarrel bans the lucide barrel.
- 2026-10-17 follow-ups: the root shows a storage-error screen instead of an endless splash. New components/feature/startup (launchPhase(stores) → 'loading' | 'storage-error' | 'ready', STORAGE_ERROR_COPY, StorageErrorScreen); RootNavigator hides the splash for 'storage-error' and moves on to the app by itself when a retried read succeeds. No 'Try again' control: the providers retry on their own (loadUntilRead) and expose no retry hook.
- 2026-10-17 follow-ups: new UI primitive StoredPhoto (components/ui, in the barrel; + pure storedPhotoLayout: MISSING_PHOTO_COPY, missingPhotoLayout). Every STORED photo URI renders through it (SceneTile, the Scenes sheet, ProofReceipt, StarDetailSheet, Arc's ProofNode): on Image onError the frame keeps its size and shows a window vignette and 'Photo kept on another phone' where it fits (thumbnails say it through accessibility). The placeholder's testID is `${testID}-missing`. New testIDs: `${tileTestID}-photo`, `scene-photo`, `evidence-receipt-photo`.
- 2026-10-17 follow-ups: Plus. lib/purchase isStoreUnreachable and restoreOutcome (new exports); classifyPurchaseError returns 'error' for OpenIAP network/service/connection codes; purchase() returns 'error' when initConnection fails; restore() syncs with syncIOS (expo-iap's restorePurchases swallows a failed sync) and answers 'error' (entitlement untouched) when the sync never reached the App Store and nothing local proves Plus, so 'failed' is only the genuine none. components/feature/plus/resultCopy (plusResultToast, STORE_UNREACHABLE_COPY 'Couldn't reach the App Store. Check your connection and try again.') is what usePlusActions shows for buy and restore. price.ts pricesMissing(prices); the paywall calls usePlus().reloadPrices() on mount while a price is missing.
- 2026-10-17 follow-ups: Settings > Your data. components/feature/settings/importCopy adds BACKUP_KEEPS_COPY (the Export row), nextImportStep(plan) ('nothing-to-import' on !plan.differs, 'empty-file', 'choose', 'confirm'; it no longer short-circuits on nothingNew, so Replace stays reachable when this device is ahead of the file), DEVICE_AHEAD_COPY (ImportSheet note, testID settings-import-device-ahead), importDoneCopy(outcome, { nothingNew }) ('Merged. N dreams kept this device's version.', 'Replaced. This device now matches the backup.', …) and importDoneDuration. Tab bar: components/ui/tabBar (tabBarHeight(fontScale), TAB_LABEL_MAX_SCALE 1.35, TAB_BAR_PARTS); the tab label is a <T variant="caption"> and the bar leaves it its whole 18pt line at every allowed text size (the 60pt bar left 15pt and clipped 'Today').

## 20. Integration notes (Phase 1 complete; Phase 3 updates inline)

Phase 1 is integrated on `elevate-1.1`. This section is the Phase 2 cheat
sheet. Where it and the code disagree, the code wins. The barrels and
contract files named here are the source of truth.

**Gates at hand-off:**
- `npx tsc --noEmit`: 0 errors.
- `bun test`: every test passes.
- `node scripts/lint-ui.mjs`: 88 violations, all in the fifteen 1.0 screens (fontWeight 35, fontSize 26, a11y 17, alert 10). Every screen you rewrite must leave 0.

**Gates after Phase 3 (integration, 2026-10-16):**
- `npx tsc --noEmit`: 0 errors. `bun test`: 801 pass, 0 fail (51 files).
- `node scripts/lint-ui.mjs app components/feature`: 0 violations in 129 files.
- `node scripts/shots/audit.mjs --sizes 430x932,375x667`: 59 screens per size, 0 failed steps, 0 app errors (still mode); `--live` also green.
- `node scripts/shots/gallery.mjs`: 202 screens across the 11 personas, 0 app errors, no key rewritten on load. `bun scripts/shots/seed.ts --check`: up to date.
- v1 migration of all five real fixtures (plus `plus-two-dreams` with Plus): every 1.1 screen renders, 0 app errors, the v1 keys stay byte-identical.

Every `*_IS_STUB` flag is `false`: ARC, AUDIO, PROGRESS, NOTIFICATIONS and ASKS.

**Verified on web (8094):**
- The 30-step audit walk.
- Fresh user, then Chapter I, then a proof, then the woven Chapter II, then a reload.
- v1 migration of all five real fixtures. Name, desire, chapter, the 1.0 streak, nights, proofs, journal and board survive, and the v1 keys stay byte-identical.

### 20.1 What the root layout already does (don't redo it in a screen)

`app/_layout.tsx` sets up the following. Fonts gate first render; the splash
stays up until the fonts AND every store are ready.

```
UserProvider > PlusProvider > RitualProvider > ArcProvider
  > JournalProvider > ScenesProvider > UIProvider > RootNavigator
```

`RootNavigator`:
- Waits for user, arc, progress (`useProgress().ready`), journal and scenes to be `ready`.
- When a store's launch read fails (`storageError`), shows `StorageErrorScreen` (components/feature/startup) and hides the splash; it moves on to the app by itself once the retried read succeeds.
- Calls `useNotificationRouting(ready && !!profile)`. This is A6's hook around `useLastNotificationResponse`; it is web-safe and cold-start safe.
- Mounts `useLoopEffects()` once.
- Feeds `SkyProvider` (seed from the profile; focus = active dream, then the newest dream, then the profile's focus; dawn for morning-ritual users).
- Wraps the Stack in a Night Atlas navigation theme. `Stack.Protected` shows `(tabs)` with a profile and `onboarding` without one.

`RootLayout` also calls `configureNotificationHandler()` and `setAudioSession('idle')` once.

**Done in Phase 3 (integration):** `StoryProvider`/`useStories`
(`contexts/StoryContext.tsx`), `BoardProvider`/`useBoard`
(`contexts/BoardContext.tsx`), `useRitual()`, `lib/store/legacy.ts` (+ test),
`lib/notifications/legacy.ts` (+ test; `applyReminders`, `clearReminders`,
`remindersFor`) and `lib/streak.ts` (+ test) are deleted; `ScenesProvider` is
mounted directly. The 1.0 colour aliases in `constants/theme.ts` (`bg`,
`card`, `accent`, `aurora`, `success` …) and the `type` / `serif` aliases are
gone too: use the v2 tokens.

The tabs are Today | Arc | Rituals (S5/S6, Phase 2).

### 20.2 Rules every Phase 2 screen follows

- Import UI only from `@/components/ui`, `@/components/sky` and `@/components/glyphs`. Tokens come from `@/constants/theme`; pure geometry from `@/lib/sky`.
- Every screen is a `<Screen>`, which owns the sky.
  - Text goes only through `<T>`.
  - One filled CTA per viewport: `PrimaryButton` (gold, the future) or `BridgeButton` (violet, the loop's act).
  - Use `useConfirm()` / `useToast()`, never `Alert.alert`.
  - Icon-only controls are `<IconButton accessibilityLabel>`.
  - Every control gets a `testID`, and every 1.0 testID is kept (ELEVATE §0).
- Time comes from `now()` in `@/lib/clock`. Day keys come from `localDateKey()`. Screens never touch AsyncStorage.
- Hold `const release = holdForCeremony()` (from `@/contexts/ArcContext`) during Star Birth, Named Sky and the Weave, and call `release()` when the animation ends. Persist queues wait for it. RN 0.86's InteractionManager is a stub, so it can't do this job.
- Arc actions reject with `ArcError` (`isArcError(e)`, typed `e.code`) and leave state untouched. Branch on `code`, not on the message.

### 20.3 `@/components/ui`

| Export | Use |
|---|---|
| `T` | `<T variant="display\|title\|body\|reading\|caption\|eyebrow" tone? italic? strong? numeric? center? size?>`. Tones: primary, secondary, muted, faint, gold, violet, onGold, onViolet, danger, did, moved, learned. `size` ('S'\|'M'\|'L') applies to `reading` only. fontWeight and fontStyle are stripped. |
| `UserWords` | The user's own words: gold Newsreader Italic inside curly quotes. |
| `Screen` | `variant` ('calm'\|'reveal'\|'reader'\|'still'), `focus`, `scroll` (true), `edges` (['top']), `padded` (true), `header`, `dock`, `contentStyle`, `scrollProps`, `testID`. `useGutter()` returns 24, or 16 below 380pt. |
| `Header` | `title`, `back` (true), `onBack` (default `safeBack`), `right`, `testID` (back is `${testID}-back`). |
| `Dock` | Bottom bar over a gradient scrim. `progress` (0..1 horizon line), `inset` (false inside tab screens). |
| `PrimaryButton` `BridgeButton` `SecondaryButton` `GhostButton` `DangerButton` | `label onPress icon? trailing? disabled? loading? testID? style?`. `GhostButton` also takes `tone` ('secondary'\|'muted'\|'danger'\|'violet'). |
| `IconButton` | `accessibilityLabel` is required. `variant` 'plain'\|'vellum'. Children are a glyph or a lucide icon at strokeWidth 1.75. |
| `Press` | A pressable with the .97 spring. |
| `VellumCard`, `CheckBadge` | `onPress selected tone('default'\|'bridge') padding('default'\|'compact'\|'none') raised`. |
| `GildedPlate` | Hero and chapter plates only. `figure lit inset padding onPress`. Leave about 76×44pt free top-right for the inset figure. |
| `Chip` | `label selected onPress role icon disabled`. |
| `ChipGroup` | `options value onChange testIDPrefix`, with `multiple` and `max` for multi-select. Chip testIDs are `${testIDPrefix}${value}`. |
| `TextField` | `label voice('ui'\|'words') hint error showCount maxLength multiline …TextInputProps`. Use 'words' for desire, proof and journal text. |
| `Sheet` | `visible onClose title subtitle footer dismissible scroll testID` (scrim is `${testID}-scrim`). |
| `ConfirmSheet`, `useConfirm()` | `const ok = await confirm({ title, message, confirmLabel, cancelLabel?, destructive? })`. The buttons are `${testID}-confirm` and `${testID}-cancel`. |
| `useToast()` | `toast.show('Saved')` or `toast.show({ message, tone: 'info'\|'proof'\|'error', action: { label, onPress }, duration })`. |
| `Segmented` | `options [{value,label,accessibilityLabel?}] value onChange testID`. Segment testIDs are `${testID}-${value}`. |
| `Switch` | `value onValueChange accessibilityLabel`. |
| `StoredPhoto` | `uri style resizeMode accessibilityLabel testID onMissing`. Use it for every stored photo URI: a missing file shows a quiet window vignette and 'Photo kept on another phone' (`${testID}-missing`). |
| `ProgressStars` | `total value` for onboarding, or `states` (['lit'\|'current'\|'rest'\|'upcoming']) for the weekly rhythm. |
| `useMotion()` | Returns `{ reduced, still, ambient, transitions }`; check it before any animation. Also exports `drift` and `pressSpring`. |
| `haptics` | `.select()` `.step()` `.reveal()` `.success()`. |

```tsx
<Screen header={<Header title="Settings" testID="settings" />}
  dock={<Dock><PrimaryButton label="Save" onPress={save} testID="settings-save" /></Dock>}>
  <T variant="eyebrow" tone="muted">You</T>
  <TextField label="Name" value={name} onChangeText={setName} testID="settings-name" />
</Screen>
```

### 20.4 `@/components/sky`, `@/lib/sky`, `@/components/glyphs`

- `ConstellationFigure` takes `figure? lit kinds? width height padding? variant('hero'|'inset') drawLatest? onStarPress? starLabel? accessibilityLabel testID`.
  - Star 0 is the gold anchor, the dream. Stars 1..7 are proofs, and `kinds[i]` is the kind of star i+1.
  - Tap targets are `${testID}-star-${i}`.
  - `drawLatest` gives the Star Birth line draw.
  - Build `kinds` from `arc.proofs(dreamId, season).map(p => p.kind)`. `lit` is `arc.seasonProgress(dreamId).stars`, which counts the onboarding seed.
- `ChapterCover` takes `dreamId season focus chapter lit kinds? width height showNumeral?`.
- `SkyBackdrop` lives inside `Screen`; use it directly only in previews. `useSky()` returns the identity the root feeds.
- `lib/sky`:
  - `figureFor(dreamId, season)` and `VELA_SAIL`
  - `heroHeight(windowHeight)`: about 30%, minimum 200, maximum 340
  - `fitFigure`, `hitBoxes`, `gutterFor`, `toRoman`, `skySeed`
  - `litEdges` / `edgesLitAt` / `isPointLit`
- Glyphs:
  - `VelaMark`
  - `StarProof` (kind), `ProofStarShape`, `PROOF_TINT`, `PROOF_LABEL`
  - `BridgeGlyph`, `AreaSign` (focus), `ChapterNumeral` (value, variant, ruled)
  - `TabIcon` (name 'today'|'arc'|'rituals'|'sky'|'scenes', focused)
  - `Vignette` ('sail'|'horizon'|'window'|'door') for empty states
  - lucide stays for system chrome only.

### 20.5 `useArc()` (`@/contexts/ArcContext`; types in `@/contexts/arc.types`)

- **State:** `ready`, `dreams` (newest first, every status), `activeDreamId`, `activeDream`, `weavingDreamIds`, `planLockedDreamIds`, `canCreateDream`, `totalStars`.
- **Selectors** (sync, pure):
  - `dream(id)`, `chapters(dreamId)`, `chapterMeta(id)`, `latestChapter(dreamId)`
    - `chapters` is ascending by (season, number); reader prev/next uses it.
  - `bridges(dreamId)`, `bridge(id)`, `openBridge(dreamId)`
    - `bridges` includes lapsed ones; hide them.
  - `proofs(dreamId, season?)`, `proof(id)`, `seasonProgress(dreamId)`
    - `seasonProgress` returns `{ season, stage, stars, complete }`.
  - `bridgeOffers(chapterId)`: 3 offers (2min, 15min, brave), exactly one `suggested`, or `[]`.
  - `loopState(dreamId, now?)`, `suggestConstellationName(dreamId)`.
- **Text:**
  - `peekChapter(id)` (sync; latest chapters are always cached once `ready`) and `loadChapter(id)` (async).
  - `paragraphsForDaypart(chapter, daypartAt(now()))` gives the paragraphs. Each paragraph has `spans` ('desire' | 'proof' | 'name', UTF-16 `[start, end)`), and exactly one paragraph per woven chapter carries `wovenProofId` ('Woven from your proof').
- **Actions** (Promise, atomic):

| Action | Returns / rejects |
|---|---|
| `createDream({ focus, desire, feeling, seedProof?: { text, photoUri? } })` | Chapter · plan-limit, invalid-input |
| `chooseBridge({ chapterId, choice: { tier, libraryId } \| { tier: 'own', text }, ifThen?: { when, then }, remindAt?: iso })` | Bridge · not-latest-chapter, bridge-resolved, season-complete, dream-not-weaving |
| `saveProofAndWeave({ dreamId, kind, text, photoUri?, origin?: 'bridge' \| 'not-today' })` | `{ proof, starIndex, nextChapter?, seasonComplete }` · season-complete, no-open-bridge, dream-not-weaving, invalid-input |
| `rerenderChapter(chapterId)` | Chapter (same id and number, revision + 1) · not-latest-chapter, dream-not-weaving |
| `markHeard(chapterId)` | Idempotent; records the 'chapter-heard' act itself |
| `saveForRitual(chapterId, iso)` | Today [D] and the 'next-woven' notification |
| `nameConstellation(dreamId, season, name)` | season-incomplete, invalid-input |
| `beginNextSeason(dreamId, { desire?, feeling? })` | Chapter · season-incomplete |
| `renameDream(id, label \| null)`, `restDream(id)`, `releaseDream(id)`, `setActiveDream(id)` | `setActiveDream` is the free-tier swap and the lapsed user's 'keeps weaving' choice |
| `flush()`, `exportSnapshot()`, `importSnapshot(s)` | Use them through `useBackup()`, not directly |

`LIMITS` (arc.types): desire 200, proofText 240, bridgeOwnText 180, ifThen
when/then 40/120, dreamLabel and constellationName 40.

```tsx
// S1 onboarding: profile first, then the dream (with the optional seed proof).
await saveProfile({ name, focusAreas: [focus], ritual, pronunciation, ritualTimes });
const chapter = await arc.createDream({ focus, desire, feeling, seedProof: seed ? { text: seed } : undefined });
router.replace({ pathname: "/story/[id]", params: { id: chapter.id } });

// S2 Today: one card from the loop state, one filled CTA per state (CONTRACTS §5.1).
const loop = arc.loopState(arc.activeDreamId);
// 'chapter-waiting' → heard ? "Choose today's bridge" : 'Enter chapter'
// 'bridge-open' → BridgeButton 'I crossed it' + GhostButton 'Not today'
// 'next-woven' → 'Read now' + arc.saveForRitual(loop.chapterId, nextRitualIso)
// 'sealed' · 'season-complete' (Named Sky / beginNextSeason) · 'resting' · 'empty'
const { summary } = useProgress(); // summary.chipLabel → '12 nights · 9 stars'

// S3 reader: mark heard at 60%, then the bridge chooser after the last paragraph.
const offers = arc.bridgeOffers(id); // [] when not the latest chapter or the season is complete
await arc.chooseBridge({ chapterId: id, choice: { tier: pick.tier, libraryId: pick.libraryId } });

// S4 proof → Star Birth → (Named Sky) → the Weave.
const release = holdForCeremony();
try {
  const { starIndex, nextChapter, seasonComplete } = await arc.saveProofAndWeave({ dreamId, kind, text, photoUri });
  playStarBirthChime(); // then animate to starIndex
} finally { release(); }
// Not today: always a learned proof, never a dead end.
await arc.saveProofAndWeave({ dreamId, kind: "learned", text: lesson, origin: "not-today" });
```

### 20.6 The other stores

| Hook | API |
|---|---|
| `useUser()` | `ready`, `profile: ProfileV2 \| null`, `saveProfile(NewProfile)` (fills v2 defaults), `updateProfile(patch)`, `replaceProfile(p)`. ProfileV2 fields: `name pronunciation focusAreas ritual ritualTimes{morning,evening} remindersEnabled lockScreenPrivate voiceId rate(0.8\|0.9\|1.0) textSize(S\|M\|L) bed createdAt`. |
| `useProgress()` (`@/contexts/RitualContext`) | `ready`, `state`, `summary`, `recordAct(act)`, `setRhythmTarget(3..7)`, `pauseUntil(dateKey)`, `resume()`. `summary` holds `nightsShownUp`, `stars`, `chipLabel`, `week { weekStart, target, shownUp, met, days[7] }`, `paused`, `pausedUntil` and `doneToday`. Each day is 'shown-up' \| 'rest' \| 'today-open' \| 'future' \| 'paused'. Screens record 'line-carried' (Your lines) and 'ritual-saved' (a practice saved); ArcContext records 'chapter-heard' and 'proof'. |
| `useJournal()` | `entries` (newest first), `entry(id)`, `addEntry(kind, prompt, text, { promptId?, dreamId? })` (returns the entry, or null when empty), `sheetToday`, `phrase369`, `setPhrase369`, `addRep(slot, text)`. |
| `useScenes()` (`@/contexts/ScenesContext`) | `cards`, `canAddScene`, `addPhoto(uri, caption, { dreamId })`, `addGoal(text, { dreamId })` (both return null at the free limit), `setCaption`, `attach(id, dreamId \| null)`, `removeCard`. Proof photos join automatically and never count toward the limit. |
| `usePlus()` | `isPlus`, `prices`, `reloadPrices()` (the paywall calls it on mount while prices are null), `purchase(plan)`, `restore()` ('purchased' \| 'failed' = the App Store found no Plus \| 'error' = it could not be reached \| …), `canAddDream(n)`, `canUseBed(bedId)`, `canUseArea(focus)`, `sceneLimit`. The second-dream gate is `arc.canCreateDream`. |
| `useBackup()` (`@/contexts/useBackup`) | `exportToFile()` ('shared' \| 'downloaded' \| 'unavailable'), `readFromFile()` (null = cancelled, else `{ ok, backup, summary }` or `{ ok: false, error }`; show `BACKUP_ERROR_COPY[error]` from `@/lib/backup`), `plan(backup)` (`{ needsChoice, recommended, nothingNew, differs, dreamsUpdated, dreamsDiverged, current, incoming }`), `apply(backup, 'merge' \| 'replace')` → `ImportOutcome { mode, dreamsAdded, dreamsUpdated, dreamsKept, devicePhotos }` (rejects, changing nothing, when the result would be invalid). Offer merge (recommended) or replace only when `needsChoice` is true. `nothingNew` is truthful; `differs` says whether Replace would change anything. Photos are not in the file (`summary.devicePhotos`): never say 'Everything is here'. Settings decides the next step with `nextImportStep(plan)` (on `differs`) and words the result with `importDoneCopy(outcome)` (components/feature/settings/importCopy). |

The 1.0 adapters (`useStories()`, `useRitual()`, `useBoard()`) are deleted (§20.1).

More shared helpers (Phase 3):
- `@/lib/dreams`: `dreamGivenName(dream)` (label, else the newest Named Sky, else null) and `dreamName(dream, maxWords = 4)` (given name, else the first words of the desire). Every pill, filter and header names a dream with these.
- `@/lib/rituals` (moved from `components/feature/rituals/ritualContent.ts`): `scriptPrompts`, `scriptPromptById`, `identityLineFor`, `earnedLines`, `suggestions369`, `gratitudeDeck`, `nextStem`, `gratitudePage`, `gratitudeLines`, `pagePreview`, `dayOrder`. Today's rituals row (`useTodayRituals`), the Rituals tab, `/journal/*` and `/affirmation` use the same picks; before the first proof all three offer the library's line for the day in the dream's own area.
- `@/lib/ritualTime`: `nextRitualMoment(ritual, times, now)` (strictly after now, one minute of grace; 'both' picks the earlier), `saveForLabel(moment)` ('Save for tomorrow, 21:00') and `whenLabel(iso, now)` ('21:00', 'tomorrow, 21:00', '24 October, 08:00'). Every 'Save for …' and 'Opens at …' uses them.
- `usePlus().priceAmounts`: StoreKit's numeric `{ amount, currency }` per plan (null on web), for the paywall's per-month figure (`lib/purchase` `numericPrice`).
- `ProfileV2.bedOn?: false` stores the reader's 'Silence' (absent = a bed plays).
- `isAudioActive()` from `@/lib/audio`: true while a chapter session is claimed (narration or a bed); the Star Birth chime only joins audio already on.

### 20.7 Story and content helpers

- `daypartAt(now)` and `paragraphsForDaypart(chapter, daypart)` come from `@/contexts/arc.types`. Daypart is picked at READ time (04:00–14:59 is morning).
- `chapterLabel(stage)` ('Chapter III · The Hard Day'), `seasonStageLabel(season, stage)` and `stageMeta(stage)` come from `@/lib/story/seasons`.
- From `@/lib/futureMemory`:
  - `TIER_LABEL`
  - `reshapeStarters(focus, desire)`: 3 'Write my own' starters
  - `learnedRetryLine({ chapterId, name, bridgeText, proofText })`: the chooser header after a learned proof
  - `suggestedTier(kind)`
- `shapeDesire(desire)` from `@/lib/story/shaper` returns `{ quote, np, done, doneShort?, npMy, doneI, fallback }` (`doneShort` is the '<np> is yours' form used after a colon). Use `npMy`/`doneI` for the 3·6·9 suggestions, and treat `fallback: true` as unshaped. `canFill(template, values)` is in `@/lib/story/fill`.
- `@/lib/story/content`:
  - `ONBOARDING_CHIPS.desires[focus]` (4 tap-in phrases) and `.feelings` (the six 1.0 ids)
  - `IDENTITY_LINES[kind][focus]` (Your lines; pick by the kind of the latest proof)
  - `RITUAL_PROMPTS.script[focus]` / `.scriptArc` / `.gratitude` / `.frames369[focus]`
    - Offer a `scriptArc` prompt only when `canFill` says every token fills.

### 20.8 Audio (`@/lib/audio`)

```tsx
const plus = usePlus();
const [bedId, setBedId] = useState(() => resolveBed(profile.bed, plus.isPlus));
const bed = useSoundscape(bedId, { locked: !plus.canUseBed(bedId) });
const narration = useNarration(chapter, {
  daypart: daypartAt(now()), name: profile.name, pronunciation: profile.pronunciation,
  rate: profile.rate, voiceId: profile.voiceId, sleepTimer,
  onHeard: () => void arc.markHeard(chapter.id),
  onSpeakingChange: bed.duck,
  onSleepTimerEnd: () => void bed.fadeOut(),
});
// Start both inside the Listen tap handler (web autoplay rules).
const listen = () => { void bed.start(); narration.play(); };
```

**Narration** (`useNarration`):
- The controller exposes `status` ('idle'|'playing'|'paused'|'finished'|'unavailable'), `sentences`, `current`, `progress` (feed it to `<Dock progress>`), `estimatedTotalMs`, `estimatedElapsedMs`, `sleepRemainingMs`, `rate`, `voice` and `voices`.
- Methods: `play(from?)`, `pause()`, `resume()`, `stop()`, `seekToParagraph(i)`, `setRate`, `setVoice`, `setSleepTimer`.
- Highlight: `current.paragraphIndex`, `current.start` and `current.end` are UTF-16 offsets into that paragraph's text. Render three nested `<T>` spans: before (faint), sentence (primary), after (faint).
- Rate and voice changes apply from the next sentence. The hooks claim the 'chapter' audio session themselves, so the reader never calls `setAudioSession`.

**Soundscape** (`useSoundscape`):
- Returns `status` and `start / stop / duck / fadeOut(ms = 30000)`.
- Changing `bedId` crossfades. Catalogue: `SOUNDSCAPES` (Night first), `BEDS`, `isBedLocked`, `suggestedBed(focus, daypart, isPlus)`.

**Other exports:**
- Settings > Listening: `useNarration(null, { daypart, rate, voiceId }).voices`, with `voiceDisplayName` / `voiceSubtitle`. Show `VOICE_DOWNLOAD_HINT` only when `Platform.OS === 'ios' && suggestsVoiceDownload(voices)`. Rates come from `NARRATION_RATES`.
- `playStarBirthChime()` for S4. `formatDuration(ms)`.

### 20.9 Progress (`@/lib/progress`, pure)

- `localDateKey`, `addDays`, `daysBetween`, `weekdayIndex` (0 = Monday), `weekStartKey`.
- `maxPauseUntil(now)` is the pause date-picker bound (today + 30).
- `formatNightsStars(n, s)`.
- `weeklyLedger(proofs, now)` returns `{ weekStart, weekEnd, total, counts, sentenceOfWeek }`. `shouldShowLedger(ledger, now)` is true on the local Sunday with 2 or more proofs; feed it every dream's proofs.
- `RHYTHM_TARGET` (3..7, default 4), `MAX_PAUSE_DAYS`.

### 20.10 Asks and the review prompt (`@/lib/asks`, `@/lib/reviewPrompt`)

```tsx
// S3, bridge commitment with a time: ask for notification permission at most once per session.
if ((await getPermission()) === "undetermined" && (await claimAsk(["notifications"])) === "notifications") {
  // In-app sheet: 'Remind me at 9am to do this?'. On yes:
  const result = await requestPermissionAtCommitment(); // a grant rebuilds the queue at once
  if (result === "granted" || result === "denied") await settle("notifications");
} // dismissing the in-app sheet does not settle; the cooldown handles it

// S4, after the 2nd proof's Star Birth (never in Chapter I):
const candidates: AskKind[] = [...(nudgeEligible ? ["plus-nudge" as const] : []),
  ...((await reviewIsDue(arc.proofs(dreamId))) ? ["review" as const] : [])];
const ask = await claimAsk(candidates);
if (ask === "review") setTimeout(() => void requestReviewNow(), REVIEW_PROMPT_DELAY_MS);
if (ask === "plus-nudge") showNudge();
// After the Named Sky alone: void requestReviewIfDue(arc.proofs(dreamId));
```

Priority is notifications, then plus-nudge, then review. A session renews after
30 minutes in the background. Settled asks never return. The Plus nudge counts
proofs the person logged after First Light (the onboarding seed is not a
step), so a brand-new user's first real Star Birth carries no Plus mention.
The 1.0 `maybeRequestStoreReview(actions)` has no caller left (only its tests).

### 20.11 Notifications (`@/lib/notifications`)

Screens never schedule anything. The root `useLoopEffects()` rebuilds the
rolling queue (debounced 750 ms) on every relevant state change and on
foreground.

What screens do:
- Settings v2:
  - Toggle `profile.remindersEnabled`; turning it on also calls `requestPermissionAtCommitment()`.
  - `lockScreenPrivate` picks neutral copy only.
  - Ritual times live in `profile.ritualTimes`; rhythm target and pause live in `useProgress()`.
- S3: the permission ask in 20.10.
- Deep links: use `urlForChapter(id)` (`vela://story/<id>`), `urlForEvidence(dreamId)` and `APP_HOME_URL`. `hrefForNotificationData` maps them to routes. Every deep-linked screen uses `safeBack(router)` from `@/lib/nav`.
- Diagnostics (app/dev only): `planQueue(snapshot, now, emptyTemplateHistory())` and `rebuild(snapshot)`. `requestRebuild()` forces a rebuild.

Six slots:
- 'ritual-chapter' and 'ritual-bridge'. A heard chapter's cue opens the proof form when a bridge is open, otherwise the chapter's chooser.
- 'ifthen' at `bridge.remindAt`.
- 'next-woven' at `savedForAt`.
- 'ledger' (Sunday).
- 'quiet-return'.

### 20.12 Time, still mode, dev tools

- `now()` / `setClock()` from `@/lib/clock`. Still mode is web-only: `?still=1`, or `EXPO_PUBLIC_STILL=1` in a dev bundle. It pins 2026-10-21 21:04 local and freezes motion. `ios-release.yml` fails a build that sets it.
- `/dev/kitchen-sink` shows every primitive, glyph, figure and sky; `/dev/audio` is the reference reader-audio wiring. Both are `__DEV__` only.
- `node scripts/shots/audit.mjs <outDir> [--sizes 430x932,375x667] [--live] [--port N]` walks the whole 1.1 flow on a fresh install (First Light with a seed → the Weave → Chapter I → bridge → proof → Star Birth → Chapter II → Today, sky, Arc, Rituals, Scenes, Your lines, every paywall entry point, Settings, 'Save for' → sealed) and fails on a broken step or any app error. `node scripts/shots/gallery.mjs <outDir> [persona …]` captures every persona's key screens at both sizes. Both are documented in docs/SHOTS.md. `cdp.mjs` clicks the first VISIBLE match, because navigators keep hidden duplicates mounted.
- `node scripts/lint-ui.mjs [paths] [--summary|--json]`.

### 20.13 Owner checks that only a device can answer (TestFlight)

1. Narration with the mute switch on and the screen locked, with and without a bed.
2. The bed loops at 2:00 with no gap.
3. Speech resumes after pause and after a mid-chapter speed change.
4. The native line draw (strokeDashoffset), Sheet on iOS Modal, boxShadow glows, haptics, and font/splash gating.
5. Notifications:
   - DATE triggers and the identifiers they carry
   - the 1.0 DAILY reminders superseded
   - cold-start deep links
   - provisional permission
6. Backup export to Files and import back. A proof photo copied into documents.
7. A proof photo, a Scenes photo and a 1.0.1 board photo survive an update: install build N, add the photos, install build N+1 over it (TestFlight), and every photo still shows (the container path changes; lib/photos rebases).
8. Background during Star Birth: save a proof, swipe home at once, kill the app from the switcher, relaunch: the proof and the woven chapter are there.
9. Import > Replace on a phone that already has a dream: pick the file, Replace, then 'Replace with backup': the destructive confirm appears and the backup applies. Afterwards a reader 'Rewrite this chapter' confirm still appears.
10. The keyboard: the onboarding desire and name steps, the proof form, the Script page and the Named Sky field each keep their one CTA visible above the keyboard.
11. Listening with AirPods: take them out mid-chapter (and take a call mid-chapter): the bed and the voice both pause, nothing carries on from the speaker, and Resume picks both up. With Silence chosen (no bed) the voice can still carry on: that case needs a native route-change observer.
12. Share image from a star on a @3x and a @2x iPhone: the PNG is 1080×1920 and not blank.
13. An error toast raised inside an open sheet (a rejected rename in the Arc menu, a failed 'Not today') shows over the sheet.
