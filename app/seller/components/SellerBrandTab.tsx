"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import { DesignSystemIcon } from "../../components/ui/DesignSystemIcon";
import { TextInput } from "../../components/ui/TextInput";
import { Textarea } from "../../components/ui/Textarea";
import { scrollToFirstValidationError } from "../../lib/formValidation";

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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const pageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(false), 1500);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  const selectedBrand = brands[0] ?? null;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
    setDirty(true);
  }

  async function save() {
    if (!selectedBrand || !form || saving || uploadingWordmark || saveSuccess) return;

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
      setSaveSuccess(true);
      setDirty(false);
      emitSellerOnboardingChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить профиль");
      scrollToFirstValidationError({ root: pageRef.current });
    } finally {
      setSaving(false);
    }
  }

  if (brands.length === 0) {
    return (
      <section className={styles.page}>
        <div className={styles.emptyState}>
          <DesignSystemIcon name="store" role="empty" />
          <strong>Профиль бренда недоступен</strong>
          <span>Обратитесь к администратору площадки</span>
        </div>
      </section>
    );
  }

  async function uploadWordmark(file: File | null) {
    if (!selectedBrand || !form || !file || saving || uploadingWordmark) return;

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
        e instanceof Error
          ? e.message
          : "Не удалось загрузить текстовый логотип бренда"
      );
    } finally {
      setUploadingWordmark(false);
      if (wordmarkInputRef.current) wordmarkInputRef.current.value = "";
    }
  }

  if (!selectedBrand || !form) return null;

  return (
    <section className={styles.page} ref={pageRef}>
        <header className={styles.pageHeader}>
          <div>
            <span className={styles.pageKicker}>Витрина магазина</span>
            <h1>{form.name}</h1>
            <p>Настройте публичную страницу бренда</p>
          </div>

          <div className={styles.headerActions}>
            {selectedBrand.slug ? (
              <a
                href={`/brand/${selectedBrand.slug}`}
                className={`buttonSecondary ${styles.openLink}`}
                target="_blank"
                rel="noreferrer"
              >
                Открыть витрину
              </a>
            ) : null}
            <Button
              type="submit"
              form="seller-brand-profile"
              variant="primary"
              loading={saving}
              success={saveSuccess}
              reserveLabelSpace
              disabled={uploadingWordmark || saveSuccess}
            >
              Сохранить
            </Button>
          </div>
        </header>
        {error ? <div className={styles.error} role="alert" data-validation-error="true" tabIndex={-1}>{error}</div> : null}
        {saved ? <div className={styles.success} role="status"><DesignSystemIcon name="check-circle" /><span>Изменения сохранены</span></div> : null}
        {dirty ? <p className={styles.saveState} role="status">Есть несохранённые изменения</p> : null}

        <form id="seller-brand-profile" className={styles.profileSection}
          onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Профиль бренда</h2>
              <p>Название, описание и контакты для покупателей</p>
            </div>
          </div>

          <div className={styles.profileGrid}>
            <div className={styles.wordmarkCard}>
              <div className={styles.wordmarkStage}>
                <span className={styles.summaryLabel}>Текстовый логотип</span>
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
                disabled={saving}
                loading={uploadingWordmark}
                reserveLabelSpace
              >
                Загрузить текстовый логотип
              </Button>
              <p className={styles.wordmarkHint}>
                SVG или WebP до 2 МБ — для шапки публичной страницы
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

            <fieldset className={styles.formSection} disabled={saving}>
              <TextInput label="Название" value={form.name} readOnly className={styles.inputReadonly} />
              <Textarea label="Описание"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  rows={5}
                  maxLength={1000}
                  hint="Расскажите о стиле, истории и идее бренда"
              />

              <div className={styles.detailsGrid}>
                  <TextInput label="Страна"
                    value={form.country}
                    onChange={(event) => updateField("country", event.target.value)}
                  />
                  <TextInput label="Год основания"
                    value={form.foundationYear}
                    onChange={(event) =>
                      updateField("foundationYear", event.target.value.replace(/\D/g, ""))
                    }
                    inputMode="numeric"
                    maxLength={4}
                  />
                  <TextInput label="Сайт"
                    value={form.website}
                    onChange={(event) => updateField("website", event.target.value)}
                    placeholder="https://example.ru"
                  />
                  <TextInput label="Telegram"
                    value={form.telegram}
                    onChange={(event) => updateField("telegram", event.target.value)}
                    placeholder="@brand"
                  />
                  <TextInput label="ВКонтакте"
                    value={form.vk}
                    onChange={(event) => updateField("vk", event.target.value)}
                    placeholder="vk.com/brand"
                  />
              </div>
            </fieldset>
          </div>
        </form>

        <SellerBrandImages brandId={selectedBrand.id} />
    </section>
  );
}
