import { describe, expect, test } from "bun:test";
import { createPresenter } from "./presentation";

/** A presenter on a fake clock: `advance(ms)` runs due timers in order. */
function rig(settleMs = 80) {
  let t = 0;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const p = createPresenter({
    now: () => t,
    setTimer: (fn, ms) => {
      seq += 1;
      timers.set(seq, { at: t + ms, fn });
      return seq;
    },
    clearTimer: (h) => void timers.delete(h as number),
    settleMs,
  });
  const advance = (ms: number) => {
    const end = t + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      t = due[1].at;
      due[1].fn();
    }
    t = end;
  };
  return { p, advance };
}

describe("presenter: one root sheet at a time", () => {
  test("a free screen presents at once", () => {
    const { p } = rig();
    const shown: string[] = [];
    p.request("a", () => shown.push("a"));
    expect(shown).toEqual(["a"]);
    expect(p.holder()).toBe("a");
  });

  test("Import > Replace: the confirm waits until the import sheet has left, then a settle", () => {
    const { p, advance } = rig(80);
    const shown: string[] = [];
    p.request("import", () => shown.push("import"));
    // choose('replace'): the import sheet closes and confirm() asks at once.
    p.request("confirm", () => shown.push("confirm"));
    expect(shown).toEqual(["import"]);
    advance(220); // the exit animation; iOS has not reported the dismissal yet
    expect(shown).toEqual(["import"]);
    p.release("import"); // Modal onDismiss
    expect(shown).toEqual(["import"]);
    advance(79);
    expect(shown).toEqual(["import"]);
    advance(1);
    expect(shown).toEqual(["import", "confirm"]);
    expect(p.holder()).toBe("confirm");
  });

  test("every later confirm still presents (nothing stays stuck)", () => {
    const { p, advance } = rig(80);
    const shown: string[] = [];
    for (const id of ["c1", "c2", "c3"]) {
      p.request(id, () => shown.push(id));
      advance(300);
      p.release(id);
      advance(100);
    }
    expect(shown).toEqual(["c1", "c2", "c3"]);
    expect(p.holder()).toBeNull();
  });

  test("requests are served in order; a cancelled one is skipped", () => {
    const { p, advance } = rig(0);
    const shown: string[] = [];
    p.request("a", () => shown.push("a"));
    p.request("b", () => shown.push("b"));
    const cancelC = p.request("c", () => shown.push("c"));
    p.request("d", () => shown.push("d"));
    cancelC();
    p.release("a");
    advance(0);
    p.release("b");
    advance(0);
    expect(shown).toEqual(["a", "b", "d"]);
  });

  test("a sheet reopened while it still holds the screen keeps its turn", () => {
    const { p } = rig();
    let opened = 0;
    p.request("a", () => opened++);
    p.request("a", () => opened++);
    expect(opened).toBe(2);
    expect(p.holder()).toBe("a");
  });

  test("releasing a sheet that never got its turn drops its request and frees nothing else", () => {
    const { p, advance } = rig(0);
    const shown: string[] = [];
    p.request("a", () => shown.push("a"));
    p.request("b", () => shown.push("b"));
    p.release("b");
    p.release("zzz");
    expect(p.holder()).toBe("a");
    p.release("a");
    advance(0);
    expect(shown).toEqual(["a"]);
    expect(p.holder()).toBeNull();
  });

  test("hold() keeps the next sheet back while a system sheet (document picker) leaves", () => {
    const { p, advance } = rig(80);
    const shown: string[] = [];
    p.hold(500);
    p.request("import", () => shown.push("import"));
    advance(499);
    expect(shown).toEqual([]);
    advance(1);
    expect(shown).toEqual(["import"]);
  });

  test("the top layer is the last sheet mounted; toasts follow it back to the root", () => {
    const { p } = rig();
    let changes = 0;
    const off = p.subscribe(() => changes++);
    expect(p.top()).toBeNull();
    p.layerIn("menu");
    p.layerIn("nested");
    expect(p.top()).toBe("nested");
    p.layerIn("nested");
    p.layerOut("nested");
    expect(p.top()).toBe("menu");
    p.layerOut("menu");
    p.layerOut("menu");
    expect(p.top()).toBeNull();
    expect(changes).toBe(4);
    off();
    p.layerIn("x");
    expect(changes).toBe(4);
  });
});
