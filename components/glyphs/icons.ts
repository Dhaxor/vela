// The system-chrome icons Vela uses (CONTRACTS §20.4: lucide for chrome only),
// imported one file each. The "lucide-react-native" barrel re-exports all
// ~1,759 icons, and without tree shaking Metro bundles and runs every one of
// them at the first import (about a quarter of the app's Hermes bytecode, at
// cold start). Import icons from here; scripts/lint-ui.mjs bans the barrel.
// To add one: its kebab-case file is lucide-react-native/icons/<name>.
export { default as ArrowDown } from "lucide-react-native/icons/arrow-down";
export { default as ArrowRight } from "lucide-react-native/icons/arrow-right";
export { default as Check } from "lucide-react-native/icons/check";
export { default as ChevronLeft } from "lucide-react-native/icons/chevron-left";
export { default as ChevronRight } from "lucide-react-native/icons/chevron-right";
export { default as Ellipsis } from "lucide-react-native/icons/ellipsis";
export { default as ImagePlus } from "lucide-react-native/icons/image-plus";
export { default as List } from "lucide-react-native/icons/list";
export { default as Lock } from "lucide-react-native/icons/lock";
export { default as Minus } from "lucide-react-native/icons/minus";
/** lucide's old name for Ellipsis (the same file). */
export { default as MoreHorizontal } from "lucide-react-native/icons/ellipsis";
export { default as PenLine } from "lucide-react-native/icons/pen-line";
export { default as Plus } from "lucide-react-native/icons/plus";
export { default as RefreshCw } from "lucide-react-native/icons/refresh-cw";
export { default as Settings } from "lucide-react-native/icons/settings";
export { default as Share2 } from "lucide-react-native/icons/share-2";
export { default as Sparkles } from "lucide-react-native/icons/sparkles";
export { default as Square } from "lucide-react-native/icons/square";
export { default as X } from "lucide-react-native/icons/x";
