"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RequestError } from "./components/ui/RequestError";
import { getClientSession } from "./lib/client-session";

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div className="pageContainer">
    <RequestError message="Не удалось загрузить страницу" text="Попробуйте ещё раз немного позже"
      loading={pending} onRetry={() => startTransition(() => {
        void getClientSession({ force: true }).catch(() => undefined);
        router.refresh();
        reset();
      })} />
  </div>;
}
