"use client";

import { useCallback, useId, useState } from "react";
import { Field, getFieldDescriptionIds } from "./Field";
import { NumericInput, type NumericInputProps } from "./NumericInput";

type Props = Omit<NumericInputProps, "size"> & {
  label: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed";
  size?: "default" | "large";
};

export function NumericField({ label, error, hint, fieldVariant = "line", required, className = "", size = "default", onValidationChange, ...props }: Props) {
  const generatedId = useId();
  const controlId = props.id ?? generatedId;
  const [internalError, setInternalError] = useState("");
  const visibleError = error?.trim() || internalError;
  const validationChanged = useCallback((message: string) => {
    setInternalError(message);
    onValidationChange?.(message);
  }, [onValidationChange]);
  return <Field label={label} controlId={controlId} required={required} hint={hint} error={visibleError} variant={fieldVariant}
    size={size} disabled={props.disabled} readOnly={props.readOnly}>
    <NumericInput {...props} id={controlId} required={required} aria-required={required || undefined}
      className={`input ${visibleError ? "inputError" : ""} ${className}`.trim()}
      aria-invalid={!!error?.trim() || props["aria-invalid"] || undefined}
      aria-describedby={getFieldDescriptionIds(controlId, { hint, error: visibleError, describedBy: props["aria-describedby"] })}
      onValidationChange={validationChanged} />
  </Field>;
}
