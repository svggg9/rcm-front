"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "../components/ui/Button";
import { FormSelect } from "../components/ui/FormSelect";
import { FormError } from "../components/ui/FormError";
import { TextInput } from "../components/ui/TextInput";
import { Textarea } from "../components/ui/Textarea";
import {
  CONTACT_TOPIC_OPTIONS,
  ContactSubmissionError,
  getContactProfileDefaults,
  submitContactMessage,
  type ContactFieldErrors,
  type ContactMessageReceipt,
  type ContactMessageRequest,
  type ContactProfileDefaults,
  type ContactTopic,
} from "../lib/contactMessages";
import { AUTH_EVENT } from "../lib/authEvents";
import { getClientSession } from "../lib/client-session";
import { scrollToFirstValidationError } from "../lib/formValidation";
import { useFieldValidation } from "../lib/useFieldValidation";
import { isValidEmail } from "../lib/validation";
import styles from "./Contacts.module.css";

type ContactFormValues = Omit<ContactMessageRequest, "topic"> & {
  topic: ContactTopic | "";
};

const EMPTY_FORM: ContactFormValues = {
  name: "",
  email: "",
  topic: "",
  message: "",
  orderNumber: "",
  privacyAccepted: false,
  website: "",
};

const EMPTY_PROFILE: ContactProfileDefaults = { name: "", email: "" };

function validateContactFields(values: ContactFormValues): ContactFieldErrors {
    const nextErrors: ContactFieldErrors = {};
    const name = values.name.trim();
    const email = values.email.trim();
    const message = values.message.trim();
    const relatedToOrder = values.topic === "ORDER" || values.topic === "PAYMENT" || values.topic === "RETURN";
    const orderNumber = relatedToOrder ? values.orderNumber?.trim() : undefined;

    if (!name) nextErrors.name = "Укажите ваше имя";
    else if (name.length > 100) nextErrors.name = "Имя должно быть не длиннее 100 символов";
    if (!isValidEmail(email) || email.length > 254) nextErrors.email = "Проверьте электронную почту";
    if (!values.topic) nextErrors.topic = "Выберите тему обращения";
    if (message.length < 10) nextErrors.message = "Напишите сообщение не короче 10 символов";
    else if (message.length > 5000) nextErrors.message = "Сообщение должно быть не длиннее 5000 символов";
    if (orderNumber && orderNumber.length > 100) nextErrors.orderNumber = "Номер заказа должен быть не длиннее 100 символов";
    if (!values.privacyAccepted) nextErrors.privacyAccepted = "Для отправки нужно ваше согласие";

    return nextErrors;
}

export function ContactForm() {
  const [form, setForm] = useState<ContactFormValues>(EMPTY_FORM);
  const validation = useFieldValidation(form, validateContactFields);
  const { errors, setErrors } = validation;
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ContactMessageReceipt | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingRef = useRef(false);
  const successRef = useRef<HTMLHeadingElement>(null);
  const editedContacts = useRef({ name: false, email: false });
  const profileDefaults = useRef<ContactProfileDefaults>(EMPTY_PROFILE);
  const relatedToOrder = form.topic === "ORDER" || form.topic === "PAYMENT" || form.topic === "RETURN";

  useEffect(() => {
    if (receipt) successRef.current?.focus();
  }, [receipt]);

  useEffect(() => {
    let active = true;
    let revision = 0;
    let controller: AbortController | null = null;

    function applyDefaults(defaults: ContactProfileDefaults) {
      const previous = profileDefaults.current;
      profileDefaults.current = defaults;
      setForm((current) => {
        const next = { ...current };
        for (const field of ["name", "email"] as const) {
          if (!editedContacts.current[field] &&
            (!current[field].trim() || current[field] === previous[field])) {
            next[field] = defaults[field];
          }
        }
        return next.name === current.name && next.email === current.email ? current : next;
      });
      setErrors((current) => {
        const name = !editedContacts.current.name && defaults.name && defaults.name.length <= 100
          ? undefined : current.name;
        const email = !editedContacts.current.email && isValidEmail(defaults.email) && defaults.email.length <= 254
          ? undefined : current.email;
        return name === current.name && email === current.email ? current : { ...current, name, email };
      });
    }

    function refreshProfile() {
      const requestRevision = ++revision;
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      applyDefaults(EMPTY_PROFILE);

      void (async () => {
        try {
          const session = await getClientSession();
          if (!active || requestRevision !== revision || !session) return;
          const defaults = await getContactProfileDefaults(session.id, signal);
          if (active && requestRevision === revision && !signal.aborted) applyDefaults(defaults);
        } catch {
          // Profile suggestions are optional; the form stays available for manual input.
        }
      })();
    }

    refreshProfile();
    window.addEventListener(AUTH_EVENT, refreshProfile);
    return () => {
      active = false;
      revision++;
      controller?.abort();
      window.removeEventListener(AUTH_EVENT, refreshProfile);
    };
  }, [setErrors]);

  function updateField<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    if (key === "name") editedContacts.current.name = true;
    else if (key === "email") editedContacts.current.email = true;
    setForm((current) => ({ ...current, [key]: value }));
    validation.changed(key);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;

    const nextErrors = validation.validate();
    const name = form.name.trim(), email = form.email.trim(), message = form.message.trim();
    const orderNumber = relatedToOrder ? form.orderNumber?.trim() : undefined;
    setFormError(null);
    if (Object.keys(nextErrors).length > 0 || !form.topic) {
      scrollToFirstValidationError({ root: formRef.current });
      return;
    }

    pendingRef.current = true;
    setSubmitting(true);
    try {
      setReceipt(await submitContactMessage({
        name,
        email,
        topic: form.topic,
        message,
        ...(orderNumber ? { orderNumber } : {}),
        privacyAccepted: form.privacyAccepted,
        website: form.website,
      }));
    } catch (error) {
      if (error instanceof ContactSubmissionError) {
        setErrors(error.fieldErrors);
        setFormError(Object.values(error.fieldErrors).some(Boolean) ? null : error.message);
        scrollToFirstValidationError({ root: formRef.current });
      } else {
        setFormError("Не удалось отправить обращение — попробуйте ещё раз");
      }
    } finally {
      pendingRef.current = false;
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <section className={styles.success} aria-labelledby="contact-success-title">
        <div className={styles.successMessage} role="status">
          <h2 id="contact-success-title" ref={successRef} tabIndex={-1}>
            Обращение №{receipt.id} отправлено
          </h2>
          <p>Ответим на электронную почту, которую вы указали в форме</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => {
          setReceipt(null);
          editedContacts.current = { name: false, email: false };
          setForm({ ...EMPTY_FORM, ...profileDefaults.current });
          validation.reset();
          setFormError(null);
          window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>("input[name=name]")?.focus());
        }}>
          Написать ещё
        </Button>
      </section>
    );
  }

  return (
    <form className={styles.form} ref={formRef} noValidate onSubmit={submit} aria-busy={submitting}>
      <FormError message={formError} />
      <fieldset className={styles.fields} disabled={submitting}>
        <legend className="visuallyHidden">Форма обратной связи</legend>
        <div className={styles.formGrid}>
          <TextInput
            label="Имя"
            name="name"
            required
            autoComplete="name"
            enterKeyHint="next"
            maxLength={100}
            value={form.name}
            error={errors.name}
            onBlur={() => validation.touch("name")}
            onChange={(event) => updateField("name", event.target.value)}
          />
          <TextInput
            label="Электронная почта"
            name="email"
            type="email"
            required
            autoComplete="email"
            enterKeyHint="next"
            maxLength={254}
            value={form.email}
            error={errors.email}
            onBlur={() => validation.touch("email")}
            onChange={(event) => updateField("email", event.target.value)}
          />
        </div>
        <div>
          <FormSelect<ContactTopic>
            label="Тема обращения"
            required
            value={form.topic}
            options={CONTACT_TOPIC_OPTIONS}
            disabled={submitting}
            invalid={Boolean(errors.topic)}
            errorId="contact-topic-error"
            onBlur={() => validation.touch("topic")}
            onChange={(topic) => updateField("topic", topic)}
          />
          {errors.topic ? <div className="fieldError" id="contact-topic-error">{errors.topic}</div> : null}
        </div>
        {relatedToOrder ? (
          <TextInput
            label="Номер заказа (необязательно)"
            name="orderNumber"
            spacePolicy="remove"
            maxLength={100}
            value={form.orderNumber}
            error={errors.orderNumber}
            onBlur={() => validation.touch("orderNumber")}
            onChange={(event) => updateField("orderNumber", event.target.value)}
          />
        ) : null}
        <Textarea
          label="Сообщение"
          name="message"
          required
          rows={7}
          minLength={10}
          maxLength={5000}
          value={form.message}
          error={errors.message}
            onBlur={() => validation.touch("message")}
          hint="От 10 до 5000 символов"
          onChange={(event) => updateField("message", event.target.value)}
        />
        <div className={styles.consent}>
          <div className={styles.consentRow}>
            <input
              id="contact-privacy"
              name="privacyAccepted"
              type="checkbox"
              required
              checked={form.privacyAccepted}
              onBlur={() => validation.touch("privacyAccepted")}
              aria-invalid={errors.privacyAccepted ? true : undefined}
              aria-describedby={errors.privacyAccepted ? "contact-privacy-error" : undefined}
              onChange={(event) => updateField("privacyAccepted", event.target.checked)}
            />
            <div>
              <label htmlFor="contact-privacy">Согласен на обработку персональных данных в соответствии с </label>
              <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer">политикой конфиденциальности</Link>
            </div>
          </div>
          {errors.privacyAccepted ? <div className="fieldError" id="contact-privacy-error">{errors.privacyAccepted}</div> : null}
        </div>
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="contact-website">Сайт</label>
          <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </div>
      </fieldset>
      <div className={styles.submitArea}>
        <p>Ответ придёт на вашу электронную почту</p>
        <Button type="submit" variant="primary" loading={submitting} className={styles.submitButton}>
          Отправить обращение
        </Button>
      </div>
    </form>
  );
}
