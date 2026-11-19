"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { DisclosureGroup, DisclosureSection, type DisclosureTitleStyle, type DisclosureVariant } from "../../../components/ui/DisclosureSection";
import { ProductDescriptionText } from "./ProductDescriptionText";
import { ProductDetailsContent, type BriefFactsStyle } from "./ProductDetailsContent";
import styles from "../ProductPage.module.css";
import type { Product } from "../lib/types";
import { purchaseInformation } from "../../../lib/purchaseInformation";

function DetailSection({ title, children, variant, animated, titleStyle }: { title: string; children: ReactNode; variant: DisclosureVariant; animated: boolean; titleStyle: DisclosureTitleStyle }) {
  const [open, setOpen] = useState(false);
  return <DisclosureSection title={title} variant={variant} titleStyle={titleStyle} animated={animated} open={open} onOpenChange={setOpen}>
    <div className={styles.accBody}>{children}</div>
  </DisclosureSection>;
}

export function ProductDetailsAccordion({ product, brandHref, disclosureVariant = "plain", animated = false, titleStyle = "default", briefFactsStyle = "current" }: {
  product: Product; brandHref: string | null; disclosureVariant?: DisclosureVariant; animated?: boolean; titleStyle?: DisclosureTitleStyle; briefFactsStyle?: BriefFactsStyle;
}) {
  const composition = product.composition?.trim();
  const brandDescription = product.brandDescription?.trim();
  const hasFacts = Boolean(composition || product.details?.measurements?.trim() || product.details?.care?.trim()
    || product.details?.cityOfOrigin?.trim() || product.category);

  return <div className={`${styles.accordion} ${disclosureVariant !== "plain" ? styles.disclosurePreview : ""}`}>
    <ProductDetailsContent description={product.description} composition={composition} details={product.details}
      category={product.category} audience={product.audience} view="brief" briefFactsStyle={briefFactsStyle} />
    <DisclosureGroup variant={disclosureVariant}>
    {hasFacts && <DetailSection title="Подробнее о товаре" variant={disclosureVariant} animated={animated} titleStyle={titleStyle}>
      <ProductDetailsContent description={product.description} composition={composition} details={product.details}
        category={product.category} audience={product.audience} view="facts" />
    </DetailSection>}
    <DetailSection title="Доставка и оплата" variant={disclosureVariant} animated={animated} titleStyle={titleStyle}>
      <ProductAdditionalInfo kind="delivery" product={product} brandHref={brandHref} />
    </DetailSection>
    {brandDescription && <DetailSection title="О бренде" variant={disclosureVariant} animated={animated} titleStyle={titleStyle}>
      <ProductAdditionalInfo kind="brand" product={product} brandHref={brandHref} />
    </DetailSection>}
    </DisclosureGroup>
  </div>;
}

export function ProductAdditionalInfo({ kind, product, brandHref }: { kind: "facts" | "delivery" | "brand"; product: Product; brandHref: string | null }) {
  if (kind === "facts") return <ProductDetailsContent description={product.description} composition={product.composition} details={product.details}
    category={product.category} audience={product.audience} view="facts" />;
  if (kind === "delivery") return <div className={styles.accBody}>
      <div className={`${styles.aboutGrid} ${styles.aboutSingle} ${styles.deliveryDetails}`}>
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
    </div>;
  return <div className={styles.accBody}>
      <ProductDescriptionText text={product.brandDescription?.trim()} fallback="" />
      {brandHref && <Link href={brandHref} className={styles.detailLink}>Все товары бренда</Link>}
    </div>;
}
