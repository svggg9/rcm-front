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
          Мои заказы
          <span className={styles.menuCount}>{ordersCount}</span>
        </Link>

        <Link
          href="/account?tab=profile"
          className={`${styles.menuItem} ${
            currentTab === "profile" ? styles.menuItemActive : ""
          }`}
        >
          Мои данные
        </Link>
      </nav>

      <button type="button" className={styles.logout} onClick={onLogout}>
        Выйти из аккаунта
      </button>
    </aside>
  );
}