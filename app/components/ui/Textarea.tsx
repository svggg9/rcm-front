import { useId, type TextareaHTMLAttributes } from "react";

import { Field, getFieldDescriptionIds } from "./Field";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed";
  hideLabel?: boolean;
  size?: "default" | "large";
};

export function Textarea({
  label,
  required,
  error,
  hint,
  fieldVariant = "line",
  hideLabel = false,
  className = "",
  id,
  size = "default",
  ...props
}: Props) {
  const visibleError = error?.trim();
  const generatedId = useId();
  const controlId = id ?? generatedId;

  return (
    <Field label={label} controlId={controlId} required={required} hint={hint} error={visibleError}
      variant={fieldVariant} hideLabel={hideLabel} size={size} disabled={props.disabled} readOnly={props.readOnly}>
      <textarea
        className={`textarea ${visibleError ? "inputError" : ""} ${className}`.trim()}
        {...props}
        id={controlId}
        required={required}
        aria-invalid={visibleError ? "true" : props["aria-invalid"]}
        aria-required={required || undefined}
        aria-describedby={getFieldDescriptionIds(controlId, { hint, error: visibleError, describedBy: props["aria-describedby"] })}
      />
    </Field>
  );
}
