import type { TextareaHTMLAttributes } from "react";

import { Field } from "./Field";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed";
};

export function Textarea({
  label,
  required,
  error,
  hint,
  fieldVariant = "line",
  className = "",
  ...props
}: Props) {
  const visibleError = error?.trim();

  return (
    <Field label={label} required={required} hint={hint} variant={fieldVariant}>
      <textarea
        className={`textarea ${error ? "inputError" : ""} ${className}`.trim()}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {visibleError ? <div className="fieldError">{visibleError}</div> : null}
    </Field>
  );
}
