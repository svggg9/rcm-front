"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { apiFetch, API_URL } from "../lib/api";
import { useSessionResourceCache } from "../lib/useSessionResourceCache";
import { CabinetSkeleton } from "../components/ui/CabinetSkeleton";

import { SellerSidebar } from "./components/SellerSidebar";
import { SellerOrdersTab } from "./components/SellerOrdersTab";
import { SellerOrderDetails } from "./components/SellerOrderDetails";
import { SellerProductsTab } from "./components/SellerProductsTab";
import { SellerBrandTab } from "./components/SellerBrandTab";
import { SellerFinanceTab } from "./components/SellerFinanceTab";
import { SellerHomeTab } from "./components/SellerHomeTab";
import { SellerLegalTab } from "./components/SellerLegalTab";
import { SellerOnboardingStatus } from "./components/SellerOnboardingStatus";
import type { SellerOnboardingStatus as SellerOnboardingStatusType } from "./lib/sellerOnboardingApi";

import type {
  SellerDeliveryStatus,
  SellerOrder,
  SellerOrderListItem,
  SellerOrderStatus,
  SellerPaymentStatus,
  SellerBrand,
  SellerFinanceSummary,
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

function isActiveSellerOrder(order: SellerOrderListItem): boolean {
  return order.status === "NEW";
}

function isActiveSellerProduct(product: SellerProductListItem): boolean {
  return product.status === "ACTIVE";
}

type Props = {
  initialProducts: SellerProductListItem[];
  initialOrders: SellerOrderListItem[];
  initialBrands: SellerBrand[];
  initialFinance: SellerFinanceSummary | null;
  initialOnboardingStatus: SellerOnboardingStatusType | null;
  initialTab: SellerTab;
  initialOrderId: string | null;
  initialSelectedOrder: SellerOrder | null;
};

async function fetchSellerOrder(orderId: number): Promise<SellerOrder> {
  const response = await apiFetch(`${API_URL}/api/seller/orders/${orderId}`);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Не удалось загрузить заказ (${response.status})`);
  }

  return response.json() as Promise<SellerOrder>;
}

function SellerPageContent({
  initialProducts,
  initialOrders,
  initialBrands,
  initialFinance,
  initialOnboardingStatus,
  initialTab,
  initialOrderId,
  initialSelectedOrder,
}: Props) {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<SellerTab>(initialTab);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [visitedTabs, setVisitedTabs] = useState<Set<SellerTab>>(
    () => new Set([initialTab])
  );

  const [orders, setOrders] = useState<SellerOrderListItem[]>(initialOrders);
  const [products, setProducts] = useState<SellerProductListItem[]>(initialProducts);
  const storeName = initialBrands[0]?.name?.trim() || null;

  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(
    initialSelectedOrder
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const {
    get: getOrderDetails,
    peek: peekOrderDetails,
    seed: seedOrderDetails,
    prefetch: prefetchOrderDetails,
  } = useSessionResourceCache<number, SellerOrder>(fetchSellerOrder);

  const [creatingProduct, setCreatingProduct] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    if (initialSelectedOrder) {
      seedOrderDetails(initialSelectedOrder.id, initialSelectedOrder);
      setSelectedOrder(initialSelectedOrder);
    }
  }, [initialSelectedOrder, seedOrderDetails]);

  useEffect(() => {
    const syncFromHistory = () => {
      const params = new URLSearchParams(window.location.search);
      const nextTab = parseSellerTab(params.get("tab"));

      setCurrentTab(nextTab);
      setSelectedOrderId(params.get("orderId"));
      setVisitedTabs((current) => addVisitedTab(current, nextTab));
      setError(null);
    };

    window.addEventListener("popstate", syncFromHistory);

    return () => {
      window.removeEventListener("popstate", syncFromHistory);
    };
  }, []);

  function navigateSeller(href: string) {
    const url = new URL(href, window.location.origin);
    const nextTab = parseSellerTab(url.searchParams.get("tab"));

    window.history.pushState(null, "", `${url.pathname}${url.search}`);
    setCurrentTab(nextTab);
    setSelectedOrderId(url.searchParams.get("orderId"));
    setVisitedTabs((current) => addVisitedTab(current, nextTab));
    setError(null);
  }

  function handleSellerNavigation(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;
    const anchor = target instanceof Element ? target.closest("a") : null;

    if (!anchor) return;

    const url = new URL(anchor.href);

    if (url.origin !== window.location.origin || url.pathname !== "/seller") {
      return;
    }

    event.preventDefault();
    navigateSeller(`${url.pathname}${url.search}`);
  }

  useEffect(() => {
    if (currentTab !== "orders" || !selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    const orderId = Number(selectedOrderId);
    if (!Number.isFinite(orderId)) {
      setSelectedOrder(null);
      return;
    }

    const cached = peekOrderDetails(orderId);
    if (cached) {
      setSelectedOrder(cached);
      setDetailsLoading(false);
      return;
    }

    let cancelled = false;

    setSelectedOrder(null);
    setDetailsLoading(true);
    setError(null);

    getOrderDetails(orderId)
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
  }, [currentTab, getOrderDetails, peekOrderDetails, selectedOrderId]);

  function openOrder(orderId: number) {
    prefetchOrderDetails(orderId);
    navigateSeller(`/seller?tab=orders&orderId=${orderId}`);
  }

  async function createDraftProduct() {
    if (creatingProduct) return;

    setCreatingProduct(true);

    try {
      if (initialBrands.length === 0) {
        navigateSeller("/seller?tab=brand");
        return;
      }

      const response = await apiFetch(`${API_URL}/api/seller/products/draft`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось создать черновик");
      }

      const id: number = await response.json();
      router.push(`/seller/products/${id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось создать товар");
    } finally {
      setCreatingProduct(false);
    }
  }

  const activeOrdersCount = orders.filter(isActiveSellerOrder).length;
  const activeProductsCount = products.filter(isActiveSellerProduct).length;

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.layout} onClickCapture={handleSellerNavigation}>
          <SellerSidebar
            currentTab={currentTab}
            ordersCount={activeOrdersCount}
            productsCount={activeProductsCount}
            storeName={storeName}
          />

          <div className={styles.content}>
            {error ? <div className={styles.error}>{error}</div> : null}

            {visitedTabs.has("home") ? (
              <div hidden={currentTab !== "home"}>
                <SellerOnboardingStatus initialStatus={initialOnboardingStatus} />
                <SellerHomeTab
                  products={products}
                  orders={orders}
                  brand={initialBrands[0] ?? null}
                  finance={initialFinance}
                  creatingProduct={creatingProduct}
                  onCreateProduct={() => void createDraftProduct()}
                />
              </div>
            ) : null}

            {visitedTabs.has("finance") ? (
              <div hidden={currentTab !== "finance"}>
                <SellerFinanceTab
                  finance={initialFinance}
                  onPrefetchOrder={prefetchOrderDetails}
                />
              </div>
            ) : null}

            {visitedTabs.has("brand") ? (
              <div hidden={currentTab !== "brand"}>
                <SellerBrandTab initialBrands={initialBrands} />
              </div>
            ) : null}

            {visitedTabs.has("legal") ? (
              <div hidden={currentTab !== "legal"}>
                <SellerLegalTab />
              </div>
            ) : null}

            {visitedTabs.has("products") ? (
              <div hidden={currentTab !== "products"}>
                <SellerProductsTab
                  products={products}
                  loading={false}
                  creatingProduct={creatingProduct}
                  onCreateProduct={() => void createDraftProduct()}
                />
              </div>
            ) : null}

            {visitedTabs.has("orders") ? (
              <div hidden={currentTab !== "orders"} aria-busy={detailsLoading}>
                {selectedOrder ? (
                  <SellerOrderDetails
                    order={selectedOrder}
                    formatOrderStatus={formatOrderStatus}
                    formatPaymentStatus={formatPaymentStatus}
                    formatDeliveryStatus={formatDeliveryStatus}
                    buildSellerStatusLabel={buildSellerStatusLabel}
                  />
                ) : selectedOrderId && detailsLoading ? (
                  <CabinetSkeleton variant="detail" />
                ) : (
                  <SellerOrdersTab
                    orders={orders}
                    buildSellerStatusLabel={buildSellerStatusLabel}
                    onOpenOrder={openOrder}
                    onPrefetchOrder={prefetchOrderDetails}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SellerPageClient(props: Props) {
  return <SellerPageContent {...props} />;
}

function parseSellerTab(value: string | null): SellerTab {
  if (
    value === "orders" ||
    value === "products" ||
    value === "finance" ||
    value === "brand" ||
    value === "legal"
  ) {
    return value;
  }

  return "home";
}

function addVisitedTab(current: Set<SellerTab>, tab: SellerTab) {
  if (current.has(tab)) return current;

  const next = new Set(current);
  next.add(tab);
  return next;
}
