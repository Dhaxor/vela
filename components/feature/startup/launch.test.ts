import { describe, expect, test } from "bun:test";
import { STORAGE_ERROR_COPY, launchPhase } from "./launch";

const ready = { ready: true, storageError: false };
const loading = { ready: false, storageError: false };
const failing = { ready: false, storageError: true };

describe("launchPhase", () => {
  test("every store ready: the app", () => {
    expect(launchPhase([ready, ready, ready, ready, ready])).toBe("ready");
  });

  test("still loading with no error: the splash stays", () => {
    expect(launchPhase([ready, loading, ready, ready, ready])).toBe("loading");
    expect(launchPhase([loading, loading, loading, loading, loading])).toBe("loading");
  });

  test("any store whose read failed: the storage-error screen, never an endless splash", () => {
    expect(launchPhase([failing, loading, loading, loading, loading])).toBe("storage-error");
    expect(launchPhase([ready, ready, ready, ready, failing])).toBe("storage-error");
  });

  test("a retry that heals moves straight on to the app", () => {
    const before = [ready, failing, ready, ready, ready];
    const after = [ready, ready, ready, ready, ready];
    expect(launchPhase(before)).toBe("storage-error");
    expect(launchPhase(after)).toBe("ready");
  });

  test("the arc's optional flag: absent reads as no error", () => {
    expect(launchPhase([ready, { ready: false }, ready])).toBe("loading");
    expect(launchPhase([ready, { ready: true }, ready])).toBe("ready");
  });

  test("a stale flag on a store that is ready does not block the app", () => {
    expect(launchPhase([{ ready: true, storageError: true }, ready])).toBe("ready");
  });

  test("the words are calm and say nothing was changed", () => {
    expect(`${STORAGE_ERROR_COPY.title} ${STORAGE_ERROR_COPY.body}`).toBe(
      "Vela couldn't open your data just now. Nothing has been changed. Close Vela completely and open it again."
    );
    expect(STORAGE_ERROR_COPY.titleLines.replace("\n", " ")).toBe(STORAGE_ERROR_COPY.title);
  });
});
