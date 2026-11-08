import { productFeatureItems, type ProductDetails } from "../../../lib/productDetails";
import { ProductDescriptionText } from "./ProductDescriptionText";
import styles from "../ProductPage.module.css";

export function ProductDetailsContent({ description, composition, details, category, audience }: {
  description: string; composition?: string | null; details?: ProductDetails | null;
  category?: string | null; audience?: "MEN" | "WOMEN" | "UNISEX";
}) {
  const features = productFeatureItems(details?.features);
  const measurements = details?.measurements?.trim();
  const care = details?.care?.trim();
  const city = details?.cityOfOrigin?.trim();
  const categoryName = category?.split("/").map(part => part.trim()).filter(Boolean).at(-1);
  const audienceLabel = /одежд|обувь|аксессуар/i.test(category ?? "") && audience ? {
    MEN: "Для мужчин", WOMEN: "Для женщин", UNISEX: "Унисекс",
  }[audience] : null;
  const hasDescription = Boolean(description.trim() || features.length);
  const hasFacts = Boolean(composition?.trim() || measurements || care || city || categoryName || audienceLabel);

  return <div className={`${styles.aboutGrid} ${!hasDescription || !hasFacts ? styles.aboutSingle : ""}`}>
    {hasDescription && <div className={styles.detailFacts}>
      {description.trim() && <section className={styles.detailGroup}>
        <h3 className={styles.detailHeading}>Подробнее о товаре</h3>
        <ProductDescriptionText text={description} fallback="" />
      </section>}
      {features.length > 0 && <section className={styles.detailGroup}>
        <h3 className={styles.detailHeading}>Особенности</h3>
        <ul className={styles.list}>{features.map((feature, index) => <li key={index}>{feature}</li>)}</ul>
      </section>}
    </div>}
    {hasFacts && <div className={styles.detailFacts}>
      {composition?.trim() && <section className={styles.detailGroup}>
        <h3 className={styles.detailHeading}>Состав</h3>
        <ProductDescriptionText text={composition} fallback="" />
      </section>}
      {measurements && <section className={styles.detailGroup}>
        <h3 className={styles.detailHeading}>Замеры изделия</h3>
        <ProductDescriptionText text={measurements} fallback="" />
      </section>}
      {care && <section className={styles.detailGroup}>
        <h3 className={styles.detailHeading}>Уход</h3>
        <ProductDescriptionText text={care} fallback="" />
      </section>}
      {(categoryName || audienceLabel || city) && <section className={styles.detailGroup}>
        <h3 className={styles.detailHeading}>Характеристики</h3>
        <dl className={styles.characteristics}>
          {categoryName && <div><dt>Категория</dt><dd>{categoryName}</dd></div>}
          {audienceLabel && <div><dt>Для кого</dt><dd>{audienceLabel}</dd></div>}
          {city && <div><dt>Город производства</dt><dd>{city}</dd></div>}
        </dl>
      </section>}
    </div>}
  </div>;
}
