"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RequestError } from "../../components/ui/RequestError";

export default function ProductPageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div className="pageContainer">
    <RequestError message="Не удалось загрузить товар" text="Попробуйте ещё раз немного позже"
      loading={pending} onRetry={() => startTransition(() => {
        router.refresh();
        reset();
      })} />
  </div>;
}
