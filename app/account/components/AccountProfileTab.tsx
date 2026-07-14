"use client";

import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { toast } from "sonner";

import { Button } from "../../components/ui/Button";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { apiFetch, API_URL } from "../../lib/api";

import styles from "./AccountProfileTab.module.css";

type Props = {
  email: string;
  firstName: string;
  phone: string;
  saving: boolean;
  changed: boolean;
  savedMessage: string | null;
  onSave: () => void;
  onFirstNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
};

type ProfileFieldProps = {
  label: string;
};

function ProfileTextField({
  label,
  className = "",
  ...props
}: ProfileFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.fieldWrap}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={[styles.input, className].filter(Boolean).join(" ")} {...props} />
    </label>
  );
}

function getPasswordErrorMessage(message: string | undefined) {
  if (message === "current_password_required") return "Введите предыдущий пароль";
  if (message === "current_password_invalid") return "Предыдущий пароль указан неверно";
  if (message === "password_too_short") return "Новый пароль должен быть не короче 8 символов";

  return message || "Не удалось изменить пароль";
}

export function AccountProfileTab({
  email,
  firstName,
  phone,
  saving,
  changed,
  savedMessage,
  onSave,
  onFirstNameChange,
  onPhoneChange,
}: Props) {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPassword.trim()) {
      toast.error("Введите предыдущий пароль");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Новый пароль должен быть не короче 8 символов");
      return;
    }

    if (newPassword !== newPasswordRepeat) {
      toast.error("Новые пароли не совпадают");
      return;
    }

    try {
      setPasswordSaving(true);

      const response = await apiFetch(`${API_URL}/api/profile/password`, {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(getPasswordErrorMessage(data?.message));
      }

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordRepeat("");
      setPasswordModalOpen(false);
      toast.success("Пароль изменен");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось изменить пароль");
    } finally {
      setPasswordSaving(false);
    }
  }

  function closePasswordModal() {
    if (passwordSaving) return;

    setPasswordModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordRepeat("");
  }

  return (
    <section className={styles.page}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Основные данные</h2>
        </div>

        <div className={styles.formGrid}>
          <ProfileTextField
            label="Имя"
            value={firstName}
            onChange={(event) => onFirstNameChange(event.target.value)}
          />

          <PhoneInput
            label="Телефон"
            fieldVariant="boxed"
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
          />

          <ProfileTextField label="Электронная почта" value={email} disabled />
        </div>

        <div className={styles.securityBlock}>
          <Button
            type="button"
            variant="secondary"
            className={styles.passwordToggleButton}
            onClick={() => setPasswordModalOpen(true)}
          >
            Изменить пароль
          </Button>
        </div>
      </section>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={saving || !changed}
        >
          Сохранить
        </Button>
      </div>

      {passwordModalOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={closePasswordModal}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Изменить пароль"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form className={styles.passwordForm} onSubmit={handlePasswordSubmit}>
              <input
                className={styles.input}
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Предыдущий пароль"
                autoComplete="current-password"
              />

              <input
                className={styles.input}
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Новый пароль"
                autoComplete="new-password"
              />

              <input
                className={styles.input}
                type="password"
                value={newPasswordRepeat}
                onChange={(event) => setNewPasswordRepeat(event.target.value)}
                placeholder="Повторите новый пароль"
                autoComplete="new-password"
              />

              <Button type="submit" variant="primary" disabled={passwordSaving}>
                Сохранить пароль
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
