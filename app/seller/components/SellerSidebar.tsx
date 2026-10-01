"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import type { SellerTab } from "../types";

import styles from "./SellerSidebar.module.css";

type Props = {
  currentTab: SellerTab;
  actions?: ReactNode;
};

type NavigationItem = {
  href: string;
  label: string;
  tab: SellerTab;
};

export function SellerSidebar({
  currentTab,
  actions,
}: Props) {
  const navigationRef = useRef<HTMLElement>(null);
  const activeTab = currentTab === "returns" ? "orders" : currentTab;

  useEffect(() => {
    const navigation = navigationRef.current;
    const active = navigation?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!navigation || !active) return;

    // Reveal the selected section without moving the page vertically.
    const start = active.offsetLeft;
    const end = start + active.offsetWidth;
    if (start < navigation.scrollLeft) navigation.scrollLeft = start;
    else if (end > navigation.scrollLeft + navigation.clientWidth) {
      navigation.scrollLeft = end - navigation.clientWidth;
    }
  }, [currentTab]);

  const primaryItems: NavigationItem[] = [
    {
      href: "/seller/home",
      label: "Обзор",
      tab: "home",
    },
    {
      href: "/seller/products",
      label: "Каталог",
      tab: "products",
    },
    {
      href: "/seller/orders",
      label: "Заказы",
      tab: "orders",
    },
    {
      href: "/seller/finance",
      label: "Финансы",
      tab: "finance",
    },
    {
      href: "/seller/store",
      label: "Магазин",
      tab: "brand",
    },
    {
      href: "/seller/legal",
      label: "Данные и документы",
      tab: "legal",
    },
  ];

  return (
    <div className={styles.bar}>
    <nav ref={navigationRef} className={styles.navigation} aria-label="Меню продавца">
      {primaryItems.map((item) => (
        <NavigationLink
          key={item.tab}
          item={item}
          active={activeTab === item.tab}
        />
      ))}
    </nav>
    {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

export function SellerSectionTabs({ currentTab }: { currentTab: SellerTab }) {
  const searchParams = useSearchParams();
  const collectionsActive = searchParams.get("section") === "collections";
  const financeView = searchParams.get("view");
  const items = currentTab === "products" ? [
    { label: "Товары", href: "/seller/products", active: !collectionsActive },
    { label: "Подборки", href: "/seller/products?section=collections", active: collectionsActive },
  ] : currentTab === "orders" || currentTab === "returns" ? [
    { label: "Заказы", href: "/seller/orders", active: currentTab === "orders" },
    { label: "Возвраты", href: "/seller/returns", active: currentTab === "returns" },
  ] : currentTab === "finance" ? [
    { label: "Обзор", href: "/seller/finance", active: financeView !== "operations" && financeView !== "payouts" },
    { label: "Операции", href: "/seller/finance?view=operations", active: financeView === "operations" },
    { label: "Выплаты", href: "/seller/finance?view=payouts", active: financeView === "payouts" },
  ] : [];

  if (items.length === 0) return null;

  return <nav className={`${styles.secondary} ${styles.contentTabs}`} aria-label="Подразделы кабинета">
    {items.map(item => <Link key={item.href} href={item.href} prefetch={false} aria-current={item.active ? "page" : undefined}
      className={`${styles.secondaryLink} ${item.active ? styles.secondaryActive : ""}`}>{item.label}</Link>)}
  </nav>;
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
      <span>{item.label}</span>
    </Link>
  );
}
