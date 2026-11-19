import { BuyerNavigationIcon } from "../components/BuyerNavigation/BuyerNavigationIcon";
import { FavoritesNavigationIcon } from "../components/BuyerNavigation/FavoritesNavigationIcon";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./FavoriteBadgeCandidates.module.css";

type BadgeVariant = "dark" | "gold" | "outline" | "light" | "square";

const candidates: { variant: BadgeVariant; title: string; description: string }[] = [
  { variant: "dark", title: "01 — Чёрный круг", description: "Белая цифра и светлый контур" },
  { variant: "gold", title: "02 — Золотой круг", description: "Чёрная цифра на золотом фоне" },
  { variant: "outline", title: "03 — Светлый контур", description: "Белый фон и чёрная рамка" },
  { variant: "light", title: "04 — Мягкое золото", description: "Светлый фон и золотая рамка" },
  { variant: "square", title: "05 — Чёрный квадрат", description: "Выбранный рабочий счётчик" },
];

function Badge({ variant, count }: { variant: BadgeVariant; count: string }) {
  return <span className={styles.icon} role="img" aria-label={`Избранное: ${count}`}>
    {variant === "square" ? <FavoritesNavigationIcon count={count === "99+" ? 100 : Number(count)} /> : <>
      <BuyerNavigationIcon name="heart" />
      <span className={styles.badge} data-variant={variant} aria-hidden="true">{count}</span>
    </>}
  </span>;
}

export function FavoriteBadgeCandidates() {
  return <section id="favorite-badge-candidates" className={styles.preview} aria-labelledby="favorite-badge-candidates-title">
    <h3 id="favorite-badge-candidates-title">Счётчик избранного — варианты</h3>
    <p className={styles.intro}>Число справа сверху на сердечке — вариант 05 используется на сайте</p>
    <div className={styles.grid}>
      {candidates.map(({ variant, title, description }) => <article className={styles.card} key={variant}>
        <div className={styles.feature} aria-hidden="true"><Badge variant={variant} count="1" /></div>
        <h4>{title}</h4>
        {variant === "square" && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}
        <p>{description}</p>
        <div className={styles.sizes} aria-label="Примеры в размере навигации">
          {["1", "9", "99+"].map(count => <div className={styles.size} key={count}>
            <Badge variant={variant} count={count} />
            <span aria-hidden="true">{count}</span>
          </div>)}
        </div>
        <span className={styles.caption}>Размер в шапке</span>
      </article>)}
    </div>
  </section>;
}
