import Link from "next/link";
import type { ReactNode } from "react";
import styles from "../ProductPage.module.css";

type Props = {
  brand: string;
  brandHref?: string | null;
  title: string;
  titleAs?: "h1" | "h4";
  priceLabel?: string | null;
  actions?: ReactNode;
};

/** The purchase heading is shared with the live design-system example. */
export function ProductInfoHeading({ brand, brandHref, title, titleAs: Title = "h1", priceLabel, actions }: Props) {
  return <div className={styles.heading}>
    {brand.trim() ? brandHref
      ? <Link href={brandHref} className={styles.brand}>{brand}</Link>
      : <div className={styles.brand}>{brand}</div> : null}
    <div className={styles.titleRow}>
      <Title className={styles.title}>{title}</Title>
      {actions && <div className={styles.headingActions}>{actions}</div>}
    </div>
    {priceLabel != null && <div className={styles.priceBlock}><div className={styles.price}>{priceLabel} ₽</div></div>}
  </div>;
}
