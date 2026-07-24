import type { ButtonHTMLAttributes, ReactNode } from "react";

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
};

export function Button({
  variant = "secondary",
  className = "",
  children,
  loading = false,
  success = false,
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
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      data-success={success || undefined}
      {...props}
    >
      <span className="buttonContent">
        {loading ? (
          <span className="buttonLoader" aria-hidden="true" />
        ) : success ? (
          <svg className="buttonSuccessIcon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 10.5L8.1 14.5L16 5.8" />
          </svg>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
