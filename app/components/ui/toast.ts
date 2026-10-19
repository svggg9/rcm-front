"use client";

import { toast as sonnerToast, type ExternalToast } from "sonner";

export const TOAST_DURATION = 4000;

// Untyped messages are information; completed actions opt into success explicitly.
export const toast = Object.assign(
  (message: Parameters<typeof sonnerToast>[0], options?: ExternalToast) =>
    sonnerToast.info(message, { duration: TOAST_DURATION, ...options }),
  sonnerToast,
  {
    success: (message: Parameters<typeof sonnerToast.success>[0], options?: ExternalToast) =>
      sonnerToast.success(message, { duration: TOAST_DURATION, ...options }),
    info: (message: Parameters<typeof sonnerToast.info>[0], options?: ExternalToast) =>
      sonnerToast.info(message, { duration: TOAST_DURATION, ...options }),
    warning: (message: Parameters<typeof sonnerToast.warning>[0], options?: ExternalToast) =>
      sonnerToast.warning(message, { duration: TOAST_DURATION, ...options }),
    message: (message: Parameters<typeof sonnerToast.message>[0], options?: ExternalToast) =>
      sonnerToast.info(message, { duration: TOAST_DURATION, ...options }),
    error: (message: Parameters<typeof sonnerToast.error>[0], options?: ExternalToast) =>
      sonnerToast.error(message, { duration: TOAST_DURATION, ...options }),
  },
);

export type { ExternalToast } from "sonner";
