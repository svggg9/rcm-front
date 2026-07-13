"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";

import type { SellerTab } from "../types";

type Props = {
  currentTab: SellerTab;
  ordersCount: number;
  productsCount: number;
  storeName: string | null;
  creatingProduct?: boolean;
  onCreateProduct?: () => void;
};

export function SellerSidebar({
  currentTab,
  ordersCount,
  productsCount,
  storeName,
  creatingProduct = false,
  onCreateProduct,
}: Props) {
  return (
    <CabinetSidebar
      ariaLabel="Меню продавца"
      subtitle="Кабинет продавца"
      title={storeName ?? undefined}
      titleLoading={!storeName}
      mobileInline
      items={[
        {
          href: "/seller?tab=products",
          label: "Товары",
          active: currentTab === "products",
          count: productsCount,
          action: onCreateProduct
            ? {
                label: "Добавить товар",
                mobileLabel: "+",
                onClick: onCreateProduct,
                disabled: creatingProduct,
              }
            : undefined,
        },
        {
          href: "/seller?tab=orders",
          label: "Заказы",
          active: currentTab === "orders",
          count: ordersCount,
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
