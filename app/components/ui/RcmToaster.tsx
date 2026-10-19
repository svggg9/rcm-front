"use client";

import { Toaster } from "sonner";
import { toastIcons } from "./toastIcons";
import { TOAST_DURATION } from "./toast";

/** Use the same notifications on the page and inside native modal editors. */
export function RcmToaster({ id }: { id?: string }) {
  return (
    <Toaster
      id={id}
      icons={toastIcons}
      position="bottom-right"
      duration={TOAST_DURATION}
      closeButton
      offset={24}
      mobileOffset={16}
      containerAriaLabel="Уведомления"
      className={`rcmToaster${id ? " rcmToaster--editor" : ""}`}
      toastOptions={{
        closeButtonAriaLabel: "Закрыть уведомление",
        classNames: {
          toast: "rcmToast",
          title: "rcmToastTitle",
          description: "rcmToastDescription",
          actionButton: "rcmToastAction",
          cancelButton: "rcmToastCancel",
        },
      }}
    />
  );
}
