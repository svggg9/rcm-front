"use client";

import { NumericField } from "../../components/ui/NumericField";
import { useFieldValidation } from "../../lib/useFieldValidation";
import { scrollToFirstValidationError } from "../../lib/formValidation";
import { MONEY_RULES, parseNumericInput } from "../../lib/numericInput";

import { useCallback, useEffect, useRef, useState } from "react";

import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Loader } from "../../components/ui/Loader";
import { RequestError } from "../../components/ui/RequestError";
import { toast } from "../../components/ui/toast";
import { OrderDetailSection } from "../../components/order-detail/OrderDetail";
import { ReturnWorkflowSummary } from "../../components/order-detail/ReturnWorkflowSummary";
import {
  getAdminOrderReturns,
  refundAdminReturn,
  returnReasonLabels,
  returnStatusLabels,
  reviewAdminReturn,
  returnAction,
  type ReturnRequest,
} from "../../lib/returns";
import styles from "./AdminReturnRequests.module.css";

type Props = {
  orderId: number;
};

export function AdminReturnRequests({ orderId }: Props) {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [refundAmounts, setRefundAmounts] = useState<Record<number, string>>({});
  function validateAmounts(values: Record<number, string>) {
    const errors: Record<number, string> = {};
    for (const request of requests) {
      if (!returnAction(request, "REFUND").allowed) continue;
      const amount = parseNumericInput(values[request.id] ?? "", MONEY_RULES);
      if (amount === null || !Number.isFinite(amount) || amount <= 0) errors[request.id] = "Укажите корректную сумму возврата";
      else if (request.requestedAmount && amount > request.requestedAmount) errors[request.id] = "Сумма возврата не может быть больше суммы позиции";
    }
    return errors;
  }
  const amountValidation = useFieldValidation(refundAmounts, validateAmounts);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestOrderId, setRequestOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const generation = useRef<object>({});
  const mutationPending = useRef(false);
  const readState = useRef({ orderId, ready: false, loading: false });

  const refresh = useCallback(async () => {
    if (mutationPending.current || (readState.current.orderId === orderId && readState.current.loading)) return;
    const current = {};
    generation.current = current;
    readState.current = { orderId, ready: false, loading: true };
    setLoading(true);
    try {
      const items = await getAdminOrderReturns(orderId);
      if (current !== generation.current) return;
      setRequests(items);
      setRequestOrderId(orderId);
      // Polling and recovery must preserve amounts entered by the operator.
      setRefundAmounts(values => Object.fromEntries(items.map(item => [item.id,
        values[item.id] ?? String(item.approvedRefundAmount ?? item.requestedAmount ?? ""),
      ])));
      setLoadError(null);
      readState.current.ready = true;
    } catch {
      if (current !== generation.current) return;
      setLoadError("Не удалось проверить возвраты — обновите данные перед действием");
    } finally {
      if (current === generation.current) {
        readState.current.loading = false;
        setLoading(false);
      }
    }
  }, [orderId]);

  useEffect(() => {
    setBusyId(null);
    setError(null);
    void refresh();
    const poll = () => { if (!document.hidden) void refresh(); };
    const timer = setInterval(poll, 15000);
    window.addEventListener("refund-operations-changed", poll);
    return () => {
      generation.current = {};
      readState.current = { orderId, ready: false, loading: false };
      mutationPending.current = false;
      clearInterval(timer);
      window.removeEventListener("refund-operations-changed", poll);
    };
  }, [orderId, refresh]);

  function canAct() {
    return readState.current.orderId === orderId && readState.current.ready
      && !readState.current.loading && !mutationPending.current;
  }

  async function mutate(request: ReturnRequest, operation: () => Promise<ReturnRequest>) {
    if (!canAct()) return;
    const current = generation.current;
    mutationPending.current = true;
    readState.current.ready = false;
    setBusyId(request.id);
    setError(null);
    let confirmed = false;
    try {
      const updated = await operation();
      if (current !== generation.current) return;
      confirmed = true;
      setRequests(items => items.map(item => item.id === updated.id ? updated : item));
      toast.success(`Возврат №${updated.id}: ${returnStatusLabels[updated.status]}`, {
        id: `admin-return-request-${request.id}`, description: undefined, action: undefined,
      });
      window.dispatchEvent(new Event("refund-operations-changed"));
    } catch (failure) {
      if (current !== generation.current) return;
      setLoadError("Результат действия не подтверждён — обновите возвраты перед повтором");
      toast.error(failure instanceof Error ? failure.message : "Не удалось подтвердить результат действия", {
        id: `admin-return-request-${request.id}`,
      });
    } finally {
      if (current === generation.current) {
        mutationPending.current = false;
        setBusyId(null);
        if (confirmed) void refresh();
      }
    }
  }

  async function review(
    request: ReturnRequest,
    decision: "approve" | "reject"
  ) {
    if (!canAct() || !returnAction(request, decision === "approve" ? "APPROVE" : "REJECT").allowed) return;
    if (decision === "reject" && !comments[request.id]?.trim()) {
      setError("Для отклонения укажите причину");
      return;
    }

    await mutate(request, () => reviewAdminReturn(request.id, decision, comments[request.id]));
  }

  async function refund(request: ReturnRequest) {
    if (!canAct() || !returnAction(request, "REFUND").allowed) return;
    amountValidation.touch(request.id);
    const amount = parseNumericInput(refundAmounts[request.id] ?? "", MONEY_RULES);
    if (validateAmounts(refundAmounts)[request.id] || amount === null) {
      setError(null);
      scrollToFirstValidationError({ selector: '#refund-amount-' + request.id + '[aria-invalid="true"]' });
      return;
    }

    await mutate(request, () => refundAdminReturn(request.id, amount));
  }

  async function syncRefund(request: ReturnRequest) {
    if (!canAct() || !returnAction(request, "SYNC_REFUND").allowed) return;
    await mutate(request, () => refundAdminReturn(request.id));
  }

  const visibleRequests = requestOrderId === orderId ? requests : [];
  const actionsDisabled = requestOrderId !== orderId || loading || !!loadError || busyId !== null;
  if (visibleRequests.length === 0 && requestOrderId === orderId && !loading && !loadError) return null;

  return (
    <OrderDetailSection title="Возвраты">
      <div className={styles.list}>
        {loading ? <Loader inline label="Проверка возвратов" /> : null}
        {loadError ? <RequestError variant="inline" message={loadError} loading={loading}
          disabled={busyId !== null} onRetry={refresh} /> : null}
        {visibleRequests.map((request) => (
        <article key={request.id} className={styles.card}>
          <div className={styles.header}>
            <div>
              <strong>Возврат №{request.id}</strong>
              <span>{request.productTitle}</span>
            </div>
            <StatusBadge
              tone={
                request.status === "REJECTED"
                  ? "danger"
                  : request.status === "SUBMITTED" ||
                      request.status === "REQUESTED"
                    ? "warning"
                    : "success"
              }
            >
              {returnStatusLabels[request.status]}
            </StatusBadge>
          </div>

          <dl>
            <div>
              <dt>Причина</dt>
              <dd>{returnReasonLabels[request.reason]}</dd>
            </div>
            <div>
              <dt>Количество</dt>
              <dd>{request.quantity}</dd>
            </div>
          </dl>

          {request.comment ? <p>{request.comment}</p> : null}
          <ReturnWorkflowSummary workflow={request.workflow} onRefresh={() => void refresh()} />

          {request.photoUrls.length > 0 ? (
            <div className={styles.photos}>
              {request.photoUrls.map((url, index) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  Фото {index + 1}
                </a>
              ))}
            </div>
          ) : null}

          {returnAction(request, "APPROVE").allowed || returnAction(request, "REJECT").allowed ? (
            <div className={styles.review}>
              <Textarea label="Комментарий администратора" value={comments[request.id]??""} onChange={event=>setComments(current=>({...current,[request.id]:event.target.value}))} maxLength={1000} />
              <div className={styles.actions}>
                <Button
                  variant="primary"
                  onClick={() => void review(request, "approve")}
                  disabled={actionsDisabled || !returnAction(request, "APPROVE").allowed}
                >
                  Одобрить
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void review(request, "reject")}
                  disabled={actionsDisabled || !returnAction(request, "REJECT").allowed}
                >
                  Отклонить
                </Button>
              </div>
            </div>
          ) : null}

          {returnAction(request, "REFUND").allowed ? (
            <div className={styles.review}>
              <NumericField label="Сумма возврата" {...MONEY_RULES}
                  id={"refund-amount-" + request.id} error={amountValidation.errors[request.id]}
                  onBlur={() => amountValidation.touch(request.id)}
                  value={refundAmounts[request.id] ?? ""}
                  onChange={(event) =>
                    setRefundAmounts((current) => ({
                      ...current,
                      [request.id]: event.target.value,
                    }))
                  }
                />
              <div className={styles.actions}>
                {request.requestedAmount ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setRefundAmounts((current) => ({
                        ...current,
                        [request.id]: String(request.requestedAmount),
                      }))
                    }
                    disabled={actionsDisabled}
                  >
                    Полная сумма
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onClick={() => void refund(request)}
                  disabled={actionsDisabled}
                >
                  Создать запрос возврата
                </Button>
              </div>
            </div>
          ) : null}
          {returnAction(request, "SYNC_REFUND").allowed ? <Button variant="secondary" disabled={actionsDisabled}
            onClick={() => void syncRefund(request)}>Сверить возврат денег</Button> : null}
          {request.status === "REFUND_PENDING" ? <p role="status">Запрос возврата создан. Проверьте отправку и подтверждение в очереди возвратов{request.refundId ? `: №${request.refundId}` : ""}</p> : null}
        </article>
        ))}
        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    </OrderDetailSection>
  );
}
