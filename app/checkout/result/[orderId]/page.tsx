import { Suspense } from "react";

import { CheckoutResultContent } from "../page";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function CheckoutResultOrderPage({ params }: Props) {
  const { orderId } = await params;

  return (
    <Suspense fallback={null}>
      <CheckoutResultContent orderId={orderId} />
    </Suspense>
  );
}
