"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/Button";
import type { ProductActionFailure } from "../lib/sellerProductActions";
import { groupProductFailures, productFailureDestination } from "../lib/sellerProductFeedback";
import styles from "./SellerProductsTab.module.css";

export function ProductFailureGroups({ failures, disabled = false, onNavigate }: {
  failures: ProductActionFailure[];
  disabled?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  return <ul className={styles.failureList}>
    {groupProductFailures(failures).map(group => {
      const destinations = group.failures.map(productFailureDestination);
      const destination = destinations[0];
      const sharedDestination = !destination.href.endsWith("/edit")
        && destinations.every(item => item.href === destination.href && item.refresh === destination.refresh);
      return <li key={group.reason}>
        <strong>{group.reason}</strong>
        <p className={styles.failureCount}>Товаров: {group.failures.length}</p>
        <ul className={styles.failureProducts}>
          {group.failures.map((failure, index) => <li key={failure.product.id}>
            {sharedDestination ? failure.product.title.trim() || "Без названия" :
              <Link href={destinations[index].href} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : undefined}
                onClick={event => { if (disabled) event.preventDefault(); else onNavigate?.(); }}>
                {failure.product.title.trim() || "Без названия"}
              </Link>}
          </li>)}
        </ul>
        {sharedDestination ? destination.refresh ?
          <Button variant="tertiary" disabled={disabled} onClick={() => { onNavigate?.(); router.refresh(); }}>
            {destination.label}
          </Button> :
          <Link href={destination.href} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : undefined}
            onClick={event => { if (disabled) event.preventDefault(); else onNavigate?.(); }}>{destination.label}</Link>
          : null}
      </li>;
    })}
  </ul>;
}
