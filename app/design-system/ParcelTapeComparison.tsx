import { StatusBadge } from "../components/ui/StatusBadge";
import { ParcelIconCandidate } from "./ParcelIconCandidates";
import { PreviousParcelCandidate, PreviousPickupCandidate } from "./PreviousParcelCandidate";
import styles from "./IconOptionsPreview.module.css";

export function ParcelTapeComparison() {
  const candidates = [
    { title: "Посылка — прежняя", active: false, icon: (size: number) => <PreviousParcelCandidate size={size} /> },
    { title: "Посылка — лента по центру", active: true, icon: (size: number) => <ParcelIconCandidate name="parcel-tape" size={size} /> },
    { title: "Пункт выдачи — прежняя", active: false, icon: (size: number) => <PreviousPickupCandidate size={size} /> },
    { title: "Пункт выдачи — лента по центру", active: true, icon: (size: number) => <ParcelIconCandidate name="pickup-outline" size={size} /> },
  ];

  return <section aria-labelledby="parcel-tape-comparison">
    <h3 id="parcel-tape-comparison">Расположение ленты</h3>
    <p className={styles.cartIntro}>Лента по центру используется на посылке и в метке пункта выдачи</p>
    <ul className={`${styles.cartCandidates} ${styles.fourCandidates}`} aria-label="Варианты расположения ленты">
      {candidates.map(({ title, active, icon }) => <li key={title}>
        <span className={styles.cartTitle}>{title}</span>
        <span className={styles.statusSlot}>{active && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}</span>
        <span className={styles.cartLarge}>{icon(64)}</span>
        <span className={styles.label}>Крупный вид</span>
        <span className={styles.cartSmall}>{icon(24)}</span>
        <span className={styles.label}>24 px</span>
      </li>)}
    </ul>
  </section>;
}
