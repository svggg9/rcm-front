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
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>Покупки</div>
          <h1 className={styles.title}>Мои заказы</h1>
          <p className={styles.hint}>
            История заказов, оплата и статус доставки.
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Пока нет заказов"
          text="Когда вы оформите заказ, он появится здесь."
        />
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <AccountOrderCard
              key={order.id}
              id={order.id}
              statusLabel={buildOrderStatusLabel(order)}
              dateLabel={new Date(order.createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
              amountLabel={`${order.totalAmount.toLocaleString()} ₽`}
              firstImageUrl={order.firstImageUrl}
              itemsCount={order.itemsCount}
              onClick={() => onOpenOrder(order.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}