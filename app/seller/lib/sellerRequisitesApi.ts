import { apiFetch, API_URL } from "../../lib/api";
import type { SellerType } from "./sellerLegalApi";

export type PartyRequisites = {
  sellerType: "IP" | "OOO";
  inn: string;
  ogrn: string | null;
  ogrnip: string | null;
  companyName: string | null;
  legalName: string;
  legalAddress: string | null;
  registrationCity: string | null;
};
export type BankRequisites = { bik: string; bankName: string; correspondentAccount: string };

const unavailable = "Автозаполнение временно недоступно — заполните данные вручную или попробуйте позже";

export async function sellerRequisitesAvailable(): Promise<boolean> {
  try {
    const response = await apiFetch(`${API_URL}/api/seller/legal-info/lookup/availability`, {
      cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const data: unknown = await response.json();
    return isRecord(data) && data.available === true;
  } catch { return false; }
}

async function lookup(kind: "party" | "bank", body: object): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await apiFetch(`${API_URL}/api/seller/legal-info/lookup/${kind}`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(12000), body: JSON.stringify(body),
    });
  } catch { throw new Error(unavailable); }
  if (!response.ok) {
    // Provider and proxy errors are never rendered as UI text.
    const messages: Record<number, string> = {
      400: kind === "party" ? "Проверьте ИНН и тип продавца" : "Проверьте БИК — нужно 9 цифр",
      401: "Войдите в аккаунт ещё раз, чтобы заполнить реквизиты",
      403: "Нет доступа к автозаполнению — обновите страницу или войдите ещё раз",
      404: "Данные не найдены — проверьте номер или заполните вручную",
      422: kind === "party" ? "Проверьте тип продавца и статус организации или ИП — данные не подходят для автозаполнения"
        : "Банк не действует — проверьте БИК",
      429: "Слишком много запросов — подождите минуту или заполните данные вручную",
    };
    throw new Error(messages[response.status] ?? unavailable);
  }
  let data: unknown;
  try { data = await response.json(); } catch { throw new Error(unavailable); }
  if (!isRecord(data)) throw new Error(unavailable);
  return data;
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
function text(value: unknown, max = 255): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}
function optionalText(value: unknown, max = 255): value is string | null {
  return value === null || text(value, max);
}

export async function lookupParty(inn: string, sellerType: SellerType): Promise<PartyRequisites> {
  const data = await lookup("party", { inn, sellerType });
  if (data.inn !== inn || data.sellerType !== sellerType || (sellerType !== "IP" && sellerType !== "OOO")
    || !text(data.legalName) || !optionalText(data.legalAddress, 1000) || !optionalText(data.registrationCity, 1000)
    || !optionalText(data.companyName) || !optionalText(data.ogrn, 13) || !optionalText(data.ogrnip, 15)
    || (sellerType === "IP" ? !/^[0-9]{15}$/.test(String(data.ogrnip))
      : !/^[0-9]{13}$/.test(String(data.ogrn)) || !text(data.companyName))) throw new Error(unavailable);
  return data as PartyRequisites;
}

export async function lookupBank(bik: string): Promise<BankRequisites> {
  const data = await lookup("bank", { bik });
  if (data.bik !== bik || !text(data.bankName) || !/^[0-9]{20}$/.test(String(data.correspondentAccount))) {
    throw new Error(unavailable);
  }
  return data as BankRequisites;
}
