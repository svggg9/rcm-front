"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, API_URL } from "../lib/api";
import { ensureCartId } from "../lib/auth";
import { emitCartChanged } from "../lib/cartEvents";
import { getClientSession } from "../lib/client-session";

import { CheckoutContactSection } from "./components/CheckoutContactSection";
import { CheckoutDeliverySection } from "./components/CheckoutDeliverySection";
import { CheckoutPaymentSection } from "./components/CheckoutPaymentSection";
import { CheckoutSummary } from "./components/CheckoutSummary";

import { toast } from "sonner";
import { Loader } from "../components/ui/Loader";

import type {
  CartItem,
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

function CheckoutPageContent() {
  const router = useRouter();

  const [cartId, setCartId] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const submitLockRef = useRef(false);
  const defaultCitySelectedRef = useRef(false);
  const quoteRequestKeyRef = useRef("");

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
    fittingMode: "WITH_FITTING" as FittingMode,
    comment: "",
  });

  const [countryCode, setCountryCode] = useState<CountryCode>("RU");
  const [apartment, setApartment] = useState("");
  const [floor, setFloor] = useState("");
  const [intercom, setIntercom] = useState("");
  const [fittingMode, setFittingMode] =
    useState<FittingMode>("WITH_FITTING");

  const [otherRecipientEnabled, setOtherRecipientEnabled] = useState(false);
  const [otherRecipientName, setOtherRecipientName] = useState("");
  const [otherRecipientPhone, setOtherRecipientPhone] = useState("");

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
  const [, setCityLoading] = useState(false);
  const [cityTouched, setCityTouched] = useState(false);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quotePending, setQuotePending] = useState(false);
  const [deliveryQuoteToken, setDeliveryQuoteToken] = useState("");
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

  const [addressOptions, setAddressOptions] = useState<
    { value: string; displayName: string }[]
  >([]);
  const [, setAddressLoading] = useState(false);
  const [addressSearchEnabled, setAddressSearchEnabled] = useState(false);
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLon, setAddressLon] = useState<number | null>(null);

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
      selectedPickupPointLabel: selectedPickupPoint?.label ?? "",
      deliveryAddress,
      countryCode,
      selectedCityCode: selectedCity?.code ?? null,
      selectedCityName: selectedCity?.fullName ?? "",
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
    selectedPickupPoint,
    deliveryAddress,
    countryCode,
    selectedCity,
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

        const [session, cartResponse] = await Promise.all([
          getClientSession(),
          apiFetch(
            `${API_URL}/api/cart?cartId=${encodeURIComponent(resolvedCartId)}`
          ),
        ]);

        if (!active) return;

        let me: Me | null = null;

        if (session) {
          const profileResponse = await apiFetch(`${API_URL}/api/profile`);
          if (!active) return;

          if (profileResponse.ok) {
            me = (await profileResponse.json()) as Me;
          }
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
  if (deliveryMethod !== "COURIER") return;
  if (!addressSearchEnabled) return;

  const timeoutId = window.setTimeout(() => {
    void searchAddressSuggestions(deliveryAddress);
  }, 350);

  return () => window.clearTimeout(timeoutId);
}, [addressSearchEnabled, deliveryAddress, deliveryMethod, selectedCity]);

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
    setDeliveryPrice(0);
    setDeliveryCurrency("RUB");
    setSellerDeliveryCosts([]);
    setDeliveryQuoteToken("");
    setDeliveryOfferId("");
    setDeliveryPeriodMinDays(null);
    setDeliveryPeriodMaxDays(null);
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
    try {
      setQuoteLoading(true);
      setError(null);

      const quotePayload = {
        method: deliveryMethod === "PICKUP" ? "PICKUP_POINT" : "COURIER",
        recipientName: fullName.trim(),
        recipientPhone: phone.trim(),
        fittingMode,
        pickupPointId:
          deliveryMethod === "PICKUP" ? selectedAddressId : undefined,
        address:
          deliveryMethod === "PICKUP"
            ? {
                fullText:
                  selectedPickupPoint?.label ??
                  selectedCity?.fullName ??
                  "",
                cityCode:
                  selectedPickupPoint?.cityCode ??
                  selectedCity?.code ??
                  undefined,
              }
            : {
                fullText:
                  deliveryAddress.trim() ||
                  selectedCity?.fullName ||
                  "",
                cityCode: selectedCity?.code ?? undefined,
                lat: addressLat ?? undefined,
                lon: addressLon ?? undefined,
              },
        comment: comment.trim() || undefined,
      };

      const response = await apiFetch(`${API_URL}/api/delivery/seller-group-quotes`, {
        method: "POST",
        body: JSON.stringify({
          cartId,
          quote: quotePayload,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось рассчитать доставку");
      }

      const quote = (await response.json()) as SellerGroupDeliveryQuoteResponse;

      setDeliveryQuoteToken(quote.quoteToken);
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
      const message =
        e instanceof Error ? e.message : "Не удалось рассчитать доставку";
      resetDeliveryQuote();

      if (!options?.silent) {
        showError(message);
      }
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedCity || items.length === 0) {
      setQuotePending(false);
      setSellerDeliveryCosts([]);
      return;
    }

    const requestKey = JSON.stringify({
      method: deliveryMethod,
      cityCode: selectedCity.code,
      pickupPointId: selectedAddressId,
      address: deliveryMethod === "COURIER" ? deliveryAddress.trim() : "",
      lat: addressLat,
      lon: addressLon,
      fittingMode,
    });

    if (quoteRequestKeyRef.current === requestKey) return;

    quoteRequestKeyRef.current = requestKey;
    setQuotePending(true);

    const timeoutId = window.setTimeout(() => {
      void createDeliveryQuote({ silent: true }).finally(() => {
        setQuotePending(false);
      });
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    selectedCity,
    items.length,
    deliveryMethod,
    selectedAddressId,
    deliveryOptions,
    deliveryAddress,
    addressLat,
    addressLon,
    fittingMode,
  ]);

  async function selectAddressSuggestion(value: string) {
    const ymaps = getYmapsSearchApi();

    setDeliveryAddress(value);
    setAddressSearchEnabled(false);
    setAddressOptions([]);
    setAddressLat(null);
    setAddressLon(null);
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

    const contactValidationError =
      validateContactDetails({
        email,
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
    let activeDeliveryPrice = deliveryPrice;
    let activeDeliveryCurrency = deliveryCurrency;
    let activeSellerDeliveryCosts = sellerDeliveryCosts;

    if (!activeDeliveryOfferId) {
      const quote = await createDeliveryQuote();

      if (!quote) return;

      activeDeliveryOfferId = quote.externalOfferId || quote.quoteToken;
      activeDeliveryPrice = Number(quote.priceAmount || 0);
      activeDeliveryCurrency = quote.currency || "RUB";
      activeSellerDeliveryCosts = Array.isArray(quote.sellerDeliveryCosts)
        ? quote.sellerDeliveryCosts
        : [];
    }

    const pickupPointLabel =
      deliveryMethod === "PICKUP" ? selectedPickupPoint?.label ?? "" : "";

    const addressDetails =
      deliveryMethod === "COURIER"
        ? deliveryAddress.trim()
        : pickupPointLabel;

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
        pickupPointLabel:
          deliveryMethod === "PICKUP"
            ? pickupPointLabel || undefined
            : undefined,
        deliveryCountryCode: countryCode,
        deliveryCityCode: selectedCity?.code,
        deliveryCityName: selectedCity?.fullName,
        deliveryApartment:
          deliveryMethod === "COURIER" ? apartment.trim() || undefined : undefined,
        deliveryFloor:
          deliveryMethod === "COURIER" ? floor.trim() || undefined : undefined,
        deliveryIntercom:
          deliveryMethod === "COURIER" ? intercom.trim() || undefined : undefined,
        fittingMode,
        deliveryOfferId: activeDeliveryOfferId || undefined,
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
        comment:
          [
            comment.trim(),
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

      const firstOrderId = orders[0]?.id;

      clearCheckoutDraft();
      emitCartChanged();

      if (!firstOrderId) {
        throw new Error("Order id is required for payment");
      }

      const payResponse = await apiFetch(
        `${API_URL}/api/payments/order/${encodeURIComponent(firstOrderId)}/group`,
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
                quoteLoading={quoteLoading || quotePending}
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
                deliveryDateText={deliveryDateText}
                onAddressSelect={(value) => {
                  void selectAddressSuggestion(value);
                }}
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
                  setAddressSearchEnabled(false);
                  setAddressOptions([]);
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
                    setAddressSearchEnabled(false);
                    setAddressOptions([]);
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
                  setAddressSearchEnabled(false);
                  setAddressOptions([]);
                  resetDeliveryQuote();
                }}
                comment={comment}
                enabled={true}
                onDeliveryMethodChange={(value) => {
                  setDeliveryMethod(value);
                  setAddressSearchEnabled(false);
                  setAddressOptions([]);
                  resetDeliveryQuote();
                }}
                onAddressChange={(value) => {
                  setSelectedAddressId(value);
                }}
                onDeliveryAddressFocus={() => {
                  setAddressSearchEnabled(true);
                }}
                onDeliveryAddressChange={(value) => {
                  setAddressSearchEnabled(true);
                  setDeliveryAddress(value);
                  setAddressLat(null);
                  setAddressLon(null);
                  resetDeliveryQuote();
                }}
                onAddressSuggestionsClose={() => {
                  setAddressOptions([]);
                }}
                onApartmentChange={(value) => {
                  setApartment(value);
                }}
                onFloorChange={(value) => {
                  setFloor(value);
                }}
                onIntercomChange={(value) => {
                  setIntercom(value);
                }}
                onFittingModeChange={(value) => {
                  setFittingMode(value);
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
                onEmailChange={(value) => {
                  setEmail(value);
                }}
                onFullNameChange={(value) => {
                  setFullName(value);
                }}
                onPhoneChange={(value) => {
                  setPhone(value);
                }}
                onOtherRecipientEnabledChange={(value) => {
                  setOtherRecipientEnabled(value);
                }}
                onOtherRecipientNameChange={(value) => {
                  setOtherRecipientName(value);
                }}
                onOtherRecipientPhoneChange={(value) => {
                  setOtherRecipientPhone(value);
                }}
              />



              <CheckoutPaymentSection
                paymentMethod={paymentMethod}
                enabled={true}
                onPaymentMethodChange={(value) => {
                  setPaymentMethod(value);
                }}
              />

              {error ? (
                <div className={styles.error}>
                  {error}
                </div>
              ) : null}

              <div className={styles.checkoutActions}>
                <button
                  type="button"
                  onClick={submitOrder}
                  disabled={submitting || quoteLoading || quotePending}
                  className={`${styles.finalSubmitButton} buttonPrimary`}
                >
                  {submitting ? "Переходим к оплате..." : "Подтвердить заказ"}
                </button>

                <div className={styles.disclaimer}>
                  Нажимая «Подтвердить заказ», вы соглашаетесь с публичной офертой,
                  политикой конфиденциальности, условиями обработки персональных данных
                  и условиями доставки и возврата.
                </div>
              </div>
            </div>

            <CheckoutSummary
              items={items}
              subtotal={subtotal}
              deliveryPrice={deliveryPrice}
              total={total}
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
