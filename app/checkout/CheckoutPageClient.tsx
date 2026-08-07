"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, API_URL } from "../lib/api";
import { rememberUserCartId } from "../lib/auth";
import { loadResolvedCart } from "../lib/cartAuthority";
import { emitCartChanged } from "../lib/cartEvents";

import { CheckoutContactSection } from "./components/CheckoutContactSection";
import { CheckoutDeliverySection } from "./components/CheckoutDeliverySection";
import { CheckoutSummary } from "./components/CheckoutSummary";

import { toast } from "sonner";
import { Loader } from "../components/ui/Loader";
import { EmptyState } from "../components/ui/EmptyState";

import type {
  CartItem,
  CheckoutCartBootstrap,
  CheckoutRequest,
  CountryCode,
  DeliveryMethod,
  DeliveryOption,
  FittingMode,
  OrderResponse,
  PaymentInitResponse,
  PaymentMethod,
  PickupPointSearchResponse,
  SellerDeliveryCost,
  SellerGroupDeliveryQuoteResponse,
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

type ApiErrorResponse = {
  message?: string;
};

async function readCheckoutError(
  response: Response,
  fallback: string
): Promise<string> {
  const text = await response.text().catch(() => "");

  if (!text) {
    return fallback;
  }

  try {
    const data = JSON.parse(text) as ApiErrorResponse;

    if (data.message === "order_amount_limit_exceeded") {
      return "Сумма заказа превышает текущий лимит оплаты 50 000 ₽. Уберите часть товаров из корзины или оформите несколько заказов.";
    }

    return data.message || fallback;
  } catch {
    return text || fallback;
  }
}

const PENDING_PAYMENT_ORDER_KEY = "checkout_pending_payment_order_v1";
const DELIVERY_QUOTE_SAFETY_MARGIN_MS = 30_000;

function shouldRefreshDeliveryQuote(expiresAt: string): boolean {
  const expiresAtMs = Date.parse(expiresAt);
  return !Number.isFinite(expiresAtMs) ||
    expiresAtMs <= Date.now() + DELIVERY_QUOTE_SAFETY_MARGIN_MS;
}

function isRetryableDeliveryQuoteConflict(status: number, message: string): boolean {
  return status === 409 && /delivery_quote_(expired|stale|invalid)/i.test(message);
}

function getPendingPaymentOrderKey(cartId: string): string {
  return `${PENDING_PAYMENT_ORDER_KEY}:${cartId}`;
}

function loadPendingPaymentOrderId(cartId: string): number | null {
  if (typeof window === "undefined" || !cartId) return null;

  const raw = sessionStorage.getItem(getPendingPaymentOrderKey(cartId));
  const id = raw ? Number(raw) : NaN;

  return Number.isFinite(id) && id > 0 ? id : null;
}

function savePendingPaymentOrderId(cartId: string, orderId: number): void {
  if (typeof window === "undefined" || !cartId) return;

  sessionStorage.setItem(getPendingPaymentOrderKey(cartId), String(orderId));
}

function clearPendingPaymentOrderId(cartId: string): void {
  if (typeof window === "undefined" || !cartId) return;

  sessionStorage.removeItem(getPendingPaymentOrderKey(cartId));
}
function formatCityDisplayName(fullName: string): string {
  const cityName = fullName.split(",")[0]?.trim() ?? "";

  return fullName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== "Россия")
    .filter((part) => part !== `городской округ ${cityName}`)
    .filter((part) => part !== `муниципальный округ ${cityName}`)
    .join(", ");
}

async function loadCheckoutCartFallback(): Promise<CheckoutCartBootstrap> {
  return loadResolvedCart();
}

type CheckoutPageProps = {
  initialMe: Me | null;
  initialCart: CheckoutCartBootstrap | null;
};

function CheckoutPageContent({ initialMe, initialCart }: CheckoutPageProps) {
  const router = useRouter();

  const [cartId, setCartId] = useState(initialCart?.cartId ?? "");
  const [items, setItems] = useState<CartItem[]>(initialCart?.items ?? []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const submitLockRef = useRef(false);
  const defaultCitySelectedRef = useRef(false);
  const quoteRequestKeyRef = useRef("");
  const citySearchRequestRef = useRef(0);
  const pickupSearchRequestRef = useRef(0);
  const quoteControllerRef = useRef<AbortController | null>(null);
  const searchCitiesRef = useRef<(query: string) => Promise<void>>(async () => {});
  const createDeliveryQuoteRef = useRef<
    (options?: { silent?: boolean }) => Promise<SellerGroupDeliveryQuoteResponse | null>
  >(async () => null);

  useEffect(() => {
    return () => {
      citySearchRequestRef.current += 1;
      pickupSearchRequestRef.current += 1;
      quoteControllerRef.current?.abort();
    };
  }, []);

  const [draftHydrated, setDraftHydrated] = useState(false);

  const checkoutSnapshotRef = useRef({
    email: "",
    fullName: "",
    phone: "",
    deliveryMethod: "PICKUP" as DeliveryMethod,
    selectedAddressId: "",
    selectedPickupPointLabel: "",
    deliveryAddress: "",
    countryCode: "RU" as CountryCode,
    selectedCity: null as DeliveryCityOption | null,
    apartment: "",
    floor: "",
    intercom: "",
    fittingMode: "WITHOUT_FITTING" as FittingMode,
    comment: "",
  });

  const [countryCode, setCountryCode] = useState<CountryCode>("RU");
  const [apartment, setApartment] = useState("");
  const [floor, setFloor] = useState("");
  const [intercom, setIntercom] = useState("");
  const [fittingMode, setFittingMode] =
    useState<FittingMode>("WITHOUT_FITTING");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("PICKUP");

  const [selectedAddressId, setSelectedAddressId] =
    useState("");

  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [cityOptions, setCityOptions] = useState<DeliveryCityOption[]>([]);
  const [selectedCity, setSelectedCity] =
    useState<DeliveryCityOption | null>(null);
  const [, setCityLoading] = useState(false);
  const [cityTouched, setCityTouched] = useState(false);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quotePending, setQuotePending] = useState(false);
  const [deliveryQuoteToken, setDeliveryQuoteToken] = useState("");
  const [checkoutToken, setCheckoutToken] = useState("");
  const [checkoutTokenExpiresAt, setCheckoutTokenExpiresAt] = useState("");
  const [deliveryOfferId, setDeliveryOfferId] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [deliveryCurrency, setDeliveryCurrency] = useState("RUB");
  const [sellerDeliveryCosts, setSellerDeliveryCosts] = useState<
    SellerDeliveryCost[]
  >([]);
  const [deliveryPeriodMinDays, setDeliveryPeriodMinDays] =
    useState<number | null>(null);

  const [, setDeliveryPeriodMaxDays] =
    useState<number | null>(null);

  const [deliveryAddress, setDeliveryAddress] =
    useState("");

  const [comment, setComment] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CARD");

  const selectedPickupPoint = useMemo(
    () => deliveryOptions.find((option) => option.id === selectedAddressId) ?? null,
    [deliveryOptions, selectedAddressId]
  );

  useEffect(() => {
    checkoutSnapshotRef.current = {
      email,
      fullName,
      phone,
      deliveryMethod,
      selectedAddressId,
      selectedPickupPointLabel: selectedPickupPoint?.label ?? "",
      deliveryAddress,
      countryCode,
      selectedCity,
      apartment,
      floor,
      intercom,
      fittingMode,
      comment,
    };
  }, [
    email,
    fullName,
    phone,
    deliveryMethod,
    selectedAddressId,
    selectedPickupPoint,
    deliveryAddress,
    countryCode,
    selectedCity,
    apartment,
    floor,
    intercom,
    fittingMode,
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
      if (draft.selectedCityCode && draft.selectedCityName) {
        const draftCity: DeliveryCityOption = {
          code: draft.selectedCityCode,
          cityUuid: String(draft.selectedCityCode),
          fullName: draft.selectedCityName,
          countryCode: draft.countryCode,
        };

        setSelectedCity(draftCity);
        setCityQuery(formatCityDisplayName(draftCity.fullName));
      }
      setApartment(draft.apartment);
      setFloor(draft.floor);
      setIntercom(draft.intercom);
      setFittingMode(draft.fittingMode);
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
      selectedPickupPointLabel: selectedPickupPoint?.label ?? "",
      deliveryAddress,
      countryCode,
      selectedCityCode: selectedCity?.code ?? null,
      selectedCityName: selectedCity?.fullName ?? "",
      apartment,
      floor,
      intercom,
      fittingMode,
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
    selectedPickupPoint,
    deliveryAddress,
    countryCode,
    selectedCity,
    apartment,
    floor,
    intercom,
    fittingMode,
    comment,
    paymentMethod,
  ]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);

        const profilePromise = initialMe
          ? Promise.resolve(initialMe)
          : apiFetch(`${API_URL}/api/profile`)
              .then(async (response) =>
                response.ok ? ((await response.json()) as Me) : null
              )
              .catch(() => null);
        const cartPromise = initialCart
          ? Promise.resolve(initialCart)
          : loadCheckoutCartFallback();
        const [resolvedMe, resolvedCart] = await Promise.all([
          profilePromise,
          cartPromise,
        ]);

        if (!active) return;

        setCartId(resolvedCart.cartId);
        setItems(resolvedCart.items);
        if (resolvedCart.cartId.startsWith("user_")) {
          rememberUserCartId(resolvedCart.cartId);
        }

        const existing = checkoutSnapshotRef.current;

        const prefill = buildCheckoutPrefill({
          me: resolvedMe,
          existing: {
            email: existing.email,
            fullName: existing.fullName,
            phone: existing.phone,
            deliveryMethod: existing.deliveryMethod,
            deliveryAddress: existing.deliveryAddress,
            countryCode: existing.countryCode,
            selectedCity: existing.selectedCity,
            selectedAddressId: existing.selectedAddressId,
            pickupPointLabel: existing.selectedPickupPointLabel,
            apartment: existing.apartment,
            floor: existing.floor,
            intercom: existing.intercom,
            fittingMode: existing.fittingMode,
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

        setCountryCode(prefill.countryCode);

        if (!existing.selectedCity && prefill.selectedCity) {
          setSelectedCity(prefill.selectedCity);
          setCityQuery(formatCityDisplayName(prefill.selectedCity.fullName));
          setCityOptions([]);
        }

        if (!existing.apartment.trim() && prefill.apartment) {
          setApartment(prefill.apartment);
        }

        if (!existing.floor.trim() && prefill.floor) {
          setFloor(prefill.floor);
        }

        if (!existing.intercom.trim() && prefill.intercom) {
          setIntercom(prefill.intercom);
        }

        setFittingMode(prefill.fittingMode);

        if (
          !existing.deliveryAddress.trim() &&
          !existing.selectedAddressId
        ) {
          setDeliveryMethod(prefill.deliveryMethod);
        }

        if (!resolvedCart.cartId) {
          const text = "";

          throw new Error(
            text || "Не удалось загрузить корзину"
          );
        }

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
  }, [initialCart, initialMe]);

  useEffect(() => {
  if (!cityTouched) return;

  if (cityQuery.trim().length < 2) {
    citySearchRequestRef.current += 1;
    setCityLoading(false);
    setCityOptions([]);
    return;
  }

  const timeoutId = window.setTimeout(() => {
    void searchCitiesRef.current(cityQuery);
  }, 350);

  return () => window.clearTimeout(timeoutId);
}, [cityQuery, cityTouched]);

  useEffect(() => {
    pickupSearchRequestRef.current += 1;
    setPickupLoading(false);
  }, [selectedCity?.code]);

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [items]);

  const cartFingerprint = useMemo(
    () =>
      items
        .map((item) => `${item.variantId}:${item.quantity}`)
        .sort()
        .join("|"),
    [items]
  );

  const deliveryCalculated = Boolean(
    deliveryQuoteToken && deliveryOfferId && checkoutToken
  );
  const deliveryCalculating = quoteLoading || quotePending;
  const submitDisabled =
    submitting ||
    deliveryCalculating ||
    !deliveryCalculated ||
    !selectedCity ||
    !selectedPickupPoint ||
    items.length === 0;
  const total = subtotal + (deliveryCalculated ? deliveryPrice : 0);

  const deliveryDateText = useMemo(() => {
    if (deliveryPeriodMinDays == null) return "";

    const date = new Date();
    date.setDate(date.getDate() + deliveryPeriodMinDays);

    const formatted = new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    }).format(date);

    return `${formatted} или позже`;
  }, [deliveryPeriodMinDays]);

  function showError(message: string) {
    setError(message);

    toast.error(message);
  }

  function resetDeliveryQuote() {
    quoteControllerRef.current?.abort();
    quoteControllerRef.current = null;
    quoteRequestKeyRef.current = "";
    setQuoteLoading(false);
    setQuotePending(false);
    setDeliveryPrice(0);
    setDeliveryCurrency("RUB");
    setSellerDeliveryCosts([]);
    setDeliveryQuoteToken("");
    setCheckoutToken("");
    setCheckoutTokenExpiresAt("");
    setDeliveryOfferId("");
    setDeliveryPeriodMinDays(null);
    setDeliveryPeriodMaxDays(null);
  }

  async function searchPickupPoints() {
  if (!selectedCity) {
    showError("Выберите город из списка");
    return;
  }

  const requestId = ++pickupSearchRequestRef.current;
  try {
    setPickupLoading(true);
    setError(null);

    const response = await apiFetch(`${API_URL}/api/delivery/pickup-points/search`, {
      method: "POST",
      body: JSON.stringify({
        location: selectedCity.fullName,
        cityCode: selectedCity.code,
      }),
    });

    if (!response.ok) {
      throw new Error(
        await readCheckoutError(response, "Не удалось загрузить пункты выдачи")
      );
    }

      const data = (await response.json()) as PickupPointSearchResponse;
      if (requestId !== pickupSearchRequestRef.current) return;

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

    const sameCityOptions = selectedCity.code
      ? options.filter((option) => option.cityCode === selectedCity.code)
      : options;

    setDeliveryOptions(sameCityOptions);

    if (sameCityOptions.length === 0) {
      toast.message("ПВЗ не найдены");
    }
  } catch (e) {
    if (requestId !== pickupSearchRequestRef.current) return;
    const message =
      e instanceof Error ? e.message : "Не удалось загрузить пункты выдачи";

    showError(message);
  } finally {
    if (requestId === pickupSearchRequestRef.current) setPickupLoading(false);
  }
  }

  async function searchCities(query: string) {
  const requestId = ++citySearchRequestRef.current;
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
      throw new Error(await readCheckoutError(response, "Не удалось найти город"));
    }

    const data = (await response.json()) as DeliveryCityOption[];
    if (requestId !== citySearchRequestRef.current) return;

    setCityOptions(Array.isArray(data) ? data : []);
  } catch (e) {
    if (requestId !== citySearchRequestRef.current) return;
    const message =
      e instanceof Error ? e.message : "Не удалось найти город";

    showError(message);
  } finally {
    if (requestId === citySearchRequestRef.current) setCityLoading(false);
  }
  }

  useEffect(() => {
    let active = true;

    async function selectDefaultCity() {
      if (!draftHydrated) return;
      if (loading) return;
      if (defaultCitySelectedRef.current) return;
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

        defaultCitySelectedRef.current = true;

        setSelectedCity(city);
        setCityQuery(formatCityDisplayName(city.fullName));
        setCityOptions([]);
        setCityTouched(false);
      } catch {
        defaultCitySelectedRef.current = false;
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
  }, [draftHydrated, loading, selectedCity, cityQuery]);

  async function createDeliveryQuote(options?: {
    silent?: boolean;
  }): Promise<SellerGroupDeliveryQuoteResponse | null> {
    if (cartId && loadPendingPaymentOrderId(cartId)) {
      return null;
    }

    if (!selectedCity || !selectedPickupPoint) {
      return null;
    }

    const controller = new AbortController();
    quoteControllerRef.current?.abort();
    quoteControllerRef.current = controller;

    try {
      setQuoteLoading(true);
      setError(null);

      const quotePayload = {
        method: "PICKUP_POINT",
        recipientName: fullName.trim(),
        recipientPhone: phone.trim(),
        fittingMode: "WITHOUT_FITTING",
        pickupPointId: selectedAddressId,
        address: {
          fullText:
            selectedPickupPoint?.label ?? selectedCity?.fullName ?? "",
          cityCode:
            selectedPickupPoint?.cityCode ?? selectedCity?.code ?? undefined,
        },
        comment: comment.trim() || undefined,
      };

      const response = await apiFetch(`${API_URL}/api/delivery/seller-group-quotes`, {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          cartId,
          quote: quotePayload,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readCheckoutError(response, "Не удалось рассчитать доставку")
        );
      }

      const quote = (await response.json()) as SellerGroupDeliveryQuoteResponse;
      if (quoteControllerRef.current !== controller) return null;
      if (!quote.checkoutToken) {
        throw new Error("Сервис доставки не вернул токен оформления");
      }

      setDeliveryQuoteToken(quote.quoteToken);
      setCheckoutToken(quote.checkoutToken);
      setCheckoutTokenExpiresAt(quote.expiresAt);
      setDeliveryOfferId(quote.externalOfferId || quote.quoteToken);
      setDeliveryPrice(Number(quote.priceAmount || 0));
      setDeliveryCurrency(quote.currency || "RUB");
      setSellerDeliveryCosts(
        Array.isArray(quote.sellerDeliveryCosts)
          ? quote.sellerDeliveryCosts
          : []
      );
      setDeliveryPeriodMinDays(quote.periodMinDays ?? null);
      setDeliveryPeriodMaxDays(quote.periodMaxDays ?? null);

      return quote;
    } catch (e) {
      if (controller.signal.aborted || quoteControllerRef.current !== controller) {
        return null;
      }
      const message =
        e instanceof Error ? e.message : "Не удалось рассчитать доставку";
      resetDeliveryQuote();
      setError(message);
      if (!options?.silent) {
        toast.error(message);
      }
      return null;
    } finally {
      if (quoteControllerRef.current === controller) {
        quoteControllerRef.current = null;
        setQuoteLoading(false);
      }
    }
  }

  searchCitiesRef.current = searchCities;
  createDeliveryQuoteRef.current = createDeliveryQuote;

  useEffect(() => {
    if (cartId && loadPendingPaymentOrderId(cartId)) {
      setQuotePending(false);
      return;
    }

    if (!selectedCity || !selectedPickupPoint || !cartFingerprint) {
      resetDeliveryQuote();
      return;
    }

    const requestKey = JSON.stringify({
      cartId,
      cart: cartFingerprint,
      method: deliveryMethod,
      cityCode: selectedCity.code,
      pickupPointId: selectedAddressId,
      fittingMode: "WITHOUT_FITTING",
    });

    if (quoteRequestKeyRef.current === requestKey) return;

    resetDeliveryQuote();
    quoteRequestKeyRef.current = requestKey;
    setQuotePending(true);

    const timeoutId = window.setTimeout(() => {
      void createDeliveryQuoteRef.current({ silent: true }).finally(() => {
        if (quoteRequestKeyRef.current === requestKey) {
          setQuotePending(false);
        }
      });
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    cartId,
    selectedCity,
    cartFingerprint,
    deliveryMethod,
    selectedAddressId,
    selectedPickupPoint,
    deliveryOptions,
  ]);

  async function redirectToPayment(orderId: number) {
    const payResponse = await apiFetch(
      `${API_URL}/api/payments/order/${encodeURIComponent(orderId)}/group`,
      {
        method: "POST",
      }
    );

    if (!payResponse.ok) {
      throw new Error(
        await readCheckoutError(
          payResponse,
          `Ошибка инициализации оплаты (${payResponse.status})`
        )
      );
    }

    const payment: PaymentInitResponse = await payResponse.json();

    if (!payment.confirmationUrl) {
      throw new Error("Не пришла ссылка на оплату");
    }

    toast.success("Переходим к оплате");

    window.location.href = payment.confirmationUrl;
  }
  async function submitOrder() {
    if (submitLockRef.current || submitting) return;

    if (!cartId) return;

    const pendingPaymentOrderId = loadPendingPaymentOrderId(cartId);

    if (pendingPaymentOrderId) {
      submitLockRef.current = true;
      setSubmitting(true);
      setError(null);

      try {
        await redirectToPayment(pendingPaymentOrderId);
        return;
      } catch (e) {
        clearPendingPaymentOrderId(cartId);

        const message =
          e instanceof Error ? e.message : "Ошибка инициализации оплаты";

        setError(message);
        toast.error(message);
        return;
      } finally {
        submitLockRef.current = false;
        setSubmitting(false);
      }
    }

    if (items.length === 0) return;

    const contactValidationError =
      validateContactDetails({
        fullName,
        phone,
      });

    if (contactValidationError) {
      showError(contactValidationError);
      return;
    }

    if (!selectedCity) {
      showError("Выберите город из списка");
      return;
    }

    const actualRecipientName = fullName.trim();
    const actualRecipientPhone = phone.trim();

    const deliveryValidationError =
      validateDeliveryDetails({
        deliveryMethod,
        selectedAddressId,
        deliveryAddress,
      });

    if (deliveryValidationError) {
      showError(deliveryValidationError);
      return;
    }

    let activeDeliveryOfferId = deliveryOfferId || deliveryQuoteToken;
    let activeCheckoutToken = checkoutToken;
    let activeCheckoutTokenExpiresAt = checkoutTokenExpiresAt;
    let activeDeliveryPrice = deliveryPrice;
    let activeDeliveryCurrency = deliveryCurrency;
    let activeSellerDeliveryCosts = sellerDeliveryCosts;

    if (
      !activeDeliveryOfferId ||
      !activeCheckoutToken ||
      shouldRefreshDeliveryQuote(activeCheckoutTokenExpiresAt)
    ) {
      const quote = await createDeliveryQuote();

      if (!quote) {
        showError("Не удалось рассчитать доставку. Оформление заказа временно недоступно.");
        return;
      }

      activeDeliveryOfferId = quote.externalOfferId || quote.quoteToken;
      activeCheckoutToken = quote.checkoutToken;
      activeCheckoutTokenExpiresAt = quote.expiresAt;
      activeDeliveryPrice = Number(quote.priceAmount || 0);
      activeDeliveryCurrency = quote.currency || "RUB";
      activeSellerDeliveryCosts = Array.isArray(quote.sellerDeliveryCosts)
        ? quote.sellerDeliveryCosts
        : [];
    }

    const pickupPointLabel = selectedPickupPoint?.label ?? "";

    submitLockRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const payload: CheckoutRequest = {
        cartId,
        recipientName: actualRecipientName,
        recipientPhone: actualRecipientPhone,
        recipientEmail: email.trim(),
        deliveryAddress: pickupPointLabel,
        deliveryMethod: "PICKUP_POINT",
        pickupPointId: selectedAddressId || undefined,
        pickupPointLabel: pickupPointLabel || undefined,
        deliveryCountryCode: countryCode,
        deliveryCityCode: selectedCity?.code,
        deliveryCityName: selectedCity?.fullName,
        fittingMode: "WITHOUT_FITTING",
        deliveryOfferId: activeDeliveryOfferId || undefined,
        deliveryQuoteToken: activeCheckoutToken || undefined,
        deliveryPriceAmount: activeDeliveryPrice,
        deliveryCurrency: activeDeliveryCurrency,
        sellerDeliveryCosts: activeSellerDeliveryCosts
          .filter((item) => item.sellerId && item.deliveryCostAmount != null)
          .map((item) => ({
            sellerId: item.sellerId,
            deliveryCostAmount: Number(item.deliveryCostAmount),
            currency: item.currency || activeDeliveryCurrency,
          })),
        paymentMethod,
        comment: comment.trim() || undefined,
      };

      const submitCheckout = () => apiFetch(
        `${API_URL}/api/orders/checkout?cartId=${encodeURIComponent(cartId)}`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      let checkoutResponse = await submitCheckout();

      if (!checkoutResponse.ok) {
        const firstError = await readCheckoutError(
          checkoutResponse,
          `Ошибка оформления заказа (${checkoutResponse.status})`
        );

        if (isRetryableDeliveryQuoteConflict(checkoutResponse.status, firstError)) {
          resetDeliveryQuote();
          const refreshedQuote = await createDeliveryQuote();
          if (!refreshedQuote) throw new Error(firstError);

          payload.deliveryOfferId =
            refreshedQuote.externalOfferId || refreshedQuote.quoteToken;
          payload.deliveryQuoteToken = refreshedQuote.checkoutToken;
          payload.deliveryPriceAmount = Number(refreshedQuote.priceAmount || 0);
          payload.deliveryCurrency = refreshedQuote.currency || "RUB";
          payload.sellerDeliveryCosts = Array.isArray(refreshedQuote.sellerDeliveryCosts)
            ? refreshedQuote.sellerDeliveryCosts
                .filter((item) => item.sellerId && item.deliveryCostAmount != null)
                .map((item) => ({
                  sellerId: item.sellerId,
                  deliveryCostAmount: Number(item.deliveryCostAmount),
                  currency: item.currency || refreshedQuote.currency || "RUB",
                }))
            : [];
          checkoutResponse = await submitCheckout();
        } else {
          throw new Error(firstError);
        }
      }

      if (!checkoutResponse.ok) {
        throw new Error(
          await readCheckoutError(
            checkoutResponse,
            `Ошибка оформления заказа (${checkoutResponse.status})`
          )
        );
      }

      const orders: OrderResponse[] = await checkoutResponse.json();

      if (!Array.isArray(orders) || orders.length === 0) {
        throw new Error("Backend не вернул созданные заказы");
      }

      const firstOrderId = orders[0]?.id;

      if (!firstOrderId) {
        throw new Error("Order id is required for payment");
      }

      savePendingPaymentOrderId(cartId, firstOrderId);
      clearCheckoutDraft();
      emitCartChanged();

      await redirectToPayment(firstOrderId);
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
        <Loader fullPage />
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
        {items.length === 0 ? (
          <EmptyState
            icon="cart"
            tone="gold"
            title="Корзина пуста"
            text="Добавьте товары, чтобы перейти к оформлению заказа"
            actions={
              <button
                type="button"
                className="buttonPrimary"
                onClick={() =>
                  router.push("/catalog")
                }
              >
                Перейти в каталог
              </button>
            }
          />
        ) : (
          <div className={styles.layout}>
            <div className={styles.main}>
                            <CheckoutDeliverySection
                options={deliveryOptions}
                deliveryPrice={deliveryPrice}
                pickupLoading={pickupLoading}
                quoteLoading={quoteLoading || quotePending}
                onPickupSearch={searchPickupPoints}
                countryCode={countryCode}
                selectedAddressId={selectedAddressId}
                cityQuery={cityQuery}
                cityOptions={cityOptions}
                deliveryDateText={deliveryDateText}
                selectedCity={selectedCity}
                onCountryChange={(value) => {
                  setCountryCode(value);
                  setSelectedCity(null);
                  setCityQuery("");
                  setCityOptions([]);
                  setDeliveryOptions([]);
                  setSelectedAddressId("");
                  setDeliveryAddress("");
                  setApartment("");
                  setFloor("");
                  setIntercom("");
                  resetDeliveryQuote();
                }}
                onCityQueryChange={(value) => {
                  setCityTouched(true);
                  setCityQuery(value);

                  if (
                      selectedCity &&
                      value !== formatCityDisplayName(selectedCity.fullName)
                    ) {
                    setSelectedCity(null);
                    setDeliveryOptions([]);
                    setSelectedAddressId("");
                    setDeliveryAddress("");
                    setApartment("");
                    setFloor("");
                    setIntercom("");
                    resetDeliveryQuote();
                  }
                }}
                onCitySuggestionsClose={() => {
                  setCityOptions([]);
                }}
                onCitySelect={(city) => {
                  setSelectedCity(city);
                  setCityQuery(formatCityDisplayName(city.fullName));
                  setCityOptions([]);
                  setCityTouched(false);
                  setDeliveryOptions([]);
                  setSelectedAddressId("");
                  setDeliveryAddress("");
                  setApartment("");
                  setFloor("");
                  setIntercom("");
                  resetDeliveryQuote();
                }}
                comment={comment}
                enabled={true}
                onAddressChange={(value) => {
                  resetDeliveryQuote();
                  setSelectedAddressId(value);
                }}
                onCommentChange={setComment}
              />

              <CheckoutContactSection
                fullName={fullName}
                phone={phone}
                onFullNameChange={(value) => {
                  setFullName(value);
                }}
                onPhoneChange={(value) => {
                  setPhone(value);
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
              quoteLoading={deliveryCalculating}
              deliveryCalculated={deliveryCalculated}
              total={total}
              submitDisabled={submitDisabled}
              onSubmit={submitOrder}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function CheckoutPageClient(props: CheckoutPageProps) {
  return <CheckoutPageContent {...props} />;
}
