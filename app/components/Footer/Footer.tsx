import Link from "next/link";

import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="pageContainer">
        <div className={styles.grid}>
          <div>
            <div className={styles.logo}>RCM</div>
            <p className={styles.text}>
              Маркетплейс отечественных производителей и локальных брендов.
            </p>
          </div>

          <nav className={styles.nav} aria-label="Footer navigation">
            <Link href="/about">О проекте</Link>
            <Link href="/seller/apply">Стать продавцом</Link>
            <Link href="/catalog">Каталог</Link>
            <Link href="/contacts">Контакты</Link>
          </nav>

          <nav className={styles.nav} aria-label="Legal navigation">
            <Link href="/legal/privacy">Политика конфиденциальности</Link>
            <Link href="/legal/terms">Пользовательское соглашение</Link>
            <Link href="/legal/offer">Оферта</Link>
          </nav>
        </div>

        <div className={styles.bottom}>
          <span>© RCM, 2026</span>
          <span>Black / White / Gold marketplace</span>
        </div>
      </div>
    </footer>
  );
}