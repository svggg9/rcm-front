"use client";

import { useId, useState } from "react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { FormSelect } from "../../components/ui/FormSelect";
import { NumericField } from "../../components/ui/NumericField";
import { InlineEditorGuard } from "../../components/ui/InlineEditorGuard";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { SettingsSection } from "../../components/ui/SettingsSection";
import { toast } from "../../components/ui/toast";
import { updateAdminNewArrivals } from "../lib/adminApi";
import type { AdminStorefrontHome } from "../types";
import { MAX_NEW_ARRIVALS_COUNT, normalizeNewArrivalsCount } from "../../lib/storefrontSettings";
import { stripInputWhitespace } from "../../lib/inputWhitespace";
import styles from "./AdminNewArrivals.module.css";

type Draft = { mode: "auto" | "collection"; collectionId: number | ""; count: string };
const MODES = [{ value: "auto", label: "Автоматически" }, { value: "collection", label: "Из подборки" }] as const;

export function AdminNewArrivals({ home, loading, onSaved }: {
  home: AdminStorefrontHome | null;
  loading: boolean;
  onSaved: (settings: Pick<AdminStorefrontHome, "newArrivalsCollectionId" | "newArrivalsCount">) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const selectionErrorId = useId();
  const savedId = home?.newArrivalsCollectionId ?? null;
  const savedCount = normalizeNewArrivalsCount(home?.newArrivalsCount);
  const current: Draft = draft ?? { mode: savedId === null ? "auto" : "collection", collectionId: savedId ?? "", count: String(savedCount) };
  const desiredId = current.mode === "auto" ? null : current.collectionId;
  const dirty = desiredId !== savedId || current.count !== String(savedCount);
  const selected = home?.collections.find(collection => collection.id === current.collectionId);
  const valid = current.mode === "auto" || Boolean(selected?.active && selected.products.length);
  const disabled = loading || saving || !home;

  async function save() {
    if (!dirty || disabled) return;
    const count = Number(current.count);
    if (!current.count || !Number.isInteger(count) || count < 1 || count > MAX_NEW_ARRIVALS_COUNT) {
      setCountError(`Укажите количество товаров от 1 до ${MAX_NEW_ARRIVALS_COUNT}`);
      return;
    }
    if (!valid || desiredId === "") {
      setSelectionError("Выберите опубликованную подборку с товарами");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAdminNewArrivals(desiredId, count);
      onSaved({ newArrivalsCollectionId: updated.newArrivalsCollectionId, newArrivalsCount: updated.newArrivalsCount });
      setDraft(null);
      toast.success("Настройки новинок сохранены");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить источник новинок");
    } finally { setSaving(false); }
  }

  return <div className={styles.section}>
    <InlineEditorGuard dirty={dirty} busy={saving} onDiscard={() => setDraft(null)} />
    <SettingsSection title="Новое на рцмаркет" description="Источник и количество товаров на главной странице">
      <div className={styles.countField}>
        <NumericField label="Количество товаров" value={current.count} fractionDigits={0} min={1} max={MAX_NEW_ARRIVALS_COUNT}
          required disabled={disabled} error={countError} hint="Если товаров меньше, покажем доступные"
          onChange={event => { setDraft({ ...current, count: stripInputWhitespace(event.target.value) }); setCountError(null); setError(null); }} />
      </div>
      <SegmentedControl items={MODES} value={current.mode} disabled={disabled} ariaLabel="Источник новинок"
        onChange={mode => { setDraft({ ...current, mode }); setError(null); setSelectionError(null); }} />
      {current.mode === "auto" ? <p className="textHint">Последние опубликованные товары по дате публикации</p> : <>
        <FormSelect<number> label="Подборка" value={current.collectionId} disabled={disabled} full
          invalid={Boolean(selectionError)} errorId={selectionError ? selectionErrorId : undefined}
          placeholder="Выберите опубликованную подборку"
          options={(home?.collections ?? []).map(collection => ({ value: collection.id, label: `${collection.title}${collection.active ? "" : " · Черновик"}`,
            disabled: !collection.active || !collection.products.length }))}
          onChange={collectionId => { setDraft({ ...current, mode: "collection", collectionId }); setError(null); setSelectionError(null); }} />
        {selectionError ? <div className="fieldError" id={selectionErrorId} role="alert">{selectionError}</div> : null}
        <p className="textHint">Состав и порядок товаров меняются в редакторе выбранной подборки ниже</p>
        {savedId !== null && !dirty && !valid ? <Banner tone="warning">Подборка скрыта или пуста — пока отображаются автоматические новинки</Banner> : null}
        {!home?.collections.some(collection => collection.active && collection.products.length) ? <p className="textHint">Создайте и опубликуйте подборку в разделе ниже</p> : null}
      </>}
      {error ? <Banner tone="danger" role="alert">{error}</Banner> : null}
      {dirty || saving ? <div className={styles.actions}>
        <Button disabled={saving} onClick={() => { setDraft(null); setError(null); setSelectionError(null); setCountError(null); }}>Отмена</Button>
        <Button variant="primary" loading={saving} disabled={disabled} onClick={() => void save()}>Сохранить</Button>
      </div> : null}
    </SettingsSection>
  </div>;
}
