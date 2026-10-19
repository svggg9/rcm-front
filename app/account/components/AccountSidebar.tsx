"use client";
import Link from "next/link";
import type { MouseEvent } from "react";
import styles from "./AccountSidebar.module.css";
export type AccountTab = "home" | "profile" | "orders" | "returns" | "favorites" | "brands" | "info";
export const accountTabTitles: Record<AccountTab, string> = { home: "Профиль", profile: "Личные данные", orders: "Заказы", returns: "Возвраты", favorites: "Избранное", brands: "Мои бренды", info: "Помощь" };
export function AccountSidebar({ currentTab, showSellerCabinet = false, onNavigate, onLogout }: {
  currentTab: AccountTab; ordersCount?: number; showSellerCabinet?: boolean; onNavigate?: (href: string) => void; onLogout: () => void;
}) {
  const items = (["profile","orders","returns","favorites","brands"] as const).map(tab=>({tab,label:accountTabTitles[tab]}));
  function click(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (onNavigate && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onNavigate(href); }
  }
  return <aside className={`${styles.sidebar} ${currentTab === "home" ? styles.root : ""}`}>
    <h1 className={styles.heading}>Профиль</h1>
    <nav aria-label="Меню аккаунта" className={styles.menu}>
      {items.map(({tab,label})=><Link key={tab} href={`/account?tab=${tab}`} className={styles.item} aria-current={currentTab === tab || currentTab === "home" && tab === "profile" ? "page" : undefined} onClick={event=>click(event,`/account?tab=${tab}`)}><span>{label}</span><span aria-hidden="true">↗</span></Link>)}
    </nav>
    <div className={styles.secondary}>
      <Link href="/account?tab=info" onClick={event=>click(event,"/account?tab=info")}>Помощь и контакты</Link>
      {showSellerCabinet ? <Link href="/seller/home" prefetch={false}>Кабинет продавца ↗</Link> : null}
      <button type="button" onClick={onLogout}>Выйти</button>
    </div>
  </aside>;
}
