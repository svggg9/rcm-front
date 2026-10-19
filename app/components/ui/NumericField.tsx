import { useId } from "react";
import { Field } from "./Field";
import { NumericInput, type NumericInputProps } from "./NumericInput";

type Props = NumericInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed";
};

export function NumericField({ label, error, hint, fieldVariant = "line", required, className = "", ...props }: Props) {
  const errorId = useId();
  const visibleError = error?.trim();
  return <Field label={label} required={required} hint={hint} variant={fieldVariant}>
    <NumericInput {...props} required={required} aria-required={required || undefined}
      className={`input ${visibleError ? "inputError" : ""} ${className}`.trim()}
      aria-invalid={!!visibleError || props["aria-invalid"] || undefined}
      aria-describedby={[props["aria-describedby"], visibleError ? errorId : null].filter(Boolean).join(" ") || undefined} />
    {visibleError ? <div className="fieldError" id={errorId}>{visibleError}</div> : null}
  </Field>;
}
