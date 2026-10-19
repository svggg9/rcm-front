"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { logout as logoutAuth } from "../../lib/auth";
import { toast } from "../../components/ui/toast";
import { AccountSidebar, accountTabTitles, type AccountTab } from "./AccountSidebar";
import styles from "../AccountPageClient.module.css";
import commerceStyles from "./AccountCommerce.module.css";

export function AccountFrame({
  currentTab,
  orderId,
  showSellerCabinet = false,
  onNavigate,
  onLogout,
  children,
}: {
  currentTab: AccountTab;
  orderId?: number | null;
  showSellerCabinet?: boolean;
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const isOrder = currentTab === "orders" && orderId != null;

  async function logout() {
    await logoutAuth();
    router.replace("/");
    router.refresh();
  }

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(String(orderId));
      toast.success("Номер заказа скопирован");
    } catch {
      toast.error("Не удалось скопировать номер");
    }
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.layout}>
          <AccountSidebar currentTab={currentTab} showSellerCabinet={showSellerCabinet} onNavigate={onNavigate} onLogout={onLogout ?? (() => void logout())} />
          <div className={`${styles.content} ${currentTab === "home" ? styles.rootContent : ""} ${currentTab === "orders" && !isOrder ? styles.ordersContent : ""}`}>
            {isOrder ? (
              <header className={`${commerceStyles.header} ${styles.orderHeader}`}>
                <span aria-hidden="true" />
                <h1>№ {orderId}</h1>
                <button className={commerceStyles.iconButton} onClick={() => void copyNumber()} aria-label="Скопировать номер заказа"><Copy size={19} strokeWidth={1.3} /></button>
              </header>
            ) : (
              <header className={styles.screenHeader}>
                <span aria-hidden="true" />
                <h1>{accountTabTitles[currentTab === "home" ? "profile" : currentTab]}</h1>
                <span />
              </header>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
