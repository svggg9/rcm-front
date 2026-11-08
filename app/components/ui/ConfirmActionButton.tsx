"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { RequestError } from "./RequestError";
import { Dialog } from "./Dialog";
import { toApiError } from "../../lib/apiErrors";

type Props = Omit<ComponentProps<typeof Button>, "onClick"> & {
  confirmTitle: string;
  confirmText: string;
  confirmLabel?: string;
  confirmVariant?: ComponentProps<typeof Button>["variant"];
  requireConfirmation?: boolean;
  showCancel?: boolean;
  onConfirm: () => void | Promise<void>;
};

/** The destructive callback is never called by opening or dismissing the dialog. */
export function ConfirmActionButton({ confirmTitle, confirmText, confirmLabel = "Удалить",
  requireConfirmation = true, showCancel = true, onConfirm, variant, loading, disabled, children,
  reserveLabelSpace, success, confirmVariant, ...props }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function confirm() {
    if (inFlight.current || disabled || loading) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (reason) {
      setError(toApiError(reason, "Не удалось выполнить действие — попробуйте ещё раз").message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const trigger = {
    ...props, type: "button" as const, disabled: disabled || loading || pending,
    onClick: () => { if (requireConfirmation) { setError(null); setOpen(true); } else { void confirm(); } },
  };
  return <>
    {variant ? <Button {...trigger} variant={variant} loading={loading} success={success}
      reserveLabelSpace={reserveLabelSpace}>{children}</Button> : <button {...trigger}>{children}</button>}
    {open && createPortal(<Dialog variant="confirmation" title={confirmTitle} busy={pending || loading} onClose={() => setOpen(false)}
      actions={<>{showCancel ? <Button onClick={() => setOpen(false)} disabled={pending || loading}>Отмена</Button> : null}
        <Button variant={confirmVariant ?? (variant === "danger" ? "danger" : "primary")} loading={pending || loading} disabled={disabled} onClick={() => void confirm()}>{confirmLabel}</Button></>}>
      <p>{confirmText}</p>
      {error && <RequestError variant="inline" message={error} />}
    </Dialog>, document.body)}
  </>;
}

/** Promise-based confirmation for operations whose controls already live in another panel. */
export function useConfirmation() {
  const [question, setQuestion] = useState<{ title: string; text: string; label?: string } | null>(null);
  const resolve = useRef<((value: boolean) => void) | null>(null);
  const answer = useCallback((value: boolean) => {
    resolve.current?.(value); resolve.current = null; setQuestion(null);
  }, []);
  useEffect(() => () => { resolve.current?.(false); resolve.current = null; }, []);
  const confirm = useCallback((options: { title: string; text: string; label?: string }) => {
    if (resolve.current) return Promise.resolve(false);
    return new Promise<boolean>(done => { resolve.current = done; setQuestion(options); });
  }, []);
  const confirmation = question ? createPortal(<Dialog variant="confirmation" title={question.title} onClose={() => answer(false)} actions={<>
    <Button variant="secondary" onClick={() => answer(false)}>Отмена</Button><Button variant="primary" onClick={() => answer(true)}>{question.label || "Подтвердить"}</Button>
  </>}><p>{question.text}</p></Dialog>, document.body) : null;
  return { confirm, confirmation };
}
