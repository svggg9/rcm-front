"use client";

import { useEffect, useMemo, useState } from "react";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { RequestError } from "../../components/ui/RequestError";
import { SupportChatView } from "../../components/support/SupportChatView";
import { publicSupportTransport, SUPPORT_ACCESS_KEY, SUPPORT_ACCESS_PATTERN } from "../../lib/supportChat";
import styles from "../../components/support/SupportChatView.module.css";

export function PublicSupportChat() {
  const [access, setAccess] = useState<{ token: string; namespace: string } | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let generation = 0;
    async function capture() {
      const current = ++generation;
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      let token = fragment.get("access");
      if (fragment.has("access")) {
        setAccess(null); setReady(false);
        // Remove capability from the address bar after capture; never copy it into navigation.
        history.replaceState(history.state, "", `${location.pathname}${location.search}`);
        try { if (token && SUPPORT_ACCESS_PATTERN.test(token)) sessionStorage.setItem(SUPPORT_ACCESS_KEY, token); else sessionStorage.removeItem(SUPPORT_ACCESS_KEY); } catch { /* View stays usable, sending requires writable draft storage. */ }
      } else { try { token = sessionStorage.getItem(SUPPORT_ACCESS_KEY); } catch { token = null; } }
      if (!token || !SUPPORT_ACCESS_PATTERN.test(token)) { setAccess(null); setReady(true); return; }
      let bytes: ArrayBuffer;
      try { bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)); }
      catch { if (current === generation) { setAccess(null); setReady(true); } return; }
      if (current !== generation) return;
      const namespace = `public:${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("")}`;
      setAccess({ token, namespace }); setReady(true);
    }
    void capture(); window.addEventListener("hashchange", capture);
    return () => { generation++; window.removeEventListener("hashchange", capture); };
  }, []);
  const transport = useMemo(() => access ? publicSupportTransport(access.token) : null, [access]);
  return <main className={styles.public}>
    {!ready ? <CabinetSkeleton variant="list" rows={3} compact /> : access && transport
      ? <SupportChatView key={access.namespace} transport={transport} storageNamespace={access.namespace} />
      : <RequestError message="Для входа в диалог нужна персональная ссылка" text="Запросите новую ссылку в Telegram-боте" />}
  </main>;
}
