import type { HTMLAttributes, ReactNode, Ref } from "react";

type Props = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  label?: string;
  controlId: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  error?: string | null;
  size?: "default" | "large";
  disabled?: boolean;
  readOnly?: boolean;
  variant?: "line" | "boxed" | "inline";
  hideLabel?: boolean;
  full?: boolean;
  ref?: Ref<HTMLDivElement>;
};

export function Field({
  label,
  controlId,
  required,
  children,
  hint,
  error,
  size = "default",
  disabled,
  readOnly,
  variant = "line",
  hideLabel = false,
  full = false,
  className,
  ...props
}: Props) {
  const fieldClassName = [
    "field",
    variant === "boxed" ? "fieldBoxed" : "",
    variant === "inline" ? "fieldInline" : "",
    hideLabel ? "fieldLabelHidden" : "",
    full ? "fieldFull" : "",
    className,
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
    <div {...props} className={fieldClassName} data-ui="field" data-field-variant={variant === "inline" ? "inline" : undefined}
      data-field-size={size} data-disabled={disabled || undefined} data-readonly={readOnly || undefined}>
      {label ? <label id={`${controlId}-label`} htmlFor={controlId} className={labelClassName}>{label}</label> : null}
      {children}
      {error?.trim() ? <div className="fieldError" id={`${controlId}-error`}>{error.trim()}</div> : null}
      {hint ? <small className="fieldHint" data-ui="field-hint" id={`${controlId}-hint`}>{hint}</small> : null}
    </div>
  );
}

export function getFieldDescriptionIds(controlId: string, { hint, error, describedBy }: {
  hint?: string; error?: string | null; describedBy?: string;
}) {
  return [...new Set([describedBy, hint ? `${controlId}-hint` : "", error?.trim() ? `${controlId}-error` : ""]
    .flatMap(value => value?.split(/\s+/).filter(Boolean) ?? []))].join(" ") || undefined;
}
