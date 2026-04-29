
import styles from "../Admin.module.css";
import type { AdminSeller, SellerFilter } from "../types";

type Props = {
  sellers: AdminSeller[];
  filter: SellerFilter;
  totalElements: number;
  refreshing: boolean;
  actionSellerId: number | null;
  onFilterChange: (filter: SellerFilter) => void;
  onRefresh: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
};

const FILTERS: SellerFilter[] = ["REQUESTS", "APPROVED", "ALL"];

function formatFilter(filter: SellerFilter) {
  switch (filter) {
    case "REQUESTS":
      return "Заявки";
    case "APPROVED":
      return "Одобренные";
    case "ALL":
      return "Все";
    default:
      return filter;
  }
}

function formatSellerStatus(seller: AdminSeller) {
  if (seller.role === "SELLER" && seller.sellerApproved) {
    return "Одобрен";
  }

  if (seller.sellerRequested) {
    return "Заявка";
  }

  return "Не продавец";
}

export function AdminSellersTab({
  sellers,
  filter,
  totalElements,
  refreshing,
  actionSellerId,
  onFilterChange,
  onRefresh,
  onApprove,
  onReject,
}: Props) {
  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={styles.sectionTitleNoMargin}>Продавцы</h1>
          <div className={styles.muted}>Найдено: {totalElements}</div>
        </div>

        <button
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
            key={item}
            className={`${styles.filterBtn} ${
              filter === item ? styles.filterBtnActive : ""
            }`}
            onClick={() => onFilterChange(item)}
          >
            {formatFilter(item)}
          </button>
        ))}
      </div>

      {sellers.length === 0 ? (
        <div className={styles.empty}>Продавцов по этому фильтру нет.</div>
      ) : (
        <div className={styles.list}>
          {sellers.map((seller) => {
            const loading = actionSellerId === seller.id;
            const canApprove =
              seller.sellerRequested || seller.role !== "SELLER";
            const canReject =
              seller.sellerRequested ||
              (seller.role === "SELLER" && seller.sellerApproved);

            return (
              <article key={seller.id} className={styles.sellerCard}>
                <div className={styles.sellerMain}>
                  <div className={styles.productTop}>
                    <div>
                      <div className={styles.productTitle}>
                        {seller.displayName || seller.username}
                      </div>
                      <div className={styles.muted}>
                        ID {seller.id} · {seller.email || "Без email"} ·{" "}
                        {seller.phone || "Без телефона"}
                      </div>
                    </div>

                    <span className={styles.statusBadge}>
                      {formatSellerStatus(seller)}
                    </span>
                  </div>

                  <div className={styles.sellerMetaGrid}>
                    <div>
                      <span className={styles.infoLabel}>Username</span>
                      <span className={styles.infoValue}>{seller.username}</span>
                    </div>
                    <div>
                      <span className={styles.infoLabel}>Role</span>
                      <span className={styles.infoValue}>{seller.role}</span>
                    </div>
                    <div>
                      <span className={styles.infoLabel}>sellerRequested</span>
                      <span className={styles.infoValue}>
                        {seller.sellerRequested ? "Да" : "Нет"}
                      </span>
                    </div>
                    <div>
                      <span className={styles.infoLabel}>sellerApproved</span>
                      <span className={styles.infoValue}>
                        {seller.sellerApproved ? "Да" : "Нет"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {canApprove ? (
                      <button
                        className={styles.primaryBtn}
                        disabled={loading}
                        onClick={() => onApprove(seller.id)}
                      >
                        {loading ? "..." : "Одобрить"}
                      </button>
                    ) : null}

                    {canReject ? (
                      <button
                        className={styles.dangerBtn}
                        disabled={loading}
                        onClick={() => onReject(seller.id)}
                      >
                        {loading ? "..." : "Отклонить / снять"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}