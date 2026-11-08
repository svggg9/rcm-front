"use client";

import { useCurrentUser } from "../../lib/useCurrentUser";
import { useAuthModal } from "../AuthModal/useAuthModal";
import { ActionPrompt } from "../ui/ActionPrompt";
import { Button } from "../ui/Button";

export function GuestSignInPrompt({ returnPath }: { returnPath: string }) {
  const { isGuest, loading } = useCurrentUser();
  const { openAuth } = useAuthModal();
  if (loading || !isGuest) return null;

  return <ActionPrompt hint="Есть аккаунт?">
    <Button type="button" variant="ghost" reserveLabelSpace={false} onClick={() => openAuth("login", returnPath)}>Войти</Button>
  </ActionPrompt>;
}
