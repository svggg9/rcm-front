"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch, API_URL, getSellerOrdersList } from "../lib/api";

import { SellerSidebar } from "./components/SellerSidebar";
import { SellerOrdersTab } from "./components/SellerOrdersTab";
import { SellerOrderDetails } from "./components/SellerOrderDetails";
import { SellerProductsTab } from "./components/SellerProductsTab";
import { SellerBrandTab } from "./components/SellerBrandTab";

import type {
  PageResponse,
  SellerDeliveryStatus,
  SellerOrder,
  SellerOrderListItem,
  SellerOrderStatus,
  SellerPaymentStatus,
  SellerProductListItem,
  SellerTab,
} from "./types";

import styles from "./SellerPageClient.module.css";

function formatOrderStatus(status: SellerOrderStatus): string {
  switch (status) {
    case "NEW":
      return "Новый";
    case "CONFIRMED":
      return "Подтверждён";
    case "COMPLETED":
      return "Завершён";
    case "CANCELED":
      return "Отменён";
    default:
      return status;
  }
}

function formatPaymentStatus(status: SellerPaymentStatus): string {
  switch (status) {
    case "PENDING":
      return "Ожидает оплаты";
    case "PAID":
      return "Оплачен";
    case "FAILED":
      return "Ошибка оплаты";
    case "CANCELED":
      return "Оплата отменена";
    default:
      return status;
  }
}

function formatDeliveryStatus(status: SellerDeliveryStatus): string {
  switch (status) {
    case "PENDING":
      return "Ожидает обработки";
    case "READY_FOR_SHIPMENT":
      return "Готов к отправке";
    case "READY_FOR_PICKUP":
      return "Готов к выдаче";
    case "IN_TRANSIT":
      return "В пути";
    case "DELIVERED":
      return "Доставлен";
    case "RETURNED":
      return "Возвращён";
    case "CANCELLED":
      return "Отменён";
    default:
      return status;
  }
}

function buildSellerStatusLabel(order: SellerOrder | SellerOrderListItem): string {
  if (order.paymentStatus === "PENDING") return "Ожидает оплаты";
  if (order.paymentStatus === "FAILED") return "Ошибка оплаты";
  if (order.deliveryStatus === "READY_FOR_SHIPMENT") return "Готов к отправке";
  if (order.deliveryStatus === "READY_FOR_PICKUP") return "Готов к выдаче";
  if (order.deliveryStatus === "IN_TRANSIT") return "В пути";
  if (order.deliveryStatus === "DELIVERED") return "Доставлен";
  if (order.deliveryStatus === "RETURNED") return "Возвращён";
  if (order.deliveryStatus === "CANCELLED") return "Отменён";

  return formatOrderStatus(order.status);
}

function canShipOrder(order: SellerOrder | SellerOrderListItem): boolean {
  return (
    order.paymentStatus === "PAID" &&
    (order.deliveryStatus === "PENDING" ||
      order.deliveryStatus === "READY_FOR_SHIPMENT")
  );
}

type Props = {
  initialProducts: SellerProductListItem[];
  initialOrders: SellerOrderListItem[];
};

function SellerPageContent({ initialProducts, initialOrders }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");

  const currentTab: SellerTab =
    tabParam === "products" || tabParam === "brand" ? tabParam : "orders";
  const selectedOrderId = searchParams.get("orderId");

  const [orders, setOrders] = useState<SellerOrderListItem[]>(initialOrders);
  const [products, setProducts] = useState<SellerProductListItem[]>(initialProducts);

  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [shippingId, setShippingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  async function loadOrders(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (silent) {
      setRefreshing(true);
    }

    setError(null);

    try {
      const data: PageResponse<SellerOrderListItem> = await getSellerOrdersList({
        page: 0,
        size: 20,
      });

      setOrders(Array.isArray(data.content) ? data.content : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить заказы");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (currentTab !== "orders" || !selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    let cancelled = false;

    setDetailsLoading(true);
    setError(null);

    apiFetch(`${API_URL}/api/seller/orders/${selectedOrderId}`)
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `Ошибка загрузки (${response.status})`);
        }

        return response.json() as Promise<SellerOrder>;
      })
      .then((data) => {
        if (cancelled) return;
        setSelectedOrder(data);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
      })
      .finally(() => {
        if (cancelled) return;
        setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTab, selectedOrderId]);

  async function ship(orderId: number) {
    setShippingId(orderId);
    setError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/seller/orders/${orderId}/ship`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка отправки (${response.status})`);
      }

      if (selectedOrder?.id === orderId) {
        const updated: SellerOrder = await response.json();
        setSelectedOrder(updated);
      }

      await loadOrders({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отметить отправку");
    } finally {
      setShippingId(null);
    }
  }

  function openOrder(orderId: number) {
    router.push(`/seller?tab=orders&orderId=${orderId}`);
  }

  function closeOrderDetails() {
    router.push("/seller?tab=orders");
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.layout}>
          <SellerSidebar currentTab={currentTab} ordersCount={orders.length} />

          <div className={styles.content}>
            {error ? <div className={styles.error}>{error}</div> : null}

            {currentTab === "brand" ? (
              <SellerBrandTab />
            ) : currentTab === "products" ? (
              <SellerProductsTab
                products={products}
                loading={false}
              />
            ) : detailsLoading ? (
              <div className={styles.sectionTitle}>Загрузка заказа…</div>
            ) : selectedOrder ? (
              <SellerOrderDetails
                order={selectedOrder}
                shipping={shippingId === selectedOrder.id}
                canShip={canShipOrder(selectedOrder)}
                onBack={closeOrderDetails}
                onShip={() => void ship(selectedOrder.id)}
                formatOrderStatus={formatOrderStatus}
                formatPaymentStatus={formatPaymentStatus}
                formatDeliveryStatus={formatDeliveryStatus}
                buildSellerStatusLabel={buildSellerStatusLabel}
              />
            ) : (
              <SellerOrdersTab
                orders={orders}
                refreshing={refreshing}
                shippingId={shippingId}
                buildSellerStatusLabel={buildSellerStatusLabel}
                canShipOrder={canShipOrder}
                onRefresh={() => void loadOrders({ silent: true })}
                onShip={(orderId) => void ship(orderId)}
                onOpenOrder={openOrder}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SellerPageClient(props: Props) {
  return <SellerPageContent {...props} />;
}