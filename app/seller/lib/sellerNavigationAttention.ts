import { apiFetch, API_URL } from "../../lib/api";
import type { StatusBadgeTone } from "../../components/ui/StatusBadge";
import type { SellerTab } from "../types";

export type SellerNavigationAttention = {
  label: string;
  count?: number;
  href: string;
  tone: StatusBadgeTone;
  description: string;
};

export type SellerNavigationAttentionResult = {
  items: Partial<Record<SellerTab, SellerNavigationAttention>>;
  hasErrors: boolean;
};

type DashboardSignals = { attentionProducts: number; failedPayouts: number };
type FinanceSignals = { reconciliationDifference: number; bankDetailsReady: boolean };
type OnboardingSignals = { legalCompleted: boolean; agreementAccepted: boolean };
type BrandSignals = { description: string | null; wordmarkUrl: string | null };
type TaskSignal = { id: string; action: string; href: string };
type TaskPage = { content: TaskSignal[]; number: number; hasNext: boolean };
type TaskCategory = "order" | "return" | "product";

const taskActions: Record<TaskCategory, readonly string[]> = {
  order: ["Передать в доставку"],
  return: ["Открыть возврат", "Проверить товар"],
  product: ["Открыть товар"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function invalidResponse(): never {
  throw new Error("Некорректный ответ при проверке задач магазина");
}

async function readJson(path: string, signal: AbortSignal): Promise<unknown> {
  signal.throwIfAborted();
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
  const response = await apiFetch(`${API_URL}${path}`, { signal: requestSignal });
  if (!response.ok) throw new Error("Не удалось проверить задачи магазина");
  return response.json();
}

async function getDashboardSignals(signal: AbortSignal): Promise<DashboardSignals> {
  const value = await readJson("/api/seller/dashboard-summary", signal);
  if (!isRecord(value) || !isCount(value.attentionProducts) || !isCount(value.failedPayouts)) {
    return invalidResponse();
  }
  return { attentionProducts: value.attentionProducts, failedPayouts: value.failedPayouts };
}

async function getFinanceSignals(signal: AbortSignal): Promise<FinanceSignals> {
  const value = await readJson("/api/seller/finance/summary", signal);
  if (!isRecord(value) || typeof value.reconciliationDifference !== "number"
    || !Number.isFinite(value.reconciliationDifference) || typeof value.bankDetailsReady !== "boolean") {
    return invalidResponse();
  }
  return { reconciliationDifference: value.reconciliationDifference, bankDetailsReady: value.bankDetailsReady };
}

async function getOnboardingSignals(signal: AbortSignal): Promise<OnboardingSignals> {
  const value = await readJson("/api/seller/onboarding-status", signal);
  if (!isRecord(value) || typeof value.legalCompleted !== "boolean" || typeof value.agreementAccepted !== "boolean") {
    return invalidResponse();
  }
  return { legalCompleted: value.legalCompleted, agreementAccepted: value.agreementAccepted };
}

async function getBrandSignals(signal: AbortSignal): Promise<BrandSignals[]> {
  const value = await readJson("/api/seller/brands", signal);
  if (!Array.isArray(value)) return invalidResponse();
  return value.map(brand => {
    if (!isRecord(brand) || !isCount(brand.id) || brand.id === 0 || typeof brand.name !== "string"
      || !isNullableText(brand.description) || !isNullableText(brand.wordmarkUrl)) {
      return invalidResponse();
    }
    return { description: brand.description, wordmarkUrl: brand.wordmarkUrl };
  });
}

async function getTaskPage(
  category: TaskCategory,
  page: number,
  size: number,
  signal: AbortSignal
): Promise<TaskPage> {
  const value = await readJson(`/api/seller/dashboard/tasks?category=${category}&page=${page}&size=${size}`, signal);
  if (!isRecord(value) || !Array.isArray(value.content) || !isCount(value.number)
    || value.number !== page || typeof value.hasNext !== "boolean" || value.content.length > size
    || (value.hasNext && value.content.length === 0)) {
    return invalidResponse();
  }
  const expectedId = new RegExp(`^${category}-[1-9]\\d*$`);
  const content = value.content.map(task => {
    if (!isRecord(task) || typeof task.id !== "string" || !expectedId.test(task.id)
      || typeof task.action !== "string" || typeof task.href !== "string"
      || !taskActions[category].includes(task.action)) {
      return invalidResponse();
    }
    return { id: task.id, action: task.action, href: task.href };
  });
  return { content, number: value.number, hasNext: value.hasNext };
}

async function getShipmentTask(signal: AbortSignal): Promise<TaskSignal | null> {
  const result = await getTaskPage("order", 0, 1, signal);
  return result.content[0] ?? null;
}

async function getProductTask(signal: AbortSignal): Promise<TaskSignal | null> {
  const result = await getTaskPage("product", 0, 1, signal);
  return result.content[0] ?? null;
}

async function getReceivedReturnTask(signal: AbortSignal): Promise<TaskSignal | null> {
  // Waiting and in-transit returns are not inspection tasks. The queue has no
  // status filter, so absence is known only after its final page is checked.
  // Bound the whole scan so a long queue cannot hold back the other signals.
  const scanSignal = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
  for (let page = 0; ; page += 1) {
    const result = await getTaskPage("return", page, 100, scanSignal);
    const task = result.content.find(item => item.action === "Проверить товар");
    if (task) return task;
    if (!result.hasNext) return null;
  }
}

function taskHref(task: TaskSignal, category: TaskCategory): string {
  if (category === "product") {
    return /^\/seller\/products\/[1-9]\d*\/edit$/.test(task.href)
      ? task.href : "/seller/products?status=attention";
  }
  const section = category === "order" ? "orders" : "returns";
  const canonicalPath = `/seller/${section}`;
  return new RegExp(`^${canonicalPath}/[1-9]\\d*$`).test(task.href) ? task.href : canonicalPath;
}

function fulfilledValue<T>(result: PromiseSettledResult<T>): T | undefined {
  return result.status === "fulfilled" ? result.value : undefined;
}

export async function loadSellerNavigationAttention(signal: AbortSignal): Promise<SellerNavigationAttentionResult> {
  const results = await Promise.allSettled([
    getDashboardSignals(signal),
    getFinanceSignals(signal),
    getOnboardingSignals(signal),
    getBrandSignals(signal),
    getShipmentTask(signal),
    getReceivedReturnTask(signal),
    getProductTask(signal),
  ] as const);
  signal.throwIfAborted();

  const dashboard = fulfilledValue(results[0]);
  const finance = fulfilledValue(results[1]);
  const onboarding = fulfilledValue(results[2]);
  const brands = fulfilledValue(results[3]);
  const shipment = fulfilledValue(results[4]);
  const receivedReturn = fulfilledValue(results[5]);
  const product = fulfilledValue(results[6]);
  const hasErrors = results.some(result => result.status === "rejected");
  const items: SellerNavigationAttentionResult["items"] = {};

  if (product || (dashboard && dashboard.attentionProducts > 0)) {
    items.products = {
      label: "Проверить", href: product ? taskHref(product, "product") : "/seller/products?status=attention", tone: "warning",
      count: dashboard && dashboard.attentionProducts > 0 ? dashboard.attentionProducts : undefined,
      description: "Откройте товары с замечаниями или блокировкой",
    };
  }

  if (receivedReturn) {
    items.orders = {
      label: "Возврат", href: taskHref(receivedReturn, "return"), tone: "danger",
      description: "Проверьте состояние полученного возврата",
    };
  } else if (shipment) {
    items.orders = {
      label: "К отправке", href: taskHref(shipment, "order"), tone: "warning",
      description: "Передайте оплаченный заказ в доставку",
    };
  }

  if (dashboard && dashboard.failedPayouts > 0) {
    items.finance = {
      label: "Проверить", href: "/seller/finance?view=payouts", tone: "danger",
      count: dashboard.failedPayouts,
      description: "Посмотрите выплаты с ошибкой",
    };
  } else if (finance && Math.abs(finance.reconciliationDifference) >= 0.005) {
    items.finance = {
      label: "Сверка", href: "/seller/finance", tone: "warning",
      description: "Проверьте расхождение баланса и обратитесь в поддержку",
    };
  }

  if (onboarding && !onboarding.legalCompleted) {
    items.legal = {
      label: "Заполнить", href: "/seller/legal", tone: "warning",
      description: "Заполните обязательные данные и реквизиты продавца",
    };
  } else if (onboarding && !onboarding.agreementAccepted) {
    items.legal = {
      label: "Оферта", href: "/seller/legal?section=bank", tone: "warning",
      description: "Примите условия работы с площадкой",
    };
  } else if (finance && !finance.bankDetailsReady) {
    items.legal = {
      label: "Реквизиты", href: onboarding?.legalCompleted ? "/seller/legal?section=legal" : "/seller/legal", tone: "warning",
      description: onboarding?.legalCompleted
        ? "Укажите ФИО или юридическое название для выплат"
        : "Проверьте данные получателя и банковские реквизиты для выплат",
    };
  }

  if (brands !== undefined) {
    const brand = brands[0];
    // The storefront editor saves wordmarkUrl; logoUrl is a separate legacy
    // field and onboarding.brandCompleted checks that different field.
    if (!brand) {
      items.brand = {
        label: "Помощь", href: "/contacts", tone: "warning",
        description: "Профиль магазина недоступен — обратитесь в поддержку",
      };
    } else if (!brand.description?.trim() || !brand.wordmarkUrl?.trim()) {
      items.brand = {
        label: "Оформить", href: "/seller/store", tone: "warning",
        description: "Добавьте описание и текстовый логотип магазина",
      };
    }
  }

  if (hasErrors) {
    items.home = {
      label: "Нет данных", href: "/seller/home", tone: "default",
      description: "Часть задач не удалось проверить — откройте обзор магазина и повторите загрузку",
    };
  } else if (Object.keys(items).length > 0) {
    items.home = {
      label: "Задачи", href: "/seller/home", tone: "warning",
      description: "Откройте обзор магазина, чтобы перейти к задачам",
    };
  }

  return { items, hasErrors };
}
