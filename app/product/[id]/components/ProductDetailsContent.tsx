import { productFeatureItems, type ProductDetails } from "../../../lib/productDetails";
import { ProductDescriptionText } from "./ProductDescriptionText";
import styles from "../ProductPage.module.css";
import { productBriefFacts } from "../lib/productBriefFacts";

export type BriefFactsStyle = "current" | "subtle" | "readable" | "emphasis";

export function ProductDetailsContent({ description, composition, details, category, audience, view = "all", briefFactsStyle = "current" }: {
  description: string; composition?: string | null; details?: ProductDetails | null;
  category?: string | null; audience?: "MEN" | "WOMEN" | "UNISEX";
  view?: "all" | "brief" | "facts";
  briefFactsStyle?: BriefFactsStyle;
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
  const briefFacts = productBriefFacts(composition, details);

  if (view === "brief") {
    return <div className={styles.productBrief}>
      {description.trim() && <ProductDescriptionText text={description} fallback="" />}
      {(briefFacts.measurements || briefFacts.material) && <dl className={[styles.briefFacts, briefFactsStyle !== "current" && styles[`briefFacts-${briefFactsStyle}`]].filter(Boolean).join(" ")}>
        {briefFacts.measurements && <div><dt>Размеры</dt><dd>{briefFacts.measurements}</dd></div>}
        {briefFacts.material && <div><dt>Материал</dt><dd>{briefFacts.material}</dd></div>}
      </dl>}
      {features.length > 0 && <ul className={styles.list}>{features.map((feature, index) => <li key={index}>{feature}</li>)}</ul>}
    </div>;
  }

  return <div className={`${styles.aboutGrid} ${view === "facts" || !hasDescription || !hasFacts ? styles.aboutSingle : ""}`}>
    {view === "all" && hasDescription && <div className={styles.detailFacts}>
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
