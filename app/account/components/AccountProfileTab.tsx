"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { toast } from "@/app/components/ui/toast";
import { requestEditorNavigation } from "../../components/ui/EditorSurface";
import { InlineEditorGuard } from "../../components/ui/InlineEditorGuard";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { Icon } from "../../components/ui/Icon";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { requestPasswordResetCode } from "../../lib/passwordReset";
import { useFieldValidation } from "../../lib/useFieldValidation";
import { scrollToFirstValidationError } from "../../lib/formValidation";
import { getRussianPhoneDigits } from "../../lib/phone";
import { AccountEmailChange } from "./AccountEmailChange";
import styles from "./AccountProfileTab.module.css";

export type AccountProfileUpdate = {
  firstName: string;
  lastName: string;
  phone: string;
};

type Props = AccountProfileUpdate & {
  email: string;
  emailVerified?: boolean;
  saving: boolean;
  onEmailChanged: (email: string) => void;
  onSave: (values: AccountProfileUpdate) => Promise<boolean>;
  onEditingChange?: (editing: boolean) => void;
};

type ProfileDraft = AccountProfileUpdate;
type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;

function createDraft(values: AccountProfileUpdate): ProfileDraft {
  return { ...values };
}

function validateProfileDraft(draft: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {};
  if (draft.phone.trim() && getRussianPhoneDigits(draft.phone).length !== 10) errors.phone = "Укажите номер телефона полностью";
  return errors;
}

export function AccountProfileTab({ email, emailVerified = false, firstName, lastName, phone, saving, onSave, onEmailChanged, onEditingChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [emailChanging, setEmailChanging] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() => createDraft({ firstName, lastName, phone }));
  const validation = useFieldValidation(draft, validateProfileDraft);
  const profileErrors = validation.errors;
  const [passwordResetSending, setPasswordResetSending] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const busy = saving || emailBusy || passwordResetSending;
  const formRef = useRef<HTMLFormElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const passwordLabelId = useId();
  const savedDraft = createDraft({ firstName, lastName, phone });
  const values = editing ? draft : savedDraft;
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(savedDraft);

  function changeField<TKey extends keyof ProfileDraft>(key: TKey, value: ProfileDraft[TKey]) {
    setDraft(current => ({ ...current, [key]: value }));
    validation.changed(key);
  }

  function beginEditing() {
    setDraft(savedDraft);
    validation.reset();
    setEditing(true);
    onEditingChange?.(true);
    window.requestAnimationFrame(() => firstNameRef.current?.focus({ preventScroll: true }));
  }

  function resetEditing() {
    setEmailChanging(false);
    setDraft(savedDraft);
    validation.reset();
    setEditing(false);
    onEditingChange?.(false);
  }

  function cancelEditing() {
    if (!busy) requestEditorNavigation(resetEditing, { completed: true });
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy || emailChanging) return;
    const errors = validation.validate();
    if (Object.keys(errors).length) {
      scrollToFirstValidationError({ root: formRef.current });
      return;
    }
    const saved = await onSave({
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phone: draft.phone,
    });
    if (saved) {
      validation.reset();
      requestEditorNavigation(() => { setEditing(false); onEditingChange?.(false); }, { completed: true });
    }
  }

  async function requestPasswordReset() {
    if (!editing || passwordResetSending || saving || emailChanging) return;
    if (!email.trim()) {
      toast.warning("К аккаунту не привязана электронная почта");
      return;
    }
    try {
      setPasswordResetSending(true);
      await requestPasswordResetCode(email);
      setPasswordResetSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось отправить письмо для смены пароля");
    } finally {
      setPasswordResetSending(false);
    }
  }

  return (
    <section className={styles.detailsPanel} aria-label="Личные данные">
      {editing ? <InlineEditorGuard dirty={dirty || emailChanging} busy={busy} onDiscard={resetEditing} /> : null}
      <form ref={formRef} className={styles.profileForm} noValidate onSubmit={handleProfileSubmit} aria-label="Личные данные" aria-busy={saving}>
        <div className={styles.detailsList}>
          <TextInput label="Имя" fieldVariant="inline" ref={firstNameRef} value={values.firstName} placeholder="" readOnly={!editing} disabled={saving} tabIndex={editing ? undefined : -1} error={profileErrors.firstName} onBlur={() => validation.touch("firstName")} autoComplete="given-name" enterKeyHint="next" onChange={event => changeField("firstName", event.target.value)} />
          <TextInput label="Фамилия" fieldVariant="inline" value={values.lastName} placeholder="" readOnly={!editing} disabled={saving} tabIndex={editing ? undefined : -1} error={profileErrors.lastName} onBlur={() => validation.touch("lastName")} autoComplete="family-name" enterKeyHint="next" onChange={event => changeField("lastName", event.target.value)} />
          <div className={styles.emailField}>
            <TextInput label="Электронная почта" fieldVariant="inline" type="email" value={email} placeholder="" readOnly tabIndex={-1} autoComplete="email" />
            {email && emailVerified ? <span className={styles.emailVerified} role="img" aria-label="Почта подтверждена" title="Почта подтверждена"><Icon name="check" size={18} strokeWidth={1.6} /></span> : null}
          </div>
          {editing && !emailChanging ? <button className={styles.emailChangeLink} type="button" disabled={busy} onClick={() => setEmailChanging(true)}>Изменить почту</button> : null}
          {editing && emailChanging ? <AccountEmailChange email={email} onBusyChange={setEmailBusy} onCancel={() => setEmailChanging(false)} onChanged={newEmail => {
            onEmailChanged(newEmail); setEmailChanging(false); setPasswordResetSent(false); toast.success("Почта изменена");
          }} /> : null}
          <div className={styles.phoneField} data-empty={!editing && !getRussianPhoneDigits(values.phone).length || undefined}>
            <PhoneInput label="Телефон" fieldVariant="inline" value={values.phone} placeholder="" readOnly={!editing} disabled={saving} tabIndex={editing ? undefined : -1} error={profileErrors.phone} onBlur={() => validation.touch("phone")} enterKeyHint="done" onChange={event => changeField("phone", event.target.value)} />
          </div>
          <div className={styles.detailItem}>
            <span id={passwordLabelId} className={styles.fieldLabel}>Пароль</span>
            <div className={styles.passwordValue} aria-labelledby={passwordLabelId}>
              <span aria-label="Пароль скрыт">••••••••</span>
              {editing ? <button type="button" onClick={() => void requestPasswordReset()} disabled={busy || emailChanging} aria-label={passwordResetSending ? "Отправка письма для смены пароля" : undefined}>
                {passwordResetSending ? <span className="buttonLoader" aria-hidden="true" /> : passwordResetSent ? "Отправить ещё раз" : "Изменить пароль"}
              </button> : null}
            </div>
          </div>
        </div>
        {editing && passwordResetSent ? <div className={styles.passwordInfo} role="status" aria-live="polite">
          <Icon name="check-circle" size={20} strokeWidth={1.6} />
          <p>Мы отправили письмо на указанный адрес. Если его нет во входящих, проверьте папку «Спам».</p>
        </div> : null}
        <div className={`${styles.detailsActions} ${editing ? styles.editingActions : ""}`}>
          {editing ? <>
            <Button type="button" variant="secondary" className={styles.cancelButton} disabled={busy} onClick={cancelEditing}>Отменить</Button>
            <Button type="submit" variant="primary" loading={saving} disabled={emailChanging || emailBusy || passwordResetSending}>Сохранить</Button>
          </> : <Button type="button" variant="primary" className={styles.editButton} onClick={beginEditing}>Редактировать</Button>}
        </div>
      </form>
    </section>
  );
}
