"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ConfirmActionButton } from "../../components/ui/ConfirmActionButton";
import { FormSelect } from "../../components/ui/FormSelect";
import { Icon } from "../../components/ui/Icon";
import { PhotoPlaceholder } from "../../components/ui/PhotoPlaceholder";
import { useFavorites } from "../../lib/FavoritesContext";
import { toast } from "../../components/ui/toast";
import { productArticle } from "../../lib/productArticle";
import { productPath } from "../../lib/productUrls";
import { MAX_PRODUCT_QUANTITY } from "../lib/quantityLimits";
import type { CartItem } from "../lib/types";
import styles from "../Cart.module.css";

type Props = {
  item: CartItem;
  showQuantityControls?: boolean;
  pending?: boolean;
  locked?: boolean;
  maxQuantity?: number;
  error?: string;
  quantityAnimationRevision?: number;
  onChangeQty: (variantId: number, qty: number) => void;
  onRemove: (variantId: number) => void | Promise<void>;
  onAfterRemove?: (variantId: number) => void;
  demoFavorite?: { liked: boolean; onChange: (liked: boolean) => void };
};

export function CartItemRow({ item, showQuantityControls = true, pending = false, locked = false,
  maxQuantity = MAX_PRODUCT_QUANTITY, error, quantityAnimationRevision, onChangeQty, onRemove, onAfterRemove, demoFavorite }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const [favoritePending, setFavoritePending] = useState(false);
  const liked = demoFavorite?.liked ?? isFavorite(item.productId);
  const size = item.size?.trim();
  const article = productArticle(item.article);
  const href = productPath({ id: item.productId, publicId: item.publicId, title: item.title, brand: item.brand });
  const quantityErrorId = `cart-quantity-error-${item.variantId}`;
  const quantityLimit = Math.max(0, Math.min(MAX_PRODUCT_QUANTITY, maxQuantity));
  const options = Array.from({ length: Math.max(quantityLimit, item.quantity) }, (_, index) => ({
    value: index + 1, label: String(index + 1), disabled: index + 1 > quantityLimit,
  }));

  async function toggleFavorite(event: React.MouseEvent<HTMLButtonElement>) {
    if (favoritePending) return;
    if (demoFavorite) { demoFavorite.onChange(!liked); return; }
    const origin = event.currentTarget;
    setFavoritePending(true);
    try { await toggle(item.productId, origin); }
    catch { toast.error("Не удалось обновить избранное", { duration: 4000 }); }
    finally { setFavoritePending(false); }
  }

  return <article className={styles.item} aria-label={item.title} aria-busy={pending || undefined}>
    <Link href={href} className={styles.media} aria-label={`Открыть ${item.title}`}>
      {item.imageUrl ? <Image src={item.imageUrl} alt={item.title} fill
        sizes="(max-width: 640px) 36vw, 180px" className={styles.image} />
        : <span className={styles.mediaPlaceholder}><PhotoPlaceholder /></span>}
    </Link>
    <div className={styles.content}>
      <Link href={href} className={styles.main}>
        {item.brand?.trim() && <span className={styles.brand}>{item.brand}</span>}
        <span className={styles.productTitle}>{item.title}</span>
      </Link>
      {item.color?.trim() && <p className={styles.color}>{item.color}</p>}
      {article && <p className={styles.article}><span className={styles.srOnly}>Артикул: </span>{article}</p>}
      {(size || showQuantityControls) && <div className={`${styles.variantFields} ${!size || !showQuantityControls ? styles.variantFieldsSingle : ""}`}>
        {size && <div className={styles.size}><span className={styles.fieldLabel}>Размер</span><span className={styles.sizeValue}>{size}</span></div>}
        {showQuantityControls && <div className={styles.quantityControl}>
          <span className={styles.fieldLabel}>Количество</span>
          <FormSelect<number> size="compact" ariaLabel={`Количество: ${item.title}`} value={item.quantity} options={options}
            valueAnimationRevision={quantityAnimationRevision}
            required disabled={pending || locked || quantityLimit === 0} invalid={Boolean(error)} errorId={quantityErrorId}
            onChange={value => { if (value !== "") onChangeQty(item.variantId, value); }} />
        </div>}
      </div>}
      {error && <p id={quantityErrorId} className={styles.itemError} role="alert">{error}</p>}
      {quantityLimit === 0 && !error && <p className={styles.itemError}>Товар закончился</p>}
      <div className={styles.prices} aria-live="polite">
        {item.quantity > 1 && <span className={styles.unitPrice}>{item.quantity} × {item.price.toLocaleString("ru-RU")} ₽</span>}
        <span>{(item.price * item.quantity).toLocaleString("ru-RU")} ₽</span>
      </div>
      <button type="button" className={styles.favorite} aria-pressed={liked}
        disabled={favoritePending} onClick={event => void toggleFavorite(event)}>
        <span className={styles.favoriteIcon} data-liked={liked || undefined} aria-hidden="true" />
        {liked ? "Удалить из избранного" : "В избранное"}
      </button>
    </div>
    <ConfirmActionButton className={styles.removeBtn} disabled={pending || locked} requireConfirmation={false}
      confirmTitle="Удалить товар из корзины?" confirmText={`«${item.title}» будет удалён из корзины`}
      onConfirm={() => onRemove(item.variantId)} onAfterConfirm={() => onAfterRemove?.(item.variantId)} aria-label={`Удалить ${item.title} из корзины`}>
      <Icon name="x" size={22} strokeWidth={1} />
    </ConfirmActionButton>
  </article>;
}
