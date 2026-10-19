"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, API_URL } from "../lib/api";
import { paymentConfirmationUrl } from "../lib/paymentRedirect";
import { savePendingPaymentOrderId, saveBankReturnOrder, clearSucceededPendingPayment } from "./lib/pendingPayment";
import { rememberUserCartId } from "../lib/auth";
import { loadResolvedCart } from "../lib/cartAuthority";
import { emitCartChanged } from "../lib/cartEvents";
import { useFieldValidation } from "../lib/useFieldValidation";
import { scrollToFirstValidationError } from "../lib/formValidation";

import { CheckoutContactSection } from "./components/CheckoutContactSection";
import { CheckoutDeliverySection } from "./components/CheckoutDeliverySection";
import { CheckoutFlow } from "./components/CheckoutFlow";
import { CheckoutActionError, readCheckoutError, readCheckoutFailure } from "./lib/checkoutErrors";
import { CheckoutSummary } from "./components/CheckoutSummary";

import { toast } from "@/app/components/ui/toast";
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

import { isValidPhone } from "../lib/validation";

import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
} from "./lib/checkoutDraft";

import {
  buildCheckoutPrefill,
  type CheckoutPrefill,
  type Me,
} from "./lib/checkoutPrefill";

import styles from "./Checkout.module.css";

const DELIVERY_QUOTE_SAFETY_MARGIN_MS = 30_000;

function shouldRefreshDeliveryQuote(expiresAt: string): boolean {
  const expiresAtMs = Date.parse(expiresAt);
  return !Number.isFinite(expiresAtMs) ||
    expiresAtMs <= Date.now() + DELIVERY_QUOTE_SAFETY_MARGIN_MS;
}

function isRetryableDeliveryQuoteConflict(status: number, message: string): boolean {
  return status === 409 && /delivery_quote_(expired|stale|invalid)/i.test(message);
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
  embedded?: boolean;
  cartSnapshot?: CheckoutCartBootstrap;
  cartUpdating?: boolean;
  cartBlocked?: boolean;
  cartMutationRef?: RefObject<boolean>;
  onSubmitBusyChange?: (busy: boolean) => void;
};

function CheckoutPageContent({ initialMe, initialCart, embedded = false, cartSnapshot, cartUpdating = false,
  cartBlocked = false, cartMutationRef, onSubmitBusyChange }: CheckoutPageProps) {
  const router = useRouter();

  const [embeddedBootstrapCart] = useState(cartSnapshot ?? null);
  const [loadedCartId, setCartId] = useState(initialCart?.cartId ?? "");
  const [loadedItems, setItems] = useState<CartItem[]>(initialCart?.items ?? []);
  const cartId = cartSnapshot?.cartId ?? loadedCartId;
  const items = cartSnapshot?.items ?? loadedItems;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Only this checkout attempt can resume this order. Older orders belong to
  // the account and must never replace the next cart's checkout.
  const createdOrderRef = useRef<number | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const committedCartRef = useRef<string | null>(null);
  const restoredOrderRef = useRef(false);
  const [committedSubtotal, setCommittedSubtotal] = useState<number | null>(null);
  const [resumePaymentAllowed, setResumePaymentAllowed] = useState(true);
  const checkoutAttemptRef = useRef<CheckoutRequest | null>(null);
  const [checkoutUnknown, setCheckoutUnknown] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [deliveryErrors, setDeliveryErrors] = useState<{
    city?: string;
    pickupPoint?: string;
  }>({});

  const submitLockRef = useRef(false);
  const leavingCheckoutRef = useRef(false);
  const checkoutMainRef = useRef<HTMLDivElement | null>(null);
  const defaultCitySelectedRef = useRef(false);
  const quoteRequestKeyRef = useRef("");
  const citySearchRequestRef = useRef(0);
  const pickupSearchRequestRef = useRef(0);
  const quoteControllerRef = useRef<AbortController | null>(null);
  const searchCitiesRef = useRef<(query: string) => Promise<void>>(async () => {});
  const createDeliveryQuoteRef = useRef<
    () => Promise<SellerGroupDeliveryQuoteResponse | null>
  >(async () => null);

  useEffect(() => {
    return () => {
      citySearchRequestRef.current += 1;
      pickupSearchRequestRef.current += 1;
      quoteControllerRef.current?.abort();
    };
  }, []);

  const [draftHydrated, setDraftHydrated] = useState(false);
  const profileContactsRef = useRef<Pick<CheckoutPrefill, "email" | "fullName" | "phone"> | null>(null);
  const hadCommittedRecipientRef = useRef(false);

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
  const contactValidation = useFieldValidation({ fullName, phone }, values => ({
    ...(!values.fullName.trim() ? { fullName: "Введите имя и фамилию" } : {}),
    ...(!isValidPhone(values.phone) ? { phone: "Укажите корректный российский номер телефона" } : {}),
  }));
  const contactErrors = contactValidation.errors;

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("PICKUP");

  const [selectedAddressId, setSelectedAddressId] =
    useState("");

  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [cityOptions, setCityOptions] = useState<DeliveryCityOption[]>([]);
  const [selectedCity, setSelectedCity] =
    useState<DeliveryCityOption | null>(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityTouched, setCityTouched] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const pickerSnapshot = useRef<{ city: DeliveryCityOption | null; query: string; options: DeliveryOption[]; addressId: string } | null>(null);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quotePending, setQuotePending] = useState(false);
  const [deliveryQuoteToken, setDeliveryQuoteToken] = useState("");
  const [quotedCartFingerprint, setQuotedCartFingerprint] = useState("");
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
  ]);

  useEffect(() => {
    const draft = loadCheckoutDraft();

    if (draft) {
      setDeliveryMethod(draft.deliveryMethod);
      setSelectedAddressId(draft.selectedAddressId);
      setDeliveryAddress(draft.deliveryAddress);
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

    const committed = pickerSnapshot.current;
    saveCheckoutDraft({
      deliveryMethod,
      selectedAddressId: committed ? committed.addressId : selectedAddressId,
      selectedPickupPointLabel: committed ? committed.options.find(point => point.id === committed.addressId)?.label ?? "" : selectedPickupPoint?.label ?? "",
      deliveryAddress,
      countryCode,
      selectedCityCode: committed ? committed.city?.code ?? null : selectedCity?.code ?? null,
      selectedCityName: committed ? committed.city?.fullName ?? "" : selectedCity?.fullName ?? "",
      apartment,
      floor,
      intercom,
      fittingMode,
      paymentMethod,
    });
  }, [
    draftHydrated,
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
          : apiFetch(`${API_URL}/api/profile`, { cache: "no-store" })
              .then(async (response) =>
                response.ok ? ((await response.json()) as Me) : null
              )
              .catch(() => null);
        const cartPromise = initialCart
          ? Promise.resolve(initialCart)
          : embeddedBootstrapCart ? Promise.resolve(embeddedBootstrapCart) : loadCheckoutCartFallback();
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
          },
        });

        setEmail(prefill.email);
        setFullName(prefill.fullName);
        setPhone(prefill.phone);
        if (resolvedMe) profileContactsRef.current = prefill;

        if (
          !existing.deliveryAddress.trim() &&
          prefill.deliveryAddress
        ) {
          setDeliveryAddress(prefill.deliveryAddress);
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

          throw new CheckoutActionError(
            text || "Не удалось загрузить корзину"
          );
        }

        if (resolvedCart.checkoutOrderId) {
          const id = resolvedCart.checkoutOrderId;
          createdOrderRef.current = id;
          restoredOrderRef.current = true;
          setCreatedOrderId(id);
          committedCartRef.current = resolvedCart.items.map(item => `${item.variantId}:${item.quantity}:${item.price}`).sort().join("|");
          const paymentResponse = await apiFetch(`${API_URL}/api/payments/order/${id}/group-last`);
          if (paymentResponse.ok) {
            const payment = await paymentResponse.json() as { status: string; externalId?: string };
            if (payment.status === "PENDING" && payment.externalId) {
              const sync = await apiFetch(`${API_URL}/api/payments/${encodeURIComponent(payment.externalId)}/sync`, { method: "POST" });
              if (!sync.ok) throw new CheckoutActionError("Не удалось проверить оплату — обновите страницу или откройте заказ");
            }
          } else if (paymentResponse.status !== 404) throw new CheckoutActionError("Не удалось проверить оплату — обновите страницу или откройте заказ");
          const response = await apiFetch(`${API_URL}/api/orders/${id}/group`);
          if (!response.ok) throw new CheckoutActionError("Не удалось загрузить заказ — обновите страницу");
          const group = await response.json() as OrderResponse[];
          if (!Array.isArray(group) || !group.length || !group.some(order => order.id === id)) throw new CheckoutActionError("Не удалось подтвердить заказ");
          if (!active) return;
          if (group.every(order => order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED")) {
            clearSucceededPendingPayment(resolvedCart.cartId, id, "SUCCEEDED");
            try { clearCheckoutDraft(); } catch { /* Browser storage cannot block a confirmed payment. */ }
            emitCartChanged();
            router.replace(`/account?tab=orders&orderId=${id}`);
            return;
          }
          const order = group[0];
          setCommittedSubtotal(group.reduce((sum, order) => sum + Number(order.subtotalAmount ?? 0), 0));
          setDeliveryPrice(group.reduce((sum, order) => sum + Number(order.deliveryAmount ?? 0), 0));
          setFullName(order.recipientName ?? ""); setPhone(order.recipientPhone ?? "");
          setSelectedAddressId(order.pickupPointId ?? "");
          setDeliveryOptions([{ id: order.pickupPointId ?? "", label: order.deliveryAddress ?? "" }]);
          setResumePaymentAllowed(group.every(order => order.paymentAllowed !== false));
        }

      } catch (e) {
        const message =
          e instanceof CheckoutActionError
            ? e.message
            : "Не удалось загрузить checkout";

        setError(message);
        if (createdOrderRef.current) setResumePaymentAllowed(false);
      } finally {
        if (active) {
          setLoading(false);
          onSubmitBusyChange?.(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [initialCart, initialMe, embeddedBootstrapCart, onSubmitBusyChange, router]);

  useEffect(() => {
    if (loading || checkoutUnknown) return;
    if (createdOrderId) {
      hadCommittedRecipientRef.current = true;
      return;
    }
    let active = true;
    let controller: AbortController | null = null;
    async function refreshProfile() {
      if (createdOrderRef.current || submitLockRef.current) return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await apiFetch(`${API_URL}/api/profile`, { cache: "no-store", signal: request.signal });
        if (!response.ok) return;
        const profile = await response.json() as Me;
        if (!active || request.signal.aborted || createdOrderRef.current || submitLockRef.current) return;
        const next = buildCheckoutPrefill({ me: profile });
        const previous = profileContactsRef.current;
        // Preserve an explicitly edited recipient while the profile is unchanged.
        if (!previous || next.email !== previous.email) setEmail(next.email);
        if (!previous || next.fullName !== previous.fullName) setFullName(next.fullName);
        if (!previous || next.phone !== previous.phone) setPhone(next.phone);
        profileContactsRef.current = next;
      } catch { /* A failed refresh cannot replace confirmed contacts with stale draft data. */ }
    }
    const restore = (event: PageTransitionEvent) => { if (event.persisted) void refreshProfile(); };
    window.addEventListener("focus", refreshProfile);
    window.addEventListener("pageshow", restore);
    if (hadCommittedRecipientRef.current) {
      hadCommittedRecipientRef.current = false;
      void refreshProfile();
    }
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("focus", refreshProfile);
      window.removeEventListener("pageshow", restore);
    };
  }, [loading, checkoutUnknown, createdOrderId]);

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

  const restorePointCity = useRef<number | null>(null);
  useEffect(() => {
    if (!loading && selectedCity && selectedAddressId && !deliveryOptions.length && restorePointCity.current !== selectedCity.code) {
      restorePointCity.current = selectedCity.code;
      void searchPickupPoints();
    }
  // Only the restored selection triggers this request; the picker owns subsequent searches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selectedCity?.code, selectedAddressId]);

  const subtotal = useMemo(() => {
    return committedSubtotal ?? items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [items, committedSubtotal]);

  const cartFingerprint = useMemo(
    () =>
      items
        .map((item) => `${item.variantId}:${item.quantity}:${item.price}`)
        .sort()
        .join("|"),
    [items]
  );
  const currentCartFingerprint = useRef(cartFingerprint);
  currentCartFingerprint.current = cartFingerprint;
  useEffect(() => {
    if (!submitting && committedCartRef.current !== null && (committedCartRef.current !== cartFingerprint ||
      (restoredOrderRef.current && cartSnapshot?.checkoutOrderId !== createdOrderRef.current))) {
      createdOrderRef.current = null; setCreatedOrderId(null); committedCartRef.current = null;
      restoredOrderRef.current = false;
      setCommittedSubtotal(null); setResumePaymentAllowed(true);
      if (profileContactsRef.current) {
        setEmail(profileContactsRef.current.email);
        setFullName(profileContactsRef.current.fullName);
        setPhone(profileContactsRef.current.phone);
      }
    }
  }, [cartFingerprint, submitting, cartSnapshot?.checkoutOrderId]);

  const deliveryCalculated = Boolean(
    !cartUpdating && !cartBlocked && (createdOrderId || (quotedCartFingerprint === cartFingerprint &&
    deliveryQuoteToken && deliveryOfferId && checkoutToken))
  );
  const deliveryCalculating = cartUpdating || quoteLoading || quotePending;
  const submitDisabled =
    submitting ||
    cartBlocked ||
    deliveryCalculating ||
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
    setQuotedCartFingerprint("");
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
    setPickupError(null);

    const response = await apiFetch(`${API_URL}/api/delivery/pickup-points/search`, {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        location: selectedCity.fullName,
        cityCode: selectedCity.code,
      }),
    });

    if (!response.ok) {
      throw new CheckoutActionError(
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
      e instanceof CheckoutActionError ? e.message : "Не удалось загрузить пункты выдачи";

    setPickupError(message);
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
      )}&countryCode=${countryCode}`, { signal: AbortSignal.timeout(20_000) }
    );

    if (!response.ok) {
      throw new CheckoutActionError(await readCheckoutError(response, "Не удалось найти город"));
    }

    const data = (await response.json()) as DeliveryCityOption[];
    if (requestId !== citySearchRequestRef.current) return;

    setCityOptions(Array.isArray(data) ? data : []);
    setDeliveryErrors(current => ({ ...current, city: undefined }));
  } catch (e) {
    if (requestId !== citySearchRequestRef.current) return;
    const message =
      e instanceof CheckoutActionError ? e.message : "Не удалось найти город";

    setDeliveryErrors(current => ({ ...current, city: message }));
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

  async function createDeliveryQuote(): Promise<SellerGroupDeliveryQuoteResponse | null> {
    if (cartUpdating || cartBlocked || cartMutationRef?.current || !items.length) return null;
    if (createdOrderRef.current) {
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
      };

      const response = await apiFetch(`${API_URL}/api/delivery/seller-group-quotes`, {
        method: "POST",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
        body: JSON.stringify({
          cartId,
          quote: quotePayload,
        }),
      });

      if (!response.ok) {
        throw new CheckoutActionError(
          await readCheckoutError(response, "Не удалось рассчитать доставку")
        );
      }

      const quote = (await response.json()) as SellerGroupDeliveryQuoteResponse;
      if (controller.signal.aborted || cartMutationRef?.current || quoteControllerRef.current !== controller || currentCartFingerprint.current !== cartFingerprint) return null;
      if (!quote.checkoutToken || !quote.quoteToken || !Number.isFinite(Number(quote.priceAmount)) || Number(quote.priceAmount) < 0) {
        throw new CheckoutActionError("Не удалось подтвердить стоимость доставки — попробуйте ещё раз");
      }

      setDeliveryQuoteToken(quote.quoteToken);
      setQuotedCartFingerprint(cartFingerprint);
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
        e instanceof CheckoutActionError ? e.message : "Не удалось рассчитать доставку";
      resetDeliveryQuote();
      setError(message);
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
    if (cartUpdating || cartBlocked) {
      resetDeliveryQuote();
      return;
    }
    if (createdOrderId) {
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
      void createDeliveryQuoteRef.current().finally(() => {
        if (quoteRequestKeyRef.current === requestKey) {
          setQuotePending(false);
        }
      });
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    cartUpdating,
    cartBlocked,
    cartId,
    createdOrderId,
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
        signal: AbortSignal.timeout(20_000),
      }
    );

    if (!payResponse.ok) {
      throw new CheckoutActionError(
        await readCheckoutError(
          payResponse,
          "Не удалось открыть оплату — попробуйте ещё раз"
        )
      );
    }

    const payment: PaymentInitResponse = await payResponse.json();

    const confirmationUrl = paymentConfirmationUrl(payment.confirmationUrl);
    if (!confirmationUrl) {
      throw new CheckoutActionError("Не удалось открыть оплату — попробуйте ещё раз");
    }

    leavingCheckoutRef.current = true;
    saveBankReturnOrder(cartId, orderId);
    window.location.href = confirmationUrl;
  }

  async function acceptCreatedOrders(response: Response) {
    const orders: OrderResponse[] = await response.json();
    const orderId = Array.isArray(orders) ? orders[0]?.id : null;
    if (!Number.isSafeInteger(orderId) || !orderId || orderId <= 0) {
      throw new CheckoutActionError("Не удалось подтвердить создание заказа — проверьте заказы в кабинете");
    }
    // Mark the attempt before invoking callbacks or starting the bank Init.
    createdOrderRef.current = orderId;
    committedCartRef.current = currentCartFingerprint.current;
    setCreatedOrderId(orderId);
    checkoutAttemptRef.current = null;
    setCheckoutUnknown(false);
    savePendingPaymentOrderId(cartId, orderId);
    emitCartChanged();
    try {
      await redirectToPayment(orderId);
    } catch {
      // A committed order owns payment recovery; an empty cart is never its screen.
      toast.error("Заказ создан, но не удалось открыть оплату — попробуйте ещё раз в заказе");
      leavingCheckoutRef.current = true;
      router.replace(`/account?tab=orders&orderId=${orderId}`);
    }
  }

  async function submitOrder() {
    if (submitLockRef.current || submitting || cartUpdating || cartMutationRef?.current) return;

    if (!cartId) return;
    submitLockRef.current = true;
    setSubmitting(true);
    onSubmitBusyChange?.(true);
    try {

    const pendingPaymentOrderId = createdOrderRef.current;

    if (pendingPaymentOrderId) {
      submitLockRef.current = true;
      setSubmitting(true);
      setError(null);

      try {
        await redirectToPayment(pendingPaymentOrderId);
        return;
      } catch (e) {
        // Preserve the order ID for an explicit payment retry; do not create a second order.

        const message =
          e instanceof CheckoutActionError ? e.message : "Ошибка инициализации оплаты";

        setError(message);
        return;
      }
    }

    if (checkoutAttemptRef.current) {
      // A lost response is retried with the original signed checkout token,
      // without inspecting the next cart or requesting a different quote.
      setError(null);
      try {
        const response = await apiFetch(`${API_URL}/api/orders/checkout?cartId=${encodeURIComponent(cartId)}`, {
          method: "POST", body: JSON.stringify(checkoutAttemptRef.current), signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          if (response.status < 500) { checkoutAttemptRef.current = null; setCheckoutUnknown(false); }
          throw new CheckoutActionError(await readCheckoutError(response, "Не удалось проверить создание заказа — попробуйте ещё раз"));
        }
        await acceptCreatedOrders(response);
      } catch (e) {
        const message = e instanceof CheckoutActionError ? e.message : "Не удалось проверить создание заказа — попробуйте ещё раз";
        setError(message);
      }
      return;
    }

    if (cartBlocked || items.length === 0) return;

    const nextContactErrors = {
      ...(!fullName.trim() ? { fullName: "Введите имя и фамилию" } : {}),
      ...(!isValidPhone(phone)
        ? { phone: "Укажите корректный российский номер телефона" }
        : {}),
    };
    const contactValidationError =
      nextContactErrors.fullName || nextContactErrors.phone;
    const nextDeliveryErrors = !selectedCity
      ? { city: "Выберите город из списка" }
      : !selectedPickupPoint
        ? { pickupPoint: "Выберите пункт выдачи" }
        : {};
    const firstValidationError =
      nextDeliveryErrors.city ||
      nextDeliveryErrors.pickupPoint ||
      contactValidationError;

    contactValidation.validate();
    setDeliveryErrors(nextDeliveryErrors);

    if (firstValidationError) {
      setError(null);
      scrollToFirstValidationError({ root: checkoutMainRef.current });
      return;
    }

    const actualRecipientName = fullName.trim();
    const actualRecipientPhone = phone.trim();

    setError(null);

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
        showError("Не удалось рассчитать доставку — попробуйте ещё раз");
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
      };

      const submitCheckout = () => apiFetch(
        `${API_URL}/api/orders/checkout?cartId=${encodeURIComponent(cartId)}`,
        {
          method: "POST",
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20_000),
        }
      );
      checkoutAttemptRef.current = payload;
      let checkoutResponse = await submitCheckout();

      if (!checkoutResponse.ok) {
        const firstFailure = await readCheckoutFailure(
          checkoutResponse,
          "Не удалось оформить заказ — попробуйте ещё раз"
        );

        const firstError = firstFailure.message;
        if (isRetryableDeliveryQuoteConflict(checkoutResponse.status, firstFailure.code)) {
          checkoutAttemptRef.current = null;
          resetDeliveryQuote();
          const refreshedQuote = await createDeliveryQuote();
          if (!refreshedQuote) throw new CheckoutActionError(firstError);

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
          checkoutAttemptRef.current = payload;
          checkoutResponse = await submitCheckout();
        } else {
          if (checkoutResponse.status < 500) checkoutAttemptRef.current = null;
          throw new CheckoutActionError(firstError);
        }
      }

      if (!checkoutResponse.ok) {
        if (checkoutResponse.status < 500) checkoutAttemptRef.current = null;
        throw new CheckoutActionError(
          await readCheckoutError(
            checkoutResponse,
            "Не удалось оформить заказ — попробуйте ещё раз"
          )
        );
      }

      await acceptCreatedOrders(checkoutResponse);
    } catch (e) {
      const message =
        e instanceof CheckoutActionError ? e.message : "Не удалось подтвердить создание заказа — проверьте заказы или повторите проверку";

      if (checkoutAttemptRef.current && !createdOrderRef.current) setCheckoutUnknown(true);
      setError(message);
    }
    } finally {
      if (!leavingCheckoutRef.current) {
        submitLockRef.current = false; setSubmitting(false); onSubmitBusyChange?.(false);
      }
    }
  }

  async function continueDelivery(): Promise<boolean> {
    if (cartUpdating || cartBlocked || cartMutationRef?.current || !items.length) return false;
    const fields = {
      ...(!fullName.trim() ? { fullName: "Введите имя и фамилию" } : {}),
      ...(!isValidPhone(phone) ? { phone: "Укажите корректный российский номер телефона" } : {}),
    };
    const deliveryFields = !selectedCity ? { city: "Выберите город из списка" }
      : !selectedPickupPoint ? { pickupPoint: "Выберите пункт выдачи" } : {};
    contactValidation.validate(); setDeliveryErrors(deliveryFields);
    if (Object.keys(fields).length || Object.keys(deliveryFields).length) {
      scrollToFirstValidationError({ root: checkoutMainRef.current }); return false;
    }
    if (!deliveryCalculated || shouldRefreshDeliveryQuote(checkoutTokenExpiresAt)) return Boolean(await createDeliveryQuote());
    setError(null); return true;
  }
  const deliveryContent = <CheckoutDeliverySection
                options={deliveryOptions}
                deliveryCalculated={deliveryCalculated}
                cityLoading={cityLoading}
                pickupError={pickupError}
                onPickerOpen={() => { pickerSnapshot.current = { city: selectedCity, query: cityQuery, options: deliveryOptions, addressId: selectedAddressId }; }}
                onPickerCancel={() => {
                  const snapshot = pickerSnapshot.current; if (!snapshot) return;
                  citySearchRequestRef.current += 1; pickupSearchRequestRef.current += 1;
                  setSelectedCity(snapshot.city); setCityQuery(snapshot.query); setCityOptions([]); setCityTouched(false);
                  setDeliveryOptions(snapshot.options); setSelectedAddressId(snapshot.addressId); setPickupError(null);
                  setDeliveryErrors({}); pickerSnapshot.current = null; resetDeliveryQuote();
                }}
                onPickerConfirm={() => { pickerSnapshot.current = null; }}
                deliveryPrice={deliveryPrice}
                pickupLoading={pickupLoading}
                quoteLoading={deliveryCalculating}
                onPickupSearch={searchPickupPoints}
                countryCode={countryCode}
                selectedAddressId={selectedAddressId}
                cityQuery={cityQuery}
                cityOptions={cityOptions}
                deliveryDateText={deliveryDateText}
                selectedCity={selectedCity}
                cityError={deliveryErrors.city}
                pickupPointError={deliveryErrors.pickupPoint}
                onCountryChange={(value) => {
                  pickupSearchRequestRef.current += 1; citySearchRequestRef.current += 1; setPickupLoading(false);
                  const currentValidationError =
                    deliveryErrors.city || deliveryErrors.pickupPoint;
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
                  setDeliveryErrors({});
                  if (currentValidationError) {
                    setError((current) =>
                      current === currentValidationError ? null : current
                    );
                  }
                  resetDeliveryQuote();
                }}
                onCityQueryChange={(value) => {
                  const currentValidationError =
                    deliveryErrors.city || deliveryErrors.pickupPoint;
                  citySearchRequestRef.current += 1; pickupSearchRequestRef.current += 1; setPickupLoading(false);
                  setCityOptions([]); setCityLoading(value.trim().length >= 2);
                  setCityTouched(true);
                  setCityQuery(value);
                  setDeliveryErrors({});
                  if (currentValidationError) {
                    setError((current) =>
                      current === currentValidationError ? null : current
                    );
                  }

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
                  pickupSearchRequestRef.current += 1; setPickupLoading(false);
                  const currentValidationError =
                    deliveryErrors.city || deliveryErrors.pickupPoint;
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
                  setDeliveryErrors({});
                  if (currentValidationError) {
                    setError((current) =>
                      current === currentValidationError ? null : current
                    );
                  }
                  resetDeliveryQuote();
                }}
                enabled={!submitting && !deliveryCalculating}
                onAddressChange={(value) => {
                  const currentValidationError = deliveryErrors.pickupPoint;
                  resetDeliveryQuote();
                  setSelectedAddressId(value);
                  setDeliveryErrors((current) => ({
                    ...current,
                    pickupPoint: undefined,
                  }));
                  if (currentValidationError) {
                    setError((current) =>
                      current === currentValidationError ? null : current
                    );
                  }
                }}
              />;
  const contactContent = <CheckoutContactSection disabled={submitting || deliveryCalculating}
                fullName={fullName}
                phone={phone}
                fullNameError={contactErrors.fullName}
                phoneError={contactErrors.phone}
                onFullNameBlur={() => contactValidation.touch("fullName")}
                onPhoneBlur={() => contactValidation.touch("phone")}
                onFullNameChange={value => { setFullName(value); contactValidation.changed("fullName"); }}
                onPhoneChange={value => { setPhone(value); contactValidation.changed("phone"); }}
              />;

  if (embedded) return <div ref={checkoutMainRef}>
    {loading ? <Loader label="Загрузка оформления" /> : !cartId ? <p role="alert">Не удалось загрузить оформление — вернитесь в корзину и попробуйте ещё раз</p> :
      <CheckoutFlow delivery={deliveryContent} contact={contactContent} pickupLabel={selectedPickupPoint?.label ?? ""}
        cityName={selectedCity?.fullName ?? ""} recipient={fullName} phone={phone} subtotal={subtotal}
        deliveryPrice={deliveryPrice} deliveryCalculated={deliveryCalculated} deliveryCalculating={deliveryCalculating}
        submitting={submitting} error={error} checkoutUnknown={checkoutUnknown} committedOrderId={submitting ? null : createdOrderId}
        disabled={cartUpdating || cartBlocked || !items.length || !resumePaymentAllowed}
        onContinue={continueDelivery} onSubmit={submitOrder} />}
  </div>;

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
                Каталог
              </button>
            }
          />
        ) : (
          <div className={styles.layout}>
            <div className={styles.main} ref={checkoutMainRef}>
              {deliveryContent}
              {contactContent}
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
