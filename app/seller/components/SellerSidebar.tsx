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
      <nav className={styles.menu} aria-label="Меню продавца">
        <Link
          href="/seller?tab=orders"
          className={`${styles.menuItem} ${
            currentTab === "orders" ? styles.menuItemActive : ""
          }`}
        >
          Заказы
          <span className={styles.menuCount}>{ordersCount}</span>
        </Link>

        <Link
          href="/seller?tab=products"
          className={`${styles.menuItem} ${
            currentTab === "products" ? styles.menuItemActive : ""
          }`}
        >
          Добавить товар
        </Link>
      </nav>
    </aside>
  );
}