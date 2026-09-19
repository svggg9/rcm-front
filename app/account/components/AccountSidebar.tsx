"use client";

import Link from "next/link";
import { CabinetSidebar } from "../../components/ui/CabinetSidebar";
import { Button } from "../../components/ui/Button";
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
        <div className={styles.actions}>
          {showSellerCabinet ? (
            <Link
              href="/seller"
              className={`buttonSecondary ${styles.action}`}
              prefetch={false}
              onClick={(event) => {
                if (onNavigate && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                  event.preventDefault();
                  onNavigate("/seller");
                }
              }}
            >
              Кабинет продавца
            </Link>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className={styles.action}
            onClick={onLogout}
          >
            Выйти
          </Button>
        </div>
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
