"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { apiFetch, API_URL } from "../lib/api";
import { logout as logoutAuth } from "../lib/auth";
import { useSessionResourceCache } from "../lib/useSessionResourceCache";

import { AccountSidebar } from "./components/AccountSidebar";
import { AccountHomeTab } from "./components/AccountHomeTab";
import { AccountProfileTab } from "./components/AccountProfileTab";
import { AccountOrdersTab } from "./components/AccountOrdersTab";
import { AccountOrderDetails } from "./components/AccountOrderDetails";
import { AccountFavoritesTab } from "./components/AccountFavoritesTab";
import { AccountInfoTab } from "./components/AccountInfoTab";
import { CabinetSkeleton } from "../components/ui/CabinetSkeleton";

import styles from "./AccountPageClient.module.css";

import type {
  Me,
  Order,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  OrderListItem,
} from "./types";

type AccountTab = "home" | "orders" | "profile" | "favorites" | "info";

function formatOrderStatus(status: OrderStatus): string {
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
    default:
      return status;
  }
}

function formatDeliveryStatus(status: DeliveryStatus): string {
  switch (status) {
    case "PENDING":
      return "Ожидает обработки";
    case "READY_FOR_SHIPMENT":
      return "Готов к отправке";
    case "IN_TRANSIT":
      return "В пути";
    case "DELIVERED":
      return "Доставлен";
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
  if (order.paymentStatus === "PENDING") return "Ожидает оплаты";
  if (order.paymentStatus === "FAILED") return "Ошибка оплаты";
  if (order.deliveryStatus === "DELIVERED") return "Доставлен";
  if (order.deliveryStatus === "IN_TRANSIT") return "В пути";
  if (order.deliveryStatus === "READY_FOR_SHIPMENT") return "Готовится к отправке";
  if (order.paymentStatus === "PAID") return "Оплачен";

  return formatOrderStatus(order.status);
}

type ProfileForm = {
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  phone: string;
  deliveryFullName: string;
  defaultDeliveryAddress: string;
  defaultDeliveryCityName: string;
  defaultDeliveryApartment: string;
  defaultDeliveryFloor: string;
  defaultDeliveryIntercom: string;
};

function buildProfileForm(me: Me): ProfileForm {
  const deliveryFullName = buildFullName(
    me.lastName ?? "",
    me.firstName ?? "",
    me.middleName ?? ""
  );

  return {
    lastName: me.lastName ?? "",
    firstName: me.firstName ?? "",
    middleName: me.middleName ?? "",
    birthDate: me.birthDate ?? "",
    phone: me.phone ?? "",
    deliveryFullName,
    defaultDeliveryAddress: me.defaultDeliveryAddress ?? "",
    defaultDeliveryCityName: me.defaultDeliveryCityName ?? "",
    defaultDeliveryApartment: me.defaultDeliveryApartment ?? "",
    defaultDeliveryFloor: me.defaultDeliveryFloor ?? "",
    defaultDeliveryIntercom: me.defaultDeliveryIntercom ?? "",
  };
}

function buildFullName(lastName: string, firstName: string, middleName: string): string {
  return [lastName, firstName, middleName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

function parseFullName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  return {
    lastName: parts[0] ?? "",
    firstName: parts[1] ?? "",
    middleName: parts.slice(2).join(" "),
  };
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
    initialSelectedOrder
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
  const currentTab: AccountTab =
    tabParam === "orders" ||
    tabParam === "profile" ||
    tabParam === "favorites" ||
    tabParam === "info"
      ? tabParam
      : "home";

  const selectedOrderId = searchParams.get("orderId");
  const [visitedTabs, setVisitedTabs] = useState<Set<AccountTab>>(
    () => new Set([currentTab])
  );
  const initialProfileForm = useMemo(() => buildProfileForm(initialMe), [initialMe]);

  const [lastName, setLastName] = useState(initialProfileForm.lastName);
  const [firstName, setFirstName] = useState(initialProfileForm.firstName);
  const [middleName, setMiddleName] = useState(initialProfileForm.middleName);
  const [birthDate, setBirthDate] = useState(initialProfileForm.birthDate);
  const [phone, setPhone] = useState(initialProfileForm.phone);
  const [deliveryFullName, setDeliveryFullName] = useState(
    initialProfileForm.deliveryFullName
  );
  const [defaultDeliveryAddress, setDefaultDeliveryAddress] = useState(
    initialProfileForm.defaultDeliveryAddress
  );
  const [defaultDeliveryCityName, setDefaultDeliveryCityName] = useState(
    initialProfileForm.defaultDeliveryCityName
  );
  const [defaultDeliveryApartment, setDefaultDeliveryApartment] = useState(
    initialProfileForm.defaultDeliveryApartment
  );
  const [defaultDeliveryFloor, setDefaultDeliveryFloor] = useState(
    initialProfileForm.defaultDeliveryFloor
  );
  const [defaultDeliveryIntercom, setDefaultDeliveryIntercom] = useState(
    initialProfileForm.defaultDeliveryIntercom
  );
  const [savedProfileForm, setSavedProfileForm] =
    useState<ProfileForm>(initialProfileForm);
  const [profileSavedMessage, setProfileSavedMessage] = useState<string | null>(
    null
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
          setError(e instanceof Error ? e.message : "Не удалось загрузить заказ");
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
    setLastName(initialProfileForm.lastName);
    setFirstName(initialProfileForm.firstName);
    setMiddleName(initialProfileForm.middleName);
    setBirthDate(initialProfileForm.birthDate);
    setPhone(initialProfileForm.phone);
    setDeliveryFullName(initialProfileForm.deliveryFullName);
    setDefaultDeliveryAddress(initialProfileForm.defaultDeliveryAddress);
    setDefaultDeliveryCityName(initialProfileForm.defaultDeliveryCityName);
    setDefaultDeliveryApartment(initialProfileForm.defaultDeliveryApartment);
    setDefaultDeliveryFloor(initialProfileForm.defaultDeliveryFloor);
    setDefaultDeliveryIntercom(initialProfileForm.defaultDeliveryIntercom);
    setSavedProfileForm(initialProfileForm);
    setProfileSavedMessage(null);
  }, [initialMe, initialProfileForm]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  async function saveProfile() {
    if (profileSaving) return;

    setProfileSaving(true);
    setError(null);

    try {
      const parsedDeliveryName = parseFullName(deliveryFullName);
      const nextFirstName = firstName.trim() || parsedDeliveryName.firstName;
      const nextLastName = parsedDeliveryName.lastName;
      const nextMiddleName = parsedDeliveryName.middleName;

      const response = await apiFetch(`${API_URL}/api/profile`, {
        method: "PUT",
        body: JSON.stringify({
          firstName: nextFirstName,
          lastName: nextLastName,
          middleName: nextMiddleName,
          birthDate,
          gender: me?.gender ?? null,
          phone,
          defaultDeliveryAddress,
          defaultDeliveryCityName,
          defaultDeliveryApartment,
          defaultDeliveryFloor,
          defaultDeliveryIntercom,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось сохранить профиль");
      }

      const updated: Me = await response.json();
      const updatedProfileForm = buildProfileForm(updated);

      setMe(updated);
      setLastName(updatedProfileForm.lastName);
      setFirstName(updatedProfileForm.firstName);
      setMiddleName(updatedProfileForm.middleName);
      setBirthDate(updatedProfileForm.birthDate);
      setPhone(updatedProfileForm.phone);
      setDeliveryFullName(updatedProfileForm.deliveryFullName);
      setDefaultDeliveryAddress(updatedProfileForm.defaultDeliveryAddress);
      setDefaultDeliveryCityName(updatedProfileForm.defaultDeliveryCityName);
      setDefaultDeliveryApartment(updatedProfileForm.defaultDeliveryApartment);
      setDefaultDeliveryFloor(updatedProfileForm.defaultDeliveryFloor);
      setDefaultDeliveryIntercom(updatedProfileForm.defaultDeliveryIntercom);
      setSavedProfileForm(updatedProfileForm);
      setProfileSavedMessage("Профиль сохранён");

      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить профиль");
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
  }

  function openTab(tab: AccountTab) {
    navigateAccount(tab === "home" ? "/account" : `/account?tab=${tab}`);
  }

  function closeOrderDetails() {
    navigateAccount("/account?tab=orders");
  }

  function navigateAccount(href: string) {
    window.history.pushState(null, "", href);
  }

  const profileForm = useMemo(
    () => ({
      lastName,
      firstName,
      middleName,
      birthDate,
      phone,
      deliveryFullName,
      defaultDeliveryAddress,
      defaultDeliveryCityName,
      defaultDeliveryApartment,
      defaultDeliveryFloor,
      defaultDeliveryIntercom,
    }),
    [
      lastName,
      firstName,
      middleName,
      birthDate,
      phone,
      deliveryFullName,
      defaultDeliveryAddress,
      defaultDeliveryCityName,
      defaultDeliveryApartment,
      defaultDeliveryFloor,
      defaultDeliveryIntercom,
    ]
  );
  const profileChanged =
    JSON.stringify(profileForm) !== JSON.stringify(savedProfileForm);

  function updateFirstName(value: string) {
    setFirstName(value);
    setProfileSavedMessage(null);
  }

  function updateLastName(value: string) {
    setLastName(value);
    setProfileSavedMessage(null);
  }

  function updatePhone(value: string) {
    setPhone(value);
    setProfileSavedMessage(null);
  }

  function updateDeliveryFullName(value: string) {
    setDeliveryFullName(value);
    setProfileSavedMessage(null);
  }

  function updateDefaultDeliveryAddress(value: string) {
    setDefaultDeliveryAddress(value);
    setProfileSavedMessage(null);
  }

  function updateDefaultDeliveryCityName(value: string) {
    setDefaultDeliveryCityName(value);
    setProfileSavedMessage(null);
  }

  function updateDefaultDeliveryApartment(value: string) {
    setDefaultDeliveryApartment(value);
    setProfileSavedMessage(null);
  }

  function updateDefaultDeliveryFloor(value: string) {
    setDefaultDeliveryFloor(value);
    setProfileSavedMessage(null);
  }

  function updateDefaultDeliveryIntercom(value: string) {
    setDefaultDeliveryIntercom(value);
    setProfileSavedMessage(null);
  }

  if (error && !selectedOrderId) {
    return (
      <div className="pageContainer">
        <div className={styles.page}>
          <div className={styles.sectionTitle}>Не удалось загрузить аккаунт</div>
          <div className={styles.errorText}>{error}</div>
        </div>
      </div>
    );
  }

  const activeOrdersCount = orders.filter(isActiveAccountOrder).length;

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <header className={styles.header}>
          <h1>Профиль</h1>
          <button type="button" className={styles.logoutButton} onClick={() => void logout()}>
            Выйти
          </button>
        </header>

        <div className={styles.layout}>
          <AccountSidebar
            currentTab={currentTab}
            ordersCount={activeOrdersCount}
            onNavigate={navigateAccount}
          />

          <div className={styles.content}>
            {visitedTabs.has("home") ? (
              <div hidden={currentTab !== "home"}>
                <AccountHomeTab
                  me={me}
                  orders={orders}
                  buildOrderStatusLabel={buildOrderStatusLabel}
                  onOpenOrder={openOrder}
                  onPrefetchOrder={prefetchOrderDetails}
                  onOpenOrders={() => openTab("orders")}
                  onOpenProfile={() => openTab("profile")}
                  onOpenFavorites={() => openTab("favorites")}
                />
              </div>
            ) : null}

            {visitedTabs.has("profile") ? (
              <div hidden={currentTab !== "profile"}>
                <AccountProfileTab
                  email={me?.email?.trim() || "?"}
                  firstName={firstName}
                  lastName={lastName}
                  phone={phone}
                  saving={profileSaving}
                  changed={profileChanged}
                  savedMessage={profileSavedMessage}
                  onFirstNameChange={updateFirstName}
                  onLastNameChange={updateLastName}
                  onPhoneChange={updatePhone}
                  onSave={() => void saveProfile()}
                />
              </div>
            ) : null}

            {visitedTabs.has("favorites") ? (
              <div hidden={currentTab !== "favorites"}>
                <AccountFavoritesTab />
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
