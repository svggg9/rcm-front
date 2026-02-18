"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { getCartId, getToken } from "../lib/auth";
import { emitCartChanged } from "../lib/cartEvents";
import { useClientAuth } from "../lib/useClientAuth";
import styles from "./Checkout.module.css";

type CartItem = {
  productId: number;
  variantId: number;
  title: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

type OrderResponse = {
  id: number;
};

export default function CheckoutPage() {
  const router = useRouter();
  const isAuth = useClientAuth();
  const cartId = getCartId();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // guard: только auth
  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) router.push("/auth/login?next=/checkout");
  }, [isAuth, router]);

  // грузим корзину
  useEffect(() => {
    if (!cartId) return;

    setLoading(true);
    apiFetch(`http://localhost:9696/api/cart?cartId=${cartId}`)
      .then((r: Response) => r.json())
      .then((data: CartItem[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Не удалось загрузить корзину");
        setLoading(false);
      });
  }, [cartId]);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  async function submitOrder() {
    if (isAuth !== true) {
      router.push("/auth/login?next=/checkout");
      return;
    }

    if (!cartId || items.length === 0) return;

    const token = getToken();
    if (!token) {
      router.push("/auth/login?next=/checkout");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const r = await fetch(
        `http://localhost:9696/api/orders/checkout?cartId=${encodeURIComponent(
          cartId
        )}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        setError(text || `Ошибка оформления заказа (${r.status})`);
        return;
      }

      const order: OrderResponse = await r.json();

      emitCartChanged();
      router.push(`/orders/${order.id}`);
    } catch {
      setError("Ошибка оформления заказа (network)");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className={styles.page}>Загрузка…</div>;
  if (!cartId) return <div className={styles.page}>Нет cartId</div>;

  return (
    <div className={styles.page}>
      <h1>Оформление заказа</h1>

      {items.length === 0 ? (
        <p>Корзина пуста</p>
      ) : (
        <>
          <div className={styles.list}>
            {items.map((item) => (
              <div key={item.variantId} className={styles.row}>
                <img
                  src={item.imageUrl}
                  width={64}
                  height={64}
                  className={styles.image}
                  alt=""
                />

                <div className={styles.meta}>
                  <div>{item.title}</div>
                  <div className={styles.sub}>
                    {item.size} / {item.color}
                  </div>
                  <div className={styles.sub}>
                    {item.quantity} × {item.price} ₽
                  </div>
                </div>

                <div className={styles.lineTotal}>
                  {(item.price * item.quantity).toLocaleString()} ₽
                </div>
              </div>
            ))}
          </div>

          <div className={styles.total}>Итого: {total.toLocaleString()} ₽</div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="button"
            onClick={submitOrder}
            disabled={submitting}
            className={styles.submitBtn}
          >
            {submitting ? "Оформляем…" : "Подтвердить заказ"}
          </button>
        </>
      )}
    </div>
  );
}
