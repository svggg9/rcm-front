"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";

import type { SellerBrand, SellerBrandProfileRequest } from "../types";
import { emitSellerOnboardingChanged } from "../lib/sellerOnboardingEvents";
import {
  getSellerBrands,
  updateSellerBrandProfile,
  uploadSellerBrandLogo,
} from "../lib/sellerBrandApi";

import styles from "./SellerBrandTab.module.css";

type FormState = {
  name: string;
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
    name: brand.name ?? "",
    description: brand.description ?? "",
    logoUrl: brand.logoUrl ?? "",
    website: brand.website ?? "",
    telegram: brand.telegram ?? "",
    vk: brand.vk ?? "",
    country: brand.country ?? "",
    foundationYear: brand.foundationYear ? String(brand.foundationYear) : "",
  };
}

function toPayload(
  form: FormState,
  selectedBrand: SellerBrand
): SellerBrandProfileRequest {
  const year = Number(form.foundationYear);

  return {
    name: selectedBrand.name,
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

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

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function uploadLogo(file: File | null) {
    if (!selectedBrand || !form || !file) return;

    setUploadingLogo(true);
    setError(null);
    setSaved(false);

    try {
      const updated = await uploadSellerBrandLogo(selectedBrand.id, file);

      setBrands((prev) =>
        prev.map((brand) => (brand.id === updated.id ? updated : brand))
      );
      setForm(toFormState(updated));
      emitSellerOnboardingChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить логотип");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  }

  async function save() {
    if (!selectedBrand || !form) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const updated = await updateSellerBrandProfile(
        selectedBrand.id,
        toPayload(form, selectedBrand)
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

      <div className={styles.main}>
        <div className={styles.brandProfileCard}>
          <button
            type="button"
            className={styles.logoButton}
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            aria-label="Загрузить логотип"
          >
            {form.logoUrl ? (
              <Image
                src={form.logoUrl}
                alt=""
                fill
                sizes="84px"
                className={styles.logoImage}
              />
            ) : (
              <span className={styles.logoPlaceholder}>
                {form.name.trim().slice(0, 1) || "R"}
              </span>
            )}
          </button>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className={styles.logoInput}
            onChange={(event) =>
              void uploadLogo(event.target.files?.[0] ?? null)
            }
          />

          <div className={styles.brandProfileInfo}>
            <div className={styles.brandProfileTitle}>
              {form.name.trim() || "Название бренда"}
            </div>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Основная информация</h2>
            <p>Кратко расскажите о производителе и его происхождении.</p>
          </div>

          <div className={styles.verticalForm}>
            <BrandField label="Название">
              <input
                className={`${styles.input} ${styles.inputReadonly}`}
                value={form.name}
                disabled
                placeholder="Название"
              />
            </BrandField>

            <BrandField label="Описание">
              <textarea
                className={styles.textarea}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={4}
                maxLength={1000}
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
                placeholder="brand.ru"
              />
            </BrandField>

            <BrandField label="Telegram">
              <input
                className={styles.input}
                value={form.telegram}
                onChange={(event) => updateField("telegram", event.target.value)}
                placeholder="@username"
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

          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={saving || saved}
          >
            {saved ? "Сохранено" : "Сохранить"}
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
