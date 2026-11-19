import Image from "next/image";
import type { ReactNode } from "react";
import { PhotoPlaceholder } from "../ui/PhotoPlaceholder";
import styles from "./OrderProductCard.module.css";

type Props = {
  title: string;
  brand?: string | null;
  imageUrl?: string | null;
  attributes: string[];
  price: ReactNode;
};

export function OrderProductCard({ title, brand, imageUrl, attributes, price }: Props) {
  return <article className={styles.product}>
    {imageUrl ? <Image src={imageUrl} alt={title} width={80} height={106} className={styles.image} />
      : <div className={styles.placeholder}><PhotoPlaceholder /></div>}
    <div className={styles.copy}>
      {brand && brand.toLocaleLowerCase("ru") !== title.toLocaleLowerCase("ru") && <p className={styles.brand}>{brand}</p>}
      <h4>{title}</h4>
      {attributes.length > 0 && <p className={styles.attributes}>{attributes.map((attribute, index) => <span key={index}>{attribute}</span>)}</p>}
      <span className={styles.price}>{price}</span>
    </div>
  </article>;
}
