// app/seller/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useClientAuth } from "../../lib/useClientAuth";
import styles from "./SellerOrders.module.css";

type OrderItem = {
  productTitle: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  lineTotal: number;
};

type Order = {
  id: number;
  status: "NEW" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

export default function SellerOrdersPage() {
  const router = useRouter();
  const isAuth = useClientAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // guard
  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) router.push("/auth/login?next=/seller/orders");
  }, [isAuth, router]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const r = await apiFetch("http://localhost:9696/api/orders/seller");
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(text || `Ошибка загрузки (${r.status})`);
      }
      const data: Order[] = await r.json();
      setOrders(data);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuth !== true) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  async function ship(orderId: number) {
    setShippingId(orderId);
    setError(null);

    try {
      const r = await apiFetch(`http://localhost:9696/api/orders/${orderId}/ship`, {
        method: "POST",
      });

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(text || `Ошибка отправки (${r.status})`);
      }

      // обновляем список
      await load();
    } catch (e: any) {
      setError(e?.message || "Не удалось отметить отправку");
    } finally {
      setShippingId(null);
    }
  }

  if (isAuth === null || loading) return <div className={styles.page}>Загрузка…</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Заказы продавца</h1>
        <button type="button" onClick={load} className={styles.refreshBtn}>
          Обновить
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {orders.length === 0 ? (
        <div className={styles.empty}>Нет заказов в статусе PAID</div>
      ) : (
        <div className={styles.list}>
          {orders.map((o) => (
            <div key={o.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <div className={styles.orderTitle}>Заказ #{o.id}</div>
                  <div className={styles.muted}>
                    {new Date(o.createdAt).toLocaleString()} · статус <b>{o.status}</b>
                  </div>
                </div>

                <div className={styles.total}>
                  {o.totalAmount.toLocaleString()} ₽
                </div>
              </div>

              <div className={styles.items}>
                {o.items.map((it, idx) => (
                  <div key={idx} className={styles.itemRow}>
                    <div className={styles.itemMeta}>
                      <div>{it.productTitle}</div>
                      <div className={styles.muted}>
                        {it.size} / {it.color} — {it.quantity} × {it.price} ₽
                      </div>
                    </div>
                    <div className={styles.lineTotal}>
                      {it.lineTotal.toLocaleString()} ₽
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={() => ship(o.id)}
                  disabled={shippingId === o.id}
                  className={styles.primaryBtn}
                >
                  {shippingId === o.id ? "Отмечаем…" : "Отправил"}
                </button>

                    <button
                    type="button"
                    onClick={() => router.push(`/seller/orders/${o.id}`)}
                    className={styles.secondaryBtn}
                    >
                    Открыть
                    </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
