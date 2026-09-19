"use client";

import Link from "next/link";

import type { BuyerTab } from "../../lib/buyerNavigation";
import { Icon, type IconName } from "../ui/Icon";
import styles from "./BuyerBottomNavigation.module.css";

type Props = {
  activeTab: BuyerTab;
  cartCount: number;
  favoritesCount: number;
  isAuthenticated: boolean;
  onSignIn: () => void;
};

const items: Array<{ tab: BuyerTab; href: string; label: string; icon: IconName }> = [
  { tab: "home", href: "/", label: "Главная", icon: "home" },
  { tab: "catalog", href: "/catalog", label: "Каталог", icon: "grid" },
  { tab: "favorites", href: "/favorites", label: "Избранное", icon: "heart" },
  { tab: "cart", href: "/cart", label: "Корзина", icon: "shopping-bag" },
  { tab: "account", href: "/account", label: "Профиль", icon: "user" },
];

export function BuyerBottomNavigation({
  activeTab,
  cartCount,
  favoritesCount,
  isAuthenticated,
  onSignIn,
}: Props) {
  return (
    <nav className={styles.navigation} data-buyer-bottom-nav aria-label="Навигация покупателя">
      {items.map((item) => {
        const count = item.tab === "cart" ? cartCount : item.tab === "favorites" ? favoritesCount : 0;
        return (
          <Link
            key={item.tab}
            href={item.href}
            className={styles.item}
            aria-current={activeTab === item.tab ? "page" : undefined}
            aria-label={count > 0 ? `${item.label}: ${count}` : item.label}
            onClick={(event) => {
              if (item.tab === "account" && !isAuthenticated) {
                event.preventDefault();
                onSignIn();
              }
            }}
          >
            <span className={styles.icon}>
              <Icon name={item.icon} size={22} strokeWidth={1.8} />
              {item.tab === "cart" && count > 0 ? (
                <span className={styles.count} aria-hidden="true">{count > 99 ? "99+" : count}</span>
              ) : null}
            </span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
