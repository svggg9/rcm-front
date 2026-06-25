"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";

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
          active: currentTab === "products",
          count: productsCount,
        },
        {
          href: "/admin?tab=sellers",
          label: "Продавцы",
          mobileLabel: "Заявки",
          active: currentTab === "sellers",
          count: sellersCount,
        },
        {
          href: "/admin?tab=dictionaries",
          label: "Справочники",
          mobileLabel: "Словари",
          active: currentTab === "dictionaries",
        },
      ]}
    />
  );
}
