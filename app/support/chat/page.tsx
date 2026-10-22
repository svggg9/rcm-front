import type { Metadata } from "next";
import { PublicSupportChat } from "./PublicSupportChat";

export const metadata: Metadata = { title: "Диалог с поддержкой — рцмаркет", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function SupportChatPage() { return <PublicSupportChat />; }
