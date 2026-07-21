import styles from "./CommerceSkeleton.module.css";

export function ProductTileSkeleton() {
  return (
    <li className={styles.product} aria-hidden="true">
      <Block className={styles.productMedia} />
      <div className={styles.productInfo}>
        <Block className={styles.productBrand} />
        <Block className={styles.productTitle} />
        <Block className={styles.productPrice} />
      </div>
    </li>
  );
}

export function CartContentSkeleton() {
  return (
    <div
      className={styles.cartGrid}
      role="status"
      aria-label="Загрузка корзины"
      aria-busy="true"
    >
      <span className={styles.srOnly}>Загрузка корзины</span>

      <div className={styles.cartItems} aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className={styles.cartItem} key={index}>
            <Block className={styles.cartMedia} />
            <div className={styles.cartContent}>
              <Block className={styles.cartBrand} />
              <Block className={styles.cartTitle} />
              <Block className={styles.cartMeta} />
            </div>
            <div className={styles.cartSide}>
              <Block className={styles.cartRemove} />
              <Block className={styles.cartAmount} />
              <div className={styles.cartCounter}>
                <Block />
                <Block />
                <Block />
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className={styles.summary} aria-hidden="true">
        <div className={styles.summaryRows}>
          <SummaryRow />
          <SummaryRow />
          <SummaryRow total />
        </div>
        <Block className={styles.summaryButton} />
      </aside>
    </div>
  );
}

function SummaryRow({ total = false }: { total?: boolean }) {
  return (
    <div className={styles.summaryRow}>
      <Block className={total ? styles.summaryLabelWide : styles.summaryLabel} />
      <Block className={total ? styles.summaryValueWide : styles.summaryValue} />
    </div>
  );
}

function Block({ className = "" }: { className?: string }) {
  return <div className={`${styles.block} ${className}`.trim()} />;
}
