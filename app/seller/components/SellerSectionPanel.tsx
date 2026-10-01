"use client";

import type { ReactNode } from "react";
import type { SellerTab } from "../types";
import { SellerSectionTabs } from "./SellerSidebar";
import styles from "./SellerSectionPanel.module.css";

type Props = {
  currentTab: SellerTab;
  children: ReactNode;
};

export function SellerSectionPanel({ currentTab, children }: Props) {
  const framed = currentTab === "products" || currentTab === "orders" || currentTab === "returns" || currentTab === "finance";

  return <div className={framed ? styles.panel : styles.plain}>
    {framed ? <SellerSectionTabs currentTab={currentTab} /> : null}
    <div className={framed ? styles.panelBody : styles.plainBody}>{children}</div>
  </div>;
}
