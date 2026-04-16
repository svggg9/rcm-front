"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch, API_URL } from "../lib/api";
import { useClientAuth } from "../lib/useClientAuth";
import { clearAuth } from "../lib/auth";

import { AccountSidebar } from "./components/AccountSidebar";
import { AccountProfileTab } from "./components/AccountProfileTab";
import { AccountOrdersTab } from "./components/AccountOrdersTab";
import { AccountOrderDetails } from "./components/AccountOrderDetails";

import styles from "./Account.module.css";

import type {
  Me,
  Order,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  PageResponse,
} from "./types";

type AccountTab = "profile" | "orders";

function getInitials(value: string): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

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

function buildOrderStatusLabel(order: Order): string {
  if (order.paymentStatus === "PENDING") {
    return "Ожидает оплаты";
  }

  if (order.paymentStatus === "FAILED") {
    return "Ошибка оплаты";
  }

  if (order.deliveryStatus === "IN_TRANSIT") {
    return "В пути";
  }

  if (order.deliveryStatus === "DELIVERED") {
    return "Доставлен";
  }

  if (order.deliveryStatus === "READY_FOR_SHIPMENT") {
    return "Готов к отправке";
  }

  return formatOrderStatus(order.status);
}

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuth = useClientAuth();

  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTab: AccountTab =
    searchParams.get("tab") === "profile" ? "profile" : "orders";

  const selectedOrderId = searchParams.get("orderId");

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"men" | "women" | "">("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) {
      router.replace("/auth/login?next=/account?tab=orders");
    }
  }, [isAuth, router]);

  useEffect(() => {
    if (isAuth !== true) return;

    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch(`${API_URL}/api/profile`).then(async (response) => {
        if (!response.ok) {
          throw new Error(
            (await response.text().catch(() => "")) ||
              `Ошибка /api/profile (${response.status})`
          );
        }

        return response.json() as Promise<Me>;
      }),
      apiFetch(`${API_URL}/api/orders/my?page=0&size=20`).then(
        async (response) => {
          if (!response.ok) {
            throw new Error(
              (await response.text().catch(() => "")) ||
                `Ошибка /api/orders/my (${response.status})`
            );
          }

          return response.json() as Promise<PageResponse<Order>>;
        }
      ),
    ])
      .then(([meData, ordersPage]) => {
        setMe(meData);
        setOrders(Array.isArray(ordersPage.content) ? ordersPage.content : []);

        const displayName = meData.displayName?.trim() ?? "";
        if (displayName) {
          const parts = displayName.split(/\s+/).filter(Boolean);
          setLastName(parts[0] ?? "");
          setFirstName(parts[1] ?? "");
          setMiddleName(parts[2] ?? "");
        } else {
          setLastName("");
          setFirstName(meData.username ?? "");
          setMiddleName("");
        }

        setPhone(meData.phone ?? "");
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [isAuth]);

  useEffect(() => {
    if (currentTab !== "orders" || !selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    setDetailsLoading(true);
    setError(null);

    apiFetch(`${API_URL}/api/orders/${selectedOrderId}`)
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || "Не удалось загрузить заказ");
        }

        return response.json() as Promise<Order>;
      })
      .then((data) => {
        setSelectedOrder(data);
        setDetailsLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setDetailsLoading(false);
      });
  }, [currentTab, selectedOrderId]);

  function logout() {
    clearAuth();
    router.replace("/");
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

  if (isAuth === null || loading) {
    return (
      <div className="pageContainer">
        <div className={styles.page}>Загрузка…</div>
      </div>
    );
  }

  if (error && !selectedOrderId) {
    return (
      <div className="pageContainer">
        <div className={styles.page}>{error}</div>
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
            onLogout={logout}
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
                onLastNameChange={setLastName}
                onFirstNameChange={setFirstName}
                onMiddleNameChange={setMiddleName}
                onBirthDateChange={setBirthDate}
                onGenderChange={setGender}
                onPhoneChange={setPhone}
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