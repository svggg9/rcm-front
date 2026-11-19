import styles from "./IconOptionsPreview.module.css";

type SupportVariant = "bubble" | "conversation" | "headset" | "help";

const variants: { name: SupportVariant; title: string }[] = [
  { name: "bubble", title: "01 — Сообщение" },
  { name: "conversation", title: "02 — Диалог" },
  { name: "headset", title: "03 — Оператор" },
  { name: "help", title: "04 — Помощь" },
];

function SupportCandidate({ name, size }: { name: SupportVariant; size: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
    stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">
    {name === "bubble" && <>
      <path d="M12 15h40v28H29l-12 9v-9h-5V15Z" />
      <circle cx="23" cy="29" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="32" cy="29" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="41" cy="29" r="1.4" fill="currentColor" stroke="none" />
    </>}
    {name === "conversation" && <>
      <path d="M9 12h34v25H25l-9 7v-7H9V12Z" />
      <path d="M48 23h7v24h-7v7l-9-7H25v-5" />
      <path d="M18 22h16M18 29h10" />
    </>}
    {name === "headset" && <>
      <path d="M12 32v-3a20 20 0 0 1 40 0v3" />
      <rect x="10" y="30" width="8" height="15" rx="3" />
      <rect x="46" y="30" width="8" height="15" rx="3" />
      <path d="M50 45c0 5-3.5 8-9 8h-3" />
    </>}
    {name === "help" && <>
      <path d="M12 14h40v30H30l-11 8v-8h-7V14Z" />
      <path d="M27 24a5 5 0 0 1 10 0c0 3-5 4-5 7" />
      <circle cx="32" cy="37" r="1.4" fill="currentColor" stroke="none" />
    </>}
  </svg>;
}

export function SupportIconCandidates() {
  return <section aria-labelledby="support-icon-candidates">
    <h3 id="support-icon-candidates">Поддержка</h3>
    <p className={styles.cartIntro}>Варианты для выбора — отдельной общей иконки поддержки пока нет</p>
    <ul className={`${styles.cartCandidates} ${styles.fourCandidates}`} aria-label="Варианты иконки поддержки">
      {variants.map(({ name, title }) => <li key={name}>
        <span className={styles.cartTitle}>{title}</span>
        <span className={styles.statusSlot} />
        <span className={styles.cartLarge}><SupportCandidate name={name} size={64} /></span>
        <span className={styles.label}>Крупный вид</span>
        <span className={styles.cartSmall}><SupportCandidate name={name} size={24} /></span>
        <span className={styles.label}>24 px</span>
      </li>)}
    </ul>
  </section>;
}
