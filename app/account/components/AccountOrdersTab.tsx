"use client";
import Link from "next/link";
import Image from "next/image";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import { Price } from "../../components/ui/Price";
import { EmptyState } from "../../components/ui/EmptyState";
import { orderNumber, orderDate, itemCount, orderTone, shortDeliveryAddress } from "../lib/presentation";
import type { OrderListItem } from "../types";
import styles from "./AccountOrdersTab.module.css";
export function AccountOrdersTab({orders,totalElements=orders.length,loadingMore=false,onLoadMore,buildOrderStatusLabel,onOpenOrder,onPrefetchOrder}:{
  orders:OrderListItem[];totalElements?:number;loadingMore?:boolean;onLoadMore?:()=>void;buildOrderStatusLabel:(order:OrderListItem)=>string;
  onOpenOrder:(id:number)=>void;onLoadOrder?:unknown;onPrefetchOrder?:(id:number)=>void;
}){
  return <section className={styles.page}>
    {!orders.length ? <EmptyState title="Заказов пока нет" text="Здесь появятся ваши покупки" actions={<Link href="/catalog" className="buttonPrimary">Перейти в каталог</Link>} /> : <div className={styles.list}>
      {orders.map(order=><Link href={`/account?tab=orders&orderId=${order.id}`} key={order.id} className={styles.order} onMouseEnter={()=>onPrefetchOrder?.(order.id)} onFocus={()=>onPrefetchOrder?.(order.id)} onClick={event=>{if(!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onOpenOrder(order.id);}}}>
        <div className={styles.top}><span className={styles.status} data-tone={orderTone(order)}>{buildOrderStatusLabel(order)}</span><span>№ {orderNumber(order)}</span><time dateTime={order.createdAt}>{orderDate(order.createdAt)}</time></div>
        {order.deliveryAddress ? <p className={styles.address}>{shortDeliveryAddress(order.deliveryAddress)}</p> : null}
        <div className={styles.images}>{(order.imageUrls?.length ? order.imageUrls : [order.firstImageUrl]).slice(0,4).map((url,index)=>url?<Image key={index} src={url} alt={order.productTitles?.[index] || order.firstProductTitle || "Товар в заказе"} width={64} height={92} />:<span className={styles.placeholder} key={index}/>)}{(order.imageUrls?.length ?? 0)>4 ? <span className={styles.more}>+{order.imageUrls!.length-4}</span> : null}</div>
        <div className={styles.summary}>{itemCount(order.itemsCount)} <span aria-hidden="true">|</span> <Price amount={order.totalAmount}/></div>
      </Link>)}
    </div>}
    <ListLoadMore loaded={orders.length} total={totalElements} loading={loadingMore} onLoadMore={onLoadMore}/>
  </section>;
}
