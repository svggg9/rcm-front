import { useMemo, useState, type ReactNode } from "react";

import styles from "../Admin.module.css";

import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CabinetTabs, type CabinetTabItem } from "../../components/ui/CabinetTabs";

import type {
  AdminSellerApplication,
  SellerApplicationStatus,
} from "../types";

type Props = {
  applications: AdminSellerApplication[];
  status: SellerApplicationStatus | "ALL";
  totalElements: number;
  refreshing: boolean;
  actionApplicationId: number | null;
  statusCounts: Record<SellerApplicationStatus | "ALL", number>;
  onStatusChange: (status: SellerApplicationStatus | "ALL") => void;
  onRefresh: () => void;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number, comment?: string) => Promise<void>;
};

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
      return "Отклоненные";
    case "ALL":
      return "Все";
    default:
      return status;
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
    default:
      return status;
  }
}

function getStatusTone(status: SellerApplicationStatus) {
  switch (status) {
    case "NEW":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "default";
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
  status,
  totalElements,
  refreshing,
  actionApplicationId,
  statusCounts,
  onStatusChange,
  onRefresh,
  onApprove,
  onReject,
}: Props) {
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedApplication = useMemo(
    () =>
      applications.find((application) => application.id === selectedApplicationId) ??
      null,
    [applications, selectedApplicationId]
  );

  const filterTabs: Array<CabinetTabItem<SellerApplicationStatus | "ALL">> =
    FILTERS.map((value) => ({
      value,
      label: formatFilter(value),
      count: statusCounts[value] ?? 0,
    }));

  async function runAction(
    action: () => Promise<void>,
    successMessage: string
  ) {
    setActionMessage(null);
    setActionError(null);

    try {
      await action();
      setActionMessage(successMessage);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Не удалось выполнить действие"
      );
    }
  }

  if (selectedApplication) {
    const loading = actionApplicationId === selectedApplication.id;

    return (
      <SellerApplicationDetails
        application={selectedApplication}
        loading={loading}
        adminComment={adminComment}
        actionMessage={actionMessage}
        actionError={actionError}
        onAdminCommentChange={setAdminComment}
        onBack={() => {
          setSelectedApplicationId(null);
          setActionMessage(null);
          setActionError(null);
          setAdminComment("");
        }}
        onApprove={() =>
          void runAction(
            () => onApprove(selectedApplication.id),
            "Заявка одобрена"
          )
        }
        onReject={() =>
          void runAction(
            () => onReject(selectedApplication.id, adminComment.trim() || undefined),
            "Заявка отклонена"
          )
        }
        onRequestChanges={() =>
          void runAction(
            () => onReject(selectedApplication.id, adminComment.trim() || undefined),
            "Запрос правок отправлен"
          )
        }
      />
    );
  }

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={`${styles.sectionTitleNoMargin} textTitle`}>
            Заявки продавцов
          </h1>
          <div className={`${styles.muted} textCaption`}>
            Найдено: {totalElements}
          </div>
        </div>

        <button
          type="button"
          className={`${styles.refreshBtn} textButton`}
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Обновляем..." : "Обновить"}
        </button>
      </div>

      <div className={styles.filters}>
        <CabinetTabs
          items={filterTabs}
          value={status}
          onChange={onStatusChange}
          ariaLabel="Фильтр заявок продавцов по статусу"
          fullBleedMobile
          pinFirst
          countTone="gold"
          tone="gold"
        />
      </div>

      {actionMessage ? (
        <div className={`${styles.actionNotice} ${styles.actionNoticeSuccess} textSmall`}>
          {actionMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className={`${styles.actionNotice} ${styles.actionNoticeError} textSmall`}>
          {actionError}
        </div>
      ) : null}

      {applications.length === 0 ? (
        <EmptyState
          title="Заявок нет"
          text="По выбранному фильтру ничего не найдено."
        />
      ) : (
        <div className={styles.list}>
          {applications.map((application) => (
            <SellerApplicationCard
              key={application.id}
              application={application}
              onOpen={() => {
                setSelectedApplicationId(application.id);
                setActionMessage(null);
                setActionError(null);
                setAdminComment(application.adminComment ?? "");
              }}
            />
          ))}
        </div>
      )}
    </>
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
    <article
      className={styles.sellerCard}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className={styles.sellerMain}>
        <div className={styles.sellerHeader}>
          <div className={styles.sellerTitleBlock}>
            <div className={`${styles.sellerTitle} textBody`}>
              {application.brandName}
            </div>

            <div className={`${styles.sellerSubline} textCaption`}>
              ID {application.id} · user {application.userId} ·{" "}
              {formatDate(application.createdAt)}
            </div>
          </div>

          <div className={styles.sellerCardState}>
            <StatusBadge tone={getStatusTone(application.status)}>
              {formatStatus(application.status)}
            </StatusBadge>
            <span className={`${styles.sellerOpenLabel} textCaption`}>
              Открыть
            </span>
          </div>
        </div>

        {application.brandDescription ? (
          <p className={`${styles.sellerDescription} textCaption`}>
            {application.brandDescription}
          </p>
        ) : null}

        <div className={styles.sellerMetaGrid}>
          <Info label="Контакт" value={application.contactName} />
          <Info label="Телефон" value={application.phone} />
          <Info label="Email" value={application.email} />
          <Info label="Категория" value={application.category || "—"} />
        </div>
      </div>
    </article>
  );
}

function SellerApplicationDetails({
  application,
  loading,
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
    <>
      <div className={styles.detailsHeader}>
        <button
          type="button"
          className={`${styles.backBtn} textButton`}
          onClick={onBack}
        >
          Назад
        </button>

        <div className={styles.detailsTitleBlock}>
          <h1 className={`${styles.sectionTitleNoMargin} textTitle`}>
            {application.brandName}
          </h1>

          <div className={`${styles.detailsMeta} textCaption`}>
            <span>Заявка {application.id}</span>
            <span>{formatDate(application.createdAt)}</span>
            <StatusBadge tone={getStatusTone(application.status)}>
              {formatStatus(application.status)}
            </StatusBadge>
          </div>
        </div>
      </div>

      {actionMessage ? (
        <div className={`${styles.actionNotice} ${styles.actionNoticeSuccess} textSmall`}>
          {actionMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className={`${styles.actionNotice} ${styles.actionNoticeError} textSmall`}>
          {actionError}
        </div>
      ) : null}

      <div className={styles.detailsLayout}>
        <main className={styles.detailsMain}>
          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>Магазин</h2>
            <div className={styles.infoGrid}>
              <InfoRow label="Название" value={application.brandName} />
              <InfoRow label="Username" value={application.username} />
              <InfoRow label="ID пользователя" value={String(application.userId)} />
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>Контакты</h2>
            <div className={styles.infoGrid}>
              <InfoRow label="Контактное лицо" value={application.contactName} />
              <InfoRow label="Телефон" value={application.phone} />
              <InfoRow label="Email" value={application.email} />
              <InfoRow label="Telegram" value={application.telegram || "—"} />
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>Бренд</h2>
            <div className={styles.infoGrid}>
              <InfoRow label="Категория" value={application.category || "—"} />
              <InfoRow
                label="Регион производства"
                value={application.productionRegion || "—"}
              />
              <InfoRow label="Сайт" value={application.website || "—"} />
            </div>

            <div className={styles.descriptionBlock}>
              <div className={`${styles.infoLabel} textSmall`}>Описание</div>
              <p className="textSmall">
                {application.brandDescription || "Описание не заполнено"}
              </p>
            </div>

            {application.comment ? (
              <div className={styles.infoBlock}>
                <span className={`${styles.infoLabel} textSmall`}>
                  Комментарий селлера
                </span>
                <span className={`${styles.infoValue} textSmall`}>
                  {application.comment}
                </span>
              </div>
            ) : null}
          </section>

          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>
              Реквизиты
            </h2>
            <div className={`${styles.empty} textCaption`}>
              Реквизиты не переданы в заявке продавца.
            </div>
          </section>
        </main>

        <aside className={styles.detailsAside}>
          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>
              Статус
            </h2>

            <div className={styles.infoGrid}>
              <InfoRow
                label="Заявка"
                value={
                  <StatusBadge tone={getStatusTone(application.status)}>
                    {formatStatus(application.status)}
                  </StatusBadge>
                }
              />
              <InfoRow label="Создана" value={formatDate(application.createdAt)} />
              <InfoRow label="Обновлена" value={formatDate(application.updatedAt)} />
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>
              Действия
            </h2>

            <label className={styles.adminTextareaField}>
              <span className="textCaption">Комментарий администратора</span>
              <textarea
                value={adminComment}
                onChange={(event) => onAdminCommentChange(event.target.value)}
                className={`${styles.textarea} textBody`}
                rows={4}
              />
            </label>

            {application.adminComment ? (
              <div className={styles.infoBlock}>
                <span className={`${styles.infoLabel} textSmall`}>
                  Последний комментарий
                </span>
                <span className={`${styles.infoValue} textSmall`}>
                  {application.adminComment}
                </span>
              </div>
            ) : null}

            <div className={styles.detailsActions}>
              {canModerate ? (
                <>
                  <button
                    type="button"
                    className={`${styles.primaryBtn} textButton`}
                    disabled={loading}
                    onClick={onApprove}
                  >
                    {loading ? "Одобряем..." : "Одобрить"}
                  </button>

                  <button
                    type="button"
                    className={`${styles.secondaryBtn} textButton`}
                    disabled={loading || !adminComment.trim()}
                    onClick={onRequestChanges}
                  >
                    {loading ? "Отправляем..." : "Запросить правки"}
                  </button>

                  <button
                    type="button"
                    className={`${styles.dangerBtn} textButton`}
                    disabled={loading}
                    onClick={onReject}
                  >
                    {loading ? "Отклоняем..." : "Отклонить"}
                  </button>
                </>
              ) : (
                <div className={`${styles.empty} textCaption`}>
                  Действия для этого статуса недоступны.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className={`${styles.infoLabel} textSmall`}>{label}</span>
      <span className={`${styles.infoValue} textSmall`}>{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.infoRow}>
      <span className={`${styles.infoLabel} textSmall`}>{label}</span>
      <span className={`${styles.infoValue} textSmall`}>{value}</span>
    </div>
  );
}
