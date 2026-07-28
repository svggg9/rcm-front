"use client";

import type { ReactNode } from "react";

import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import {
  SellerOrderCard,
  type OrderCardDetails,
} from "../../seller/components/SellerOrderCard";

import styles from "./AccountHomeTab.module.css";

import type { OrderListItem } from "../types";

type Props = {
  orders: OrderListItem[];
  buildOrderStatusLabel: (order: OrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
  onLoadOrder: (orderId: number) => Promise<OrderCardDetails>;
  onPrefetchOrder?: (orderId: number) => void;
  onOpenOrders: () => void;
  profileEditor: ReactNode;
};

export function AccountHomeTab({
  orders,
  buildOrderStatusLabel,
  onOpenOrder,
  onLoadOrder,
  onPrefetchOrder,
  onOpenOrders,
  profileEditor,
}: Props) {
  const recentOrders = orders.slice(0, 2);

  return (
    <section className={styles.page}>
      <section className={styles.profileSection} aria-label="Личные данные">
        {profileEditor}
      </section>

      <section className={styles.section} aria-label="Последние заказы">
        {orders.length > 0 ? (
          <div className={styles.ordersToolbar}>
            <button
              type="button"
              className={styles.textButton}
              onClick={onOpenOrders}
            >
              <span>Все заказы</span>
              <Icon name="chevron-right" size={15} strokeWidth={1.5} />
            </button>
          </div>
        ) : null}

        {recentOrders.length > 0 ? (
          <div className={styles.ordersList}>
            {recentOrders.map((order) => (
              <SellerOrderCard
                key={order.id}
                order={order}
                statusLabel={buildOrderStatusLabel(order)}
                onOpenOrder={onOpenOrder}
                onLoadDetails={onLoadOrder}
                onPrefetch={onPrefetchOrder}
                audience="buyer"
                showDeliveryLabel={false}
                showStageElapsed={false}
                openButtonLabel="Управление заказом"
                detailsIdPrefix="account-home-order"
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="shopping-bag"
            tone="gold"
            title="Заказов пока нет"
            text="Когда вы оформите первый заказ, он появится здесь."
          />
        )}
      </section>
    </section>
  );
}
