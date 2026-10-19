import { redirect } from "next/navigation";

export default async function LegacyPaymentReturn({ params }: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  redirect(/^[1-9]\d*$/.test(orderId)
    ? `/account?tab=orders&orderId=${encodeURIComponent(orderId)}`
    : "/account?tab=orders");
}
