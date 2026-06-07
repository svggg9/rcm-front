import type { InputHTMLAttributes } from "react";

import { Field } from "./Field";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
};

export function TextInput({
  label,
  required,
  error,
  hint,
  className = "",
  ...props
}: Props) {
  return (
    <Field label={label} required={required} hint={hint}>
      <input
        className={`input ${error ? "inputError" : ""} ${className}`.trim()}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {error ? <div className="fieldError">{error}</div> : null}
    </Field>
  );
}