"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Button } from "../../components/ui/Button";
import { CabinetTabs, type CabinetTabItem } from "../../components/ui/CabinetTabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import { StatusBadge, type StatusBadgeTone } from "../../components/ui/StatusBadge";
import { formatRussianPhone } from "../../lib/phone";

import { AdminSellerBrandProfile } from "./AdminSellerBrandProfile";
import styles from "./AdminSellersTab.module.css";
import type {
  AdminSellerApplication,
  SellerApplicationStatus,
} from "../types";

type Props = {
  applications: AdminSellerApplication[];
  totalElements: number;
  status: SellerApplicationStatus | "ALL";
  refreshing: boolean;
  loadingMore: boolean;
  actionApplicationId: number | null;
  statusCounts: Record<SellerApplicationStatus | "ALL", number>;
  onStatusChange: (status: SellerApplicationStatus | "ALL") => void;
  onRefresh: () => void;
  onLoadMore?: () => void;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number, comment?: string) => Promise<void>;
};

type ApplicationAction = "approve" | "requestChanges" | "reject";

const FILTERS: Array<SellerApplicationStatus | "ALL"> = [
  "NEW",
  "APPROVED",
  "REJECTED",
  "ALL",
];

function formatFilter(status: SellerApplicationStatus | "ALL") {
  switch (status) {
    case "NEW":
      return "Новые";
    case "APPROVED":
      return "Одобренные";
    case "REJECTED":
      return "Отклонённые";
    case "ALL":
      return "Все";
  }
}

function formatStatus(status: SellerApplicationStatus) {
  switch (status) {
    case "NEW":
      return "На рассмотрении";
    case "APPROVED":
      return "Одобрена";
    case "REJECTED":
      return "Отклонена";
  }
}

function getStatusTone(status: SellerApplicationStatus): StatusBadgeTone {
  switch (status) {
    case "NEW":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminSellersTab({
  applications,
  totalElements,
  status,
  refreshing,
  loadingMore,
  actionApplicationId,
  statusCounts,
  onStatusChange,
  onRefresh,
  onLoadMore,
  onApprove,
  onReject,
}: Props) {
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(
    null
  );
  const [adminComment, setAdminComment] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ApplicationAction | null>(null);

  const selectedApplication = useMemo(
    () =>
      applications.find(
        (application) => application.id === selectedApplicationId
      ) ?? null,
    [applications, selectedApplicationId]
  );

  const filterTabs: Array<CabinetTabItem<SellerApplicationStatus | "ALL">> =
    FILTERS.map((value) => ({
      value,
      label: formatFilter(value),
      count: statusCounts[value] ?? 0,
    }));

  function closeDetails() {
    setSelectedApplicationId(null);
    setActionMessage(null);
    setActionError(null);
    setPendingAction(null);
    setAdminComment("");
  }

  async function runAction(
    type: ApplicationAction,
    action: () => Promise<void>,
    successMessage: string
  ) {
    setActionMessage(null);
    setActionError(null);
    setPendingAction(type);

    try {
      await action();
      setActionMessage(successMessage);
      setSelectedApplicationId(null);
      setAdminComment("");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Не удалось выполнить действие"
      );
    } finally {
      setPendingAction(null);
    }
  }

  if (selectedApplication) {
    return (
      <SellerApplicationDetails
        application={selectedApplication}
        loading={actionApplicationId === selectedApplication.id}
        pendingAction={pendingAction}
        adminComment={adminComment}
        actionMessage={actionMessage}
        actionError={actionError}
        onAdminCommentChange={setAdminComment}
        onBack={closeDetails}
        onApprove={() =>
          void runAction(
            "approve",
            () => onApprove(selectedApplication.id),
            "Заявка одобрена"
          )
        }
        onReject={() =>
          void runAction(
            "reject",
            () =>
              onReject(
                selectedApplication.id,
                adminComment.trim() || undefined
              ),
            "Заявка отклонена"
          )
        }
        onRequestChanges={() =>
          void runAction(
            "requestChanges",
            () =>
              onReject(
                selectedApplication.id,
                adminComment.trim() || undefined
              ),
            "Запрос правок отправлен"
          )
        }
      />
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <CabinetTabs
          items={filterTabs}
          value={status}
          onChange={onStatusChange}
          ariaLabel="Фильтр заявок продавцов по статусу"
          countTone="gold"
          appearance="segmented"
        />

        <Button
          type="button"
          variant="secondary"
          loading={refreshing}
          onClick={onRefresh}
          className={styles.refreshButton}
        >
          Обновить
        </Button>
      </div>

      <ActionNotice message={actionMessage} tone="success" />
      <ActionNotice message={actionError} tone="danger" />

      {applications.length === 0 ? (
        statusCounts.ALL === 0 ? (
          <EmptyState
            icon="store"
            tone="gold"
            title="Заявок пока нет"
            text="Новые заявки продавцов появятся здесь."
          />
        ) : (
          <EmptyState
            icon="search"
            title="Заявок нет"
            text="По выбранному статусу ничего не найдено."
          />
        )
      ) : (
        <>
          <div className={styles.list}>
            {applications.map((application) => (
              <SellerApplicationCard
                key={application.id}
                application={application}
                onOpen={() => {
                  setSelectedApplicationId(application.id);
                  setActionMessage(null);
                  setActionError(null);
                  setPendingAction(null);
                  setAdminComment(application.adminComment ?? "");
                }}
              />
            ))}
          </div>
          <ListLoadMore
            loaded={applications.length}
            total={totalElements}
            loading={loadingMore}
            onLoadMore={onLoadMore}
          />
        </>
      )}
    </section>
  );
}

function SellerApplicationCard({
  application,
  onOpen,
}: {
  application: AdminSellerApplication;
  onOpen: () => void;
}) {
  return (
    <article className={styles.card}>
      <div
        className={styles.cardMain}
        role="button"
        tabIndex={0}
        aria-label={`Открыть заявку бренда «${application.brandName}»`}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
      >
        <div className={styles.identity}>
          <span className={styles.label}>Бренд</span>
          <strong className={styles.title}>{application.brandName}</strong>
          <span className={styles.meta}>
            ID {application.id} · пользователь {application.userId}
          </span>
        </div>

        <ApplicationFact
          label="Контакт"
          value={application.contactName}
          secondary={formatRussianPhone(application.phone)}
        />
        <ApplicationFact
          label="Почта"
          value={application.email}
          secondary={`@${application.username}`}
        />
        <ApplicationFact
          label="Категория"
          value={application.category || "Не указана"}
          secondary={application.productionRegion || undefined}
        />

        <div className={styles.state}>
          <span className={styles.label}>Статус</span>
          <StatusBadge tone={getStatusTone(application.status)} size="regular">
            {formatStatus(application.status)}
          </StatusBadge>
          <span className={styles.date}>{formatDate(application.createdAt)}</span>
        </div>

        <span className={styles.chevron} aria-hidden="true">
          <Icon name="chevron-right" size={18} strokeWidth={1.5} />
        </span>
      </div>

      {application.brandDescription ? (
        <p className={styles.description}>{application.brandDescription}</p>
      ) : null}
    </article>
  );
}

function ApplicationFact({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className={styles.fact}>
      <span className={styles.label}>{label}</span>
      <strong>{value}</strong>
      {secondary ? <span className={styles.factSecondary}>{secondary}</span> : null}
    </div>
  );
}

function SellerApplicationDetails({
  application,
  loading,
  pendingAction,
  adminComment,
  actionMessage,
  actionError,
  onAdminCommentChange,
  onBack,
  onApprove,
  onReject,
  onRequestChanges,
}: {
  application: AdminSellerApplication;
  loading: boolean;
  pendingAction: ApplicationAction | null;
  adminComment: string;
  actionMessage: string | null;
  actionError: string | null;
  onAdminCommentChange: (value: string) => void;
  onBack: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
}) {
  const canModerate = application.status === "NEW";

  return (
    <section className={styles.detailsPage}>
      <header className={styles.detailsHeader}>
        <Button type="button" variant="ghost" onClick={onBack}>
          <Icon name="chevron-left" size={16} strokeWidth={1.5} />
          Назад
        </Button>

        <div className={styles.detailsTitleBlock}>
          <h1 className={styles.detailsTitle}>{application.brandName}</h1>
          <div className={styles.detailsMeta}>
            <span>Заявка {application.id}</span>
            <span>{formatDate(application.createdAt)}</span>
            <StatusBadge tone={getStatusTone(application.status)} size="regular">
              {formatStatus(application.status)}
            </StatusBadge>
          </div>
        </div>
      </header>

      <ActionNotice message={actionMessage} tone="success" />
      <ActionNotice message={actionError} tone="danger" />

      <div className={styles.detailsLayout}>
        <main className={styles.detailsMain}>
          <DetailsSection title="Магазин">
            <div className={styles.infoGrid}>
              <InfoRow label="Название" value={application.brandName} />
              <InfoRow label="Username" value={application.username} />
              <InfoRow label="ID пользователя" value={String(application.userId)} />
            </div>
          </DetailsSection>

          <DetailsSection title="Контакты">
            <div className={styles.infoGrid}>
              <InfoRow label="Контактное лицо" value={application.contactName} />
              <InfoRow
                label="Телефон"
                value={formatRussianPhone(application.phone)}
              />
              <InfoRow label="Электронная почта" value={application.email} />
              <InfoRow label="Telegram" value={application.telegram || "—"} />
            </div>
          </DetailsSection>

          <DetailsSection title="Бренд">
            <div className={styles.infoGrid}>
              <InfoRow label="Категория" value={application.category || "—"} />
              <InfoRow
                label="Регион производства"
                value={application.productionRegion || "—"}
              />
              <InfoRow label="Сайт" value={application.website || "—"} />
            </div>

            <div className={styles.textBlock}>
              <span className={styles.infoLabel}>Описание</span>
              <p>{application.brandDescription || "Описание не заполнено"}</p>
            </div>

            {application.comment ? (
              <div className={styles.textBlock}>
                <span className={styles.infoLabel}>Комментарий продавца</span>
                <p>{application.comment}</p>
              </div>
            ) : null}
          </DetailsSection>

          <DetailsSection title="Реквизиты">
            <p className={styles.emptyText}>
              Реквизиты не переданы в заявке продавца.
            </p>
          </DetailsSection>
        </main>

        <aside className={styles.detailsAside}>
          <DetailsSection title="Статус">
            <div className={styles.infoGrid}>
              <InfoRow
                label="Заявка"
                value={
                  <StatusBadge
                    tone={getStatusTone(application.status)}
                    size="regular"
                  >
                    {formatStatus(application.status)}
                  </StatusBadge>
                }
              />
              <InfoRow label="Создана" value={formatDate(application.createdAt)} />
              <InfoRow label="Обновлена" value={formatDate(application.updatedAt)} />
            </div>
          </DetailsSection>

          <DetailsSection title="Решение">
            <label className={styles.textareaField}>
              <span>Комментарий администратора</span>
              <textarea
                value={adminComment}
                onChange={(event) => onAdminCommentChange(event.target.value)}
                rows={5}
              />
            </label>

            {application.adminComment ? (
              <div className={styles.textBlock}>
                <span className={styles.infoLabel}>Последний комментарий</span>
                <p>{application.adminComment}</p>
              </div>
            ) : null}

            {canModerate ? (
              <div className={styles.detailsActions}>
                <Button
                  type="button"
                  variant="primary"
                  disabled={loading}
                  loading={loading && pendingAction === "approve"}
                  onClick={onApprove}
                >
                  Одобрить
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading || !adminComment.trim()}
                  loading={loading && pendingAction === "requestChanges"}
                  onClick={onRequestChanges}
                >
                  Запросить правки
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={loading}
                  loading={loading && pendingAction === "reject"}
                  onClick={onReject}
                >
                  Отклонить
                </Button>
              </div>
            ) : (
              <p className={styles.emptyText}>
                Действия для этого статуса недоступны.
              </p>
            )}
          </DetailsSection>
        </aside>
      </div>

      <AdminSellerBrandProfile
        key={application.id}
        userId={application.userId}
        brandName={application.brandName}
        status={application.status}
      />
    </section>
  );
}

function DetailsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.detailsSection}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

function ActionNotice({
  message,
  tone,
}: {
  message: string | null;
  tone: "success" | "danger";
}) {
  if (!message) return null;

  return (
    <div
      className={`${styles.notice} ${
        tone === "success" ? styles.noticeSuccess : styles.noticeDanger
      }`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Icon name={tone === "success" ? "check-circle" : "info"} size={20} />
      <span>{message}</span>
    </div>
  );
}
