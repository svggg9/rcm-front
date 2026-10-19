import Image from "next/image";
import Link from "next/link";
import { Price } from "../../components/ui/Price";
import { productPath } from "../../lib/productUrls";
import type { OrderItem } from "../types";
import styles from "./AccountCommerce.module.css";
export function AccountProductRow({item,children,linked=true}:{item:OrderItem;children?:React.ReactNode;linked?:boolean}){
  const content=<><div className={styles.image}>{item.imageUrl?<Image src={item.imageUrl} alt={item.productTitle} width={144} height={192}/>:null}</div><div className={styles.productInfo}>
    {item.brandName?<span className={styles.brand}>{item.brandName}</span>:null}
    <span className={styles.productTitle}>{item.productTitle}</span><span className={styles.price}><Price amount={item.lineTotal}/></span>
    <span className={styles.variant}>{[item.size,item.color].filter(Boolean).join(" | ")}</span>
    {item.quantity>1?<span className={styles.quantity}>{item.quantity} × <Price amount={item.price}/></span>:null}
    {children}</div></>;
  return linked?<Link className={styles.product} href={productPath({id:item.productId,publicId:item.productPublicId,title:item.productTitle})}>{content}</Link>:<div className={styles.product}>{content}</div>;
}
