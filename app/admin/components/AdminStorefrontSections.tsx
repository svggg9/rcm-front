"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { ConfirmActionButton } from "../../components/ui/ConfirmActionButton";
import { EditorSurface, requestEditorNavigation } from "../../components/ui/EditorSurface";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { FormSelect } from "../../components/ui/FormSelect";
import { Icon } from "../../components/ui/Icon";
import { Loader } from "../../components/ui/Loader";
import { RequestError } from "../../components/ui/RequestError";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { SettingsSection } from "../../components/ui/SettingsSection";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { StorefrontSectionCard } from "../../components/ui/StorefrontSectionCard";
import { toast } from "../../components/ui/toast";
import { normalizeCategories, type CategoryOption } from "../../lib/categories";
import { getImageUploadMetadataError, PHOTO_FILE_ACCEPT } from "../../lib/imageUploadPolicy";
import { deleteAdminStorefrontSection, getAdminDictionary, reorderAdminStorefrontSections, saveAdminStorefrontSection } from "../lib/adminApi";
import type { AdminStorefrontCollection, AdminStorefrontSection, AdminStorefrontSectionRequest } from "../types";
import styles from "./AdminStorefrontSections.module.css";

type Props = {
  initialSections: AdminStorefrontSection[];
  collections: AdminStorefrontCollection[];
  loading: boolean;
  onSectionsChange: (sections: AdminStorefrontSection[]) => void;
  onMutationComplete?: () => void;
};

const KINDS = [{ value: "CATEGORY", label: "Категория" }, { value: "COLLECTION", label: "Подборка" }] as const;
const STATUSES = [{ value: "draft", label: "Черновик" }, { value: "published", label: "Опубликован" }] as const;

export function AdminStorefrontSections({ initialSections: sections, collections, loading, onSectionsChange, onMutationComplete }: Props) {
  const [editing, setEditing] = useState<AdminStorefrontSection | "new" | null>(null);
  const [mutation, setMutation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const disabled = loading || mutation !== null;

  async function mutate<T,>(key: string, action: () => Promise<T>): Promise<T> {
    if (inFlight.current) throw new Error("Дождитесь завершения текущего действия");
    inFlight.current = true;
    setMutation(key);
    setError(null);
    try { return await action(); }
    finally { inFlight.current = false; setMutation(null); }
  }

  async function save(id: number | null, payload: AdminStorefrontSectionRequest) {
    await mutate("save", async () => {
      const updated = await saveAdminStorefrontSection(id, payload);
      onSectionsChange(id === null ? [...sections, updated] : sections.map(section => section.id === id ? updated : section));
      onMutationComplete?.();
      toast.success("Раздел сохранён");
    });
  }

  async function move(index: number, offset: number) {
    if (disabled || index + offset < 0 || index + offset >= sections.length) return;
    const ids = sections.map(section => section.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    try {
      await mutate(`order:${sections[index].id}:${offset}`, async () => {
        onSectionsChange(await reorderAdminStorefrontSections(ids));
        onMutationComplete?.();
      });
      toast.success("Порядок разделов сохранён");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось изменить порядок разделов"); }
  }

  return <SettingsSection title="Разделы на главной" description="Категории и подборки с собственными обложками в общем порядке"
    actions={<Button disabled={disabled} startIcon={<Icon name="plus" size={18} />} onClick={() => setEditing("new")}>Добавить раздел</Button>}>
    {loading ? <Loader label="Загрузка разделов" /> : sections.length ? <ul className={styles.list}>
      {sections.map((section, index) => <li key={section.id} className={styles.item}>
        <div className={styles.preview}>
          <StorefrontSectionCard title={section.title} coverImageUrl={section.coverImageUrl}
            coverPositionX={section.coverPositionX} coverPositionY={section.coverPositionY} sizes="160px" />
        </div>
        <div className={styles.details}>
          <div className={styles.badges}><span className="textHint">{section.kind === "CATEGORY" ? "Категория" : "Подборка"}</span>
            <StatusBadge tone={section.active && section.available ? "success" : "default"}>{section.active ? "Опубликован" : "Черновик"}</StatusBadge></div>
          {!section.available ? <p className="textHint">Раздел скрыт или недоступен — на главной не показывается</p> : null}
          {section.active && !section.coverImageUrl ? <p className="textHint">Добавьте обложку для показа на главной</p> : null}
          <div className={styles.controls}>
            <Button variant="ghost" disabled={disabled || index === 0} loading={mutation === `order:${section.id}:-1`} className={styles.iconButton}
              aria-label={`Поднять ${section.title}`} title="Поднять" onClick={() => void move(index, -1)}><Icon name="chevron-up" size={20} /></Button>
            <Button variant="ghost" disabled={disabled || index === sections.length - 1} loading={mutation === `order:${section.id}:1`} className={styles.iconButton}
              aria-label={`Опустить ${section.title}`} title="Опустить" onClick={() => void move(index, 1)}><Icon name="chevron-down" size={20} /></Button>
            <Button variant="ghost" disabled={disabled} className={styles.iconButton} aria-label={`Редактировать ${section.title}`}
              title="Редактировать" onClick={() => setEditing(section)}><Icon name="pencil" size={20} /></Button>
            <ConfirmActionButton variant="ghost" confirmVariant="danger" disabled={disabled} className={styles.iconButton} aria-label={`Удалить ${section.title}`} title="Удалить"
              confirmTitle="Удалить раздел с главной?" confirmText="Категория или подборка и её товары сохранятся"
              onConfirm={async () => { await mutate(`delete:${section.id}`, async () => {
                await deleteAdminStorefrontSection(section.id);
                onSectionsChange(sections.filter(item => item.id !== section.id));
                onMutationComplete?.();
                toast.success("Раздел удалён с главной");
              }); }}><Icon name="trash" size={20} /></ConfirmActionButton>
          </div>
        </div>
      </li>)}
    </ul> : <EmptyState title="Добавьте первый раздел" text="Выберите категорию или подборку и загрузите её обложку" />}
    {error ? <Banner tone="danger">{error}</Banner> : null}
    {editing ? <SectionEditor key={editing === "new" ? "new" : editing.id} section={editing === "new" ? null : editing}
      sections={sections} collections={collections} busy={mutation === "save"} onClose={() => setEditing(null)} onSave={save} /> : null}
  </SettingsSection>;
}

function SectionEditor({ section, sections, collections, busy, onClose, onSave }: {
  section: AdminStorefrontSection | null;
  sections: AdminStorefrontSection[];
  collections: AdminStorefrontCollection[];
  busy: boolean;
  onClose: () => void;
  onSave: (id: number | null, payload: AdminStorefrontSectionRequest) => Promise<void>;
}) {
  const [kind, setKind] = useState<AdminStorefrontSection["kind"]>(section?.kind ?? "CATEGORY");
  const [targetId, setTargetId] = useState<number | "">(section?.targetId ?? "");
  const [active, setActive] = useState(section?.active ?? false);
  const [x, setX] = useState(section?.coverPositionX ?? 50);
  const [y, setY] = useState(section?.coverPositionY ?? 50);
  const [file, setFile] = useState<File | undefined>();
  const [removeCover, setRemoveCover] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const formId = useId();
  const targetErrorId = useId();
  const fileErrorId = useId();

  useEffect(() => {
    let mounted = true;
    setCategoriesError(null);
    void getAdminDictionary("categories").then(items => {
      if (mounted) setCategories(normalizeCategories(items));
    }).catch(reason => { if (mounted) setCategoriesError(reason instanceof Error ? reason.message : "Не удалось загрузить категории"); });
    return () => { mounted = false; };
  }, [retry]);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const dirty = kind !== (section?.kind ?? "CATEGORY") || targetId !== (section?.targetId ?? "") ||
    active !== (section?.active ?? false) || x !== (section?.coverPositionX ?? 50) || y !== (section?.coverPositionY ?? 50) ||
    Boolean(file) || Boolean(removeCover && section?.coverImageUrl);
  const imageUrl = previewUrl ?? (removeCover ? null : section?.coverImageUrl ?? null);
  const targetCategory = kind === "CATEGORY" ? categories?.find(category => category.id === targetId) : undefined;
  const targetCollection = kind === "COLLECTION" ? collections.find(collection => collection.id === targetId) : undefined;
  const title = targetCategory?.label ?? targetCollection?.title ?? (section?.kind === kind && section?.targetId === targetId ? section.title : "Обложка раздела");
  const available = kind === "CATEGORY" ? Boolean(targetCategory?.effectiveActive) : Boolean(targetCollection?.active && targetCollection.products.length);
  const duplicate = sections.some(item => item.id !== section?.id && item.kind === kind && item.targetId === targetId);
  const categoryLoading = kind === "CATEGORY" && categories === null && !categoriesError;
  const options = kind === "CATEGORY" ? (categories ?? []).map(category => ({ value: category.id,
    label: `${category.name}${category.effectiveActive ? "" : " — скрыта"}` })) : collections.map(collection => ({ value: collection.id,
    label: `${collection.title}${collection.active ? "" : " — черновик"}` }));
  if (targetId !== "" && !options.some(option => option.value === targetId)) options.push({ value: targetId, label: section?.title ?? "Недоступный раздел" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || inFlight.current) return;
    setFieldError(null); setFileError(null); setError(null);
    if (targetId === "") { setFieldError("Выберите раздел"); return; }
    if (duplicate) { setFieldError("Этот раздел уже добавлен на главную"); return; }
    if (active && !available) { setFieldError("Для публикации выберите доступную категорию или опубликованную подборку с товарами"); return; }
    if (active && !imageUrl && !file) { setFileError("Загрузите обложку для публикации"); return; }
    inFlight.current = true;
    try {
      await onSave(section?.id ?? null, { kind, targetId, active, coverPositionX: x, coverPositionY: y, removeCover, file });
      requestEditorNavigation(onClose, { completed: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось сохранить раздел"); }
    finally { inFlight.current = false; }
  }

  return <EditorSurface compact centered title={section ? "Редактировать раздел" : "Добавить раздел"} dirty={dirty} busy={busy} guardNavigation onClose={onClose}
    actions={<><Button type="button" disabled={busy} onClick={() => requestEditorNavigation(onClose)}>Отмена</Button>
      <Button type="submit" form={formId} variant="primary" loading={busy} disabled={!dirty || categoryLoading}>Сохранить</Button></>}>
    <form id={formId} className={styles.editor} onSubmit={event => void submit(event)}>
      <SegmentedControl items={KINDS} value={kind} ariaLabel="Тип раздела" disabled={busy} onChange={value => {
        setKind(value); setTargetId(""); setFieldError(null); setError(null);
      }} />
      {categoryLoading ? <Loader inline label="Загрузка категорий" /> : categoriesError && kind === "CATEGORY" ?
        <RequestError variant="inline" message={categoriesError} onRetry={() => setRetry(value => value + 1)} /> : null}
      <FormSelect<number> label={kind === "CATEGORY" ? "Категория" : "Подборка"} value={targetId} options={options}
        disabled={busy || categoryLoading || Boolean(kind === "CATEGORY" && categoriesError)} required full
        placeholder={kind === "CATEGORY" ? "Выберите категорию" : "Выберите подборку"}
        invalid={Boolean(fieldError)} errorId={fieldError ? targetErrorId : undefined}
        onChange={value => { setTargetId(value); setFieldError(null); setError(null); }} />
      {fieldError ? <p id={targetErrorId} className="fieldError" role="alert">{fieldError}</p> : null}
      {!collections.length && kind === "COLLECTION" ? <p className="textHint">Сначала создайте подборку в разделе ниже</p> : null}
      <div className={styles.coverLayout}>
        <div className={styles.coverPreview}><StorefrontSectionCard title={title} coverImageUrl={imageUrl}
          coverPositionX={x} coverPositionY={y} sizes="240px" /></div>
        <div className={styles.coverControls}>
          <p className="label">Обложка</p>
          <p className="textHint">JPEG, PNG или WebP до 10 МБ · Лучше вертикальное фото</p>
          <div className={styles.fileActions}>
            <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>{imageUrl ? "Заменить обложку" : "Загрузить обложку"}</Button>
            {imageUrl || file ? <Button type="button" variant="ghost" disabled={busy} onClick={() => { setFile(undefined); setRemoveCover(true); setFileError(null); }}>Убрать обложку</Button> : null}
          </div>
          <input ref={inputRef} type="file" accept={PHOTO_FILE_ACCEPT} className={styles.fileInput} disabled={busy}
            aria-label="Файл обложки" aria-invalid={Boolean(fileError)} aria-describedby={fileError ? fileErrorId : undefined}
            onChange={event => {
              const selected = event.target.files?.[0]; event.currentTarget.value = "";
              if (!selected) return;
              const validation = getImageUploadMetadataError(selected);
              if (validation) { setFileError(validation); return; }
              setFile(selected); setRemoveCover(false); setX(50); setY(50); setFileError(null); setError(null);
            }} />
          {fileError ? <p id={fileErrorId} className="fieldError" role="alert">{fileError}</p> : null}
          {imageUrl ? <>
            <Field label={`Кадр по горизонтали — ${x}%`} controlId={`${formId}-cover-x`}><input id={`${formId}-cover-x`} type="range" min={0} max={100} step={1} value={x} disabled={busy}
              onChange={event => setX(Number(event.target.value))} className={styles.slider} /></Field>
            <Field label={`Кадр по вертикали — ${y}%`} controlId={`${formId}-cover-y`}><input id={`${formId}-cover-y`} type="range" min={0} max={100} step={1} value={y} disabled={busy}
              onChange={event => setY(Number(event.target.value))} className={styles.slider} /></Field>
            <Button type="button" variant="ghost" disabled={busy || (x === 50 && y === 50)} onClick={() => { setX(50); setY(50); }}>По центру</Button>
          </> : null}
        </div>
      </div>
      <SegmentedControl items={STATUSES} value={active ? "published" : "draft"} ariaLabel="Публикация раздела" disabled={busy}
        onChange={value => { setActive(value === "published"); setFieldError(null); setFileError(null); }} />
      <p className="textHint">На главной показываются опубликованные разделы с обложкой и доступным содержимым</p>
      {error ? <Banner tone="danger">{error}</Banner> : null}
    </form>
  </EditorSurface>;
}
