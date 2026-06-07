import Link from "next/link";

import styles from "./AboutPage.module.css";

export const metadata = {
  title: "О проекте — RCM",
  description:
    "RCM — маркетплейс отечественных производителей, локальных брендов и качественных товаров.",
};

const categories = [
  "Одежда",
  "Обувь",
  "Аксессуары",
  "Дом",
  "Декор",
  "Локальные бренды",
];

const sellerFeatures = [
  "Кабинет продавца",
  "Управление товарами",
  "Управление заказами",
  "Профиль производителя",
  "Страница бренда",
  "Онлайн-оплата",
  "Доставка",
  "Модерация ассортимента",
];

const faq = [
  {
    question: "Кто может стать продавцом?",
    answer:
      "Отечественные производители, локальные бренды и команды, которые создают качественные товары под своим брендом.",
  },
  {
    question: "Нужен ли свой сайт?",
    answer:
      "Нет. На RCM у бренда будет собственная страница производителя и карточки товаров в общем каталоге.",
  },
  {
    question: "Сколько стоит подключение?",
    answer:
      "На этапе запуска подключение рассматривается индивидуально. Базовая заявка бесплатная.",
  },
  {
    question: "Как долго рассматривается заявка?",
    answer:
      "Обычно 1–3 рабочих дня. Мы проверяем бренд, ассортимент и базовую информацию о производителе.",
  },
];

export default function AboutPage() {
  return (
    <main className="pageContainer">
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <div className={styles.kicker}>RCM Marketplace</div>

            <h1 className={styles.title}>
              Маркетплейс отечественных производителей
            </h1>

            <p className={styles.lead}>
              Мы создаем площадку, где локальные бренды получают собственную
              витрину, инструменты для продаж и прямой доступ к покупателям.
            </p>

            <div className={styles.actions}>
              <Link className="buttonPrimary" href="/seller/apply">
                Стать продавцом
              </Link>

              <Link className="buttonSecondary" href="/catalog">
                Перейти в каталог
              </Link>
            </div>
          </div>

          <aside className={styles.heroAside}>
            <div className={styles.asideValue}>01</div>
            <div className={styles.asideText}>
              Простая витрина, прямые углы, черно-белый интерфейс и акцент на
              товаре, а не на визуальном шуме.
            </div>
          </aside>
        </section>

        <section className={styles.cards}>
          <InfoCard
            title="Локальные бренды"
            text="Фокус на отечественных производителях, малых командах и независимых проектах."
          />
          <InfoCard
            title="Собственная витрина"
            text="У каждого производителя есть страница бренда и единый профиль в кабинете продавца."
          />
          <InfoCard
            title="Инструменты продаж"
            text="Товары, заказы, статусы, доставка и оплата собраны в одном интерфейсе."
          />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.kicker}>Категории</div>
            <h2>Для каких товаров</h2>
          </div>

          <div className={styles.categoryGrid}>
            {categories.map((item) => (
              <div key={item} className={styles.categoryItem}>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.splitSection}>
          <div>
            <div className={styles.kicker}>Для продавца</div>
            <h2 className={styles.sectionTitle}>Что уже есть в RCM</h2>
            <p className={styles.sectionText}>
              Мы запускаем проект небольшими безопасными шагами: сначала
              стабильный каталог, кабинет продавца, оформление заказа и базовая
              операционная инфраструктура.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {sellerFeatures.map((feature) => (
              <div key={feature} className={styles.featureItem}>
                {feature}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.process}>
          <div className={styles.sectionHead}>
            <div className={styles.kicker}>Старт</div>
            <h2>Как подключиться</h2>
          </div>

          <div className={styles.steps}>
            <Step number="01" title="Оставьте заявку" />
            <Step number="02" title="Мы проверим бренд и ассортимент" />
            <Step number="03" title="Откроем доступ к кабинету продавца" />
            <Step number="04" title="Вы добавите товары и начнете продажи" />
          </div>
        </section>

        <section className={styles.faq}>
          <div className={styles.sectionHead}>
            <div className={styles.kicker}>FAQ</div>
            <h2>Частые вопросы</h2>
          </div>

          <div className={styles.faqList}>
            {faq.map((item) => (
              <div key={item.question} className={styles.faqItem}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <div>
            <div className={styles.ctaKicker}>RCM для производителей</div>
            <h2>Готовы представить свой бренд?</h2>
            <p>
              Оставьте заявку — мы рассмотрим бренд и свяжемся с вами по
              указанным контактам.
            </p>
          </div>

          <Link className="buttonPrimary" href="/seller/apply">
            Стать продавцом
          </Link>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className={styles.infoCard}>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

function Step({ number, title }: { number: string; title: string }) {
  return (
    <div className={styles.step}>
      <div className={styles.stepNumber}>{number}</div>
      <div className={styles.stepTitle}>{title}</div>
    </div>
  );
}