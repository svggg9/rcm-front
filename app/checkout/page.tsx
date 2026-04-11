"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, API_URL } from "../lib/api";
import { getCartId, getToken } from "../lib/auth";
import { emitCartChanged } from "../lib/cartEvents";
import { useClientAuth } from "../lib/useClientAuth";

import { CheckoutContactSection } from "./components/CheckoutContactSection";
import { CheckoutDeliverySection } from "./components/CheckoutDeliverySection";
import { CheckoutPaymentSection } from "./components/CheckoutPaymentSection";
import { CheckoutSummary } from "./components/CheckoutSummary";

import type {
  CartItem,
  CheckoutStep,
  DeliveryOption,
  OrderResponse,
  PaymentMethod,
} from "./types";
import {
  validateContactDetails,
  validateDeliveryDetails,
} from "./lib/checkoutValidation";

import styles from "./Checkout.module.css";

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: "pvz_1",
    label: "Москва, ПВЗ на Тверской, 12",
    hint: "Ежедневно 10:00–22:00",
  },
  {
    id: "pvz_2",
    label: "Москва, ПВЗ на Арбате, 5",
    hint: "Ежедневно 09:00–21:00",
  },
  {
    id: "pvz_3",
    label: "Санкт-Петербург, ПВЗ Невский, 48",
    hint: "Ежедневно 10:00–21:00",
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const isAuth = useClientAuth();
  const cartId = getCartId();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactConfirmed, setContactConfirmed] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [activeStep, setActiveStep] = useState<CheckoutStep>("CONTACT");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("SBP");

  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) {
      router.push("/auth/login?next=/checkout");
    }
  }, [isAuth, router]);

  useEffect(() => {
    if (!cartId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    apiFetch(`${API_URL}/api/cart?cartId=${cartId}`)
      .then((response: Response) => response.json())
      .then((data: CartItem[]) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Не удалось загрузить корзину");
        setLoading(false);
      });
  }, [cartId]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const deliveryPrice = 0;
  const total = subtotal + deliveryPrice;

  function handleConfirmContact() {
    setError(null);

    const validationError = validateContactDetails({
      email,
      fullName,
      phone,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setContactConfirmed(true);
    setActiveStep("DELIVERY");
  }

  function handleConfirmDelivery() {
    setError(null);

    const validationError = validateDeliveryDetails(selectedAddressId);

    if (validationError) {
      setError(validationError);
      return;
    }

    setDeliveryConfirmed(true);
    setActiveStep("PAYMENT");
  }

  function handleConfirmPayment() {
    setError(null);
    setPaymentConfirmed(true);
  }

  function editContact() {
    setContactConfirmed(false);
    setDeliveryConfirmed(false);
    setPaymentConfirmed(false);
    setActiveStep("CONTACT");
  }

  function editDelivery() {
    setDeliveryConfirmed(false);
    setPaymentConfirmed(false);
    setActiveStep("DELIVERY");
  }

  function editPayment() {
    setPaymentConfirmed(false);
    setActiveStep("PAYMENT");
  }

  async function submitOrder() {
    if (isAuth !== true) {
      router.push("/auth/login?next=/checkout");
      return;
    }

    if (!cartId || items.length === 0) return;

    const token = getToken();

    if (!token) {
      router.push("/auth/login?next=/checkout");
      return;
    }

    if (!contactConfirmed || !deliveryConfirmed || !paymentConfirmed) {
      setError("Подтвердите все этапы оформления заказа");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const checkoutResponse = await fetch(
        `${API_URL}/api/orders/checkout?cartId=${encodeURIComponent(cartId)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!checkoutResponse.ok) {
        const text = await checkoutResponse.text().catch(() => "");
        setError(text || `Ошибка оформления заказа (${checkoutResponse.status})`);
        return;
      }

      const order: OrderResponse = await checkoutResponse.json();

      const payResponse = await fetch(`${API_URL}/api/pay/${order.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!payResponse.ok) {
        const text = await payResponse.text().catch(() => "");
        setError(text || `Ошибка mock-оплаты (${payResponse.status})`);
        return;
      }

      emitCartChanged();
      router.push(`/orders/${order.id}`);
    } catch {
      setError("Ошибка оформления заказа (network)");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="pageContainer">
        <div className={styles.page}>Загрузка…</div>
      </div>
    );
  }

  if (!cartId) {
    return (
      <div className="pageContainer">
        <div className={styles.page}>Нет cartId</div>
      </div>
    );
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Оформление заказа</h1>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>Корзина пуста</div>
        ) : (
          <div className={styles.layout}>
            <div className={styles.main}>
              <CheckoutContactSection
                email={email}
                fullName={fullName}
                phone={phone}
                confirmed={contactConfirmed}
                expanded={activeStep === "CONTACT" || !contactConfirmed}
                onEdit={editContact}
                onConfirm={handleConfirmContact}
                onEmailChange={setEmail}
                onFullNameChange={setFullName}
                onPhoneChange={setPhone}
              />

              <CheckoutDeliverySection
                options={DELIVERY_OPTIONS}
                selectedAddressId={selectedAddressId}
                confirmed={deliveryConfirmed}
                expanded={activeStep === "DELIVERY" || !deliveryConfirmed}
                enabled={contactConfirmed}
                onEdit={editDelivery}
                onConfirm={handleConfirmDelivery}
                onAddressChange={setSelectedAddressId}
              />

              <CheckoutPaymentSection
                paymentMethod={paymentMethod}
                confirmed={paymentConfirmed}
                expanded={activeStep === "PAYMENT" || !paymentConfirmed}
                enabled={contactConfirmed && deliveryConfirmed}
                onEdit={editPayment}
                onConfirm={handleConfirmPayment}
                onPaymentMethodChange={setPaymentMethod}
              />

              {error ? <div className={styles.error}>{error}</div> : null}
            </div>

            <CheckoutSummary
              items={items}
              subtotal={subtotal}
              deliveryPrice={deliveryPrice}
              total={total}
              submitting={submitting}
              contactConfirmed={
                contactConfirmed && deliveryConfirmed && paymentConfirmed
              }
              onSubmit={submitOrder}
            />
          </div>
        )}
      </div>
    </div>
  );
}