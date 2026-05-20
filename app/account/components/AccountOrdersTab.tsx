"use client";

import { AccountOrderCard } from "./AccountOrderCard";
import styles from "../Account.module.css";

import type { OrderListItem } from "../types";
import { EmptyState } from "../../components/ui/EmptyState";

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
    <>
      <div className={styles.sectionTitle}>Мои заказы</div>

      {orders.length === 0 ? (
        <EmptyState
          title="Пока нет заказов"
          text="Когда вы оформите заказ, он появится здесь."
        />
      ) : (
        <div className={styles.ordersPreviewList}>
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
    </>
  );
}