"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { ApiRequestError, readApiError, readApiJson, toApiError } from "../../lib/apiErrors";
import { requestApiResponse } from "../../lib/apiRequest";
import type { PageResponse } from "../types";
import { isAdminDashboard } from "./adminDashboard";
import { isAdminOperationAlertPage } from "./adminOperationAlerts";

const summaryKeys = ["products", "sellers", "requisites", "returns", "payments", "refunds", "payouts", "deliveries", "chats", "messages"] as const;

export async function workspaceRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await requestApiResponse(`${API_URL}/api/admin/workspace/${path}`, { signal }, "Не удалось загрузить данные админки — попробуйте ещё раз");
  if (!response.ok) throw await readApiError(response, "Не удалось загрузить данные админки");
  const value: unknown = await readApiJson(response, "Не удалось прочитать данные админки — попробуйте ещё раз");
  const resource = path.split("?")[0];
  const valid = resource === "operation-alerts" ? isAdminOperationAlertPage(value) : resource === "dashboard" ? isAdminDashboard(value, new URLSearchParams(path.split("?")[1]).get("period") ?? "7") : resource === "overview"
    ? Array.isArray(value) && value.length === summaryKeys.length && new Set(value.map(item => record(item) ? item.key : null)).size === summaryKeys.length
      && value.every(item => record(item) && summaryKeys.includes(item.key as typeof summaryKeys[number]) && Number.isSafeInteger(item.count) && (item.count as number) >= 0
        && [1,2,3].includes(item.priority as number) && (item.oldestAt === null || typeof item.oldestAt === "string" && !Number.isNaN(Date.parse(item.oldestAt)))
        && (item.objectId === null || Number.isSafeInteger(item.objectId) && (item.objectId as number)>0))
    : resource === "activity" ? workspacePage(value) && record(value) && Array.isArray(value.content) && value.content.every(item=>record(item)
      && typeof item.actor==="string" && typeof item.method==="string" && typeof item.path==="string" && item.path.startsWith("/api/")
      && (item.objectLabel===null || typeof item.objectLabel==="string") && typeof item.changes==="string" && (item.reason===null || typeof item.reason==="string")
      && Number.isInteger(item.httpStatus) && (item.httpStatus as number)>=100 && (item.httpStatus as number)<600
      && typeof item.createdAt==="string" && !Number.isNaN(Date.parse(item.createdAt)))
    : /^sellers\/\d+$/.test(resource)
      ? record(value) && record(value.seller) && Number.isSafeInteger(value.seller.id) && Array.isArray(value.brands) && value.brands.every(item => record(item) && Number.isSafeInteger(item.id) && typeof item.name === "string")
    : resource === "summary"
    ? record(value) && Object.keys(value).length === summaryKeys.length
      && summaryKeys.every(key => Number.isSafeInteger(value[key]) && (value[key] as number) >= 0)
    : resource === "ledger"
      ? record(value) && workspacePage(value.page) && Array.isArray(value.totals) && value.totals.every(item => record(item)
        && typeof item.currency === "string" && typeof item.credit === "number" && Number.isFinite(item.credit)
        && typeof item.debit === "number" && Number.isFinite(item.debit))
      : /^products\/\d+\/dates$/.test(resource)
        ? record(value) && [value.createdAt, value.updatedAt].every(item => typeof item === "string" && !Number.isNaN(Date.parse(item)))
        : workspacePage(value);
  if (!valid) throw new ApiRequestError("Не удалось прочитать данные админки — попробуйте ещё раз", "invalid-response", response.status);
  return value as T;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function workspacePage(value: unknown): boolean {
  return record(value) && Array.isArray(value.content)
    && value.content.every(item => record(item) && Number.isSafeInteger(item.id) && (item.id as number) > 0)
    && Number.isSafeInteger(value.totalElements) && (value.totalElements as number) >= value.content.length
    && Number.isSafeInteger(value.totalPages) && (value.totalPages as number) >= 0
    && Number.isSafeInteger(value.number) && (value.number as number) >= 0;
}

export function useAdminResource<T>(path: string | null) {
  const [revision, setRevision] = useState(0);
  const key = `${path}:${revision}`;
  const [result, setResult] = useState<{ key: string; path: string; data?: T; error?: string; status?: number }>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    void workspaceRequest<T>(path, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ key, path, data }); })
      .catch(reason => {
        if (controller.signal.aborted) return;
        const error = toApiError(reason, "Не удалось загрузить данные админки — попробуйте ещё раз");
        setResult(previous => ({ key, path,
          data: previous?.path === path && error.status !== 401 && error.status !== 403 ? previous.data : undefined,
          error: error.message, status: error.status,
        }));
      });
    return () => controller.abort();
  }, [key, path]);
  const current = result?.path === path ? result : undefined;
  const loading = path !== null && current?.key !== key;
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  return { data: current?.data, error: loading ? undefined : current?.error, status: current?.status, loading, refresh };
}

export type WorkspacePage<T> = PageResponse<T>;

export function adminDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
}

export function adminMoney(value: number, currency = "RUB") {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}
