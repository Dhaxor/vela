// useSoundscape: one looping expo-audio bed inside the reader (R6).
//
// start() fades in over BED_FADES.start, duck(true/false) moves between
// 'underSpeech' and 'gap' (holding under speech through the short pauses
// between sentences, so it never pumps), fadeOut() rides the sleep timer, and
// switching bedId crossfades. Every bed player keeps the audio session
// active: by default expo-audio deactivates the shared iOS session when its
// last player pauses, which would silence narration still speaking over it.
// While a bed plays it is watched (soundscapes.ts watchBed): when the system
// pauses it (headphones out, a call), it stops and opts.onInterrupted fires,
// so the reader can pause the voice that iOS would let carry on aloud.

import { useEffect, useMemo, useRef, useState } from "react";
import { claimChapterSession } from "./session";
import {
  BED_WATCH_INTERVAL_MS,
  BED_WATCH_START,
  bedAsset,
  bedVolume,
  fadeLevel,
  watchBed,
  DUCK_RELEASE_MS,
  type BedLevel,
  type BedReading,
} from "./soundscapes";
import {
  BED_FADES,
  BED_LEVELS,
  type BedId,
  type SoundscapeController,
  type SoundscapeStatus,
  type UseSoundscape,
} from "./types";

type Player = import("expo-audio").AudioPlayer;

const FADE_STEP_MS = 33;
const LOAD_TIMEOUT_MS = 8000;

/** One looping player and its volume ramp. A new ramp cancels the running one (its promise resolves). */
class Bed {
  private ramp: { timer: ReturnType<typeof setInterval>; done: () => void } | null = null;

  private constructor(
    readonly id: BedId,
    private readonly player: Player
  ) {}

  static create(id: BedId): Bed | null {
    try {
      const { createAudioPlayer } = require("expo-audio") as typeof import("expo-audio");
      const player = createAudioPlayer(bedAsset(id), { keepAudioSessionActive: true });
      player.loop = true;
      player.volume = 0;
      return new Bed(id, player);
    } catch {
      return null;
    }
  }

  play(): void {
    this.player.play();
  }

  /** What the player says it is doing right now. */
  reading(): BedReading {
    try {
      return { playing: this.player.playing, buffering: this.player.isBuffering, loaded: this.player.isLoaded };
    } catch {
      // released under us: never read as an interruption
      return { playing: false, buffering: false, loaded: false };
    }
  }

  /** Resolves true once the file is decodable, false on error or timeout. */
  loaded(): Promise<boolean> {
    if (this.player.isLoaded) return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        subscription.remove();
        clearTimeout(timeout);
        resolve(ok);
      };
      const subscription = this.player.addListener("playbackStatusUpdate", (status) => {
        if (status.isLoaded) finish(true);
        else if ((status as { error?: string }).error) finish(false);
      });
      const timeout = setTimeout(() => finish(this.player.isLoaded), LOAD_TIMEOUT_MS);
    });
  }

  fadeTo(target: number, ms: number): Promise<void> {
    this.cancelRamp();
    const from = this.player.volume;
    if (ms <= 0 || Math.abs(from - target) < 0.001) {
      this.player.volume = target;
      return Promise.resolve();
    }
    const startedAt = Date.now();
    return new Promise((done) => {
      const timer = setInterval(() => {
        const progress = (Date.now() - startedAt) / ms;
        this.player.volume = fadeLevel(from, target, progress);
        if (progress >= 1) this.cancelRamp();
      }, FADE_STEP_MS);
      this.ramp = { timer, done };
    });
  }

  release(): void {
    this.cancelRamp();
    try {
      this.player.pause();
      this.player.remove();
    } catch {
      // already released
    }
  }

  private cancelRamp(): void {
    if (!this.ramp) return;
    clearInterval(this.ramp.timer);
    const { done } = this.ramp;
    this.ramp = null;
    done();
  }
}

export const useSoundscape: UseSoundscape = (bedId, opts) => {
  const locked = opts?.locked ?? false;
  const base = opts?.volume ?? BED_LEVELS.full;
  const [status, setStatusState] = useState<SoundscapeStatus>(locked && bedId ? "locked" : "idle");

  const statusRef = useRef(status);
  const bedIdRef = useRef(bedId);
  const lockedRef = useRef(locked);
  const baseRef = useRef(base);
  const bedRef = useRef<Bed | null>(null);
  const levelRef = useRef<BedLevel>("full");
  /** Bumped by every start/stop/fade so a superseded async step never acts. */
  const epochRef = useRef(0);
  const duckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseSession = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  const watchTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onInterrupted = useRef(opts?.onInterrupted);
  onInterrupted.current = opts?.onInterrupted;

  const controller = useMemo(() => {
    const setStatus = (next: SoundscapeStatus) => {
      statusRef.current = next;
      if (mounted.current) setStatusState(next);
    };
    const holdSession = () => {
      releaseSession.current ??= claimChapterSession();
    };
    const dropSession = () => {
      releaseSession.current?.();
      releaseSession.current = null;
    };
    const target = () => bedVolume(levelRef.current, baseRef.current);
    const clearDuckTimer = () => {
      if (duckTimer.current) clearTimeout(duckTimer.current);
      duckTimer.current = null;
    };
    const stopWatch = () => {
      if (watchTimer.current) clearInterval(watchTimer.current);
      watchTimer.current = null;
    };
    /** Watch the playing bed; if the system pauses it, stop it and tell the reader. */
    const startWatch = (bed: Bed) => {
      stopWatch();
      let watch = BED_WATCH_START;
      watchTimer.current = setInterval(() => {
        if (bedRef.current !== bed || statusRef.current !== "playing") return stopWatch();
        const next = watchBed(watch, bed.reading());
        watch = next.watch;
        if (!next.interrupted) return;
        stopWatch();
        onInterrupted.current?.();
        void fadeAway(0, "fading");
      }, BED_WATCH_INTERVAL_MS);
    };

    /** Fade the current bed to silence over `ms`, then release it. */
    const fadeAway = async (ms: number, fadingStatus: SoundscapeStatus): Promise<void> => {
      const epoch = ++epochRef.current;
      clearDuckTimer();
      stopWatch();
      const bed = bedRef.current;
      if (!bed) {
        if (statusRef.current !== "locked") setStatus(bedIdRef.current ? "stopped" : "idle");
        return;
      }
      setStatus(fadingStatus);
      await bed.fadeTo(0, ms);
      if (epoch !== epochRef.current) return;
      bed.release();
      bedRef.current = null;
      dropSession();
      setStatus("stopped");
    };

    const start = async (): Promise<void> => {
      const id = bedIdRef.current;
      if (!id) return;
      if (lockedRef.current) return setStatus("locked");
      const epoch = ++epochRef.current;
      let bed = bedRef.current;
      if (bed?.id !== id) {
        bed?.release();
        bed = Bed.create(id);
        bedRef.current = bed;
      }
      if (!bed) return setStatus("unavailable");
      holdSession();
      // levelRef keeps tracking narration, so a bed started mid-chapter fades in already ducked.
      bed.play(); // inside the tap's call stack, for web autoplay rules; volume is still 0
      if (statusRef.current !== "playing" && statusRef.current !== "fading") {
        setStatus("loading");
        const ok = await bed.loaded();
        if (epoch !== epochRef.current) return;
        if (!ok) {
          bed.release();
          bedRef.current = null;
          dropSession();
          return setStatus("unavailable");
        }
      }
      setStatus("playing");
      startWatch(bed);
      await bed.fadeTo(target(), BED_FADES.start);
    };

    const duck = (ducked: boolean) => {
      clearDuckTimer();
      const retarget = (level: BedLevel, ms: number) => {
        levelRef.current = level;
        if (statusRef.current === "playing") void bedRef.current?.fadeTo(target(), ms);
      };
      if (ducked) retarget("underSpeech", BED_FADES.duck);
      else duckTimer.current = setTimeout(() => retarget("gap", BED_FADES.duck * 4), DUCK_RELEASE_MS);
    };

    return {
      start,
      stop: () => fadeAway(BED_FADES.stop, "fading"),
      duck,
      fadeOut: (ms: number = BED_FADES.sleepTimer) => fadeAway(ms, "fading"),
      /** Crossfade to a new bed: the old one fades and releases on its own while the new one fades in. */
      switchTo: (next: BedId | null) => {
        const old = bedRef.current;
        const wasAudible = statusRef.current === "playing" || statusRef.current === "loading";
        bedIdRef.current = next;
        if (!old) return setStatus(next && lockedRef.current ? "locked" : "idle");
        if (old.id === next) return;
        stopWatch();
        bedRef.current = null;
        void old.fadeTo(0, BED_FADES.stop).then(() => old.release());
        if (next && wasAudible && !lockedRef.current) void start();
        else {
          epochRef.current++;
          dropSession();
          setStatus(next && lockedRef.current ? "locked" : next ? "stopped" : "idle");
        }
      },
      retarget: () => {
        if (statusRef.current === "playing") void bedRef.current?.fadeTo(target(), BED_FADES.duck);
      },
      setLocked: (next: boolean) => {
        lockedRef.current = next;
        if (next && bedRef.current) void fadeAway(BED_FADES.stop, "fading").then(() => setStatus("locked"));
        else if (!bedRef.current && bedIdRef.current) setStatus(next ? "locked" : "idle");
      },
      mount: () => {
        mounted.current = true;
      },
      unmount: () => {
        mounted.current = false;
        clearDuckTimer();
        stopWatch();
        epochRef.current++;
        const bed = bedRef.current;
        bedRef.current = null;
        if (bed) void bed.fadeTo(0, BED_FADES.stop).then(() => bed.release());
        dropSession();
      },
    };
  }, []);

  useEffect(() => {
    if (bedId !== bedIdRef.current) controller.switchTo(bedId);
  }, [bedId, controller]);

  useEffect(() => {
    if (locked !== lockedRef.current) controller.setLocked(locked);
  }, [locked, controller]);

  useEffect(() => {
    baseRef.current = base;
    controller.retarget();
  }, [base, controller]);

  useEffect(() => {
    controller.mount();
    return controller.unmount;
  }, [controller]);

  return {
    bedId,
    status,
    start: controller.start,
    stop: controller.stop,
    duck: controller.duck,
    fadeOut: controller.fadeOut,
  } satisfies SoundscapeController;
};
