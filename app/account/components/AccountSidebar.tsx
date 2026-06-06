"use client";

import { DashboardTabs } from "../../components/ui/DashboardTabs";
import styles from "./AccountSidebar.module.css";

type Props = {
  currentTab: "profile" | "orders";
  ordersCount: number;
  onLogout: () => void;
};

export function AccountSidebar({
  currentTab,
  ordersCount,
  onLogout,
}: Props) {
  return (
    <DashboardTabs
      ariaLabel="Меню аккаунта"
      tabs={[
        {
          href: "/account?tab=orders",
          label: "Мои заказы",
          active: currentTab === "orders",
          count: ordersCount,
        },
        {
          href: "/account?tab=profile",
          label: "Мои данные",
          active: currentTab === "profile",
        },
      ]}
      actions={
        <button type="button" className={styles.logout} onClick={onLogout}>
          Выйти
        </button>
      }
    />
  );
}