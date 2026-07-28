import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Price } from "../ui/Price";
import { productPath } from "../../lib/productUrls";

import styles from "./OrderDetail.module.css";

export type OrderDetailProductItem = {
  productId: number;
  productPublicId?: string | null;
  productTitle: string;
  brandName: string | null;
  size?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
};

export type OrderDetailSummary = {
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  totalAmount: number;
};

type Breadcrumb = {
  href?: string;
  label: ReactNode;
};

type OrderDetailSectionIcon = "check" | "info" | "address";

const sectionIconSrc: Record<OrderDetailSectionIcon, string> = {
  check: "/icons/check-circle.svg",
  info: "/icons/info-circle.svg",
  address: "/icons/address-home.svg",
};

type LayoutProps = {
  breadcrumbs: Breadcrumb[];
  title: ReactNode;
  status: ReactNode;
  meta: ReactNode;
  main: ReactNode;
  aside: ReactNode;
};

export function OrderDetailLayout({
  breadcrumbs,
  title,
  status,
  meta,
  main,
  aside,
}: LayoutProps) {
  return (
    <section className={styles.page}>
      <nav className={`${styles.breadcrumbs} textCaption`} aria-label="Навигация">
        {breadcrumbs.map((item, index) => (
          <BreadcrumbItem key={index} item={item} last={index === breadcrumbs.length - 1} />
        ))}
      </nav>

      <div className={styles.layout}>
        <main className={styles.main}>
          <section className={styles.header}>
            <div className={styles.titleRow}>
              <h1 className={`${styles.title} textSectionTitle`}>{title}</h1>
              {status}
            </div>

            <div className={`${styles.meta} textSmall`}>{meta}</div>
          </section>

          {main}
        </main>

        <aside className={styles.aside}>
          <div className={styles.stickyPanel}>{aside}</div>
        </aside>
      </div>
    </section>
  );
}

function BreadcrumbItem({ item, last }: { item: Breadcrumb; last: boolean }) {
  return (
    <>
      {item.href && !last ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
      {!last ? <span>/</span> : null}
    </>
  );
}

export function OrderDetailSection({
  title,
  icon,
  children,
  panel = false,
}: {
  title?: ReactNode;
  icon?: OrderDetailSectionIcon;
  children: ReactNode;
  panel?: boolean;
}) {
  return (
    <section className={panel ? styles.panelSection : styles.section}>
      {title ? (
        <div className={styles.sectionHeading}>
          {icon ? (
            <Image
              src={sectionIconSrc[icon]}
              alt=""
              width={24}
              height={24}
              className={styles.sectionIcon}
            />
          ) : null}
          <h2 className={`${styles.sectionTitle} textTitle`}>{title}</h2>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function OrderDetailProductList({ items }: { items: OrderDetailProductItem[] }) {
  return (
    <div className={styles.products}>
      {items.map((item, index) => (
        <Link
          key={`${item.productId}-${item.productTitle}-${index}`}
          href={productPath({
            id: item.productId,
            publicId: item.productPublicId,
            title: item.productTitle,
          })}
          className={styles.product}
        >
          <div className={styles.imageWrap}>
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.productTitle}
                width={120}
                height={150}
                className={styles.image}
              />
            ) : (
              <div className={styles.imagePlaceholder} />
            )}
          </div>

          <div className={styles.productInfo}>
            <div className={`${styles.productTitle} textBody`}>{item.productTitle}</div>

            {item.brandName ? (
              <div className={`${styles.productBrand} textSmall`}>
                {item.brandName}
              </div>
            ) : null}

            {item.size || item.color ? (
              <div className={`${styles.productMeta} textSmall`}>
                {[item.size, item.color].filter(Boolean).join(" · ")}
              </div>
            ) : null}

            <div className={`${styles.productMeta} textSmall`}>
              {item.quantity} × <Price amount={item.price} />
            </div>
          </div>

          <div className={`${styles.productPrice} textPrice`}>
            <Price amount={item.lineTotal} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export function OrderDetailFields({ children }: { children: ReactNode }) {
  return <div className={styles.formGrid}>{children}</div>;
}

export function OrderDetailPanelFields({ children }: { children: ReactNode }) {
  return <div className={styles.formGridSingle}>{children}</div>;
}

export function OrderDetailField({
  label,
  value,
  strong = false,
  wide = false,
}: {
  label: string;
  value: ReactNode | null | undefined;
  strong?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`${styles.readonlyField} ${wide ? styles.readonlyFieldWide : ""}`.trim()}>
      <span className={`${styles.readonlyLabel} textMicro`}>{label}</span>
      <div className={`${styles.readonlyValue} textBody ${strong ? styles.readonlyValueStrong : ""}`.trim()}>
        {value || "—"}
      </div>
    </div>
  );
}

export function OrderDetailSummary({ summary }: { summary: OrderDetailSummary }) {
  return (
    <OrderDetailPanelFields>
      <OrderDetailField label="Товары" value={<Price amount={summary.subtotalAmount} />} />
      <OrderDetailField
        label="Доставка"
        value={summary.deliveryAmount === 0 ? "Бесплатно" : <Price amount={summary.deliveryAmount} />}
      />
      {summary.discountAmount > 0 ? (
        <OrderDetailField label="Скидка" value={<Price amount={summary.discountAmount} />} />
      ) : null}
      <OrderDetailField label="Итого" value={<Price amount={summary.totalAmount} />} strong />
    </OrderDetailPanelFields>
  );
}

export const orderDetailStyles = styles;
