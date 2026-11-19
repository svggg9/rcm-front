"use client";

import { useCallback, useId, useState } from "react";
import { Field, getFieldDescriptionIds } from "./Field";
import { NumericInput, type NumericInputProps } from "./NumericInput";
import { InsideLabelFrame } from "./InsideLabelFrame";
import insideStyles from "./InsideLabelInput.module.css";

type Props = Omit<NumericInputProps, "size"> & {
  label: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed";
  size?: "default" | "large";
  appearance?: "default" | "warm";
};

export function NumericField({ label, error, hint, fieldVariant = "line", required, className = "", size = "default", appearance = "default", onValidationChange, ...props }: Props) {
  const generatedId = useId();
  const controlId = props.id ?? generatedId;
  const [internalError, setInternalError] = useState("");
  const visibleError = error?.trim() || internalError;
  const validationChanged = useCallback((message: string) => {
    setInternalError(message);
    onValidationChange?.(message);
  }, [onValidationChange]);
  const input = <NumericInput {...props} id={controlId} required={required} aria-required={required || undefined}
      className={appearance === "warm" ? `${insideStyles.control} ${className}`.trim() : `input ${visibleError ? "inputError" : ""} ${className}`.trim()}
      aria-invalid={!!visibleError || props["aria-invalid"] || undefined}
      aria-describedby={getFieldDescriptionIds(controlId, { hint, error: visibleError, describedBy: props["aria-describedby"] })}
      onValidationChange={validationChanged} />;
  return <Field label={appearance === "warm" ? undefined : label} controlId={controlId} required={required} hint={hint} error={visibleError} variant={fieldVariant}
    size={size} disabled={props.disabled} readOnly={props.readOnly}>
    {appearance === "warm" ? <InsideLabelFrame controlId={controlId} label={label} required={required} invalid={Boolean(visibleError)} appearance="warm">{input}</InsideLabelFrame> : input}
  </Field>;
}
