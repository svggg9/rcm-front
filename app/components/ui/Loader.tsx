type Props = {
  fullPage?: boolean;
  inline?: boolean;
  label?: string;
  className?: string;
};

export function Loader({ fullPage = false, inline = false, label = "Загрузка", className = "" }: Props) {
  if (inline) return <span className={`loaderInline ${className}`.trim()} role="status" aria-label={label} aria-busy="true">
    <span className="buttonLoader" aria-hidden="true" />
  </span>;
  return (
    <div className={`${fullPage ? "loaderPage" : "loaderBlock"} ${className}`.trim()} role="status" aria-label={label} aria-busy="true">
      <div className="loaderMark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
