import { apiFetch, API_URL } from "../../lib/api";
import type {
  DeliveryOffersResponse,
  PickupPointSearchResponse,
} from "../types";

type SearchPickupPointsRequest = {
  location: string;
};

type GetDeliveryOffersRequest = {
  pickupPointId: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  comment?: string;
};

async function readError(response: Response, fallback: string): Promise<never> {
  const text = await response.text().catch(() => "");
  throw new Error(text || fallback);
}

export async function searchPickupPoints(
  payload: SearchPickupPointsRequest
): Promise<PickupPointSearchResponse> {
  const response = await apiFetch(`${API_URL}/api/delivery/pickup-points/search`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return readError(response, "Не удалось найти пункты выдачи");
  }

  return (await response.json()) as PickupPointSearchResponse;
}

export async function getDeliveryOffers(
  payload: GetDeliveryOffersRequest
): Promise<DeliveryOffersResponse> {
  const response = await apiFetch(`${API_URL}/api/delivery/offers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return readError(response, "Не удалось получить варианты доставки");
  }

  return (await response.json()) as DeliveryOffersResponse;
}

export async function confirmDeliveryOffer(payload: {
  orderGroupId: string;
  offerId: string;
  pickupPointId: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  priceAmount: number;
  currency: string;
  comment?: string;
}) {
  const response = await apiFetch(`${API_URL}/api/delivery/offers/confirm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось подтвердить доставку");
  }

  return response.json();
}