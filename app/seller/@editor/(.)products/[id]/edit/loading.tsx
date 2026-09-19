"use client";

import { useRouter } from "next/navigation";
import { EditorSurface } from "../../../../../components/ui/EditorSurface";

export default function Loading() {
  const router = useRouter();
  return <EditorSurface title="Товар" onClose={() => router.back()}>
    <div role="status" aria-label="Загружаем товар" aria-busy="true"><span className="buttonLoader" aria-hidden="true" /></div>
  </EditorSurface>;
}
