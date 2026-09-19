import { notFound } from "next/navigation";
import { PanelsPreview } from "./PanelsPreview";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <PanelsPreview />;
}
