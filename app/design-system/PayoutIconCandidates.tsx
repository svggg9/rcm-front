import { Icon } from "../components/ui/Icon";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./IconOptionsPreview.module.css";

type PayoutCandidateName = "coin" | "wallet" | "card" | "transfer";

const candidates: { name: PayoutCandidateName; title: string }[] = [
  { name: "coin", title: "02 — Монета" },
  { name: "wallet", title: "03 — Кошелёк" },
  { name: "card", title: "04 — Перевод на карту" },
  { name: "transfer", title: "05 — Рубль и стрелка" },
];

function PayoutCandidate({ name, size }: { name: PayoutCandidateName; size: number }) {
  if (name === "coin") return <Icon name="money" size={size} />;

  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor"
    strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === "wallet" && <>
      <path d="M10 22v27a4 4 0 0 0 4 4h37a3 3 0 0 0 3-3V24a3 3 0 0 0-3-3H16a6 6 0 0 1 0-12h31" />
      <path d="M54 31H43a6 6 0 0 0 0 12h11" />
      <circle cx="43" cy="37" r="1.8" fill="var(--gold, #bfa26f)" stroke="none" />
    </>}
    {name === "card" && <>
      <rect x="9" y="20" width="46" height="30" rx="3" />
      <path d="M9 29h46M16 41h9M32 7v16m0 0-6-6m6 6 6-6" />
    </>}
    {name === "transfer" && <>
      <path d="M21 48V14h10a10 10 0 0 1 0 20H16m0 7h18" />
      <path d="M39 47h15m0 0-6-6m6 6-6 6" />
    </>}
  </svg>;
}

export function PayoutIconCandidates() {
  return <section aria-labelledby="payout-icon-candidates">
    <h3 id="payout-icon-candidates">Выплаты</h3>
    <p className={styles.cartIntro}>Действующий значок и варианты для выбора</p>
    <ul className={styles.cartCandidates} aria-label="Варианты иконки выплат">
      {candidates.map(({ name, title }) => <li key={name}>
        <span className={styles.cartTitle}>{title}</span>
        <span className={styles.statusSlot}>{name === "coin" && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}</span>
        <span className={styles.cartLarge}><PayoutCandidate name={name} size={64} /></span>
        <span className={styles.label}>Крупный вид</span>
        <span className={styles.cartSmall}><PayoutCandidate name={name} size={24} /></span>
        <span className={styles.label}>24 px</span>
      </li>)}
    </ul>
  </section>;
}
