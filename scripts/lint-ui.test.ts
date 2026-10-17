import { describe, expect, test } from "bun:test";
import { hasText, lintSource, stripComments } from "./lint-ui.mjs";

type Finding = { rule: string; line: number };
const rules = (src: string) => (lintSource(src) as Finding[]).map((f) => `${f.rule}@${f.line}`);

describe("lint-ui rules", () => {
  test("hex, fontSize, fontWeight, fontStyle and Alert.alert", () => {
    const src = [
      'const a = { color: "#E9B44C" };',
      "const b = { fontSize: 17 };",
      'const c = { fontWeight: "600", fontStyle: "italic" };',
      'Alert.alert("Delete?");',
    ].join("\n");
    expect(rules(src)).toEqual(["hex@1", "fontSize@2", "fontWeight@3", "fontStyle@3", "alert@4"]);
  });

  test("tokens, fontFamily and testIDs that look like hex are fine", () => {
    const src = [
      "const a = { color: colors.gold300, fontFamily: fonts.serif };",
      'const id = "#section"; const t = "#E9B44C is gold";',
      "const s = { ...typeScale.caption };",
    ].join("\n");
    expect(rules(src)).toEqual([]);
  });

  test("comments never count", () => {
    const src = ['// fontSize: 12 and "#FFF"', "/* Alert.alert(x) */", 'const u = "http://x"; // fontWeight: 1'].join("\n");
    expect(rules(src)).toEqual([]);
    expect(stripComments('a // b\nc').split("\n").length).toBe(2);
  });
});

describe("lucide barrel imports", () => {
  test("the barrel is flagged however it is loaded; per-icon files and the glyphs module pass", () => {
    expect(rules('import { X } from "lucide-react-native";')).toEqual(["iconBarrel@1"]);
    expect(rules("const L = require('lucide-react-native');")).toEqual(["iconBarrel@1"]);
    expect(rules('const L = await import("lucide-react-native");')).toEqual(["iconBarrel@1"]);
    expect(rules('export { default as X } from "lucide-react-native/icons/x";')).toEqual([]);
    expect(rules('import { X } from "@/components/glyphs/icons";')).toEqual([]);
    expect(rules('// import { X } from "lucide-react-native";')).toEqual([]);
  });
});

describe("icon-only touchables", () => {
  test("an icon with no label is flagged, on the opening tag's line", () => {
    const src = ["<View>", "  <TouchableOpacity onPress={go}>", "    <Settings size={22} />", "  </TouchableOpacity>", "</View>"].join("\n");
    expect(rules(src)).toEqual(["a11y@2"]);
  });

  test("a label, visible text, a {label} expression or a labelled button child pass", () => {
    expect(rules('<Pressable accessibilityLabel="Settings" onPress={go}><Settings /></Pressable>')).toEqual([]);
    expect(rules("<TouchableOpacity onPress={go}><Text>Save</Text></TouchableOpacity>")).toEqual([]);
    expect(rules('<Pressable onPress={go}><Icon /><T variant="body">Save</T></Pressable>')).toEqual([]);
    expect(rules("<Pressable onPress={go}>{label}</Pressable>")).toEqual([]);
    expect(rules("<Pressable {...rest}><Icon /></Pressable>")).toEqual([]);
  });

  test("self-closing touchables need a label; nested touchables are judged separately", () => {
    expect(rules("<Pressable style={s.backdrop} onPress={close} />")).toEqual(["a11y@1"]);
    const nested = ["<Pressable onPress={a}>", "  <Text>Row</Text>", "  <Pressable onPress={b}><X /></Pressable>", "</Pressable>"].join("\n");
    expect(rules(nested)).toEqual(["a11y@3"]);
  });

  test("attribute values with '>' don't end the tag early", () => {
    expect(rules('<Pressable onPress={() => go(a > b)} accessibilityLabel="Next"><Arrow /></Pressable>')).toEqual([]);
  });

  test("hasText ignores JSX-only expressions", () => {
    expect(hasText("{busy ? <Spinner /> : <Icon />}")).toBe(false);
    expect(hasText("  \n  ")).toBe(false);
    expect(hasText("Continue")).toBe(true);
  });
});
