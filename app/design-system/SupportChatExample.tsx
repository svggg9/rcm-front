"use client";

import { useMemo, useState } from "react";
import { SupportChatView } from "../components/support/SupportChatView";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import type { SupportChat, SupportMessage, SupportTransport } from "../lib/supportChat";
import styles from "./StorefrontPatterns.module.css";

function createExampleTransport(admin: boolean): SupportTransport {
  let chat: SupportChat = { id: 1, name: "Покупатель", telegramUsername: null, status: "IN_PROGRESS",
    createdAt: "2026-11-07T10:00:00Z", updatedAt: "2026-11-07T10:02:00Z", lastMessage: null };
  let messages: SupportMessage[] = [
    { id: 1, direction: "CUSTOMER", body: "Здравствуйте, подскажите по доставке", authorName: null, createdAt: "2026-11-07T10:00:00Z", legacyDeliveryStatus: null },
    { id: 2, direction: "SUPPORT", body: "Здравствуйте! Поможем с вашим вопросом", authorName: "Поддержка", createdAt: "2026-11-07T10:02:00Z", legacyDeliveryStatus: null },
  ];
  return {
    history: async () => ({ chat, messages: [...messages], nextBeforeId: null }),
    send: async body => {
      const message: SupportMessage = { id: Date.now(), direction: admin ? "SUPPORT" : "CUSTOMER", body, authorName: admin ? "Поддержка" : null, createdAt: new Date().toISOString(), legacyDeliveryStatus: null };
      messages = [...messages, message];
      return message;
    },
    updateStatus: async status => { chat = { ...chat, status, updatedAt: new Date().toISOString() }; return chat; },
  };
}

export function SupportChatExample() {
  const [audience, setAudience] = useState("customer");
  const transports = useMemo(() => ({ customer: createExampleTransport(false), admin: createExampleTransport(true) }), []);
  return <section className={styles.patterns} aria-labelledby="ds-support-chat">
    <h3 id="ds-support-chat">Диалог с поддержкой</h3>
    <p className="textHint">Рабочий SupportChatView с условными сообщениями и локальным ответом. Реальная отправка не выполняется</p>
    <SegmentedControl ariaLabel="Вид чата поддержки" value={audience} onChange={setAudience} items={[
      { value: "customer", label: "Покупатель" }, { value: "admin", label: "Администратор" },
    ]} />
    <div className={styles.support}><SupportChatView key={audience} transport={audience === "admin" ? transports.admin : transports.customer} storageNamespace={`design-system:${audience}`} admin={audience === "admin"} /></div>
  </section>;
}
