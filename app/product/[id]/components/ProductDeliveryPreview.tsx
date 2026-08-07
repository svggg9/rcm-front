"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Icon } from "../../../components/ui/Icon";
import { apiFetch, API_URL } from "../../../lib/api";
import styles from "../ProductPage.module.css";

type CityOption = {
  code: number;
  fullName: string;
  countryCode?: string | null;
};

type PreviewOption = {
  available: boolean;
  periodMinDays: number | null;
  periodMaxDays: number | null;
};

type PreviewResponse = {
  cityName: string;
  cityCode: number;
  pickupPointCount: number;
  pickup: PreviewOption;
  courier: PreviewOption;
};

type CachedPreview = {
  expiresAt: number;
  data: PreviewResponse;
};

type ProfileDeliveryResponse = {
  defaultDeliveryCountryCode: string | null;
  defaultDeliveryCityCode: number | null;
  defaultDeliveryCityName: string | null;
};

type Props = {
  productId: number;
};

const CITY_STORAGE_KEY = "rcm_delivery_city_v1";
const USER_CART_KEY = "user_cart_id";
const PREVIEW_CACHE_PREFIX = "rcm_product_delivery_preview_v1";
const PREVIEW_TTL_MS = 6 * 60 * 60 * 1000;

const DEFAULT_CITY: CityOption = {
  code: 44,
  fullName: "Москва",
  countryCode: "RU",
};

function formatCityName(fullName: string): string {
  const cityName = fullName.split(",")[0]?.trim() ?? fullName;

  return fullName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== "Россия")
    .filter((part) => part !== `городской округ ${cityName}`)
    .filter((part) => part !== `муниципальный округ ${cityName}`)
    .join(", ");
}

function loadCity(): CityOption {
  if (typeof window === "undefined") return DEFAULT_CITY;

  try {
    const raw = window.localStorage.getItem(CITY_STORAGE_KEY);
    if (!raw) return DEFAULT_CITY;

    const parsed = JSON.parse(raw) as CityOption;
    if (!parsed.code || !parsed.fullName) return DEFAULT_CITY;

    return parsed;
  } catch {
    return DEFAULT_CITY;
  }
}

function saveCity(city: CityOption) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
}

function hasAuthMarker(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(USER_CART_KEY));
}

function cityFromProfile(profile: ProfileDeliveryResponse): CityOption | null {
  const code = profile.defaultDeliveryCityCode;
  const fullName = profile.defaultDeliveryCityName?.trim();

  if (!code || !fullName) return null;

  return {
    code,
    fullName,
    countryCode: profile.defaultDeliveryCountryCode || "RU",
  };
}

function getCacheKey(productId: number, cityCode: number) {
  return `${PREVIEW_CACHE_PREFIX}:${productId}:${cityCode}`;
}

function loadCachedPreview(productId: number, cityCode: number): PreviewResponse | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getCacheKey(productId, cityCode));
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedPreview;
    if (!cached.data || cached.expiresAt < Date.now()) return null;

    return cached.data;
  } catch {
    return null;
  }
}

function saveCachedPreview(productId: number, cityCode: number, data: PreviewResponse) {
  if (typeof window === "undefined") return;

  const cached: CachedPreview = {
    expiresAt: Date.now() + PREVIEW_TTL_MS,
    data,
  };

  window.localStorage.setItem(getCacheKey(productId, cityCode), JSON.stringify(cached));
}

function formatDateFromDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatOption(option: PreviewOption | null): string | null {
  if (!option?.available || option.periodMinDays == null) return null;

  if (option.periodMaxDays != null && option.periodMaxDays > option.periodMinDays) {
    return `${formatDateFromDays(option.periodMinDays)} - ${formatDateFromDays(option.periodMaxDays)}`;
  }

  return `${formatDateFromDays(option.periodMinDays)} или позже`;
}

export function ProductDeliveryPreview({ productId }: Props) {
  const [city, setCity] = useState<CityOption>(DEFAULT_CITY);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CityOption[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityReady, setCityReady] = useState(false);

  const cityLabel = useMemo(() => formatCityName(city.fullName), [city.fullName]);
  const pickupText = loading ? null : formatOption(preview?.pickup ?? null);

  useEffect(() => {
    const controller = new AbortController();
    const savedCity = loadCity();

    setCity(savedCity);
    setQuery(formatCityName(savedCity.fullName));

    async function initializeCity() {
      let selectedCity = savedCity;

      if (hasAuthMarker()) {
        try {
          const response = await apiFetch(`${API_URL}/api/profile`, {
            signal: controller.signal,
          });
          if (response.ok) {
            const profile: ProfileDeliveryResponse = await response.json();
            selectedCity = cityFromProfile(profile) ?? selectedCity;
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          // Keep the locally selected city if the profile is unavailable.
        }
      }

      if (controller.signal.aborted) return;
      setCity(selectedCity);
      setQuery(formatCityName(selectedCity.fullName));
      saveCity(selectedCity);
      setCityReady(true);
    }

    void initializeCity();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!cityReady) return;

    const cached = loadCachedPreview(productId, city.code);
    if (cached) {
      setPreview(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadPreview() {
      try {
        setLoading(true);
        setPreview(null);

        const response = await apiFetch(`${API_URL}/api/delivery/product-preview`, {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            productId,
            cityCode: city.code,
            cityName: city.fullName,
          }),
        });

        if (!response.ok) throw new Error("delivery preview failed");

        const data: PreviewResponse = await response.json();
        if (controller.signal.aborted) return;

        setPreview(data);
        saveCachedPreview(productId, city.code, data);
      } catch {
        if (controller.signal.aborted) return;
        setPreview(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadPreview();

    return () => controller.abort();
  }, [city, cityReady, productId]);

  useEffect(() => {
    if (!editing) return;

    const value = query.trim();
    if (value.length < 2) {
      setOptions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void searchCities(value, controller.signal);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [editing, query]);

  async function searchCities(value: string, signal: AbortSignal) {
    try {
      setCityLoading(true);
      const response = await apiFetch(
        `${API_URL}/api/delivery/cities/search?query=${encodeURIComponent(value)}&countryCode=RU`,
        { signal }
      );

      if (!response.ok) throw new Error("city search failed");

      const data: CityOption[] = await response.json();
      if (signal.aborted) return;
      setOptions(Array.isArray(data) ? data : []);
    } catch {
      if (signal.aborted) return;
      setOptions([]);
    } finally {
      if (!signal.aborted) setCityLoading(false);
    }
  }

  function selectCity(option: CityOption) {
    setCity(option);
    setQuery(formatCityName(option.fullName));
    setOptions([]);
    setEditing(false);
    saveCity(option);
    toast.success("Город доставки обновлен");
  }

  return (
    <section className={styles.deliveryPreview}>
      <div className={styles.deliveryPreviewHeader}>
        <div className={styles.deliveryPreviewCity}>
          <span className={styles.deliveryPreviewLabel}>Ваш город</span>
          <strong>{cityLabel}</strong>
        </div>
        <button type="button" onClick={() => setEditing((value) => !value)}>
          Изменить
        </button>
      </div>

      {editing ? (
        <div className={styles.deliveryCitySearch} aria-busy={cityLoading}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Введите город"
            autoComplete="off"
          />
          {options.length > 0 ? (
            <div className={styles.deliveryCityOptions}>
              {options.map((option) => (
                <button
                  key={`${option.code}-${option.fullName}`}
                  type="button"
                  onClick={() => selectCity(option)}
                >
                  {formatCityName(option.fullName)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.deliveryPreviewList} aria-busy={loading}>
        {loading ? (
          <div className={styles.deliveryPreviewItem}>
            <span className={styles.deliveryPreviewIcon}>
              <Icon name="pickup-point" size={18} strokeWidth={1.35} />
            </span>
            <span>Доставка в пункт выдачи</span>
          </div>
        ) : null}
        {pickupText ? (
          <div className={styles.deliveryPreviewItem}>
            <span className={styles.deliveryPreviewIcon}>
              <Icon name="pickup-point" size={18} strokeWidth={1.35} />
            </span>
            <span>
              Доставка в пункт выдачи
            </span>
            <strong>{pickupText}</strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}
