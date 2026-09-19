import { useId, useRef } from "react";

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

  categories: Option[];

  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCompositionChange: (value: string) => void;

  onCategoryIdChange: (value: number | "") => void;
  onSuggestedCategoryNameChange: (value: string) => void;
  onAudienceChange: (value: Audience) => void;
};

export function ProductGeneralCard({
  validationErrors,
  title,
  description,
  composition,
  categoryId,
  suggestedCategoryName,
  audience,
  categories,
  onTitleChange,
  onDescriptionChange,
  onCompositionChange,
  onCategoryIdChange,
  onSuggestedCategoryNameChange,
  onAudienceChange,
}: Props) {
  const fieldId = useId();
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
          <label className={styles.fieldFull} data-ui="field">
            <span className={styles.required}>Название</span>

            <input
              value={title}
              aria-invalid={validationErrors.title ? "true" : undefined}
              aria-describedby={validationErrors.title ? `${fieldId}-title-error` : undefined}
              onChange={(event) => onTitleChange(event.target.value)}
              className={`${styles.input} ${
                validationErrors.title ? "inputError" : ""
              } ${title.trim() ? "" : styles.requiredEmpty}`}
            />

            {validationErrors.title ? (
              <span className="fieldError" id={`${fieldId}-title-error`}>
                Введите название товара
              </span>
            ) : null}
          </label>

          <div className={styles.field}>
          <FormCombobox
            label="Категория"
            value={categoryId}
            customValue={suggestedCategoryName}
            required
            invalid={validationErrors.categoryId}
            errorId={`${fieldId}-category-error`}
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
          {validationErrors.categoryId ? <span className="fieldError" id={`${fieldId}-category-error`}>
            Выберите категорию или предложите свою
          </span> : null}
          </div>

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

        </div>
      </section>

      <section className={styles.card}>
        <SectionHeader
          title="Описание"
          hint="Материалы, особенности и комплектация товара."
        />

        <div className={styles.formGrid}>
          <label className={styles.fieldFull} data-ui="field">
            <span className={styles.required}>Описание товара</span>

            <div className={styles.descriptionFieldShell}>
              <div className={styles.descriptionToolbar} aria-label="Инструменты описания">
              <button
                type="button"
                className={styles.descriptionToolButton}
                title="Маркированный список"
                aria-label="Маркированный список"
                onClick={() =>
                  applyTextList(description, onDescriptionChange, descriptionRef.current, "•")
                }
              >
                <Icon name="list" size={20} strokeWidth={1.5} />
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
                <Icon name="minus" size={20} strokeWidth={1.5} />
              </button>
            </div>


              <textarea
                ref={descriptionRef}
                value={description}
                aria-invalid={validationErrors.description ? "true" : undefined}
                aria-describedby={validationErrors.description ? `${fieldId}-description-error` : undefined}
                onChange={(event) => onDescriptionChange(event.target.value)}
                className={styles.textarea}
                rows={5}
                maxLength={2000}
              />
            </div>

            {validationErrors.description ? (
              <span className="fieldError" id={`${fieldId}-description-error`}>
                Введите описание товара
              </span>
            ) : null}
          </label>

          <label className={styles.fieldFull} data-ui="field">
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
                  <Icon name="list" size={20} strokeWidth={1.5} />
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
                  <Icon name="minus" size={20} strokeWidth={1.5} />
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
