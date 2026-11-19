import { ParcelIconCandidate, type ParcelIconCandidateName } from "./ParcelIconCandidates";
import { ContactIconCandidatesPreview } from "./ContactIconCandidatesPreview";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./IconCandidatesPreview.module.css";

type Candidate = { name: ParcelIconCandidateName; title: string; detail: string };

const groups: { title: string; candidates: Candidate[] }[] = [
  {
    title: "Посылка",
    candidates: [
      { name: "parcel-outline", title: "01 — Контур", detail: "Прежний вариант" },
      { name: "parcel-color", title: "02 — Цветная", detail: "Объёмная картонная коробка" },
      { name: "parcel-tape", title: "03 — Акцент на ленте", detail: "Золотая лента с контуром" },
      { name: "parcel-color-soft", title: "04 — Мягкий цвет", detail: "Вариант с другой палитрой" },
    ],
  },
  {
    title: "Пункт выдачи",
    candidates: [
      { name: "pickup-outline", title: "05 — Контурная метка", detail: "Посылка внутри метки" },
      { name: "pickup-color", title: "06 — Цветная метка", detail: "Коробка с цветными гранями" },
    ],
  },
  {
    title: "Доставка",
    candidates: [
      { name: "truck-outline", title: "07 — Фургон", detail: "Спокойный контур" },
      { name: "truck-motion", title: "08 — Фургон в пути", detail: "Линии движения" },
    ],
  },
];

export function IconCandidatesPreview() {
  return (
    <div className={styles.preview}>
      <div className={styles.intro}>
        <h3>Пул иконок для выбора</h3>
        <p>Варианты по вашим референсам. Отметка «Активно» означает использование в локальной версии</p>
      </div>
      {groups.map(group => (
        <section key={group.title} className={styles.group} aria-label={group.title}>
          <h4>{group.title}</h4>
          <ul className={styles.candidates}>
            {group.candidates.map(({ name, title, detail }) => (
              <li className={styles.candidate} key={name}>
                <div className={styles.artwork}><ParcelIconCandidate name={name} size={80} /></div>
                <div className={styles.title}>{title}</div>
                {name === "parcel-tape" && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}
                {name === "pickup-outline" && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}
                {name === "truck-outline" && <StatusBadge tone="success" size="regular">Активно</StatusBadge>}
                <div className={styles.detail}>{detail}</div>
                <div className={styles.actualSize}>
                  <ParcelIconCandidate name={name} size={24} />
                  <span>24 px</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <ContactIconCandidatesPreview />
      <p className={styles.note}>Большой вид помогает сравнить детали, рядом показан размер интерфейса. Цветные варианты можно использовать и как крупные иллюстрации</p>
    </div>
  );
}
