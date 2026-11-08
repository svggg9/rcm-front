"use client";

import { useState } from "react";
import { Button } from "../components/ui/Button";
import { DesignSystemIcon } from "../components/ui/DesignSystemIcon";
import { NumericField } from "../components/ui/NumericField";
import { PhoneInput } from "../components/ui/PhoneInput";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { TextInput } from "../components/ui/TextInput";
import { Textarea } from "../components/ui/Textarea";
import { INTEGER_RULES, WEIGHT_RULES } from "../lib/numericInput";
import { isValidPhone } from "../lib/validation";
import styles from "./DesignSystem.module.css";

function InlineFieldExample() {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [name, setName] = useState("Алексей");
  return <div className={styles.fieldExampleGroup}>
    <h3>Поле в профиле</h3>
    <SegmentedControl ariaLabel="Режим поля в профиле" value={mode} onChange={setMode}
      items={[{ value: "view", label: "Просмотр" }, { value: "edit", label: "Редактирование" }]} />
    <TextInput label="Имя в профиле" fieldVariant="inline" value={name} readOnly={mode === "view"}
      onChange={event => setName(event.target.value)} autoComplete="off" />
    <p className={styles.note}>В режиме просмотра значение можно выделить и скопировать, редактирование включается отдельно</p>
  </div>;
}

function NumericFormExample() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  return <form className={styles.fieldExampleGroup} onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitted(String(data.get("demoPrice") ?? ""));
  }}>
    <NumericField label="Цена, ₽" name="demoPrice" defaultValue={1290.5} autoComplete="off"
      hint="В поле — запятая, при отправке формы — точка" />
    <div className={styles.actions}><Button type="submit" size="compact">Показать значение формы</Button></div>
    <p className={styles.note} role="status">{submitted === null ? "Данные никуда не отправляются" : `Значение формы: ${submitted || "не заполнено"}`}</p>
  </form>;
}

export function FieldExamples() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [password, setPassword] = useState("Пример пароля");
  const [phone, setPhone] = useState("");
  const [invalidPhone, setInvalidPhone] = useState("7900123");

  return <div className={styles.fieldExamples}>
    <div className={styles.fieldExampleGroup}>
      <h3>Текстовые поля</h3>
      <div className={styles.formGrid}>
        <TextInput label="Название бренда" autoComplete="off" />
        <TextInput label="Заполненное поле" defaultValue="Мой первый бренд" autoComplete="off" />
        <TextInput label="Почтовый индекс" placeholder="Например, 990022" inputMode="numeric" maxLength={6} autoComplete="off" />
        <TextInput label="Обязательное поле" required hint="Это название появится в каталоге и результатах поиска, поэтому укажите его так, чтобы покупатель легко нашёл нужный товар" />
        <TextInput label="Поле с ошибкой" type="email" defaultValue="brand@" error="Проверьте адрес электронной почты" />
        <TextInput label="Недоступное поле" defaultValue="На проверке" disabled />
        <TextInput label="Поле только для чтения" defaultValue="Подтверждённое значение" readOnly />
        <Textarea label="Описание с ошибкой" rows={3} defaultValue="Коротко" error="Напишите не меньше 10 символов" hint="Расскажите о важных особенностях товара" />
      </div>
    </div>

    <div className={styles.fieldExampleGroup}>
      <h3>Размеры и действие внутри поля</h3>
      <div className={styles.formGrid}>
        <TextInput label="Обычное поле · 44 px" defaultValue="Обычный размер" />
        <TextInput label="Крупное поле · 48 px" size="large" defaultValue="Крупный размер" />
        <TextInput label="Пароль для примера" type={passwordVisible ? "text" : "password"} value={password}
          autoComplete="new-password" onChange={event => setPassword(event.target.value)}
          trailing={<Button type="button" variant="ghost" iconOnly aria-label={passwordVisible ? "Скрыть пароль примера" : "Показать пароль примера"}
            aria-pressed={passwordVisible} onClick={() => setPasswordVisible(value => !value)}>
            <DesignSystemIcon name={passwordVisible ? "eye-off" : "eye"} role="utility" />
          </Button>} />
        <InlineFieldExample />
      </div>
      <p className={styles.note}>Высота задаётся общим размером поля, положение иконки не зависит от подписи или длины ошибки</p>
    </div>

    <div className={styles.fieldExampleGroup}>
      <h3>Телефон</h3>
      <div className={styles.formGrid}>
        <PhoneInput label="Телефон для связи" value={phone} required hint="Для уведомлений о заказе" autoComplete="off"
          onChange={event => setPhone(event.target.value)} />
        <PhoneInput label="Телефон с ошибкой" value={invalidPhone} autoComplete="off"
          error={isValidPhone(invalidPhone) ? undefined : "Введите номер телефона полностью"}
          onChange={event => setInvalidPhone(event.target.value)} />
        <PhoneInput label="Недоступный телефон" value="79000000000" disabled onChange={() => {}} />
        <PhoneInput label="Телефон только для чтения" value="79000000000" readOnly onChange={() => {}} />
      </div>
      <p className={styles.note}>Префикс +7 и форматирование общие для всех экранов, обязательность относится к самому полю ввода</p>
    </div>

    <div className={styles.fieldExampleGroup}>
      <h3>Числа и ограничения</h3>
      <div className={styles.formGrid}>
        <NumericField label="Количество от 1 до 10" {...INTEGER_RULES} min={1} max={10} defaultValue={2}
          hint="Введите 11 и покиньте поле, чтобы проверить пояснение ошибки" />
        <NumericField label="Вес, кг" {...WEIGHT_RULES} defaultValue={1}
          hint="Минимальное значение — 0,001 кг" />
        <NumericField label="Недоступное числовое поле" defaultValue={5} disabled {...INTEGER_RULES} />
        <NumericField label="Число только для чтения" defaultValue={500} readOnly {...INTEGER_RULES} />
        <NumericFormExample />
      </div>
      <p className={styles.note}>Числовое поле принимает запятую и точку, после выхода показывает запятую. Ошибка диапазона поясняется под полем</p>
    </div>
  </div>;
}
