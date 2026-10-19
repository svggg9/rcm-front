import { SkeletonBlock } from "../../components/ui/SkeletonBlock";
import { ProductTileSkeleton } from "../../components/ui/CommerceSkeleton";
import type { AccountTab } from "./AccountSidebar";
import ordersStyles from "./AccountOrdersTab.module.css";
import profileStyles from "./AccountProfileTab.module.css";
import commerceStyles from "./AccountCommerce.module.css";
import returnsStyles from "./AccountReturnsTab.module.css";
import brandsStyles from "./AccountBrandsTab.module.css";
import favoritesStyles from "./AccountFavoritesTab.module.css";
import styles from "./AccountSkeleton.module.css";

type Variant = Exclude<AccountTab, "home" | "info"> | "detail";
const labels: Record<Variant, string> = {
  profile: "Загрузка личных данных",
  orders: "Загрузка заказов",
  detail: "Загрузка заказа",
  returns: "Загрузка возвратов",
  favorites: "Загрузка избранного",
  brands: "Загрузка брендов",
};

export function AccountSkeleton({ variant }: { variant: Variant }) {
  return (
    <div role="status" aria-label={labels[variant]} aria-busy="true">
      <div aria-hidden="true">
        {variant === "profile" ? <ProfileSkeleton /> :
          variant === "orders" ? <OrdersSkeleton /> :
          variant === "detail" ? <DetailSkeleton /> :
          variant === "returns" ? <ReturnsSkeleton /> :
          variant === "brands" ? <BrandsSkeleton /> :
          <ul className={favoritesStyles.grid}>{Array.from({ length: 6 }, (_, index) => <ProductTileSkeleton key={index} />)}</ul>}
      </div>
    </div>
  );
}

function Line({ width = "85%", small = false }: { width?: string; small?: boolean }) {
  return <div style={{ width, maxWidth: "100%" }}><SkeletonBlock className={small ? styles.smallLine : styles.line} /></div>;
}

function ProfileSkeleton() {
  return <div className={profileStyles.detailsPanel}>
    <div className={profileStyles.detailsList}>
      {["32%", "40%", "65%", "48%", "35%", "24%", "38%"].map((width, index) => <div className={profileStyles.detailItem} key={index}>
        <Line width="90px" small /><Line width={width} />
      </div>)}
    </div>
    <div className={profileStyles.detailsActions}><SkeletonBlock className={styles.button} /></div>
  </div>;
}

function OrdersSkeleton() {
  return <div className={ordersStyles.list}>{Array.from({ length: 3 }, (_, index) => <div className={ordersStyles.order} key={index}>
    <div className={ordersStyles.top}><SkeletonBlock className={styles.badge} /><Line width="75px" small /><div className={styles.date}><Line width="80px" small /></div></div>
    <div className={ordersStyles.address}><Line width="90%" small /></div>
    <div className={ordersStyles.images}>{Array.from({ length: index === 1 ? 2 : 1 }, (_, imageIndex) => <SkeletonBlock className={styles.thumbnail} key={imageIndex} />)}</div>
    <div className={ordersStyles.summary}><Line width="150px" small /></div>
  </div>)}</div>;
}

function DetailSkeleton() {
  return <div className={commerceStyles.page}>
    <div className={commerceStyles.meta}><SkeletonBlock className={styles.badge} /><Line width="80px" small /></div>
    <div className={commerceStyles.section}>
      <div className={styles.sectionLabel}><Line width="80px" small /></div>
      <div className={commerceStyles.deliveryGrid}>
        <div className={`${commerceStyles.deliveryAddress} ${styles.lines}`}><Line width="70%" /><Line width="90%" /></div>
        <div className={`${commerceStyles.deliveryInfo} ${styles.lines}`}><Line width="85%" /><Line width="90%" small /></div>
        <div className={`${commerceStyles.deliveryInfo} ${styles.lines}`}><Line width="90%" /><Line width="55%" small /></div>
      </div>
    </div>
    <div className={commerceStyles.progress}>{Array.from({ length: 5 }, (_, index) => <div className={commerceStyles.stage} key={index}><Line width="75%" small /></div>)}</div>
    <div className={commerceStyles.section}><div className={commerceStyles.product}>
      <SkeletonBlock className={commerceStyles.image} />
      <div className={`${commerceStyles.productInfo} ${styles.productInfo}`}><Line width="40%" small /><Line width="90%" /><Line width="65%" /><Line width="80px" /><div className={styles.variant}><Line width="80%" small /></div></div>
    </div></div>
    <div className={commerceStyles.section}><div className={styles.sectionLabel}><Line width="70px" small /></div><Line width="140px" /></div>
    <div className={`${commerceStyles.summary} ${styles.summary}`}>{Array.from({ length: 4 }, (_, index) => <div className={styles.summaryRow} key={index}><Line width="42%" small /><Line width="75px" /></div>)}</div>
  </div>;
}

function ReturnsSkeleton() {
  return <div className={returnsStyles.list}>{Array.from({ length: 2 }, (_, index) => <div className={returnsStyles.card} key={index}>
    <div className={returnsStyles.top}><Line width="110px" /><Line width="80px" small /></div>
    <SkeletonBlock className={`${styles.badge} ${styles.returnStatus}`} />
    <div className={returnsStyles.product}><SkeletonBlock className={styles.returnImage} /><div className={styles.returnInfo}><Line /><Line width="55%" small /><Line width="70%" small /></div></div>
    <Line width="100px" small />
  </div>)}</div>;
}

function BrandsSkeleton() {
  return <div className={brandsStyles.page}><div className={brandsStyles.grid}>{Array.from({ length: 4 }, (_, index) => <div className={brandsStyles.card} key={index}>
    <SkeletonBlock className={brandsStyles.logo} /><div className={styles.lines}><Line width="65%" /><Line width="40%" small /></div>
  </div>)}</div></div>;
}
