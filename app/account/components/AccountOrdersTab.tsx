"use client";

import { EmptyState } from "../../components/ui/EmptyState";

import { AccountOrderCard } from "./AccountOrderCard";
import styles from "./AccountOrdersTab.module.css";

import type { OrderListItem } from "../types";

type Props = {
  orders: OrderListItem[];
  buildOrderStatusLabel: (order: OrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
};

export function AccountOrdersTab({
  orders,
  buildOrderStatusLabel,
  onOpenOrder,
}: Props) {
  return (
    <section className={styles.page}>
      <div className={styles.cardHeader}>
        <h2>
          <span>Заказы</span>
          <span className={styles.ordersCount}>{orders.length}</span>
        </h2>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="shopping-bag"
          tone="gold"
          title="Пока нет заказов"
          text="Когда вы оформите заказ, он появится здесь."
        />
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <AccountOrderCard
              key={order.id}
              order={order}
              statusLabel={buildOrderStatusLabel(order)}
              onClick={() => onOpenOrder(order.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
