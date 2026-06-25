"use client";

import { useState } from "react";

import styles from "../Admin.module.css";

import { StatusBadge, type StatusBadgeTone } from "../../components/ui/StatusBadge";
import type { DictionaryItem, DictionaryKind } from "../types";

type SectionConfig =
  | {
      kind: DictionaryKind;
      title: string;
      items: DictionaryItem[];
      editable: true;
    }
  | {
      kind: "audience";
      title: string;
      items: DictionaryItem[];
      editable: false;
    };

type Props = {
  categories: DictionaryItem[];
  sizes: DictionaryItem[];
  actionKey: string | null;
  onCreate: (kind: DictionaryKind, item: Partial<DictionaryItem>) => void;
  onUpdate: (
    kind: DictionaryKind,
    id: number,
    item: Partial<DictionaryItem>
  ) => void;
  onDelete: (kind: DictionaryKind, id: number) => void;
};

const audienceItems: DictionaryItem[] = [
  { id: 1, name: "Для него", slug: "MEN", isActive: true },
  { id: 2, name: "Для нее", slug: "WOMEN", isActive: true },
  { id: 3, name: "Для всех", slug: "UNISEX", isActive: true },
];

export function AdminDictionariesTab({
  categories,
  sizes,
  actionKey,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const sections: SectionConfig[] = [
    { kind: "categories", title: "Категории", items: categories, editable: true },
    { kind: "sizes", title: "Размеры", items: sizes, editable: true },
    { kind: "audience", title: "Аудитория", items: audienceItems, editable: false },
  ];

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={`${styles.sectionTitleNoMargin} textTitle`}>
            Словари
          </h1>
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

  function submit() {
    if (!section.editable) return;

    const cleanName = name.trim();

    if (!cleanName) return;

    onCreate(section.kind, {
      name: cleanName,
      sortOrder: section.items.length,
      isActive: true,
    });

    setName("");
  }

  return (
    <section className={styles.dictionarySection}>
      <div className={styles.dictionaryHeader}>
        <h2 className="textBody">{section.title}</h2>
        <span className="textSmall">{section.items.length}</span>
      </div>

      {section.editable ? (
        <div className={styles.dictionaryForm}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`${styles.dictionaryInput} textSmall`}
            placeholder="Название"
          />

          <button
            type="button"
            onClick={submit}
            className={`${styles.primaryBtn} textButton`}
            disabled={actionKey === `${section.kind}:create`}
          >
            Добавить
          </button>
        </div>
      ) : null}

      <div className={styles.dictionaryList}>
        {section.items.map((item) => (
          <DictionaryRow
            key={`${section.kind}-${item.id}`}
            kind={section.kind}
            item={item}
            actionKey={actionKey}
            editable={section.editable}
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
  editable,
  onUpdate,
  onDelete,
}: {
  kind: SectionConfig["kind"];
  item: DictionaryItem;
  actionKey: string | null;
  editable: boolean;
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);

  const status = getDictionaryStatus(item);
  const busy = actionKey === `${kind}:${item.id}`;

  function save() {
    if (!editable || kind === "audience") return;

    onUpdate(kind, item.id, {
      name: name.trim(),
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
    });

    setEditing(false);
  }

  if (editing && editable && kind !== "audience") {
    return (
      <div className={styles.dictionaryRow}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={`${styles.dictionaryInput} textSmall`}
        />

        <div className={styles.dictionaryActions}>
          <button
            type="button"
            onClick={save}
            className={`${styles.primaryBtn} textButton`}
          >
            Сохранить
          </button>

          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(item.name);
            }}
            className={`${styles.secondaryBtn} textButton`}
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dictionaryRow}>
      <div className={styles.dictionaryName}>
        <span className="textSmall">{item.name}</span>
        {item.slug ? <small className="textCaption">{item.slug}</small> : null}
      </div>

      <div className={styles.dictionaryStatus}>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>

      {editable && kind !== "audience" ? (
        <div className={styles.dictionaryActions}>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`${styles.secondaryBtn} textButton`}
          >
            Изменить
          </button>

          <button
            type="button"
            onClick={() => onDelete(kind, item.id)}
            disabled={busy || item.isActive === false}
            className={`${styles.dangerBtn} textButton`}
          >
            Отключить
          </button>
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
