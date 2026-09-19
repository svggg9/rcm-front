import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonVariant =
  | "primary"
  | "primaryShimmer"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
  loading?: boolean;
  success?: boolean;
  reserveLabelSpace?: boolean;
};

export function Button({
  variant = "secondary",
  className = "",
  children,
  loading = false,
  success = false,
  reserveLabelSpace = true,
  disabled,
  ...props
}: Props) {
  const variantClass = {
    primary: "buttonPrimary",
    primaryShimmer: "buttonPrimaryShimmer",
    secondary: "buttonSecondary",
    tertiary: "buttonTertiary",
    ghost: "buttonGhost",
    danger: "buttonDanger",
  }[variant];

  return (
    <button
      className={`${variantClass} ${className}`.trim()}
      disabled={disabled || loading || success}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      data-success={success || undefined}
      aria-label={reserveLabelSpace && (loading || success) && typeof children === "string" ? children : undefined}
      {...props}
    >
      <span className={`buttonContent ${reserveLabelSpace ? styles.stableContent : ""}`}>
        {reserveLabelSpace && <span className={`${styles.label} ${loading || success ? styles.hidden : ""}`}
          aria-hidden={loading || success || undefined}>{children}</span>}
        {loading ? (
          <span className="buttonLoader" aria-hidden="true" />
        ) : success ? (
          <svg className="buttonSuccessIcon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 10.5L8.1 14.5L16 5.8" />
          </svg>
        ) : (
          reserveLabelSpace ? null : children
        )}
      </span>
    </button>
  );
}
