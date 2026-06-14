"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";

import type { SellerTab } from "../types";

type Props = {
  currentTab: SellerTab;
  ordersCount: number;
  storeName: string;
};

export function SellerSidebar({ currentTab, ordersCount, storeName }: Props) {
  return (
    <CabinetSidebar
      ariaLabel="Меню продавца"
      subtitle="Кабинет продавца"
      title={storeName}
      items={[
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
        {
          href: "/seller?tab=legal",
          label: "Реквизиты",
          active: currentTab === "legal",
        },
      ]}
    />
  );
}
