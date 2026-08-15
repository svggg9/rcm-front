"use client";

import Link from "next/link";

import { Icon, type IconName } from "../../components/ui/Icon";
import type { SellerTab } from "../types";

import styles from "./SellerSidebar.module.css";

type Props = {
  currentTab: SellerTab;
  productCount?: number;
  orderCount?: number;
};

type NavigationItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: IconName;
  tab: SellerTab;
  count?: number;
};

export function SellerSidebar({
  currentTab,
  productCount,
  orderCount,
}: Props) {
  const primaryItems: NavigationItem[] = [
    {
      href: "/seller",
      label: "Обзор",
      icon: "dashboard",
      tab: "home",
    },
    {
      href: "/seller?tab=products",
      label: "Товары",
      icon: "package",
      tab: "products",
      count: productCount,
    },
    {
      href: "/seller?tab=orders",
      label: "Заказы",
      icon: "shopping-bag",
      tab: "orders",
      count: orderCount,
    },
    {
      href: "/seller?tab=returns",
      label: "Возвраты",
      icon: "return-circle",
      tab: "returns",
    },
    {
      href: "/seller?tab=finance",
      label: "Продажи и выплаты",
      mobileLabel: "Финансы",
      icon: "wallet",
      tab: "finance",
    },
    {
      href: "/seller?tab=brand",
      label: "Витрина магазина",
      mobileLabel: "Витрина",
      icon: "store",
      tab: "brand",
    },
  ];

  const settingsItem: NavigationItem = {
    href: "/seller?tab=legal",
    label: "Данные и документы",
    mobileLabel: "Документы",
    icon: "file",
    tab: "legal",
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navigation} aria-label="Меню продавца">
        <div className={styles.primaryNavigation}>
          {primaryItems.map((item) => (
            <NavigationLink
              key={item.tab}
              item={item}
              active={currentTab === item.tab}
            />
          ))}
        </div>

        <div className={styles.settingsNavigation}>
          <NavigationLink
            item={settingsItem}
            active={currentTab === settingsItem.tab}
          />
        </div>
      </nav>
    </aside>
  );
}

function NavigationLink({
  item,
  active,
}: {
  item: NavigationItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`${styles.navigationLink} ${
        active ? styles.navigationLinkActive : ""
      }`}
      aria-current={active ? "page" : undefined}
      prefetch={false}
    >
      <Icon name={item.icon} size={18} />
      <span className={styles.desktopLabel}>{item.label}</span>
      <span className={styles.mobileLabel}>
        {item.mobileLabel || item.label}
      </span>
      {typeof item.count === "number" && item.count > 0 ? (
        <span className={styles.navigationCount}>{item.count}</span>
      ) : null}
    </Link>
  );
}
