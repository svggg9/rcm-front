"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "@/app/components/ui/toast";

import { apiFetch, API_URL } from "../lib/api";
import { logout as logoutAuth } from "../lib/auth";
import { useSessionResourceCache } from "../lib/useSessionResourceCache";

import type { AccountTab } from "./components/AccountSidebar";
import { AccountFrame } from "./components/AccountFrame";
import { AccountSkeleton } from "./components/AccountSkeleton";
import { accountApiError } from "./lib/presentation";
import { requestEditorNavigation } from "../components/ui/EditorSurface";
import {
  AccountProfileTab,
  type AccountProfileUpdate,
} from "./components/AccountProfileTab";
import { AccountOrdersTab } from "./components/AccountOrdersTab";
import { AccountInfoTab } from "./components/AccountInfoTab";

import styles from "./AccountPageClient.module.css";

import type {
  Me,
  Order,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  OrderListItem,
  PageResponse,
} from "./types";

const AccountOrderDetails = dynamic(() =>
  import("./components/AccountOrderDetails").then(
    (module) => module.AccountOrderDetails
  ),
  { loading: () => <AccountSkeleton variant="detail" /> }
);
const AccountFavoritesTab = dynamic(() =>
  import("./components/AccountFavoritesTab").then(
    (module) => module.AccountFavoritesTab
  ),
  { loading: () => <AccountSkeleton variant="favorites" /> }
);
const AccountBrandsTab = dynamic(() =>
  import("./components/AccountBrandsTab").then(
    (module) => module.AccountBrandsTab
  ),
  { loading: () => <AccountSkeleton variant="brands" /> }
);
const AccountReturnsTab = dynamic(() =>
  import("./components/AccountReturnsTab").then(
    (module) => module.AccountReturnsTab
  ),
  { loading: () => <AccountSkeleton variant="returns" /> }
);


function formatOrderStatus(status: OrderStatus): string {
  switch (status) {
    case "NEW":
      return "Новый";
    case "CONFIRMED":
      return "Подтверждён";
    case "PROCESSING":
      return "В обработке";
    case "SHIPPED":
      return "Отправлен";
    case "COMPLETED":
      return "Завершён";
    case "PAID":
      return "Оплачен";
    case "CANCELED":
      return "Отменён";
    default:
      return status;
  }
}

function formatPaymentStatus(status: PaymentStatus): string {
  switch (status) {
    case "PENDING":
      return "Ожидает оплаты";
    case "PAID":
      return "Оплачен";
    case "FAILED":
      return "Ошибка оплаты";
    case "CANCELED":
      return "Оплата отменена";
    case "REFUNDED":
      return "Возвращён";
    default:
      return status;
  }
}

function formatDeliveryStatus(status: DeliveryStatus): string {
  switch (status) {
    case "PENDING":
      return "Оформление доставки";
    case "READY_FOR_SHIPMENT":
      return "Готовится к отправке";
    case "READY_FOR_PICKUP":
      return "Ожидает получения";
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

function buildOrderStatusLabel(order: Order | OrderListItem): string {
  if (order.status === "CANCELED") return "Отменён";
  if (order.paymentStatus === "CANCELED") return "Оплата отменена";
  if (order.deliveryStatus === "CANCELLED") return "Отменён";
  if (order.paymentStatus === "FAILED") return "Ошибка оплаты";
  if (
    order.paymentStatus === "REFUNDED" ||
    order.deliveryStatus === "RETURNED"
  ) {
    return "Возвращён";
  }
  if (order.paymentStatus === "PENDING") return "Ожидает оплаты";
  if (order.deliveryStatus === "DELIVERED") return "Доставлен";
  if (order.deliveryStatus === "READY_FOR_PICKUP") return "Ожидает получения";
  if (order.deliveryStatus === "IN_TRANSIT") return "В пути";
  if (order.deliveryStatus === "READY_FOR_SHIPMENT")
    return "Готовится к отправке";
  if (order.paymentStatus === "PAID" && order.deliveryStatus === "PENDING") {
    return "Оформление доставки";
  }

  return formatOrderStatus(order.status);
}

type Props = {
  initialMe: Me;
  initialOrders: PageResponse<OrderListItem>;
  initialOrdersLoaded: boolean;
  initialSelectedOrder: Order | null;
};

async function fetchAccountOrder(orderId: number): Promise<Order> {
  const response = await apiFetch(`${API_URL}/api/orders/${orderId}`);

  if (!response.ok) {
    throw new Error(await accountApiError(response, "Не удалось загрузить заказ"));
  }

  return response.json() as Promise<Order>;
}

function AccountPageContent({
  initialMe,
  initialOrders,
  initialOrdersLoaded,
  initialSelectedOrder,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [me, setMe] = useState<Me | null>(initialMe);
  const [orders, setOrders] = useState<OrderListItem[]>(initialOrders.content);
  const [ordersTotal, setOrdersTotal] = useState(initialOrders.totalElements);
  const [ordersNextPage, setOrdersNextPage] = useState(initialOrders.number + 1);
  const [ordersLoaded, setOrdersLoaded] = useState(initialOrdersLoaded);
  const [ordersLoadingMore, setOrdersLoadingMore] = useState(false);
  const ordersLoadingMoreRef = useRef(false);
  const ordersRequestIdRef = useRef(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(
    initialSelectedOrder,
  );
  const {
    get: getOrderDetails,
    peek: peekOrderDetails,
    seed: seedOrderDetails,
    prefetch: prefetchOrderDetails,
  } = useSessionResourceCache<number, Order>(fetchAccountOrder);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const ordersScroll = useRef(0);
  const currentTab: AccountTab =
    tabParam === "profile" ||
    tabParam === "orders" ||
    tabParam === "returns" ||
    tabParam === "favorites" ||
    tabParam === "brands" ||
    tabParam === "info"
      ? tabParam
      : "home";

  const selectedOrderId = searchParams.get("orderId");
  useLayoutEffect(() => {
    if (currentTab === "orders" && !selectedOrderId && ordersLoaded) window.scrollTo({top:ordersScroll.current,behavior:"auto"});
  }, [currentTab, selectedOrderId, ordersLoaded]);
  const [visitedTabs, setVisitedTabs] = useState<Set<AccountTab>>(
    () => new Set([currentTab]),
  );

  useEffect(() => {
    if (initialSelectedOrder) {
      seedOrderDetails(initialSelectedOrder.id, initialSelectedOrder);
      setSelectedOrder(initialSelectedOrder);
    }
  }, [initialSelectedOrder, seedOrderDetails]);

  useEffect(() => {
    setVisitedTabs((current) => addVisitedAccountTab(current, currentTab));
  }, [currentTab]);

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

    async function loadOrderDetails() {
      setSelectedOrder(null);
      setDetailsLoading(true);
      setError(null);

      try {
        const data = await getOrderDetails(orderId);

        if (!cancelled) {
          setSelectedOrder(data);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Не удалось загрузить заказ",
          );
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    }

    void loadOrderDetails();

    return () => {
      cancelled = true;
    };
  }, [currentTab, getOrderDetails, peekOrderDetails, selectedOrderId]);

  useEffect(() => {
    setMe(initialMe);
  }, [initialMe]);

  useEffect(() => {
    ordersRequestIdRef.current += 1;
    ordersLoadingMoreRef.current = false;
    setOrders(initialOrders.content);
    setOrdersTotal(initialOrders.totalElements);
    setOrdersNextPage(initialOrders.number + 1);
    setOrdersLoaded(initialOrdersLoaded);
    setOrdersLoadingMore(false);
  }, [initialOrders, initialOrdersLoaded]);

  useEffect(() => {
    if (ordersLoaded || currentTab !== "orders") {
      return;
    }

    const requestId = ++ordersRequestIdRef.current;
    let cancelled = false;
    ordersLoadingMoreRef.current = true;
    setOrdersLoadingMore(true);

    async function loadInitialOrders() {
      try {
        const response = await apiFetch(
          `${API_URL}/api/orders/my/list?page=0&size=20`
        );
        if (!response.ok) throw new Error("Не удалось загрузить заказы");
        const page = (await response.json()) as PageResponse<OrderListItem>;
        if (cancelled || requestId !== ordersRequestIdRef.current) return;

        setOrders(Array.isArray(page.content) ? page.content : []);
        setOrdersTotal(page.totalElements ?? 0);
        setOrdersNextPage((page.number ?? 0) + 1);
        setOrdersLoaded(true);
      } catch (loadError) {
        if (!cancelled && requestId === ordersRequestIdRef.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить заказы"
          );
        }
      } finally {
        if (!cancelled && requestId === ordersRequestIdRef.current) {
          ordersLoadingMoreRef.current = false;
          setOrdersLoadingMore(false);
        }
      }
    }

    void loadInitialOrders();
    return () => {
      cancelled = true;
    };
  }, [currentTab, ordersLoaded]);

  async function loadMoreOrders() {
    if (ordersLoadingMoreRef.current || orders.length >= ordersTotal) return;
    ordersLoadingMoreRef.current = true;
    setOrdersLoadingMore(true);
    const requestId = ++ordersRequestIdRef.current;

    try {
      const response = await apiFetch(
        `${API_URL}/api/orders/my/list?page=${ordersNextPage}&size=20`
      );
      if (!response.ok) throw new Error("Не удалось загрузить заказы");
      const page = (await response.json()) as PageResponse<OrderListItem>;
      if (requestId !== ordersRequestIdRef.current) return;

      setOrders((current) => {
        const ids = new Set(current.map((order) => order.id));
        return [
          ...current,
          ...(Array.isArray(page.content)
            ? page.content.filter((order) => !ids.has(order.id))
            : []),
        ];
      });
      setOrdersTotal(page.totalElements ?? ordersTotal);
      setOrdersNextPage((page.number ?? ordersNextPage) + 1);
    } catch (loadError) {
      if (requestId === ordersRequestIdRef.current) {
        toast.error(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить заказы"
        );
      }
    } finally {
      if (requestId === ordersRequestIdRef.current) {
        ordersLoadingMoreRef.current = false;
        setOrdersLoadingMore(false);
      }
    }
  }

  async function saveProfile(
    values: AccountProfileUpdate,
  ): Promise<boolean> {
    if (profileSaving) return false;

    setProfileSaving(true);
    setError(null);

    try {
      const response = await apiFetch(`${API_URL}/api/profile`, {
        method: "PUT",
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          middleName: me?.middleName ?? null,
          birthDate: me?.birthDate ?? null,
          gender: me?.gender ?? null,
          phone: values.phone || null,
          defaultDeliveryAddress: me?.defaultDeliveryAddress ?? null,
          defaultDeliveryCityName: me?.defaultDeliveryCityName ?? null,
          defaultDeliveryApartment: me?.defaultDeliveryApartment ?? null,
          defaultDeliveryFloor: me?.defaultDeliveryFloor ?? null,
          defaultDeliveryIntercom: me?.defaultDeliveryIntercom ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(await accountApiError(response, "Не удалось сохранить профиль"));
      }

      const updated: Me = await response.json();

      setMe(updated);
      toast.success("Профиль сохранён");
      return true;
    } catch {
      toast.error(
        "Не удалось сохранить профиль",
      );
      return false;
    } finally {
      setProfileSaving(false);
    }
  }

  async function logout() {
    await logoutAuth();
    router.replace("/");
    router.refresh();
  }

  function openOrder(orderId: number, from: "orders" | "returns" = "orders") {
    ordersScroll.current = window.scrollY;
    prefetchOrderDetails(orderId);
    navigateAccount(`/account?tab=orders&orderId=${orderId}${from === "returns" ? "&from=returns" : ""}`);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  function openTab(tab: AccountTab) {
    navigateAccount(tab === "home" ? "/account" : `/account?tab=${tab}`);
  }

  function updateOrder(updatedOrder: Order, updatedOrderGroupId?: string) {
    seedOrderDetails(updatedOrder.id, updatedOrder);
    setSelectedOrder(updatedOrder);
    setOrders((current) =>
      current.map((order) =>
        updatedOrderGroupId && order.orderGroupId === updatedOrderGroupId
          ? {
              ...order,
              status: updatedOrder.status,
              paymentStatus: updatedOrder.paymentStatus,
              deliveryStatus: updatedOrder.deliveryStatus,
            }
          : order.id === updatedOrder.id
          ? {
              ...order,
              status: updatedOrder.status,
              paymentStatus: updatedOrder.paymentStatus,
              deliveryStatus: updatedOrder.deliveryStatus,
              totalAmount: updatedOrder.totalAmount,
            }
          : order,
      ),
    );
  }

  function navigateAccount(href: string) {
    if (!href.startsWith("/account")) {
      router.push(href);
      return;
    }

    requestEditorNavigation(() => {
      setError(null);
      window.history.pushState(null, "", href);
      window.scrollTo({top:0,behavior:"auto"});
    });
  }


  const orderId = selectedOrderId && Number.isInteger(Number(selectedOrderId)) && Number(selectedOrderId) > 0 ? Number(selectedOrderId) : null;

  return <AccountFrame currentTab={currentTab} orderId={orderId} showSellerCabinet={Boolean(me?.sellerApproved)} onNavigate={navigateAccount} onLogout={() => void logout()}>
      {error ? <div className={styles.errorText} role="alert">{error}<button className="buttonGhost" onClick={() => { setError(null); router.refresh(); }}>Повторить</button></div> : null}

      {currentTab === "orders" || visitedTabs.has("orders") ? <div hidden={currentTab !== "orders"} aria-busy={detailsLoading || ordersLoadingMore}>
        {selectedOrder && selectedOrder.id === Number(selectedOrderId) ? <AccountOrderDetails key={selectedOrder.id} order={selectedOrder} onOrderUpdated={updateOrder} formatOrderStatus={formatOrderStatus} formatPaymentStatus={formatPaymentStatus} formatDeliveryStatus={formatDeliveryStatus} buildOrderStatusLabel={buildOrderStatusLabel} />
          : orderId && !error ? <AccountSkeleton variant="detail" />
          : !selectedOrderId && !ordersLoaded && !error ? <AccountSkeleton variant="orders" />
          : !selectedOrderId ? <AccountOrdersTab orders={orders} totalElements={ordersTotal} loadingMore={ordersLoadingMore} onLoadMore={orders.length < ordersTotal ? loadMoreOrders : undefined} buildOrderStatusLabel={buildOrderStatusLabel} onOpenOrder={openOrder} onLoadOrder={getOrderDetails} onPrefetchOrder={prefetchOrderDetails} /> : null}
      </div> : null}
      {currentTab === "returns" || visitedTabs.has("returns") ? <div hidden={currentTab !== "returns"}><AccountReturnsTab onOpenOrders={() => openTab("orders")} onOpenOrder={id=>openOrder(id,"returns")} /></div> : null}
      <div hidden={currentTab !== "profile" && currentTab !== "home"}><AccountProfileTab email={me?.email?.trim() || ""} emailVerified={me?.emailVerified === true} onEmailChanged={email => setMe(current => current ? { ...current, email, emailVerified: true } : current)} firstName={me?.firstName ?? ""} lastName={me?.lastName ?? ""} phone={me?.phone ?? ""} saving={profileSaving} onSave={saveProfile} onEditingChange={editing => { if (editing && currentTab === "home") window.history.replaceState(null, "", "/account?tab=profile"); }} /></div>
      {currentTab === "favorites" || visitedTabs.has("favorites") ? <div hidden={currentTab !== "favorites"}><AccountFavoritesTab /></div> : null}
      {currentTab === "brands" || visitedTabs.has("brands") ? <div hidden={currentTab !== "brands"}><AccountBrandsTab /></div> : null}
      {currentTab === "info" || visitedTabs.has("info") ? <div hidden={currentTab !== "info"}><AccountInfoTab /></div> : null}
  </AccountFrame>;
}

export function AccountPageClient(props: Props) {
  return <AccountPageContent {...props} />;
}

function addVisitedAccountTab(current: Set<AccountTab>, tab: AccountTab) {
  if (current.has(tab)) return current;

  const next = new Set(current);
  next.add(tab);
  return next;
}
