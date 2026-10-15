// The one clock. Every context, effect and screen reads time through now(),
// so still mode (web screenshots, fixed 21:04) can pin it in ONE place.
// Pure lib functions never call it: they take `now: Date` as a parameter.
//
// OWNER: A1 (design system). This is the minimal contract stub; A1 extends it
// with the still-mode override (honoured only on web, and only in __DEV__ or
// with ?still=1) and a test-only injection seam. The exported names below are
// frozen; A1 may add exports.

export function now(): Date {
  return new Date();
}

export function nowMs(): number {
  return now().getTime();
}
