# Shipping Vela

## Status (2026-07-31)

| | |
|---|---|
| App | Vela: Manifest Your Life (working bundle `app.vela.manifest`) |
| Build health | 54 tests passing, `tsc --noEmit` clean, expo-doctor 20/20 |
| Features | Stories engine, affirmations+streaks, journal (script/369/gratitude), vision board, Plus paywall — all browser-verified |
| Monetization | `app.vela.manifest.plus.monthly` / `.yearly` / `.lifetime` — $4.99/mo, $29.99/yr, $69.99 lifetime (undercuts the $60–90/yr market) |
| Listing | `store/localizations/en-US.strings` drafted, `scripts/check_metadata.py` green, subscription disclosure + EULA link included |
| CI | `.github/workflows/ios-release.yml` (macos-26, local build, all hard-won rules baked in) |

## Launch sequence

1. **USER: create the app record** in App Store Connect (New App → iOS →
   name "Vela: Manifest Your Life" → bundle `app.vela.manifest` → SKU vela1).
   App records cannot be created via the public API. Tell me the Apple ID.
2. **USER: `npx eas-cli init`** in `vela/` once (links the EAS project), then
   one interactive `npx eas-cli build --platform ios --profile production`
   choosing to reuse distribution cert `LT2N4R9A5S` — first signing for the
   new bundle id cannot be non-interactive.
3. Me, via API/CLI after that: drop the ascAppId into eas.json, create the
   three IAP/subscription products + prices in all territories, push the
   listing, availability (`scripts/… set_availability` pattern from anker),
   review details, age rating, categories (Lifestyle / Health & Fitness),
   privacy URL page (dhaxor.github.io/vela — needs the Pages repo),
   dispatch the release workflow, upload, attach, validate.
4. **USER: App Privacy** (Data Not Collected — it's true by architecture)
   and the first-products version-page attach (subscriptions AND the
   lifetime IAP must ride the 1.0 version submission — same rule hit on
   both previous apps).

## Deliberate scope calls

- **Home-screen widget → 1.1.** Only exercisable on a native build; shipping
  untested native surface in a 1.0 is the silent-failure class the Scripture
  Mate App-Group episode exists to warn about. The Scripture Mate widget
  stack (@bacons/apple-targets + App Group) is the ready-made pattern.
- **Reminders** are on-device scheduled notifications, permission asked in
  context from Settings; no push infrastructure, keeping the zero-cost rule.
- **Dark-only v1** — one perfect theme; manifestation is an evening/morning
  ritual.

## Traps already encoded in CI

- macos-26 or Apple rejects the binary at ingestion (ITMS-90725).
- `npm ci --include=dev` before build (lockfile drift kills EAS installs).
- EAS local build dir preserved on failure; empty log artifact = hard error.
- expo-updates stays OUT unless an OTA pipeline exists (see Scripture Mate
  1.3.0 postmortem in that repo's history).

## Local commands

```bash
bun test                    # 54 tests
npx tsc --noEmit
python scripts/make_icon.py       # regenerate icon/splash/adaptive/favicon
python scripts/check_metadata.py  # listing limits
```

Web preview: `vela-web` launch config, port 8094.
