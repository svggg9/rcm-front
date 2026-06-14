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
  const paidCount = orders.filter((order) => order.paymentStatus === "PAID").length;
  const transitCount = orders.filter(
    (order) => order.deliveryStatus === "IN_TRANSIT"
  ).length;
  const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <section className={styles.page}>
      <div className={styles.summary}>
        <SummaryItem label="Всего заказов" value={orders.length.toString()} />
        <SummaryItem label="Оплачены" value={paidCount.toString()} />
        <SummaryItem label="В пути" value={transitCount.toString()} />
        <SummaryItem label="Сумма покупок" value={`${totalAmount.toLocaleString()} ₽`} />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Пока нет заказов"
          text="Когда вы оформите заказ, он появится здесь."
        />
      ) : (
        <div className={styles.list}>
          <div className={styles.listHead}>
            <span>Товары</span>
            <span>Заказ</span>
            <span>Состав</span>
            <span>Сумма</span>
            <span>Статус</span>
          </div>

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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryItem}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
