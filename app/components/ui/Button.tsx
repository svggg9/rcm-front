import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import styles from "./Button.module.css";

type ButtonVariant =
  | "primary"
  | "primaryShimmer"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "utility"
  | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "default" | "compact" | "large";
  children: ReactNode;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  /** Supply aria-label when the button has no visible text. */
  iconOnly?: boolean;
  loading?: boolean;
  success?: boolean;
  reserveLabelSpace?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "secondary",
  size = "default",
  className = "",
  children,
  startIcon,
  endIcon,
  iconOnly = false,
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
    utility: "buttonUtility",
    danger: "buttonDanger",
  }[variant];

  return (
    <button
      className={[variantClass, size === "compact" ? "buttonCompact" : size === "large" ? "buttonLarge" : "", iconOnly ? "buttonIconOnly" : "", className].filter(Boolean).join(" ")}
      disabled={disabled || loading || success}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      data-success={success || undefined}
      {...props}
    >
      <span className={`buttonContent ${reserveLabelSpace ? styles.stableContent : ""}`}>
        <span className={[styles.label, loading || success ? reserveLabelSpace ? styles.hidden : styles.visuallyHidden : ""].filter(Boolean).join(" ")}>
          {startIcon && <span className={styles.icon} aria-hidden="true">{startIcon}</span>}
          {children}
          {endIcon && <span className={styles.icon} aria-hidden="true">{endIcon}</span>}
        </span>
        {loading ? (
          <span className="buttonLoader" aria-hidden="true" />
        ) : success ? (
          <svg className="buttonSuccessIcon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 10.5L8.1 14.5L16 5.8" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}
