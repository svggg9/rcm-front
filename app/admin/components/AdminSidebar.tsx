"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";

import type { AdminTab } from "../types";

type Props = {
  currentTab: AdminTab;
  productsCount: number;
  ordersCount: number;
  sellersCount: number;
};

export function AdminSidebar({
  currentTab,
  productsCount,
  ordersCount,
  sellersCount,
}: Props) {
  return (
    <CabinetSidebar
      ariaLabel="Меню администратора"
      mobileInline
      subtitle="RCM"
      title="Админка"
      items={[
        {
          href: "/admin?tab=products",
          label: "Товары",
          mobileLabel: "Товары",
          icon: "package",
          active: currentTab === "products",
          count: productsCount,
        },
        {
          href: "/admin?tab=orders",
          label: "Заказы",
          mobileLabel: "Заказы",
          icon: "shopping-bag",
          active: currentTab === "orders",
          count: ordersCount,
        },
        {
          href: "/admin?tab=sellers",
          label: "Продавцы",
          mobileLabel: "Заявки",
          icon: "store",
          active: currentTab === "sellers",
          count: sellersCount,
        },
        {
          href: "/admin?tab=dictionaries",
          label: "Справочники",
          mobileLabel: "Словари",
          icon: "settings",
          active: currentTab === "dictionaries",
        },
        {
          href: "/admin?tab=finance",
          label: "Финансы",
          mobileLabel: "Финансы",
          icon: "money",
          active: currentTab === "finance",
        },
        {
          href: "/admin?tab=delivery",
          label: "СДЭК",
          mobileLabel: "СДЭК",
          icon: "truck",
          active: currentTab === "delivery",
        },
      ]}
    />
  );
}
