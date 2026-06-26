import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Button } from "./Button";

type ButtonPairItem = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: ReactNode;
  variant?: "primary" | "secondary";
};

type Props = {
  primary: ButtonPairItem;
  secondary: ButtonPairItem;
  className?: string;
};

export function ButtonPair({ primary, secondary, className = "" }: Props) {
  const { label: primaryLabel, variant: primaryVariant = "primary", ...primaryProps } =
    primary;
  const {
    label: secondaryLabel,
    variant: secondaryVariant = "secondary",
    ...secondaryProps
  } = secondary;

  return (
    <div className={`buttonPair ${className}`.trim()}>
      <Button
        {...primaryProps}
        variant={primaryVariant}
        className={`buttonPairItem ${primaryProps.className ?? ""}`.trim()}
      >
        {primaryLabel}
      </Button>
      <Button
        {...secondaryProps}
        variant={secondaryVariant}
        className={`buttonPairItem ${secondaryProps.className ?? ""}`.trim()}
      >
        {secondaryLabel}
      </Button>
    </div>
  );
}
