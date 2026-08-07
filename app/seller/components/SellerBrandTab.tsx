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
        <div className={styles.brandColumns}>
          <div className={styles.profileColumn}>
            <section className={styles.brandHero}>
              <div className={styles.brandSummary}>
                <span className={styles.summaryLabel}>Публичный профиль</span>
                <h2 className={styles.brandProfileTitle}>
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
                </h2>
                <Button
                  type="button"
                  variant="primaryShimmer"
                  className={styles.wordmarkButton}
                  onClick={() => wordmarkInputRef.current?.click()}
                  disabled={uploadingWordmark}
                >
                  {uploadingWordmark ? "Загрузка" : "Загрузить вордмарк"}
                </Button>
                <div className={styles.wordmarkHint}>
                  <span>
                    Фирменное написание названия бренда для публичной страницы.
                    SVG или WebP до 2 МБ.
                  </span>
                  <span className={styles.wordmarkExample}>
                    <span>Пример</span>
                    <Image
                      src="/examples/versace-wordmark.svg"
                      alt=""
                      width={159}
                      height={27}
                      aria-hidden="true"
                    />
                  </span>
                </div>
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
            </section>

            <section className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <h2>О бренде</h2>
              </div>

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
                  rows={4}
                  maxLength={1000}
                />
              </BrandField>
            </section>

            <div className={styles.actionsBar}>
              <div className={styles.saveState} aria-live="polite">
                {saved ? (
                  <>
                    <Icon name="check" size={15} />
                    <span>Изменения сохранены</span>
                  </>
                ) : dirty ? (
                  <span>Есть несохраненные изменения</span>
                ) : null}
              </div>

              {selectedBrand.slug ? (
                <a
                  href={`/brand/${selectedBrand.slug}`}
                  className={styles.openLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Открыть страницу</span>
                  <Icon name="arrow-up-right" size={16} />
                </a>
              ) : null}

              <Button
                type="submit"
                variant="primaryShimmer"
                disabled={saving || !dirty}
              >
                Сохранить
              </Button>
            </div>
          </div>

          <div className={styles.storefrontColumn}>
            <SellerBrandImages brandId={selectedBrand.id} />
            <SellerStorefrontCollections
              brandId={selectedBrand.id}
            />
          </div>
        </div>
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
