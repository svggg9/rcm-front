"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";

import type { SellerTab } from "../types";

type Props = {
  currentTab: SellerTab;
  ordersCount: number;
  productsCount: number;
  storeName: string | null;
  storeNotReady: boolean;
};

export function SellerSidebar({
  currentTab,
  ordersCount,
  productsCount,
  storeName,
  storeNotReady,
}: Props) {
  return (
    <CabinetSidebar
      ariaLabel="Меню продавца"
      subtitle="Кабинет продавца"
      title={storeName ?? undefined}
      titleBadge={storeNotReady ? "Магазин не готов" : undefined}
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
          label: "Мои товары",
          icon: "package",
          active: currentTab === "products",
          count: productsCount,
        },
        {
          href: "/seller?tab=orders",
          label: "Заказы и возвраты",
          icon: "shopping-bag",
          active: currentTab === "orders" || currentTab === "returns",
          count: ordersCount,
        },
        {
          href: "/seller?tab=finance",
          label: "Продажи и выплаты",
          mobileLabel: "Финансы",
          icon: "wallet",
          active: currentTab === "finance",
        },
        {
          href: "/seller?tab=brand",
          label: "Витрина магазина",
          mobileLabel: "Витрина",
          icon: "store",
          active: currentTab === "brand",
        },
        {
          href: "/seller?tab=legal",
          label: "Данные и документы",
          mobileLabel: "Документы",
          icon: "file",
          active: currentTab === "legal",
        },
      ]}
    />
  );
}
