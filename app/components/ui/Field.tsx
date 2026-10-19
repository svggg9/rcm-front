import type { ReactNode } from "react";

type Props = {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  variant?: "line" | "boxed" | "inline";
  hideLabel?: boolean;
};

export function Field({
  label,
  required,
  children,
  hint,
  variant = "line",
  hideLabel = false,
}: Props) {
  const fieldClassName = [
    "field",
    variant === "boxed" ? "fieldBoxed" : "",
    variant === "inline" ? "fieldInline" : "",
    hideLabel ? "fieldLabelHidden" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const labelClassName = [
    "label",
    required ? "required" : "",
    hideLabel ? "visuallyHidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={fieldClassName} data-ui="field" data-field-variant={variant === "inline" ? "inline" : undefined}>
      <span className={labelClassName}>{label}</span>
      {children}
      {hint ? <small className="muted">{hint}</small> : null}
    </label>
  );
}
