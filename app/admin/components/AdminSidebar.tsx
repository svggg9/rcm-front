import Link from "next/link";
import styles from "../Admin.module.css";
import type { AdminTab } from "../types";

type Props = {
  currentTab: AdminTab;
  productsCount: number;
  sellersCount: number;
};

export function AdminSidebar({
  currentTab,
  productsCount,
  sellersCount,
}: Props) {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.menu}>
        <Link
          href="/admin?tab=products"
          className={`${styles.menuItem} ${
            currentTab === "products" ? styles.menuItemActive : ""
          }`}
        >
          <span>Товары</span>
          <span className={styles.menuCount}>{productsCount}</span>
        </Link>

        <Link
          href="/admin?tab=sellers"
          className={`${styles.menuItem} ${
            currentTab === "sellers" ? styles.menuItemActive : ""
          }`}
        >
          <span>Продавцы</span>
          <span className={styles.menuCount}>{sellersCount}</span>
        </Link>
      </nav>
    </aside>
  );
}