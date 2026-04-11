"use client";

import { SellerOrderCard } from "./SellerOrderCard";
import styles from "../Seller.module.css";

type OrderItem = {
  productTitle: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  lineTotal: number;
};

type Order = {
  id: number;
  status: "NEW" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

type Props = {
  orders: Order[];
  refreshing: boolean;
  shippingId: number | null;
  formatStatus: (status: Order["status"]) => string;
  onRefresh: () => void;
  onShip: (orderId: number) => void;
  onOpenOrder: (orderId: number) => void;
};

export function SellerOrdersTab({
  orders,
  refreshing,
  shippingId,
  formatStatus,
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
        <div className={styles.empty}>Нет заказов в статусе PAID</div>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <SellerOrderCard
              key={order.id}
              order={order}
              shipping={shippingId === order.id}
              statusLabel={formatStatus(order.status)}
              onShip={onShip}
              onOpen={onOpenOrder}
            />
          ))}
        </div>
      )}
    </>
  );
}