"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL } from "../../../lib/config";
import { partnerOrigin, sellerReturnPath } from "../../../lib/partnerSso";

export function CompletePartnerSso() {
  const started = useRef(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
    async function complete() {
      const code = fragment.get("code") || "";
      const origin = partnerOrigin();
      if (!origin || window.location.origin !== origin || !/^[A-Za-z0-9_-]{43}$/.test(code)) throw new Error();
      const saved = sessionStorage.getItem("rcm_partner_sso");
      sessionStorage.removeItem("rcm_partner_sso");
      const state: unknown = saved ? JSON.parse(saved) : null;
      if (!state || typeof state !== "object" || !("verifier" in state) || typeof state.verifier !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(state.verifier)) throw new Error();
      const next = "next" in state && typeof state.next === "string" ? sellerReturnPath(state.next) : "/seller/home";
      const response = await fetch(`${API_URL}/api/auth/partner-sso/redeem`, {
        method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, verifier: state.verifier }), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
      window.location.replace(next);
    }
    void complete().catch(() => setError(true));
  }, []);
  return <main className="pageContainer">{error ? <p role="alert">Не удалось завершить вход в кабинет. Откройте кабинет заново</p> : <p>Завершаем вход…</p>}</main>;
}
