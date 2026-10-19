"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, type FocusEvent, type ReactNode } from "react";
import type { SellerTab } from "../types";
import { NotificationBadge } from "../../components/ui/NotificationBadge";
import type { SellerNavigationAttention } from "../lib/sellerNavigationAttention";
import { useSellerAttention } from "../lib/SellerAttentionContext";

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
  const attention = useSellerAttention();
  const attentionKey = Object.entries(attention.items).map(([tab, item]) => `${tab}:${item.href}:${item.label}:${item.count ?? ""}`).join("|");
  const navigationRef = useNavigationVisibility(`${activeTab}:${attentionKey}`);

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
      <nav ref={navigationRef} className={styles.navigation} aria-label="Меню продавца" aria-busy={attention.loading} onFocus={revealFocusedLink}>
        <div className={styles.navigationTrack}>
          {primaryItems.map((item) => (
            <NavigationLink
              key={item.tab}
              item={item}
              active={activeTab === item.tab}
              attention={attention.items[item.tab]}
              onRefreshAttention={attention.refresh}
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
  attention,
  onRefreshAttention,
}: {
  item: NavigationItem;
  active: boolean;
  attention?: SellerNavigationAttention;
  onRefreshAttention: () => void;
}) {
  return (
    <div className={styles.navigationItem} data-seller-navigation-item>
      <Link
        href={item.href}
        className={`${styles.navigationLink} ${
          active ? styles.navigationLinkActive : ""
        } ${attention ? styles.navigationLinkWithAttention : ""}`}
        aria-current={active ? "page" : undefined}
        prefetch={false}
      >
        <span>{item.label}</span>
      </Link>
      {attention && (
        <Link
          href={attention.href}
          prefetch={false}
          className={styles.attentionLink}
          aria-label={`${item.label}: ${attention.description}`}
          title={attention.description}
          onClick={onRefreshAttention}
          data-seller-attention={item.tab}
        >
          <NotificationBadge count={attention.count} muted={attention.tone === "default"} />
        </Link>
      )}
    </div>
  );
}
