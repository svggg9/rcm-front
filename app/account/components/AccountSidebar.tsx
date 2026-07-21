"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";

type AccountTab = "home" | "orders" | "profile" | "favorites" | "info";

type Props = {
  currentTab: AccountTab;
  ordersCount: number;
  onNavigate?: (href: string) => void;
};

export function AccountSidebar({ currentTab, ordersCount, onNavigate }: Props) {
  return (
    <CabinetSidebar
      ariaLabel="Меню аккаунта"
      mobileInline
      onNavigate={onNavigate}
      items={[
        {
          href: "/account",
          label: "Главная",
          icon: "user",
          active: currentTab === "home",
        },
        {
          href: "/account?tab=orders",
          label: "Заказы",
          icon: "shopping-bag",
          active: currentTab === "orders",
          count: ordersCount,
        },
        {
          href: "/account?tab=profile",
          label: "Личные данные",
          icon: "settings",
          active: currentTab === "profile",
        },
        {
          href: "/account?tab=favorites",
          label: "Избранное",
          icon: "heart",
          active: currentTab === "favorites",
        },
        {
          href: "/account?tab=info",
          label: "Информация",
          icon: "info",
          active: currentTab === "info",
        },
      ]}
    />
  );
}
