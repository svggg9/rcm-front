import type { TextareaHTMLAttributes } from "react";

import { Field } from "./Field";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string | null;
  hint?: string;
};

export function Textarea({
  label,
  required,
  error,
  hint,
  className = "",
  ...props
}: Props) {
  return (
    <Field label={label} required={required} hint={hint}>
      <textarea
        className={`textarea ${error ? "inputError" : ""} ${className}`.trim()}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {error ? <div className="fieldError">{error}</div> : null}
    </Field>
  );
}