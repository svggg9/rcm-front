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
import {
  getDeliveryOffers,
  searchPickupPoints,
} from "./lib/deliveryApi";

import type {
  CartItem,
  CheckoutRequest,
  CheckoutStep,
  DeliveryMethod,
  DeliveryOffer,
  OrderResponse,
  PaymentInitResponse,
  PaymentMethod,
  PickupPoint,
} from "./types";

import styles from "./Checkout.module.css";

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
    useState<DeliveryMethod>("PICKUP_POINT");

  const [pickupSearchQuery, setPickupSearchQuery] = useState("");
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedPickupPoint, setSelectedPickupPoint] =
    useState<PickupPoint | null>(null);

  const [deliveryOffers, setDeliveryOffers] = useState<DeliveryOffer[]>([]);
  const [selectedOffer, setSelectedOffer] =
    useState<DeliveryOffer | null>(null);

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [comment, setComment] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("SBP");

  const [pickupSearchLoading, setPickupSearchLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [pickupSearchError, setPickupSearchError] = useState<string | null>(
    null
  );
  const [offersError, setOffersError] = useState<string | null>(null);

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
    setPickupSearchQuery(draft.pickupSearchQuery);
    setSelectedPickupPoint(draft.selectedPickupPoint);
    setSelectedOffer(draft.selectedOffer);
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
      pickupSearchQuery,
      selectedPickupPoint,
      selectedOffer,
      deliveryAddress,
      comment,
      paymentMethod,
    });
  }, [
    email,
    fullName,
    phone,
    deliveryMethod,
    pickupSearchQuery,
    selectedPickupPoint,
    selectedOffer,
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

        setDeliveryMethod((current) =>
          current ? current : prefill.deliveryMethod
        );

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
    if (deliveryMethod !== "PICKUP_POINT") {
      setPickupPoints([]);
      setSelectedPickupPoint(null);
      setDeliveryOffers([]);
      setSelectedOffer(null);
      setPickupSearchError(null);
      setOffersError(null);
    }
  }, [deliveryMethod]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const deliveryPrice = selectedOffer?.pricingTotalAmount ?? 0;
  const total = subtotal + deliveryPrice;

  async function handleSearchPickupPoints() {
    if (!pickupSearchQuery.trim()) return;

    try {
      setPickupSearchLoading(true);
      setPickupSearchError(null);
      setOffersError(null);
      setPickupPoints([]);
      setSelectedPickupPoint(null);
      setDeliveryOffers([]);
      setSelectedOffer(null);

      const result = await searchPickupPoints({
        location: pickupSearchQuery.trim(),
      });

      setPickupPoints(result.points || []);
    } catch (e) {
      setPickupSearchError(
        e instanceof Error ? e.message : "Ошибка поиска ПВЗ"
      );
    } finally {
      setPickupSearchLoading(false);
    }
  }

  async function handlePickupPointSelect(point: PickupPoint) {
    setSelectedPickupPoint(point);
    setSelectedOffer(null);
    setDeliveryOffers([]);
    setOffersError(null);

    try {
      setOffersLoading(true);

      const result = await getDeliveryOffers({
        pickupPointId: point.id,
        recipientName: fullName.trim(),
        recipientPhone: phone.trim(),
        recipientEmail: email.trim() || undefined,
        comment: comment.trim() || undefined,
      });

      setDeliveryOffers(result.offers || []);
      setDeliveryAddress(point.fullAddress || "");
    } catch (e) {
      setOffersError(
        e instanceof Error ? e.message : "Ошибка получения вариантов доставки"
      );
    } finally {
      setOffersLoading(false);
    }
  }

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
      selectedPickupPoint,
      selectedOffer,
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
        recipientEmail: email.trim() || undefined,
        deliveryAddress:
          deliveryMethod === "PICKUP_POINT"
            ? selectedPickupPoint?.fullAddress || deliveryAddress.trim()
            : deliveryAddress.trim(),
        deliveryMethod,
        pickupPointId:
          deliveryMethod === "PICKUP_POINT"
            ? selectedPickupPoint?.id || undefined
            : undefined,
        deliveryOfferId:
          deliveryMethod === "PICKUP_POINT"
            ? selectedOffer?.offerId || undefined
            : undefined,
        deliveryPriceAmount:
          deliveryMethod === "PICKUP_POINT"
            ? selectedOffer?.pricingTotalAmount ?? undefined
            : undefined,
        deliveryCurrency:
          deliveryMethod === "PICKUP_POINT"
            ? selectedOffer?.pricingTotalCurrency ?? "RUB"
            : undefined,
        comment: comment.trim() || undefined,
      };

      const checkoutResponse = await apiFetch(`${API_URL}/api/orders/checkout`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

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

      if (deliveryMethod === "PICKUP_POINT") {
        if (!selectedPickupPoint) {
          throw new Error("Не выбран пункт выдачи");
        }

        if (!selectedOffer) {
          throw new Error("Не выбран вариант доставки");
        }

        if (typeof selectedOffer.pricingTotalAmount !== "number") {
          throw new Error("Не определена стоимость доставки");
        }
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
      setError(e instanceof Error ? e.message : "Ошибка оформления заказа");
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
                deliveryMethod={deliveryMethod}
                pickupSearchQuery={pickupSearchQuery}
                pickupPoints={pickupPoints}
                selectedPickupPoint={selectedPickupPoint}
                deliveryOffers={deliveryOffers}
                selectedOffer={selectedOffer}
                pickupSearchLoading={pickupSearchLoading}
                offersLoading={offersLoading}
                pickupSearchError={pickupSearchError}
                offersError={offersError}
                deliveryAddress={deliveryAddress}
                comment={comment}
                confirmed={deliveryConfirmed}
                expanded={activeStep === "DELIVERY" || !deliveryConfirmed}
                enabled={contactConfirmed}
                onEdit={editDelivery}
                onConfirm={handleConfirmDelivery}
                onDeliveryMethodChange={setDeliveryMethod}
                onPickupSearchQueryChange={setPickupSearchQuery}
                onSearchPickupPoints={handleSearchPickupPoints}
                onPickupPointSelect={handlePickupPointSelect}
                onOfferSelect={setSelectedOffer}
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
              deliveryMethod={deliveryMethod}
              selectedPickupPoint={selectedPickupPoint}
              selectedOffer={selectedOffer}
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