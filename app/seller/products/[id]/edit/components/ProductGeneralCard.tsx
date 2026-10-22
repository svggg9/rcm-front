import { useId } from "react";

import { CategoryPicker } from "../../../../../components/ui/CategoryPicker";
import { SegmentedControl } from "../../../../../components/ui/SegmentedControl";
import { ProductDescriptionEditor } from "./ProductDescriptionEditor";
import type { Audience } from "../types";
import type { CategoryOption } from "../../../../../lib/categories";
import styles from "../ProductEditPage.module.css";

type ValidationErrors = {
  title?: boolean;
  description?: boolean;
  composition?: boolean;
  categoryId?: boolean;
  brandId?: boolean;
};

type Props = {
  activeSection?: "general" | "description";
  showTitle?: boolean;
  validationErrors: ValidationErrors;

  title: string;
  description: string;
  composition: string;

  categoryId: number | "";
  suggestedCategoryName: string;
  audience: Audience;

  categories: CategoryOption[];
  categoryError?: string | null;
  categoryLoading?: boolean;
  currentCategoryLabel?: string | null;
  onRetryCategories?: () => void;

  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCompositionChange: (value: string) => void;

  onCategoryIdChange: (value: number | "") => void;
  onSuggestedCategoryNameChange: (value: string) => void;
  onAudienceChange: (value: Audience) => void;
};

export function ProductGeneralCard({
  activeSection,
  showTitle = true,
  validationErrors,
  title,
  description,
  composition,
  categoryId,
  suggestedCategoryName,
  audience,
  categories,
  categoryError,
  categoryLoading,
  currentCategoryLabel,
  onRetryCategories,
  onTitleChange,
  onDescriptionChange,
  onCompositionChange,
  onCategoryIdChange,
  onSuggestedCategoryNameChange,
  onAudienceChange,
}: Props) {
  const fieldId = useId();
  return (
    <>
      <section id="product-general" className={`${styles.card} ${styles.stepPanel}`} aria-label="Основные данные товара"
        hidden={activeSection !== undefined && activeSection !== "general"} role={activeSection ? "tabpanel" : undefined}
        aria-labelledby={activeSection ? "editor-tab-general" : undefined} data-editor-step="general" tabIndex={-1}>
        {!activeSection && <h2 className={styles.sectionTitle}>Основные данные</h2>}
        <div className={styles.formGrid}>
          {showTitle && <label className={styles.fieldFull} data-ui="field">
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
          </label>}

          <div className={styles.field}>
          <CategoryPicker
            label="Категория"
            value={categoryId}
            customValue={suggestedCategoryName}
            required
            invalid={validationErrors.categoryId}
            errorId={`${fieldId}-category-error`}
            categories={categories}
            currentLabel={currentCategoryLabel}
            error={categoryError}
            loading={categoryLoading}
            onRetry={onRetryCategories}
            onChange={(value, customValue) => {
              onCategoryIdChange(value);
              onSuggestedCategoryNameChange(customValue);
            }}
          />
          {validationErrors.categoryId ? <span className="fieldError" id={`${fieldId}-category-error`}>
            Выберите категорию или предложите свою
          </span> : null}
          </div>

          <div className={styles.field}><span>Кому подходит</span><SegmentedControl<Audience>
            ariaLabel="Кому подходит"
            value={audience}
            items={[
              { value: "MEN", label: "Мужское" },
              { value: "WOMEN", label: "Женское" },
              { value: "UNISEX", label: "Для всех" },
            ]}
            onChange={(value) => {
              if (value) onAudienceChange(value);
            }}
          /></div>

        </div>
      </section>

      <section id="product-description" className={`${styles.card} ${styles.stepPanel}`} aria-label="Описание товара"
        hidden={activeSection !== undefined && activeSection !== "description"} role={activeSection ? "tabpanel" : undefined}
        aria-labelledby={activeSection ? "editor-tab-description" : undefined} data-editor-step="description" tabIndex={-1}>
        {!activeSection && <h2 className={styles.sectionTitle}>Описание</h2>}
        <div className={styles.formGrid}>
          <div className={styles.fieldFull} data-ui="field">
            <span className={styles.required}>Описание товара</span>
            <ProductDescriptionEditor value={description} onChange={onDescriptionChange} fieldName="Описание товара" invalid={validationErrors.description} errorId={validationErrors.description ? `${fieldId}-description-error` : undefined} />

            {validationErrors.description ? (
              <span className="fieldError" id={`${fieldId}-description-error`}>
                Введите описание товара
              </span>
            ) : null}
          </div>

          <details className={`${styles.fieldFull} ${styles.optionalSection}`} open={composition.trim() || validationErrors.composition ? true : undefined}>
            <summary>Состав <span className={styles.fieldHint}>необязательно</span></summary>
            <ProductDescriptionEditor
              value={composition}
              onChange={onCompositionChange}
              fieldName="Состав"
              maxLength={1000}
              emptyText="Состав пока пустой"
              invalid={validationErrors.composition}
            />
            {validationErrors.composition && <span className="fieldError">Не больше 1000 символов</span>}
          </details>
        </div>
      </section>
    </>
  );
}
