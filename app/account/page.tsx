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

type Me = {
  id: number;
  username: string;
  displayName: string | null;
  role: string;
};

type OrderItemPreview = {
  imageUrl?: string;
};

type Order = {
  id: number;
  status: "NEW" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
  totalAmount: number;
  createdAt: string;
  items?: OrderItemPreview[];
};

type OrderDetailsItem = {
  productTitle: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  lineTotal: number;
};

type OrderDetails = {
  id: number;
  status: "NEW" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
  totalAmount: number;
  createdAt: string;
  items: OrderDetailsItem[];
};

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

function formatStatus(status: Order["status"]): string {
  switch (status) {
    case "NEW":
      return "Новый";
    case "PAID":
      return "Оплачен";
    case "SHIPPED":
      return "Отправлен";
    case "COMPLETED":
      return "Доставлен";
    case "CANCELED":
      return "Отменён";
    default:
      return status;
  }
}

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuth = useClientAuth();

  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);

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
      apiFetch(`${API_URL}/api/orders/my`).then(async (response) => {
        if (!response.ok) {
          throw new Error(
            (await response.text().catch(() => "")) ||
              `Ошибка /api/orders/my (${response.status})`
          );
        }

        return response.json() as Promise<Order[]>;
      }),
    ])
      .then(([meData, ordersData]) => {
        setMe(meData);
        setOrders(Array.isArray(ordersData) ? ordersData : []);

        const displayName = meData.displayName?.trim() ?? "";
        if (displayName) {
          const parts = displayName.split(/\s+/).filter(Boolean);
          setLastName(parts[0] ?? "");
          setFirstName(parts[1] ?? meData.username ?? "");
          setMiddleName(parts[2] ?? "");
        } else {
          setFirstName(meData.username ?? "");
        }

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

        return response.json() as Promise<OrderDetails>;
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
                email={me?.username ? `${me.username}@mail.com` : "—"}
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
                formatStatus={formatStatus}
              />
            ) : (
              <AccountOrdersTab
                orders={orders}
                formatStatus={formatStatus}
                onOpenOrder={openOrder}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}