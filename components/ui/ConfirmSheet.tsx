// The Alert.alert replacement (Alert is a no-op on web). A sheet with a
// question, one confirm action and a quiet way out. Destructive confirms use
// the danger fill; everything else uses the gold primary.
import React from "react";
import { DangerButton, GhostButton, PrimaryButton } from "./Buttons";
import { Sheet } from "./Sheet";

export interface ConfirmSpec {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface ConfirmSheetProps extends ConfirmSpec {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Buttons are `${testID}-confirm` / `${testID}-cancel`. */
  testID?: string;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Not now",
  destructive = false,
  onConfirm,
  onCancel,
  testID = "confirm-sheet",
}: ConfirmSheetProps) {
  const Confirm = destructive ? DangerButton : PrimaryButton;
  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title={title}
      subtitle={message}
      testID={testID}
      footer={
        <>
          <Confirm label={confirmLabel} onPress={onConfirm} testID={`${testID}-confirm`} />
          <GhostButton label={cancelLabel} onPress={onCancel} testID={`${testID}-cancel`} />
        </>
      }
    />
  );
}
