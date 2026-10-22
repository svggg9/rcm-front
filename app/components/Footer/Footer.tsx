"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Footer.module.css";

const footerGroups = [
  {
    title: "Покупателям",
    links: [
      { href: "/catalog", label: "Каталог" },
      { href: "/account?tab=orders", label: "Заказы и доставка" },
      { href: "/account?tab=returns", label: "Возврат" },
      { href: "/contacts", label: "Помощь и контакты" },
    ],
  },
  {
    title: "О рцмаркет",
    links: [
      { href: "/about", label: "О проекте" },
      { href: "/favorites", label: "Избранное" },
      { href: "/account", label: "Личный кабинет" },
    ],
  },
  {
    title: "Продавцам",
    links: [
      { href: "/seller/apply", label: "Стать продавцом" },
      { href: "/seller/home", label: "Кабинет продавца" },
    ],
  },
];

const legalLinks = [
  { href: "/legal/privacy", label: "Политика конфиденциальности" },
  { href: "/legal/terms", label: "Пользовательское соглашение" },
  { href: "/legal/offer", label: "Публичная оферта" },
  { href: "/terms/seller", label: "Условия для продавцов" },
];

function GroupLinks({ group }: { group: typeof footerGroups[number] }) {
  return <nav className={styles.nav} aria-label={group.title}>
    {group.links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
  </nav>;
}

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/account" || pathname === "/cart" || pathname === "/favorites" || pathname.startsWith("/product/") || pathname.startsWith("/p/")) return null;

  return <footer className={styles.footer}>
    <div className={styles.inner}>
      <div className={styles.desktopGroups}>
        {footerGroups.map(group => <section key={group.title}>
          <h2 className={styles.columnTitle}>{group.title}</h2><GroupLinks group={group} />
        </section>)}
      </div>
      <div className={styles.mobileGroups}>
        {footerGroups.map(group => <details key={group.title}>
          <summary>{group.title}<span aria-hidden="true" className={styles.plus} /></summary>
          <GroupLinks group={group} />
        </details>)}
      </div>
      <div className={styles.legal}>
        <nav className={styles.legalNav} aria-label="Юридическая информация">
          {legalLinks.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <p className={styles.bottom}>© {new Date().getFullYear()} рцмаркет</p>
      </div>
    </div>
  </footer>;
}
