// The words at a season's end, kept true to what the engine will do (pure,
// bun-tested). Season N+1's Chapter I weaves the season's 7th proof only when
// no chapter has woven it yet (lib/store/arc beginNextSeason, CONTRACTS §4.1):
// a season begun at First Light with a seed proof wove its 7th star into
// Chapter VII, so there is nothing left to carry and the copy must not
// promise 'written from the last step you took'.
import { STARS_PER_SEASON, type Proof } from "@/contexts/arc.types";

type SeasonProof = Pick<Proof, "starIndex" | "wovenInChapterId">;

/** Will the next season's Chapter I begin with this season's last proof? */
export function seasonCarries(seasonProofs: readonly SeasonProof[]): boolean {
  return seasonProofs.some((p) => p.starIndex === STARS_PER_SEASON && p.wovenInChapterId === null);
}

/** Today's card once the sky is named. */
export function nextSeasonCopy(season: number, carries: boolean): { readonly title: string; readonly body: string } {
  return carries
    ? { title: `Season ${season + 1} begins with what you did.`, body: "A new figure, a new Chapter I, written from the last step you took." }
    : { title: `Season ${season + 1} is ready.`, body: "A new figure and a new Chapter I, from the same dream. These seven stars stay in your sky." };
}

/** The line under a just-named sky when no unread Chapter VII is next. */
export function afterNamingLine(season: number, carries: boolean): string {
  return carries ? `Season ${season + 1} begins with what you did.` : `Season ${season + 1} is ready: a new figure and a new Chapter I.`;
}

/** A past season named late (a 1.0 season migrated whole, or one skipped): it stays where it is in the sky. */
export function pastSeasonNamedLine(season: number): string {
  return `Season ${season} keeps this name in your sky.`;
}
