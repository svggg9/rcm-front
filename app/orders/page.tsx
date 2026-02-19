"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { useClientAuth } from "../lib/useClientAuth";
import styles from "./Orders.module.css";

type Order = {
  id: number;
  status: "NEW" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
  totalAmount: number;
  createdAt: string;
};

export default function OrdersPage() {
  const router = useRouter();
  const isAuth = useClientAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) router.push("/auth/login?next=/orders");
  }, [isAuth, router]);

  useEffect(() => {
    if (isAuth !== true) return;

    setLoading(true);
    setError(null);

    apiFetch("http://localhost:9696/api/orders/my")
      .then(async (r: Response) => {
        if (!r.ok) {
          const text = await r.text().catch(() => "");
          throw new Error(text || `Ошибка загрузки (${r.status})`);
        }
        return r.json();
      })
      .then((data: Order[]) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [isAuth]);

  if (isAuth === null || loading) return <div className={styles.page}>Загрузка…</div>;
  if (error) return <div className={styles.page}>{error}</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Мои заказы</h1>

      {orders.length === 0 ? (
        <div className={styles.empty}>Пока нет заказов</div>
      ) : (
        <div className={styles.list}>
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className={styles.row}>
              <div className={styles.left}>
                <div className={styles.rowTitle}>Заказ #{o.id}</div>
                <div className={styles.sub}>
                  {new Date(o.createdAt).toLocaleString()}
                </div>
              </div>

              <div className={styles.right}>
                <div className={styles.amount}>
                  {o.totalAmount.toLocaleString()} ₽
                </div>
                <div className={styles.status}>{o.status}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
