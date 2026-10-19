import { redirect } from "next/navigation";

export default async function LegacyPaymentReturn({ searchParams }: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  redirect(orderId && /^[1-9]\d*$/.test(orderId)
    ? `/account?tab=orders&orderId=${encodeURIComponent(orderId)}`
    : "/account?tab=orders");
}
