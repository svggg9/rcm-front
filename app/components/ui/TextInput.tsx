import { useId, type ReactNode } from "react";
import { InputControl, type InputControlProps } from "./InputControl";

import { Field, getFieldDescriptionIds } from "./Field";

type Props = Omit<InputControlProps, "size"> & {
  label: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed" | "inline";
  hideLabel?: boolean;
  size?: "default" | "large";
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function TextInput({
  label,
  required,
  error,
  hint,
  fieldVariant = "line",
  hideLabel = false,
  className = "",
  id,
  size = "default",
  leading,
  trailing,
  ...props
}: Props) {
  const visibleError = error?.trim();
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const input = <InputControl
    className={`input ${visibleError ? "inputError" : ""} ${className}`.trim()}
    required={required}
    {...props}
    id={controlId}
    aria-invalid={visibleError ? "true" : props["aria-invalid"]}
    aria-required={required || undefined}
    aria-describedby={getFieldDescriptionIds(controlId, { hint, error: visibleError, describedBy: props["aria-describedby"] })}
  />;

  return (
    <Field
      label={label}
      controlId={controlId}
      required={required}
      hint={hint}
      variant={fieldVariant}
      hideLabel={hideLabel}
      error={visibleError}
      size={size}
      disabled={props.disabled}
      readOnly={props.readOnly}
    >
      {leading || trailing ? <span className="inputShell">
        {leading ? <span className="inputAdornment" aria-hidden="true">{leading}</span> : null}
        {input}
        {trailing ? <span className="inputTrailing">{trailing}</span> : null}
      </span> : input}
    </Field>
  );
}
