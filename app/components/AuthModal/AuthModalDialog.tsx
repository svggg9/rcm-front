"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm, AUTH_ENTRY_TITLE } from "../Auth/AuthForm";
import authStyles from "../Auth/AuthForm.module.css";
import { Dialog } from "../ui/Dialog";
import { safeReturnPath } from "../../lib/safeReturnPath";
import type { AuthModalMode, AuthModalOptions } from "./useAuthModal";

type Props = {
  initialMode: AuthModalMode;
  placement: NonNullable<AuthModalOptions["placement"]>;
  returnPath: string;
  onClose: () => void;
};

export default function AuthModalDialog({ returnPath, onClose }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <Dialog title={AUTH_ENTRY_TITLE} className={authStyles.dialog} actions={null} busy={busy} onClose={onClose}>
    <AuthForm next={returnPath} showEntryTitle={false} onBusyChange={setBusy} onAuthenticated={() => {
      onClose();
      if (returnPath !== "/") router.push(safeReturnPath(returnPath));
      router.refresh();
    }} />
  </Dialog>;
}
