"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RequestError } from "../../components/ui/RequestError";

export function HomeRequestError({ partial, message }: { partial: boolean; message?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <RequestError variant={partial ? "inline" : "section"}
    message={message ?? (partial ? "Не удалось обновить часть подборок" : "Не удалось загрузить товары")}
    onRetry={() => startTransition(() => router.refresh())} loading={pending} />;
}
