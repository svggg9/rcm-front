"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { apiFetch, API_URL } from "../lib/api";
import { logout as logoutAuth } from "../lib/auth";
import { useSessionResourceCache } from "../lib/useSessionResourceCache";

import { AccountSidebar } from "./components/AccountSidebar";
import { AccountHomeTab } from "./components/AccountHomeTab";
import {
  AccountProfileTab,
  type AccountProfileUpdate,
} from "./components/AccountProfileTab";
import { AccountOrdersTab } from "./components/AccountOrdersTab";
import { AccountOrderDetails } from "./components/AccountOrderDetails";
import { AccountFavoritesTab } from "./components/AccountFavoritesTab";
import { AccountBrandsTab } from "./components/AccountBrandsTab";
import { AccountInfoTab } from "./components/AccountInfoTab";
import { AccountReturnsTab } from "./components/AccountReturnsTab";
import { CabinetSkeleton } from "../components/ui/CabinetSkeleton";
import { CabinetTabs } from "../components/ui/CabinetTabs";

import styles from "./AccountPageClient.module.css";

import type {
  Me,
  Order,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  OrderListItem,
} from "./types";

type AccountTab =
  "home" | "orders" | "returns" | "favorites" | "brands" | "info";

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

function isActiveAccountOrder(order: OrderListItem): boolean {
  return (
    order.status !== "CANCELED" &&
    order.status !== "COMPLETED" &&
    order.deliveryStatus !== "DELIVERED"
  );
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
  initialOrders: OrderListItem[];
  initialSelectedOrder: Order | null;
};

async function fetchAccountOrder(orderId: number): Promise<Order> {
  const response = await apiFetch(`${API_URL}/api/orders/${orderId}`);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Не удалось загрузить заказ (${response.status})`);
  }

  return response.json() as Promise<Order>;
}

function AccountPageContent({
  initialMe,
  initialOrders,
  initialSelectedOrder,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [me, setMe] = useState<Me | null>(initialMe);
  const [orders, setOrders] = useState<OrderListItem[]>(initialOrders);
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
  const profileRequested = tabParam === "profile";
  const currentTab: AccountTab =
    tabParam === "orders" ||
    tabParam === "returns" ||
    tabParam === "favorites" ||
    tabParam === "brands" ||
    tabParam === "info"
      ? tabParam
      : "home";

  const selectedOrderId = searchParams.get("orderId");
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
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Не удалось загрузить заказ",
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
    setOrders(initialOrders);
  }, [initialOrders]);

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
          birthDate: values.birthDate || null,
          gender: values.gender,
          phone: values.phone || null,
          defaultDeliveryAddress: me?.defaultDeliveryAddress ?? null,
          defaultDeliveryCityName: me?.defaultDeliveryCityName ?? null,
          defaultDeliveryApartment: me?.defaultDeliveryApartment ?? null,
          defaultDeliveryFloor: me?.defaultDeliveryFloor ?? null,
          defaultDeliveryIntercom: me?.defaultDeliveryIntercom ?? null,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось сохранить профиль");
      }

      const updated: Me = await response.json();

      setMe(updated);
      router.refresh();
      return true;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось сохранить профиль",
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

  function openOrder(orderId: number) {
    prefetchOrderDetails(orderId);
    navigateAccount(`/account?tab=orders&orderId=${orderId}`);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  function openTab(tab: AccountTab) {
    navigateAccount(tab === "home" ? "/account" : `/account?tab=${tab}`);
  }

  function closeOrderDetails() {
    navigateAccount("/account?tab=orders");
  }

  function updateOrder(updatedOrder: Order) {
    seedOrderDetails(updatedOrder.id, updatedOrder);
    setSelectedOrder(updatedOrder);
    setOrders((current) =>
      current.map((order) =>
        order.id === updatedOrder.id
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
    window.history.pushState(null, "", href);
  }

  function handleProfileEditingChange(editing: boolean) {
    const activeTab = new URL(window.location.href).searchParams.get("tab");

    if (!editing && activeTab === "profile") {
      window.history.replaceState(null, "", "/account");
    }
  }

  if (error && !selectedOrderId) {
    return (
      <div className="pageContainer">
        <div className={styles.page}>
          <div className={styles.sectionTitle}>
            Не удалось загрузить аккаунт
          </div>
          <div className={styles.errorText}>{error}</div>
        </div>
      </div>
    );
  }

  const activeOrdersCount = orders.filter(isActiveAccountOrder).length;
  const accountName =
    me?.displayName?.trim() ||
    [me?.firstName, me?.lastName].filter(Boolean).join(" ").trim() ||
    me?.username ||
    "Профиль";

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.layout}>
          <AccountSidebar
            currentTab={currentTab}
            ordersCount={activeOrdersCount}
            userName={accountName}
            onNavigate={navigateAccount}
            onLogout={() => void logout()}
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
                  onChange={(tab) => openTab(tab)}
                  ariaLabel="Заказы и возвраты"
                  appearance="line"
                />
              </div>
            ) : null}

            {visitedTabs.has("home") ? (
              <div hidden={currentTab !== "home"}>
                <AccountHomeTab
                  orders={orders}
                  buildOrderStatusLabel={buildOrderStatusLabel}
                  onOpenOrder={openOrder}
                  onLoadOrder={getOrderDetails}
                  onPrefetchOrder={prefetchOrderDetails}
                  onOpenOrders={() => openTab("orders")}
                  profileEditor={
                    <AccountProfileTab
                      email={me?.email?.trim() || ""}
                      firstName={me?.firstName ?? ""}
                      lastName={me?.lastName ?? ""}
                      phone={me?.phone ?? ""}
                      birthDate={me?.birthDate ?? ""}
                      gender={me?.gender ?? null}
                      saving={profileSaving}
                      initialEditing={profileRequested}
                      onEditingChange={handleProfileEditingChange}
                      onSave={saveProfile}
                    />
                  }
                />
              </div>
            ) : null}

            {visitedTabs.has("returns") ? (
              <div hidden={currentTab !== "returns"}>
                <AccountReturnsTab onOpenOrders={() => openTab("orders")} />
              </div>
            ) : null}

            {visitedTabs.has("favorites") ? (
              <div hidden={currentTab !== "favorites"}>
                <AccountFavoritesTab />
              </div>
            ) : null}

            {visitedTabs.has("brands") ? (
              <div hidden={currentTab !== "brands"}>
                <AccountBrandsTab />
              </div>
            ) : null}

            {visitedTabs.has("info") ? (
              <div hidden={currentTab !== "info"}>
                <AccountInfoTab defaultEmail={me?.email ?? ""} />
              </div>
            ) : null}

            {visitedTabs.has("orders") ? (
              <div hidden={currentTab !== "orders"} aria-busy={detailsLoading}>
                {selectedOrder ? (
                  <AccountOrderDetails
                    order={selectedOrder}
                    onBack={closeOrderDetails}
                    onOrderUpdated={updateOrder}
                    formatOrderStatus={formatOrderStatus}
                    formatPaymentStatus={formatPaymentStatus}
                    formatDeliveryStatus={formatDeliveryStatus}
                    buildOrderStatusLabel={buildOrderStatusLabel}
                  />
                ) : selectedOrderId && detailsLoading ? (
                  <CabinetSkeleton variant="detail" />
                ) : (
                  <AccountOrdersTab
                    orders={orders}
                    buildOrderStatusLabel={buildOrderStatusLabel}
                    onOpenOrder={openOrder}
                    onLoadOrder={getOrderDetails}
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

export function AccountPageClient(props: Props) {
  return <AccountPageContent {...props} />;
}

function addVisitedAccountTab(current: Set<AccountTab>, tab: AccountTab) {
  if (current.has(tab)) return current;

  const next = new Set(current);
  next.add(tab);
  return next;
}
