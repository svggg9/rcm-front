
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

export async function getSellerOnboardingStatus(): Promise<SellerOnboardingStatus> {
  const response = await apiFetch(`${API_URL}/api/seller/onboarding-status`);

  if (!response.ok) {
    throw new Error("Не удалось загрузить готовность магазина");
  }

  return response.json();
}