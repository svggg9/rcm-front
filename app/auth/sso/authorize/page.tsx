import { Suspense } from "react";
import { AuthorizePartnerSso } from "../ui/AuthorizePartnerSso";

export default function Page() {
  return <Suspense fallback={null}><AuthorizePartnerSso /></Suspense>;
}
