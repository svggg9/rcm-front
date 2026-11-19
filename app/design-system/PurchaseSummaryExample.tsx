import Image from "next/image";
import { DataTable } from "../components/ui/DataTable";
import { Price } from "../components/ui/Price";
import styles from "./PurchaseSummaryExample.module.css";

const items = [
  { id: 1, name: "Рубашка из хлопка", brand: "РЦМАРКЕТ", color: "Молочный", size: "M", quantity: 1, price: 5900 },
  { id: 2, name: "Футболка", brand: "РЦМАРКЕТ", color: "Чёрный", size: "L", quantity: 2, price: 2400 },
];

type TypographyVariant = "calm" | "editorial" | "functional";
type CurrencyAccent = "all" | "total" | "default";

const variants: { id: string; typography: TypographyVariant; currency: CurrencyAccent; title: string; description: string }[] = [
  { id: "calm-all", typography: "calm", currency: "all", title: "01А — Золотой рубль у всех цен", description: "Выбранный вариант: знак рубля выделен золотом у каждой суммы" },
  { id: "calm-total", typography: "calm", currency: "total", title: "01Б — Золотой рубль в итоге", description: "Золотой знак рубля только у итоговой суммы" },
  { id: "editorial", typography: "editorial", currency: "default", title: "02 — Выразительный", description: "Крупный заголовок и акцентные подписи в духе референса" },
  { id: "functional", typography: "functional", currency: "default", title: "03 — Практичный", description: "Читаемые данные и заметный итог при умеренном заголовке" },
];

/** Visual examples with fictional data, without real purchase actions. */
export function PurchaseSummaryExample() {
  return <div className={styles.variants}>
    {variants.map(variant => <section key={variant.id} className={styles.variant} aria-labelledby={`purchase-summary-variant-${variant.id}`}>
      <h3 id={`purchase-summary-variant-${variant.id}`} className={styles.variantTitle}>{variant.title}</h3>
      <p className={styles.variantDescription}>{variant.description}</p>
      <PurchaseSummaryDocument id={variant.id} variant={variant.typography} currency={variant.currency} />
    </section>)}
  </div>;
}

function PurchaseSummaryDocument({ id, variant, currency }: { id: string; variant: TypographyVariant; currency: CurrencyAccent }) {
  const titleId = `purchase-summary-example-title-${id}`;
  return (
    <article className={`${styles.document} ${styles[variant]} ${currency === "all" ? styles.goldAll : currency === "total" ? styles.goldTotal : ""}`} aria-labelledby={`purchase-summary-variant-${id} ${titleId}`}>
      <header className={styles.header}>
        <div>
          {variant === "calm" && <p className={styles.headerDate}>7 ноября 2026</p>}
          <h4 id={titleId}>{variant === "calm" ? "Заказ № 1042" : "Сводка покупки"}</h4>
        </div>
        <Image className={styles.logo} src="/brand/wordmark-gold-black.svg" width={174} height={22} alt="рцмаркет" />
      </header>

      {variant !== "calm" && <div className={styles.meta}>
        <div><p><span className={styles.metaLabel}>Номер заказа</span> <strong>№ 1042</strong></p><p><span className={styles.metaLabel}>Дата заказа</span> <strong>7 ноября 2026</strong></p></div>
        <div className={styles.metaRight}><p>рцмаркет</p><p>Покупки у российских брендов</p></div>
      </div>}

      <div className={styles.parties}>
        <section aria-label="Получатель">
          {variant !== "calm" && <h5>Получатель</h5>}
          {variant === "calm" ? <><p>+7 (900) 000-00-00</p><p>Алексей Иванов</p></> : <><p>Алексей Иванов</p><p>+7 (900) 000-00-00</p></>}
        </section>
        <section className={styles.alignRight} aria-label="Оплата">
          {variant !== "calm" && <h5>Оплата</h5>}
          {variant === "calm" ? <p>Оплачено онлайн</p> : <><p>Онлайн</p><p>Оплачено</p></>}
        </section>
      </div>

      <p className={styles.scrollHint}>Прокрутите таблицу, чтобы увидеть все столбцы</p>
      <div className={styles.tableScroll} role="region" aria-label="Таблица состава и итогов заказа" tabIndex={0}>
        <DataTable className={styles.table} aria-label="Состав и итоги заказа">
          <colgroup><col className={styles.productCol} /><col className={styles.quantityCol} /><col className={styles.priceCol} /><col className={styles.totalCol} /></colgroup>
          <thead><tr><th scope="col">Товар</th><th scope="col">{variant === "calm" ? "Кол-во" : "Количество"}</th><th scope="col">Цена</th><th scope="col">Сумма</th></tr></thead>
          <tbody>
            {items.map(item => <tr key={item.id}>
              <td><strong>{item.name}</strong><small className={styles.productDetails}><span>{item.brand}</span>{" "}<span>{item.color}</span>{" "}<span>{item.size}</span></small></td>
              <td>{item.quantity}</td><td><Price amount={item.price} /></td><td><Price amount={item.price * item.quantity} /></td>
            </tr>)}
            {[1, 2, 3].map(row => <tr key={row} className={styles.emptyRow} aria-hidden="true"><td>&nbsp;</td><td /><td /><td /></tr>)}
          </tbody>
          <tfoot>
            <tr><th colSpan={3} scope="row">Товары</th><td><Price amount={10700} /></td></tr>
            <tr><th colSpan={3} scope="row">Доставка</th><td><Price amount={350} /></td></tr>
            <tr className={styles.grandTotal}><th colSpan={3} scope="row">Итого</th><td><Price amount={11050} /></td></tr>
          </tfoot>
        </DataTable>
      </div>

      <footer className={styles.footer}>
        <section><h5>Доставка</h5><p>СДЭК, пункт выдачи</p><p>Санкт-Петербург, Примерная улица, 10</p></section>
        {variant !== "calm" && <><section><h5>Заказ</h5><p>Данные заказа доступны в личном кабинете</p></section>
        <p className={styles.thanks}>Спасибо за покупку</p></>}
      </footer>
    </article>
  );
}
