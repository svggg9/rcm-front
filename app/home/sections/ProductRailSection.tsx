import Link from "next/link";

import { ProductCarousel } from "../../components/ProductCarousel/ProductCarousel";
import { ProductShowcaseData } from "../types";
import styles from "./ProductRailSection.module.css";

type ProductRailSectionProps = {
  block: ProductShowcaseData;
};

export function ProductRailSection({ block }: ProductRailSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{block.title}</h2>

        <Link href={block.href} className={styles.link}>
          Посмотреть все
        </Link>
      </div>

      {block.products.length > 0 ? (
        <ProductCarousel title="" products={block.products} />
      ) : (
        <div className={styles.empty}>Пока нет товаров для этой подборки</div>
      )}
    </section>
  );
}