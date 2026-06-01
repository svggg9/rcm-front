"use client";

import { DashboardTabs } from "../../components/ui/DashboardTabs";

import type { AdminTab } from "../types";

type Props = {
  currentTab: AdminTab;
  productsCount: number;
  sellersCount: number;
};

export function AdminSidebar({
  currentTab,
  productsCount,
  sellersCount,
}: Props) {
  return (
    <DashboardTabs
      ariaLabel="Меню администратора"
      tabs={[
        {
          href: "/admin?tab=products",
          label: "Товары",
          active: currentTab === "products",
          count: productsCount,
        },
        {
          href: "/admin?tab=sellers",
          label: "Продавцы",
          active: currentTab === "sellers",
          count: sellersCount,
        },
        {
          href: "/admin?tab=dictionaries",
          label: "Справочники",
          active: currentTab === "dictionaries",
        },
      ]}
    />
  );
}