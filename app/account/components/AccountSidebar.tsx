"use client";

import Link from "next/link";
import styles from "../Account.module.css";

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
    <aside className={styles.sidebar}>
      <nav className={styles.menu} aria-label="Меню аккаунта">
        <Link
          href="/account?tab=orders"
          className={`${styles.menuItem} ${
            currentTab === "orders" ? styles.menuItemActive : ""
          }`}
        >
        <span>Мои заказы</span>
        <span className={styles.menuCount}>{ordersCount}</span>
        </Link>

        <Link
          href="/account?tab=profile"
          className={`${styles.menuItem} ${
            currentTab === "profile" ? styles.menuItemActive : ""
          }`}
        >
          <span>Мои данные</span>
        </Link>
      </nav>

      <button type="button" className={styles.logout} onClick={onLogout}>
        Выйти из аккаунта
      </button>
    </aside>
  );
}