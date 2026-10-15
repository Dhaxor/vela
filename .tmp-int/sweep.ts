import { writeChapter, type WeaveProof } from "@/lib/story/engine";
import { matchMotifs } from "@/lib/story/motifs";
import { FOCUS_CONTENT } from "@/lib/story/content";
import type { FocusId } from "@/lib/focus";
import type { StageId } from "@/lib/story/content";

const desires: [FocusId, string][] = [
  ["career", "my own design studio, with clients who trust my eye"], ["career", "a promotion to senior designer"],
  ["love", "A loving partner who truly sees me"], ["love", "Get married next spring"], ["love", "Make new friends in my city"],
  ["abundance", "I want to be debt free"], ["abundance", "Buy a house with a garden for my kids"],
  ["health", "Run a marathon"], ["health", "Sleep through the night again"], ["confidence", "Pass my driving test"],
  ["peace", "I live by the sea"], ["peace", "Stop overthinking everything"],
];
const kinds = ["did", "moved", "learned"] as const;
const proof = (i: number): WeaveProof => ({ id: `p${i}`, kind: kinds[i % 3], text: ["Sent two emails", "Booked a call with a mentor", "Learned that mornings work best"][i % 3], dateKey: `2026-10-${String(1 + i).padStart(2, "0")}`, origin: "bridge" });
let n = 0, cum = 0, recall = 0, min = 999, max = 0, s3motifLiving = 0, s3 = 0, romancePicks = 0, romanceSlots = 0;
const romanceIds = new Set<string>();
for (const st of Object.values(FOCUS_CONTENT.love.stages)) for (const f of [...st.arrival, ...st.living]) if (f.requires?.includes("romance")) romanceIds.add(f.id);
for (const [focus, desire] of desires) {
  const motifIds = matchMotifs(desire, focus);
  for (let seed = 1; seed <= 40; seed++) for (let stage = 2 as StageId; stage <= 7; stage = (stage + 1) as StageId) {
    const total = stage + 1;
    const history = Array.from({ length: stage - 1 }, (_, i) => proof(i));
    const { chapter } = writeChapter({ chapterId: `c${seed}`, dreamId: "d", season: 1, number: stage, stage, mode: "engine", revision: 1, name: "Maya", focus, desire, feeling: "proud",
      motifIds, recentIds: [], previousIds: [], woven: proof(stage), history, totalProofs: total, seed: seed * 7919 + stage, now: new Date(2026, 9, 15, 21), todayKey: "2026-10-15" });
    n++;
    const beats = chapter.body.map((p) => p.beat);
    if (stage >= 4) { if (beats.includes("cumulative")) cum++; if (beats.includes("recall")) recall++; }
    if (stage === 3) { s3++; if (chapter.body.some((p) => p.beat === "motif" && p.fragmentId.includes("-li"))) s3motifLiving++; }
    if (focus === "love" && motifIds.some((m) => m === "partner" || m === "wedding")) { romanceSlots += 2; romancePicks += chapter.body.filter((p) => romanceIds.has(p.fragmentId)).length; }
    for (const w of [chapter.wordCount.morning, chapter.wordCount.evening]) { min = Math.min(min, w); max = Math.max(max, w); }
  }
}
const iv = desires.length * 40 * 4;
console.log({ chapters: n, words: [min, max], cumulativeIVplus: (cum / iv).toFixed(2), recallIVplus: (recall / iv).toFixed(2), stageIIImotifLiving: `${s3motifLiving}/${s3}`, romanceShare: (romancePicks / Math.max(1, romanceSlots)).toFixed(2) });
