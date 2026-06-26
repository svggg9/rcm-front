"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { Button } from "../../components/ui/Button";
import { ButtonPair } from "../../components/ui/ButtonPair";
import { FormError } from "../../components/ui/FormError";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Textarea } from "../../components/ui/Textarea";
import { TextInput } from "../../components/ui/TextInput";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { apiFetch, API_URL } from "../../lib/api";
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

type TelegramStatus = {
  url: string | null;
  expiresAt: string | null;
  linked: boolean;
  telegramUsername: string | null;
};

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
  const [successOpen, setSuccessOpen] = useState(false);
  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(
    null
  );
  const [telegramLinking, setTelegramLinking] = useState(false);

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

  useEffect(() => {
    if (!isAuthenticated) {
      setTelegramStatus(null);
      return;
    }

    void loadTelegramStatus();
  }, [isAuthenticated]);

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
      nextErrors.brandName = " ";
    }

    if (!isNonEmpty(form.category)) {
      nextErrors.category = " ";
    }

    if (!isValidPhone(form.phone)) {
      nextErrors.phone = " ";
    }

    if (!isValidEmail(form.email)) {
      nextErrors.email = " ";
    }

    return nextErrors;
  }

  async function loadTelegramStatus() {
    try {
      const response = await apiFetch(`${API_URL}/api/profile/telegram`);

      if (!response.ok) {
        return;
      }

      setTelegramStatus((await response.json()) as TelegramStatus);
    } catch {
      setTelegramStatus(null);
    }
  }

  async function connectTelegram() {
    if (telegramLinking) return;

    setTelegramLinking(true);

    try {
      const response = await apiFetch(`${API_URL}/api/profile/telegram/link`, {
        method: "POST",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as TelegramStatus;
      setTelegramStatus(data);

      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setTelegramLinking(false);
    }
  }

  async function sendApplication() {
  setSubmitting(true);

  try {
    const brandName = cleanText(form.brandName);

    const created = await createSellerApplication({
      brandName,
      brandDescription: cleanText(form.brandDescription),
      category: cleanText(form.category),
      productionRegion: "",
      website: cleanText(form.website),
      telegram: telegramStatus?.telegramUsername
        ? `@${telegramStatus.telegramUsername}`
        : cleanText(form.telegram),
      contactName: brandName || cleanText(form.email) || user?.username || "-",
      phone: cleanText(form.phone),
      email: cleanText(form.email),
      comment: cleanText(form.comment),
    });

    setApplication(created);
    setForm(INITIAL_FORM);
    setApplicationModalOpen(false);
    setSuccessOpen(true);
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
              <button
                type="button"
                className="buttonPrimary"
                onClick={() => setApplicationModalOpen(true)}
              >
                Оставить заявку
              </button>

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
                Оставьте короткую заявку. Подробные данные бренда и реквизиты
                можно будет заполнить после одобрения.
              </p>
            </div>

            {userLoading || loadingApplication ? null : isSeller ? (
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
              <div className={styles.applyCta}>
                <button
                  type="button"
                  className="buttonPrimary textButton"
                  onClick={() => setApplicationModalOpen(true)}
                >
                  Оставить заявку
                </button>
                {!isAuthenticated ? (
                  <p>Для отправки понадобится войти или зарегистрироваться.</p>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </div>

      {applicationModalOpen ? (
        <div
          className={styles.applyOverlay}
          role="presentation"
          onMouseDown={() => setApplicationModalOpen(false)}
        >
          <div
            className={styles.applyModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-apply-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.applyClose}
              onClick={() => setApplicationModalOpen(false)}
              aria-label="Закрыть"
            >
              ×
            </button>

            <div className={styles.applyHeader}>
              <h2 className={styles.applyTitle} id="seller-apply-modal-title">
                Стать продавцом
              </h2>
            </div>

            <div className={styles.applyBody}>
              <form className={styles.applyForm} onSubmit={submitApplication}>
                <FormError message={formError} />

                {!isAuthenticated ? (
                  <div className={styles.applyAuthBlock}>
                    <p className={styles.applyHint}>
                      Войдите или зарегистрируйтесь
                    </p>

                    <ButtonPair
                      primary={{
                        type: "button",
                        label: "Войти",
                        className: "textButton",
                        onClick: () => openAuth("login", "/seller/apply"),
                      }}
                      secondary={{
                        type: "button",
                        label: "Зарегистрироваться",
                        className: "textButton",
                        onClick: () => openAuth("register", "/seller/apply"),
                      }}
                    />
                  </div>
                ) : (
                  <TelegramConnect
                    linked={Boolean(telegramStatus?.linked)}
                    username={telegramStatus?.telegramUsername ?? null}
                    linking={telegramLinking}
                    onConnect={() => void connectTelegram()}
                  />
                )}

                <div className={styles.applyGrid}>
                  <TextInput
                    label="Имя бренда"
                    required
                    fieldVariant="boxed"
                    value={form.brandName}
                    error={errors.brandName}
                    onChange={(event) =>
                      updateField("brandName", event.target.value)
                    }
                  />

                  <TextInput
                    label="Категория товаров"
                    required
                    fieldVariant="boxed"
                    value={form.category}
                    placeholder="Одежда, аксессуары, дом"
                    error={errors.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                  />

                  <TextInput
                    label="Сайт"
                    fieldVariant="boxed"
                    value={form.website}
                    onChange={(event) =>
                      updateField("website", event.target.value)
                    }
                  />

                  <PhoneInput
                    required
                    fieldVariant="boxed"
                    value={form.phone}
                    error={errors.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />

                  <TextInput
                    label="E-mail"
                    required
                    fieldVariant="boxed"
                    type="email"
                    value={form.email}
                    error={errors.email}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </div>

                <Textarea
                  label="Комментарий"
                  fieldVariant="boxed"
                  value={form.comment}
                  placeholder="Что важно знать перед подключением"
                  onChange={(event) => updateField("comment", event.target.value)}
                />

                <Button
                  type="submit"
                  variant="primaryShimmer"
                  className="textButton"
                  disabled={submitting}
                >
                  {submitting ? "Отправляем…" : "Отправить заявку"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {successOpen ? (
        <div className="modalOverlay" role="presentation">
          <div
            className={`modal ${styles.successModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-apply-success-title"
          >
            <div className="modalHeader">
              <div>
                <div className={styles.modalKicker}>Заявка отправлена</div>
                <h2 className="modalTitle" id="seller-apply-success-title">
                  Спасибо, мы все получили
                </h2>
              </div>
              <button
                type="button"
                className="modalClose"
                onClick={() => setSuccessOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="modalBody">
              <p className={styles.modalText}>
                Проверим данные производителя и оповестим после модерации.
              </p>
            </div>

            <div className="modalFooter">
              <button
                type="button"
                className="buttonPrimary"
                onClick={() => setSuccessOpen(false)}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      ) : null}
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

function TelegramConnect({
  linked,
  username,
  linking,
  onConnect,
}: {
  linked: boolean;
  username: string | null;
  linking: boolean;
  onConnect: () => void;
}) {
  const content = (
    <>
      <div>
        <div className={styles.telegramTitleRow}>
          <Image
            src="/icons/telegram-svgrepo-com.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden="true"
            className={styles.telegramIcon}
          />
          <h3>Телеграм</h3>
        </div>
        <p>Подключите Телеграм, чтобы получать уведомления</p>
      </div>

      {linked ? (
        <span className={styles.telegramStatus}>
          {username ? `@${username}` : "Подключен"}
        </span>
      ) : (
        <span className={styles.telegramAction} aria-hidden="true">
          {linking ? "..." : "›"}
        </span>
      )}
    </>
  );

  if (!linked) {
    return (
      <button
        type="button"
        className={`${styles.telegramPanel} ${styles.telegramPanelAction}`}
        onClick={onConnect}
        disabled={linking}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={styles.telegramPanel}>
      {content}
    </div>
  );
}
