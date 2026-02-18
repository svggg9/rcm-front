"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useClientAuth } from "../../lib/useClientAuth";
import styles from "./Order.module.css";

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

export default function OrderPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const isAuth = useClientAuth();

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderId = params?.id;

  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) router.push("/auth/login");
  }, [isAuth, router]);

  useEffect(() => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    apiFetch(`http://localhost:9696/api/orders/${orderId}`)
      .then(async (r: Response) => {
        if (!r.ok) {
          const text = await r.text();
          throw new Error(text || "Не удалось загрузить заказ");
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

  async function pay() {
    if (!order) return;

    setPaying(true);
    setError(null);

    try {
      const r = await apiFetch(
        `http://localhost:9696/api/pay/${order.id}`,
        { method: "POST" }
      );

      if (!r.ok) {
        const text = await r.text();
        setError(text || "Ошибка оплаты");
        return;
      }

      const updated: OrderResponse = await r.json();
      setOrder(updated);
    } catch {
      setError("Ошибка оплаты");
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <div className={styles.page}>Загрузка…</div>;
  if (error) return <div className={styles.page}>{error}</div>;
  if (!order) return <div className={styles.page}>Заказ не найден</div>;

  return (
    <div className={styles.page}>
      <h1>Заказ #{order.id}</h1>

      <div className={styles.meta}>
        <span>Статус:</span> <b>{order.status}</b>
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

      {order.status === "NEW" && (
        <button onClick={pay} disabled={paying} className={styles.payBtn}>
          {paying ? "Оплата…" : "Оплатить (mock)"}
        </button>
      )}
    </div>
  );
}
