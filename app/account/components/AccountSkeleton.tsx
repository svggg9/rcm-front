import { SectionLoader } from "../../components/ui/SectionLoader";
import type { AccountTab } from "./AccountSidebar";

type Variant = Exclude<AccountTab, "home" | "info"> | "detail";
const labels: Record<Variant, string> = {
  profile: "Загрузка личных данных",
  orders: "Загрузка заказов",
  detail: "Загрузка заказа",
  returns: "Загрузка возвратов",
  favorites: "Загрузка избранного",
  brands: "Загрузка брендов",
};

export function AccountSkeleton({ variant }: { variant: Variant }) {
  return <SectionLoader label={labels[variant]} />;
}
