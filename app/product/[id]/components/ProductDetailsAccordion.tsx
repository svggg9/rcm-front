"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import styles from "../ProductPage.module.css";
import { ProductDescriptionText } from "./ProductDescriptionText";

import type { Product } from "../lib/types";

type Props = {
  product: Product;
  openComposition: boolean;
  openBrand: boolean;
  onToggleComposition: () => void;
  onToggleBrand: () => void;
};

function ChevronIcon() {
  return (
    <span className={styles.accIcon} aria-hidden="true">
      <Icon name="chevron-down" size={20} strokeWidth={1.5} />
    </span>
  );
}

export function ProductDetailsAccordion({
  product,
  openComposition,
  openBrand,
  onToggleComposition,
  onToggleBrand,
}: Props) {
  const pathname = usePathname();
  const composition = product.composition?.trim();
  const brandDescription = product.brandDescription?.trim();
  if (!composition && !brandDescription) return null;

  return (
    <div className={styles.accordion}>
      {composition ? (
        <section className={styles.accItem}>
          <button
            type="button"
            className={styles.accBtn}
            onClick={onToggleComposition}
            aria-expanded={openComposition}
          >
            <span>Состав</span>
            <ChevronIcon />
          </button>
          {openComposition ? (
            <div className={styles.accBodyOpen}>
              <ProductDescriptionText text={composition} fallback="" />
            </div>
          ) : null}
        </section>
      ) : null}

      {brandDescription ? (
        <section className={styles.accItem}>
          <button
            type="button"
            className={styles.accBtn}
            onClick={onToggleBrand}
            aria-expanded={openBrand}
          >
            <span>О бренде</span>
            <ChevronIcon />
          </button>

          {openBrand ? (
            <div className={styles.accBody}>
              <div className={styles.brandAboutText}>
                <ProductDescriptionText text={brandDescription} fallback="" />
                {product.brandSlug ? (
                  <Link href={`/brand/${product.brandSlug}?returnTo=${encodeURIComponent(pathname)}`}>
                    Все товары бренда
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
