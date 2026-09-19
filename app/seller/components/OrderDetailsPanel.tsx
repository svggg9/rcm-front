import Image from "next/image";
import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { DesignSystemIcon as Icon } from "../../components/ui/DesignSystemIcon";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { API_URL } from "../../lib/api";
import { formatRussianPhone } from "../../lib/phone";
import { shippingDeadline } from "../lib/sellerTasks";
import type { OrderCardDetails, SellerOrderCardListItem, OrderCardAudience } from "./SellerOrderCard";
import styles from "./OrderDetailsPanel.module.css";

type Props = {
  order: SellerOrderCardListItem;
  details: OrderCardDetails | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  audience: OrderCardAudience;
  showDeliveryLabel: boolean;
  onOpenOrder?: (id: number) => void;
  openButtonLabel: string;
};

export function OrderDetailsPanel({ order, details, loading, error, onRetry, audience, showDeliveryLabel, onOpenOrder, openButtonLabel }: Props) {
  const paymentLabels = { PAID: "Оплачено", PENDING: "Ожидает оплаты", FAILED: "Ошибка оплаты", CANCELED: "Оплата отменена", REFUNDED: "Деньги возвращены" };
  const deliveryLabels = { PENDING: "Оформление доставки", READY_FOR_SHIPMENT: "К отправке", IN_TRANSIT: "В пути", READY_FOR_PICKUP: "Ожидает получения", DELIVERED: "Доставлен", RETURNED: "Возвращён", CANCELLED: "Отменён" };
  const pickup = details?.deliveryMethod === "PICKUP_POINT" || details?.deliveryMethod === "PICKUP";
  const deadline = audience === "seller" && order.paymentStatus === "PAID"
    && !["CANCELED", "SHIPPED", "COMPLETED"].includes(order.status)
    && ["PENDING", "READY_FOR_SHIPMENT"].includes(order.deliveryStatus) ? shippingDeadline(details?.paidAt) : undefined;
  const headingPrefix = `order-details-${audience}-${order.id}`;
  return <div className={styles.details}>
    <section aria-label="Товары в заказе" className={styles.products}>
      {loading ? <CabinetSkeleton variant="list" rows={1} compact /> : error ? <div className="alertDanger" role="alert">
        <p>Не удалось загрузить детали заказа</p><Button onClick={onRetry}>Повторить</Button>
      </div> : details?.items.length ? <ul className={styles.productList}>
        {details.items.map(item => <li key={`${item.productId}-${item.variantId}`}>
          <article className={styles.product}>
            {item.imageUrl ? <Image src={item.imageUrl} alt={item.productTitle} width={80} height={106} className={styles.productImage} />
              : <div className={styles.productImagePlaceholder}><Icon name="package" role="empty" /></div>}
            <div className={styles.productCopy}>
              {item.brandName && item.brandName.toLocaleLowerCase("ru") !== item.productTitle.toLocaleLowerCase("ru") && <p className={styles.brand}>{item.brandName}</p>}
              <h4>{item.productTitle}</h4>
              <p className={styles.variant}>
                {item.size && <span>Размер {item.size}</span>}{item.color && <span>{item.color}</span>}
                {item.quantity > 1 && <span>{item.quantity} шт</span>}
              </p>
              <span className={styles.productPrice}><OrderAmount value={item.lineTotal} currency={details.currency} /></span>
            </div>
          </article>
        </li>)}
      </ul> : <p>{(order.productTitles?.length ? order.productTitles : [order.firstProductTitle]).filter(Boolean).join(", ") || "Состав заказа недоступен"}</p>}
    </section>

    <section className={styles.row} aria-labelledby={`${headingPrefix}-payment`}>
      <div className={styles.rowHeading}>
        <h3 id={`${headingPrefix}-payment`}>Оплата</h3>
        <StatusBadge tone={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "PENDING" ? "warning" : "danger"}>
          {paymentLabels[order.paymentStatus] || order.paymentStatus}
        </StatusBadge>
      </div>
      <dl className={styles.totals}>
        <div><dt>Товары</dt><dd>{details ? <OrderAmount value={details.subtotalAmount} currency={details.currency} /> : "—"}</dd></div>
        <div><dt>Доставка</dt><dd>{details ? details.deliveryAmount === 0 ? "Бесплатно" : <OrderAmount value={details.deliveryAmount} currency={details.currency} /> : "—"}</dd></div>
        {details && details.discountAmount > 0 && <div><dt>Скидка</dt><dd>−<OrderAmount value={details.discountAmount} currency={details.currency} /></dd></div>}
        <div className={styles.total}><dt>Итого</dt><dd><OrderAmount value={details?.totalAmount ?? order.totalAmount} currency={details?.currency || order.currency} /></dd></div>
      </dl>
    </section>

    <section className={styles.row} aria-labelledby={`${headingPrefix}-delivery`}>
      <div className={styles.rowHeading}>
        <h3 id={`${headingPrefix}-delivery`}>Доставка</h3>
        <p>{deliveryLabels[order.deliveryStatus] || order.deliveryStatus}</p>
        {details?.deliveryMethod && <p>{pickup ? "СДЭК, пункт выдачи" : details.deliveryMethod === "COURIER" ? "Курьером" : details.deliveryMethod}</p>}
        {deadline && <p>Передать до <time dateTime={deadline}>{new Date(deadline).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</time></p>}
      </div>
      <div className={styles.delivery}>
        <address className={styles.address}>
          {details?.deliveryAddress && <div><span className={styles.caption}>{pickup ? "Пункт выдачи" : "Адрес"}</span><p>{details.deliveryAddress}</p></div>}
          <div><span className={styles.caption}>Получатель</span><p>{details?.recipientName || order.recipientName || "—"}</p>
            {details?.recipientPhone && <p>{formatRussianPhone(details.recipientPhone)}</p>}
          </div>
          {(details?.delivery?.cdekNumber || details?.trackingNumber) && <div><span className={styles.caption}>Номер отправления</span><p>{details.delivery?.cdekNumber || details.trackingNumber}</p></div>}
        </address>
        <div className={styles.actions}>
          {details?.delivery?.trackingUrl && <a href={details.delivery.trackingUrl} target="_blank" rel="noreferrer" className="buttonSecondary">Отследить</a>}
          {audience === "seller" && details?.delivery && showDeliveryLabel && <a href={`${API_URL}/api/seller/orders/${order.id}/delivery-label`} target="_blank" rel="noreferrer" className="buttonSecondary">Накладная СДЭК</a>}
          {onOpenOrder && <Button variant="primary" onClick={() => onOpenOrder(order.id)}>{openButtonLabel}</Button>}
        </div>
      </div>
    </section>
  </div>;
}

function OrderAmount({ value, currency }: { value: number; currency: string }) {
  return <>{new Intl.NumberFormat("ru-RU", { style: "currency", currency: currency || "RUB", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)}</>;
}
