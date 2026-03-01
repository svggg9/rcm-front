import styles from "./SkeletonTile.module.css";

export function SkeletonTile() {
  return (
    <li className={styles.item}>
      <div className={styles.media} />
      <div className={styles.line} />
      <div className={styles.lineShort} />
    </li>
  );
}