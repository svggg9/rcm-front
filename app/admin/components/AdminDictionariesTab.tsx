"use client";
import { ConfirmActionButton } from "../../components/ui/ConfirmActionButton";

import { useId, useMemo, useRef, useState, type FormEvent } from "react";

import { Button } from "../../components/ui/Button";
import { CabinetPanel } from "../../components/ui/CabinetPanel";
import type { CabinetTabItem } from "../../components/ui/CabinetTabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { FormSelect } from "../../components/ui/FormSelect";
import { Dialog } from "../../components/ui/Dialog";
import { Icon } from "../../components/ui/Icon";
import { NumericField } from "../../components/ui/NumericField";
import { TextInput } from "../../components/ui/TextInput";
import { RequestError } from "../../components/ui/RequestError";
import { buildCategoryTree, normalizeCategories, eligibleCategoryParents, MAX_CATEGORY_DEPTH, type CategoryOption, type CategoryNode } from "../../lib/categories";
import { StatusBadge, type StatusBadgeTone } from "../../components/ui/StatusBadge";
import type { DictionaryItem, DictionaryKind } from "../types";

import styles from "./AdminDictionariesTab.module.css";

type DictionaryView = "categories" | "sizes" | "audience";

type Props = {
  categories: DictionaryItem[];
  sizes: DictionaryItem[];
  actionKey: string | null;
  categoryError?: string | null;
  onRetryCategories?: () => void;
  onCreate: (kind: DictionaryKind, item: Partial<DictionaryItem>) => Promise<void>;
  onUpdate: (
    kind: DictionaryKind,
    id: number,
    item: Partial<DictionaryItem>
  ) => Promise<void>;
  onDelete: (kind: DictionaryKind, id: number) => Promise<void>;
};

const audienceItems: DictionaryItem[] = [
  { id: 1, name: "Для него", slug: "MEN", isActive: true },
  { id: 2, name: "Для неё", slug: "WOMEN", isActive: true },
  { id: 3, name: "Для всех", slug: "UNISEX", isActive: true },
];

const dictionaryTabs: Array<CabinetTabItem<DictionaryView>> = [
  { value: "categories", label: "Категории" },
  { value: "sizes", label: "Размеры" },
  { value: "audience", label: "Аудитория" },
];

export function AdminDictionariesTab({
  categories,
  sizes,
  actionKey,
  categoryError,
  onRetryCategories,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [activeView, setActiveView] = useState<DictionaryView>("categories");

  return (
    <CabinetPanel
      items={dictionaryTabs}
      value={activeView}
      onChange={setActiveView}
      ariaLabel="Справочники"
    >
      {dictionaryTabs.map((tab) => {
        const panelItems =
          tab.value === "categories"
            ? categories
            : tab.value === "sizes"
              ? sizes
              : audienceItems;

        return (
          <div key={tab.value} hidden={activeView !== tab.value}>
            <DictionaryPanel
              kind={tab.value}
              items={panelItems}
              actionKey={actionKey}
              categoryError={categoryError}
              onRetryCategories={onRetryCategories}
              onCreate={onCreate}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        );
      })}
    </CabinetPanel>
  );
}

function DictionaryPanel({
  kind,
  items,
  actionKey,
  categoryError,
  onRetryCategories,
  onCreate,
  onUpdate,
  onDelete,
}: {
  kind: DictionaryView;
  items: DictionaryItem[];
  actionKey: string | null;
  categoryError?: string | null;
  onRetryCategories?: () => void;
  onCreate: Props["onCreate"];
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
}) {
  if (kind === "categories") {
    return <CategoryDictionary items={items} actionKey={actionKey} error={categoryError} onRetry={onRetryCategories} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} />;
  }
  return (
    <div className={styles.panel}>
      {kind !== "audience" ? (
        <DictionaryCreateForm
          kind={kind}
          items={items}
          actionKey={actionKey}
          onCreate={onCreate}
        />
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon="list"
          title="Справочник пуст"
          text="Добавьте первое значение через форму выше"
        />
      ) : (
        <div className={styles.flatList}>
          {items.map((item) => (
            <DictionaryRow
              key={`${kind}-${item.id}`}
              kind={kind}
              item={item}
              displayName={item.name}
              existingItems={items}
              editable={kind !== "audience"}
              actionKey={actionKey}
              onUpdate={onUpdate}
              onDelete={onDelete}
              standalone
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DictionaryCreateForm({
  kind,
  items,
  actionKey,
  onCreate,
}: {
  kind: "sizes";
  items: DictionaryItem[];
  actionKey: string | null;
  onCreate: Props["onCreate"];
}) {
  const [name, setName] = useState("");
  const cleanName = name.trim();
  const duplicate = items.some(
    (item) => normalizeName(item.name) === normalizeName(cleanName)
  );
  const validationMessage = duplicate ? "Такое значение уже существует" : null;
  const canSubmit = Boolean(cleanName) && !validationMessage;
  const creating = actionKey === `${kind}:create`;
  const actionInFlight = actionKey !== null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || actionInFlight) return;

    try {
      await onCreate(kind, {
        name: cleanName,
        sortOrder: items.length,
        isActive: true,
      });
      setName("");
    } catch {
      // Глобальное сообщение об ошибке показывает AdminPageClient.
    }
  }

  return (
    <form
      className={`${styles.createForm} ${styles.simpleForm}`}
      onSubmit={submit}
    >
      <label className={styles.field} data-ui="field">
        <span className={styles.required}>Название</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
        />
        {validationMessage ? (
          <small className={styles.fieldError}>{validationMessage}</small>
        ) : null}
      </label>

      <Button
        type="submit"
        variant="primary"
        className={styles.createButton}
        disabled={!canSubmit || (actionInFlight && !creating)}
        loading={creating}
      >
        Добавить
      </Button>
    </form>
  );
}

function CategoryDictionary({
  items,
  actionKey,
  onCreate,
  onUpdate,
  onDelete,
  error,
  onRetry,
}: {
  items: DictionaryItem[];
  actionKey: string | null;
  onCreate: Props["onCreate"];
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
  error?: string | null;
  onRetry?: () => void;
}) {
  const categories = useMemo(() => normalizeCategories(items), [items]);
  const roots = useMemo(() => buildCategoryTree(categories), [categories]);
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set(categories.filter((category) => category.parentId === null).map((category) => category.id)));
  const [editor, setEditor] = useState<{ item?: CategoryOption; parentId: number | null } | null>(null);
  const treeId = useId();
  const cleanQuery = normalizeName(query);
  const matches = (node: CategoryNode): boolean => normalizeName(node.name).includes(cleanQuery) || node.children.some(matches);
  const visibleRoots = roots.filter(matches);
  const busy = actionKey !== null || !!error;

  function toggleExpanded(id: number) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function renderNode(node: CategoryNode, depth = 0) {
    const children = node.children.filter(matches);
    const expanded = Boolean(cleanQuery) || !collapsed.has(node.id);
    const status = !node.isActive ? "Отключена" : !node.effectiveActive ? "Скрыта родителем" : "Активна";
    const affected = node.subtreeProductCount ?? node.productCount ?? 0;
    return <section key={node.id} className={depth ? styles.categoryBranch : styles.categoryGroup}>
      <div className={styles.categoryRow} data-disabled={!node.effectiveActive || undefined}>
        {node.children.length ? <button type="button" className={styles.treeToggle} aria-expanded={expanded}
          aria-controls={`${treeId}-${node.id}`} aria-label={`${expanded ? "Свернуть" : "Развернуть"} ${node.label}`}
          onClick={() => toggleExpanded(node.id)}><Icon name={expanded ? "chevron-down" : "chevron-right"} /></button> : <span className={styles.treeToggleSpace} />}
        <div className={styles.categoryIdentity}>
          <strong>{node.label}</strong>
          <span>{productCountLabel(node.productCount ?? 0)}{node.children.length ? ` | В ветке ${productCountLabel(affected)}` : ""} | Порядок {node.sortOrder ?? 0}</span>
          {!node.isActive || !node.effectiveActive ? <small>{!node.isActive ? "Товары доступны, новые назначения запрещены" : "Включится в навигации после включения родителя"}</small> : null}
        </div>
        <StatusBadge tone={node.effectiveActive ? "success" : "default"}>{status}</StatusBadge>
        <div className={styles.categoryActions}>
          {depth + 1 < MAX_CATEGORY_DEPTH ? <Button variant="utility" className={styles.rowButton} disabled={busy}
            onClick={() => setEditor({ parentId: node.id })}>Подкатегория</Button> : null}
          <Button variant="secondary" className={styles.rowButton} disabled={busy}
            onClick={() => setEditor({ item: node, parentId: node.parentId })}>Изменить</Button>
          <ConfirmActionButton variant="secondary" className={styles.rowButton} disabled={busy} loading={actionKey === `categories:${node.id}`}
            requireConfirmation={node.isActive} confirmTitle={`Отключить «${node.label}»?`} confirmLabel="Отключить"
            confirmText={`Ветка исчезнет из навигации и станет недоступна для новых назначений. Связанных товаров: ${affected}. Уже опубликованные товары останутся доступны — при необходимости перенесите их в другую категорию. Настройки включения подкатегорий сохранятся`}
            onConfirm={async () => {
              setActionError(null);
              if (node.isActive) { await onDelete("categories", node.id); return; }
              try {
                await onUpdate("categories", node.id, { name: node.label, parentId: node.parentId, sortOrder: node.sortOrder, isActive: true });
              } catch (reason) {
                setActionError(reason instanceof Error ? reason.message : "Не удалось включить категорию");
                throw reason;
              }
            }}>{node.isActive ? "Отключить" : "Включить"}</ConfirmActionButton>
        </div>
      </div>
      {children.length ? <div id={`${treeId}-${node.id}`} className={styles.categoryChildren} hidden={!expanded}>
        {children.map((child) => renderNode(child, depth + 1))}
      </div> : null}
    </section>;
  }

  return <div className={styles.panel}>
    {error ? <RequestError variant="inline" message={error} onRetry={onRetry} loading={actionKey === "categories:refresh"} /> : null}
    {actionError && !error ? <RequestError variant="inline" message={actionError} /> : null}
    <div className={styles.categoryToolbar}>
      <TextInput label="Поиск категорий" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder="Название категории или раздела" fieldVariant="boxed" />
      <Button variant="primary" disabled={busy} onClick={() => setEditor({ parentId: null })}>Добавить категорию</Button>
    </div>
    <div className={styles.categoryTools}>
      <span>{categories.length} категорий</span>
      <button type="button" disabled={!!cleanQuery} onClick={() => setCollapsed(new Set())}>Развернуть все</button>
      <button type="button" disabled={!!cleanQuery} onClick={() => setCollapsed(new Set(categories.filter((item) => item.parentId === null).map((item) => item.id)))}>Свернуть все</button>
    </div>
    {!categories.length ? <EmptyState title="Категорий пока нет" text="Добавьте основной раздел, затем его подкатегории" /> :
      !visibleRoots.length ? <EmptyState title="Категории не найдены" text="Попробуйте другое название" /> :
        <div className={styles.categoryList}>{visibleRoots.map((node) => renderNode(node))}</div>}
    {editor ? <CategoryEditor key={editor.item?.id ?? `new-${editor.parentId}`} item={editor.item} parentId={editor.parentId}
      categories={categories} busy={busy} onClose={() => setEditor(null)}
      onSave={async (payload) => {
        if (editor.item) await onUpdate("categories", editor.item.id, payload); else await onCreate("categories", payload);
        setEditor(null);
      }} /> : null}
  </div>;
}

function CategoryEditor({ item, parentId: initialParentId, categories, busy, onClose, onSave }: {
  item?: CategoryOption; parentId: number | null; categories: CategoryOption[]; busy: boolean;
  onClose: () => void; onSave: (payload: Partial<DictionaryItem>) => Promise<void>;
}) {
  const [name, setName] = useState(item?.label ?? "");
  const [parentId, setParentId] = useState<number | "root">(initialParentId ?? "root");
  const [order, setOrder] = useState<number | null>(item?.sortOrder ?? categories.filter((category) => category.parentId === initialParentId).length);
  const [error, setError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const inFlight = useRef(false);
  const formId = useId();
  const cleanName = name.trim().replace(/\s+/g, " ");
  const nextParent = parentId === "root" ? null : parentId;
  const eligibleParents = eligibleCategoryParents(categories, item?.id);
  const duplicate = categories.some((category) => category.id !== item?.id && category.parentId === nextParent && normalizeName(category.label) === normalizeName(cleanName));
  const nameError = cleanName.includes("/") ? "Введите только название, раздел выберите отдельно" : duplicate ? "В этом разделе уже есть такая категория" : cleanName.length > 120 ? "Не больше 120 символов" : null;
  const parentAvailable = nextParent === null || eligibleParents.some((category) => category.id === nextParent);
  const valid = !!cleanName && !nameError && parentAvailable && order !== null && Number.isInteger(order) && order >= 0 && order <= 2147483647;
  const dirty = name !== (item?.label ?? "") || nextParent !== initialParentId || order !== (item?.sortOrder ?? categories.filter((category) => category.parentId === initialParentId).length);
  function close() { if (!busy && !inFlight.current) { if (dirty) setDiscard(true); else onClose(); } }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try { await onSave({ name: cleanName, parentId: nextParent, sortOrder: order, isActive: item?.isActive ?? true }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось сохранить категорию"); }
    finally { inFlight.current = false; }
  }
  return <>
    <Dialog title={item ? "Изменить категорию" : "Добавить категорию"} busy={busy} onClose={close}
      actions={<><Button disabled={busy} onClick={close}>Отмена</Button><Button variant="primary" type="submit" form={formId} loading={busy} disabled={!valid}>Сохранить</Button></>}>
      <form id={formId} className={styles.categoryEditor} onSubmit={(event) => void submit(event)}>
        <TextInput label="Название" fieldVariant="boxed" value={name} required autoFocus autoComplete="off" maxLength={120}
          error={nameError} disabled={busy} onChange={(event) => { setName(event.target.value); setError(null); }} />
        <FormSelect<number | "root"> label="Расположение" value={parentId} disabled={busy}
          options={[{ value: "root", label: "Основная категория" }, ...eligibleParents.map((category) => ({ value: category.id, label: `${category.name}${category.effectiveActive ? "" : " — скрыта"}` }))]}
          onChange={(value) => { if (value !== "") { setParentId(value); setError(null); } }} />
        {nextParent !== null && eligibleParents.some((category) => category.id === nextParent && !category.effectiveActive) ? <p className={styles.categoryHint}>Родительская категория скрыта — эта категория тоже не появится в навигации</p> : null}
        <NumericField label="Порядок в разделе" fieldVariant="boxed" fractionDigits={0} min={0} max={2147483647}
          value={order} onValueChange={setOrder} required disabled={busy} hint="Меньшее число — выше в списке" />
        {item && !item.effectiveActive ? <p className={styles.categoryHint}>Ветка скрыта из навигации, товары остаются доступны</p> : null}
        {error ? <RequestError variant="inline" message={error} /> : null}
      </form>
    </Dialog>
    {discard ? <Dialog variant="confirmation" title="Закрыть без сохранения?" busy={busy} onClose={() => setDiscard(false)}
      actions={<><Button onClick={() => setDiscard(false)}>Продолжить редактирование</Button><Button variant="primary" onClick={onClose}>Закрыть</Button></>}>
      <p>Внесённые изменения не сохранятся</p>
    </Dialog> : null}
  </>;
}

function DictionaryRow({
  kind,
  item,
  displayName,
  existingItems,
  editable,
  nested = false,
  standalone = false,
  actionKey,
  onUpdate,
  onDelete,
}: {
  kind: "sizes" | "audience";
  item: DictionaryItem;
  displayName: string;
  existingItems: DictionaryItem[];
  editable: boolean;
  nested?: boolean;
  standalone?: boolean;
  actionKey: string | null;
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const status = getDictionaryStatus(item);
  const busy = actionKey === `${kind}:${item.id}`;
  const actionInFlight = actionKey !== null;
  const cleanName = name.trim();
  const duplicate = existingItems.some(
    (existing) =>
      existing.id !== item.id &&
      normalizeName(existing.name) === normalizeName(cleanName)
  );
  const validationMessage = duplicate ? "Такое значение уже существует" : null;

  async function save() {
    if (
      !editable ||
      kind === "audience" ||
      !cleanName ||
      validationMessage
    ) {
      return;
    }

    try {
      await onUpdate(kind, item.id, {
        name: cleanName,
        sortOrder: item.sortOrder ?? 0,
        isActive: item.isActive ?? true,
      });
      setEditing(false);
    } catch {
      // Оставляем введённое значение для повторной попытки.
    }
  }

  async function toggleActive() {
    if (kind === "audience" || busy) return;

    try {
      if (item.isActive === false) {
        await onUpdate(kind, item.id, {
          name: item.name,
          sortOrder: item.sortOrder ?? 0,
          isActive: true,
        });
      } else {
        await onDelete(kind, item.id);
      }
    } catch {
      // Глобальное сообщение об ошибке показывает AdminPageClient.
    }
  }

  return (
    <div
      className={`${styles.row} ${nested ? styles.nestedRow : ""} ${
        standalone ? styles.standaloneRow : ""
      } ${editing ? styles.editingRow : ""}`}
      data-disabled={item.isActive === false || undefined}
    >
      {editing ? (
        <label className={`${styles.field} ${styles.editField}`} data-ui="field">
          <span>Название</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setEditing(false);
                setName(displayName);
              }
            }}
          />
          {validationMessage ? (
            <small className={styles.fieldError}>{validationMessage}</small>
          ) : null}
        </label>
      ) : (
        <div className={styles.identity}>
          <span>{nested ? "Подкатегория" : "Название"}</span>
          <strong>{displayName}</strong>
          {item.slug ? <small>{item.slug}</small> : null}
        </div>
      )}

      <div className={styles.status}>
        <StatusBadge tone={status.tone} size="regular">
          {status.label}
        </StatusBadge>
      </div>

      {editable && kind !== "audience" ? (
        <div className={styles.actions}>
          {editing ? (
            <>
              <Button
                type="button"
                variant="primary"
                className={styles.rowButton}
                disabled={
                  !cleanName ||
                  Boolean(validationMessage) ||
                  (actionInFlight && !busy)
                }
                loading={busy}
                onClick={() => void save()}
              >
                Сохранить
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={styles.rowButton}
                disabled={actionInFlight}
                onClick={() => {
                  setEditing(false);
                  setName(displayName);
                }}
              >
                Отмена
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                className={styles.rowButton}
                disabled={actionInFlight}
                onClick={() => {
                  setName(displayName);
                  setEditing(true);
                }}
              >
                Изменить
              </Button>
              <ConfirmActionButton
                type="button"
                variant={item.isActive === false ? "secondary" : "danger"}
                className={styles.rowButton}
                disabled={actionInFlight && !busy}
                loading={busy}
                requireConfirmation={item.isActive !== false}
                confirmTitle={`Отключить «${displayName}»?`}
                confirmText="Значение станет недоступно для выбора"
                confirmLabel="Отключить"
                onConfirm={toggleActive}
              >
                {item.isActive === false ? "Включить" : "Отключить"}
              </ConfirmActionButton>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function getDictionaryStatus(item: DictionaryItem): {
  label: string;
  tone: StatusBadgeTone;
} {
  const rawStatus = item.status ?? item.moderationStatus;

  if (rawStatus === "MODERATION") {
    return { label: "На модерации", tone: "warning" };
  }

  if (item.isActive === false || rawStatus === "DISABLED") {
    return { label: "Выключено", tone: "default" };
  }

  return { label: "Активно", tone: "success" };
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function productCountLabel(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  const word = lastTwo >= 11 && lastTwo <= 14 ? "товаров" : last === 1 ? "товар" : last >= 2 && last <= 4 ? "товара" : "товаров";
  return `${count} ${word}`;
}
