// app/seller/page.tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClientAuth } from "../lib/useClientAuth";
import styles from "./SellerHome.module.css";

export default function SellerHomePage() {
  const router = useRouter();
  const isAuth = useClientAuth();

  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) router.push("/auth/login?next=/seller");
  }, [isAuth, router]);

  if (isAuth === null) return <div className={styles.page}>Загрузка…</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Кабинет продавца</h1>

      <div className={styles.grid}>
        <Link href="/seller/products/new" className={styles.card}>
          <div className={styles.cardTitle}>Добавить товар</div>
          <div className={styles.cardSub}>Создать карточку + варианты</div>
        </Link>

        <Link href="/seller/orders" className={styles.card}>
          <div className={styles.cardTitle}>Заказы</div>
          <div className={styles.cardSub}>PAID → SHIPPED</div>
        </Link>
      </div>
    </div>
  );
}
