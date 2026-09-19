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
  const searchParams = useSearchParams();
  const secondaryItems = currentTab === "products" ? [
    { label: "Товары", href: "/seller?tab=products", active: searchParams.get("section") !== "collections" },
    { label: "Подборки", href: "/seller?tab=products&section=collections", active: searchParams.get("section") === "collections" },
  ] : currentTab === "orders" || currentTab === "returns" ? [
    { label: "Заказы", href: "/seller?tab=orders", active: currentTab === "orders" },
    { label: "Возвраты", href: "/seller?tab=returns", active: currentTab === "returns" },
  ] : currentTab === "finance" ? [
    { label: "Обзор", href: "/seller?tab=finance", active: !["operations", "payouts"].includes(searchParams.get("view") || "") },
    { label: "Операции", href: "/seller?tab=finance&view=operations", active: searchParams.get("view") === "operations" },
    { label: "Выплаты", href: "/seller?tab=finance&view=payouts", active: searchParams.get("view") === "payouts" },
  ] : [];
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
      href: "/seller",
      label: "Обзор",
      tab: "home",
    },
    {
      href: "/seller?tab=products",
      label: "Каталог",
      tab: "products",
    },
    {
      href: "/seller?tab=orders",
      label: "Заказы",
      tab: "orders",
    },
    {
      href: "/seller?tab=finance",
      label: "Финансы",
      tab: "finance",
    },
    {
      href: "/seller?tab=brand",
      label: "Магазин",
      tab: "brand",
    },
    {
      href: "/seller?tab=legal",
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
    {secondaryItems.length > 0 && <nav className={styles.secondary} aria-label="Подразделы кабинета">
      {secondaryItems.map(item => <Link key={item.href} href={item.href} prefetch={false} aria-current={item.active ? "page" : undefined}
        className={`${styles.secondaryLink} ${item.active ? styles.secondaryActive : ""}`}>{item.label}</Link>)}
    </nav>}
    </div>
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
      <span>{item.label}</span>
    </Link>
  );
}
