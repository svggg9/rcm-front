import { ProductTileSkeleton } from "../components/ui/CommerceSkeleton";
import styles from "./Favorites.module.css";

export default function FavoritesLoading() {
  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Избранное</h1>
        </div>
        <ul
          className={styles.grid}
          aria-label="Загрузка избранного"
          aria-busy="true"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductTileSkeleton key={index} />
          ))}
        </ul>
      </div>
    </div>
  );
}
