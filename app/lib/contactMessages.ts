import { API_URL, apiFetch } from "./api";

export type ContactTopic = "ORDER" | "PAYMENT" | "RETURN" | "ACCOUNT" | "TECHNICAL" | "SELLER" | "OTHER";

export const CONTACT_TOPIC_OPTIONS: { value: ContactTopic; label: string }[] = [
  { value: "ORDER", label: "Заказ и доставка" },
  { value: "PAYMENT", label: "Оплата" },
  { value: "RETURN", label: "Возврат товара или денег" },
  { value: "ACCOUNT", label: "Аккаунт и вход" },
  { value: "TECHNICAL", label: "Ошибка на сайте" },
  { value: "SELLER", label: "Продажи и сотрудничество" },
  { value: "OTHER", label: "Другой вопрос" },
];

export type ContactMessageRequest = {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  orderNumber?: string;
  privacyAccepted: boolean;
  website?: string;
};

export type ContactMessageReceipt = {
  id: number;
  createdAt: string;
};

export type ContactProfileDefaults = Pick<ContactMessageRequest, "name" | "email">;

export async function getContactProfileDefaults(
  userId: number,
  signal: AbortSignal,
): Promise<ContactProfileDefaults> {
  const empty = { name: "", email: "" };
  const response = await apiFetch(`${API_URL}/api/profile`, { signal });
  if (!response.ok) return empty;

  const profile: unknown = await response.json();
  if (!profile || typeof profile !== "object" || !("id" in profile) || profile.id !== userId) return empty;
  const fields = profile as Record<string, unknown>;
  const read = (key: string) => typeof fields[key] === "string" ? fields[key].trim() : "";
  const name = read("firstName") || read("displayName") ||
    [read("lastName"), read("middleName")].filter(Boolean).join(" ");
  return { name, email: read("email") };
}

export type ContactFieldErrors = Partial<
  Record<keyof ContactMessageRequest, string>
>;

export class ContactSubmissionError extends Error {
  constructor(message: string, readonly fieldErrors: ContactFieldErrors = {}) {
    super(message);
    this.name = "ContactSubmissionError";
  }
}

function readFieldErrors(value: unknown): ContactFieldErrors {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const fields: (keyof ContactMessageRequest)[] = [
    "name", "email", "topic", "message", "orderNumber", "privacyAccepted",
  ];
  const errors: ContactFieldErrors = {};
  for (const field of fields) {
    const message = (value as Record<string, unknown>)[field];
    if (typeof message === "string" && message.trim()) errors[field] = message;
  }
  return errors;
}

function readValidationMessage(message: unknown): ContactFieldErrors {
  if (typeof message !== "string") return {};
  const labels: ContactFieldErrors = {
    name: "Укажите имя не длиннее 100 символов",
    email: "Проверьте электронную почту",
    topic: "Выберите тему обращения",
    message: "Сообщение должно содержать от 10 до 5000 символов",
    orderNumber: "Номер заказа должен быть не длиннее 100 символов",
    privacyAccepted: "Для отправки нужно ваше согласие",
  };
  const errors: ContactFieldErrors = {};
  for (const field of Object.keys(labels) as (keyof ContactMessageRequest)[]) {
    if (new RegExp(`(?:^|;\\s*)${field}:`).test(message)) errors[field] = labels[field];
  }
  return errors;
}

export async function submitContactMessage(
  request: ContactMessageRequest,
): Promise<ContactMessageReceipt> {
  let response: Response;
  try {
    response = await apiFetch(`${API_URL}/api/contact-messages`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  } catch {
    throw new ContactSubmissionError(
      "Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.",
    );
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null) as {
      code?: unknown;
      message?: unknown;
      fieldErrors?: unknown;
      errors?: unknown;
    } | null;
    const fieldErrors = data?.code === "VALIDATION_ERROR"
      ? readValidationMessage(data.message)
      : readFieldErrors(data?.fieldErrors ?? data?.errors);
    let message = "Не удалось отправить обращение. Попробуйте ещё раз.";
    if (response.status === 429) {
      message = "Слишком много обращений. Подождите немного и попробуйте ещё раз.";
    } else if (response.status === 503) {
      message = "Приём обращений временно недоступен. Попробуйте позже.";
    } else if (response.status === 400) {
      message = data?.code !== "VALIDATION_ERROR" && typeof data?.message === "string"
        ? data.message
        : "Проверьте заполненные поля и попробуйте ещё раз.";
    }
    throw new ContactSubmissionError(message, fieldErrors);
  }

  const receipt = await response.json().catch(() => null) as ContactMessageReceipt | null;
  if (!receipt || !Number.isSafeInteger(receipt.id) || receipt.id < 1 || typeof receipt.createdAt !== "string") {
    throw new ContactSubmissionError(
      "Не удалось получить подтверждение отправки. Попробуйте позже.",
    );
  }
  return receipt;
}
