import { Suspense } from "react";
import { StartPartnerSso } from "../ui/StartPartnerSso";

export default function Page() {
  return <Suspense fallback={null}><StartPartnerSso /></Suspense>;
}
