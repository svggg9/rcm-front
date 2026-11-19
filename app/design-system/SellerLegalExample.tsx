"use client";

import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import { PhoneInput } from "../components/ui/PhoneInput";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { LegalTextField, LegalTextarea } from "../seller/components/SellerLegalTab";
import { SellerLegalReviewNotice, SellerLegalValues } from "../seller/components/SellerLegalReview";
import { SellerReceptionPointPicker } from "../seller/components/SellerReceptionPointPicker";
import type { SellerLegalInfoForm, CdekReceptionPoint } from "../seller/lib/sellerLegalApi";
import type { SellerLegalReview } from "../seller/lib/sellerLegalReviewApi";
import styles from "./SellerLegalExample.module.css";

type Section = "legal" | "contacts" | "shipping" | "bank";
type State = "editing" | "errors" | "readonly" | "verified" | "pending" | "failure";
type PickupState = "ready" | "empty" | "error";
const sections: { value: Section; label: string }[] = [
  { value: "legal", label: "Юридические данные" }, { value: "contacts", label: "Контакты" },
  { value: "shipping", label: "Доставка" }, { value: "bank", label: "Банк и оферта" },
];
const states: { value: State; label: string }[] = [
  { value: "editing", label: "Редактирование" }, { value: "errors", label: "Ошибки" },
  { value: "readonly", label: "Просмотр" }, { value: "verified", label: "Подтверждено" },
  { value: "pending", label: "Запрос" }, { value: "failure", label: "Ошибка статуса" },
];
const pickupStates: { value: PickupState; label: string }[] = [
  { value: "ready", label: "Пункты" }, { value: "empty", label: "Нет пунктов" }, { value: "error", label: "Ошибка" },
];
const points: CdekReceptionPoint[] = [
  { id: "DEMO-1", name: "Демонстрационный пункт", type: "PVZ", fullAddress: "Москва, Примерная улица, 1", instruction: "Пункт для примера", cityCode: 44, latitude: null, longitude: null },
  { id: "DEMO-2", name: "Другой пункт", type: "PVZ", fullAddress: "Москва, Примерная улица, 2", instruction: null, cityCode: 44, latitude: null, longitude: null },
];
const loaders: Record<PickupState, (cityCode: number) => Promise<CdekReceptionPoint[]>> = {
  ready: async () => points,
  empty: async () => [],
  error: async () => { throw new Error("Не удалось загрузить пункты приёма"); },
};
const initial: SellerLegalInfoForm = {
  sellerType: "IP", inn: "", ogrn: "", ogrnip: "", companyName: "", legalName: "",
  contactName: "", phone: "", legalAddress: "", shippingCountryCode: "RU", shippingCityCode: "",
  shippingCityName: "", shippingAddress: "", cdekShipmentPoint: "", bankName: "", bik: "",
  checkingAccount: "", correspondentAccount: "", agreementAccepted: false,
};
const pending: SellerLegalReview = { verified: true, verifiedAt: "2026-11-07T12:00:00Z", changeRequest: {
  id: 101, changes: "Изменить реквизиты", reason: "Демонстрационный запрос", createdAt: "2026-11-08T12:00:00Z", reopenedAt: null, resolution: null,
} };

export function SellerLegalExample() {
  const [section, setSection] = useState<Section>("legal");
  const [state, setState] = useState<State>("editing");
  const [pickupState, setPickupState] = useState<PickupState>("ready");
  const [form, setForm] = useState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const readOnly = state === "readonly" || state === "verified" || state === "pending" || state === "failure";
  const review: SellerLegalReview = state === "pending" ? pending : { verified: state === "verified", verifiedAt: state === "verified" ? "2026-11-07T12:00:00Z" : null, changeRequest: null };
  const errors = state === "errors";
  function update(key: keyof SellerLegalInfoForm, value: string) { setForm(current => ({ ...current, [key]: value })); }
  return <div className={styles.example}>
    <p>Рабочие поля, статус проверки и значения реквизитов показаны на условных данных. Этот пример не сохраняет данные</p>
    <SegmentedControl items={states} value={state} onChange={setState} ariaLabel="Состояние реквизитов в примере" />
    <SegmentedControl items={sections} value={section} onChange={setSection} ariaLabel="Раздел реквизитов в примере" />
    {(section === "legal" || section === "bank") && <SellerLegalReviewNotice review={review} error={state === "failure" ? "Не удалось загрузить статус реквизитов" : null}
      loading={false} onRefresh={() => setState("readonly")} onRequest={() => setNotice("Запрос на изменение показан для примера")} />}
    {readOnly ? <SellerLegalValues form={form} section={section} /> : <div className={styles.fields}>
      {section === "legal" && <>
        <SegmentedControl items={[{ value: "IP", label: "ИП" }, { value: "OOO", label: "ООО" }, { value: "SELF_EMPLOYED", label: "Самозанятый" }]} value={form.sellerType}
          onChange={value => setForm(current => ({ ...current, sellerType: value }))} ariaLabel="Тип продавца в примере" />
        <LegalTextField label="ИНН" numeric numericMaxLength={form.sellerType === "OOO" ? 10 : 12} required value={form.inn} error={errors ? "Укажите ИНН" : undefined} onChange={event => update("inn", event.target.value)} />
        {form.sellerType === "IP" && <LegalTextField label="ОГРНИП" numeric numericMaxLength={15} required value={form.ogrnip} error={errors ? "Укажите ОГРНИП" : undefined} onChange={event => update("ogrnip", event.target.value)} />}
        {form.sellerType === "OOO" && <>
          <LegalTextField label="Название компании" required value={form.companyName} error={errors ? "Укажите название компании" : undefined} onChange={event => update("companyName", event.target.value)} />
          <LegalTextField label="ОГРН" numeric numericMaxLength={13} required value={form.ogrn} error={errors ? "Укажите ОГРН" : undefined} onChange={event => update("ogrn", event.target.value)} />
        </>}
        <LegalTextField label={form.sellerType === "OOO" ? "Юридическое название" : "ФИО"} required value={form.legalName} error={errors ? "Укажите название" : undefined} onChange={event => update("legalName", event.target.value)} />
        <LegalTextarea label="Юридический адрес" value={form.legalAddress} onChange={event => update("legalAddress", event.target.value)} />
      </>}
      {section === "contacts" && <>
        <LegalTextField label="Контактное лицо" required value={form.contactName} error={errors ? "Укажите контактное лицо" : undefined} onChange={event => update("contactName", event.target.value)} />
        <PhoneInput label="Телефон" fieldVariant="boxed" required value={form.phone} error={errors ? "Укажите телефон" : undefined} onChange={event => update("phone", event.target.value)} />
      </>}
      {section === "shipping" && <>
        <LegalTextField label="Город отправления" required value={form.shippingCityName} error={errors ? "Выберите город" : undefined} onChange={event => update("shippingCityName", event.target.value)} />
        <LegalTextField label="Пункт приема СДЭК" required disabled={!form.shippingCityName} value={form.shippingAddress} error={errors ? "Выберите пункт приёма" : undefined} onChange={event => update("shippingAddress", event.target.value)} />
        <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>Выбрать пункт СДЭК — пример</Button>
        <SegmentedControl items={pickupStates} value={pickupState} onChange={setPickupState} ariaLabel="Состояние пунктов СДЭК в примере" />
      </>}
      {section === "bank" && <>
        <LegalTextField label="БИК" numeric numericMaxLength={9} required value={form.bik} error={errors ? "Укажите БИК" : undefined} onChange={event => update("bik", event.target.value)} />
        <LegalTextField label="Банк" required value={form.bankName} error={errors ? "Укажите банк" : undefined} onChange={event => update("bankName", event.target.value)} />
        <LegalTextField label="Расчетный счет" numeric numericMaxLength={20} required value={form.checkingAccount} error={errors ? "Укажите расчётный счёт" : undefined} onChange={event => update("checkingAccount", event.target.value)} />
        <LegalTextField label="Корреспондентский счет" numeric numericMaxLength={20} value={form.correspondentAccount} onChange={event => update("correspondentAccount", event.target.value)} />
        <label className={styles.agreement}><Checkbox checked={form.agreementAccepted} onChange={event => setForm(current => ({ ...current, agreementAccepted: event.target.checked }))} />Принять оферту — пример</label>
      </>}
    </div>}
    {pickerOpen && <SellerReceptionPointPicker cityCode={44} cityName="Москва — пример" currentId={form.cdekShipmentPoint}
      loadPoints={loaders[pickupState]} onClose={() => setPickerOpen(false)} onConfirm={point => {
        setForm(current => ({ ...current, shippingCityName: "Москва — пример", shippingCityCode: "44", cdekShipmentPoint: point.id, shippingAddress: point.fullAddress || "" })); setPickerOpen(false);
      }} />}
    <p className={styles.note} role="status">{notice}</p>
  </div>;
}
