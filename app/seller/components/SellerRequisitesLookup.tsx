"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import type { SellerLegalInfoForm } from "../lib/sellerLegalApi";
import { lookupBank, lookupParty, sellerRequisitesAvailable } from "../lib/sellerRequisitesApi";
import styles from "./SellerRequisitesLookup.module.css";

export function useSellerRequisitesAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    void sellerRequisitesAvailable().then(value => { if (active) setAvailable(value); });
    return () => { active = false; };
  }, []);
  return available;
}

type Preview = {
  key: string;
  patch: Partial<SellerLegalInfoForm>;
  rows: [string, string][];
  note?: string;
};

export function SellerRequisitesLookup({ kind, form, disabled, onApply }: {
  kind: "party" | "bank";
  form: SellerLegalInfoForm;
  disabled: boolean;
  onApply: (patch: Partial<SellerLegalInfoForm>) => void;
}) {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const party = kind === "party";
  const key = party ? `${form.sellerType}:${form.inn}` : form.bik;
  const valid = party ? form.sellerType !== "SELF_EMPLOYED"
    && new RegExp(`^[0-9]{${form.sellerType === "OOO" ? 10 : 12}}$`).test(form.inn) : /^[0-9]{9}$/.test(form.bik);
  const currentPreview = preview?.key === key ? preview : null;

  async function search() {
    if (pendingRef.current || !valid || disabled) return;
    pendingRef.current = true;
    setPending(true);
    setFailure(null);
    setPreview(null);
    try {
      if (party) {
        const data = await lookupParty(form.inn, form.sellerType);
        const patch: Partial<SellerLegalInfoForm> = { legalName: data.legalName };
        const rows: [string, string][] = [["ИНН", data.inn], [data.sellerType === "OOO" ? "Юридическое название" : "ФИО", data.legalName]];
        if (data.sellerType === "OOO") {
          patch.ogrn = data.ogrn!;
          patch.companyName = data.companyName!;
          rows.push(["Название компании", data.companyName!], ["ОГРН", data.ogrn!]);
          if (data.legalAddress) { patch.legalAddress = data.legalAddress; rows.push(["Юридический адрес", data.legalAddress]); }
        } else {
          patch.ogrnip = data.ogrnip!;
          rows.push(["ОГРНИП", data.ogrnip!]);
          if (data.registrationCity) rows.push(["Город регистрации", data.registrationCity]);
        }
        setPreview({ key, patch, rows, note: data.sellerType === "IP"
          ? "В реестре доступен только город регистрации ИП — полный адрес укажите вручную"
          : !data.legalAddress ? "Юридический адрес не найден — укажите его вручную" : undefined });
      } else {
        const data = await lookupBank(form.bik);
        setPreview({ key, patch: { bankName: data.bankName, correspondentAccount: data.correspondentAccount },
          rows: [["БИК", data.bik], ["Банк", data.bankName], ["Корреспондентский счёт", data.correspondentAccount]],
          note: "Расчётный счёт укажите вручную — он останется без изменений" });
      }
    } catch (error) {
      setFailure({ key, message: error instanceof Error ? error.message : "Не удалось найти данные — заполните их вручную" });
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  if (party && form.sellerType === "SELF_EMPLOYED") return null;

  return <div className={styles.lookup}>
    <div className={styles.action}>
      <Button type="button" loading={pending} disabled={!valid || disabled} onClick={() => void search()}>
        {party ? "Заполнить по ИНН" : "Заполнить по БИК"}
      </Button>
      <p>{party ? "Введите ИНН, чтобы найти реквизиты ООО или ИП" : "Введите БИК, чтобы найти банк и корреспондентский счёт"}</p>
    </div>
    {failure?.key === key ? <p className={styles.error} role="alert">{failure.message}</p> : null}
    {currentPreview ? <Dialog title={party ? "Найденные реквизиты" : "Найденный банк"}
      onClose={() => setPreview(null)} actions={<>
        <Button type="button" variant="ghost" onClick={() => setPreview(null)}>Отмена</Button>
        <Button type="button" disabled={disabled} onClick={() => {
          if (preview?.key !== key || disabled) return;
          onApply(preview.patch);
          setPreview(null);
        }}>Применить к форме</Button>
      </>}>
      <p>Проверьте данные из реестра. При применении они заменят соответствующие поля формы; сохраните изменения после проверки.</p>
      <dl className={styles.details}>{currentPreview.rows.map(([label, value]) => <div key={label}>
        <dt>{label}</dt><dd>{value}</dd>
      </div>)}</dl>
      {currentPreview.note ? <p className={styles.note}>{currentPreview.note}</p> : null}
      <p className={styles.source}>Источник: <a href="https://dadata.ru" target="_blank" rel="noopener noreferrer">DaData</a></p>
    </Dialog> : null}
  </div>;
}
