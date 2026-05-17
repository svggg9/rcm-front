"use client";

import { useRouter } from "next/navigation";

export function EmptyCart() {
  const router = useRouter();

  return (
    <div className="emptyState">
      <h2 className="emptyStateTitle">Корзина пуста</h2>
      <p className="emptyStateText">Добавьте товары, чтобы оформить заказ</p>

      <div className="emptyStateActions">
        <button
          type="button"
          className="buttonPrimary"
          onClick={() => router.push("/catalog")}
        >
          Перейти в каталог
        </button>
      </div>
    </div>
  );
}