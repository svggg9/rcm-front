"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { DesignSystemIcon } from "../../components/ui/DesignSystemIcon";
import { TextInput } from "../../components/ui/TextInput";
import { NumericField } from "../../components/ui/NumericField";
import { Textarea } from "../../components/ui/Textarea";
import { toast } from "../../components/ui/toast";

import type {
  SellerBrand,
  SellerBrandProfileRequest,
} from "../types";
import { emitSellerOnboardingChanged } from "../lib/sellerOnboardingEvents";
import { emitSellerNavigationChanged } from "../lib/sellerNavigationEvents";
import {
  updateSellerBrandProfile,
  uploadSellerBrandWordmark,
} from "../lib/sellerBrandApi";

import styles from "./SellerBrandTab.module.css";
import { SellerBrandImages } from "./SellerBrandImages";
import { SellerBrandPreview } from "./SellerBrandPreview";

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadingWordmark, setUploadingWordmark] = useState(false);
  const wordmarkInputRef = useRef<HTMLInputElement | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const pageRef = useRef<HTMLElement | null>(null);
  const saveBarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(false), 1500);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  const selectedBrand = brands[0] ?? null;
  const originalForm = selectedBrand ? toFormState(selectedBrand) : null;
  const dirty = Boolean(form && originalForm && (
    form.description !== originalForm.description ||
    form.country !== originalForm.country ||
    form.foundationYear !== originalForm.foundationYear
  ));

  useEffect(() => {
    const page = pageRef.current;
    const bar = saveBarRef.current;
    if (!page || !bar) return;
    const rootStyle = document.documentElement.style;
    const previousToastOffset = rootStyle.getPropertyValue("--store-toast-offset");
    const previousToastOffsetPriority = rootStyle.getPropertyPriority("--store-toast-offset");
    const measure = () => {
      const height = `${bar.getBoundingClientRect().height}px`;
      page.style.setProperty("--store-actions-height", height);
      rootStyle.setProperty("--store-toast-offset", height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      if (previousToastOffset) rootStyle.setProperty("--store-toast-offset", previousToastOffset, previousToastOffsetPriority);
      else rootStyle.removeProperty("--store-toast-offset");
    };
  }, [selectedBrand?.id]);

  useEffect(() => {
    if (!dirty && !saving && !uploadingWordmark) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, saving, uploadingWordmark]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function resetText() {
    if (!selectedBrand || saving || uploadingWordmark) return;
    setForm(toFormState(selectedBrand));
  }

  async function save() {
    if (!selectedBrand || !form || saving || uploadingWordmark || saveSuccess) return;

    setSaving(true);
    const toastId = `seller-brand-${selectedBrand.id}-profile`;

    try {
      const updated = await updateSellerBrandProfile(
        selectedBrand.id,
        toPayload(form, selectedBrand)
      );

      setBrands((prev) =>
        prev.map((brand) => (brand.id === updated.id ? updated : brand))
      );
      setForm(toFormState(updated));
      setSaveSuccess(true);
      toast.success("Изменения сохранены", { id: toastId, description: undefined, action: undefined });
      emitSellerOnboardingChanged();
    } catch (e) {
      toast.error("Не удалось сохранить текст магазина", {
        id: toastId,
        description: e instanceof Error ? e.message : undefined,
      });
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
    const toastId = `seller-brand-${selectedBrand.id}-wordmark`;

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
      toast.success("Текстовый логотип загружен", { id: toastId, description: undefined, action: undefined });
      emitSellerNavigationChanged();
    } catch (e) {
      toast.error("Не удалось загрузить текстовый логотип", {
        id: toastId,
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setUploadingWordmark(false);
      if (wordmarkInputRef.current) wordmarkInputRef.current.value = "";
    }
  }

  if (!selectedBrand || !form) return null;

  return (
    <section className={styles.page} ref={pageRef}>
        <header className={styles.pageHeader}>
          <div className={styles.brandIdentity}>
            <h1>
              {form.wordmarkUrl ? (
                <span className={styles.headerWordmark}>
                  <Image src={form.wordmarkUrl} alt={form.name} fill
                    sizes="(max-width: 640px) 288px, 280px" />
                </span>
              ) : form.name}
            </h1>
            <p className={styles.identityHint}>Название меняет администратор площадки</p>
          </div>
          <div className={styles.headerActions}>
            <Button type="button" variant="ghost" disabled={saving || uploadingWordmark}
              onClick={() => setPreviewOpen(true)}>Предпросмотр</Button>
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
          </div>
        </header>
        <form id="seller-brand-profile" className={styles.settingsForm}
          onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <fieldset className={styles.formSection} disabled={saving}>
              <Textarea label="О бренде"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  rows={4}
                  maxLength={1000}
              />

              <div className={styles.detailsGrid}>
                  <TextInput label="Страна"
                    value={form.country}
                    onChange={(event) => updateField("country", event.target.value)}
                  />
                  <NumericField label="Год основания" fractionDigits={0} max={9999}
                    value={form.foundationYear}
                    onChange={(event) =>
                      updateField("foundationYear", event.target.value)
                    }
                    maxLength={4}
                  />

              </div>
            </fieldset>
        </form>

        <div className={styles.appearanceLayout}>
            <div className={styles.wordmarkCard}>
              <h2>Текстовый логотип</h2>
              <div className={styles.wordmarkStage}>
                <div className={styles.brandProfileTitle}>
                  {form.wordmarkUrl ? (
                    <span className={styles.wordmarkPreview}>
                      <Image
                        src={form.wordmarkUrl}
                        alt={form.name}
                        fill
                        sizes="220px"
                      />
                    </span>
                  ) : (
                    form.name.trim() || "Название бренда"
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="utility"
                className={styles.wordmarkButton}
                onClick={() => wordmarkInputRef.current?.click()}
                disabled={saving}
                loading={uploadingWordmark}
                reserveLabelSpace
                aria-label={form.wordmarkUrl ? "Заменить текстовый логотип" : "Загрузить текстовый логотип"}
              >
                {form.wordmarkUrl ? "Заменить" : "Загрузить"}
              </Button>
              <p className={`${styles.wordmarkHint} ${styles.mediaMeta}`}>
                SVG или WebP до 2 МБ
              </p>
              <p className={styles.wordmarkHint}>В шапке витрины. Без файла — название бренда.</p>
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


            <SellerBrandImages brandId={selectedBrand.id} embedded />
        </div>
        <Banner tone="info" title="Логотип и фотографии сохраняются сразу">
          Порядок и удаление фотографий — тоже.
        </Banner>
        <footer ref={saveBarRef} className={styles.saveBar} data-store-actions>
          <div className={styles.saveActions}>
            <Button type="submit" form="seller-brand-profile" variant="primary"
              loading={saving} success={saveSuccess} reserveLabelSpace
              disabled={uploadingWordmark || saveSuccess}>Сохранить текст</Button>
            <Button type="button" variant="secondary" disabled={!dirty || saving || uploadingWordmark}
              onClick={resetText}>Отменить правки</Button>
          </div>
          <p className={styles.saveState} role="status">{dirty ? "Есть несохранённые правки текста" : ""}</p>
        </footer>
        {previewOpen && <SellerBrandPreview brandId={selectedBrand.id} name={form.name}
          country={form.country} foundationYear={form.foundationYear}
          description={form.description} wordmarkUrl={form.wordmarkUrl} onClose={() => setPreviewOpen(false)} />}
    </section>
  );
}
