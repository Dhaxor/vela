// UI barrel: the ONLY import path for UI primitives in screens
// ("@/components/ui"), with "@/components/sky" and "@/components/glyphs".
//
// Rules for screens (scripts/lint-ui.mjs enforces the mechanical ones):
// - Text only through <T variant>. No fontSize/fontWeight/fontStyle, no hex.
// - Every screen is a <Screen> (it owns the sky). One filled CTA per viewport:
//   PrimaryButton (gold, the future) or BridgeButton (violet, the loop's act).
// - No Alert.alert: useConfirm() / <ConfirmSheet>, useToast().
// - Icon-only controls are <IconButton accessibilityLabel>. Every control gets a testID.
export { T, UserWords, stripQuotes, familyFor, type TProps, type TTone, type UserWordsProps } from "./T";
export { Screen, useGutter, type ScreenProps } from "./Screen";
export { Header, type HeaderProps } from "./Header";
export { Dock, type DockProps } from "./Dock";
export {
  PrimaryButton,
  BridgeButton,
  SecondaryButton,
  GhostButton,
  DangerButton,
  IconButton,
  type ButtonProps,
  type GhostButtonProps,
  type IconButtonProps,
} from "./Buttons";
export { Press, type PressProps } from "./Press";
export { VellumCard, CheckBadge, type VellumCardProps, type CardPadding } from "./VellumCard";
export { GildedPlate, type GildedPlateProps } from "./GildedPlate";
export { StoredPhoto, type StoredPhotoProps } from "./StoredPhoto";
export { MISSING_PHOTO_COPY, missingPhotoLayout, type MissingPhotoLayout } from "./storedPhotoLayout";
export { TAB_BAR_PARTS, TAB_LABEL_MAX_SCALE, tabBarHeight, tabLabelLineHeight } from "./tabBar";
export {
  Chip,
  ChipGroup,
  toggleSelection,
  type ChipProps,
  type ChipOption,
  type ChipGroupProps,
  type SingleChipGroupProps,
  type MultiChipGroupProps,
} from "./Chip";
export { TextField, type TextFieldProps } from "./TextField";
export { revealFocusedInput, useKeyboardHeight } from "./useKeyboardReveal";
export { Sheet, type SheetProps } from "./Sheet";
export { ConfirmSheet, type ConfirmSheetProps, type ConfirmSpec } from "./ConfirmSheet";
export { holdForSystemSheet } from "./presentation";
export { UIProvider, useToast, useConfirm, type ToastApi, type ToastSpec, type ToastTone, type Confirm } from "./Feedback";
export { Segmented, type SegmentedProps, type SegmentOption } from "./Segmented";
export { Switch, type SwitchProps } from "./Switch";
export { ProgressStars, stepStates, type ProgressStarsProps, type StarState } from "./ProgressStars";
export { useMotion, drift, pressSpring, type MotionPolicy } from "./motion";
export { haptics } from "./haptics";
