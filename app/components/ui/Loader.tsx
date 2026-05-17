type Props = {
  label?: string;
  fullPage?: boolean;
};

export function Loader({ label = "Загрузка", fullPage = false }: Props) {
  return (
    <div className={fullPage ? "loaderPage" : "loaderBlock"} role="status">
      <div className="loaderMark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="loaderLabel">{label}</div>
    </div>
  );
}