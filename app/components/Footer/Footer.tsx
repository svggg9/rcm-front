import Link from "next/link";

import styles from "./Footer.module.css";

const footerGroups = [
  {
    title: "Для покупателей",
    ariaLabel: "Покупателям",
    links: [
      { href: "/catalog", label: "Каталог" },
      { href: "/favorites", label: "Избранное" },
      { href: "/account?tab=orders", label: "Заказы и доставка" },
      { href: "/account?tab=returns", label: "Возврат" },
      { href: "/contacts", label: "Помощь и контакты" },
    ],
  },
  {
    title: "О RCM",
    ariaLabel: "О площадке RCM",
    links: [
      { href: "/about", label: "О проекте" },
      { href: "/catalog", label: "Российские марки" },
      { href: "/seller/apply", label: "Стать продавцом" },
      { href: "/seller", label: "Кабинет продавца" },
      { href: "/contacts", label: "Связаться с нами" },
    ],
  },
  {
    title: "Откройте новое",
    ariaLabel: "Разделы каталога",
    links: [
      { href: "/catalog?sort=newest", label: "Новые поступления" },
      { href: "/catalog?audience=women", label: "Для неё" },
      { href: "/catalog?audience=men", label: "Для него" },
      { href: "/catalog?audience=all", label: "Для всех" },
      { href: "/favorites", label: "Сохранённые вещи" },
    ],
  },
  {
    title: "Покупайте и продавайте",
    ariaLabel: "Сервисы RCM",
    links: [
      { href: "/auth/register", label: "Создать аккаунт" },
      { href: "/account", label: "Личный кабинет" },
      { href: "/seller/apply", label: "Подключить свою марку" },
      { href: "/terms/seller", label: "Условия для продавцов" },
    ],
  },
];

const legalLinks = [
  { href: "/legal/privacy", label: "Политика конфиденциальности" },
  { href: "/legal/terms", label: "Пользовательское соглашение" },
  { href: "/legal/offer", label: "Публичная оферта" },
  { href: "/terms/seller", label: "Условия для продавцов" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {footerGroups.map((group) => (
            <section key={group.title} className={styles.column}>
              <h2 className={styles.columnTitle}>{group.title}</h2>
              <nav className={styles.nav} aria-label={group.ariaLabel}>
                {group.links.map((link) => (
                  <Link key={`${group.title}-${link.label}`} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            </section>
          ))}
        </div>

        <div className={styles.legal}>
          <nav className={styles.legalNav} aria-label="Юридическая информация">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={styles.bottom}>
            <p>
              RCM — маркетплейс отечественных производителей и независимых
              локальных марок.
            </p>
            <p>© {currentYear} RCM. Все права защищены.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
