"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch, API_URL, getSellerOrdersList } from "../lib/api";

import { SellerSidebar } from "./components/SellerSidebar";
import { SellerOrdersTab } from "./components/SellerOrdersTab";
import { SellerOrderDetails } from "./components/SellerOrderDetails";
import { SellerProductsTab } from "./components/SellerProductsTab";
import { SellerBrandTab } from "./components/SellerBrandTab";
import { SellerLegalTab } from "./components/SellerLegalTab";
import { SellerOnboardingStatus } from "./components/SellerOnboardingStatus";
import { getSellerBrands } from "./lib/sellerBrandApi";

import type {
  PageResponse,
  SellerDeliveryStatus,
  SellerOrder,
  SellerOrderListItem,
  SellerOrderStatus,
  SellerPaymentStatus,
  SellerBrand,
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
    tabParam === "products" || tabParam === "brand" || tabParam === "legal"
      ? tabParam
      : "orders";

  const selectedOrderId = searchParams.get("orderId");

  const [orders, setOrders] = useState<SellerOrderListItem[]>(initialOrders);
  const [products, setProducts] = useState<SellerProductListItem[]>(initialProducts);
  const [storeName, setStoreName] = useState("Магазин");

  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [shippingId, setShippingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    let cancelled = false;

    getSellerBrands()
      .then((brands: SellerBrand[]) => {
        if (cancelled) return;
        setStoreName(brands[0]?.name?.trim() || "Магазин");
      })
      .catch(() => {
        if (cancelled) return;
        setStoreName("Магазин");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadOrders() {
    setError(null);

    try {
      const data: PageResponse<SellerOrderListItem> = await getSellerOrdersList({
        page: 0,
        size: 20,
      });

      setOrders(Array.isArray(data.content) ? data.content : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить заказы");
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

      await loadOrders();
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
          <SellerSidebar
            currentTab={currentTab}
            ordersCount={orders.length}
            storeName={storeName}
          />

          <div className={styles.content}>
            <SellerOnboardingStatus />

            {error ? <div className={styles.error}>{error}</div> : null}

            {currentTab === "brand" ? (
              <SellerBrandTab />
            ) : currentTab === "legal" ? (
              <SellerLegalTab />
            ) : currentTab === "products" ? (
              <SellerProductsTab products={products} loading={false} />
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
                buildSellerStatusLabel={buildSellerStatusLabel}
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
