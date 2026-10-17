// First Light onboarding, the additional-dream intake and the Weave (S1).
export { FIRST_LIGHT_ID, stageFirstLight, stagedFirstLight, clearFirstLight, type FirstLightDraft } from "./firstLight";
export { TIME_PRESETS, DEFAULT_PRESET, toHHmm, fromHHmm, slotsFor, formatPreset, type RitualSlot } from "./ritualTimes";
export { SailProgress, type SailProgressProps } from "./SailProgress";
export { StepTopBar, type StepTopBarProps } from "./StepTopBar";
export { StepIntro, type StepIntroProps } from "./StepIntro";
export { DrawnVelaMark, type DrawnVelaMarkProps } from "./DrawnVelaMark";
export { FocusGrid, type FocusGridProps } from "./FocusGrid";
export { toggleFocus, wordPieces, MAX_WORD_PIECES } from "./logic";
export { FocusChips, DesireField, FeelingChips, type FocusChipsProps, type DesireFieldProps, type FeelingChipsProps } from "./DreamFields";
export { RitualPicker, RitualGlyph, type RitualPickerProps } from "./RitualPicker";
export { WeaveStage, WEAVE_TIMING, type WeaveMode, type WeaveStageProps } from "./weave/WeaveStage";
export { useWeaveModel, type WeaveModel } from "./weave/useWeaveModel";
export { SeedField, type SeedFieldProps } from "./SeedField";
