import { Icon } from "../components/ui/Icon";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./IconOptionsPreview.module.css";

export function DeleteIconCandidates() {
  return <section aria-labelledby="delete-icon-candidates">
    <h3 id="delete-icon-candidates">Удаление</h3>
    <p className={styles.cartIntro}>Рабочая иконка удаления</p>
    <ul className={styles.cartCandidates} aria-label="Иконка удаления">
      <li>
        <span className={styles.cartTitle}>02 — Ровная</span>
        <span className={styles.statusSlot}><StatusBadge tone="success" size="regular">Активно</StatusBadge></span>
        <span className={styles.cartLarge}><Icon name="trash" size={64} /></span>
        <span className={styles.label}>Крупный вид</span>
        <span className={styles.cartSmall}><Icon name="trash" size={24} /></span>
        <span className={styles.label}>24 px</span>
        <span className={styles.cartSmall}><Icon name="trash" size={20} /></span>
        <span className={styles.label}>20 px</span>
      </li>
    </ul>
  </section>;
}
