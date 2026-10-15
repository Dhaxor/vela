import { describe, expect, test } from "bun:test";
import { createAudioSession } from "./session";
import { AUDIO_SESSION, type AudioSessionConfig } from "./types";

function recorder(failTimes = 0) {
  const applied: AudioSessionConfig[] = [];
  let failures = failTimes;
  const apply = async (config: AudioSessionConfig) => {
    if (failures > 0) {
      failures -= 1;
      throw new Error("audio session busy");
    }
    applied.push(config);
  };
  return { applied, apply };
}

describe("AUDIO_SESSION", () => {
  test("a chapter session is a focused listen that survives the lock screen and mute switch", () => {
    expect(AUDIO_SESSION.chapter).toEqual({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
      allowsRecording: false,
    });
  });

  test("idle never interrupts the user's own audio", () => {
    expect(AUDIO_SESSION.idle).toEqual({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
    });
  });
});

describe("createAudioSession", () => {
  test("applies a mode once; repeating it is a no-op", async () => {
    const r = recorder();
    const session = createAudioSession(r.apply);
    await session.set("idle");
    await session.set("idle");
    expect(r.applied).toEqual([AUDIO_SESSION.idle]);
    expect(session.applied()).toBe("idle");
  });

  test("a claim holds 'chapter' until released, even if 'idle' is requested meanwhile", async () => {
    const r = recorder();
    const session = createAudioSession(r.apply);
    await session.set("idle");
    const release = session.claim();
    await session.settled();
    expect(session.applied()).toBe("chapter");
    await session.set("idle");
    expect(session.applied()).toBe("chapter");
    release();
    await session.settled();
    expect(session.applied()).toBe("idle");
    expect(r.applied.map((c) => c.interruptionMode)).toEqual(["mixWithOthers", "doNotMix", "mixWithOthers"]);
  });

  test("overlapping claims (narration + bed) release only when both let go; release is idempotent", async () => {
    const session = createAudioSession(recorder().apply);
    const narration = session.claim();
    const bed = session.claim();
    narration();
    narration();
    await session.settled();
    expect(session.applied()).toBe("chapter");
    bed();
    await session.settled();
    expect(session.applied()).toBe("idle");
  });

  test("a failing platform call never throws and is retried on the next change", async () => {
    const r = recorder(1);
    const session = createAudioSession(r.apply);
    await expect(session.set("chapter")).resolves.toBeUndefined();
    expect(session.applied()).toBeNull();
    await session.set("chapter");
    expect(session.applied()).toBe("chapter");
    expect(r.applied).toEqual([AUDIO_SESSION.chapter]);
  });

  test("rapid changes apply in order and the last one wins", async () => {
    const r = recorder();
    const session = createAudioSession(r.apply);
    void session.set("chapter");
    void session.set("idle");
    await session.set("chapter");
    expect(session.applied()).toBe("chapter");
    expect(r.applied.at(-1)).toEqual(AUDIO_SESSION.chapter);
  });
});
