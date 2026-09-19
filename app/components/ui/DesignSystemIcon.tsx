import { Box, ReceiptText, Truck } from "lucide-react";
import { Icon, type IconName } from "./Icon";

export const iconSizes = { interface: 24, utility: 20, empty: 32 } as const;
export type IconRole = keyof typeof iconSizes;

const selectedIcons = { package: Box, "shopping-bag": ReceiptText, "shipment-handoff": Truck };

// Opt-in migration: existing Icon consumers keep their current appearance.
export function DesignSystemIcon({ name, role = "interface", className }: {
  name: IconName; role?: IconRole; className?: string;
}) {
  const props = { size: iconSizes[role], strokeWidth: 1.5, className, "aria-hidden": true } as const;
  if (name in selectedIcons) {
    const Selected = selectedIcons[name as keyof typeof selectedIcons];
    return <Selected {...props} />;
  }
  return <Icon name={name} {...props} />;
}
