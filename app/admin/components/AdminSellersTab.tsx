import styles from "../Admin.module.css";

import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";

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
  onStatusChange: (status: SellerApplicationStatus | "ALL") => void;
  onRefresh: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
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
      return "Отклонённые";
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
  onStatusChange,
  onRefresh,
  onApprove,
  onReject,
}: Props) {
  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={styles.sectionTitleNoMargin}>Заявки продавцов</h1>
          <div className={styles.muted}>Найдено: {totalElements}</div>
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Обновляем…" : "Обновить"}
        </button>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((item) => (
          <button
            type="button"
            key={item}
            className={`${styles.filterBtn} ${
              status === item ? styles.filterBtnActive : ""
            }`}
            onClick={() => onStatusChange(item)}
          >
            {formatFilter(item)}
          </button>
        ))}
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="Заявок нет"
          text="По выбранному фильтру ничего не найдено."
        />
      ) : (
        <div className={styles.list}>
          {applications.map((application) => {
            const loading = actionApplicationId === application.id;
            const canModerate = application.status === "NEW";

            return (
              <article key={application.id} className={styles.sellerCard}>
                <div className={styles.sellerMain}>
                  <div className={styles.productTop}>
                    <div>
                      <div className={styles.productTitle}>
                        {application.brandName}
                      </div>

                      <div className={styles.muted}>
                        ID {application.id} · user {application.userId} ·{" "}
                        {formatDate(application.createdAt)}
                      </div>
                    </div>

                    <StatusBadge tone={getStatusTone(application.status)}>
                      {formatStatus(application.status)}
                    </StatusBadge>
                  </div>

                  {application.brandDescription ? (
                    <p className={styles.muted}>
                      {application.brandDescription}
                    </p>
                  ) : null}

                  <div className={styles.sellerMetaGrid}>
                    <Info label="Username" value={application.username} />
                    <Info label="Контакт" value={application.contactName} />
                    <Info label="Email" value={application.email} />
                    <Info label="Телефон" value={application.phone} />
                    <Info
                      label="Категория"
                      value={application.category || "—"}
                    />
                    <Info
                      label="Регион"
                      value={application.productionRegion || "—"}
                    />
                    <Info label="Сайт" value={application.website || "—"} />
                    <Info
                      label="Telegram"
                      value={application.telegram || "—"}
                    />
                  </div>

                  {application.comment ? (
                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>Комментарий</span>
                      <span className={styles.infoValue}>
                        {application.comment}
                      </span>
                    </div>
                  ) : null}

                  {application.adminComment ? (
                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>
                        Комментарий администратора
                      </span>
                      <span className={styles.infoValue}>
                        {application.adminComment}
                      </span>
                    </div>
                  ) : null}

                  {canModerate ? (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={loading}
                        onClick={() => onApprove(application.id)}
                      >
                        {loading ? "..." : "Одобрить"}
                      </button>

                      <button
                        type="button"
                        className={styles.dangerBtn}
                        disabled={loading}
                        onClick={() => onReject(application.id)}
                      >
                        {loading ? "..." : "Отклонить"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}