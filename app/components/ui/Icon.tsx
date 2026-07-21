import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Info,
  LayoutDashboard,
  List,
  ListOrdered,
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
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "alert"
  | "arrow-up-right"
  | "bell"
  | "cart"
  | "check"
  | "clock"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "eye"
  | "eye-off"
  | "file"
  | "heart"
  | "dashboard"
  | "info"
  | "list"
  | "list-ordered"
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
  | "wallet"
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
  "arrow-up-right": ArrowUpRight,
  bell: Bell,
  cart: ShoppingCart,
  check: Check,
  clock: Clock3,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  eye: Eye,
  "eye-off": EyeOff,
  file: FileText,
  heart: Heart,
  dashboard: LayoutDashboard,
  info: Info,
  list: List,
  "list-ordered": ListOrdered,
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
  wallet: Wallet,
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
