"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { EditorSurface } from "../../components/ui/EditorSurface";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { NumericField } from "../../components/ui/NumericField";
import { RequestError } from "../../components/ui/RequestError";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { SettingsSection } from "../../components/ui/SettingsSection";
import { Textarea } from "../../components/ui/Textarea";
import { TextInput } from "../../components/ui/TextInput";
import { toast } from "../../components/ui/toast";
import { toApiError } from "../../lib/apiErrors";
import { emitSellerOnboardingChanged } from "../lib/sellerOnboardingEvents";
import { emitSellerNavigationChanged } from "../lib/sellerNavigationEvents";
import { SellerBrandFileError, updateSellerBrandProfile, uploadSellerBrandWordmark } from "../lib/sellerBrandApi";
import type { SellerBrand, SellerBrandProfileRequest } from "../types";
import { SellerBrandImages } from "./SellerBrandImages";
import { SellerBrandPreview } from "./SellerBrandPreview";
import styles from "./SellerBrandTab.module.css";

type FormState = { description: string; country: string; foundationYear: string };
type Props = { initialBrands: SellerBrand[]; active?: boolean };
const toasterId = "seller-store";

function toFormState(brand: SellerBrand): FormState {
  return { description: brand.description ?? "", country: brand.country ?? "",
    foundationYear: brand.foundationYear ? String(brand.foundationYear) : "" };
}

function toPayload(form: FormState, brand: SellerBrand): SellerBrandProfileRequest {
  return {
    name: brand.name, description: form.description, country: form.country,
    foundationYear: form.foundationYear.trim() ? Number(form.foundationYear) : null,
    logoUrl: brand.logoUrl ?? "", wordmarkUrl: brand.wordmarkUrl ?? "",
    website: brand.website ?? "", telegram: brand.telegram ?? "", vk: brand.vk ?? "",
  };
}

function StoreWordmark({ src, name, className = "" }: { src?: string | null; name: string; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return <div className={`${styles.wordmark} ${className}`}>
    {src && failedSource !== src ? <Image src={src} alt={name} fill sizes="(max-width: 640px) 65vw, 280px"
      onError={() => setFailedSource(src)} /> : <span>{name}</span>}
  </div>;
}

export function SellerBrandTab({ initialBrands, active = true }: Props) {
  const [brand, setBrand] = useState<SellerBrand | null>(initialBrands[0] ?? null);
  const [form, setForm] = useState<FormState | null>(initialBrands[0] ? toFormState(initialBrands[0]) : null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [wordmarkError, setWordmarkError] = useState<string | null>(null);
  const [uploadingWordmark, setUploadingWordmark] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const wordmarkInput = useRef<HTMLInputElement>(null);
  const mutation = useRef<"profile" | "wordmark" | null>(null);
  const mounted = useRef(false);
  const original = brand ? toFormState(brand) : null;
  const dirty = Boolean(form && original && (form.description !== original.description
    || form.country !== original.country || form.foundationYear !== original.foundationYear));
  const busy = saving || uploadingWordmark || mediaBusy;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(false), 1500);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  function updateField(key: keyof FormState, value: string) {
    setSaveSuccess(false);
    setForm(current => current ? { ...current, [key]: value } : current);
  }

  function resetText() {
    if (!brand || busy) return;
    setForm(toFormState(brand));
    setProfileError(null);
    setSaveSuccess(false);
  }

  async function save() {
    if (!brand || !form || !dirty || busy || mutation.current) return;
    mutation.current = "profile";
    setSaving(true);
    try {
      const updated = await updateSellerBrandProfile(brand.id, toPayload(form, brand));
      if (!mounted.current) return;
      setBrand(updated);
      setForm(toFormState(updated));
      setProfileError(null);
      setSaveSuccess(true);
      toast.success("Изменения сохранены", { id: `seller-brand-${brand.id}-profile`, toasterId });
      emitSellerOnboardingChanged();
    } catch (error) {
      if (mounted.current) setProfileError(toApiError(error, "Не удалось сохранить изменения — попробуйте ещё раз").message);
    } finally {
      mutation.current = null;
      if (mounted.current) setSaving(false);
    }
  }

  async function uploadWordmark(file: File | null) {
    if (!brand || !file || busy || mutation.current) return;
    mutation.current = "wordmark";
    setUploadingWordmark(true);
    try {
      const updated = await uploadSellerBrandWordmark(brand.id, file);
      if (!mounted.current) return;
      setBrand(updated);
      setWordmarkError(null);
      toast.success("Логотип загружен", { id: `seller-brand-${brand.id}-wordmark`, toasterId });
      emitSellerNavigationChanged();
    } catch (error) {
      if (mounted.current) setWordmarkError(error instanceof SellerBrandFileError ? error.message
        : toApiError(error, "Не удалось загрузить логотип — попробуйте ещё раз").message);
    } finally {
      mutation.current = null;
      if (mounted.current) setUploadingWordmark(false);
      if (wordmarkInput.current) wordmarkInput.current.value = "";
    }
  }

  if (!active) return null;
  if (!brand || !form) return <section className={styles.emptyPage}>
    <SectionHeader title="Магазин" large />
    <EmptyState icon="store" title="Профиль бренда недоступен" text="Обратитесь в поддержку площадки" />
  </section>;

  const publicPath = brand.slug ? `/brand/${brand.slug}` : null;
  const showActions = dirty || saving || saveSuccess;
  const facts = [form.country, form.foundationYear ? `С ${form.foundationYear} года` : ""].filter(Boolean);

  return <>
    <EditorSurface title="Магазин" subtitle={brand.name} presentation="page" showBack={false}
      className={styles.page} dirty={dirty} busy={busy} guardNavigation toastId={toasterId}
      onDiscard={resetText} onClose={() => window.location.assign("/seller/home")}
      discardHint="Уже загруженные логотип и фотографии останутся на витрине"
      headerActions={<>
        {publicPath ? <a href={publicPath} target="_blank" rel="noreferrer" aria-label="Открыть витрину" className={styles.openLink}>
          <span className={styles.fullLinkLabel}>Открыть витрину</span><span className={styles.shortLinkLabel}>Витрина</span>
          <Icon name="arrow-up-right" size={18} /></a> : null}
        <Button variant="secondary" disabled={busy} onClick={() => setPreviewOpen(true)}>Предпросмотр</Button>
      </>}
      actions={showActions ? <div className={styles.saveBar} data-store-actions>
        <p className={styles.saveState} role="status">{saveSuccess ? "Изменения сохранены" : "Есть несохранённые изменения"}</p>
        <div className={styles.saveActions}>
          <Button variant="ghost" disabled={!dirty || busy} onClick={resetText}>Отменить</Button>
          <Button type="submit" form="seller-brand-profile" variant="primary" loading={saving} success={saveSuccess}
            disabled={!dirty || uploadingWordmark || mediaBusy}>Сохранить изменения</Button>
        </div>
      </div> : undefined}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <form id="seller-brand-profile" onSubmit={event => { event.preventDefault(); void save(); }}>
            <SettingsSection title="О бренде">
              <fieldset className={styles.fields} disabled={saving}>
                <Textarea label="Описание" value={form.description} rows={5} maxLength={1000}
                  placeholder="Расскажите о бренде и его товарах" onChange={event => updateField("description", event.target.value)} />
                <p className={styles.characterCount}>{form.description.length} / 1000</p>
                <div className={styles.detailsGrid}>
                  <TextInput label="Страна" value={form.country} maxLength={120} autoComplete="off"
                    onChange={event => updateField("country", event.target.value)} />
                  <NumericField label="Год основания" fractionDigits={0} max={9999} maxLength={4}
                    value={form.foundationYear} onChange={event => updateField("foundationYear", event.target.value)} />
                </div>
              </fieldset>
              {profileError ? <RequestError variant="inline" message={profileError} /> : null}
            </SettingsSection>
          </form>
          <SettingsSection title="Текстовый логотип" description="В шапке витрины вместо названия бренда"
            actions={<span className={styles.autoSave}>Сохраняется сразу</span>}>
            <div className={styles.logoEditor}>
              <div className={styles.wordmarkStage}><StoreWordmark src={brand.wordmarkUrl} name={brand.name} /></div>
              <div className={styles.logoControls}>
                <Button variant="secondary" onClick={() => wordmarkInput.current?.click()} disabled={saving || mediaBusy}
                  loading={uploadingWordmark} aria-label={brand.wordmarkUrl ? "Заменить текстовый логотип" : "Загрузить текстовый логотип"}>
                  {brand.wordmarkUrl ? "Заменить логотип" : "Загрузить логотип"}</Button>
                <p className={styles.caption}>SVG или WebP до 2 МБ</p>
              </div>
            </div>
            {wordmarkError ? <RequestError variant="inline" message={wordmarkError} /> : null}
            <input ref={wordmarkInput} type="file" accept=".svg,.webp,image/svg+xml,image/webp"
              className="visuallyHidden" tabIndex={-1} aria-label="Файл текстового логотипа"
              onChange={event => void uploadWordmark(event.target.files?.[0] ?? null)} />
            <p className={styles.caption}>Без логотипа отображается название бренда · Название меняет администратор площадки</p>
          </SettingsSection>
          <div className={styles.gallerySection}>
            <SellerBrandImages key={brand.id} brandId={brand.id} embedded onBusyChange={setMediaBusy} />
          </div>
        </div>
        <aside className={styles.previewAside} aria-label="Профиль на витрине">
          <h2 className={styles.previewTitle}>На витрине</h2>
          <div className={styles.previewCard}>
            <StoreWordmark src={brand.wordmarkUrl} name={brand.name} className={styles.previewWordmark} />
            <p className={styles.previewBrandName}>{brand.name}</p>
            <p className={`${styles.previewDescription} ${!form.description.trim() ? styles.placeholder : ""}`}>
              {form.description.trim() || "Здесь появится описание бренда"}</p>
            {facts.length ? <p className={styles.previewFacts}>{facts.join(" | ")}</p> : null}
            <Button variant="ghost" disabled={busy} onClick={() => setPreviewOpen(true)} className={styles.previewButton}>
              Посмотреть витрину<Icon name="arrow-up-right" size={18} /></Button>
          </div>
          <p className={styles.previewHint}>{dirty ? "Изменения текста ещё не сохранены" : "Так покупатели видят профиль бренда"}</p>
        </aside>
      </div>
    </EditorSurface>
    {previewOpen ? <SellerBrandPreview brandId={brand.id} name={brand.name} wordmarkUrl={brand.wordmarkUrl ?? ""}
      description={form.description} country={form.country} foundationYear={form.foundationYear} dirty={dirty}
      onClose={() => setPreviewOpen(false)} /> : null}
  </>;
}
