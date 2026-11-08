"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
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

export function SellerRequisitesLookup({ kind, form, available, disabled, onApply, children }: {
  kind: "party" | "bank";
  form: SellerLegalInfoForm;
  available: boolean;
  disabled: boolean;
  onApply: (patch: Partial<SellerLegalInfoForm>, source: SellerLegalInfoForm) => void;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [success, setSuccess] = useState<{ key: string; note?: string } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const party = kind === "party";
  const key = party ? `${form.sellerType}:${form.inn}` : form.bik;
  const valid = party ? form.sellerType !== "SELF_EMPLOYED"
    && new RegExp(`^[0-9]{${form.sellerType === "OOO" ? 10 : 12}}$`).test(form.inn) : /^[0-9]{9}$/.test(form.bik);
  const activeKey = useRef<string | null>(null);
  useEffect(() => {
    activeKey.current = available && !disabled ? key : null;
    return () => { activeKey.current = null; };
  }, [key, available, disabled]);

  async function search() {
    if (pendingRef.current || !valid || disabled || !available) return;
    pendingRef.current = true;
    setPending(true);
    setFailure(null);
    setSuccess(null);
    try {
      if (party) {
        const data = await lookupParty(form.inn, form.sellerType);
        const patch: Partial<SellerLegalInfoForm> = { legalName: data.legalName };
        if (data.sellerType === "OOO") {
          patch.ogrn = data.ogrn!;
          patch.companyName = data.companyName!;
          if (data.legalAddress) patch.legalAddress = data.legalAddress;
        } else {
          patch.ogrnip = data.ogrnip!;
        }
        if (activeKey.current !== key) return;
        onApply(patch, form);
        setSuccess({ key, note: data.sellerType === "IP"
          ? "В реестре доступен только город регистрации ИП — полный адрес укажите вручную"
          : !data.legalAddress ? "Юридический адрес не найден — укажите его вручную" : undefined });
      } else {
        const data = await lookupBank(form.bik);
        if (activeKey.current !== key) return;
        onApply({ bankName: data.bankName, correspondentAccount: data.correspondentAccount }, form);
        setSuccess({ key,
          note: "Расчётный счёт укажите вручную — он останется без изменений" });
      }
    } catch (error) {
      if (activeKey.current === key) setFailure({ key, message: error instanceof Error ? error.message : "Не удалось найти данные — заполните их вручную" });
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  if (!available || (party && form.sellerType === "SELF_EMPLOYED")) {
    return <div className={styles.lookup}>{children}</div>;
  }

  return <div className={styles.lookup}>
    <div className={styles.row}>
      {children}
      <Button className={styles.actionButton} type="button" loading={pending} reserveLabelSpace={false}
        aria-label={party ? "Заполнить по ИНН" : "Заполнить по БИК"}
        disabled={!valid || disabled} onClick={() => void search()}>
        {party ? "Заполнить по ИНН" : "Заполнить по БИК"}
      </Button>
    </div>
    {failure?.key === key ? <p className={styles.error} role="alert">{failure.message}</p> : null}
    {success?.key === key ? <div className={styles.result} role="status">
      <p>Данные из <a href="https://dadata.ru" target="_blank" rel="noopener noreferrer">DaData</a> заполнены — проверьте и сохраните</p>
      {success.note ? <p>{success.note}</p> : null}
    </div> : null}
  </div>;
}
