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
};

export function Button({
  variant = "secondary",
  className = "",
  children,
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
    <button className={`${variantClass} ${className}`.trim()} {...props}>
      <span className="buttonContent">{children}</span>
    </button>
  );
}
