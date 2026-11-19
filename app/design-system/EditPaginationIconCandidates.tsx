import { Icon } from "../components/ui/Icon";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./IconOptionsPreview.module.css";
import pairStyles from "./EditPaginationIconCandidates.module.css";

type EditVariant = "current" | "outline" | "line" | "compact";
type ArrowVariant = "current" | "slim" | "rounded" | "shaft";

const edits: { name: EditVariant; title: string }[] = [
  { name: "current", title: "01 — Текущий" },
  { name: "outline", title: "02 — Контурный" },
  { name: "line", title: "03 — С линией" },
  { name: "compact", title: "04 — Компактный" },
];

const arrows: { name: ArrowVariant; title: string }[] = [
  { name: "current", title: "01 — Текущий шеврон" },
  { name: "slim", title: "02 — Тонкий шеврон" },
  { name: "rounded", title: "03 — Мягкий шеврон" },
  { name: "shaft", title: "04 — Стрелка" },
];

function EditCandidate({ name, size }: { name: EditVariant; size: number }) {
  if (name === "current") return <Icon name="pencil" size={size} />;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === "outline" && <><path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z" /><path d="m14.8 6.2 3 3" /></>}
    {name === "line" && <><path d="m5 17 .7-3L16 3.7a2.1 2.1 0 0 1 3 3L8.7 17l-3.7.7Z" /><path d="m14.4 5.3 3 3M4 21h16" /></>}
    {name === "compact" && <><path d="m5 19 1.1-4 9.4-9.4a2.1 2.1 0 0 1 3 3L9.1 18 5 19Z" /><path d="m14 7.1 3 3" /><path d="M5 19h4" /></>}
  </svg>;
}

function ArrowCandidate({ name, size, left }: { name: ArrowVariant; size: number; left: boolean }) {
  if (name === "current") return <Icon name={left ? "chevron-left" : "chevron-right"} size={size} />;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={name === "slim" ? "1.35" : "1.5"} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">
    <g transform={left ? "translate(24 0) scale(-1 1)" : undefined}>
      {name === "slim" && <path d="m9 5 7 7-7 7" />}
      {name === "rounded" && <path d="M9 5.5 15 11a1.4 1.4 0 0 1 0 2L9 18.5" />}
      {name === "shaft" && <path d="M5 12h14m-5-5 5 5-5 5" />}
    </g>
  </svg>;
}

export function EditPaginationIconCandidates() {
  return <div id="edit-pagination-icon-candidates">
    <section aria-labelledby="edit-icon-candidates">
      <h3 id="edit-icon-candidates">Редактирование</h3>
      <p className={styles.cartIntro}>Карандаш для действия «Изменить»</p>
      <ul className={`${styles.cartCandidates} ${styles.fourCandidates}`} aria-label="Варианты иконки редактирования">
        {edits.map(({ name, title }) => <li key={name}>
          <span className={styles.cartTitle}>{title}</span>
          <span className={styles.statusSlot}>{name === "current" && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}</span>
          <span className={styles.cartLarge}><EditCandidate name={name} size={64} /></span><span className={styles.label}>Крупный вид</span>
          <span className={styles.cartSmall}><EditCandidate name={name} size={24} /></span><span className={styles.label}>24 px</span>
          <span className={styles.cartSmall}><EditCandidate name={name} size={20} /></span><span className={styles.label}>20 px</span>
        </li>)}
      </ul>
    </section>
    <section aria-labelledby="pagination-icon-candidates">
      <h3 id="pagination-icon-candidates">Стрелки навигации</h3>
      <p className={styles.cartIntro}>Пары для перехода назад и вперёд; в каталоге страницы сейчас выбираются по номерам</p>
      <ul className={`${styles.cartCandidates} ${styles.fourCandidates}`} aria-label="Варианты стрелок навигации">
        {arrows.map(({ name, title }) => <li key={name}>
          <span className={styles.cartTitle}>{title}</span>
          <span className={styles.statusSlot}>{name === "current" && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}</span>
          {[64, 24, 20].map(size => <div className={pairStyles.sample} key={size}>
            <span className={`${size === 64 ? styles.cartLarge : styles.cartSmall} ${pairStyles.pair}`}>
              <ArrowCandidate name={name} size={size} left /><ArrowCandidate name={name} size={size} left={false} />
            </span>
            <span className={styles.label}>{size === 64 ? "Крупный вид" : `${size} px`}</span>
          </div>)}
        </li>)}
      </ul>
    </section>
  </div>;
}
