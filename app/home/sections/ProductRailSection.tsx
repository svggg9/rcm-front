import { ProductShowcase } from "../../components/ProductShowcase/ProductShowcase";
import { ProductShowcaseData } from "../types";
import styles from "./ProductRailSection.module.css";
import Link from "next/link";
import { ProductPhoto } from "../../components/ProductPhoto";
import { Price } from "../../components/ui/Price";
import { productPath } from "../../lib/productUrls";

type ProductRailSectionProps = {
  block: ProductShowcaseData;
};

export function ProductRailSection({ block }: ProductRailSectionProps) {
  const single = block.products.length === 1 ? block.products[0] : null;
  if (single) return <section className={styles.spotlight} aria-label={block.title} data-home-spotlight>
    <Link href={productPath(single)} className={styles.spotlightPhoto}>
      {single.images[0] ? <ProductPhoto src={single.images[0]} alt={single.title}
        sizes="(max-width: 640px) 45vw, 360px" className={styles.image} normalizeWhitespace /> : null}
    </Link>
    <div className={styles.spotlightInfo}>
      <h2>{block.title}</h2>
      {block.description ? <p className={styles.description}>{block.description}</p> : null}
      {single.brand ? <span className={styles.brand}>{single.brand}</span> : null}
      <Link className={styles.productName} href={productPath(single)}>{single.title}</Link>
      <span>{single.minPrice > 0 ? <Price amount={single.minPrice} /> : "Цена по запросу"}</span>
      <Link className={styles.more} href={block.href}>Смотреть всё</Link>
    </div>
  </section>;
  return (
    <ProductShowcase
      className={styles.section}
      presentation="storefront"
      mobileLayout="grid"
      variant="grid"
      title={block.title}
      description={block.description}
      products={block.products}
      href={block.href}
      actionLabel="Смотреть всё"
    />
  );
}
