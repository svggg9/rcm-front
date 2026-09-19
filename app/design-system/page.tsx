import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignSystemClient } from "./DesignSystemClient";

export const metadata: Metadata = {
  title: "Дизайн-система — рцмаркет",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <DesignSystemClient />;
}
