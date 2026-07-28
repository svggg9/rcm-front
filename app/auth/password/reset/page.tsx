"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { TextInput } from "../../../components/ui/TextInput";
import { apiFetch, API_URL } from "../../../lib/api";

import styles from "./PasswordReset.module.css";

function getResetErrorMessage(message: string | undefined): string {
  if (message === "invalid_or_expired_token" || message === "reset_expired") {
    return "Ссылка недействительна или устарела";
  }
  if (message === "password_too_short") {
    return "Пароль должен быть не короче 8 символов";
  }

  return message || "Не удалось изменить пароль";
}

function PasswordResetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !token) return;

    if (newPassword.length < 8) {
      toast.error("Пароль должен быть не короче 8 символов");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }

    try {
      setSubmitting(true);

      const response = await apiFetch(
        `${API_URL}/api/auth/password/reset/complete`,
        {
          method: "POST",
          body: JSON.stringify({ token, newPassword }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(getResetErrorMessage(data?.message));
      }

      setCompleted(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось изменить пароль",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>Ссылка недействительна</h1>
          <p className={styles.lead}>
            Запросите новое письмо для изменения пароля.
          </p>
          <Button
            type="button"
            variant="primary"
            className={styles.singleAction}
            onClick={() => router.replace("/auth/login")}
          >
            Перейти ко входу
          </Button>
        </section>
      </main>
    );
  }

  if (completed) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <div className={styles.successBanner} role="status">
            <Icon name="check-circle" size={21} strokeWidth={1.6} />
            <p>Пароль успешно изменён. Теперь вы можете войти с ним.</p>
          </div>
          <Button
            type="button"
            variant="primary"
            className={styles.singleAction}
            onClick={() => router.replace("/auth/login")}
          >
            Войти
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="password-reset-title">
        <header className={styles.header}>
          <h1 id="password-reset-title">Новый пароль</h1>
          <p>Введите новый пароль для вашего аккаунта.</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <TextInput
            label="Новый пароль"
            fieldVariant="boxed"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <TextInput
            label="Повторите новый пароль"
            fieldVariant="boxed"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.replace("/auth/login")}
              disabled={submitting}
            >
              Отменить
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Сохранить
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={null}>
      <PasswordResetContent />
    </Suspense>
  );
}
