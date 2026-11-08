"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "../../../components/ui/Icon";
import { ProductDescriptionText } from "./ProductDescriptionText";
import { ProductDetailsContent } from "./ProductDetailsContent";
import styles from "../ProductPage.module.css";
import type { Product } from "../lib/types";
import { purchaseInformation } from "../../../lib/purchaseInformation";

function DetailSection({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return <details className={styles.accItem} open={defaultOpen}>
    <summary className={styles.accBtn}><span>{title}</span><Icon name="chevron-down" size={18} strokeWidth={1.25} /></summary>
    <div className={styles.accBody}>{children}</div>
  </details>;
}

export function ProductDetailsAccordion({ product, brandHref }: {
  product: Product; brandHref: string | null;
}) {
  const composition = product.composition?.trim();
  const brandDescription = product.brandDescription?.trim();
  const hasDetails = Object.values(product.details ?? {}).some(value => value?.trim());

  return <div className={styles.accordion}>
    {(product.description.trim() || composition || product.category || hasDetails) && <DetailSection title="О товаре" defaultOpen>
      <ProductDetailsContent description={product.description} composition={composition} details={product.details}
        category={product.category} audience={product.audience} />
    </DetailSection>}
    <DetailSection title="Доставка и оплата">
      <div className={styles.aboutGrid}>
        <section className={styles.detailGroup}>
          <h3 className={styles.detailHeading}>Доставка</h3>
          <p className={styles.text}>{purchaseInformation.delivery}</p>
        </section>
        <section className={styles.detailGroup}>
          <h3 className={styles.detailHeading}>Оплата</h3>
          <p className={styles.text}>{purchaseInformation.payment}</p>
        </section>
      </div>
      <Link href="/contacts" className={styles.detailLink}>Задать вопрос</Link>
    </DetailSection>
    {brandDescription && <DetailSection title="О бренде">
      <ProductDescriptionText text={brandDescription} fallback="" />
      {brandHref && <Link href={brandHref} className={styles.detailLink}>Все товары бренда</Link>}
    </DetailSection>}
  </div>;
}
