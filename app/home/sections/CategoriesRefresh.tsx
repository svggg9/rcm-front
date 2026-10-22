"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeCategoriesChanged } from "../../lib/categoryEvents";

/** Keep server-rendered homepage links current after dictionary changes in this or another tab. */
export function CategoriesRefresh() {
  const router = useRouter();
  useEffect(() => subscribeCategoriesChanged(() => router.refresh()), [router]);
  return null;
}
