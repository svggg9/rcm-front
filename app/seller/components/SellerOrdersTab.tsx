"use client";

import { SellerOrderCard } from "./SellerOrderCard";
import styles from "../Seller.module.css";

import type { SellerOrder } from "../types";

type Props = {
  orders: SellerOrder[];
  refreshing: boolean;
  shippingId: number | null;
  buildSellerStatusLabel: (order: SellerOrder) => string;
  canShipOrder: (order: SellerOrder) => boolean;
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
  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.sectionTitle}>Заказы продавца</h1>

        <button
          type="button"
          onClick={onRefresh}
          className={styles.refreshBtn}
          disabled={refreshing}
        >
          {refreshing ? "Обновляем…" : "Обновить"}
        </button>
      </div>

      {orders.length === 0 ? (
        <div className={styles.empty}>Пока нет заказов</div>
      ) : (
        <div className={styles.list}>
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
    </>
  );
}