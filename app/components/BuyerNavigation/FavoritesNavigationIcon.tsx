import { BuyerNavigationIcon } from "./BuyerNavigationIcon";
import styles from "./FavoritesNavigationIcon.module.css";

export function FavoritesNavigationIcon({ count, pulseKey = 0, flightTarget }: { count: number; pulseKey?: number; flightTarget?: "desktop" | "mobile" }) {
  return <span className={styles.icon} data-favorite-flight-target={flightTarget} aria-hidden="true">
    <span key={pulseKey} className={styles.content} data-pulse={pulseKey > 0 || undefined}>
    <BuyerNavigationIcon name="heart" />
    {count > 0 ? <span className={styles.count}>{count > 99 ? "99+" : count}</span> : null}
    </span>
  </span>;
}
