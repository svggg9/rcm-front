"use client";

import { useRef, useState, type ReactNode } from "react";
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
  children,
}: {
  currentTab: AccountTab;
  orderId?: number | null;
  showSellerCabinet?: boolean;
  onNavigate?: (href: string) => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const isOrder = currentTab === "orders" && orderId != null;
  const logoutPending = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLoggingOut(true);
    try {
      const { storageCleared } = await logoutAuth();
      if (!storageCleared) toast.warning("Вы вышли, но не удалось удалить сохранённые данные этого браузера");
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Не удалось подтвердить выход. Попробуйте ещё раз");
    } finally {
      logoutPending.current = false;
      setLoggingOut(false);
    }
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
          <AccountSidebar currentTab={currentTab} showSellerCabinet={showSellerCabinet} onNavigate={onNavigate} onLogout={() => void logout()} logoutPending={loggingOut} />
          <div className={`${styles.content} ${currentTab === "home" ? styles.rootContent : ""} ${currentTab === "orders" && !isOrder ? styles.ordersContent : ""}`}>
            {isOrder ? (
              <header className={`${commerceStyles.header} ${styles.orderHeader}`}>
                <span aria-hidden="true" />
                <h1>№ {orderId}</h1>
                <button className={commerceStyles.iconButton} onClick={() => void copyNumber()} aria-label="Скопировать номер заказа"><Copy size={19} strokeWidth={1.3} /></button>
              </header>
            ) : (
              <header className={styles.screenHeader} data-account-section={currentTab}>
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
