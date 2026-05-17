"use client";

import { DashboardTabs } from "../../components/ui/DashboardTabs";

import styles from "../Seller.module.css";

type Props = {
  currentTab: "orders" | "products";
  ordersCount: number;
};

export function SellerSidebar({
  currentTab,
  ordersCount,
}: Props) {
  return (
    <DashboardTabs
      ariaLabel="Меню продавца"
      tabs={[
        {
          href: "/seller?tab=orders",
          label: "Заказы",
          active: currentTab === "orders",
          count: ordersCount,
        },
        {
          href: "/seller?tab=products",
          label: "Товары",
          active: currentTab === "products",
        },
      ]}
      actions={
        <div className={styles.sidebarActions}>
          <button type="button" className={styles.sidebarSoon}>
            Аналитика
          </button>

          <button type="button" className={styles.sidebarSoon}>
            Финансы
          </button>

          <button type="button" className={styles.sidebarSoon}>
            Настройки
          </button>
        </div>
      }
    />
  );
}