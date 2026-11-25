"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { partnerOrigin, sellerReturnPath, storefrontOrigin } from "../../../lib/partnerSso";

export function StartPartnerSso() {
  const params = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function start() {
      const partner = partnerOrigin();
      const shop = storefrontOrigin();
      if (!partner || !shop || window.location.origin !== partner || partner === shop) throw new Error();
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const verifier = base64url(bytes);
      const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
      sessionStorage.setItem("rcm_partner_sso", JSON.stringify({ verifier, next: sellerReturnPath(params.get("next")) }));
      window.location.replace(`${shop}/auth/sso/authorize?challenge=${encodeURIComponent(challenge)}`);
    }
    void start().catch(() => setError(true));
  }, [params]);
  return <main className="pageContainer">{error ? <p role="alert">Не удалось начать вход в кабинет. Попробуйте ещё раз</p> : <p>Входим в кабинет…</p>}</main>;
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
