type Props = {
  message?: string | null;
};

export function FormError({ message }: Props) {
  if (!message) return null;

  return <div className="formError" role="alert">{message}</div>;
}
