"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AccountFrame } from "./components/AccountFrame";
import { AccountSkeleton } from "./components/AccountSkeleton";
import { AccountInfoTab } from "./components/AccountInfoTab";
import { accountTabTitles, type AccountTab } from "./components/AccountSidebar";

function AccountLoadingContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const currentTab: AccountTab = tab && Object.hasOwn(accountTabTitles, tab) ? tab as AccountTab : "home";
  const parsedOrderId = Number(searchParams.get("orderId"));
  const orderId = currentTab === "orders" && parsedOrderId > 0 && Number.isInteger(parsedOrderId) ? parsedOrderId : null;

  return (
    <AccountFrame currentTab={currentTab} orderId={orderId}>
      {currentTab === "info" ? <AccountInfoTab /> : <AccountSkeleton variant={orderId ? "detail" : currentTab === "home" ? "profile" : currentTab} />}
    </AccountFrame>
  );
}

export default function AccountLoading() {
  return <Suspense><AccountLoadingContent /></Suspense>;
}
