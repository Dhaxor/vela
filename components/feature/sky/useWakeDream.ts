// 'Wake this dream' / 'Keep this dream weaving' wherever a resting or
// plan-locked dream offers its next step (the sky and the season's end), with
// the same rule and words as Today's card: on the free plan one dream weaves
// at a time, so waking one rests the other, and that is confirmed first.
import { useArc } from "@/contexts/ArcContext";
import { usePlus } from "@/contexts/PlusContext";
import type { Dream } from "@/contexts/arc.types";
import { dreamName } from "@/lib/dreams";
import { wakeNeedsConfirm } from "@/lib/purchase";
import { haptics, useConfirm, useToast } from "@/components/ui";

export function useWakeDream(): (dream: Dream) => Promise<boolean> {
  const arc = useArc();
  const plus = usePlus();
  const confirm = useConfirm();
  const toast = useToast();
  return async (dream) => {
    const otherActive = arc.dreams.find((d) => d.id !== dream.id && d.status === "active");
    if (dream.status === "resting" && wakeNeedsConfirm(plus.isPlus, otherActive)) {
      const ok = await confirm({
        title: "Wake this dream?",
        message: `On the free plan one dream weaves at a time, so ${dreamName(otherActive, 3)} will rest. Every chapter stays readable.`,
        confirmLabel: "Wake it",
      });
      if (!ok) return false;
    }
    try {
      await arc.setActiveDream(dream.id);
      haptics.success();
      toast.show({ message: `${dreamName(dream, 3)} is weaving again.`, tone: "proof" });
      return true;
    } catch {
      toast.show({ message: "That didn’t work. Try again in a moment.", tone: "error" });
      return false;
    }
  };
}
