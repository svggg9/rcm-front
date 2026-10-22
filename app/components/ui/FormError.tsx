import { RequestError } from "./RequestError";

type Props = {
  message?: string | null;
};

export function FormError({ message }: Props) {
  if (!message) return null;

  return <RequestError variant="inline" message={message} />;
}
