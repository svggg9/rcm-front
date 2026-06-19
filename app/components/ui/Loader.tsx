type Props = {
  fullPage?: boolean;
};

export function Loader({ fullPage = false }: Props) {
  return (
    <div className={fullPage ? "loaderPage" : "loaderBlock"} role="status">
      <div className="loaderMark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
