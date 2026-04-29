"use client";

import Image from "next/image";
import { CartItem } from "../lib/types";
import styles from "../Cart.module.css";

type Props = {
  item: CartItem;
  onChangeQty: (variantId: number, qty: number) => void;
  onRemove: (variantId: number) => void;
};

export function CartItemRow({ item, onChangeQty, onRemove }: Props) {
  return (
    <div className={styles.item}>
      <div className={styles.imageWrap}>
        <Image
          src={item.imageUrl ?? "/placeholder.png"}
          alt={item.title}
          fill
          sizes="80px"
          className={styles.image}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.main}>
          <div className={styles.brand}>{item.title}</div>

          <div className={styles.meta}>Размер: {item.size}</div>
          <div className={styles.meta}>Цвет: {item.color}</div>
        </div>
      </div>

      <div className={styles.side}>
        <div className={styles.price}>
          {item.price.toLocaleString()} ₽
        </div>

        <div className={styles.controls}>
          <div className={styles.qty}>
            <button
              type="button"
              disabled={item.quantity <= 1}
              onClick={() =>
                onChangeQty(item.variantId, item.quantity - 1)
              }
            >
              −
            </button>

            <span>{item.quantity}</span>

            <button
              type="button"
              onClick={() =>
                onChangeQty(item.variantId, item.quantity + 1)
              }
            >
              +
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.iconBtn} aria-label="В избранное">
            <Image
              src="/icons/like.svg"
              alt=""
              width={20}
              height={20}
              className={styles.icon}
            />
          </button>

          <button
            className={styles.iconBtn}
            onClick={() => onRemove(item.variantId)}
            aria-label="Удалить"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}