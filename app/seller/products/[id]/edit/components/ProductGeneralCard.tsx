import { FormCombobox } from "../../../../../components/ui/FormCombobox";
import { FormSelect } from "../../../../../components/ui/FormSelect";
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
  brandId: number | "";
  audience: Audience;

  categories: Option[];
  brands: Option[];

  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCompositionChange: (value: string) => void;

  onCategoryIdChange: (value: number | "") => void;
  onSuggestedCategoryNameChange: (value: string) => void;
  onBrandIdChange: (value: number | "") => void;
  onAudienceChange: (value: Audience) => void;
};

export function ProductGeneralCard({
  validationErrors,
  title,
  description,
  composition,
  categoryId,
  suggestedCategoryName,
  brandId,
  audience,
  categories,
  brands,
  onTitleChange,
  onDescriptionChange,
  onCompositionChange,
  onCategoryIdChange,
  onSuggestedCategoryNameChange,
  onBrandIdChange,
  onAudienceChange,
}: Props) {
  const brandsEmpty = brands.length === 0;

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
            ) : (
              <small>
                Оптимально: тип товара + производитель + модель.
              </small>
            )}
          </label>

          <FormCombobox
            label="Категория"
            value={categoryId}
            customValue={suggestedCategoryName}
            required
            invalid={validationErrors.categoryId}
            placeholder="Выберите или ввести свою"
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
          title="Производитель"
          hint="Укажите производителя товара."
        />

        <div className={styles.formGrid}>
          <FormSelect<number>
            label="Производитель"
            value={brandId}
            full
            required
            invalid={validationErrors.brandId}
            disabled={brandsEmpty || brands.length === 1}
            placeholder={
              brandsEmpty ? "Производители не найдены" : "Выберите производителя"
            }
            options={brands.map((brand) => ({
              value: brand.id,
              label: brand.name,
            }))}
            onChange={onBrandIdChange}
          />

          {validationErrors.brandId ? (
            <small className={styles.fieldErrorText}>
              Выберите производителя.
            </small>
          ) : brandsEmpty ? (
            <small>
              Сначала заполните производителя в кабинете продавца.
            </small>
          ) : brands.length === 1 ? (
            <small>
              Производитель привязан к вашему аккаунту.
            </small>
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

            <textarea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className={`${styles.textarea} ${
                validationErrors.description ? styles.fieldInvalid : ""
              } ${description.trim() ? "" : styles.requiredEmpty}`}
              rows={8}
              maxLength={6000}
              placeholder="Материал, особенности, назначение, комплектация и важные характеристики."
            />

            {validationErrors.description ? (
              <small className={styles.fieldErrorText}>
                Введите описание товара.
              </small>
            ) : (
              <small>{description.length}/6000</small>
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
