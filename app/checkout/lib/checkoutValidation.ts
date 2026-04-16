import type { DeliveryMethod, DeliveryOffer, PickupPoint } from "../types";

export type CheckoutContactValues = {
  email: string;
  fullName: string;
  phone: string;
};

export type CheckoutDeliveryValues = {
  deliveryMethod: DeliveryMethod;
  selectedPickupPoint: PickupPoint | null;
  selectedOffer: DeliveryOffer | null;
  deliveryAddress: string;
};

export function validateContactDetails(
  values: CheckoutContactValues
): string | null {
  if (!values.email.trim()) {
    return "Введите email";
  }

  if (!values.fullName.trim()) {
    return "Введите ФИО";
  }

  if (!values.phone.trim()) {
    return "Введите телефон";
  }

  return null;
}

export function validateDeliveryDetails(
  values: CheckoutDeliveryValues
): string | null {
  if (values.deliveryMethod === "PICKUP_POINT") {
    if (!values.selectedPickupPoint?.id) {
      return "Выберите пункт выдачи";
    }

    if (!values.selectedOffer?.offerId) {
      return "Выберите вариант доставки";
    }

    return null;
  }

  if (!values.deliveryAddress.trim()) {
    return "Введите адрес доставки";
  }

  return null;
}