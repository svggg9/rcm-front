"use client";

import { useFieldValidation } from "../../lib/useFieldValidation";
import { InputControl } from "../../components/ui/InputControl";

import { useEffect, useId, useRef, useState } from "react";
import type {
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { toast } from "../../components/ui/toast";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { ChoiceMark } from "../../components/ui/ChoiceMark";
import { Icon } from "../../components/ui/Icon";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { createSellerProductDraft } from "../lib/createSellerProductDraft";
import { getRussianPhoneDigits } from "../../lib/phone";
import { scrollToFirstValidationError } from "../../lib/formValidation";
import { isNonEmpty } from "../../lib/validation";
import { emitSellerOnboardingChanged } from "../lib/sellerOnboardingEvents";

import {
  getSellerLegalInfo,
  getSellerProfileContactName,
  getCdekReceptionPoints,
  saveSellerLegalInfo,
  searchDeliveryCities,
  type CdekReceptionPoint,
  type DeliveryCityOption,
  type SellerLegalInfo,
  type SellerLegalInfoForm,
  type SellerType,
} from "../lib/sellerLegalApi";

import {
  SellerNotificationChannels,
  useSellerNotificationChannels,
} from "./SellerNotificationChannels";
import { SellerReceptionPointPicker } from "./SellerReceptionPointPicker";
import styles from "./SellerLegalTab.module.css";

type FormErrors = Partial<Record<keyof SellerLegalInfoForm, string>>;
type SaveSection = "legal" | "contacts" | "shipping" | "bank";

function parseLegalSection(value: string | null): SaveSection | null {
  return value === "legal" || value === "contacts" || value === "shipping" || value === "bank" ? value : null;
}
const SECTION_FIELDS: Record<SaveSection, (keyof SellerLegalInfoForm)[]> = {
  legal: ["sellerType", "inn", "ogrn", "ogrnip", "companyName", "legalName", "legalAddress"],
  contacts: ["contactName", "phone"],
  shipping: ["shippingCountryCode", "shippingCityCode", "shippingCityName", "shippingAddress", "cdekShipmentPoint"],
  bank: ["bankName", "bik", "checkingAccount", "correspondentAccount", "agreementAccepted"],
};

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

function isValidPhone(value: string) {
  return getRussianPhoneDigits(value).length === 10;
}

const INITIAL_FORM: SellerLegalInfoForm = {
  sellerType: "IP",
  inn: "",
  ogrn: "",
  ogrnip: "",
  companyName: "",
  legalName: "",
  contactName: "",
  phone: "",
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
    contactName: info.contactName ?? "",
    phone: info.phone ?? "",
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
  const searchParams = useSearchParams();
  const requestedSection = parseLegalSection(searchParams.get("section"));
  const formRef = useRef<HTMLFormElement | null>(null);
  const navigationRef = useRef<HTMLElement | null>(null);
  const [activeSection, setActiveSection] = useState<SaveSection>(() => requestedSection ?? "legal");

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) setActiveSection(requestedSection ?? "legal"); });
    return () => { active = false; };
  }, [requestedSection]);

  function selectSection(section: SaveSection) {
    setActiveSection(section);
    const params = new URLSearchParams(window.location.search);
    params.set("section", section);
    // Next copies its internal history state and updates useSearchParams.
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }
  const [form, setForm] = useState<SellerLegalInfoForm>(INITIAL_FORM);
  const [savedForm, setSavedForm] = useState<SellerLegalInfoForm>(INITIAL_FORM);
  const validation = useFieldValidation(form, validateForm);
  const { errors, setErrors } = validation;
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<SaveSection | null>(null);
  const savePendingRef = useRef(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const creatingProductRef = useRef(false);
  const notifications = useSellerNotificationChannels();
  const [cityOptions, setCityOptions] = useState<DeliveryCityOption[]>([]);
  const [cityOptionsOpen, setCityOptionsOpen] = useState(false);
  const [pointOptions, setPointOptions] = useState<CdekReceptionPoint[]>([]);
  const [pointOptionsOpen, setPointOptionsOpen] = useState(false);
  const [pointQuery, setPointQuery] = useState("");
  const [pointPickerOpen, setPointPickerOpen] = useState(false);
  const [pointLoadError, setPointLoadError] = useState<string | null>(null);
  const [pointRetry, setPointRetry] = useState(0);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLegalInfo() {
      setLoading(true);
      setError(null);

      try {
        const [info, profileName] = await Promise.all([
          getSellerLegalInfo(),
          getSellerProfileContactName().catch(() => ""),
        ]);

        if (!cancelled) {
          const nextForm = info
            ? mapLegalInfoToForm(info)
            : { ...INITIAL_FORM };

          if (!nextForm.contactName.trim()) {
            nextForm.contactName = profileName;
          }

          setForm(nextForm);
          setSavedForm(nextForm);
          setPointQuery(nextForm.shippingAddress || nextForm.cdekShipmentPoint);
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
    let active = true;

    if (query.length < 2 || form.shippingCityCode) {
      setCityOptions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchDeliveryCities(query)
        .then((cities) => {
          if (!active) return;
          setCityOptions(cities.slice(0, 8));
          setCityOptionsOpen(cities.length > 0);
        }).catch(() => {
          if (!active) return;
          setCityOptions([]);
          setCityOptionsOpen(false);
        });
    }, 250);

    return () => { active = false; window.clearTimeout(timeoutId); };
  }, [form.shippingCityName, form.shippingCityCode]);

  useEffect(() => {
    const cityCode = Number(form.shippingCityCode);
    const query = pointQuery.trim();
    let active = true;

    if (
      !Number.isFinite(cityCode) ||
      cityCode <= 0 ||
      Boolean(form.cdekShipmentPoint)
    ) {
      setPointOptions([]);
      setPointLoadError(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPointLoadError(null);
      void getCdekReceptionPoints(cityCode, query.length >= 2 ? query : undefined)
        .then((points) => {
          if (!active) return;
          setPointOptions(points);
          setPointOptionsOpen(points.length > 0 && !form.cdekShipmentPoint);
        }).catch((reason) => {
          if (!active) return;
          setPointOptions([]);
          setPointLoadError(reason instanceof Error ? reason.message : "Не удалось загрузить пункты приёма");
        });
    }, query.length >= 2 ? 250 : 0);

    return () => { active = false; window.clearTimeout(timeoutId); };
  }, [form.shippingCityCode, pointQuery, form.cdekShipmentPoint, pointRetry]);

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
  }

  const hasValidationErrors = Object.keys(errors).length > 0;
  const saving = savingSection !== null || creatingProduct;
  const legalChecklistComplete =
    isValidInn(form.inn, form.sellerType) &&
    isNonEmpty(form.legalName) &&
    (form.sellerType !== "IP" || isValidOgrnip(form.ogrnip)) &&
    (form.sellerType !== "OOO" ||
      (isNonEmpty(form.companyName) && isValidOgrn(form.ogrn)));
  const contactDetailsComplete =
    isNonEmpty(form.contactName) &&
    isValidPhone(form.phone);
  const shippingChecklistComplete =
    isNonEmpty(form.shippingCityName) &&
    Boolean(onlyDigits(form.shippingCityCode)) &&
    isNonEmpty(form.cdekShipmentPoint);
  const contactsChecklistComplete = contactDetailsComplete && shippingChecklistComplete;
  const bankChecklistComplete =
    isNonEmpty(form.bankName) &&
    isValidBik(form.bik) &&
    isValidBankAccount(form.checkingAccount, form.bik) &&
    (!isNonEmpty(form.correspondentAccount) ||
      isValidCorrespondentAccount(form.correspondentAccount, form.bik)) &&
    form.agreementAccepted;
  const checklistComplete =
    legalChecklistComplete &&
    contactsChecklistComplete &&
    bankChecklistComplete;

  const navigationItems = [
    { id: "legal", label: "Юридические данные", complete: legalChecklistComplete },
    { id: "contacts", label: "Контакты", complete: contactDetailsComplete },
    { id: "shipping", label: "Отправка", complete: shippingChecklistComplete },
    { id: "bank", label: "Банк и оферта", complete: bankChecklistComplete },
  ] as const;

  useEffect(() => {
    const nav = navigationRef.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !link) return;
    if (link.offsetLeft < nav.scrollLeft) nav.scrollLeft = link.offsetLeft;
    else if (link.offsetLeft + link.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = link.offsetLeft + link.offsetWidth - nav.clientWidth;
    }
  }, [activeSection]);

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

    if (!isNonEmpty(values.contactName)) {
      addError("contactName", "Укажите контактное лицо");
    }

    if (!isValidPhone(values.phone)) {
      addError("phone", "Укажите телефон");
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
    if (saving || savePendingRef.current) return;

    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const requestedSection =
      submitter instanceof HTMLButtonElement ? submitter.value : "bank";
    const nextSavingSection: SaveSection =
      requestedSection === "legal" ||
      requestedSection === "contacts" ||
      requestedSection === "shipping" ||
      requestedSection === "bank"
        ? requestedSection
        : "bank";

    const nextErrors = validation.validate();
    const notificationsValid =
      !notifications.dirty || notifications.validate();

    setError(null);

    if (Object.keys(nextErrors).length > 0 || !notificationsValid) {
      const firstField = Object.keys(nextErrors)[0] as keyof SellerLegalInfoForm | undefined;
      const invalidSection = firstField
        ? (Object.keys(SECTION_FIELDS) as SaveSection[]).find(section => SECTION_FIELDS[section].includes(firstField))
        : "contacts";
      if (invalidSection) selectSection(invalidSection);
      window.requestAnimationFrame(() => scrollToFirstValidationError({ root: formRef.current }));

      return;
    }

    if (notifications.busy) return;

    savePendingRef.current = true;
    setSavingSection(nextSavingSection);

    try {
      const saved = mapLegalInfoToForm(await saveSellerLegalInfo(form));
      setSavedForm(saved);
      setForm(current => {
        const next = { ...current };
        for (const field of Object.keys(form) as (keyof SellerLegalInfoForm)[]) {
          if (current[field] === form[field]) Object.assign(next, { [field]: saved[field] });
        }
        return next;
      });
      emitSellerOnboardingChanged();

      if (notifications.dirty) {
        try {
          const notificationsSaved = await notifications.savePreferences();
          if (!notificationsSaved) {
            toast.warning("Контакты сохранены, уведомления — нет", {
              id: "seller-legal-save",
              description: "Повторите загрузку в блоке уведомлений",
              action: undefined,
            });
            return;
          }
        } catch (reason) {
          toast.warning("Контакты сохранены, уведомления — нет", {
            id: "seller-legal-save",
            description: reason instanceof Error ? reason.message : "Не удалось сохранить настройки уведомлений",
            action: undefined,
          });
          return;
        }
      }

      toast.success(nextSavingSection === "contacts" ? "Контакты и уведомления сохранены" : "Реквизиты сохранены", {
        id: "seller-legal-save", description: "Теперь можно добавить товар и отправить карточку на модерацию",
        action: { label: "Создать товар", onClick: () => void createProductDraft() },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить реквизиты", {
        id: "seller-legal-save", description: undefined, action: undefined,
      });
    } finally {
      savePendingRef.current = false;
      setSavingSection(null);
    }
  }

  function requestContactSave() {
    const currentForm = formRef.current;
    const submitter = currentForm?.querySelector<HTMLButtonElement>(
      'button[name="saveSection"][value="contacts"]'
    );
    if (currentForm && submitter && !submitter.disabled) {
      currentForm.requestSubmit(submitter);
    }
  }

  async function createProductDraft() {
    if (creatingProductRef.current) return;

    creatingProductRef.current = true;
    setCreatingProduct(true);
    setError(null);
    toast.dismiss("seller-legal-save");

    try {
      const productId = await createSellerProductDraft();
      toast.dismiss("seller-legal-create");
      router.push(`/seller/products/${productId}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось создать товар", { id: "seller-legal-create" });
    } finally {
      creatingProductRef.current = false;
      setCreatingProduct(false);
    }
  }

  if (loading) {
    return <CabinetSkeleton variant="form" />;
  }

  return (
    <section className={styles.page}>
      <h1 className="visuallyHidden">Данные и документы</h1>
      <Banner tone={checklistComplete ? "success" : "info"}
        className={checklistComplete ? styles.completedBanner : undefined}
        title={checklistComplete ? "Всё заполнено" : "Перед заполнением"} titleAs="h2">
        {!checklistComplete ? <ul className={styles.incompleteList}>
          {navigationItems.filter(item => !item.complete).map(item =>
            <li key={item.id}>Заполните раздел «{item.label}»</li>
          )}
        </ul> : null}
      </Banner>
      <nav ref={navigationRef} className={styles.sectionNavigation} aria-label="Разделы данных и документов">
        {navigationItems.map(item => <button type="button" key={item.id}
          aria-controls={`seller-data-${item.id}`}
          aria-current={activeSection === item.id ? "location" : undefined}
          onClick={() => selectSection(item.id)}>
          <span>{item.label}</span>
          {item.complete ? <><Icon name="check" size={18} /><span className="visuallyHidden">Обязательные поля заполнены</span></> : null}
        </button>)}
      </nav>
      <form ref={formRef} className={styles.form} noValidate onSubmit={submit}>
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <section id="seller-data-legal" data-legal-section="legal" hidden={activeSection !== "legal"} tabIndex={-1} className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Юридическая информация</h2>
            <p>Данные владельца магазина и сведения для оформления документов.</p>
          </div>

          <div className={styles.typeGrid}>
            {(["IP", "OOO", "SELF_EMPLOYED"] as SellerType[]).map((type) => (
              <label
                key={type}
                className={`utilityAction ${styles.typeOption} ${
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
                <ChoiceMark
                  checked={form.sellerType === type}
                  appearance="outline-check"
                />
                <span>{formatSellerType(type)}</span>
              </label>
            ))}
          </div>

          <div className={styles.grid}>
            <LegalTextField
              label="ИНН"
              numeric
              numericMaxLength={form.sellerType === "OOO" ? 10 : 12}
              required
              valid={isValidInn(form.inn, form.sellerType)}
              suppressRequiredHighlight={hasValidationErrors}
              onBlur={() => validation.touch("inn")}
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
                valid={isValidOgrnip(form.ogrnip)}
                suppressRequiredHighlight={hasValidationErrors}
                onBlur={() => validation.touch("ogrnip")}
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
                  valid={isNonEmpty(form.companyName)}
                  suppressRequiredHighlight={hasValidationErrors}
                  onBlur={() => validation.touch("companyName")}
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
                  valid={isValidOgrn(form.ogrn)}
                  suppressRequiredHighlight={hasValidationErrors}
                  onBlur={() => validation.touch("ogrn")}
              value={form.ogrn}
                  error={errors.ogrn}
                  onChange={(event) => updateField("ogrn", event.target.value)}
                />
              </>
            ) : null}

            <LegalTextField
              label={form.sellerType === "OOO" ? "Юридическое название" : "ФИО"}
              required
              valid={isNonEmpty(form.legalName)}
              suppressRequiredHighlight={hasValidationErrors}
              onBlur={() => validation.touch("legalName")}
              value={form.legalName}
              error={errors.legalName}
              onChange={(event) => updateField("legalName", event.target.value)}
            />

          </div>

          <div className={styles.addressField}>
            <LegalTextarea
              label="Юридический адрес"
              valid={isNonEmpty(form.legalAddress)}
              value={form.legalAddress}
              onChange={(event) => updateField("legalAddress", event.target.value)}
            />
          </div>


        </section>

        <section id="seller-data-contacts" data-legal-section="contacts" hidden={activeSection !== "contacts"} tabIndex={-1} className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Контакты продавца</h2>
            <p>Контактное лицо, телефон и каналы уведомлений магазина.</p>
          </div>

          <div className={styles.contactsGrid}>
            <div className={styles.contactPhone}>
              <LegalTextField
                label="Контактное лицо"
                required
                autoComplete="name"
                valid={isNonEmpty(form.contactName)}
                suppressRequiredHighlight={hasValidationErrors}
                onBlur={() => validation.touch("contactName")}
              value={form.contactName}
                error={errors.contactName}
                onChange={(event) => updateField("contactName", event.target.value)}
              />
              <div className={styles.phoneField}>
                <PhoneInput
                  label="Телефон"
                  fieldVariant="boxed"
                  required
                  onBlur={() => validation.touch("phone")}
              value={form.phone}
                  error={errors.phone}
                  className={isValidPhone(form.phone) ? styles.inputValid : ""}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
                {isValidPhone(form.phone) && !errors.phone ? (
                  <FieldValidIcon />
                ) : null}
              </div>
              <p className={styles.contactHint}>
                Используем имя и телефон для связи по заказам и при оформлении отправлений.
              </p>
            </div>

            <SellerNotificationChannels
              controller={notifications}
              disabled={saving}
              onSubmitRequest={requestContactSave}
            />
          </div>


        </section>

        <section id="seller-data-shipping" data-legal-section="shipping" hidden={activeSection !== "shipping"} tabIndex={-1} className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Отправка заказов</h2>
            <p>Город и пункт, из которого товары передаются в доставку.</p>
          </div>

          <div className={styles.grid}>
            <div className={styles.suggestField}>
              <LegalTextField
                label="Город отправления"
                required
                valid={
                  isNonEmpty(form.shippingCityName) &&
                  Boolean(onlyDigits(form.shippingCityCode))
                }
                suppressRequiredHighlight={hasValidationErrors}
                onBlur={() => validation.touch("shippingCityName")}
              value={form.shippingCityName}
                error={errors.shippingCityName || errors.shippingCityCode}
                onFocus={() => setCityOptionsOpen(cityOptions.length > 0)}
                onChange={(event) => {
                  updateShippingCityInput(event.target.value);
                }}
                suggestions={cityOptionsOpen && cityOptions.length > 0 ? (
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
              />
            </div>

            <div className={styles.pointField}>
              <div className={styles.pointInputRow}>
                <div className={styles.suggestField}>
                  <LegalTextField
                    label="Пункт приема СДЭК"
                    required
                    valid={
                      isNonEmpty(pointQuery) &&
                      isNonEmpty(form.cdekShipmentPoint)
                    }
                    suppressRequiredHighlight={hasValidationErrors}
                    value={pointQuery}
                    error={errors.cdekShipmentPoint}
                    disabled={!form.shippingCityCode}
                    onFocus={() => setPointOptionsOpen(visiblePointOptions.length > 0)}
                    onChange={(event) => updateReceptionPointInput(event.target.value)}
                    suggestions={pointOptionsOpen && visiblePointOptions.length > 0 ? (
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
                  />
                </div>
                <div className={styles.pointMapAction}>
                  <Button type="button" variant="secondary" disabled={!form.shippingCityCode || savingSection !== null || creatingProduct}
                    aria-label="Выбрать пункт на карте" title="Выбрать пункт на карте"
                    aria-haspopup="dialog" aria-expanded={pointPickerOpen}
                    onClick={() => { setPointOptionsOpen(false); setCityOptionsOpen(false); setPointPickerOpen(true); }}>
                    <Icon name="pickup-point" size={18} className={styles.goldIcon} />
                  </Button>
                </div>
              </div>
              {!form.shippingCityCode ? <span className={styles.pointCityHint}>Сначала выберите город</span> : null}
              {pointLoadError ? <Banner tone="danger" actions={
                <Button type="button" variant="utility" onClick={() => setPointRetry(value => value + 1)}>Повторить</Button>
              }>{pointLoadError}</Banner> : null}
            </div>
          </div>


        </section>

        <section id="seller-data-bank" data-legal-section="bank" hidden={activeSection !== "bank"} tabIndex={-1} className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Банковские реквизиты</h2>
            <p>Счёт, на который будут перечисляться выплаты магазина.</p>
          </div>

          <div className={styles.grid}>
            <LegalTextField
              label="Банк"
              required
              valid={isNonEmpty(form.bankName)}
              suppressRequiredHighlight={hasValidationErrors}
              onBlur={() => validation.touch("bankName")}
              value={form.bankName}
              error={errors.bankName}
              onChange={(event) => updateField("bankName", event.target.value)}
            />

            <LegalTextField
              label="БИК"
              numeric
              numericMaxLength={9}
              required
              valid={isValidBik(form.bik)}
              suppressRequiredHighlight={hasValidationErrors}
              onBlur={() => validation.touch("bik")}
              value={form.bik}
              error={errors.bik}
              onChange={(event) => updateField("bik", event.target.value)}
            />

            <LegalTextField
              label="Расчетный счет"
              numeric
              numericMaxLength={20}
              required
              valid={isValidBankAccount(form.checkingAccount, form.bik)}
              suppressRequiredHighlight={hasValidationErrors}
              onBlur={() => validation.touch("checkingAccount")}
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
              valid={
                isNonEmpty(form.correspondentAccount) &&
                isValidCorrespondentAccount(form.correspondentAccount, form.bik)
              }
              onBlur={() => validation.touch("correspondentAccount")}
              value={form.correspondentAccount}
              error={errors.correspondentAccount}
              onChange={(event) =>
                updateField("correspondentAccount", event.target.value)
              }
            />
          </div>

          <div className={`${styles.plainSection} ${styles.agreementRow}`}>
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
              <ChoiceMark
                checked={form.agreementAccepted}
                appearance="outline-check"
              />
              <span className={styles.checkboxText}>
                Я принимаю{" "}
                <Link href="/terms/seller" target="_blank">
                  оферту продавца
                </Link>
              </span>
            </label>
          </div>


        </section>
        <SectionSaveAction section={activeSection} savingSection={savingSection}
          busy={creatingProduct || notifications.busy}
          dirty={Object.keys(form).some(field => form[field as keyof SellerLegalInfoForm] !== savedForm[field as keyof SellerLegalInfoForm]) || notifications.dirty}
          onCancel={() => {
            setForm(savedForm);
            validation.reset();
            notifications.reset();
            {
              setPointQuery(savedForm.shippingAddress || savedForm.cdekShipmentPoint);
              setCityOptionsOpen(false);
              setPointOptionsOpen(false);
            }
          }} />
      </form>

      {pointPickerOpen && form.shippingCityCode ? <SellerReceptionPointPicker
        cityCode={Number(form.shippingCityCode)} cityName={form.shippingCityName} currentId={form.cdekShipmentPoint}
        onClose={() => setPointPickerOpen(false)} onConfirm={point => { selectReceptionPoint(point); setPointPickerOpen(false); }} /> : null}
    </section>
  );
}

function SectionSaveAction({
  section,
  savingSection,
  busy = false,
  dirty,
  onCancel,
}: {
  section: SaveSection;
  savingSection: SaveSection | null;
  busy?: boolean;
  dirty: boolean;
  onCancel: () => void;
}) {
  return (
    <div className={styles.sectionActions}>
      <Button type="button" variant="secondary" disabled={!dirty || savingSection !== null || busy} onClick={onCancel}>Отменить</Button>
      <Button
        type="submit"
        name="saveSection"
        value={section}
        variant="primary"
        disabled={!dirty || savingSection !== null || busy}
        loading={savingSection === section}
      >
        Сохранить
      </Button>
    </div>
  );
}

type LegalFieldProps = {
  label: string;
  required?: boolean;
  suppressRequiredHighlight?: boolean;
  error?: string;
  numeric?: boolean;
  numericMaxLength?: number;
  valid?: boolean;
};

function LegalTextField({
  label,
  required,
  suppressRequiredHighlight,
  error,
  numeric,
  numericMaxLength,
  valid,
  suggestions,
  className = "",
  onChange,
  ...props
}: LegalFieldProps & InputHTMLAttributes<HTMLInputElement> & { suggestions?: ReactNode }) {
  const errorId = useId();
  const generatedInputId = useId();
  const inputId = props.id ?? generatedInputId;
  const hasSuggestions = suggestions !== undefined;
  const Field = hasSuggestions ? "div" : "label";
  const Label = hasSuggestions ? "label" : "span";
  const requiredEmpty =
    required && !suppressRequiredHighlight && !String(props.value ?? "").trim();

  const input = (
    <InputControl
      {...props}
      id={inputId}
      className={`${styles.input} ${valid ? styles.inputValid : ""} ${
        requiredEmpty ? styles.requiredEmpty : ""
      } ${
        error ? styles.inputError : ""
      } ${className}`.trim()}
      inputMode={numeric ? "numeric" : props.inputMode}
      pattern={numeric ? "[0-9]*" : props.pattern}
      aria-invalid={error ? "true" : undefined}
      aria-required={required || undefined}
      aria-describedby={[props["aria-describedby"], error ? errorId : null].filter(Boolean).join(" ") || undefined}
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
        // Use the native setter so React observes the input event rather than
        // treating the trimmed paste as an already tracked value.
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, nextValue);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        const caret = selectionStart + pastedText.length;
        if (input.selectionStart !== null) input.setSelectionRange(caret, caret);
      }}
      onChange={(event) => {
        if (numeric) {
          event.target.value = onlyDigits(event.target.value, numericMaxLength);
        }

        onChange?.(event);
      }}
    />
  );
  const validIcon = valid && !error ? <FieldValidIcon /> : null;

  return (
    <Field className={styles.fieldWrap} data-ui="field">
      <Label htmlFor={hasSuggestions ? inputId : undefined}
        className={`${styles.fieldLabel} ${required ? styles.required : ""}`}>
        {label}
      </Label>
      {hasSuggestions ? (
        <div className={styles.suggestControl} data-ui="field">
          {input}
          {validIcon}
          {suggestions}
        </div>
      ) : <>{input}{validIcon}</>}
      {error && <span id={errorId} className="fieldError">{error}</span>}
    </Field>
  );
}

function LegalTextarea({
  label,
  required,
  error,
  valid,
  className = "",
  ...props
}: LegalFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const errorId = useId();
  return (
    <label className={styles.fieldWrap} data-ui="field">
      <span className={`${styles.fieldLabel} ${required ? styles.required : ""}`}>
        {label}
      </span>
      <textarea
        className={`${styles.textarea} ${valid ? styles.inputValid : ""} ${
          error ? styles.inputError : ""
        } ${className}`.trim()}
        aria-invalid={error ? "true" : undefined}
        {...props}
        aria-required={required || undefined}
        aria-describedby={[props["aria-describedby"], error ? errorId : null].filter(Boolean).join(" ") || undefined}
      />
      {valid && !error ? <FieldValidIcon /> : null}
      {error && <span id={errorId} className="fieldError">{error}</span>}
    </label>
  );
}

function FieldValidIcon() {
  return (
    <Icon
      name="check-circle"
      className={styles.fieldValidIcon}
    />
  );
}
