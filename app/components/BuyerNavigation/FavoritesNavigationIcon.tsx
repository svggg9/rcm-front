import { BuyerNavigationIcon } from "./BuyerNavigationIcon";
import styles from "./FavoritesNavigationIcon.module.css";

export function FavoritesNavigationIcon({ count }: { count: number }) {
  return <span className={styles.icon} aria-hidden="true">
    <BuyerNavigationIcon name="heart" />
    {count > 0 ? <span className={styles.count}>{count > 99 ? "99+" : count}</span> : null}
  </span>;
}
