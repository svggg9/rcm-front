import { useId, type TextareaHTMLAttributes } from "react";

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
  const errorId = useId();

  return (
    <Field label={label} required={required} hint={hint} variant={fieldVariant}>
      <textarea
        className={`textarea ${error ? "inputError" : ""} ${className}`.trim()}
        aria-invalid={error ? "true" : undefined}
        {...props}
        aria-required={required || undefined}
        aria-describedby={[props["aria-describedby"], visibleError ? errorId : null].filter(Boolean).join(" ") || undefined}
      />
      {visibleError ? <div className="fieldError" id={errorId}>{visibleError}</div> : null}
    </Field>
  );
}
