"use client";

import { CabinetSidebar } from "../../components/ui/CabinetSidebar";

import type { AdminTab } from "../types";

type Props = {
  currentTab: AdminTab;
  onNavigate?: (href: string) => void;
};

export function AdminSidebar({
  currentTab,
  onNavigate,
}: Props) {
  return (
    <CabinetSidebar
      ariaLabel="Меню администратора"
      mobileInline
      subtitle="рцмаркет"
      title="Админка"
      onNavigate={onNavigate}
      items={[
        {href:"/admin?tab=overview",label:"Обзор",icon:"dashboard",active:currentTab==="overview"},
        {
          href: "/admin?tab=storefront",
          label: "Витрина",
          mobileLabel: "Витрина",
          icon: "dashboard",
          active: currentTab === "storefront",
        },
        {
          href: "/admin?tab=products",
          label: "Товары",
          mobileLabel: "Товары",
          icon: "package",
          active: currentTab === "products",
        },
        {
          href: "/admin?tab=orders",
          label: "Заказы",
          mobileLabel: "Заказы",
          icon: "shopping-bag",
          active: currentTab === "orders",
        },
        {href:"/admin?tab=returns",label:"Возвраты",icon:"shopping-bag",active:currentTab==="returns"},
        {
          href: "/admin?tab=sellers",
          label: "Продавцы",
          mobileLabel: "Продавцы",
          icon: "store",
          active: currentTab === "sellers",
        },
        {
          href: "/admin?tab=contact-messages",
          label: "Обращения",
          mobileLabel: "Обращения",
          icon: "file",
          active: currentTab === "contact-messages",
        },
        {
          href: "/admin?tab=dictionaries",
          label: "Справочники",
          mobileLabel: "Справочники",
          icon: "settings",
          active: currentTab === "dictionaries",
        },
        {
          href: "/admin?tab=finance",
          label: "Финансы",
          mobileLabel: "Финансы",
          icon: "money",
          active: currentTab === "finance",
        },
        {
          href: "/admin?tab=delivery",
          label: "Доставка",
          mobileLabel: "Доставка",
          icon: "truck",
          active: currentTab === "delivery",
        },
        {href:"/admin?tab=activity",label:"История действий",icon:"file",active:currentTab==="activity"},
      ]}
    />
  );
}
