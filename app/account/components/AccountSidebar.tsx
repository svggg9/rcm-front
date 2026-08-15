"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import styles from "./AccountSidebar.module.css";

type AccountTab =
  "home" | "orders" | "returns" | "favorites" | "brands" | "info";

type Props = {
  currentTab: AccountTab;
  ordersCount: number;
  showSellerCabinet?: boolean;
  userName?: string;
  onNavigate?: (href: string) => void;
  onLogout: () => void;
};

export function AccountSidebar({
  currentTab,
  ordersCount,
  showSellerCabinet = false,
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
        <Button
          type="button"
          variant="secondary"
          className={styles.logout}
          onClick={onLogout}
        >
          <span className={styles.logoutContent}>
            <Icon name="log-out" size={18} strokeWidth={1.5} />
            Выйти
          </span>
        </Button>
      }
      items={[
        {
          href: "/account",
          label: "Главная",
          icon: "user",
          active: currentTab === "home",
        },
        ...(showSellerCabinet
          ? [
              {
                href: "/seller",
                label: "Кабинет продавца",
                icon: "store" as const,
                active: false,
              },
            ]
          : []),
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
