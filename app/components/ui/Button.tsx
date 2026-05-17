import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

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
    secondary: "buttonSecondary",
    ghost: "buttonGhost",
    danger: "buttonDanger",
  }[variant];

  return (
    <button className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}