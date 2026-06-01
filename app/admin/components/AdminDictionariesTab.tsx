
"use client";

import { useState } from "react";

import styles from "../Admin.module.css";

import type { DictionaryItem, DictionaryKind } from "../types";

type SectionConfig = {
  kind: DictionaryKind;
  title: string;
  items: DictionaryItem[];
};

type Props = {
  categories: DictionaryItem[];
  brands: DictionaryItem[];
  sizes: DictionaryItem[];
  colors: DictionaryItem[];
  actionKey: string | null;
  onCreate: (kind: DictionaryKind, item: Partial<DictionaryItem>) => void;
  onUpdate: (
    kind: DictionaryKind,
    id: number,
    item: Partial<DictionaryItem>
  ) => void;
  onDelete: (kind: DictionaryKind, id: number) => void;
};

export function AdminDictionariesTab({
  categories,
  brands,
  sizes,
  colors,
  actionKey,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const sections: SectionConfig[] = [
    { kind: "categories", title: "Категории", items: categories },
    { kind: "brands", title: "Бренды", items: brands },
    { kind: "sizes", title: "Размеры", items: sizes },
    { kind: "colors", title: "Цвета", items: colors },
  ];

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.sectionTitleNoMargin}>Справочники</h1>
          <p className={styles.muted}>
            Управление категориями, брендами, размерами и цветами.
          </p>
        </div>
      </div>

      <div className={styles.dictionaryGrid}>
        {sections.map((section) => (
          <DictionarySection
            key={section.kind}
            section={section}
            actionKey={actionKey}
            onCreate={onCreate}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function DictionarySection({
  section,
  actionKey,
  onCreate,
  onUpdate,
  onDelete,
}: {
  section: SectionConfig;
  actionKey: string | null;
  onCreate: Props["onCreate"];
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
}) {
  const [name, setName] = useState("");
  const [hex, setHex] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  function submit() {
    const cleanName = name.trim();

    if (!cleanName) return;

    onCreate(section.kind, {
      name: cleanName,
      hex: section.kind === "colors" ? hex.trim() || null : null,
      sortOrder,
      isActive: true,
    });

    setName("");
    setHex("");
    setSortOrder(0);
  }

  return (
    <section className={styles.dictionarySection}>
      <div className={styles.dictionaryHeader}>
        <h2>{section.title}</h2>
        <span>{section.items.length}</span>
      </div>

      <div className={styles.dictionaryForm}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={styles.dictionaryInput}
          placeholder="Название"
        />

        {section.kind === "colors" ? (
          <input
            value={hex}
            onChange={(event) => setHex(event.target.value)}
            className={styles.dictionaryInput}
            placeholder="#000000"
          />
        ) : null}

        <input
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(Number(event.target.value))}
          className={styles.dictionaryInput}
          placeholder="Сортировка"
        />

        <button
          type="button"
          onClick={submit}
          className={styles.primaryBtn}
          disabled={actionKey === `${section.kind}:create`}
        >
          Добавить
        </button>
      </div>

      <div className={styles.dictionaryList}>
        {section.items.map((item) => (
          <DictionaryRow
            key={item.id}
            kind={section.kind}
            item={item}
            actionKey={actionKey}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

function DictionaryRow({
  kind,
  item,
  actionKey,
  onUpdate,
  onDelete,
}: {
  kind: DictionaryKind;
  item: DictionaryItem;
  actionKey: string | null;
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [hex, setHex] = useState(item.hex ?? "");
  const [sortOrder, setSortOrder] = useState(item.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(item.isActive ?? true);

  const busy = actionKey === `${kind}:${item.id}`;

  function save() {
    onUpdate(kind, item.id, {
      name: name.trim(),
      hex: kind === "colors" ? hex.trim() || null : null,
      sortOrder,
      isActive,
    });

    setEditing(false);
  }

  if (editing) {
    return (
      <div className={styles.dictionaryRow}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={styles.dictionaryInput}
        />

        {kind === "colors" ? (
          <input
            value={hex}
            onChange={(event) => setHex(event.target.value)}
            className={styles.dictionaryInput}
          />
        ) : null}

        <input
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(Number(event.target.value))}
          className={styles.dictionaryInput}
        />

        <label className={styles.dictionaryCheck}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Активно
        </label>

        <button type="button" onClick={save} className={styles.primaryBtn}>
          Сохранить
        </button>

        <button
          type="button"
          onClick={() => setEditing(false)}
          className={styles.secondaryBtn}
        >
          Отмена
        </button>
      </div>
    );
  }

  return (
    <div className={styles.dictionaryRow}>
      <div className={styles.dictionaryName}>
        <span>{item.name}</span>
        {kind === "colors" && item.hex ? (
          <small>{item.hex}</small>
        ) : item.slug ? (
          <small>{item.slug}</small>
        ) : null}
      </div>

      <div className={styles.dictionaryMeta}>
        {item.isActive === false ? "Выключено" : "Активно"}
      </div>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className={styles.secondaryBtn}
      >
        Изменить
      </button>

      <button
        type="button"
        onClick={() => onDelete(kind, item.id)}
        disabled={busy || item.isActive === false}
        className={styles.dangerBtn}
      >
        Выключить
      </button>
    </div>
  );
}