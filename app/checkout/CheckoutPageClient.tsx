"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, API_URL } from "../lib/api";
import { ensureCartId } from "../lib/auth";
import { emitCartChanged } from "../lib/cartEvents";

import { CheckoutContactSection } from "./components/CheckoutContactSection";
import { CheckoutDeliverySection } from "./components/CheckoutDeliverySection";
import { CheckoutPaymentSection } from "./components/CheckoutPaymentSection";
import { CheckoutSummary } from "./components/CheckoutSummary";

import { toast } from "sonner";
import { Loader } from "../components/ui/Loader";

import type {
  CartItem,
  CheckoutRequest,
  CheckoutStep,
  DeliveryMethod,
  DeliveryOption,
  OrderResponse,
  PaymentInitResponse,
  PaymentMethod,
  PickupPointSearchResponse,
  DeliveryQuoteResponse,
  DeliveryCityOption,
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

type YandexSuggestItem = {
  value: string;
  displayName: string;
};

type YandexGeoObject = {
  geometry: {
    getCoordinates: () => [number, number];
  };
  getAddressLine: () => string;
};

type YandexGeocodeResult = {
  geoObjects: {
    get: (index: number) => YandexGeoObject | null;
  };
};

type YandexSuggestResponse =
  | YandexSuggestItem[]
  | {
      results?: YandexSuggestItem[];
    };

type YandexMapsSearchApi = {
  suggest: (
    request: string,
    options?: { results?: number }
  ) => Promise<YandexSuggestResponse>;
  geocode: (request: string) => Promise<YandexGeocodeResult>;
};

function getYmapsSearchApi(): YandexMapsSearchApi | null {
  if (typeof window === "undefined") return null;

  const maybeWindow = window as Window & {
    ymaps?: Partial<YandexMapsSearchApi>;
  };

  if (
    typeof maybeWindow.ymaps?.suggest !== "function" ||
    typeof maybeWindow.ymaps?.geocode !== "function"
  ) {
    return null;
  }

  return maybeWindow.ymaps as YandexMapsSearchApi;
}

function CheckoutPageContent() {
  const router = useRouter();

  const [cartId, setCartId] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const submitLockRef = useRef(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const checkoutSnapshotRef = useRef({
    email: "",
    fullName: "",
    phone: "",
    deliveryMethod: "PICKUP" as DeliveryMethod,
    selectedAddressId: "",
    deliveryAddress: "",
    comment: "",
  });

  const [contactConfirmed, setContactConfirmed] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [countryCode, setCountryCode] = useState<"RU" | "BY" | "KZ" | "AM">("RU");
  const [apartment, setApartment] = useState("");
  const [floor, setFloor] = useState("");
  const [intercom, setIntercom] = useState("");
  const [fittingMode, setFittingMode] =
    useState<"WITH_FITTING" | "WITHOUT_FITTING">("WITH_FITTING");

  const [otherRecipientEnabled, setOtherRecipientEnabled] = useState(false);
  const [otherRecipientName, setOtherRecipientName] = useState("");
  const [otherRecipientPhone, setOtherRecipientPhone] = useState("");

  const [activeStep, setActiveStep] =
    useState<CheckoutStep>("DELIVERY");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("COURIER");

  const [selectedAddressId, setSelectedAddressId] =
    useState("");

  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [cityOptions, setCityOptions] = useState<DeliveryCityOption[]>([]);
  const [selectedCity, setSelectedCity] =
    useState<DeliveryCityOption | null>(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityTouched, setCityTouched] = useState(false);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [deliveryQuoteToken, setDeliveryQuoteToken] = useState("");
  const [deliveryOfferId, setDeliveryOfferId] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [deliveryCurrency, setDeliveryCurrency] = useState("RUB");
  const [deliveryPeriodMinDays, setDeliveryPeriodMinDays] =
    useState<number | null>(null);

  const [_deliveryPeriodMaxDays, setDeliveryPeriodMaxDays] =
    useState<number | null>(null);

  const [addressOptions, setAddressOptions] = useState<
    { value: string; displayName: string }[]
  >([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLon, setAddressLon] = useState<number | null>(null);

  const [deliveryAddress, setDeliveryAddress] =
    useState("");

  const [comment, setComment] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("SBP");

  useEffect(() => {
    checkoutSnapshotRef.current = {
      email,
      fullName,
      phone,
      deliveryMethod,
      selectedAddressId,
      deliveryAddress,
      comment,
    };
  }, [
    email,
    fullName,
    phone,
    deliveryMethod,
    selectedAddressId,
    deliveryAddress,
    comment,
  ]);

  useEffect(() => {
    const draft = loadCheckoutDraft();

    if (draft) {
      setEmail(draft.email);
      setFullName(draft.fullName);
      setPhone(draft.phone);
      setDeliveryMethod(draft.deliveryMethod);
      setSelectedAddressId(draft.selectedAddressId);
      setDeliveryAddress(draft.deliveryAddress);
      setComment(draft.comment);
      setPaymentMethod(draft.paymentMethod);
      setCountryCode(draft.countryCode);
      setApartment(draft.apartment);
      setFloor(draft.floor);
      setIntercom(draft.intercom);
      setFittingMode(draft.fittingMode);
      setOtherRecipientEnabled(draft.otherRecipientEnabled);
      setOtherRecipientName(draft.otherRecipientName);
      setOtherRecipientPhone(draft.otherRecipientPhone);
    }

    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;

    saveCheckoutDraft({
      email,
      fullName,
      phone,
      deliveryMethod,
      selectedAddressId,
      deliveryAddress,
      countryCode,
      apartment,
      floor,
      intercom,
      fittingMode,
      otherRecipientEnabled,
      otherRecipientName,
      otherRecipientPhone,
      comment,
      paymentMethod,
    });
  }, [
    draftHydrated,
    email,
    fullName,
    phone,
    deliveryMethod,
    selectedAddressId,
    deliveryAddress,
    countryCode,
    apartment,
    floor,
    intercom,
    fittingMode,
    otherRecipientEnabled,
    otherRecipientName,
    otherRecipientPhone,
    comment,
    paymentMethod,
  ]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);

        const resolvedCartId = await ensureCartId();

        if (!active) return;

        setCartId(resolvedCartId);

        const [profileResponse, cartResponse] =
          await Promise.all([
            apiFetch(`${API_URL}/api/profile`),

            apiFetch(
              `${API_URL}/api/cart?cartId=${encodeURIComponent(
                resolvedCartId
              )}`
            ),
          ]);

        if (!active) return;

        let me: Me | null = null;

        if (profileResponse.ok) {
          me = (await profileResponse.json()) as Me;
        }

        const existing = checkoutSnapshotRef.current;

        const prefill = buildCheckoutPrefill({
          me,
          existing: {
            email: existing.email,
            fullName: existing.fullName,
            phone: existing.phone,
            deliveryMethod: existing.deliveryMethod,
            deliveryAddress: existing.deliveryAddress,
            comment: existing.comment,
          },
        });

        if (!existing.email.trim() && prefill.email) {
          setEmail(prefill.email);
        }

        if (!existing.fullName.trim() && prefill.fullName) {
          setFullName(prefill.fullName);
        }

        if (!existing.phone.trim() && prefill.phone) {
          setPhone(prefill.phone);
        }

        if (
          !existing.deliveryAddress.trim() &&
          prefill.deliveryAddress
        ) {
          setDeliveryAddress(prefill.deliveryAddress);
        }

        if (!existing.comment.trim() && prefill.comment) {
          setComment(prefill.comment);
        }

        if (
          !existing.deliveryAddress.trim() &&
          !existing.selectedAddressId
        ) {
          setDeliveryMethod(prefill.deliveryMethod);
        }

        if (!cartResponse.ok) {
          const text = await cartResponse.text().catch(() => "");

          throw new Error(
            text || "Не удалось загрузить корзину"
          );
        }

        const cartData: CartItem[] =
          await cartResponse.json();

        setItems(Array.isArray(cartData) ? cartData : []);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : "Не удалось загрузить checkout";

        setError(message);

        toast.error(message);
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
  }, []);

  useEffect(() => {
  if (!cityTouched) return;

  if (cityQuery.trim().length < 2) {
    setCityOptions([]);
    return;
  }

  const timeoutId = window.setTimeout(() => {
    void searchCities(cityQuery);
  }, 350);

  return () => window.clearTimeout(timeoutId);
}, [cityQuery, cityTouched]);

  useEffect(() => {
    if (deliveryMethod === "PICKUP") {
      const selectedOption =
        deliveryOptions.find((option) => option.id === selectedAddressId) ?? null;

      if (selectedOption) {
        setDeliveryAddress(selectedOption.label);
      }

      return;
    }

    if (selectedAddressId) {
      setSelectedAddressId("");
    }
  }, [deliveryMethod, selectedAddressId, deliveryOptions]);

  useEffect(() => {
  if (deliveryMethod !== "COURIER") return;

  const timeoutId = window.setTimeout(() => {
    void searchAddressSuggestions(deliveryAddress);
  }, 350);

  return () => window.clearTimeout(timeoutId);
}, [deliveryAddress, deliveryMethod, selectedCity]);

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [items]);

  const total = subtotal + deliveryPrice;

  const deliveryDateText = useMemo(() => {
  if (deliveryPeriodMinDays == null) return "";

  const date = new Date();
  date.setDate(date.getDate() + deliveryPeriodMinDays);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
  }, [deliveryPeriodMinDays]);

  function showError(message: string) {
    setError(message);

    toast.error(message);
  }

  function handleConfirmContact() {
    setError(null);

    const validationError =
      validateContactDetails({
        email,
        fullName,
        phone,
      });

    if (validationError) {
      showError(validationError);
      return;
    }

    setContactConfirmed(true);

    setActiveStep("DELIVERY");
  }

  async function searchPickupPoints() {
  if (!selectedCity) {
    showError("Выберите город из списка");
    return;
  }

  try {
    setPickupLoading(true);
    setError(null);

    const response = await apiFetch(`${API_URL}/api/delivery/pickup-points/search`, {
      method: "POST",
      body: JSON.stringify({
        location: selectedCity.fullName,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Не удалось загрузить пункты выдачи");
    }

      const data = (await response.json()) as PickupPointSearchResponse;

      const options: DeliveryOption[] = Array.isArray(data.points)
        ? data.points.map((point) => ({
          id: String(point.id),
          label: point.fullAddress || point.name || String(point.id),
          hint: point.instruction || point.type || undefined,
          latitude: point.latitude ?? null,
          longitude: point.longitude ?? null,
          cityCode: point.cityCode ?? null,
        }))
      : [];

    setDeliveryOptions(options);

    if (options.length === 0) {
      toast.message("ПВЗ не найдены");
    }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Не удалось загрузить пункты выдачи";

    showError(message);
  } finally {
    setPickupLoading(false);
  }
  }

  async function searchCities(query: string) {
  if (!query.trim()) {
    setCityOptions([]);
    return;
  }

  try {
    setCityLoading(true);
    setError(null);

    const response = await apiFetch(
      `${API_URL}/api/delivery/cities/search?query=${encodeURIComponent(
        query.trim()
      )}&countryCode=${countryCode}`
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Не удалось найти город");
    }

    const data = (await response.json()) as DeliveryCityOption[];

    setCityOptions(Array.isArray(data) ? data : []);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Не удалось найти город";

    showError(message);
  } finally {
    setCityLoading(false);
  }
  }

  useEffect(() => {
    let active = true;

    async function selectDefaultCity() {
      if (selectedCity || cityQuery.trim()) return;

      try {
        setCityLoading(true);

        const response = await apiFetch(
          `${API_URL}/api/delivery/cities/search?query=${encodeURIComponent(
            "Москва"
          )}&countryCode=RU`
        );

        if (!response.ok) return;

        const data = (await response.json()) as DeliveryCityOption[];

        const city = Array.isArray(data)
          ? data.find((item) => item.fullName === "Москва") ?? data[0] ?? null
          : null;

        if (!active || !city) return;

        setSelectedCity(city);
        setCityQuery(city.fullName);
        setCityOptions([]);
        setCityTouched(false);
      } finally {
        if (active) {
          setCityLoading(false);
        }
      }
    }

    void selectDefaultCity();

    return () => {
      active = false;
    };
  }, [selectedCity, cityQuery]);

  async function createDeliveryQuote() {
    const selectedPickupPoint =
      deliveryOptions.find((option) => option.id === selectedAddressId) ?? null;

    try {
      setQuoteLoading(true);
      setError(null);

      const response = await apiFetch(`${API_URL}/api/delivery/quotes`, {
        method: "POST",
        body: JSON.stringify({
          method: deliveryMethod === "PICKUP" ? "PICKUP_POINT" : "COURIER",
          recipientName: fullName.trim(),
          recipientPhone: phone.trim(),
          pickupPointId:
            deliveryMethod === "PICKUP" ? selectedAddressId : undefined,
          address:
            deliveryMethod === "PICKUP"
              ? {
                  fullText: selectedPickupPoint?.label ?? "",
                  cityCode:
                    selectedPickupPoint?.cityCode ??
                    selectedCity?.code ??
                    undefined,
                }
              : {
                  fullText: deliveryAddress.trim(),
                  cityCode: selectedCity?.code ?? undefined,
                  lat: addressLat ?? undefined,
                  lon: addressLon ?? undefined,
                },
          comment: comment.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось рассчитать доставку");
      }

      const quote = (await response.json()) as DeliveryQuoteResponse;

      setDeliveryQuoteToken(quote.quoteToken);
      setDeliveryOfferId(quote.externalOfferId || quote.quoteToken);
      setDeliveryPrice(Number(quote.priceAmount || 0));
      setDeliveryCurrency(quote.currency || "RUB");
      setDeliveryPeriodMinDays(quote.periodMinDays ?? null);
      setDeliveryPeriodMaxDays(quote.periodMaxDays ?? null);

      return true;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Не удалось рассчитать доставку";

      showError(message);
      return false;
    } finally {
      setQuoteLoading(false);
    }
  }

  async function handleConfirmDelivery() {
    setError(null);

    const validationError =
      validateDeliveryDetails({
        deliveryMethod,
        selectedAddressId,
        deliveryAddress,
      });

    if (validationError) {
      showError(validationError);
      return;
    }

    const quoted = await createDeliveryQuote();

    if (!quoted) return;

    setDeliveryConfirmed(true);
    setActiveStep("CONTACT");
  }

  async function selectAddressSuggestion(value: string) {
    const ymaps = getYmapsSearchApi();

    setDeliveryAddress(value);
    setAddressOptions([]);
    setAddressLat(null);
    setAddressLon(null);
    setDeliveryConfirmed(false);
    setPaymentConfirmed(false);

    if (!ymaps) return;

    const result = await ymaps.geocode(value);
    const geoObject = result.geoObjects.get(0);

    if (!geoObject) return;

    const [lat, lon] = geoObject.geometry.getCoordinates();
    const fullAddress = geoObject.getAddressLine();

    setDeliveryAddress(fullAddress || value);
    setAddressLat(lat);
    setAddressLon(lon);
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

  async function searchAddressSuggestions(query: string) {
    if (!selectedCity || query.trim().length < 3) {
      setAddressOptions([]);
      return;
    }

    try {
      setAddressLoading(true);

      const response = await apiFetch(
        `${API_URL}/api/delivery/address/search?query=${encodeURIComponent(
          `${selectedCity.fullName}, ${query.trim()}`
        )}`
      );

      if (!response.ok) {
        setAddressOptions([]);
        return;
      }

      const data = (await response.json()) as {
        value: string;
        displayName: string;
        lat: number | null;
        lon: number | null;
      }[];

      setAddressOptions(
        Array.isArray(data)
          ? data.map((item) => ({
              value: item.value,
              displayName: item.displayName || item.value,
            }))
          : []
      );
    } finally {
      setAddressLoading(false);
    }
  }

  async function submitOrder() {
    if (submitLockRef.current || submitting) return;

    if (!cartId || items.length === 0) return;

    if (!deliveryConfirmed || !contactConfirmed || !paymentConfirmed) {
      showError("Подтвердите все этапы оформления заказа");
      return;
    }

    const actualRecipientName = otherRecipientEnabled
      ? otherRecipientName.trim()
      : fullName.trim();

    const actualRecipientPhone = otherRecipientEnabled
      ? otherRecipientPhone.trim()
      : phone.trim();

    if (otherRecipientEnabled) {
      if (!actualRecipientName) {
        showError("Введите ФИО получателя");
        return;
      }

      if (!actualRecipientPhone) {
        showError("Введите телефон получателя");
        return;
      }
    }

    const addressDetails =
      deliveryMethod === "COURIER"
        ? [
            deliveryAddress.trim(),
            apartment.trim() ? `кв. ${apartment.trim()}` : "",
            floor.trim() ? `этаж ${floor.trim()}` : "",
            intercom.trim() ? `домофон ${intercom.trim()}` : "",
          ]
            .filter(Boolean)
            .join(", ")
        : deliveryAddress.trim();

    submitLockRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const payload: CheckoutRequest = {
        cartId,
        recipientName: actualRecipientName,
        recipientPhone: actualRecipientPhone,
        recipientEmail: email.trim(),
        deliveryAddress: addressDetails,
        deliveryMethod:
          deliveryMethod === "PICKUP" ? "PICKUP_POINT" : "COURIER",
        pickupPointId:
          deliveryMethod === "PICKUP"
            ? selectedAddressId || undefined
            : undefined,
        deliveryOfferId: deliveryOfferId || deliveryQuoteToken || undefined,
        deliveryPriceAmount: deliveryPrice,
        deliveryCurrency,
        comment:
          [
            comment.trim(),
            fittingMode === "WITH_FITTING" ? "С примеркой" : "Без примерки",
            otherRecipientEnabled
              ? `Заберет другой человек: ${actualRecipientName}, ${actualRecipientPhone}`
              : "",
          ]
            .filter(Boolean)
            .join(". ") || undefined,
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

      toast.success("Переходим к оплате");

      window.location.href = payment.confirmationUrl;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Ошибка оформления заказа";

      setError(message);
      toast.error(message);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="pageContainer">
        <Loader
          fullPage
          label="Загружаем оформление"
        />
      </div>
    );
  }

  if (!cartId) {
    return (
      <div className="pageContainer">
        <div className={styles.page}>
          Нет cartId
        </div>
      </div>
    );
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Оформление заказа
          </h1>
        </div>

        {items.length === 0 ? (
          <div className="emptyState">
            <h2 className="emptyStateTitle">
              Корзина пуста
            </h2>

            <p className="emptyStateText">
              Добавьте товары, чтобы перейти к
              оформлению заказа
            </p>

            <div className="emptyStateActions">
              <button
                type="button"
                className="buttonPrimary"
                onClick={() =>
                  router.push("/catalog")
                }
              >
                Перейти в каталог
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.layout}>
            <div className={styles.main}>
                            <CheckoutDeliverySection
                options={deliveryOptions}
                deliveryPrice={deliveryPrice}
                pickupLoading={pickupLoading}
                quoteLoading={quoteLoading}
                onPickupSearch={searchPickupPoints}
                countryCode={countryCode}
                deliveryMethod={deliveryMethod}
                selectedAddressId={selectedAddressId}
                deliveryAddress={deliveryAddress}
                apartment={apartment}
                floor={floor}
                intercom={intercom}
                fittingMode={fittingMode}
                cityQuery={cityQuery}
                cityOptions={cityOptions}
                addressOptions={addressOptions}
                addressLoading={addressLoading}
                deliveryDateText={deliveryDateText}
                onAddressSelect={(value) => {
                  void selectAddressSuggestion(value);
                }}
                selectedCity={selectedCity}
                cityLoading={cityLoading}
                onCountryChange={(value) => {
                  setCountryCode(value);
                  setSelectedCity(null);
                  setCityQuery("");
                  setCityOptions([]);
                  setDeliveryOptions([]);
                  setSelectedAddressId("");
                  setDeliveryAddress("");
                  setDeliveryPrice(0);
                  setDeliveryCurrency("RUB");
                  setDeliveryQuoteToken("");
                  setDeliveryOfferId("");
                  setDeliveryPeriodMinDays(null);
                  setDeliveryPeriodMaxDays(null);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onCityQueryChange={(value) => {
                  setCityTouched(true);
                  setCityQuery(value);

                  if (selectedCity && value !== selectedCity.fullName) {
                    setSelectedCity(null);
                    setDeliveryOptions([]);
                    setSelectedAddressId("");
                    setDeliveryAddress("");
                    setDeliveryPrice(0);
                    setDeliveryCurrency("RUB");
                    setDeliveryQuoteToken("");
                    setDeliveryOfferId("");
                    setDeliveryPeriodMinDays(null);
                    setDeliveryPeriodMaxDays(null);
                    setDeliveryConfirmed(false);
                    setPaymentConfirmed(false);
                  }
                }}
                onCitySelect={(city) => {
                  setSelectedCity(city);
                  setCityQuery(city.fullName);
                  setCityOptions([]);
                  setCityTouched(false);
                  setDeliveryOptions([]);
                  setSelectedAddressId("");
                  setDeliveryAddress("");
                  setDeliveryPrice(0);
                  setDeliveryCurrency("RUB");
                  setDeliveryQuoteToken("");
                  setDeliveryOfferId("");
                  setDeliveryPeriodMinDays(null);
                  setDeliveryPeriodMaxDays(null);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                comment={comment}
                confirmed={deliveryConfirmed}
                expanded={activeStep === "DELIVERY" || !deliveryConfirmed}
                enabled={true}
                onEdit={editDelivery}
                onConfirm={handleConfirmDelivery}
                onDeliveryMethodChange={(value) => {
                  setDeliveryMethod(value);
                  setSelectedAddressId("");
                  setDeliveryAddress("");
                  setDeliveryOptions([]);
                  setDeliveryPrice(0);
                  setDeliveryCurrency("RUB");
                  setDeliveryQuoteToken("");
                  setDeliveryOfferId("");
                  setDeliveryPeriodMinDays(null);
                  setDeliveryPeriodMaxDays(null);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onAddressChange={(value) => {
                  setSelectedAddressId(value);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onDeliveryAddressChange={(value) => {
                  setDeliveryAddress(value);
                  setAddressLat(null);
                  setAddressLon(null);
                  setDeliveryPrice(0);
                  setDeliveryCurrency("RUB");
                  setDeliveryQuoteToken("");
                  setDeliveryOfferId("");
                  setDeliveryPeriodMinDays(null);
                  setDeliveryPeriodMaxDays(null);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onApartmentChange={(value) => {
                  setApartment(value);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onFloorChange={(value) => {
                  setFloor(value);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onIntercomChange={(value) => {
                  setIntercom(value);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onFittingModeChange={(value) => {
                  setFittingMode(value);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onCommentChange={setComment}
              />

              <CheckoutContactSection
                email={email}
                fullName={fullName}
                phone={phone}
                otherRecipientEnabled={otherRecipientEnabled}
                otherRecipientName={otherRecipientName}
                otherRecipientPhone={otherRecipientPhone}
                confirmed={contactConfirmed}
                expanded={activeStep === "CONTACT" || !contactConfirmed}
                onEdit={editContact}
                onConfirm={handleConfirmContact}
                onEmailChange={(value) => {
                  setEmail(value);
                  setContactConfirmed(false);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onFullNameChange={(value) => {
                  setFullName(value);
                  setContactConfirmed(false);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onPhoneChange={(value) => {
                  setPhone(value);
                  setContactConfirmed(false);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onOtherRecipientEnabledChange={(value) => {
                  setOtherRecipientEnabled(value);
                  setContactConfirmed(false);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onOtherRecipientNameChange={(value) => {
                  setOtherRecipientName(value);
                  setContactConfirmed(false);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
                onOtherRecipientPhoneChange={(value) => {
                  setOtherRecipientPhone(value);
                  setContactConfirmed(false);
                  setDeliveryConfirmed(false);
                  setPaymentConfirmed(false);
                }}
              />



              <CheckoutPaymentSection
                paymentMethod={paymentMethod}
                confirmed={paymentConfirmed}
                expanded={
                  activeStep === "PAYMENT" ||
                  !paymentConfirmed
                }
                enabled={
                  contactConfirmed &&
                  deliveryConfirmed
                }
                onEdit={editPayment}
                onConfirm={
                  handleConfirmPayment
                }
                onPaymentMethodChange={(value) => {
                  setPaymentMethod(value);
                  setPaymentConfirmed(false);
                }}
              />

              {error ? (
                <div className={styles.error}>
                  {error}
                </div>
              ) : null}
            </div>

            <CheckoutSummary
              items={items}
              subtotal={subtotal}
              deliveryPrice={deliveryPrice}
              total={total}
              submitting={submitting}
              checkoutReady={
                contactConfirmed &&
                deliveryConfirmed &&
                paymentConfirmed
              }
              onSubmit={submitOrder}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function CheckoutPageClient() {
  return <CheckoutPageContent />;
}