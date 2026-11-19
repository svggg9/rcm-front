import { DetailsIcon } from "../components/ui/DetailsIcon";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./IconOptionsPreview.module.css";

export function DetailsIconCandidates() {
  return <section aria-labelledby="details-icon-candidates">
    <h3 id="details-icon-candidates">Реквизиты</h3>
    <p className={styles.cartIntro}>Рабочая иконка в кабинете продавца</p>
    <ul className={styles.cartCandidates} aria-label="Иконка реквизитов">
      <li>
        <span className={styles.cartTitle}>02 — Лист с данными</span>
        <span className={styles.statusSlot}><StatusBadge tone="success" size="regular">Активно</StatusBadge></span>
        <span className={styles.cartLarge}><DetailsIcon size={64} /></span>
        <span className={styles.label}>Крупный вид</span>
        <span className={styles.cartSmall}><DetailsIcon size={24} /></span>
        <span className={styles.label}>24 px</span>
        <span className={styles.cartSmall}><DetailsIcon size={20} /></span>
        <span className={styles.label}>20 px</span>
      </li>
    </ul>
  </section>;
}
