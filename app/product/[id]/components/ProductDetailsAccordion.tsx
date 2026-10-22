"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "../../../components/ui/Icon";
import { ProductDescriptionText } from "./ProductDescriptionText";
import styles from "../ProductPage.module.css";
import type { Product } from "../lib/types";

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <details className={styles.accItem}>
    <summary className={styles.accBtn}><span>{title}</span><Icon name="chevron-down" size={18} strokeWidth={1.25} /></summary>
    <div className={styles.accBody}>{children}</div>
  </details>;
}

export function ProductDetailsAccordion({ product, showDescription, brandHref }: {
  product: Product; showDescription: boolean; brandHref: string | null;
}) {
  const composition = product.composition?.trim();
  const brandDescription = product.brandDescription?.trim();
  const category = product.category?.split("/").map(part => part.trim()).filter(Boolean).at(-1);
  const audience = /одежд|обувь|аксессуар/i.test(product.category) && product.audience ? {
    MEN: "Для мужчин", WOMEN: "Для женщин", UNISEX: "Унисекс",
  }[product.audience] : null;

  return <div className={styles.accordion}>
    {showDescription && <DetailSection title="Описание"><ProductDescriptionText text={product.description} fallback="" /></DetailSection>}
    {composition && <DetailSection title="Состав"><ProductDescriptionText text={composition} fallback="" /></DetailSection>}
    {(category || audience) && <DetailSection title="Характеристики">
      <dl className={styles.characteristics}>
        {category && <div><dt>Категория</dt><dd>{category}</dd></div>}
        {audience && <div><dt>Для кого</dt><dd>{audience}</dd></div>}
      </dl>
    </DetailSection>}
    <DetailSection title="Доставка">
      <p className={styles.text}>Доставка в пункт выдачи СДЭК. Стоимость и срок появятся после выбора пункта при оформлении.</p>
      <Link href="/contacts" className={styles.detailLink}>Задать вопрос</Link>
    </DetailSection>
    <DetailSection title="Оплата">
      <p className={styles.text}>Онлайн на защищённой странице Т-Банка. Доступные способы оплаты будут показаны на стороне банка.</p>
    </DetailSection>
    {brandDescription && <DetailSection title="О бренде">
      <ProductDescriptionText text={brandDescription} fallback="" />
      {brandHref && <Link href={brandHref} className={styles.detailLink}>Все товары бренда</Link>}
    </DetailSection>}
  </div>;
}
