import { Icon } from "../components/ui/Icon";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./IconOptionsPreview.module.css";

export function FilterIconCandidates() {
  return <section aria-labelledby="filter-icon-candidates">
    <h3 id="filter-icon-candidates">Фильтры</h3>
    <p className={styles.cartIntro}>Рабочая иконка фильтров</p>
    <ul className={styles.cartCandidates} aria-label="Иконка фильтров">
      <li>
        <span className={styles.cartTitle}>04 — Воронка</span>
        <span className={styles.statusSlot}><StatusBadge tone="success" size="regular">Активно</StatusBadge></span>
        <span className={styles.cartLarge}><Icon name="sliders" size={64} /></span>
        <span className={styles.label}>Крупный вид</span>
        <span className={styles.cartSmall}><Icon name="sliders" size={24} /></span>
        <span className={styles.label}>24 px</span>
        <span className={styles.cartSmall}><Icon name="sliders" size={20} /></span>
        <span className={styles.label}>20 px</span>
      </li>
    </ul>
  </section>;
}
