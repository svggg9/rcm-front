"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { apiFetch, API_URL } from "../lib/api";
import { logout as logoutAuth } from "../lib/auth";

import { AccountSidebar } from "./components/AccountSidebar";
import { AccountProfileTab } from "./components/AccountProfileTab";
import { AccountOrdersTab } from "./components/AccountOrdersTab";
import { AccountOrderDetails } from "./components/AccountOrderDetails";

import styles from "./AccountPageClient.module.css";

import type {
  Me,
  Order,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  OrderListItem,
} from "./types";

type AccountTab = "profile" | "orders";

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) return "П";

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

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

function buildOrderStatusLabel(order: Order | OrderListItem): string {
  if (order.paymentStatus === "PENDING") return "Ожидает оплаты";
  if (order.paymentStatus === "FAILED") return "Ошибка оплаты";
  if (order.deliveryStatus === "IN_TRANSIT") return "В пути";
  if (order.deliveryStatus === "DELIVERED") return "Доставлен";
  if (order.deliveryStatus === "READY_FOR_SHIPMENT") return "Готов к отправке";

  return formatOrderStatus(order.status);
}

function normalizeGender(value: Me["gender"]): "men" | "women" | "" {
  return value === "men" || value === "women" ? value : "";
}

type Props = {
  initialMe: Me;
  initialOrders: OrderListItem[];
};

function AccountPageContent({ initialMe, initialOrders }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [me, setMe] = useState<Me | null>(initialMe);
  const [orders, setOrders] = useState<OrderListItem[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTab: AccountTab =
    searchParams.get("tab") === "profile" ? "profile" : "orders";

  const selectedOrderId = searchParams.get("orderId");

  const [lastName, setLastName] = useState(initialMe.lastName ?? "");
  const [firstName, setFirstName] = useState(initialMe.firstName ?? "");
  const [middleName, setMiddleName] = useState(initialMe.middleName ?? "");
  const [birthDate, setBirthDate] = useState(initialMe.birthDate ?? "");
  const [gender, setGender] = useState<"men" | "women" | "">(
    normalizeGender(initialMe.gender)
  );
  const [phone, setPhone] = useState(initialMe.phone ?? "");

  useEffect(() => {
    if (currentTab !== "orders" || !selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    let cancelled = false;

    async function loadOrderDetails() {
      setDetailsLoading(true);
      setError(null);

      try {
        const response = await apiFetch(`${API_URL}/api/orders/${selectedOrderId}`);

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || "Не удалось загрузить заказ");
        }

        const data: Order = await response.json();

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
  }, [currentTab, selectedOrderId]);

  useEffect(() => {
    setMe(initialMe);
    setLastName(initialMe.lastName ?? "");
    setFirstName(initialMe.firstName ?? "");
    setMiddleName(initialMe.middleName ?? "");
    setBirthDate(initialMe.birthDate ?? "");
    setGender(normalizeGender(initialMe.gender));
    setPhone(initialMe.phone ?? "");
  }, [initialMe]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  async function saveProfile() {
    if (profileSaving) return;

    setProfileSaving(true);
    setError(null);

    try {
      const response = await apiFetch(`${API_URL}/api/profile`, {
        method: "PUT",
        body: JSON.stringify({
          firstName,
          lastName,
          middleName,
          birthDate,
          gender: gender || null,
          phone,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось сохранить профиль");
      }

      const updated: Me = await response.json();

      setMe(updated);
      setLastName(updated.lastName ?? "");
      setFirstName(updated.firstName ?? "");
      setMiddleName(updated.middleName ?? "");
      setBirthDate(updated.birthDate ?? "");
      setGender(normalizeGender(updated.gender));
      setPhone(updated.phone ?? "");

      toast.success("Профиль сохранён");
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
    router.push(`/account?tab=orders&orderId=${orderId}`);
  }

  function closeOrderDetails() {
    router.push("/account?tab=orders");
  }

  const fullName = useMemo(() => {
    const parts = [lastName, firstName, middleName].filter(
      (value) => value.trim().length > 0
    );

    return parts.join(" ").trim();
  }, [lastName, firstName, middleName]);

  const displayName =
    fullName || me?.displayName?.trim() || me?.username || "Профиль";

  const initials = getInitials(displayName);

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

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.layout}>
          <AccountSidebar
            currentTab={currentTab}
            ordersCount={orders.length}
            onLogout={() => void logout()}
          />

          <div className={styles.content}>
            {currentTab === "profile" ? (
              <AccountProfileTab
                displayName={displayName}
                initials={initials}
                email={me?.email?.trim() || me?.username || "—"}
                role={me?.role ?? "—"}
                lastName={lastName}
                firstName={firstName}
                middleName={middleName}
                birthDate={birthDate}
                gender={gender}
                phone={phone}
                saving={profileSaving}
                onLastNameChange={setLastName}
                onFirstNameChange={setFirstName}
                onMiddleNameChange={setMiddleName}
                onBirthDateChange={setBirthDate}
                onGenderChange={setGender}
                onPhoneChange={setPhone}
                onSave={() => void saveProfile()}
              />
            ) : detailsLoading ? (
              <div className={styles.sectionTitle}>Загрузка заказа…</div>
            ) : selectedOrder ? (
              <AccountOrderDetails
                order={selectedOrder}
                onBack={closeOrderDetails}
                formatOrderStatus={formatOrderStatus}
                formatPaymentStatus={formatPaymentStatus}
                formatDeliveryStatus={formatDeliveryStatus}
                buildOrderStatusLabel={buildOrderStatusLabel}
              />
            ) : (
              <AccountOrdersTab
                orders={orders}
                buildOrderStatusLabel={buildOrderStatusLabel}
                onOpenOrder={openOrder}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountPageClient(props: Props) {
  return <AccountPageContent {...props} />;
}