"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AuthModalContext,
  type AuthModalMode,
  type AuthModalOptions,
} from "./useAuthModal";

const AuthModalDialog = lazy(() => import("./AuthModalDialog"));

type Props = {
  children: ReactNode;
};

type DialogState = {
  revision: number;
  mode: AuthModalMode;
  placement: NonNullable<AuthModalOptions["placement"]>;
  returnPath: string;
};

export function AuthModalProvider({ children }: Props) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const openAuth = useCallback(
    (
      mode: AuthModalMode = "login",
      returnPath = "/",
      options?: AuthModalOptions
    ) => {
      setDialog((current) => ({
        revision: (current?.revision ?? 0) + 1,
        mode,
        placement: options?.placement ?? "modal",
        returnPath,
      }));
    },
    []
  );

  const closeAuth = useCallback(() => {
    setDialog(null);
  }, []);

  const value = useMemo(
    () => ({ openAuth, closeAuth }),
    [closeAuth, openAuth]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {dialog ? (
        <Suspense fallback={null}>
          <AuthModalDialog
            key={dialog.revision}
            initialMode={dialog.mode}
            placement={dialog.placement}
            returnPath={dialog.returnPath}
            onClose={closeAuth}
          />
        </Suspense>
      ) : null}
    </AuthModalContext.Provider>
  );
}
