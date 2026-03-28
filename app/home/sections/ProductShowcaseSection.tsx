import Link from "next/link";
import styles from "./ProductShowcaseSection.module.css";
import { ProductShowcaseData } from "../types";
import { ProductTile } from "../../components/ProductTile/ProductTile";

type ProductShowcaseSectionProps = {
  block: ProductShowcaseData;
};

export function ProductShowcaseSection({
  block,
}: ProductShowcaseSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{block.title}</h2>
        <Link href={block.href} className={styles.link}>
          Посмотреть все
        </Link>
      </div>

      {block.products.length > 0 ? (
        <ul className={styles.grid}>
          {block.products.map((product) => (
            <ProductTile key={product.id} product={product} />
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>Пока нет товаров для этой подборки</div>
      )}
    </section>
  );
}