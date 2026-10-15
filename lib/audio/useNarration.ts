// useNarration: the expo-speech seam over the pure queue in narration.ts.
//
// R1  play() hands the WHOLE remaining chapter to Speech.speak in one go, one
//     utterance per sentence; the platform queues them natively, so narration
//     keeps going with the screen locked. No JS timers between sentences.
// R2  The highlight moves only on each utterance's onStart/onDone.
// Pause = stop + re-queue from the current sentence (Speech.pause is missing
//     on Android, and on web it drops expo-speech's callbacks).
// Web: expo-speech wraps Web Speech; onstart/onend/onerror fire there, and
//     cancel() fires errors for every queued utterance. A generation number
//     on each queue makes those stale callbacks harmless.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  estimateRangeMs,
  firstSentenceOfParagraph,
  initialQueue,
  queueProgress,
  reduceQueue,
  resumeIndex,
  segmentChapter,
  sleepDeadline,
  sleepRemainingMs,
  type NarrationQueue,
  type QueueEvent,
} from "./narration";
import { claimChapterSession } from "./session";
import type { NarrationController, NarrationRate, RankedVoice, SleepTimer, UseNarration } from "./types";
import { pickVoice, rankVoices } from "./voices";

type Speech = typeof import("expo-speech");

const SLEEP_OFF: SleepTimer = { kind: "off" };

/** expo-speech, or null where speech cannot work (web without speechSynthesis). */
function loadSpeech(): Speech | null {
  try {
    const { Platform } = require("react-native") as typeof import("react-native");
    if (Platform.OS === "web" && (typeof window === "undefined" || !("speechSynthesis" in window))) return null;
    return require("expo-speech") as Speech;
  } catch {
    return null;
  }
}

/** The device locale when it is English (so an en-GB phone prefers British voices), else en-US. */
function preferredLanguage(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.toLowerCase().startsWith("en") ? locale : "en-US";
  } catch {
    return "en-US";
  }
}

export const useNarration: UseNarration = (chapter, opts) => {
  const { daypart, name, pronunciation } = opts;
  // Keyed on id + revision, not identity, so a re-fetched copy of the same chapter does not reset playback.
  const chapterKey = chapter ? `${chapter.id}#${chapter.revision}` : null;
  const sentences = useMemo(
    () => (chapter ? segmentChapter(chapter, daypart, { name, pronunciation }) : []),
    [chapterKey, daypart, name, pronunciation]
  );

  const optsRef = useRef(opts);
  optsRef.current = opts;
  const speechRef = useRef<Speech | null | undefined>(undefined);
  const speech = (): Speech | null => {
    if (speechRef.current === undefined) speechRef.current = loadSpeech();
    return speechRef.current;
  };

  const queueRef = useRef<NarrationQueue>(initialQueue(sentences.length));
  const [queue, setQueue] = useState(queueRef.current);
  const apply = useCallback((event: QueueEvent): NarrationQueue => {
    queueRef.current = reduceQueue(queueRef.current, event);
    setQueue(queueRef.current);
    return queueRef.current;
  }, []);

  const [rate, setRateState] = useState<NarrationRate>(opts.rate);
  const rateRef = useRef(rate);
  const [voiceId, setVoiceIdState] = useState<string | null>(opts.voiceId);
  const voiceIdRef = useRef(voiceId);
  const [voices, setVoices] = useState<RankedVoice[]>([]);
  const voicesRef = useRef(voices);
  const [sleepTimer, setSleepTimerState] = useState<SleepTimer>(opts.sleepTimer ?? SLEEP_OFF);
  const sleepTimerRef = useRef(sleepTimer);
  const [deadline, setDeadline] = useState<number | null>(null);
  const deadlineRef = useRef(deadline);
  const [clock, setClock] = useState(() => Date.now());
  /** A rate/voice change waits for the current sentence to finish, then re-queues the rest. */
  const requeuePending = useRef(false);
  const releaseSession = useRef<(() => void) | null>(null);
  /** Last value sent to onSpeakingChange, so 'false' is only ever sent after 'true'. */
  const speakingSent = useRef(false);
  const signalSpeaking = (speaking: boolean) => {
    if (speakingSent.current === speaking) return;
    speakingSent.current = speaking;
    optsRef.current.onSpeakingChange?.(speaking);
  };

  const holdSession = () => {
    releaseSession.current ??= claimChapterSession();
  };
  const dropSession = () => {
    releaseSession.current?.();
    releaseSession.current = null;
  };
  const silence = () => {
    requeuePending.current = false;
    signalSpeaking(false);
    dropSession();
  };

  const armSleepTimer = (timer: SleepTimer) => {
    sleepTimerRef.current = timer;
    setSleepTimerState(timer);
    deadlineRef.current = sleepDeadline(timer, Date.now());
    setDeadline(deadlineRef.current);
    setClock(Date.now());
  };

  /** The sleep timer ran out: stop where we are (resume continues from here) and let the reader fade the bed. */
  const endBySleep = () => {
    if (queueRef.current.status === "playing") {
      apply({ type: "pause" });
      void speech()?.stop();
      silence();
    }
    armSleepTimer(SLEEP_OFF);
    optsRef.current.onSleepTimerEnd?.();
  };
  const sleepExpired = () => deadlineRef.current !== null && Date.now() >= deadlineRef.current;

  const enqueue = (from: number) => {
    const tts = speech();
    if (!tts) {
      apply({ type: "unavailable" });
      return;
    }
    requeuePending.current = false;
    void tts.stop();
    const q = apply({ type: "enqueue", from });
    if (q.status !== "playing") return;
    const generation = q.generation;
    const voice = pickVoice(voicesRef.current, voiceIdRef.current);
    holdSession();
    for (let index = q.position; index < sentences.length; index++) {
      tts.speak(sentences[index].ttsText, {
        rate: rateRef.current,
        // Only a voice from the platform's own list: an unknown identifier makes iOS reject the utterance.
        voice: voice?.identifier,
        language: voice?.language ?? "en-US",
        useApplicationAudioSession: true,
        onStart: () => onStart(generation, index),
        onDone: () => onDone(generation, index),
        onError: () => onError(generation, index),
      });
    }
  };

  const onStart = (generation: number, index: number) => {
    const before = queueRef.current;
    if (apply({ type: "start", generation, index }) === before) return;
    if (sleepExpired()) return endBySleep();
    signalSpeaking(true);
  };

  const onDone = (generation: number, index: number) => {
    const before = queueRef.current;
    const q = apply({ type: "done", generation, index });
    if (q === before) return;
    signalSpeaking(false);
    if (!before.heardReached && q.heardReached) optsRef.current.onHeard?.();
    if (q.status === "finished") {
      silence();
      optsRef.current.onFinished?.();
      if (sleepTimerRef.current.kind === "end-of-chapter") endBySleep();
      return;
    }
    if (sleepExpired()) return endBySleep();
    if (requeuePending.current) enqueue(index + 1);
  };

  const onError = (generation: number, index: number) => {
    const before = queueRef.current;
    if (apply({ type: "error", generation, index }) === before) return;
    void speech()?.stop();
    silence();
  };

  /** Rate and voice changes apply from the next sentence; between sentences, at once. */
  const applyFromNextSentence = () => {
    const q = queueRef.current;
    if (q.status !== "playing") return;
    if (q.speaking) requeuePending.current = true;
    else enqueue(q.position);
  };

  // A new chapter, daypart, name or pronunciation: stop and start over on the new text.
  useEffect(() => {
    if (queueRef.current.status === "playing") void speech()?.stop();
    silence();
    const fresh = initialQueue(sentences.length, queueRef.current.generation + 1);
    queueRef.current = speech() ? fresh : reduceQueue(fresh, { type: "unavailable" });
    setQueue(queueRef.current);
  }, [sentences]);

  // Voices: loaded once; on web they can arrive late (voiceschanged), on Android/iOS at once.
  useEffect(() => {
    let alive = true;
    speech()
      ?.getAvailableVoicesAsync()
      .then((list) => {
        if (!alive) return;
        voicesRef.current = rankVoices(list, preferredLanguage());
        setVoices(voicesRef.current);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Profile changes made elsewhere (Settings) flow in like the controller's own setters.
  useEffect(() => {
    if (opts.rate === rateRef.current) return;
    rateRef.current = opts.rate;
    setRateState(opts.rate);
    applyFromNextSentence();
  }, [opts.rate]);
  useEffect(() => {
    if (opts.voiceId === voiceIdRef.current) return;
    voiceIdRef.current = opts.voiceId;
    setVoiceIdState(opts.voiceId);
    applyFromNextSentence();
  }, [opts.voiceId]);
  useEffect(() => {
    if (opts.sleepTimer) armSleepTimer(opts.sleepTimer);
  }, [opts.sleepTimer?.kind, opts.sleepTimer?.kind === "minutes" ? opts.sleepTimer.minutes : 0]);

  // Sleep countdown: a 1 s display tick that also ends the session (the bed may play on after narration).
  useEffect(() => {
    if (deadline === null) return;
    const tick = setInterval(() => {
      setClock(Date.now());
      if (sleepExpired()) endBySleep();
    }, 1000);
    return () => clearInterval(tick);
  }, [deadline]);

  useEffect(
    () => () => {
      if (queueRef.current.status === "playing") void speechRef.current?.stop();
      dropSession();
    },
    []
  );

  const play = (fromIndex?: number) => {
    const q = queueRef.current;
    if (fromIndex === undefined && q.status === "playing") return;
    enqueue(fromIndex ?? resumeIndex(q));
  };
  const pause = () => {
    if (queueRef.current.status !== "playing") return;
    apply({ type: "pause" });
    void speech()?.stop();
    silence();
  };
  const resume = () => {
    const q = queueRef.current;
    if (q.status !== "playing") enqueue(resumeIndex(q));
  };
  const stop = () => {
    const wasPlaying = queueRef.current.status === "playing";
    apply({ type: "stop" });
    if (wasPlaying) void speech()?.stop();
    silence();
  };
  const seekToParagraph = (paragraphIndex: number) => {
    const index = firstSentenceOfParagraph(sentences, paragraphIndex);
    if (index < 0) return;
    if (queueRef.current.status === "playing") enqueue(index);
    else apply({ type: "seek", index });
  };
  const setRate = (next: NarrationRate) => {
    if (next === rateRef.current) return;
    rateRef.current = next;
    setRateState(next);
    applyFromNextSentence();
  };
  const setVoice = (identifier: string | null) => {
    if (identifier === voiceIdRef.current) return;
    voiceIdRef.current = identifier;
    setVoiceIdState(identifier);
    applyFromNextSentence();
  };

  const current = queue.current === null ? null : sentences[queue.current] ?? null;
  return {
    status: queue.status,
    sentences,
    current,
    progress: queueProgress(queue),
    estimatedTotalMs: estimateRangeMs(sentences, rate),
    estimatedElapsedMs: estimateRangeMs(sentences, rate, 0, Math.min(queue.position, sentences.length)),
    sleepRemainingMs: sleepRemainingMs(deadline, clock),
    rate,
    voice: pickVoice(voices, voiceId),
    voices,
    play,
    pause,
    resume,
    stop,
    seekToParagraph,
    setRate,
    setVoice,
    setSleepTimer: armSleepTimer,
  } satisfies NarrationController;
};

