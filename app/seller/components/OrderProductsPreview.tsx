"use client";

import { Loader } from "../../components/ui/Loader";
import Image from "next/image";
import { useState } from "react";
import { Icon } from "../../components/ui/Icon";
import type { OrderCardDetails, SellerOrderCardListItem } from "./SellerOrderCard";
import styles from "./OrderProductsPreview.module.css";

type Props = {
  order: SellerOrderCardListItem;
  details: OrderCardDetails | null;
  loading: boolean;
  error: boolean;
  onRetry?: () => void;
  compact?: boolean;
  summaryOnly?: boolean;
};

export function OrderProductsPreview({ order, details, loading, error, onRetry, compact = false, summaryOnly = false }: Props) {
  const [showAll, setShowAll] = useState(false);
  const fallbackTitles = order.productTitles?.length ? order.productTitles : [order.firstProductTitle].filter((title): title is string => Boolean(title));
  const items = details ? details.items : fallbackTitles.map((productTitle, index) => ({
    productTitle, imageUrl: index === 0 ? order.firstImageUrl : null,
    size: null, color: null, quantity: null,
  }));
  const remaining = Math.max(0, items.length - 2);
  const listId = `seller-order-products-${order.id}`;

  return <section className={`${styles.preview} ${compact ? styles.compact : ""}`} aria-label={`Товары заказа ${order.id}`} aria-busy={loading || undefined}>
    {items.length ? <ul id={listId} className={styles.list}>
      {(showAll ? items : items.slice(0, 2)).map((item, index) => <li className={styles.product} key={index}>
        <ProductImage src={item.imageUrl} />
        <div className={styles.copy}>
          <span className={styles.title}>{item.productTitle}</span>
          <span className={styles.variant}>
            {item.size && <span>Размер {item.size}</span>}
            {item.color && <span>{item.color}</span>}
            {item.quantity !== null && <span>{item.quantity} шт.</span>}
          </span>
        </div>
      </li>)}
    </ul> : loading ? <Loader inline label="Загрузка товаров заказа" /> : <p className={styles.note}>Состав заказа недоступен</p>}
    {remaining > 0 && summaryOnly ? <span className={styles.note}>Ещё {remaining} {productWord(remaining)}</span> : remaining > 0 && <button type="button" className={styles.more} aria-expanded={showAll} aria-controls={listId}
      onClick={() => setShowAll(value => !value)}>
      {showAll ? "Свернуть товары" : `Ещё ${remaining} ${productWord(remaining)}`}
    </button>}
    {error && <div className={styles.note} role="status">Не удалось загрузить полный состав заказа. {onRetry && <button type="button" className={styles.more} onClick={onRetry}>Повторить</button>}</div>}
  </section>;
}

function ProductImage({ src }: { src: string | null }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && src !== failedSrc ? <Image src={src} alt="" width={48} height={64} className={styles.image} onError={() => setFailedSrc(src)} />
    : <span className={styles.placeholder} aria-hidden="true"><Icon name="package" size={24} /></span>;
}

function productWord(count: number) {
  if (count % 100 >= 11 && count % 100 <= 14) return "товаров";
  if (count % 10 === 1) return "товар";
  if (count % 10 >= 2 && count % 10 <= 4) return "товара";
  return "товаров";
}
