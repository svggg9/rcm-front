"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "../../components/ui/Icon";
import { Price } from "../../components/ui/Price";
import { productPath } from "../../lib/productUrls";
import { CartItem } from "../lib/types";
import styles from "../Cart.module.css";

type Props = {
  item: CartItem;
  showQuantityControls?: boolean;
  pending?: boolean;
  onChangeQty: (variantId: number, qty: number) => void;
  onRemove: (variantId: number) => void;
};

export function CartItemRow({
  item,
  showQuantityControls = true,
  pending = false,
  onChangeQty,
  onRemove,
}: Props) {
  const brand = item.brand?.trim();
  const size = item.size?.trim();
  const color = item.color?.trim();
  const href = productPath({
    id: item.productId,
    publicId: item.publicId,
    title: item.title,
    brand: item.brand,
  });

  return (
    <article className={styles.item} aria-busy={pending || undefined}>
      <div className={styles.media}>
        <Link
          href={href}
          className={styles.imageWrap}
          aria-label={`Открыть ${item.title}`}
        >
          <Image
            src={item.imageUrl ?? "/placeholder.png"}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 104px, 136px"
            className={styles.image}
          />
        </Link>
      </div>

      <div className={styles.content}>
        <div className={styles.itemHeader}>
          <Link href={href} className={styles.main}>
            {brand ? <div className={styles.brand}>{brand}</div> : null}
            <div className={styles.productTitle}>{item.title}</div>
          </Link>

          <div className={styles.price}>
            <Price amount={item.price} />
          </div>
        </div>

        {size || color ? (
          <div className={styles.variantMeta}>
            {size ? <span>Размер: {size}</span> : null}
            {size && color ? <span aria-hidden="true">·</span> : null}
            {color ? <span>Цвет: {color}</span> : null}
          </div>
        ) : null}

        <div className={styles.itemActions}>
          {showQuantityControls ? (
            <div className={styles.quantityControl}>
              <span className={styles.quantityLabel}>Количество</span>
            <div className={styles.qty}>
              <button
                type="button"
                  disabled={pending || item.quantity <= 1}
                onClick={() => onChangeQty(item.variantId, item.quantity - 1)}
                aria-label="Уменьшить количество"
              >
                <Icon name="minus" size={15} strokeWidth={1.4} />
              </button>

                <span aria-live="polite">{item.quantity}</span>

              <button
                type="button"
                  disabled={pending}
                onClick={() => onChangeQty(item.variantId, item.quantity + 1)}
                aria-label="Увеличить количество"
              >
                <Icon name="plus" size={15} strokeWidth={1.4} />
              </button>
            </div>
          </div>
          ) : null}

          <button
            type="button"
            className={styles.removeBtn}
            disabled={pending}
            onClick={() => onRemove(item.variantId)}
          >
            <Icon name="x" size={14} strokeWidth={1.4} />
            <span>Удалить</span>
          </button>
        </div>
      </div>
    </article>
  );
}
