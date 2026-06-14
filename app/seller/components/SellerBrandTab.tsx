"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";

import type { SellerBrand, SellerBrandProfileRequest } from "../types";
import { emitSellerOnboardingChanged } from "../lib/sellerOnboardingEvents";
import {
  getSellerBrands,
  updateSellerBrandProfile,
} from "../lib/sellerBrandApi";

import styles from "./SellerBrandTab.module.css";

type FormState = {
  description: string;
  logoUrl: string;
  website: string;
  telegram: string;
  vk: string;
  country: string;
  foundationYear: string;
};

function toFormState(brand: SellerBrand): FormState {
  return {
    description: brand.description ?? "",
    logoUrl: brand.logoUrl ?? "",
    website: brand.website ?? "",
    telegram: brand.telegram ?? "",
    vk: brand.vk ?? "",
    country: brand.country ?? "",
    foundationYear: brand.foundationYear ? String(brand.foundationYear) : "",
  };
}

function toPayload(form: FormState): SellerBrandProfileRequest {
  const year = Number(form.foundationYear);

  return {
    description: form.description,
    logoUrl: form.logoUrl,
    website: form.website,
    telegram: form.telegram,
    vk: form.vk,
    country: form.country,
    foundationYear:
      form.foundationYear.trim() && Number.isFinite(year) ? year : null,
  };
}

export function SellerBrandTab() {
  const [brands, setBrands] = useState<SellerBrand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === selectedBrandId) ?? null,
    [brands, selectedBrandId]
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getSellerBrands()
      .then((data) => {
        if (cancelled) return;

        setBrands(data);

        const firstBrand = data[0] ?? null;
        setSelectedBrandId(firstBrand?.id ?? null);
        setForm(firstBrand ? toFormState(firstBrand) : null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function selectBrand(brandId: number) {
    const brand = brands.find((item) => item.id === brandId) ?? null;

    setSelectedBrandId(brand?.id ?? null);
    setForm(brand ? toFormState(brand) : null);
    setSaved(false);
    setError(null);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function save() {
    if (!selectedBrand || !form) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const updated = await updateSellerBrandProfile(
        selectedBrand.id,
        toPayload(form)
      );

      setBrands((prev) =>
        prev.map((brand) => (brand.id === updated.id ? updated : brand))
      );
      setForm(toFormState(updated));
      setSaved(true);
      emitSellerOnboardingChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonCard}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonGrid}>
            <div />
            <div />
            <div />
            <div />
          </div>
        </div>
      </section>
    );
  }

  if (brands.length === 0) {
    return (
      <section className={styles.page}>
        <div className={styles.header}>
          <div>
            <div className={styles.kicker}>Производитель</div>
            <h1 className={styles.title}>Профиль бренда</h1>
            <p className={styles.hint}>
              У вас пока нет привязанных брендов. Позже здесь будет форма заявки
              на добавление производителя на площадку.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!selectedBrand || !form) return null;

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>Производитель</div>
          <h1 className={styles.title}>Профиль бренда</h1>
          <p className={styles.hint}>
            Заполните данные производителя. Они будут использоваться на публичной
            странице бренда.
          </p>
        </div>

      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {saved ? <div className={styles.success}>Профиль сохранён</div> : null}

      <div className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Основная информация</h2>
            <p>Кратко расскажите о производителе и его происхождении.</p>
          </div>

          <div className={styles.formGrid}>
            <BrandField label="Бренд">
              <select
                className={styles.selectField}
                value={selectedBrand.id}
                onChange={(event) => selectBrand(Number(event.target.value))}
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </BrandField>

            <BrandField label="Страна">
              <input
                className={styles.input}
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
                placeholder="Россия"
              />
            </BrandField>

            <BrandField label="Год основания">
              <input
                className={styles.input}
                value={form.foundationYear}
                onChange={(event) =>
                  updateField("foundationYear", event.target.value)
                }
                inputMode="numeric"
                placeholder="2024"
              />
            </BrandField>

            <BrandField label="Логотип">
              <input
                className={styles.input}
                value={form.logoUrl}
                onChange={(event) => updateField("logoUrl", event.target.value)}
                placeholder="https://..."
              />
            </BrandField>

            <BrandField label="Описание">
              <textarea
                className={styles.textarea}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={7}
                placeholder="Расскажите о бренде, производстве, материалах и ценностях."
              />
            </BrandField>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Ссылки</h2>
            <p>Официальные каналы производителя.</p>
          </div>

          <div className={styles.formGrid}>
            <BrandField label="Сайт">
              <input
                className={styles.input}
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                placeholder="https://brand.ru"
              />
            </BrandField>

            <BrandField label="Telegram">
              <input
                className={styles.input}
                value={form.telegram}
                onChange={(event) => updateField("telegram", event.target.value)}
                placeholder="https://t.me/brand"
              />
            </BrandField>

            <BrandField label="VK">
              <input
                className={styles.input}
                value={form.vk}
                onChange={(event) => updateField("vk", event.target.value)}
                placeholder="https://vk.com/brand"
              />
            </BrandField>
          </div>
        </div>

        <div className={styles.actionsBar}>
          {selectedBrand.slug ? (
            <a
              href={`/brand/${selectedBrand.slug}`}
              className={styles.openLink}
              target="_blank"
            >
              Открыть страницу
            </a>
          ) : null}

          <Button variant="primary" onClick={() => void save()} disabled={saving}>
            Сохранить
          </Button>
        </div>
      </div>
    </section>
  );
}

function BrandField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.fieldWrap}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}
