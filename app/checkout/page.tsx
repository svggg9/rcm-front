"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, API_URL } from "../lib/api";
import { getToken, ensureCartId } from "../lib/auth";
import { emitCartChanged } from "../lib/cartEvents";
import { useClientAuth } from "../lib/useClientAuth";

import { CheckoutContactSection } from "./components/CheckoutContactSection";
import { CheckoutDeliverySection } from "./components/CheckoutDeliverySection";
import { CheckoutPaymentSection } from "./components/CheckoutPaymentSection";
import { CheckoutSummary } from "./components/CheckoutSummary";

import type {
  CartItem,
  CheckoutRequest,
  CheckoutStep,
  DeliveryMethod,
  DeliveryOption,
  OrderResponse,
  PaymentInitResponse,
  PaymentMethod,
} from "./types";
import {
  validateContactDetails,
  validateDeliveryDetails,
} from "./lib/checkoutValidation";
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
} from "./lib/checkoutDraft";
import {
  buildCheckoutPrefill,
  type Me,
} from "./lib/checkoutPrefill";

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

  const [cartId, setCartId] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLockRef = useRef(false);

  const [contactConfirmed, setContactConfirmed] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [activeStep, setActiveStep] = useState<CheckoutStep>("CONTACT");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("PICKUP");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [comment, setComment] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("SBP");

  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) {
      router.push("/auth/login?next=/checkout");
    }
  }, [isAuth, router]);

  useEffect(() => {
    const draft = loadCheckoutDraft();
    if (!draft) return;

    setEmail(draft.email);
    setFullName(draft.fullName);
    setPhone(draft.phone);
    setDeliveryMethod(draft.deliveryMethod);
    setSelectedAddressId(draft.selectedAddressId);
    setDeliveryAddress(draft.deliveryAddress);
    setComment(draft.comment);
    setPaymentMethod(draft.paymentMethod);
  }, []);

  useEffect(() => {
    saveCheckoutDraft({
      email,
      fullName,
      phone,
      deliveryMethod,
      selectedAddressId,
      deliveryAddress,
      comment,
      paymentMethod,
    });
  }, [
    email,
    fullName,
    phone,
    deliveryMethod,
    selectedAddressId,
    deliveryAddress,
    comment,
    paymentMethod,
  ]);

  useEffect(() => {
    if (isAuth !== true) return;

    let active = true;

    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);

        const resolvedCartId = await ensureCartId();
        if (!active) return;

        setCartId(resolvedCartId);

        const [profileResponse, cartResponse] = await Promise.all([
          apiFetch(`${API_URL}/api/profile`),
          apiFetch(
            `${API_URL}/api/cart?cartId=${encodeURIComponent(resolvedCartId)}`
          ),
        ]);

        if (!active) return;

        let me: Me | null = null;

        if (profileResponse.ok) {
          me = (await profileResponse.json()) as Me;
        }

        const prefill = buildCheckoutPrefill({
          me,
          existing: {
            email,
            fullName,
            phone,
            deliveryMethod,
            deliveryAddress,
            comment,
          },
        });

        if (!email.trim() && prefill.email) {
          setEmail(prefill.email);
        }

        if (!fullName.trim() && prefill.fullName) {
          setFullName(prefill.fullName);
        }

        if (!phone.trim() && prefill.phone) {
          setPhone(prefill.phone);
        }

        if (!deliveryAddress.trim() && prefill.deliveryAddress) {
          setDeliveryAddress(prefill.deliveryAddress);
        }

        if (!comment.trim() && prefill.comment) {
          setComment(prefill.comment);
        }

        if (!deliveryAddress.trim() && !selectedAddressId) {
          setDeliveryMethod(prefill.deliveryMethod);
        }

        if (!cartResponse.ok) {
          const text = await cartResponse.text().catch(() => "");
          throw new Error(text || "Не удалось загрузить корзину");
        }

        const cartData: CartItem[] = await cartResponse.json();
        setItems(Array.isArray(cartData) ? cartData : []);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Не удалось загрузить checkout"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [isAuth]);

  useEffect(() => {
    if (deliveryMethod === "PICKUP") {
      const selectedOption =
        DELIVERY_OPTIONS.find((option) => option.id === selectedAddressId) ?? null;

      if (selectedOption) {
        setDeliveryAddress(selectedOption.label);
      }
      return;
    }

    if (selectedAddressId) {
      setSelectedAddressId("");
    }
  }, [deliveryMethod, selectedAddressId]);

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

    const validationError = validateDeliveryDetails({
      deliveryMethod,
      selectedAddressId,
      deliveryAddress,
    });

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
    if (submitLockRef.current || submitting) return;

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

    submitLockRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const payload: CheckoutRequest = {
        cartId,
        recipientName: fullName.trim(),
        recipientPhone: phone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryMethod,
        comment: comment.trim() || undefined,
      };

      const checkoutResponse = await apiFetch(
        `${API_URL}/api/orders/checkout?cartId=${encodeURIComponent(cartId)}`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!checkoutResponse.ok) {
        const text = await checkoutResponse.text().catch(() => "");
        throw new Error(
          text || `Ошибка оформления заказа (${checkoutResponse.status})`
        );
      }

      const orders: OrderResponse[] = await checkoutResponse.json();

      if (!Array.isArray(orders) || orders.length === 0) {
        throw new Error("Backend не вернул созданные заказы");
      }

      const orderGroupId = orders[0]?.orderGroupId;

      if (!orderGroupId) {
        throw new Error("Не найден orderGroupId для оплаты");
      }

      const payResponse = await apiFetch(
        `${API_URL}/api/payments/group/${encodeURIComponent(orderGroupId)}`,
        {
          method: "POST",
        }
      );

      if (!payResponse.ok) {
        const text = await payResponse.text().catch(() => "");
        throw new Error(
          text || `Ошибка инициализации оплаты (${payResponse.status})`
        );
      }

      const payment: PaymentInitResponse = await payResponse.json();

      if (!payment.confirmationUrl) {
        throw new Error("Не пришла ссылка на оплату");
      }

      clearCheckoutDraft();
      emitCartChanged();
      window.location.href = payment.confirmationUrl;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Ошибка оформления заказа"
      );
    } finally {
      submitLockRef.current = false;
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
                deliveryMethod={deliveryMethod}
                selectedAddressId={selectedAddressId}
                deliveryAddress={deliveryAddress}
                comment={comment}
                confirmed={deliveryConfirmed}
                expanded={activeStep === "DELIVERY" || !deliveryConfirmed}
                enabled={contactConfirmed}
                onEdit={editDelivery}
                onConfirm={handleConfirmDelivery}
                onDeliveryMethodChange={setDeliveryMethod}
                onAddressChange={setSelectedAddressId}
                onDeliveryAddressChange={setDeliveryAddress}
                onCommentChange={setComment}
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
              checkoutReady={
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