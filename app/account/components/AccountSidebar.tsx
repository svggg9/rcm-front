"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";
import styles from "./AccountSidebar.module.css";

type AccountTab =
  "home" | "orders" | "returns" | "favorites" | "brands" | "info";

type Props = {
  currentTab: AccountTab;
  ordersCount: number;
  userName?: string;
  onNavigate?: (href: string) => void;
  onLogout: () => void;
};

export function AccountSidebar({
  currentTab,
  ordersCount,
  userName,
  onNavigate,
  onLogout,
}: Props) {
  return (
    <CabinetSidebar
      ariaLabel="Меню аккаунта"
      subtitle="Личный кабинет"
      title={userName}
      titleIcon="user"
      mobileInline
      onNavigate={onNavigate}
      footer={
        <button type="button" className={styles.logout} onClick={onLogout}>
          Выйти
        </button>
      }
      items={[
        {
          href: "/account",
          label: "Главная",
          icon: "user",
          active: currentTab === "home",
        },
        {
          href: "/account?tab=orders",
          label: "Заказы и возвраты",
          icon: "shopping-bag",
          active: currentTab === "orders" || currentTab === "returns",
          count: ordersCount,
        },
        {
          href: "/account?tab=favorites",
          label: "Избранное",
          icon: "heart",
          active: currentTab === "favorites",
        },
        {
          href: "/account?tab=brands",
          label: "Мои бренды",
          icon: "heart",
          active: currentTab === "brands",
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
