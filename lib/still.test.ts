import { afterEach, describe, expect, test } from "bun:test";
import { isStill, resetStillForTests, resolveStill, urlRequestsStill } from "./still";
import { STILL_DATE, now, setClock, stillInstant } from "./clock";

const web = { platform: "web", dev: false, search: "", envFlag: undefined };

describe("urlRequestsStill", () => {
  test("reads still=1 anywhere in the query", () => {
    expect(urlRequestsStill("?still=1")).toBe(true);
    expect(urlRequestsStill("?a=2&still=true")).toBe(true);
    expect(urlRequestsStill("still=yes")).toBe(true);
    expect(urlRequestsStill("?still=0")).toBe(false);
    expect(urlRequestsStill("?stillness=1")).toBe(false);
    expect(urlRequestsStill("")).toBe(false);
  });
});

describe("resolveStill", () => {
  test("never on native, whatever is set", () => {
    expect(resolveStill({ platform: "ios", dev: true, search: "?still=1", envFlag: "1" })).toBe(false);
    expect(resolveStill({ platform: "android", dev: true, search: "", envFlag: "1" })).toBe(false);
  });

  test("?still=1 is honoured on web, even in a production bundle", () => {
    expect(resolveStill({ ...web, search: "?still=1" })).toBe(true);
  });

  test("the env flag counts only in a dev bundle (a leaked release flag is inert)", () => {
    expect(resolveStill({ ...web, envFlag: "1" })).toBe(false);
    expect(resolveStill({ ...web, dev: true, envFlag: "1" })).toBe(true);
    expect(resolveStill({ ...web, dev: true, envFlag: undefined })).toBe(false);
  });

  test("bun has no React Native, so the runtime check says no", () => {
    resetStillForTests();
    expect(isStill()).toBe(false);
  });
});

describe("clock", () => {
  afterEach(() => setClock(null));

  test("the still instant is 21:04 local on the fixed date", () => {
    const d = stillInstant();
    expect(d.getFullYear()).toBe(STILL_DATE.year);
    expect(d.getMonth()).toBe(STILL_DATE.month - 1);
    expect(d.getDate()).toBe(STILL_DATE.day);
    expect(d.getHours()).toBe(21);
    expect(d.getMinutes()).toBe(4);
  });

  test("setClock pins now() in tests and returns fresh Date objects", () => {
    const pinned = new Date(2026, 9, 18, 9, 30);
    setClock(pinned);
    const a = now();
    expect(a.getTime()).toBe(pinned.getTime());
    a.setFullYear(1999);
    expect(now().getFullYear()).toBe(2026);
  });

  test("a function override moves; null restores the live clock", () => {
    let t = 0;
    setClock(() => new Date(++t));
    expect(now().getTime()).toBe(1);
    expect(now().getTime()).toBe(2);
    setClock(null);
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(1000);
  });
});
