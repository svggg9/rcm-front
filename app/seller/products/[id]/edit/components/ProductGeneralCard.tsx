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
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  function applyDescriptionList(kind: "bullet" | "number") {
    const textarea = descriptionRef.current;
    const start = textarea?.selectionStart ?? description.length;
    const end = textarea?.selectionEnd ?? description.length;
    const before = description.slice(0, start);
    const selected = description.slice(start, end);
    const after = description.slice(end);
    let nextText = "";

    if (selected.trim()) {
      let index = 1;

      nextText = selected
        .split(/\r?\n/)
        .map((line) => {
          const cleanLine = line
            .replace(/^\s*(?:[-*]\s+|\d+[.)]\s+)/, "")
            .trim();

          if (!cleanLine) return "";

          if (kind === "bullet") return `- ${cleanLine}`;

          return `${index++}. ${cleanLine}`;
        })
        .join("\n");
    } else {
      const needsLeadingBreak = before.length > 0 && !before.endsWith("\n");
      nextText = `${needsLeadingBreak ? "\n" : ""}${kind === "bullet" ? "- " : "1. "}`;
    }

    onDescriptionChange(before + nextText + after);

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
              placeholder="Например: хлопковая рубашка oversize"
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
            placeholder="Выберите или предложите свою"
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
          <label className={styles.fieldFull}>
            <span className={styles.required}>Описание товара</span>

            <div className={styles.descriptionFieldShell}>
              <div className={styles.descriptionToolbar} aria-label="Инструменты описания">
              <button
                type="button"
                className={styles.descriptionToolButton}
                title="Маркерованный список"
                aria-label="Маркерованный список"
                onClick={() => applyDescriptionList("bullet")}
              >
                <Icon name="list" size={17} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                className={styles.descriptionToolButton}
                title="Нумерованный список"
                aria-label="Нумерованный список"
                onClick={() => applyDescriptionList("number")}
              >
                <Icon name="list-ordered" size={17} strokeWidth={1.8} />
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
                placeholder="Материал, особенности, назначение, комплектация и важные характеристики."
              />
            </div>

            {validationErrors.description ? (
              <small className={styles.fieldErrorText}>
                Введите описание товара.
              </small>
            ) : (
              <small>{description.length}/2000</small>
            )}
          </label>

          <label className={styles.fieldFull}>
            <span>Состав</span>

            <textarea
              value={composition}
              onChange={(event) => onCompositionChange(event.target.value)}
              className={styles.textarea}
              rows={3}
              maxLength={1000}
              placeholder="Например: 92% хлопок, 8% эластан"
            />

            <small>{composition.length}/1000</small>
          </label>
        </div>
      </section>
    </>
  );
}
