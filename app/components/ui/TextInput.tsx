import { useId } from "react";
import { InputControl, type InputControlProps } from "./InputControl";

import { Field } from "./Field";

type Props = InputControlProps & {
  label: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed" | "inline";
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
      <InputControl
        className={`input ${visibleError ? "inputError" : ""} ${className}`.trim()}
        required={required}
        {...props}
        aria-invalid={visibleError ? "true" : props["aria-invalid"]}
        aria-required={required || undefined}
        aria-describedby={[props["aria-describedby"], visibleError ? errorId : null].filter(Boolean).join(" ") || undefined}
      />
      {visibleError ? <div className="fieldError" id={errorId}>{visibleError}</div> : null}
    </Field>
  );
}
