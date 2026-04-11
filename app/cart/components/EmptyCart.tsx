"use client";

import { useRouter } from "next/navigation";
import styles from "../Cart.module.css";

export function EmptyCart() {
  const router = useRouter();

  return (
    <div className={styles.empty}>
      <h2>Корзина пуста</h2>
      <p>Добавьте товары, чтобы оформить заказ</p>

      <button onClick={() => router.push("/catalog")}>
        Перейти в каталог
      </button>
    </div>
  );
}