"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";

import type { AdminTab } from "../types";

type Props = {
  currentTab: AdminTab;
  onNavigate?: (href: string) => void;
};

export function AdminSidebar({
  currentTab,
  onNavigate,
}: Props) {
  return (
    <CabinetSidebar
      ariaLabel="Меню администратора"
      mobileInline
      subtitle="RCM"
      title="Админка"
      onNavigate={onNavigate}
      items={[
        {
          href: "/admin?tab=storefront",
          label: "Витрина",
          mobileLabel: "Витрина",
          icon: "dashboard",
          active: currentTab === "storefront",
        },
        {
          href: "/admin?tab=products",
          label: "Товары",
          mobileLabel: "Товары",
          icon: "package",
          active: currentTab === "products",
        },
        {
          href: "/admin?tab=orders",
          label: "Заказы",
          mobileLabel: "Заказы",
          icon: "shopping-bag",
          active: currentTab === "orders",
        },
        {
          href: "/admin?tab=sellers",
          label: "Продавцы",
          mobileLabel: "Заявки",
          icon: "store",
          active: currentTab === "sellers",
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
