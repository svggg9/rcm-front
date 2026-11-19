import { ContactIconCandidate, type ContactIconCandidateName } from "./ContactIconCandidates";
import styles from "./ContactIconCandidatesPreview.module.css";

const candidates: { name: ContactIconCandidateName; title: string }[] = [
  { name: "profile", title: "Профиль" },
  { name: "phone", title: "Телефон" },
  { name: "location", title: "Адрес" },
  { name: "email", title: "Почта" },
  { name: "website", title: "Сайт" },
];

export function ContactIconCandidatesPreview() {
  return (
    <section className={styles.preview} aria-labelledby="contact-icon-candidates">
      <h4 id="contact-icon-candidates">Профиль и контакты</h4>
      <p className={styles.intro}>Контурные варианты по референсу — в круге и без круга</p>
      <ul className={styles.candidates}>
        {candidates.map(({ name, title }) => (
          <li className={styles.candidate} key={name}>
            <h5>{title}</h5>
            <div className={styles.variants}>
              {[true, false].map(circled => (
                <div className={styles.variant} key={String(circled)}>
                  <ContactIconCandidate name={name} circled={circled} size={56} />
                  <span>{circled ? "В круге" : "Без круга"}</span>
                  <div className={styles.actualSize}>
                    <ContactIconCandidate name={name} circled={circled} size={24} />
                    <span>24 px</span>
                  </div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
