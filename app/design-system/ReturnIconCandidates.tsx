import { Icon } from "../components/ui/Icon";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./IconOptionsPreview.module.css";

export function ReturnIconCandidates() {
  return <section aria-labelledby="return-icon-candidates">
    <h3 id="return-icon-candidates">Возврат</h3>
    <p className={styles.cartIntro}>Рабочая иконка возврата</p>
    <ul id="return-circle-variants" className={styles.cartCandidates} aria-label="Иконка возврата">
      <li>
        <span className={styles.cartTitle}>06 — Ровная дуга</span>
        <span className={styles.statusSlot}><StatusBadge tone="success" size="regular">Активно</StatusBadge></span>
        <span className={styles.cartLarge}><Icon name="return-circle" size={64} /></span>
        <span className={styles.label}>Крупный вид</span>
        <span className={styles.cartSmall}><Icon name="return-circle" size={24} /></span>
        <span className={styles.label}>24 px</span>
        <span className={styles.cartSmall}><Icon name="return-circle" size={20} /></span>
        <span className={styles.label}>20 px</span>
      </li>
    </ul>
  </section>;
}
