// Every text field the user types in is one the keyboard can't hide (iOS):
// - it is a TextField or a SkyWriting page, the two inputs that ask their
//   host to keep them above the keyboard and the dock (revealFocusedInput);
// - it lives in a host that can move it: a scrolling <Screen> (never
//   scroll={false}) or a <Sheet scroll>, whose body gives way on a small
//   phone instead of pushing the title and the field off the top.
// A source audit, so a new screen or sheet can't quietly bring the bug back.
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..", "..");
const INPUT_PRIMITIVES = new Set(["components/ui/TextField.tsx", "components/feature/rituals/SkyWriting.tsx"]);

function sources(): { rel: string; src: string }[] {
  const out: { rel: string; src: string }[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules" && !e.name.startsWith(".") && e.name !== "dev") walk(p);
      } else if (/\.tsx$/.test(e.name) && !/\.test\./.test(e.name)) {
        out.push({ rel: path.relative(ROOT, p).split(path.sep).join("/"), src: fs.readFileSync(p, "utf8") });
      }
    }
  };
  walk(path.join(ROOT, "app"));
  walk(path.join(ROOT, "components"));
  return out;
}

/** Each <Sheet …>…</Sheet> in a file (sheets in this codebase never nest inside one another's JSX). */
function sheets(src: string): string[] {
  const out: string[] = [];
  const re = /<Sheet\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const end = src.indexOf("</Sheet>", m.index);
    out.push(src.slice(m.index, end === -1 ? undefined : end));
  }
  return out;
}

const FIELD = /<(TextField|SkyWriting|DesireField|SeedField)\b/;

describe("keyboard audit: no field the keyboard can hide", () => {
  const files = sources();

  test("the audit sees the app (sanity)", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => f.rel === "app/onboarding.tsx")).toBe(true);
  });

  test("only TextField and SkyWriting render a raw <TextInput>", () => {
    // A JSX <TextInput …>, not a useRef<TextInput>() type argument.
    const raw = files.filter((f) => !INPUT_PRIMITIVES.has(f.rel) && /<TextInput(\s|\/>)/.test(f.src)).map((f) => f.rel);
    expect(raw).toEqual([]);
  });

  test("both input primitives ask to be revealed on focus and as they grow", () => {
    for (const rel of INPUT_PRIMITIVES) {
      const src = files.find((f) => f.rel === rel)?.src ?? "";
      expect(src).toContain('revealFocusedInput("start")');
      expect(src).toContain('revealFocusedInput("end", e.nativeEvent.contentSize.height)');
    }
  });

  test("every sheet with a text field scrolls", () => {
    const bad: string[] = [];
    for (const f of files) {
      for (const sheet of sheets(f.src)) {
        const field = sheet.search(FIELD);
        if (field === -1) continue;
        const props = sheet.slice(0, field);
        if (!/\n\s*scroll\s*\n|\sscroll(?=[\s>])|scroll=\{true\}/.test(props)) bad.push(`${f.rel}: ${sheet.slice(0, 80).replace(/\s+/g, " ")}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test("no non-scrolling Screen holds a text field", () => {
    const bad = files.filter((f) => /<Screen\b[^>]*scroll=\{false\}/.test(f.src) && FIELD.test(f.src) && !/<Sheet\b/.test(f.src)).map((f) => f.rel);
    expect(bad).toEqual([]);
  });

  test("Screen and Sheet both keep the focused field in view", () => {
    for (const rel of ["components/ui/Screen.tsx", "components/ui/Sheet.tsx"]) {
      expect(files.find((f) => f.rel === rel)?.src ?? "").toContain("useKeyboardReveal(");
    }
  });
});
