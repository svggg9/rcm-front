"use client";
import type { SellerOnboardingStatus } from "../lib/sellerOnboardingApi";
import type { SellerBrand, SellerDashboardSummary } from "../types";
import { SellerOverview } from "./SellerOverview";
import { SellerNextActions } from "./SellerNextActions";
import styles from "./SellerHomeTab.module.css";
type Props = {
  active?: boolean; brand: SellerBrand | null; summary: SellerDashboardSummary | null;
  onboardingStatus: SellerOnboardingStatus | null; onboardingLoading?: boolean;
  onboardingError?: boolean; onRetryOnboarding?: () => void;
  onNavigate: (href: string) => void; onCreateProduct: () => void;
};
export function SellerHomeTab({ active = true, brand, summary, onboardingStatus, onNavigate, onCreateProduct }: Props) {
  return <section className={styles.page} aria-label="Обзор магазина">
    <SellerNextActions />
    <SellerOverview active={active} brand={brand} summary={summary} onboarding={onboardingStatus} onNavigate={onNavigate} onCreateProduct={onCreateProduct} />
  </section>;
}
