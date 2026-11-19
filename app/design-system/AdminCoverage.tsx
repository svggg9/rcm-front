"use client";

import { useState } from "react";
import { ProductListCard } from "../components/ProductListCard";
import { AdminProductActions } from "../admin/components/AdminProductActions";
import { AdminProductComparisonTable } from "../admin/components/AdminProductComparison";
import { AdminProductDetails } from "../admin/components/AdminProductDetails";
import { AdminPayoutCard, AdminPayoutSummary, AdminPayoutDetailContent } from "../admin/components/AdminPayoutRegistry";
import { AdminPaymentReviewRow } from "../admin/components/AdminPaymentReview";
import { AdminRefundOperationCard, AdminRefundProofDialog } from "../admin/components/AdminRefundOperations";
import { AdminLedgerTable } from "../admin/components/AdminLedger";
import type { AdminProduct, AdminSellerPayout, AdminSellerPayoutStatus, ProductStatus } from "../admin/types";
import { PAYOUT_STATUSES, type AdminPayoutDetail, type PayoutAction } from "../admin/lib/adminPayoutApi";
import type { CategoryOption } from "../lib/categories";
import type { RefundOperation } from "../admin/lib/paymentOperations";
import { formatProductStatus, getProductStatusTone } from "../lib/productStatus";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { EmptyState } from "../components/ui/EmptyState";
import { RequestError } from "../components/ui/RequestError";
import { SectionLoader } from "../components/ui/SectionLoader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { FormSelect } from "../components/ui/FormSelect";
import styles from "./AdminCoverage.module.css";

export const adminDemoProduct: AdminProduct = {
  id: 1042, title: "Рубашка из хлопка", description: "Прямой крой и мягкая ткань", composition: "Хлопок 100%",
  brand: "Пример бренда", categoryId: 1, category: "Рубашки", audience: "UNISEX", status: "MODERATION",
  moderationComment: null, variants: [], images: [],
};
const product = adminDemoProduct;
const original: AdminProduct = { ...product, title: "Рубашка", description: "Прямой крой" };
export const adminDemoCategories: CategoryOption[] = [{
  id: 1, name: "Рубашки", label: "Рубашки", parentId: null, slug: null, sortOrder: 0,
  isActive: true, effectiveActive: true, productCount: 0, subtreeProductCount: 0,
}];
export const adminDemoPayout: AdminSellerPayout = {
  id: 42, sellerId: 15, sellerName: "Пример бренда", status: "READY", scheduledDate: "2026-11-08", currency: "RUB",
  grossSalesAmount: 15000, commissionAmount: 1500, adjustmentsAmount: 0, payoutAmount: 13500,
  inn: "000000000000", bankName: "Демонстрационный банк", bik: "000000000", checkingAccount: "00000000000000000000",
  correspondentAccount: null, paymentOrderNumber: null, adminComment: null, createdAt: "2026-11-08T12:00:00Z", sentAt: null, paidAt: null, orderCount: 2,
  items: [{ id: 1, type: "ORDER", orderId: 1042, grossAmount: 15000, commissionAmount: 1500, adjustmentAmount: 0, netAmount: 13500, description: null }],
};
const payout = adminDemoPayout;
const refund: RefundOperation = {
  id: 24, externalId: null, paymentId: 19, status: "PENDING", amount: 5900, currency: "RUB", description: null,
  failureReason: "Ожидается банковская сверка", dispatchState: "REVIEW", requestReference: "DEMO-24", orderId: 1042,
  orderGroupId: "DEMO-1042", dispatchAttempts: 1, dispatchedAt: null, nextDispatchAt: null,
};
const states = [{ value: "ready", label: "Данные" }, { value: "loading", label: "Загрузка" },
  { value: "empty", label: "Пусто" }, { value: "error", label: "Ошибка" }] as const;
// These are example snapshots, not client-side rules for deciding permitted actions.
export const payoutExamples: Record<AdminSellerPayoutStatus, PayoutAction[]> = {
  READY: ["BEGIN", "CANCEL"], IN_PROGRESS: ["SENT", "REVIEW", "FAILED"], SENT: ["PAID", "REVIEW", "FAILED"],
  REVIEW: ["PAID", "FAILED"], FAILED: ["RETRY", "CANCEL"], PAID: [], CANCELLED: [],
};
const paymentExamples = [
  { value: "initialization", label: "Создание платежа" }, { value: "late", label: "Поздняя оплата" },
  { value: "reservation", label: "Старый резерв" }, { value: "reconcile", label: "Сверка оплаты" },
] as const;
const refundExamples = [
  { value: "READY", label: "Ожидает отправки" }, { value: "RETRY", label: "Повторная проверка" },
  { value: "REVIEW", label: "Банковская сверка" }, { value: "SENDING", label: "Отправляется" },
  { value: "ACKNOWLEDGED", label: "Ожидает подтверждения" }, { value: "SUCCEEDED", label: "Подтверждён" },
] as const;

export function AdminCoverage() {
  const [status, setStatus] = useState<ProductStatus>("MODERATION");
  const [state, setState] = useState<(typeof states)[number]["value"]>("ready");
  const [notice, setNotice] = useState("");
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [proofError, setProofError] = useState("");
  const [payoutStatus, setPayoutStatus] = useState<AdminSellerPayoutStatus>("READY");
  const [paymentExample, setPaymentExample] = useState<(typeof paymentExamples)[number]["value"]>("initialization");
  const [refundExample, setRefundExample] = useState<(typeof refundExamples)[number]["value"]>("REVIEW");
  const demoPayout = { ...payout, status: payoutStatus };
  const hasAttempt = !["READY", "CANCELLED"].includes(payoutStatus);
  const payoutDetail: AdminPayoutDetail = {
    payout: demoPayout, version: Object.keys(payoutExamples).indexOf(payoutStatus) + 1,
    allowedActions: payoutExamples[payoutStatus],
    attempts: hasAttempt ? [{ id: 1, number: 1, status: payoutStatus, startedAt: "2026-11-08T12:00:00Z", startedBy: 10,
      paymentOrderNumber: payoutStatus === "IN_PROGRESS" ? null : "DEMO-123", sentAt: null, resolvedAt: null, evidence: null, legacy: false }] : [],
    history: hasAttempt ? [{ id: 1, attemptId: 1, action: "BEGIN", fromStatus: "READY", toStatus: "IN_PROGRESS", actorId: 10,
      reason: "Демонстрационный перевод", evidence: null, createdAt: "2026-11-08T12:00:00Z" }] : [],
  };
  const demoRefund: RefundOperation = { ...refund, status: refundExample === "SUCCEEDED" ? "SUCCEEDED" : "PENDING",
    dispatchState: refundExample === "SUCCEEDED" ? "ACKNOWLEDGED" : refundExample,
    dispatchAttempts: refundExample === "READY" ? 0 : 1,
    externalId: ["ACKNOWLEDGED", "SUCCEEDED"].includes(refundExample) ? "DEMO-BANK-24" : null,
    failureReason: refundExample === "REVIEW" ? "Ожидается банковская сверка" : null,
    dispatchedAt: refundExample === "SENDING" ? "2026-11-08T12:00:00Z" : null,
  };
  const demo = (text: string) => setNotice(`${text}. Данные примера не сохраняются`);
  return <div className={styles.coverage}>
    <section className={styles.block} aria-labelledby="ds-admin-moderation">
      <div><h3 id="ds-admin-moderation">Модерация товара</h3><p>Рабочая карточка и действия модератора на условных данных</p></div>
      <ProductListCard id={product.id} title={product.title} imageUrl={null} brandName={product.brand} categoryName={product.category}
        minPrice={5900} variantsCount={1} totalStock={5} statusLabel={formatProductStatus(status)} statusTone={getProductStatusTone(status)}
        onOpen={() => setProductOpen(true)} actions={<AdminProductActions title={product.title} status={status} busy={false}
          onApprove={async () => { setStatus("ACTIVE"); demo("Товар одобрен в примере"); }}
          onBlock={async () => { setStatus("BLOCKED"); demo("Товар заблокирован в примере"); }}
          onUnblock={async () => { setStatus("DRAFT"); demo("Товар возвращён в черновик в примере"); }} />} />
      <Button variant="ghost" onClick={() => { setStatus("MODERATION"); setNotice(""); }}>Сбросить пример</Button>
      {productOpen && <AdminProductDetails product={{ ...product, status, createdAt: "2026-11-07T12:00:00Z", updatedAt: "2026-11-08T12:00:00Z" }}
        categories={adminDemoCategories} actionProductId={null} loadDates={false}
        onBack={() => setProductOpen(false)} onAssignCategory={async () => demo("Категория выбрана")}
        onApprove={async () => { setStatus("ACTIVE"); demo("Товар одобрен в примере"); }}
        onReturnToRevision={() => { setStatus("NEEDS_REVISION"); demo("Товар отправлен на доработку в примере"); }}
        onBlock={async () => { setStatus("BLOCKED"); demo("Товар заблокирован в примере"); }}
        onUnblock={async () => { setStatus("DRAFT"); demo("Товар возвращён в черновик в примере"); }} />}
      <h4>Сравнение опубликованной версии и изменений</h4>
      <AdminProductComparisonTable original={original} product={product} />
    </section>
    <section className={styles.block} aria-labelledby="ds-admin-finance">
      <div><h3 id="ds-admin-finance">Финансы администратора</h3><p>Реальные представления очередей и журнала. Все действия выполняются только в примере</p></div>
      <SegmentedControl items={states} value={state} onChange={setState} ariaLabel="Состояние финансовых примеров" />
      {state === "loading" ? <SectionLoader label="Загрузка финансов" /> : state === "empty" ? <EmptyState title="Операций пока нет" text="Здесь появятся финансовые операции" /> : state === "error" ? <RequestError message="Не удалось загрузить операции" onRetry={() => setState("ready")} /> : <>
        <h4>Реестры выплат</h4>
        <AdminPayoutSummary stats={{ readyAmount: 13500, inProgressAmount: 4000, sentAmount: 2000, reviewAmount: 1500 }} />
        <FormSelect label="Статус реестра в примере" value={payoutStatus}
          options={Object.entries(PAYOUT_STATUSES).map(([value, label]) => ({ value, label }))}
          onChange={value => setPayoutStatus(value as AdminSellerPayoutStatus)} />
        <AdminPayoutCard row={demoPayout} onOpen={() => setPayoutOpen(true)} />
        <h4>Проверка оплаты</h4>
        <FormSelect label="Случай проверки оплаты" value={paymentExample} options={[...paymentExamples]}
          onChange={value => setPaymentExample(value as typeof paymentExample)} />
        <AdminPaymentReviewRow row={{ orderId: 1042, orderGroupId: "DEMO-1042", status: "NEW", paymentStatus: "PENDING",
          paymentDueAt: paymentExample === "reconcile" ? "2026-11-08T12:00:00Z" : null,
          reservationReleasedAt: paymentExample === "late" ? "2026-11-08T11:00:00Z" : null,
          initializationPending: paymentExample === "initialization", latePaymentId: paymentExample === "late" ? 19 : null,
          initializationRecoverable: paymentExample === "initialization" }} disabled={false}
          onOpenOrder={() => demo("Открыт заказ")} onCheck={() => demo("Проверка оплаты")} onRecover={() => demo("Восстановление платежа")} />
        <h4>Возврат денег</h4>
        <FormSelect label="Состояние возврата" value={refundExample} options={[...refundExamples]}
          onChange={value => setRefundExample(value as typeof refundExample)} />
        <AdminRefundOperationCard row={demoRefund} disabled={false} canRecover={refundExample === "SENDING"} onOpenOrder={() => demo("Открыт заказ")}
          onAction={() => demo("Проверка возврата")} onProof={() => { setEvidence(""); setProofError(""); setProofOpen(true); }} />
        <h4>Журнал операций</h4>
        <div onAuxClickCapture={event => event.preventDefault()}><AdminLedgerTable onDemoOpen={() => demo("Открыта операция")} rows={[
          { id: 1, entryType: "COMMISSION_ACCRUED", direction: "CREDIT", amount: 1500, currency: "RUB", orderId: 1042, orderGroupId: "DEMO-1042", sellerId: 15, sellerPayoutId: null, description: "", createdAt: "2026-11-08T12:00:00Z" },
          { id: 2, entryType: "SELLER_PAYOUT", direction: "DEBIT", amount: 13500, currency: "RUB", orderId: null, orderGroupId: null, sellerId: 15, sellerPayoutId: 42, description: "", createdAt: "2026-11-08T12:00:00Z" },
        ]} /></div>
      </>}
    </section>
    <p className={styles.note} role="status">{notice}</p>
    {payoutOpen && <Dialog title="Реестр №42 — пример" size="wide" mobileFullscreen onClose={() => setPayoutOpen(false)} actions={<Button onClick={() => setPayoutOpen(false)}>Закрыть</Button>}>
      <p>Демонстрационные данные. Подтверждение не отправляет поручение и не меняет выплаты</p>
      <div onAuxClickCapture={event => event.preventDefault()}><AdminPayoutDetailContent detail={payoutDetail} loading={false} error="" busy={false}
        onDemoOpen={() => demo("Открыт заказ")} onAction={async () => { demo("Действие с выплатой выбрано"); setPayoutOpen(false); }} /></div>
    </Dialog>}
    {proofOpen && <AdminRefundProofDialog proof={demoRefund} busy={false} canAct proofIsCurrent loading={false} evidence={evidence} error={proofError}
      onEvidenceChange={value => { setEvidence(value); setProofError(""); }} onClose={() => setProofOpen(false)} onConfirm={() => {
        if (!evidence.trim()) { setProofError("Укажите основание банковской сверки"); return; }
        setProofOpen(false); demo("Сверка возврата подтверждена в примере");
      }} />}
  </div>;
}
