import type { ReactNode } from "react";

type Props = {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
};

export function Field({ label, required, children, hint }: Props) {
  return (
    <label className="field">
      <span className={required ? "label required" : "label"}>{label}</span>
      {children}
      {hint ? <small className="muted">{hint}</small> : null}
    </label>
  );
}