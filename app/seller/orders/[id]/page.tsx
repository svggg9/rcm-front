// app/seller/orders/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { useClientAuth } from "../../../lib/useClientAuth";
import styles from "./SellerOrder.module.css";

type OrderItem = {
  productTitle: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  lineTotal: number;
};

type OrderResponse = {
  id: number;
  status: "NEW" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

export default function SellerOrderPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const isAuth = useClientAuth();

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderId = params?.id;

  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) router.push("/auth/login?next=/seller/orders");
  }, [isAuth, router]);

  useEffect(() => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    apiFetch(`http://localhost:9696/api/orders/${orderId}/seller`)
      .then(async (r: Response) => {
        if (!r.ok) {
          const text = await r.text().catch(() => "");
          throw new Error(text || `Ошибка загрузки (${r.status})`);
        }
        return r.json();
      })
      .then((data: OrderResponse) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [orderId]);

  async function ship() {
    if (!order) return;

    setShipping(true);
    setError(null);

    try {
      const r = await apiFetch(`http://localhost:9696/api/orders/${order.id}/ship`, {
        method: "POST",
      });

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        setError(text || `Ошибка отправки (${r.status})`);
        return;
      }

      const updated: OrderResponse = await r.json();
      setOrder(updated);
    } catch {
      setError("Ошибка отправки (network)");
    } finally {
      setShipping(false);
    }
  }

  if (loading) return <div className={styles.page}>Загрузка…</div>;
  if (error) return <div className={styles.page}>{error}</div>;
  if (!order) return <div className={styles.page}>Заказ не найден</div>;

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <h1 className={styles.title}>Заказ #{order.id}</h1>
        <button type="button" onClick={() => router.push("/seller/orders")} className={styles.backBtn}>
          Назад
        </button>
      </div>

      <div className={styles.meta}>
        <span>Статус:</span> <b>{order.status}</b>
        <span className={styles.dot}>·</span>
        <span className={styles.muted}>{new Date(order.createdAt).toLocaleString()}</span>
      </div>

      <div className={styles.list}>
        {order.items.map((it, idx) => (
          <div key={idx} className={styles.row}>
            <div className={styles.itemMeta}>
              <div>{it.productTitle}</div>
              <div className={styles.sub}>
                {it.size} / {it.color} — {it.quantity} × {it.price} ₽
              </div>
            </div>

            <div className={styles.lineTotal}>
              {it.lineTotal.toLocaleString()} ₽
            </div>
          </div>
        ))}
      </div>

      <div className={styles.total}>
        Итого: {order.totalAmount.toLocaleString()} ₽
      </div>

      {order.status === "PAID" && (
        <button onClick={ship} disabled={shipping} className={styles.primaryBtn}>
          {shipping ? "Отмечаем…" : "Отправил"}
        </button>
      )}
    </div>
  );
}
