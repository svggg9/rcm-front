"use client";

import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { AccountOrderCard } from "./AccountOrderCard";

import styles from "./AccountHomeTab.module.css";

import type { Me, OrderListItem } from "../types";

type Props = {
  me: Me | null;
  orders: OrderListItem[];
  buildOrderStatusLabel: (order: OrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
  onPrefetchOrder?: (orderId: number) => void;
  onOpenOrders: () => void;
  onOpenProfile: () => void;
  onOpenFavorites: () => void;
};

function formatFullName(me: Me | null): string {
  if (!me) return "—";

  const fullName = [me.lastName, me.firstName, me.middleName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || me.displayName || me.email || "—";
}

export function AccountHomeTab({
  me,
  orders,
  buildOrderStatusLabel,
  onOpenOrder,
  onPrefetchOrder,
  onOpenOrders,
  onOpenProfile,
  onOpenFavorites,
}: Props) {
  const recentOrders = orders.slice(0, 3);

  return (
    <section className={styles.page}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Последние заказы</h2>
          {orders.length > 0 ? (
            <button type="button" className={styles.textButton} onClick={onOpenOrders}>
              Все заказы
            </button>
          ) : null}
        </div>

        {recentOrders.length > 0 ? (
          <div className={styles.ordersList}>
            {recentOrders.map((order) => (
              <AccountOrderCard
                key={order.id}
                order={order}
                statusLabel={buildOrderStatusLabel(order)}
                onClick={() => onOpenOrder(order.id)}
                onPrefetch={() => onPrefetchOrder?.(order.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="shopping-bag"
            tone="gold"
            title="Заказов пока нет"
            text="Когда вы оформите первый заказ, он появится здесь."
          />
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Личные данные</h2>
          <button type="button" className={styles.textButton} onClick={onOpenProfile}>
            Изменить
          </button>
        </div>

        <dl className={styles.profileGrid}>
          <div>
            <dt>Имя</dt>
            <dd>{formatFullName(me)}</dd>
          </div>
          <div>
            <dt>Электронная почта</dt>
            <dd>{me?.email || "—"}</dd>
          </div>
          <div>
            <dt>Телефон</dt>
            <dd>{me?.phone || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.quickSection}>
        <Button type="button" variant="secondary" onClick={onOpenFavorites}>
          Перейти в избранное
        </Button>
      </section>
    </section>
  );
}
