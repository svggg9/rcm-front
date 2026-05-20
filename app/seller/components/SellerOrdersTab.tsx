"use client";

import { SellerOrderCard } from "./SellerOrderCard";
import styles from "../Seller.module.css";
import { EmptyState } from "../../components/ui/EmptyState";

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
    <section className={styles.ordersPage}>
      <div className={styles.ordersHeader}>
        <div>
          <div className={styles.kicker}>Продажи</div>
          <h1 className={styles.sectionTitleNoMargin}>Заказы</h1>
          <p className={styles.productsHint}>
            Управление заказами, оплатой и отправкой.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className={styles.refreshBtn}
          disabled={refreshing}
        >
          {refreshing ? "Обновляем…" : "Обновить"}
        </button>
      </div>

      <div className={styles.ordersSummary}>
        <SummaryItem label="Всего заказов" value={orders.length.toString()} />
        <SummaryItem label="Оплачены" value={paidCount.toString()} />
        <SummaryItem label="К отправке" value={readyCount.toString()} />
        <SummaryItem label="Оборот" value={`${totalAmount.toLocaleString()} ₽`} />
      </div>

      <div className={styles.ordersToolbar}>
        <span>{orders.length ? `${orders.length} заказ(ов)` : "Список заказов"}</span>
        <span>Последние заказы продавца</span>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Пока нет заказов"
          text="Когда покупатели оформят заказы, они появятся здесь."
        />
      ) : (
        <div className={styles.ordersList}>
          <div className={styles.ordersListHead}>
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
    <div className={styles.ordersSummaryItem}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}