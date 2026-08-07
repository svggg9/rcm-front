import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  Check,
  CircleCheck,
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
  LogIn,
  Minus,
  Package,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
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
  | "cancel-circle"
  | "cart"
  | "check"
  | "check-circle"
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
  | "delivery-truck"
  | "info"
  | "list"
  | "list-ordered"
  | "log-in"
  | "log-out"
  | "money"
  | "minus"
  | "package"
  | "pickup-point"
  | "plus"
  | "return-circle"
  | "search"
  | "settings"
  | "sliders"
  | "shipment-handoff"
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

type CustomIconName =
  | "cancel-circle"
  | "delivery-truck"
  | "log-out"
  | "pickup-point"
  | "return-circle"
  | "shipment-handoff";

const icons: Record<Exclude<IconName, CustomIconName>, LucideIcon> = {
  alert: AlertCircle,
  "arrow-up-right": ArrowUpRight,
  bell: Bell,
  cart: ShoppingCart,
  check: Check,
  "check-circle": CircleCheck,
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
  "log-in": LogIn,
  money: CircleDollarSign,
  minus: Minus,
  package: Package,
  plus: Plus,
  search: Search,
  settings: Settings,
  sliders: SlidersHorizontal,
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
  if (name === "cancel-circle") {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={ariaHidden}
      >
        <circle cx="12" cy="12" r="9.25" />
        <path d="m8.75 8.75 6.5 6.5M15.25 8.75l-6.5 6.5" />
      </svg>
    );
  }

  if (name === "delivery-truck") {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={ariaHidden}
      >
        <path d="M3.25 6.75h10.5v9.5H3.25z" />
        <path d="M13.75 10h3.1l3.9 4v2.25h-2" />
        <path d="M16.85 10v4h3.9M13.75 16.25h1.5M8.75 16.25h6.5" />
        <circle cx="6.75" cy="16.25" r="2" />
        <circle cx="17.25" cy="16.25" r="2" />
      </svg>
    );
  }

  if (name === "log-out") {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={ariaHidden}
      >
        <path d="M10.25 4.25h-4.5a1.5 1.5 0 0 0-1.5 1.5v12.5a1.5 1.5 0 0 0 1.5 1.5h4.5" />
        <path d="m14.25 7.75 4.25 4.25-4.25 4.25M18.25 12h-9.5" />
      </svg>
    );
  }

  if (name === "return-circle") {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={ariaHidden}
      >
        <path d="M8.5 7.25h-4v-4" />
        <path d="M4.85 7.1A8.5 8.5 0 1 1 4.2 16.6" />
      </svg>
    );
  }

  if (name === "shipment-handoff") {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={ariaHidden}
      >
        <path d="m3.25 7.25 6.5-3.25 6.5 3.25-6.5 3.25-6.5-3.25Z" />
        <path d="M3.25 7.25v8.25l6.5 3.5 2.75-1.5M9.75 10.5V19" />
        <path d="M13.25 13.5h7.5M17.75 10.5l3 3-3 3" />
      </svg>
    );
  }

  if (name === "pickup-point") {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={ariaHidden}
      >
        <path d="M12 21s6.5-5.75 6.5-11.5a6.5 6.5 0 1 0-13 0C5.5 15.25 12 21 12 21Z" />
        <path d="m8.75 8.25 3.25-1.6 3.25 1.6L12 9.9 8.75 8.25Z" />
        <path d="M8.75 8.25v3.7L12 13.6l3.25-1.65v-3.7M12 9.9v3.7" />
      </svg>
    );
  }

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
