# Vela 1.0 App Store submission checklist

Audit date: 2026-08-28

## Complete

- [x] App Store record and version 1.0 exist
- [x] Production bundle identifier is `app.vela.manifest`
- [x] Store metadata, keywords, support URL, privacy URL and subscription disclosure
- [x] Six 1290×2796 iPhone screenshots are processed in App Store Connect
- [x] Review contact, notes and no-login instructions are configured
- [x] Reviewer phone corrected to `+447828973672`
- [x] Age-rating questionnaire reflects wellness content and no UGC/chat/gambling
- [x] Monthly, yearly and lifetime products have prices, localizations and review screenshots
- [x] Restore Purchases is available on the paywall and in Settings
- [x] Paywall includes renewal terms plus Terms of Use and Privacy Policy links
- [x] Active StoreKit entitlements are reconciled on launch and foreground, including expiry/revocation
- [x] 53 unit tests pass
- [x] TypeScript validation passes
- [x] Corrected production build 2 compiled and uploaded successfully
- [x] Apple processed build 2 as `VALID`
- [x] Build 2 attached to App Store version 1.0, replacing build 1
- [x] Pre-staging automated validation reported zero blocking errors
- [x] App Privacy is published as **Data Not Collected**
- [x] Vela is declared **not** a regulated medical device
- [x] Version 1.0, the Plus subscription group, `Plus Monthly`, `Plus Yearly`, and
      `Plus Lifetime` are staged together in one App Review draft
- [x] The App Review draft shows five ready items and an enabled **Submit for Review** button

## Must be completed before submission

- [x] Submitted the app version and all three products together for App Review
      (submission `0498be9f-4568-4b41-b485-0d74592b57b7`; **Waiting for Review**)

## Recommended device checks

- [ ] Fresh install follows onboarding into the first story
- [ ] Monthly and yearly sandbox purchases unlock Plus
- [ ] Lifetime purchase unlocks Plus
- [ ] Restore succeeds after reinstall
- [ ] Expired or revoked subscription returns to the free tier after foregrounding
- [ ] Story creation, narration, affirmation, 369 journal and vision-board photo flows work

Do not submit build 1: it can retain a cached subscription entitlement after expiry and its
paywall does not contain the complete renewal/legal disclosure.
