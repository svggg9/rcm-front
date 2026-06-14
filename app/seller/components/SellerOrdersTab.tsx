import { EmptyState } from "../../components/ui/EmptyState";

import { SellerOrderCard } from "./SellerOrderCard";
import styles from "./SellerOrdersTab.module.css";

import type { SellerOrderListItem } from "../types";

type Props = {
  orders: SellerOrderListItem[];
  buildSellerStatusLabel: (order: SellerOrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
};

export function SellerOrdersTab({
  orders,
  buildSellerStatusLabel,
  onOpenOrder,
}: Props) {
  const paidCount = orders.filter((order) => order.paymentStatus === "PAID").length;
  const readyCount = orders.filter(
    (order) => order.deliveryStatus === "READY_FOR_SHIPMENT"
  ).length;
  const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <section className={styles.page}>
      <div className={styles.summary}>
        <SummaryItem label="Всего заказов" value={orders.length.toString()} />
        <SummaryItem label="Оплачены" value={paidCount.toString()} />
        <SummaryItem label="К отправке" value={readyCount.toString()} />
        <SummaryItem label="Оборот" value={`${totalAmount.toLocaleString()} ₽`} />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Пока нет заказов"
          text="Когда покупатели оформят заказы, они появятся здесь."
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
            <SellerOrderCard
              key={order.id}
              order={order}
              statusLabel={buildSellerStatusLabel(order)}
              onOpen={onOpenOrder}
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
