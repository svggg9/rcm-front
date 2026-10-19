import Link from "next/link";
import { ContactForm } from "./ContactForm";
import styles from "./Contacts.module.css";

export const metadata = {
  title: "Контакты — рцмаркет",
};

export default function ContactsPage() {
  return (
    <main className="pageContainer">
      <section className={styles.page}>
        <header className={styles.heading}>
          <div className="sectionKicker">Контакты</div>
          <h1 className="sectionTitleLarge">Связаться с рцмаркет</h1>
          <p className={styles.lead}>
            Поможем с заказом, возвратом или вопросом о рцмаркет.
            Расскажите, что случилось, и оставьте почту для ответа.
          </p>
        </header>
        <div className={styles.layout}>
          <aside className={styles.intro}>
            <h2>Хотите продавать на рцмаркет?</h2>
            <p>
              Для подключения бренда заполните заявку продавца. По другим
              вопросам о сотрудничестве напишите через форму.
            </p>
            <Link className="buttonSecondary" href="/seller/apply">
              Стать продавцом
            </Link>
          </aside>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
