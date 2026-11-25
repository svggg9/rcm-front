"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "../../../lib/config";
import { partnerOrigin, storefrontOrigin } from "../../../lib/partnerSso";
import { RequestError } from "../../../components/ui/RequestError";

export function AuthorizePartnerSso() {
  const params = useSearchParams();
  const started = useRef(-1);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;
    async function authorize() {
      const partner = partnerOrigin();
      const shop = storefrontOrigin();
      const challenge = params.get("challenge") || "";
      if (!partner || !shop || window.location.origin !== shop || partner === shop || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new Error();
      const session = await fetch(`${API_URL}/api/auth/session`, { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (session.status === 204) {
        const next = `/auth/sso/authorize?challenge=${encodeURIComponent(challenge)}`;
        window.location.replace(`/auth/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (session.status !== 200) throw new Error();
      const response = await fetch(`${API_URL}/api/auth/partner-sso/issue`, {
        method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge }), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
      const data: unknown = await response.json();
      const code = data && typeof data === "object" && "code" in data ? data.code : null;
      if (typeof code !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(code)) throw new Error();
      window.location.replace(`${partner}/auth/sso/complete#code=${code}`);
    }
    void authorize().catch(() => setError(true));
  }, [attempt, params]);
  return <main className="pageContainer">{error ? <RequestError message="Не удалось подтвердить вход в кабинет"
    text="Попробуйте ещё раз" onRetry={() => { setError(false); setAttempt(value => value + 1); }} /> : <p>Подтверждаем вход…</p>}</main>;
}
