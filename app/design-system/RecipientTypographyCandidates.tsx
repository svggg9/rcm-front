import orderStyles from "../seller/components/OrderDetailsPanel.module.css";
import styles from "./RecipientTypographyCandidates.module.css";

const variants = [
  { id: "current", title: "Раньше", description: "Заголовок — 12 px / 400, текст — 16 px / 400" },
  { id: "medium", title: "01 — Мягкий акцент", description: "Выбранный вариант: заголовок — 13 px / 600, текст — 16 px / 400" },
  { id: "emphasis", title: "02 — Жирный заголовок", description: "Заголовок — 13 px / 700, текст — 16 px / 400" },
  { id: "larger", title: "03 — Крупный заголовок", description: "Заголовок — 14 px / 700, текст — 16 px / 400" },
] as const;

export function RecipientTypographyCandidates() {
  return <section className={styles.candidates} aria-labelledby="recipient-typography-title">
    <h3 id="recipient-typography-title">Текст получателя — варианты</h3>
    <p className={styles.intro}>Manrope, условные данные. Вариант 01 применяется в панели заказа</p>
    <div className={styles.grid}>
      {variants.map(variant => <section key={variant.id} className={styles.card}>
        <h4>{variant.title}</h4>
        <p className={styles.description}>{variant.description}</p>
        <address className={`${orderStyles.address} ${variant.id === "medium" ? "" : styles[variant.id]}`}>
          <div>
            <span className={`${orderStyles.caption} ${styles.caption}`}>Получатель</span>
            <p className={styles.name}>Демонстрационный покупатель</p>
            <p className={styles.phone}>+7 (900) 000-00-00</p>
          </div>
        </address>
      </section>)}
    </div>
  </section>;
}
