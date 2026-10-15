// Motion policy in one hook. Every animated primitive asks it before moving.
// - Reduce Motion (OS setting): ambient motion off, the sky fully static,
//   transitions become plain crossfades.
// - Still mode (lib/still, web screenshots): everything renders at its end state.
import { Easing, useReducedMotion } from "react-native-reanimated";
import { isStill } from "@/lib/still";
import { motion } from "@/constants/theme";

export interface MotionPolicy {
  /** OS Reduce Motion is on. */
  readonly reduced: boolean;
  /** Still mode: render end states, no timers. */
  readonly still: boolean;
  /** Ambient and decorative motion may run (twinkle, drift, press springs). */
  readonly ambient: boolean;
  /** Transitions may move (slide, rise, draw). False → crossfade or end state. */
  readonly transitions: boolean;
}

export function useMotion(): MotionPolicy {
  const reduced = useReducedMotion();
  const still = isStill();
  return {
    reduced,
    still,
    ambient: !reduced && !still,
    transitions: !reduced && !still,
  };
}

/** The "drift" curve: Easing.bezier(0.22, 1, 0.36, 1). */
export const drift = Easing.bezier(...motion.drift);

/** Press spring: damping 18, stiffness 160. */
export const pressSpring = { damping: motion.press.damping, stiffness: motion.press.stiffness } as const;
