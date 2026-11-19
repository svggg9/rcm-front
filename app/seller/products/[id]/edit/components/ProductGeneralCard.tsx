import { useId } from "react";

import { CategoryPicker } from "../../../../../components/ui/CategoryPicker";
import { SegmentedControl } from "../../../../../components/ui/SegmentedControl";
import { InsideLabelInput } from "../../../../../components/ui/InsideLabelInput";
import { ProductDescriptionEditor } from "./ProductDescriptionEditor";
import { ProductOptionalDetails } from "./ProductOptionalDetails";
import type { ProductDetailsDraft } from "../../../../../lib/productDetails";
import type { Audience } from "../types";
import type { CategoryOption } from "../../../../../lib/categories";
import styles from "../ProductEditPage.module.css";

type ValidationErrors = {
  title?: boolean;
  description?: boolean;
  composition?: boolean;
  details?: Partial<Record<keyof ProductDetailsDraft, string>>;
  categoryId?: boolean;
  brandId?: boolean;
};

type Props = {
  section?: "general" | "description";
  activeSection?: "general" | "description";
  showTitle?: boolean;
  validationErrors: ValidationErrors;

  title: string;
  description: string;
  composition: string;
  details: ProductDetailsDraft;

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
  onDetailsChange: (key: keyof ProductDetailsDraft, value: string) => void;

  onCategoryIdChange: (value: number | "") => void;
  onSuggestedCategoryNameChange: (value: string) => void;
  onAudienceChange: (value: Audience) => void;
};

export function ProductGeneralCard({
  section,
  activeSection,
  showTitle = true,
  validationErrors,
  title,
  description,
  composition,
  details,
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
  onDetailsChange,
  onCategoryIdChange,
  onSuggestedCategoryNameChange,
  onAudienceChange,
}: Props) {
  const fieldId = useId();
  return (
    <>
      {section !== "description" && <section className={`${styles.card} ${styles.stepPanel}`} aria-label="Основные данные товара"
        hidden={activeSection !== undefined && activeSection !== "general"} role={activeSection ? "tabpanel" : undefined}
        aria-labelledby={activeSection ? "editor-tab-general" : undefined} data-editor-step="general" tabIndex={-1}>
        {!activeSection && !section && <h2 className={styles.sectionTitle}>Основные данные</h2>}
        <div className={styles.formGrid}>
          {showTitle && <div className={styles.fieldFull}>
            <InsideLabelInput mode="fixed" appearance="warm" id={`${fieldId}-title`} label="Название товара" required value={title} data-product-title
              placeholder="Например, футболка из хлопка"
              error={validationErrors.title ? "Введите название товара" : undefined}
              onChange={event => onTitleChange(event.target.value)} />
          </div>}

          <div className={styles.field}>
          <CategoryPicker
            label="Категория"
            appearance="warm"
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
      </section>}

      {section !== "general" && <section className={`${styles.card} ${styles.stepPanel}`} aria-label="Описание товара"
        hidden={activeSection !== undefined && activeSection !== "description"} role={activeSection ? "tabpanel" : undefined}
        aria-labelledby={activeSection ? "editor-tab-description" : undefined} data-editor-step="description" tabIndex={-1}>
        {!activeSection && !section && <h2 className={styles.sectionTitle}>Описание</h2>}
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

          <ProductOptionalDetails composition={composition} details={details}
            category={categories.find(item => item.id === categoryId)?.name || currentCategoryLabel || ""}
            compositionError={validationErrors.composition} errors={validationErrors.details ?? {}}
            onCompositionChange={onCompositionChange} onChange={onDetailsChange} />
        </div>
      </section>}
    </>
  );
}
