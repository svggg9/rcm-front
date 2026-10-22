"use client";

import type { ReactNode } from "react";
import type { SellerTab } from "../types";
import styles from "./SellerSectionPanel.module.css";

type Props = {
  currentTab: SellerTab;
  children: ReactNode;
};

export function SellerSectionPanel({ currentTab, children }: Props) {
  const framed = currentTab === "products" || currentTab === "orders" || currentTab === "returns" || currentTab === "finance";

  return <div className={framed ? styles.panel : styles.plain}>
    <div className={framed ? styles.panelBody : styles.plainBody} data-seller-section-body>{children}</div>
  </div>;
}
