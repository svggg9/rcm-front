"use client";

import { AccountOrderCard } from "./AccountOrderCard";
import styles from "../Account.module.css";

import type { Order } from "../types";

type Props = {
  orders: Order[];
  buildOrderStatusLabel: (order: Order) => string;
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
        <div className={styles.empty}>Пока нет заказов</div>
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
              amountLabel={`${order.totalAmount.toLocaleString("ru-RU")} ₽`}
              items={Array.isArray(order.items) ? order.items : []}
              deliveryMethod={order.delivery?.method ?? order.deliveryMethod}
              deliveryShipmentStatus={order.delivery?.shipmentStatus ?? null}
              deliveryPriceAmount={order.delivery?.priceAmount ?? order.deliveryAmount}
              onClick={() => onOpenOrder(order.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}