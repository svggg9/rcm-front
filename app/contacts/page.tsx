import Link from "next/link";

export const metadata = {
  title: "Контакты — RCM",
};

export default function ContactsPage() {
  return (
    <main className="pageContainer">
      <section className="sectionBlock">
        <div className="sectionKicker">Контакты</div>
        <h1 className="sectionTitleLarge">Связаться с RCM</h1>
        <p className="sectionHint">
          Страница находится в подготовке. Для подключения бренда оставьте
          заявку продавца.
        </p>

        <div className="mt24">
          <Link className="buttonPrimary" href="/seller/apply">
            Стать продавцом
          </Link>
        </div>
      </section>
    </main>
  );
}