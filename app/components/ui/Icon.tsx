import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Box,
  Check,
  CircleCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Heart,
  House,
  Images,
  Info,
  LayoutDashboard,
  LayoutGrid,
  List,
  ListOrdered,
  LogIn,
  Minus,
  Plus,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { OrderIcon } from "./OrderIcon";
import { PickupPointIcon } from "./PickupPointIcon";
import { ReturnIcon } from "./ReturnIcon";
import { DeliveryTruckIcon } from "./DeliveryTruckIcon";
import { FilterIcon } from "./FilterIcon";
import { DeleteIcon } from "./DeleteIcon";
import { ProfileIcon, SearchIcon } from "./NavigationIcons";

export type IconName =
  | "alert"
  | "arrow-right"
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
  | "home"
  | "images"
  | "grid"
  | "dashboard"
  | "delivery-truck"
  | "info"
  | "info-rounded"
  | "list"
  | "list-ordered"
  | "log-in"
  | "log-out"
  | "money"
  | "minus"
  | "package"
  | "pencil"
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
  | "trash"
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
  | "info-rounded"
  | "log-out"
  | "money"
  | "pencil"
  | "pickup-point"
  | "return-circle"
  | "search"
  | "shopping-bag"
  | "shipment-handoff"
  | "sliders"
  | "trash"
  | "user";

const icons: Record<Exclude<IconName, CustomIconName>, LucideIcon> = {
  alert: AlertCircle,
  "arrow-right": ArrowRight,
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
  home: House,
  images: Images,
  grid: LayoutGrid,
  dashboard: LayoutDashboard,
  info: Info,
  list: List,
  "list-ordered": ListOrdered,
  "log-in": LogIn,
  minus: Minus,
  package: Box,
  plus: Plus,
  settings: Settings,
  store: Store,
  truck: Truck,
  wallet: Wallet,
  x: X,
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.5,
  className,
  "aria-hidden": ariaHidden = true,
}: Props) {
  if (name === "info-rounded") {
    return <svg className={className} width={size} height={size} viewBox="0 0 24 24"
      fill="none" aria-hidden={ariaHidden} focusable="false">
      <circle cx="12" cy="12" r="10.4" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="12" cy="6.8" r="1.45" fill="currentColor" />
      <path d="M12 11.3v6.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>;
  }
  if (name === "search") return <SearchIcon size={size} strokeWidth={strokeWidth} className={className} ariaHidden={ariaHidden} />;
  if (name === "sliders") return <FilterIcon size={size} strokeWidth={strokeWidth} className={className} ariaHidden={ariaHidden} />;
  if (name === "trash") return <DeleteIcon size={size} strokeWidth={strokeWidth} className={className} ariaHidden={ariaHidden} />;
  if (name === "user") return <ProfileIcon size={size} strokeWidth={strokeWidth} className={className} ariaHidden={ariaHidden} />;
  if (name === "shopping-bag") return <OrderIcon size={size} strokeWidth={strokeWidth} className={className} ariaHidden={ariaHidden} />;
  if (name === "shipment-handoff" || name === "delivery-truck") return <DeliveryTruckIcon size={size} strokeWidth={strokeWidth} className={className} ariaHidden={ariaHidden} />;
  if (name === "pencil") {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24"
        fill="currentColor" aria-hidden={ariaHidden} focusable="false">
        <path d="m6.65 15.08 8.15-8.15 2.27 2.27-8.15 8.15-2.27-2.27ZM6.15 15.75l2.1 2.1-4.15 1.4 2.05-3.5ZM15.35 6.38l.72-.72 2.27 2.27-.72.72-2.27-2.27ZM16.53 5.2l1.18-1.18a1.7 1.7 0 0 1 2.4 0l.26.26a1.7 1.7 0 0 1 0 2.4l-1.18 1.18-2.66-2.66Z" />
        <path d="M3 20.75h18" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  if (name === "money") {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth * (2.8 / 1.5)}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={ariaHidden}
        focusable="false"
      >
        <circle cx="32" cy="32" r="23" />
        <path d="M27 45V19h8a7.5 7.5 0 0 1 0 15H23m0 6h14" />
      </svg>
    );
  }
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

  if (name === "return-circle") return <ReturnIcon size={size} strokeWidth={strokeWidth} className={className} ariaHidden={ariaHidden} />;

  if (name === "pickup-point") return <PickupPointIcon size={size} strokeWidth={strokeWidth} className={className} ariaHidden={ariaHidden} />;

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
