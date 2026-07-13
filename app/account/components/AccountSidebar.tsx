"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";
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
    <CabinetSidebar
      ariaLabel="Меню аккаунта"
      subtitle="Аккаунт"
      title="Личный кабинет"
      mobileInline
      items={[
        {
          href: "/account?tab=profile",
          label: "Профиль",
          active: currentTab === "profile",
        },
        {
          href: "/account?tab=orders",
          label: "Заказы",
          active: currentTab === "orders",
          count: ordersCount,
        },
      ]}
      footer={
        <button
          type="button"
          className={styles.logout}
          onClick={onLogout}
          aria-label="Выйти"
          title="Выйти"
        >
          <span className={styles.logoutText}>Выход</span>
        </button>
      }
    />
  );
}
