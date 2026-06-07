"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { TextInput } from "../../components/ui/TextInput";
import { Textarea } from "../../components/ui/Textarea";
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
          setForm(mapLegalInfoToForm(info));
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
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
      setSavedMessage("Реквизиты сохранены");
      emitSellerOnboardingChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить реквизиты");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.state}>Загрузка реквизитов…</div>;
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
        <FormError message={error} />

        {savedMessage ? <div className={styles.success}>{savedMessage}</div> : null}

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
            <TextInput
              label="ИНН"
              required
              value={form.inn}
              error={errors.inn}
              onChange={(event) => updateField("inn", event.target.value)}
            />

            {form.sellerType === "IP" ? (
              <TextInput
                label="ОГРНИП"
                required
                value={form.ogrnip}
                error={errors.ogrnip}
                onChange={(event) => updateField("ogrnip", event.target.value)}
              />
            ) : null}

            {form.sellerType === "OOO" ? (
              <>
                <TextInput
                  label="Название компании"
                  required
                  value={form.companyName}
                  error={errors.companyName}
                  onChange={(event) =>
                    updateField("companyName", event.target.value)
                  }
                />

                <TextInput
                  label="ОГРН"
                  required
                  value={form.ogrn}
                  error={errors.ogrn}
                  onChange={(event) => updateField("ogrn", event.target.value)}
                />
              </>
            ) : null}

            <TextInput
              label={form.sellerType === "OOO" ? "Юридическое название" : "ФИО"}
              required
              value={form.legalName}
              error={errors.legalName}
              onChange={(event) => updateField("legalName", event.target.value)}
            />
          </div>

          <Textarea
            label="Юридический адрес"
            value={form.legalAddress}
            onChange={(event) => updateField("legalAddress", event.target.value)}
          />
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Банковские реквизиты</h2>
            <p>Нужны для выплат продавцу и финансового учета.</p>
          </div>

          <div className={styles.grid}>
            <TextInput
              label="Банк"
              required
              value={form.bankName}
              error={errors.bankName}
              onChange={(event) => updateField("bankName", event.target.value)}
            />

            <TextInput
              label="БИК"
              required
              value={form.bik}
              error={errors.bik}
              onChange={(event) => updateField("bik", event.target.value)}
            />

            <TextInput
              label="Расчетный счет"
              required
              value={form.checkingAccount}
              error={errors.checkingAccount}
              onChange={(event) =>
                updateField("checkingAccount", event.target.value)
              }
            />

            <TextInput
              label="Корреспондентский счет"
              value={form.correspondentAccount}
              onChange={(event) =>
                updateField("correspondentAccount", event.target.value)
              }
            />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.agreementRow}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.agreementAccepted}
                onChange={(event) =>
                  updateField("agreementAccepted", event.target.checked)
                }
              />
              <span>
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
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Сохраняем…" : "Сохранить реквизиты"}
          </Button>
        </div>
      </form>
    </section>
  );
}