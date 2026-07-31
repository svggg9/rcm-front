"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Button } from "../../components/ui/Button";
import { CabinetTabs, type CabinetTabItem } from "../../components/ui/CabinetTabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { FormSelect } from "../../components/ui/FormSelect";
import { StatusBadge, type StatusBadgeTone } from "../../components/ui/StatusBadge";
import type { DictionaryItem, DictionaryKind } from "../types";

import styles from "./AdminDictionariesTab.module.css";

type DictionaryView = "categories" | "sizes" | "audience";
type EditableDictionaryView = Exclude<DictionaryView, "audience">;

type Props = {
  categories: DictionaryItem[];
  sizes: DictionaryItem[];
  actionKey: string | null;
  onCreate: (kind: DictionaryKind, item: Partial<DictionaryItem>) => Promise<void>;
  onUpdate: (
    kind: DictionaryKind,
    id: number,
    item: Partial<DictionaryItem>
  ) => Promise<void>;
  onDelete: (kind: DictionaryKind, id: number) => Promise<void>;
};

type CategoryGroup = {
  name: string;
  root: DictionaryItem | null;
  children: Array<{ item: DictionaryItem; label: string }>;
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
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [activeView, setActiveView] = useState<DictionaryView>("categories");

  return (
    <section className={styles.page}>
      <div className={styles.tabs}>
        <CabinetTabs
          items={dictionaryTabs}
          value={activeView}
          onChange={setActiveView}
          ariaLabel="Справочники"
          appearance="line"
        />
      </div>

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
              onCreate={onCreate}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        );
      })}
    </section>
  );
}

function DictionaryPanel({
  kind,
  items,
  actionKey,
  onCreate,
  onUpdate,
  onDelete,
}: {
  kind: DictionaryView;
  items: DictionaryItem[];
  actionKey: string | null;
  onCreate: Props["onCreate"];
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
}) {
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
          text="Добавьте первое значение через форму выше."
        />
      ) : kind === "categories" ? (
        <CategoryDictionary
          items={items}
          actionKey={actionKey}
          onUpdate={onUpdate}
          onDelete={onDelete}
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
  kind: EditableDictionaryView;
  items: DictionaryItem[];
  actionKey: string | null;
  onCreate: Props["onCreate"];
}) {
  const [name, setName] = useState("");
  const [categoryMode, setCategoryMode] = useState<"category" | "subcategory">(
    "category"
  );
  const [parentCategory, setParentCategory] = useState("");
  const parentCategories = useMemo(
    () =>
      kind === "categories"
        ? items.filter(
            (item) =>
              !item.name.includes("/") &&
              item.isActive !== false &&
              item.status !== "DISABLED"
          )
        : [],
    [items, kind]
  );
  const cleanName = name.trim();
  const needsParent = kind === "categories" && categoryMode === "subcategory";
  const proposedName = needsParent ? `${parentCategory} / ${cleanName}` : cleanName;
  const hasSeparator = kind === "categories" && cleanName.includes("/");
  const duplicate = items.some(
    (item) => normalizeName(item.name) === normalizeName(proposedName)
  );
  const validationMessage = hasSeparator
    ? "Символ / используется для связи с основной категорией"
    : duplicate
      ? "Такое значение уже существует"
      : null;
  const canSubmit =
    Boolean(cleanName) &&
    (!needsParent || Boolean(parentCategory)) &&
    !validationMessage;
  const creating = actionKey === `${kind}:create`;
  const actionInFlight = actionKey !== null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || actionInFlight) return;

    try {
      await onCreate(kind, {
        name: needsParent ? `${parentCategory} / ${cleanName}` : cleanName,
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
      className={`${styles.createForm} ${
        kind === "categories" ? styles.categoryForm : styles.simpleForm
      } ${needsParent ? styles.subcategoryForm : ""}`}
      onSubmit={submit}
    >
      {kind === "categories" ? (
        <FormSelect<"category" | "subcategory">
          label="Тип"
          value={categoryMode}
          options={[
            { value: "category", label: "Категория" },
            { value: "subcategory", label: "Подкатегория" },
          ]}
          onChange={(value) => {
            const nextMode = value || "category";
            setCategoryMode(nextMode);
            if (nextMode === "category") setParentCategory("");
          }}
        />
      ) : null}

      {needsParent ? (
        <FormSelect<string>
          label="Основная категория"
          value={parentCategory}
          options={parentCategories.map((category) => ({
            value: category.name,
            label: category.name,
          }))}
          required
          onChange={setParentCategory}
        />
      ) : null}

      <label className={styles.field}>
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
  onUpdate,
  onDelete,
}: {
  items: DictionaryItem[];
  actionKey: string | null;
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
}) {
  const groups = useMemo(() => groupCategories(items), [items]);

  return (
    <div className={styles.categoryList}>
      {groups.map((group) => (
        <section className={styles.categoryGroup} key={group.name}>
          {group.root ? (
            <DictionaryRow
              kind="categories"
              item={group.root}
              displayName={group.root.name}
              existingItems={items}
              editable
              actionKey={actionKey}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ) : (
            <div className={styles.virtualRoot}>
              <span>Основная категория</span>
              <strong>{group.name}</strong>
            </div>
          )}

          {group.children.length ? (
            <div className={styles.children}>
              {group.children.map(({ item, label }) => (
                <DictionaryRow
                  key={item.id}
                  kind="categories"
                  item={item}
                  displayName={label}
                  existingItems={items}
                  namePrefix={group.name}
                  editable
                  nested
                  actionKey={actionKey}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function DictionaryRow({
  kind,
  item,
  displayName,
  existingItems,
  namePrefix,
  editable,
  nested = false,
  standalone = false,
  actionKey,
  onUpdate,
  onDelete,
}: {
  kind: DictionaryView;
  item: DictionaryItem;
  displayName: string;
  existingItems: DictionaryItem[];
  namePrefix?: string;
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
  const proposedName = namePrefix ? `${namePrefix} / ${cleanName}` : cleanName;
  const hasSeparator = kind === "categories" && cleanName.includes("/");
  const duplicate = existingItems.some(
    (existing) =>
      existing.id !== item.id &&
      normalizeName(existing.name) === normalizeName(proposedName)
  );
  const validationMessage = hasSeparator
    ? "Символ / используется для связи с основной категорией"
    : duplicate
      ? "Такое значение уже существует"
      : null;

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
        name: namePrefix ? `${namePrefix} / ${cleanName}` : cleanName,
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
        <label className={`${styles.field} ${styles.editField}`}>
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
              <Button
                type="button"
                variant={item.isActive === false ? "secondary" : "danger"}
                className={styles.rowButton}
                disabled={actionInFlight && !busy}
                loading={busy}
                onClick={() => void toggleActive()}
              >
                {item.isActive === false ? "Включить" : "Отключить"}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function groupCategories(items: DictionaryItem[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();

  items.forEach((item) => {
    const parts = item.name
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    const groupName = parts[0] || item.name.trim();
    const group = groups.get(groupName) ?? {
      name: groupName,
      root: null,
      children: [],
    };

    if (parts.length > 1) {
      group.children.push({ item, label: parts.slice(1).join(" / ") });
    } else {
      group.root = item;
    }

    groups.set(groupName, group);
  });

  return Array.from(groups.values());
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
