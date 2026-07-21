import styles from "./CabinetSkeleton.module.css";

export type CabinetSkeletonVariant =
  | "dashboard"
  | "list"
  | "detail"
  | "form"
  | "grid";

type SkeletonProps = {
  variant?: CabinetSkeletonVariant;
  rows?: number;
  compact?: boolean;
};

type PageSkeletonProps = SkeletonProps & {
  showPageHeader?: boolean;
  narrowSidebar?: boolean;
};

export function CabinetSkeleton({
  variant = "list",
  rows = 4,
  compact = false,
}: SkeletonProps) {
  return (
    <div
      className={`${styles.content} ${compact ? styles.compact : ""}`}
      role="status"
      aria-label="Загрузка"
      aria-busy="true"
    >
      <span className={styles.srOnly}>Загрузка</span>
      {variant === "dashboard" ? <DashboardSkeleton /> : null}
      {variant === "list" ? <ListSkeleton rows={rows} /> : null}
      {variant === "detail" ? <DetailSkeleton /> : null}
      {variant === "form" ? <FormSkeleton /> : null}
      {variant === "grid" ? <GridSkeleton rows={rows} /> : null}
    </div>
  );
}

export function CabinetPageSkeleton({
  variant = "dashboard",
  rows = 4,
  showPageHeader = false,
  narrowSidebar = false,
}: PageSkeletonProps) {
  return (
    <div className="pageContainer">
      <div className={styles.page}>
        {showPageHeader ? (
          <div className={styles.pageHeader}>
            <Block className={styles.pageTitle} />
            <Block className={styles.pageAction} />
          </div>
        ) : null}

        <div
          className={`${styles.layout} ${narrowSidebar ? styles.narrowSidebar : ""}`}
        >
          <SidebarSkeleton />
          <CabinetSkeleton variant={variant} rows={rows} />
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <aside className={styles.sidebar} aria-hidden="true">
      <Block className={styles.sidebarTitle} />
      <div className={styles.sidebarItems}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div className={styles.sidebarItem} key={index}>
            <Block className={styles.sidebarIcon} />
            <Block className={styles.sidebarLine} />
          </div>
        ))}
      </div>
    </aside>
  );
}

function DashboardSkeleton() {
  return (
    <div className={styles.dashboard} aria-hidden="true">
      <SkeletonHeader />
      <div className={styles.widgetGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div className={styles.widget} key={index}>
            <Block className={styles.widgetIcon} />
            <Block className={styles.widgetLabel} />
            <Block className={styles.widgetValue} />
            <Block className={styles.widgetMeta} />
          </div>
        ))}
      </div>
      <div className={styles.dashboardBand}>
        <Block className={styles.bandLabel} />
        <Block className={styles.bandValue} />
        <Block className={styles.bandMeta} />
      </div>
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className={styles.list} aria-hidden="true">
      <SkeletonHeader />
      <div className={styles.tabs}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Block className={styles.tab} key={index} />
        ))}
      </div>
      <div className={styles.rows}>
        {Array.from({ length: rows }).map((_, index) => (
          <div className={styles.row} key={index}>
            <Block className={styles.rowMedia} />
            <div className={styles.rowMain}>
              <Block className={styles.rowTitle} />
              <Block className={styles.rowLine} />
              <Block className={styles.rowLineShort} />
            </div>
            <div className={styles.rowAside}>
              <Block className={styles.rowBadge} />
              <Block className={styles.rowAmount} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className={styles.detail} aria-hidden="true">
      <Block className={styles.back} />
      <div className={styles.detailHeader}>
        <div>
          <Block className={styles.detailTitle} />
          <Block className={styles.detailMeta} />
        </div>
        <Block className={styles.detailBadge} />
      </div>
      <div className={styles.detailBody}>
        <section className={styles.detailSection}>
          <Block className={styles.sectionLabel} />
          {Array.from({ length: 3 }).map((_, index) => (
            <div className={styles.detailRow} key={index}>
              <Block className={styles.detailMedia} />
              <div className={styles.detailRowText}>
                <Block className={styles.detailRowTitle} />
                <Block className={styles.detailRowLine} />
              </div>
              <Block className={styles.detailPrice} />
            </div>
          ))}
        </section>
        <div className={styles.detailColumns}>
          <DetailFacts />
          <DetailFacts />
        </div>
      </div>
    </div>
  );
}

function DetailFacts() {
  return (
    <section className={styles.facts}>
      <Block className={styles.sectionLabel} />
      {Array.from({ length: 4 }).map((_, index) => (
        <div className={styles.fact} key={index}>
          <Block className={styles.factLabel} />
          <Block className={styles.factValue} />
        </div>
      ))}
    </section>
  );
}

function FormSkeleton() {
  return (
    <div className={styles.form} aria-hidden="true">
      <SkeletonHeader />
      <div className={styles.formSection}>
        <Block className={styles.sectionLabel} />
        <div className={styles.fields}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div className={styles.field} key={index}>
              <Block className={styles.fieldLabel} />
              <Block className={styles.fieldInput} />
            </div>
          ))}
        </div>
        <Block className={styles.formButton} />
      </div>
    </div>
  );
}

function GridSkeleton({ rows }: { rows: number }) {
  const items = Math.max(4, rows);

  return (
    <div className={styles.productGrid} aria-hidden="true">
      {Array.from({ length: items }).map((_, index) => (
        <div className={styles.product} key={index}>
          <Block className={styles.productMedia} />
          <Block className={styles.productBrand} />
          <Block className={styles.productTitle} />
          <Block className={styles.productPrice} />
        </div>
      ))}
    </div>
  );
}

function SkeletonHeader() {
  return (
    <div className={styles.contentHeader} aria-hidden="true">
      <div>
        <Block className={styles.contentTitle} />
        <Block className={styles.contentMeta} />
      </div>
      <Block className={styles.contentAction} />
    </div>
  );
}

function Block({ className }: { className: string }) {
  return <div className={`${styles.block} ${className}`} />;
}
