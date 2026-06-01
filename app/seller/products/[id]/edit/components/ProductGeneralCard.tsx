import { SectionHeader } from "./SectionHeader";
import type { Audience, Option } from "../types";
import styles from "../ProductEditPage.module.css";

type Props = {
  title: string;
  description: string;
  categoryId: number | "";
  brandId: number | "";
  audience: Audience;
  categories: Option[];
  brands: Option[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryIdChange: (value: number | "") => void;
  onBrandIdChange: (value: number | "") => void;
  onAudienceChange: (value: Audience) => void;
};

export function ProductGeneralCard({
  title,
  description,
  categoryId,
  brandId,
  audience,
  categories,
  brands,
  onTitleChange,
  onDescriptionChange,
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
        hint="Название, категория, бренд и описание."
      />

      <div className={styles.formGrid}>
        <label className={styles.fieldFull}>
          <span className={styles.required}>Название</span>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className={styles.input}
            placeholder="Например: хлопковая рубашка"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.required}>Категория</span>
          <select
            value={categoryId}
            onChange={(event) =>
              onCategoryIdChange(event.target.value ? Number(event.target.value) : "")
            }
            className={styles.select}
            disabled={categoriesEmpty}
          >
            <option value="">
              {categoriesEmpty ? "Категории не найдены" : "Выберите категорию"}
            </option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {categoriesEmpty ? (
            <small>Сначала добавьте категории в админке.</small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.required}>Бренд</span>
          <select
            value={brandId}
            onChange={(event) =>
              onBrandIdChange(event.target.value ? Number(event.target.value) : "")
            }
            className={styles.select}
            disabled={brandsEmpty}
          >
            <option value="">
              {brandsEmpty ? "Бренды не найдены" : "Выберите бренд"}
            </option>

            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          {brandsEmpty ? (
            <small>Сначала добавьте бренды в админке.</small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Аудитория</span>
          <select
            value={audience}
            onChange={(event) => onAudienceChange(event.target.value as Audience)}
            className={styles.select}
          >
            <option value="MEN">Мужское</option>
            <option value="WOMEN">Женское</option>
            <option value="UNISEX">Унисекс</option>
          </select>
        </label>

        <label className={styles.fieldFull}>
          <span className={styles.required}>Описание</span>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className={styles.textarea}
            rows={8}
            maxLength={6000}
            placeholder="Материал, посадка, особенности, рекомендации по уходу."
          />
          <small>{description.length}/6000</small>
        </label>
      </div>
    </section>
  );
}