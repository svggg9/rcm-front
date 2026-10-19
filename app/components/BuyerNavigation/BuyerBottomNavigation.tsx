"use client";
import Image from "next/image";
import Link from "next/link";
import type { BuyerTab } from "../../lib/buyerNavigation";
import { BuyerNavigationIcon } from "./BuyerNavigationIcon";
import { FavoritesNavigationIcon } from "./FavoritesNavigationIcon";
import styles from "./BuyerBottomNavigation.module.css";

type Props = {
  activeTab?: BuyerTab;
  cartCount: number;
  favoritesCount: number;
  menuOpen: boolean;
  onMenu: () => void;
  onSearch: () => void;
};
export function BuyerBottomNavigation({ activeTab, cartCount, favoritesCount, menuOpen, onMenu, onSearch }: Props) {
  return (
    <nav className={styles.navigation} data-buyer-bottom-nav aria-label="Навигация покупателя">
      <button type="button" className={styles.item} aria-label="Открыть меню" aria-expanded={menuOpen} aria-controls="site-menu" onClick={onMenu}><BuyerNavigationIcon name="menu" /></button>
      <button type="button" className={styles.item} aria-label="Поиск" onClick={onSearch}><BuyerNavigationIcon name="search" /></button>
      <Link href="/" className={`${styles.item} ${styles.logo}`} aria-label="рцмаркет — главная" aria-current={activeTab === "home" ? "page" : undefined}><Image src="/brand/wordmark-black.svg" alt="рцмаркет" width={794} height={100} /></Link>
      <Link href="/favorites" className={styles.item} aria-label={favoritesCount > 0 ? `Избранное: ${favoritesCount}` : "Избранное"} aria-current={activeTab === "favorites" ? "page" : undefined}><FavoritesNavigationIcon count={favoritesCount} /></Link>
      <Link href="/cart" className={styles.item} aria-label={cartCount > 0 ? `Корзина: ${cartCount}` : "Корзина"} aria-current={activeTab === "cart" ? "page" : undefined}><BuyerNavigationIcon name="bag" /></Link>
    </nav>
  );
}
