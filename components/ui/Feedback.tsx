// App-wide feedback, mounted once in the root layout:
// - useToast(): a short starlight note at the top of the screen (saved,
//   copied, a gentle error). Announced to screen readers. Drawn inside the
//   top-most open sheet when there is one (ToastHost), so it is never hidden
//   under a presented iOS Modal.
// - useConfirm(): `await confirm({...})` resolves true/false from a
//   ConfirmSheet. Together they replace every Alert.alert.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { motion } from "@/constants/theme";
import { ConfirmSheet, type ConfirmSpec } from "./ConfirmSheet";
import { ToastLayer, ToastStateCtx, toastDuration, type LiveToast, type ToastSpec, type ToastTone } from "./ToastHost";

export type { ToastSpec, ToastTone } from "./ToastHost";

export interface ToastApi {
  show: (spec: ToastSpec | string) => void;
  hide: () => void;
}

export type Confirm = (spec: ConfirmSpec) => Promise<boolean>;

const ToastCtx = createContext<ToastApi | null>(null);
const ConfirmCtx = createContext<Confirm | null>(null);

export function useToast(): ToastApi {
  const v = useContext(ToastCtx);
  if (!v) throw new Error("useToast must be used inside UIProvider");
  return v;
}

export function useConfirm(): Confirm {
  const v = useContext(ConfirmCtx);
  if (!v) throw new Error("useConfirm must be used inside UIProvider");
  return v;
}

interface PendingConfirm {
  spec: ConfirmSpec;
  resolve: (ok: boolean) => void;
}

/** After its exit, an answered ConfirmSheet unmounts, so the next confirm() always gets a fresh Modal. */
const CONFIRM_UNMOUNT_MS = motion.state + 80;

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<LiveToast | null>(null);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const seq = useRef(0);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
    },
    []
  );

  const toastApi = useMemo<ToastApi>(
    () => ({
      show: (spec) => {
        const s = typeof spec === "string" ? { message: spec } : spec;
        seq.current += 1;
        setToast({ ...s, id: seq.current });
        AccessibilityInfo.announceForAccessibility(s.message);
      },
      hide: () => setToast(null),
    }),
    []
  );

  const confirm = useCallback<Confirm>(
    (spec) =>
      new Promise<boolean>((resolve) => {
        if (unmountTimer.current) clearTimeout(unmountTimer.current);
        unmountTimer.current = null;
        setPending((prev) => {
          prev?.resolve(false);
          return { spec, resolve };
        });
        setConfirmVisible(true);
      }),
    []
  );

  const dismissToast = useCallback((id: number) => setToast((t) => (t?.id === id ? null : t)), []);
  const toastState = useMemo(() => ({ toast, onDone: dismissToast }), [toast, dismissToast]);
  // The toast's time on screen runs here, not in the layer that draws it: a sheet
  // opening or closing moves the toast between layers and must not restart it.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dismissToast(toast.id), toastDuration(toast));
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  const settle = (ok: boolean) => {
    const answered = pending;
    answered?.resolve(ok);
    setConfirmVisible(false);
    // Let the sheet slide away, then unmount it (a fresh Modal for the next question).
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    unmountTimer.current = setTimeout(() => {
      unmountTimer.current = null;
      setPending((p) => (p === answered ? null : p));
    }, CONFIRM_UNMOUNT_MS);
  };

  return (
    <ToastCtx.Provider value={toastApi}>
      <ConfirmCtx.Provider value={confirm}>
        <ToastStateCtx.Provider value={toastState}>
          {children}
          <ToastLayer layer={null} />
          {pending ? (
            <ConfirmSheet {...pending.spec} visible={confirmVisible} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
          ) : null}
        </ToastStateCtx.Provider>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}
