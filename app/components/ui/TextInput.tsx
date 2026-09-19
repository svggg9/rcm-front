import { useId, type InputHTMLAttributes } from "react";

import { Field } from "./Field";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed";
  hideLabel?: boolean;
};

export function TextInput({
  label,
  required,
  error,
  hint,
  fieldVariant = "line",
  hideLabel = false,
  className = "",
  ...props
}: Props) {
  const visibleError = error?.trim();
  const errorId = useId();

  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      variant={fieldVariant}
      hideLabel={hideLabel}
    >
      <input
        className={`input ${error ? "inputError" : ""} ${className}`.trim()}
        aria-invalid={error ? "true" : undefined}
        {...props}
        aria-required={required || undefined}
        aria-describedby={[props["aria-describedby"], visibleError ? errorId : null].filter(Boolean).join(" ") || undefined}
      />
      {visibleError ? <div className="fieldError" id={errorId}>{visibleError}</div> : null}
    </Field>
  );
}
