"use client";

import Link from "next/link";

import { useAuthModal } from "../../components/AuthModal/useAuthModal";
import { EmptyState } from "../../components/ui/EmptyState";
import styles from "../Cart.module.css";

export function EmptyCart({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { openAuth } = useAuthModal();

  return (
    <div className={styles.emptyState}>
      <EmptyState
        icon="cart"
        title="Корзина пуста"
        text={isAuthenticated ? "Сейчас в корзине ничего нет." : (
          <>
            <span className={styles.emptyTextFull}>Сейчас в корзине ничего нет. Войдите или создайте аккаунт.</span>
            <span className={styles.emptyTextCompact}>Войдите или создайте аккаунт.</span>
          </>
        )}
        actions={
          isAuthenticated ? (
            <Link href="/catalog" className={styles.emptyAction}>
              Каталог
            </Link>
          ) : (
            <button type="button" className={styles.emptyAction} onClick={() => openAuth("login", "/cart")}>
              Войти
            </button>
          )
        }
      />
    </div>
  );
}
