// The raw React contexts behind useArc(). Their own module so RitualContext's
// useProgress() can read totalStars without importing ArcContext (which itself
// sits inside RitualProvider and imports it): no circular module import.
import { createContext } from "react";
import type { ArcValue } from "./arc.types";
import type { ArcState } from "@/lib/store/arc";

export const ArcCtx = createContext<ArcValue | null>(null);

/**
 * Internal: the live state ref, for adapters that chain two actions in one
 * call (useStories().createIntent → createDream + chooseBridge) and must read
 * the state the first action produced. Screens use useArc() only.
 */
export const ArcStateCtx = createContext<{ readonly current: ArcState } | null>(null);
