import Link from "next/link";
import styles from "./ProductCard.module.css";
import { useState } from "react";

type Variant = {
  price: number;
};

type Product = {
  id: number;
  title: string;
  images: string[];
  variants: Variant[];
  brand: string;
};

export function ProductCard({ product }: { product: Product }) {
  const mainImage = product.images?.[0];
  const hoverImage = product.images?.[1];

  const prices = product.variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;

  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link
      href={`/product/${product.id}`}
      className="block"
    >
      <div className={styles.productCard}> 


        {/* IMAGE */}
        <div className={styles.imageWrapper}>

                    {!imageLoaded && (
            <div className={styles.imageLoader} />
        )} 

          {mainImage && (
            <img
              src={mainImage}
              alt={product.title}
              loading="lazy"
              className={styles.imageMain}
              onLoad={() => setImageLoaded(true)}
            />
          )}

          {hoverImage && (
            <img
              src={hoverImage}
              alt={product.title}
              loading="eager"
              className={styles.imageHover}
            />
          )}

          {!mainImage && (
            <div className="image-placeholder">
              Нет изображения
            </div>
          )}
        </div>

        {/* TEXT */}
        <div className={styles.cardText}>
          <div className={styles.cardTitle}>{product.brand} {product.title}</div>
          <div className={styles.cardPrice}>{minPrice} ₽</div>
        </div>
      </div>
    </Link>
  );
}
