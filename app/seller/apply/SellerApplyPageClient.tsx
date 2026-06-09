"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Textarea } from "../../components/ui/Textarea";
import { TextInput } from "../../components/ui/TextInput";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { useAuthModal } from "../../components/AuthModal/useAuthModal";
import {
  cleanText,
  isNonEmpty,
  isValidEmail,
  isValidPhone,
} from "../../lib/validation";

import {
  createSellerApplication,
  getMySellerApplication,
} from "./lib/sellerApplyApi";

import styles from "./SellerApplyPage.module.css";

import type { SellerApplication, SellerApplicationForm } from "./types";

type FormErrors = Partial<Record<keyof SellerApplicationForm, string>>;

const INITIAL_FORM: SellerApplicationForm = {
  brandName: "",
  brandDescription: "",
  category: "",
  productionRegion: "",
  website: "",
  telegram: "",
  contactName: "",
  phone: "",
  email: "",
  comment: "",
};

export function SellerApplyPageClient() {
  const { user, loading: userLoading, isAuthenticated } = useCurrentUser();
  const { openAuth } = useAuthModal();
  const pendingSubmitRef = useRef(false);

  const [form, setForm] = useState<SellerApplicationForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [application, setApplication] = useState<SellerApplication | null>(null);

  const [loadingApplication, setLoadingApplication] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isSeller = user?.role === "SELLER";
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAuthenticated) {
      setApplication(null);
      return;
    }

    let cancelled = false;

    async function loadApplication() {
      setLoadingApplication(true);
      setFormError(null);

      try {
        const data = await getMySellerApplication();

        if (!cancelled) {
          setApplication(data);
        }
      } catch (error) {
        if (!cancelled) {
          setFormError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить статус заявки"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingApplication(false);
        }
      }
    }

    void loadApplication();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!user) return;

    setForm((current) => ({
      ...current,
      email: current.email || user.username || "",
    }));
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || userLoading || !pendingSubmitRef.current) return;

    pendingSubmitRef.current = false;
    void sendApplication();
  }, [isAuthenticated, userLoading]);

  const statusText = useMemo(() => {
    if (!application) return null;

    switch (application.status) {
      case "NEW":
        return "Заявка на рассмотрении";
      case "APPROVED":
        return "Заявка одобрена";
      case "REJECTED":
        return "Заявка отклонена";
      default:
        return "Статус заявки";
    }
  }, [application]);

  function updateField<K extends keyof SellerApplicationForm>(
    key: K,
    value: SellerApplicationForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  }

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};

    if (!isNonEmpty(form.brandName)) {
      nextErrors.brandName = "Укажите название бренда";
    }

    if (!isNonEmpty(form.brandDescription)) {
      nextErrors.brandDescription = "Кратко опишите бренд";
    }

    if (!isNonEmpty(form.category)) {
      nextErrors.category = "Укажите категорию товаров";
    }

    if (!isNonEmpty(form.productionRegion)) {
      nextErrors.productionRegion = "Укажите город или регион производства";
    }

    if (!isNonEmpty(form.contactName)) {
      nextErrors.contactName = "Укажите контактное лицо";
    }

    if (!isValidPhone(form.phone)) {
      nextErrors.phone = "Укажите корректный телефон";
    }

    if (!isValidEmail(form.email)) {
      nextErrors.email = "Укажите корректный e-mail";
    }

    return nextErrors;
  }

  async function sendApplication() {
  setSubmitting(true);

  try {
    const created = await createSellerApplication({
      brandName: cleanText(form.brandName),
      brandDescription: cleanText(form.brandDescription),
      category: cleanText(form.category),
      productionRegion: cleanText(form.productionRegion),
      website: cleanText(form.website),
      telegram: cleanText(form.telegram),
      contactName: cleanText(form.contactName),
      phone: cleanText(form.phone),
      email: cleanText(form.email),
      comment: cleanText(form.comment),
    });

    setApplication(created);
    setForm(INITIAL_FORM);
  } catch (error) {
    setFormError(
      error instanceof Error ? error.message : "Не удалось отправить заявку"
    );
  } finally {
    setSubmitting(false);
  }
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!isAuthenticated) {
      pendingSubmitRef.current = true;
      openAuth("login", "/seller/apply");
      return;
    }

    await sendApplication();
  }

  return (
    <main className="pageContainer">
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.kicker}>RCM для производителей</div>

            <h1 className={styles.title}>
              Продавайте товары на маркетплейсе отечественных брендов
            </h1>

            <p className={styles.lead}>
              RCM собирает локальных производителей, независимые бренды и
              качественные товары в одном минималистичном каталоге.
            </p>

            <div className={styles.heroActions}>
              <a className="buttonPrimary" href="#seller-application-form">
                Оставить заявку
              </a>

              <Link className="buttonSecondary" href="/about">
                О проекте
              </Link>
            </div>
          </div>

          <div className={styles.heroAside}>
            <div className={styles.asideLabel}>Для кого</div>
            <div className={styles.asideTitle}>
              Одежда, аксессуары, предметы для дома и локальные бренды.
            </div>
          </div>
        </section>

        <section className={styles.benefits}>
          <Benefit title="Чистая витрина" text="Минималистичный каталог без визуального шума." />
          <Benefit title="Кабинет продавца" text="Товары, заказы, профиль бренда и статусы в одном месте." />
          <Benefit title="Фокус на бренде" text="Отдельная страница производителя и привязка товаров к бренду." />
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.infoColumn}>
            <div className={styles.sectionKicker}>Как это работает</div>

            <div className={styles.steps}>
              <Step number="01" title="Вы оставляете заявку" />
              <Step number="02" title="Мы проверяем бренд и ассортимент" />
              <Step number="03" title="Открываем доступ к кабинету продавца" />
              <Step number="04" title="Вы добавляете товары и готовитесь к продажам" />
            </div>
          </div>

          <section id="seller-application-form" className={styles.formCard}>
            <div className={styles.formHeader}>
              <div className={styles.sectionKicker}>Заявка</div>
              <h2>Стать продавцом</h2>
              <p>
                Расскажите о бренде. После рассмотрения заявки мы откроем доступ
                к кабинету продавца.
              </p>
            </div>

            {userLoading || loadingApplication ? (
              <div className={styles.stateText}>Загрузка…</div>
            ) : isSeller ? (
              <StatusBlock
                title="Вы уже продавец"
                text="Перейдите в кабинет продавца, чтобы управлять товарами, заказами и профилем производителя."
                actionHref="/seller"
                actionLabel="Открыть кабинет"
              />
            ) : isAdmin ? (
              <StatusBlock
                title="Вы вошли как администратор"
                text="Заявка продавца для администратора не требуется."
                actionHref="/admin"
                actionLabel="Открыть админ-панель"
              />
            ) : application ? (
              <StatusBlock
                title={statusText ?? "Заявка отправлена"}
                text={
                  application.status === "REJECTED"
                    ? application.adminComment ||
                      "Заявка была отклонена. Можно связаться с командой RCM для уточнения деталей."
                    : "Мы получили вашу заявку. После проверки статус будет обновлен."
                }
                actionHref="/account"
                actionLabel="Перейти в аккаунт"
              />
            ) : (
              <form className={styles.form} onSubmit={submitApplication}>
                <FormError message={formError} />

                {!isAuthenticated ? (
                  <div className={styles.authNotice}>
                    Форму можно заполнить сейчас. Для отправки заявки войдите или зарегистрируйтесь.
                  </div>
                ) : null}

                <div className={styles.formGrid}>
                  <TextInput
                    label="Название бренда"
                    required
                    value={form.brandName}
                    error={errors.brandName}
                    onChange={(event) =>
                      updateField("brandName", event.target.value)
                    }
                  />

                  <TextInput
                    label="Категория товаров"
                    required
                    value={form.category}
                    placeholder="Например: одежда, аксессуары, дом"
                    error={errors.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                  />

                  <TextInput
                    label="Город / регион производства"
                    required
                    value={form.productionRegion}
                    error={errors.productionRegion}
                    onChange={(event) =>
                      updateField("productionRegion", event.target.value)
                    }
                  />

                  <TextInput
                    label="Сайт"
                    value={form.website}
                    placeholder="https://"
                    onChange={(event) =>
                      updateField("website", event.target.value)
                    }
                  />

                  <TextInput
                    label="Telegram"
                    value={form.telegram}
                    placeholder="@brand"
                    onChange={(event) =>
                      updateField("telegram", event.target.value)
                    }
                  />

                  <TextInput
                    label="Контактное лицо"
                    required
                    value={form.contactName}
                    error={errors.contactName}
                    onChange={(event) =>
                      updateField("contactName", event.target.value)
                    }
                  />

                  <PhoneInput
                    required
                    value={form.phone}
                    error={errors.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                  />

                  <TextInput
                    label="E-mail"
                    required
                    type="email"
                    value={form.email}
                    error={errors.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                  />
                </div>

                <Textarea
                  label="Описание бренда"
                  required
                  value={form.brandDescription}
                  error={errors.brandDescription}
                  onChange={(event) =>
                    updateField("brandDescription", event.target.value)
                  }
                />

                <Textarea
                  label="Комментарий"
                  value={form.comment}
                  placeholder="Расскажите, что важно знать перед подключением"
                  onChange={(event) =>
                    updateField("comment", event.target.value)
                  }
                />

                <div className={styles.actions}>
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? "Отправляем…" : "Отправить заявку"}
                  </Button>

                {!isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      className="buttonGhost"
                      onClick={() => openAuth("login", "/seller/apply")}
                    >
                      Войти
                    </button>

                    <button
                      type="button"
                      className="buttonGhost"
                      onClick={() => openAuth("register", "/seller/apply")}
                    >
                      Регистрация
                    </button>
                  </>
                ) : null}
                </div>
              </form>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function Benefit({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.benefit}>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
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

function StatusBlock({
  title,
  text,
  actionHref,
  actionLabel,
}: {
  title: string;
  text: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className={styles.statusBlock}>
      <h3>{title}</h3>
      <p>{text}</p>
      <Link className="buttonPrimary" href={actionHref}>
        {actionLabel}
      </Link>
    </div>
  );
}