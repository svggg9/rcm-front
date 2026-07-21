import { isValidPhone } from "../../lib/validation";

export type CheckoutContactValues = {
  fullName: string;
  phone: string;
};

export type CheckoutDeliveryValues = {
  deliveryMethod: "COURIER" | "PICKUP";
  selectedAddressId: string;
  deliveryAddress: string;
};

export function validateContactDetails(
  values: CheckoutContactValues
): string | null {
  if (!values.fullName.trim()) {
    return "Введите ФИО";
  }

  if (!isValidPhone(values.phone)) {
    return "Укажите корректный российский номер телефона";
  }

  return null;
}

export function validateDeliveryDetails(
  values: CheckoutDeliveryValues
): string | null {
  if (values.deliveryMethod === "PICKUP") {
    if (!values.selectedAddressId.trim()) {
      return "Выберите пункт выдачи";
    }

    return null;
  }

  if (!values.deliveryAddress.trim()) {
    return "Введите адрес доставки";
  }

  return null;
}
