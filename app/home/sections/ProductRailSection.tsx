import { ProductShowcase } from "../../components/ProductShowcase/ProductShowcase";
import { ProductShowcaseData } from "../types";
import styles from "./ProductRailSection.module.css";

type ProductRailSectionProps = {
  block: ProductShowcaseData;
};

export function ProductRailSection({ block }: ProductRailSectionProps) {
  return (
    <ProductShowcase
      className={styles.section}
      variant="grid"
      title={block.title}
      products={block.products}
      href={block.href}
      emptyText="Пока нет товаров для этой подборки"
    />
  );
}
