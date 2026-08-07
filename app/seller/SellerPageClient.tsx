"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { apiFetch, API_URL } from "../lib/api";
import { useSessionResourceCache } from "../lib/useSessionResourceCache";
import { CabinetTabs } from "../components/ui/CabinetTabs";
import { CabinetSkeleton } from "../components/ui/CabinetSkeleton";

import { SellerSidebar } from "./components/SellerSidebar";
import { SellerHomeTab } from "./components/SellerHomeTab";
import { SellerOnboardingStatus } from "./components/SellerOnboardingStatus";
import type { SellerOrderCardListItem } from "./components/SellerOrderCard";
import {
  getSellerOnboardingStatus,
  type SellerOnboardingStatus as SellerOnboardingStatusType,
} from "./lib/sellerOnboardingApi";
import { SELLER_ONBOARDING_EVENT } from "./lib/sellerOnboardingEvents";
import {
  getSellerFinanceClient,
  getSellerDashboardSummaryClient,
  getSellerOrdersClient,
  getSellerProductsClient,
} from "./lib/sellerClientDataApi";

import type {
  SellerOrder,
  SellerOrderListItem,
  SellerOrderStatus,
  SellerBrand,
  SellerFinanceSummary,
  SellerDashboardSummary,
  PageResponse,
  SellerProductListItem,
  SellerTab,
} from "./types";

import styles from "./SellerPageClient.module.css";

const SellerProductsTab = dynamic(
  () =>
    import("./components/SellerProductsTab").then(
      (module) => module.SellerProductsTab
    ),
  { loading: () => <CabinetSkeleton variant="list" compact /> }
);
const SellerOrdersTab = dynamic(
  () =>
    import("./components/SellerOrdersTab").then(
      (module) => module.SellerOrdersTab
    ),
  { loading: () => <CabinetSkeleton variant="list" compact /> }
);
const SellerReturnsTab = dynamic(
  () =>
    import("./components/SellerReturnsTab").then(
      (module) => module.SellerReturnsTab
    ),
  { loading: () => <CabinetSkeleton variant="list" compact /> }
);
const SellerBrandTab = dynamic(
  () =>
    import("./components/SellerBrandTab").then((module) => module.SellerBrandTab),
  { loading: () => <CabinetSkeleton variant="form" /> }
);
const SellerFinanceTab = dynamic(
  () =>
    import("./components/SellerFinanceTab").then(
      (module) => module.SellerFinanceTab
    ),
  { loading: () => <CabinetSkeleton variant="dashboard" /> }
);
const SellerLegalTab = dynamic(
  () =>
    import("./components/SellerLegalTab").then((module) => module.SellerLegalTab),
  { loading: () => <CabinetSkeleton variant="form" /> }
);

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

function buildSellerStatusLabel(order: SellerOrderCardListItem): string {
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

type Props = {
  initialProducts: SellerProductListItem[];
  initialProductsTotal: number;
  initialProductsNextPage: number | null;
  initialOrders: SellerOrderListItem[];
  initialOrdersTotal: number;
  initialOrdersNextPage: number | null;
  initialBrands: SellerBrand[];
  initialFinance: SellerFinanceSummary | null;
  initialDashboard: SellerDashboardSummary | null;
  initialOnboardingStatus: SellerOnboardingStatusType | null;
  initialProductsLoaded: boolean;
  initialOrdersLoaded: boolean;
  initialFinanceLoaded: boolean;
  initialDashboardLoaded: boolean;
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
  initialProductsTotal,
  initialProductsNextPage,
  initialOrders,
  initialOrdersTotal,
  initialOrdersNextPage,
  initialBrands,
  initialFinance,
  initialDashboard,
  initialOnboardingStatus,
  initialProductsLoaded,
  initialOrdersLoaded,
  initialFinanceLoaded,
  initialDashboardLoaded,
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
  const [productsTotal, setProductsTotal] = useState(initialProductsTotal);
  const [productsNextPage, setProductsNextPage] = useState<number | null>(
    initialProductsNextPage
  );
  const [ordersTotal, setOrdersTotal] = useState(initialOrdersTotal);
  const [ordersNextPage, setOrdersNextPage] = useState<number | null>(
    initialOrdersNextPage
  );
  const [finance, setFinance] = useState<SellerFinanceSummary | null>(initialFinance);
  const [dashboard, setDashboard] = useState<SellerDashboardSummary | null>(
    initialDashboard
  );
  const [productsLoaded, setProductsLoaded] = useState(initialProductsLoaded);
  const [ordersLoaded, setOrdersLoaded] = useState(initialOrdersLoaded);
  const [financeLoaded, setFinanceLoaded] = useState(initialFinanceLoaded);
  const [dashboardLoaded, setDashboardLoaded] = useState(initialDashboardLoaded);
  const [productsLoading, setProductsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [productsLoadingMore, setProductsLoadingMore] = useState(false);
  const [ordersLoadingMore, setOrdersLoadingMore] = useState(false);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [loadErrors, setLoadErrors] = useState<
    Partial<Record<SellerTab, string>>
  >({});
  const loadError = loadErrors[currentTab] ?? null;
  const [onboardingStatus, setOnboardingStatus] =
    useState<SellerOnboardingStatusType | null>(initialOnboardingStatus);
  const productsRequestRef = useRef<
    Promise<PageResponse<SellerProductListItem>> | null
  >(null);
  const ordersRequestRef = useRef<
    Promise<PageResponse<SellerOrderListItem>> | null
  >(null);
  const financeRequestRef = useRef<Promise<SellerFinanceSummary> | null>(null);
  const dashboardRequestRef = useRef<Promise<SellerDashboardSummary> | null>(null);
  const mountedRef = useRef(true);
  const storeName = initialBrands[0]?.name?.trim() || null;

  const {
    get: getOrderDetails,
    prefetch: prefetchOrderDetails,
  } = useSessionResourceCache<number, SellerOrder>(fetchSellerOrder);

  const [creatingProduct, setCreatingProduct] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setProducts(initialProducts);
    setProductsTotal(initialProductsTotal);
    setProductsNextPage(initialProductsNextPage);
    setProductsLoaded(initialProductsLoaded);
  }, [
    initialProducts,
    initialProductsLoaded,
    initialProductsNextPage,
    initialProductsTotal,
  ]);

  useEffect(() => {
    setOrders(initialOrders);
    setOrdersTotal(initialOrdersTotal);
    setOrdersNextPage(initialOrdersNextPage);
    setOrdersLoaded(initialOrdersLoaded);
  }, [
    initialOrders,
    initialOrdersLoaded,
    initialOrdersNextPage,
    initialOrdersTotal,
  ]);

  useEffect(() => {
    setFinance(initialFinance);
    setFinanceLoaded(initialFinanceLoaded);
  }, [initialFinance, initialFinanceLoaded]);

  useEffect(() => {
    setDashboard(initialDashboard);
    setDashboardLoaded(initialDashboardLoaded);
  }, [initialDashboard, initialDashboardLoaded]);

  useEffect(() => {
    setOnboardingStatus(initialOnboardingStatus);
  }, [initialOnboardingStatus]);

  useEffect(() => {
    if (!tabNeedsProducts(currentTab) || productsLoaded || productsRequestRef.current) {
      return;
    }

    setProductsLoading(true);
    setLoadErrors((current) => ({ ...current, products: undefined }));
    const request = getSellerProductsClient();
    productsRequestRef.current = request;

    void request
      .then((page) => {
        if (mountedRef.current) {
          const nextProducts = Array.isArray(page.content) ? page.content : [];
          setProducts(nextProducts);
          setProductsTotal(page.totalElements ?? nextProducts.length);
          setProductsNextPage(getNextPage(page));
        }
      })
      .catch((reason: unknown) => {
        if (mountedRef.current) {
          setProducts([]);
          setLoadErrors((current) => ({
            ...current,
            products:
              reason instanceof Error
                ? reason.message
                : "Не удалось загрузить товары",
          }));
        }
      })
      .finally(() => {
        productsRequestRef.current = null;
        if (mountedRef.current) {
          setProductsLoaded(true);
          setProductsLoading(false);
        }
      });
  }, [currentTab, productsLoaded]);

  useEffect(() => {
    if (!tabNeedsOrders(currentTab) || ordersLoaded || ordersRequestRef.current) {
      return;
    }

    setOrdersLoading(true);
    setLoadErrors((current) => ({ ...current, orders: undefined }));
    const request = getSellerOrdersClient();
    ordersRequestRef.current = request;

    void request
      .then((page) => {
        if (mountedRef.current) {
          const nextOrders = Array.isArray(page.content) ? page.content : [];
          setOrders(nextOrders);
          setOrdersTotal(page.totalElements ?? nextOrders.length);
          setOrdersNextPage(getNextPage(page));
        }
      })
      .catch((reason: unknown) => {
        if (mountedRef.current) {
          setOrders([]);
          setLoadErrors((current) => ({
            ...current,
            orders:
              reason instanceof Error
                ? reason.message
                : "Не удалось загрузить заказы",
          }));
        }
      })
      .finally(() => {
        ordersRequestRef.current = null;
        if (mountedRef.current) {
          setOrdersLoaded(true);
          setOrdersLoading(false);
        }
      });
  }, [currentTab, ordersLoaded]);

  useEffect(() => {
    if (!tabNeedsFinance(currentTab) || financeLoaded || financeRequestRef.current) {
      return;
    }

    setFinanceLoading(true);
    setLoadErrors((current) => ({ ...current, finance: undefined }));
    const request = getSellerFinanceClient();
    financeRequestRef.current = request;

    void request
      .then((nextFinance) => {
        if (mountedRef.current) {
          setFinance(nextFinance);
        }
      })
      .catch((reason: unknown) => {
        if (mountedRef.current) {
          setFinance(null);
          setLoadErrors((current) => ({
            ...current,
            finance:
              reason instanceof Error
                ? reason.message
                : "Не удалось загрузить финансы",
          }));
        }
      })
      .finally(() => {
        financeRequestRef.current = null;
        if (mountedRef.current) {
          setFinanceLoaded(true);
          setFinanceLoading(false);
        }
      });
  }, [currentTab, financeLoaded]);

  useEffect(() => {
    if (
      currentTab !== "home" ||
      dashboardLoaded ||
      dashboardRequestRef.current
    ) {
      return;
    }

    setDashboardLoading(true);
    setLoadErrors((current) => ({ ...current, home: undefined }));
    const request = getSellerDashboardSummaryClient();
    dashboardRequestRef.current = request;

    void request
      .then((nextDashboard) => {
        if (mountedRef.current) setDashboard(nextDashboard);
      })
      .catch((reason: unknown) => {
        if (mountedRef.current) {
          setDashboard(null);
          setLoadErrors((current) => ({
            ...current,
            home:
              reason instanceof Error
                ? reason.message
                : "Не удалось загрузить сводку магазина",
          }));
        }
      })
      .finally(() => {
        dashboardRequestRef.current = null;
        if (mountedRef.current) {
          setDashboardLoaded(true);
          setDashboardLoading(false);
        }
      });
  }, [currentTab, dashboardLoaded]);

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

  async function loadMoreProducts() {
    if (productsNextPage === null || productsRequestRef.current) return;

    setProductsLoadingMore(true);
    const request = getSellerProductsClient(productsNextPage);
    productsRequestRef.current = request;

    try {
      const page = await request;
      if (!mountedRef.current) return;

      const nextProducts = Array.isArray(page.content) ? page.content : [];
      setProducts((current) => appendUniqueById(current, nextProducts));
      setProductsTotal(page.totalElements ?? productsTotal);
      setProductsNextPage(getNextPage(page));
    } catch (reason) {
      if (mountedRef.current) {
        toast.error(
          reason instanceof Error
            ? reason.message
            : "Не удалось загрузить следующую страницу товаров"
        );
      }
    } finally {
      productsRequestRef.current = null;
      if (mountedRef.current) setProductsLoadingMore(false);
    }
  }

  async function loadMoreOrders() {
    if (ordersNextPage === null || ordersRequestRef.current) return;

    setOrdersLoadingMore(true);
    const request = getSellerOrdersClient(ordersNextPage);
    ordersRequestRef.current = request;

    try {
      const page = await request;
      if (!mountedRef.current) return;

      const nextOrders = Array.isArray(page.content) ? page.content : [];
      setOrders((current) => appendUniqueById(current, nextOrders));
      setOrdersTotal(page.totalElements ?? ordersTotal);
      setOrdersNextPage(getNextPage(page));
    } catch (reason) {
      if (mountedRef.current) {
        toast.error(
          reason instanceof Error
            ? reason.message
            : "Не удалось загрузить следующую страницу заказов"
        );
      }
    } finally {
      ordersRequestRef.current = null;
      if (mountedRef.current) setOrdersLoadingMore(false);
    }
  }

  function retryCurrentTab() {
    setLoadErrors((current) => ({ ...current, [currentTab]: undefined }));
    if (currentTab === "products") setProductsLoaded(false);
    if (currentTab === "orders") setOrdersLoaded(false);
    if (currentTab === "finance") setFinanceLoaded(false);
    if (currentTab === "home") setDashboardLoaded(false);
  }

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
            storeName={storeName}
            storeNotReady={storeNotReady}
          />

          <div className={styles.content}>
            {loadError ? (
              <div className={styles.loadError} role="alert">
                <span>{loadError}</span>
                <button type="button" onClick={retryCurrentTab}>
                  Повторить
                </button>
              </div>
            ) : null}
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

            {currentTab === "home" ? (
              <div>
                <SellerOnboardingStatus status={onboardingStatus} />
                {!dashboardLoaded || dashboardLoading ? (
                  <CabinetSkeleton variant="dashboard" />
                ) : !loadError ? (
                  <SellerHomeTab
                    brand={initialBrands[0] ?? null}
                    summary={dashboard}
                  />
                ) : null}
              </div>
            ) : null}

            {currentTab === "finance" ? (
              <div>
                {!financeLoaded || financeLoading ? (
                  <CabinetSkeleton variant="dashboard" />
                ) : !loadError ? (
                  <SellerFinanceTab
                    finance={finance}
                    onPrefetchOrder={prefetchOrderDetails}
                  />
                ) : null}
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

            {currentTab === "products" && !loadError ? (
              <div>
                <SellerProductsTab
                  products={products}
                  totalElements={productsTotal}
                  loading={!productsLoaded || productsLoading}
                  loadingMore={productsLoadingMore}
                  onLoadMore={
                    productsNextPage === null
                      ? undefined
                      : () => void loadMoreProducts()
                  }
                  creatingProduct={creatingProduct}
                  onCreateProduct={() => void createDraftProduct()}
                />
              </div>
            ) : null}

            {currentTab === "orders" && !loadError ? (
              <div>
                {!ordersLoaded || ordersLoading ? (
                  <CabinetSkeleton variant="list" compact />
                ) : (
                  <SellerOrdersTab
                    orders={orders}
                    totalElements={ordersTotal}
                    loadingMore={ordersLoadingMore}
                    onLoadMore={
                      ordersNextPage === null
                        ? undefined
                        : () => void loadMoreOrders()
                    }
                    buildSellerStatusLabel={buildSellerStatusLabel}
                    expandedOrderId={parseOrderId(selectedOrderId)}
                    onLoadOrder={getOrderDetails}
                    onPrefetchOrder={prefetchOrderDetails}
                    showStageElapsed
                  />
                )}
              </div>
            ) : null}

            {currentTab === "returns" ? (
              <div>
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

function tabNeedsProducts(tab: SellerTab) {
  return tab === "products";
}

function tabNeedsOrders(tab: SellerTab) {
  return tab === "orders";
}

function tabNeedsFinance(tab: SellerTab) {
  return tab === "finance";
}

function parseOrderId(value: string | null) {
  if (!value) return null;
  const orderId = Number(value);
  return Number.isFinite(orderId) ? orderId : null;
}

function getNextPage<T>(page: PageResponse<T>) {
  return page.number + 1 < page.totalPages ? page.number + 1 : null;
}

function appendUniqueById<T extends { id: number }>(current: T[], next: T[]) {
  if (next.length === 0) return current;

  const byId = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
}
