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
  brandId: number | "";
  audience: Audience;

  categories: Option[];
  brands: Option[];

  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCompositionChange: (value: string) => void;

  onCategoryIdChange: (value: number | "") => void;
  onBrandIdChange: (value: number | "") => void;
  onAudienceChange: (value: Audience) => void;
};

export function ProductGeneralCard({
  validationErrors,
  title,
  description,
  composition,
  categoryId,
  brandId,
  audience,
  categories,
  brands,
  onTitleChange,
  onDescriptionChange,
  onCompositionChange,
  onCategoryIdChange,
  onBrandIdChange,
  onAudienceChange,
}: Props) {
  const categoriesEmpty = categories.length === 0;
  const brandsEmpty = brands.length === 0;

  return (
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
            }`}
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

        <label className={styles.field}>
          <span className={styles.required}>Категория</span>

          <select
            value={categoryId}
            onChange={(event) =>
              onCategoryIdChange(
                event.target.value ? Number(event.target.value) : ""
              )
            }
            className={`${styles.select} ${
              validationErrors.categoryId ? styles.fieldInvalid : ""
            }`}
            disabled={categoriesEmpty}
          >
            <option value="">
              {categoriesEmpty
                ? "Категории не найдены"
                : "Выберите категорию"}
            </option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {validationErrors.categoryId ? (
            <small className={styles.fieldErrorText}>
              Выберите категорию.
            </small>
          ) : categoriesEmpty ? (
            <small>Сначала добавьте категории в админке.</small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Аудитория</span>

          <select
            value={audience}
            onChange={(event) =>
              onAudienceChange(event.target.value as Audience)
            }
            className={styles.select}
          >
            <option value="MEN">Мужское</option>
            <option value="WOMEN">Женское</option>
            <option value="UNISEX">Унисекс</option>
          </select>
        </label>
      </div>

      <SectionHeader
        title="Производитель"
        hint="Укажите производителя товара."
      />

      <div className={styles.formGrid}>
        <label className={styles.fieldFull}>
          <span className={styles.required}>Производитель</span>

          <select
            value={brandId}
            onChange={(event) =>
              onBrandIdChange(
                event.target.value ? Number(event.target.value) : ""
              )
            }
            className={`${styles.select} ${
              validationErrors.brandId ? styles.fieldInvalid : ""
            }`}
            disabled={brandsEmpty}
          >
            <option value="">
              {brandsEmpty
                ? "Производители не найдены"
                : "Выберите производителя"}
            </option>

            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          {validationErrors.brandId ? (
            <small className={styles.fieldErrorText}>
              Выберите производителя.
            </small>
          ) : brandsEmpty ? (
            <small>
              Сначала добавьте производителя в кабинете продавца.
            </small>
          ) : null}
        </label>
      </div>

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
            }`}
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
  );
}