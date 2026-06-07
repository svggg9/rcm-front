export const SELLER_ONBOARDING_EVENT = "seller:onboarding-changed";

export function emitSellerOnboardingChanged() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(SELLER_ONBOARDING_EVENT));
}