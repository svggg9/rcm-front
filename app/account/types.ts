export type Me = {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  birthDate: string | null;
  gender: "men" | "women" | null;
  email: string | null;
  emailVerified?: boolean;
  displayName: string | null;
  role: string;
  sellerApproved: boolean;
  phone: string | null;
  defaultDeliveryAddress: string | null;
  defaultDeliveryMethod: string | null;
  defaultDeliveryCountryCode: string | null;
  defaultDeliveryCityCode: number | null;
  defaultDeliveryCityName: string | null;
  defaultDeliveryApartment: string | null;
  defaultDeliveryFloor: string | null;
  defaultDeliveryIntercom: string | null;
};

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
};

export type { Order, OrderItem, OrderDeliveryInfo, OrderStatus, PaymentStatus, DeliveryStatus, OrderListItem } from "../lib/order-contract";

export type OrderItemPreview = { imageUrl?: string | null };
