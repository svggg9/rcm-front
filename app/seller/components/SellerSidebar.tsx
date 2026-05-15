"use client";

import Link from "next/link";
import styles from "../Seller.module.css";

type Props = {
  currentTab: "orders" | "products";
  ordersCount: number;
};

export function SellerSidebar({ currentTab, ordersCount }: Props) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTitle}>
        <span>Кабинет продавца</span>
        <strong>RCM Seller</strong>
      </div>

      <nav className={styles.menu} aria-label="Меню продавца">
        <Link
          href="/seller?tab=orders"
          className={`${styles.menuItem} ${
            currentTab === "orders" ? styles.menuItemActive : ""
          }`}
        >
          <span>Заказы</span>
          <span className={styles.menuCount}>{ordersCount}</span>
        </Link>

        <Link
          href="/seller?tab=products"
          className={`${styles.menuItem} ${
            currentTab === "products" ? styles.menuItemActive : ""
          }`}
        >
          <span>Товары</span>
        </Link>

        <button type="button" className={styles.menuItemDisabled}>
          <span>Аналитика</span>
          <small>скоро</small>
        </button>

        <button type="button" className={styles.menuItemDisabled}>
          <span>Финансы</span>
          <small>скоро</small>
        </button>

        <button type="button" className={styles.menuItemDisabled}>
          <span>Настройки</span>
          <small>скоро</small>
        </button>
      </nav>
    </aside>
  );
}