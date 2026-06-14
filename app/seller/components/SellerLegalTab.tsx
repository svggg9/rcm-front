"use client";

import { useEffect, useState } from "react";
import type {
  FormEvent,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";

import { Button } from "../../components/ui/Button";
import { ChoiceMark } from "../../components/ui/ChoiceMark";
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
  const [form, setForm] = useState<SellerLegalInfoForm>(INITIAL_FORM);
  const [savedForm, setSavedForm] = useState<SellerLegalInfoForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }));

    setSavedMessage(null);
  }

  const formChanged = JSON.stringify(form) !== JSON.stringify(savedForm);

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};

    if (!isNonEmpty(form.inn)) {
      nextErrors.inn = "Укажите ИНН";
    }

    if (form.sellerType === "IP" && !isNonEmpty(form.ogrnip)) {
      nextErrors.ogrnip = "Укажите ОГРНИП";
    }

    if (form.sellerType === "OOO") {
      if (!isNonEmpty(form.companyName)) {
        nextErrors.companyName = "Укажите название компании";
      }

      if (!isNonEmpty(form.ogrn)) {
        nextErrors.ogrn = "Укажите ОГРН";
      }
    }

    if (!isNonEmpty(form.legalName)) {
      nextErrors.legalName =
        form.sellerType === "OOO" ? "Укажите юр. название" : "Укажите ФИО";
    }

    if (!isNonEmpty(form.bankName)) {
      nextErrors.bankName = "Укажите банк";
    }

    if (!isNonEmpty(form.bik)) {
      nextErrors.bik = "Укажите БИК";
    }

    if (!isNonEmpty(form.checkingAccount)) {
      nextErrors.checkingAccount = "Укажите расчетный счет";
    }

    if (!form.agreementAccepted) {
      nextErrors.agreementAccepted = "Необходимо принять оферту продавца";
    }

    return nextErrors;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();

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
      emitSellerOnboardingChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить реквизиты");
    } finally {
      setSaving(false);
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
              required
              value={form.inn}
              error={errors.inn}
              onChange={(event) => updateField("inn", event.target.value)}
            />

            {form.sellerType === "IP" ? (
              <LegalTextField
                label="ОГРНИП"
                numeric
                required
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
                  value={form.companyName}
                  error={errors.companyName}
                  onChange={(event) =>
                    updateField("companyName", event.target.value)
                  }
                />

                <LegalTextField
                  label="ОГРН"
                  numeric
                  required
                  value={form.ogrn}
                  error={errors.ogrn}
                  onChange={(event) => updateField("ogrn", event.target.value)}
                />
              </>
            ) : null}

            <LegalTextField
              label={form.sellerType === "OOO" ? "Юридическое название" : "ФИО"}
              required
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
              value={form.bankName}
              error={errors.bankName}
              onChange={(event) => updateField("bankName", event.target.value)}
            />

            <LegalTextField
              label="БИК"
              numeric
              required
              value={form.bik}
              error={errors.bik}
              onChange={(event) => updateField("bik", event.target.value)}
            />

            <LegalTextField
              label="Расчетный счет"
              numeric
              required
              value={form.checkingAccount}
              error={errors.checkingAccount}
              onChange={(event) =>
                updateField("checkingAccount", event.target.value)
              }
            />

            <LegalTextField
              label="Корреспондентский счет"
              numeric
              value={form.correspondentAccount}
              onChange={(event) =>
                updateField("correspondentAccount", event.target.value)
              }
            />
          </div>
        </section>

        <section className={styles.plainSection}>
          <div className={styles.agreementRow}>
            <label className={styles.checkbox}>
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

            {errors.agreementAccepted ? (
              <div className={styles.fieldError}>{errors.agreementAccepted}</div>
            ) : null}
          </div>
        </section>

        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={saving || !formChanged}>
            {savedMessage && !formChanged ? "Реквизиты сохранены" : "Сохранить реквизиты"}
          </Button>
        </div>
      </form>
    </section>
  );
}

type LegalFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  numeric?: boolean;
};

function LegalTextField({
  label,
  required,
  error,
  numeric,
  className = "",
  onChange,
  ...props
}: LegalFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const requiredEmpty =
    required && !String(props.value ?? "").trim();

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
        onChange={(event) => {
          if (numeric) {
            event.target.value = event.target.value.replace(/\D/g, "");
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
