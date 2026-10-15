import { describe, expect, test } from "bun:test";
import {
  DEFAULT_ACTION,
  hrefForNotificationData,
  hrefForResponse,
  responseKey,
  urlForChapter,
  urlForEvidence,
} from "./routing";

describe("deep links (N7)", () => {
  test("urls round-trip to router hrefs", () => {
    expect(hrefForNotificationData({ url: urlForChapter("c1") })).toBe("/story/c1");
    expect(hrefForNotificationData({ url: urlForEvidence("d1") })).toBe("/evidence/d1");
    expect(hrefForNotificationData({ url: urlForChapter("a b/c") })).toBe("/story/a%20b%2Fc");
    expect(hrefForNotificationData({ url: "vela://" })).toBe("/");
    expect(hrefForNotificationData({ url: "vela:///" })).toBe("/");
  });

  test("anything else is ignored", () => {
    for (const data of [
      null,
      "vela://story/c1",
      {},
      { url: 42 },
      { url: "https://example.com/story/c1" },
      { url: "vela://settings/x" },
      { url: "vela://story/" },
      { url: "vela://story/a/b" },
      { url: "vela://story/%E0%A4%A" },
    ]) {
      expect(hrefForNotificationData(data)).toBeNull();
    }
  });

  test("only a plain tap routes", () => {
    const response = (actionIdentifier: string) => ({
      actionIdentifier,
      notification: { date: 1760000000000, request: { identifier: "vela-q-x", content: { data: { url: "vela://story/c1" } } } },
    });
    expect(hrefForResponse(response(DEFAULT_ACTION))).toBe("/story/c1");
    expect(hrefForResponse(response("com.apple.UNNotificationDismissActionIdentifier"))).toBeNull();
    expect(hrefForResponse(null)).toBeNull();
    expect(responseKey(response(DEFAULT_ACTION))).toBe("vela-q-x@1760000000000");
    expect(responseKey({})).toBeNull();
  });
});
