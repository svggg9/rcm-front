"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { apiFetch, API_URL } from "../lib/api";
import { useSessionResourceCache } from "../lib/useSessionResourceCache";
import { CabinetTabs } from "../components/ui/CabinetTabs";

import { SellerSidebar } from "./components/SellerSidebar";
import { SellerOrdersTab } from "./components/SellerOrdersTab";
import { SellerReturnsTab } from "./components/SellerReturnsTab";
import { SellerProductsTab } from "./components/SellerProductsTab";
import { SellerBrandTab } from "./components/SellerBrandTab";
import { SellerFinanceTab } from "./components/SellerFinanceTab";
import { SellerHomeTab } from "./components/SellerHomeTab";
import { SellerLegalTab } from "./components/SellerLegalTab";
import { SellerOnboardingStatus } from "./components/SellerOnboardingStatus";
import {
  getSellerOnboardingStatus,
  type SellerOnboardingStatus as SellerOnboardingStatusType,
} from "./lib/sellerOnboardingApi";
import { SELLER_ONBOARDING_EVENT } from "./lib/sellerOnboardingEvents";

import type {
  SellerOrder,
  SellerOrderListItem,
  SellerOrderStatus,
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
    case "PROCESSING":
      return "В обработке";
    case "SHIPPED":
      return "Отправлен";
    case "PAID":
      return "Оплачен";
    case "COMPLETED":
      return "Завершён";
    case "CANCELED":
      return "Отменён";
    default:
      return status;
  }
}

function buildSellerStatusLabel(order: SellerOrder | SellerOrderListItem): string {
  if (order.status === "CANCELED") return "Отменён";
  if (order.paymentStatus === "PENDING") return "Ожидает оплаты";
  if (order.paymentStatus === "FAILED") return "Ошибка оплаты";
  if (order.paymentStatus === "CANCELED") return "Оплата отменена";
  if (order.paymentStatus === "REFUNDED") return "Возвращён";
  if (order.deliveryStatus === "READY_FOR_SHIPMENT") return "Передайте в СДЭК";
  if (order.deliveryStatus === "READY_FOR_PICKUP") return "Ожидает получения";
  if (order.deliveryStatus === "IN_TRANSIT") return "В пути";
  if (order.deliveryStatus === "DELIVERED") return "Доставлен";
  if (order.deliveryStatus === "RETURNED") return "Возвращён";
  if (order.deliveryStatus === "CANCELLED") return "Отменён";
  if (order.paymentStatus === "PAID" && order.deliveryStatus === "PENDING") {
    return "Оформление доставки";
  }

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
}: Props) {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<SellerTab>(initialTab);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [visitedTabs, setVisitedTabs] = useState<Set<SellerTab>>(
    () => new Set([initialTab])
  );

  const [orders, setOrders] = useState<SellerOrderListItem[]>(initialOrders);
  const [products, setProducts] = useState<SellerProductListItem[]>(initialProducts);
  const [onboardingStatus, setOnboardingStatus] =
    useState<SellerOnboardingStatusType | null>(initialOnboardingStatus);
  const storeName = initialBrands[0]?.name?.trim() || null;

  const {
    get: getOrderDetails,
    prefetch: prefetchOrderDetails,
  } = useSessionResourceCache<number, SellerOrder>(fetchSellerOrder);

  const [creatingProduct, setCreatingProduct] = useState(false);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    setOnboardingStatus(initialOnboardingStatus);
  }, [initialOnboardingStatus]);

  useEffect(() => {
    let active = true;

    async function refreshOnboardingStatus() {
      try {
        const nextStatus = await getSellerOnboardingStatus();
        if (active) {
          setOnboardingStatus(nextStatus);
        }
      } catch {
        // Readiness is supplementary and must not block the seller cabinet.
      }
    }

    const handleOnboardingChange = () => {
      void refreshOnboardingStatus();
    };

    if (!initialOnboardingStatus) {
      void refreshOnboardingStatus();
    }

    window.addEventListener(SELLER_ONBOARDING_EVENT, handleOnboardingChange);

    return () => {
      active = false;
      window.removeEventListener(SELLER_ONBOARDING_EVENT, handleOnboardingChange);
    };
  }, [initialOnboardingStatus]);

  useEffect(() => {
    const syncFromHistory = () => {
      const params = new URLSearchParams(window.location.search);
      const nextTab = parseSellerTab(params.get("tab"));

      setCurrentTab(nextTab);
      setSelectedOrderId(params.get("orderId"));
      setVisitedTabs((current) => addVisitedTab(current, nextTab));
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
  const storeNotReady = Boolean(
    onboardingStatus &&
      (!onboardingStatus.legalCompleted || !onboardingStatus.agreementAccepted)
  );

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.layout} onClickCapture={handleSellerNavigation}>
          <SellerSidebar
            currentTab={currentTab}
            ordersCount={activeOrdersCount}
            productsCount={activeProductsCount}
            storeName={storeName}
            storeNotReady={storeNotReady}
          />

          <div className={styles.content}>
            {currentTab === "orders" || currentTab === "returns" ? (
              <div className={styles.orderSectionTabs}>
                <CabinetTabs<"orders" | "returns">
                  items={[
                    { value: "orders", label: "Заказы" },
                    { value: "returns", label: "Возвраты" },
                  ]}
                  value={currentTab}
                  onChange={(tab) => {
                    navigateSeller(
                      tab === "orders" ? "/seller?tab=orders" : "/seller?tab=returns"
                    );
                  }}
                  ariaLabel="Заказы и возвраты"
                  appearance="line"
                />
              </div>
            ) : null}

            {visitedTabs.has("home") ? (
              <div hidden={currentTab !== "home"}>
                <SellerOnboardingStatus status={onboardingStatus} />
                <SellerHomeTab
                  products={products}
                  orders={orders}
                  brand={initialBrands[0] ?? null}
                  finance={initialFinance}
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
                <SellerBrandTab
                  initialBrands={initialBrands}
                  products={products}
                />
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
              <div hidden={currentTab !== "orders"}>
                <SellerOrdersTab
                  orders={orders}
                  buildSellerStatusLabel={buildSellerStatusLabel}
                  expandedOrderId={parseOrderId(selectedOrderId)}
                  onLoadOrder={getOrderDetails}
                  onPrefetchOrder={prefetchOrderDetails}
                  showStageElapsed
                />
              </div>
            ) : null}

            {visitedTabs.has("returns") ? (
              <div hidden={currentTab !== "returns"}>
                <SellerReturnsTab />
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
    value === "returns" ||
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

function parseOrderId(value: string | null) {
  if (!value) return null;
  const orderId = Number(value);
  return Number.isFinite(orderId) ? orderId : null;
}
