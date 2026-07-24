"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "../../components/ui/Button";
import { apiFetch, API_URL } from "../../lib/api";

import styles from "./AccountInfoTab.module.css";

const infoLinks = [
  { title: "Оплата", href: "/payment" },
  { title: "Доставка", href: "/delivery" },
  { title: "Обмен и возврат", href: "/returns" },
  { title: "Условия продажи", href: "/terms" },
  { title: "Политика конфиденциальности", href: "/privacy" },
  { title: "Контакты", href: "/contacts" },
];

type Props = {
  defaultEmail?: string;
};

export function AccountInfoTab({ defaultEmail = "" }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [saving, setSaving] = useState(false);

  async function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.error("Введите электронную почту");
      return;
    }

    try {
      setSaving(true);

      const response = await apiFetch(`${API_URL}/api/newsletter/subscribe`, {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось оформить подписку");
      }

      toast.success("Подписка оформлена");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось оформить подписку");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.linksGrid}>
        {infoLinks.map((item) => (
          <Link key={item.href} href={item.href} className={styles.infoLink}>
            <span>{item.title}</span>
            <span className={styles.infoLinkAction}>Перейти на страницу</span>
          </Link>
        ))}
      </div>

      <section className={styles.subscribeBlock}>
        <div>
          <h2>Подпишитесь на рассылку</h2>
          <p>Чтобы первыми узнавать об эксклюзивных новинках и специальных предложениях.</p>
        </div>

        <form className={styles.subscribeForm} onSubmit={handleSubscribe}>
          <label className={styles.subscribeField}>
            <span>Электронная почта</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
            />
          </label>
          <Button type="submit" variant="primaryShimmer" disabled={saving}>
            Подписаться
          </Button>
        </form>
      </section>
    </section>
  );
}
