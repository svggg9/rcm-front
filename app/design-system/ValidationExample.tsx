"use client";

import { useRef, useState } from "react";
import { TextInput } from "../components/ui/TextInput";
import { Textarea } from "../components/ui/Textarea";
import { Button } from "../components/ui/Button";
import { useFieldValidation } from "../lib/useFieldValidation";
import { isValidEmail } from "../lib/validation";
import { scrollToFirstValidationError } from "../lib/formValidation";
import styles from "./ValidationExample.module.css";

export function ValidationExample() {
  const [values, setValues] = useState({ email: "", message: "" });
  const [saved, setSaved] = useState(false);
  const root = useRef<HTMLFormElement>(null);
  const validation = useFieldValidation(values, draft => ({
    ...(!isValidEmail(draft.email) ? { email: "Проверьте электронную почту" } : {}),
    ...(draft.message.trim().length < 10 ? { message: "Напишите не меньше 10 символов" } : {}),
  }));
  function change(key: keyof typeof values, value: string) {
    setValues(current => ({ ...current, [key]: value })); validation.changed(key); setSaved(false);
  }
  return <form id="field-validation" className={styles.form} ref={root} noValidate onSubmit={event => {
    event.preventDefault();
    if (Object.keys(validation.validate()).length) { setSaved(false); scrollToFirstValidationError({ root: root.current }); }
    else setSaved(true);
  }}>
    <h3>Проверка ошибок формы</h3>
    <p>Демонстрация без отправки данных</p>
    <TextInput label="Почта для проверки" name="validationEmail" type="email" required value={values.email}
      error={validation.errors.email} onBlur={() => validation.touch("email")} onChange={event => change("email", event.target.value)} />
    <Textarea label="Сообщение для проверки" name="validationMessage" required minLength={10} value={values.message}
      error={validation.errors.message} onBlur={() => validation.touch("message")} onChange={event => change("message", event.target.value)} />
    <Button type="submit">Проверить форму</Button>
    {saved && <p role="status">Ошибок нет</p>}
  </form>;
}
