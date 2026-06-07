export type SellerApplicationStatus = "NEW" | "APPROVED" | "REJECTED";

export type SellerApplication = {
  id: number;
  userId: number;
  username: string;
  brandName: string;
  brandDescription: string | null;
  category: string | null;
  productionRegion: string | null;
  website: string | null;
  telegram: string | null;
  contactName: string;
  phone: string;
  email: string;
  comment: string | null;
  status: SellerApplicationStatus;
  adminComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SellerApplicationForm = {
  brandName: string;
  brandDescription: string;
  category: string;
  productionRegion: string;
  website: string;
  telegram: string;
  contactName: string;
  phone: string;
  email: string;
  comment: string;
};