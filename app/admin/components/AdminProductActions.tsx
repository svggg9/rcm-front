"use client";

import { useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Textarea } from "../../components/ui/Textarea";
import { RequestError } from "../../components/ui/RequestError";
import type { ProductStatus } from "../types";

export function AdminProductActions({ title, status, busy, onApprove, onBlock, onUnblock }: {
  title: string; status: ProductStatus; busy: boolean;
  onApprove: () => Promise<void>; onBlock: (reason: string) => Promise<void>; onUnblock: () => Promise<void>;
}) {
  const [blocking, setBlocking] = useState(false); const [reason, setReason] = useState("");
  const [pending, setPending] = useState(""); const [error, setError] = useState(""); const inFlight = useRef(false);
  async function run(action: string, callback: () => Promise<void>) {
    if (busy || inFlight.current) return;
    inFlight.current = true; setPending(action); setError("");
    try { await callback(); setBlocking(false); setReason(""); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Не удалось выполнить действие"); }
    finally { inFlight.current = false; setPending(""); }
  }
  const disabled = busy || !!pending;
  return <>
    {status === "MODERATION" && <Button variant="primary" disabled={disabled} loading={pending === "approve"} onClick={() => void run("approve",onApprove)}>Одобрить</Button>}
    {status === "BLOCKED" ? <Button variant="secondary" disabled={disabled} loading={pending === "unblock"} onClick={() => void run("unblock",onUnblock)}>Вернуть в черновик</Button>
      : <Button variant="danger" disabled={disabled} onClick={() => { setError(""); setBlocking(true); }}>Заблокировать</Button>}
    {!blocking && error && <RequestError variant="inline" message={error} />}
    {blocking && <Dialog title="Заблокировать товар" busy={!!pending} onClose={() => setBlocking(false)} actions={<>
      <Button variant="secondary" disabled={disabled} onClick={() => setBlocking(false)}>Отмена</Button>
      <Button variant="primary" disabled={disabled || !reason.trim()} loading={pending === "block"} onClick={() => void run("block",() => onBlock(reason.trim()))}>Заблокировать</Button>
    </>}><p>{title} исчезнет из продажи. После разблокировки товар перейдёт в черновик</p>
      <Textarea label="Причина блокировки" required maxLength={1000} value={reason} disabled={disabled} onChange={event => setReason(event.target.value)} />
      {error && <RequestError variant="inline" message={error} />}
    </Dialog>}
  </>;
}
