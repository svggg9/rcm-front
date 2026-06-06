"use client";

import { DashboardTabs } from "../../components/ui/DashboardTabs";

type Props = {
  currentTab: "orders" | "products" | "brand";
  ordersCount: number;
};

export function SellerSidebar({ currentTab, ordersCount }: Props) {
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
        {
          href: "/seller?tab=brand",
          label: "Производитель",
          active: currentTab === "brand",
        },
      ]}
    />
  );
}