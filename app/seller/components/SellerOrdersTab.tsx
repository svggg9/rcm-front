"use client";

import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";

import { SellerOrderCard } from "./SellerOrderCard";
import styles from "./SellerOrdersTab.module.css";

import type { SellerOrderListItem } from "../types";

type Props = {
  orders: SellerOrderListItem[];
  refreshing: boolean;
  shippingId: number | null;
  buildSellerStatusLabel: (order: SellerOrderListItem) => string;
  canShipOrder: (order: SellerOrderListItem) => boolean;
  onRefresh: () => void;
  onShip: (orderId: number) => void;
  onOpenOrder: (orderId: number) => void;
};

export function SellerOrdersTab({
  orders,
  refreshing,
  shippingId,
  buildSellerStatusLabel,
  canShipOrder,
  onRefresh,
  onShip,
  onOpenOrder,
}: Props) {
  const paidCount = orders.filter((order) => order.paymentStatus === "PAID").length;
  const readyCount = orders.filter(
    (order) => order.deliveryStatus === "READY_FOR_SHIPMENT"
  ).length;
  const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>Продажи</div>
          <h1 className={styles.title}>Заказы</h1>
          <p className={styles.hint}>
            Управление заказами, оплатой и отправкой.
          </p>
        </div>

        <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Обновляем…" : "Обновить"}
        </Button>
      </div>

      <div className={styles.summary}>
        <SummaryItem label="Всего заказов" value={orders.length.toString()} />
        <SummaryItem label="Оплачены" value={paidCount.toString()} />
        <SummaryItem label="К отправке" value={readyCount.toString()} />
        <SummaryItem label="Оборот" value={`${totalAmount.toLocaleString()} ₽`} />
      </div>

      <div className={styles.toolbar}>
        <span>{orders.length ? `${orders.length} заказ(ов)` : "Список заказов"}</span>
        <span>Последние заказы продавца</span>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Пока нет заказов"
          text="Когда покупатели оформят заказы, они появятся здесь."
        />
      ) : (
        <div className={styles.list}>
          <div className={styles.listHead}>
            <span>Заказ</span>
            <span>Сумма</span>
            <span>Действия</span>
          </div>

          {orders.map((order) => (
            <SellerOrderCard
              key={order.id}
              order={order}
              shipping={shippingId === order.id}
              canShip={canShipOrder(order)}
              statusLabel={buildSellerStatusLabel(order)}
              onShip={onShip}
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