"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";

import type { SellerTab } from "../types";

type Props = {
  currentTab: SellerTab;
  ordersCount: number;
  productsCount: number;
  storeName: string | null;
};

export function SellerSidebar({
  currentTab,
  ordersCount,
  productsCount,
  storeName,
}: Props) {
  return (
    <CabinetSidebar
      ariaLabel="Меню продавца"
      subtitle="Кабинет продавца"
      title={storeName ?? undefined}
      mobileInline
      items={[
        {
          href: "/seller",
          label: "Главная",
          icon: "dashboard",
          active: currentTab === "home",
        },
        {
          href: "/seller?tab=products",
          label: "Товары",
          icon: "package",
          active: currentTab === "products",
          count: productsCount,
        },
        {
          href: "/seller?tab=orders",
          label: "Заказы",
          icon: "shopping-bag",
          active: currentTab === "orders",
          count: ordersCount,
        },
        {
          href: "/seller?tab=finance",
          label: "Финансы",
          mobileLabel: "Финансы",
          icon: "wallet",
          active: currentTab === "finance",
        },
        {
          href: "/seller?tab=brand",
          label: "Бренд",
          icon: "store",
          active: currentTab === "brand",
        },
        {
          href: "/seller?tab=legal",
          label: "Информация",
          mobileLabel: "Инфо",
          icon: "file",
          active: currentTab === "legal",
        },
      ]}
    />
  );
}
