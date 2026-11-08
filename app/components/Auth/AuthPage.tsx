"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeReturnPath } from "../../lib/safeReturnPath";
import { AuthForm, AUTH_ENTRY_TITLE } from "./AuthForm";
import styles from "./AuthPage.module.css";

function AuthPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeReturnPath(params.get("next"));
  return <div className="pageContainer"><div className={styles.page}>
    <div className={styles.content}>
      <h1 className="visuallyHidden">{AUTH_ENTRY_TITLE}</h1>
      <AuthForm next={next} onAuthenticated={() => { router.replace(next); router.refresh(); }} />
    </div>
  </div></div>;
}

export function AuthPage() {
  return <Suspense fallback={null}><AuthPageContent /></Suspense>;
}
