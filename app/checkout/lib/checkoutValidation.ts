export type CheckoutContactValues = {
  email: string;
  fullName: string;
  phone: string;
};

export function validateContactDetails(values: CheckoutContactValues): string | null {
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

export function validateDeliveryDetails(addressId: string): string | null {
  if (!addressId.trim()) {
    return "Выберите пункт выдачи";
  }

  return null;
}