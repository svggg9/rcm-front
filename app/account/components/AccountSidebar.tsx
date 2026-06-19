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
      title="Профиль"
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
          <svg
            className={styles.logoutIcon}
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.25 3.25H4.5C3.95 3.25 3.5 3.7 3.5 4.25V13.75C3.5 14.3 3.95 14.75 4.5 14.75H7.25"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M10.25 6.25L13 9L10.25 11.75"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 9H7"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      }
    />
  );
}
