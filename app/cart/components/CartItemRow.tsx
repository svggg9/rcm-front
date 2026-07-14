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
  onChangeQty: (variantId: number, qty: number) => void;
  onRemove: (variantId: number) => void;
};

export function CartItemRow({
  item,
  showQuantityControls = true,
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
    <div className={styles.item}>
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
            sizes="80px"
            className={styles.image}
          />
        </Link>

        <button type="button" className={styles.likeBtn} aria-label="В избранное">
          <Image
            src="/icons/like.svg"
            alt=""
            width={20}
            height={20}
            className={styles.likeIcon}
          />
        </button>
      </div>

      <div className={styles.content}>
        <Link href={href} className={styles.main}>
          {brand ? <div className={styles.brand}>{brand}</div> : null}
          <div className={styles.productTitle}>{item.title}</div>

          {size ? <div className={styles.meta}>Размер: {size}</div> : null}
          {color ? <div className={styles.meta}>Цвет: {color}</div> : null}
        </Link>
      </div>

      <div className={styles.side}>
        <div className={styles.sideTop}>
          <div className={styles.price}>
            <Price amount={item.price} />
          </div>

          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => onRemove(item.variantId)}
            aria-label="Удалить"
          >
            <Icon name="x" size={15} strokeWidth={1.4} />
          </button>
        </div>

        {showQuantityControls ? (
          <div className={styles.controls}>
            <div className={styles.qty}>
              <button
                type="button"
                disabled={item.quantity <= 1}
                onClick={() => onChangeQty(item.variantId, item.quantity - 1)}
                aria-label="Уменьшить количество"
              >
                <Icon name="minus" size={15} strokeWidth={1.4} />
              </button>

              <span>{item.quantity}</span>

              <button
                type="button"
                onClick={() => onChangeQty(item.variantId, item.quantity + 1)}
                aria-label="Увеличить количество"
              >
                <Icon name="plus" size={15} strokeWidth={1.4} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
