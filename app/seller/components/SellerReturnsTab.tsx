"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { DesignSystemIcon } from "../../components/ui/DesignSystemIcon";
import { EmptyState } from "../../components/ui/EmptyState";
import { PopoverPanel } from "../../components/ui/PopoverPanel";
import { RequestError } from "../../components/ui/RequestError";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { TextInput } from "../../components/ui/TextInput";
import linkedRow from "../../components/ui/LinkedListRow.module.css";
import listStyles from "../../components/ui/CabinetListLayout.module.css";
import { getSellerReturns, returnReasonLabels, returnStatusLabels, type SellerReturnListItem } from "../../lib/returns";
import { filterSellerReturns, parseSellerReturnGroup, sellerReturnSegments } from "../lib/sellerReturnListPresentation";
import styles from "./SellerReturnsTab.module.css";

const PAGE_SIZE = 20;

export function SellerReturnsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const group = parseSellerReturnGroup(searchParams.get("group"));
  const query = searchParams.get("q") ?? "";
  const [searchOpen, setSearchOpen] = useState(false);
  const searchId = useId();
  const searchToggle = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [requests, setRequests] = useState<SellerReturnListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<"initial" | "more" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadingMoreRef = useRef(false);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  function replaceQuery(next: URLSearchParams) {
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  function updateQuery(key: "group" | "q", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value && !(key === "group" && value === "all")) next.set(key, value);
    else next.delete(key);
    replaceQuery(next);
  }

  useEffect(() => {
    const controller = new AbortController();
    void getSellerReturns({ size: PAGE_SIZE, signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setError(null); setRequests(result.items); setTotalItems(result.totalItems);
      setNextPage(result.page + 1); setHasMore(result.page + 1 < result.totalPages);
    }).catch(() => {
      if (!controller.signal.aborted) setError("initial");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => { controller.abort(); loadMoreControllerRef.current?.abort(); };
  }, [attempt]);

  useEffect(() => {
    const changed = (event: Event) => {
      const updated = (event as CustomEvent<SellerReturnListItem>).detail;
      setRequests(current => current.map(item => item.id === updated.id ? updated : item));
    };
    window.addEventListener("seller-return-updated", changed);
    return () => window.removeEventListener("seller-return-updated", changed);
  }, []);

  async function loadMore() {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true; setLoadingMore(true);
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    try {
      const result = await getSellerReturns({ page: nextPage, size: PAGE_SIZE, signal: controller.signal });
      if (controller.signal.aborted) return;
      setRequests(current => {
        const existingIds = new Set(current.map(item => item.id));
        return [...current, ...result.items.filter(item => !existingIds.has(item.id))];
      });
      setError(null); setTotalItems(result.totalItems);
      setNextPage(result.page + 1); setHasMore(result.page + 1 < result.totalPages);
    } catch {
      if (!controller.signal.aborted) setError("more");
    } finally {
      loadingMoreRef.current = false;
      if (loadMoreControllerRef.current === controller) loadMoreControllerRef.current = null;
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  const visibleRequests = useMemo(() => filterSellerReturns(requests, group, query), [requests, group, query]);
  const filtered = group !== "all" || Boolean(query.trim());

  return <section className={`${listStyles.page} ${styles.page}`}>
    <SectionHeader title="Возвраты" large className={listStyles.heading} />
    <div className={listStyles.toolbar}>
      <div className={listStyles.segments}>
        <SegmentedControl items={sellerReturnSegments} value={group} ariaLabel="Состояние возвратов" onChange={next => updateQuery("group", next)} />
      </div>
      <div className={listStyles.tools}>
        <Button ref={searchToggle} variant="secondary" className={`${listStyles.iconButton} ${searchOpen || query ? listStyles.iconButtonActive : ""}`}
          aria-label="Поиск возвратов" title={query ? `Поиск: ${query}` : "Поиск"} aria-haspopup="dialog" aria-expanded={searchOpen} aria-controls={searchId}
          onClick={() => setSearchOpen(value => !value)}><DesignSystemIcon name="search" role="utility" /></Button>
      </div>
      <PopoverPanel id={searchId} title="Поиск возвратов" open={searchOpen} onClose={() => setSearchOpen(false)} anchorRef={searchToggle} initialFocusRef={searchInput}>
        <div className={listStyles.search}>
          <TextInput ref={searchInput} label="Номер возврата, заказа или товар" hideLabel type="search" placeholder="Номер возврата, заказа или товар"
            maxLength={200} value={query} onChange={event => updateQuery("q", event.target.value)} />
          <p className={listStyles.caption}>Поиск по загруженным возвратам</p>
          {query ? <Button variant="tertiary" onClick={() => updateQuery("q", "")}>Сбросить поиск</Button> : null}
        </div>
      </PopoverPanel>
    </div>
    {loading && !error && !requests.length ? <CabinetSkeleton variant="list" rows={3} compact /> : null}
    {requests.length ? <p className={listStyles.caption} role="status">
      {filtered ? `Найдено ${visibleRequests.length} из ${requests.length} загруженных` : `Загружено ${requests.length} из ${totalItems}`}
      {hasMore ? " | Поиск и группы по загруженной части" : ""}
    </p> : null}
    {!loading && !error && !requests.length ? <EmptyState title="У вас пока нет возвратов" /> : null}
    {visibleRequests.length ? <div className={styles.list} role="region" aria-label="Список возвратов">
      {visibleRequests.map(request => <article className={`${styles.card} ${linkedRow.row}`} key={request.id} id={`return-${request.id}`} tabIndex={-1}>
        <div className={styles.header}>
          <div><Link href={`/seller/returns/${request.id}`} scroll={false} prefetch={false} className={`${styles.returnLink} ${linkedRow.link}`}
            aria-label={`Открыть возврат №${request.id}`}>Возврат №{request.id}</Link><span>Заказ №{request.orderId}</span></div>
          <StatusBadge tone={request.status === "REJECTED" ? "danger"
            : request.status === "RECEIVED" || request.status === "REQUESTED" || request.status === "SUBMITTED" ? "warning"
            : request.status === "PARTIALLY_REFUNDED" || request.status === "REFUNDED" || request.status === "CLOSED" ? "success" : "default"}>
            {returnStatusLabels[request.status]}
          </StatusBadge>
        </div>
        <p className={styles.productTitle}>{request.productTitle}</p>
        <dl className={styles.details}>
          <div><dt>Причина</dt><dd>{returnReasonLabels[request.reason]}</dd></div>
          <div><dt>Количество</dt><dd>{request.quantity} шт</dd></div>
          {request.cdekNumber ? <div><dt>Накладная СДЭК</dt><dd>{request.cdekNumber}</dd></div> : null}
        </dl>
      </article>)}
    </div> : null}
    {!loading && !error && requests.length > 0 && !visibleRequests.length ? <EmptyState title="Возвраты не найдены"
      text={hasMore ? "Измените условия или загрузите следующие возвраты" : "Измените условия поиска или выберите другую группу"}
      actions={<Button variant="secondary" onClick={() => {
        const next = new URLSearchParams(searchParams.toString()); next.delete("q"); next.delete("group"); replaceQuery(next);
      }}>Сбросить условия</Button>} /> : null}
    {error ? <RequestError message={error === "more" ? "Не удалось загрузить следующие возвраты" : "Не удалось загрузить возвраты"}
      variant={requests.length ? "inline" : "section"} loading={loading || loadingMore} onRetry={() => {
        if (error === "more") { void loadMore(); return; }
        setLoading(true); setAttempt(value => value + 1);
      }} /> : null}
    {hasMore && !error ? <div className={styles.loadMore}><Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>Показать ещё</Button></div> : null}
  </section>;
}
