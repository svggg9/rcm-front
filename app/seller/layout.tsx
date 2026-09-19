"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function SellerLayout({ children, editor }: { children: ReactNode; editor: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const closedEditor = /\/products\/\d+\/edit$/.test(previousPath.current) && pathname === "/seller";
    previousPath.current = pathname;
    if (closedEditor) router.refresh();
  }, [pathname, router]);
  return <>{children}{editor}</>;
}
