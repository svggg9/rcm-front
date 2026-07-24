import { useRef } from "react";

import { FormCombobox } from "../../../../../components/ui/FormCombobox";
import { FormSelect } from "../../../../../components/ui/FormSelect";
import { Icon } from "../../../../../components/ui/Icon";
import { SectionHeader } from "./SectionHeader";
import type { Audience, Option } from "../types";
import styles from "../ProductEditPage.module.css";

type ValidationErrors = {
  title?: boolean;
  description?: boolean;
  categoryId?: boolean;
  brandId?: boolean;
};

type Props = {
  validationErrors: ValidationErrors;

  title: string;
  description: string;
  composition: string;

  categoryId: number | "";
  suggestedCategoryName: string;
  audience: Audience;
  status: string | null;
  statusChanging: boolean;

  categories: Option[];

  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCompositionChange: (value: string) => void;

  onCategoryIdChange: (value: number | "") => void;
  onSuggestedCategoryNameChange: (value: string) => void;
  onAudienceChange: (value: Audience) => void;
  onStatusChange: (value: "DRAFT" | "ARCHIVED") => void;
};

export function ProductGeneralCard({
  validationErrors,
  title,
  description,
  composition,
  categoryId,
  suggestedCategoryName,
  audience,
  status,
  statusChanging,
  categories,
  onTitleChange,
  onDescriptionChange,
  onCompositionChange,
  onCategoryIdChange,
  onSuggestedCategoryNameChange,
  onAudienceChange,
  onStatusChange,
}: Props) {
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const compositionRef = useRef<HTMLTextAreaElement | null>(null);

  function applyTextList(
    value: string,
    onChange: (value: string) => void,
    textarea: HTMLTextAreaElement | null,
    marker: "•" | "—",
  ) {
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    let nextText = "";

    if (selected.trim()) {
      nextText = selected
        .split(/\r?\n/)
        .map((line) => {
          const cleanLine = line
            .replace(/^\s*(?:[•*—-]\s+|\d+[.)]\s+)/, "")
            .trim();

          if (!cleanLine) return "";

          return `${marker} ${cleanLine}`;
        })
        .join("\n");
    } else {
      const needsLeadingBreak = before.length > 0 && !before.endsWith("\n");
      nextText = `${needsLeadingBreak ? "\n" : ""}${marker} `;
    }

    onChange(before + nextText + after);

    window.requestAnimationFrame(() => {
      const nextCaret = start + nextText.length;
      textarea?.focus();
      textarea?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  return (
    <>
      <section className={styles.card}>
        <SectionHeader
          title="Основные данные"
          hint="Название, категория и аудитория товара."
        />

        <div className={styles.formGrid}>
          <label className={styles.fieldFull}>
            <span className={styles.required}>Название</span>

            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              className={`${styles.input} ${
                validationErrors.title ? styles.fieldInvalid : ""
              } ${title.trim() ? "" : styles.requiredEmpty}`}
            />

            {validationErrors.title ? (
              <small className={styles.fieldErrorText}>
                Введите название товара.
              </small>
            ) : null}
          </label>

          <FormCombobox
            label="Категория"
            value={categoryId}
            customValue={suggestedCategoryName}
            required
            invalid={validationErrors.categoryId}
            placeholder="Ввести свою категорию"
            showModerationBadge={false}
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
            onChange={(value, customValue) => {
              onCategoryIdChange(value);
              onSuggestedCategoryNameChange(customValue);
            }}
          />

          <FormSelect<Audience>
            label="Кому подходит"
            required
            value={audience}
            options={[
              { value: "MEN", label: "Мужское" },
              { value: "WOMEN", label: "Женское" },
              { value: "UNISEX", label: "Для всех" },
            ]}
            onChange={(value) => {
              if (value) onAudienceChange(value);
            }}
          />

          {status ? (
            <FormSelect<string>
              label="Статус"
              value={status}
              disabled={statusChanging}
              options={[
                {
                  value: status,
                  label:
                    status === "ACTIVE"
                      ? "Опубликован"
                      : status === "MODERATION"
                        ? "На модерации"
                        : status === "NEEDS_REVISION"
                          ? "Требует изменений"
                          : status === "BLOCKED"
                            ? "Заблокирован"
                            : status === "ARCHIVED"
                              ? "В архиве"
                              : "Черновик",
                },
                status !== "ARCHIVED"
                  ? { value: "ARCHIVED", label: "В архив" }
                  : { value: "DRAFT", label: "Вернуть в черновик" },
              ]}
              onChange={(value) => {
                if (value === "DRAFT" || value === "ARCHIVED") {
                  onStatusChange(value);
                }
              }}
            />
          ) : null}
        </div>
      </section>

      <section className={styles.card}>
        <SectionHeader
          title="Описание"
          hint="Материалы, особенности и комплектация товара."
        />

        <div className={styles.formGrid}>
          <label className={styles.fieldFull}>
            <span className={styles.required}>Описание товара</span>

            <div className={styles.descriptionFieldShell}>
              <div className={styles.descriptionToolbar} aria-label="Инструменты описания">
              <button
                type="button"
                className={styles.descriptionToolButton}
                title="Маркерованный список"
                aria-label="Маркерованный список"
                onClick={() =>
                  applyTextList(description, onDescriptionChange, descriptionRef.current, "•")
                }
              >
                <Icon name="list" size={17} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                className={styles.descriptionToolButton}
                title="Список с длинным тире"
                aria-label="Список с длинным тире"
                onClick={() =>
                  applyTextList(description, onDescriptionChange, descriptionRef.current, "—")
                }
              >
                <Icon name="minus" size={17} strokeWidth={1.8} />
              </button>
            </div>


              <textarea
                ref={descriptionRef}
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                className={`${styles.textarea} ${
                validationErrors.description ? styles.fieldInvalid : ""
              } ${description.trim() ? "" : styles.requiredEmpty}`}
                rows={5}
                maxLength={2000}
              />
            </div>

            {validationErrors.description ? (
              <small className={styles.fieldErrorText}>
                Введите описание товара.
              </small>
            ) : null}
          </label>

          <label className={styles.fieldFull}>
            <span>Состав</span>

            <div className={`${styles.descriptionFieldShell} ${styles.compositionFieldShell}`}>
              <div className={styles.descriptionToolbar} aria-label="Инструменты состава">
                <button
                  type="button"
                  className={styles.descriptionToolButton}
                  title="Маркированный список"
                  aria-label="Маркированный список"
                  onClick={() =>
                    applyTextList(composition, onCompositionChange, compositionRef.current, "•")
                  }
                >
                  <Icon name="list" size={17} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  className={styles.descriptionToolButton}
                  title="Список с длинным тире"
                  aria-label="Список с длинным тире"
                  onClick={() =>
                    applyTextList(composition, onCompositionChange, compositionRef.current, "—")
                  }
                >
                  <Icon name="minus" size={17} strokeWidth={1.8} />
                </button>
              </div>

              <textarea
                ref={compositionRef}
                value={composition}
                onChange={(event) => onCompositionChange(event.target.value)}
                className={styles.textarea}
                rows={3}
                maxLength={1000}
              />
            </div>
          </label>
        </div>
      </section>
    </>
  );
}
