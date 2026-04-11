"use client";

import { AccountOrderCard } from "./AccountOrderCard";
import styles from "../Account.module.css";

type OrderItemPreview = {
  imageUrl?: string;
};

type Order = {
  id: number;
  status: "NEW" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
  totalAmount: number;
  createdAt: string;
  items?: OrderItemPreview[];
};

type Props = {
  orders: Order[];
  formatStatus: (status: Order["status"]) => string;
  onOpenOrder: (orderId: number) => void;
};

export function AccountOrdersTab({
  orders,
  formatStatus,
  onOpenOrder,
}: Props) {
  return (
    <>
      <div className={styles.sectionTitle}>Мои заказы</div>

      {orders.length === 0 ? (
        <div className={styles.empty}>Пока нет заказов</div>
      ) : (
        <div className={styles.ordersPreviewList}>
          {orders.map((order) => (
            <AccountOrderCard
              key={order.id}
              id={order.id}
              statusLabel={formatStatus(order.status)}
              dateLabel={new Date(order.createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
              amountLabel={`${order.totalAmount.toLocaleString()} ₽`}
              items={Array.isArray(order.items) ? order.items : []}
              onClick={() => onOpenOrder(order.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}