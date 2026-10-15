// What makes a sky personal: the user's seed, the active dream's focus (the
// horizon tint) and whether they keep a morning ritual (a dawn hint). The root
// layout feeds it from the profile and the arc; <Screen> reads it. Components
// never reach into contexts/** themselves.
import React, { createContext, useContext, useMemo } from "react";
import type { FocusId } from "@/lib/focus";
import { DEFAULT_SKY_SEED } from "@/lib/sky/starfield";

export interface SkyIdentity {
  readonly seed: number;
  readonly focus: FocusId | null;
  readonly dawn: boolean;
}

const DEFAULT_SKY: SkyIdentity = { seed: DEFAULT_SKY_SEED, focus: null, dawn: false };

const Ctx = createContext<SkyIdentity>(DEFAULT_SKY);

export function SkyProvider({ seed, focus, dawn, children }: Partial<SkyIdentity> & { children: React.ReactNode }) {
  const value = useMemo<SkyIdentity>(
    () => ({ seed: seed ?? DEFAULT_SKY.seed, focus: focus ?? null, dawn: dawn ?? false }),
    [seed, focus, dawn]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSky(): SkyIdentity {
  return useContext(Ctx);
}
