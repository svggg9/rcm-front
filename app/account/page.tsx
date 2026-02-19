"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { useClientAuth } from "../lib/useClientAuth";
import styles from "./Account.module.css";

type Me = {
  id: number;
  username: string;
  displayName: string | null;
  role: string;
};

type Order = {
  id: number;
  status: "NEW" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
  totalAmount: number;
  createdAt: string;
};

export default function AccountPage() {
  const router = useRouter();
  const isAuth = useClientAuth();

  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) router.push("/auth/login?next=/account");
  }, [isAuth, router]);

  useEffect(() => {
    if (isAuth !== true) return;

    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch("http://localhost:9696/api/profile").then(async (r) => {
        if (!r.ok) throw new Error(await r.text().catch(() => "") || `Ошибка /api/me (${r.status})`);
        return r.json() as Promise<Me>;
      }),
      apiFetch("http://localhost:9696/api/orders/my").then(async (r) => {
        if (!r.ok) throw new Error(await r.text().catch(() => "") || `Ошибка /api/orders/my (${r.status})`);
        return r.json() as Promise<Order[]>;
      }),
    ])
      .then(([meData, ordersData]) => {
        setMe(meData);
        setOrders(ordersData);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [isAuth]);

  if (isAuth === null || loading) return <div className={styles.page}>Загрузка…</div>;
  if (error) return <div className={styles.page}>{error}</div>;

  const name = me?.displayName?.trim() || me?.username || "Профиль";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.title}>Профиль</div>

        <div className={styles.field}>
          <div className={styles.label}>Имя</div>
          <div className={styles.value}>{name}</div>
        </div>

        <div className={styles.field}>
          <div className={styles.label}>Роль</div>
          <div className={styles.value}>{me?.role}</div>
        </div>

        <div className={styles.links}>
          <Link href="/orders" className={styles.linkBtn}>
            Открыть все заказы
          </Link>
        </div>
      </div>

      <h2 className={styles.subtitle}>История заказов</h2>

      {orders.length === 0 ? (
        <div className={styles.empty}>Пока нет заказов</div>
      ) : (
        <div className={styles.list}>
          {orders.slice(0, 10).map((o) => (
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
