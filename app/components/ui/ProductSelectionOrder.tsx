"use client";

import Image from "next/image";
import { Button } from "./Button";
import { DesignSystemIcon } from "./DesignSystemIcon";
import { Price } from "./Price";
import styles from "./ProductSelectionOrder.module.css";

type Product = { id: number; title: string; coverImage?: string | null; minPrice?: number | null };

export function ProductSelectionOrder({ ids, products, disabled = false, onChange }: {
  ids: number[]; products: Product[]; disabled?: boolean; onChange: (ids: number[]) => void;
}) {
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (disabled || target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  if (!ids.length) return null;
  const byId = new Map(products.map(product => [product.id, product]));
  return <div className={styles.preview}>
    <div className={styles.heading}><strong>Предпросмотр подборки</strong><span>Порядок слева направо</span></div>
    <ul className={styles.rail}>
      {ids.map((id, index) => {
        const product = byId.get(id);
        const name = product?.title?.trim() || `Товар №${id}`;
        return <li key={id}>
          <div className={styles.cover}>{product?.coverImage ? <Image src={product.coverImage} alt="" fill sizes="180px" /> : <DesignSystemIcon name="package" role="empty" />}</div>
          <span className={styles.name}>{name}</span>
          {product?.minPrice != null ? <Price amount={product.minPrice} className={styles.price} /> : null}
          <span className={styles.actions}>
            <Button type="button" variant="ghost" aria-label={`Переместить ${name} влево`} disabled={disabled || index === 0} onClick={() => move(index, -1)}><DesignSystemIcon name="chevron-left" role="utility" /></Button>
            <Button type="button" variant="ghost" aria-label={`Переместить ${name} вправо`} disabled={disabled || index === ids.length - 1} onClick={() => move(index, 1)}><DesignSystemIcon name="chevron-right" role="utility" /></Button>
          </span>
        </li>;
      })}
    </ul>
  </div>;
}
