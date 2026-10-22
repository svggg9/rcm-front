"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, type FocusEvent, type ReactNode } from "react";
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

function revealNavigationLink(navigation: HTMLElement, link: HTMLElement) {
  const viewport = navigation.getBoundingClientRect();
  const item = (link.closest<HTMLElement>("[data-seller-navigation-item]") ?? link).getBoundingClientRect();
  if (item.left < viewport.left) navigation.scrollLeft += item.left - viewport.left;
  else if (item.right > viewport.right) navigation.scrollLeft += item.right - viewport.right;
}

function revealFocusedLink(event: FocusEvent<HTMLElement>) {
  const link = event.target.closest("a");
  if (link) revealNavigationLink(event.currentTarget, link);
}

function useNavigationVisibility(selectedSection: string) {
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const revealActive = () => {
      const active = navigation.querySelector<HTMLElement>('[aria-current="page"]');
      if (active) revealNavigationLink(navigation, active);
    };
    revealActive();
    const observer = new ResizeObserver(revealActive);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, [selectedSection]);

  return navigationRef;
}

export function SellerSidebar({
  currentTab,
  actions,
}: Props) {
  const activeTab = currentTab === "returns" ? "orders" : currentTab;
  const navigationRef = useNavigationVisibility(activeTab);

  const primaryItems: NavigationItem[] = [
    {
      href: "/seller/home",
      label: "Обзор магазина",
      tab: "home",
    },
    {
      href: "/seller/products",
      label: "Товары",
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
      <nav ref={navigationRef} className={styles.navigation} aria-label="Меню продавца" onFocus={revealFocusedLink}>
        <div className={styles.navigationTrack}>
          {primaryItems.map((item) => (
            <NavigationLink
              key={item.tab}
              item={item}
              active={activeTab === item.tab}
            />
          ))}
        </div>
      </nav>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

export function SellerSectionTabs({ currentTab }: { currentTab: SellerTab }) {
  const searchParams = useSearchParams();
  const collectionsActive = searchParams.get("section") === "collections";
  const financeView = searchParams.get("view");
  const navigationRef = useNavigationVisibility(`${currentTab}:${collectionsActive}:${financeView}`);
  const items = [
    { label: "Главная", href: "/seller/home", active: currentTab === "home" },
    { label: "Товары", href: "/seller/products", active: currentTab === "products" && !collectionsActive },
    { label: "Подборки", href: "/seller/products?section=collections", active: currentTab === "products" && collectionsActive },
    { label: "Заказы", href: "/seller/orders", active: currentTab === "orders" },
    { label: "Возвраты", href: "/seller/returns", active: currentTab === "returns" },
    { label: "Обзор финансов", href: "/seller/finance", active: currentTab === "finance" && financeView !== "operations" && financeView !== "payouts" },
    { label: "Операции", href: "/seller/finance?view=operations", active: currentTab === "finance" && financeView === "operations" },
    { label: "Выплаты", href: "/seller/finance?view=payouts", active: currentTab === "finance" && financeView === "payouts" },
    { label: "Магазин", href: "/seller/store", active: currentTab === "brand" },
    { label: "Данные и документы", href: "/seller/legal", active: currentTab === "legal" },
  ];

  return (
    <nav ref={navigationRef} className={styles.secondary} aria-label="Подразделы кабинета" onFocus={revealFocusedLink}>
      <div className={styles.navigationTrack}>
        {items.map(item => (
          <Link key={item.href} href={item.href} prefetch={false} aria-current={item.active ? "page" : undefined}
            className={`${styles.navigationLink} ${item.active ? styles.navigationLinkActive : ""}`}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
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
    <div className={styles.navigationItem} data-seller-navigation-item>
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
    </div>
  );
}
