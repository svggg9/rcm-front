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
  getCdekReceptionPoints,
  saveSellerLegalInfo,
  searchDeliveryCities,
  type CdekReceptionPoint,
  type DeliveryCityOption,
  type SellerLegalInfo,
  type SellerLegalInfoForm,
  type SellerType,
} from "../lib/sellerLegalApi";

import styles from "./SellerLegalTab.module.css";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";

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
  shippingCountryCode: "RU",
  shippingCityCode: "",
  shippingCityName: "",
  shippingAddress: "",
  cdekShipmentPoint: "",
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
    shippingCountryCode: info.shippingCountryCode ?? "RU",
    shippingCityCode: info.shippingCityCode ? String(info.shippingCityCode) : "",
    shippingCityName: info.shippingCityName ?? "",
    shippingAddress: info.shippingAddress ?? "",
    cdekShipmentPoint: info.cdekShipmentPoint ?? "",
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
  const [cityOptions, setCityOptions] = useState<DeliveryCityOption[]>([]);
  const [cityOptionsOpen, setCityOptionsOpen] = useState(false);
  const [pointOptions, setPointOptions] = useState<CdekReceptionPoint[]>([]);
  const [pointOptionsOpen, setPointOptionsOpen] = useState(false);
  const [pointQuery, setPointQuery] = useState("");

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
          setPointQuery(nextForm.shippingAddress || nextForm.cdekShipmentPoint);
        }

        if (!cancelled && !info) {
          setSavedForm(INITIAL_FORM);
          setPointQuery("");
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

  useEffect(() => {
    const query = form.shippingCityName.trim();

    if (query.length < 2 || form.shippingCityCode) {
      setCityOptions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchDeliveryCities(query)
        .then((cities) => {
          setCityOptions(cities.slice(0, 8));
          setCityOptionsOpen(cities.length > 0);
        });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [form.shippingCityName, form.shippingCityCode]);

  useEffect(() => {
    const cityCode = Number(form.shippingCityCode);
    const query = pointQuery.trim();

    if (!Number.isFinite(cityCode) || cityCode <= 0) {
      setPointOptions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void getCdekReceptionPoints(cityCode, query.length >= 2 ? query : undefined)
        .then((points) => {
          setPointOptions(points);
          setPointOptionsOpen(points.length > 0 && !form.cdekShipmentPoint);
        });
    }, query.length >= 2 ? 250 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [form.shippingCityCode, pointQuery, form.cdekShipmentPoint]);

  const visiblePointOptions = pointOptions.slice(0, 12);

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

  function selectShippingCity(city: DeliveryCityOption) {
    setForm((prev) => ({
      ...prev,
      shippingCountryCode: city.countryCode ?? "RU",
      shippingCityCode: String(city.code),
      shippingCityName: city.fullName,
      shippingAddress: "",
      cdekShipmentPoint: "",
    }));
    setPointQuery("");
    setCityOptions([]);
    setCityOptionsOpen(false);
    setPointOptionsOpen(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.shippingCityName;
      delete next.shippingCityCode;
      delete next.cdekShipmentPoint;
      return next;
    });
    setSavedMessage(null);
  }

  function updateShippingCityInput(value: string) {
    setForm((prev) => ({
      ...prev,
      shippingCityName: value,
      shippingCityCode: "",
      shippingAddress: "",
      cdekShipmentPoint: "",
    }));
    setPointQuery("");
    setPointOptions([]);
    setPointOptionsOpen(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.shippingCityName;
      delete next.shippingCityCode;
      delete next.cdekShipmentPoint;
      return next;
    });
    setSavedMessage(null);
  }

  function selectReceptionPoint(point: CdekReceptionPoint) {
    setForm((prev) => ({
      ...prev,
      cdekShipmentPoint: point.id,
      shippingAddress: point.fullAddress ?? prev.shippingAddress,
    }));
    setPointQuery(point.fullAddress || point.name || point.id);
    setPointOptionsOpen(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.cdekShipmentPoint;
      return next;
    });
    setSavedMessage(null);
  }

  function updateReceptionPointInput(value: string) {
    setPointQuery(value);
    setForm((prev) => ({
      ...prev,
      cdekShipmentPoint: "",
      shippingAddress: "",
    }));
    setPointOptionsOpen(Boolean(form.shippingCityCode));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.cdekShipmentPoint;
      return next;
    });
    setSavedMessage(null);
  }

  const formChanged = JSON.stringify(form) !== JSON.stringify(savedForm);
  const hasValidationErrors = Object.keys(errors).length > 0;

  function validateForm(values: SellerLegalInfoForm): FormErrors {
    const nextErrors: FormErrors = {};

    function addError(key: keyof SellerLegalInfoForm, message: string) {
      nextErrors[key] = message;
    }

    if (!isValidInn(values.inn, values.sellerType)) {
      addError("inn", "Укажите ИНН");
    }

    if (values.sellerType === "IP" && !isValidOgrnip(values.ogrnip)) {
      addError("ogrnip", "Укажите ОГРНИП");
    }

    if (values.sellerType === "OOO") {
      if (!isNonEmpty(values.companyName)) {
        addError("companyName", "Укажите название компании");
      }

      if (!isValidOgrn(values.ogrn)) {
        addError("ogrn", "Укажите ОГРН");
      }
    }

    if (!isNonEmpty(values.legalName)) {
      addError(
        "legalName",
        values.sellerType === "OOO" ? "Укажите юр. название" : "Укажите ФИО"
      );
    }

    if (!isNonEmpty(values.shippingCityName)) {
      addError("shippingCityName", "Укажите город отправления");
    }

    if (!onlyDigits(values.shippingCityCode)) {
      addError("shippingCityCode", "Укажите код города СДЭК");
    }

    if (!isNonEmpty(values.cdekShipmentPoint)) {
      addError("cdekShipmentPoint", "Укажите пункт приема СДЭК");
    }

    if (!isNonEmpty(values.bankName)) {
      addError("bankName", "Укажите банк");
    }

    if (!isValidBik(values.bik)) {
      addError("bik", "Укажите БИК");
    }

    if (!isValidBankAccount(values.checkingAccount, values.bik)) {
      addError("checkingAccount", "Укажите расчетный счет");
    }

    if (
      isNonEmpty(values.correspondentAccount) &&
      !isValidCorrespondentAccount(values.correspondentAccount, values.bik)
    ) {
      addError("correspondentAccount", "Укажите корреспондентский счет");
    }

    if (!values.agreementAccepted) {
      addError("agreementAccepted", "Необходимо принять оферту продавца");
    }

    return nextErrors;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(form);

    setErrors(nextErrors);
    setError(null);
    setSavedMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => {
        const firstInvalidField = document.querySelector<HTMLElement>(
          '[aria-invalid="true"]'
        );

        firstInvalidField?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        firstInvalidField?.focus({ preventScroll: true });
      });

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
    return <CabinetSkeleton variant="form" />;
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
            <h2>Адрес отправления</h2>
            <p>Нужен для точного расчета доставки и создания отправлений СДЭК.</p>
          </div>

          <div className={styles.grid}>
            <div className={styles.suggestField}>
              <LegalTextField
                label="Город отправления"
                required
                suppressRequiredHighlight={hasValidationErrors}
                value={form.shippingCityName}
                error={errors.shippingCityName || errors.shippingCityCode}
                onFocus={() => setCityOptionsOpen(cityOptions.length > 0)}
                onChange={(event) => {
                  updateShippingCityInput(event.target.value);
                }}
              />
              {cityOptionsOpen && cityOptions.length > 0 ? (
                <div className={styles.suggestList}>
                  {cityOptions.map((city) => (
                    <button
                      type="button"
                      key={`${city.code}-${city.fullName}`}
                      className={styles.suggestItem}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectShippingCity(city)}
                    >
                      {city.fullName}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={styles.suggestField}>
              <LegalTextField
                label="Пункт приема СДЭК"
                required
                suppressRequiredHighlight={hasValidationErrors}
                value={pointQuery}
                error={errors.cdekShipmentPoint}
                disabled={!form.shippingCityCode}
                onFocus={() => setPointOptionsOpen(visiblePointOptions.length > 0)}
                onChange={(event) => updateReceptionPointInput(event.target.value)}
                placeholder={
                  form.shippingCityCode ? "Улица или адрес пункта" : "Сначала город"
                }
              />
              {pointOptionsOpen && visiblePointOptions.length > 0 ? (
                <div className={styles.suggestList}>
                  {visiblePointOptions.map((point) => (
                    <button
                      type="button"
                      key={point.id}
                      className={styles.suggestItem}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectReceptionPoint(point)}
                    >
                      <span>{point.name || point.id}</span>
                      {point.fullAddress ? <small>{point.fullAddress}</small> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
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
                aria-invalid={errors.agreementAccepted ? "true" : undefined}
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
            Сохранить
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
                Создать товар
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
