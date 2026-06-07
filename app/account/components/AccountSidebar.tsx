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
      subtitle="Кабинет"
      title="Покупатель"
      items={[
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
      footer={
        <button type="button" className={styles.logout} onClick={onLogout}>
          Выйти
        </button>
      }
    />
  );
}