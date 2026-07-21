"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [, setCityLoading] = useState(false);
  const hydratedRef = useRef(false);

  const cityLabel = useMemo(() => formatCityName(city.fullName), [city.fullName]);
  const pickupText = loading ? null : formatOption(preview?.pickup ?? null);

  useEffect(() => {
    let alive = true;
    const savedCity = loadCity();

    hydratedRef.current = true;
    setCity(savedCity);
    setQuery(formatCityName(savedCity.fullName));

    async function loadProfileCity() {
      try {
        const response = await apiFetch(`${API_URL}/api/profile`);
        if (!response.ok) return;

        const profile: ProfileDeliveryResponse = await response.json();
        const profileCity = cityFromProfile(profile);
        if (!alive || !profileCity) return;

        setCity(profileCity);
        setQuery(formatCityName(profileCity.fullName));
        saveCity(profileCity);
      } catch {
        // Guest users keep the locally selected city.
      }
    }

    if (hasAuthMarker()) {
      void loadProfileCity();
    }

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const cached = loadCachedPreview(productId, city.code);
    if (cached) {
      setPreview(cached);
      return;
    }

    let alive = true;

    async function loadPreview() {
      try {
        setLoading(true);

        const response = await apiFetch(`${API_URL}/api/delivery/product-preview`, {
          method: "POST",
          body: JSON.stringify({
            productId,
            cityCode: city.code,
            cityName: city.fullName,
          }),
        });

        if (!response.ok) throw new Error("delivery preview failed");

        const data: PreviewResponse = await response.json();
        if (!alive) return;

        setPreview(data);
        saveCachedPreview(productId, city.code, data);
      } catch {
        if (!alive) return;
        setPreview(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadPreview();

    return () => {
      alive = false;
    };
  }, [city, productId]);

  useEffect(() => {
    if (!editing) return;

    const value = query.trim();
    if (value.length < 2) {
      setOptions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchCities(value);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [editing, query]);

  async function searchCities(value: string) {
    try {
      setCityLoading(true);
      const response = await apiFetch(
        `${API_URL}/api/delivery/cities/search?query=${encodeURIComponent(value)}&countryCode=RU`
      );

      if (!response.ok) throw new Error("city search failed");

      const data: CityOption[] = await response.json();
      setOptions(Array.isArray(data) ? data : []);
    } catch {
      setOptions([]);
    } finally {
      setCityLoading(false);
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
        <div>
          <span className={styles.deliveryPreviewLabel}>Ваш город</span>
          <strong>{cityLabel}</strong>
        </div>
        <button type="button" onClick={() => setEditing((value) => !value)}>
          Изменить
        </button>
      </div>

      {editing ? (
        <div className={styles.deliveryCitySearch}>
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
              <Icon name="store" size={18} strokeWidth={1.6} />
            </span>
            <span>Доставка в пункт выдачи</span>
          </div>
        ) : null}
        {pickupText ? (
          <div className={styles.deliveryPreviewItem}>
            <span className={styles.deliveryPreviewIcon}>
              <Icon name="store" size={18} strokeWidth={1.6} />
            </span>
            <span>
              Доставка {preview?.pickupPointCount ? `в один из ${preview.pickupPointCount} пунктов выдачи` : "в пункт выдачи"}
            </span>
            <strong>{pickupText}</strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}
