
import { apiFetch, API_URL } from "../../lib/api";

export type SellerOnboardingStatus = {
  applicationCompleted: boolean;
  brandCompleted: boolean;
  legalCompleted: boolean;
  agreementAccepted: boolean;
  completedSteps: number;
  totalSteps: number;
  progress: number;
};

let pendingOnboardingStatus: Promise<SellerOnboardingStatus> | null = null;

async function fetchSellerOnboardingStatus(): Promise<SellerOnboardingStatus> {
  const response = await apiFetch(`${API_URL}/api/seller/onboarding-status`);

  if (!response.ok) {
    throw new Error("Не удалось загрузить готовность магазина");
  }

  return response.json();
}

export function getSellerOnboardingStatus(): Promise<SellerOnboardingStatus> {
  if (pendingOnboardingStatus) return pendingOnboardingStatus;

  const request = fetchSellerOnboardingStatus().finally(() => {
    if (pendingOnboardingStatus === request) {
      pendingOnboardingStatus = null;
    }
  });

  pendingOnboardingStatus = request;
  return request;
}
