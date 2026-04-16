export type CheckoutContactValues = {
  email: string;
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