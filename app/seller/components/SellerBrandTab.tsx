"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";

import type {
  SellerBrand,
  SellerBrandProfileRequest,
} from "../types";
import { emitSellerOnboardingChanged } from "../lib/sellerOnboardingEvents";
import {
  updateSellerBrandProfile,
  uploadSellerBrandWordmark,
} from "../lib/sellerBrandApi";

import styles from "./SellerBrandTab.module.css";
import { SellerBrandImages } from "./SellerBrandImages";
import { SellerStorefrontCollections } from "./SellerStorefrontCollections";

type FormState = {
  name: string;
  description: string;
  logoUrl: string;
  wordmarkUrl: string;
  website: string;
  telegram: string;
  vk: string;
  country: string;
  foundationYear: string;
};

type Props = {
  initialBrands: SellerBrand[];
};

function toFormState(brand: SellerBrand): FormState {
  return {
    name: brand.name ?? "",
    description: brand.description ?? "",
    logoUrl: brand.logoUrl ?? "",
    wordmarkUrl: brand.wordmarkUrl ?? "",
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
    wordmarkUrl: form.wordmarkUrl,
    website: form.website,
    telegram: form.telegram,
    vk: form.vk,
    country: form.country,
    foundationYear:
      form.foundationYear.trim() && Number.isFinite(year) ? year : null,
  };
}

export function SellerBrandTab({ initialBrands }: Props) {
  const firstInitialBrand = initialBrands[0] ?? null;
  const [brands, setBrands] = useState<SellerBrand[]>(initialBrands);
  const [form, setForm] = useState<FormState | null>(
    firstInitialBrand ? toFormState(firstInitialBrand) : null
  );

  const [saving, setSaving] = useState(false);
  const [uploadingWordmark, setUploadingWordmark] = useState(false);
  const wordmarkInputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selectedBrand = brands[0] ?? null;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
    setDirty(true);
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
      setDirty(false);
      emitSellerOnboardingChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  }

  if (brands.length === 0) {
    return (
      <section className={styles.page}>
        <div className={styles.emptyState}>
          <Icon name="store" size={28} />
          <strong>Профиль бренда недоступен</strong>
          <span>Обратитесь к администратору площадки</span>
        </div>
      </section>
    );
  }

  async function uploadWordmark(file: File | null) {
    if (!selectedBrand || !form || !file) return;

    setUploadingWordmark(true);
    setError(null);

    try {
      const updated = await uploadSellerBrandWordmark(selectedBrand.id, file);
      setBrands((prev) =>
        prev.map((brand) => (brand.id === updated.id ? updated : brand))
      );
      setForm((prev) =>
        prev
          ? { ...prev, wordmarkUrl: updated.wordmarkUrl ?? "" }
          : toFormState(updated)
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось загрузить вордмарк бренда"
      );
    } finally {
      setUploadingWordmark(false);
      if (wordmarkInputRef.current) wordmarkInputRef.current.value = "";
    }
  }

  if (!selectedBrand || !form) return null;

  return (
    <section className={styles.page}>
      {error ? <div className={styles.error}>{error}</div> : null}

      <form
        className={styles.main}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <header className={styles.pageHeader}>
          <div>
            <span className={styles.pageKicker}>Витрина магазина</span>
            <h1>{form.name}</h1>
            <p>Настройте публичную страницу бренда.</p>
          </div>

          <div className={styles.headerActions}>
            {selectedBrand.slug ? (
              <a
                href={`/brand/${selectedBrand.slug}`}
                className={styles.openLink}
                target="_blank"
                rel="noreferrer"
              >
                Открыть витрину
              </a>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !dirty}
            >
              Сохранить
            </Button>
          </div>
        </header>

        <div className={styles.saveState} aria-live="polite">
          {saved ? (
            <>
              <Icon name="check-circle" size={16} />
              <span>Изменения сохранены</span>
            </>
          ) : dirty ? (
            <span>Есть несохранённые изменения</span>
          ) : null}
        </div>

        <section className={styles.profileSection}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>01</span>
            <div>
              <h2>Профиль бренда</h2>
              <p>Название, описание и контакты для покупателей.</p>
            </div>
          </div>

          <div className={styles.profileGrid}>
            <div className={styles.wordmarkCard}>
              <div className={styles.wordmarkStage}>
                <span className={styles.summaryLabel}>Вордмарк</span>
                <div className={styles.brandProfileTitle}>
                  {form.wordmarkUrl ? (
                    <span className={styles.wordmarkPreview}>
                      <Image
                        src={form.wordmarkUrl}
                        alt={form.name}
                        fill
                        sizes="360px"
                      />
                    </span>
                  ) : (
                    form.name.trim() || "Название бренда"
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                className={styles.wordmarkButton}
                onClick={() => wordmarkInputRef.current?.click()}
                disabled={uploadingWordmark}
              >
                {uploadingWordmark ? "Загрузка" : "Загрузить вордмарк"}
              </Button>
              <p className={styles.wordmarkHint}>
                SVG или WebP до 2 МБ. Используется в шапке публичной страницы.
              </p>
              <input
                ref={wordmarkInputRef}
                type="file"
                accept=".svg,.webp,image/svg+xml,image/webp"
                className={styles.logoInput}
                onChange={(event) =>
                  void uploadWordmark(event.target.files?.[0] ?? null)
                }
              />
            </div>

            <div className={styles.formSection}>
              <BrandField label="Название">
                <input
                  className={`${styles.input} ${styles.inputReadonly}`}
                  value={form.name}
                  disabled
                />
              </BrandField>

              <BrandField label="Описание">
                <textarea
                  className={styles.textarea}
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  rows={5}
                  maxLength={1000}
                  placeholder="Расскажите о стиле, истории и идее бренда"
                />
              </BrandField>

              <div className={styles.detailsGrid}>
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
                      updateField("foundationYear", event.target.value.replace(/\D/g, ""))
                    }
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="2024"
                  />
                </BrandField>
                <BrandField label="Сайт">
                  <input
                    className={styles.input}
                    value={form.website}
                    onChange={(event) => updateField("website", event.target.value)}
                    placeholder="https://example.ru"
                  />
                </BrandField>
                <BrandField label="Telegram">
                  <input
                    className={styles.input}
                    value={form.telegram}
                    onChange={(event) => updateField("telegram", event.target.value)}
                    placeholder="@brand"
                  />
                </BrandField>
                <BrandField label="ВКонтакте">
                  <input
                    className={styles.input}
                    value={form.vk}
                    onChange={(event) => updateField("vk", event.target.value)}
                    placeholder="vk.com/brand"
                  />
                </BrandField>
              </div>
            </div>
          </div>
        </section>

        <SellerBrandImages brandId={selectedBrand.id} />
        <SellerStorefrontCollections brandId={selectedBrand.id} />
      </form>
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
