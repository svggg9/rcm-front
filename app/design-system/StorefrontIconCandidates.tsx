import { Icon } from "../components/ui/Icon";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./IconOptionsPreview.module.css";

type StorefrontVariant = "hanger-window" | "clothing-rack" | "display-dress" | "hanging-sign";

const variants: { name: StorefrontVariant; title: string }[] = [
  { name: "hanger-window", title: "06 — Вешалка в витрине" },
  { name: "clothing-rack", title: "07 — Стойка с одеждой" },
  { name: "display-dress", title: "08 — Платье на витрине" },
  { name: "hanging-sign", title: "09 — Подвесная вывеска" },
];

function StorefrontCandidate({ name, size }: { name: StorefrontVariant; size: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
    stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">
    {name === "hanger-window" && <>
      <path d="M12 10h40v44H12zM9 54h46" />
      <path d="M29 22a3 3 0 1 1 4 3v3l11 7c1 .7.5 2-1 2H21c-1.5 0-2-1.3-1-2l13-7" />
      <path d="M24 45h16" stroke="var(--gold, #bfa26f)" strokeWidth="3.5" />
    </>}
    {name === "clothing-rack" && <>
      <path d="M11 16h42M15 16v38m34-38v38M10 54h10m24 0h10" />
      <path d="M24 19v3l-5 4v17h10V26l-5-4M40 19v3l-5 4v17h10V26l-5-4" />
      <path d="M29 48h6" stroke="var(--gold, #bfa26f)" strokeWidth="3.5" />
    </>}
    {name === "display-dress" && <>
      <path d="M12 9h40v46H12zM9 55h46" />
      <circle cx="32" cy="19" r="3" stroke="var(--gold, #bfa26f)" />
      <path d="M27 26c1.5 3 8.5 3 10 0l3 5-4 3 6 14H22l6-14-4-3 3-5Z" />
    </>}
    {name === "hanging-sign" && <>
      <path d="M16 12h32M21 12v8m22-8v8M13 20h38v31H13z" />
      <path d="M24 29h16M22 38h20" stroke="var(--gold, #bfa26f)" strokeWidth="3.5" />
      <path d="M27 45h10" />
    </>}
  </svg>;
}

export function StorefrontIconCandidates() {
  return <section aria-labelledby="storefront-icon-candidates">
    <h3 id="storefront-icon-candidates">Витрина</h3>
    <p className={styles.cartIntro}>Значок магазина используется в профиле продавца — рядом новые варианты для выбора</p>
    <ul className={styles.cartCandidates} aria-label="Варианты иконки витрины">
      <li>
        <span className={styles.cartTitle}>01 — Текущий магазин</span>
        <span className={styles.statusSlot}><StatusBadge tone="success" size="regular">Активно</StatusBadge></span>
        <span className={styles.cartLarge}><Icon name="store" size={64} /></span>
        <span className={styles.label}>Крупный вид</span>
        <span className={styles.cartSmall}><Icon name="store" size={24} /></span>
        <span className={styles.label}>24 px</span>
      </li>
      {variants.map(({ name, title }) => <li key={name}>
        <span className={styles.cartTitle}>{title}</span>
        <span className={styles.statusSlot} />
        <span className={styles.cartLarge}><StorefrontCandidate name={name} size={64} /></span>
        <span className={styles.label}>Крупный вид</span>
        <span className={styles.cartSmall}><StorefrontCandidate name={name} size={24} /></span>
        <span className={styles.label}>24 px</span>
      </li>)}
    </ul>
  </section>;
}
