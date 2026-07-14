import {
  AlertCircle,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Info,
  Minus,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "alert"
  | "bell"
  | "cart"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "eye"
  | "eye-off"
  | "file"
  | "heart"
  | "info"
  | "money"
  | "minus"
  | "package"
  | "plus"
  | "search"
  | "settings"
  | "shopping-bag"
  | "store"
  | "truck"
  | "user"
  | "x";

type Props = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean;
};

const icons: Record<IconName, LucideIcon> = {
  alert: AlertCircle,
  bell: Bell,
  cart: ShoppingCart,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  eye: Eye,
  "eye-off": EyeOff,
  file: FileText,
  heart: Heart,
  info: Info,
  money: CircleDollarSign,
  minus: Minus,
  package: Package,
  plus: Plus,
  search: Search,
  settings: Settings,
  "shopping-bag": ShoppingBag,
  store: Store,
  truck: Truck,
  user: User,
  x: X,
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className,
  "aria-hidden": ariaHidden = true,
}: Props) {
  const Component = icons[name];

  return (
    <Component
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={ariaHidden}
    />
  );
}
