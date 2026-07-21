"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";

import type { SellerBrand, SellerBrandProfileRequest } from "../types";
import { emitSellerOnboardingChanged } from "../lib/sellerOnboardingEvents";
import {
  updateSellerBrandProfile,
  uploadSellerBrandLogo,
} from "../lib/sellerBrandApi";

import { SellerTelegramCard } from "./SellerTelegramCard";
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

type Props = {
  initialBrands: SellerBrand[];
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

export function SellerBrandTab({ initialBrands }: Props) {
  const firstInitialBrand = initialBrands[0] ?? null;
  const [brands, setBrands] = useState<SellerBrand[]>(initialBrands);
  const [form, setForm] = useState<FormState | null>(
    firstInitialBrand ? toFormState(firstInitialBrand) : null
  );

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selectedBrand = brands[0] ?? null;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
    setDirty(true);
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
      setForm((prev) =>
        prev
          ? { ...prev, logoUrl: updated.logoUrl ?? "" }
          : toFormState(updated)
      );
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
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Бренд</h1>
            <p className={styles.hint}>
              К аккаунту пока не привязан бренд
            </p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <Icon name="store" size={28} />
          <strong>Профиль бренда недоступен</strong>
          <span>Обратитесь к администратору площадки</span>
        </div>
      </section>
    );
  }

  if (!selectedBrand || !form) return null;

  const completionFields = [
    form.name,
    form.logoUrl,
    form.description,
    form.country,
    form.foundationYear,
    form.website,
  ];
  const completion = Math.round(
    (completionFields.filter((value) => value.trim()).length /
      completionFields.length) *
      100
  );

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Бренд</h1>
          <p className={styles.hint}>
            Данные публичной страницы и каналы связи
          </p>
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
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <form
        className={styles.main}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <section className={styles.brandHero}>
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
                sizes="112px"
                className={styles.logoImage}
              />
            ) : (
              <span className={styles.logoPlaceholder}>
                {form.name.trim().slice(0, 1) || "R"}
              </span>
            )}
            <span className={styles.logoAction}>
              <Icon name="plus" size={14} />
              <span>{uploadingLogo ? "Загрузка" : "Изменить"}</span>
            </span>
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

          <div className={styles.brandSummary}>
            <span className={styles.summaryLabel}>Публичный профиль</span>
            <h2 className={styles.brandProfileTitle}>
              {form.name.trim() || "Название бренда"}
            </h2>
            <div className={styles.completion}>
              <div className={styles.completionHead}>
                <span>Готовность профиля</span>
                <strong>{completion}%</strong>
              </div>
              <div
                className={styles.progress}
                role="progressbar"
                aria-label="Готовность профиля бренда"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completion}
              >
                <span style={{ width: `${completion}%` }} />
              </div>
              <p>
                Чем полнее профиль, тем содержательнее страница бренда для покупателей
              </p>
            </div>
          </div>
        </section>

        <div className={styles.editorGrid}>
          <section className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <h2>О бренде</h2>
              <p>Эта информация отображается на публичной странице</p>
            </div>

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
                placeholder="Расскажите о бренде, производстве, материалах и ценностях"
              />
              <span className={styles.characterCount}>
                {form.description.length} / 1000
              </span>
            </BrandField>

            <div className={styles.twoColumns}>
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
                    updateField(
                      "foundationYear",
                      event.target.value.replace(/\D/g, "").slice(0, 4)
                    )
                  }
                  inputMode="numeric"
                  placeholder="2020"
                />
              </BrandField>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <h2>Публичные ссылки</h2>
              <p>Официальный сайт и социальные сети бренда</p>
            </div>

            <BrandField label="Сайт">
              <input
                className={styles.input}
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                placeholder="https://brand.ru"
              />
            </BrandField>

            <BrandField label="Telegram бренда">
              <input
                className={styles.input}
                value={form.telegram}
                onChange={(event) => updateField("telegram", event.target.value)}
                placeholder="https://t.me/brand"
              />
            </BrandField>

            <BrandField label="ВКонтакте">
              <input
                className={styles.input}
                value={form.vk}
                onChange={(event) => updateField("vk", event.target.value)}
                placeholder="https://vk.com/brand"
              />
            </BrandField>
          </section>
        </div>

        <section className={styles.telegramSection}>
          <SellerTelegramCard />
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

          <Button
            type="submit"
            variant="primaryShimmer"
            disabled={saving || !dirty}
          >
            Сохранить
          </Button>
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
