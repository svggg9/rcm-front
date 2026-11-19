import type { IconName } from "../components/ui/Icon";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PreviousNavigationIcon } from "./PreviousNavigationIcon";
import { CartIconCandidate, type CartIconCandidateName } from "./CartIconCandidates";
import { WireBasketCandidate, type WireBasketCandidateName } from "./WireBasketCandidates";
import { BagIconCandidate, type BagIconCandidateName } from "./BagIconCandidates";
import { ProfileIconCandidate, type ProfileIconCandidateName } from "./ProfileIconCandidates";
import { SearchIconCandidate, type SearchIconCandidateName } from "./SearchIconCandidates";
import { ParcelTapeComparison } from "./ParcelTapeComparison";
import { ReturnIconCandidates } from "./ReturnIconCandidates";
import { SupportIconCandidates } from "./SupportIconCandidates";
import { PayoutIconCandidates } from "./PayoutIconCandidates";
import { StorefrontIconCandidates } from "./StorefrontIconCandidates";
import { FilterIconCandidates } from "./FilterIconCandidates";
import { DeleteIconCandidates } from "./DeleteIconCandidates";
import { DetailsIconCandidates } from "./DetailsIconCandidates";
import { EditPaginationIconCandidates } from "./EditPaginationIconCandidates";
import { DesignSystemIcon, iconSizes, type IconRole } from "./DesignSystemIcon";
import styles from "./IconOptionsPreview.module.css";

const selectedIcons = [
  { title: "Товар", label: "Куб", icon: "package" },
  { title: "Заказ", label: "Посылка", icon: "shopping-bag" },
  { title: "Передать в доставку", label: "Грузовик", icon: "shipment-handoff" },
] as const;

const sizeExamples: { role: IconRole; title: string; icon: IconName }[] = [
  { role: "utility", title: "Служебные", icon: "chevron-down" },
  { role: "interface", title: "Навигация и задачи", icon: "shopping-bag" },
  { role: "empty", title: "Крупный размер", icon: "package" },
];

const cartCandidates: { name: CartIconCandidateName; title: string }[] = [
  { name: "previous", title: "01 — Прежняя" },
  { name: "soft", title: "02 — Мягкий контур" },
  { name: "handles", title: "03 — С ручками" },
  { name: "basket", title: "04 — Корзинка" },
  { name: "bag", title: "05 — Сумка" },
];

const referenceCandidates: ({ kind: "wire"; name: WireBasketCandidateName; title: string } | { kind: "bag"; name: BagIconCandidateName; title: string })[] = [
  { kind: "wire", name: "wire-top", title: "06 — Проволочная сверху" },
  { kind: "wire", name: "wire-front", title: "07 — Проволочная с ручками" },
  { kind: "wire", name: "plastic-top", title: "08 — Пластиковая сверху" },
  { kind: "bag", name: "bag-front", title: "09 — Пакет" },
  { kind: "bag", name: "bag-fold", title: "10 — Пакет со складкой" },
  { kind: "bag", name: "bag-soft", title: "11 — Мягкий пакет" },
  { kind: "bag", name: "bag-tote", title: "12 — Широкая сумка" },
];

const profileCandidates: { name: ProfileIconCandidateName; title: string }[] = [
  { name: "circle", title: "02 — В круге" },
  { name: "bust", title: "03 — Бюст" },
  { name: "shoulders", title: "04 — Плечи" },
  { name: "portrait", title: "05 — С воротом" },
];
const searchCandidates: { name: SearchIconCandidateName; title: string }[] = [
  { name: "classic", title: "02 — Классическая" },
  { name: "large-lens", title: "03 — Крупная линза" },
  { name: "upright", title: "04 — Под углом" },
  { name: "short-handle", title: "05 — Короткая ручка" },
];

export function IconOptionsPreview() {
  return (
    <div className={styles.preview}>
      <h3>Возврат и служебные иконки</h3>
      <p className={styles.cartIntro}>Выбранные рабочие значки</p>
      <div className={styles.activeIcons}>
        <ReturnIconCandidates />
        <div id="more-icon-candidates" className={styles.activeIconsGroup}>
          <FilterIconCandidates />
          <DeleteIconCandidates />
          <DetailsIconCandidates />
        </div>
      </div>
      <EditPaginationIconCandidates />
      <div id="icon-next-batch">
        <SupportIconCandidates />
        <PayoutIconCandidates />
        <StorefrontIconCandidates />
      </div>
      <ParcelTapeComparison />
      <h3 id="navigation-icon-candidates">Профиль и поиск</h3>
      <p className={styles.cartIntro}>Контурные варианты по вашему референсу — прежние иконки показаны первыми</p>
      <h4>Профиль</h4>
      <ul className={styles.cartCandidates} aria-label="Варианты иконки профиля">
        <li>
          <span className={styles.cartTitle}>01 — Прежняя</span>
          <span className={styles.statusSlot} />
          <span className={styles.cartLarge}><PreviousNavigationIcon name="user" size={48} /></span>
          <span className={styles.label}>Крупный размер — 48 px</span>
          <span className={styles.cartSmall}><PreviousNavigationIcon name="user" size={24} /></span>
          <span className={styles.label}>Навигация — 24 px</span>
        </li>
        {profileCandidates.map(({ name, title }) => <li key={name}>
          <span className={styles.cartTitle}>{title}</span>
          <span className={styles.statusSlot}>{name === "circle" && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}</span>
          <span className={styles.cartLarge}><ProfileIconCandidate name={name} size={48} /></span>
          <span className={styles.label}>Крупный размер — 48 px</span>
          <span className={styles.cartSmall}><ProfileIconCandidate name={name} size={24} /></span>
          <span className={styles.label}>Навигация — 24 px</span>
        </li>)}
      </ul>
      <h4>Поиск</h4>
      <ul className={styles.cartCandidates} aria-label="Варианты иконки поиска">
        <li>
          <span className={styles.cartTitle}>01 — Прежняя</span>
          <span className={styles.statusSlot} />
          <span className={styles.cartLarge}><PreviousNavigationIcon name="search" size={48} /></span>
          <span className={styles.label}>Крупный размер — 48 px</span>
          <span className={styles.cartSmall}><PreviousNavigationIcon name="search" size={24} /></span>
          <span className={styles.label}>Навигация — 24 px</span>
        </li>
        {searchCandidates.map(({ name, title }) => <li key={name}>
          <span className={styles.cartTitle}>{title}</span>
          <span className={styles.statusSlot}>{name === "short-handle" && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}</span>
          <span className={styles.cartLarge}><SearchIconCandidate name={name} size={48} /></span>
          <span className={styles.label}>Крупный размер — 48 px</span>
          <span className={styles.cartSmall}><SearchIconCandidate name={name} size={24} /></span>
          <span className={styles.label}>Навигация — 24 px</span>
        </li>)}
      </ul>
      <h3>Корзина покупателя</h3>
      <p className={styles.cartIntro}>Варианты для выбора — 09 используется на сайте</p>
      <ul className={styles.cartCandidates} aria-label="Варианты иконки корзины">
        {cartCandidates.map(({ name, title }) => <li key={name}>
          <span className={styles.cartTitle}>{title}</span>
          <span className={styles.cartLarge}><CartIconCandidate name={name} size={48} /></span>
          <span className={styles.label}>Крупный размер — 48 px</span>
          <span className={styles.cartSmall}><CartIconCandidate name={name} size={24} /></span>
          <span className={styles.label}>Навигация — 24 px</span>
        </li>)}
      </ul>
      <h4 id="cart-reference-icons">По вашим референсам</h4>
      <p className={styles.cartIntro}>Корзины и пакеты — варианты для выбора</p>
      <ul className={`${styles.cartCandidates} ${styles.referenceCandidates}`} aria-label="Иконки корзины по референсам">
        {referenceCandidates.map(candidate => <li key={candidate.name}>
          <span className={styles.cartTitle}>{candidate.title}</span>
          <span className={styles.statusSlot}>{candidate.name === "bag-front" && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}</span>
          <span className={styles.cartLarge}>{candidate.kind === "wire" ? <WireBasketCandidate name={candidate.name} size={48} /> : <BagIconCandidate name={candidate.name} size={48} />}</span>
          <span className={styles.label}>Крупный размер — 48 px</span>
          <span className={styles.cartSmall}>{candidate.kind === "wire" ? <WireBasketCandidate name={candidate.name} size={24} /> : <BagIconCandidate name={candidate.name} size={24} />}</span>
          <span className={styles.label}>Навигация — 24 px</span>
        </li>)}
      </ul>
      <ul className={styles.options} aria-label="Выбранные иконки">
        {selectedIcons.map(({ title, label, icon }) => <li key={title}>
          <span className={styles.title}>{title}</span>
          <span className={styles.symbol}><DesignSystemIcon name={icon} /></span>
          <span className={styles.label}>{label}</span>
        </li>)}
      </ul>
      <h3>Размеры по назначению</h3>
      <ul className={styles.options} aria-label="Размеры иконок">
        {sizeExamples.map(({ role, title, icon }) => <li key={role}>
          <span className={styles.title}>{title}</span>
          <span className={styles.symbol}><DesignSystemIcon name={icon} role={role} /></span>
          <span className={styles.label}>{iconSizes[role]} px</span>
        </li>)}
      </ul>
      <p className={styles.note}>Иконка корзины использует контур 1,4 в сетке 24 и масштабируется вместе с размером. Карандаш — залитый силуэт с линией. Контурные служебные иконки используют 1,5 и currentColor; фирменные знаки сохраняют свои цвета</p>
    </div>
  );
}
