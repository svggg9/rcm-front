"use client";

import { useEffect, useState } from "react";
import type {
  FormEvent,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "../../components/ui/Button";
import { ChoiceMark } from "../../components/ui/ChoiceMark";
import { API_URL, apiFetch } from "../../lib/api";
import { isNonEmpty } from "../../lib/validation";
import { emitSellerOnboardingChanged } from "../lib/sellerOnboardingEvents";

import {
  getSellerLegalInfo,
  saveSellerLegalInfo,
  type SellerLegalInfo,
  type SellerLegalInfoForm,
  type SellerType,
} from "../lib/sellerLegalApi";

import styles from "./SellerLegalTab.module.css";

type FormErrors = Partial<Record<keyof SellerLegalInfoForm, string>>;

function onlyDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

function isValidInn(value: string, sellerType: SellerType) {
  const inn = onlyDigits(value);
  return sellerType === "OOO" ? inn.length === 10 : inn.length === 12;
}

function isValidOgrn(value: string) {
  return onlyDigits(value).length === 13;
}

function isValidOgrnip(value: string) {
  return onlyDigits(value).length === 15;
}

function isValidBik(value: string) {
  return onlyDigits(value).length === 9;
}

function isValidBankAccount(value: string, bik: string) {
  const account = onlyDigits(value);
  const cleanBik = onlyDigits(bik);
  return account.length === 20 && cleanBik.length === 9;
}

function isValidCorrespondentAccount(value: string, bik: string) {
  const account = onlyDigits(value);
  const cleanBik = onlyDigits(bik);
  return account.length === 20 && cleanBik.length === 9;
}

const INITIAL_FORM: SellerLegalInfoForm = {
  sellerType: "IP",
  inn: "",
  ogrn: "",
  ogrnip: "",
  companyName: "",
  legalName: "",
  legalAddress: "",
  bankName: "",
  bik: "",
  checkingAccount: "",
  correspondentAccount: "",
  agreementAccepted: false,
};

function mapLegalInfoToForm(info: SellerLegalInfo): SellerLegalInfoForm {
  return {
    sellerType: info.sellerType,
    inn: info.inn ?? "",
    ogrn: info.ogrn ?? "",
    ogrnip: info.ogrnip ?? "",
    companyName: info.companyName ?? "",
    legalName: info.legalName ?? "",
    legalAddress: info.legalAddress ?? "",
    bankName: info.bankName ?? "",
    bik: info.bik ?? "",
    checkingAccount: info.checkingAccount ?? "",
    correspondentAccount: info.correspondentAccount ?? "",
    agreementAccepted: Boolean(info.agreementAccepted),
  };
}

function formatSellerType(type: SellerType) {
  switch (type) {
    case "IP":
      return "ИП";
    case "OOO":
      return "ООО";
    case "SELF_EMPLOYED":
      return "Самозанятый";
    default:
      return type;
  }
}

export function SellerLegalTab() {
  const router = useRouter();
  const [form, setForm] = useState<SellerLegalInfoForm>(INITIAL_FORM);
  const [savedForm, setSavedForm] = useState<SellerLegalInfoForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLegalInfo() {
      setLoading(true);
      setError(null);

      try {
        const info = await getSellerLegalInfo();

        if (!cancelled && info) {
          const nextForm = mapLegalInfoToForm(info);
          setForm(nextForm);
          setSavedForm(nextForm);
        }

        if (!cancelled && !info) {
          setSavedForm(INITIAL_FORM);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось загрузить реквизиты");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLegalInfo();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof SellerLegalInfoForm>(
    key: K,
    value: SellerLegalInfoForm[K]
  ) {
    const nextForm = {
      ...form,
      [key]: value,
    };

    setForm(nextForm);
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      delete nextErrors[key];

      if (key === "sellerType") {
        delete nextErrors.inn;
        delete nextErrors.ogrn;
        delete nextErrors.ogrnip;
        delete nextErrors.companyName;
        delete nextErrors.legalName;
      }

      if (key === "bik") {
        delete nextErrors.checkingAccount;
        delete nextErrors.correspondentAccount;
      }

      return nextErrors;
    });

    setSavedMessage(null);
  }

  const formChanged = JSON.stringify(form) !== JSON.stringify(savedForm);
  const hasValidationErrors = Object.keys(errors).length > 0;

  function validateForm(values: SellerLegalInfoForm): FormErrors {
    function error(key: keyof SellerLegalInfoForm, message: string): FormErrors {
      return { [key]: message };
    }

    if (!isValidInn(values.inn, values.sellerType)) {
      return error("inn", "Укажите ИНН");
    }

    if (values.sellerType === "IP" && !isValidOgrnip(values.ogrnip)) {
      return error("ogrnip", "Укажите ОГРНИП");
    }

    if (values.sellerType === "OOO") {
      if (!isNonEmpty(values.companyName)) {
        return error("companyName", "Укажите название компании");
      }

      if (!isValidOgrn(values.ogrn)) {
        return error("ogrn", "Укажите ОГРН");
      }
    }

    if (!isNonEmpty(values.legalName)) {
      return error(
        "legalName",
        values.sellerType === "OOO" ? "Укажите юр. название" : "Укажите ФИО"
      );
    }

    if (!isNonEmpty(values.bankName)) {
      return error("bankName", "Укажите банк");
    }

    if (!isValidBik(values.bik)) {
      return error("bik", "Укажите БИК");
    }

    if (!isValidBankAccount(values.checkingAccount, values.bik)) {
      return error("checkingAccount", "Укажите расчетный счет");
    }

    if (
      isNonEmpty(values.correspondentAccount) &&
      !isValidCorrespondentAccount(values.correspondentAccount, values.bik)
    ) {
      return error("correspondentAccount", "Укажите корреспондентский счет");
    }

    if (!values.agreementAccepted) {
      return error("agreementAccepted", "Необходимо принять оферту продавца");
    }

    return {};
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(form);

    setErrors(nextErrors);
    setError(null);
    setSavedMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);

    try {
      await saveSellerLegalInfo(form);
      setSavedForm(form);
      setSavedMessage("Реквизиты сохранены");
      setSuccessOpen(true);
      emitSellerOnboardingChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить реквизиты");
    } finally {
      setSaving(false);
    }
  }

  async function createProductDraft() {
    if (creatingProduct) return;

    setCreatingProduct(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/draft`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось создать товар");
      }

      const productId: number = await response.json();
      router.push(`/seller/products/${productId}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать товар");
      setSuccessOpen(false);
    } finally {
      setCreatingProduct(false);
    }
  }

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonCard}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonGrid}>
            <div />
            <div />
            <div />
            <div />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>Реквизиты</div>
          <h1 className={styles.title}>Юридическая информация</h1>
          <p className={styles.hint}>
            Эти данные используются для договора, выплат и бухгалтерских документов.
            Покупателям они не показываются в публичном профиле бренда.
          </p>
        </div>
      </div>

      <form className={styles.form} onSubmit={submit}>
        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Тип продавца</h2>
            <p>Выберите юридический статус, от него зависит набор реквизитов.</p>
          </div>

          <div className={styles.typeGrid}>
            {(["IP", "OOO", "SELF_EMPLOYED"] as SellerType[]).map((type) => (
              <label
                key={type}
                className={`${styles.typeOption} ${
                  form.sellerType === type ? styles.typeOptionActive : ""
                }`}
              >
                <input
                  type="radio"
                  name="sellerType"
                  value={type}
                  checked={form.sellerType === type}
                  onChange={() => updateField("sellerType", type)}
                />
                <span>{formatSellerType(type)}</span>
                <ChoiceMark checked={form.sellerType === type} />
              </label>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Основные данные</h2>
            <p>ИНН, регистрационные данные и юридическое имя.</p>
          </div>

          <div className={styles.grid}>
            <LegalTextField
              label="ИНН"
              numeric
              numericMaxLength={form.sellerType === "OOO" ? 10 : 12}
              required
              suppressRequiredHighlight={hasValidationErrors}
              value={form.inn}
              error={errors.inn}
              onChange={(event) => updateField("inn", event.target.value)}
            />

            {form.sellerType === "IP" ? (
              <LegalTextField
                label="ОГРНИП"
                numeric
                numericMaxLength={15}
                required
                suppressRequiredHighlight={hasValidationErrors}
                value={form.ogrnip}
                error={errors.ogrnip}
                onChange={(event) => updateField("ogrnip", event.target.value)}
              />
            ) : null}

            {form.sellerType === "OOO" ? (
              <>
                <LegalTextField
                  label="Название компании"
                  required
                  suppressRequiredHighlight={hasValidationErrors}
                  value={form.companyName}
                  error={errors.companyName}
                  onChange={(event) =>
                    updateField("companyName", event.target.value)
                  }
                />

                <LegalTextField
                  label="ОГРН"
                  numeric
                  numericMaxLength={13}
                  required
                  suppressRequiredHighlight={hasValidationErrors}
                  value={form.ogrn}
                  error={errors.ogrn}
                  onChange={(event) => updateField("ogrn", event.target.value)}
                />
              </>
            ) : null}

            <LegalTextField
              label={form.sellerType === "OOO" ? "Юридическое название" : "ФИО"}
              required
              suppressRequiredHighlight={hasValidationErrors}
              value={form.legalName}
              error={errors.legalName}
              onChange={(event) => updateField("legalName", event.target.value)}
            />
          </div>

          <div className={styles.addressField}>
            <LegalTextarea
              label="Юридический адрес"
              value={form.legalAddress}
              onChange={(event) => updateField("legalAddress", event.target.value)}
            />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Банковские реквизиты</h2>
            <p>Нужны для выплат продавцу и финансового учета.</p>
          </div>

          <div className={styles.grid}>
            <LegalTextField
              label="Банк"
              required
              suppressRequiredHighlight={hasValidationErrors}
              value={form.bankName}
              error={errors.bankName}
              onChange={(event) => updateField("bankName", event.target.value)}
            />

            <LegalTextField
              label="БИК"
              numeric
              numericMaxLength={9}
              required
              suppressRequiredHighlight={hasValidationErrors}
              value={form.bik}
              error={errors.bik}
              onChange={(event) => updateField("bik", event.target.value)}
            />

            <LegalTextField
              label="Расчетный счет"
              numeric
              numericMaxLength={20}
              required
              suppressRequiredHighlight={hasValidationErrors}
              value={form.checkingAccount}
              error={errors.checkingAccount}
              onChange={(event) =>
                updateField("checkingAccount", event.target.value)
              }
            />

            <LegalTextField
              label="Корреспондентский счет"
              numeric
              numericMaxLength={20}
              value={form.correspondentAccount}
              error={errors.correspondentAccount}
              onChange={(event) =>
                updateField("correspondentAccount", event.target.value)
              }
            />
          </div>
        </section>

        <section className={styles.plainSection}>
          <div className={styles.agreementRow}>
            <label
              className={`${styles.checkbox} ${
                errors.agreementAccepted ? styles.checkboxError : ""
              }`}
            >
              <input
                type="checkbox"
                checked={form.agreementAccepted}
                onChange={(event) =>
                  updateField("agreementAccepted", event.target.checked)
                }
              />
              <span className={styles.checkboxMark} />
              <span className={styles.checkboxText}>
                Я принимаю{" "}
                <Link href="/terms/seller" target="_blank">
                  оферту продавца
                </Link>
              </span>
            </label>
          </div>
        </section>

        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={saving || !formChanged}>
            {savedMessage && !formChanged ? "Реквизиты сохранены" : "Сохранить реквизиты"}
          </Button>
        </div>
      </form>

      {successOpen ? (
        <div className="modalOverlay" role="presentation">
          <div
            className={`modal ${styles.successModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-legal-success-title"
          >
            <div className="modalHeader">
              <div>
                <div className={styles.modalKicker}>Готово</div>
                <h2 className="modalTitle" id="seller-legal-success-title">
                  Реквизиты сохранены
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
                Теперь можно добавить первый товар и отправить карточку на модерацию.
              </p>
            </div>

            <div className="modalFooter">
              <button
                type="button"
                className="buttonSecondary"
                onClick={() => setSuccessOpen(false)}
              >
                Позже
              </button>
              <button
                type="button"
                className="buttonPrimary"
                disabled={creatingProduct}
                onClick={() => void createProductDraft()}
              >
                {creatingProduct ? "Создаем..." : "Создать товар"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type LegalFieldProps = {
  label: string;
  required?: boolean;
  suppressRequiredHighlight?: boolean;
  error?: string;
  numeric?: boolean;
  numericMaxLength?: number;
};

function LegalTextField({
  label,
  required,
  suppressRequiredHighlight,
  error,
  numeric,
  numericMaxLength,
  className = "",
  onChange,
  ...props
}: LegalFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const requiredEmpty =
    required && !suppressRequiredHighlight && !String(props.value ?? "").trim();

  return (
    <label className={styles.fieldWrap}>
      <span className={styles.fieldLabel}>
        {label}
        {required ? "" : ""}
      </span>
      <input
        {...props}
        className={`${styles.input} ${requiredEmpty ? styles.requiredEmpty : ""} ${
          error ? styles.inputError : ""
        } ${className}`.trim()}
        inputMode={numeric ? "numeric" : props.inputMode}
        pattern={numeric ? "[0-9]*" : props.pattern}
        aria-invalid={error ? "true" : undefined}
        onPaste={(event) => {
          if (numeric) return;

          const pastedText = event.clipboardData.getData("text").trim();
          const input = event.currentTarget;
          const selectionStart = input.selectionStart ?? input.value.length;
          const selectionEnd = input.selectionEnd ?? input.value.length;
          const nextValue =
            input.value.slice(0, selectionStart) +
            pastedText +
            input.value.slice(selectionEnd);

          event.preventDefault();
          input.value = nextValue;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }}
        onChange={(event) => {
          if (numeric) {
            event.target.value = onlyDigits(event.target.value, numericMaxLength);
          }

          onChange?.(event);
        }}
      />
    </label>
  );
}

function LegalTextarea({
  label,
  required,
  error,
  className = "",
  ...props
}: LegalFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={styles.fieldWrap}>
      <span className={styles.fieldLabel}>
        {label}
        {required ? "" : ""}
      </span>
      <textarea
        className={`${styles.textarea} ${error ? styles.inputError : ""} ${className}`.trim()}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    </label>
  );
}
