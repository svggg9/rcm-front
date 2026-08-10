"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuthModal } from "../../components/AuthModal/useAuthModal";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Textarea } from "../../components/ui/Textarea";
import { TextInput } from "../../components/ui/TextInput";
import { API_URL, apiFetch } from "../../lib/api";
import { useCurrentUser } from "../../lib/useCurrentUser";
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
import type { SellerApplication, SellerApplicationForm } from "./types";
import styles from "./SellerApplyPage.module.css";

type FormErrors = Partial<Record<keyof SellerApplicationForm, string>>;

type TelegramStatus = {
  url: string | null;
  expiresAt: string | null;
  linked: boolean;
  telegramUsername: string | null;
};

type ProfilePrefill = {
  email: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  phone: string | null;
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

function formatApplicationDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

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
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(
    null
  );
  const [telegramLinking, setTelegramLinking] = useState(false);

  const isSeller = user?.role === "SELLER";
  const isAdmin = user?.role === "ADMIN";

  const sendApplication = useCallback(async () => {
    if (submitting) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const created = await createSellerApplication({
        brandName: cleanText(form.brandName),
        brandDescription: cleanText(form.brandDescription),
        category: cleanText(form.category),
        productionRegion: "",
        website: cleanText(form.website),
        telegram: telegramStatus?.telegramUsername
          ? `@${telegramStatus.telegramUsername}`
          : cleanText(form.telegram),
        contactName: cleanText(form.contactName),
        phone: cleanText(form.phone),
        email: cleanText(form.email),
        comment: "",
      });

      setApplication(created);
      setForm(INITIAL_FORM);
      setErrors({});
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Не удалось отправить заявку"
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, submitting, telegramStatus?.telegramUsername]);

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
        if (!cancelled) setApplication(data);
      } catch (error) {
        if (!cancelled) {
          setFormError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить статус заявки"
          );
        }
      } finally {
        if (!cancelled) setLoadingApplication(false);
      }
    }

    void loadApplication();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || userLoading || !pendingSubmitRef.current) return;

    pendingSubmitRef.current = false;
    void sendApplication();
  }, [isAuthenticated, sendApplication, userLoading]);

  useEffect(() => {
    if (!isAuthenticated) {
      setTelegramStatus(null);
      return;
    }

    void loadTelegramStatus();
  }, [isAuthenticated]);

  useEffect(() => {
    const username = user?.username?.trim();
    if (!username || !isValidEmail(username)) return;

    setForm((current) =>
      current.email ? current : { ...current, email: username }
    );
  }, [user?.username]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function loadProfilePrefill() {
      try {
        const response = await apiFetch(`${API_URL}/api/profile`);
        if (!response.ok) return;

        const profile = (await response.json()) as ProfilePrefill;
        if (cancelled) return;

        const contactName =
          profile.displayName?.trim() ||
          [profile.lastName, profile.firstName, profile.middleName]
            .map((value) => value?.trim())
            .filter(Boolean)
            .join(" ");
        const email = profile.email?.trim() ?? "";
        const phone = profile.phone?.trim() ?? "";

        setForm((current) => ({
          ...current,
          contactName: current.contactName || contactName,
          email: current.email || email,
          phone: current.phone || phone,
        }));
      } catch {
        // The application remains editable when profile prefill is unavailable.
      }
    }

    void loadProfilePrefill();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const applicationDate = useMemo(
    () => (application ? formatApplicationDate(application.createdAt) : null),
    [application]
  );

  function updateField<K extends keyof SellerApplicationForm>(
    key: K,
    value: SellerApplicationForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};

    if (!isNonEmpty(form.brandName)) {
      nextErrors.brandName = "Введите название марки";
    }

    if (!isNonEmpty(form.category)) {
      nextErrors.category = "Укажите категорию товаров";
    }

    if (!isNonEmpty(form.contactName)) {
      nextErrors.contactName = "Укажите контактное лицо";
    }

    if (!isValidPhone(form.phone)) {
      nextErrors.phone = "Проверьте номер телефона";
    }

    if (!isValidEmail(form.email)) {
      nextErrors.email = "Проверьте электронную почту";
    }

    return nextErrors;
  }

  async function loadTelegramStatus() {
    try {
      const response = await apiFetch(`${API_URL}/api/profile/telegram`);
      if (!response.ok) return;
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

      if (!response.ok) return;

      const data = (await response.json()) as TelegramStatus;
      setTelegramStatus(data);

      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setTelegramLinking(false);
    }
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) return;

    if (!isAuthenticated) {
      pendingSubmitRef.current = true;
      openAuth("login", "/seller/apply");
      return;
    }

    await sendApplication();
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <header className={styles.hero}>
          <span className={styles.kicker}>Для российских марок</span>
          <h1 className={styles.title}>Стать продавцом на RCM</h1>
          <p className={styles.lead}>
            Расскажите о своей марке и ассортименте. Мы рассмотрим заявку и
            откроем доступ к кабинету продавца.
          </p>
        </header>

        <div className={styles.layout}>
          <aside className={styles.intro}>
            <h2>Что будет дальше</h2>
            <div className={styles.facts}>
              <Fact
                title="Проверим заявку"
                text="Познакомимся с маркой, производством и ассортиментом."
              />
              <Fact
                title="Откроем кабинет"
                text="После одобрения вы сможете оформить витрину и добавить товары."
              />
              <Fact
                title="Поможем запуститься"
                text="Подскажем по карточкам товаров, заказам и доставке."
              />
            </div>
            <p className={styles.helpText}>
              Остались вопросы? <Link href="/contacts">Свяжитесь с нами</Link>.
            </p>
          </aside>

          <section className={styles.formPanel} aria-labelledby="seller-apply-title">
            <div className={styles.formHeader}>
              <span>Заявка</span>
              <h2 id="seller-apply-title">Коротко о вашей марке</h2>
              <p>Обязательные поля отмечены звёздочкой.</p>
            </div>

            {userLoading || loadingApplication ? (
              <div className={styles.statusLoading} role="status" aria-busy="true">
                Проверяем статус заявки…
              </div>
            ) : isSeller ? (
              <StatusBlock
                label="Доступ открыт"
                title="Вы уже продавец"
                text="Управляйте товарами, заказами и витриной в кабинете продавца."
                actionHref="/seller"
                actionLabel="Открыть кабинет"
              />
            ) : isAdmin ? (
              <StatusBlock
                label="Аккаунт администратора"
                title="Заявка не требуется"
                text="Управление продавцами и заявками доступно в административной панели."
                actionHref="/admin"
                actionLabel="Открыть админку"
              />
            ) : application?.status === "REJECTED" ? (
              <StatusBlock
                label="Нужно уточнение"
                title="Заявку пока не одобрили"
                text={
                  application.adminComment ||
                  "Проверьте данные и отправьте новую заявку или свяжитесь с командой RCM."
                }
                actionLabel="Отправить новую заявку"
                onAction={() => {
                  setApplication(null);
                  setFormError(null);
                }}
              />
            ) : application ? (
              <StatusBlock
                label={application.status === "APPROVED" ? "Одобрено" : "На рассмотрении"}
                title={
                  application.status === "APPROVED"
                    ? "Марка одобрена"
                    : "Заявка отправлена"
                }
                text={
                  application.status === "APPROVED"
                    ? "Можно переходить в кабинет продавца и готовить витрину к запуску."
                    : `Мы получили заявку${
                        applicationDate ? ` ${applicationDate}` : ""
                      }. Сообщим, когда проверка будет завершена.`
                }
                actionHref={application.status === "APPROVED" ? "/seller" : "/account"}
                actionLabel={
                  application.status === "APPROVED"
                    ? "Открыть кабинет"
                    : "Перейти в аккаунт"
                }
              />
            ) : (
              <form className={styles.applyForm} onSubmit={submitApplication} noValidate>
                <FormError message={formError} />

                <section className={styles.formSection}>
                  <h3>О марке</h3>
                  <div className={styles.formGrid}>
                    <TextInput
                      label="Название марки"
                      required
                      fieldVariant="boxed"
                      autoComplete="organization"
                      maxLength={255}
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
                      placeholder="Например, одежда и аксессуары"
                      maxLength={255}
                      value={form.category}
                      error={errors.category}
                      onChange={(event) =>
                        updateField("category", event.target.value)
                      }
                    />

                    <div className={styles.fullField}>
                      <Textarea
                        label="Коротко о марке"
                        fieldVariant="boxed"
                        placeholder="Что вы создаёте и чем отличается ваша марка"
                        maxLength={1500}
                        value={form.brandDescription}
                        onChange={(event) =>
                          updateField("brandDescription", event.target.value)
                        }
                      />
                    </div>

                    <div className={styles.fullField}>
                      <TextInput
                        label="Сайт или страница в социальной сети"
                        fieldVariant="boxed"
                        placeholder="https://"
                        maxLength={500}
                        value={form.website}
                        onChange={(event) =>
                          updateField("website", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </section>

                <section className={styles.formSection}>
                  <h3>Контактное лицо</h3>
                  <div className={styles.formGrid}>
                    <TextInput
                      label="Имя и фамилия"
                      required
                      fieldVariant="boxed"
                      autoComplete="name"
                      maxLength={255}
                      value={form.contactName}
                      error={errors.contactName}
                      onChange={(event) =>
                        updateField("contactName", event.target.value)
                      }
                    />

                    <PhoneInput
                      required
                      fieldVariant="boxed"
                      value={form.phone}
                      error={errors.phone}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                    />

                    <div className={styles.fullField}>
                      <TextInput
                        label="Электронная почта"
                        required
                        fieldVariant="boxed"
                        type="email"
                        autoComplete="email"
                        maxLength={255}
                        value={form.email}
                        error={errors.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </section>

                {isAuthenticated ? (
                  <TelegramConnect
                    linked={Boolean(telegramStatus?.linked)}
                    username={telegramStatus?.telegramUsername ?? null}
                    linking={telegramLinking}
                    onConnect={() => void connectTelegram()}
                  />
                ) : null}

                <div className={styles.submitArea}>
                  <Button
                    type="submit"
                    variant="primary"
                    className={styles.submitButton}
                    loading={submitting}
                    disabled={submitting}
                  >
                    Отправить заявку
                  </Button>

                  {!isAuthenticated ? (
                    <p className={styles.authNote}>
                      Для отправки откроем вход или регистрацию — заполненные данные
                      останутся в форме.
                    </p>
                  ) : null}

                  <p className={styles.legalNote}>
                    Отправляя заявку, вы соглашаетесь с нашей{" "}
                    <Link href="/legal/privacy">политикой конфиденциальности</Link>.
                  </p>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Fact({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.fact}>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function StatusBlock({
  label,
  title,
  text,
  actionHref,
  actionLabel,
  onAction,
}: {
  label: string;
  title: string;
  text: string;
  actionHref?: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className={styles.statusBlock}>
      <span className={styles.statusLabel}>{label}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {onAction ? (
        <button type="button" className={styles.statusAction} onClick={onAction}>
          {actionLabel}
        </button>
      ) : actionHref ? (
        <Link className={styles.statusAction} href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
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
      <Image
        src="/icons/telegram.svg"
        alt=""
        width={20}
        height={20}
        aria-hidden="true"
        className={styles.telegramIcon}
      />
      <span className={styles.telegramCopy}>
        <strong>Уведомления в Telegram</strong>
        <span>
          {linked
            ? username
              ? `Подключён @${username}`
              : "Telegram подключён"
            : "Получите сообщение, когда статус заявки изменится"}
        </span>
      </span>
      <span className={styles.telegramAction}>
        {linked ? "Подключено" : linking ? "Открываем…" : "Подключить"}
      </span>
    </>
  );

  if (linked) {
    return <div className={styles.telegramPanel}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={styles.telegramPanel}
      onClick={onConnect}
      disabled={linking}
    >
      {content}
    </button>
  );
}
