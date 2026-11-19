import { DesignSystemIcon } from "./DesignSystemIcon";
import { FeedbackIcon } from "./FeedbackIcon";

export const toastIcons = {
  normal: <FeedbackIcon tone="info" />,
  success: <FeedbackIcon tone="success" />,
  error: <FeedbackIcon tone="error" />,
  warning: <FeedbackIcon tone="warning" />,
  info: <FeedbackIcon tone="info" />,
  close: <DesignSystemIcon name="x" role="utility" />,
};
